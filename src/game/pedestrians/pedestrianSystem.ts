import * as THREE from 'three';
import { SidewalkLoop } from '../world/cityData';
import { dampAngle, distSq2D } from '../core/math';
import {
  type PedestrianRig,
  type PedestrianSharedResources,
  createPedestrianRig,
  createPedestrianSharedResources,
} from './pedestrianModel';
import {
  type PedestrianAnimatorState,
  type PedestrianLocomotionState,
  applyPedestrianPoseToRig,
  createInitialPedestrianAnimatorState,
  stepPedestrianAnimation,
} from './pedestrianAnimator';
import { evaluateStreetscapeGroundY } from '../world/streetscapeAssets';

interface PedestrianActor {
  rig: PedestrianRig;
  anim: PedestrianAnimatorState;
  loopIndex: number;
  waypointIndex: number;
  direction: 1 | -1;
  x: number;
  z: number;
  heading: number;
  baseSpeed: number;
  idleTimer: number;
  fleeTimer: number;
}

const DETAIL_LOD_DIST_SQ = 34 * 34;
const FAR_ANIM_LOD_DIST_SQ = 42 * 42;

function shortestAngleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class PedestrianSystem {
  public readonly root = new THREE.Group();
  private actors: PedestrianActor[] = [];
  private loops: SidewalkLoop[];
  private sharedResources: PedestrianSharedResources;

  constructor(loops: SidewalkLoop[], contactShadowMap: THREE.Texture, count: number = 22) {
    this.loops = loops;
    this.sharedResources = createPedestrianSharedResources(contactShadowMap);

    for (let i = 0; i < count; i++) {
      const loopIndex = i % loops.length;
      const pts = loops[loopIndex].points;
      const wpIndex = i % pts.length;
      const nextWp = (wpIndex + 1) % pts.length;
      const t = (i * 0.37) % 1;
      const startX = pts[wpIndex].x + (pts[nextWp].x - pts[wpIndex].x) * t;
      const startZ = pts[wpIndex].z + (pts[nextWp].z - pts[wpIndex].z) * t;
      const initDx = pts[nextWp].x - startX;
      const initDz = pts[nextWp].z - startZ;
      const initHeading =
        Math.hypot(initDx, initDz) > 1e-4 ? Math.atan2(-initDx, -initDz) : 0;

      const rig = createPedestrianRig(this.sharedResources, i);
      const anim = createInitialPedestrianAnimatorState(i * 1.1);
      applyPedestrianPoseToRig(rig, anim);

      rig.root.position.set(startX, evaluateStreetscapeGroundY(startX, startZ), startZ);
      rig.root.rotation.y = initHeading;
      this.root.add(rig.root);

      this.actors.push({
        rig,
        anim,
        loopIndex,
        waypointIndex: nextWp,
        direction: i % 2 === 0 ? 1 : -1,
        x: startX,
        z: startZ,
        heading: initHeading,
        baseSpeed: 1.55 + (i % 4) * 0.22,
        idleTimer: i % 5 === 0 ? 1.8 : 0,
        fleeTimer: 0,
      });
    }
  }

  public getActorCount(): number {
    return this.actors.length;
  }

  public getArchetypeIds(): string[] {
    return this.actors.map((a) => a.rig.archetypeId);
  }

  public getSharedMaterialCount(): number {
    return this.sharedResources.getMaterialCount();
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerInVehicle: boolean,
    playerSpeed: number,
  ): boolean {
    const safeDt = Math.min(dt, 0.05);
    let startledByVehicle = false;

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      const loop = this.loops[a.loopIndex].points;

      const prevX = a.x;
      const prevZ = a.z;
      const prevHeading = a.heading;

      const distToPlayerSq = distSq2D(a.x, a.z, playerX, playerZ);
      if (playerInVehicle && Math.abs(playerSpeed) > 6 && distToPlayerSq < 42) {
        a.fleeTimer = 2.0;
        if (distToPlayerSq < 11) {
          startledByVehicle = true;
        }
      }

      let locoState: PedestrianLocomotionState = 'walk';

      if (a.fleeTimer > 0) {
        a.fleeTimer -= safeDt;
        const dx = a.x - playerX;
        const dz = a.z - playerZ;
        const d = Math.max(0.01, Math.hypot(dx, dz));
        const fleeSpeed = 4.6;
        a.x += (dx / d) * fleeSpeed * safeDt;
        a.z += (dz / d) * fleeSpeed * safeDt;
        const targetHeading = Math.atan2(-dx, -dz);
        a.heading = dampAngle(a.heading, targetHeading, 10, safeDt);
        locoState = 'flee';
      } else if (a.idleTimer > 0) {
        a.idleTimer -= safeDt;
        locoState = 'idle';
      } else {
        const target = loop[a.waypointIndex];
        let dx = target.x - a.x;
        let dz = target.z - a.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.1) {
          a.waypointIndex = (a.waypointIndex + a.direction + loop.length) % loop.length;
          if ((i + a.waypointIndex) % 4 === 0) {
            a.idleTimer = 1.6;
            locoState = 'idle';
          }
        } else {
          dx /= dist;
          dz /= dist;
          // Mild sidestep around walking player
          if (!playerInVehicle && distToPlayerSq < 3.6) {
            const pdx = a.x - playerX;
            const pdz = a.z - playerZ;
            const pd = Math.max(0.1, Math.hypot(pdx, pdz));
            dx += (pdx / pd) * 0.9;
            dz += (pdz / pd) * 0.9;
            const n = Math.hypot(dx, dz);
            dx /= n;
            dz /= n;
          }

          a.x += dx * a.baseSpeed * safeDt;
          a.z += dz * a.baseSpeed * safeDt;
          const targetHeading = Math.atan2(-dx, -dz);
          a.heading = dampAngle(a.heading, targetHeading, 7, safeDt);
          locoState = 'walk';
        }
      }

      const movedDist = Math.hypot(a.x - prevX, a.z - prevZ);
      const actualSpeed = safeDt > 1e-4 ? movedDist / safeDt : 0;
      const headingDelta = shortestAngleDelta(prevHeading, a.heading);

      // Distance-based LOD for facial/accessory micro-details & far joint channels
      a.rig.setDetailVisible(distToPlayerSq < DETAIL_LOD_DIST_SQ);

      stepPedestrianAnimation(a.anim, {
        dt: safeDt,
        actualSpeed,
        headingDelta,
        state: locoState,
        heightScale: a.rig.heightScale,
        reducedDetail: distToPlayerSq > FAR_ANIM_LOD_DIST_SQ,
      });
      applyPedestrianPoseToRig(a.rig, a.anim);

      a.rig.root.position.set(a.x, evaluateStreetscapeGroundY(a.x, a.z), a.z);
      a.rig.root.rotation.y = a.heading;
    }

    return startledByVehicle;
  }

  public dispose(): void {
    this.root.clear();
    this.actors.length = 0;
    this.sharedResources.dispose();
  }
}
