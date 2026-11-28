import * as THREE from 'three';
import { ColliderBox } from '../types';
import {
  clampToPlayableIsland,
  damp,
  dampAngle,
  resolveCircleVsBoxes,
} from '../core/math';
import {
  PlayerAnimatorState,
  applyPlayerPoseToRig,
  createInitialPlayerAnimatorState,
  stepPlayerAnimation,
} from './playerAnimator';
import { PlayerCharacterRig, createPlayerCharacterRig } from './playerModel';
import { evaluateStreetscapeGroundY } from '../world/streetscapeAssets';

export type PlayerLocomotionState = 'idle' | 'walk' | 'sprint' | 'jump';

export interface PlayerObstacleCircle {
  x: number;
  z: number;
  radius: number;
}

export class PlayerController {
  public readonly root: THREE.Group;
  public readonly rig: PlayerCharacterRig;

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
  private readonly anim: PlayerAnimatorState = createInitialPlayerAnimatorState();

  constructor(contactShadowMap: THREE.Texture) {
    this.rig = createPlayerCharacterRig(contactShadowMap);
    this.root = this.rig.root;
    applyPlayerPoseToRig(this.rig, this.anim);
  }

  public setPosition(x: number, z: number, heading?: number): void {
    this.x = x;
    this.y = 0;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.grounded = true;
    this.state = 'idle';
    this.anim.landingImpact = 0;
    this.anim.turnRateSmoothed = 0;
    if (heading !== undefined) this.heading = heading;
    applyPlayerPoseToRig(this.rig, this.anim);
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
      params.onJump?.();
    }

    // Variable jump cut on early release
    if (!params.jumpHeld && this.vy > 2.8) {
      this.vy *= Math.exp(-8 * dt);
    }

    // Gravity & ground landing detection
    const wasGrounded = this.grounded;
    this.vy -= 21.5 * dt;
    this.y += this.vy * dt;
    let justLandedStrength = 0;
    if (this.y <= 0) {
      this.y = 0;
      if (!wasGrounded && this.vy < -3.5) {
        justLandedStrength = Math.min(1, Math.abs(this.vy) / 10.5);
        params.onFootstep?.(true);
      }
      this.vy = 0;
      this.grounded = true;
    }

    // Horizontal motion + collisions (unchanged physics source of truth)
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

    // Facing smoothly toward velocity direction without snapping
    const prevHeading = this.heading;
    const planarSpeed = Math.hypot(this.vx, this.vz);
    if (planarSpeed > 0.35) {
      const targetHeading = Math.atan2(-this.vx, -this.vz);
      this.heading = dampAngle(this.heading, targetHeading, 12, dt);
    }
    let headingDelta = this.heading - prevHeading;
    while (headingDelta > Math.PI) headingDelta -= Math.PI * 2;
    while (headingDelta < -Math.PI) headingDelta += Math.PI * 2;

    // Locomotion state classification
    if (!this.grounded) {
      this.state = 'jump';
    } else if (planarSpeed > 6.8) {
      this.state = 'sprint';
    } else if (planarSpeed > 0.45) {
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }

    // Advance articulated locomotion pose & trigger heel-strike footsteps
    const { footstepTriggered } = stepPlayerAnimation(this.anim, {
      dt,
      planarSpeed,
      vy: this.vy,
      grounded: this.grounded,
      justLandedStrength,
      headingDelta,
      state: this.state,
    });
    if (footstepTriggered) {
      params.onFootstep?.(this.state === 'sprint');
    }

    applyPlayerPoseToRig(this.rig, this.anim);
    this.syncMesh();
  }

  private syncMesh(): void {
    const surfaceY = evaluateStreetscapeGroundY(this.x, this.z);
    this.root.position.set(this.x, surfaceY, this.z);
    this.rig.bodyRig.position.y = this.y;
    this.rig.bodyRig.rotation.y = this.heading;
    const shadowScale = Math.max(0.55, 1 - this.y * 0.14);
    this.rig.shadowDisc.scale.set(shadowScale, shadowScale, 1);
  }

  public dispose(): void {
    this.rig.dispose();
  }
}
