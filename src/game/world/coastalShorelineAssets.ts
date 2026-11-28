import * as THREE from 'three';
import type { OceanAtmosphericUniforms } from './cityBuilder';

// =========================================================================
// PHASE 2E-2: BEACH, SHORELINE, COASTAL SURF, BOARDWALK & MARINA PIER ASSETS
// =========================================================================

export interface CoastalFootprintSpec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly rotationZ: number;
}

export interface SandMoistureZoneConfig {
  readonly baseShorelineX: number;
  readonly contourAmplitudeX: number;
  readonly dryStartOffset: number;
  readonly dampStartOffset: number;
  readonly wetStartOffset: number;
  readonly dryRoughness: number;
  readonly dampRoughness: number;
  readonly wetRoughness: number;
  readonly rainDarkenFactor: number;
}

export interface CoastalShorelineStats {
  beachSurfaceCount: number;
  shorelineMeshCount: number;
  foamGeometryCount: number;
  boardwalkPlankCount: number;
  boardwalkStructuralInstances: number;
  pierStructuralInstanceCount: number;
  coastalDetailCount: number;
  instancedBatches: number;
  sharedMaterialCount: number;
  totalCustomGeometryCount: number;
  beachFootprint: CoastalFootprintSpec;
  boardwalkFootprint: CoastalFootprintSpec;
  pierFootprint: CoastalFootprintSpec;
  sandWetnessConfig: SandMoistureZoneConfig;
  sandTextureSizes: {
    albedo: [number, number];
    bump: [number, number];
    roughness: [number, number];
    foamLace: [number, number];
    boardwalkWood: [number, number];
  };
}

export interface CoastalShorelineContext {
  root: THREE.Group;
  oceanUniforms: OceanAtmosphericUniforms;
  disposables: Array<{ dispose: () => void }>;
  emissiveBuildingMaterials?: THREE.MeshStandardMaterial[];
  maxAnisotropy?: number;
}

export interface CoastalShorelineBuildResult {
  stats: CoastalShorelineStats;
  boardwalkTimberMaterial: THREE.MeshStandardMaterial;
  beachMesh: THREE.Mesh;
  shorelineFoamMesh: THREE.Mesh;
  shallowVeilMesh: THREE.Mesh;
  boardwalkDeckMesh: THREE.Mesh;
  pierDeckMesh: THREE.Mesh;
}

// Preserved source-of-truth coastal coordinates from cityBuilder.ts
export const PRESERVED_BEACH_FOOTPRINT: CoastalFootprintSpec = {
  x: 137,
  y: -0.06,
  z: 0,
  width: 40,
  height: 0,
  depth: 274,
  rotationZ: -0.025,
};

export const PRESERVED_BOARDWALK_FOOTPRINT: CoastalFootprintSpec = {
  x: 113.5,
  y: 0.08,
  z: 0,
  width: 9.5,
  height: 0.16,
  depth: 252,
  rotationZ: 0,
};

export const PRESERVED_PIER_FOOTPRINT: CoastalFootprintSpec = {
  x: 136,
  y: 0.25,
  z: 96,
  width: 38,
  height: 0.45,
  depth: 12,
  rotationZ: 0,
};

export const SAND_MOISTURE_CONFIG: SandMoistureZoneConfig = {
  baseShorelineX: 150.2,
  contourAmplitudeX: 2.49,
  dryStartOffset: -8.2,
  dampStartOffset: -3.0,
  wetStartOffset: -0.35,
  dryRoughness: 0.92,
  dampRoughness: 0.62,
  wetRoughness: 0.19,
  rainDarkenFactor: 0.76,
};

// Beach access ramp Z-positions (carefully clear of all 27 existing palms & lifeguard towers at z = ±36)
export const BEACH_ACCESS_Z: readonly number[] = [-96, -56, -16, 24, 64];

// =========================================================================
// DETERMINISTIC SHORELINE CONTOUR & OCEAN DEPTH HELPERS
// =========================================================================

/**
 * Deterministic natural scalloped coastline X-coordinate along Ocean Drive (`z ∈ [-137, 137]`).
 * Mirrored identically inside the beach sand shader, shoreline surf foam geometry/shader,
 * and ocean shallow-water shader so wet sand, foam, and turquoise shallows stay 100% locked.
 */
export function sampleShorelineContourX(z: number): number {
  return (
    SAND_MOISTURE_CONFIG.baseShorelineX +
    Math.sin(z * 0.042 + 0.6) * 1.45 +
    Math.sin(z * 0.115 - 1.1) * 0.72 +
    Math.cos(z * 0.23 + 0.4) * 0.32
  );
}

/**
 * Evaluates normalized shallow-to-deep ocean blend factor (1 = inner turquoise shoal, 0 = deep Atlantic).
 * Guaranteed finite and strictly bounded in [0, 1].
 */
export function evaluateShallowWaterFactor(worldX: number, worldZ: number): number {
  const shoreX = sampleShorelineContourX(worldZ);
  const coastDist = Math.max(0, worldX - (shoreX - 2.0));
  const smoothstep = (e0: number, e1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-5, e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const eastCoastMask =
    smoothstep(126.0, 148.0, worldX) * (1.0 - smoothstep(134.0, 178.0, Math.abs(worldZ)));
  const shallow = (1.0 - smoothstep(0.0, 62.0, coastDist)) * eastCoastMask;
  return Math.max(0, Math.min(1, shallow));
}

/**
 * Evaluates normalized sand wetness in [0, 1] at any world (x, z) along the beach.
 * 0 = dry warm golden sand, ~0.45 = damp transitional sand, 1 = wet shoreline swash sand.
 */
export function evaluateSandWetnessAt(
  worldX: number,
  worldZ: number,
  rainAmount = 0,
): { dampFactor: number; wetFactor: number; effectiveRoughness: number } {
  const shoreX = sampleShorelineContourX(worldZ);
  const signedDist = worldX - shoreX;
  const smoothstep = (e0: number, e1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-5, e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const dampFactor = smoothstep(
    SAND_MOISTURE_CONFIG.dryStartOffset,
    SAND_MOISTURE_CONFIG.dampStartOffset,
    signedDist,
  );
  const wetFactor = smoothstep(
    SAND_MOISTURE_CONFIG.dampStartOffset - 0.6,
    SAND_MOISTURE_CONFIG.wetStartOffset,
    signedDist,
  );
  const clampedRain = Math.max(0, Math.min(1, rainAmount));
  let rough = THREE.MathUtils.lerp(
    SAND_MOISTURE_CONFIG.dryRoughness,
    SAND_MOISTURE_CONFIG.dampRoughness,
    dampFactor,
  );
  rough = THREE.MathUtils.lerp(rough, SAND_MOISTURE_CONFIG.wetRoughness, wetFactor);
  rough = THREE.MathUtils.lerp(rough, Math.min(rough, 0.36), clampedRain * 0.65);
  return {
    dampFactor,
    wetFactor,
    effectiveRoughness: THREE.MathUtils.clamp(rough, 0.14, 0.96),
  };
}

/**
 * Computes exact world-space beach surface height at (worldX, worldZ), accounting for:
 * - Preserved plane slope (origin (137, -0.06, 0), rotationZ = -0.025)
 * - Clean west boardwalk edge tuck (x = 117..119.8) so sand never pokes above boardwalk planks
 * - Smooth east underwater seabed taper (x > shoreX) so sand merges cleanly beneath turquoise ocean
 */
export function evaluateBeachSurfaceWorldY(worldX: number, worldZ: number): number {
  const slopeSin = Math.sin(PRESERVED_BEACH_FOOTPRINT.rotationZ); // -0.024997...
  const basePlaneY = PRESERVED_BEACH_FOOTPRINT.y + (worldX - PRESERVED_BEACH_FOOTPRINT.x) * slopeSin;

  // West edge tuck right beneath the boardwalk east fascia (x = 117..120.5)
  const smoothstep = (e0: number, e1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-5, e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const westTuck = 1.0 - smoothstep(117.4, 121.0, worldX);
  const westDelta = -westTuck * 0.38;

  // Gentle natural dune/berm relief across mid-beach (purely visual subtle < 3.5cm undulation,
  // zero gameplay interference)
  const bermRelief =
    Math.sin(worldZ * 0.055 + worldX * 0.12) * 0.024 * smoothstep(120.5, 125.0, worldX) * (1.0 - smoothstep(142.0, 149.0, worldX));

  // East shoreline slope dipping smoothly below ocean surface (y = -0.75) toward seabed
  const shoreX = sampleShorelineContourX(worldZ);
  const seaSlope = smoothstep(shoreX - 1.2, 157.0, worldX);
  const seaDrop = -seaSlope * seaSlope * 0.72;

  return basePlaneY + westDelta + bermRelief + seaDrop;
}

// =========================================================================
// NORMAL SANITIZATION & DETERMINISTIC HASH HELPERS
// =========================================================================

function sanitizeGeometryNormals(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const normalAttr = geo.getAttribute('normal');
  if (!normalAttr) {
    geo.computeVertexNormals();
  }
  const norm = geo.getAttribute('normal');
  if (norm) {
    for (let i = 0; i < norm.count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      const len = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(len) || len < 1e-5) {
        norm.setXYZ(i, 0, 1, 0);
      } else if (Math.abs(len - 1) > 1e-4) {
        norm.setXYZ(i, nx / len, ny / len, nz / len);
      }
    }
    norm.needsUpdate = true;
  }
  return geo;
}

function hash01(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

// =========================================================================
// BROWSER-SAFE PROCEDURAL TEXTURE GENERATION (WITH NODE DATATEXTURE FALLBACK)
// =========================================================================

interface ProceduralTextureResult {
  texture: THREE.Texture;
  width: number;
  height: number;
}

function createSafeCoastalTexture(
  width: number,
  height: number,
  srgb: boolean,
  anisotropy: number,
  drawCanvas: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  fillFallbackPixel: (x: number, y: number, w: number, h: number) => [number, number, number, number],
): ProceduralTextureResult {
  if (typeof document === 'undefined') {
    const fw = Math.min(32, width);
    const fh = Math.min(32, height);
    const data = new Uint8Array(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const [r, g, b, a] = fillFallbackPixel(x, y, fw, fh);
        const idx = (y * fw + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }
    const tex = new THREE.DataTexture(data, fw, fh, THREE.RGBAFormat);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return { texture: tex, width: fw, height: fh };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawCanvas(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, Math.max(1, anisotropy));
  tex.needsUpdate = true;
  return { texture: tex, width, height };
}

/**
 * Generates seamless tileable Miami tropical beach sand PBR maps:
 * - Albedo (warm golden cream + fine quartz/shell grain + wind ripples + subtle macro patches)
 * - Bump (wind-blown ripple relief + granular micro-texture)
 * - Roughness (subtle natural mineral roughness variation)
 * - World-space seamless organic noise map (breaks up tiling across the full 274m beach)
 */
export function createBeachSandTextureSet(
  maxAnisotropy = 4,
): {
  albedo: THREE.Texture;
  bump: THREE.Texture;
  roughness: THREE.Texture;
  worldNoise: THREE.Texture;
  sizes: { albedo: [number, number]; bump: [number, number]; roughness: [number, number] };
  dispose: () => void;
} {
  const TAU = Math.PI * 2;

  const albedoRes = createSafeCoastalTexture(
    512,
    512,
    true,
    maxAnisotropy,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        const ty = (y / h) * TAU;
        for (let x = 0; x < w; x++) {
          const tx = (x / w) * TAU;
          // Seamless periodic macro warmth patches (no blocky edges)
          const macro =
            Math.sin(tx * 2.0 + 0.5) * Math.cos(ty * 2.0 - 0.3) * 0.45 +
            Math.sin(tx * 3.0 - ty * 2.0 + 1.4) * 0.32 +
            Math.cos(tx * 5.0 + ty * 3.0 - 0.8) * 0.23;

          // Subtle wind-shaped coastal sand ripples (aligned roughly N-S with organic wobble)
          const ripplePhase = tx * 14.0 + Math.sin(ty * 2.0 + tx * 1.0) * 1.35 + Math.cos(ty * 4.0) * 0.55;
          const ripple = Math.sin(ripplePhase) * 0.5 + 0.5;

          // Fine granular quartz/coral/shell grain (deterministic integer hash)
          const h1 = (((x * 374761393 + y * 668265263) ^ (x * 1274126177)) >>> 0) / 4294967295;
          const h2 = ((((x + 17) * 2246822519 + (y + 31) * 3266489917) ^ (y * 668265263)) >>> 0) / 4294967295;
          const grain = (h1 - 0.5) * 24.0 + (h2 > 0.96 ? 18.0 : h2 < 0.035 ? -26.0 : 0.0);

          // Rich warm golden Miami coastal sand palette (prevents bright-sun chalk washout)
          const baseR = 206 + macro * 11.5 + (ripple - 0.5) * 10.5 + grain;
          const baseG = 177 + macro * 9.5 + (ripple - 0.5) * 8.8 + grain * 0.90;
          const baseB = 132 + macro * 7.2 + (ripple - 0.5) * 6.5 + grain * 0.78;

          const idx = (y * w + x) * 4;
          d[idx] = Math.max(0, Math.min(255, Math.round(baseR)));
          d[idx + 1] = Math.max(0, Math.min(255, Math.round(baseG)));
          d[idx + 2] = Math.max(0, Math.min(255, Math.round(baseB)));
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    (x, y, w, h) => {
      const ripple = Math.sin((x / w) * TAU * 4 + (y / h) * TAU) * 9;
      return [
        Math.round(206 + ripple),
        Math.round(177 + ripple * 0.9),
        Math.round(132 + ripple * 0.78),
        255,
      ];
    },
  );

  const bumpRes = createSafeCoastalTexture(
    512,
    512,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        const ty = (y / h) * TAU;
        for (let x = 0; x < w; x++) {
          const tx = (x / w) * TAU;
          const ripplePhase = tx * 14.0 + Math.sin(ty * 2.0 + tx * 1.0) * 1.35 + Math.cos(ty * 4.0) * 0.55;
          const ripple = Math.sin(ripplePhase) * 34.0;
          const h1 = (((x * 374761393 + y * 668265263) ^ (x * 1274126177)) >>> 0) / 4294967295;
          const grain = (h1 - 0.5) * 58.0;
          const v = Math.max(0, Math.min(255, Math.round(128 + ripple + grain)));
          const idx = (y * w + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = v;
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    (x, y, w) => {
      const v = Math.round(128 + Math.sin((x / w) * TAU * 4 + y * 0.3) * 28);
      return [v, v, v, 255];
    },
  );

  const roughRes = createSafeCoastalTexture(
    256,
    256,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        const ty = (y / h) * TAU;
        for (let x = 0; x < w; x++) {
          const tx = (x / w) * TAU;
          const patch =
            Math.sin(tx * 3.0 + 0.4) * Math.cos(ty * 2.0 - 0.8) * 14.0 +
            Math.sin(tx * 7.0 - ty * 5.0) * 6.0;
          const h1 = (((x * 1597334677 + y * 3812015801) ^ (y * 1274126177)) >>> 0) / 4294967295;
          // Dry sand roughness byte ~214..248 (0.84..0.97) with occasional tiny quartz glints
          const glint = h1 > 0.985 ? -36.0 : (h1 - 0.5) * 18.0;
          const v = Math.max(175, Math.min(252, Math.round(234 + patch + glint)));
          const idx = (y * w + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = v;
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    () => [234, 234, 234, 255],
  );

  const noiseRes = createSafeCoastalTexture(
    256,
    256,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        const ty = (y / h) * TAU;
        for (let x = 0; x < w; x++) {
          const tx = (x / w) * TAU;
          const n1 = Math.sin(tx * 2.0 + 0.3) * Math.cos(ty * 2.0 - 0.6);
          const n2 = Math.sin(tx * 3.0 - ty * 3.0 + 1.2) * 0.55;
          const n3 = Math.cos(tx * 6.0 + ty * 5.0 - 0.4) * 0.28;
          const n4 = Math.sin(tx * 11.0 - ty * 9.0 + 2.0) * 0.14;
          const v = Math.max(0, Math.min(255, Math.round(((n1 + n2 + n3 + n4) * 0.34 + 0.5) * 255)));
          const idx = (y * w + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = v;
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    (x, y, w, h) => {
      const v = Math.round((Math.sin((x / w) * TAU) * Math.cos((y / h) * TAU) * 0.4 + 0.5) * 255);
      return [v, v, v, 255];
    },
  );

  return {
    albedo: albedoRes.texture,
    bump: bumpRes.texture,
    roughness: roughRes.texture,
    worldNoise: noiseRes.texture,
    sizes: {
      albedo: [albedoRes.width, albedoRes.height],
      bump: [bumpRes.width, bumpRes.height],
      roughness: [roughRes.width, roughRes.height],
    },
    dispose: () => {
      albedoRes.texture.dispose();
      bumpRes.texture.dispose();
      roughRes.texture.dispose();
      noiseRes.texture.dispose();
    },
  };
}

/**
 * Generates seamless cellular lacy sea-foam texture (inspired by aerial/close-up surf foam webs).
 * R channel = lacy foam web density, G channel = fine bubble stipple, B channel = soft froth haze.
 */
export function createSurfFoamLaceTexture(maxAnisotropy = 4): ProceduralTextureResult {
  const TAU = Math.PI * 2;
  return createSafeCoastalTexture(
    256,
    256,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      const d = img.data;

      // Deterministic periodic cellular foam bubble centers (seamless wrap on [0,1)^2)
      const cellCount = 34;
      const centers: Array<[number, number, number]> = [];
      for (let i = 0; i < cellCount; i++) {
        centers.push([
          hash01(i * 19.17 + 3.1),
          hash01(i * 47.83 + 7.9),
          0.08 + hash01(i * 71.23 + 1.4) * 0.08,
        ]);
      }

      for (let y = 0; y < h; y++) {
        const v = y / h;
        const ty = v * TAU;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const tx = u * TAU;

          // Toroidal distance to two closest cellular voids -> lacy foam filaments along Voronoi ridges!
          let d1 = 9.0;
          let d2 = 9.0;
          for (let i = 0; i < cellCount; i++) {
            let dx = Math.abs(u - centers[i][0]);
            let dy = Math.abs(v - centers[i][1]);
            if (dx > 0.5) dx = 1.0 - dx;
            if (dy > 0.5) dy = 1.0 - dy;
            const dist = Math.hypot(dx, dy) / centers[i][2];
            if (dist < d1) {
              d2 = d1;
              d1 = dist;
            } else if (dist < d2) {
              d2 = dist;
            }
          }
          const edgeGap = d2 - d1;
          // Crisp frothy web filaments where bubbles meet
          const lace = Math.max(0, Math.min(1, 1.0 - edgeGap / 0.46));
          const laceShaped = Math.pow(lace, 1.15);

          // Secondary finer frothy stipple
          const fine1 = Math.sin(tx * 11.0 + Math.cos(ty * 9.0) * 1.4) * 0.5 + 0.5;
          const fine2 = Math.cos(ty * 15.0 - Math.sin(tx * 13.0) * 1.3) * 0.5 + 0.5;
          const hVal = (((x * 374761393 + y * 668265263) ^ (x * 668265263)) >>> 0) / 4294967295;
          const bubbles = Math.max(0, Math.min(1, fine1 * fine2 * 0.72 + hVal * 0.38));

          // Broad soft sea-froth cloud
          const froth = Math.max(
            0,
            Math.min(
              1,
              (Math.sin(tx * 3.0 + ty * 2.0) * 0.35 +
                Math.cos(tx * 5.0 - ty * 4.0) * 0.25 +
                0.55) *
                0.65 +
                laceShaped * 0.45,
            ),
          );

          const idx = (y * w + x) * 4;
          d[idx] = Math.round(laceShaped * 255);
          d[idx + 1] = Math.round(bubbles * 255);
          d[idx + 2] = Math.round(froth * 255);
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    (x, y, w, h) => {
      const f = Math.round((Math.sin((x / w) * TAU * 3) * Math.cos((y / h) * TAU * 3) * 0.4 + 0.5) * 255);
      return [f, f, f, 255];
    },
  );
}

/**
 * Generates weathered coastal Miami boardwalk & marine pier timber plank textures:
 * individual planks, crisp seam joints, fine wood grain, subtle plank-to-plank color variation,
 * and weathering.
 */
export function createCoastalBoardwalkWoodTextures(
  maxAnisotropy = 4,
): {
  albedo: THREE.Texture;
  bump: THREE.Texture;
  roughness: THREE.Texture;
  size: [number, number];
  dispose: () => void;
} {
  const plankCount = 12; // 12 individual weathered boards per UV tile

  const albedoRes = createSafeCoastalTexture(
    512,
    512,
    true,
    maxAnisotropy,
    (ctx, w, h) => {
      const plankH = h / plankCount;
      ctx.fillStyle = '#5c4d3e';
      ctx.fillRect(0, 0, w, h);

      // Authentic Miami boardwalk palette: weathered warm cedar + silvered driftwood tan
      const plankTones = [
        [176, 152, 126],
        [164, 142, 118],
        [184, 160, 134],
        [154, 136, 118],
        [171, 146, 119],
        [160, 143, 125],
      ];

      for (let p = 0; p < plankCount; p++) {
        const y0 = Math.round(p * plankH);
        const ph = Math.round(plankH);
        const tone = plankTones[(p * 5 + 1) % plankTones.length];
        const jitter = (hash01(p * 23.7 + 1.9) - 0.5) * 16;

        // Board base with slight sun-bleaching gradient across board width
        const grad = ctx.createLinearGradient(0, y0, 0, y0 + ph);
        const r0 = Math.min(255, Math.max(0, Math.round(tone[0] + jitter + 6)));
        const g0 = Math.min(255, Math.max(0, Math.round(tone[1] + jitter + 5)));
        const b0 = Math.min(255, Math.max(0, Math.round(tone[2] + jitter + 4)));
        const r1 = Math.min(255, Math.max(0, Math.round(tone[0] + jitter - 8)));
        const g1 = Math.min(255, Math.max(0, Math.round(tone[1] + jitter - 8)));
        const b1 = Math.min(255, Math.max(0, Math.round(tone[2] + jitter - 7)));
        grad.addColorStop(0.0, `rgb(${r0},${g0},${b0})`);
        grad.addColorStop(0.55, `rgb(${Math.round((r0 + r1) * 0.5)},${Math.round((g0 + g1) * 0.5)},${Math.round((b0 + b1) * 0.5)})`);
        grad.addColorStop(1.0, `rgb(${r1},${g1},${b1})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, y0 + 2, w, ph - 3);

        // Longitudinal wood-grain fibers
        for (let f = 0; f < 22; f++) {
          const fy = y0 + 3 + ((f * 7 + p * 3) % Math.max(1, ph - 6));
          const dark = f % 3 !== 0;
          ctx.fillStyle = dark ? 'rgba(68, 52, 38, 0.14)' : 'rgba(232, 222, 206, 0.12)';
          ctx.fillRect(0, fy, w, 1 + (f % 2));
        }

        // Occasional staggered butt-joint seam across the plank
        const jointX = Math.round(((p * 173 + 91) % (w - 80)) + 40);
        ctx.fillStyle = 'rgba(42, 33, 24, 0.72)';
        ctx.fillRect(jointX, y0 + 1, 3, ph - 2);

        // Subtle recessed nail-head dots flanking the butt joint and ends
        ctx.fillStyle = 'rgba(45, 38, 32, 0.55)';
        for (const nx of [jointX - 8, jointX + 8, 16, w - 16]) {
          ctx.fillRect(nx, y0 + Math.round(ph * 0.28), 3, 3);
          ctx.fillRect(nx, y0 + Math.round(ph * 0.72), 3, 3);
        }

        // Deep shadowed plank gap joint between boards
        ctx.fillStyle = '#33281f';
        ctx.fillRect(0, y0, w, 3);
      }
    },
    () => [168, 146, 122, 255],
  );

  const bumpRes = createSafeCoastalTexture(
    512,
    512,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const plankH = h / plankCount;
      ctx.fillStyle = '#b4b4b4';
      ctx.fillRect(0, 0, w, h);
      for (let p = 0; p < plankCount; p++) {
        const y0 = Math.round(p * plankH);
        const ph = Math.round(plankH);
        ctx.fillStyle = '#181818';
        ctx.fillRect(0, y0, w, 3);
        ctx.fillStyle = '#d6d6d6';
        ctx.fillRect(0, y0 + 3, w, 2);
        for (let f = 0; f < 16; f++) {
          const fy = y0 + 5 + ((f * 5 + p * 3) % Math.max(1, ph - 8));
          ctx.fillStyle = f % 2 === 0 ? '#989898' : '#c8c8c8';
          ctx.fillRect(0, fy, w, 1);
        }
        const jointX = Math.round(((p * 173 + 91) % (w - 80)) + 40);
        ctx.fillStyle = '#202020';
        ctx.fillRect(jointX, y0 + 1, 3, ph - 2);
      }
    },
    () => [180, 180, 180, 255],
  );

  const roughRes = createSafeCoastalTexture(
    256,
    256,
    false,
    maxAnisotropy,
    (ctx, w, h) => {
      const plankH = h / plankCount;
      ctx.fillStyle = 'rgb(212,212,212)';
      ctx.fillRect(0, 0, w, h);
      for (let p = 0; p < plankCount; p++) {
        const y0 = Math.round(p * plankH);
        const ph = Math.round(plankH);
        const v = 192 + Math.round(hash01(p * 13.7) * 34);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(0, y0 + 2, w, ph - 2);
        ctx.fillStyle = 'rgb(245,245,245)';
        ctx.fillRect(0, y0, w, 2);
      }
    },
    () => [210, 210, 210, 255],
  );

  return {
    albedo: albedoRes.texture,
    bump: bumpRes.texture,
    roughness: roughRes.texture,
    size: [albedoRes.width, albedoRes.height],
    dispose: () => {
      albedoRes.texture.dispose();
      bumpRes.texture.dispose();
      roughRes.texture.dispose();
    },
  };
}

// =========================================================================
// CUSTOM COASTAL GEOMETRY BUILDERS (FINITE VERTICES & UNIT NORMALS)
// =========================================================================

/**
 * Builds the subdivided tropical beach surface preserving exact world footprint (40 × 274)
 * when placed at (137, -0.06, 0) with rotation.z = -0.025.
 * Gently tucks the western boardwalk lip beneath the deck fascia and tapers the eastern
 * shoreline organically into the seabed beneath the shallow turquoise Atlantic.
 */
export function createCoastalBeachGeometry(): THREE.BufferGeometry {
  const segX = 32;
  const segZ = 112;
  const width = PRESERVED_BEACH_FOOTPRINT.width; // 40
  const depth = PRESERVED_BEACH_FOOTPRINT.depth; // 274

  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  const cosR = Math.cos(PRESERVED_BEACH_FOOTPRINT.rotationZ);
  const sinR = Math.sin(PRESERVED_BEACH_FOOTPRINT.rotationZ);

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i); // [-20, +20]
    const lz = pos.getZ(i); // [-137, +137]

    // Equivalent world coordinates under preserved transform (137, -0.06, 0), rotZ = -0.025
    const worldX = PRESERVED_BEACH_FOOTPRINT.x + lx * cosR;
    const worldZ = PRESERVED_BEACH_FOOTPRINT.z + lz;
    const basePlaneWorldY = PRESERVED_BEACH_FOOTPRINT.y + lx * sinR;

    const targetWorldY = evaluateBeachSurfaceWorldY(worldX, worldZ);
    const localDeltaY = (targetWorldY - basePlaneWorldY) / Math.max(0.5, cosR);
    pos.setY(i, localDeltaY);

    // Clean meter-scaled UVs (1 tile = 5.0m x 5.0m for crisp fine sand grain)
    uv.setXY(i, (lx + width * 0.5) / 5.0, (lz + depth * 0.5) / 5.0);
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  sanitizeGeometryNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds an organically contoured shoreline surf & lacy foam ribbon following `sampleShorelineContourX(z)`
 * along the entire east coast (`z ∈ [-137, 137]`).
 * Never a flat straight rectangular strip — both inland and seaward edges undulate naturally
 * along coastal cusps, elevated slightly above the sloped sand/water intersection to prevent z-fighting.
 */
export function createContouredShorelineFoamGeometry(): THREE.BufferGeometry {
  const segU = 16; // across surf width (inland swash edge -> offshore breaker crest)
  const segV = 136; // along coastline length (274m)
  const zMin = -137;
  const zMax = 137;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const z = THREE.MathUtils.lerp(zMin, zMax, v);
    const shoreX = sampleShorelineContourX(z);
    // Natural varying surf zone width along coastal cusps (10.5m .. 13.5m)
    const inlandX = shoreX - 2.6 - Math.sin(z * 0.078 + 0.9) * 0.45;
    const seawardX = shoreX + 9.4 + Math.cos(z * 0.062 - 0.5) * 1.1;

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0 = inland dry/wet swash reach, 1 = offshore shallow breaker
      const x = THREE.MathUtils.lerp(inlandX, seawardX, u);
      const sandY = evaluateBeachSurfaceWorldY(x, z);
      // Float smoothly above whichever is higher: sloped wet sand or mean shallow water (-0.64)
      const waterFloorY = THREE.MathUtils.lerp(-0.42, -0.66, Math.min(1, u * 1.15));
      const y = Math.max(sandY + 0.045, waterFloorY + 0.045);

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      // Upward-facing (+Y) CCW winding
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  sanitizeGeometryNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds a translucent contoured shallow-water turquoise edge veil smoothly bridging the submerged
 * wet shoreline sand (`shoreX - 0.8`) out into the shallow Atlantic shoal (`shoreX + 14.5`).
 */
export function createShallowWaterVeilGeometry(): THREE.BufferGeometry {
  const segU = 10;
  const segV = 112;
  const zMin = -137;
  const zMax = 137;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const z = THREE.MathUtils.lerp(zMin, zMax, v);
    const shoreX = sampleShorelineContourX(z);
    const inlandX = shoreX - 1.1;
    const seawardX = shoreX + 14.5;

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const x = THREE.MathUtils.lerp(inlandX, seawardX, u);
      const sandY = evaluateBeachSurfaceWorldY(x, z);
      const targetWaterY = THREE.MathUtils.lerp(-0.46, -0.71, u);
      const y = Math.max(sandY + 0.025, targetWaterY);
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = (iv + 1) * stride + iu;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  sanitizeGeometryNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds a chamfered coastal timber guardrail post (like Ref 4, 6, 8, 9 beveled timber caps)
 * pivoted at bottom-center (y = 0..1.08m).
 */
export function createBeveledTimberPostGeometry(
  width = 0.16,
  height = 1.08,
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const capH = 0.055;
  const topW = hw * 0.72;
  const bodyH = height - capH;

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(u0, v0, u1, v1, u2, v2);
  };

  const pushQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
  ) => {
    pushTri(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], 0, 0, 1, 0, 1, 1);
    pushTri(p0[0], p0[1], p0[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], 0, 0, 1, 1, 0, 1);
  };

  const cornersB: Array<[number, number, number]> = [
    [-hw, 0, -hw],
    [hw, 0, -hw],
    [hw, 0, hw],
    [-hw, 0, hw],
  ];
  const cornersM: Array<[number, number, number]> = [
    [-hw, bodyH, -hw],
    [hw, bodyH, -hw],
    [hw, bodyH, hw],
    [-hw, bodyH, hw],
  ];
  const cornersT: Array<[number, number, number]> = [
    [-topW, height, -topW],
    [topW, height, -topW],
    [topW, height, topW],
    [-topW, height, topW],
  ];

  // 4 vertical faces + 4 beveled cap faces
  for (let i = 0; i < 4; i++) {
    const ni = (i + 1) % 4;
    pushQuad(cornersB[ni], cornersB[i], cornersM[i], cornersM[ni]);
    pushQuad(cornersM[ni], cornersM[i], cornersT[i], cornersT[ni]);
  }
  // Top flat cap (+Y)
  pushQuad(cornersT[0], cornersT[3], cornersT[2], cornersT[1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  sanitizeGeometryNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds a realistic marine horn mooring cleat geometry (base flange + twin tapered horns)
 * for the Marina Overlook Pier deck edges.
 */
export function createMooringCleatGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const base = new THREE.BoxGeometry(0.46, 0.045, 0.16);
  base.translate(0, 0.0225, 0);
  parts.push(base);

  const neck = new THREE.BoxGeometry(0.24, 0.085, 0.09);
  neck.translate(0, 0.085, 0);
  parts.push(neck);

  const hornBar = new THREE.BoxGeometry(0.58, 0.06, 0.10);
  hornBar.translate(0, 0.14, 0);
  parts.push(hornBar);

  const merged = mergeNonIndexedGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function mergeNonIndexedGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const posArr: number[] = [];
  const normArr: number[] = [];
  const uvArr: number[] = [];

  for (const src of geos) {
    const g = src.index ? src.toNonIndexed() : src;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      posArr.push(p.getX(i), p.getY(i), p.getZ(i));
      normArr.push(n.getX(i), n.getY(i), n.getZ(i));
      if (u) {
        uvArr.push(u.getX(i), u.getY(i));
      } else {
        uvArr.push(0, 0);
      }
    }
    if (g !== src) g.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  sanitizeGeometryNormals(out);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

// =========================================================================
// CUSTOM PBR SHADER INJECTIONS (DRY->DAMP->WET SAND, SURF FOAM, WET WOOD)
// =========================================================================

const GLSL_SHORELINE_CONTOUR = `
float coastalShorelineX(float z) {
  return 150.2 + sin(z * 0.042 + 0.6) * 1.45 + sin(z * 0.115 - 1.1) * 0.72 + cos(z * 0.23 + 0.4) * 0.32;
}
`;

function attachDryToWetSandShader(
  material: THREE.MeshStandardMaterial,
  worldNoiseTex: THREE.Texture,
  oceanUniforms: OceanAtmosphericUniforms,
): void {
  material.customProgramCacheKey = () => 'vice_coastal_sand_dry_wet_v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.uniforms.uRainAmount = oceanUniforms.uRainAmount;
    shader.uniforms.uStormDarkness = oceanUniforms.uStormDarkness;
    shader.uniforms.uNightFactor = oceanUniforms.uNightFactor;
    shader.uniforms.uSkyHorizon = oceanUniforms.uSkyHorizon;
    shader.uniforms.uSkyTop = oceanUniforms.uSkyTop;
    shader.uniforms.uSunDir = oceanUniforms.uSunDir;
    shader.uniforms.uSunColor = oceanUniforms.uSunColor;
    shader.uniforms.uMoonDir = oceanUniforms.uMoonDir;
    shader.uniforms.uMoonColor = oceanUniforms.uMoonColor;
    shader.uniforms.uSandNoiseMap = { value: worldNoiseTex };

    shader.vertexShader =
      `varying vec3 vSandWorldPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vSandWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader =
      `uniform float uTime;
       uniform float uRainAmount;
       uniform float uStormDarkness;
       uniform float uNightFactor;
       uniform vec3 uSkyHorizon;
       uniform vec3 uSkyTop;
       uniform vec3 uSunDir;
       uniform vec3 uSunColor;
       uniform vec3 uMoonDir;
       uniform vec3 uMoonColor;
       uniform sampler2D uSandNoiseMap;
       varying vec3 vSandWorldPos;
       ${GLSL_SHORELINE_CONTOUR}\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           // Dual-scale world-space noise breaks up ANY repeating sand texture tiling across 274m
           float nMacro = texture2D(uSandNoiseMap, vSandWorldPos.xz * 0.017).r;
           float nMed = texture2D(uSandNoiseMap, vSandWorldPos.xz * 0.058 + vec2(0.37, 0.61)).r;
           float nFine = texture2D(uSandNoiseMap, vSandWorldPos.xz * 0.145 + vec2(0.71, 0.19)).r;
           float sandVar = (nMacro * 0.52 + nMed * 0.33 + nFine * 0.15) - 0.5;

           // Subtle warm-beige / pale-gold natural sand tonal variation
           vec3 warmPatch = vec3(1.0 + sandVar * 0.11, 1.0 + sandVar * 0.09, 1.0 + sandVar * 0.06);
           diffuseColor.rgb *= warmPatch;

           // Irregular dry -> damp -> wet sand coastal moisture transition
           float shoreX = coastalShorelineX(vSandWorldPos.z);
           float moistureJitter = (nMed - 0.5) * 2.35 + (nFine - 0.5) * 0.95;
           float swashPulse = sin(uTime * 0.82 + vSandWorldPos.z * 0.068) * 0.65 + sin(uTime * 0.51 - vSandWorldPos.z * 0.041) * 0.36;
           float signedShore = (vSandWorldPos.x - shoreX) + moistureJitter;

           float dampBand = smoothstep(-10.2, -3.2, signedShore);
           float wetBand = smoothstep(-4.4, -0.35 + swashPulse * 0.62, signedShore);
           float submergedBand = smoothstep(0.6, 4.4, signedShore);

           // Dry (warm golden) -> Damp (compact warm-tan) -> Wet (darker glossy cool wet sand) -> Submerged seabed
           vec3 dampTint = vec3(0.71, 0.62, 0.51);
           vec3 wetTint = vec3(0.42, 0.36, 0.29);
           vec3 seabedTint = vec3(0.24, 0.36, 0.35);

           vec3 sandColor = diffuseColor.rgb;
           sandColor = mix(sandColor, sandColor * dampTint, dampBand * 0.92);
           sandColor = mix(sandColor, diffuseColor.rgb * wetTint, wetBand * 0.96);
           sandColor = mix(sandColor, diffuseColor.rgb * seabedTint, submergedBand * 0.86);

           // Rain gently darkens dry & damp beach sand without turning the whole beach muddy black
           float rainDamp = clamp(uRainAmount * (0.72 + nMed * 0.28), 0.0, 1.0);
           sandColor *= mix(1.0, 0.76, rainDamp * (1.0 - wetBand * 0.65));
           diffuseColor.rgb = sandColor;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           float rNoise = texture2D(uSandNoiseMap, vSandWorldPos.xz * 0.058 + vec2(0.37, 0.61)).r;
           float rShoreX = coastalShorelineX(vSandWorldPos.z);
           float rSigned = (vSandWorldPos.x - rShoreX) + (rNoise - 0.5) * 2.35;
           float rDamp = smoothstep(-10.2, -3.2, rSigned);
           float rWet = smoothstep(-4.2, -0.25, rSigned);

           float targetRough = mix(0.92, 0.58, rDamp);
           targetRough = mix(targetRough, 0.16 + rNoise * 0.06, rWet);
           // Rain gives dry/damp sand a soft damp sheen without looking metallic
           targetRough = mix(targetRough, min(targetRough, 0.36 + rNoise * 0.12), uRainAmount * 0.65);
           roughnessFactor = clamp(targetRough * mix(0.94, 1.06, roughnessFactor), 0.14, 0.96);`,
        )
        .replace(
          '#include <opaque_fragment>',
          `// Subtle dielectric Fresnel sheen on wet receding-surf sand (zero metallic appearance!)
           float sNoise = texture2D(uSandNoiseMap, vSandWorldPos.xz * 0.058 + vec2(0.37, 0.61)).r;
           float sShoreX = coastalShorelineX(vSandWorldPos.z);
           float sSigned = (vSandWorldPos.x - sShoreX) + (sNoise - 0.5) * 2.35;
           float sWetSheen = smoothstep(-3.8, -0.2, sSigned) * (1.0 - smoothstep(2.6, 5.8, sSigned));
           float sRainSheen = uRainAmount * smoothstep(0.45, 0.78, sNoise) * 0.24;
           float sheenMask = clamp(sWetSheen + sRainSheen, 0.0, 1.0);
           if (sheenMask > 0.01) {
             vec3 vVec = cameraPosition - vSandWorldPos;
             vec3 vDir = vVec / max(length(vVec), 1e-4);
             float ndv = clamp(vDir.y, 0.0, 1.0);
             float fres = 0.02 + 0.38 * pow(max(1.0 - ndv, 0.0), 3.1);
             vec3 reflSky = mix(uSkyHorizon, uSkyTop, 0.28) * mix(0.74, 0.22, uNightFactor);
             float sunSpec = pow(clamp(dot(reflect(-vDir, vec3(0.0, 1.0, 0.0)), normalize(uSunDir)), 0.0, 1.0), 34.0)
               * smoothstep(-0.02, 0.10, uSunDir.y) * (1.0 - uStormDarkness * 0.75) * (1.0 - uNightFactor * 0.9);
             float moonSpec = pow(clamp(dot(reflect(-vDir, vec3(0.0, 1.0, 0.0)), normalize(uMoonDir)), 0.0, 1.0), 28.0)
               * uNightFactor * (1.0 - uStormDarkness * 0.6) * 0.35;
             outgoingLight = mix(outgoingLight, reflSky, fres * sheenMask * 0.68);
             outgoingLight += (uSunColor * sunSpec * 0.48 + uMoonColor * moonSpec * 0.26) * sheenMask;
           }
           #include <opaque_fragment>`,
        );
  };
}

/**
 * Builds the GPU-animated layered shoreline surf foam material.
 * Driven purely by existing `oceanUniforms` (`uTime`, `uNightFactor`, `uStormDarkness`, `uSunColor`, `uSkyHorizon`).
 * Produces:
 * - Organic scalloped swash edge rolling onto wet sand & receding smoothly (zero abrupt loop)
 * - Lacy cellular receding foam webs
 * - Broken secondary wave crest offshore
 * - Time-of-day & night-calibrated brightness (never glowing neon white at night!)
 */
function createLayeredSurfFoamMaterial(
  foamLaceTex: THREE.Texture,
  worldNoiseTex: THREE.Texture,
  oceanUniforms: OceanAtmosphericUniforms,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      uTime: oceanUniforms.uTime,
      uSunColor: oceanUniforms.uSunColor,
      uSkyHorizon: oceanUniforms.uSkyHorizon,
      uNightFactor: oceanUniforms.uNightFactor,
      uStormDarkness: oceanUniforms.uStormDarkness,
      uRainAmount: oceanUniforms.uRainAmount,
      uFoamLace: { value: foamLaceTex },
      uWorldNoise: { value: worldNoiseTex },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunColor;
      uniform vec3 uSkyHorizon;
      uniform float uNightFactor;
      uniform float uStormDarkness;
      uniform float uRainAmount;
      uniform sampler2D uFoamLace;
      uniform sampler2D uWorldNoise;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      #include <fog_pars_fragment>

      void main() {
        // vUv.x: 0 = inland dry/wet limit, 1 = offshore shallow breaker edge
        // vUv.y: 0..1 along the 274m coastline
        float zCoord = vWorldPos.z;
        float coastEndFade = 1.0 - smoothstep(124.0, 136.5, abs(zCoord));

        // Organic irregularity along coastline so foam NEVER looks like a straight white strip
        float nCoastA = texture2D(uWorldNoise, vec2(zCoord * 0.019 + 0.13, uTime * 0.015)).r;
        float nCoastB = texture2D(uWorldNoise, vec2(zCoord * 0.052 - 0.41, vUv.x * 0.35)).r;
        float cuspOffset = (nCoastA - 0.5) * 0.19 + (nCoastB - 0.5) * 0.09;

        // Dual overlapping shoreward wave cycles (continuous smooth roll & recession, zero hard reset)
        float phase1 = fract(uTime * 0.155 + sin(zCoord * 0.048) * 0.18 + nCoastA * 0.22);
        float phase2 = fract(phase1 + 0.5);

        // Swash envelope: surges smoothly shoreward then dissolves into lacy foam
        float surge1 = sin(phase1 * 3.14159265);
        float surge2 = sin(phase2 * 3.14159265);

        // Front lip position travels from offshore (0.62) to inland swash (0.14) and ebbs back
        float front1 = mix(0.66, 0.15, pow(surge1, 0.72)) + cuspOffset;
        float front2 = mix(0.66, 0.19, pow(surge2, 0.72)) - cuspOffset * 0.65;

        // Sample multi-scale cellular foam lace drifting gently shoreward
        vec2 laceUv1 = vec2(vWorldPos.x * 0.26 + uTime * 0.14, zCoord * 0.14 + nCoastA * 0.5);
        vec2 laceUv2 = vec2(vWorldPos.x * 0.48 - uTime * 0.09, zCoord * 0.29 - nCoastB * 0.4);
        vec3 foamSample1 = texture2D(uFoamLace, laceUv1).rgb;
        vec3 foamSample2 = texture2D(uFoamLace, laceUv2).rgb;
        float laceWeb = clamp(foamSample1.r * 0.65 + foamSample2.r * 0.52, 0.0, 1.0);
        float fineBubbles = clamp(foamSample1.g * 0.55 + foamSample2.g * 0.45, 0.0, 1.0);

        // Wave 1 crisp scalloped leading lip + trailing lacy foam web
        float dist1 = vUv.x - front1;
        float lip1 = exp(-pow(dist1 / 0.036, 2.0)) * smoothstep(0.06, 0.24, surge1);
        float trail1 = smoothstep(-0.015, 0.04, dist1) * (1.0 - smoothstep(0.06, 0.48, dist1)) * surge1;
        float web1 = trail1 * smoothstep(0.28, 0.72, laceWeb * 0.92 + fineBubbles * 0.32);

        // Wave 2 secondary overlapping surf sheet
        float dist2 = vUv.x - front2;
        float lip2 = exp(-pow(dist2 / 0.042, 2.0)) * smoothstep(0.08, 0.30, surge2) * 0.86;
        float trail2 = smoothstep(-0.015, 0.05, dist2) * (1.0 - smoothstep(0.08, 0.44, dist2)) * surge2;
        float web2 = trail2 * smoothstep(0.32, 0.76, laceWeb * 0.86 + fineBubbles * 0.34) * 0.78;

        // Offshore broken wave crest line (u ≈ 0.68..0.90)
        float breakerWave = sin(zCoord * 0.11 - uTime * 0.95 + nCoastA * 3.2) * 0.5 + 0.5;
        float breakerBand = exp(-pow((vUv.x - (0.74 + cuspOffset * 0.48)) / 0.085, 2.0));
        float breakerFoam = breakerBand * smoothstep(0.36, 0.82, breakerWave * 0.62 + foamSample1.b * 0.55) * (0.64 + uStormDarkness * 0.28);

        // Combine layers cleanly and fade softly at extreme inland & seaward mesh edges
        float edgeMask = smoothstep(0.02, 0.12, vUv.x) * (1.0 - smoothstep(0.80, 0.98, vUv.x));
        float foamAlpha = clamp((lip1 * 0.98 + web1 * 0.80 + lip2 * 0.84 + web2 * 0.64 + breakerFoam * 0.78), 0.0, 1.0);
        foamAlpha *= edgeMask * coastEndFade * mix(0.90, 0.96, uStormDarkness);

        if (foamAlpha < 0.02) discard;

        // Natural day / golden hour / sunset / night / storm foam coloration (crisp bubbly daylight, calm night)
        float lipHighlight = clamp(lip1 + lip2 * 0.85, 0.0, 1.0);
        vec3 dayFoam = mix(vec3(0.84, 0.92, 0.93), vec3(0.97, 0.98, 0.99), lipHighlight);
        vec3 sunWarm = mix(dayFoam, dayFoam * (uSunColor * 0.58 + vec3(0.48)), 0.30 * (1.0 - uNightFactor));
        vec3 stormFoam = vec3(0.58, 0.64, 0.68);
        vec3 nightFoam = mix(vec3(0.14, 0.21, 0.30), vec3(0.24, 0.32, 0.42), lipHighlight);

        vec3 finalFoam = mix(mix(sunWarm, stormFoam, uStormDarkness * 0.55), nightFoam, uNightFactor * 0.88);
        finalFoam = mix(finalFoam, uSkyHorizon * 0.68 + finalFoam * 0.38, 0.14);

        gl_FragColor = vec4(finalFoam, clamp(foamAlpha * 0.92, 0.0, 0.92));
        #include <fog_fragment>
      }
    `,
  });
}

/**
 * Builds the translucent shallow-turquoise shoreline water veil blending submerged wet sand
 * seamlessly into the Atlantic shallow shoal without hard mesh edges.
 */
function createShallowWaterVeilMaterial(
  worldNoiseTex: THREE.Texture,
  oceanUniforms: OceanAtmosphericUniforms,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      uTime: oceanUniforms.uTime,
      uSkyHorizon: oceanUniforms.uSkyHorizon,
      uNightFactor: oceanUniforms.uNightFactor,
      uStormDarkness: oceanUniforms.uStormDarkness,
      uWorldNoise: { value: worldNoiseTex },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSkyHorizon;
      uniform float uNightFactor;
      uniform float uStormDarkness;
      uniform sampler2D uWorldNoise;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      #include <fog_pars_fragment>

      void main() {
        float coastFade = 1.0 - smoothstep(125.0, 136.5, abs(vWorldPos.z));
        float nCausticA = texture2D(uWorldNoise, vec2(vWorldPos.x * 0.09 + uTime * 0.04, vWorldPos.z * 0.06 - uTime * 0.03)).r;
        float nCausticB = texture2D(uWorldNoise, vec2(vWorldPos.x * 0.14 - uTime * 0.03, vWorldPos.z * 0.11 + uTime * 0.04)).r;
        float caustic = smoothstep(0.45, 0.85, nCausticA * 0.55 + nCausticB * 0.45);

        // Bell-curve alpha with organic noise feather: ZERO hard geometric ribbon edge from aerial camera!
        float edgeIn = smoothstep(0.04, 0.26, vUv.x + (nCausticB - 0.5) * 0.08);
        float edgeOut = 1.0 - smoothstep(0.26, 0.92, vUv.x + (nCausticA - 0.5) * 0.14);
        float alpha = edgeIn * edgeOut * coastFade * mix(0.36, 0.22, uNightFactor);

        if (alpha < 0.01) discard;

        vec3 dayShallow = mix(vec3(0.08, 0.58, 0.58), vec3(0.22, 0.74, 0.70), caustic * 0.35);
        vec3 stormShallow = vec3(0.06, 0.16, 0.20);
        vec3 nightShallow = vec3(0.016, 0.045, 0.072);
        vec3 col = mix(mix(dayShallow, stormShallow, uStormDarkness * 0.72), nightShallow, uNightFactor * 0.90);
        col = mix(col, uSkyHorizon * 0.65, 0.14);

        gl_FragColor = vec4(col, alpha);
        #include <fog_fragment>
      }
    `,
  });
}

/**
 * Adds subtle rain-wetness darkening & sheen to coastal boardwalk & pier timber materials
 * synchronized directly with `oceanUniforms.uRainAmount`.
 */
function attachWetTimberShader(
  material: THREE.MeshStandardMaterial,
  oceanUniforms: OceanAtmosphericUniforms,
  cacheSuffix: string,
): void {
  material.customProgramCacheKey = () => `vice_coastal_wet_timber_${cacheSuffix}_v1`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRainAmount = oceanUniforms.uRainAmount;
    shader.fragmentShader =
      `uniform float uRainAmount;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           diffuseColor.rgb *= mix(1.0, 0.72, uRainAmount * 0.82);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, min(roughnessFactor, 0.28), uRainAmount * 0.78);`,
        );
  };
}

// =========================================================================
// MAIN BUILDER — buildCoastalShorelineAssets(...)
// =========================================================================

export function buildCoastalShorelineAssets(
  ctx: CoastalShorelineContext,
): CoastalShorelineBuildResult {
  const { root, oceanUniforms, disposables } = ctx;
  const aniso = ctx.maxAnisotropy ?? 4;

  const coastalGroup = new THREE.Group();
  coastalGroup.name = 'coastal_shoreline_root';
  root.add(coastalGroup);

  let totalCustomGeometryCount = 0;
  let instancedBatches = 0;

  // -------------------------------------------------------
  // 1. PROCEDURAL TEXTURES & COMPACT SHARED PBR MATERIAL POOL
  // -------------------------------------------------------
  const sandTextures = createBeachSandTextureSet(aniso);
  disposables.push(sandTextures);

  const foamLaceRes = createSurfFoamLaceTexture(aniso);
  disposables.push(foamLaceRes.texture);

  const woodTextures = createCoastalBoardwalkWoodTextures(aniso);
  disposables.push(woodTextures);

  // Repeat setup for boardwalk deck (9.5m x 252m -> transverse planks ~0.26m wide)
  const boardwalkAlbedo = woodTextures.albedo.clone();
  boardwalkAlbedo.needsUpdate = true;
  boardwalkAlbedo.repeat.set(2.4, 72);
  const boardwalkBump = woodTextures.bump.clone();
  boardwalkBump.needsUpdate = true;
  boardwalkBump.repeat.set(2.4, 72);
  const boardwalkRough = woodTextures.roughness.clone();
  boardwalkRough.needsUpdate = true;
  boardwalkRough.repeat.set(2.4, 72);
  disposables.push(boardwalkAlbedo, boardwalkBump, boardwalkRough);

  // Repeat setup for Marina Overlook Pier deck (38m x 12m -> transverse marine planks across pier width)
  const pierAlbedo = woodTextures.albedo.clone();
  pierAlbedo.needsUpdate = true;
  pierAlbedo.center.set(0.5, 0.5);
  pierAlbedo.rotation = Math.PI / 2;
  pierAlbedo.repeat.set(3.2, 13.5);
  const pierBump = woodTextures.bump.clone();
  pierBump.needsUpdate = true;
  pierBump.center.set(0.5, 0.5);
  pierBump.rotation = Math.PI / 2;
  pierBump.repeat.set(3.2, 13.5);
  const pierRough = woodTextures.roughness.clone();
  pierRough.needsUpdate = true;
  pierRough.center.set(0.5, 0.5);
  pierRough.rotation = Math.PI / 2;
  pierRough.repeat.set(3.2, 13.5);
  disposables.push(pierAlbedo, pierBump, pierRough);

  // Shared Material 1: Beach Sand (Dry -> Damp -> Wet shader-driven PBR)
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sandTextures.albedo,
    bumpMap: sandTextures.bump,
    bumpScale: 0.046,
    roughness: 1.0,
    roughnessMap: sandTextures.roughness,
    metalness: 0.0,
    envMapIntensity: 0.68,
  });
  attachDryToWetSandShader(beachMat, sandTextures.worldNoise, oceanUniforms);

  // Shared Material 2: Layered Animated Surf Foam
  const surfFoamMat = createLayeredSurfFoamMaterial(
    foamLaceRes.texture,
    sandTextures.worldNoise,
    oceanUniforms,
  );

  // Shared Material 3: Translucent Shallow-Water Turquoise Edge Veil
  const shallowVeilMat = createShallowWaterVeilMaterial(sandTextures.worldNoise, oceanUniforms);

  // Shared Material 4: Boardwalk Plank Decking (weathered cedar + wet rain sheen)
  const boardwalkDeckMat = new THREE.MeshStandardMaterial({
    color: 0xf4ede3,
    map: boardwalkAlbedo,
    bumpMap: boardwalkBump,
    bumpScale: 0.04,
    roughness: 0.92,
    roughnessMap: boardwalkRough,
    metalness: 0.03,
    envMapIntensity: 0.65,
  });
  attachWetTimberShader(boardwalkDeckMat, oceanUniforms, 'boardwalk_deck');

  // Shared Material 5: Marina Pier Marine-Grade Decking
  const pierDeckMat = new THREE.MeshStandardMaterial({
    color: 0xeae0d1,
    map: pierAlbedo,
    bumpMap: pierBump,
    bumpScale: 0.044,
    roughness: 0.90,
    roughnessMap: pierRough,
    metalness: 0.04,
    envMapIntensity: 0.68,
  });
  attachWetTimberShader(pierDeckMat, oceanUniforms, 'pier_deck');

  // Shared Material 6: Sun-Bleached Coastal Timber (rails, posts, beams, ramps, edging)
  const structuralTimberMat = new THREE.MeshStandardMaterial({
    color: 0xd9c6ad,
    map: woodTextures.albedo,
    bumpMap: woodTextures.bump,
    bumpScale: 0.032,
    roughness: 0.86,
    metalness: 0.03,
    envMapIntensity: 0.55,
  });
  attachWetTimberShader(structuralTimberMat, oceanUniforms, 'structural');

  // Shared Material 7: Heavy Creosote / Salt-Weathered Marine Pilings & Under-Deck Joists
  const marinePilingMat = new THREE.MeshStandardMaterial({
    color: 0x6b5847,
    bumpMap: woodTextures.bump,
    bumpScale: 0.045,
    roughness: 0.90,
    metalness: 0.04,
    envMapIntensity: 0.48,
  });
  attachWetTimberShader(marinePilingMat, oceanUniforms, 'piling');

  // Shared Material 8: Marine Hardware (cast-iron cleats, shower fixtures, lantern caps)
  const marineHardwareMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.72,
    envMapIntensity: 1.0,
  });

  // Shared Material 9: Coiled Hemp Mooring Rope
  const mooringRopeMat = new THREE.MeshStandardMaterial({
    color: 0xcab38b,
    roughness: 0.92,
    metalness: 0.0,
  });

  // Shared Material 10: Warm Coastal Safety Lantern Glass (calm in daylight, warm amber glow at night)
  const coastalLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff0d4,
    emissive: 0xffbe66,
    emissiveIntensity: 1.0,
    roughness: 0.22,
    metalness: 0.05,
  });
  coastalLanternMat.customProgramCacheKey = () => 'vice_coastal_safety_lantern_v1';
  coastalLanternMat.onBeforeCompile = (shader) => {
    shader.uniforms.uNightFactor = oceanUniforms.uNightFactor;
    shader.fragmentShader =
      `uniform float uNightFactor;\n` +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance *= mix(0.08, 1.65, uNightFactor);`,
      );
  };

  const sharedMaterials = [
    beachMat,
    surfFoamMat,
    shallowVeilMat,
    boardwalkDeckMat,
    pierDeckMat,
    structuralTimberMat,
    marinePilingMat,
    marineHardwareMat,
    mooringRopeMat,
    coastalLanternMat,
  ];
  disposables.push(...sharedMaterials);

  // -------------------------------------------------------
  // 2. BEACH SURFACE & CONTOURED SHORELINE SURF / SHALLOW VEIL
  // -------------------------------------------------------
  const beachGeo = createCoastalBeachGeometry();
  totalCustomGeometryCount += 1;
  disposables.push(beachGeo);

  const beachMesh = new THREE.Mesh(beachGeo, beachMat);
  beachMesh.name = 'coastal_beach_sand';
  beachMesh.position.set(
    PRESERVED_BEACH_FOOTPRINT.x,
    PRESERVED_BEACH_FOOTPRINT.y,
    PRESERVED_BEACH_FOOTPRINT.z,
  );
  beachMesh.rotation.z = PRESERVED_BEACH_FOOTPRINT.rotationZ;
  beachMesh.receiveShadow = true;
  coastalGroup.add(beachMesh);

  const shallowVeilGeo = createShallowWaterVeilGeometry();
  totalCustomGeometryCount += 1;
  disposables.push(shallowVeilGeo);

  const shallowVeilMesh = new THREE.Mesh(shallowVeilGeo, shallowVeilMat);
  shallowVeilMesh.name = 'coastal_shallow_water_veil';
  shallowVeilMesh.renderOrder = 1;
  coastalGroup.add(shallowVeilMesh);

  const foamGeo = createContouredShorelineFoamGeometry();
  totalCustomGeometryCount += 1;
  disposables.push(foamGeo);

  const shorelineFoamMesh = new THREE.Mesh(foamGeo, surfFoamMat);
  shorelineFoamMesh.name = 'coastal_shoreline_surf_foam';
  shorelineFoamMesh.renderOrder = 2;
  coastalGroup.add(shorelineFoamMesh);

  // -------------------------------------------------------
  // 3. DETAILED OCEAN DRIVE WOODEN BOARDWALK (9.5 x 0.16 x 252 @ x=113.5)
  // -------------------------------------------------------
  const boardwalkDeckGeo = new THREE.BoxGeometry(
    PRESERVED_BOARDWALK_FOOTPRINT.width,
    PRESERVED_BOARDWALK_FOOTPRINT.height,
    PRESERVED_BOARDWALK_FOOTPRINT.depth,
  );
  disposables.push(boardwalkDeckGeo);

  const boardwalkDeckMesh = new THREE.Mesh(boardwalkDeckGeo, boardwalkDeckMat);
  boardwalkDeckMesh.name = 'coastal_boardwalk_deck';
  boardwalkDeckMesh.position.set(
    PRESERVED_BOARDWALK_FOOTPRINT.x,
    PRESERVED_BOARDWALK_FOOTPRINT.y,
    PRESERVED_BOARDWALK_FOOTPRINT.z,
  );
  boardwalkDeckMesh.receiveShadow = true;
  coastalGroup.add(boardwalkDeckMesh);

  // Helper for clean InstancedMesh creation with computed bounding spheres & disposal registration
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  const buildInstancedBatch = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    transforms: Array<{
      pos: [number, number, number];
      rot?: [number, number, number];
      scale?: [number, number, number];
      colorHex?: number;
    }>,
    castShadow = false,
    receiveShadow = true,
  ): THREE.InstancedMesh | null => {
    if (transforms.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
    mesh.name = name;
    let hasColor = false;
    for (let i = 0; i < transforms.length; i++) {
      const tr = transforms[i];
      dummy.position.set(tr.pos[0], tr.pos[1], tr.pos[2]);
      dummy.rotation.set(tr.rot?.[0] ?? 0, tr.rot?.[1] ?? 0, tr.rot?.[2] ?? 0);
      dummy.scale.set(tr.scale?.[0] ?? 1, tr.scale?.[1] ?? 1, tr.scale?.[2] ?? 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (tr.colorHex !== undefined) {
        mesh.setColorAt(i, tmpColor.setHex(tr.colorHex));
        hasColor = true;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (hasColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.computeBoundingSphere();
    disposables.push(mesh);
    coastalGroup.add(mesh);
    instancedBatches += 1;
    return mesh;
  };

  // Shared unit box & cylinder + custom beveled post & cleat geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const ropeRingGeo = new THREE.TorusGeometry(0.28, 0.042, 8, 18);
  ropeRingGeo.rotateX(Math.PI / 2);
  const beveledPostGeo = createBeveledTimberPostGeometry(0.16, 1.06);
  const cleatGeo = createMooringCleatGeometry();
  totalCustomGeometryCount += 2; // beveledPostGeo + cleatGeo
  disposables.push(unitBoxGeo, unitCylGeo, ropeRingGeo, beveledPostGeo, cleatGeo);

  // 3A. Instanced Physical Plank Details & Border Boards on Boardwalk & Pier
  // Harmonious sun-bleached cedar curb boards & subtle 8m expansion thresholds (no harsh dark striping!)
  const plankTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
    colorHex: number;
  }> = [];
  const plankPalette = [0xf2eae0, 0xeadfce, 0xf6efe6, 0xe4d7c5, 0xeee4d6];

  // Subtle weathered expansion threshold boards every 8.0m along the 252m promenade (32 boards)
  for (let z = -124; z <= 124; z += 8.0) {
    plankTransforms.push({
      pos: [113.5, 0.164, z],
      scale: [8.86, 0.012, 0.22],
      colorHex: plankPalette[Math.abs(Math.round(z)) % plankPalette.length],
    });
  }
  // Crisp longitudinal curb border boards along west (108.92) & east (118.08) edges in 3.0m timber runs (166 boards)
  for (let z = -124.5; z <= 124.5; z += 3.0) {
    const toneIdx = Math.abs(Math.round(z)) % plankPalette.length;
    plankTransforms.push({
      pos: [108.92, 0.168, z],
      scale: [0.34, 0.02, 2.94],
      colorHex: plankPalette[toneIdx],
    });
    plankTransforms.push({
      pos: [118.08, 0.168, z],
      scale: [0.34, 0.02, 2.94],
      colorHex: plankPalette[(toneIdx + 2) % plankPalette.length],
    });
  }
  // Pier perimeter border curb boards (north & south) + subtle 8m deck expansion thresholds (32 boards)
  for (let x = 119.0; x <= 153.5; x += 3.0) {
    const toneIdx = Math.abs(Math.round(x)) % plankPalette.length;
    plankTransforms.push({
      pos: [x, 0.48, 90.26],
      scale: [2.94, 0.02, 0.34],
      colorHex: plankPalette[toneIdx],
    });
    plankTransforms.push({
      pos: [x, 0.48, 101.74],
      scale: [2.94, 0.02, 0.34],
      colorHex: plankPalette[(toneIdx + 1) % plankPalette.length],
    });
  }
  for (let x = 122.0; x <= 154.0; x += 8.0) {
    plankTransforms.push({
      pos: [x, 0.479, 96],
      scale: [0.22, 0.012, 11.1],
      colorHex: plankPalette[Math.abs(Math.round(x)) % plankPalette.length],
    });
  }
  const boardwalkPlankCount = plankTransforms.length;
  buildInstancedBatch(
    'coastal_inst_boardwalk_planks',
    unitBoxGeo,
    structuralTimberMat,
    plankTransforms,
    false,
    true,
  );

  // 3B. Boardwalk Structural Edge Fascia, Under-Deck Joists & Sleepers (grounded cleanly into sand/slab)
  const bwStructTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
  }> = [];

  // Continuous side fascia timbers (west x=108.76 & east x=118.24) + end cap fascia at z = ±126
  bwStructTransforms.push(
    { pos: [108.76, 0.06, 0], scale: [0.14, 0.24, 252.1] },
    { pos: [118.24, 0.06, 0], scale: [0.14, 0.24, 252.1] },
    { pos: [113.5, 0.06, -126.02], scale: [9.62, 0.24, 0.16] },
    { pos: [113.5, 0.06, 126.02], scale: [9.62, 0.24, 0.16] },
  );
  // Under-deck transverse sleeper joists & sand-retaining footings every 6m along 252m promenade
  for (let z = -123; z <= 123; z += 6.0) {
    bwStructTransforms.push({
      pos: [113.5, -0.08, z],
      scale: [9.42, 0.22, 0.24],
    });
    // East sand-edge timber retaining skirt beneath east fascia so sand never leaves an air gap
    bwStructTransforms.push({
      pos: [118.28, -0.14, z],
      scale: [0.14, 0.34, 5.95],
    });
  }

  // 3C. East Beach-Side Coastal Timber 3-Rail Guardrails (with open beach access gaps & pier junction!)
  const isBoardwalkOpening = (z: number): boolean => {
    // Open junction onto Marina Overlook Pier (z = 89..103)
    if (z >= 88.5 && z <= 103.5) return true;
    // Open beach access stair/ramp bays (6.4m wide openings)
    for (const az of BEACH_ACCESS_Z) {
      if (Math.abs(z - az) < 3.4) return true;
    }
    return false;
  };

  const postTransforms: Array<{
    pos: [number, number, number];
    scale?: [number, number, number];
  }> = [];
  const railTransforms: Array<{
    pos: [number, number, number];
    rot?: [number, number, number];
    scale: [number, number, number];
  }> = [];

  // Divide boardwalk east edge (z = -124..+124) into 3.2m railing bays
  const bayStep = 3.2;
  const railZSteps: number[] = [];
  for (let z = -124; z <= 124.01; z += bayStep) {
    railZSteps.push(Number(z.toFixed(2)));
  }

  const placedPostZ = new Set<number>();
  for (let i = 0; i < railZSteps.length - 1; i++) {
    const z0 = railZSteps[i];
    const z1 = railZSteps[i + 1];
    const zMid = (z0 + z1) * 0.5;
    if (isBoardwalkOpening(zMid)) continue;

    if (!placedPostZ.has(z0)) {
      placedPostZ.add(z0);
      postTransforms.push({ pos: [118.10, 0.14, z0] });
    }
    if (!placedPostZ.has(z1)) {
      placedPostZ.add(z1);
      postTransforms.push({ pos: [118.10, 0.14, z1] });
    }

    // 3 horizontal weathered cedar rails (matching Ref 4, 6, 8, 9!)
    const segLen = z1 - z0 + 0.06;
    for (const ry of [0.44, 0.74, 1.04]) {
      railTransforms.push({
        pos: [118.04, ry, zMid],
        scale: [0.065, 0.105, segLen],
      });
    }
  }

  // Smooth boardwalk end transition ramps at north (z = -126) and south (z = +126)
  for (const dir of [-1, 1] as const) {
    railTransforms.push({
      pos: [113.5, 0.08, dir * 126.95],
      rot: [dir * 0.09, 0, 0],
      scale: [9.5, 0.12, 1.9],
    });
  }

  // -------------------------------------------------------
  // 4. MARINA OVERLOOK PIER (38 x 0.45 x 12 @ (136, 0.25, 96))
  // -------------------------------------------------------
  const pierDeckGeo = new THREE.BoxGeometry(
    PRESERVED_PIER_FOOTPRINT.width,
    PRESERVED_PIER_FOOTPRINT.height,
    PRESERVED_PIER_FOOTPRINT.depth,
  );
  disposables.push(pierDeckGeo);

  const pierDeckMesh = new THREE.Mesh(pierDeckGeo, pierDeckMat);
  pierDeckMesh.name = 'coastal_marina_pier_deck';
  pierDeckMesh.position.set(
    PRESERVED_PIER_FOOTPRINT.x,
    PRESERVED_PIER_FOOTPRINT.y,
    PRESERVED_PIER_FOOTPRINT.z,
  );
  pierDeckMesh.receiveShadow = true;
  coastalGroup.add(pierDeckMesh);

  const pierPilingTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
  }> = [];
  const pierBeamTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
  }> = [];
  const cleatTransforms: Array<{
    pos: [number, number, number];
    rot?: [number, number, number];
  }> = [];
  const ropeTransforms: Array<{
    pos: [number, number, number];
    scale?: [number, number, number];
  }> = [];
  const lanternBulbTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
  }> = [];
  const lanternCapTransforms: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
  }> = [];

  // 4A. Smooth timber transition ramp from boardwalk (x=118.25, y=0.16) up onto pier (x=117..119.4, y=0.475)
  railTransforms.push({
    pos: [117.1, 0.31, 96.0],
    rot: [0, 0, 0.14],
    scale: [2.35, 0.16, 11.8],
  });

  // 4B. Heavy Under-Deck Pier Support Pilings, Seaward Dolphin Pilings & Cross-Cap Beams (10 bays along x = 119..154)
  for (let px = 119.0; px <= 154.01; px += 3.85) {
    const isEndBay = px > 152.5;
    const isSeawardMid = px > 143.5 && px < 147.0;
    // 3 pilings across the 12m pier width (north, center, south) grounded deep down to y = -2.45m
    for (const pz of [90.75, 96.0, 101.25]) {
      const isDolphin = (isEndBay || isSeawardMid) && pz !== 96.0;
      const topY = isEndBay && pz !== 96.0 ? 1.88 : isDolphin ? 1.52 : 0.04;
      const botY = -2.45;
      const h = topY - botY;
      pierPilingTransforms.push({
        pos: [px, botY + h * 0.5, pz],
        scale: [isDolphin ? 0.28 : 0.23, h, isDolphin ? 0.28 : 0.23],
      });
      // Coiled weathered mooring rope wrapped around the tall corner & seaward dolphin pilings
      if (isDolphin) {
        const ropeBaseY = isEndBay ? 1.24 : 1.06;
        ropeTransforms.push(
          { pos: [px, ropeBaseY, pz], scale: [1.10, 1.0, 1.10] },
          { pos: [px, ropeBaseY + 0.09, pz], scale: [1.08, 1.0, 1.08] },
          { pos: [px, ropeBaseY + 0.18, pz], scale: [1.06, 1.0, 1.06] },
        );
      }
    }
    // Heavy transverse pile-cap cross-beam under the pier deck
    pierBeamTransforms.push({
      pos: [px, -0.05, 96.0],
      scale: [0.34, 0.30, 11.75],
    });
    // Marine sway cross-bracing beneath the outer seaward pier bents over the surf
    if (px >= 145.5) {
      pierBeamTransforms.push(
        { pos: [px, -0.52, 93.4], scale: [0.16, 0.18, 5.2] },
        { pos: [px, -0.52, 98.6], scale: [0.16, 0.18, 5.2] },
      );
    }
  }
  // Longitudinal under-deck stringers + deck perimeter bull-rail edge fascia (north, south, east)
  for (const sz of [90.6, 93.3, 96.0, 98.7, 101.4]) {
    pierBeamTransforms.push({
      pos: [136.0, 0.04, sz],
      scale: [37.6, 0.22, 0.24],
    });
  }
  // Perimeter fascia trim beams
  pierBeamTransforms.push(
    { pos: [136.0, 0.26, 89.96], scale: [38.12, 0.48, 0.16] },
    { pos: [136.0, 0.26, 102.04], scale: [38.12, 0.48, 0.16] },
    { pos: [155.04, 0.26, 96.0], scale: [0.16, 0.48, 12.24] },
  );

  // 4C. Pier Perimeter Timber Railings (North z=90.2, South z=101.8, East Overlook x=154.8; West approach OPEN!)
  const pierRailXStops = [119.2, 123.6, 128.0, 132.4, 136.8, 141.2, 145.6, 150.0, 154.6];
  for (const sideZ of [90.22, 101.78]) {
    for (let i = 0; i < pierRailXStops.length; i++) {
      const px = pierRailXStops[i];
      postTransforms.push({ pos: [px, 0.45, sideZ] });
      // Marine safety lanterns mounted atop alternate pier posts (indices 1, 4, 7)
      if (i === 1 || i === 4 || i === 7) {
        lanternBulbTransforms.push({ pos: [px, 1.62, sideZ], scale: [0.16, 0.18, 0.16] });
        lanternCapTransforms.push(
          { pos: [px, 1.52, sideZ], scale: [0.22, 0.04, 0.22] },
          { pos: [px, 1.73, sideZ], scale: [0.24, 0.05, 0.24] },
        );
      }
      if (i < pierRailXStops.length - 1) {
        const xMid = (px + pierRailXStops[i + 1]) * 0.5;
        const len = pierRailXStops[i + 1] - px + 0.06;
        for (const ry of [0.76, 1.06, 1.38]) {
          railTransforms.push({
            pos: [xMid, ry, sideZ],
            scale: [len, 0.105, 0.075],
          });
        }
      }
    }
  }
  // East overlook end railing (x = 154.6, z = 90.22..101.78)
  const pierEndZStops = [90.22, 93.11, 96.0, 98.89, 101.78];
  for (let i = 0; i < pierEndZStops.length; i++) {
    if (i > 0 && i < pierEndZStops.length - 1) {
      postTransforms.push({ pos: [154.6, 0.45, pierEndZStops[i]] });
    }
    if (i < pierEndZStops.length - 1) {
      const zMid = (pierEndZStops[i] + pierEndZStops[i + 1]) * 0.5;
      const len = pierEndZStops[i + 1] - pierEndZStops[i] + 0.06;
      for (const ry of [0.76, 1.06, 1.38]) {
        railTransforms.push({
          pos: [154.6, ry, zMid],
          scale: [0.075, 0.105, len],
        });
      }
    }
  }

  // 4D. Cast-Iron Mooring Cleats bolted along north & south pier bull-rails (4 per side)
  for (const cx of [125.8, 134.6, 143.4, 152.2]) {
    cleatTransforms.push(
      { pos: [cx, 0.475, 90.58], rot: [0, 0, 0] },
      { pos: [cx, 0.475, 101.42], rot: [0, Math.PI, 0] },
    );
  }

  // -------------------------------------------------------
  // 5. LIMITED AUTHENTIC COASTAL DETAILS (Ramps, Showers, Markers)
  // -------------------------------------------------------
  let coastalDetailCount = 0;

  // 5A. 5 Timber Beach Access Ramps sloping from boardwalk openings onto the golden beach sand
  for (const az of BEACH_ACCESS_Z) {
    const sandEdgeY = evaluateBeachSurfaceWorldY(121.4, az);
    const rampTopY = 0.15;
    const rampLen = 3.2;
    const pitch = Math.atan2(sandEdgeY - rampTopY, rampLen);
    const midY = (rampTopY + sandEdgeY) * 0.5;
    // Sloped wooden ramp deck
    railTransforms.push({
      pos: [119.8, midY, az],
      rot: [0, 0, pitch],
      scale: [rampLen, 0.12, 4.6],
    });
    // Twin low curb rails flanking each ramp + boardwalk entrance bollard lantern on north flank
    for (const dz of [-2.22, 2.22]) {
      railTransforms.push({
        pos: [119.8, midY + 0.14, az + dz],
        rot: [0, 0, pitch],
        scale: [rampLen, 0.14, 0.14],
      });
    }
    // Discreet coastal access bollard lantern on boardwalk entrance flank (x = 118.10)
    lanternBulbTransforms.push({ pos: [118.10, 1.24, az - 3.2], scale: [0.14, 0.14, 0.14] });
    lanternCapTransforms.push({ pos: [118.10, 1.33, az - 3.2], scale: [0.20, 0.04, 0.20] });
    coastalDetailCount += 1;
  }

  // 5B. 3 Discreet Coastal Beach Rinse-Shower Posts tucked neatly next to beach access ramps
  const showerZCoords = [-51.5, 20.5, 60.5];
  for (const sz of showerZCoords) {
    const sy = evaluateBeachSurfaceWorldY(119.35, sz);
    // Vertical timber shower post planted firmly in sand
    postTransforms.push({ pos: [119.35, sy - 0.15, sz], scale: [1.15, 2.25, 1.15] });
    // Wooden slatted rinse-pad base
    railTransforms.push({ pos: [119.85, sy + 0.03, sz], scale: [1.05, 0.08, 1.05] });
    // Stainless pipe arm + shower head
    lanternCapTransforms.push(
      { pos: [119.65, sy + 2.12, sz], scale: [0.58, 0.05, 0.05] },
      { pos: [119.92, sy + 2.02, sz], scale: [0.14, 0.09, 0.14] },
      { pos: [119.50, sy + 1.12, sz], scale: [0.16, 0.06, 0.06] },
    );
    coastalDetailCount += 1;
  }

  // 5C. 4 Subtle Beach Access Timber Marker Posts along sand edge
  for (const mz of [-100.5, -11.5, 28.5, 68.5]) {
    const my = evaluateBeachSurfaceWorldY(119.7, mz);
    postTransforms.push({ pos: [119.7, my - 0.18, mz], scale: [0.92, 1.32, 0.92] });
    // Small coastal marker plaque on top of post
    lanternCapTransforms.push({ pos: [119.7, my + 1.08, mz], scale: [0.06, 0.34, 0.42] });
    coastalDetailCount += 1;
  }

  // Flush all instanced structural batches cleanly
  buildInstancedBatch(
    'coastal_inst_boardwalk_beams',
    unitBoxGeo,
    marinePilingMat,
    bwStructTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_timber_posts',
    beveledPostGeo,
    structuralTimberMat,
    postTransforms,
    true,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_timber_rails',
    unitBoxGeo,
    structuralTimberMat,
    railTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_pier_pilings',
    unitCylGeo,
    marinePilingMat,
    pierPilingTransforms,
    true,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_pier_beams',
    unitBoxGeo,
    marinePilingMat,
    pierBeamTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_pier_cleats',
    cleatGeo,
    marineHardwareMat,
    cleatTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_pier_ropes',
    ropeRingGeo,
    mooringRopeMat,
    ropeTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_hardware_caps',
    unitBoxGeo,
    marineHardwareMat,
    lanternCapTransforms,
    false,
    true,
  );
  buildInstancedBatch(
    'coastal_inst_safety_lanterns',
    unitBoxGeo,
    coastalLanternMat,
    lanternBulbTransforms,
    false,
    false,
  );

  const stats: CoastalShorelineStats = {
    beachSurfaceCount: 1,
    shorelineMeshCount: 2, // contoured surf foam + translucent shallow-water veil
    foamGeometryCount: 1,
    boardwalkPlankCount,
    boardwalkStructuralInstances:
      bwStructTransforms.length + postTransforms.length + railTransforms.length,
    pierStructuralInstanceCount:
      pierPilingTransforms.length +
      pierBeamTransforms.length +
      cleatTransforms.length +
      ropeTransforms.length,
    coastalDetailCount,
    instancedBatches,
    sharedMaterialCount: sharedMaterials.length,
    totalCustomGeometryCount,
    beachFootprint: PRESERVED_BEACH_FOOTPRINT,
    boardwalkFootprint: PRESERVED_BOARDWALK_FOOTPRINT,
    pierFootprint: PRESERVED_PIER_FOOTPRINT,
    sandWetnessConfig: SAND_MOISTURE_CONFIG,
    sandTextureSizes: {
      albedo: sandTextures.sizes.albedo,
      bump: sandTextures.sizes.bump,
      roughness: sandTextures.sizes.roughness,
      foamLace: [foamLaceRes.width, foamLaceRes.height],
      boardwalkWood: woodTextures.size,
    },
  };

  return {
    stats,
    boardwalkTimberMaterial: structuralTimberMat,
    beachMesh,
    shorelineFoamMesh,
    shallowVeilMesh,
    boardwalkDeckMesh,
    pierDeckMesh,
  };
}
