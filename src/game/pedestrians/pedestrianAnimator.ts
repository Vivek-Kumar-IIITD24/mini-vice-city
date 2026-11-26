import { clamp, damp } from '../core/math';
import { PEDESTRIAN_DIMS } from './pedestrianGeometry';
import type { PedestrianRig } from './pedestrianModel';

export type PedestrianLocomotionState = 'idle' | 'walk' | 'flee';

/**
 * Pure, allocation-free articulated animation state for a single pedestrian.
 *
 * Right-hand rule sign conventions (character faces -Z, +X right, +Y up):
 *   - Hanging limbs (shoulders, elbows, hips, knees):
 *       rotation.x > 0 swings FORWARD (-Z)  -> elbow flexion >= 0
 *       rotation.x < 0 swings BACKWARD (+Z) -> knee flexion <= 0
 *   - Upright spine:
 *       rotation.x < 0 leans FORWARD (-Z)
 *   - Shoulder abduction:
 *       leftShoulderZ < 0 moves outward (-X), rightShoulderZ > 0 moves outward (+X)
 */
export interface PedestrianAnimatorState {
  gaitPhase: number;
  idleTime: number;
  turnRateSmoothed: number;
  // Smoothed joint channels
  hipsOffsetY: number;
  hipsRotY: number;
  hipsRotZ: number;
  spinePitch: number;
  spineYaw: number;
  spineRoll: number;
  neckPitch: number;
  neckYaw: number;
  leftShoulderX: number;
  leftShoulderZ: number;
  leftElbowX: number;
  rightShoulderX: number;
  rightShoulderZ: number;
  rightElbowX: number;
  leftHipX: number;
  leftKneeX: number;
  leftAnkleX: number;
  rightHipX: number;
  rightKneeX: number;
  rightAnkleX: number;
}

export function createInitialPedestrianAnimatorState(phaseOffset: number = 0): PedestrianAnimatorState {
  return {
    gaitPhase: phaseOffset,
    idleTime: phaseOffset * 1.37,
    turnRateSmoothed: 0,
    hipsOffsetY: 0,
    hipsRotY: 0,
    hipsRotZ: 0,
    spinePitch: -0.015,
    spineYaw: 0,
    spineRoll: 0,
    neckPitch: 0,
    neckYaw: 0,
    leftShoulderX: 0.02,
    leftShoulderZ: -0.06,
    leftElbowX: 0.14,
    rightShoulderX: -0.02,
    rightShoulderZ: 0.06,
    rightElbowX: 0.14,
    leftHipX: 0.02,
    leftKneeX: -0.04,
    leftAnkleX: 0.02,
    rightHipX: -0.02,
    rightKneeX: -0.04,
    rightAnkleX: 0.02,
  };
}

export interface PedestrianAnimationInput {
  dt: number;
  actualSpeed: number; // actual planar m/s moved this frame
  headingDelta: number; // signed shortest yaw change (rad) this frame
  state: PedestrianLocomotionState;
  heightScale: number;
  reducedDetail?: boolean;
}

/**
 * Advances a pedestrian's articulated locomotion state in-place with zero allocations.
 * Smoothly blends between idle, walking, fleeing, and turning without abrupt pose snaps.
 */
export function stepPedestrianAnimation(
  anim: PedestrianAnimatorState,
  input: PedestrianAnimationInput,
): void {
  const dt = Math.min(Math.max(input.dt, 0), 0.05);
  anim.idleTime += dt;

  const rawTurnRate = dt > 1e-4 ? clamp(input.headingDelta / dt, -7, 7) : 0;
  anim.turnRateSmoothed = damp(anim.turnRateSmoothed, rawTurnRate, 9, dt);

  const isMoving = input.state !== 'idle' && input.actualSpeed > 0.18;

  // Target joint angles
  let tHipsY = 0;
  let tHipsRotY = 0;
  let tHipsRotZ = 0;
  let tSpinePitch = -0.015;
  let tSpineYaw = 0;
  let tSpineRoll = 0;
  let tNeckPitch = 0;
  let tNeckYaw = 0;
  let tLShX = 0.02;
  let tLShZ = -0.06;
  let tLElbX = 0.14;
  let tRShX = -0.02;
  let tRShZ = 0.06;
  let tRElbX = 0.14;
  let tLHipX = 0.02;
  let tLKneeX = -0.04;
  let tLAnkX = 0.02;
  let tRHipX = -0.02;
  let tRKneeX = -0.04;
  let tRAnkX = 0.02;

  if (isMoving) {
    // 0..1 walk intensity (pedestrian walk speed ~1.55..2.21 m/s) + flee sprint blend (~4.6 m/s)
    const walkNorm = clamp((input.actualSpeed - 0.15) / 1.9, 0, 1);
    const fleeBlend = input.state === 'flee' ? clamp((input.actualSpeed - 2.3) / 2.2, 0.35, 1) : 0;

    // Stride-matched angular cadence coupled to leg length & heightScale to prevent foot sliding
    const hipAmp = (0.14 + 0.28 * walkNorm) + fleeBlend * 0.34;
    const legLen = (PEDESTRIAN_DIMS.thighLen + PEDESTRIAN_DIMS.shinLen) * Math.max(0.85, input.heightScale);
    const stepLen = Math.max(0.42, 2.0 * legLen * Math.sin(Math.min(0.95, hipAmp)) * 1.12);
    const strideRate = (input.actualSpeed / stepLen) * Math.PI;
    anim.gaitPhase += strideRate * dt;

    const phase = anim.gaitPhase;
    const sL = Math.sin(phase);
    const cL = Math.cos(phase);
    const sR = -sL;
    const cR = -cL;

    // Alternating hip flexion/extension
    tLHipX = sL * hipAmp * (sL > 0 ? 1.05 : 0.92);
    tRHipX = sR * hipAmp * (sR > 0 ? 1.05 : 0.92);

    // Natural backward knee flexion during swing & subtle shock absorption
    const swingFlexAmp = (0.24 + 0.32 * walkNorm) + fleeBlend * 0.56;
    const stanceFlex = 0.06 + fleeBlend * 0.1;
    tLKneeX = -(stanceFlex + Math.max(0, cL) * swingFlexAmp + Math.max(0, -sL) * (0.18 + fleeBlend * 0.3));
    tRKneeX = -(stanceFlex + Math.max(0, cR) * swingFlexAmp + Math.max(0, -sR) * (0.18 + fleeBlend * 0.3));

    // Complementary ankle pitch (skipped at far LOD to save work)
    if (!input.reducedDetail) {
      tLAnkX = Math.max(0, sL) * 0.13 - Math.max(0, -sL) * (0.2 + fleeBlend * 0.16);
      tRAnkX = Math.max(0, sR) * 0.13 - Math.max(0, -sR) * (0.2 + fleeBlend * 0.16);
    }

    // Subtle double-frequency vertical gait bob
    const bobAmp = 0.016 * walkNorm + 0.028 * fleeBlend;
    tHipsY = -Math.abs(sL) * bobAmp + (0.008 * walkNorm - 0.02 * fleeBlend);

    // Natural hip & torso counter-rotation
    tHipsRotY = -sL * (0.06 * walkNorm + 0.05 * fleeBlend);
    tHipsRotZ = cL * (0.022 * walkNorm + 0.014 * fleeBlend);
    tSpinePitch = -(0.03 * walkNorm + 0.19 * fleeBlend);
    tSpineYaw = sL * (0.09 * walkNorm + 0.09 * fleeBlend);

    // Subtle turning bank & head look-into-turn anticipation
    const turnBank = clamp(anim.turnRateSmoothed * 0.22, -1, 1);
    tSpineRoll = turnBank * (0.055 + 0.08 * fleeBlend);
    if (!input.reducedDetail) {
      tNeckYaw = clamp(anim.turnRateSmoothed * 0.14, -0.35, 0.35) - tSpineYaw * 0.4;
      tNeckPitch = 0.025 * walkNorm + 0.12 * fleeBlend;
    }

    // Opposite coordinated arm swing + natural elbow flexion (tighter pump when fleeing)
    const armAmp = (0.15 + 0.28 * walkNorm) + fleeBlend * 0.44;
    tLShX = -sL * armAmp;
    tRShX = sL * armAmp;
    tLShZ = -(0.065 + 0.055 * fleeBlend);
    tRShZ = 0.065 + 0.055 * fleeBlend;

    const baseElbow = 0.16 + 0.12 * walkNorm + 0.68 * fleeBlend;
    tLElbX = baseElbow + Math.max(0, -sL) * (0.18 + 0.32 * fleeBlend);
    tRElbX = baseElbow + Math.max(0, sL) * (0.18 + 0.32 * fleeBlend);
  } else {
    // Natural relaxed Idle standing posture with breathing, weight shift & gentle head movement
    const breath = Math.sin(anim.idleTime * 1.75);
    const shift = Math.sin(anim.idleTime * 0.6);
    const glance = Math.sin(anim.idleTime * 0.52) * 0.65 + Math.sin(anim.idleTime * 0.21) * 0.35;

    tHipsY = breath * 0.005;
    tHipsRotZ = shift * 0.013;
    tHipsRotY = 0.025;

    tSpinePitch = -0.015 + breath * 0.014;
    tSpineYaw = -0.02 + shift * 0.014;
    tSpineRoll = -shift * 0.01;

    if (!input.reducedDetail) {
      tNeckYaw = glance * 0.14 + clamp(anim.turnRateSmoothed * 0.1, -0.28, 0.28);
      tNeckPitch = Math.sin(anim.idleTime * 0.85) * 0.022;
    }

    tLShX = 0.02 + breath * 0.015;
    tRShX = -0.02 - breath * 0.015;
    tLShZ = -0.064 - breath * 0.01;
    tRShZ = 0.064 + breath * 0.01;
    tLElbX = 0.15 + breath * 0.018;
    tRElbX = 0.14 - breath * 0.018;

    tLHipX = 0.022;
    tRHipX = -0.018;
    tLKneeX = -0.04;
    tRKneeX = -0.036;
    tLAnkX = 0.018;
    tRAnkX = 0.018;
  }

  // Smooth exponential damping prevents abrupt snaps when stopping, starting, or turning
  const limbRate = isMoving ? 14 : 9.5;
  const torsoRate = 9.5;

  anim.hipsOffsetY = damp(anim.hipsOffsetY, tHipsY, 12, dt);
  anim.hipsRotY = damp(anim.hipsRotY, tHipsRotY, torsoRate, dt);
  anim.hipsRotZ = damp(anim.hipsRotZ, tHipsRotZ, torsoRate, dt);
  anim.spinePitch = damp(anim.spinePitch, tSpinePitch, torsoRate, dt);
  anim.spineYaw = damp(anim.spineYaw, tSpineYaw, torsoRate, dt);
  anim.spineRoll = damp(anim.spineRoll, tSpineRoll, torsoRate, dt);

  if (!input.reducedDetail) {
    anim.neckPitch = damp(anim.neckPitch, tNeckPitch, 8, dt);
    anim.neckYaw = damp(anim.neckYaw, tNeckYaw, 8, dt);
  }

  anim.leftShoulderX = damp(anim.leftShoulderX, tLShX, limbRate, dt);
  anim.leftShoulderZ = damp(anim.leftShoulderZ, tLShZ, limbRate, dt);
  anim.leftElbowX = Math.max(0, damp(anim.leftElbowX, tLElbX, limbRate, dt));

  anim.rightShoulderX = damp(anim.rightShoulderX, tRShX, limbRate, dt);
  anim.rightShoulderZ = damp(anim.rightShoulderZ, tRShZ, limbRate, dt);
  anim.rightElbowX = Math.max(0, damp(anim.rightElbowX, tRElbX, limbRate, dt));

  anim.leftHipX = damp(anim.leftHipX, tLHipX, limbRate, dt);
  anim.leftKneeX = Math.min(0, damp(anim.leftKneeX, tLKneeX, limbRate, dt));
  anim.leftAnkleX = damp(anim.leftAnkleX, tLAnkX, limbRate, dt);

  anim.rightHipX = damp(anim.rightHipX, tRHipX, limbRate, dt);
  anim.rightKneeX = Math.min(0, damp(anim.rightKneeX, tRKneeX, limbRate, dt));
  anim.rightAnkleX = damp(anim.rightAnkleX, tRAnkX, limbRate, dt);
}

/**
 * Applies the damped articulated joint channels directly onto a PedestrianRig.
 */
export function applyPedestrianPoseToRig(rig: PedestrianRig, anim: PedestrianAnimatorState): void {
  rig.hipsPivot.position.y = PEDESTRIAN_DIMS.hipY + anim.hipsOffsetY;
  rig.hipsPivot.rotation.set(0, anim.hipsRotY, anim.hipsRotZ);

  rig.spinePivot.rotation.set(anim.spinePitch, anim.spineYaw, anim.spineRoll);
  rig.neckPivot.rotation.set(anim.neckPitch, anim.neckYaw, 0);

  rig.leftShoulderPivot.rotation.set(anim.leftShoulderX, 0, anim.leftShoulderZ);
  rig.leftElbowPivot.rotation.set(anim.leftElbowX, 0, 0);

  rig.rightShoulderPivot.rotation.set(anim.rightShoulderX, 0, anim.rightShoulderZ);
  rig.rightElbowPivot.rotation.set(anim.rightElbowX, 0, 0);

  rig.leftHipPivot.rotation.set(anim.leftHipX, 0, 0);
  rig.leftKneePivot.rotation.set(anim.leftKneeX, 0, 0);
  rig.leftAnklePivot.rotation.set(anim.leftAnkleX, 0, 0);

  rig.rightHipPivot.rotation.set(anim.rightHipX, 0, 0);
  rig.rightKneePivot.rotation.set(anim.rightKneeX, 0, 0);
  rig.rightAnklePivot.rotation.set(anim.rightAnkleX, 0, 0);
}
