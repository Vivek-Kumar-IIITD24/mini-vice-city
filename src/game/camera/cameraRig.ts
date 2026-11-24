import * as THREE from 'three';
import { CameraViewMode } from '../types';
import { clamp, damp, dampAngle } from '../core/math';

export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;
  public yaw = -0.22;
  public pitch = 0.24;
  public viewMode: CameraViewMode = CameraViewMode.Chase;

  private currentPos = new THREE.Vector3(96, 18, 95);
  private currentLook = new THREE.Vector3(45, 8, 10);
  private targetPos = new THREE.Vector3();
  private targetLook = new THREE.Vector3();
  private desiredDir = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private distanceOffset = 0; // mouse wheel zoom adjustment
  private trauma = 0;
  private titlePhase = 0;
  private shakeTime = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.25, 850);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  public addTrauma(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  public cycleDriveView(): CameraViewMode {
    const order = [CameraViewMode.Chase, CameraViewMode.Close, CameraViewMode.Hood];
    const next = order[(order.indexOf(this.viewMode) + 1) % order.length];
    this.viewMode = next;
    return next;
  }

  public snapToGameplay(x: number, y: number, z: number, heading: number): void {
    this.yaw = heading;
    this.pitch = 0.22;
    this.trauma = 0;
    const dist = 5.6;
    const camX = x + Math.sin(this.yaw) * Math.cos(this.pitch) * dist;
    const camY = y + 1.9 + Math.sin(this.pitch) * dist;
    const camZ = z + Math.cos(this.yaw) * Math.cos(this.pitch) * dist;
    this.currentPos.set(camX, camY, camZ);
    this.currentLook.set(x, y + 1.45, z);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
  }

  public updateTitleTour(dt: number): void {
    this.titlePhase += dt * 0.085;
    // Cinematic coastal sweep along Ocean Drive framing Art Deco hotels, palms, ocean, and Vice Tower
    const angle = this.titlePhase;
    const px = 112 + Math.sin(angle * 0.7) * 26;
    const py = 24 + Math.sin(angle * 1.1) * 5;
    const pz = 68 + Math.cos(angle * 0.55) * 48;

    const lx = 38 + Math.sin(angle * 0.4) * 18;
    const ly = 13;
    const lz = -16 + Math.cos(angle * 0.4) * 18;

    this.targetPos.set(px, py, pz);
    this.targetLook.set(lx, ly, lz);

    const alpha = 1 - Math.exp(-3.5 * dt);
    this.currentPos.lerp(this.targetPos, alpha);
    this.currentLook.lerp(this.targetLook, alpha);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
    if (Math.abs(this.camera.fov - 54) > 0.1) {
      this.camera.fov = damp(this.camera.fov, 54, 4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  public updateGameplay(params: {
    dt: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    targetHeading: number;
    inVehicle: boolean;
    vehicleSpeed: number;
    mouseDx: number;
    mouseDy: number;
    wheelDelta: number;
    sensitivity: number;
    environmentMeshes: readonly THREE.Object3D[];
  }): void {
    const dt = Math.min(params.dt, 0.05);
    const sens = 0.0028 * params.sensitivity;

    if (Math.abs(params.mouseDx) > 0 || Math.abs(params.mouseDy) > 0) {
      this.yaw -= params.mouseDx * sens;
      this.pitch = clamp(this.pitch + params.mouseDy * sens, -0.18, 0.92);
    } else if (params.inVehicle && Math.abs(params.vehicleSpeed) > 1.8) {
      // Gently auto-align camera behind vehicle when moving without manual mouse orbit
      const alignRate = params.vehicleSpeed < -1 ? 1.8 : 3.2;
      const desiredYaw =
        params.vehicleSpeed < -2 ? params.targetHeading + Math.PI : params.targetHeading;
      this.yaw = dampAngle(this.yaw, desiredYaw, alignRate, dt);
      this.pitch = damp(this.pitch, 0.2, 2.5, dt);
    }

    if (params.wheelDelta !== 0) {
      this.distanceOffset = clamp(this.distanceOffset + params.wheelDelta * 0.65, -1.5, 4.0);
    }

    const speedAbs = Math.abs(params.vehicleSpeed);
    let desiredFov = 60;

    if (params.inVehicle && this.viewMode === CameraViewMode.Hood) {
      // Hood / First-Person driving perspective
      const fx = -Math.sin(params.targetHeading);
      const fz = -Math.cos(params.targetHeading);
      this.targetPos.set(
        params.targetX + fx * 0.35,
        params.targetY + 1.48,
        params.targetZ + fz * 0.35,
      );
      this.targetLook.set(
        params.targetX + fx * 24,
        params.targetY + 1.25,
        params.targetZ + fz * 24,
      );
      desiredFov = 66 + clamp(speedAbs * 0.35, 0, 12);
      const hoodAlpha = 1 - Math.exp(-22 * dt);
      this.currentPos.lerp(this.targetPos, hoodAlpha);
      this.currentLook.lerp(this.targetLook, hoodAlpha);
    } else {
      // Third-person on-foot or vehicle chase rig
      const baseDist = params.inVehicle
        ? this.viewMode === CameraViewMode.Close
          ? 6.4
          : 8.6 + clamp(speedAbs * 0.08, 0, 2.8)
        : 5.2;
      const dist = clamp(baseDist + this.distanceOffset, 3.2, 14.5);
      const pivotHeight = params.inVehicle ? 1.75 : 1.55;

      const pivotX = params.targetX;
      const pivotY = params.targetY + pivotHeight;
      const pivotZ = params.targetZ;

      const sinYaw = Math.sin(this.yaw);
      const cosYaw = Math.cos(this.yaw);
      const cosPitch = Math.cos(this.pitch);
      const sinPitch = Math.sin(this.pitch);

      this.desiredDir.set(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch).normalize();

      // Raycast from target pivot toward desired camera offset to avoid clipping through buildings
      let actualDist = dist;
      if (params.environmentMeshes.length > 0) {
        this.targetLook.set(pivotX, pivotY, pivotZ);
        this.raycaster.set(this.targetLook, this.desiredDir);
        this.raycaster.near = 0.4;
        this.raycaster.far = dist + 0.5;
        const hits = this.raycaster.intersectObjects(params.environmentMeshes as THREE.Object3D[], false);
        if (hits.length > 0 && hits[0].distance < dist) {
          actualDist = Math.max(1.8, hits[0].distance - 0.55);
        }
      }

      this.targetPos.set(
        pivotX + this.desiredDir.x * actualDist,
        Math.max(0.85, pivotY + this.desiredDir.y * actualDist),
        pivotZ + this.desiredDir.z * actualDist,
      );

      // Look slightly ahead of vehicle when driving
      const lookLead = params.inVehicle ? clamp(speedAbs * 0.14, 0, 3.5) : 0.4;
      this.targetLook.set(
        pivotX - Math.sin(this.yaw) * lookLead,
        pivotY - 0.12,
        pivotZ - Math.cos(this.yaw) * lookLead,
      );

      desiredFov = params.inVehicle ? 60 + clamp(speedAbs * 0.36, 0, 14) : 58;

      const posLambda = params.inVehicle ? 10.5 : 11.5;
      const lookLambda = 14.0;
      this.currentPos.lerp(this.targetPos, 1 - Math.exp(-posLambda * dt));
      this.currentLook.lerp(this.targetLook, 1 - Math.exp(-lookLambda * dt));
    }

    // Decaying trauma^2 camera shake on heavy collisions
    this.shakeTime += dt * 36;
    const shakeAmt = this.trauma * this.trauma;
    this.trauma = Math.max(0, this.trauma - dt * 1.9);

    this.camera.position.copy(this.currentPos);
    if (shakeAmt > 0.001) {
      this.camera.position.x += Math.sin(this.shakeTime * 1.3) * shakeAmt * 0.42;
      this.camera.position.y += Math.cos(this.shakeTime * 1.7) * shakeAmt * 0.32;
    }
    this.camera.lookAt(this.currentLook);

    const nextFov = damp(this.camera.fov, desiredFov, 6, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.05) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
