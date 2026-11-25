import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GraphicsQuality } from '../types';

export interface PostProcessingQualityConfig {
  enabled: boolean;
  bloomEnabled: boolean;
  bloomResolutionScale: number;
  bloomStrengthMultiplier: number;
  bloomRadius: number;
  bloomThresholdOffset: number;
  gradeEnabled: boolean;
}

export interface CinematicAtmosphereInput {
  timeHours: number;
  nightFactor: number;
  rainAmount: number;
  cloudAmount: number;
  stormDarkness: number;
  wantedStars: number;
}

export interface RgbTint {
  r: number;
  g: number;
  b: number;
}

export interface CinematicPostState {
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  shadowLift: number;
  shadowTint: RgbTint;
  highlightTint: RgbTint;
  vignetteStrength: number;
  grainStrength: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothWindow(value: number, center: number, halfWidth: number): number {
  let diff = Math.abs(value - center);
  if (diff > 12) diff = 24 - diff;
  if (diff >= halfWidth) return 0;
  const x = 1 - diff / halfWidth;
  return x * x * (3 - 2 * x);
}

/**
 * Returns post-processing configuration for the active GraphicsQuality and WebGL renderer mode.
 * - Low quality: disables EffectComposer and uses direct renderer.render(scene, camera) fallback.
 * - Medium quality: enables EffectComposer with half-resolution selective HDR bloom and colour grading.
 * - High quality: enables EffectComposer with high-resolution selective HDR bloom and colour grading.
 * - When isSoftwareGl is true on Medium/High, bloom resolution scale is kept compact so software WebGL
 *   remains responsive while preserving selective bloom and colour grading.
 */
export function getPostProcessingConfigForQuality(
  quality: GraphicsQuality,
  isSoftwareGl: boolean
): PostProcessingQualityConfig {
  if (quality === GraphicsQuality.Low) {
    return {
      enabled: false,
      bloomEnabled: false,
      bloomResolutionScale: 0,
      bloomStrengthMultiplier: 0,
      bloomRadius: 0,
      bloomThresholdOffset: 0.25,
      gradeEnabled: false,
    };
  }

  if (quality === GraphicsQuality.Medium) {
    return {
      enabled: true,
      bloomEnabled: true,
      bloomResolutionScale: isSoftwareGl ? 0.3 : 0.5,
      bloomStrengthMultiplier: 0.85,
      bloomRadius: 0.34,
      bloomThresholdOffset: 0.04,
      gradeEnabled: true,
    };
  }

  // GraphicsQuality.High
  return {
    enabled: true,
    bloomEnabled: true,
    bloomResolutionScale: isSoftwareGl ? 0.38 : 0.75,
    bloomStrengthMultiplier: 1.0,
    bloomRadius: 0.42,
    bloomThresholdOffset: 0.0,
    gradeEnabled: true,
  };
}

/**
 * Computes continuous, time-of-day and weather-responsive selective HDR bloom
 * and cinematic colour-grading parameters.
 *
 * Ordinary diffuse materials in linear HDR space remain <= 1.0, so a bloom threshold
 * between 1.08 and 1.26 ensures ONLY genuine HDR emissive sources (neon signs, vehicle headlights,
 * brake lights, police lightbars, streetlights, traffic signals, illuminated night windows) bloom.
 */
export function computeCinematicPostState(
  input: CinematicAtmosphereInput,
  config: PostProcessingQualityConfig
): CinematicPostState {
  const h = ((input.timeHours % 24) + 24) % 24;
  const night = clamp(input.nightFactor, 0, 1);
  const rain = clamp(input.rainAmount, 0, 1);
  const clouds = clamp(input.cloudAmount, 0, 1);
  const storm = clamp(input.stormDarkness, 0, 1);
  const stars = clamp(input.wantedStars, 0, 5);

  // Smooth time-of-day windows
  const morningWeight = smoothWindow(h, 8.0, 2.5);
  const middayWeight = smoothWindow(h, 13.0, 3.5);
  const goldenHourWeight = Math.max(smoothWindow(h, 17.5, 1.8), smoothWindow(h, 6.4, 1.3) * 0.7);
  const sunsetWeight = smoothWindow(h, 19.2, 1.6);
  const goldenOrSunset = clamp(goldenHourWeight + sunsetWeight * 0.85, 0, 1);
  const stormDamping = 1 - clamp(rain * 0.65 + storm * 0.45, 0, 0.85);

  // Selective HDR Bloom:
  // Daytime: high threshold (~1.24) + restrained strength (~0.18) so sunlit buildings/roads/clouds never bloom.
  // Golden Hour / Sunset: warm subtle threshold (~1.16) + strength (~0.27).
  // Night: threshold (~1.08) + rich strength (~0.52) for neon signs, headlights, taillights, and hotel windows.
  // Rainy Night: boosted strength (~0.62) for wet atmospheric glow around neon & streetlamps.
  // Police Pursuit: subtle emergency lightbar boost without washing out the screen.
  const baseStrength =
    0.17 +
    goldenOrSunset * 0.11 * stormDamping +
    night * 0.34 +
    rain * (0.06 + night * 0.08) +
    (stars > 0 ? Math.min(0.07, stars * 0.02) : 0);

  const bloomStrength = config.bloomEnabled
    ? clamp(baseStrength * config.bloomStrengthMultiplier, 0, 0.78)
    : 0;

  const bloomThreshold = clamp(
    1.24 - goldenOrSunset * 0.06 - night * 0.15 - rain * 0.02 + config.bloomThresholdOffset,
    1.05,
    1.45
  );

  const bloomRadius = config.bloomEnabled
    ? clamp(config.bloomRadius + night * 0.06 + rain * 0.04, 0.2, 0.58)
    : 0;

  // Exposure: balanced in midday, warm lift in golden hour/sunset, clear readable night & rainy night
  const exposure = clamp(
    1.07 +
      morningWeight * 0.02 -
      middayWeight * 0.01 +
      goldenHourWeight * 0.05 * stormDamping +
      sunsetWeight * 0.06 * stormDamping +
      night * 0.08 +
      rain * 0.03,
    0.98,
    1.24
  );

  // Contrast: crisp in midday & golden hour, balanced at night so darks aren't crushed
  const contrast = clamp(
    1.045 +
      middayWeight * 0.015 +
      goldenOrSunset * 0.025 * stormDamping +
      night * 0.02 -
      rain * 0.01,
    1.0,
    1.12
  );

  // Saturation: clean natural in morning/midday, rich coastal warmth in golden hour, slightly cooled in rain
  const saturation = clamp(
    1.04 +
      morningWeight * 0.02 +
      goldenHourWeight * 0.055 * stormDamping +
      sunsetWeight * 0.05 * stormDamping +
      night * 0.035 -
      rain * 0.055 -
      clouds * 0.02,
    0.94,
    1.14
  );

  // Warmth: positive during golden hour & sunset, neutral in midday, cool negative shift at night & rain
  const warmth = clamp(
    morningWeight * 0.03 +
      goldenHourWeight * 0.14 * stormDamping +
      sunsetWeight * 0.16 * stormDamping -
      night * 0.09 -
      rain * 0.06,
    -0.18,
    0.2
  );

  // Shadow lift ensures night and rainy night dark areas remain readable and never crush to pure black
  const shadowLift = clamp(
    0.008 + night * 0.018 + rain * 0.01 + storm * 0.006,
    0.0,
    0.045
  );

  // Split-toning shadow tint:
  // Midday: neutral-clean. Golden Hour / Sunset: balanced cool coastal teal-blue shadows.
  // Night / Rainy Night: deeper midnight blue shadows.
  const shadowTint: RgbTint = {
    r: clamp(1.0 - goldenOrSunset * 0.045 * stormDamping - night * 0.075 - rain * 0.03, 0.84, 1.05),
    g: clamp(1.0 - sunsetWeight * 0.02 * stormDamping - night * 0.03, 0.9, 1.05),
    b: clamp(1.0 + goldenOrSunset * 0.055 * stormDamping + night * 0.1 + rain * 0.04, 0.96, 1.16),
  };

  // Split-toning highlight tint:
  // Morning/Midday: clean natural white.
  // Golden Hour: warm golden-amber highlights.
  // Sunset: warm tropical coral-gold highlights.
  // Night: crisp clean cyan-magenta neon preservation.
  const highlightTint: RgbTint = {
    r: clamp(
      1.0 +
        morningWeight * 0.015 +
        goldenHourWeight * 0.075 * stormDamping +
        sunsetWeight * 0.09 * stormDamping -
        night * 0.015,
      0.95,
      1.14
    ),
    g: clamp(
      1.0 +
        goldenHourWeight * 0.025 * stormDamping -
        sunsetWeight * 0.01 * stormDamping +
        night * 0.01,
      0.95,
      1.08
    ),
    b: clamp(
      1.0 -
        goldenHourWeight * 0.065 * stormDamping -
        sunsetWeight * 0.055 * stormDamping +
        night * 0.045 +
        rain * 0.025,
      0.88,
      1.1
    ),
  };

  // Subtle vignette & fine grain
  const vignetteStrength = clamp(
    0.14 + goldenOrSunset * 0.025 + night * 0.045 + rain * 0.02 + (stars > 0 ? 0.015 : 0),
    0.1,
    0.25
  );

  const grainStrength = clamp(0.008 + night * 0.005 + rain * 0.003, 0.005, 0.018);

  return {
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    exposure,
    contrast,
    saturation,
    warmth,
    shadowLift,
    shadowTint,
    highlightTint,
    vignetteStrength,
    grainStrength,
  };
}

/**
 * Custom linear-HDR cinematic colour-grading shader executed right before OutputPass.
 * Performs soft highlight shoulder compression, split-toned shadow/highlight balance,
 * subtle warmth shift, contrast around mid-grey, saturation control, smooth vignette,
 * and ultra-fine animated luminance grain.
 */
export const CinematicGradeShader = {
  name: 'CinematicGradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0.0 },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.05 },
    uWarmth: { value: 0.0 },
    uShadowLift: { value: 0.012 },
    uShadowTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uHighlightTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uVignetteStrength: { value: 0.16 },
    uGrainStrength: { value: 0.01 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uWarmth;
    uniform float uShadowLift;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uVignetteStrength;
    uniform float uGrainStrength;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = max(texel.rgb, vec3(0.0));

      // Gentle highlight shoulder compression for ultra-bright HDR emitters so neon/police cores retain hue
      vec3 compressed = col / (1.0 + max(col - vec3(1.35), vec3(0.0)) * 0.22);
      col = mix(col, compressed, 0.65);

      // Readable dark shadow lift
      col = col + vec3(uShadowLift) * (1.0 - clamp(col * 2.5, 0.0, 1.0));

      // Luminance in linear space
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float shadowMask = 1.0 - smoothstep(0.02, 0.48, luma);
      float highlightMask = smoothstep(0.22, 0.95, luma);

      // Split-toned shadow and highlight tinting
      vec3 shadowGraded = col * mix(vec3(1.0), uShadowTint, shadowMask * 0.75);
      vec3 splitGraded = shadowGraded * mix(vec3(1.0), uHighlightTint, highlightMask * 0.8);
      col = splitGraded;

      // Subtle temperature warmth shift (protects deep blacks)
      float midHighlightWeight = smoothstep(0.03, 0.6, luma);
      col.r *= 1.0 + uWarmth * 0.42 * midHighlightWeight;
      col.g *= 1.0 + uWarmth * 0.10 * midHighlightWeight;
      col.b *= 1.0 - uWarmth * 0.42 * midHighlightWeight;

      // Contrast around perceptual mid-grey in log-like curve
      vec3 logCol = col / (col + vec3(0.32));
      logCol = clamp((logCol - 0.5) * uContrast + 0.5, 0.0, 0.999);
      vec3 contrasted = (logCol * 0.32) / max(vec3(1.0) - logCol, vec3(0.001));
      col = mix(col, contrasted, 0.75);

      // Saturation adjustment
      float newLuma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(newLuma), col, uSaturation), vec3(0.0));

      // Smooth radial vignette
      vec2 centered = vUv - vec2(0.5);
      centered.x *= 1.12;
      float distSq = dot(centered, centered);
      float vig = 1.0 - smoothstep(0.18, 0.78, distSq) * uVignetteStrength;
      col *= vig;

      // Very fine film grain (stronger in midtones, restrained in bright highlights)
      float noise = (hash12(vUv * 1280.0 + vec2(uTime * 17.3, uTime * 29.7)) - 0.5) * 2.0;
      float grainMask = smoothstep(0.01, 0.25, newLuma) * (1.0 - smoothstep(0.75, 1.5, newLuma));
      col = max(col + vec3(noise * uGrainStrength * (0.4 + 0.6 * grainMask)), vec3(0.0));

      gl_FragColor = vec4(col, texel.a);
    }
  `,
};

/**
 * Manages the Three.js r187 post-processing composer, Selective HDR UnrealBloomPass,
 * time/weather CinematicGradePass, and OutputPass with automatic fallback to direct rendering.
 */
export class CinematicPostPipeline {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly isSoftwareGl: boolean;

  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;
  private outputPass: OutputPass | null = null;

  private quality: GraphicsQuality = GraphicsQuality.High;
  private config: PostProcessingQualityConfig;
  private lastState: CinematicPostState;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private elapsedTime = 0;
  private composerFailed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isSoftwareGl: boolean,
    initialQuality: GraphicsQuality = GraphicsQuality.High
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.isSoftwareGl = isSoftwareGl;
    this.quality = initialQuality;
    this.config = getPostProcessingConfigForQuality(initialQuality, isSoftwareGl);
    this.lastState = computeCinematicPostState(
      {
        timeHours: 16.5,
        nightFactor: 0,
        rainAmount: 0,
        cloudAmount: 0.2,
        stormDarkness: 0,
        wantedStars: 0,
      },
      this.config
    );

    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this.width = Math.max(1, size.x);
    this.height = Math.max(1, size.y);
    this.pixelRatio = this.renderer.getPixelRatio();

    if (this.config.enabled) {
      this.initComposer();
    }
  }

  private initComposer(): void {
    if (this.composer || this.composerFailed) return;
    try {
      const composer = new EffectComposer(this.renderer);
      composer.setPixelRatio(this.pixelRatio);
      composer.setSize(this.width, this.height);

      const renderPass = new RenderPass(this.scene, this.camera);
      composer.addPass(renderPass);

      const bloomScale = Math.max(0.25, this.config.bloomResolutionScale || 0.5);
      const bloomRes = new THREE.Vector2(
        Math.max(64, Math.floor(this.width * this.pixelRatio * bloomScale)),
        Math.max(64, Math.floor(this.height * this.pixelRatio * bloomScale))
      );
      const bloomPass = new UnrealBloomPass(
        bloomRes,
        this.lastState.bloomStrength,
        this.lastState.bloomRadius,
        this.lastState.bloomThreshold
      );
      bloomPass.enabled = this.config.bloomEnabled;
      composer.addPass(bloomPass);

      const gradePass = new ShaderPass(CinematicGradeShader);
      gradePass.enabled = this.config.gradeEnabled;
      composer.addPass(gradePass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      this.composer = composer;
      this.renderPass = renderPass;
      this.bloomPass = bloomPass;
      this.gradePass = gradePass;
      this.outputPass = outputPass;
    } catch (err) {
      console.warn('CinematicPostPipeline fallback to direct WebGLRenderer:', err);
      this.composerFailed = true;
      this.disposeComposerOnly();
    }
  }

  public setQuality(quality: GraphicsQuality): void {
    const nextConfig = getPostProcessingConfigForQuality(quality, this.isSoftwareGl);
    const qualityChanged = this.quality !== quality;
    this.quality = quality;
    this.config = nextConfig;

    if (!nextConfig.enabled) {
      return;
    }

    if (!this.composer && !this.composerFailed) {
      this.initComposer();
    }

    if (this.bloomPass) {
      this.bloomPass.enabled = nextConfig.bloomEnabled;
      if (qualityChanged) {
        const bloomScale = Math.max(0.25, nextConfig.bloomResolutionScale || 0.5);
        this.bloomPass.setSize(
          Math.max(64, Math.floor(this.width * this.pixelRatio * bloomScale)),
          Math.max(64, Math.floor(this.height * this.pixelRatio * bloomScale))
        );
      }
    }
    if (this.gradePass) {
      this.gradePass.enabled = nextConfig.gradeEnabled;
    }
  }

  public setSize(width: number, height: number, pixelRatio: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    const pr = Math.max(0.5, pixelRatio);

    if (w === this.width && h === this.height && Math.abs(pr - this.pixelRatio) < 1e-4) {
      return;
    }

    this.width = w;
    this.height = h;
    this.pixelRatio = pr;

    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
    }
    if (this.bloomPass && this.config.bloomEnabled) {
      const bloomScale = Math.max(0.25, this.config.bloomResolutionScale || 0.5);
      this.bloomPass.setSize(
        Math.max(64, Math.floor(w * pr * bloomScale)),
        Math.max(64, Math.floor(h * pr * bloomScale))
      );
    }
  }

  public update(dt: number, input: CinematicAtmosphereInput): CinematicPostState {
    this.elapsedTime = (this.elapsedTime + Math.max(0, dt)) % 1000;
    const state = computeCinematicPostState(input, this.config);
    this.lastState = state;

    // Synchronize renderer toneMappingExposure so both EffectComposer (OutputPass)
    // and direct fallback rendering share the exact same exposure curve.
    this.renderer.toneMappingExposure = state.exposure;

    if (!this.config.enabled || !this.composer) {
      return state;
    }

    if (this.bloomPass) {
      this.bloomPass.enabled = this.config.bloomEnabled && state.bloomStrength > 0.001;
      this.bloomPass.strength = state.bloomStrength;
      this.bloomPass.radius = state.bloomRadius;
      this.bloomPass.threshold = state.bloomThreshold;
    }

    if (this.gradePass) {
      this.gradePass.enabled = this.config.gradeEnabled;
      const u = this.gradePass.uniforms;
      u.uTime.value = this.elapsedTime;
      u.uContrast.value = state.contrast;
      u.uSaturation.value = state.saturation;
      u.uWarmth.value = state.warmth;
      u.uShadowLift.value = state.shadowLift;
      (u.uShadowTint.value as THREE.Vector3).set(
        state.shadowTint.r,
        state.shadowTint.g,
        state.shadowTint.b
      );
      (u.uHighlightTint.value as THREE.Vector3).set(
        state.highlightTint.r,
        state.highlightTint.g,
        state.highlightTint.b
      );
      u.uVignetteStrength.value = state.vignetteStrength;
      u.uGrainStrength.value = state.grainStrength;
    }

    return state;
  }

  public render(dt = 0.016): void {
    if (this.config.enabled && this.composer && !this.composerFailed) {
      try {
        this.composer.render(dt);
        return;
      } catch (err) {
        console.warn('EffectComposer render error, falling back to direct render:', err);
        this.composerFailed = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  public getState(): CinematicPostState {
    return this.lastState;
  }

  public getConfig(): PostProcessingQualityConfig {
    return this.config;
  }

  public isComposerActive(): boolean {
    return Boolean(this.config.enabled && this.composer && !this.composerFailed);
  }

  private disposeComposerOnly(): void {
    if (this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    }
    if (this.gradePass) {
      this.gradePass.dispose();
      this.gradePass = null;
    }
    if (this.outputPass) {
      this.outputPass.dispose();
      this.outputPass = null;
    }
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.renderPass = null;
  }

  public dispose(): void {
    this.disposeComposerOnly();
  }
}
