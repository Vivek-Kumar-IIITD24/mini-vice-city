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
 * - When isSoftwareGl is true on Medium/High, expensive multi-pass UnrealBloomPass is disabled
 *   (bloomEnabled: false) and a lightweight single-pass selective HDR bloom kernel runs inside
 *   CinematicGradeShader so Software WebGL stays fast without CPU frame stalls.
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
      bloomEnabled: !isSoftwareGl,
      bloomResolutionScale: isSoftwareGl ? 0 : 0.5,
      bloomStrengthMultiplier: 0.85,
      bloomRadius: 0.34,
      bloomThresholdOffset: 0.04,
      gradeEnabled: true,
    };
  }

  // GraphicsQuality.High
  return {
    enabled: true,
    bloomEnabled: !isSoftwareGl,
    bloomResolutionScale: isSoftwareGl ? 0 : 0.75,
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
 * GLSL ES 1.00-compatible HDR finite sanitizer.
 * Rejects NaN, +/-Infinity, and negative radiance while clamping extreme HDR spikes
 * so a single malformed pixel can never poison multi-mip UnrealBloomPass or tone mapping.
 */
export const GLSL_SANITIZE_HDR_HELPERS = /* glsl */ `
float sanitizeHdrChannel(float v) {
  return (v >= 0.0 && v <= 65000.0) ? min(v, 32.0) : 0.0;
}

vec3 sanitizeHdrColor(vec3 c) {
  return vec3(
    sanitizeHdrChannel(c.r),
    sanitizeHdrChannel(c.g),
    sanitizeHdrChannel(c.b)
  );
}
`;

export const HARDENED_BLOOM_HIGHPASS_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;

varying vec2 vUv;

${GLSL_SANITIZE_HDR_HELPERS}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  texel.rgb = sanitizeHdrColor(texel.rgb);
  texel.a = (texel.a >= 0.0 && texel.a <= 1.0) ? texel.a : 1.0;

  float v = luminance(texel.xyz);
  vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity);
  float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);

  gl_FragColor = mix(outputColor, texel, alpha);
}
`;

export interface PostPipelineDiagnostics {
  quality: GraphicsQuality;
  isSoftwareGl: boolean;
  composerActive: boolean;
  composerFailed: boolean;
  bloomEnabled: boolean;
  bloomFirewallActive: boolean;
  renderCount: number;
  fallbackRenderCount: number;
  contextLostSkips: number;
  lastRenderError: string | null;
  lastFrameRenderMs: number;
}

/**
 * Custom linear-HDR cinematic colour-grading shader executed right before OutputPass.
 * Performs NaN/Infinity sanitization, soft highlight shoulder compression, split-toned
 * shadow/highlight balance, subtle warmth shift, contrast around mid-grey, saturation
 * control, smooth vignette, and ultra-fine animated luminance grain.
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
    uTexelSize: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uBloomThreshold: { value: 1.15 },
    uLightweightBloomStrength: { value: 0.0 },
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
    uniform vec2 uTexelSize;
    uniform float uBloomThreshold;
    uniform float uLightweightBloomStrength;
    varying vec2 vUv;

    ${GLSL_SANITIZE_HDR_HELPERS}

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = sanitizeHdrColor(texel.rgb);
      float safeAlpha = (texel.a >= 0.0 && texel.a <= 1.0) ? texel.a : 1.0;

      // Lightweight single-pass selective HDR bloom halo when multi-pass UnrealBloomPass is bypassed on Software WebGL
      if (uLightweightBloomStrength > 0.001) {
        vec3 hdrAccum = vec3(0.0);
        vec2 step1 = uTexelSize * 2.5;
        vec2 step2 = uTexelSize * 6.0;
        vec2 offsets[8];
        offsets[0] = vec2(step1.x, 0.0);
        offsets[1] = vec2(-step1.x, 0.0);
        offsets[2] = vec2(0.0, step1.y);
        offsets[3] = vec2(0.0, -step1.y);
        offsets[4] = vec2(step2.x, step2.y);
        offsets[5] = vec2(-step2.x, step2.y);
        offsets[6] = vec2(step2.x, -step2.y);
        offsets[7] = vec2(-step2.x, -step2.y);
        for (int i = 0; i < 8; i++) {
          vec3 s = sanitizeHdrColor(texture2D(tDiffuse, vUv + offsets[i]).rgb);
          float sLuma = dot(s, vec3(0.2126, 0.7152, 0.0722));
          float excess = max(0.0, sLuma - uBloomThreshold);
          float w = excess / (sLuma + 0.001);
          hdrAccum += s * w;
        }
        col += (hdrAccum * 0.125) * uLightweightBloomStrength;
      }

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
      col = sanitizeHdrColor(col + vec3(noise * uGrainStrength * (0.4 + 0.6 * grainMask)));

      gl_FragColor = vec4(col, safeAlpha);
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
  private readonly tmpClearColor = new THREE.Color();

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
  private currentExposure: number | null = null;
  private composerFailed = false;
  private bloomFirewallActive = false;

  // Lightweight diagnostics
  private renderCount = 0;
  private fallbackRenderCount = 0;
  private contextLostSkips = 0;
  private lastRenderError: string | null = null;
  private lastFrameRenderMs = 0;

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

  private getEffectiveComposerPixelRatio(): number {
    return this.isSoftwareGl ? Math.min(this.pixelRatio, 0.5) : this.pixelRatio;
  }

  private isRendererContextLost(): boolean {
    try {
      const gl = this.renderer.getContext?.();
      return Boolean(gl && typeof gl.isContextLost === 'function' && gl.isContextLost());
    } catch {
      return false;
    }
  }

  private initComposer(): void {
    if (this.composer || this.composerFailed) return;
    try {
      const effPr = this.getEffectiveComposerPixelRatio();
      const composer = new EffectComposer(this.renderer);
      composer.setPixelRatio(effPr);
      composer.setSize(this.width, this.height);

      const renderPass = new RenderPass(this.scene, this.camera);
      composer.addPass(renderPass);

      let bloomPass: UnrealBloomPass | null = null;
      let bloomFirewallActive = false;
      if (!this.isSoftwareGl) {
        const bloomScale = Math.max(0.25, this.config.bloomResolutionScale || 0.5);
        const bloomRes = new THREE.Vector2(
          Math.max(64, Math.floor(this.width * effPr * bloomScale)),
          Math.max(64, Math.floor(this.height * effPr * bloomScale))
        );
        bloomPass = new UnrealBloomPass(
          bloomRes,
          this.lastState.bloomStrength,
          this.lastState.bloomRadius,
          this.lastState.bloomThreshold
        );
        // Install GLSL NaN/Infinity firewall in the high-pass filter BEFORE multi-mip blur runs.
        // Without this, a single NaN pixel in the HalfFloat scene buffer expands across all 5 mip
        // levels and turns the entire 3D frame solid black for 1 frame.
        if (bloomPass.materialHighPassFilter) {
          bloomPass.materialHighPassFilter.fragmentShader = HARDENED_BLOOM_HIGHPASS_FRAGMENT_SHADER;
          bloomPass.materialHighPassFilter.needsUpdate = true;
          bloomFirewallActive = true;
        }
        bloomPass.enabled = this.config.bloomEnabled;
        composer.addPass(bloomPass);
      }

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
      this.bloomFirewallActive = bloomFirewallActive;
    } catch (err) {
      this.lastRenderError = err instanceof Error ? err.message : String(err);
      console.warn('CinematicPostPipeline fallback to direct WebGLRenderer:', err);
      this.composerFailed = true;
      this.bloomFirewallActive = false;
      this.disposeComposerOnly();
    }
  }

  public setQuality(quality: GraphicsQuality): void {
    const nextConfig = getPostProcessingConfigForQuality(quality, this.isSoftwareGl);
    const qualityChanged = this.quality !== quality;
    this.quality = quality;
    this.config = nextConfig;

    if (!nextConfig.enabled) {
      // Release EffectComposer and bloom mip-chain render targets immediately on Low quality
      this.disposeComposerOnly();
      return;
    }

    if (!this.composer && !this.composerFailed) {
      this.initComposer();
    }

    const effPr = this.getEffectiveComposerPixelRatio();
    if (this.bloomPass) {
      this.bloomPass.enabled = nextConfig.bloomEnabled;
      if (qualityChanged && nextConfig.bloomEnabled) {
        const bloomScale = Math.max(0.25, nextConfig.bloomResolutionScale || 0.5);
        this.bloomPass.setSize(
          Math.max(64, Math.floor(this.width * effPr * bloomScale)),
          Math.max(64, Math.floor(this.height * effPr * bloomScale))
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
    const effPr = this.getEffectiveComposerPixelRatio();

    if (this.composer) {
      this.composer.setPixelRatio(effPr);
      this.composer.setSize(w, h);
    }
    if (this.bloomPass && this.config.bloomEnabled) {
      const bloomScale = Math.max(0.25, this.config.bloomResolutionScale || 0.5);
      this.bloomPass.setSize(
        Math.max(64, Math.floor(w * effPr * bloomScale)),
        Math.max(64, Math.floor(h * effPr * bloomScale))
      );
    }
  }

  public handleContextRestored(): void {
    this.composerFailed = false;
    this.lastRenderError = null;
    this.disposeComposerOnly();
    if (this.config.enabled) {
      this.initComposer();
    }
  }

  public update(dt: number, input: CinematicAtmosphereInput): CinematicPostState {
    const safeDt = Math.max(0, Math.min(dt, 0.25));
    this.elapsedTime = (this.elapsedTime + safeDt) % 1000;
    const state = computeCinematicPostState(input, this.config);
    this.lastState = state;

    // Smoothly adapt renderer toneMappingExposure so rapid Day<->Night / Clear<->Rain switches never flash,
    // while keeping EffectComposer (OutputPass) and direct Low-quality rendering on the exact same curve.
    if (this.currentExposure === null || safeDt === 0) {
      this.currentExposure = state.exposure;
    } else {
      const expAlpha = 1 - Math.exp(-5.0 * safeDt);
      this.currentExposure = lerp(this.currentExposure, state.exposure, expAlpha);
    }
    this.renderer.toneMappingExposure = this.currentExposure;

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
      const effPr = this.getEffectiveComposerPixelRatio();
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
      (u.uTexelSize.value as THREE.Vector2).set(
        1 / Math.max(1, this.width * effPr),
        1 / Math.max(1, this.height * effPr)
      );
      u.uBloomThreshold.value = state.bloomThreshold;
      // When multi-pass UnrealBloomPass is disabled on Software WebGL, apply lightweight single-pass selective HDR bloom
      const lwBloom =
        this.isSoftwareGl && this.config.enabled
          ? (0.18 + input.nightFactor * 0.34 + input.rainAmount * 0.1) *
            this.config.bloomStrengthMultiplier
          : 0.0;
      u.uLightweightBloomStrength.value = lwBloom;
    }

    return state;
  }

  public render(dt = 0.016): void {
    if (this.isRendererContextLost()) {
      this.contextLostSkips += 1;
      return;
    }

    const startMs = typeof performance !== 'undefined' ? performance.now() : 0;
    const prevAutoClear = this.renderer.autoClear;
    const prevScissorTest =
      typeof this.renderer.getScissorTest === 'function' ? this.renderer.getScissorTest() : false;
    if (typeof this.renderer.getClearColor === 'function') {
      this.renderer.getClearColor(this.tmpClearColor);
    }
    const prevClearAlpha =
      typeof this.renderer.getClearAlpha === 'function' ? this.renderer.getClearAlpha() : 1;

    try {
      if (this.config.enabled && this.composer && !this.composerFailed) {
        try {
          this.composer.renderToScreen = true;
          if (this.outputPass) {
            this.outputPass.enabled = true;
          }
          if (typeof this.renderer.setScissorTest === 'function') {
            this.renderer.setScissorTest(false);
          }
          if (typeof this.renderer.setRenderTarget === 'function') {
            this.renderer.setRenderTarget(null);
          }
          this.composer.render(dt);
          this.renderCount += 1;
          return;
        } catch (err) {
          this.lastRenderError = err instanceof Error ? err.message : String(err);
          console.warn('EffectComposer render error, falling back to direct render:', err);
          this.composerFailed = true;
        }
      }

      if (typeof this.renderer.setRenderTarget === 'function') {
        this.renderer.setRenderTarget(null);
      }
      if (typeof this.renderer.setScissorTest === 'function') {
        this.renderer.setScissorTest(false);
      }
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.fallbackRenderCount += 1;
    } finally {
      if (typeof this.renderer.setRenderTarget === 'function') {
        this.renderer.setRenderTarget(null);
      }
      this.renderer.autoClear = prevAutoClear;
      if (typeof this.renderer.setScissorTest === 'function') {
        this.renderer.setScissorTest(prevScissorTest);
      }
      if (typeof this.renderer.setClearColor === 'function') {
        this.renderer.setClearColor(this.tmpClearColor, prevClearAlpha);
      }
      if (typeof performance !== 'undefined') {
        this.lastFrameRenderMs = Math.max(0, performance.now() - startMs);
      }
    }
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

  public getDiagnostics(): PostPipelineDiagnostics {
    return {
      quality: this.quality,
      isSoftwareGl: this.isSoftwareGl,
      composerActive: this.isComposerActive(),
      composerFailed: this.composerFailed,
      bloomEnabled: Boolean(this.bloomPass?.enabled),
      bloomFirewallActive: this.bloomFirewallActive,
      renderCount: this.renderCount,
      fallbackRenderCount: this.fallbackRenderCount,
      contextLostSkips: this.contextLostSkips,
      lastRenderError: this.lastRenderError,
      lastFrameRenderMs: this.lastFrameRenderMs,
    };
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
    this.bloomFirewallActive = false;
  }

  public dispose(): void {
    this.disposeComposerOnly();
  }
}
