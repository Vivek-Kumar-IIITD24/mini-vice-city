import * as THREE from 'three';
import { SidewalkLoop } from '../world/cityData';
import { dampAngle, distSq2D } from '../core/math';

interface PedestrianActor {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  loopIndex: number;
  waypointIndex: number;
  direction: 1 | -1;
  x: number;
  z: number;
  heading: number;
  baseSpeed: number;
  gaitPhase: number;
  idleTimer: number;
  fleeTimer: number;
}

const SHIRT_COLORS = [0xf472b6, 0x38bdf8, 0xfbbf24, 0x34d399, 0xf8fafc, 0xfb923c, 0xc084fc];
const PANTS_COLORS = [0x1e293b, 0x334155, 0xf1f5f9, 0x78716c, 0x0f172a];
const SKIN_COLORS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export class PedestrianSystem {
  public readonly root = new THREE.Group();
  private actors: PedestrianActor[] = [];
  private loops: SidewalkLoop[];
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(loops: SidewalkLoop[], contactShadowMap: THREE.Texture, count: number = 22) {
    this.loops = loops;

    // Shared geometries across all pedestrians for fast draw performance
    const torsoGeo = new THREE.BoxGeometry(0.38, 0.52, 0.22);
    const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    const legGeo = new THREE.BoxGeometry(0.14, 0.62, 0.15);
    legGeo.translate(0, -0.31, 0);
    const armGeo = new THREE.BoxGeometry(0.11, 0.48, 0.12);
    armGeo.translate(0, -0.24, 0);
    const shadowGeo = new THREE.PlaneGeometry(0.95, 0.95);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.disposables.push(torsoGeo, headGeo, legGeo, armGeo, shadowGeo, shadowMat);

    const shirtMats = SHIRT_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 }),
    );
    const pantsMats = PANTS_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }),
    );
    const skinMats = SKIN_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.68 }),
    );
    this.disposables.push(...shirtMats, ...pantsMats, ...skinMats);

    for (let i = 0; i < count; i++) {
      const loopIndex = i % loops.length;
      const pts = loops[loopIndex].points;
      const wpIndex = i % pts.length;
      const nextWp = (wpIndex + 1) % pts.length;
      const t = ((i * 0.37) % 1);
      const startX = pts[wpIndex].x + (pts[nextWp].x - pts[wpIndex].x) * t;
      const startZ = pts[wpIndex].z + (pts[nextWp].z - pts[wpIndex].z) * t;

      const pedRoot = new THREE.Group();
      const sMat = shirtMats[i % shirtMats.length];
      const pMat = pantsMats[(i * 3) % pantsMats.length];
      const skMat = skinMats[(i * 5) % skinMats.length];

      const torso = new THREE.Mesh(torsoGeo, sMat);
      torso.position.y = 1.06;
      const head = new THREE.Mesh(headGeo, skMat);
      head.position.y = 1.5;

      const leftLeg = new THREE.Mesh(legGeo, pMat);
      leftLeg.position.set(-0.1, 0.78, 0);
      const rightLeg = new THREE.Mesh(legGeo, pMat);
      rightLeg.position.set(0.1, 0.78, 0);

      const leftArm = new THREE.Mesh(armGeo, sMat);
      leftArm.position.set(-0.25, 1.3, 0);
      const rightArm = new THREE.Mesh(armGeo, sMat);
      rightArm.position.set(0.25, 1.3, 0);

      const sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.position.y = 0.085;

      pedRoot.add(torso, head, leftLeg, rightLeg, leftArm, rightArm, sh);
      pedRoot.position.set(startX, 0, startZ);
      this.root.add(pedRoot);

      this.actors.push({
        root: pedRoot,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        loopIndex,
        waypointIndex: nextWp,
        direction: i % 2 === 0 ? 1 : -1,
        x: startX,
        z: startZ,
        heading: 0,
        baseSpeed: 1.55 + (i % 4) * 0.22,
        gaitPhase: i * 1.1,
        idleTimer: i % 5 === 0 ? 1.8 : 0,
        fleeTimer: 0,
      });
    }
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

      const distToPlayerSq = distSq2D(a.x, a.z, playerX, playerZ);
      if (playerInVehicle && Math.abs(playerSpeed) > 6 && distToPlayerSq < 42) {
        a.fleeTimer = 2.0;
        if (distToPlayerSq < 11) {
          startledByVehicle = true;
        }
      }

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
        a.gaitPhase += fleeSpeed * 2.4 * safeDt;
      } else if (a.idleTimer > 0) {
        a.idleTimer -= safeDt;
        a.leftLeg.rotation.x *= 0.85;
        a.rightLeg.rotation.x *= 0.85;
        a.leftArm.rotation.x *= 0.85;
        a.rightArm.rotation.x *= 0.85;
      } else {
        const target = loop[a.waypointIndex];
        let dx = target.x - a.x;
        let dz = target.z - a.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.1) {
          a.waypointIndex = (a.waypointIndex + a.direction + loop.length) % loop.length;
          if ((i + a.waypointIndex) % 4 === 0) {
            a.idleTimer = 1.6;
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
          a.gaitPhase += a.baseSpeed * 2.3 * safeDt;
        }
      }

      if (a.idleTimer <= 0) {
        const swing = Math.sin(a.gaitPhase) * (a.fleeTimer > 0 ? 0.75 : 0.45);
        a.leftLeg.rotation.x = swing;
        a.rightLeg.rotation.x = -swing;
        a.leftArm.rotation.x = -swing * 0.7;
        a.rightArm.rotation.x = swing * 0.7;
      }

      a.root.position.set(a.x, 0, a.z);
      a.root.rotation.y = a.heading;
    }

    return startledByVehicle;
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
