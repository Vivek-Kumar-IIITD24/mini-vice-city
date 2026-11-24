import * as THREE from 'three';
import { ColliderBox } from '../types';
import {
  clampToPlayableIsland,
  damp,
  dampAngle,
  resolveCircleVsBoxes,
} from '../core/math';

export type PlayerLocomotionState = 'idle' | 'walk' | 'sprint' | 'jump';

export interface PlayerObstacleCircle {
  x: number;
  z: number;
  radius: number;
}

export class PlayerController {
  public readonly root = new THREE.Group();
  private readonly bodyRig = new THREE.Group();
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly shadowDisc: THREE.Mesh;

  public x = 0;
  public y = 0;
  public z = 0;
  public vx = 0;
  public vy = 0;
  public vz = 0;
  public heading = 0;
  public grounded = true;
  public state: PlayerLocomotionState = 'idle';
  public health = 100;
  public readonly maxHealth = 100;
  public visible = true;

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private gaitPhase = 0;
  private stepSoundAccum = 0;
  private scaleX = 1;
  private scaleY = 1;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(contactShadowMap: THREE.Texture) {
    this.root.add(this.bodyRig);

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488, // coastal teal blazer
      roughness: 0.72,
      metalness: 0.05,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7, // crisp cream tee
      roughness: 0.85,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // white coastal chinos
      roughness: 0.78,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe0ac82,
      roughness: 0.65,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f1916,
      roughness: 0.75,
    });
    const shadesMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.12,
      metalness: 0.85,
    });

    const torsoGeo = new THREE.BoxGeometry(0.46, 0.58, 0.26);
    const shirtGeo = new THREE.BoxGeometry(0.2, 0.52, 0.27);
    const pelvisGeo = new THREE.BoxGeometry(0.42, 0.18, 0.24);
    const headGeo = new THREE.BoxGeometry(0.28, 0.3, 0.28);
    const hairGeo = new THREE.BoxGeometry(0.3, 0.11, 0.3);
    const shadesGeo = new THREE.BoxGeometry(0.24, 0.075, 0.06);
    const armGeo = new THREE.BoxGeometry(0.14, 0.54, 0.15);
    const handGeo = new THREE.BoxGeometry(0.12, 0.11, 0.12);
    const legGeo = new THREE.BoxGeometry(0.17, 0.68, 0.18);
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.27);

    this.disposables.push(
      jacketMat,
      shirtMat,
      pantsMat,
      shoeMat,
      skinMat,
      hairMat,
      shadesMat,
      torsoGeo,
      shirtGeo,
      pelvisGeo,
      headGeo,
      hairGeo,
      shadesGeo,
      armGeo,
      handGeo,
      legGeo,
      shoeGeo,
    );

    // Torso + Inner Shirt + Pelvis
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 1.18;
    torso.castShadow = true;
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.set(0, 1.18, -0.01);
    const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvis.position.y = 0.84;

    // Head + Hair + Aviator Sunglasses (facing -Z)
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.65;
    head.castShadow = true;
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.81, 0.01);
    const shades = new THREE.Mesh(shadesGeo, shadesMat);
    shades.position.set(0, 1.67, -0.14);

    // Arms pivoted at shoulders
    this.leftArmPivot.position.set(-0.31, 1.42, 0);
    const lArm = new THREE.Mesh(armGeo, jacketMat);
    lArm.position.y = -0.25;
    lArm.castShadow = true;
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.54;
    this.leftArmPivot.add(lArm, lHand);

    this.rightArmPivot.position.set(0.31, 1.42, 0);
    const rArm = new THREE.Mesh(armGeo, jacketMat);
    rArm.position.y = -0.25;
    rArm.castShadow = true;
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.54;
    this.rightArmPivot.add(rArm, rHand);

    // Legs pivoted at hips
    this.leftLegPivot.position.set(-0.12, 0.78, 0);
    const lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.y = -0.34;
    lLeg.castShadow = true;
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.72, -0.04);
    this.leftLegPivot.add(lLeg, lShoe);

    this.rightLegPivot.position.set(0.12, 0.78, 0);
    const rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.y = -0.34;
    rLeg.castShadow = true;
    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.72, -0.04);
    this.rightLegPivot.add(rLeg, rShoe);

    this.bodyRig.add(
      torso,
      shirt,
      pelvis,
      head,
      hair,
      shades,
      this.leftArmPivot,
      this.rightArmPivot,
      this.leftLegPivot,
      this.rightLegPivot,
    );

    // Contact shadow disc
    const shadowGeo = new THREE.PlaneGeometry(1.15, 1.15);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.disposables.push(shadowGeo, shadowMat);
    this.shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowDisc.position.y = 0.085;
    this.root.add(this.shadowDisc);
  }

  public setPosition(x: number, z: number, heading?: number): void {
    this.x = x;
    this.y = 0;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = true;
    if (heading !== undefined) this.heading = heading;
    this.syncMesh();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  public update(params: {
    dt: number;
    moveForward: number; // -1..1
    moveRight: number; // -1..1
    sprint: boolean;
    jumpJustPressed: boolean;
    jumpHeld: boolean;
    cameraYaw: number;
    colliders: readonly ColliderBox[];
    vehicleCircles: readonly PlayerObstacleCircle[];
    onFootstep?: (sprinting: boolean) => void;
    onJump?: () => void;
  }): void {
    const dt = Math.min(params.dt, 0.05);

    // Camera-relative planar basis (forward is (-sin(yaw), -cos(yaw)))
    const camFx = -Math.sin(params.cameraYaw);
    const camFz = -Math.cos(params.cameraYaw);
    const camRx = Math.cos(params.cameraYaw);
    const camRz = -Math.sin(params.cameraYaw);

    let dirX = camFx * params.moveForward + camRx * params.moveRight;
    let dirZ = camFz * params.moveForward + camRz * params.moveRight;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.001) {
      dirX /= len;
      dirZ /= len;
    }

    const walkSpeed = 5.2;
    const sprintSpeed = 9.4;
    const targetSpeed = len > 0.05 ? (params.sprint ? sprintSpeed : walkSpeed) : 0;

    const targetVx = dirX * targetSpeed;
    const targetVz = dirZ * targetSpeed;
    const accelLambda = len > 0.05 ? 12 : 16;

    this.vx = damp(this.vx, targetVx, accelLambda, dt);
    this.vz = damp(this.vz, targetVz, accelLambda, dt);

    // Coyote time & jump input buffer
    if (this.grounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (params.jumpJustPressed) {
      this.jumpBufferTimer = 0.12;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = 7.4;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.scaleX = 0.86;
      this.scaleY = 1.16;
      params.onJump?.();
    }

    // Variable jump cut on early release
    if (!params.jumpHeld && this.vy > 2.8) {
      this.vy *= Math.exp(-8 * dt);
    }

    // Gravity
    const wasGrounded = this.grounded;
    this.vy -= 21.5 * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      this.y = 0;
      if (!wasGrounded && this.vy < -3.5) {
        this.scaleX = 1.18;
        this.scaleY = 0.84;
        params.onFootstep?.(true);
      }
      this.vy = 0;
      this.grounded = true;
    }

    // Horizontal motion + collisions
    const nextX = this.x + this.vx * dt;
    const nextZ = this.z + this.vz * dt;
    const playerRadius = 0.48;

    const boxRes = resolveCircleVsBoxes(nextX, nextZ, playerRadius, params.colliders);
    let rx = boxRes.x;
    let rz = boxRes.z;

    // Resolve against solid parked/moving vehicles
    for (let i = 0; i < params.vehicleCircles.length; i++) {
      const vc = params.vehicleCircles[i];
      const dx = rx - vc.x;
      const dz = rz - vc.z;
      const minDist = playerRadius + vc.radius;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDist * minDist && dSq > 1e-6) {
        const d = Math.sqrt(dSq);
        const push = minDist - d;
        rx += (dx / d) * push;
        rz += (dz / d) * push;
      }
    }

    const island = clampToPlayableIsland(rx, rz, playerRadius);
    this.x = island.x;
    this.z = island.z;

    // Facing smoothly toward velocity direction
    const planarSpeed = Math.hypot(this.vx, this.vz);
    if (planarSpeed > 0.35) {
      const targetHeading = Math.atan2(-this.vx, -this.vz);
      this.heading = dampAngle(this.heading, targetHeading, 12, dt);
    }

    // Locomotion state & gait-synced limb animation
    if (!this.grounded) {
      this.state = 'jump';
    } else if (planarSpeed > 6.8) {
      this.state = 'sprint';
    } else if (planarSpeed > 0.45) {
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }

    // Recover squash & stretch smoothly
    this.scaleX = damp(this.scaleX, 1, 14, dt);
    this.scaleY = damp(this.scaleY, 1, 14, dt);

    if (this.grounded && planarSpeed > 0.35) {
      const strideRate = planarSpeed * 1.95;
      this.gaitPhase += strideRate * dt;
      this.stepSoundAccum += strideRate * dt;
      if (this.stepSoundAccum >= Math.PI) {
        this.stepSoundAccum -= Math.PI;
        params.onFootstep?.(this.state === 'sprint');
      }

      const swingAmp = Math.min(0.88, planarSpeed * 0.095);
      const swing = Math.sin(this.gaitPhase) * swingAmp;
      this.leftLegPivot.rotation.x = swing;
      this.rightLegPivot.rotation.x = -swing;
      this.leftArmPivot.rotation.x = -swing * 0.82;
      this.rightArmPivot.rotation.x = swing * 0.82;
      this.bodyRig.position.y = Math.abs(Math.sin(this.gaitPhase)) * 0.06;
    } else if (!this.grounded) {
      this.leftLegPivot.rotation.x = damp(this.leftLegPivot.rotation.x, 0.45, 10, dt);
      this.rightLegPivot.rotation.x = damp(this.rightLegPivot.rotation.x, -0.35, 10, dt);
      this.leftArmPivot.rotation.x = damp(this.leftArmPivot.rotation.x, -0.65, 10, dt);
      this.rightArmPivot.rotation.x = damp(this.rightArmPivot.rotation.x, -0.65, 10, dt);
      this.bodyRig.position.y = 0;
    } else {
      // Subtle idle breathing
      this.gaitPhase += dt * 2.1;
      this.leftLegPivot.rotation.x = damp(this.leftLegPivot.rotation.x, 0, 12, dt);
      this.rightLegPivot.rotation.x = damp(this.rightLegPivot.rotation.x, 0, 12, dt);
      this.leftArmPivot.rotation.x = damp(this.leftArmPivot.rotation.x, Math.sin(this.gaitPhase) * 0.04, 8, dt);
      this.rightArmPivot.rotation.x = damp(this.rightArmPivot.rotation.x, -Math.sin(this.gaitPhase) * 0.04, 8, dt);
      this.bodyRig.position.y = Math.sin(this.gaitPhase) * 0.015;
    }

    this.syncMesh();
  }

  private syncMesh(): void {
    this.root.position.set(this.x, 0, this.z);
    this.bodyRig.position.y += this.y;
    this.bodyRig.rotation.y = this.heading;
    this.bodyRig.scale.set(this.scaleX, this.scaleY, this.scaleX);
    const shadowScale = Math.max(0.55, 1 - this.y * 0.14);
    this.shadowDisc.scale.set(shadowScale, shadowScale, 1);
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
