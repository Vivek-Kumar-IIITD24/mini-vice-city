import { clamp, damp, lerp } from '../core/math';

export type WetRoadSurfaceKind = 'asphalt' | 'marking';

export interface WetRoadMaterialLike {
  roughness: number;
  metalness: number;
  envMapIntensity?: number;
  bumpScale?: number;
  color?: { r: number; g: number; b: number };
}

export interface WetRoadSurface<T extends WetRoadMaterialLike = WetRoadMaterialLike> {
  readonly id: string;
  readonly kind: WetRoadSurfaceKind;
  readonly material: T;
  readonly dryRoughness: number;
  readonly wetRoughness: number;
  readonly dryMetalness: number;
  readonly wetMetalness: number;
  readonly dryEnvMapIntensity: number;
  readonly wetEnvMapIntensity: number;
  readonly dryBumpScale?: number;
  readonly wetBumpScale?: number;
  readonly dryColorR?: number;
  readonly dryColorG?: number;
  readonly dryColorB?: number;
  readonly wetColorScale: number;
  readonly wetnessUniform?: { value: number };
}

const WET_PRESETS: Record<
  WetRoadSurfaceKind,
  {
    wetRoughness: number;
    wetMetalness: number;
    wetEnvMapIntensity: number;
    bumpWetMultiplier: number;
    wetColorScale: number;
  }
> = {
  asphalt: {
    wetRoughness: 0.22,
    wetMetalness: 0.38,
    wetEnvMapIntensity: 2.45,
    bumpWetMultiplier: 0.3,
    wetColorScale: 0.76,
  },
  marking: {
    wetRoughness: 0.28,
    wetMetalness: 0.14,
    wetEnvMapIntensity: 1.55,
    bumpWetMultiplier: 0.5,
    wetColorScale: 0.9,
  },
};

/**
 * Captures a road/intersection material's dry baseline so rain wetness can be
 * applied consistently across every surface and restored cleanly in clear weather.
 */
export function createWetRoadSurface<T extends WetRoadMaterialLike>(
  id: string,
  material: T,
  kind: WetRoadSurfaceKind = 'asphalt',
  wetnessUniform?: { value: number },
): WetRoadSurface<T> {
  const preset = WET_PRESETS[kind];
  const dryEnvMapIntensity =
    typeof material.envMapIntensity === 'number' ? material.envMapIntensity : 1.0;
  const hasBump = typeof material.bumpScale === 'number';
  const hasColor = material.color !== undefined;

  return {
    id,
    kind,
    material,
    dryRoughness: material.roughness,
    wetRoughness: preset.wetRoughness,
    dryMetalness: material.metalness,
    wetMetalness: preset.wetMetalness,
    dryEnvMapIntensity,
    wetEnvMapIntensity: preset.wetEnvMapIntensity,
    dryBumpScale: hasBump ? material.bumpScale : undefined,
    wetBumpScale: hasBump ? (material.bumpScale as number) * preset.bumpWetMultiplier : undefined,
    dryColorR: hasColor ? material.color!.r : undefined,
    dryColorG: hasColor ? material.color!.g : undefined,
    dryColorB: hasColor ? material.color!.b : undefined,
    wetColorScale: preset.wetColorScale,
    wetnessUniform,
  };
}

/**
 * Smoothly advances road wetness toward current rain intensity.
 * Surfaces wet up steadily during rain and dry gradually when clear weather returns.
 */
export function stepRoadWetness(
  currentWetness: number,
  rainAmount: number,
  dt: number,
): number {
  const cur = clamp(currentWetness, 0, 1);
  const rawTarget = clamp(rainAmount, 0, 1);
  const target = rawTarget < 0.0005 ? 0 : rawTarget > 0.9995 ? 1 : rawTarget;
  const safeDt = clamp(dt, 0, 0.1);
  if (safeDt <= 0) return cur;

  const lambda = target >= cur ? 1.15 : 0.55;
  const next = damp(cur, target, lambda, safeDt);
  if (Math.abs(next - target) < 0.0005) {
    return target;
  }
  return clamp(next, 0, 1);
}

/**
 * Synchronizes wetness across all registered road, intersection, and marking materials
 * with zero per-frame allocations.
 */
export function applyRoadWetness(
  surfaces: readonly WetRoadSurface[],
  wetness: number,
): void {
  const w = clamp(wetness, 0, 1);
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    const m = s.material;

    m.roughness = lerp(s.dryRoughness, s.wetRoughness, w);
    m.metalness = lerp(s.dryMetalness, s.wetMetalness, w);

    if (typeof m.envMapIntensity === 'number') {
      m.envMapIntensity = lerp(s.dryEnvMapIntensity, s.wetEnvMapIntensity, w);
    }

    if (
      typeof m.bumpScale === 'number' &&
      s.dryBumpScale !== undefined &&
      s.wetBumpScale !== undefined
    ) {
      m.bumpScale = lerp(s.dryBumpScale, s.wetBumpScale, w);
    }

    if (
      m.color !== undefined &&
      s.dryColorR !== undefined &&
      s.dryColorG !== undefined &&
      s.dryColorB !== undefined
    ) {
      const colorScale = lerp(1, s.wetColorScale, w);
      m.color.r = s.dryColorR * colorScale;
      m.color.g = s.dryColorG * colorScale;
      m.color.b = s.dryColorB * colorScale;
    }

    if (s.wetnessUniform) {
      s.wetnessUniform.value = w;
    }
  }
}
