import * as THREE from 'three';
import { GraphicsQuality } from '../types';
import { clamp } from '../core/math';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface CelestialState {
  /** Normalized world-space direction from the scene toward the sun (+X East, -X West, -Z North). */
  sunDir: Vec3Like;
  /** Normalized world-space direction from the scene toward the moon. */
  moonDir: Vec3Like;
  /** Normalized world-space direction used by the active directional key light (matches sun by day, moon by night). */
  activeLightDir: Vec3Like;
  /** 0..1 smooth sun visibility / daylight weight (1 = full sun, 0 = below horizon). */
  sunWeight: number;
  /** 0..1 smooth moonlight weight (0 = day, 1 = night). */
  moonWeight: number;
  /** 0..1 smooth directional intensity envelope that dips gently at the sun->moon horizon handoff to prevent jumps. */
  keyLightEnvelope: number;
  /** True when the active directional light is tracking the moon rather than the sun. */
  isMoonActive: boolean;
}

export interface ShadowQualityConfig {
  enabled: boolean;
  mapSize: number;
  frustumHalfSize: number;
  near: number;
  far: number;
  lightDistance: number;
  bias: number;
  normalBias: number;
  radius: number;
}

export interface StabilizedShadowPlacement {
  targetX: number;
  targetY: number;
  targetZ: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  texelSize: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function normalizeVec3(x: number, y: number, z: number): Vec3Like {
  const len = Math.hypot(x, y, z);
  if (len < 1e-6) {
    return { x: 0, y: 1, z: 0 };
  }
  return { x: x / len, y: y / len, z: z / len };
}

/**
 * Computes a single consistent, normalized 24-hour sun and moon direction in city world space:
 *   +X = East (Atlantic Ocean), -X = West (Harbour / Sunset), -Z = North, +Z = South.
 *
 * The sun rises in the East-Northeast (~06:00), peaks high around 12:30 (~61 deg),
 * sits low in the West-Northwest during Golden Hour (17:24, ~24 deg) and Sunset (19:18, ~6 deg),
 * and hands off smoothly to an opposing moonlight arc across the night sky.
 */
export function computeCelestialState(timeHours: number): CelestialState {
  const h = ((timeHours % 24) + 24) % 24;
  const solarNoon = 12.6;
  const hourAngle = ((h - solarNoon) / 24) * Math.PI * 2;

  // Subtropical coastal solar orbit (true tilted celestial circle -> constant angular velocity, exact unit length)
  // Latitude ~35 deg, summer declination ~+22 deg so sunrise ~05:45, golden hour ~17:24 (~27 deg), sunset ~19:18 (~4.4 deg)
  const sunDec = (22 * Math.PI) / 180;
  const sunLat = (35 * Math.PI) / 180;
  const cosSunDec = Math.cos(sunDec);
  const sinSunDec = Math.sin(sunDec);
  const cosSunLat = Math.cos(sunLat);
  const sinSunLat = Math.sin(sunLat);

  const sunEqX = -Math.sin(hourAngle) * cosSunDec;
  const sunEqY = Math.cos(hourAngle) * cosSunDec;
  const sunDir = normalizeVec3(
    sunEqX,
    sunEqY * cosSunLat + sinSunDec * sinSunLat,
    sunEqY * sinSunLat - sinSunDec * cosSunLat,
  );

  // Coherent opposing lunar orbit across the night sky (visibly framed at ~17 deg over NE Atlantic at 22:30)
  const moonAngle = hourAngle + Math.PI;
  const moonDec = (5 * Math.PI) / 180;
  const moonLat = (76 * Math.PI) / 180;
  const cosMoonDec = Math.cos(moonDec);
  const sinMoonDec = Math.sin(moonDec);
  const cosMoonLat = Math.cos(moonLat);
  const sinMoonLat = Math.sin(moonLat);

  const moonEqX = -Math.sin(moonAngle) * cosMoonDec;
  const moonEqY = Math.cos(moonAngle) * cosMoonDec;
  const moonDir = normalizeVec3(
    moonEqX,
    moonEqY * cosMoonLat + sinMoonDec * sinMoonLat,
    -(moonEqY * sinMoonLat - sinMoonDec * cosMoonLat),
  );

  // Smooth sun/moon handoff across the horizon (zero directional pop at dusk or dawn)
  const switchY = 0.025;
  const sunWeight = smoothstep(-0.02, 0.08, sunDir.y);
  const belowSwitchFade = smoothstep(-switchY, 0.08, -sunDir.y);
  const moonAltitudeWeight = smoothstep(0.02, 0.16, moonDir.y);
  const moonWeight = belowSwitchFade * moonAltitudeWeight;
  const isMoonActive = sunDir.y < switchY && moonDir.y > 0.02;

  // Envelope touches 0 smoothly from both sides at sunDir.y === switchY so shadows never jump
  const keyLightEnvelope = isMoonActive
    ? moonWeight
    : smoothstep(switchY, 0.11, sunDir.y);

  // Active directional light matches the exact visible sun or moon direction
  const activeLightDir = isMoonActive ? moonDir : sunDir;

  return {
    sunDir,
    moonDir,
    activeLightDir,
    sunWeight,
    moonWeight,
    keyLightEnvelope,
    isMoonActive,
  };
}

/**
 * Returns calibrated directional shadow settings for each existing GraphicsQuality tier
 * while preserving the safe Software WebGL fallback.
 */
export function getShadowConfigForQuality(
  quality: GraphicsQuality,
  isSoftwareGl: boolean,
): ShadowQualityConfig {
  if (isSoftwareGl || quality === GraphicsQuality.Low) {
    return {
      enabled: false,
      mapSize: 512,
      frustumHalfSize: 64,
      near: 10,
      far: 320,
      lightDistance: 160,
      bias: -0.0005,
      normalBias: 0.04,
      radius: 1.5,
    };
  }

  if (quality === GraphicsQuality.Medium) {
    return {
      enabled: true,
      mapSize: 1024,
      frustumHalfSize: 72,
      near: 10,
      far: 340,
      lightDistance: 170,
      bias: -0.00035,
      normalBias: 0.035,
      radius: 2.0,
    };
  }

  // GraphicsQuality.High
  return {
    enabled: true,
    mapSize: 2048,
    frustumHalfSize: 88,
    near: 10,
    far: 360,
    lightDistance: 180,
    bias: -0.00028,
    normalBias: 0.028,
    radius: 2.5,
  };
}

/**
 * Computes a light-space texel-snapped shadow target and directional light position
 * so shadow texels stay locked in world space while the player walks or drives.
 */
export function computeStabilizedShadowPlacement(params: {
  focusX: number;
  focusZ: number;
  lightDir: Vec3Like;
  frustumHalfSize: number;
  mapSize: number;
  lightDistance: number;
  leadX?: number;
  leadZ?: number;
}): StabilizedShadowPlacement {
  const dir = normalizeVec3(params.lightDir.x, params.lightDir.y, params.lightDir.z);
  const safeMapSize = Math.max(64, params.mapSize);
  const texelSize = (params.frustumHalfSize * 2) / safeMapSize;

  // Orthonormal light basis: Z = +lightDir, X = right = worldUp x Z, Y = up = Z x right
  let rx = dir.z;
  let ry = 0;
  let rz = -dir.x;
  const rLen = Math.hypot(rx, ry, rz);
  if (rLen < 1e-5) {
    rx = 1;
    ry = 0;
    rz = 0;
  } else {
    rx /= rLen;
    rz /= rLen;
  }

  // up = dir x right
  const ux = dir.y * rz - dir.z * ry;
  const uy = dir.z * rx - dir.x * rz;
  const uz = dir.x * ry - dir.y * rx;

  const rawX = params.focusX + (params.leadX ?? 0);
  const rawY = 0;
  const rawZ = params.focusZ + (params.leadZ ?? 0);

  // Project onto light-space right/up/depth axes and snap right/up to integer texel increments
  const projRight = rawX * rx + rawY * ry + rawZ * rz;
  const projUp = rawX * ux + rawY * uy + rawZ * uz;
  const projDepth = rawX * dir.x + rawY * dir.y + rawZ * dir.z;

  const snappedRight = Math.round(projRight / texelSize) * texelSize;
  const snappedUp = Math.round(projUp / texelSize) * texelSize;

  const targetX = rx * snappedRight + ux * snappedUp + dir.x * projDepth;
  const targetY = ry * snappedRight + uy * snappedUp + dir.y * projDepth;
  const targetZ = rz * snappedRight + uz * snappedUp + dir.z * projDepth;

  return {
    targetX,
    targetY,
    targetZ,
    lightX: targetX + dir.x * params.lightDistance,
    lightY: targetY + dir.y * params.lightDistance,
    lightZ: targetZ + dir.z * params.lightDistance,
    texelSize,
  };
}

/**
 * Applies a ShadowQualityConfig cleanly to a THREE.DirectionalLight without leaking shadow maps.
 */
export function applyShadowConfigToLight(
  light: THREE.DirectionalLight,
  config: ShadowQualityConfig,
): void {
  light.castShadow = config.enabled;
  light.shadow.bias = config.bias;
  light.shadow.normalBias = config.normalBias;
  light.shadow.radius = config.radius;

  const cam = light.shadow.camera;
  const d = config.frustumHalfSize;
  let projDirty = false;
  if (
    cam.left !== -d ||
    cam.right !== d ||
    cam.top !== d ||
    cam.bottom !== -d ||
    cam.near !== config.near ||
    cam.far !== config.far
  ) {
    cam.left = -d;
    cam.right = d;
    cam.top = d;
    cam.bottom = -d;
    cam.near = config.near;
    cam.far = config.far;
    projDirty = true;
  }
  if (projDirty) {
    cam.updateProjectionMatrix();
  }

  if (!config.enabled) {
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
  } else if (
    light.shadow.mapSize.width !== config.mapSize ||
    light.shadow.mapSize.height !== config.mapSize
  ) {
    light.shadow.mapSize.width = config.mapSize;
    light.shadow.mapSize.height = config.mapSize;
    light.shadow.map?.dispose();
    light.shadow.map = null;
  }
}
