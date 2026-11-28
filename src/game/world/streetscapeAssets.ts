import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CityLayout,
  IntersectionNode,
  ROAD_COORDS,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  SidewalkLoop,
  StreetlightSpec,
} from './cityData';
import { createSeededRng, distSq2D, getDistrictAt } from '../core/math';
import { DistrictId } from '../types';

export const SIDEWALK_SLAB_TOP_Y = 0.095;
export const SIDEWALK_CURB_TOP_Y = 0.108;
export const SIDEWALK_CURB_WIDTH = 0.24;
export const SIDEWALK_CORNER_LANDING_SPAN = 2.35;
export const CURB_RAMP_MIN_Y = 0.042;
export const ROAD_LANE_OFFSET = 3.2;
export const PROTECTED_CROSSWALK_BAND = ROAD_WIDTH / 2 + 3.15; // 10.15m from intersection center

export interface BlockSidewalkBounds {
  centerX: number;
  centerZ: number;
  centerlineHalf: number;
  innerHalf: number;
  outerHalf: number;
  topY: number;
}

export interface StreetscapeStats {
  renderedSidewalkLoopCount: number;
  skippedNonBlockLoopCount: number;
  sidewalkSlabCount: number;
  curbSegmentCount: number;
  curbRampCount: number;
  tactilePadCount: number;
  drainGrateCount: number;
  stopBarCount: number;
  laneDashCount: number;
  directionalArrowCount: number;
  manholeCount: number;
  benchCount: number;
  wasteBinCount: number;
  streetSignCount: number;
  busStopSignCount: number;
  bollardCount: number;
  fireHydrantCount: number;
  utilityBoxCount: number;
  upgradedStreetlightCount: number;
  upgradedTrafficSignalPoleCount: number;
  instancedBatches: number;
}

export interface StreetscapeBuildContext {
  root: THREE.Group;
  layout: CityLayout;
  disposables: Array<{ dispose: () => void }>;
  roadWetnessUniform: { value: number };
  maxAnisotropy?: number;
}

export interface UpgradedStreetlightGeometries {
  poleAssemblyGeo: THREE.BufferGeometry;
  luminaireHeadGeo: THREE.BufferGeometry;
  diffuserLensGeo: THREE.BufferGeometry;
}

export interface UpgradedTrafficSignalAssets {
  createSignalAssembly: (
    isNS: boolean,
    redMat: THREE.MeshStandardMaterial,
    greenMat: THREE.MeshStandardMaterial,
  ) => THREE.Group;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// PURE GEOMETRIC & SPATIAL HELPERS (Tested directly in unit tests)
// ---------------------------------------------------------------------------

/**
 * Distinguishes the 9 square inner-city block sidewalk loops (span ~46m × 46m,
 * x <= 90) from the Ocean Drive boardwalk promenade loop (x = 111..116, z = -86..86)
 * so Phase 2E-2's wooden boardwalk is never overwritten by a duplicate concrete sidewalk.
 */
export function isBlockSidewalkLoop(loop: SidewalkLoop): boolean {
  if (!loop.points || loop.points.length !== 4) return false;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of loop.points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  return spanX >= 36 && spanX <= 56 && spanZ >= 36 && spanZ <= 56 && maxX < 100;
}

export function computeBlockSidewalkBounds(loop: SidewalkLoop): BlockSidewalkBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of loop.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const centerlineHalf = (maxX - minX) * 0.5;
  return {
    centerX,
    centerZ,
    centerlineHalf,
    innerHalf: centerlineHalf - SIDEWALK_WIDTH * 0.5,
    outerHalf: centerlineHalf + SIDEWALK_WIDTH * 0.5,
    topY: SIDEWALK_SLAB_TOP_Y,
  };
}

export function isPointInProtectedRoadOrCrosswalk(
  x: number,
  z: number,
  intersections: readonly IntersectionNode[],
): boolean {
  const halfRoad = ROAD_WIDTH * 0.5 + 0.3;
  for (const inter of intersections) {
    const dx = Math.abs(x - inter.x);
    const dz = Math.abs(z - inter.z);
    if (dx < halfRoad && dz < halfRoad) return true;
    if (dx < halfRoad && dz < PROTECTED_CROSSWALK_BAND) return true;
    if (dz < halfRoad && dx < PROTECTED_CROSSWALK_BAND) return true;
  }
  return false;
}

export function isPointInDrivingRoad(x: number, z: number, margin = 0.25): boolean {
  const half = ROAD_WIDTH * 0.5 + margin;
  for (const rc of ROAD_COORDS) {
    if (Math.abs(x - rc) < half || Math.abs(z - rc) < half) {
      return true;
    }
  }
  return false;
}

export function getStreetNameForRoadCoord(axis: 'ns' | 'ew', coord: number): string {
  if (axis === 'ns') {
    if (coord <= -64) return 'HARBOUR WAY';
    if (coord < 0) return 'VICE BLVD';
    if (coord < 64) return 'BAYFRONT AVE';
    return 'OCEAN DR';
  }
  if (coord <= -64) return 'PALM AVE';
  if (coord < 0) return 'CORAL ST';
  if (coord < 64) return 'NEON MILE';
  return 'MARINA BLVD';
}

/**
 * Returns the visual ground-surface elevation at (x, z) so characters and contact shadows
 * stand cleanly atop raised city sidewalks, sloped curb ramps, road asphalt, and the boardwalk
 * without altering physics coordinates.
 */
export function evaluateStreetscapeGroundY(x: number, z: number): number {
  if (x >= 108.75 && x <= 118.25 && Math.abs(z) <= 112) {
    return 0.11;
  }
  if (x >= 103.25 && x < 108.75) {
    const inCrossStreet = ROAD_COORDS.some((rc) => Math.abs(z - rc) < ROAD_WIDTH * 0.5 + 3.0);
    if (!inCrossStreet && Math.abs(z) <= 86) {
      return SIDEWALK_SLAB_TOP_Y;
    }
  }
  for (const bx of [-64, 0, 64]) {
    const dx = Math.abs(x - bx);
    if (dx > 24.8) continue;
    for (const bz of [-64, 0, 64]) {
      const dz = Math.abs(z - bz);
      if (dz > 24.8) continue;
      if (dx >= 21.22 || dz >= 21.22) {
        const rampStart = 21.25 + SIDEWALK_CORNER_LANDING_SPAN; // 23.60m
        if (dx > rampStart && dz > 21.25) {
          const t = Math.min(1, (dx - rampStart) / (24.75 - rampStart));
          return SIDEWALK_SLAB_TOP_Y + (CURB_RAMP_MIN_Y - SIDEWALK_SLAB_TOP_Y) * t;
        }
        if (dz > rampStart && dx > 21.25) {
          const t = Math.min(1, (dz - rampStart) / (24.75 - rampStart));
          return SIDEWALK_SLAB_TOP_Y + (CURB_RAMP_MIN_Y - SIDEWALK_SLAB_TOP_Y) * t;
        }
        return SIDEWALK_SLAB_TOP_Y;
      }
    }
  }
  if (isPointInDrivingRoad(x, z, 0)) {
    return 0.048;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// GEOMETRY SANITIZATION & MERGING UTILITIES
// ---------------------------------------------------------------------------

export function sanitizeStreetscapeGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.getAttribute('normal')) {
    geo.computeVertexNormals();
  }
  const pos = geo.getAttribute('position');
  const norm = geo.getAttribute('normal');
  if (!geo.getAttribute('uv') && pos) {
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = pos.getX(i) * 0.5 + 0.5;
      uvs[i * 2 + 1] = pos.getZ(i) * 0.5 + 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  if (norm) {
    for (let i = 0; i < norm.count; i++) {
      const x = norm.getX(i);
      const y = norm.getY(i);
      const z = norm.getZ(i);
      const len = Math.hypot(x, y, z);
      if (!Number.isFinite(len) || len < 1e-4) {
        norm.setXYZ(i, 0, 1, 0);
      } else {
        norm.setXYZ(i, x / len, y / len, z / len);
      }
    }
    norm.needsUpdate = true;
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function mergeNormalizedParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) {
      const pos = g.getAttribute('position');
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = pos.getX(i) * 0.5 + 0.5;
        uvs[i * 2 + 1] = pos.getZ(i) * 0.5 + 0.5;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        g.deleteAttribute(key);
      }
    }
    p.dispose();
    return g;
  });
  const merged = mergeGeometries(prepared, false);
  for (const g of prepared) g.dispose();
  if (!merged) {
    throw new Error('Failed to merge normalized streetscape geometries');
  }
  return sanitizeStreetscapeGeometry(merged);
}

// ---------------------------------------------------------------------------
// PROCEDURAL STREETSCAPE TEXTURES (Browser Canvas + Node DataTexture fallback)
// ---------------------------------------------------------------------------

function makeCanvasOrFallback(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  fallbackRgb: [number, number, number, number],
  srgb: boolean,
  aniso: number,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([fallbackRgb[0], fallbackRgb[1], fallbackRgb[2], fallbackRgb[3]]);
    const dt = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    dt.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    dt.wrapS = THREE.RepeatWrapping;
    dt.wrapT = THREE.RepeatWrapping;
    dt.needsUpdate = true;
    return dt;
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, Math.max(1, aniso));
  tex.needsUpdate = true;
  return tex;
}

function createSidewalkPavingTextures(aniso: number) {
  const albedo = makeCanvasOrFallback(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#d3cbc0';
      ctx.fillRect(0, 0, w, h);
      const cols = 4;
      const rows = 4;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hash = ((r * 37 + c * 73) * 2654435761) >>> 0;
          const delta = ((hash % 17) - 8) * 1.4;
          const R = Math.round(211 + delta);
          const G = Math.round(203 + delta);
          const B = Math.round(191 + delta);
          ctx.fillStyle = `rgb(${R},${G},${B})`;
          ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
        }
      }
      // Subtle aggregate grain & coastal limestone wear
      for (let i = 0; i < 4200; i++) {
        const x = (i * 97 + Math.floor(i / 5)) % w;
        const y = (i * 151 + Math.floor(i / 11)) % h;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,252,246,0.09)' : 'rgba(72,66,58,0.08)';
        ctx.fillRect(x, y, 2, 2);
      }
      // Crisp expansion joints
      ctx.strokeStyle = '#9c9388';
      ctx.lineWidth = 3;
      for (let p = 0; p <= w; p += cw) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(w, p);
        ctx.stroke();
      }
    },
    [211, 203, 191, 255],
    true,
    aniso,
  );

  const bump = makeCanvasOrFallback(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = 'rgb(142,142,142)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        const x = (i * 59) % w;
        const y = (i * 107) % h;
        const v = 120 + (i % 48);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.strokeStyle = 'rgb(64,64,64)';
      ctx.lineWidth = 3;
      for (let p = 0; p <= w; p += 64) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(w, p);
        ctx.stroke();
      }
    },
    [142, 142, 142, 255],
    false,
    aniso,
  );

  return { albedo, bump };
}

function createTactileWarningTexture(aniso: number): {
  map: THREE.Texture;
  bump: THREE.Texture;
} {
  const map = makeCanvasOrFallback(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#d49a1a';
      ctx.fillRect(0, 0, w, h);
      const cols = 16;
      const rows = 5;
      const sx = w / cols;
      const sy = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = (c + 0.5) * sx;
          const cy = (r + 0.5) * sy;
          ctx.fillStyle = '#996b0b';
          ctx.beginPath();
          ctx.arc(cx + 1, cy + 1.2, 4.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f2be35';
          ctx.beginPath();
          ctx.arc(cx, cy, 4.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = '#8b6209';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    },
    [224, 170, 32, 255],
    true,
    aniso,
  );

  const bump = makeCanvasOrFallback(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = 'rgb(96,96,96)';
      ctx.fillRect(0, 0, w, h);
      const cols = 16;
      const rows = 5;
      const sx = w / cols;
      const sy = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = (c + 0.5) * sx;
          const cy = (r + 0.5) * sy;
          const grad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, 4.4);
          grad.addColorStop(0, 'rgb(245,245,245)');
          grad.addColorStop(1, 'rgb(96,96,96)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [128, 128, 128, 255],
    false,
    aniso,
  );

  return { map, bump };
}

function createRoadArrowTexture(variant: 'straight' | 'straight_right', aniso: number): THREE.Texture {
  const tex = makeCanvasOrFallback(
    256,
    512,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(232, 237, 243, 0.94)';
      // Main straight shaft & bold chevron head pointing -Y on canvas (-Z in world)
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.06);
      ctx.lineTo(w * 0.78, h * 0.34);
      ctx.lineTo(w * 0.59, h * 0.31);
      ctx.lineTo(w * 0.59, h * 0.90);
      ctx.lineTo(w * 0.41, h * 0.90);
      ctx.lineTo(w * 0.41, h * 0.31);
      ctx.lineTo(w * 0.22, h * 0.34);
      ctx.closePath();
      ctx.fill();

      if (variant === 'straight_right') {
        ctx.beginPath();
        ctx.moveTo(w * 0.56, h * 0.66);
        ctx.quadraticCurveTo(w * 0.73, h * 0.63, w * 0.79, h * 0.49);
        ctx.lineTo(w * 0.90, h * 0.53);
        ctx.lineTo(w * 0.82, h * 0.34);
        ctx.lineTo(w * 0.65, h * 0.45);
        ctx.lineTo(w * 0.73, h * 0.48);
        ctx.quadraticCurveTo(w * 0.66, h * 0.57, w * 0.54, h * 0.57);
        ctx.closePath();
        ctx.fill();
      }

      // Subtle tire-scuff wear cutouts so paint looks worn into asphalt
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 420; i++) {
        const sx = (i * 71) % w;
        const sy = (i * 137) % h;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(sx, sy, 2, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    [232, 237, 243, 255],
    true,
    aniso,
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createStreetSignBladeTexture(label: string, aniso: number): THREE.Texture {
  const tex = makeCanvasOrFallback(
    512,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#0f5c4d';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e6eef2';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w * 0.5, h * 0.52);
    },
    [15, 92, 77, 255],
    true,
    aniso,
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createBusStopSignTexture(aniso: number): THREE.Texture {
  const tex = makeCanvasOrFallback(
    256,
    384,
    (ctx, w, h) => {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 0, w, 128);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 122, w, 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VICE TRANSIT', w * 0.5, 52);
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('BUS STOP', w * 0.5, 96);

      // Stylized bus icon & route lines
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(78, 152, 100, 62);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(88, 162, 36, 24);
      ctx.fillRect(132, 162, 36, 24);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('ROUTE 1 · 12', w * 0.5, 252);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('OCEAN - DOWNTOWN', w * 0.5, 294);
      ctx.fillText('06:00 - 24:00', w * 0.5, 330);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    },
    [241, 245, 249, 255],
    true,
    aniso,
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function attachWetnessResponse(
  material: THREE.MeshStandardMaterial,
  wetnessUniform: { value: number },
  darkenStrength: number,
  wetRoughTarget: number,
  cacheKey: string,
): void {
  material.customProgramCacheKey = () => cacheKey;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadWetness = wetnessUniform;
    shader.fragmentShader =
      `uniform float uRoadWetness;\n` +
      shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         if (uRoadWetness > 0.005) {
           roughnessFactor = mix(roughnessFactor, ${wetRoughTarget.toFixed(3)}, uRoadWetness * 0.78);
           diffuseColor.rgb *= mix(1.0, ${(1.0 - darkenStrength).toFixed(3)}, uRoadWetness);
         }`,
      );
  };
}

// ---------------------------------------------------------------------------
// CUSTOM PROCEDURAL GEOMETRY BUILDERS (All finite + valid unit normals)
// ---------------------------------------------------------------------------

export function createBeveledCurbGeometry(length = 1, width = 0.24, height = 0.108): THREE.BufferGeometry {
  const hw = width * 0.5;
  const bevel = 0.032;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height - bevel);
  shape.lineTo(hw - bevel, height);
  shape.lineTo(-hw + bevel, height);
  shape.lineTo(-hw, height - bevel);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -length * 0.5);
  return sanitizeStreetscapeGeometry(geo);
}

/**
 * Watertight 3.5m × 3.5m corner quadrant pad with an inner level landing
 * (`SIDEWALK_CORNER_LANDING_SPAN` = 2.35m) at `topY` and two flush sloped pedestrian
 * curb ramps + smooth corner apron dropping down to `CURB_RAMP_MIN_Y` at the outer road edges.
 * Oriented in local +X / +Z corner space (rotate by 0, PI/2, PI, -PI/2 for the 4 corners).
 */
export function createCornerRampAssemblyGeometry(
  slabWidth = SIDEWALK_WIDTH,
  landingSpan = SIDEWALK_CORNER_LANDING_SPAN,
  topY = SIDEWALK_SLAB_TOP_Y,
  bottomY = CURB_RAMP_MIN_Y,
): THREE.BufferGeometry {
  const L = landingSpan;
  const S = slabWidth;
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
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(ax * 0.25, az * 0.25, bx * 0.25, bz * 0.25, cx * 0.25, cz * 0.25);
  };

  const pushQuad = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
  ) => {
    pushTri(ax, ay, az, bx, by, bz, cx, cy, cz);
    pushTri(ax, ay, az, cx, cy, cz, dx, dy, dz);
  };

  // 1. Inner flat corner landing [0..L] × [0..L] at topY (normal +Y => CCW from above: A(0,0)->D(0,L)->C(L,L)->B(L,0))
  pushQuad(0, topY, 0, 0, topY, L, L, topY, L, L, topY, 0);

  // 2. +X Ramp (facing east crosswalk): [L..S] × [0..L] sloping from topY at x=L to bottomY at x=S
  pushQuad(L, topY, 0, L, topY, L, S, bottomY, L, S, bottomY, 0);

  // 3. +Z Ramp (facing south crosswalk): [0..L] × [L..S] sloping from topY at z=L to bottomY at z=S
  pushQuad(0, topY, L, 0, bottomY, S, L, bottomY, S, L, topY, L);

  // 4. Outer corner apron [L..S] × [L..S] fan from (L, topY, L) down to outer edges at bottomY
  pushTri(L, topY, L, S, bottomY, S, S, bottomY, L);
  pushTri(L, topY, L, L, bottomY, S, S, bottomY, S);

  // 5. Outer vertical skirts down to y=0 so edges never appear paper-thin
  pushQuad(S, bottomY, 0, S, bottomY, S, S, 0, S, S, 0, 0);
  pushQuad(S, bottomY, S, 0, bottomY, S, 0, 0, S, S, 0, S);

  // Side skirts along x=0 and z=0 where ramp meets straight curb (y=bottomY..topY visible taper)
  pushTri(L, topY, 0, S, bottomY, 0, S, 0, 0);
  pushTri(L, topY, 0, S, 0, 0, L, 0, 0);
  pushTri(0, topY, L, 0, 0, L, 0, 0, S);
  pushTri(0, topY, L, 0, 0, S, 0, bottomY, S);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return sanitizeStreetscapeGeometry(geo);
}

export function createBenchGeometryParts(): {
  slatsGeo: THREE.BufferGeometry;
  frameGeo: THREE.BufferGeometry;
} {
  const slatParts: THREE.BufferGeometry[] = [];
  // 4 ergonomic seat slats
  for (let i = 0; i < 4; i++) {
    const s = new THREE.BoxGeometry(1.74, 0.036, 0.088);
    s.rotateX(-0.04);
    s.translate(0, 0.44 + i * 0.004, -0.14 + i * 0.105);
    slatParts.push(s);
  }
  // 3 tilted backrest slats
  for (let i = 0; i < 3; i++) {
    const b = new THREE.BoxGeometry(1.74, 0.095, 0.036);
    b.rotateX(0.2);
    b.translate(0, 0.60 + i * 0.115, -0.21 - i * 0.022);
    slatParts.push(b);
  }

  const frameParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.74, 0, 0.74]) {
    const legF = new THREE.BoxGeometry(0.055, 0.44, 0.055);
    legF.translate(sx, 0.22, 0.17);
    frameParts.push(legF);

    const legR = new THREE.BoxGeometry(0.055, 0.45, 0.055);
    legR.translate(sx, 0.225, -0.18);
    frameParts.push(legR);

    const seatBar = new THREE.BoxGeometry(0.05, 0.045, 0.42);
    seatBar.translate(sx, 0.42, -0.005);
    frameParts.push(seatBar);

    const backPost = new THREE.BoxGeometry(0.048, 0.5, 0.05);
    backPost.rotateX(0.2);
    backPost.translate(sx, 0.67, -0.22);
    frameParts.push(backPost);

    if (sx !== 0) {
      const armRest = new THREE.BoxGeometry(0.055, 0.035, 0.36);
      armRest.translate(sx, 0.61, 0.01);
      frameParts.push(armRest);

      const armFront = new THREE.BoxGeometry(0.045, 0.19, 0.045);
      armFront.translate(sx, 0.515, 0.16);
      frameParts.push(armFront);
    }
  }
  const crossBrace = new THREE.BoxGeometry(1.48, 0.035, 0.035);
  crossBrace.translate(0, 0.22, -0.02);
  frameParts.push(crossBrace);

  return {
    slatsGeo: mergeNormalizedParts(slatParts),
    frameGeo: mergeNormalizedParts(frameParts),
  };
}

export function createWasteBinGeometryParts(): {
  bodyGeo: THREE.BufferGeometry;
  hoodGeo: THREE.BufferGeometry;
} {
  const bodyParts: THREE.BufferGeometry[] = [];
  const plinth = new THREE.CylinderGeometry(0.25, 0.27, 0.08, 12);
  plinth.translate(0, 0.04, 0);
  bodyParts.push(plinth);

  const drum = new THREE.CylinderGeometry(0.23, 0.22, 0.72, 12);
  drum.translate(0, 0.44, 0);
  bodyParts.push(drum);

  const band = new THREE.CylinderGeometry(0.242, 0.242, 0.05, 12);
  band.translate(0, 0.77, 0);
  bodyParts.push(band);

  const hoodParts: THREE.BufferGeometry[] = [];
  const neck = new THREE.CylinderGeometry(0.2, 0.23, 0.14, 12);
  neck.translate(0, 0.86, 0);
  hoodParts.push(neck);

  const cap = new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  cap.scale(1, 0.62, 1);
  cap.translate(0, 0.92, 0);
  hoodParts.push(cap);

  return {
    bodyGeo: mergeNormalizedParts(bodyParts),
    hoodGeo: mergeNormalizedParts(hoodParts),
  };
}

export function createFireHydrantGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.18, 0),
    new THREE.Vector2(0.18, 0.06),
    new THREE.Vector2(0.13, 0.08),
    new THREE.Vector2(0.125, 0.52),
    new THREE.Vector2(0.155, 0.55),
    new THREE.Vector2(0.155, 0.59),
    new THREE.Vector2(0.13, 0.62),
    new THREE.Vector2(0.08, 0.72),
    new THREE.Vector2(0.045, 0.74),
    new THREE.Vector2(0.045, 0.8),
    new THREE.Vector2(0, 0.81),
  ];
  parts.push(new THREE.LatheGeometry(profile, 14));

  const nozzleSide = new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10);
  nozzleSide.rotateZ(Math.PI / 2);
  nozzleSide.translate(0, 0.44, 0);
  parts.push(nozzleSide);

  const mainPort = new THREE.CylinderGeometry(0.062, 0.062, 0.16, 10);
  mainPort.rotateX(Math.PI / 2);
  mainPort.translate(0, 0.42, 0.11);
  parts.push(mainPort);

  return mergeNormalizedParts(parts);
}

export function createBollardGeometry(): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.135, 0),
    new THREE.Vector2(0.135, 0.05),
    new THREE.Vector2(0.105, 0.07),
    new THREE.Vector2(0.1, 0.7),
    new THREE.Vector2(0.09, 0.72),
    new THREE.Vector2(0.1, 0.75),
    new THREE.Vector2(0.098, 0.84),
    new THREE.Vector2(0.075, 0.89),
    new THREE.Vector2(0, 0.91),
  ];
  return sanitizeStreetscapeGeometry(new THREE.LatheGeometry(profile, 12));
}

export function createUpgradedStreetlightGeometries(): UpgradedStreetlightGeometries {
  // 1. Flanged octagonal base + tapered mast + collar + curved bracket arm
  const poleParts: THREE.BufferGeometry[] = [];
  const plinth = new THREE.CylinderGeometry(0.24, 0.29, 0.24, 8);
  plinth.translate(0, 0.12, 0);
  poleParts.push(plinth);

  const collar = new THREE.CylinderGeometry(0.17, 0.23, 0.36, 10);
  collar.translate(0, 0.42, 0);
  poleParts.push(collar);

  const shaft = new THREE.CylinderGeometry(0.095, 0.145, 6.45, 10);
  shaft.translate(0, 3.82, 0);
  poleParts.push(shaft);

  const capFinial = new THREE.CylinderGeometry(0.05, 0.11, 0.2, 10);
  capFinial.translate(0, 7.12, 0);
  poleParts.push(capFinial);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 6.55, 0.06),
    new THREE.Vector3(0, 6.95, 0.72),
    new THREE.Vector3(0, 7.18, 1.48),
    new THREE.Vector3(0, 7.18, 2.02),
  ]);
  const armTube = new THREE.TubeGeometry(armCurve, 10, 0.058, 8, false);
  poleParts.push(armTube);

  const brace = new THREE.CylinderGeometry(0.028, 0.028, 0.92, 6);
  brace.rotateX(Math.PI * 0.27);
  brace.translate(0, 6.52, 0.44);
  poleParts.push(brace);

  // 2. Aerodynamic die-cast LED cobra-head housing
  const headParts: THREE.BufferGeometry[] = [];
  const headMain = new THREE.BoxGeometry(0.46, 0.14, 0.88);
  headMain.translate(0, 7.16, 2.04);
  headParts.push(headMain);

  const headCrown = new THREE.CylinderGeometry(0.2, 0.24, 0.82, 8);
  headCrown.rotateX(Math.PI / 2);
  headCrown.scale(1, 0.32, 1);
  headCrown.translate(0, 7.23, 2.04);
  headParts.push(headCrown);

  // 3. Recessed warm-white LED diffuser panel (uses world.streetlightBulbMaterial)
  const diffuserLensGeo = sanitizeStreetscapeGeometry(
    new THREE.BoxGeometry(0.34, 0.06, 0.62).translate(0, 7.07, 2.08),
  );

  return {
    poleAssemblyGeo: mergeNormalizedParts(poleParts),
    luminaireHeadGeo: mergeNormalizedParts(headParts),
    diffuserLensGeo,
  };
}

export function createUpgradedTrafficSignalAssets(
  poleMat: THREE.MeshStandardMaterial,
  darkMetalMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>,
): UpgradedTrafficSignalAssets {
  const mastBaseGeo = sanitizeStreetscapeGeometry(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 10).translate(0, 0.16, 0));
  const mastShaftGeo = sanitizeStreetscapeGeometry(new THREE.CylinderGeometry(0.11, 0.16, 5.65, 10).translate(0, 3.12, 0));
  const mastArmGeo = sanitizeStreetscapeGeometry(new THREE.CylinderGeometry(0.07, 0.095, 5.2, 8));
  const signalBoxGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(0.46, 1.48, 0.38));
  const backplateGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(0.62, 1.64, 0.06));
  const visorGeo = sanitizeStreetscapeGeometry(
    new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10, 1, true, -Math.PI * 0.65, Math.PI * 1.3),
  );
  const lampGeo = sanitizeStreetscapeGeometry(new THREE.SphereGeometry(0.13, 10, 10));
  const pedBoxGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(0.36, 0.44, 0.24));
  const pedFaceGeo = sanitizeStreetscapeGeometry(new THREE.PlaneGeometry(0.24, 0.3));

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0x3b2406,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
    roughness: 0.3,
  });
  const pedSignalMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xfff7ed,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });

  disposables.push(
    mastBaseGeo,
    mastShaftGeo,
    mastArmGeo,
    signalBoxGeo,
    backplateGeo,
    visorGeo,
    lampGeo,
    pedBoxGeo,
    pedFaceGeo,
    amberMat,
    pedSignalMat,
  );

  const buildSignalHead = (
    redMat: THREE.MeshStandardMaterial,
    greenMat: THREE.MeshStandardMaterial,
  ): THREE.Group => {
    const head = new THREE.Group();
    const box = new THREE.Mesh(signalBoxGeo, darkMetalMat);
    const backplate = new THREE.Mesh(backplateGeo, darkMetalMat);
    backplate.position.z = -0.18;
    head.add(box, backplate);

    const aspects: Array<[number, THREE.MeshStandardMaterial]> = [
      [0.44, redMat],
      [0.0, amberMat],
      [-0.44, greenMat],
    ];
    for (const [ly, mat] of aspects) {
      const lamp = new THREE.Mesh(lampGeo, mat);
      lamp.position.set(0, ly, 0.17);
      head.add(lamp);

      const visor = new THREE.Mesh(visorGeo, darkMetalMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, ly + 0.04, 0.24);
      head.add(visor);
    }
    return head;
  };

  const createSignalAssembly = (
    isNS: boolean,
    redMat: THREE.MeshStandardMaterial,
    greenMat: THREE.MeshStandardMaterial,
  ): THREE.Group => {
    const post = new THREE.Group();
    const base = new THREE.Mesh(mastBaseGeo, poleMat);
    const shaft = new THREE.Mesh(mastShaftGeo, poleMat);
    post.add(base, shaft);

    // Overhead cantilever mast arm reaching out over approaching lanes
    const arm = new THREE.Mesh(mastArmGeo, poleMat);
    arm.position.y = 5.65;
    if (isNS) {
      // Corner is (+8.4, +8.4) -> arm extends -X over northbound lanes
      arm.rotation.z = Math.PI / 2;
      arm.position.x = -2.6;
    } else {
      // Corner is (-8.4, -8.4) -> arm extends +Z over eastbound lanes
      arm.rotation.x = Math.PI / 2;
      arm.position.z = 2.6;
    }
    post.add(arm);

    // Overhead primary 3-aspect signal head + secondary post-mounted signal head
    const overheadHead = buildSignalHead(redMat, greenMat);
    const poleHead = buildSignalHead(redMat, greenMat);
    poleHead.scale.setScalar(0.84);

    if (isNS) {
      overheadHead.position.set(-4.3, 5.55, 0);
      poleHead.position.set(0, 3.85, 0.22);
    } else {
      overheadHead.rotation.y = -Math.PI / 2;
      overheadHead.position.set(0, 5.55, 4.3);
      poleHead.rotation.y = -Math.PI / 2;
      poleHead.position.set(-0.22, 3.85, 0);
    }
    post.add(overheadHead, poleHead);

    // Pedestrian crosswalk signal housing on pole
    const pedBox = new THREE.Mesh(pedBoxGeo, darkMetalMat);
    pedBox.position.set(isNS ? -0.24 : 0, 2.35, isNS ? 0 : 0.24);
    if (!isNS) pedBox.rotation.y = -Math.PI / 2;
    const pedFace = new THREE.Mesh(pedFaceGeo, pedSignalMat);
    pedFace.position.z = 0.125;
    pedBox.add(pedFace);
    post.add(pedBox);

    return post;
  };

  return {
    createSignalAssembly,
    dispose: () => {
      // Geometries & materials are pushed onto disposables
    },
  };
}

// ---------------------------------------------------------------------------
// MAIN STREETSCAPE BUILDER
// ---------------------------------------------------------------------------

interface PlacementBlocker {
  x: number;
  z: number;
  radiusSq: number;
}

export function buildStreetscapeAssets(
  ctx: StreetscapeBuildContext,
): { stats: StreetscapeStats; streetlightGeos: UpgradedStreetlightGeometries } {
  const { root, layout, disposables, roadWetnessUniform } = ctx;
  const aniso = ctx.maxAnisotropy ?? 4;
  const rng = createSeededRng(20260203);

  const streetGroup = new THREE.Group();
  streetGroup.name = 'streetscape_assets_root';
  root.add(streetGroup);

  let instancedBatches = 0;
  const addInstancedBatch = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    matrices: THREE.Matrix4[],
    colors?: THREE.Color[],
    options?: { castShadow?: boolean; receiveShadow?: boolean },
  ): THREE.InstancedMesh | null => {
    if (matrices.length === 0) return null;
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    inst.name = name;
    for (let i = 0; i < matrices.length; i++) {
      inst.setMatrixAt(i, matrices[i]);
      if (colors && colors[i]) {
        inst.setColorAt(i, colors[i]);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = options?.castShadow ?? false;
    inst.receiveShadow = options?.receiveShadow ?? true;
    inst.computeBoundingSphere();
    disposables.push(inst);
    streetGroup.add(inst);
    instancedBatches++;
    return inst;
  };

  // Shared materials & textures
  const { albedo: sidewalkAlbedo, bump: sidewalkBump } = createSidewalkPavingTextures(aniso);
  const { map: tactileMap, bump: tactileBump } = createTactileWarningTexture(aniso);
  const straightArrowTex = createRoadArrowTexture('straight', aniso);
  const straightTurnArrowTex = createRoadArrowTexture('straight_right', aniso);
  const busStopTex = createBusStopSignTexture(aniso);
  disposables.push(sidewalkAlbedo, sidewalkBump, tactileMap, tactileBump, straightArrowTex, straightTurnArrowTex, busStopTex);

  const sidewalkConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sidewalkAlbedo,
    bumpMap: sidewalkBump,
    bumpScale: 0.02,
    roughness: 0.84,
    metalness: 0.03,
  });
  attachWetnessResponse(sidewalkConcreteMat, roadWetnessUniform, 0.16, 0.36, 'streetscape_wet_sidewalk_v1');

  const curbConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xc2bab0,
    bumpMap: sidewalkBump,
    bumpScale: 0.015,
    roughness: 0.82,
    metalness: 0.04,
  });
  attachWetnessResponse(curbConcreteMat, roadWetnessUniform, 0.18, 0.34, 'streetscape_wet_curb_v1');

  const tactileMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tactileMap,
    bumpMap: tactileBump,
    bumpScale: 0.035,
    roughness: 0.72,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const drainIronMat = new THREE.MeshStandardMaterial({
    color: 0x2a313c,
    roughness: 0.62,
    metalness: 0.68,
  });

  const roadPaintMat = new THREE.MeshStandardMaterial({
    color: 0xe8edf3,
    roughness: 0.64,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  attachWetnessResponse(roadPaintMat, roadWetnessUniform, 0.1, 0.28, 'streetscape_wet_paint_v1');

  const arrowStraightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: straightArrowTex,
    transparent: true,
    alphaTest: 0.25,
    roughness: 0.64,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  attachWetnessResponse(arrowStraightMat, roadWetnessUniform, 0.1, 0.28, 'streetscape_wet_arrow_s_v1');

  const arrowTurnMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: straightTurnArrowTex,
    transparent: true,
    alphaTest: 0.25,
    roughness: 0.64,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  attachWetnessResponse(arrowTurnMat, roadWetnessUniform, 0.1, 0.28, 'streetscape_wet_arrow_t_v1');

  const benchWoodMat = new THREE.MeshStandardMaterial({
    color: 0x9b643b,
    roughness: 0.74,
    metalness: 0.04,
  });
  const furnitureDarkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x26313f,
    roughness: 0.42,
    metalness: 0.72,
  });
  const binBodyMat = new THREE.MeshStandardMaterial({
    color: 0x36414f,
    roughness: 0.48,
    metalness: 0.56,
  });
  const binHoodMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.34,
    metalness: 0.78,
  });
  const hydrantMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.38,
    metalness: 0.45,
  });
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.65,
  });
  const utilityBoxMat = new THREE.MeshStandardMaterial({
    color: 0x5c6760,
    roughness: 0.66,
    metalness: 0.28,
  });
  const signPostMat = new THREE.MeshStandardMaterial({
    color: 0x7b8794,
    roughness: 0.35,
    metalness: 0.78,
  });
  const busSignFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: busStopTex,
    roughness: 0.45,
    metalness: 0.08,
  });

  disposables.push(
    sidewalkConcreteMat,
    curbConcreteMat,
    tactileMat,
    drainIronMat,
    roadPaintMat,
    arrowStraightMat,
    arrowTurnMat,
    benchWoodMat,
    furnitureDarkMetalMat,
    binBodyMat,
    binHoodMat,
    hydrantMat,
    bollardMat,
    utilityBoxMat,
    signPostMat,
    busSignFaceMat,
  );

  // -------------------------------------------------------------------------
  // 1. RAISED BLOCK SIDEWALKS, CURBS, GUTTERS & 72 CURB RAMPS (9 blocks only!)
  // -------------------------------------------------------------------------
  const blockBoundsList: BlockSidewalkBounds[] = [];
  let skippedNonBlockLoopCount = 0;

  for (const loop of layout.sidewalkLoops) {
    if (isBlockSidewalkLoop(loop)) {
      blockBoundsList.push(computeBlockSidewalkBounds(loop));
    } else {
      skippedNonBlockLoopCount++;
    }
  }

  // Sidewalk straight edge length spans exactly between corner quadrants [-innerHalf, +innerHalf]
  const dummy = new THREE.Object3D();
  const sampleBounds = blockBoundsList[0];
  const straightLen = sampleBounds ? sampleBounds.innerHalf * 2 : 42.5; // 42.5m
  const slabGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(straightLen, SIDEWALK_SLAB_TOP_Y, SIDEWALK_WIDTH));
  // Tile paving UVs evenly along the 42.5m × 3.5m slab
  const slabUv = slabGeo.getAttribute('uv');
  const slabPos = slabGeo.getAttribute('position');
  for (let i = 0; i < slabUv.count; i++) {
    slabUv.setXY(i, (slabPos.getX(i) + straightLen * 0.5) * 0.25, (slabPos.getZ(i) + SIDEWALK_WIDTH * 0.5) * 0.25);
  }
  slabUv.needsUpdate = true;

  const curbGeo = createBeveledCurbGeometry(straightLen, SIDEWALK_CURB_WIDTH, SIDEWALK_CURB_TOP_Y);
  const cornerRampGeo = createCornerRampAssemblyGeometry(
    SIDEWALK_WIDTH,
    SIDEWALK_CORNER_LANDING_SPAN,
    SIDEWALK_SLAB_TOP_Y,
    CURB_RAMP_MIN_Y,
  );
  const tactileStripGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(1.56, 0.012, 0.48));
  const drainGrateGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(0.92, 0.022, 0.4));
  const eastPromGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(5.5, SIDEWALK_SLAB_TOP_Y, 42.5));
  const eastPromUv = eastPromGeo.getAttribute('uv');
  const eastPromPos = eastPromGeo.getAttribute('position');
  for (let i = 0; i < eastPromUv.count; i++) {
    eastPromUv.setXY(i, (eastPromPos.getX(i) + 2.75) * 0.25, (eastPromPos.getZ(i) + 21.25) * 0.25);
  }
  eastPromUv.needsUpdate = true;
  disposables.push(slabGeo, curbGeo, cornerRampGeo, tactileStripGeo, drainGrateGeo, eastPromGeo);

  const slabMatrices: THREE.Matrix4[] = [];
  const slabColors: THREE.Color[] = [];
  const curbMatrices: THREE.Matrix4[] = [];
  const cornerRampMatrices: THREE.Matrix4[] = [];
  const tactileMatrices: THREE.Matrix4[] = [];
  const drainGrateMatrices: THREE.Matrix4[] = [];

  const blockDistrictTint = (bx: number, bz: number): THREE.Color => {
    const d = getDistrictAt(bx, bz);
    if (d === DistrictId.OceanDrive) return new THREE.Color(0xf6eee3);
    if (d === DistrictId.Downtown) return new THREE.Color(0xe6eaee);
    if (d === DistrictId.Entertainment) return new THREE.Color(0xeae6ef);
    if (d === DistrictId.Harbour) return new THREE.Color(0xdad4cb);
    return new THREE.Color(0xefe9de); // Coral Heights warm stone
  };

  for (const b of blockBoundsList) {
    const tint = blockDistrictTint(b.centerX, b.centerZ);
    const midOff = b.centerlineHalf; // 23.0m
    const curbOff = b.outerHalf - SIDEWALK_CURB_WIDTH * 0.5; // 24.63m

    // 4 straight sidewalk slabs + 4 outer raised curbs (never crossing corner crosswalk ramps!)
    const sideSpecs: Array<[number, number, number, number, number]> = [
      [b.centerX, b.centerZ - midOff, 0, b.centerX, b.centerZ - curbOff], // North
      [b.centerX, b.centerZ + midOff, 0, b.centerX, b.centerZ + curbOff], // South
      [b.centerX - midOff, b.centerZ, Math.PI / 2, b.centerX - curbOff, b.centerZ], // West
      [b.centerX + midOff, b.centerZ, Math.PI / 2, b.centerX + curbOff, b.centerZ], // East
    ];

    for (const [sx, sz, rotY, cx, cz] of sideSpecs) {
      dummy.position.set(sx, SIDEWALK_SLAB_TOP_Y * 0.5, sz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      slabMatrices.push(dummy.matrix.clone());
      slabColors.push(tint);

      dummy.position.set(cx, 0, cz);
      // ExtrudeGeometry depth runs along Z, so N/S curbs rotate Y by PI/2 to run along X
      dummy.rotation.set(0, rotY === 0 ? Math.PI / 2 : 0, 0);
      dummy.updateMatrix();
      curbMatrices.push(dummy.matrix.clone());
    }

    // 2 storm-drain gutter grates per block cleanly tucked at outer gutter edge (just inside road gutter)
    const gutterOut = b.outerHalf + 0.14;
    for (const [gx, gz, gRot] of [
      [b.centerX - 15.5, b.centerZ + gutterOut, 0],
      [b.centerX + gutterOut, b.centerZ - 15.5, Math.PI / 2],
    ]) {
      dummy.position.set(gx, 0.044, gz);
      dummy.rotation.set(0, gRot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      drainGrateMatrices.push(dummy.matrix.clone());
    }

    // 4 corner landing + dual crosswalk curb-ramp quadrants (36 corners -> 72 ramps & tactile pads)
    const cornerConfigs: Array<{ sx: -1 | 1; sz: -1 | 1; rotY: number }> = [
      { sx: 1, sz: 1, rotY: 0 }, // SE corner (+X, +Z)
      { sx: 1, sz: -1, rotY: Math.PI * 0.5 }, // NE corner (+X, -Z)
      { sx: -1, sz: -1, rotY: Math.PI }, // NW corner (-X, -Z)
      { sx: -1, sz: 1, rotY: -Math.PI * 0.5 }, // SW corner (-X, +Z)
    ];

    for (const { sx, sz, rotY } of cornerConfigs) {
      const originX = b.centerX + sx * b.innerHalf;
      const originZ = b.centerZ + sz * b.innerHalf;

      dummy.position.set(originX, 0, originZ);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cornerRampMatrices.push(dummy.matrix.clone());

      // Two tactile warning pads placed cleanly along each crosswalk ramp throat, leaving the corner landing open for signal poles
      const throatDist = SIDEWALK_CORNER_LANDING_SPAN - 0.14;
      const midRampAxis = SIDEWALK_CORNER_LANDING_SPAN * 0.42;

      // X-facing ramp throat
      dummy.position.set(
        originX + sx * throatDist,
        SIDEWALK_SLAB_TOP_Y + 0.005,
        originZ + sz * midRampAxis,
      );
      dummy.rotation.set(0, Math.PI * 0.5, 0);
      dummy.updateMatrix();
      tactileMatrices.push(dummy.matrix.clone());

      // Z-facing ramp throat
      dummy.position.set(
        originX + sx * midRampAxis,
        SIDEWALK_SLAB_TOP_Y + 0.005,
        originZ + sz * throatDist,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      tactileMatrices.push(dummy.matrix.clone());
    }
  }

  // Ocean Drive East Promenade Curb Strip (x = 103.25..108.75, strictly west of boardwalk x >= 108.75, between cross-streets)
  const eastPromMatrices: THREE.Matrix4[] = [];
  const eastPromColors: THREE.Color[] = [];
  for (const segZ of [-64, 0, 64]) {
    dummy.position.set(106.0, SIDEWALK_SLAB_TOP_Y * 0.5, segZ);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    eastPromMatrices.push(dummy.matrix.clone());
    eastPromColors.push(new THREE.Color(0xf6eee3));

    dummy.position.set(103.37, 0, segZ);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    curbMatrices.push(dummy.matrix.clone());
  }

  addInstancedBatch('streetscape_inst_sidewalk_slabs', slabGeo, sidewalkConcreteMat, slabMatrices, slabColors);
  addInstancedBatch('streetscape_inst_east_promenade', eastPromGeo, sidewalkConcreteMat, eastPromMatrices, eastPromColors);
  addInstancedBatch('streetscape_inst_curbs', curbGeo, curbConcreteMat, curbMatrices);
  addInstancedBatch('streetscape_inst_corner_ramps', cornerRampGeo, curbConcreteMat, cornerRampMatrices);
  addInstancedBatch('streetscape_inst_tactile_paving', tactileStripGeo, tactileMat, tactileMatrices);
  addInstancedBatch('streetscape_inst_drain_grates', drainGrateGeo, drainIronMat, drainGrateMatrices);

  // -------------------------------------------------------------------------
  // 2. ROAD MARKINGS (Stop bars, dashed lane guides, directional arrows, manholes)
  // Strictly aligned to trafficSystem.ts right-hand driving & outside intersections/crosswalks
  // -------------------------------------------------------------------------
  const stopBarGeo = sanitizeStreetscapeGeometry(new THREE.PlaneGeometry(5.3, 0.46).rotateX(-Math.PI / 2));
  const laneDashGeo = sanitizeStreetscapeGeometry(new THREE.PlaneGeometry(0.14, 2.2).rotateX(-Math.PI / 2));
  const arrowGeo = sanitizeStreetscapeGeometry(new THREE.PlaneGeometry(1.35, 3.2).rotateX(-Math.PI / 2));
  const manholeGeo = sanitizeStreetscapeGeometry(new THREE.CylinderGeometry(0.42, 0.42, 0.018, 16));
  disposables.push(stopBarGeo, laneDashGeo, arrowGeo, manholeGeo);

  const stopBarMatrices: THREE.Matrix4[] = [];
  const laneDashMatrices: THREE.Matrix4[] = [];
  const straightArrowMatrices: THREE.Matrix4[] = [];
  const turnArrowMatrices: THREE.Matrix4[] = [];
  const manholeMatrices: THREE.Matrix4[] = [];

  for (const inter of layout.intersections) {
    // Northbound NS lane (x = rx + 3.2, approaching from +Z, heading -Z -> rotY = 0)
    const nbStopZ = inter.z + 10.75;
    if (nbStopZ <= 110 && !isPointInProtectedRoadOrCrosswalk(inter.x + ROAD_LANE_OFFSET, nbStopZ, layout.intersections)) {
      dummy.position.set(inter.x + ROAD_LANE_OFFSET, 0.068, nbStopZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stopBarMatrices.push(dummy.matrix.clone());

      const nbArrZ = inter.z + 15.1;
      if (nbArrZ <= 109 && inter.z < 96) {
        dummy.position.set(inter.x + ROAD_LANE_OFFSET, 0.068, nbArrZ);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        (inter.gridX === 2 && inter.gridZ === 2 ? turnArrowMatrices : straightArrowMatrices).push(dummy.matrix.clone());
      }
    }

    // Southbound NS lane (x = rx - 3.2, approaching from -Z, heading +Z -> rotY = PI)
    const sbStopZ = inter.z - 10.75;
    if (sbStopZ >= -110 && !isPointInProtectedRoadOrCrosswalk(inter.x - ROAD_LANE_OFFSET, sbStopZ, layout.intersections)) {
      dummy.position.set(inter.x - ROAD_LANE_OFFSET, 0.068, sbStopZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stopBarMatrices.push(dummy.matrix.clone());

      const sbArrZ = inter.z - 15.1;
      if (sbArrZ >= -109 && inter.z > -96) {
        dummy.position.set(inter.x - ROAD_LANE_OFFSET, 0.068, sbArrZ);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        (inter.gridX === 1 && inter.gridZ === 1 ? turnArrowMatrices : straightArrowMatrices).push(dummy.matrix.clone());
      }
    }

    // Eastbound EW lane (z = rz + 3.2, approaching from -X, heading +X -> rotY = -PI/2)
    const ebStopX = inter.x - 10.75;
    if (ebStopX >= -110 && !isPointInProtectedRoadOrCrosswalk(ebStopX, inter.z + ROAD_LANE_OFFSET, layout.intersections)) {
      dummy.position.set(ebStopX, 0.07, inter.z + ROAD_LANE_OFFSET);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stopBarMatrices.push(dummy.matrix.clone());

      const ebArrX = inter.x - 15.1;
      if (ebArrX >= -109 && inter.x > -96) {
        dummy.position.set(ebArrX, 0.07, inter.z + ROAD_LANE_OFFSET);
        dummy.rotation.set(0, -Math.PI / 2, 0);
        dummy.updateMatrix();
        (inter.gridX === 2 && inter.gridZ === 2 ? turnArrowMatrices : straightArrowMatrices).push(dummy.matrix.clone());
      }
    }

    // Westbound EW lane (z = rz - 3.2, approaching from +X, heading -X -> rotY = +PI/2)
    // Skip x > 103 east of Ocean Drive where boardwalk sits at x=108.75
    const wbStopX = inter.x + 10.75;
    if (wbStopX <= 103 && !isPointInProtectedRoadOrCrosswalk(wbStopX, inter.z - ROAD_LANE_OFFSET, layout.intersections)) {
      dummy.position.set(wbStopX, 0.07, inter.z - ROAD_LANE_OFFSET);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stopBarMatrices.push(dummy.matrix.clone());

      const wbArrX = inter.x + 15.1;
      if (wbArrX <= 102 && inter.x < 96) {
        dummy.position.set(wbArrX, 0.07, inter.z - ROAD_LANE_OFFSET);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        (inter.gridX === 1 && inter.gridZ === 2 ? turnArrowMatrices : straightArrowMatrices).push(dummy.matrix.clone());
      }
    }
  }

  // Mid-block dashed bicycle/shoulder lane guide dashes & manhole covers between intersections
  const segmentCenters = [-64, 0, 64];
  const dashOffsets = [-16, -10.5, -5, 5, 10.5, 16];
  for (const rx of ROAD_COORDS) {
    for (const segZ of segmentCenters) {
      for (const dz of dashOffsets) {
        const z = segZ + dz;
        if (isPointInProtectedRoadOrCrosswalk(rx, z, layout.intersections)) continue;
        for (const side of [-5.25, 5.25]) {
          dummy.position.set(rx + side, 0.064, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          laneDashMatrices.push(dummy.matrix.clone());
        }
      }
      // Subtle manhole cover on NS avenue segment
      const mhX = rx + (segZ === 0 ? -2.2 : 2.3);
      const mhZ = segZ + (rx > 0 ? 7.5 : -7.5);
      if (!isPointInProtectedRoadOrCrosswalk(mhX, mhZ, layout.intersections)) {
        dummy.position.set(mhX, 0.048, mhZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        manholeMatrices.push(dummy.matrix.clone());
      }
    }
  }
  for (const rz of ROAD_COORDS) {
    for (const segX of segmentCenters) {
      for (const dx of dashOffsets) {
        const x = segX + dx;
        if (isPointInProtectedRoadOrCrosswalk(x, rz, layout.intersections)) continue;
        for (const side of [-5.25, 5.25]) {
          dummy.position.set(x, 0.066, rz + side);
          dummy.rotation.set(0, Math.PI / 2, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          laneDashMatrices.push(dummy.matrix.clone());
        }
      }
    }
  }

  addInstancedBatch('streetscape_inst_stop_bars', stopBarGeo, roadPaintMat, stopBarMatrices, undefined, {
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_lane_dashes', laneDashGeo, roadPaintMat, laneDashMatrices, undefined, {
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_arrows_straight', arrowGeo, arrowStraightMat, straightArrowMatrices, undefined, {
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_arrows_turn', arrowGeo, arrowTurnMat, turnArrowMatrices, undefined, {
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_manholes', manholeGeo, drainIronMat, manholeMatrices, undefined, {
    receiveShadow: true,
  });

  // -------------------------------------------------------------------------
  // 3. DETERMINISTIC, COLLISION-SAFE, DISTRICT-SENSITIVE STREET FURNITURE
  // -------------------------------------------------------------------------
  const blockers: PlacementBlocker[] = [];
  for (const t of layout.trees) {
    blockers.push({ x: t.x, z: t.z, radiusSq: 1.85 * 1.85 });
  }
  for (const sl of layout.streetlights) {
    blockers.push({ x: sl.x, z: sl.z, radiusSq: 1.75 * 1.75 });
  }
  // 4 central traffic signal corner poles
  for (const inter of layout.intersections) {
    if ((inter.gridX === 1 || inter.gridX === 2) && (inter.gridZ === 1 || inter.gridZ === 2)) {
      blockers.push({ x: inter.x + 8.4, z: inter.z + 8.4, radiusSq: 2.1 * 2.1 });
      blockers.push({ x: inter.x - 8.4, z: inter.z - 8.4, radiusSq: 2.1 * 2.1 });
    }
  }
  // Keep starter spawn vista & initial vehicle entry wide open
  blockers.push({ x: layout.playerSpawn.x, z: layout.playerSpawn.z, radiusSq: 6.5 * 6.5 });
  blockers.push({ x: 90.4, z: 46.5, radiusSq: 5.5 * 5.5 });
  // Keep park fountain clear
  blockers.push({ x: layout.parkCenter.x, z: layout.parkCenter.z + 8, radiusSq: 5.5 * 5.5 });

  const placedProps: Array<{ x: number; z: number; minDist: number }> = [];

  const isSpotSafe = (x: number, z: number, minSelfDist = 2.6): boolean => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    if (x >= 103 || x <= -91 || z >= 91 || z <= -91) return false;
    if (isPointInDrivingRoad(x, z, 0.3)) return false;
    if (isPointInProtectedRoadOrCrosswalk(x, z, layout.intersections)) return false;

    // Protect all corner ramp / crosswalk zones
    for (const inter of layout.intersections) {
      if (Math.abs(x - inter.x) < 11.4 && Math.abs(z - inter.z) < 11.4) {
        return false;
      }
    }

    // Never clip inside buildings (with 0.95m facade margin)
    for (const col of layout.colliders) {
      if (
        x >= col.minX - 0.95 &&
        x <= col.maxX + 0.95 &&
        z >= col.minZ - 0.95 &&
        z <= col.maxZ + 0.95
      ) {
        return false;
      }
    }

    // Never collide with palms, park trees, streetlights, traffic signals, or player spawn
    for (const b of blockers) {
      if (distSq2D(x, z, b.x, b.z) < b.radiusSq) {
        return false;
      }
    }

    // Never collide with other placed street furniture
    for (const p of placedProps) {
      const req = Math.max(minSelfDist, p.minDist);
      if (distSq2D(x, z, p.x, p.z) < req * req) {
        return false;
      }
    }
    return true;
  };

  const reservePropSpot = (x: number, z: number, minDist = 2.6) => {
    placedProps.push({ x, z, minDist });
  };

  const benchSlatMatrices: THREE.Matrix4[] = [];
  const benchFrameMatrices: THREE.Matrix4[] = [];
  const binBodyMatrices: THREE.Matrix4[] = [];
  const binHoodMatrices: THREE.Matrix4[] = [];
  const hydrantMatrices: THREE.Matrix4[] = [];
  const bollardMatrices: THREE.Matrix4[] = [];
  const bollardColors: THREE.Color[] = [];
  const utilityBoxMatrices: THREE.Matrix4[] = [];
  const signPostMatrices: THREE.Matrix4[] = [];
  const busPostMatrices: THREE.Matrix4[] = [];
  const busFaceMatrices: THREE.Matrix4[] = [];

  // Map road street-name -> blade transforms (one InstancedMesh per street name!)
  const signBladeTransforms = new Map<string, THREE.Matrix4[]>();
  const pushSignBlade = (name: string, m: THREE.Matrix4) => {
    let arr = signBladeTransforms.get(name);
    if (!arr) {
      arr = [];
      signBladeTransforms.set(name, arr);
    }
    arr.push(m);
  };

  // A. Street-name signposts at selected block corners (set back slightly from ramp throat so unobstructed)
  for (const inter of layout.intersections) {
    // Place on 12 clear inner corners across the 4x4 intersection grid (keep spawn corner clean)
    if (inter.gridX === 3 && inter.gridZ === 2) continue; // right by spawn vista
    if ((inter.gridX + inter.gridZ) % 2 !== 0 && inter.gridX !== 2 && inter.gridZ !== 1) continue;

    // Pick corner quadrant inside valid [-89..+89] block perimeter
    const sx = inter.gridX === 3 ? -1 : 1;
    const sz = inter.gridZ === 3 ? -1 : 1;
    const postX = inter.x + sx * 8.15;
    const postZ = inter.z + sz * 12.15; // Back along outer sidewalk strip, well clear of crosswalk ramp!

    if (
      postX > -90 &&
      postX < 90 &&
      postZ > -90 &&
      postZ < 90 &&
      !isPointInDrivingRoad(postX, postZ, 0.4) &&
      blockers.every((b) => distSq2D(postX, postZ, b.x, b.z) >= 2.2 * 2.2)
    ) {
      dummy.position.set(postX, SIDEWALK_SLAB_TOP_Y, postZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      signPostMatrices.push(dummy.matrix.clone());
      reservePropSpot(postX, postZ, 1.8);

      const nsName = getStreetNameForRoadCoord('ns', inter.x);
      const ewName = getStreetNameForRoadCoord('ew', inter.z);

      // NS street blade oriented along Z axis (readable from E/W)
      dummy.position.set(postX, SIDEWALK_SLAB_TOP_Y + 3.05, postZ);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      pushSignBlade(nsName, dummy.matrix.clone());

      // EW street blade oriented along X axis (readable from N/S)
      dummy.position.set(postX, SIDEWALK_SLAB_TOP_Y + 2.76, postZ);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      pushSignBlade(ewName, dummy.matrix.clone());
    }
  }

  // B. Curated decorative Bus Stop Signposts (8 stops spanning all districts, tucked at outer strip 24.18m)
  const busStopCandidates: Array<{ x: number; z: number; rotY: number }> = [
    { x: 24.18, z: -58, rotY: -Math.PI / 2 }, // Downtown Bayfront Ave
    { x: -24.18, z: -2, rotY: Math.PI / 2 }, // Downtown Vice Blvd
    { x: 88.18, z: -58, rotY: -Math.PI / 2 }, // Ocean Drive North
    { x: 88.18, z: -2, rotY: -Math.PI / 2 }, // Ocean Drive Mid
    { x: -39.82, z: -58, rotY: -Math.PI / 2 }, // Coral Heights Park East
    { x: -64, z: -24.18, rotY: 0 }, // Coral Heights Coral St
    { x: 0, z: 39.82, rotY: Math.PI }, // Neon Mile North
    { x: -39.82, z: 58, rotY: -Math.PI / 2 }, // Industrial Harbour East
  ];
  for (const bs of busStopCandidates) {
    if (!isSpotSafe(bs.x, bs.z, 2.5)) continue;
    reservePropSpot(bs.x, bs.z, 2.5);
    dummy.position.set(bs.x, SIDEWALK_SLAB_TOP_Y, bs.z);
    dummy.rotation.set(0, bs.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    busPostMatrices.push(dummy.matrix.clone());
    busFaceMatrices.push(dummy.matrix.clone());
  }

  // C. District-sensitive Benches, Waste Bins, Fire Hydrants, Bollards & Utility Cabinets along the 9 blocks
  for (const b of blockBoundsList) {
    const district = getDistrictAt(b.centerX, b.centerZ);
    const benchInnerOff = b.innerHalf + 0.56; // 21.81m (leaves 22.12..24.75 wide open for pedestrians!)
    const outerPropOff = b.outerHalf - 0.56; // 24.19m (curbside strip, leaves 21.25..23.90 wide open!)

    // Side segments per block (facing outward from center)
    const sides: Array<{
      x: number;
      z: number;
      alongX: boolean;
      outRotY: number;
      nx: number;
      nz: number;
    }> = [
      { x: b.centerX, z: b.centerZ - 1, alongX: true, outRotY: Math.PI, nx: 0, nz: -1 }, // North
      { x: b.centerX, z: b.centerZ + 1, alongX: true, outRotY: 0, nx: 0, nz: 1 }, // South
      { x: b.centerX - 1, z: b.centerZ, alongX: false, outRotY: -Math.PI / 2, nx: -1, nz: 0 }, // West
      { x: b.centerX + 1, z: b.centerZ, alongX: false, outRotY: Math.PI / 2, nx: 1, nz: 0 }, // East
    ];

    for (let sIdx = 0; sIdx < sides.length; sIdx++) {
      const side = sides[sIdx];
      // 1. Benches (tucked at inner sidewalk edge facing the street/sidewalk)
      const wantBenches =
        district === DistrictId.OceanDrive ||
        district === DistrictId.Downtown ||
        district === DistrictId.Entertainment ||
        (district === DistrictId.Residential && sIdx !== 0);

      if (wantBenches) {
        const offsets =
          district === DistrictId.OceanDrive && side.nx === 1
            ? [-12, 2, 12]
            : district === DistrictId.Downtown || district === DistrictId.Entertainment
              ? [-9, 9]
              : [0];
        for (const along of offsets) {
          const bx = side.alongX ? b.centerX + along : b.centerX + side.nx * benchInnerOff;
          const bz = side.alongX ? b.centerZ + side.nz * benchInnerOff : b.centerZ + along;
          if (!isSpotSafe(bx, bz, 2.8)) continue;
          reservePropSpot(bx, bz, 2.8);
          dummy.position.set(bx, SIDEWALK_SLAB_TOP_Y, bz);
          dummy.rotation.set(0, side.outRotY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          benchSlatMatrices.push(dummy.matrix.clone());
          benchFrameMatrices.push(dummy.matrix.clone());

          // Pair a waste bin neatly next to ~half of the benches on outer/inner line
          if (rng() < 0.55) {
            const binX = side.alongX ? bx + 1.55 : b.centerX + side.nx * outerPropOff;
            const binZ = side.alongX ? b.centerZ + side.nz * outerPropOff : bz + 1.55;
            if (isSpotSafe(binX, binZ, 2.1)) {
              reservePropSpot(binX, binZ, 2.1);
              dummy.position.set(binX, SIDEWALK_SLAB_TOP_Y, binZ);
              dummy.rotation.set(0, side.outRotY, 0);
              dummy.updateMatrix();
              binBodyMatrices.push(dummy.matrix.clone());
              binHoodMatrices.push(dummy.matrix.clone());
            }
          }
        }
      }

      // 2. Curbside waste/recycling bins
      if ((sIdx + (b.centerX > 0 ? 1 : 0)) % 2 === 0) {
        const binAlong = sIdx % 2 === 0 ? -13.5 : 13.5;
        const bx = side.alongX ? b.centerX + binAlong : b.centerX + side.nx * outerPropOff;
        const bz = side.alongX ? b.centerZ + side.nz * outerPropOff : b.centerZ + binAlong;
        if (isSpotSafe(bx, bz, 2.3)) {
          reservePropSpot(bx, bz, 2.3);
          dummy.position.set(bx, SIDEWALK_SLAB_TOP_Y, bz);
          dummy.rotation.set(0, side.outRotY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          binBodyMatrices.push(dummy.matrix.clone());
          binHoodMatrices.push(dummy.matrix.clone());
        }
      }

      // 3. Fire hydrants (curbside, restrained count: 1–2 per block)
      if (sIdx === 1 || (sIdx === 3 && district !== DistrictId.Harbour)) {
        const hAlong = sIdx === 1 ? -14.8 : 14.2;
        const hx = side.alongX ? b.centerX + hAlong : b.centerX + side.nx * (b.outerHalf - 0.45);
        const hz = side.alongX ? b.centerZ + side.nz * (b.outerHalf - 0.45) : b.centerZ + hAlong;
        if (isSpotSafe(hx, hz, 3.0)) {
          reservePropSpot(hx, hz, 3.0);
          dummy.position.set(hx, SIDEWALK_SLAB_TOP_Y, hz);
          dummy.rotation.set(0, side.outRotY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          hydrantMatrices.push(dummy.matrix.clone());
        }
      }

      // 4. Bollard clusters protecting high-footfall plaza corners & frontages (never near ramps!)
      const wantBollards =
        (district === DistrictId.Downtown && (sIdx === 0 || sIdx === 1 || sIdx === 2 || sIdx === 3)) ||
        (district === DistrictId.Entertainment && (sIdx === 0 || sIdx === 2 || sIdx === 3)) ||
        (district === DistrictId.OceanDrive && (sIdx === 2 || sIdx === 3)) ||
        (district === DistrictId.Harbour && (sIdx === 1 || sIdx === 3));

      if (wantBollards) {
        const bollardTint =
          district === DistrictId.Harbour
            ? new THREE.Color(0xd97706)
            : district === DistrictId.OceanDrive
              ? new THREE.Color(0x9a8c7b)
              : new THREE.Color(0x475569);
        const groupCenter = sIdx % 2 === 0 ? 12.6 : -12.6;
        for (const step of [-1.4, 0, 1.4]) {
          const along = groupCenter + step;
          const bx = side.alongX ? b.centerX + along : b.centerX + side.nx * (b.outerHalf - 0.36);
          const bz = side.alongX ? b.centerZ + side.nz * (b.outerHalf - 0.36) : b.centerZ + along;
          if (!isSpotSafe(bx, bz, 1.1)) continue;
          reservePropSpot(bx, bz, 1.1);
          dummy.position.set(bx, SIDEWALK_SLAB_TOP_Y, bz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          bollardMatrices.push(dummy.matrix.clone());
          bollardColors.push(bollardTint);
        }
      }

      // 5. Restrained utility control cabinets tucked against inner edge in Harbour / Downtown / Neon Mile
      if (
        (district === DistrictId.Harbour ||
          district === DistrictId.Downtown ||
          district === DistrictId.Entertainment) &&
        sIdx === 0
      ) {
        const ux = b.centerX + 16.0;
        const uz = b.centerZ + side.nz * (b.innerHalf + 0.35);
        if (isSpotSafe(ux, uz, 2.8)) {
          reservePropSpot(ux, uz, 2.8);
          dummy.position.set(ux, SIDEWALK_SLAB_TOP_Y + 0.56, uz);
          dummy.rotation.set(0, side.outRotY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          utilityBoxMatrices.push(dummy.matrix.clone());
        }
      }
    }
  }

  // Instantiate all furniture batches cleanly
  const { slatsGeo: benchSlatsGeo, frameGeo: benchFrameGeo } = createBenchGeometryParts();
  const { bodyGeo: binBodyGeo, hoodGeo: binHoodGeo } = createWasteBinGeometryParts();
  const hydrantGeo = createFireHydrantGeometry();
  const bollardGeo = createBollardGeometry();
  const utilityBoxGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(0.84, 1.12, 0.46));
  const signPostGeo = sanitizeStreetscapeGeometry(
    new THREE.CylinderGeometry(0.048, 0.058, 3.22, 8).translate(0, 1.61, 0),
  );
  const signBladeGeo = sanitizeStreetscapeGeometry(new THREE.BoxGeometry(1.12, 0.24, 0.04));
  const busPostGeo = sanitizeStreetscapeGeometry(
    new THREE.CylinderGeometry(0.048, 0.058, 2.85, 8).translate(0, 1.425, 0),
  );
  const busFaceGeo = sanitizeStreetscapeGeometry(
    new THREE.BoxGeometry(0.56, 0.84, 0.045).translate(0, 2.42, 0.05),
  );

  disposables.push(
    benchSlatsGeo,
    benchFrameGeo,
    binBodyGeo,
    binHoodGeo,
    hydrantGeo,
    bollardGeo,
    utilityBoxGeo,
    signPostGeo,
    signBladeGeo,
    busPostGeo,
    busFaceGeo,
  );

  addInstancedBatch('streetscape_inst_bench_slats', benchSlatsGeo, benchWoodMat, benchSlatMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_bench_frames', benchFrameGeo, furnitureDarkMetalMat, benchFrameMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_bin_bodies', binBodyGeo, binBodyMat, binBodyMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_bin_hoods', binHoodGeo, binHoodMat, binHoodMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_fire_hydrants', hydrantGeo, hydrantMat, hydrantMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_bollards', bollardGeo, bollardMat, bollardMatrices, bollardColors, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_utility_boxes', utilityBoxGeo, utilityBoxMat, utilityBoxMatrices, undefined, {
    castShadow: true,
    receiveShadow: true,
  });
  addInstancedBatch('streetscape_inst_sign_posts', signPostGeo, signPostMat, signPostMatrices, undefined, {
    castShadow: true,
    receiveShadow: false,
  });
  addInstancedBatch('streetscape_inst_bus_posts', busPostGeo, signPostMat, busPostMatrices, undefined, {
    castShadow: true,
    receiveShadow: false,
  });
  addInstancedBatch('streetscape_inst_bus_faces', busFaceGeo, busSignFaceMat, busFaceMatrices, undefined, {
    castShadow: true,
    receiveShadow: false,
  });

  // Instanced street-name sign blades grouped by street name (only 8 materials / small batches!)
  for (const [label, matrices] of signBladeTransforms.entries()) {
    const tex = createStreetSignBladeTexture(label, aniso);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex,
      roughness: 0.42,
      metalness: 0.12,
    });
    disposables.push(tex, bladeMat);
    const safeSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    addInstancedBatch(`streetscape_inst_sign_blade_${safeSlug}`, signBladeGeo, bladeMat, matrices);
  }

  // Build upgraded streetlight geometry assets (mounted in cityBuilder.ts using exact layout.streetlights)
  const streetlightGeos = createUpgradedStreetlightGeometries();
  disposables.push(
    streetlightGeos.poleAssemblyGeo,
    streetlightGeos.luminaireHeadGeo,
    streetlightGeos.diffuserLensGeo,
  );

  // Count central traffic-signal poles (2 diagonal poles per central intersection = 8 poles)
  const centralIntersectionCount = layout.intersections.filter(
    (n) => (n.gridX === 1 || n.gridX === 2) && (n.gridZ === 1 || n.gridZ === 2),
  ).length;

  return {
    stats: {
      renderedSidewalkLoopCount: blockBoundsList.length,
      skippedNonBlockLoopCount,
      sidewalkSlabCount: slabMatrices.length,
      curbSegmentCount: curbMatrices.length,
      curbRampCount: cornerRampMatrices.length * 2, // 2 crosswalk ramps per corner quadrant
      tactilePadCount: tactileMatrices.length,
      drainGrateCount: drainGrateMatrices.length,
      stopBarCount: stopBarMatrices.length,
      laneDashCount: laneDashMatrices.length,
      directionalArrowCount: straightArrowMatrices.length + turnArrowMatrices.length,
      manholeCount: manholeMatrices.length,
      benchCount: benchSlatMatrices.length,
      wasteBinCount: binBodyMatrices.length,
      streetSignCount: signPostMatrices.length,
      busStopSignCount: busPostMatrices.length,
      bollardCount: bollardMatrices.length,
      fireHydrantCount: hydrantMatrices.length,
      utilityBoxCount: utilityBoxMatrices.length,
      upgradedStreetlightCount: layout.streetlights.length,
      upgradedTrafficSignalPoleCount: centralIntersectionCount * 2,
      instancedBatches,
    },
    streetlightGeos,
  };
}
