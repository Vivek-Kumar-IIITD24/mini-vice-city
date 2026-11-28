import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CityLayout, ROAD_COORDS, ROAD_WIDTH } from './cityData';
import { sampleShorelineContourX } from './coastalShorelineAssets';

export interface HarbourEnvironmentStats {
  harbourPropCount: number;
  harbourMachineryCount: number;
  harbourDockEquipmentCount: number;
  marinaVesselCount: number;
  mooringRopeCount: number;
  navigationBuoyCount: number;
  marinaSafetyPropCount: number;
  instancedBatches: number;
  sharedMaterialCount: number;
  customGeometryCount: number;
  vessels: MooredVesselSummary[];
  propFootprints: Array<{ x: number; z: number; radius: number; kind: string }>;
}

export interface MooredVesselSummary {
  id: string;
  name: string;
  vesselClass: 'cabin_cruiser' | 'center_console' | 'service_launch';
  x: number;
  y: number;
  z: number;
  heading: number;
  length: number;
  beam: number;
  shorelineX: number;
  shoreClearance: number;
  pierClearance: number;
}

export interface HarbourEnvironmentBuildContext {
  root: THREE.Group;
  layout: CityLayout;
  disposables: Array<{ dispose: () => void }>;
  oceanTimeUniform: { value: number };
  stormDarknessUniform: { value: number };
  nightFactorUniform: { value: number };
  maxAnisotropy?: number;
}

export const HARBOUR_CRANE_FOOTPRINTS = [
  { id: 'crane_north', minX: -128.6, maxX: -119.4, minZ: 39.4, maxZ: 48.6 },
  { id: 'crane_south', minX: -128.6, maxX: -119.4, minZ: 77.4, maxZ: 86.6 },
] as const;

export const MARINA_PIER_CLEAT_ANCHORS = {
  northEast: { x: 152.2, y: 0.49, z: 90.58 },
  northDolphin: { x: 153.65, y: 1.18, z: 90.75 },
  southEast: { x: 152.2, y: 0.49, z: 101.42 },
  southDolphin: { x: 153.65, y: 1.18, z: 101.25 },
} as const;

export const OCEAN_MEAN_WATER_Y = -0.75;

/**
 * Evaluates the exact mean coastal water elevation and instantaneous wave offset
 * synchronized with cityBuilder.ts oceanMaterial at world (x, z, t).
 */
export function evaluateOceanWaterY(
  worldX: number,
  worldZ: number,
  timeSec = 0,
  stormDarkness = 0,
): number {
  const localX = worldX - 160;
  const swellAmp = 1.0 + stormDarkness * 0.55;
  const ph1 = localX * 0.045 + timeSec * 1.15;
  const ph2 = worldZ * 0.055 + timeSec * 0.85;
  const ph3 = localX * 0.032 - worldZ * 0.038 + timeSec * 1.45;
  const wave =
    (Math.sin(ph1) * 0.24 + Math.cos(ph2) * 0.18 + Math.sin(ph3) * 0.09) * swellAmp;
  return OCEAN_MEAN_WATER_Y + wave;
}

export function evaluateBuoyantWaterlineY(
  worldX: number,
  worldZ: number,
  timeSec = 0,
  stormDarkness = 0,
): number {
  // Vessels settle slightly into surface troughs while riding half the long-period swell
  return (
    OCEAN_MEAN_WATER_Y +
    (evaluateOceanWaterY(worldX, worldZ, timeSec, stormDarkness) - OCEAN_MEAN_WATER_Y) * 0.42
  );
}

/**
 * Evaluates a point along a 3D sagging catenary mooring rope between two anchor coordinates.
 */
export function sampleCatenaryPoint(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  t: number,
  sagMeters: number,
): THREE.Vector3 {
  const clamped = Math.max(0, Math.min(1, t));
  const sag = 4 * clamped * (1 - clamped) * sagMeters;
  return new THREE.Vector3(
    a.x + (b.x - a.x) * clamped,
    a.y + (b.y - a.y) * clamped - sag,
    a.z + (b.z - a.z) * clamped,
  );
}

function sanitizeGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
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
    throw new Error('Failed to merge harbour environment geometries');
  }
  return sanitizeGeometry(merged);
}

function makeCanvasOrFallback(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  fallbackRgb: [number, number, number, number],
  srgb: boolean,
  aniso: number,
): THREE.Texture {
  if (typeof document === 'undefined') {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fallbackRgb[0];
      data[i + 1] = fallbackRgb[1];
      data[i + 2] = fallbackRgb[2];
      data[i + 3] = fallbackRgb[3];
    }
    const dt = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
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
  tex.anisotropy = Math.min(8, Math.max(1, aniso));
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// CUSTOM PROCEDURAL GEOMETRIES (Verified Finite & Normalized Outward Normals)
// ---------------------------------------------------------------------------

/**
 * Sculpted deep-V watercraft hull oriented along +X (stern at -halfL, flared bow at +halfL),
 * with waterline at y = 0, keel at -draft, and cambered gunwale sheer rising toward the bow.
 */
export function createWatercraftHullGeometry(
  length: number,
  beam: number,
  draft: number,
  freeboard: number,
): THREE.BufferGeometry {
  const halfL = length * 0.5;
  const halfB = beam * 0.5;
  const stations = [
    { u: 0.0, w: 0.84, keelY: -draft * 0.62, chineY: -draft * 0.14, deckY: freeboard * 0.88, flare: 0.94 },
    { u: 0.16, w: 0.96, keelY: -draft * 0.78, chineY: -draft * 0.2, deckY: freeboard * 0.9, flare: 0.98 },
    { u: 0.38, w: 1.0, keelY: -draft * 0.92, chineY: -draft * 0.22, deckY: freeboard * 0.94, flare: 1.0 },
    { u: 0.62, w: 0.9, keelY: -draft * 0.95, chineY: -draft * 0.16, deckY: freeboard * 1.0, flare: 1.04 },
    { u: 0.82, w: 0.58, keelY: -draft * 0.72, chineY: -draft * 0.02, deckY: freeboard * 1.12, flare: 1.08 },
    { u: 0.95, w: 0.22, keelY: -draft * 0.34, chineY: freeboard * 0.18, deckY: freeboard * 1.22, flare: 1.1 },
    { u: 1.0, w: 0.02, keelY: freeboard * 0.12, chineY: freeboard * 0.55, deckY: freeboard * 1.26, flare: 1.0 },
  ];

  // Cross-section profile from port gunwale -> port chine -> keel -> stbd chine -> stbd gunwale
  const ringPoint = (st: (typeof stations)[number], ringIdx: number): [number, number, number] => {
    const x = -halfL + st.u * length;
    const hb = halfB * st.w;
    switch (ringIdx) {
      case 0:
        return [x, st.deckY, -hb * st.flare]; // port sheer
      case 1:
        return [x, st.chineY, -hb * 0.88]; // port chine
      case 2:
        return [x, st.keelY, 0]; // keel centerline
      case 3:
        return [x, st.chineY, hb * 0.88]; // starboard chine
      case 4:
      default:
        return [x, st.deckY, hb * st.flare]; // starboard sheer
    }
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    ua: [number, number],
    ub: [number, number],
    uc: [number, number],
  ) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uvs.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  };

  for (let s = 0; s < stations.length - 1; s++) {
    const st0 = stations[s];
    const st1 = stations[s + 1];
    // Hull outer skin quads (wound outward away from interior)
    for (let r = 0; r < 4; r++) {
      const a = ringPoint(st0, r);
      const b = ringPoint(st1, r);
      const c = ringPoint(st1, r + 1);
      const d = ringPoint(st0, r + 1);
      const v0 = r / 4;
      const v1 = (r + 1) / 4;
      pushTri(a, b, c, [st0.u, v0], [st1.u, v0], [st1.u, v1]);
      pushTri(a, c, d, [st0.u, v0], [st1.u, v1], [st0.u, v1]);
    }
    // Foredeck / sheer cap closing top between port sheer (0) and starboard sheer (4)
    const p0 = ringPoint(st0, 0);
    const p1 = ringPoint(st1, 0);
    const s1 = ringPoint(st1, 4);
    const s0 = ringPoint(st0, 4);
    const crown0: [number, number, number] = [p0[0], st0.deckY + 0.05, 0];
    const crown1: [number, number, number] = [p1[0], st1.deckY + 0.05, 0];
    // Port top half (outward normal +Y: p0 -> s -> crown)
    pushTri(p0, crown0, crown1, [st0.u, 0.2], [st0.u, 0.5], [st1.u, 0.5]);
    pushTri(p0, crown1, p1, [st0.u, 0.2], [st1.u, 0.5], [st1.u, 0.2]);
    // Starboard top half (outward normal +Y)
    pushTri(crown0, s0, s1, [st0.u, 0.5], [st0.u, 0.8], [st1.u, 0.8]);
    pushTri(crown0, s1, crown1, [st0.u, 0.5], [st1.u, 0.8], [st1.u, 0.5]);
  }

  // Transom closure at stern (station 0, outward normal -X)
  const t0 = stations[0];
  const tp = ringPoint(t0, 0);
  const tpc = ringPoint(t0, 1);
  const tk = ringPoint(t0, 2);
  const tsc = ringPoint(t0, 3);
  const ts = ringPoint(t0, 4);
  const tcrown: [number, number, number] = [tp[0], t0.deckY + 0.05, 0];
  pushTri(tp, tpc, tk, [0, 0], [0, 0.4], [0.5, 1]);
  pushTri(tp, tk, tcrown, [0, 0], [0.5, 1], [0.5, 0]);
  pushTri(tcrown, tk, tsc, [0.5, 0], [0.5, 1], [1, 0.4]);
  pushTri(tcrown, tsc, ts, [0.5, 0], [1, 0.4], [1, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return sanitizeGeometry(geo);
}

/**
 * Curved wooden cargo shipping pallet (top deck boards, 3 stringers, bottom runners).
 */
export function createShippingPalletGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const bx of [-0.48, 0, 0.48]) {
    const stringer = new THREE.BoxGeometry(0.1, 0.1, 1.0);
    stringer.translate(bx, 0.07, 0);
    parts.push(stringer);
  }
  for (const bz of [-0.42, -0.21, 0, 0.21, 0.42]) {
    const topPlank = new THREE.BoxGeometry(1.16, 0.032, 0.14);
    topPlank.translate(0, 0.136, bz);
    parts.push(topPlank);
  }
  for (const bz of [-0.42, 0.42]) {
    const botPlank = new THREE.BoxGeometry(1.16, 0.025, 0.14);
    botPlank.translate(0, 0.0125, bz);
    parts.push(botPlank);
  }
  return mergeNormalizedParts(parts);
}

/**
 * Framed timber shipping crate with corner battens and diagonal X-brace cleat detail.
 */
export function createWoodenCrateGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const core = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  core.translate(0, 0.5, 0);
  parts.push(core);

  // Corner & top/bottom frame battens
  for (const sx of [-0.47, 0.47]) {
    for (const sz of [-0.47, 0.47]) {
      const post = new THREE.BoxGeometry(0.08, 1.0, 0.08);
      post.translate(sx, 0.5, sz);
      parts.push(post);
    }
  }
  for (const sy of [0.04, 0.96]) {
    for (const sz of [-0.47, 0.47]) {
      const barX = new THREE.BoxGeometry(1.0, 0.08, 0.08);
      barX.translate(0, sy, sz);
      parts.push(barX);
    }
    for (const sx of [-0.47, 0.47]) {
      const barZ = new THREE.BoxGeometry(0.08, 0.08, 1.0);
      barZ.translate(sx, sy, 0);
      parts.push(barZ);
    }
  }
  return mergeNormalizedParts(parts);
}

/**
 * Heavy industrial cable drum / timber reel with dual flanged cheeks and wound inner core.
 */
export function createCableReelGeometry(): {
  flangeGeo: THREE.BufferGeometry;
  coreGeo: THREE.BufferGeometry;
} {
  const flangeParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.34, 0.34]) {
    const cheek = new THREE.CylinderGeometry(0.58, 0.58, 0.08, 16);
    cheek.rotateZ(Math.PI / 2);
    cheek.translate(sx, 0.58, 0);
    flangeParts.push(cheek);
  }
  const hub = new THREE.CylinderGeometry(0.12, 0.12, 0.82, 10);
  hub.rotateZ(Math.PI / 2);
  hub.translate(0, 0.58, 0);
  flangeParts.push(hub);

  const core = new THREE.CylinderGeometry(0.41, 0.41, 0.6, 16);
  core.rotateZ(Math.PI / 2);
  core.translate(0, 0.58, 0);

  return {
    flangeGeo: mergeNormalizedParts(flangeParts),
    coreGeo: sanitizeGeometry(core),
  };
}

/**
 * Heavy-duty 2-tier industrial cargo storage rack (vertical uprights + cross-beams).
 */
export function createCargoRackGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const w = 2.8;
  const d = 1.05;
  const h = 2.65;
  for (const sx of [-w * 0.5, 0, w * 0.5]) {
    for (const sz of [-d * 0.5, d * 0.5]) {
      const col = new THREE.BoxGeometry(0.11, h, 0.11);
      col.translate(sx, h * 0.5, sz);
      parts.push(col);
    }
  }
  for (const ry of [0.18, 1.32, 2.48]) {
    for (const sz of [-d * 0.48, d * 0.48]) {
      const beam = new THREE.BoxGeometry(w + 0.08, 0.11, 0.08);
      beam.translate(0, ry, sz);
      parts.push(beam);
    }
    for (const sx of [-w * 0.46, -w * 0.22, w * 0.22, w * 0.46]) {
      const deck = new THREE.BoxGeometry(0.12, 0.06, d);
      deck.translate(sx, ry + 0.03, 0);
      parts.push(deck);
    }
  }
  return mergeNormalizedParts(parts);
}

/**
 * Catenary mooring rope TubeGeometry connecting two world anchors cleanly.
 */
export function createCatenaryRopeGeometry(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  sagMeters: number,
  radius = 0.038,
): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    pts.push(sampleCatenaryPoint(start, end, i / steps, sagMeters));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return sanitizeGeometry(new THREE.TubeGeometry(curve, 14, radius, 6, false));
}

/**
 * Marine channel / mooring buoy body (Lathe hull collar + conical daymark cage + mast).
 */
export function createNavigationBuoyGeometry(): {
  bodyGeo: THREE.BufferGeometry;
  beaconGeo: THREE.BufferGeometry;
} {
  const profile = [
    new THREE.Vector2(0, -0.55),
    new THREE.Vector2(0.32, -0.45),
    new THREE.Vector2(0.68, -0.05),
    new THREE.Vector2(0.72, 0.16),
    new THREE.Vector2(0.62, 0.28),
    new THREE.Vector2(0.28, 0.34),
    new THREE.Vector2(0.18, 1.35),
    new THREE.Vector2(0.26, 1.42),
    new THREE.Vector2(0.24, 1.56),
    new THREE.Vector2(0, 1.62),
  ];
  const bodyGeo = sanitizeGeometry(new THREE.LatheGeometry(profile, 14));
  const beaconGeo = sanitizeGeometry(
    new THREE.CylinderGeometry(0.11, 0.13, 0.18, 10).translate(0, 1.71, 0),
  );
  return { bodyGeo, beaconGeo };
}

/**
 * Marine rescue life-ring pedestal & torus ring assembly.
 */
export function createLifeRingPedestalParts(): {
  postGeo: THREE.BufferGeometry;
  ringGeo: THREE.BufferGeometry;
} {
  const postParts: THREE.BufferGeometry[] = [];
  const foot = new THREE.CylinderGeometry(0.16, 0.2, 0.08, 10);
  foot.translate(0, 0.04, 0);
  postParts.push(foot);

  const post = new THREE.CylinderGeometry(0.055, 0.065, 1.18, 10);
  post.translate(0, 0.63, 0);
  postParts.push(post);

  const board = new THREE.BoxGeometry(0.56, 0.56, 0.07);
  board.translate(0, 1.18, -0.03);
  postParts.push(board);

  const ringGeo = sanitizeGeometry(
    new THREE.TorusGeometry(0.24, 0.068, 10, 18).translate(0, 1.18, 0.06),
  );
  return { postGeo: mergeNormalizedParts(postParts), ringGeo };
}

// ---------------------------------------------------------------------------
// MAIN HARBOUR & MARINA ENVIRONMENT BUILDER
// ---------------------------------------------------------------------------

export function buildHarbourEnvironmentAssets(
  ctx: HarbourEnvironmentBuildContext,
): HarbourEnvironmentStats {
  const {
    root,
    layout,
    disposables,
    oceanTimeUniform,
    stormDarknessUniform,
    nightFactorUniform,
  } = ctx;
  const aniso = ctx.maxAnisotropy ?? 4;

  const harbourRoot = new THREE.Group();
  harbourRoot.name = 'harbour_environment_root';
  root.add(harbourRoot);

  const marinaRoot = new THREE.Group();
  marinaRoot.name = 'marina_watercraft_root';
  root.add(marinaRoot);

  // -------------------------------------------------------------------------
  // 1. PROCEDURAL TEXTURES & COMPACT PBR MATERIAL POOL
  // -------------------------------------------------------------------------
  const crateTex = makeCanvasOrFallback(
    256,
    256,
    (c, w, h) => {
      c.fillStyle = '#a77b4b';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#734f2c';
      c.lineWidth = 4;
      for (let y = 0; y < h; y += 32) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
      c.strokeStyle = '#5c3d20';
      c.lineWidth = 12;
      c.strokeRect(10, 10, w - 20, h - 20);
      c.beginPath();
      c.moveTo(16, 16);
      c.lineTo(w - 16, h - 16);
      c.stroke();
    },
    [167, 123, 75, 255],
    true,
    aniso,
  );
  const vesselBadgeTex = makeCanvasOrFallback(
    256,
    128,
    (c, w, h) => {
      c.fillStyle = '#0f2744';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#38bdf8';
      c.fillRect(0, h - 22, w, 22);
      c.fillStyle = '#f8fafc';
      c.font = 'bold 28px sans-serif';
      c.textAlign = 'center';
      c.fillText('VICE MARINA', w * 0.5, 48);
      c.font = 'bold 20px sans-serif';
      c.fillStyle = '#bae6fd';
      c.fillText('SLIP 01-03 • NO WAKE', w * 0.5, 86);
    },
    [15, 39, 68, 255],
    true,
    aniso,
  );
  disposables.push(crateTex, vesselBadgeTex);

  const woodCrateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: crateTex,
    roughness: 0.84,
    metalness: 0.04,
  });
  const palletTimberMat = new THREE.MeshStandardMaterial({
    color: 0x9c744c,
    roughness: 0.88,
    metalness: 0.03,
  });
  const industrialSteelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4858,
    roughness: 0.45,
    metalness: 0.72,
  });
  const galvanizedPipeMat = new THREE.MeshStandardMaterial({
    color: 0x9aa8b8,
    roughness: 0.34,
    metalness: 0.82,
  });
  const cargoBoxMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0.14,
  });
  const cableCoilMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.76,
    metalness: 0.12,
  });
  const dockWorkLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffd27d,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // Buoyant wave-synchronized vertex shader helper for ocean-floating hulls & buoys
  const attachBuoyancyWaveMotion = (
    mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    anchorX: number,
    anchorZ: number,
    phaseScale: number,
    cacheId: string,
  ) => {
    mat.customProgramCacheKey = () => `harbour_buoyancy_${cacheId}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = oceanTimeUniform;
      shader.uniforms.uStormDarkness = stormDarknessUniform;
      shader.vertexShader =
        `uniform float uTime;\nuniform float uStormDarkness;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float bSwell = (1.0 + uStormDarkness * 0.55) * ${phaseScale.toFixed(3)};
           float bPh1 = ${((anchorX - 160) * 0.045).toFixed(4)} + uTime * 1.15;
           float bPh2 = ${(anchorZ * 0.055).toFixed(4)} + uTime * 0.85;
           float bHeave = (sin(bPh1) * 0.24 + cos(bPh2) * 0.18) * 0.42 * bSwell;
           float bRoll = cos(bPh1) * 0.018 * bSwell;
           float bPitch = sin(bPh2) * 0.012 * bSwell;
           float ry = transformed.y - transformed.z * bRoll + transformed.x * bPitch + bHeave;
           float rz = transformed.z + transformed.y * bRoll;
           float rx = transformed.x - transformed.y * bPitch;
           transformed.xyz = vec3(rx, ry, rz);`,
        );
    };
  };

  // Marina material pool
  const hullWhiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf0f5,
    roughness: 0.28,
    metalness: 0.06,
    clearcoat: 0.82,
    clearcoatRoughness: 0.16,
  });
  const hullNavyMat = new THREE.MeshPhysicalMaterial({
    color: 0x163252,
    roughness: 0.24,
    metalness: 0.12,
    clearcoat: 0.82,
  });
  const hullTealMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e7490,
    roughness: 0.24,
    metalness: 0.1,
    clearcoat: 0.82,
  });
  const hullServiceMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.38,
    metalness: 0.22,
  });
  const deckTeakMat = new THREE.MeshStandardMaterial({
    color: 0xa67449,
    roughness: 0.78,
    metalness: 0.04,
  });
  const vesselGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x182b3a,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
  });
  const chromeRailMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const ropeLineMat = new THREE.MeshStandardMaterial({
    color: 0xc2ab87,
    roughness: 0.9,
    metalness: 0.02,
  });
  const lifeRingOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.42,
    metalness: 0.08,
  });
  const buoyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.18,
  });
  const navGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const marinaSignMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: vesselBadgeTex,
    roughness: 0.42,
    metalness: 0.1,
  });
  // Slight wave bob on buoys too
  attachBuoyancyWaveMotion(buoyMat, 169.0, 90.0, 0.85, 'buoys_v1');

  const sharedMaterials = [
    woodCrateMat,
    palletTimberMat,
    industrialSteelMat,
    galvanizedPipeMat,
    cargoBoxMat,
    cableCoilMat,
    dockWorkLightMat,
    hullWhiteMat,
    hullNavyMat,
    hullTealMat,
    hullServiceMat,
    deckTeakMat,
    vesselGlassMat,
    chromeRailMat,
    ropeLineMat,
    lifeRingOrangeMat,
    buoyMat,
    navGlowMat,
    marinaSignMat,
  ];
  disposables.push(...sharedMaterials);

  // Also keep dock work light slightly brighter at night without touching main bloom pool
  void nightFactorUniform;

  // -------------------------------------------------------------------------
  // 2. SPATIAL SAFETY HELPERS (Never overlap roads, sidewalks, cranes, containers, buildings)
  // -------------------------------------------------------------------------
  const isHarbourSpotClear = (x: number, z: number, radius = 1.6): boolean => {
    // Must stay west of -39 (Harbour districts)
    if (x > -42.5) return false;
    // Never enter driving roads or sidewalks
    const roadClearHalf = ROAD_WIDTH * 0.5 + radius;
    for (const rc of ROAD_COORDS) {
      if (Math.abs(x - rc) < roadClearHalf || Math.abs(z - rc) < roadClearHalf) return false;
    }
    // Protect block (-64, 64) raised sidewalks [21.25..24.75] from center (-64, 64)
    const dxBlock = Math.abs(x - -64);
    const dzBlock = Math.abs(z - 64);
    if (dxBlock <= 25.0 && dzBlock <= 25.0) {
      if (dxBlock >= 21.25 - radius || dzBlock >= 21.25 - radius) return false;
    }
    // Never overlap seawall perimeter (outer seawall at x=-139, z=±138)
    if (x < -137.4 + radius || z < 2.0 + radius || z > 88.5 - radius) return false;

    // Never overlap building colliders (including loading dock canopies/aprons)
    for (const col of layout.colliders) {
      const extraX = col.id === 'west_harbour_1' ? 2.6 : 1.0;
      const extraZ = col.id === 'harbour_wh_1' || col.id === 'harbour_wh_2' ? 2.5 : 1.0;
      if (
        x >= col.minX - extraX - radius &&
        x <= col.maxX + extraX + radius &&
        z >= col.minZ - extraZ - radius &&
        z <= col.maxZ + extraZ + radius
      ) {
        return false;
      }
    }

    // Never overlap gantry cranes
    for (const cr of HARBOUR_CRANE_FOOTPRINTS) {
      if (
        x >= cr.minX - radius &&
        x <= cr.maxX + radius &&
        z >= cr.minZ - radius &&
        z <= cr.maxZ + radius
      ) {
        return false;
      }
    }

    // Protect Harbour SUV spawn (-88, 62)
    if (Math.hypot(x - -88, z - 62) < 4.5 + radius) return false;

    return true;
  };

  // Instanced collectors for Harbour props & dock equipment
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const palletGeo = createShippingPalletGeometry();
  const crateGeo = createWoodenCrateGeometry();
  const { flangeGeo: reelFlangeGeo, coreGeo: reelCoreGeo } = createCableReelGeometry();
  const cargoRackGeo = createCargoRackGeometry();
  const { bodyGeo: buoyBodyGeo, beaconGeo: buoyBeaconGeo } = createNavigationBuoyGeometry();
  const { postGeo: lifePostGeo, ringGeo: lifeRingGeo } = createLifeRingPedestalParts();

  disposables.push(
    unitBoxGeo,
    unitCylGeo,
    palletGeo,
    crateGeo,
    reelFlangeGeo,
    reelCoreGeo,
    cargoRackGeo,
    buoyBodyGeo,
    buoyBeaconGeo,
    lifePostGeo,
    lifeRingGeo,
  );
  const customGeometryCount = 11;

  interface InstItem {
    matrix: THREE.Matrix4;
    colorHex?: number;
  }
  const palletItems: InstItem[] = [];
  const crateItems: InstItem[] = [];
  const cargoBoxItems: InstItem[] = [];
  const pipeBundleItems: InstItem[] = [];
  const reelFlangeItems: InstItem[] = [];
  const reelCoreItems: InstItem[] = [];
  const rackItems: InstItem[] = [];
  const steelEquipItems: InstItem[] = [];
  const cableCoilItems: InstItem[] = [];
  const hoseCoilItems: InstItem[] = [];
  const workLightItems: InstItem[] = [];
  const buoyBodyItems: InstItem[] = [];
  const buoyBeaconItems: InstItem[] = [];
  const lifePostItems: InstItem[] = [];
  const lifeRingItems: InstItem[] = [];

  const dummy = new THREE.Object3D();
  const pushItem = (
    arr: InstItem[],
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotY = 0,
    rotX = 0,
    rotZ = 0,
    colorHex?: number,
  ) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rotX, rotY, rotZ);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    arr.push({ matrix: dummy.matrix.clone(), colorHex });
  };

  const propFootprints: Array<{ x: number; z: number; radius: number; kind: string }> = [];
  let harbourPropCount = 0;
  let harbourDockEquipmentCount = 0;

  // Helper: add a timber pallet stacked with wooden freight crates & strapped boxes
  const addPalletCargoCluster = (
    x: number,
    z: number,
    rotY: number,
    variant: 'crates' | 'boxes' | 'mixed',
  ) => {
    if (!isHarbourSpotClear(x, z, 1.35)) return;
    propFootprints.push({ x, z, radius: 1.15, kind: 'cargo_pallet' });
    harbourPropCount += 1;

    pushItem(palletItems, x, 0, z, 1.0, 1.0, 1.0, rotY);
    if (variant === 'crates' || variant === 'mixed') {
      pushItem(crateItems, x, 0.15, z, 0.92, 0.88, 0.92, rotY);
      if (variant === 'crates') {
        pushItem(crateItems, x + Math.cos(rotY) * 0.05, 1.03, z + Math.sin(rotY) * 0.05, 0.72, 0.72, 0.72, rotY + 0.18);
      } else {
        pushItem(cargoBoxItems, x, 1.03 + 0.24, z, 0.74, 0.48, 0.64, rotY - 0.12, 0, 0, 0x2563eb);
        // Dark tie-down strap across upper box
        pushItem(cableCoilItems, x, 1.03 + 0.24, z, 0.78, 0.5, 0.06, rotY - 0.12);
      }
    } else {
      const boxTints = [0x334155, 0xd97706, 0x0f766e];
      pushItem(cargoBoxItems, x - Math.cos(rotY) * 0.22, 0.43, z + Math.sin(rotY) * 0.22, 0.56, 0.56, 0.76, rotY, 0, 0, boxTints[0]);
      pushItem(cargoBoxItems, x + Math.cos(rotY) * 0.28, 0.43, z - Math.sin(rotY) * 0.28, 0.48, 0.56, 0.74, rotY, 0, 0, boxTints[1]);
      pushItem(cargoBoxItems, x, 0.96, z, 0.78, 0.48, 0.58, rotY + 0.08, 0, 0, boxTints[2]);
      // Cargo tie-down straps
      pushItem(cableCoilItems, x, 0.72, z, 0.84, 0.58, 0.05, rotY + 0.08);
    }
  };

  const addCableReel = (x: number, z: number, rotY: number, scale = 1.0) => {
    if (!isHarbourSpotClear(x, z, 0.9)) return;
    propFootprints.push({ x, z, radius: 0.78 * scale, kind: 'cable_reel' });
    harbourPropCount += 1;
    pushItem(reelFlangeItems, x, 0, z, scale, scale, scale, rotY);
    pushItem(reelCoreItems, x, 0, z, scale, scale, scale, rotY);
  };

  const addPipeBundle = (x: number, z: number, rotY: number) => {
    if (!isHarbourSpotClear(x, z, 1.5)) return;
    propFootprints.push({ x, z, radius: 1.35, kind: 'pipe_bundle' });
    harbourPropCount += 1;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    // Timber dunnage sleepers underneath pipes
    for (const off of [-1.05, 1.05]) {
      pushItem(palletItems, x + cos * off, 0, z - sin * off, 0.26, 0.9, 1.15, rotY);
    }
    // 5 stacked galvanized steel pipes + 2 tie straps
    const offsets: Array<[number, number]> = [
      [0.14, -0.32],
      [0.14, 0],
      [0.14, 0.32],
      [0.42, -0.16],
      [0.42, 0.16],
    ];
    for (const [py, pz] of offsets) {
      pushItem(
        pipeBundleItems,
        x - sin * pz,
        0.15 + py,
        z + cos * pz,
        0.26,
        3.4,
        0.26,
        rotY,
        0,
        Math.PI / 2,
      );
    }
    for (const off of [-0.95, 0.95]) {
      pushItem(cableCoilItems, x + cos * off, 0.42, z - sin * off, 0.08, 0.56, 0.92, rotY);
    }
  };

  const addCargoRackStation = (x: number, z: number, rotY: number) => {
    if (!isHarbourSpotClear(x, z, 1.55)) return;
    propFootprints.push({ x, z, radius: 1.45, kind: 'cargo_rack' });
    harbourDockEquipmentCount += 1;
    pushItem(rackItems, x, 0, z, 1.0, 1.0, 1.0, rotY);
    // Populate rack shelves with crates and secured cargo boxes
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    pushItem(crateItems, x - cos * 0.65, 0.22, z + sin * 0.65, 0.86, 0.86, 0.86, rotY);
    pushItem(cargoBoxItems, x + cos * 0.65, 0.62, z - sin * 0.65, 0.95, 0.78, 0.82, rotY, 0, 0, 0xd97706);
    pushItem(cargoBoxItems, x - cos * 0.65, 1.78, z + sin * 0.65, 0.95, 0.74, 0.8, rotY, 0, 0, 0x1d4ed8);
    pushItem(crateItems, x + cos * 0.65, 1.38, z - sin * 0.65, 0.84, 0.82, 0.84, rotY);
  };

  const addCoiledHoseCluster = (x: number, z: number, rotY: number) => {
    if (!isHarbourSpotClear(x, z, 0.8)) return;
    propFootprints.push({ x, z, radius: 0.65, kind: 'coiled_hose' });
    harbourPropCount += 1;
    pushItem(palletItems, x, 0, z, 0.95, 0.8, 0.95, rotY);
    for (let layer = 0; layer < 3; layer++) {
      pushItem(hoseCoilItems, x, 0.16 + layer * 0.1, z, 0.86 - layer * 0.05, 0.1, 0.86 - layer * 0.05, rotY);
    }
  };

  // -------------------------------------------------------------------------
  // 3. POPULATE INDUSTRIAL HARBOUR YARDS & WEST QUAY (Strictly Clear of Roads/Bays/Cranes)
  // -------------------------------------------------------------------------
  // East Freight Staging Zone in Block (-64, 64)
  addCargoRackStation(-46.8, 46.2, 0);
  addCargoRackStation(-46.8, 50.6, 0);
  addPalletCargoCluster(-57.6, 48.2, 0.14, 'crates');
  addPalletCargoCluster(-57.6, 56.2, -0.1, 'boxes');
  addPipeBundle(-46.8, 56.4, Math.PI / 2);
  addCableReel(-54.6, 59.0, 0.4, 1.05);
  addCoiledHoseCluster(-57.6, 52.0, 0.25);

  // South-West Container Yard Apron in Block (-64, 64)
  addCargoRackStation(-74.2, 81.6, Math.PI / 2);
  addPipeBundle(-61.8, 80.2, 0);
  addPalletCargoCluster(-67.8, 75.0, 0.08, 'mixed');
  addPalletCargoCluster(-82.6, 65.2, Math.PI / 2, 'crates');
  addCableReel(-82.6, 70.4, 0.6, 1.1);
  addCoiledHoseCluster(-82.6, 75.4, 0);

  // West Pier Terminal Quay & Apron (strictly between cranes & clear of West Harbour Cold Storage bays)
  addCargoRackStation(-121.6, 68.5, 0);
  addPalletCargoCluster(-114.2, 67.8, 0.12, 'boxes');
  addPalletCargoCluster(-133.2, 56.2, Math.PI / 2, 'crates');
  addPipeBundle(-133.2, 65.8, Math.PI / 2);
  addCableReel(-133.0, 72.2, 0.35, 1.15);
  addCoiledHoseCluster(-133.2, 13.5, 0);
  addPalletCargoCluster(-133.2, 23.2, 0.06, 'crates');
  addPalletCargoCluster(-118.2, 3.8, 0, 'mixed'); // North apron clear of west_harbour_1 (z >= 7)

  // Dockside quay bumpers, recessed drain channels, access ladders & restrained safety chains along West Quay (-137.7)
  const quayEdgeX = -137.4;
  for (const qz of [12, 22, 34, 52, 60, 68, 74, 88]) {
    // Heavy black rubber dock bumper / fender along quay coping
    pushItem(cableCoilItems, quayEdgeX + 0.12, 0.32, qz, 0.34, 0.42, 1.65, 0);
    // Steel bumper backing bracket
    pushItem(steelEquipItems, quayEdgeX + 0.32, 0.32, qz, 0.14, 0.52, 1.82, 0);
    harbourDockEquipmentCount += 1;
  }
  // 2 Quay access safety ladders descending water face + 2 recessed apron drain grates
  for (const lz of [28, 63]) {
    pushItem(steelEquipItems, quayEdgeX - 0.12, -0.25, lz - 0.24, 0.08, 1.5, 0.08, 0);
    pushItem(steelEquipItems, quayEdgeX - 0.12, -0.25, lz + 0.24, 0.08, 1.5, 0.08, 0);
    for (let r = -0.8; r <= 0.4; r += 0.35) {
      pushItem(pipeBundleItems, quayEdgeX - 0.12, r, lz, 0.06, 0.48, 0.06, Math.PI / 2, Math.PI / 2, 0);
    }
    harbourDockEquipmentCount += 1;
  }
  for (const [dx, dz] of [
    [-70.5, 65.5],
    [-110.5, 34.5],
    [-129.5, 62.0],
  ]) {
    if (isHarbourSpotClear(dx, dz, 0.7)) {
      pushItem(steelEquipItems, dx, 0.014, dz, 2.2, 0.028, 0.58, 0);
      harbourDockEquipmentCount += 1;
    }
  }
  // Restrained port safety chain-link edge stations & emissive dock work light stanchions along West Quay
  for (const sz of [54, 64, 72]) {
    pushItem(steelEquipItems, -136.6, 0.52, sz, 0.12, 1.04, 0.12, 0);
    pushItem(steelEquipItems, -136.6, 0.52, sz + 3.2, 0.12, 1.04, 0.12, 0);
    pushItem(cableCoilItems, -136.6, 0.88, sz + 1.6, 0.045, 0.045, 3.2, 0);
    // Work light pole + emissive lamp lens on middle stanchion
    if (sz === 64) {
      pushItem(steelEquipItems, -136.6, 2.1, sz, 0.1, 3.8, 0.1, 0);
      pushItem(steelEquipItems, -136.1, 3.95, sz, 0.95, 0.14, 0.28, 0);
      pushItem(workLightItems, -135.75, 3.86, sz, 0.42, 0.06, 0.22, 0);
    }
    harbourDockEquipmentCount += 1;
  }

  // -------------------------------------------------------------------------
  // 4. TWO STATIC INDUSTRIAL YARD MACHINERY VEHICLES (Forklift & Pallet Tug)
  // -------------------------------------------------------------------------
  let harbourMachineryCount = 0;
  const buildStaticForklift = (x: number, z: number, rotY: number) => {
    if (!isHarbourSpotClear(x, z, 1.6)) return;
    propFootprints.push({ x, z, radius: 1.5, kind: 'forklift' });
    harbourMachineryCount += 1;

    const g = new THREE.Group();
    g.name = 'harbour_machinery_forklift';
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const bodyYellowMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.42,
      metalness: 0.28,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.86,
      metalness: 0.06,
    });
    disposables.push(bodyYellowMat, tireMat);

    // Lower body + rear counterweight
    const chassis = new THREE.Mesh(unitBoxGeo, bodyYellowMat);
    chassis.scale.set(1.18, 0.62, 1.85);
    chassis.position.set(0, 0.56, -0.15);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    g.add(chassis);

    const counterweight = new THREE.Mesh(unitBoxGeo, bodyYellowMat);
    counterweight.scale.set(1.16, 0.82, 0.58);
    counterweight.position.set(0, 0.68, -0.92);
    counterweight.castShadow = true;
    g.add(counterweight);

    // Driver seat + steering wheel + ROPS roll-cage frame
    const seat = new THREE.Mesh(unitBoxGeo, tireMat);
    seat.scale.set(0.52, 0.48, 0.48);
    seat.position.set(0, 1.05, -0.25);
    g.add(seat);

    for (const sx of [-0.5, 0.5]) {
      for (const sz of [-0.72, 0.42]) {
        const post = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
        post.scale.set(0.08, 1.15, 0.08);
        post.position.set(sx, 1.44, sz);
        g.add(post);
      }
    }
    const canopy = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
    canopy.scale.set(1.08, 0.07, 1.24);
    canopy.position.set(0, 2.04, -0.15);
    canopy.castShadow = true;
    g.add(canopy);

    // Amber safety strobe on ROPS roof
    const beacon = new THREE.Mesh(unitCylGeo, hullServiceMat);
    beacon.scale.set(0.14, 0.16, 0.14);
    beacon.position.set(0, 2.15, -0.58);
    g.add(beacon);

    // Mast rails + carriage + twin steel forks carrying a strapped pallet crate
    for (const sx of [-0.38, 0.38]) {
      const mast = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
      mast.scale.set(0.11, 2.35, 0.14);
      mast.position.set(sx, 1.26, 0.86);
      mast.castShadow = true;
      g.add(mast);

      const fork = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
      fork.scale.set(0.12, 0.06, 1.05);
      fork.position.set(sx * 0.82, 0.24, 1.44);
      g.add(fork);
    }
    const carriage = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
    carriage.scale.set(0.95, 0.48, 0.08);
    carriage.position.set(0, 0.52, 0.92);
    g.add(carriage);

    const loadPallet = new THREE.Mesh(palletGeo, palletTimberMat);
    loadPallet.position.set(0, 0.28, 1.48);
    g.add(loadPallet);
    const loadCrate = new THREE.Mesh(crateGeo, woodCrateMat);
    loadCrate.scale.setScalar(0.84);
    loadCrate.position.set(0, 0.42, 1.48);
    loadCrate.castShadow = true;
    g.add(loadCrate);

    // 4 rubber industrial wheels
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    disposables.push(wheelGeo);
    for (const [wx, wz, sc] of [
      [-0.58, 0.56, 1.0],
      [0.58, 0.56, 1.0],
      [-0.54, -0.78, 0.82],
      [0.54, -0.78, 0.82],
    ]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.scale.setScalar(sc);
      w.position.set(wx, 0.28 * sc, wz);
      w.castShadow = true;
      g.add(w);
    }

    harbourRoot.add(g);
  };

  const buildStaticPalletTug = (x: number, z: number, rotY: number) => {
    if (!isHarbourSpotClear(x, z, 1.85)) return;
    propFootprints.push({ x, z, radius: 1.75, kind: 'yard_tug' });
    harbourMachineryCount += 1;

    const g = new THREE.Group();
    g.name = 'harbour_machinery_yard_tug';
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const tugOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.42,
      metalness: 0.26,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.86,
      metalness: 0.06,
    });
    disposables.push(tugOrangeMat, tireMat);

    // Compact tractor head
    const hood = new THREE.Mesh(unitBoxGeo, tugOrangeMat);
    hood.scale.set(1.24, 0.68, 1.95);
    hood.position.set(0, 0.56, 0.85);
    hood.castShadow = true;
    g.add(hood);

    const cabFrame = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
    cabFrame.scale.set(1.12, 0.92, 0.95);
    cabFrame.position.set(0, 1.32, 0.72);
    g.add(cabFrame);

    const beacon = new THREE.Mesh(unitCylGeo, dockWorkLightMat);
    beacon.scale.set(0.14, 0.14, 0.14);
    beacon.position.set(0, 1.86, 0.72);
    g.add(beacon);

    // Tow hitch bar + 4-wheel cargo flatbed trailer loaded with strapped cold-chain boxes
    const hitch = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
    hitch.scale.set(0.12, 0.1, 0.62);
    hitch.position.set(0, 0.36, -0.35);
    g.add(hitch);

    const deck = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
    deck.scale.set(1.38, 0.16, 2.25);
    deck.position.set(0, 0.42, -1.72);
    deck.castShadow = true;
    deck.receiveShadow = true;
    g.add(deck);

    const boxA = new THREE.Mesh(crateGeo, woodCrateMat);
    boxA.scale.set(0.95, 0.82, 0.95);
    boxA.position.set(0, 0.5, -1.2);
    boxA.castShadow = true;
    g.add(boxA);

    const boxB = new THREE.Mesh(unitBoxGeo, hullTealMat);
    boxB.scale.set(0.92, 0.68, 0.82);
    boxB.position.set(0, 0.84, -2.2);
    boxB.castShadow = true;
    g.add(boxB);

    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    disposables.push(wheelGeo);
    for (const [wx, wz] of [
      [-0.6, 1.5],
      [0.6, 1.5],
      [-0.6, 0.25],
      [0.6, 0.25],
      [-0.66, -0.95],
      [0.66, -0.95],
      [-0.66, -2.45],
      [0.66, -2.45],
    ]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.24, wz);
      g.add(w);
    }

    harbourRoot.add(g);
  };

  buildStaticForklift(-80.2, 80.2, 0.48);
  buildStaticPalletTug(-109.6, 68.4, -0.22);

  // -------------------------------------------------------------------------
  // 5. STATIC MOORED MARINA WATERCRAFT, CATENARY MOORING ROPES & NAVIGATION BUOYS
  // -------------------------------------------------------------------------
  const vesselSummaries: MooredVesselSummary[] = [];
  let mooringRopeCount = 0;

  const createVessel = (spec: {
    id: string;
    name: string;
    vesselClass: 'cabin_cruiser' | 'center_console' | 'service_launch';
    x: number;
    z: number;
    heading: number;
    length: number;
    beam: number;
    draft: number;
    freeboard: number;
    hullMat: THREE.Material;
    accentMat: THREE.Material;
    ropes?: Array<{ pierAnchor: { x: number; y: number; z: number }; localDeckAnchor: [number, number, number]; sag: number }>;
  }) => {
    const waterlineY = evaluateBuoyantWaterlineY(spec.x, spec.z, 0, 0);
    const vGroup = new THREE.Group();
    vGroup.name = spec.id;
    vGroup.position.set(spec.x, waterlineY, spec.z);
    vGroup.rotation.y = spec.heading;

    // Clone materials per boat only if buoyancy shader differs by world anchor (still only 3 boats -> negligible)
    const boatHullMat = hullWhiteMat.clone();
    const boatBandMat = (spec.hullMat as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial).clone();
    const boatAccentMat = (spec.accentMat as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial).clone();
    const boatGlassMat = vesselGlassMat.clone();
    const boatDeckMat = deckTeakMat.clone();
    const boatChromeMat = chromeRailMat.clone();
    disposables.push(boatHullMat, boatBandMat, boatAccentMat, boatGlassMat, boatDeckMat, boatChromeMat);

    const boatMats = [boatHullMat, boatBandMat, boatAccentMat, boatGlassMat, boatDeckMat, boatChromeMat];
    for (let mi = 0; mi < boatMats.length; mi++) {
      attachBuoyancyWaveMotion(boatMats[mi], spec.x, spec.z, 1.0, `${spec.id}_${mi}`);
    }

    const hullGeo = createWatercraftHullGeometry(spec.length, spec.beam, spec.draft, spec.freeboard);
    const deckGeo = createWatercraftHullGeometry(spec.length * 0.96, spec.beam * 0.88, 0.04, 0.05);
    disposables.push(hullGeo, deckGeo);

    const hullMesh = new THREE.Mesh(hullGeo, spec.vesselClass === 'service_launch' ? boatBandMat : boatHullMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    vGroup.add(hullMesh);

    // Contrasting sheer hull band / protective rub collar
    const bandMesh = new THREE.Mesh(hullGeo, spec.vesselClass === 'service_launch' ? boatAccentMat : boatBandMat);
    bandMesh.scale.set(0.99, 0.28, 1.014);
    bandMesh.position.y = spec.freeboard * 0.42;
    vGroup.add(bandMesh);

    // Teak or non-skid cockpit sole deck
    const deckMesh = new THREE.Mesh(deckGeo, boatDeckMat);
    deckMesh.position.y = spec.freeboard * 0.72;
    vGroup.add(deckMesh);

    // Bow & stern mooring cleats + hanging cylindrical fenders facing pier
    for (const [cx, cz] of [
      [-spec.length * 0.41, spec.beam * 0.39],
      [spec.length * 0.33, spec.beam * 0.29],
    ]) {
      const cleat = new THREE.Mesh(unitBoxGeo, boatChromeMat);
      cleat.scale.set(0.24, 0.11, 0.1);
      cleat.position.set(cx, spec.freeboard * 1.04, cz);
      vGroup.add(cleat);
    }

    // Hanging protective fenders along port & starboard topsides
    const fenderSideZ = spec.vesselClass === 'cabin_cruiser' ? 1 : -1;
    for (const fx of [-spec.length * 0.26, 0.2, spec.length * 0.24]) {
      const fender = new THREE.Mesh(unitCylGeo, boatHullMat);
      fender.scale.set(0.24, 0.56, 0.24);
      fender.position.set(fx, spec.freeboard * 0.48, fenderSideZ * (spec.beam * 0.52));
      vGroup.add(fender);
    }

    if (spec.vesselClass === 'cabin_cruiser') {
      // Sculpted cabin house + tinted side hull windows + brow trim + wrap-around windshield + cockpit overhang
      const cabin = new THREE.Mesh(unitBoxGeo, boatHullMat);
      cabin.scale.set(spec.length * 0.42, 1.12, spec.beam * 0.68);
      cabin.position.set(0.45, spec.freeboard + 0.44, 0);
      cabin.castShadow = true;
      vGroup.add(cabin);

      // Port & starboard dark tinted side cabin window strips & upper sheer accent brow
      const sideWindows = new THREE.Mesh(unitBoxGeo, boatGlassMat);
      sideWindows.scale.set(spec.length * 0.31, 0.44, spec.beam * 0.696);
      sideWindows.position.set(0.32, spec.freeboard + 0.56, 0);
      vGroup.add(sideWindows);

      const cabinBrow = new THREE.Mesh(unitBoxGeo, boatBandMat);
      cabinBrow.scale.set(spec.length * 0.45, 0.12, spec.beam * 0.72);
      cabinBrow.position.set(0.3, spec.freeboard + 0.96, 0);
      vGroup.add(cabinBrow);

      const roofCap = new THREE.Mesh(unitBoxGeo, boatHullMat);
      roofCap.scale.set(spec.length * 0.48, 0.1, spec.beam * 0.74);
      roofCap.position.set(-0.08, spec.freeboard + 1.05, 0);
      roofCap.castShadow = true;
      vGroup.add(roofCap);

      const windshield = new THREE.Mesh(unitBoxGeo, boatGlassMat);
      windshield.scale.set(1.65, 0.72, spec.beam * 0.64);
      windshield.rotation.z = 0.42;
      windshield.position.set(spec.length * 0.18, spec.freeboard + 0.85, 0);
      vGroup.add(windshield);

      const arch = new THREE.Mesh(unitBoxGeo, boatHullMat);
      arch.scale.set(0.38, 1.05, spec.beam * 0.72);
      arch.rotation.z = -0.25;
      arch.position.set(-0.9, spec.freeboard + 1.32, 0);
      vGroup.add(arch);

      const radarDome = new THREE.Mesh(unitCylGeo, boatHullMat);
      radarDome.scale.set(0.55, 0.26, 0.55);
      radarDome.position.set(-0.95, spec.freeboard + 1.92, 0);
      vGroup.add(radarDome);

      // Stainless bow safety railing
      for (const rz of [-1, 1]) {
        const bowRail = new THREE.Mesh(unitBoxGeo, boatChromeMat);
        bowRail.scale.set(spec.length * 0.36, 0.05, 0.05);
        bowRail.rotation.y = rz * 0.26;
        bowRail.position.set(spec.length * 0.3, spec.freeboard + 0.52, rz * spec.beam * 0.26);
        vGroup.add(bowRail);
      }

      // Swim platform & twin stern drives
      const swim = new THREE.Mesh(unitBoxGeo, boatDeckMat);
      swim.scale.set(0.95, 0.14, spec.beam * 0.78);
      swim.position.set(-spec.length * 0.52, 0.22, 0);
      vGroup.add(swim);
    } else if (spec.vesselClass === 'center_console') {
      // Helm center console + tinted acrylic windscreen + T-top canopy
      const consoleBox = new THREE.Mesh(unitBoxGeo, boatHullMat);
      consoleBox.scale.set(1.55, 1.15, spec.beam * 0.42);
      consoleBox.position.set(0.15, spec.freeboard + 0.32, 0);
      consoleBox.castShadow = true;
      vGroup.add(consoleBox);

      const helmGlass = new THREE.Mesh(unitBoxGeo, boatGlassMat);
      helmGlass.scale.set(0.62, 0.55, spec.beam * 0.4);
      helmGlass.rotation.z = 0.28;
      helmGlass.position.set(0.45, spec.freeboard + 0.95, 0);
      vGroup.add(helmGlass);

      for (const sx of [-0.5, 0.5]) {
        for (const sz of [-0.46, 0.46]) {
          const leg = new THREE.Mesh(unitCylGeo, boatChromeMat);
          leg.scale.set(0.05, 1.35, 0.05);
          leg.position.set(0.1 + sx, spec.freeboard + 1.28, sz);
          vGroup.add(leg);
        }
      }
      const tTop = new THREE.Mesh(unitBoxGeo, boatAccentMat);
      tTop.scale.set(2.15, 0.1, spec.beam * 0.64);
      tTop.position.set(0.1, spec.freeboard + 1.96, 0);
      tTop.castShadow = true;
      vGroup.add(tTop);

      // Twin outboard motors at transom
      for (const oz of [-0.42, 0.42]) {
        const motor = new THREE.Mesh(unitBoxGeo, boatGlassMat);
        motor.scale.set(0.55, 0.88, 0.36);
        motor.position.set(-spec.length * 0.51, spec.freeboard * 0.45, oz);
        vGroup.add(motor);
      }
    } else {
      // Harbour Patrol / Marina Service Launch wheelhouse + angled brow visor + collar + mast + tow bitt
      const wheelhouse = new THREE.Mesh(unitBoxGeo, boatHullMat);
      wheelhouse.scale.set(spec.length * 0.36, 1.48, spec.beam * 0.68);
      wheelhouse.position.set(0.65, spec.freeboard + 0.68, 0);
      wheelhouse.castShadow = true;
      vGroup.add(wheelhouse);

      const bridgeGlass = new THREE.Mesh(unitBoxGeo, boatGlassMat);
      bridgeGlass.scale.set(spec.length * 0.37, 0.62, spec.beam * 0.7);
      bridgeGlass.position.set(0.7, spec.freeboard + 1.02, 0);
      vGroup.add(bridgeGlass);

      const visorCollar = new THREE.Mesh(unitBoxGeo, boatBandMat);
      visorCollar.scale.set(spec.length * 0.41, 0.14, spec.beam * 0.74);
      visorCollar.position.set(0.72, spec.freeboard + 1.44, 0);
      visorCollar.castShadow = true;
      vGroup.add(visorCollar);

      const patrolTrim = new THREE.Mesh(unitBoxGeo, boatAccentMat);
      patrolTrim.scale.set(spec.length * 0.38, 0.12, spec.beam * 0.71);
      patrolTrim.position.set(0.65, spec.freeboard + 0.48, 0);
      vGroup.add(patrolTrim);

      const mast = new THREE.Mesh(unitCylGeo, boatChromeMat);
      mast.scale.set(0.08, 1.15, 0.08);
      mast.position.set(0.5, spec.freeboard + 1.95, 0);
      vGroup.add(mast);

      const towBitt = new THREE.Mesh(unitCylGeo, boatChromeMat);
      towBitt.scale.set(0.2, 0.65, 0.2);
      towBitt.position.set(-spec.length * 0.3, spec.freeboard + 0.15, 0);
      vGroup.add(towBitt);
    }

    // Port (red) and Starboard (green) marine navigation lights on cabin flanks
    const portLight = new THREE.Mesh(unitBoxGeo, navGlowMat);
    portLight.scale.set(0.18, 0.1, 0.08);
    portLight.position.set(spec.length * 0.12, spec.freeboard + 0.72, -spec.beam * 0.36);
    vGroup.add(portLight);

    const stbdLight = new THREE.Mesh(unitBoxGeo, navGlowMat);
    stbdLight.scale.set(0.18, 0.1, 0.08);
    stbdLight.position.set(spec.length * 0.12, spec.freeboard + 0.72, spec.beam * 0.36);
    vGroup.add(stbdLight);

    marinaRoot.add(vGroup);

    // Connect sagging catenary mooring lines directly to existing pier cleats / dolphin pilings
    if (spec.ropes) {
      const cos = Math.cos(spec.heading);
      const sin = Math.sin(spec.heading);
      for (const rope of spec.ropes) {
        const [lx, ly, lz] = rope.localDeckAnchor;
        const wx = spec.x + lx * cos + lz * sin;
        const wy = waterlineY + ly;
        const wz = spec.z - lx * sin + lz * cos;
        const ropeGeo = createCatenaryRopeGeometry(
          rope.pierAnchor,
          { x: wx, y: wy, z: wz },
          rope.sag,
          0.036,
        );
        disposables.push(ropeGeo);
        const ropeMesh = new THREE.Mesh(ropeGeo, ropeLineMat);
        ropeMesh.name = `${spec.id}_mooring_rope_${mooringRopeCount}`;
        marinaRoot.add(ropeMesh);
        mooringRopeCount += 1;
      }
    }

    const shoreX = sampleShorelineContourX(spec.z);
    const pierMinDistZ = spec.z < 90 ? 90 - (spec.z + spec.beam * 0.5) : spec.z > 102 ? spec.z - spec.beam * 0.5 - 102 : 0;
    const pierMinDistX = spec.x - spec.length * 0.5 - 155;
    vesselSummaries.push({
      id: spec.id,
      name: spec.name,
      vesselClass: spec.vesselClass,
      x: spec.x,
      y: waterlineY,
      z: spec.z,
      heading: spec.heading,
      length: spec.length,
      beam: spec.beam,
      shorelineX: shoreX,
      shoreClearance: Number((spec.x - spec.length * 0.5 - shoreX).toFixed(2)),
      pierClearance: Number(Math.max(pierMinDistX, pierMinDistZ).toFixed(2)),
    });
  };

  // Vessel 1: 12.2m Cabin Cruiser moored off North-East Pier cleat (152.2, 0.49, 90.58)
  createVessel({
    id: 'marina_vessel_cruiser',
    name: 'VICE SERENITY',
    vesselClass: 'cabin_cruiser',
    x: 161.4,
    z: 84.6,
    heading: -0.08,
    length: 12.2,
    beam: 3.5,
    draft: 0.92,
    freeboard: 0.98,
    hullMat: hullNavyMat,
    accentMat: hullTealMat,
    ropes: [
      {
        pierAnchor: MARINA_PIER_CLEAT_ANCHORS.northEast,
        localDeckAnchor: [-5.0, 1.02, 1.36],
        sag: 0.34,
      },
      {
        pierAnchor: MARINA_PIER_CLEAT_ANCHORS.northDolphin,
        localDeckAnchor: [2.5, 1.06, 1.28],
        sag: 0.46,
      },
    ],
  });

  // Vessel 2: 8.6m Sport Center Console moored off South-East Pier cleat (152.2, 0.49, 101.42)
  createVessel({
    id: 'marina_vessel_center_console',
    name: 'BAYRUNNER',
    vesselClass: 'center_console',
    x: 160.2,
    z: 107.6,
    heading: 0.12,
    length: 8.6,
    beam: 2.7,
    draft: 0.78,
    freeboard: 0.82,
    hullMat: hullTealMat,
    accentMat: hullNavyMat,
    ropes: [
      {
        pierAnchor: MARINA_PIER_CLEAT_ANCHORS.southEast,
        localDeckAnchor: [-3.35, 0.88, -1.04],
        sag: 0.32,
      },
      {
        pierAnchor: MARINA_PIER_CLEAT_ANCHORS.southDolphin,
        localDeckAnchor: [2.35, 0.90, -0.96],
        sag: 0.42,
      },
    ],
  });

  // Vessel 3: 9.8m Marina Service Launch moored off East Channel Mooring Buoy (168.4, -0.75, 95.4)
  createVessel({
    id: 'marina_vessel_service_launch',
    name: 'HARBOUR PATROL 04',
    vesselClass: 'service_launch',
    x: 175.6,
    z: 96.4,
    heading: -0.28,
    length: 9.8,
    beam: 3.1,
    draft: 0.88,
    freeboard: 0.92,
    hullMat: hullNavyMat,
    accentMat: hullServiceMat,
    ropes: [
      {
        pierAnchor: { x: 168.4, y: OCEAN_MEAN_WATER_Y + 0.32, z: 95.4 },
        localDeckAnchor: [-4.3, 0.94, -0.38],
        sag: 0.28,
      },
    ],
  });

  // 4 Floating Channel / Mooring Navigation Buoys cleanly offshore (x >= 166)
  const buoySpecs: Array<{ x: number; z: number; color: number }> = [
    { x: 168.4, z: 95.4, color: 0xf8fafc }, // Mooring pendant buoy for service launch
    { x: 171.5, z: 71.0, color: 0x16a34a }, // Starboard green channel marker
    { x: 166.8, z: 42.0, color: 0xdc2626 }, // Port red channel marker
    { x: 167.4, z: 121.0, color: 0xd97706 }, // South no-wake hazard marker
  ];
  for (const bs of buoySpecs) {
    const by = evaluateBuoyantWaterlineY(bs.x, bs.z, 0, 0);
    pushItem(buoyBodyItems, bs.x, by, bs.z, 1, 1, 1, 0, 0, 0, bs.color);
    pushItem(buoyBeaconItems, bs.x, by, bs.z, 1, 1, 1, 0);
  }

  // 3 Marine Rescue Life-Ring Pedestals mounted neatly along Marina Pier perimeter (never blocking deck center!)
  let marinaSafetyPropCount = 0;
  for (const [lx, lz, rotY] of [
    [129.0, 90.48, 0],
    [148.0, 101.52, Math.PI],
    [154.25, 96.0, -Math.PI / 2],
  ]) {
    pushItem(lifePostItems, lx, 0.475, lz, 1, 1, 1, rotY);
    pushItem(lifeRingItems, lx, 0.475, lz, 1, 1, 1, rotY);
    marinaSafetyPropCount += 1;
  }

  // 1 Marina Slip & No-Wake Directory Sign at Pier west entrance north edge (x=120.2, z=90.52)
  const signPost = new THREE.Mesh(unitCylGeo, industrialSteelMat);
  signPost.scale.set(0.08, 1.45, 0.08);
  signPost.position.set(120.2, 0.475 + 0.725, 90.52);
  marinaRoot.add(signPost);

  const signBacking = new THREE.Mesh(unitBoxGeo, industrialSteelMat);
  signBacking.scale.set(1.3, 0.7, 0.05);
  signBacking.position.set(120.2, 0.475 + 1.52, 90.495);
  marinaRoot.add(signBacking);

  const signBoard = new THREE.Mesh(unitBoxGeo, marinaSignMat);
  signBoard.scale.set(1.22, 0.62, 0.03);
  signBoard.position.set(120.2, 0.475 + 1.52, 90.525);
  marinaRoot.add(signBoard);
  marinaSafetyPropCount += 1;

  // -------------------------------------------------------------------------
  // 6. FLUSH INSTANCED BATCHES WITH COMPUTED BOUNDING SPHERES
  // -------------------------------------------------------------------------
  let instancedBatches = 0;
  const tmpColor = new THREE.Color();

  const flushBatch = (
    parent: THREE.Group,
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: InstItem[],
    castShadow = true,
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.name = name;
    let colored = false;
    for (let i = 0; i < items.length; i++) {
      mesh.setMatrixAt(i, items[i].matrix);
      if (items[i].colorHex !== undefined) {
        mesh.setColorAt(i, tmpColor.setHex(items[i].colorHex!));
        colored = true;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    disposables.push(mesh);
    parent.add(mesh);
    instancedBatches += 1;
  };

  flushBatch(harbourRoot, 'harbour_inst_pallets', palletGeo, palletTimberMat, palletItems, true);
  flushBatch(harbourRoot, 'harbour_inst_crates', crateGeo, woodCrateMat, crateItems, true);
  flushBatch(harbourRoot, 'harbour_inst_cargo_boxes', unitBoxGeo, cargoBoxMat, cargoBoxItems, true);
  flushBatch(harbourRoot, 'harbour_inst_pipe_bundles', unitCylGeo, galvanizedPipeMat, pipeBundleItems, true);
  flushBatch(harbourRoot, 'harbour_inst_reel_flanges', reelFlangeGeo, palletTimberMat, reelFlangeItems, true);
  flushBatch(harbourRoot, 'harbour_inst_reel_cores', reelCoreGeo, cableCoilMat, reelCoreItems, false);
  flushBatch(harbourRoot, 'harbour_inst_cargo_racks', cargoRackGeo, industrialSteelMat, rackItems, true);
  flushBatch(harbourRoot, 'harbour_inst_dock_equipment', unitBoxGeo, industrialSteelMat, steelEquipItems, true);
  flushBatch(harbourRoot, 'harbour_inst_rubber_straps', unitBoxGeo, cableCoilMat, cableCoilItems, true);
  flushBatch(harbourRoot, 'harbour_inst_coiled_hoses', unitCylGeo, cableCoilMat, hoseCoilItems, false);
  flushBatch(harbourRoot, 'harbour_inst_work_lights', unitBoxGeo, dockWorkLightMat, workLightItems, false);
  flushBatch(marinaRoot, 'marina_inst_buoy_bodies', buoyBodyGeo, buoyMat, buoyBodyItems, true);
  flushBatch(marinaRoot, 'marina_inst_buoy_beacons', buoyBeaconGeo, navGlowMat, buoyBeaconItems, false);
  flushBatch(marinaRoot, 'marina_inst_lifering_posts', lifePostGeo, industrialSteelMat, lifePostItems, true);
  flushBatch(marinaRoot, 'marina_inst_liferings', lifeRingGeo, lifeRingOrangeMat, lifeRingItems, true);

  return {
    harbourPropCount,
    harbourMachineryCount,
    harbourDockEquipmentCount,
    marinaVesselCount: vesselSummaries.length,
    mooringRopeCount,
    navigationBuoyCount: buoySpecs.length,
    marinaSafetyPropCount,
    instancedBatches,
    sharedMaterialCount: sharedMaterials.length,
    customGeometryCount,
    vessels: vesselSummaries,
    propFootprints,
  };
}
