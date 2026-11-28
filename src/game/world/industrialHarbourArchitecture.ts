import * as THREE from 'three';
import { BuildingSpec } from './cityData';
import { DistrictId } from '../types';

export type IndustrialWarehouseArchetype =
  | 'freight_distribution_terminal'
  | 'marine_cargo_depot'
  | 'cold_storage_logistics';

export type IndustrialFrontageAxis = '+x' | '-x' | '+z' | '-z';

export type IndustrialRoofType = 'steel_gable_monitor' | 'sawtooth_clerestory' | 'chiller_parapet_deck';

export interface IndustrialWarehouseProfile {
  id: string;
  archetype: IndustrialWarehouseArchetype;
  facilityCode: string;
  signTitle: string;
  signSubtitle: string;
  primaryFrontage: IndustrialFrontageAxis;
  secondaryFrontage: IndustrialFrontageAxis | null;
  roofType: IndustrialRoofType;
  loadingBayCount: number;
  dockProjection: number;
  canopyProjection: number;
  claddingOrientation: 'vertical' | 'horizontal';
  wallBaseTint: number;
  wallSecondaryTint: number;
  plinthConcreteTint: number;
  steelFrameTint: number;
  roofTint: number;
  safetyAccentTint: number;
  plinthHeight: number;
  hasClerestoryWindows: boolean;
  hasWallXBracing: boolean;
  hasRefrigerationPlant: boolean;
  hasExternalPipework: boolean;
}

export interface IndustrialWarehouseSummary {
  id: string;
  archetype: IndustrialWarehouseArchetype;
  facilityCode: string;
  signTitle: string;
  primaryFrontage: IndustrialFrontageAxis;
  secondaryFrontage: IndustrialFrontageAxis | null;
  roofType: IndustrialRoofType;
  loadingBayCount: number;
  dockProjection: number;
  canopyProjection: number;
  signMeshCount: number;
  pinnacleY: number;
  worldBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface IndustrialHarbourArchitectureStats {
  warehouseCount: number;
  archetypesUsed: IndustrialWarehouseArchetype[];
  totalLoadingBays: number;
  instancedBatches: number;
  totalFacadeInstances: number;
  sharedMaterialCount: number;
  signageMaterialCount: number;
  warehouses: IndustrialWarehouseSummary[];
}

export interface IndustrialHarbourArchitectureContext {
  root: THREE.Group;
  emissiveBuildingMaterials: THREE.MeshStandardMaterial[];
  neonTrimMaterials: THREE.MeshStandardMaterial[];
  environmentMeshesForCamera: THREE.Object3D[];
  disposables: Array<{ dispose: () => void }>;
}

interface InstanceEntry {
  matrix: THREE.Matrix4;
  colorHex: number;
}

/**
 * Strictly selects Industrial Harbour warehouse buildings (`district === Harbour && style === 'warehouse'`).
 * Preserves Downtown, Ocean Drive, Coral Heights, Neon Mile, shipping containers, and gantry cranes untouched.
 */
export function isIndustrialHarbourWarehouseSpec(spec: BuildingSpec): boolean {
  return spec.district === DistrictId.Harbour && spec.style === 'warehouse';
}

/**
 * Deterministic architectural profile mapping each Industrial Harbour warehouse to a distinct
 * maritime industrial identity, loading orientation, structural framing, and clearance envelope.
 */
export function resolveIndustrialHarbourProfile(spec: BuildingSpec): IndustrialWarehouseProfile {
  switch (spec.id) {
    case 'harbour_wh_1':
      return {
        id: spec.id,
        archetype: 'freight_distribution_terminal',
        facilityCode: 'TERM-01',
        signTitle: 'PORT FREIGHT TERMINAL 01',
        signSubtitle: 'MARITIME DISTRIBUTION  •  BAYS 1–3',
        // +z faces open 10.15m container-yard apron; -z faces North Harbour avenue (3.0m to sidewalk)
        primaryFrontage: '+z',
        secondaryFrontage: '-z',
        roofType: 'steel_gable_monitor',
        loadingBayCount: 3,
        dockProjection: 1.95,
        canopyProjection: 2.2,
        claddingOrientation: 'vertical',
        wallBaseTint: 0x7d8a98,
        wallSecondaryTint: 0x515f70,
        plinthConcreteTint: 0x959a9f,
        steelFrameTint: 0x2f3843,
        roofTint: 0x4b5563,
        safetyAccentTint: 0xc84b14,
        plinthHeight: 2.35,
        hasClerestoryWindows: false,
        hasWallXBracing: true,
        hasRefrigerationPlant: false,
        hasExternalPipework: true,
      };
    case 'harbour_wh_2':
      return {
        id: spec.id,
        archetype: 'marine_cargo_depot',
        facilityCode: 'DEPOT-02',
        signTitle: 'MARINE CARGO DEPOT 02',
        signSubtitle: 'EQUIPMENT & HEAVY FREIGHT STORAGE',
        // -z faces 10.8m open freight yard; +z faces South Harbour boulevard (4.5m to sidewalk)
        primaryFrontage: '-z',
        secondaryFrontage: '+z',
        roofType: 'sawtooth_clerestory',
        loadingBayCount: 2,
        dockProjection: 1.85,
        canopyProjection: 2.0,
        claddingOrientation: 'vertical',
        wallBaseTint: 0x466368,
        wallSecondaryTint: 0x31494f,
        plinthConcreteTint: 0xa8a397,
        steelFrameTint: 0x2d353e,
        roofTint: 0x555e68,
        safetyAccentTint: 0xd97706,
        plinthHeight: 2.8,
        hasClerestoryWindows: true,
        hasWallXBracing: false,
        hasRefrigerationPlant: false,
        hasExternalPipework: true,
      };
    case 'west_harbour_1':
    default:
      return {
        id: spec.id,
        archetype: 'cold_storage_logistics',
        facilityCode: 'COLD-03',
        signTitle: 'WEST PIER COLD STORAGE',
        signSubtitle: 'MARITIME LOGISTICS  •  REFRIGERATED BAYS',
        // +x exploits 22m long facade toward West Harbour Ave (3.5m to sidewalk -> keep <= 2.05m);
        // -x faces 13m waterfront quay with exterior refrigeration plant & pipework
        primaryFrontage: '+x',
        secondaryFrontage: '-x',
        roofType: 'chiller_parapet_deck',
        loadingBayCount: 4,
        dockProjection: 1.7,
        canopyProjection: 1.98,
        claddingOrientation: 'horizontal',
        wallBaseTint: 0xc2ced9,
        wallSecondaryTint: 0x3e5266,
        plinthConcreteTint: 0x949a9f,
        steelFrameTint: 0x2b3745,
        roofTint: 0x586470,
        safetyAccentTint: 0xea580c,
        plinthHeight: 2.5,
        hasClerestoryWindows: false,
        hasWallXBracing: false,
        hasRefrigerationPlant: true,
        hasExternalPipework: true,
      };
  }
}

// =========================================================================
// CUSTOM PROCEDURAL INDUSTRIAL GEOMETRIES (Verified Finite & Outward Normals)
// =========================================================================

function buildIndexedSolidGeometry(
  positions: number[],
  indices: number[],
  uvs?: number[],
): THREE.BufferGeometry {
  const raw = new THREE.BufferGeometry();
  raw.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  raw.setIndex(indices);
  if (uvs && uvs.length === (positions.length / 3) * 2) {
    raw.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
  const nonIndexed = raw.toNonIndexed();
  raw.dispose();

  // Compute crisp flat face normals and verify strictly finite unit-length outward normals
  nonIndexed.computeVertexNormals();
  const posAttr = nonIndexed.getAttribute('position');
  const normAttr = nonIndexed.getAttribute('normal');
  for (let i = 0; i < posAttr.count; i++) {
    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);
    const len = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(len) || len < 1e-4) {
      normAttr.setXYZ(i, 0, 1, 0);
    } else {
      normAttr.setXYZ(i, nx / len, ny / len, nz / len);
    }
  }
  if (!nonIndexed.getAttribute('uv')) {
    const uvArr = new Float32Array(posAttr.count * 2);
    for (let i = 0; i < posAttr.count; i++) {
      uvArr[i * 2] = posAttr.getX(i) + 0.5;
      uvArr[i * 2 + 1] = posAttr.getY(i);
    }
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  }
  nonIndexed.computeBoundingBox();
  nonIndexed.computeBoundingSphere();
  return nonIndexed;
}

/**
 * Low-slope industrial steel gable roof prism normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 * Ridge runs along the X axis at Z = 0, Y = 1; eaves sit at Z = ±0.5, Y = 0.22 with solid fascia apron to Y = 0.
 */
export function createIndustrialGableRoofGeometry(): THREE.BufferGeometry {
  const eaveY = 0.24;
  // Cross-section in YZ (counter-clockwise when viewed from +X):
  // 0: (z=+0.5, y=0), 1: (z=+0.5, y=eaveY), 2: (z=0, y=1), 3: (z=-0.5, y=eaveY), 4: (z=-0.5, y=0)
  const profile: Array<[number, number]> = [
    [0.5, 0.0],
    [0.5, eaveY],
    [0.0, 1.0],
    [-0.5, eaveY],
    [-0.5, 0.0],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushQuad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    const base = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // Extrude perimeter quads between x = -0.5 and x = +0.5 (outward normals)
  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i];
    const [z1, y1] = profile[(i + 1) % profile.length];
    pushQuad([-0.5, y0, z0], [0.5, y0, z0], [0.5, y1, z1], [-0.5, y1, z1]);
  }

  // +X gable end cap (outward normal +X -> CCW when viewed from +X)
  const pxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(0.5, y, z);
    uvs.push(z + 0.5, y);
  }
  indices.push(pxBase, pxBase + 2, pxBase + 1);
  indices.push(pxBase, pxBase + 3, pxBase + 2);
  indices.push(pxBase, pxBase + 4, pxBase + 3);

  // -X gable end cap (outward normal -X -> reversed winding)
  const nxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(-0.5, y, z);
    uvs.push(0.5 - z, y);
  }
  indices.push(nxBase, nxBase + 1, nxBase + 2);
  indices.push(nxBase, nxBase + 2, nxBase + 3);
  indices.push(nxBase, nxBase + 3, nxBase + 4);

  return buildIndexedSolidGeometry(positions, indices, uvs);
}

/**
 * Industrial sawtooth / clerestory roof bay normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 * Vertical clerestory wall sits at Z = -0.5 (rising Y = 0..1), sloping down to Z = +0.5 (Y = 0.16).
 */
export function createSawtoothClerestoryRoofGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number]> = [
    [0.5, 0.0],
    [0.5, 0.18],
    [-0.5, 1.0],
    [-0.5, 0.0],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushQuad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    const base = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i];
    const [z1, y1] = profile[(i + 1) % profile.length];
    pushQuad([-0.5, y0, z0], [0.5, y0, z0], [0.5, y1, z1], [-0.5, y1, z1]);
  }

  // +X cap
  const pxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(0.5, y, z);
    uvs.push(z + 0.5, y);
  }
  indices.push(pxBase, pxBase + 2, pxBase + 1, pxBase, pxBase + 3, pxBase + 2);

  // -X cap
  const nxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(-0.5, y, z);
    uvs.push(0.5 - z, y);
  }
  indices.push(nxBase, nxBase + 1, nxBase + 2, nxBase, nxBase + 2, nxBase + 3);

  return buildIndexedSolidGeometry(positions, indices, uvs);
}

/**
 * Cantilevered sloped loading-dock protective steel canopy normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors flush against the warehouse wall at Z = 0 (Y = 0.25..1.0) and slopes outward to Z = 1 (Y = 0..0.38)
 * with a clean front fascia drip edge.
 */
export function createSlopedDockCanopyGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number]> = [
    [1.0, 0.0],
    [1.0, 0.36],
    [0.0, 1.0],
    [0.0, 0.26],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushQuad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    const base = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i];
    const [z1, y1] = profile[(i + 1) % profile.length];
    pushQuad([-0.5, y0, z0], [0.5, y0, z0], [0.5, y1, z1], [-0.5, y1, z1]);
  }

  // +X cap
  const pxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(0.5, y, z);
    uvs.push(z, y);
  }
  indices.push(pxBase, pxBase + 2, pxBase + 1, pxBase, pxBase + 3, pxBase + 2);

  // -X cap
  const nxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(-0.5, y, z);
    uvs.push(1 - z, y);
  }
  indices.push(nxBase, nxBase + 1, nxBase + 2, nxBase, nxBase + 2, nxBase + 3);

  return buildIndexedSolidGeometry(positions, indices, uvs);
}

/**
 * Triangular structural steel knee-brace / gusset bracket normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors against wall at Z = 0 (Y = 0..1) and extends out under canopy at Y = 1 (Z = 0..1).
 */
export function createSteelGussetBracketGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number]> = [
    [1.0, 0.84],
    [1.0, 1.0],
    [0.0, 1.0],
    [0.0, 0.0],
    [0.18, 0.0],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushQuad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    const base = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i];
    const [z1, y1] = profile[(i + 1) % profile.length];
    pushQuad([-0.5, y0, z0], [0.5, y0, z0], [0.5, y1, z1], [-0.5, y1, z1]);
  }

  // +X cap
  const pxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(0.5, y, z);
    uvs.push(z, y);
  }
  indices.push(pxBase, pxBase + 2, pxBase + 1);
  indices.push(pxBase, pxBase + 3, pxBase + 2);
  indices.push(pxBase, pxBase + 4, pxBase + 3);

  // -X cap
  const nxBase = positions.length / 3;
  for (const [z, y] of profile) {
    positions.push(-0.5, y, z);
    uvs.push(1 - z, y);
  }
  indices.push(nxBase, nxBase + 1, nxBase + 2);
  indices.push(nxBase, nxBase + 2, nxBase + 3);
  indices.push(nxBase, nxBase + 3, nxBase + 4);

  return buildIndexedSolidGeometry(positions, indices, uvs);
}

/**
 * Octagonal industrial rooftop exhaust vent cowl normalized in radius ~0.5 and Y [0..1].
 * Base curb Y [0..0.38], narrower throat Y [0.38..0.60], overhanging octagonal rain hood Y [0.60..1.0].
 */
export function createRoofVentCowlGeometry(): THREE.BufferGeometry {
  const rings: Array<{ r: number; y: number }> = [
    { r: 0.36, y: 0.0 },
    { r: 0.36, y: 0.42 },
    { r: 0.28, y: 0.48 },
    { r: 0.28, y: 0.62 },
    { r: 0.52, y: 0.64 },
    { r: 0.52, y: 0.80 },
    { r: 0.16, y: 1.0 },
  ];
  const segs = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ri = 0; ri < rings.length - 1; ri++) {
    const r0 = rings[ri];
    const r1 = rings[ri + 1];
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2;
      const a1 = ((s + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const base = positions.length / 3;
      // Outward radial normal: (c0, y0, s0) -> (c0, y1, s0) -> (c1, y1, s1) -> (c1, y0, s1)
      positions.push(
        c0 * r0.r,
        r0.y,
        s0 * r0.r,
        c0 * r1.r,
        r1.y,
        s0 * r1.r,
        c1 * r1.r,
        r1.y,
        s1 * r1.r,
        c1 * r0.r,
        r0.y,
        s1 * r0.r,
      );
      uvs.push(s / segs, r0.y, s / segs, r1.y, (s + 1) / segs, r1.y, (s + 1) / segs, r0.y);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  // Top octagonal cap at y = 1.0 (outward normal +Y)
  const topCenter = positions.length / 3;
  positions.push(0, 1.0, 0);
  uvs.push(0.5, 0.5);
  const topR = rings[rings.length - 1].r;
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    positions.push(Math.cos(a) * topR, 1.0, Math.sin(a) * topR);
    uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
  }
  for (let s = 0; s < segs; s++) {
    const next = (s + 1) % segs;
    indices.push(topCenter, topCenter + 1 + next, topCenter + 1 + s);
  }

  // Bottom octagonal cap at y = 0.0 (outward normal -Y)
  const botCenter = positions.length / 3;
  positions.push(0, 0.0, 0);
  uvs.push(0.5, 0.5);
  const botR = rings[0].r;
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    positions.push(Math.cos(a) * botR, 0.0, Math.sin(a) * botR);
    uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
  }
  for (let s = 0; s < segs; s++) {
    const next = (s + 1) % segs;
    indices.push(botCenter, botCenter + 1 + s, botCenter + 1 + next);
  }

  return buildIndexedSolidGeometry(positions, indices, uvs);
}

// =========================================================================
// PROCEDURAL CANVAS TEXTURES (With Headless Node.js DataTexture Fallback)
// =========================================================================

function createSafeIndustrialTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  options: {
    srgb?: boolean;
    repeatX?: number;
    repeatY?: number;
    fallbackRgba?: [number, number, number, number];
  } = {},
): THREE.Texture {
  const srgb = options.srgb !== false;
  const repeatX = options.repeatX ?? 1;
  const repeatY = options.repeatY ?? 1;

  if (typeof document === 'undefined') {
    const rgba = options.fallbackRgba ?? [160, 170, 180, 255];
    const data = new Uint8Array(rgba);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createCorrugatedCladdingMaps(
  orientation: 'vertical' | 'horizontal',
  disposables: Array<{ dispose: () => void }>,
): { map: THREE.Texture; bumpMap: THREE.Texture } {
  const isVert = orientation === 'vertical';
  const map = createSafeIndustrialTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#c8cfd6';
      ctx.fillRect(0, 0, w, h);

      const ribs = isVert ? 16 : 12;
      const step = (isVert ? w : h) / ribs;
      for (let i = 0; i < ribs; i++) {
        const p = i * step;
        const grad = isVert
          ? ctx.createLinearGradient(p, 0, p + step, 0)
          : ctx.createLinearGradient(0, p, 0, p + step);
        grad.addColorStop(0.0, '#aeb7c1');
        grad.addColorStop(0.22, '#e2e7ec');
        grad.addColorStop(0.55, '#d0d7df');
        grad.addColorStop(0.84, '#929ca7');
        grad.addColorStop(1.0, '#aeb7c1');
        ctx.fillStyle = grad;
        if (isVert) {
          ctx.fillRect(p, 0, step + 0.5, h);
        } else {
          ctx.fillRect(0, p, w, step + 0.5);
        }
      }

      // Subtle horizontal or vertical sheet lap seams & rivet fasteners
      ctx.strokeStyle = 'rgba(28, 36, 46, 0.24)';
      ctx.lineWidth = 2;
      if (isVert) {
        for (const seamY of [64, 192]) {
          ctx.beginPath();
          ctx.moveTo(0, seamY);
          ctx.lineTo(w, seamY);
          ctx.stroke();
        }
      } else {
        for (const seamX of [64, 192]) {
          ctx.beginPath();
          ctx.moveTo(seamX, 0);
          ctx.lineTo(seamX, h);
          ctx.stroke();
        }
      }

      // Subtle coastal salt & weather streak variation
      for (let i = 0; i < 65; i++) {
        const sx = ((i * 53) % w);
        const sy = ((i * 37) % h);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(42, 52, 64, 0.055)' : 'rgba(245, 248, 252, 0.045)';
        ctx.fillRect(sx, sy, 3 + (i % 5), 24 + (i % 38));
      }
    },
    { srgb: true, repeatX: isVert ? 2 : 1.5, repeatY: isVert ? 1.5 : 2 },
  );

  const bumpMap = createSafeIndustrialTexture(
    256,
    256,
    (ctx, w, h) => {
      const ribs = isVert ? 16 : 12;
      const step = (isVert ? w : h) / ribs;
      for (let i = 0; i < ribs; i++) {
        const p = i * step;
        const grad = isVert
          ? ctx.createLinearGradient(p, 0, p + step, 0)
          : ctx.createLinearGradient(0, p, 0, p + step);
        grad.addColorStop(0.0, '#484848');
        grad.addColorStop(0.28, '#e8e8e8');
        grad.addColorStop(0.64, '#bcbcbc');
        grad.addColorStop(0.88, '#282828');
        grad.addColorStop(1.0, '#484848');
        ctx.fillStyle = grad;
        if (isVert) {
          ctx.fillRect(p, 0, step + 0.5, h);
        } else {
          ctx.fillRect(0, p, w, step + 0.5);
        }
      }
    },
    { srgb: false, repeatX: isVert ? 2 : 1.5, repeatY: isVert ? 1.5 : 2 },
  );

  disposables.push(map, bumpMap);
  return { map, bumpMap };
}

function createIndustrialConcreteMaps(
  disposables: Array<{ dispose: () => void }>,
): { map: THREE.Texture; bumpMap: THREE.Texture } {
  const map = createSafeIndustrialTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#c5c7c4';
      ctx.fillRect(0, 0, w, h);

      // Cast-in-place precast panel joints & formwork tie holes
      ctx.strokeStyle = 'rgba(54, 58, 62, 0.28)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Formwork tie dimples
      ctx.fillStyle = 'rgba(48, 52, 56, 0.34)';
      for (let gx = 16; gx < w; gx += 64) {
        for (let gy = 16; gy < h; gy += 64) {
          ctx.fillRect(gx, gy, 4, 4);
          ctx.fillRect(gx + 32, gy, 4, 4);
          ctx.fillRect(gx, gy + 32, 4, 4);
          ctx.fillRect(gx + 32, gy + 32, 4, 4);
        }
      }

      // Subtle lower-base coastal grime & aggregate speckles
      const grime = ctx.createLinearGradient(0, h * 0.6, 0, h);
      grime.addColorStop(0, 'rgba(42, 46, 50, 0)');
      grime.addColorStop(1, 'rgba(38, 42, 46, 0.24)');
      ctx.fillStyle = grime;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      for (let i = 0; i < 180; i++) {
        const px = (i * 71) % w;
        const py = (i * 43) % h;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(35, 38, 40, 0.08)' : 'rgba(245, 245, 242, 0.07)';
        ctx.fillRect(px, py, 2 + (i % 3), 2 + (i % 2));
      }
    },
    { srgb: true, repeatX: 2, repeatY: 1 },
  );

  const bumpMap = createSafeIndustrialTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#909090';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#383838';
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    },
    { srgb: false, repeatX: 2, repeatY: 1 },
  );

  disposables.push(map, bumpMap);
  return { map, bumpMap };
}

function createRollerShutterTexture(disposables: Array<{ dispose: () => void }>): THREE.Texture {
  const tex = createSafeIndustrialTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#4f5a66';
      ctx.fillRect(0, 0, w, h);

      // Horizontal interlocking galvanized steel slats
      const slats = 24;
      const sh = h / slats;
      for (let i = 0; i < slats; i++) {
        const y = i * sh;
        const grad = ctx.createLinearGradient(0, y, 0, y + sh);
        grad.addColorStop(0.0, '#6a7684');
        grad.addColorStop(0.35, '#55616e');
        grad.addColorStop(0.82, '#3d4752');
        grad.addColorStop(1.0, '#232a33');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, sh);
      }

      // Heavy bottom kick-bar & safety hazard footer strip
      ctx.fillStyle = '#252c35';
      ctx.fillRect(0, h - 22, w, 22);
      ctx.fillStyle = '#eab308';
      for (let sx = -24; sx < w + 24; sx += 24) {
        ctx.beginPath();
        ctx.moveTo(sx, h - 18);
        ctx.lineTo(sx + 10, h - 18);
        ctx.lineTo(sx + 4, h - 4);
        ctx.lineTo(sx - 6, h - 4);
        ctx.closePath();
        ctx.fill();
      }

      // Twin industrial vision-slat windows near eye height
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(42, h * 0.42, 64, 20);
      ctx.fillRect(w - 106, h * 0.42, 64, 20);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, h * 0.42, 64, 20);
      ctx.strokeRect(w - 106, h * 0.42, 64, 20);

      // Side vertical guide tracks
      ctx.fillStyle = '#27303a';
      ctx.fillRect(0, 0, 10, h);
      ctx.fillRect(w - 10, 0, 10, h);
    },
    { srgb: true, repeatX: 1, repeatY: 1, fallbackRgba: [78, 88, 100, 255] },
  );
  disposables.push(tex);
  return tex;
}

function createHazardStripeTexture(disposables: Array<{ dispose: () => void }>): THREE.Texture {
  const tex = createSafeIndustrialTexture(
    256,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#18181b';
      for (let x = -h; x < w + h; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 18, 0);
        ctx.lineTo(x - 10, h);
        ctx.lineTo(x - 28, h);
        ctx.closePath();
        ctx.fill();
      }
      // Subtle weathered concrete scuffing
      ctx.fillStyle = 'rgba(40, 44, 48, 0.14)';
      ctx.fillRect(0, h - 10, w, 10);
    },
    { srgb: true, repeatX: 3, repeatY: 1, fallbackRgba: [224, 178, 16, 255] },
  );
  disposables.push(tex);
  return tex;
}

function createClerestoryGlazingTextures(
  disposables: Array<{ dispose: () => void }>,
): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const map = createSafeIndustrialTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#2b3946';
      ctx.fillRect(0, 0, w, h);
      const cols = 6;
      const rows = 2;
      const pw = w / cols;
      const ph = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * pw + 4;
          const y = r * ph + 4;
          const grad = ctx.createLinearGradient(x, y, x, y + ph - 8);
          grad.addColorStop(0, '#5a768d');
          grad.addColorStop(0.55, '#435b6f');
          grad.addColorStop(1, '#314454');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, pw - 8, ph - 8);
        }
      }
    },
    { srgb: true, repeatX: 2, repeatY: 1, fallbackRgba: [76, 102, 122, 255] },
  );

  const emissiveMap = createSafeIndustrialTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      const cols = 6;
      const rows = 2;
      const pw = w / cols;
      const ph = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = (r * 3 + c) % 4 !== 1;
          ctx.fillStyle = lit ? '#d4b483' : '#262b30';
          ctx.fillRect(c * pw + 5, r * ph + 5, pw - 10, ph - 10);
        }
      }
    },
    { srgb: true, repeatX: 2, repeatY: 1, fallbackRgba: [180, 150, 104, 255] },
  );

  disposables.push(map, emissiveMap);
  return { map, emissiveMap };
}

function createFacilitySignTextures(
  title: string,
  subtitle: string,
  code: string,
  accentHex: string,
  disposables: Array<{ dispose: () => void }>,
): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const drawSign = (ctx: CanvasRenderingContext2D, w: number, h: number, isEmissive: boolean) => {
    ctx.fillStyle = isEmissive ? '#080b10' : '#1b242f';
    ctx.fillRect(0, 0, w, h);

    // Industrial bolted frame & accent top/bottom bars
    ctx.fillStyle = isEmissive ? '#222b36' : accentHex;
    ctx.fillRect(0, 0, w, 16);
    ctx.fillRect(0, h - 12, w, 12);

    // Left facility badge block with generous margin
    ctx.fillStyle = isEmissive ? '#3f382b' : accentHex;
    ctx.fillRect(22, 28, 174, h - 52);
    ctx.fillStyle = isEmissive ? '#c8baa0' : '#0f172a';
    ctx.font = 'bold 34px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, 109, h * 0.52, 160);

    // Crisp main facility lettering with guaranteed right-edge breathing room
    const textX = 222;
    const maxTextW = w - textX - 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = isEmissive ? '#d6e2ee' : '#f8fafc';
    ctx.font = 'bold 46px "Arial Narrow", Arial, sans-serif';
    ctx.fillText(title, textX, h * 0.40, maxTextW);

    ctx.fillStyle = isEmissive ? '#8da0b2' : '#cbd5e1';
    ctx.font = '600 24px Arial, sans-serif';
    ctx.fillText(subtitle, textX + 2, h * 0.72, maxTextW);
  };

  const map = createSafeIndustrialTexture(
    1024,
    192,
    (ctx, w, h) => drawSign(ctx, w, h, false),
    { srgb: true, fallbackRgba: [30, 42, 54, 255] },
  );
  const emissiveMap = createSafeIndustrialTexture(
    1024,
    192,
    (ctx, w, h) => drawSign(ctx, w, h, true),
    { srgb: true, fallbackRgba: [140, 155, 168, 255] },
  );
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
  emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
  disposables.push(map, emissiveMap);
  return { map, emissiveMap };
}

function createBayNumberTexture(
  label: string,
  accentHex: string,
  disposables: Array<{ dispose: () => void }>,
): THREE.Texture {
  const tex = createSafeIndustrialTexture(
    128,
    96,
    (ctx, w, h) => {
      ctx.fillStyle = '#18212b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 52px "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h * 0.54);
    },
    { srgb: true, fallbackRgba: [24, 33, 43, 255] },
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  disposables.push(tex);
  return tex;
}

function createColdStorageWarningTexture(disposables: Array<{ dispose: () => void }>): THREE.Texture {
  const tex = createSafeIndustrialTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      // Header hazard bar
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(8, 8, w - 16, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAUTION — COLD PLANT', w / 2, 27);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText('REFRIGERATED LOGISTICS', w / 2, 68);
      ctx.font = '600 14px Arial, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('AUTHORIZED PORT STAFF ONLY', w / 2, 96);
    },
    { srgb: true, fallbackRgba: [220, 226, 232, 255] },
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  disposables.push(tex);
  return tex;
}

// =========================================================================
// MAIN INDUSTRIAL HARBOUR BUILDER
// =========================================================================

function frontageYaw(axis: IndustrialFrontageAxis): number {
  switch (axis) {
    case '+z':
      return 0;
    case '-z':
      return Math.PI;
    case '+x':
      return Math.PI / 2;
    case '-x':
      return -Math.PI / 2;
  }
}

export function buildIndustrialHarbourArchitecture(
  specs: BuildingSpec[],
  ctx: IndustrialHarbourArchitectureContext,
): IndustrialHarbourArchitectureStats {
  const {
    root,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    environmentMeshesForCamera,
    disposables,
  } = ctx;

  // Shared procedural textures
  const vertClad = createCorrugatedCladdingMaps('vertical', disposables);
  const horizClad = createCorrugatedCladdingMaps('horizontal', disposables);
  const concreteMaps = createIndustrialConcreteMaps(disposables);
  const shutterMap = createRollerShutterTexture(disposables);
  const hazardMap = createHazardStripeTexture(disposables);
  const clerestoryMaps = createClerestoryGlazingTextures(disposables);
  const coldWarnMap = createColdStorageWarningTexture(disposables);

  // Shared procedural geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const gableRoofGeo = createIndustrialGableRoofGeometry();
  const sawtoothRoofGeo = createSawtoothClerestoryRoofGeometry();
  const dockCanopyGeo = createSlopedDockCanopyGeometry();
  const gussetBracketGeo = createSteelGussetBracketGeometry();
  const roofVentGeo = createRoofVentCowlGeometry();
  disposables.push(
    unitBoxGeo,
    unitCylGeo,
    gableRoofGeo,
    sawtoothRoofGeo,
    dockCanopyGeo,
    gussetBracketGeo,
    roofVentGeo,
  );

  // Compact shared PBR material pool (distinct roughness & metalness contrast)
  const sharedMaterials: THREE.MeshStandardMaterial[] = [];
  const registerSharedMat = (mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial => {
    sharedMaterials.push(mat);
    disposables.push(mat);
    return mat;
  };

  const vertCladdingMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: vertClad.map,
      bumpMap: vertClad.bumpMap,
      bumpScale: 0.14,
      roughness: 0.62,
      metalness: 0.38,
    }),
  );

  const horizCladdingMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: horizClad.map,
      bumpMap: horizClad.bumpMap,
      bumpScale: 0.13,
      roughness: 0.52,
      metalness: 0.44,
    }),
  );

  const concreteMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: concreteMaps.map,
      bumpMap: concreteMaps.bumpMap,
      bumpScale: 0.08,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const structuralSteelMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.62,
    }),
  );

  const galvanizedMetalMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.40,
      metalness: 0.72,
    }),
  );

  const roofMetalMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: vertClad.map,
      bumpMap: vertClad.bumpMap,
      bumpScale: 0.09,
      roughness: 0.66,
      metalness: 0.34,
    }),
  );

  const rollerShutterMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6ecf2,
      map: shutterMap,
      roughness: 0.50,
      metalness: 0.56,
    }),
  );

  const rubberBumperMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2329,
      roughness: 0.90,
      metalness: 0.06,
    }),
  );

  const hazardStripeMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: hazardMap,
      roughness: 0.76,
      metalness: 0.08,
    }),
  );

  const safetyAccentMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.46,
      metalness: 0.30,
    }),
  );

  const coldWarningMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: coldWarnMap,
      roughness: 0.45,
      metalness: 0.12,
    }),
  );

  // Clerestory daylight glazing — integrates with TimeAndWeatherSystem emissiveMap scaling
  const clerestoryGlassMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: clerestoryMaps.map,
      emissive: 0xffd29d,
      emissiveMap: clerestoryMaps.emissiveMap,
      emissiveIntensity: 0.08,
      roughness: 0.24,
      metalness: 0.35,
    }),
  );
  emissiveBuildingMaterials.push(clerestoryGlassMat);

  // Restrained industrial exterior safety worklight bulbs (warm sodium amber & cool LED flood)
  const warmSodiumLampMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.10,
    }),
  );
  neonTrimMaterials.push(warmSodiumLampMat);

  const coolWorklightMat = registerSharedMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.55,
      roughness: 0.20,
      metalness: 0.12,
    }),
  );
  neonTrimMaterials.push(coolWorklightMat);

  // Per-warehouse tinted wall/roof materials (reusing shared textures for clean visual differentiation)
  const makeTintedClone = (base: THREE.MeshStandardMaterial, colorHex: number): THREE.MeshStandardMaterial => {
    const cloned = base.clone();
    cloned.color.setHex(colorHex);
    disposables.push(cloned);
    return cloned;
  };

  // Batched InstancedMesh buckets
  const steelBoxInstances: InstanceEntry[] = [];
  const galvanizedBoxInstances: InstanceEntry[] = [];
  const concreteBoxInstances: InstanceEntry[] = [];
  const accentBoxInstances: InstanceEntry[] = [];
  const rubberBoxInstances: InstanceEntry[] = [];
  const pipeCylInstances: InstanceEntry[] = [];
  const bollardCylInstances: InstanceEntry[] = [];
  const gussetInstances: InstanceEntry[] = [];
  const roofVentInstances: InstanceEntry[] = [];
  const warmLampInstances: InstanceEntry[] = [];
  const coolLampInstances: InstanceEntry[] = [];

  const tmpPos = new THREE.Vector3();
  const tmpEuler = new THREE.Euler();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();

  const pushInstance = (
    bucket: InstanceEntry[],
    parentMatrix: THREE.Matrix4,
    lx: number,
    ly: number,
    lz: number,
    sx: number,
    sy: number,
    sz: number,
    rx: number,
    ry: number,
    rz: number,
    colorHex: number,
  ) => {
    tmpPos.set(lx, ly, lz);
    tmpEuler.set(rx, ry, rz);
    tmpQuat.setFromEuler(tmpEuler);
    tmpScale.set(sx, sy, sz);
    const localM = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale);
    const worldM = new THREE.Matrix4().multiplyMatrices(parentMatrix, localM);
    bucket.push({ matrix: worldM, colorHex });
  };

  const summaries: IndustrialWarehouseSummary[] = [];
  let signageMaterialCount = 0;

  for (const spec of specs) {
    const profile = resolveIndustrialHarbourProfile(spec);
    const group = new THREE.Group();
    group.name = `industrial_harbour_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);
    group.updateMatrixWorld(true);
    const groupWorldMat = group.matrixWorld.clone();

    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const halfW = w / 2;
    const halfD = d / 2;

    const wallMat = makeTintedClone(
      profile.claddingOrientation === 'vertical' ? vertCladdingMat : horizCladdingMat,
      profile.wallBaseTint,
    );
    const secondaryWallMat = makeTintedClone(
      profile.claddingOrientation === 'vertical' ? vertCladdingMat : horizCladdingMat,
      profile.wallSecondaryTint,
    );
    const plinthMat = makeTintedClone(concreteMat, profile.plinthConcreteTint);
    const roofMat = makeTintedClone(roofMetalMat, profile.roofTint);

    let signMeshCount = 0;
    let pinnacleY = h;
    let minWorldX = spec.x - halfW;
    let maxWorldX = spec.x + halfW;
    let minWorldZ = spec.z - halfD;
    let maxWorldZ = spec.z + halfD;

    const expandBounds = (localX: number, localZ: number, marginX = 0, marginZ = 0) => {
      minWorldX = Math.min(minWorldX, spec.x + localX - marginX);
      maxWorldX = Math.max(maxWorldX, spec.x + localX + marginX);
      minWorldZ = Math.min(minWorldZ, spec.z + localZ - marginZ);
      maxWorldZ = Math.max(maxWorldZ, spec.z + localZ + marginZ);
    };

    // ---------------------------------------------------------
    // 1. REINFORCED CONCRETE LOWER PLINTH & MAIN CORRUGATED SHELL
    // ---------------------------------------------------------
    const plinthH = profile.plinthHeight;
    const plinthMesh = new THREE.Mesh(unitBoxGeo, plinthMat);
    plinthMesh.scale.set(w + 0.16, plinthH, d + 0.16);
    plinthMesh.position.y = plinthH / 2;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    group.add(plinthMesh);
    environmentMeshesForCamera.push(plinthMesh);

    const upperH = h - plinthH;
    const upperShell = new THREE.Mesh(unitBoxGeo, wallMat);
    upperShell.scale.set(w, upperH, d);
    upperShell.position.y = plinthH + upperH / 2;
    upperShell.castShadow = true;
    upperShell.receiveShadow = true;
    group.add(upperShell);
    environmentMeshesForCamera.push(upperShell);

    // Concrete-to-cladding horizontal drip sill ledge
    pushInstance(
      steelBoxInstances,
      groupWorldMat,
      0,
      plinthH + 0.08,
      0,
      w + 0.28,
      0.16,
      d + 0.28,
      0,
      0,
      0,
      profile.steelFrameTint,
    );

    // Upper industrial structural band & safety accent stripe below roofline
    const fasciaBandH = profile.archetype === 'cold_storage_logistics' ? 1.05 : 0.72;
    const fasciaBand = new THREE.Mesh(unitBoxGeo, secondaryWallMat);
    fasciaBand.scale.set(w + 0.18, fasciaBandH, d + 0.18);
    fasciaBand.position.y = h - fasciaBandH / 2;
    fasciaBand.castShadow = true;
    group.add(fasciaBand);

    pushInstance(
      accentBoxInstances,
      groupWorldMat,
      0,
      h - fasciaBandH - 0.11,
      0,
      w + 0.24,
      0.22,
      d + 0.24,
      0,
      0,
      0,
      profile.safetyAccentTint,
    );

    // ---------------------------------------------------------
    // 2. STRUCTURAL PORTAL COLUMNS, PILASTERS & CORNER BRACING
    // ---------------------------------------------------------
    const colsX = Math.max(3, Math.round(w / 4.2));
    const colsZ = Math.max(3, Math.round(d / 4.4));
    const colThick = profile.archetype === 'marine_cargo_depot' ? 0.56 : 0.36;
    const colBucket = profile.archetype === 'marine_cargo_depot' ? concreteBoxInstances : steelBoxInstances;
    const colColor =
      profile.archetype === 'marine_cargo_depot' ? profile.plinthConcreteTint : profile.steelFrameTint;

    for (let i = 0; i <= colsX; i++) {
      const lx = -halfW + (i / colsX) * w;
      for (const sz of [-1, 1]) {
        pushInstance(
          colBucket,
          groupWorldMat,
          lx,
          h / 2,
          sz * (halfD + colThick * 0.28),
          colThick,
          h,
          colThick * 0.65,
          0,
          0,
          0,
          colColor,
        );
      }
    }
    for (let j = 1; j < colsZ; j++) {
      const lz = -halfD + (j / colsZ) * d;
      for (const sx of [-1, 1]) {
        pushInstance(
          colBucket,
          groupWorldMat,
          sx * (halfW + colThick * 0.28),
          h / 2,
          lz,
          colThick * 0.65,
          h,
          colThick,
          0,
          0,
          0,
          colColor,
        );
      }
    }

    // Wall steel diagonal X-bracing bays (for Main Freight Distribution Warehouse)
    if (profile.hasWallXBracing) {
      const braceH = upperH - 1.2;
      const bayW = w / colsX;
      const braceLen = Math.hypot(bayW * 0.88, braceH);
      const braceAngle = Math.atan2(braceH, bayW * 0.88);
      for (const bayIdx of [0, colsX - 1]) {
        const bx = -halfW + (bayIdx + 0.5) * bayW;
        const by = plinthH + 0.4 + braceH / 2;
        for (const sz of [-1, 1]) {
          const bz = sz * (halfD + 0.14);
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            bx,
            by,
            bz,
            braceLen,
            0.14,
            0.10,
            0,
            0,
            braceAngle,
            profile.steelFrameTint,
          );
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            bx,
            by,
            bz,
            braceLen,
            0.14,
            0.10,
            0,
            0,
            -braceAngle,
            profile.steelFrameTint,
          );
        }
      }
    }

    // ---------------------------------------------------------
    // 3. DISTINCT INDUSTRIAL ROOF SILHOUETTES & ROOFTOP EQUIPMENT
    // ---------------------------------------------------------
    if (profile.roofType === 'steel_gable_monitor') {
      // Low-slope industrial steel gable roof + raised central ridge ventilation monitor
      const gableH = 1.95;
      const gableRoof = new THREE.Mesh(gableRoofGeo, roofMat);
      gableRoof.scale.set(w + 0.7, gableH, d + 0.9);
      gableRoof.position.y = h - 0.12;
      gableRoof.castShadow = true;
      gableRoof.receiveShadow = true;
      group.add(gableRoof);
      environmentMeshesForCamera.push(gableRoof);

      // Raised ridge louver ventilation monitor running along the center ridge
      const monW = w * 0.68;
      const monH = 1.15;
      const monD = 2.6;
      const monBaseY = h + gableH - 0.45;
      const monitorBody = new THREE.Mesh(unitBoxGeo, secondaryWallMat);
      monitorBody.scale.set(monW, monH, monD);
      monitorBody.position.y = monBaseY + monH / 2;
      monitorBody.castShadow = true;
      group.add(monitorBody);

      const monitorCap = new THREE.Mesh(gableRoofGeo, roofMat);
      monitorCap.scale.set(monW + 0.5, 0.55, monD + 0.65);
      monitorCap.position.y = monBaseY + monH - 0.05;
      group.add(monitorCap);

      // Louver slats on monitor sides
      for (const sz of [-1, 1]) {
        pushInstance(
          galvanizedBoxInstances,
          groupWorldMat,
          0,
          monBaseY + monH * 0.5,
          sz * (monD / 2 + 0.06),
          monW * 0.88,
          monH * 0.55,
          0.1,
          0,
          0,
          0,
          0x9aa6b2,
        );
      }

      // Roof-edge steel gutters & vertical downpipes along both long eaves
      for (const sz of [-1, 1]) {
        const eaveZ = sz * (halfD + 0.48);
        pushInstance(
          galvanizedBoxInstances,
          groupWorldMat,
          0,
          h + 0.16,
          eaveZ,
          w + 0.8,
          0.20,
          0.22,
          0,
          0,
          0,
          0x64748b,
        );
        for (const dx of [-halfW + 0.55, halfW - 0.55]) {
          pushInstance(
            pipeCylInstances,
            groupWorldMat,
            dx,
            h / 2,
            sz * (halfD + 0.24),
            0.16,
            h + 0.15,
            0.16,
            0,
            0,
            0,
            0x748292,
          );
        }
      }

      // Rooftop rotary exhaust cowls & compact HVAC air-handler grounded on roof slope
      for (const vx of [-w * 0.34, 0, w * 0.34]) {
        pushInstance(
          roofVentInstances,
          groupWorldMat,
          vx,
          monBaseY + monH + 0.36,
          0,
          0.95,
          0.95,
          0.95,
          0,
          0,
          0,
          0x9ca7b4,
        );
      }
      // Side rooftop HVAC box mounted on level steel curb
      pushInstance(
        galvanizedBoxInstances,
        groupWorldMat,
        w * 0.28,
        h + 1.05,
        -d * 0.26,
        2.6,
        1.25,
        1.9,
        0,
        0,
        0,
        0x8b98a6,
      );
      pinnacleY = monBaseY + monH + 1.32;
    } else if (profile.roofType === 'sawtooth_clerestory') {
      // Twin-bay industrial sawtooth clerestory monitor roof (distinct silhouette!)
      const parapetH = 0.55;
      // Perimeter concrete parapet curb
      for (const sz of [-1, 1]) {
        pushInstance(
          concreteBoxInstances,
          groupWorldMat,
          0,
          h + parapetH / 2,
          sz * (halfD - 0.18),
          w + 0.24,
          parapetH,
          0.42,
          0,
          0,
          0,
          profile.plinthConcreteTint,
        );
      }
      for (const sx of [-1, 1]) {
        pushInstance(
          concreteBoxInstances,
          groupWorldMat,
          sx * (halfW - 0.18),
          h + parapetH / 2,
          0,
          0.42,
          parapetH,
          d + 0.24,
          0,
          0,
          0,
          profile.plinthConcreteTint,
        );
      }

      // Two parallel sawtooth north-light bays spanning X
      const bayDepth = (d - 1.2) / 2;
      const sawH = 2.15;
      for (let bi = 0; bi < 2; bi++) {
        const bz = -halfD + 0.6 + (bi + 0.5) * bayDepth;
        const sawMesh = new THREE.Mesh(sawtoothRoofGeo, roofMat);
        sawMesh.scale.set(w - 0.5, sawH, bayDepth);
        sawMesh.position.set(0, h, bz);
        sawMesh.castShadow = true;
        sawMesh.receiveShadow = true;
        group.add(sawMesh);
        environmentMeshesForCamera.push(sawMesh);

        // Proud clerestory daylight glazing strip on the vertical -Z face of each sawtooth bay
        const glassStrip = new THREE.Mesh(unitBoxGeo, clerestoryGlassMat);
        glassStrip.scale.set(w - 1.4, sawH * 0.62, 0.14);
        glassStrip.position.set(0, h + sawH * 0.52, bz - bayDepth / 2 - 0.04);
        group.add(glassStrip);

        // Steel glazing mullions across sawtooth clerestory
        for (let m = -3; m <= 3; m++) {
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            (m / 4) * (w - 2.0),
            h + sawH * 0.52,
            bz - bayDepth / 2 - 0.09,
            0.14,
            sawH * 0.68,
            0.12,
            0,
            0,
            0,
            profile.steelFrameTint,
          );
        }
      }

      // High wall clerestory daylight bands on both -Z and +Z facades (mounted proud with steel frames)
      for (const sz of [-1, 1]) {
        const bandY = h - 1.75;
        const bandZ = sz * (halfD + 0.05);
        const wallGlass = new THREE.Mesh(unitBoxGeo, clerestoryGlassMat);
        wallGlass.scale.set(w - 2.4, 1.25, 0.12);
        wallGlass.position.set(0, bandY, bandZ);
        group.add(wallGlass);

        // Steel header & sill frame around clerestory strip
        for (const dy of [-0.66, 0.66]) {
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            0,
            bandY + dy,
            sz * (halfD + 0.12),
            w - 2.1,
            0.16,
            0.22,
            0,
            0,
            0,
            profile.steelFrameTint,
          );
        }
      }

      // Rooftop exhaust turbine vents & galvanized twin ventilation ducts
      for (const vx of [-4.2, 0, 4.2]) {
        pushInstance(
          roofVentInstances,
          groupWorldMat,
          vx,
          h + sawH - 0.08,
          -bayDepth * 0.5 - 0.05,
          0.95,
          1.15,
          0.95,
          0,
          0,
          0,
          0xadb8c4,
        );
      }
      // Cylindrical galvanized exhaust stacks on southern roof bay
      for (const sx of [-3.4, 3.4]) {
        pushInstance(
          pipeCylInstances,
          groupWorldMat,
          sx,
          h + 1.55,
          halfD - 1.65,
          0.62,
          2.2,
          0.62,
          0,
          0,
          0,
          0x94a3b8,
        );
      }
      pinnacleY = h + sawH + 1.08;
    } else {
      // Cold Storage Facility: Heavy flat parapet roof + prominent rooftop refrigeration chiller deck,
      // twin evaporative condenser fan banks, insulated overhead ductwork, and perimeter safety railings
      const parapetH = 0.72;
      for (const sz of [-1, 1]) {
        pushInstance(
          steelBoxInstances,
          groupWorldMat,
          0,
          h + parapetH / 2,
          sz * (halfD - 0.16),
          w + 0.28,
          parapetH,
          0.38,
          0,
          0,
          0,
          profile.steelFrameTint,
        );
      }
      for (const sx of [-1, 1]) {
        pushInstance(
          steelBoxInstances,
          groupWorldMat,
          sx * (halfW - 0.16),
          h + parapetH / 2,
          0,
          0.38,
          parapetH,
          d + 0.28,
          0,
          0,
          0,
          profile.steelFrameTint,
        );
      }

      // Roof deck dark industrial membrane slab
      const roofSlab = new THREE.Mesh(unitBoxGeo, roofMat);
      roofSlab.scale.set(w - 0.5, 0.24, d - 0.5);
      roofSlab.position.y = h + 0.08;
      roofSlab.receiveShadow = true;
      group.add(roofSlab);
      environmentMeshesForCamera.push(roofSlab);

      // Raised steel mechanical chiller plant penthouse enclosure (central-west)
      const plantW = 6.2;
      const plantH = 2.35;
      const plantD = 9.2;
      const plantBox = new THREE.Mesh(unitBoxGeo, secondaryWallMat);
      plantBox.scale.set(plantW, plantH, plantD);
      plantBox.position.set(-1.8, h + 0.2 + plantH / 2, -2.0);
      plantBox.castShadow = true;
      group.add(plantBox);
      environmentMeshesForCamera.push(plantBox);

      // Plant louver intake grilles on east & west faces
      for (const sx of [-1, 1]) {
        pushInstance(
          galvanizedBoxInstances,
          groupWorldMat,
          -1.8 + sx * (plantW / 2 + 0.06),
          h + 0.2 + plantH * 0.52,
          -2.0,
          0.12,
          1.35,
          plantD * 0.72,
          0,
          0,
          0,
          0x94a3b8,
        );
      }

      // Twin evaporative condenser fan banks (south half of roof)
      for (const cz of [4.8, 7.8]) {
        pushInstance(
          galvanizedBoxInstances,
          groupWorldMat,
          0.8,
          h + 0.2 + 0.95,
          cz,
          7.6,
          1.9,
          2.1,
          0,
          0,
          0,
          0x9aa7b5,
        );
        // Three circular condenser fan shrouds atop each bank
        for (const fx of [-1.7, 0.8, 3.3]) {
          pushInstance(
            pipeCylInstances,
            groupWorldMat,
            fx,
            h + 0.2 + 2.15,
            cz,
            1.45,
            0.52,
            1.45,
            0,
            0,
            0,
            0x334155,
          );
        }
      }

      // Insulated overhead galvanized refrigerant ductwork trunks connecting chiller enclosure to fan banks
      for (const dx of [-0.5, 2.2]) {
        pushInstance(
          galvanizedBoxInstances,
          groupWorldMat,
          dx,
          h + 1.45,
          2.1,
          0.78,
          0.78,
          7.8,
          0,
          0,
          0,
          0xb4c0cc,
        );
      }

      // Rooftop safety exhaust cowls atop chiller enclosure
      for (const vz of [-4.6, -2.0, 0.6]) {
        pushInstance(
          roofVentInstances,
          groupWorldMat,
          -1.8,
          h + 0.2 + plantH,
          vz,
          1.05,
          1.05,
          1.05,
          0,
          0,
          0,
          0xaab6c2,
        );
      }

      // Grounded steel safety guardrail (top rail, mid rail, and vertical stanchions anchored into parapet)
      const parapetTopY = h + parapetH;
      const railSpan = d - 2.4;
      const railTopY = parapetTopY + 0.92;
      const railMidY = parapetTopY + 0.46;
      for (const sx of [-1, 1]) {
        const rx = sx * (halfW - 0.16);
        // Top & mid yellow safety rails
        pushInstance(
          accentBoxInstances,
          groupWorldMat,
          rx,
          railTopY,
          0,
          0.07,
          0.07,
          railSpan,
          0,
          0,
          0,
          0xeab308,
        );
        pushInstance(
          accentBoxInstances,
          groupWorldMat,
          rx,
          railMidY,
          0,
          0.05,
          0.05,
          railSpan,
          0,
          0,
          0,
          0xeab308,
        );
        // Grounded vertical stanchion posts anchored solidly into the steel parapet
        const postCount = 8;
        for (let pi = 0; pi <= postCount; pi++) {
          const pz = -railSpan / 2 + (pi / postCount) * railSpan;
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            rx,
            parapetTopY + 0.46,
            pz,
            0.07,
            0.94,
            0.07,
            0,
            0,
            0,
            0x334155,
          );
        }
      }
      pinnacleY = h + 0.2 + plantH + 1.05;
    }

    // ---------------------------------------------------------
    // 4. LOADING DOCK BAYS, ROLLER SHUTTERS, CANOPIES & SAFETY MARKINGS
    // ---------------------------------------------------------
    const buildLoadingFrontage = (
      axis: IndustrialFrontageAxis,
      bayCount: number,
      dockProj: number,
      canopyProj: number,
    ) => {
      const yaw = frontageYaw(axis);
      const isXAxis = axis === '+x' || axis === '-x';
      const faceSpan = isXAxis ? d : w;
      const halfOut = isXAxis ? halfW : halfD;

      const faceGroup = new THREE.Group();
      faceGroup.rotation.y = yaw;
      group.add(faceGroup);
      faceGroup.updateMatrixWorld(true);
      const faceWorldMat = faceGroup.matrixWorld.clone();

      // Update world bounds accurately for automated clearance tests
      const maxProj = Math.max(dockProj, canopyProj);
      if (axis === '+x') expandBounds(halfW + maxProj, 0);
      else if (axis === '-x') expandBounds(-halfW - maxProj, 0);
      else if (axis === '+z') expandBounds(0, halfD + maxProj);
      else if (axis === '-z') expandBounds(0, -halfD - maxProj);

      // Grounded reinforced concrete loading dock platform (sits flush at y = 0, top at y = 1.15m)
      const dockH = 1.15;
      const dockW = faceSpan - 1.6;
      const dockPlatform = new THREE.Mesh(unitBoxGeo, plinthMat);
      dockPlatform.scale.set(dockW, dockH, dockProj);
      dockPlatform.position.set(0, dockH / 2, halfOut + dockProj / 2);
      dockPlatform.castShadow = true;
      dockPlatform.receiveShadow = true;
      faceGroup.add(dockPlatform);
      environmentMeshesForCamera.push(dockPlatform);

      // Yellow-and-black hazard safety stripe band along front vertical face of dock lip
      const hazardBand = new THREE.Mesh(unitBoxGeo, hazardStripeMat);
      hazardBand.scale.set(dockW + 0.04, 0.34, 0.08);
      hazardBand.position.set(0, dockH - 0.17, halfOut + dockProj + 0.03);
      faceGroup.add(hazardBand);

      // Ground-level yellow-black loading-zone apron safety curb marking just beyond dock
      const apronStripe = new THREE.Mesh(unitBoxGeo, hazardStripeMat);
      apronStripe.scale.set(dockW, 0.05, 0.32);
      apronStripe.position.set(0, 0.03, halfOut + dockProj + 0.24);
      faceGroup.add(apronStripe);

      // Grounded steel side access steps tucked cleanly at dock cheek (with anchored vertical posts + handrail)
      const stairStartX = dockW / 2 + 0.13;
      const stairZ = halfOut + dockProj * 0.52;
      for (let st = 0; st < 4; st++) {
        // Descend from dock (st=0 highest) down to ground (st=3 lowest)
        const stepH = ((4 - st) / 4) * dockH;
        pushInstance(
          steelBoxInstances,
          faceWorldMat,
          stairStartX + st * 0.26,
          stepH / 2,
          stairZ,
          0.26,
          stepH,
          0.92,
          0,
          0,
          0,
          profile.steelFrameTint,
        );
      }
      // Vertical steel newel posts anchoring the yellow stair handrail at top & bottom
      const railZ = stairZ + 0.44;
      pushInstance(
        steelBoxInstances,
        faceWorldMat,
        stairStartX - 0.08,
        dockH + 0.45,
        railZ,
        0.07,
        0.92,
        0.07,
        0,
        0,
        0,
        profile.steelFrameTint,
      );
      pushInstance(
        steelBoxInstances,
        faceWorldMat,
        stairStartX + 0.88,
        0.52,
        railZ,
        0.07,
        1.04,
        0.07,
        0,
        0,
        0,
        profile.steelFrameTint,
      );
      // Sloped yellow safety handrail connecting top post to bottom post
      pushInstance(
        accentBoxInstances,
        faceWorldMat,
        stairStartX + 0.40,
        dockH * 0.5 + 0.90,
        railZ,
        1.32,
        0.07,
        0.07,
        0,
        0,
        -0.78,
        0xeab308,
      );

      // Protective cantilevered sloped steel loading canopy spanning across all loading bays
      const canopyW = dockW + 0.4;
      const canopyY = 5.35;
      const canopyMesh = new THREE.Mesh(dockCanopyGeo, roofMat);
      canopyMesh.scale.set(canopyW, 0.85, canopyProj);
      canopyMesh.position.set(0, canopyY, halfOut);
      canopyMesh.castShadow = true;
      canopyMesh.receiveShadow = true;
      faceGroup.add(canopyMesh);

      // Safety accent drip fascia on front edge of loading canopy
      pushInstance(
        accentBoxInstances,
        faceWorldMat,
        0,
        canopyY + 0.16,
        halfOut + canopyProj + 0.04,
        canopyW + 0.06,
        0.22,
        0.08,
        0,
        0,
        0,
        profile.safetyAccentTint,
      );

      // Individual loading bays: roller-shutter door, recessed steel jambs, dock shelter seals,
      // steel dock leveller plate, twin rubber dock bumpers, yellow safety bollards & overhead dock lamp
      const usableSpan = dockW - 2.2;
      const spacing = usableSpan / bayCount;
      const doorW = Math.min(3.55, spacing * 0.74);
      const doorH = 3.75;

      for (let bi = 0; bi < bayCount; bi++) {
        const bx = -usableSpan / 2 + (bi + 0.5) * spacing;

        // Roller-shutter steel door mounted cleanly proud of wall (never buried!)
        const shutter = new THREE.Mesh(unitBoxGeo, rollerShutterMat);
        shutter.scale.set(doorW, doorH, 0.16);
        shutter.position.set(bx, dockH + doorH / 2, halfOut + 0.08);
        faceGroup.add(shutter);

        // Deep 3D steel door jambs + header hood (or airtight black rubber dock seals for Cold Storage)
        const isColdSeal = profile.archetype === 'cold_storage_logistics';
        const frameBucket = isColdSeal ? rubberBoxInstances : steelBoxInstances;
        const frameColor = isColdSeal ? 0x1d232a : profile.steelFrameTint;
        const frameDepth = isColdSeal ? 0.52 : 0.34;
        const frameThick = isColdSeal ? 0.36 : 0.24;

        for (const side of [-1, 1]) {
          pushInstance(
            frameBucket,
            faceWorldMat,
            bx + side * (doorW / 2 + frameThick * 0.42),
            dockH + doorH / 2,
            halfOut + frameDepth / 2,
            frameThick,
            doorH + 0.25,
            frameDepth,
            0,
            0,
            0,
            frameColor,
          );
        }
        // Overhead roller-drum box / airtight dock shelter header
        pushInstance(
          frameBucket,
          faceWorldMat,
          bx,
          dockH + doorH + 0.24,
          halfOut + frameDepth / 2 + 0.04,
          doorW + frameThick * 2,
          0.46,
          frameDepth + 0.1,
          0,
          0,
          0,
          frameColor,
        );

        // Steel dock leveller ramp plate embedded on top of dock platform
        pushInstance(
          galvanizedBoxInstances,
          faceWorldMat,
          bx,
          dockH + 0.04,
          halfOut + dockProj - 0.55,
          doorW * 0.76,
          0.08,
          1.15,
          0,
          0,
          0,
          0x64748b,
        );

        // Twin heavy rubber truck dock bumpers mounted on front face of concrete dock
        for (const side of [-1, 1]) {
          pushInstance(
            rubberBoxInstances,
            faceWorldMat,
            bx + side * (doorW * 0.42),
            dockH - 0.26,
            halfOut + dockProj + 0.12,
            0.34,
            0.52,
            0.22,
            0,
            0,
            0,
            0x181c22,
          );
        }

        // Steel knee-brace gusset brackets supporting the loading canopy
        pushInstance(
          gussetInstances,
          faceWorldMat,
          bx - doorW / 2 - 0.28,
          canopyY - 0.92,
          halfOut,
          0.18,
          1.15,
          canopyProj * 0.78,
          0,
          0,
          0,
          profile.steelFrameTint,
        );

        // Exterior overhead industrial floodlight fixture under canopy above each loading bay
        pushInstance(
          steelBoxInstances,
          faceWorldMat,
          bx,
          canopyY - 0.04,
          halfOut + canopyProj * 0.72,
          0.52,
          0.14,
          0.26,
          0,
          0,
          0,
          0x27303a,
        );
        pushInstance(
          isColdSeal ? coolLampInstances : warmLampInstances,
          faceWorldMat,
          bx,
          canopyY - 0.13,
          halfOut + canopyProj * 0.72,
          0.40,
          0.08,
          0.18,
          0,
          0,
          0,
          isColdSeal ? 0xe0f2fe : 0xfef3c7,
        );

        // Crisp loading bay number plate mounted on canopy front fascia above each bay
        const bayAccentCss = '#' + profile.safetyAccentTint.toString(16).padStart(6, '0');
        const bayLabel = isColdSeal ? `B${bi + 1}` : `0${bi + 1}`;
        const bayTex = createBayNumberTexture(bayLabel, bayAccentCss, disposables);
        const bayPlateMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: bayTex,
          roughness: 0.42,
          metalness: 0.22,
        });
        const bayPlateGeo = new THREE.PlaneGeometry(0.76, 0.56);
        disposables.push(bayPlateMat, bayPlateGeo);
        const bayPlate = new THREE.Mesh(bayPlateGeo, bayPlateMat);
        bayPlate.position.set(bx, canopyY + 0.18, halfOut + canopyProj + 0.10);
        faceGroup.add(bayPlate);
      }

      // Final right-side gusset bracket
      pushInstance(
        gussetInstances,
        faceWorldMat,
        usableSpan / 2 + 0.18,
        canopyY - 0.92,
        halfOut,
        0.18,
        1.15,
        canopyProj * 0.78,
        0,
        0,
        0,
        profile.steelFrameTint,
      );

      // Protective yellow steel safety bollards flanking the loading dock corners
      for (const side of [-1, 1]) {
        pushInstance(
          bollardCylInstances,
          faceWorldMat,
          side * (dockW / 2 - 0.25),
          0.55,
          halfOut + dockProj + 0.28,
          0.24,
          1.1,
          0.24,
          0,
          0,
          0,
          0xeab308,
        );
      }
    };

    buildLoadingFrontage(
      profile.primaryFrontage,
      profile.loadingBayCount,
      profile.dockProjection,
      profile.canopyProjection,
    );

    // ---------------------------------------------------------
    // 5. SECONDARY FACADE: PERSONNEL ENTRANCES, SECURITY SHUTTERS,
    //    EXTERNAL PIPEWORK, CONDUITS & COLD-STORAGE CONDENSER PLANT
    // ---------------------------------------------------------
    const buildSecondaryFeatures = () => {
      if (profile.secondaryFrontage) {
        const secAxis = profile.secondaryFrontage;
        const yaw = frontageYaw(secAxis);
        const isXAxis = secAxis === '+x' || secAxis === '-x';
        const faceSpan = isXAxis ? d : w;
        const halfOut = isXAxis ? halfW : halfD;

        const secGroup = new THREE.Group();
        secGroup.rotation.y = yaw;
        group.add(secGroup);
        secGroup.updateMatrixWorld(true);
        const secWorldMat = secGroup.matrixWorld.clone();

        if (profile.hasRefrigerationPlant) {
          // West Pier Cold Storage Waterfront (-x) Exterior Refrigeration Plant & Vertical Pipework
          const padProj = 1.65;
          if (secAxis === '-x') expandBounds(-halfW - padProj, 0);
          else if (secAxis === '+x') expandBounds(halfW + padProj, 0);

          // Grounded concrete mechanical equipment pad
          const equipPad = new THREE.Mesh(unitBoxGeo, plinthMat);
          equipPad.scale.set(10.6, 0.42, padProj);
          equipPad.position.set(-1.2, 0.21, halfOut + padProj / 2);
          equipPad.castShadow = true;
          equipPad.receiveShadow = true;
          secGroup.add(equipPad);
          environmentMeshesForCamera.push(equipPad);

          // Twin heavy industrial refrigeration compressor / receiver tanks
          for (const tx of [-4.4, -1.6]) {
            pushInstance(
              galvanizedBoxInstances,
              secWorldMat,
              tx,
              1.65,
              halfOut + 0.88,
              2.2,
              2.45,
              1.25,
              0,
              0,
              0,
              0x94a3b8,
            );
            // Insulated steel pressure cylinder tank beside compressor
            pushInstance(
              pipeCylInstances,
              secWorldMat,
              tx + 1.35,
              1.75,
              halfOut + 0.85,
              0.72,
              2.55,
              0.72,
              0,
              0,
              0,
              0xcbd5e1,
            );
          }

          // Vertical insulated refrigerant riser pipes climbing cleanly to rooftop chiller deck
          for (const px of [-5.2, -4.6, -2.1, -1.5, 1.8, 2.3]) {
            pushInstance(
              pipeCylInstances,
              secWorldMat,
              px,
              h / 2 + 0.25,
              halfOut + 0.34,
              0.24,
              h + 0.3,
              0.24,
              0,
              0,
              0,
              0xb8c4d0,
            );
          }

          // Horizontal pipe manifold header & steel pipe-clamp brackets
          for (const py of [3.4, 7.2]) {
            pushInstance(
              steelBoxInstances,
              secWorldMat,
              -1.4,
              py,
              halfOut + 0.26,
              8.6,
              0.20,
              0.32,
              0,
              0,
              0,
              profile.steelFrameTint,
            );
          }

          // Protective safety bollards guarding refrigeration plant pad
          for (const bx of [-6.0, -2.0, 2.0, 3.8]) {
            pushInstance(
              bollardCylInstances,
              secWorldMat,
              bx,
              0.52,
              halfOut + padProj + 0.22,
              0.22,
              1.04,
              0.22,
              0,
              0,
              0,
              0xeab308,
            );
          }

          // Service access door & subtle Cold Storage refrigeration warning placard (centered inside open bay between columns)
          const doorX = 4.4;
          pushInstance(
            steelBoxInstances,
            secWorldMat,
            doorX,
            1.25,
            halfOut + 0.08,
            1.35,
            2.5,
            0.16,
            0,
            0,
            0,
            0x364352,
          );
          const warnSign = new THREE.Mesh(unitBoxGeo, coldWarningMat);
          warnSign.scale.set(2.1, 1.05, 0.08);
          warnSign.position.set(doorX, 3.45, halfOut + 0.14);
          secGroup.add(warnSign);
          signMeshCount += 1;

          // Exterior bulkhead worklights along waterfront elevation
          for (const lx of [-4.8, 0.4, 4.4]) {
            pushInstance(
              coolLampInstances,
              secWorldMat,
              lx,
              4.6,
              halfOut + 0.24,
              0.42,
              0.16,
              0.18,
              0,
              0,
              0,
              0xe0f2fe,
            );
          }
        } else {
          // Street-facing secondary facade (Personnel dispatch entrance, security shutter, rain hood, pipework)
          const hoodProj = 1.05;
          if (secAxis === '-z') expandBounds(0, -halfD - hoodProj);
          else if (secAxis === '+z') expandBounds(0, halfD + hoodProj);

          // Personnel & dispatch office door with steel rain canopy
          const entryX = -faceSpan * 0.24;
          const stepMesh = new THREE.Mesh(unitBoxGeo, plinthMat);
          stepMesh.scale.set(2.6, 0.22, 0.95);
          stepMesh.position.set(entryX, 0.11, halfOut + 0.48);
          secGroup.add(stepMesh);

          pushInstance(
            steelBoxInstances,
            secWorldMat,
            entryX,
            1.35,
            halfOut + 0.09,
            1.5,
            2.45,
            0.16,
            0,
            0,
            0,
            0x273240,
          );
          // Door steel frame & small dispatch window
          pushInstance(
            accentBoxInstances,
            secWorldMat,
            entryX,
            2.65,
            halfOut + 0.14,
            1.85,
            0.18,
            0.22,
            0,
            0,
            0,
            profile.safetyAccentTint,
          );
          const hood = new THREE.Mesh(dockCanopyGeo, roofMat);
          hood.scale.set(2.8, 0.46, hoodProj);
          hood.position.set(entryX, 2.85, halfOut);
          secGroup.add(hood);

          // Industrial bulkhead light above personnel entrance
          pushInstance(
            warmLampInstances,
            secWorldMat,
            entryX,
            2.82,
            halfOut + 0.56,
            0.38,
            0.12,
            0.16,
            0,
            0,
            0,
            0xfef3c7,
          );

          // Secondary service shutter / marine equipment access bay on right side
          const serviceX = faceSpan * 0.22;
          const secShutter = new THREE.Mesh(unitBoxGeo, rollerShutterMat);
          secShutter.scale.set(3.2, 3.3, 0.16);
          secShutter.position.set(serviceX, 1.65, halfOut + 0.08);
          secGroup.add(secShutter);

          for (const side of [-1, 1]) {
            pushInstance(
              steelBoxInstances,
              secWorldMat,
              serviceX + side * 1.72,
              1.68,
              halfOut + 0.16,
              0.24,
              3.42,
              0.30,
              0,
              0,
              0,
              profile.steelFrameTint,
            );
            pushInstance(
              bollardCylInstances,
              secWorldMat,
              serviceX + side * 1.95,
              0.52,
              halfOut + 0.46,
              0.22,
              1.04,
              0.22,
              0,
              0,
              0,
              0xeab308,
            );
          }

          // External industrial electrical conduit pipes & steel junction boxes
          for (const cx of [-faceSpan * 0.42, 0.15, faceSpan * 0.44]) {
            pushInstance(
              pipeCylInstances,
              secWorldMat,
              cx,
              h * 0.46,
              halfOut + 0.18,
              0.12,
              h * 0.88,
              0.12,
              0,
              0,
              0,
              0x8594a3,
            );
          }
          pushInstance(
            galvanizedBoxInstances,
            secWorldMat,
            0.55,
            2.15,
            halfOut + 0.20,
            0.72,
            0.96,
            0.30,
            0,
            0,
            0,
            0x7c8a98,
          );

          // Two exterior safety bulkhead wall lights along street elevation
          for (const lx of [-faceSpan * 0.36, faceSpan * 0.22]) {
            pushInstance(
              warmLampInstances,
              secWorldMat,
              lx,
              4.35,
              halfOut + 0.22,
              0.44,
              0.18,
              0.20,
              0,
              0,
              0,
              0xfef3c7,
            );
          }
        }
      }

      // Marine Cargo Depot (`harbour_wh_2`): Add exterior steel roof-access ladder & side electrical conduits on -x (yard side, <= 0.65m projection -> >3.1m clear of container!)
      if (profile.archetype === 'marine_cargo_depot') {
        const ladX = -halfW - 0.24;
        const ladZ = -2.2;
        for (const dz of [-0.26, 0.26]) {
          pushInstance(
            steelBoxInstances,
            groupWorldMat,
            ladX,
            h / 2 + 0.3,
            ladZ + dz,
            0.08,
            h + 0.6,
            0.08,
            0,
            0,
            0,
            0x334155,
          );
        }
        for (let ry = 1.4; ry <= h + 0.2; ry += 0.65) {
          pushInstance(
            galvanizedBoxInstances,
            groupWorldMat,
            ladX,
            ry,
            ladZ,
            0.06,
            0.06,
            0.56,
            0,
            0,
            0,
            0x94a3b8,
          );
        }
        // Side cargo personnel entrance & security shutter facing container yard (-x, tight 0.35m projection)
        const sideShutter = new THREE.Mesh(unitBoxGeo, rollerShutterMat);
        sideShutter.rotation.y = -Math.PI / 2;
        sideShutter.scale.set(2.8, 3.1, 0.16);
        sideShutter.position.set(-halfW - 0.08, 1.55, 2.4);
        group.add(sideShutter);

        pushInstance(
          warmLampInstances,
          groupWorldMat,
          -halfW - 0.20,
          3.85,
          2.4,
          0.18,
          0.18,
          0.42,
          0,
          0,
          0,
          0xfef3c7,
        );
      }
    };

    buildSecondaryFeatures();

    // ---------------------------------------------------------
    // 6. CRISP READABLE INDUSTRIAL FACILITY SIGNAGE
    // ---------------------------------------------------------
    const accentCss = '#' + profile.safetyAccentTint.toString(16).padStart(6, '0');
    const signTex = createFacilitySignTextures(
      profile.signTitle,
      profile.signSubtitle,
      profile.facilityCode,
      accentCss,
      disposables,
    );
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: signTex.map,
      emissive: 0xdbeafe,
      emissiveMap: signTex.emissiveMap,
      emissiveIntensity: 0.08,
      roughness: 0.42,
      metalness: 0.18,
    });
    emissiveBuildingMaterials.push(signMat);
    disposables.push(signMat);
    signageMaterialCount += 1;

    const mountFacilitySign = (axis: IndustrialFrontageAxis, yCenter: number, signW: number, signH: number) => {
      const yaw = frontageYaw(axis);
      const isXAxis = axis === '+x' || axis === '-x';
      const halfOut = isXAxis ? halfW : halfD;

      const signGroup = new THREE.Group();
      signGroup.rotation.y = yaw;
      group.add(signGroup);
      signGroup.updateMatrixWorld(true);

      // Mount bolted steel backing plate cleanly proud of structural piers/pilasters so columns never clip lettering
      const signMountZ = halfOut + colThick * 0.62 + 0.08;
      pushInstance(
        steelBoxInstances,
        signGroup.matrixWorld,
        0,
        yCenter,
        signMountZ,
        signW + 0.24,
        signH + 0.22,
        0.14,
        0,
        0,
        0,
        0x1e293b,
      );

      // Readable graphic front plane
      const planeGeo = new THREE.PlaneGeometry(signW, signH);
      disposables.push(planeGeo);
      const signMesh = new THREE.Mesh(planeGeo, signMat);
      signMesh.position.set(0, yCenter, signMountZ + 0.09);
      signGroup.add(signMesh);
      signMeshCount += 1;

      // Subtle gooseneck sign-downlight brackets mounted above signage
      for (const sx of [-signW * 0.3, signW * 0.3]) {
        pushInstance(
          steelBoxInstances,
          signGroup.matrixWorld,
          sx,
          yCenter + signH / 2 + 0.18,
          signMountZ + 0.22,
          0.16,
          0.10,
          0.42,
          0,
          0,
          0,
          0x27303a,
        );
      }
    };

    // Mount crisp signage on primary loading frontage AND visible street/approach elevation
    if (profile.archetype === 'freight_distribution_terminal') {
      mountFacilitySign('+z', h - 2.25, 9.6, 1.75);
      mountFacilitySign('-z', h - 2.25, 9.6, 1.75);
    } else if (profile.archetype === 'marine_cargo_depot') {
      mountFacilitySign('-z', h - 3.68, 8.6, 1.48);
      mountFacilitySign('+z', h - 3.68, 8.6, 1.48);
    } else {
      // Cold Storage: +x long avenue elevation AND +z south elevation facing gantry crane & harbour approach!
      mountFacilitySign('+x', h - 2.4, 10.6, 1.85);
      mountFacilitySign('+z', h - 2.6, 8.8, 1.65);
    }

    root.add(group);

    summaries.push({
      id: spec.id,
      archetype: profile.archetype,
      facilityCode: profile.facilityCode,
      signTitle: profile.signTitle,
      primaryFrontage: profile.primaryFrontage,
      secondaryFrontage: profile.secondaryFrontage,
      roofType: profile.roofType,
      loadingBayCount: profile.loadingBayCount,
      dockProjection: profile.dockProjection,
      canopyProjection: profile.canopyProjection,
      signMeshCount,
      pinnacleY,
      worldBounds: {
        minX: minWorldX,
        maxX: maxWorldX,
        minZ: minWorldZ,
        maxZ: maxWorldZ,
      },
    });
  }

  // ---------------------------------------------------------
  // 7. FLUSH ALL REPEATED ARCHITECTURAL DETAILS INTO INSTANCEDMESHES
  // ---------------------------------------------------------
  let instancedBatches = 0;
  let totalFacadeInstances = 0;
  const tmpColor = new THREE.Color();

  const buildBatch = (
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.MeshStandardMaterial,
    entries: InstanceEntry[],
    castShadow = false,
  ) => {
    if (entries.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    mesh.name = name;
    for (let i = 0; i < entries.length; i++) {
      mesh.setMatrixAt(i, entries[i].matrix);
      mesh.setColorAt(i, tmpColor.setHex(entries[i].colorHex));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    disposables.push(mesh);
    root.add(mesh);
    instancedBatches += 1;
    totalFacadeInstances += entries.length;
  };

  buildBatch('industrial_harbour_inst_steel', unitBoxGeo, structuralSteelMat, steelBoxInstances, true);
  buildBatch('industrial_harbour_inst_galvanized', unitBoxGeo, galvanizedMetalMat, galvanizedBoxInstances, true);
  buildBatch('industrial_harbour_inst_concrete', unitBoxGeo, concreteMat, concreteBoxInstances, true);
  buildBatch('industrial_harbour_inst_accent', unitBoxGeo, safetyAccentMat, accentBoxInstances, false);
  buildBatch('industrial_harbour_inst_rubber', unitBoxGeo, rubberBumperMat, rubberBoxInstances, false);
  buildBatch('industrial_harbour_inst_pipes', unitCylGeo, galvanizedMetalMat, pipeCylInstances, false);
  buildBatch('industrial_harbour_inst_bollards', unitCylGeo, safetyAccentMat, bollardCylInstances, false);
  buildBatch('industrial_harbour_inst_gussets', gussetBracketGeo, structuralSteelMat, gussetInstances, false);
  buildBatch('industrial_harbour_inst_roof_vents', roofVentGeo, galvanizedMetalMat, roofVentInstances, true);
  buildBatch('industrial_harbour_inst_warm_lamps', unitBoxGeo, warmSodiumLampMat, warmLampInstances, false);
  buildBatch('industrial_harbour_inst_cool_lamps', unitBoxGeo, coolWorklightMat, coolLampInstances, false);

  return {
    warehouseCount: summaries.length,
    archetypesUsed: Array.from(new Set(summaries.map((s) => s.archetype))),
    totalLoadingBays: summaries.reduce((acc, s) => acc + s.loadingBayCount, 0),
    instancedBatches,
    totalFacadeInstances,
    sharedMaterialCount: sharedMaterials.length,
    signageMaterialCount,
    warehouses: summaries,
  };
}
