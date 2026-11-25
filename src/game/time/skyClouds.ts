import { GraphicsQuality, WeatherType } from '../types';
import { clamp, damp, lerp } from '../core/math';

export interface CloudQualityConfig {
  /** 0 = Low (fast single layer), 1 = Medium / SoftwareGL (warped cumulus + cirrus), 2 = High (full detail) */
  detailLevel: 0 | 1 | 2;
  enableDomainWarp: boolean;
  enableCirrusLayer: boolean;
  cumulusOctaves: number;
}

export interface WeatherCloudProfile {
  coverage: number;
  density: number;
  stormDarkness: number;
  cirrusAmount: number;
  windSpeed: number;
  hazeStrength: number;
  fogDensity: number;
}

export interface CloudAtmosphereState {
  coverage: number;
  density: number;
  stormDarkness: number;
  cirrusAmount: number;
  windSpeed: number;
  hazeStrength: number;
  fogDensity: number;
  /** Monotonic accumulated wind phase so changing windSpeed never jumps or rewinds clouds */
  cloudTime: number;
  /** Normalized horizontal wind direction vector (X, Z) */
  windDirX: number;
  windDirZ: number;
}

export interface CloudLightingParams {
  /** 0..1 warm horizon / golden rim intensity */
  warmRimStrength: number;
  /** 0..1 daytime sunlit brightness multiplier */
  sunlitStrength: number;
  /** 0..1 subtle nighttime moonlight multiplier on clouds */
  moonlitStrength: number;
  /** 0..1 overall cloud underside darkness (deeper in storm & night) */
  undersideDarkness: number;
}

const WEATHER_PROFILES: Record<WeatherType, WeatherCloudProfile> = {
  [WeatherType.Clear]: {
    coverage: 0.36,
    density: 0.78,
    stormDarkness: 0.0,
    cirrusAmount: 0.34,
    windSpeed: 1.0,
    hazeStrength: 0.22,
    fogDensity: 0.0017,
  },
  [WeatherType.Cloudy]: {
    coverage: 0.78,
    density: 1.04,
    stormDarkness: 0.44,
    cirrusAmount: 0.60,
    windSpeed: 1.45,
    hazeStrength: 0.46,
    fogDensity: 0.0030,
  },
  [WeatherType.Rain]: {
    coverage: 0.96,
    density: 1.24,
    stormDarkness: 0.94,
    cirrusAmount: 0.36,
    windSpeed: 2.3,
    hazeStrength: 0.72,
    fogDensity: 0.0048,
  },
};

export function getWeatherCloudProfile(weather: WeatherType): WeatherCloudProfile {
  return { ...WEATHER_PROFILES[weather] };
}

export function getCloudQualityConfig(
  quality: GraphicsQuality,
  isSoftwareGl: boolean,
): CloudQualityConfig {
  if (quality === GraphicsQuality.Low) {
    return {
      detailLevel: 0,
      enableDomainWarp: false,
      enableCirrusLayer: false,
      cumulusOctaves: 3,
    };
  }
  if (isSoftwareGl || quality === GraphicsQuality.Medium) {
    return {
      detailLevel: 1,
      enableDomainWarp: true,
      enableCirrusLayer: true,
      cumulusOctaves: 4,
    };
  }
  return {
    detailLevel: 2,
    enableDomainWarp: true,
    enableCirrusLayer: true,
    cumulusOctaves: 5,
  };
}

export function createInitialCloudState(
  weather: WeatherType = WeatherType.Clear,
  windDirX = 0.82,
  windDirZ = 0.57,
): CloudAtmosphereState {
  const len = Math.hypot(windDirX, windDirZ);
  const nx = len > 1e-5 ? windDirX / len : 0.82;
  const nz = len > 1e-5 ? windDirZ / len : 0.57;
  const p = WEATHER_PROFILES[weather];
  return {
    coverage: p.coverage,
    density: p.density,
    stormDarkness: p.stormDarkness,
    cirrusAmount: p.cirrusAmount,
    windSpeed: p.windSpeed,
    hazeStrength: p.hazeStrength,
    fogDensity: p.fogDensity,
    cloudTime: 18.0,
    windDirX: nx,
    windDirZ: nz,
  };
}

/**
 * Smoothly steps cloud coverage, storm density, atmospheric haze, fog density,
 * and accumulated wind drift phase without sudden pops or rewinds.
 */
export function stepCloudAtmosphereState(
  state: CloudAtmosphereState,
  targetWeather: WeatherType,
  dt: number,
): CloudAtmosphereState {
  const safeDt = Math.max(0, Math.min(dt, 0.25));
  const target = WEATHER_PROFILES[targetWeather];
  const rate = 1.45;

  const coverage = damp(state.coverage, target.coverage, rate, safeDt);
  const density = damp(state.density, target.density, rate, safeDt);
  const stormDarkness = damp(state.stormDarkness, target.stormDarkness, rate * 0.95, safeDt);
  const cirrusAmount = damp(state.cirrusAmount, target.cirrusAmount, rate, safeDt);
  const windSpeed = damp(state.windSpeed, target.windSpeed, 1.1, safeDt);
  const hazeStrength = damp(state.hazeStrength, target.hazeStrength, rate, safeDt);
  const fogDensity = damp(state.fogDensity, target.fogDensity, rate, safeDt);
  const cloudTime = state.cloudTime + safeDt * windSpeed;

  return {
    coverage,
    density,
    stormDarkness,
    cirrusAmount,
    windSpeed,
    hazeStrength,
    fogDensity,
    cloudTime,
    windDirX: state.windDirX,
    windDirZ: state.windDirZ,
  };
}

/**
 * Derives coherent cloud lighting weights from the existing Phase 1B celestial state
 * and current storm darkness so clouds match Morning, Midday, Golden Hour, Sunset, and Night.
 */
export function computeCloudLightingParams(
  nightFactor: number,
  sunDirY: number,
  stormDarkness: number,
): CloudLightingParams {
  const nf = clamp(nightFactor, 0, 1);
  const storm = clamp(stormDarkness, 0, 1);
  // Warm golden/sunset rim peaks when the sun is low above the horizon (-0.02 .. 0.52)
  const lowSunBell =
    clamp((sunDirY + 0.04) / 0.16, 0, 1) * clamp((0.62 - sunDirY) / 0.44, 0, 1);
  const warmRimStrength = lowSunBell * (1 - storm * 0.72) * (1 - nf * 0.35);
  const sunlitStrength = clamp((sunDirY + 0.03) / 0.22, 0, 1) * (1 - storm * 0.62) * (1 - nf * 0.85);
  const moonlitStrength = clamp((nf - 0.45) / 0.5, 0, 1) * (1 - storm * 0.65);
  const undersideDarkness = clamp(lerp(0.18, 0.78, storm) + nf * 0.28, 0, 0.96);

  return {
    warmRimStrength,
    sunlitStrength,
    moonlitStrength,
    undersideDarkness,
  };
}

/**
 * Low-cost, subtle passing-cloud sunlight modulation (0.88..1.0) synchronized to the
 * wind-drifted cloud field without disturbing Phase 1B directional shadow maps.
 */
export function computeSubtleCloudShadowFactor(
  focusX: number,
  focusZ: number,
  state: CloudAtmosphereState,
): number {
  if (state.coverage < 0.2 || state.stormDarkness > 0.75) {
    return 1.0;
  }
  const u = focusX * 0.0065 + state.windDirX * state.cloudTime * 0.045;
  const v = focusZ * 0.0065 + state.windDirZ * state.cloudTime * 0.045;
  const wave =
    0.5 +
    0.32 * Math.sin(u * 1.7 + Math.cos(v * 1.3)) +
    0.18 * Math.cos(v * 2.1 - u * 1.1);
  const depth = clamp((state.coverage - 0.22) * 0.22, 0, 0.12) * (1 - state.stormDarkness * 0.6);
  return clamp(1.0 - wave * depth, 0.88, 1.0);
}

export const SKY_DOME_VERTEX_SHADER = `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const SKY_DOME_FRAGMENT_SHADER = `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uBottomColor;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uSunColor;
  uniform vec3 uMoonColor;
  uniform vec3 uHemiSkyColor;
  uniform float uNightFactor;
  uniform float uCloudAmount;
  uniform float uCloudCoverage;
  uniform float uCloudDensity;
  uniform float uStormDarkness;
  uniform float uCirrusAmount;
  uniform float uHazeStrength;
  uniform float uCloudTime;
  uniform float uCloudQuality;
  uniform vec2 uWindDir;
  uniform vec2 uWorldOffset;
  varying vec3 vWorldDir;

  float hashStar(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  const mat2 ROT_OCT = mat2(0.80, 0.60, -0.60, 0.80);

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    v += a * valueNoise(p); p = ROT_OCT * p * 2.04 + vec2(13.1, 7.7); a *= 0.5;
    v += a * valueNoise(p); p = ROT_OCT * p * 2.07 + vec2(5.3, 19.4); a *= 0.5;
    v += a * valueNoise(p);
    return v;
  }

  float fbmCumulus(vec2 p, float quality) {
    float v = 0.0;
    float a = 0.50;
    v += a * valueNoise(p); p = ROT_OCT * p * 2.03 + vec2(17.2, 9.4); a *= 0.5;
    v += a * valueNoise(p); p = ROT_OCT * p * 2.06 + vec2(4.7, 23.1); a *= 0.5;
    v += a * valueNoise(p); p = ROT_OCT * p * 2.08 + vec2(31.5, 11.8); a *= 0.5;
    if (quality > 0.5) {
      v += a * valueNoise(p); p = ROT_OCT * p * 2.11 + vec2(8.9, 15.2); a *= 0.5;
    }
    if (quality > 1.5) {
      v += a * valueNoise(p);
    }
    return v;
  }

  float sampleCumulusDensity(vec2 p, float coverage, float quality) {
    vec2 q = p;
    if (quality > 0.5) {
      vec2 warp = vec2(
        fbm3(p * 0.58 + vec2(3.7, 1.9)),
        fbm3(p * 0.58 + vec2(9.2, 6.4))
      ) - 0.5;
      q += warp * 0.85;
    }
    float macro = fbm3(q * 0.42 + vec2(11.3, 4.1));
    float base = fbmCumulus(q, quality);
    float combined = mix(base, base * 0.72 + macro * 0.40, 0.55);

    // Soft weather-responsive threshold
    float threshold = mix(0.68, 0.24, clamp(coverage, 0.0, 1.0));
    float softness = mix(0.20, 0.30, clamp(coverage, 0.0, 1.0));
    float shape = smoothstep(threshold, threshold + softness, combined);

    // Subtle wispy billow erosion at edges for natural irregular cloud outlines
    if (quality > 0.5) {
      float detail = valueNoise(q * 3.8 + vec2(2.1, 8.7));
      shape = clamp(shape - (1.0 - shape) * (1.0 - detail) * 0.22, 0.0, 1.0);
    }
    return shape;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = dir.y;
    vec3 sunDir = normalize(uSunDir);
    vec3 moonDir = normalize(uMoonDir);

    // 1. Base atmospheric sky gradient (Horizon -> Mid -> Zenith)
    float lowMix = smoothstep(-0.04, 0.22, h);
    float highMix = smoothstep(0.14, 0.70, h);
    vec3 skyCol = mix(uBottomColor, uMidColor, lowMix);
    skyCol = mix(skyCol, uTopColor, highMix);

    float clearness = 1.0 - clamp(uCloudCoverage * 0.65 + uStormDarkness * 0.35, 0.0, 0.92);
    float horizonBand = exp(-max(h, 0.0) * 5.0);

    // 2. Directional solar scattering aligned strictly with uSunDir
    float sunVis = smoothstep(-0.08, 0.06, sunDir.y);
    float sunDot = max(dot(dir, sunDir), 0.0);
    float lowSunFactor = 1.0 - clamp(sunDir.y * 2.1, 0.0, 1.0);
    float sunGlowWide = pow(sunDot, 4.5) * 0.26;
    float sunGlowTight = pow(sunDot, 44.0) * 0.50;
    float warmBelt = pow(sunDot, 2.0) * horizonBand * (0.28 + 0.34 * lowSunFactor);
    skyCol += uSunColor * (sunGlowWide + sunGlowTight + warmBelt) * sunVis * clearness;

    // 3. Directional lunar halo aligned strictly with uMoonDir
    float moonVis = smoothstep(0.0, 0.14, moonDir.y) * smoothstep(0.35, 0.85, uNightFactor);
    float moonDot = max(dot(dir, moonDir), 0.0);
    float moonGlow = (pow(moonDot, 10.0) * 0.15 + pow(moonDot, 84.0) * 0.32) * moonVis * (1.0 - uStormDarkness * 0.75);
    skyCol += uMoonColor * moonGlow;

    // 4. Procedural layered tropical clouds (only above horizon)
    float totalCloudAlpha = 0.0;
    if (h > -0.01) {
      // Curved-shell dome projection avoids flat-plane horizon stretching and remains world-anchored
      float hSafe = max(h, 0.015);
      float domeAlt = hSafe + 0.16 * (1.0 - hSafe) * (1.0 - hSafe);
      vec2 baseUv = dir.xz / (domeAlt + 0.11) + uWorldOffset;

      // Active directional light horizontal vector (sun by day, moon by night)
      bool useMoon = sunDir.y < 0.025 && moonDir.y > 0.02;
      vec3 activeLightDir = useMoon ? moonDir : sunDir;
      vec2 lightStep = activeLightDir.xz * 0.18;

      // --- Layer A: High-altitude wispy cirrus (medium & high quality) ---
      float cirrusAlpha = 0.0;
      if (uCloudQuality > 0.5 && uCirrusAmount > 0.02) {
        vec2 cirrusDrift = uWindDir * (uCloudTime * 0.011);
        vec2 windPerp = vec2(-uWindDir.y, uWindDir.x);
        vec2 cUv = vec2(
          dot(baseUv, uWindDir) * 0.85,
          dot(baseUv, windPerp) * 1.95
        ) + cirrusDrift;
        float cNoise = fbm3(cUv * 1.15 + vec2(4.2, 12.7));
        float cMask = smoothstep(0.56 - uCirrusAmount * 0.18, 0.84, cNoise);
        cirrusAlpha = cMask * uCirrusAmount * 0.48 * (1.0 - uStormDarkness * 0.55);

        vec3 cirrusDay = mix(vec3(0.95, 0.97, 1.0), uSunColor * 1.15, lowSunFactor * 0.72);
        vec3 cirrusNight = mix(uTopColor * 1.4, uMoonColor * 0.34, pow(moonDot, 4.0) * 0.65);
        vec3 cirrusCol = mix(cirrusDay, cirrusNight, smoothstep(0.55, 0.95, uNightFactor));
        cirrusCol = mix(cirrusCol, uMidColor * 0.72, uStormDarkness * 0.65);

        float cirrusFade = smoothstep(0.015, 0.22, h);
        cirrusAlpha *= cirrusFade;
        skyCol = mix(skyCol, cirrusCol, cirrusAlpha);
      }

      // --- Layer B: Lower/Mid tropical cumulus & storm cloud deck ---
      vec2 driftMain = uWindDir * (uCloudTime * 0.024);
      vec2 cumulusUv = baseUv * 1.08 + driftMain;
      float cDensity = sampleCumulusDensity(cumulusUv, uCloudCoverage, uCloudQuality);

      // Secondary overlapping scale for natural depth & cloud breaks
      vec2 driftSub = uWindDir * (uCloudTime * 0.035) + vec2(19.4, -8.2);
      float subDensity = sampleCumulusDensity(baseUv * 1.65 + driftSub, uCloudCoverage * 0.86, max(0.0, uCloudQuality - 1.0));
      float combinedDensity = clamp(max(cDensity, subDensity * 0.76) * uCloudDensity, 0.0, 1.0);

      // Directional self-shading using light-offset density sample along activeLightDir
      float litSample = sampleCumulusDensity(cumulusUv + lightStep, uCloudCoverage, max(0.0, uCloudQuality - 1.0));
      float directLit = clamp((cDensity - litSample) * 2.35 + 0.48, 0.0, 1.0);
      // Higher cloud tops catch bright sunlight; thick bellies & storm undersides stay cooler/darker
      float bellyShade = smoothstep(0.25, 0.95, combinedDensity) * (0.26 + uStormDarkness * 0.36);
      float topShade = clamp(0.26 + directLit * 0.78 - bellyShade, 0.0, 1.0);

      // Time-of-day & weather responsive cloud palette (strictly driven by Phase 1B lighting)
      float dayWeight = 1.0 - smoothstep(0.55, 0.95, uNightFactor);
      float warmPhase = lowSunFactor * sunVis * (1.0 - uStormDarkness * 0.72);

      // Daytime bright tops & cool sky-tinted undersides
      vec3 dayBright = mix(vec3(0.98, 0.98, 1.0), uSunColor * 1.24, 0.22 + warmPhase * 0.68);
      vec3 dayShadow = mix(uHemiSkyColor * 0.56, mix(uHemiSkyColor * 0.48, uBottomColor * 0.80, 0.62), warmPhase);
      // Overcast & storm decks darken cloud undersides into realistic cool tropical slate
      vec3 stormTop = mix(vec3(0.38, 0.43, 0.50), vec3(0.09, 0.12, 0.18), uNightFactor);
      vec3 stormBase = mix(vec3(0.16, 0.20, 0.26), vec3(0.03, 0.04, 0.08), uNightFactor);

      dayBright = mix(dayBright, stormTop, uStormDarkness * 0.88);
      dayShadow = mix(dayShadow, stormBase, uStormDarkness * 0.92);

      // Nighttime clouds: subtle dark-blue silhouettes with soft moonlight rim (never bright white)
      vec3 nightBase = mix(uTopColor * 1.02, vec3(0.03, 0.04, 0.08), 0.50 + uStormDarkness * 0.44);
      vec3 nightRim = uMoonColor * (0.22 + 0.24 * pow(moonDot, 5.0)) * (1.0 - uStormDarkness * 0.78);
      vec3 nightCloud = nightBase + nightRim * directLit;

      vec3 cloudCol = mix(dayShadow, dayBright, topShade);
      cloudCol = mix(nightCloud, cloudCol, dayWeight);

      // Silver-lining / warm forward-scattering glow on cloud edges near the sun
      float edgeMask = combinedDensity * (1.0 - combinedDensity * 0.62);
      float silverLining = pow(sunDot, 5.0) * edgeMask * sunVis * (1.0 - uStormDarkness * 0.76);
      cloudCol += uSunColor * silverLining * (0.62 + 0.78 * lowSunFactor);

      // Subtle moon silver edge at night
      float moonEdge = pow(moonDot, 9.0) * edgeMask * moonVis * (1.0 - uStormDarkness * 0.84);
      cloudCol += uMoonColor * moonEdge * 0.30;

      // Smooth horizon atmospheric fade so clouds dissolve naturally into distant coastal mist
      float horizonFade = smoothstep(0.012, 0.21, h);
      float cloudAlpha = clamp(combinedDensity * horizonFade * (0.90 + uStormDarkness * 0.09), 0.0, 0.97);

      // Blend distant low-altitude clouds gently toward horizon haze color
      float distHaze = (1.0 - smoothstep(0.02, 0.34, h)) * (0.38 + uHazeStrength * 0.42);
      cloudCol = mix(cloudCol, uBottomColor, distHaze);

      skyCol = mix(skyCol, cloudCol, cloudAlpha);
      totalCloudAlpha = clamp(max(cloudAlpha, cirrusAlpha * 0.85), 0.0, 1.0);
    }

    // 5. Pinpoint stars at deep night, naturally occluded by cloud formations
    float starClearMask = (1.0 - smoothstep(0.12, 0.68, totalCloudAlpha)) * (1.0 - uStormDarkness * 0.9);
    float starMask = smoothstep(0.78, 0.97, uNightFactor) * smoothstep(0.10, 0.42, h) * starClearMask;
    if (starMask > 0.01) {
      vec3 grid = dir * 135.0;
      vec3 cell = floor(grid);
      vec3 local = fract(grid) - 0.5;
      float n = hashStar(cell);
      float hasStar = smoothstep(0.992, 0.999, n);
      float radial = smoothstep(0.18, 0.02, length(local));
      skyCol += vec3(0.84, 0.90, 1.0) * hasStar * radial * 0.78 * starMask;
    }

    // 6. Soft atmospheric horizon haze band unifying sky dome seamlessly with scene fog
    float lowerMist = smoothstep(0.14 + uHazeStrength * 0.12, -0.02, h);
    skyCol = mix(skyCol, uBottomColor, lowerMist * (0.48 + uHazeStrength * 0.42));

    gl_FragColor = vec4(skyCol, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
