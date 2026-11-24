import { ColliderBox, VehicleSpec } from '../types';
import { clamp, clampToPlayableIsland, resolveCircleVsBoxes } from '../core/math';

export interface VehicleBodyState {
  x: number;
  z: number;
  heading: number; // radians, 0 = -Z (north), +PI/2 = -X (west) or standard Three.js forward = (-sin(h), -cos(h))
  vx: number;
  vz: number;
  speed: number; // signed forward speed (m/s)
  steerAngle: number; // visual wheel steer angle (-0.55..0.55)
  wheelSpin: number; // cumulative wheel rotation (rad)
  pitch: number; // suspension squat/dive (rad)
  roll: number; // suspension body roll (rad)
  braking: boolean;
  reversing: boolean;
  handbrake: boolean;
  impactSpeed: number; // >0 if collided this step
}

export interface VehicleControlInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1 (right) to +1 (left)
  handbrake: boolean;
}

export function createInitialVehicleState(x: number, z: number, heading: number): VehicleBodyState {
  return {
    x,
    z,
    heading,
    vx: 0,
    vz: 0,
    speed: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitch: 0,
    roll: 0,
    braking: false,
    reversing: false,
    handbrake: false,
    impactSpeed: 0,
  };
}

/**
 * Pure, deterministic arcade vehicle physics step.
 * Forward direction in world space for heading `h` is:
 *   fx = -Math.sin(h), fz = -Math.cos(h)
 * (Matches Three.js Object3D where local -Z is forward and +Y rotation turns left.)
 */
export function stepVehiclePhysics(
  state: VehicleBodyState,
  spec: VehicleSpec,
  input: VehicleControlInput,
  dt: number,
  colliders: readonly ColliderBox[],
  wetRoadFactor: number = 0, // 0 = dry, 1 = wet rain
): VehicleBodyState {
  const safeDt = Math.min(dt, 0.05);
  const fx = -Math.sin(state.heading);
  const fz = -Math.cos(state.heading);
  const rx = Math.cos(state.heading);
  const rz = -Math.sin(state.heading);

  let forwardVel = state.vx * fx + state.vz * fz;
  let lateralVel = state.vx * rx + state.vz * rz;

  let braking = false;
  let reversing = false;
  let accelApplied = 0;

  if (input.handbrake) {
    braking = true;
    const hbDecel = spec.braking * 0.85 * (1 - wetRoadFactor * 0.25);
    if (Math.abs(forwardVel) <= hbDecel * safeDt) {
      forwardVel = 0;
    } else {
      forwardVel -= Math.sign(forwardVel) * hbDecel * safeDt;
      accelApplied = -Math.sign(forwardVel) * hbDecel;
    }
  } else {
    if (input.throttle > 0) {
      if (forwardVel < -0.5) {
        // Braking from reverse
        braking = true;
        forwardVel += spec.braking * input.throttle * safeDt;
        accelApplied = spec.braking * input.throttle;
      } else {
        // Forward acceleration with realistic top-end taper
        const speedRatio = clamp(forwardVel / spec.maxSpeed, 0, 1);
        const torqueScale = 1 - speedRatio * 0.58;
        const deltaV = spec.acceleration * torqueScale * input.throttle * safeDt;
        forwardVel = Math.min(spec.maxSpeed, forwardVel + deltaV);
        accelApplied = deltaV / Math.max(safeDt, 0.001);
      }
    }

    if (input.brake > 0) {
      if (forwardVel > 0.6) {
        braking = true;
        const deltaV = spec.braking * input.brake * safeDt;
        forwardVel = Math.max(0, forwardVel - deltaV);
        accelApplied = -deltaV / Math.max(safeDt, 0.001);
      } else {
        reversing = true;
        const deltaV = spec.acceleration * 0.65 * input.brake * safeDt;
        forwardVel = Math.max(-spec.reverseSpeed, forwardVel - deltaV);
        accelApplied = -deltaV / Math.max(safeDt, 0.001);
      }
    }
  }

  // Rolling drag + aerodynamic drag
  const rollingDrag = input.throttle === 0 && input.brake === 0 ? 3.2 : 0.45;
  const aeroDrag = 0.006 * forwardVel * Math.abs(forwardVel);
  const dragDecel = (rollingDrag + Math.abs(aeroDrag)) * safeDt;
  if (Math.abs(forwardVel) <= dragDecel && input.throttle === 0 && input.brake === 0) {
    forwardVel = 0;
  } else if (Math.abs(forwardVel) > 0.001) {
    forwardVel -= Math.sign(forwardVel) * Math.min(Math.abs(forwardVel), dragDecel);
  }

  // Speed-dependent steering response (stable at high speed, nimble at city speeds)
  const absSpeed = Math.abs(forwardVel);
  const minTurnEngage = clamp(absSpeed / 2.2, 0, 1);
  const highSpeedAtten = 1 - clamp((absSpeed - 12) / (spec.maxSpeed * 1.45), 0, 0.55);
  const reverseSign = forwardVel < -0.2 ? -1 : 1;
  const handbrakeTurnBoost = input.handbrake && absSpeed > 5 ? 1.25 : 1.0;

  const targetSteerAngle = input.steer * 0.52 * highSpeedAtten;
  const steerAngle =
    state.steerAngle + (targetSteerAngle - state.steerAngle) * (1 - Math.exp(-14 * safeDt));

  const yawRate =
    input.steer *
    spec.turnRate *
    minTurnEngage *
    highSpeedAtten *
    handbrakeTurnBoost *
    reverseSign;

  const nextHeading = state.heading + yawRate * safeDt;

  // Lateral grip damping (drifts nicely on handbrake or wet roads)
  const baseGrip = input.handbrake ? spec.driftGrip : spec.grip;
  const effectiveGrip = baseGrip * (1 - wetRoadFactor * 0.28);
  lateralVel *= Math.exp(-effectiveGrip * safeDt);

  // Reconstruct world velocity from updated heading
  const nfx = -Math.sin(nextHeading);
  const nfz = -Math.cos(nextHeading);
  const nrx = Math.cos(nextHeading);
  const nrz = -Math.sin(nextHeading);

  let vx = nfx * forwardVel + nrx * lateralVel;
  let vz = nfz * forwardVel + nrz * lateralVel;

  let nextX = state.x + vx * safeDt;
  let nextZ = state.z + vz * safeDt;
  let impactSpeed = 0;

  // Collision against static city boxes + island perimeter
  const colRadius = Math.max(spec.width * 0.52, spec.length * 0.36);
  const res = resolveCircleVsBoxes(nextX, nextZ, colRadius, colliders);
  if (res.hit) {
    nextX = res.x;
    nextZ = res.z;
    const vn = vx * res.normalX + vz * res.normalZ;
    if (vn < 0) {
      impactSpeed = Math.abs(vn);
      // Slide along wall with slight bounce
      const restitution = 0.25;
      vx -= (1 + restitution) * vn * res.normalX;
      vz -= (1 + restitution) * vn * res.normalZ;
      vx *= 0.82;
      vz *= 0.82;
      forwardVel = vx * nfx + vz * nfz;
    }
  }

  const island = clampToPlayableIsland(nextX, nextZ, colRadius);
  if (island.clamped) {
    nextX = island.x;
    nextZ = island.z;
    impactSpeed = Math.max(impactSpeed, Math.abs(forwardVel) * 0.5);
    vx *= 0.4;
    vz *= 0.4;
    forwardVel *= 0.4;
  }

  // Suspension pitch (squat under accel, dive under braking) & roll (lean in turns)
  const targetPitch = clamp(-accelApplied * 0.0028, -0.055, 0.055);
  const targetRoll = clamp(-yawRate * absSpeed * 0.0042, -0.085, 0.085);
  const pitch = state.pitch + (targetPitch - state.pitch) * (1 - Math.exp(-9 * safeDt));
  const roll = state.roll + (targetRoll - state.roll) * (1 - Math.exp(-9 * safeDt));

  // Wheel rotation
  const wheelRadius = spec.height > 1.6 ? 0.42 : 0.34;
  const wheelSpin = state.wheelSpin + (forwardVel / wheelRadius) * safeDt;

  return {
    x: nextX,
    z: nextZ,
    heading: nextHeading,
    vx,
    vz,
    speed: forwardVel,
    steerAngle,
    wheelSpin,
    pitch,
    roll,
    braking,
    reversing,
    handbrake: input.handbrake,
    impactSpeed,
  };
}

export function computeGearLabel(speedMs: number, reversing: boolean): string {
  if (reversing && speedMs < -0.5) return 'R';
  const kmh = Math.abs(speedMs) * 3.6;
  if (kmh < 2) return 'N';
  if (kmh < 32) return '1';
  if (kmh < 58) return '2';
  if (kmh < 88) return '3';
  if (kmh < 116) return '4';
  return '5';
}
