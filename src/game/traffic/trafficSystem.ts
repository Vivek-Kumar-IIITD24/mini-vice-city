import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import { ROAD_COORDS, TRAFFIC_COLORS } from '../world/cityData';
import { TrafficSignalVisual } from '../world/cityBuilder';
import { createVehicleMesh, VehicleRig } from '../vehicles/vehicleModels';
import { dampAngle, distSq2D } from '../core/math';

interface TrafficCar {
  rig: VehicleRig;
  x: number;
  z: number;
  heading: number;
  speed: number;
  cruiseSpeed: number;
  axis: 'ns' | 'ew';
  dir: 1 | -1; // +1 increasing coord, -1 decreasing coord
  roadIndex: number; // index into ROAD_COORDS
  stopped: boolean;
  turnCooldown: number;
}

const LANE_OFFSET = 3.2; // right-hand driving lane offset from road center

const TRAFFIC_SEDAN_SPEC: VehicleSpec = {
  id: 'traffic_car',
  name: 'City Cruiser',
  subtitle: 'Traffic Vehicle',
  kind: VehicleKind.Traffic,
  color: 0x3b82f6,
  accentColor: 0x1e293b,
  maxSpeed: 15,
  reverseSpeed: 6,
  acceleration: 8,
  braking: 16,
  turnRate: 2.0,
  grip: 7,
  driftGrip: 3,
  length: 4.35,
  width: 1.94,
  height: 1.38,
  price: 0,
};

export class TrafficSystem {
  public readonly root = new THREE.Group();
  private cars: TrafficCar[] = [];
  private signalTimer = 0;
  public nsGreen = true;

  constructor(contactShadowMap: THREE.Texture, count: number = 14) {
    for (let i = 0; i < count; i++) {
      const axis: 'ns' | 'ew' = i % 2 === 0 ? 'ns' : 'ew';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const roadIndex = i % ROAD_COORDS.length;
      const roadCoord = ROAD_COORDS[roadIndex];
      const along = -80 + ((i * 37) % 160);

      let x = 0;
      let z = 0;
      let heading = 0;
      if (axis === 'ns') {
        // Right-hand lane: heading South (+Z, dir=+1) stays on West (-X) side? Wait:
        // Facing +Z (heading = PI): right is -X. Facing -Z (heading = 0): right is +X.
        x = roadCoord + (dir === -1 ? LANE_OFFSET : -LANE_OFFSET);
        z = along;
        heading = dir === -1 ? 0 : Math.PI;
      } else {
        // Facing +X (heading = -PI/2): right is +Z. Facing -X (heading = +PI/2): right is -Z.
        x = along;
        z = roadCoord + (dir === 1 ? LANE_OFFSET : -LANE_OFFSET);
        heading = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      }

      const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
      const rig = createVehicleMesh(TRAFFIC_SEDAN_SPEC, contactShadowMap, color);
      rig.root.position.set(x, 0, z);
      rig.root.rotation.y = heading;
      this.root.add(rig.root);

      this.cars.push({
        rig,
        x,
        z,
        heading,
        speed: 8 + (i % 4) * 1.4,
        cruiseSpeed: 9.5 + (i % 5) * 1.35,
        axis,
        dir,
        roadIndex,
        stopped: false,
        turnCooldown: 1.5,
      });
    }
  }

  public getObstaclePositions(): Array<{ x: number; z: number; radius: number }> {
    return this.cars.map((c) => ({ x: c.x, z: c.z, radius: 2.1 }));
  }

  public checkCollisionWithPlayerVehicle(
    px: number,
    pz: number,
    pRadius: number,
  ): { hit: boolean; nx: number; nz: number } {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const dx = px - c.x;
      const dz = pz - c.z;
      const minDist = pRadius + 1.95;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDist * minDist && dSq > 1e-4) {
        const d = Math.sqrt(dSq);
        c.speed = 0;
        c.stopped = true;
        return { hit: true, nx: dx / d, nz: dz / d };
      }
    }
    return { hit: false, nx: 0, nz: 0 };
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    nightFactor: number,
    signals: readonly TrafficSignalVisual[],
  ): void {
    const safeDt = Math.min(dt, 0.05);

    // Cycle city traffic lights every 11 seconds
    this.signalTimer += safeDt;
    if (this.signalTimer >= 11) {
      this.signalTimer = 0;
      this.nsGreen = !this.nsGreen;
      for (let i = 0; i < signals.length; i++) {
        const s = signals[i];
        s.nsGreenMat.emissiveIntensity = this.nsGreen ? 1.8 : 0.05;
        s.nsRedMat.emissiveIntensity = this.nsGreen ? 0.05 : 1.8;
        s.ewGreenMat.emissiveIntensity = this.nsGreen ? 0.05 : 1.8;
        s.ewRedMat.emissiveIntensity = this.nsGreen ? 1.8 : 0.05;
      }
    }

    const hlIntensity = 0.4 + nightFactor * 2.1;
    const beamOpacity = nightFactor * 0.22;

    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      c.turnCooldown = Math.max(0, c.turnCooldown - safeDt);

      const fx = -Math.sin(c.heading);
      const fz = -Math.cos(c.heading);
      let shouldStop = false;

      // 1. Check distance to player or player car ahead
      const pdx = playerX - c.x;
      const pdz = playerZ - c.z;
      const pDistSq = pdx * pdx + pdz * pdz;
      if (pDistSq < 110) {
        const fwdDot = pdx * fx + pdz * fz;
        const sideDot = Math.abs(pdx * -fz + pdz * fx);
        if (fwdDot > 0.5 && fwdDot < 9.5 && sideDot < 3.2) {
          shouldStop = true;
        }
      }

      // 2. Yield to other traffic vehicles ahead
      if (!shouldStop) {
        for (let j = 0; j < this.cars.length; j++) {
          if (i === j) continue;
          const o = this.cars[j];
          if (distSq2D(c.x, c.z, o.x, o.z) < 120) {
            const odx = o.x - c.x;
            const odz = o.z - c.z;
            const fwdDot = odx * fx + odz * fz;
            const sideDot = Math.abs(odx * -fz + odz * fx);
            if (fwdDot > 0.5 && fwdDot < 9.5 && sideDot < 2.6) {
              shouldStop = true;
              break;
            }
          }
        }
      }

      // 3. Obey red lights when approaching central intersections
      if (!shouldStop) {
        for (let s = 0; s < signals.length; s++) {
          const sig = signals[s];
          const isRedForCar = (c.axis === 'ns' && !this.nsGreen) || (c.axis === 'ew' && this.nsGreen);
          if (!isRedForCar) continue;
          const sdx = sig.intersectionX - c.x;
          const sdz = sig.intersectionZ - c.z;
          const fwdDot = sdx * fx + sdz * fz;
          const sideDot = Math.abs(sdx * -fz + sdz * fx);
          if (fwdDot > 7.5 && fwdDot < 13.5 && sideDot < 5.0) {
            shouldStop = true;
            break;
          }
        }
      }

      c.stopped = shouldStop;
      const targetSpeed = shouldStop ? 0 : c.cruiseSpeed;
      const accelRate = shouldStop ? 16 : 6;
      c.speed += (targetSpeed - c.speed) * (1 - Math.exp(-accelRate * safeDt));

      c.x += fx * c.speed * safeDt;
      c.z += fz * c.speed * safeDt;

      // 4. Intersection turning & road edge turnaround
      const coord = c.axis === 'ns' ? c.z : c.x;
      if (coord > 102 && c.dir === 1) {
        c.dir = -1;
        this.snapLane(c);
      } else if (coord < -102 && c.dir === -1) {
        c.dir = 1;
        this.snapLane(c);
      } else if (c.turnCooldown <= 0) {
        // Check if aligned with a perpendicular avenue to occasionally turn
        for (let r = 0; r < ROAD_COORDS.length; r++) {
          const targetCross = ROAD_COORDS[r];
          if (Math.abs(coord - targetCross) < 1.2) {
            const hash = Math.abs(Math.floor(c.x * 7 + c.z * 13 + i * 31)) % 10;
            if (hash < 4) {
              c.axis = c.axis === 'ns' ? 'ew' : 'ns';
              c.roadIndex = r;
              c.dir = hash % 2 === 0 ? 1 : -1;
              // Prevent driving off edge if already at outer avenue
              const curOther = c.axis === 'ns' ? c.z : c.x;
              if (curOther > 80) c.dir = -1;
              if (curOther < -80) c.dir = 1;
              c.turnCooldown = 3.2;
            } else {
              c.turnCooldown = 1.6;
            }
            break;
          }
        }
      }

      // Gently steer toward desired lane centerline
      let targetHeading = 0;
      if (c.axis === 'ns') {
        const laneX = ROAD_COORDS[c.roadIndex] + (c.dir === -1 ? LANE_OFFSET : -LANE_OFFSET);
        c.x += (laneX - c.x) * (1 - Math.exp(-4.5 * safeDt));
        targetHeading = c.dir === -1 ? 0 : Math.PI;
      } else {
        const laneZ = ROAD_COORDS[c.roadIndex] + (c.dir === 1 ? LANE_OFFSET : -LANE_OFFSET);
        c.z += (laneZ - c.z) * (1 - Math.exp(-4.5 * safeDt));
        targetHeading = c.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      }
      c.heading = dampAngle(c.heading, targetHeading, 6.5, safeDt);

      // Update visual rig
      c.rig.root.position.set(c.x, 0, c.z);
      c.rig.root.rotation.y = c.heading;
      const spinDelta = (c.speed / 0.34) * safeDt;
      for (let w = 0; w < c.rig.wheels.length; w++) {
        c.rig.wheels[w].rotation.x -= spinDelta;
      }
      c.rig.headlightMat.emissiveIntensity = hlIntensity;
      (c.rig.headlightBeam.material as THREE.MeshBasicMaterial).opacity = beamOpacity;
      c.rig.brakeLightMat.emissiveIntensity = shouldStop ? 2.2 : 0.35 + nightFactor * 0.5;
    }
  }

  private snapLane(c: TrafficCar): void {
    if (c.axis === 'ns') {
      c.x = ROAD_COORDS[c.roadIndex] + (c.dir === -1 ? LANE_OFFSET : -LANE_OFFSET);
      c.heading = c.dir === -1 ? 0 : Math.PI;
    } else {
      c.z = ROAD_COORDS[c.roadIndex] + (c.dir === 1 ? LANE_OFFSET : -LANE_OFFSET);
      c.heading = c.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  public dispose(): void {
    for (const c of this.cars) c.rig.dispose();
  }
}
