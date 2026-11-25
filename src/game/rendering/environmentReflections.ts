import * as THREE from 'three';
import { GraphicsQuality } from '../types';
import { clamp, damp, lerp } from '../core/math';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface RGBLike {
  r: number;
  g: number;
  b: number;
}

export interface EnvironmentAtmosphereSnapshot {
  timeHours: number;
  sunDir: Vec3Like;
  moonDir: Vec3Like;
  skyTop: RGBLike;
  skyMid: RGBLike;
  skyHorizon: RGBLike;
  sunColor: RGBLike;
  moonColor: RGBLike;
  hemiGround: RGBLike;
  nightFactor: number;
  cloudCoverage: number;
  stormDarkness: number;
  rainAmount: number;
}

export interface EnvironmentQualityConfig {
  quality: GraphicsQuality;
  isSoftwareGl: boolean;
  /** Minimum seconds between gradual continuous environment PMREM refreshes */
  minIntervalSec: number;
  /** PMREM prefilter blur sigma passed to PMREMGenerator.fromScene */
  sigma: number;
  /** Minimum dot-product drift on sun/moon direction to trigger gradual refresh */
  sunDotThreshold: number;
  /** Minimum scalar delta (night/cloud/storm/rain) to trigger gradual refresh */
  scalarDeltaThreshold: number;
  /** Minimum max-channel RGB delta on sky colors to trigger gradual refresh */
  colorDeltaThreshold: number;
  /** Intensity multiplier for coastal urban neon horizon accents at night (0..1) */
  urbanAccentWeight: number;
  /** Cloud reflection pattern detail (0 = simple, 1 = layered) */
  cloudDetail: number;
}

export interface EnvironmentDelta {
  sunDot: number;
  moonDot: number;
  nightDelta: number;
  cloudDelta: number;
  stormDelta: number;
  rainDelta: number;
  colorDelta: number;
  isMajorTransition: boolean;
}

export interface EnvironmentRefreshDecision {
  refresh: boolean;
  reason: 'initial' | 'forced' | 'major_transition' | 'threshold_exceeded' | 'interval_throttled' | 'cached';
  delta: EnvironmentDelta | null;
}

export interface EnvironmentSystemStats {
  refreshCount: number;
  hasValidEnvironment: boolean;
  lastRefreshReason: EnvironmentRefreshDecision['reason'] | 'none';
  currentIntensity: number;
  config: EnvironmentQualityConfig;
}

export function getEnvironmentQualityConfig(
  quality: GraphicsQuality,
  isSoftwareGl: boolean,
): EnvironmentQualityConfig {
  if (isSoftwareGl) {
    return {
      quality,
      isSoftwareGl: true,
      minIntervalSec: quality === GraphicsQuality.Low ? 9.0 : 5.0,
      sigma: 0.045,
      sunDotThreshold: 0.996,
      scalarDeltaThreshold: 0.09,
      colorDeltaThreshold: 0.08,
      urbanAccentWeight: quality === GraphicsQuality.Low ? 0.55 : 0.85,
      cloudDetail: 0,
    };
  }

  switch (quality) {
    case GraphicsQuality.Low:
      return {
        quality,
        isSoftwareGl: false,
        minIntervalSec: 8.0,
        sigma: 0.055,
        sunDotThreshold: 0.995,
        scalarDeltaThreshold: 0.11,
        colorDeltaThreshold: 0.1,
        urbanAccentWeight: 0.55,
        cloudDetail: 0,
      };
    case GraphicsQuality.Medium:
      return {
        quality,
        isSoftwareGl: false,
        minIntervalSec: 3.5,
        sigma: 0.032,
        sunDotThreshold: 0.9985,
        scalarDeltaThreshold: 0.055,
        colorDeltaThreshold: 0.055,
        urbanAccentWeight: 0.85,
        cloudDetail: 1,
      };
    case GraphicsQuality.High:
    default:
      return {
        quality: GraphicsQuality.High,
        isSoftwareGl: false,
        minIntervalSec: 1.5,
        sigma: 0.02,
        sunDotThreshold: 0.9994,
        scalarDeltaThreshold: 0.035,
        colorDeltaThreshold: 0.035,
        urbanAccentWeight: 1.0,
        cloudDetail: 1,
      };
  }
}

function rgbMaxDiff(a: RGBLike, b: RGBLike): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

function safeDotNormalized(a: Vec3Like, b: Vec3Like): number {
  const lenA = Math.hypot(a.x, a.y, a.z);
  const lenB = Math.hypot(b.x, b.y, b.z);
  if (lenA < 1e-6 || lenB < 1e-6) return 1;
  return clamp((a.x * b.x + a.y * b.y + a.z * b.z) / (lenA * lenB), -1, 1);
}

export function computeEnvironmentDelta(
  prev: EnvironmentAtmosphereSnapshot,
  next: EnvironmentAtmosphereSnapshot,
): EnvironmentDelta {
  const sunDot = safeDotNormalized(prev.sunDir, next.sunDir);
  const moonDot = safeDotNormalized(prev.moonDir, next.moonDir);
  const nightDelta = Math.abs(prev.nightFactor - next.nightFactor);
  const cloudDelta = Math.abs(prev.cloudCoverage - next.cloudCoverage);
  const stormDelta = Math.abs(prev.stormDarkness - next.stormDarkness);
  const rainDelta = Math.abs(prev.rainAmount - next.rainAmount);
  const colorDelta = Math.max(
    rgbMaxDiff(prev.skyTop, next.skyTop),
    rgbMaxDiff(prev.skyMid, next.skyMid),
    rgbMaxDiff(prev.skyHorizon, next.skyHorizon),
  );

  // Instantaneous preset/weather jumps bypass continuous throttle so reflections stay aligned
  const isMajorTransition =
    sunDot < 0.985 ||
    moonDot < 0.985 ||
    nightDelta > 0.18 ||
    cloudDelta > 0.18 ||
    stormDelta > 0.18 ||
    rainDelta > 0.22 ||
    colorDelta > 0.16;

  return {
    sunDot,
    moonDot,
    nightDelta,
    cloudDelta,
    stormDelta,
    rainDelta,
    colorDelta,
    isMajorTransition,
  };
}

export function shouldRefreshEnvironment(
  prev: EnvironmentAtmosphereSnapshot | null,
  next: EnvironmentAtmosphereSnapshot,
  elapsedSec: number,
  config: EnvironmentQualityConfig,
  force = false,
): EnvironmentRefreshDecision {
  if (force) {
    return {
      refresh: true,
      reason: 'forced',
      delta: prev ? computeEnvironmentDelta(prev, next) : null,
    };
  }
  if (!prev) {
    return { refresh: true, reason: 'initial', delta: null };
  }

  const delta = computeEnvironmentDelta(prev, next);
  if (delta.isMajorTransition) {
    return { refresh: true, reason: 'major_transition', delta };
  }

  if (elapsedSec < config.minIntervalSec) {
    return { refresh: false, reason: 'interval_throttled', delta };
  }

  const exceedsThreshold =
    delta.sunDot < config.sunDotThreshold ||
    delta.moonDot < config.sunDotThreshold ||
    delta.nightDelta >= config.scalarDeltaThreshold ||
    delta.cloudDelta >= config.scalarDeltaThreshold ||
    delta.stormDelta >= config.scalarDeltaThreshold ||
    delta.rainDelta >= config.scalarDeltaThreshold ||
    delta.colorDelta >= config.colorDeltaThreshold;

  if (exceedsThreshold) {
    return { refresh: true, reason: 'threshold_exceeded', delta };
  }

  return { refresh: false, reason: 'cached', delta };
}

/**
 * Computes balanced global scene.environmentIntensity for linear coastal PMREM IBL.
 * Keeps daylight glossy reflections vibrant without washing out midday surfaces,
 * while keeping night base IBL restrained (< 0.15) so shadows remain dark and neon pops.
 */
export function computeEnvironmentIntensity(
  nightFactor: number,
  cloudCoverage: number,
  stormDarkness: number,
  quality: GraphicsQuality = GraphicsQuality.High,
): number {
  const n = clamp(nightFactor, 0, 1);
  const c = clamp(cloudCoverage, 0, 1);
  const s = clamp(stormDarkness, 0, 1);

  const dayTarget =
    quality === GraphicsQuality.Low ? 0.72 : quality === GraphicsQuality.Medium ? 0.8 : 0.86;
  const nightTarget =
    quality === GraphicsQuality.Low ? 0.12 : quality === GraphicsQuality.Medium ? 0.135 : 0.142;

  const base = lerp(dayTarget, nightTarget, n);
  // During night storms, wet surfaces and urban glow still reflect atmospheric light, so attenuate less aggressively at night
  const stormWeight = 0.28 * (1 - n * 0.72);
  const cloudWeight = 0.08 * (1 - n * 0.5);
  const weatherMult = clamp(1 - s * stormWeight - c * cloudWeight, 0.58, 1.0);
  return base * weatherMult;
}

const ENV_DOME_VERTEX_SHADER = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Linear HDR procedural tropical coastal reflection dome rendered exclusively into
 * PMREMGenerator (not visible as the player sky dome). Captures:
 * - Accurate time-of-day atmospheric sky gradient (zenith -> mid -> horizon)
 * - Directional HDR sun disc + golden-hour scattering halo
 * - Directional HDR moon halo at night
 * - Soft cloud-cover reflectance variation
 * - Eastern Atlantic ocean bounce vs Western Vice City urban bounce + subtle night neon horizon
 *
 * NOTE: Deliberately omits tonemapping/sRGB conversion so PMREM stores true linear HDR radiance.
 */
const ENV_DOME_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uSunColor;
uniform vec3 uMoonColor;
uniform vec3 uHemiGround;
uniform float uNightFactor;
uniform float uCloudCoverage;
uniform float uStormDarkness;
uniform float uRainAmount;
uniform float uUrbanAccentWeight;
uniform float uCloudDetail;

varying vec3 vDir;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec3 dir = normalize(vDir);
  float y = dir.y;
  float dayAmt = clamp(1.0 - uNightFactor, 0.0, 1.0);
  float clearSky = clamp(1.0 - uStormDarkness * 0.88 - uCloudCoverage * 0.22, 0.06, 1.0);

  // 1. Upper Hemisphere: Atmospheric Sky Gradient
  float hUp = clamp(y, 0.0, 1.0);
  vec3 skyCol = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.28, hUp));
  skyCol = mix(skyCol, uSkyTop, smoothstep(0.20, 0.86, hUp));

  // Subtle low-sun golden/sunset warm horizon band
  float sunElev = clamp(uSunDir.y, -0.2, 1.0);
  float lowSunWarmth = smoothstep(0.45, 0.03, sunElev) * smoothstep(-0.14, 0.04, sunElev);
  float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
  float moonCos = max(dot(dir, normalize(uMoonDir)), 0.0);
  float horizonBand = exp(-abs(y) * 5.2);

  skyCol += uSunColor * (0.28 + 0.55 * lowSunWarmth) * pow(sunCos, 3.0) * horizonBand * clearSky * dayAmt;

  // 2. Soft procedural cloud-deck luminance variation in upper sky reflections
  if (y > 0.02) {
    vec2 cloudUv = dir.xz / (y + 0.24) * 1.15;
    float c1 = valueNoise(cloudUv);
    float c2 = uCloudDetail > 0.5 ? valueNoise(cloudUv * 2.3 + vec2(4.2, -1.7)) : 0.5;
    float cloudNoise = c1 * 0.65 + c2 * 0.35;
    float cloudMask = smoothstep(1.05 - uCloudCoverage * 0.88, 1.25 - uCloudCoverage * 0.55, cloudNoise);
    cloudMask *= smoothstep(0.02, 0.16, y);

    vec3 sunlitCloud = mix(vec3(0.96, 0.97, 1.0), uSunColor * 1.15, lowSunWarmth * 0.72);
    vec3 stormCloud = mix(vec3(0.22, 0.26, 0.32), vec3(0.06, 0.08, 0.12), uStormDarkness);
    vec3 nightCloud = vec3(0.05, 0.08, 0.15) + uMoonColor * pow(moonCos, 5.0) * 0.12;
    vec3 cloudCol = mix(mix(sunlitCloud, stormCloud, uStormDarkness * 0.85), nightCloud, uNightFactor);
    skyCol = mix(skyCol, cloudCol, cloudMask * (0.35 + uCloudCoverage * 0.52));
  }

  // 3. Directional Linear HDR Solar Disc + Mie Halo (drives natural car/glass/ocean specular highlights)
  float sunVisible = smoothstep(-0.04, 0.07, uSunDir.y) * clearSky;
  float sunHalo = pow(sunCos, 24.0) * 0.75 + pow(sunCos, 160.0) * 2.85;
  skyCol += uSunColor * sunHalo * sunVisible * (1.0 - uNightFactor * 0.85);

  // 4. Directional Linear HDR Moon Halo at Night
  float moonVisible = smoothstep(0.0, 0.10, uMoonDir.y) * uNightFactor * clamp(1.0 - uStormDarkness * 0.82, 0.12, 1.0);
  float moonHalo = pow(moonCos, 16.0) * 0.65 + pow(moonCos, 140.0) * 3.8;
  skyCol += uMoonColor * moonHalo * moonVisible;
  // Subtle deep indigo coastal night sky lift so specular car roofs & puddles reflect visible night sky gradient
  skyCol += vec3(0.055, 0.11, 0.22) * smoothstep(-0.05, 0.45, y) * uNightFactor * (1.0 - uStormDarkness * 0.35);

  // 5. Coastal Ground / Ocean Lower Hemisphere Bounce (y < 0)
  // East (+X) = Atlantic Ocean bounce; West (-X) = Vice City limestone/asphalt urban bounce
  float eastOceanMask = smoothstep(-0.25, 0.35, dir.x);
  vec3 dayOceanBounce = mix(vec3(0.06, 0.24, 0.34), vec3(0.11, 0.38, 0.46), clamp(1.0 - uStormDarkness, 0.0, 1.0));
  vec3 nightOceanBounce = vec3(0.02, 0.045, 0.09) + uMoonColor * pow(max(dot(vec3(dir.x, -dir.y, dir.z), normalize(uMoonDir)), 0.0), 22.0) * 0.6 * moonVisible;
  vec3 oceanBounce = mix(dayOceanBounce, nightOceanBounce, uNightFactor);
  // Subtle sunlit glint on eastern ocean bounce
  vec3 oceanReflDir = normalize(vec3(dir.x, abs(dir.y), dir.z));
  oceanBounce += uSunColor * pow(max(dot(oceanReflDir, normalize(uSunDir)), 0.0), 28.0) * 0.55 * sunVisible * dayAmt;

  vec3 urbanGroundBounce = mix(uHemiGround * 0.65 + vec3(0.08, 0.075, 0.07), vec3(0.025, 0.032, 0.055), uNightFactor);
  vec3 groundCol = mix(urbanGroundBounce, oceanBounce, eastOceanMask);
  // Blend softly across horizon band so grazing reflections transition smoothly without a harsh equator seam
  vec3 finalCol = mix(groundCol, skyCol, smoothstep(-0.08, 0.06, y));

  // 6. Vice City Night Coastal Metropolis Horizon Neon & Streetlamp Accents
  // Calibrated in linear HDR so with restrained night scene.environmentIntensity (~0.13-0.14),
  // rough matte surfaces stay dark while low-roughness clearcoat cars, skyscraper glass, and wet puddles
  // catch vivid magenta/cyan/warm-amber coastal city reflections.
  if (uNightFactor > 0.05 && uUrbanAccentWeight > 0.01) {
    float az = atan(dir.z, dir.x);
    float citySide = smoothstep(0.75, -0.25, dir.x); // stronger toward Downtown / Neon Mile / Ocean Drive hotel strip
    float skylineBand = exp(-pow((y - 0.06) * 6.5, 2.0));
    float upperGlowBand = exp(-pow((y - 0.28) * 3.8, 2.0));
    float ribbonA = pow(0.5 + 0.5 * sin(az * 7.0 + 0.6), 3.0);
    float ribbonB = pow(0.5 + 0.5 * sin(az * 11.0 - 1.4), 3.5);
    float ribbonC = pow(0.5 + 0.5 * sin(az * 5.0 + 2.3), 2.5);
    float lampSpots = pow(0.5 + 0.5 * sin(az * 16.0 + 0.3), 6.0);

    vec3 neonMagenta = vec3(1.0, 0.24, 0.66) * ribbonA * 4.2;
    vec3 neonCyan = vec3(0.20, 0.88, 1.0) * ribbonB * 3.8;
    vec3 hotelAmber = vec3(1.0, 0.74, 0.36) * ribbonC * 3.2;
    vec3 streetLampSheen = vec3(1.0, 0.80, 0.48) * lampSpots * upperGlowBand * 2.6;

    float rainWetBoost = 1.0 + uRainAmount * 0.65;
    float nightWeight = pow(uNightFactor, 1.15) * uUrbanAccentWeight * rainWetBoost;
    finalCol += (neonMagenta + neonCyan + hotelAmber) * skylineBand * (0.42 + 0.58 * citySide) * nightWeight;
    finalCol += streetLampSheen * nightWeight;
  }

  gl_FragColor = vec4(max(finalCol, vec3(0.0)), 1.0);
}
`;

function cloneSnapshot(src: EnvironmentAtmosphereSnapshot): EnvironmentAtmosphereSnapshot {
  return {
    timeHours: src.timeHours,
    sunDir: { x: src.sunDir.x, y: src.sunDir.y, z: src.sunDir.z },
    moonDir: { x: src.moonDir.x, y: src.moonDir.y, z: src.moonDir.z },
    skyTop: { r: src.skyTop.r, g: src.skyTop.g, b: src.skyTop.b },
    skyMid: { r: src.skyMid.r, g: src.skyMid.g, b: src.skyMid.b },
    skyHorizon: { r: src.skyHorizon.r, g: src.skyHorizon.g, b: src.skyHorizon.b },
    sunColor: { r: src.sunColor.r, g: src.sunColor.g, b: src.sunColor.b },
    moonColor: { r: src.moonColor.r, g: src.moonColor.g, b: src.moonColor.b },
    hemiGround: { r: src.hemiGround.r, g: src.hemiGround.g, b: src.hemiGround.b },
    nightFactor: src.nightFactor,
    cloudCoverage: src.cloudCoverage,
    stormDarkness: src.stormDarkness,
    rainAmount: src.rainAmount,
  };
}

function copySnapshotInto(
  dst: EnvironmentAtmosphereSnapshot,
  src: EnvironmentAtmosphereSnapshot,
): void {
  dst.timeHours = src.timeHours;
  dst.sunDir.x = src.sunDir.x;
  dst.sunDir.y = src.sunDir.y;
  dst.sunDir.z = src.sunDir.z;
  dst.moonDir.x = src.moonDir.x;
  dst.moonDir.y = src.moonDir.y;
  dst.moonDir.z = src.moonDir.z;
  dst.skyTop.r = src.skyTop.r;
  dst.skyTop.g = src.skyTop.g;
  dst.skyTop.b = src.skyTop.b;
  dst.skyMid.r = src.skyMid.r;
  dst.skyMid.g = src.skyMid.g;
  dst.skyMid.b = src.skyMid.b;
  dst.skyHorizon.r = src.skyHorizon.r;
  dst.skyHorizon.g = src.skyHorizon.g;
  dst.skyHorizon.b = src.skyHorizon.b;
  dst.sunColor.r = src.sunColor.r;
  dst.sunColor.g = src.sunColor.g;
  dst.sunColor.b = src.sunColor.b;
  dst.moonColor.r = src.moonColor.r;
  dst.moonColor.g = src.moonColor.g;
  dst.moonColor.b = src.moonColor.b;
  dst.hemiGround.r = src.hemiGround.r;
  dst.hemiGround.g = src.hemiGround.g;
  dst.hemiGround.b = src.hemiGround.b;
  dst.nightFactor = src.nightFactor;
  dst.cloudCoverage = src.cloudCoverage;
  dst.stormDarkness = src.stormDarkness;
  dst.rainAmount = src.rainAmount;
}

/**
 * Reusable dynamic tropical coastal PMREM environment reflection system.
 * Generates time-of-day and weather-accurate global IBL reflections from a lightweight
 * procedural coastal sky dome without static RoomEnvironment studio lighting or
 * expensive recursive scene cubemap rendering.
 */
export class DynamicEnvironmentSystem {
  private readonly scene: THREE.Scene;
  private readonly isSoftwareGl: boolean;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly envScene: THREE.Scene;
  private readonly envDomeGeo: THREE.SphereGeometry;
  private readonly envDomeMat: THREE.ShaderMaterial;
  private readonly envDomeMesh: THREE.Mesh;

  private config: EnvironmentQualityConfig;
  private currentRT: THREE.WebGLRenderTarget | null = null;
  private lastSnapshot: EnvironmentAtmosphereSnapshot | null = null;
  private elapsedSinceRefresh = 0;
  private refreshCount = 0;
  private lastRefreshReason: EnvironmentSystemStats['lastRefreshReason'] = 'none';
  private currentIntensity = 0.72;
  private pendingQualityRefresh = false;
  private disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    quality: GraphicsQuality,
    isSoftwareGl: boolean,
  ) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.config = getEnvironmentQualityConfig(quality, isSoftwareGl);

    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileCubemapShader();

    this.envScene = new THREE.Scene();
    this.envDomeGeo = new THREE.SphereGeometry(40, 24, 16);
    this.envDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uSkyTop: { value: new THREE.Color(0x254f85) },
        uSkyMid: { value: new THREE.Color(0x748fb2) },
        uSkyHorizon: { value: new THREE.Color(0xdeb396) },
        uSunDir: { value: new THREE.Vector3(-0.82, 0.43, -0.37) },
        uMoonDir: { value: new THREE.Vector3(0.5, 0.29, -0.81) },
        uSunColor: { value: new THREE.Color(0xffbd70) },
        uMoonColor: { value: new THREE.Color(0x9cbef5) },
        uHemiGround: { value: new THREE.Color(0x544a48) },
        uNightFactor: { value: 0.18 },
        uCloudCoverage: { value: 0.28 },
        uStormDarkness: { value: 0.0 },
        uRainAmount: { value: 0.0 },
        uUrbanAccentWeight: { value: this.config.urbanAccentWeight },
        uCloudDetail: { value: this.config.cloudDetail },
      },
      vertexShader: ENV_DOME_VERTEX_SHADER,
      fragmentShader: ENV_DOME_FRAGMENT_SHADER,
    });
    this.envDomeMesh = new THREE.Mesh(this.envDomeGeo, this.envDomeMat);
    this.envScene.add(this.envDomeMesh);
  }

  public setQuality(quality: GraphicsQuality): void {
    const nextConfig = getEnvironmentQualityConfig(quality, this.isSoftwareGl);
    const qualityChanged =
      nextConfig.quality !== this.config.quality ||
      nextConfig.sigma !== this.config.sigma ||
      nextConfig.urbanAccentWeight !== this.config.urbanAccentWeight ||
      nextConfig.cloudDetail !== this.config.cloudDetail;

    this.config = nextConfig;
    this.envDomeMat.uniforms.uUrbanAccentWeight.value = this.config.urbanAccentWeight;
    this.envDomeMat.uniforms.uCloudDetail.value = this.config.cloudDetail;

    if (qualityChanged && this.lastSnapshot) {
      this.pendingQualityRefresh = true;
    }
  }

  public update(
    dt: number,
    snapshot: EnvironmentAtmosphereSnapshot,
    force = false,
  ): boolean {
    if (this.disposed) return false;
    const safeDt = clamp(dt, 0, 0.25);
    this.elapsedSinceRefresh += safeDt;

    // Smoothly modulate scene.environmentIntensity every frame so transitions never pop
    const targetIntensity = computeEnvironmentIntensity(
      snapshot.nightFactor,
      snapshot.cloudCoverage,
      snapshot.stormDarkness,
      this.config.quality,
    );
    if (force || !this.currentRT) {
      this.currentIntensity = targetIntensity;
    } else {
      this.currentIntensity = damp(this.currentIntensity, targetIntensity, 4.5, safeDt);
    }
    this.scene.environmentIntensity = this.currentIntensity;

    const effectiveForce = force || this.pendingQualityRefresh;
    this.pendingQualityRefresh = false;

    const decision = shouldRefreshEnvironment(
      this.lastSnapshot,
      snapshot,
      this.elapsedSinceRefresh,
      this.config,
      effectiveForce,
    );

    if (!decision.refresh) {
      return false;
    }

    return this.regenerateFromSnapshot(snapshot, decision.reason);
  }

  private regenerateFromSnapshot(
    snapshot: EnvironmentAtmosphereSnapshot,
    reason: EnvironmentRefreshDecision['reason'],
  ): boolean {
    const u = this.envDomeMat.uniforms;
    (u.uSkyTop.value as THREE.Color).setRGB(snapshot.skyTop.r, snapshot.skyTop.g, snapshot.skyTop.b);
    (u.uSkyMid.value as THREE.Color).setRGB(snapshot.skyMid.r, snapshot.skyMid.g, snapshot.skyMid.b);
    (u.uSkyHorizon.value as THREE.Color).setRGB(
      snapshot.skyHorizon.r,
      snapshot.skyHorizon.g,
      snapshot.skyHorizon.b,
    );
    (u.uSunDir.value as THREE.Vector3).set(snapshot.sunDir.x, snapshot.sunDir.y, snapshot.sunDir.z);
    (u.uMoonDir.value as THREE.Vector3).set(
      snapshot.moonDir.x,
      snapshot.moonDir.y,
      snapshot.moonDir.z,
    );
    (u.uSunColor.value as THREE.Color).setRGB(
      snapshot.sunColor.r,
      snapshot.sunColor.g,
      snapshot.sunColor.b,
    );
    (u.uMoonColor.value as THREE.Color).setRGB(
      snapshot.moonColor.r,
      snapshot.moonColor.g,
      snapshot.moonColor.b,
    );
    (u.uHemiGround.value as THREE.Color).setRGB(
      snapshot.hemiGround.r,
      snapshot.hemiGround.g,
      snapshot.hemiGround.b,
    );
    u.uNightFactor.value = snapshot.nightFactor;
    u.uCloudCoverage.value = snapshot.cloudCoverage;
    u.uStormDarkness.value = snapshot.stormDarkness;
    u.uRainAmount.value = snapshot.rainAmount;

    try {
      const nextRT = this.pmremGenerator.fromScene(this.envScene, this.config.sigma);
      const prevRT = this.currentRT;
      this.currentRT = nextRT;
      this.scene.environment = nextRT.texture;
      if (prevRT) {
        prevRT.dispose();
      }

      if (!this.lastSnapshot) {
        this.lastSnapshot = cloneSnapshot(snapshot);
      } else {
        copySnapshotInto(this.lastSnapshot, snapshot);
      }
      this.elapsedSinceRefresh = 0;
      this.refreshCount += 1;
      this.lastRefreshReason = reason;
      return true;
    } catch {
      // Safe fallback: preserve the previous valid environment render target if regeneration fails
      return false;
    }
  }

  public getStats(): EnvironmentSystemStats {
    return {
      refreshCount: this.refreshCount,
      hasValidEnvironment: this.currentRT !== null,
      lastRefreshReason: this.lastRefreshReason,
      currentIntensity: this.currentIntensity,
      config: { ...this.config },
    };
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.scene.environment && this.currentRT && this.scene.environment === this.currentRT.texture) {
      this.scene.environment = null;
    }
    if (this.currentRT) {
      this.currentRT.dispose();
      this.currentRT = null;
    }
    this.envDomeGeo.dispose();
    this.envDomeMat.dispose();
    this.pmremGenerator.dispose();
  }
}
