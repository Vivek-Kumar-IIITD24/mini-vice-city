import { clamp, damp } from '../core/math';
import { PLAYER_DIMS } from './playerGeometry';
import type { PlayerCharacterRig } from './playerModel';

export type PlayerAnimationLocomotion = 'idle' | 'walk' | 'sprint' | 'jump';

/**
 * Pure, allocation-free articulated joint pose state for the protagonist.
 *
 * Right-hand rule sign conventions (character faces -Z, +X right, +Y up):
 *   - Hanging limbs (shoulders, elbows, hips, knees):
 *       rotation.x > 0 swings FORWARD (-Z)  -> elbow flexion is >= 0
 *       rotation.x < 0 swings BACKWARD (+Z) -> knee flexion is <= 0
 *   - Upright spine:
 *       rotation.x < 0 leans FORWARD (-Z)
 *   - Shoulder abduction (outward from torso):
 *       leftShoulderZ < 0 moves outward (-X), rightShoulderZ > 0 moves outward (+X)
 *   - Ankle pitch (toes toward -Z):
 *       rotation.x > 0 dorsiflexes (toes up), rotation.x < 0 plantarflexes (toes down)
 */
export interface PlayerAnimatorState {
  gaitPhase: number;
  idleTime: number;
  stepSoundAccum: number;
  landingImpact: number; // 0..1 smooth knee-absorption impulse after landing
  turnRateSmoothed: number; // rad/s smoothed yaw angular velocity
  // Current damped joint channels
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

export function createInitialPlayerAnimatorState(): PlayerAnimatorState {
  return {
    gaitPhase: 0,
    idleTime: 0,
    stepSoundAccum: 0,
    landingImpact: 0,
    turnRateSmoothed: 0,
    hipsOffsetY: 0,
    hipsRotY: 0,
    hipsRotZ: 0,
    spinePitch: -0.02,
    spineYaw: 0,
    spineRoll: 0,
    neckPitch: 0,
    neckYaw: 0,
    leftShoulderX: 0.03,
    leftShoulderZ: -0.06,
    leftElbowX: 0.16,
    rightShoulderX: -0.02,
    rightShoulderZ: 0.06,
    rightElbowX: 0.16,
    leftHipX: 0.02,
    leftKneeX: -0.05,
    leftAnkleX: 0.03,
    rightHipX: -0.02,
    rightKneeX: -0.05,
    rightAnkleX: 0.03,
  };
}

export interface PlayerAnimationInput {
  dt: number;
  planarSpeed: number;
  vy: number;
  grounded: boolean;
  justLandedStrength: number; // 0..1 when landing this frame
  headingDelta: number; // shortest signed change in heading (rad) this frame
  state: PlayerAnimationLocomotion;
}

/**
 * Advances the protagonist's articulated locomotion state in-place (zero allocations)
 * and returns whether a footstep heel-strike occurred this frame.
 */
export function stepPlayerAnimation(
  anim: PlayerAnimatorState,
  input: PlayerAnimationInput,
): { footstepTriggered: boolean } {
  const dt = Math.min(Math.max(input.dt, 0), 0.05);
  anim.idleTime += dt;

  // Smooth turning angular velocity for subtle banking & head look-into-turn
  const rawTurnRate = dt > 1e-4 ? clamp(input.headingDelta / dt, -8, 8) : 0;
  anim.turnRateSmoothed = damp(anim.turnRateSmoothed, rawTurnRate, 10, dt);

  // Trigger or smoothly decay landing knee-compression absorption
  if (input.justLandedStrength > 0) {
    anim.landingImpact = Math.max(anim.landingImpact, clamp(input.justLandedStrength, 0, 1));
  } else {
    anim.landingImpact = damp(anim.landingImpact, 0, 11, dt);
    if (anim.landingImpact < 0.004) anim.landingImpact = 0;
  }

  let footstepTriggered = false;

  // Target joint channels for this frame
  let tHipsY = 0;
  let tHipsRotY = 0;
  let tHipsRotZ = 0;
  let tSpinePitch = -0.02;
  let tSpineYaw = 0;
  let tSpineRoll = 0;
  let tNeckPitch = 0;
  let tNeckYaw = 0;
  let tLShX = 0.03;
  let tLShZ = -0.065;
  let tLElbX = 0.16;
  let tRShX = -0.02;
  let tRShZ = 0.065;
  let tRElbX = 0.16;
  let tLHipX = 0.02;
  let tLKneeX = -0.05;
  let tLAnkX = 0.03;
  let tRHipX = -0.02;
  let tRKneeX = -0.05;
  let tRAnkX = 0.03;

  const isMovingGrounded = input.grounded && input.planarSpeed > 0.35;

  if (!input.grounded) {
    // Jumping / falling pose driven by vertical velocity vy
    const riseBlend = clamp((input.vy + 2.5) / 9.5, 0, 1); // 1 = rising leap, 0 = descending drop
    tHipsY = 0.02 * riseBlend - 0.025 * (1 - riseBlend);
    tSpinePitch = -0.08 - (1 - riseBlend) * 0.1;
    tNeckPitch = 0.06 * riseBlend - 0.08 * (1 - riseBlend);

    // Lead leg tucked forward/up during ascent, both legs slightly bent & ready for landing on descent
    tLHipX = 0.62 * riseBlend + 0.24 * (1 - riseBlend);
    tLKneeX = -(0.88 * riseBlend + 0.42 * (1 - riseBlend));
    tLAnkX = -0.22 * riseBlend + 0.12 * (1 - riseBlend);

    tRHipX = -0.26 * riseBlend + 0.1 * (1 - riseBlend);
    tRKneeX = -(0.46 * riseBlend + 0.34 * (1 - riseBlend));
    tRAnkX = -0.28 * riseBlend + 0.08 * (1 - riseBlend);

    // Arms sweep up & outward for mid-air balance
    tLShX = 0.55 * riseBlend + 0.32 * (1 - riseBlend);
    tRShX = -0.22 * riseBlend + 0.32 * (1 - riseBlend);
    tLShZ = -(0.22 + (1 - riseBlend) * 0.24);
    tRShZ = 0.22 + (1 - riseBlend) * 0.24;
    tLElbX = 0.72 * riseBlend + 0.42 * (1 - riseBlend);
    tRElbX = 0.65 * riseBlend + 0.42 * (1 - riseBlend);
  } else if (isMovingGrounded) {
    // Stride-matched locomotion (walk -> sprint blend)
    const speedNorm = clamp((input.planarSpeed - 0.35) / 4.85, 0, 1); // 0..1 up to walkSpeed 5.2
    const sprintBlend = clamp((input.planarSpeed - 5.4) / 3.8, 0, 1); // 0 = walk, 1 = full sprint (9.4)

    // Hip swing amplitude scales smoothly with speed & sprint intensity
    const hipAmp = (0.14 + 0.38 * speedNorm) + sprintBlend * 0.34;
    // Match stride phase advance directly to planar speed & anatomical leg length to suppress foot sliding
    const legLen = PLAYER_DIMS.thighLen + PLAYER_DIMS.shinLen;
    const stepLen = Math.max(0.55, 2.0 * legLen * Math.sin(Math.min(1.05, hipAmp)) * 1.16);
    const strideAngularRate = (input.planarSpeed / stepLen) * Math.PI;

    anim.gaitPhase += strideAngularRate * dt;
    anim.stepSoundAccum += strideAngularRate * dt;
    if (anim.stepSoundAccum >= Math.PI) {
      anim.stepSoundAccum -= Math.PI;
      footstepTriggered = true;
    }

    const phase = anim.gaitPhase;
    const sL = Math.sin(phase);
    const cL = Math.cos(phase);
    const sR = -sL;
    const cR = -cL;

    // Asymmetric hip flexion/extension (slightly greater forward reach than rearward push)
    tLHipX = sL * hipAmp * (sL > 0 ? 1.06 : 0.92);
    tRHipX = sR * hipAmp * (sR > 0 ? 1.06 : 0.92);

    // Realistic two-peak knee flexion:
    //   - Primary flexion during swing phase (when leg swings forward: cos(phase) > 0)
    //   - Subtle shock-absorbing stance flexion right after heel-strike
    const swingFlexAmp = (0.35 + 0.38 * speedNorm) + sprintBlend * 0.58;
    const stanceFlex = 0.08 + sprintBlend * 0.1;
    const lSwingLift = Math.max(0, cL);
    const rSwingLift = Math.max(0, cR);
    const lPushBend = Math.max(0, -sL) * (0.24 + sprintBlend * 0.35);
    const rPushBend = Math.max(0, -sR) * (0.24 + sprintBlend * 0.35);

    tLKneeX = -(stanceFlex + lSwingLift * swingFlexAmp + lPushBend);
    tRKneeX = -(stanceFlex + rSwingLift * swingFlexAmp + rPushBend);

    // Complementary ankle pitch: dorsiflexes before heel strike, plantarflexes at toe-off
    tLAnkX = Math.max(0, sL) * 0.16 - Math.max(0, -sL) * (0.24 + sprintBlend * 0.18);
    tRAnkX = Math.max(0, sR) * 0.16 - Math.max(0, -sR) * (0.24 + sprintBlend * 0.18);

    // Subtle double-frequency vertical gait bob (lowest at mid-stride double-support, highest at single-support)
    const bobAmp = 0.022 * speedNorm + 0.032 * sprintBlend;
    tHipsY = -Math.abs(sL) * bobAmp + (0.012 * speedNorm - 0.028 * sprintBlend);

    // Natural pelvis counter-twist & subtle weight-transfer lateral tilt
    tHipsRotY = -sL * (0.075 * speedNorm + 0.055 * sprintBlend);
    tHipsRotZ = cL * (0.028 * speedNorm + 0.015 * sprintBlend);

    // Upper torso counter-rotates against hips + athletic forward lean when running
    tSpinePitch = -(0.045 * speedNorm + 0.21 * sprintBlend);
    tSpineYaw = sL * (0.11 * speedNorm + 0.1 * sprintBlend);

    // Subtle turning bank & head anticipation into turn direction
    const turnEffect = clamp(anim.turnRateSmoothed * 0.25, -1, 1);
    tSpineRoll = turnEffect * (0.07 + 0.09 * sprintBlend);
    tNeckYaw = clamp(anim.turnRateSmoothed * 0.12, -0.35, 0.35) - tSpineYaw * 0.45;
    tNeckPitch = 0.035 * speedNorm + 0.14 * sprintBlend; // keeps gaze level during forward lean

    // Opposing coordinated arm swing + natural elbow flexion (tighter pump during sprint)
    const armAmp = (0.18 + 0.36 * speedNorm) + sprintBlend * 0.42;
    tLShX = -sL * armAmp;
    tRShX = sL * armAmp;
    tLShZ = -(0.07 + 0.05 * sprintBlend);
    tRShZ = 0.07 + 0.05 * sprintBlend;

    // Elbows flex more on forward swing & noticeably tighter when sprinting
    const baseElbow = 0.18 + 0.14 * speedNorm + 0.72 * sprintBlend;
    tLElbX = baseElbow + Math.max(0, -sL) * (0.24 + 0.34 * sprintBlend);
    tRElbX = baseElbow + Math.max(0, sL) * (0.24 + 0.34 * sprintBlend);
  } else {
    // Natural relaxed Idle standing posture with breathing & subtle head glance
    const breath = Math.sin(anim.idleTime * 1.85);
    const slowLook = Math.sin(anim.idleTime * 0.55) * 0.65 + Math.sin(anim.idleTime * 0.23) * 0.35;
    const weightShift = Math.sin(anim.idleTime * 0.65);

    tHipsY = breath * 0.006;
    tHipsRotZ = weightShift * 0.014;
    tHipsRotY = 0.03;

    tSpinePitch = -0.018 + breath * 0.016;
    tSpineYaw = -0.025 + weightShift * 0.015;
    tSpineRoll = -weightShift * 0.012;

    tNeckYaw = slowLook * 0.11 + clamp(anim.turnRateSmoothed * 0.1, -0.3, 0.3);
    tNeckPitch = Math.sin(anim.idleTime * 0.9) * 0.025;

    // Relaxed slightly bent elbows & gentle breathing shoulder sway
    tLShX = 0.025 + breath * 0.018;
    tRShX = -0.02 - breath * 0.018;
    tLShZ = -0.068 - breath * 0.012;
    tRShZ = 0.068 + breath * 0.012;
    tLElbX = 0.17 + breath * 0.02;
    tRElbX = 0.15 - breath * 0.02;

    // Grounded relaxed standing legs (subtle natural athletic stance, zero gait motion)
    tLHipX = 0.025;
    tRHipX = -0.02;
    tLKneeX = -0.045;
    tRKneeX = -0.04;
    tLAnkX = 0.02;
    tRAnkX = 0.02;
  }

  // Blend in smooth landing knee-absorption compression when grounded right after a jump
  if (input.grounded && anim.landingImpact > 0.005) {
    const imp = anim.landingImpact;
    tHipsY -= imp * 0.13;
    tSpinePitch -= imp * 0.16;
    tLHipX += imp * 0.32;
    tRHipX += imp * 0.32;
    tLKneeX -= imp * 0.62;
    tRKneeX -= imp * 0.62;
    tLAnkX += imp * 0.28;
    tRAnkX += imp * 0.28;
    tLShZ -= imp * 0.14;
    tRShZ += imp * 0.14;
  }

  // Smoothly damp every joint channel for fluid transitions between idle/walk/sprint/jump/land
  const jointRate = isMovingGrounded ? 16 : 12;
  const torsoRate = 11;

  anim.hipsOffsetY = damp(anim.hipsOffsetY, tHipsY, 15, dt);
  anim.hipsRotY = damp(anim.hipsRotY, tHipsRotY, torsoRate, dt);
  anim.hipsRotZ = damp(anim.hipsRotZ, tHipsRotZ, torsoRate, dt);
  anim.spinePitch = damp(anim.spinePitch, tSpinePitch, torsoRate, dt);
  anim.spineYaw = damp(anim.spineYaw, tSpineYaw, torsoRate, dt);
  anim.spineRoll = damp(anim.spineRoll, tSpineRoll, torsoRate, dt);
  anim.neckPitch = damp(anim.neckPitch, tNeckPitch, 9, dt);
  anim.neckYaw = damp(anim.neckYaw, tNeckYaw, 9, dt);

  anim.leftShoulderX = damp(anim.leftShoulderX, tLShX, jointRate, dt);
  anim.leftShoulderZ = damp(anim.leftShoulderZ, tLShZ, jointRate, dt);
  anim.leftElbowX = Math.max(0, damp(anim.leftElbowX, tLElbX, jointRate, dt));

  anim.rightShoulderX = damp(anim.rightShoulderX, tRShX, jointRate, dt);
  anim.rightShoulderZ = damp(anim.rightShoulderZ, tRShZ, jointRate, dt);
  anim.rightElbowX = Math.max(0, damp(anim.rightElbowX, tRElbX, jointRate, dt));

  anim.leftHipX = damp(anim.leftHipX, tLHipX, jointRate, dt);
  anim.leftKneeX = Math.min(0, damp(anim.leftKneeX, tLKneeX, jointRate, dt));
  anim.leftAnkleX = damp(anim.leftAnkleX, tLAnkX, jointRate, dt);

  anim.rightHipX = damp(anim.rightHipX, tRHipX, jointRate, dt);
  anim.rightKneeX = Math.min(0, damp(anim.rightKneeX, tRKneeX, jointRate, dt));
  anim.rightAnkleX = damp(anim.rightAnkleX, tRAnkX, jointRate, dt);

  return { footstepTriggered };
}

/**
 * Applies the current articulated pose channels directly onto the Three.js rig pivots.
 */
export function applyPlayerPoseToRig(rig: PlayerCharacterRig, anim: PlayerAnimatorState): void {
  rig.hipsPivot.position.y = PLAYER_DIMS.hipY + anim.hipsOffsetY;
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
