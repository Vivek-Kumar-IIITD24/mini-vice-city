import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CityLayout, ROAD_COORDS, ROAD_WIDTH } from './cityData';
import { DistrictId } from '../types';

export interface DistrictOutdoorStats {
  downtownPropsCount: number;
  coralHeightsPropsCount: number;
  oceanDrivePropsCount: number;
  neonMilePropsCount: number;
  industrialHarbourPropsCount: number;
  totalOutdoorPropsCount: number;
  coveredDistrictCount: number;
  instancedBatches: number;
  sharedMaterialCount: number;
  customGeometryCount: number;
  placedProps: Array<{
    district: DistrictId;
    kind: string;
    x: number;
    z: number;
  }>;
}

export interface DistrictOutdoorBuildContext {
  root: THREE.Group;
  layout: CityLayout;
  disposables: Array<{ dispose: () => void }>;
  extraExclusions?: Array<{ x: number; z: number; radius: number }>;
  maxAnisotropy?: number;
}

const PARKED_VEHICLE_EXCLUSIONS = [
  { x: 90.4, z: 46.5, radius: 4.5 }, // starter_veloce
  { x: 25.5, z: -20.0, radius: 4.2 }, // downtown_solstice
  { x: 91.5, z: 84.0, radius: 4.5 }, // marina_titan
  { x: -88.0, z: 62.0, radius: 4.5 }, // harbour_titan
] as const;

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
    throw new Error('Failed to merge district outdoor geometries');
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
// CUSTOM PROCEDURAL GEOMETRIES (Verified Finite & Normalized Unit Normals)
// ---------------------------------------------------------------------------

/**
 * Architectural stepped stone planter vessel with recessed coping collar & soil bed base.
 */
export function createArchitecturalPlanterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const plinth = new THREE.BoxGeometry(1.36, 0.14, 1.36);
  plinth.translate(0, 0.07, 0);
  parts.push(plinth);

  const wall = new THREE.BoxGeometry(1.22, 0.52, 1.22);
  wall.translate(0, 0.4, 0);
  parts.push(wall);

  const rim = new THREE.BoxGeometry(1.34, 0.1, 1.34);
  rim.translate(0, 0.71, 0);
  parts.push(rim);

  return mergeNormalizedParts(parts);
}

/**
 * Layered ornamental tropical shrub / cycad cluster built from radiating tapered diamond fronds.
 */
export function createTropicalShrubGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const ringSpecs = [
    { count: 6, radius: 0.44, y: 0.24, tilt: 0.85, sy: 0.52 },
    { count: 5, radius: 0.34, y: 0.42, tilt: 0.56, sy: 0.56 },
    { count: 4, radius: 0.2, y: 0.58, tilt: 0.28, sy: 0.48 },
  ];
  for (let r = 0; r < ringSpecs.length; r++) {
    const spec = ringSpecs[r];
    for (let i = 0; i < spec.count; i++) {
      const ang = (i / spec.count) * Math.PI * 2 + r * 0.42;
      const leaf = new THREE.ConeGeometry(0.18, spec.sy, 5);
      leaf.scale(1.0, 1.0, 0.38);
      leaf.translate(0, spec.sy * 0.5, 0);
      leaf.rotateX(spec.tilt);
      leaf.rotateY(ang);
      leaf.translate(Math.sin(ang) * spec.radius * 0.35, spec.y, Math.cos(ang) * spec.radius * 0.35);
      parts.push(leaf);
    }
  }
  const core = new THREE.DodecahedronGeometry(0.28, 0);
  core.translate(0, 0.28, 0);
  parts.push(core);
  return mergeNormalizedParts(parts);
}

/**
 * Downtown civic modernist travertine & brushed-bronze Art Deco plaza sculpture centerpiece.
 */
export function createDowntownPlazaSculptureParts(): {
  plinthGeo: THREE.BufferGeometry;
  metalFinGeo: THREE.BufferGeometry;
} {
  const plinthParts: THREE.BufferGeometry[] = [];
  const step1 = new THREE.BoxGeometry(3.1, 0.22, 3.1);
  step1.translate(0, 0.11, 0);
  plinthParts.push(step1);

  const step2 = new THREE.BoxGeometry(2.25, 0.36, 2.25);
  step2.translate(0, 0.4, 0);
  plinthParts.push(step2);

  const pedestal = new THREE.CylinderGeometry(0.68, 0.78, 0.86, 8);
  pedestal.translate(0, 1.01, 0);
  plinthParts.push(pedestal);

  const metalParts: THREE.BufferGeometry[] = [];
  const baseCollar = new THREE.CylinderGeometry(0.56, 0.62, 0.12, 16);
  baseCollar.translate(0, 1.48, 0);
  metalParts.push(baseCollar);

  // Intersecting geometric Art Deco bronze sails & rising central obelisk needle
  const ringOuter = new THREE.TorusGeometry(0.88, 0.085, 8, 20);
  ringOuter.translate(0, 2.48, 0);
  metalParts.push(ringOuter);

  const ringInner = new THREE.TorusGeometry(0.62, 0.065, 8, 18);
  ringInner.rotateY(Math.PI / 2);
  ringInner.translate(0, 2.48, 0);
  metalParts.push(ringInner);

  const centralSpire = new THREE.CylinderGeometry(0.06, 0.24, 2.35, 6);
  centralSpire.translate(0, 2.68, 0);
  metalParts.push(centralSpire);

  return {
    plinthGeo: mergeNormalizedParts(plinthParts),
    metalFinGeo: mergeNormalizedParts(metalParts),
  };
}

/**
 * Outdoor hospitality patio bistro table + chairs + sculpted hexagonal canvas umbrella.
 */
export function createPatioUmbrellaTableParts(): {
  furnitureGeo: THREE.BufferGeometry;
  canopyGeo: THREE.BufferGeometry;
} {
  const furnParts: THREE.BufferGeometry[] = [];
  // Table pedestal + round tabletop
  const baseDisc = new THREE.CylinderGeometry(0.32, 0.36, 0.05, 10);
  baseDisc.translate(0, 0.025, 0);
  furnParts.push(baseDisc);

  const stem = new THREE.CylinderGeometry(0.04, 0.05, 0.74, 8);
  stem.translate(0, 0.38, 0);
  furnParts.push(stem);

  const tableTop = new THREE.CylinderGeometry(0.56, 0.56, 0.05, 14);
  tableTop.translate(0, 0.76, 0);
  furnParts.push(tableTop);

  // Center umbrella mast
  const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.15, 8);
  pole.translate(0, 1.42, 0);
  furnParts.push(pole);

  // Two tucked bistro chairs flanking table
  for (const sx of [-0.74, 0.74]) {
    const seat = new THREE.BoxGeometry(0.4, 0.06, 0.42);
    seat.translate(sx, 0.45, 0);
    furnParts.push(seat);
    const back = new THREE.BoxGeometry(0.05, 0.44, 0.4);
    back.translate(sx + Math.sign(sx) * 0.17, 0.69, 0);
    furnParts.push(back);
    for (const lx of [-0.15, 0.15]) {
      for (const lz of [-0.15, 0.15]) {
        const leg = new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6);
        leg.translate(sx + lx, 0.22, lz);
        furnParts.push(leg);
      }
    }
  }

  // Hexagonal vented resort canopy cone + finial
  const canopyParts: THREE.BufferGeometry[] = [];
  const mainShade = new THREE.ConeGeometry(1.26, 0.52, 6);
  mainShade.translate(0, 2.48, 0);
  canopyParts.push(mainShade);

  const valance = new THREE.CylinderGeometry(1.25, 1.26, 0.12, 6, 1, false);
  valance.translate(0, 2.18, 0);
  canopyParts.push(valance);

  return {
    furnitureGeo: mergeNormalizedParts(furnParts),
    canopyGeo: mergeNormalizedParts(canopyParts),
  };
}

/**
 * Neon Mile VIP velvet-rope queue stanchion pair connected by a draped catenary velvet rope.
 */
export function createVelvetQueueStanchionParts(): {
  postGeo: THREE.BufferGeometry;
  ropeGeo: THREE.BufferGeometry;
} {
  const postParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1.05, 1.05]) {
    const base = new THREE.CylinderGeometry(0.16, 0.18, 0.05, 12);
    base.translate(sx, 0.025, 0);
    postParts.push(base);

    const shaft = new THREE.CylinderGeometry(0.036, 0.04, 0.94, 10);
    shaft.translate(sx, 0.5, 0);
    postParts.push(shaft);

    const finial = new THREE.SphereGeometry(0.055, 8, 6);
    finial.translate(sx, 0.99, 0);
    postParts.push(finial);
  }

  // Draped catenary velvet rope connecting posts
  const pts: THREE.Vector3[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -1.05 + t * 2.1;
    const sag = 4 * t * (1 - t) * 0.22;
    pts.push(new THREE.Vector3(x, 0.88 - sag, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const ropeGeo = sanitizeGeometry(new THREE.TubeGeometry(curve, 12, 0.028, 6, false));

  return {
    postGeo: mergeNormalizedParts(postParts),
    ropeGeo,
  };
}

/**
 * Neon Mile architectural metallic Art Deco louver screen / windbreak totem.
 */
export function createNeonLoungeScreenParts(): {
  frameGeo: THREE.BufferGeometry;
  glowStripGeo: THREE.BufferGeometry;
} {
  const frameParts: THREE.BufferGeometry[] = [];
  const base = new THREE.BoxGeometry(2.15, 0.16, 0.44);
  base.translate(0, 0.08, 0);
  frameParts.push(base);

  for (const sx of [-0.96, 0.96]) {
    const sidePost = new THREE.BoxGeometry(0.12, 2.15, 0.18);
    sidePost.translate(sx, 1.15, 0);
    frameParts.push(sidePost);
  }
  const cap = new THREE.BoxGeometry(2.08, 0.14, 0.22);
  cap.translate(0, 2.24, 0);
  frameParts.push(cap);

  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.BoxGeometry(0.06, 1.98, 0.14);
    slat.rotateY(0.45);
    slat.translate(i * 0.25, 1.14, 0);
    frameParts.push(slat);
  }

  const glowStripGeo = sanitizeGeometry(
    new THREE.BoxGeometry(1.94, 0.07, 0.08).translate(0, 2.12, 0.08),
  );

  return {
    frameGeo: mergeNormalizedParts(frameParts),
    glowStripGeo,
  };
}

// ---------------------------------------------------------------------------
// MAIN DISTRICT OUTDOOR DECORATIONS BUILDER
// ---------------------------------------------------------------------------

export function buildDistrictOutdoorAssets(
  ctx: DistrictOutdoorBuildContext,
): DistrictOutdoorStats {
  const { root, layout, disposables, extraExclusions = [] } = ctx;
  const aniso = ctx.maxAnisotropy ?? 4;

  const outdoorRoot = new THREE.Group();
  outdoorRoot.name = 'district_outdoor_assets_root';
  root.add(outdoorRoot);

  // -------------------------------------------------------------------------
  // 1. COMPACT SHARED MATERIALS & TEXTURES
  // -------------------------------------------------------------------------
  const harbourBoardTex = makeCanvasOrFallback(
    256,
    128,
    (c, w, h) => {
      c.fillStyle = '#1e293b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d97706';
      c.fillRect(0, 0, w, 24);
      c.fillStyle = '#0f172a';
      c.font = 'bold 15px sans-serif';
      c.textAlign = 'center';
      c.fillText('VICE PORT TERMINAL', w * 0.5, 17);
      c.fillStyle = '#e2e8f0';
      c.font = 'bold 18px sans-serif';
      c.fillText('BERTHS 1–3 • STAGING ZONE', w * 0.5, 68);
      c.fillStyle = '#94a3b8';
      c.font = '14px sans-serif';
      c.fillText('MAX 15 MPH • HARD HAT AREA', w * 0.5, 98);
    },
    [30, 41, 59, 255],
    true,
    aniso,
  );
  disposables.push(harbourBoardTex);

  const planterStoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.05,
  });
  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
  });
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.02,
  });
  const bronzeMetalMat = new THREE.MeshStandardMaterial({
    color: 0xc29b59,
    roughness: 0.32,
    metalness: 0.82,
  });
  const furnitureFrameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.44,
    metalness: 0.58,
  });
  const umbrellaCanvasMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.76,
    metalness: 0.03,
  });
  const velvetRopeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.05,
  });
  const loungeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffb347,
    emissiveIntensity: 0.48,
    roughness: 0.25,
  });
  const harbourBoardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: harbourBoardTex,
    roughness: 0.45,
    metalness: 0.14,
  });

  const sharedMaterials = [
    planterStoneMat,
    shrubMat,
    flowerMat,
    bronzeMetalMat,
    furnitureFrameMat,
    umbrellaCanvasMat,
    velvetRopeMat,
    loungeGlowMat,
    harbourBoardMat,
  ];
  disposables.push(...sharedMaterials);

  // -------------------------------------------------------------------------
  // 2. CUSTOM PROCEDURAL GEOMETRIES
  // -------------------------------------------------------------------------
  const unitBoxGeo = sanitizeGeometry(new THREE.BoxGeometry(1, 1, 1));
  const unitCylGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.5, 0.5, 1, 10));
  const flowerClusterGeo = sanitizeGeometry(new THREE.DodecahedronGeometry(0.22, 0));
  const planterGeo = createArchitecturalPlanterGeometry();
  const shrubGeo = createTropicalShrubGeometry();
  const { plinthGeo: dtPlinthGeo, metalFinGeo: dtMetalGeo } = createDowntownPlazaSculptureParts();
  const { furnitureGeo: patioTableGeo, canopyGeo: patioCanopyGeo } = createPatioUmbrellaTableParts();
  const { postGeo: stanchionPostGeo, ropeGeo: stanchionRopeGeo } = createVelvetQueueStanchionParts();
  const { frameGeo: neonScreenFrameGeo, glowStripGeo: neonScreenGlowGeo } = createNeonLoungeScreenParts();

  const customGeos = [
    unitBoxGeo,
    unitCylGeo,
    flowerClusterGeo,
    planterGeo,
    shrubGeo,
    dtPlinthGeo,
    dtMetalGeo,
    patioTableGeo,
    patioCanopyGeo,
    stanchionPostGeo,
    stanchionRopeGeo,
    neonScreenFrameGeo,
    neonScreenGlowGeo,
  ];
  disposables.push(...customGeos);

  // -------------------------------------------------------------------------
  // 3. SPATIAL SAFETY FILTER (Never obstruct roads, sidewalks, trees, buildings, spawns)
  // -------------------------------------------------------------------------
  const placedProps: Array<{ district: DistrictId; kind: string; x: number; z: number; radius: number }> = [];

  const isSpotSafe = (x: number, z: number, radius = 0.85, buildingMargin = 1.1): boolean => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    // Stay strictly west of East Promenade / Boardwalk / Beach
    if (x >= 103.0 - radius || x <= -136.5 + radius || z <= -135.5 + radius || z >= 135.5 - radius) {
      return false;
    }
    // Never enter driving roads
    const roadClearHalf = ROAD_WIDTH * 0.5 + radius;
    for (const rc of ROAD_COORDS) {
      if (Math.abs(x - rc) < roadClearHalf || Math.abs(z - rc) < roadClearHalf) {
        return false;
      }
    }
    // Never enter raised 9-block sidewalks ([21.25 .. 24.75] around block center) or crosswalk ramps
    for (const bx of [-64, 0, 64]) {
      for (const bz of [-64, 0, 64]) {
        const dx = Math.abs(x - bx);
        const dz = Math.abs(z - bz);
        if (dx <= 25.0 && dz <= 25.0) {
          if (dx >= 21.15 - radius || dz >= 21.15 - radius) {
            return false;
          }
        }
      }
    }
    // Protect building footprints (and container colliders)
    for (const col of layout.colliders) {
      if (
        x >= col.minX - buildingMargin - radius &&
        x <= col.maxX + buildingMargin + radius &&
        z >= col.minZ - buildingMargin - radius &&
        z <= col.maxZ + buildingMargin + radius
      ) {
        return false;
      }
    }
    // Protect palms & park trees
    for (const t of layout.trees) {
      if (Math.hypot(x - t.x, z - t.z) < 1.85 + radius) {
        return false;
      }
    }
    // Protect Coral Heights Park Fountain at (-64, -56)
    if (Math.hypot(x - -64, z - -56) < 5.2 + radius) {
      return false;
    }
    // Protect player spawn & all parked gameplay vehicles
    if (Math.hypot(x - layout.playerSpawn.x, z - layout.playerSpawn.z) < 4.8 + radius) {
      return false;
    }
    for (const pv of PARKED_VEHICLE_EXCLUSIONS) {
      if (Math.hypot(x - pv.x, z - pv.z) < pv.radius + radius) {
        return false;
      }
    }
    // Protect harbour environment props / machinery / racks
    for (const ex of extraExclusions) {
      if (Math.hypot(x - ex.x, z - ex.z) < ex.radius + radius) {
        return false;
      }
    }
    // Never overlap another district outdoor prop
    for (const prev of placedProps) {
      if (Math.hypot(x - prev.x, z - prev.z) < prev.radius + radius) {
        return false;
      }
    }
    return true;
  };

  interface InstEntry {
    matrix: THREE.Matrix4;
    colorHex: number;
  }
  const planterItems: InstEntry[] = [];
  const shrubItems: InstEntry[] = [];
  const flowerItems: InstEntry[] = [];
  const stoneBedItems: InstEntry[] = [];
  const dtPlinthItems: InstEntry[] = [];
  const dtMetalItems: InstEntry[] = [];
  const patioTableItems: InstEntry[] = [];
  const patioCanopyItems: InstEntry[] = [];
  const stanchionPostItems: InstEntry[] = [];
  const stanchionRopeItems: InstEntry[] = [];
  const loungeScreenItems: InstEntry[] = [];
  const loungeGlowItems: InstEntry[] = [];
  const harbourBoardItems: InstEntry[] = [];

  const dummy = new THREE.Object3D();
  const pushInst = (
    arr: InstEntry[],
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotY = 0,
    colorHex = 0xffffff,
  ) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    arr.push({ matrix: dummy.matrix.clone(), colorHex });
  };

  const counts = {
    downtown: 0,
    coralHeights: 0,
    oceanDrive: 0,
    neonMile: 0,
    harbour: 0,
  };

  const recordProp = (district: DistrictId, kind: string, x: number, z: number, radius: number) => {
    placedProps.push({ district, kind, x, z, radius });
    switch (district) {
      case DistrictId.Downtown:
        counts.downtown += 1;
        break;
      case DistrictId.Residential:
        counts.coralHeights += 1;
        break;
      case DistrictId.OceanDrive:
        counts.oceanDrive += 1;
        break;
      case DistrictId.Entertainment:
        counts.neonMile += 1;
        break;
      case DistrictId.Harbour:
        counts.harbour += 1;
        break;
    }
  };

  const addArchitecturalPlanter = (
    district: DistrictId,
    x: number,
    z: number,
    scale: number,
    stoneTint: number,
    shrubTint: number,
    rotY = 0,
    flowerTint?: number,
    baseY = 0,
  ) => {
    if (!isSpotSafe(x, z, 0.72 * scale, 1.15)) return;
    recordProp(district, 'architectural_planter', x, z, 0.72 * scale);
    pushInst(planterItems, x, baseY, z, scale, scale, scale, rotY, stoneTint);
    pushInst(shrubItems, x, baseY + 0.66 * scale, z, scale * 1.05, scale * 1.05, scale * 1.05, rotY + 0.4, shrubTint);
    if (flowerTint !== undefined) {
      for (const [fx, fz] of [
        [-0.24, 0.2],
        [0.24, -0.18],
        [0.12, 0.28],
      ]) {
        pushInst(
          flowerItems,
          x + fx * scale,
          baseY + 1.05 * scale,
          z + fz * scale,
          0.75 * scale,
          0.75 * scale,
          0.75 * scale,
          rotY,
          flowerTint,
        );
      }
    }
  };

  const addGardenBed = (
    district: DistrictId,
    x: number,
    z: number,
    w: number,
    d: number,
    baseY: number,
    borderTint: number,
    shrubTint: number,
    flowerTint?: number,
    rotY = 0,
  ) => {
    const rad = Math.max(w, d) * 0.48;
    if (!isSpotSafe(x, z, rad, 1.0)) return;
    recordProp(district, 'garden_bed', x, z, rad);

    // Low sculpted stone bed border & dark mulch bed inside
    pushInst(stoneBedItems, x, baseY + 0.14, z, w, 0.28, d, rotY, borderTint);
    pushInst(stoneBedItems, x, baseY + 0.25, z, w * 0.86, 0.12, d * 0.86, rotY, 0x3e2d21);

    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const cols = w > 2.4 ? 3 : 2;
    for (let i = 0; i < cols; i++) {
      const offX = ((i + 0.5) / cols - 0.5) * (w * 0.64);
      const sx = x + offX * cos;
      const sz = z - offX * sin;
      const sc = i % 2 === 0 ? 0.96 : 0.82;
      pushInst(shrubItems, sx, baseY + 0.28, sz, sc, sc, sc, rotY + i * 0.9, shrubTint);
      if (flowerTint !== undefined && i % 2 === 0) {
        pushInst(flowerItems, sx + 0.14, baseY + 0.68, sz - 0.1, 0.85, 0.85, 0.85, rotY, flowerTint);
        pushInst(flowerItems, sx - 0.15, baseY + 0.62, sz + 0.12, 0.72, 0.72, 0.72, rotY, flowerTint);
      }
    }
  };

  const addPatioTableSet = (
    district: DistrictId,
    x: number,
    z: number,
    rotY: number,
    frameTint: number,
    canopyTint: number,
  ) => {
    if (!isSpotSafe(x, z, 1.25, 1.3)) return;
    recordProp(district, 'patio_umbrella_table', x, z, 1.22);
    pushInst(patioTableItems, x, 0, z, 1, 1, 1, rotY, frameTint);
    pushInst(patioCanopyItems, x, 0, z, 1, 1, 1, rotY, canopyTint);
  };

  // =========================================================================
  // 4. DOWNTOWN VICE — Travertine Plaza Sculpture, Civic Planters & Pedestal Ledges
  // =========================================================================
  // Vice Tower South Forecourt Plaza (x ∈ [-7..7], z ∈ [-54..-44])
  if (isSpotSafe(0, -49.2, 1.75, 1.5)) {
    recordProp(DistrictId.Downtown, 'civic_plaza_sculpture', 0, -49.2, 1.75);
    pushInst(dtPlinthItems, 0, 0, -49.2, 1, 1, 1, 0, 0xe8dfd0);
    pushInst(dtMetalItems, 0, 0, -49.2, 1, 1, 1, 0, 0xffffff);
  }
  for (const [px, pz] of [
    [-5.6, -45.4],
    [5.6, -45.4],
    [-5.6, -52.4],
    [5.6, -52.4],
    [-15.5, -67.0],
    [15.5, -67.0],
  ]) {
    addArchitecturalPlanter(DistrictId.Downtown, px, pz, 1.05, 0xe5dccb, 0x2c6e49, 0, undefined, 0);
  }
  // Low travertine seating plinths facing sculpture (distinct from Phase 2E-3 park benches)
  for (const lx of [-2.9, 2.9]) {
    if (isSpotSafe(lx, -45.4, 0.9, 1.2)) {
      recordProp(DistrictId.Downtown, 'travertine_ledge', lx, -45.4, 0.85);
      pushInst(stoneBedItems, lx, 0.24, -45.4, 2.1, 0.48, 0.72, 0, 0xe6dcc9);
    }
  }

  // Downtown Core Block (0, 0) Inner Walkways
  for (const [px, pz] of [
    [0.8, 0.0],
    [0.8, -13.5],
    [0.8, 13.5],
    [-13.5, 0.0],
    [14.2, 0.0],
  ]) {
    addArchitecturalPlanter(DistrictId.Downtown, px, pz, 0.96, 0xdfe4ea, 0x2d6a4f, Math.PI / 4, undefined, 0);
  }

  // =========================================================================
  // 5. CORAL HEIGHTS — Garden Flower Beds, Courtyard Landscaping & Café Patio
  // =========================================================================
  // Bayside Palm Park (-64, -56, y=0.14 parkLawn) flower & hibiscus shrub borders
  for (const [gx, gz, gw, gd, rot, flower] of [
    [-64.0, -68.2, 3.2, 1.25, 0, 0xf43f5e],
    [-81.8, -56.0, 1.25, 3.0, 0, 0xf97316],
    [-46.2, -56.0, 1.25, 3.0, 0, 0xec4899],
    [-68.6, -45.4, 2.8, 1.2, 0, 0xf43f5e],
    [-59.4, -45.4, 2.8, 1.2, 0, 0xfbbf24],
    [-64.0, -76.2, 1.4, 3.2, 0, 0xf43f5e],
  ] as Array<[number, number, number, number, number, number]>) {
    addGardenBed(DistrictId.Residential, gx, gz, gw, gd, 0.14, 0xd8c8b4, 0x3b8c52, flower, rot);
  }

  // Coral Heights Courtyard Block (-64, 0) cross-walkway garden beds
  for (const [gx, gz, gw, gd, flower] of [
    [-63.5, -12.2, 2.4, 1.1, 0xec4899],
    [-63.5, 0.0, 2.8, 1.25, 0xf97316],
    [-63.5, 11.4, 2.4, 1.1, 0xf43f5e],
    [-79.8, 0.0, 1.1, 2.4, 0xfbbf24],
  ] as Array<[number, number, number, number, number]>) {
    addGardenBed(DistrictId.Residential, gx, gz, gw, gd, 0.0, 0xdccbb6, 0x34824c, flower, 0);
  }

  // Corner Shop outdoor patio seating + planters along its open South terrace (res_shop_1)
  addPatioTableSet(DistrictId.Residential, -57.2, 19.2, 0.25, 0x2a4042, 0x2b7a78);
  addPatioTableSet(DistrictId.Residential, -50.2, 19.2, -0.2, 0x2a4042, 0xd97757);
  addArchitecturalPlanter(DistrictId.Residential, -53.7, 19.2, 0.82, 0xefe3d2, 0x3b8c52, 0, 0xf43f5e, 0);

  // =========================================================================
  // 6. OCEAN DRIVE — Resort Entrance Planters, Breezeway Gardens & Café Seating
  // =========================================================================
  // Flanking resort entrance planters along hotel arrival zone (x = 82.2, strictly west of sidewalk 85.25 & clear of canopies <= 80.15)
  for (const [px, pz, flower] of [
    [82.2, -77.2, 0xff758f],
    [82.2, -66.8, 0x2ec4b6],
    [82.2, -59.2, 0x38bdf8],
    [82.2, -48.8, 0xfbbf24],
    [82.2, -16.2, 0xf28482],
    [82.2, -3.8, 0x2dd4bf],
    [82.2, 3.8, 0xf59e0b],
    [82.2, 16.2, 0xe76f51],
    [82.2, 48.2, 0xf472b6],
    [82.2, 59.8, 0x14b8a6],
  ] as Array<[number, number, number]>) {
    addArchitecturalPlanter(DistrictId.OceanDrive, px, pz, 0.96, 0xf7efe4, 0x2f7d47, 0, flower, 0);
  }

  // Resort courtyard garden beds in hotel breezeways
  for (const [gx, gz, flower] of [
    [68.0, -63.0, 0xff758f],
    [65.5, 0.0, 0x2dd4bf],
    [75.5, 0.0, 0xf59e0b],
    [65.5, 64.2, 0xf472b6],
    [75.5, 64.2, 0x38bdf8],
  ] as Array<[number, number, number]>) {
    addGardenBed(DistrictId.OceanDrive, gx, gz, 2.8, 1.35, 0.0, 0xf4eadb, 0x2e7d47, flower, 0);
  }

  // Ocean Drive Café Marina outdoor resort patio tables & umbrellas (x=82.2 east terrace + south terrace z=83.2)
  addPatioTableSet(DistrictId.OceanDrive, 82.2, 69.2, 0.15, 0x243b53, 0x0284c7);
  addPatioTableSet(DistrictId.OceanDrive, 82.2, 78.6, -0.15, 0x243b53, 0xf472b6);
  addPatioTableSet(DistrictId.OceanDrive, 73.2, 83.2, 0.4, 0x243b53, 0x0ea5e9);
  addPatioTableSet(DistrictId.OceanDrive, 65.8, 83.2, -0.25, 0x243b53, 0x2dd4bf);

  // =========================================================================
  // 7. NEON MILE — Velvet Queue Stanchions, Metallic Lounge Screens & Planters
  // =========================================================================
  // Central Neon Mile Pedestrian Concourse (z = 64.0 between North & South venues; x = 0.0 N-S walk)
  for (const [sx, sz, rotY] of [
    [-14.0, 64.0, 0],
    [14.0, 64.0, 0],
    [0.0, 54.0, Math.PI / 2],
    [0.0, 74.0, Math.PI / 2],
  ]) {
    if (isSpotSafe(sx, sz, 1.2, 1.25)) {
      recordProp(DistrictId.Entertainment, 'lounge_louver_screen', sx, sz, 1.15);
      pushInst(loungeScreenItems, sx, 0, sz, 1, 1, 1, rotY, 0x252d42);
      pushInst(loungeGlowItems, sx, 0, sz, 1, 1, 1, rotY, 0xfef3c7);
    }
  }
  for (const [px, pz] of [
    [-6.2, 64.0],
    [6.2, 64.0],
    [0.0, 48.0],
    [0.0, 80.0],
  ]) {
    addArchitecturalPlanter(DistrictId.Entertainment, px, pz, 0.94, 0x222938, 0x266b46, 0, 0xc084fc, 0);
  }
  // Intimate concourse cocktail patio tables
  addPatioTableSet(DistrictId.Entertainment, -10.2, 64.0, 0.2, 0x1e293b, 0xbe185d);
  addPatioTableSet(DistrictId.Entertainment, 10.2, 64.0, -0.2, 0x1e293b, 0x6d28d9);

  // VIP Velvet-Rope Queue Stanchions flanking Velvet, Solaris, Amber & Vice Theater approaches
  const stanchionSpots: Array<[number, number, number, number]> = [
    [-16.4, 44.5, 0, 0xbe185d], // Velvet West VIP flank
    [-3.6, 44.5, 0, 0xbe185d], // Velvet East VIP flank
    [3.6, 44.5, 0, 0x0e7490], // Solaris West flank
    [16.4, 44.5, 0, 0x0e7490], // Solaris East flank
    [-16.4, 83.4, 0, 0xd97706], // Amber West flank
    [-3.6, 83.4, 0, 0xd97706], // Amber East flank
    [3.6, 83.4, 0, 0x9333ea], // Vice Theater West flank
    [16.4, 83.4, 0, 0x9333ea], // Vice Theater East flank
  ];
  for (const [qx, qz, qRot, ropeTint] of stanchionSpots) {
    if (isSpotSafe(qx, qz, 1.1, 1.0)) {
      recordProp(DistrictId.Entertainment, 'velvet_stanchion', qx, qz, 1.08);
      pushInst(stanchionPostItems, qx, 0, qz, 1, 1, 1, qRot, 0xffffff);
      pushInst(stanchionRopeItems, qx, 0, qz, 1, 1, 1, qRot, ropeTint);
    }
  }

  // =========================================================================
  // 8. INDUSTRIAL HARBOUR — Restrained Crushed-Gravel Scrub & Port Terminal Boards
  // =========================================================================
  // Hardy coastal perimeter scrub beds tucked against quiet non-bay edges
  for (const [hx, hz, hw, hd] of [
    [-44.6, 62.6, 1.2, 2.2],
    [-61.8, 83.2, 2.0, 1.1],
    [-107.6, 11.5, 1.4, 2.2],
    [-107.6, 20.0, 1.4, 2.2],
  ] as Array<[number, number, number, number]>) {
    addGardenBed(DistrictId.Harbour, hx, hz, hw, hd, 0.0, 0x64748b, 0x4d7c4f, undefined, 0);
  }

  // Port Terminal Zone / Berths Information Boards (mounted on dual galvanized posts)
  for (const [bx, bz, bRot] of [
    [-83.5, 62.2, Math.PI / 2],
    [-129.2, 17.8, -Math.PI / 2],
  ]) {
    if (isSpotSafe(bx, bz, 1.15, 1.05)) {
      recordProp(DistrictId.Harbour, 'terminal_staging_board', bx, bz, 1.1);
      // Posts + frame via stoneBedItems + sign face via harbourBoardItems
      const cos = Math.cos(bRot);
      const sin = Math.sin(bRot);
      for (const side of [-0.65, 0.65]) {
        pushInst(
          stoneBedItems,
          bx + side * cos,
          1.15,
          bz - side * sin,
          0.11,
          2.3,
          0.11,
          bRot,
          0x475569,
        );
      }
      pushInst(harbourBoardItems, bx, 1.72, bz, 1.65, 0.86, 0.1, bRot, 0xffffff);
    }
  }

  // =========================================================================
  // 9. FLUSH ALL INSTANCED BATCHES WITH COMPUTED BOUNDING SPHERES
  // =========================================================================
  let instancedBatches = 0;
  const tmpColor = new THREE.Color();

  const flushBatch = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: InstEntry[],
    castShadow = true,
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.name = name;
    for (let i = 0; i < items.length; i++) {
      mesh.setMatrixAt(i, items[i].matrix);
      mesh.setColorAt(i, tmpColor.setHex(items[i].colorHex));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    disposables.push(mesh);
    outdoorRoot.add(mesh);
    instancedBatches += 1;
  };

  flushBatch('district_inst_planters', planterGeo, planterStoneMat, planterItems, true);
  flushBatch('district_inst_shrubs', shrubGeo, shrubMat, shrubItems, true);
  flushBatch('district_inst_flowers', flowerClusterGeo, flowerMat, flowerItems, false);
  flushBatch('district_inst_stone_beds', unitBoxGeo, planterStoneMat, stoneBedItems, true);
  flushBatch('district_inst_downtown_plinths', dtPlinthGeo, planterStoneMat, dtPlinthItems, true);
  flushBatch('district_inst_downtown_sculpture_metals', dtMetalGeo, bronzeMetalMat, dtMetalItems, true);
  flushBatch('district_inst_patio_tables', patioTableGeo, furnitureFrameMat, patioTableItems, true);
  flushBatch('district_inst_patio_umbrellas', patioCanopyGeo, umbrellaCanvasMat, patioCanopyItems, true);
  flushBatch('district_inst_stanchion_posts', stanchionPostGeo, bronzeMetalMat, stanchionPostItems, true);
  flushBatch('district_inst_stanchion_ropes', stanchionRopeGeo, velvetRopeMat, stanchionRopeItems, false);
  flushBatch('district_inst_lounge_screens', neonScreenFrameGeo, furnitureFrameMat, loungeScreenItems, true);
  flushBatch('district_inst_lounge_glows', neonScreenGlowGeo, loungeGlowMat, loungeGlowItems, false);
  flushBatch('district_inst_harbour_boards', unitBoxGeo, harbourBoardMat, harbourBoardItems, true);

  const coveredDistrictCount = [
    counts.downtown > 0,
    counts.coralHeights > 0,
    counts.oceanDrive > 0,
    counts.neonMile > 0,
    counts.harbour > 0,
  ].filter(Boolean).length;

  return {
    downtownPropsCount: counts.downtown,
    coralHeightsPropsCount: counts.coralHeights,
    oceanDrivePropsCount: counts.oceanDrive,
    neonMilePropsCount: counts.neonMile,
    industrialHarbourPropsCount: counts.harbour,
    totalOutdoorPropsCount: placedProps.length,
    coveredDistrictCount,
    instancedBatches,
    sharedMaterialCount: sharedMaterials.length,
    customGeometryCount: customGeos.length,
    placedProps: placedProps.map(({ district, kind, x, z }) => ({ district, kind, x, z })),
  };
}
