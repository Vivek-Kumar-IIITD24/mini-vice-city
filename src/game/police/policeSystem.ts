import * as THREE from 'three';
import { ColliderBox, MinimapBlip } from '../types';
import { VEHICLE_CATALOG } from '../world/cityData';
import { createVehicleMesh, VehicleRig } from '../vehicles/vehicleModels';
import {
  clamp,
  clampToPlayableIsland,
  dampAngle,
  dist2D,
  resolveCircleVsBoxes,
} from '../core/math';

export interface WantedState {
  stars: number; // 0..5
  heat: number; // accumulates toward next star
  escapeTimer: number; // seconds hidden from police
  escapeDuration: number; // required seconds to clear/reduce wanted level
  escaping: boolean;
  bustedTimer: number; // builds when police corner player at low speed
}

export function createInitialWantedState(): WantedState {
  return {
    stars: 0,
    heat: 0,
    escapeTimer: 0,
    escapeDuration: 12,
    escaping: false,
    bustedTimer: 0,
  };
}

/**
 * Pure, testable wanted escalation rule.
 */
export function addWantedHeat(state: WantedState, heatDelta: number, minStars = 0): WantedState {
  const nextHeat = Math.min(100, state.heat + heatDelta);
  let stars = state.stars;
  if (minStars > stars) stars = Math.min(5, minStars);
  if (nextHeat >= 85) stars = Math.max(stars, 5);
  else if (nextHeat >= 65) stars = Math.max(stars, 4);
  else if (nextHeat >= 45) stars = Math.max(stars, 3);
  else if (nextHeat >= 25) stars = Math.max(stars, 2);
  else if (nextHeat >= 10) stars = Math.max(stars, 1);

  return {
    ...state,
    stars,
    heat: nextHeat,
    escapeTimer: 0,
    escapeDuration: 10 + stars * 3,
    escaping: false,
  };
}

/**
 * Pure, testable wanted decay/escape rule.
 */
export function stepWantedCooldown(
  state: WantedState,
  spottedByPolice: boolean,
  corneredByPolice: boolean,
  dt: number,
): { state: WantedState; escapedCompletely: boolean; busted: boolean } {
  if (state.stars <= 0) {
    return {
      state: { ...state, escaping: false, escapeTimer: 0, bustedTimer: 0 },
      escapedCompletely: false,
      busted: false,
    };
  }

  let bustedTimer = state.bustedTimer;
  if (corneredByPolice) {
    bustedTimer += dt;
    if (bustedTimer >= 3.2) {
      return {
        state: { ...state, bustedTimer },
        escapedCompletely: false,
        busted: true,
      };
    }
  } else {
    bustedTimer = Math.max(0, bustedTimer - dt * 1.5);
  }

  if (spottedByPolice) {
    return {
      state: {
        ...state,
        escaping: false,
        escapeTimer: Math.max(0, state.escapeTimer - dt * 2.5),
        bustedTimer,
      },
      escapedCompletely: false,
      busted: false,
    };
  }

  const nextEscapeTimer = state.escapeTimer + dt;
  if (nextEscapeTimer >= state.escapeDuration) {
    return {
      state: {
        stars: 0,
        heat: 0,
        escapeTimer: 0,
        escapeDuration: 12,
        escaping: false,
        bustedTimer: 0,
      },
      escapedCompletely: true,
      busted: false,
    };
  }

  return {
    state: {
      ...state,
      escaping: true,
      escapeTimer: nextEscapeTimer,
      bustedTimer,
    },
    escapedCompletely: false,
    busted: false,
  };
}

interface PoliceUnit {
  rig: VehicleRig;
  x: number;
  z: number;
  heading: number;
  speed: number;
  active: boolean;
  flankSide: number; // -1 or +1 for interception spread
  stuckTimer: number;
}

const SPAWN_RING_POINTS: Array<[number, number]> = [
  [32, -96],
  [-32, -32],
  [32, 32],
  [-32, 96],
  [96, -32],
  [-96, 32],
];

export class PoliceSystem {
  public readonly root = new THREE.Group();
  public wanted: WantedState = createInitialWantedState();
  public closestSirenProximity = 0;

  private units: PoliceUnit[] = [];
  private lightFlashTime = 0;

  constructor(contactShadowMap: THREE.Texture, maxUnits: number = 4) {
    const spec = VEHICLE_CATALOG.vcpd_interceptor;
    for (let i = 0; i < maxUnits; i++) {
      const rig = createVehicleMesh(spec, contactShadowMap);
      rig.root.visible = false;
      this.root.add(rig.root);
      this.units.push({
        rig,
        x: SPAWN_RING_POINTS[i][0],
        z: SPAWN_RING_POINTS[i][1],
        heading: 0,
        speed: 0,
        active: false,
        flankSide: i % 2 === 0 ? 1 : -1,
        stuckTimer: 0,
      });
    }
  }

  public reportInfraction(heatDelta: number, minStars = 0): number {
    const prevStars = this.wanted.stars;
    this.wanted = addWantedHeat(this.wanted, heatDelta, minStars);
    return this.wanted.stars > prevStars ? this.wanted.stars : 0;
  }

  public clearWanted(): void {
    this.wanted = createInitialWantedState();
    this.closestSirenProximity = 0;
    for (const u of this.units) {
      u.active = false;
      u.rig.root.visible = false;
    }
  }

  public getActiveBlips(): MinimapBlip[] {
    const res: MinimapBlip[] = [];
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      res.push({
        x: u.x,
        z: u.z,
        kind: 'police',
        color: '#ef4444',
      });
    }
    return res;
  }

  public update(params: {
    dt: number;
    playerX: number;
    playerZ: number;
    playerHeading: number;
    playerSpeed: number;
    nightFactor: number;
    colliders: readonly ColliderBox[];
  }): { escapedStars: number; busted: boolean; rammedPlayer: boolean } {
    const dt = Math.min(params.dt, 0.05);
    this.lightFlashTime += dt * 11;

    // Desired active cruisers scales with stars (1 star -> 1 patrol, 2 -> 2, 3 -> 3, 4-5 -> 4)
    const desiredCount =
      this.wanted.stars === 0 ? 0 : Math.min(this.units.length, Math.max(1, this.wanted.stars));

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (i < desiredCount && !u.active) {
        // Spawn cruiser on an avenue ~55-85m away from the player
        let bestPt = SPAWN_RING_POINTS[i % SPAWN_RING_POINTS.length];
        let bestScore = Infinity;
        for (const pt of SPAWN_RING_POINTS) {
          const d = dist2D(pt[0], pt[1], params.playerX, params.playerZ);
          const score = Math.abs(d - 68);
          if (d > 34 && score < bestScore) {
            bestScore = score;
            bestPt = pt;
          }
        }
        u.x = bestPt[0] + i * 3;
        u.z = bestPt[1];
        u.heading = Math.atan2(-(params.playerX - u.x), -(params.playerZ - u.z));
        u.speed = 14;
        u.active = true;
        u.rig.root.visible = true;
      } else if (i >= desiredCount && u.active) {
        u.active = false;
        u.rig.root.visible = false;
      }
    }

    let spotted = false;
    let cornered = false;
    let rammedPlayer = false;
    let nearestDist = 999;

    const redOn = Math.sin(this.lightFlashTime) > 0;
    const maxChaseSpeed = 16 + this.wanted.stars * 3.8; // scales smoothly from 19.8 up to 35 m/s

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;

      const dToPlayer = dist2D(u.x, u.z, params.playerX, params.playerZ);
      if (dToPlayer < nearestDist) nearestDist = dToPlayer;
      if (dToPlayer < 48) spotted = true;
      if (dToPlayer < 7.2 && Math.abs(params.playerSpeed) < 3.2) cornered = true;

      // Aggressive lead interception at 3+ stars, direct pursuit at 1-2 stars
      const leadDist = this.wanted.stars >= 3 ? clamp(dToPlayer * 0.25, 0, 14) : 0;
      const flankOffset = dToPlayer < 22 ? u.flankSide * 3.2 : 0;
      const targetX =
        params.playerX - Math.sin(params.playerHeading) * leadDist + Math.cos(params.playerHeading) * flankOffset;
      const targetZ =
        params.playerZ - Math.cos(params.playerHeading) * leadDist - Math.sin(params.playerHeading) * flankOffset;

      const desiredHeading = Math.atan2(-(targetX - u.x), -(targetZ - u.z));
      u.heading = dampAngle(u.heading, desiredHeading, 3.8 + this.wanted.stars * 0.35, dt);

      const targetSpeed = dToPlayer < 9 ? Math.max(8, Math.abs(params.playerSpeed) + 2) : maxChaseSpeed;
      u.speed += (targetSpeed - u.speed) * (1 - Math.exp(-3.4 * dt));

      const fx = -Math.sin(u.heading);
      const fz = -Math.cos(u.heading);
      let nx = u.x + fx * u.speed * dt;
      let nz = u.z + fz * u.speed * dt;

      // Resolve against buildings and slide cleanly around corners
      const col = resolveCircleVsBoxes(nx, nz, 2.05, params.colliders);
      if (col.hit) {
        nx = col.x;
        nz = col.z;
        u.speed *= 0.65;
        // Nudge heading along wall tangent so cruisers don't get pinned
        u.heading += u.flankSide * 0.85 * dt * 4;
      }

      // Separate from other cruisers
      for (let j = 0; j < this.units.length; j++) {
        if (i === j || !this.units[j].active) continue;
        const o = this.units[j];
        const dx = nx - o.x;
        const dz = nz - o.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < 18 && dSq > 0.01) {
          const d = Math.sqrt(dSq);
          nx += (dx / d) * (4.25 - d) * 0.5;
          nz += (dz / d) * (4.25 - d) * 0.5;
        }
      }

      // Player vehicle ramming collision check
      const pDx = nx - params.playerX;
      const pDz = nz - params.playerZ;
      const pDist = Math.hypot(pDx, pDz);
      if (pDist < 3.6 && pDist > 0.01) {
        nx = params.playerX + (pDx / pDist) * 3.65;
        nz = params.playerZ + (pDz / pDist) * 3.65;
        u.speed *= 0.45;
        rammedPlayer = true;
      }

      const clamped = clampToPlayableIsland(nx, nz, 2.2);
      u.x = clamped.x;
      u.z = clamped.z;

      // Update visual rig + alternating siren lightbar
      u.rig.root.position.set(u.x, 0, u.z);
      u.rig.root.rotation.y = u.heading;
      const spin = (u.speed / 0.34) * dt;
      for (let w = 0; w < u.rig.wheels.length; w++) {
        u.rig.wheels[w].rotation.x -= spin;
      }
      if (u.rig.policeRedMat && u.rig.policeBlueMat) {
        u.rig.policeRedMat.emissiveIntensity = redOn ? 4.2 : 0.15;
        u.rig.policeBlueMat.emissiveIntensity = redOn ? 0.15 : 4.2;
      }
      u.rig.headlightMat.emissiveIntensity = 1.2 + params.nightFactor * 2.2;
      u.rig.brakeLightMat.emissiveIntensity =
        u.speed < 4.5 ? 2.95 : 0.75 + params.nightFactor * 1.15;
      (u.rig.headlightBeam.material as THREE.MeshBasicMaterial).opacity =
        0.08 + params.nightFactor * 0.25;
    }

    this.closestSirenProximity =
      this.wanted.stars > 0 ? clamp(1 - nearestDist / 85, 0.12, 1) : 0;

    const prevStars = this.wanted.stars;
    const stepRes = stepWantedCooldown(this.wanted, spotted, cornered, dt);
    this.wanted = stepRes.state;

    if (stepRes.escapedCompletely) {
      this.clearWanted();
      return { escapedStars: prevStars, busted: false, rammedPlayer };
    }

    return { escapedStars: 0, busted: stepRes.busted, rammedPlayer };
  }

  public dispose(): void {
    for (const u of this.units) u.rig.dispose();
  }
}
