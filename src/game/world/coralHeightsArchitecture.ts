import * as THREE from 'three';
import { BuildingSpec } from './cityData';
import { DistrictId } from '../types';

export type CoralHeightsArchetype =
  | 'mediterranean_villa'
  | 'coastal_modern_villa'
  | 'tropical_garden_villa'
  | 'mediterranean_courtyard_villa'
  | 'coastal_terraced_apartments'
  | 'midcentury_breezeway_apartments'
  | 'modern_marina_lofts'
  | 'garden_walkup_apartments'
  | 'neighbourhood_corner_shop';

export type CoralFrontageAxis = '+x' | '-x' | '+z' | '-z';

export type CoralBalconyStyle =
  | 'corbel_wrought_iron'
  | 'cantilever_glass'
  | 'veranda_wood_rail'
  | 'corner_glass_louver'
  | 'recessed_steel_loggia'
  | 'juliet_iron_shutter'
  | 'shop_corner_balcony';

export type CoralRoofStyle =
  | 'terracotta_hipped'
  | 'layered_modern_flat'
  | 'tropical_gable_overhang'
  | 'courtyard_tower_hipped'
  | 'stepped_pergola_parapet'
  | 'breezeway_overrun_parapet'
  | 'loft_canopy_deck'
  | 'garden_eaves_parapet'
  | 'commercial_parapet_monitor';

export interface CoralHeightsBuildingProfile {
  archetype: CoralHeightsArchetype;
  category: 'villa' | 'apartment' | 'shop';
  frontage: CoralFrontageAxis;
  secondaryFrontage: CoralFrontageAxis | null;
  roofStyle: CoralRoofStyle;
  balconyStyle: CoralBalconyStyle;
  hasArchedOpenings: boolean;
  hasShutters: boolean;
  hasPergola: boolean;
  hasAwning: boolean;
  hasSignage: boolean;
  hasStonePlinth: boolean;
  stories: number;
  balconyDepth: number;
  trimTint: number;
  accentTint: number;
  metalTint: number;
  woodTint: number;
  roofTint: number;
}

export interface CoralHeightsBuildingSummary {
  id: string;
  category: 'villa' | 'apartment' | 'shop';
  archetype: CoralHeightsArchetype;
  roofStyle: CoralRoofStyle;
  balconyStyle: CoralBalconyStyle;
  frontage: CoralFrontageAxis;
  balconyCount: number;
  windowCount: number;
  pinnacleY: number;
}

export interface CoralHeightsArchitectureStats {
  totalCount: number;
  villaCount: number;
  apartmentCount: number;
  shopCount: number;
  totalBalconyUnits: number;
  totalWindowUnits: number;
  instancedBatches: number;
  totalFacadeInstances: number;
  sharedMaterialCount: number;
  buildingMaterialCount: number;
  archetypesUsed: CoralHeightsArchetype[];
  buildings: CoralHeightsBuildingSummary[];
}

export interface CoralHeightsArchitectureContext {
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
 * Identifies strictly Coral Heights residential-district buildings (villas, apartments, neighbourhood shop).
 * Explicitly excludes Downtown's dt_plaza_shop, Ocean Drive hotels, Harbour warehouses, and Entertainment clubs.
 */
export function isCoralHeightsBuildingSpec(spec: BuildingSpec): boolean {
  return (
    spec.district === DistrictId.Residential &&
    (spec.style === 'villa' || spec.style === 'apartment' || spec.style === 'shop')
  );
}

/**
 * Pure deterministic mapping from a Coral Heights BuildingSpec to its distinctive architectural
 * archetype, frontage orientation, roof form, balcony style, and coastal material palette.
 */
export function resolveCoralHeightsProfile(spec: BuildingSpec): CoralHeightsBuildingProfile {
  switch (spec.id) {
    // --- 4 COASTAL VILLAS ---
    case 'res_villa_1':
      return {
        archetype: 'mediterranean_villa',
        category: 'villa',
        frontage: '-z', // faces North avenue (z=-96) with park garden terrace on South (+z)
        secondaryFrontage: '+z',
        roofStyle: 'terracotta_hipped',
        balconyStyle: 'corbel_wrought_iron',
        hasArchedOpenings: true,
        hasShutters: true,
        hasPergola: false,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 2,
        balconyDepth: 0.92,
        trimTint: 0xfbf4e6,
        accentTint: spec.accentColor,
        metalTint: 0x2a2d34,
        woodTint: 0x7c4a2d,
        roofTint: 0xc45e3c,
      };
    case 'res_villa_2':
      return {
        archetype: 'coastal_modern_villa',
        category: 'villa',
        frontage: '+x', // faces East boulevard (x=-32) with park-view deck on South (+z)
        secondaryFrontage: '+z',
        roofStyle: 'layered_modern_flat',
        balconyStyle: 'cantilever_glass',
        hasArchedOpenings: false,
        hasShutters: false,
        hasPergola: true,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 2,
        balconyDepth: 1.15,
        trimTint: 0xf7f4ee,
        accentTint: spec.accentColor,
        metalTint: 0x2c3846,
        woodTint: 0x9c6c42,
        roofTint: 0x3b4856,
      };
    case 'res_villa_3':
      return {
        archetype: 'tropical_garden_villa',
        category: 'villa',
        frontage: '+z', // faces South cross-street (z=32) with wrap garden veranda on West (-x)
        secondaryFrontage: '-x',
        roofStyle: 'tropical_gable_overhang',
        balconyStyle: 'veranda_wood_rail',
        hasArchedOpenings: false,
        hasShutters: true,
        hasPergola: true,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: false,
        stories: 2,
        balconyDepth: 1.15,
        trimTint: 0xf8f6f0,
        accentTint: spec.accentColor,
        metalTint: 0x36443d,
        woodTint: 0x8f5b38,
        roofTint: 0xb65a3d,
      };
    case 'north_villa_1':
      return {
        archetype: 'mediterranean_courtyard_villa',
        category: 'villa',
        frontage: '+z', // faces North avenue (z=-96)
        secondaryFrontage: '-x',
        roofStyle: 'courtyard_tower_hipped',
        balconyStyle: 'corbel_wrought_iron',
        hasArchedOpenings: true,
        hasShutters: true,
        hasPergola: true,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 2,
        balconyDepth: 0.95,
        trimTint: 0xfaf2e4,
        accentTint: spec.accentColor,
        metalTint: 0x2d3138,
        woodTint: 0x73452a,
        roofTint: 0xbf5b3a,
      };

    // --- 4 RESIDENTIAL APARTMENTS ---
    case 'res_apt_1':
      return {
        archetype: 'coastal_terraced_apartments',
        category: 'apartment',
        frontage: '-z', // faces North avenue (z=-32) & West boulevard (-x)
        secondaryFrontage: '-x',
        roofStyle: 'stepped_pergola_parapet',
        balconyStyle: 'corbel_wrought_iron',
        hasArchedOpenings: false,
        hasShutters: false,
        hasPergola: true,
        hasAwning: true,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 4,
        balconyDepth: 1.05,
        trimTint: 0xfaf4ea,
        accentTint: spec.accentColor,
        metalTint: 0x2e4552,
        woodTint: 0x92613b,
        roofTint: 0x8a95a3,
      };
    case 'res_apt_2':
      return {
        archetype: 'midcentury_breezeway_apartments',
        category: 'apartment',
        frontage: '+x', // faces East boulevard (x=-32) & North avenue (-z)
        secondaryFrontage: '-z',
        roofStyle: 'breezeway_overrun_parapet',
        balconyStyle: 'corner_glass_louver',
        hasArchedOpenings: false,
        hasShutters: false,
        hasPergola: false,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 4,
        balconyDepth: 1.02,
        trimTint: 0xfbf4e9,
        accentTint: spec.accentColor,
        metalTint: 0x5c4638,
        woodTint: 0x99653f,
        roofTint: 0x86909d,
      };
    case 'north_apt_1':
      return {
        archetype: 'modern_marina_lofts',
        category: 'apartment',
        frontage: '+z', // faces North avenue (z=-96)
        secondaryFrontage: '-x', // faces open residential garden toward north_villa_1
        roofStyle: 'loft_canopy_deck',
        balconyStyle: 'recessed_steel_loggia',
        hasArchedOpenings: false,
        hasShutters: false,
        hasPergola: true,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 4,
        balconyDepth: 0.96,
        trimTint: 0xf6f8f7,
        accentTint: spec.accentColor,
        metalTint: 0x334756,
        woodTint: 0x8e603d,
        roofTint: 0x7b8794,
      };
    case 'west_res_1':
      return {
        archetype: 'garden_walkup_apartments',
        category: 'apartment',
        frontage: '+x', // faces West boulevard (x=-96) & Bayside Palm Park
        secondaryFrontage: '+z',
        roofStyle: 'garden_eaves_parapet',
        balconyStyle: 'juliet_iron_shutter',
        hasArchedOpenings: true,
        hasShutters: true,
        hasPergola: true,
        hasAwning: false,
        hasSignage: false,
        hasStonePlinth: true,
        stories: 3,
        balconyDepth: 0.92,
        trimTint: 0xf9f1e4,
        accentTint: spec.accentColor,
        metalTint: 0x26383b,
        woodTint: 0x7d4e2f,
        roofTint: 0xb95f3f,
      };

    // --- CORAL HEIGHTS NEIGHBOURHOOD SHOP ---
    case 'res_shop_1':
    default:
      return {
        archetype: 'neighbourhood_corner_shop',
        category: spec.style === 'shop' ? 'shop' : spec.style === 'villa' ? 'villa' : 'apartment',
        frontage: '+x', // corner lot: primary East boulevard (x=-32) + secondary South street (z=32)
        secondaryFrontage: '+z',
        roofStyle: 'commercial_parapet_monitor',
        balconyStyle: 'shop_corner_balcony',
        hasArchedOpenings: false,
        hasShutters: true,
        hasPergola: false,
        hasAwning: true,
        hasSignage: true,
        hasStonePlinth: true,
        stories: 2,
        balconyDepth: 0.92,
        trimTint: 0xfbf4e6,
        accentTint: spec.accentColor,
        metalTint: 0x20353a,
        woodTint: 0x805032,
        roofTint: 0x838d9a,
      };
  }
}

// =========================================================================
// CUSTOM PROCEDURAL ARCHITECTURAL BUFFER GEOMETRIES (Normalized & Outward)
// =========================================================================

/**
 * Four-sided Mediterranean hipped terracotta roof normalized in X [-0.5..0.5], Z [-0.5..0.5], Y [0..1].
 * Ridge runs along X from -0.24 to +0.24 at Y=1. Clean outward normals and roof-slope UVs.
 */
export function createHippedTerracottaRoofGeometry(): THREE.BufferGeometry {
  const r = 0.24;
  const FL: [number, number, number] = [-0.5, 0, 0.5];
  const FR: [number, number, number] = [0.5, 0, 0.5];
  const BR: [number, number, number] = [0.5, 0, -0.5];
  const BL: [number, number, number] = [-0.5, 0, -0.5];
  const RL: [number, number, number] = [-r, 1, 0];
  const RR: [number, number, number] = [r, 1, 0];

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...uva, ...uvb, ...uvc);
  };

  // Front (+Z) slope
  pushTri(FL, FR, RR, [0, 0], [3, 0], [2.2, 2.2]);
  pushTri(FL, RR, RL, [0, 0], [2.2, 2.2], [0.8, 2.2]);
  // Back (-Z) slope
  pushTri(BR, BL, RL, [0, 0], [3, 0], [2.2, 2.2]);
  pushTri(BR, RL, RR, [0, 0], [2.2, 2.2], [0.8, 2.2]);
  // Right (+X) hip triangle
  pushTri(FR, BR, RR, [0, 0], [2.4, 0], [1.2, 2.2]);
  // Left (-X) hip triangle
  pushTri(BL, FL, RL, [0, 0], [2.4, 0], [1.2, 2.2]);
  // Bottom soffit (-Y)
  pushTri(FL, BL, BR, [0, 0], [0, 1], [1, 1]);
  pushTri(FL, BR, FR, [0, 0], [1, 1], [1, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Coastal pitched gable roof normalized in X [-0.5..0.5], Z [-0.5..0.5], Y [0..1].
 * Ridge runs full length along X at Z=0, Y=1. Clean outward normals and slope-aligned UVs.
 */
export function createGableRoofGeometry(): THREE.BufferGeometry {
  const FL: [number, number, number] = [-0.5, 0, 0.5];
  const FR: [number, number, number] = [0.5, 0, 0.5];
  const BR: [number, number, number] = [0.5, 0, -0.5];
  const BL: [number, number, number] = [-0.5, 0, -0.5];
  const RL: [number, number, number] = [-0.5, 1, 0];
  const RR: [number, number, number] = [0.5, 1, 0];

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...uva, ...uvb, ...uvc);
  };

  // Front (+Z) slope
  pushTri(FL, FR, RR, [0, 0], [3.2, 0], [3.2, 2.2]);
  pushTri(FL, RR, RL, [0, 0], [3.2, 2.2], [0, 2.2]);
  // Back (-Z) slope
  pushTri(BR, BL, RL, [0, 0], [3.2, 0], [3.2, 2.2]);
  pushTri(BR, RL, RR, [0, 0], [3.2, 2.2], [0, 2.2]);
  // Right (+X) gable end
  pushTri(FR, BR, RR, [0, 0], [1, 0], [0.5, 1]);
  // Left (-X) gable end
  pushTri(BL, FL, RL, [0, 0], [1, 0], [0.5, 1]);
  // Bottom soffit (-Y)
  pushTri(FL, BL, BR, [0, 0], [0, 1], [1, 1]);
  pushTri(FL, BR, FR, [0, 0], [1, 1], [1, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Mediterranean arched spandrel surround normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 * Creates a clean semicircular arch opening for arched villa windows and colonnade loggias.
 */
export function createArchedFrameGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 1);
  shape.lineTo(0.5, 1);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.36, 0);
  // Semicircular inner arch cutout from angle 0 to PI centered at (0, 0) with radius 0.36, stretched vertically via points
  const segs = 12;
  for (let i = 1; i <= segs; i++) {
    const theta = (i / segs) * Math.PI;
    const ax = Math.cos(theta) * 0.36;
    const ay = Math.sin(theta) * 0.72;
    shape.lineTo(ax, ay);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    curveSegments: 8,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -0.5);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Classic sloped commercial/coastal striped awning with vertical front valance.
 * Anchors flush against a wall at Z=0, extends outward to Z=+1, normalized X [-0.5..0.5], Y [0..1].
 */
export function createSlopedAwningGeometry(): THREE.BufferGeometry {
  const TL: [number, number, number] = [-0.5, 1.0, 0];
  const TR: [number, number, number] = [0.5, 1.0, 0];
  const BL: [number, number, number] = [-0.5, 0.28, 0];
  const BR: [number, number, number] = [0.5, 0.28, 0];
  const FTL: [number, number, number] = [-0.5, 0.24, 1.0];
  const FTR: [number, number, number] = [0.5, 0.24, 1.0];
  const FBL: [number, number, number] = [-0.5, 0.0, 1.0];
  const FBR: [number, number, number] = [0.5, 0.0, 1.0];

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...uva, ...uvb, ...uvc);
  };

  // Sloped top fabric (+Y/+Z) — U runs along width for vertical stripes
  pushTri(FTL, FTR, TR, [0, 1], [1, 1], [1, 0]);
  pushTri(FTL, TR, TL, [0, 1], [1, 0], [0, 0]);
  // Front vertical valance skirt (+Z)
  pushTri(FBL, FBR, FTR, [0, 1], [1, 1], [1, 0.8]);
  pushTri(FBL, FTR, FTL, [0, 1], [1, 0.8], [0, 0.8]);
  // Left end triangle + valance (-X)
  pushTri(TL, BL, FTL, [0, 0], [0, 0.75], [0.2, 0.75]);
  pushTri(BL, FBL, FTL, [0, 0.75], [0.2, 1], [0.2, 0.75]);
  // Right end triangle + valance (+X)
  pushTri(BR, TR, FTR, [1, 0.75], [1, 0], [0.8, 0.75]);
  pushTri(FBR, BR, FTR, [0.8, 1], [1, 0.75], [0.8, 0.75]);
  // Underside (-Y)
  pushTri(BL, BR, FBR, [0, 0], [1, 0], [1, 1]);
  pushTri(BL, FBR, FBL, [0, 0], [1, 1], [0, 1]);
  // Back wall mount (-Z)
  pushTri(BR, BL, TL, [1, 1], [0, 1], [0, 0]);
  pushTri(BR, TL, TR, [1, 1], [0, 0], [1, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Sculpted stepped architectural corbel bracket normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors against wall at Z=0 and supports projecting balcony slabs / roof eaves at Y=1.
 */
export function createBalconyCorbelGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.24, 0);
  shape.lineTo(0.36, 0.34);
  shape.lineTo(0.72, 0.68);
  shape.lineTo(1.0, 0.84);
  shape.lineTo(1.0, 1.0);
  shape.lineTo(0, 1.0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -0.5);
  // Pure rigid rotation: original X (0..1) -> +Z (0..1), original Z (-0.5..0.5) -> -X (-0.5..0.5)
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// =========================================================================
// PROCEDURAL RESIDENTIAL TEXTURES (Browser Canvas + Safe Node Fallback)
// =========================================================================

function createSafeProceduralTexture(
  width: number,
  height: number,
  isColor: boolean,
  fallbackRgb: [number, number, number],
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat = false,
): THREE.Texture {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      draw(ctx, width, height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      return tex;
    }
  }
  const data = new Uint8Array([fallbackRgb[0], fallbackRgb[1], fallbackRgb[2], 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createCoralHeightsTextures(disposables: Array<{ dispose: () => void }>) {
  // 1. Mediterranean Terracotta Barrel Roof Tiles (albedo + bump)
  const terracottaMap = createSafeProceduralTexture(
    256,
    256,
    true,
    [194, 100, 68],
    (ctx, w, h) => {
      ctx.fillStyle = '#b45638';
      ctx.fillRect(0, 0, w, h);
      const cols = 10;
      const rows = 8;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rh;
        for (let c = 0; c < cols; c++) {
          const x = c * cw;
          const seed = (r * 31 + c * 17) % 7;
          const grad = ctx.createLinearGradient(x, y, x + cw, y);
          const ridgeHex = seed % 3 === 0 ? '#d87a52' : seed % 3 === 1 ? '#cb6a44' : '#c05e3a';
          grad.addColorStop(0.0, '#7c3621');
          grad.addColorStop(0.28, ridgeHex);
          grad.addColorStop(0.62, '#df8a60');
          grad.addColorStop(1.0, '#6e2e1b');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cw, rh - 2);
          // Overlapping course shadow lip at bottom of each barrel course
          ctx.fillStyle = 'rgba(42, 16, 10, 0.42)';
          ctx.fillRect(x, y + rh - 4, cw, 4);
        }
      }
    },
    true,
  );

  const terracottaBump = createSafeProceduralTexture(
    128,
    128,
    false,
    [128, 128, 128],
    (ctx, w, h) => {
      ctx.fillStyle = '#707070';
      ctx.fillRect(0, 0, w, h);
      const cols = 10;
      const rows = 8;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw;
          const y = r * rh;
          const grad = ctx.createLinearGradient(x, y, x + cw, y);
          grad.addColorStop(0, '#383838');
          grad.addColorStop(0.5, '#f0f0f0');
          grad.addColorStop(1, '#383838');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cw, rh - 1);
          ctx.fillStyle = '#202020';
          ctx.fillRect(x, y + rh - 2, cw, 2);
        }
      }
    },
    true,
  );

  // 2. Florida Coral-Limestone Ashlar Masonry Texture
  const stoneMap = createSafeProceduralTexture(
    256,
    256,
    true,
    [224, 214, 198],
    (ctx, w, h) => {
      ctx.fillStyle = '#ded4c4';
      ctx.fillRect(0, 0, w, h);
      const rows = 8;
      const rh = h / rows;
      const shades = ['#e7dfd0', '#dfd5c3', '#d7ccb8', '#ebe4d6'];
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * 32;
        for (let c = -1; c < 5; c++) {
          const bx = c * 64 + offset;
          const by = r * rh;
          ctx.fillStyle = shades[(r * 5 + c + 4) % shades.length];
          ctx.fillRect(bx + 2, by + 2, 60, rh - 4);
        }
        ctx.fillStyle = 'rgba(110, 98, 82, 0.28)';
        ctx.fillRect(0, r * rh, w, 2);
      }
      for (let i = 0; i < 1200; i++) {
        const px = (i * 47) % w;
        const py = (i * 83) % h;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(90,78,62,0.08)';
        ctx.fillRect(px, py, 2, 2);
      }
    },
    true,
  );

  // 3. Soft Warm Domestic Window Interior Glow Map (natural subtle room/curtain warmth at night)
  const warmWindowGlowMap = createSafeProceduralTexture(
    128,
    128,
    true,
    [168, 128, 76],
    (ctx, w, h) => {
      // Soft gradient: darker ceiling at top, warm interior lamp glow mid-to-lower, subtle sheer curtain sides
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#44321c');
      g.addColorStop(0.35, '#9d7644');
      g.addColorStop(0.72, '#c89b5c');
      g.addColorStop(1.0, '#856238');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Subtle curtain framing at left/right edges
      ctx.fillStyle = 'rgba(32, 24, 16, 0.36)';
      ctx.fillRect(0, 0, 18, h);
      ctx.fillRect(w - 18, 0, 18, h);
      // Horizontal venetian/mullion hint
      ctx.fillStyle = 'rgba(28, 22, 16, 0.22)';
      ctx.fillRect(0, h * 0.48, w, 5);
    },
    false,
  );

  // 4. Striped Coastal Shop Awning Texture (Emerald-Teal & Warm Cream)
  const stripedAwningMap = createSafeProceduralTexture(
    256,
    128,
    true,
    [43, 122, 120],
    (ctx, w, h) => {
      const stripes = 12;
      const sw = w / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#246b69' : '#f7efe0';
        ctx.fillRect(i * sw, 0, sw + 1, h);
      }
      // Subtle woven fabric horizontal seam line above valance
      ctx.fillStyle = 'rgba(18, 42, 44, 0.25)';
      ctx.fillRect(0, h * 0.78, w, 3);
      // Scalloped trim edge line at bottom
      ctx.fillStyle = '#184b49';
      ctx.fillRect(0, h - 6, w, 6);
    },
    true,
  );

  // 5. Crisp Readable Commercial Shop Signboard ("CORAL COVE — MARKET · BAKERY · ESPRESSO")
  const shopSignMap = createSafeProceduralTexture(
    512,
    128,
    true,
    [25, 79, 80],
    (ctx, w, h) => {
      // Deep coastal emerald-teal lacquered signboard
      ctx.fillStyle = '#17484a';
      ctx.fillRect(0, 0, w, h);

      // Warm cream & muted gold coastal border frame
      ctx.strokeStyle = '#f2dec0';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#d4a359';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      // Tasteful minimal left & right diamond emblems
      ctx.fillStyle = '#d4a359';
      for (const cx of [44, w - 44]) {
        ctx.beginPath();
        ctx.moveTo(cx, h * 0.5 - 12);
        ctx.lineTo(cx + 10, h * 0.5);
        ctx.lineTo(cx, h * 0.5 + 12);
        ctx.lineTo(cx - 10, h * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // Crisp legible main title
      ctx.fillStyle = '#fdf6e9';
      ctx.font = 'bold 46px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CORAL COVE', w / 2, 52);

      // Crisp legible subtitle
      ctx.fillStyle = '#e5be78';
      ctx.font = '600 18px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('MARKET  •  BAKERY  •  ESPRESSO', w / 2, 92);
    },
    false,
  );

  // 6. Warm Coastal Shopfront Interior Display Window Texture
  const shopDisplayMap = createSafeProceduralTexture(
    256,
    128,
    true,
    [186, 140, 82],
    (ctx, w, h) => {
      // Warm inviting cafe/market interior gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#3a2c20');
      bg.addColorStop(0.28, '#8a6640');
      bg.addColorStop(0.68, '#cfa063');
      bg.addColorStop(1.0, '#6a4d30');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Warm hanging pendant light halos near ceiling
      for (const lx of [52, 128, 204]) {
        const rg = ctx.createRadialGradient(lx, 28, 3, lx, 28, 34);
        rg.addColorStop(0, 'rgba(255, 240, 200, 0.92)');
        rg.addColorStop(0.45, 'rgba(255, 208, 132, 0.45)');
        rg.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(lx - 34, 0, 68, 66);
      }

      // Subtle cafe/bakery wooden display counter & shelf silhouettes
      ctx.fillStyle = 'rgba(42, 28, 18, 0.55)';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = 'rgba(56, 36, 22, 0.42)';
      ctx.fillRect(14, h * 0.42, w - 28, 5);
      ctx.fillRect(14, h * 0.58, w - 28, 5);
      // Displayed jars / bakery loaves along shelves
      ctx.fillStyle = 'rgba(235, 198, 138, 0.65)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(22 + i * 28, h * 0.48, 16, 10);
      }
    },
    false,
  );

  disposables.push(
    terracottaMap,
    terracottaBump,
    stoneMap,
    warmWindowGlowMap,
    stripedAwningMap,
    shopSignMap,
    shopDisplayMap,
  );

  return {
    terracottaMap,
    terracottaBump,
    stoneMap,
    warmWindowGlowMap,
    stripedAwningMap,
    shopSignMap,
    shopDisplayMap,
  };
}

// =========================================================================
// MAIN CORAL HEIGHTS PROCEDURAL ARCHITECTURE BUILDER
// =========================================================================

export function buildCoralHeightsArchitecture(
  coralSpecs: BuildingSpec[],
  ctx: CoralHeightsArchitectureContext,
): CoralHeightsArchitectureStats {
  const {
    root,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    environmentMeshesForCamera,
    disposables,
  } = ctx;

  // 1. Shared procedural geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const foliageGeo = new THREE.DodecahedronGeometry(0.55, 1);
  const hippedRoofGeo = createHippedTerracottaRoofGeometry();
  const gableRoofGeo = createGableRoofGeometry();
  const archedFrameGeo = createArchedFrameGeometry();
  const slopedAwningGeo = createSlopedAwningGeometry();
  const corbelGeo = createBalconyCorbelGeometry();

  disposables.push(
    unitBoxGeo,
    unitCylGeo,
    foliageGeo,
    hippedRoofGeo,
    gableRoofGeo,
    archedFrameGeo,
    slopedAwningGeo,
    corbelGeo,
  );

  // 2. Shared procedural textures
  const tex = createCoralHeightsTextures(disposables);

  // 3. Compact calibrated PBR material pool (distinct roughness/metalness across stucco, stone, tile, wood, metal, glass)
  const trimConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.04,
    envMapIntensity: 0.65,
  });
  const stoneMasonryMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.stoneMap,
    roughness: 0.82,
    metalness: 0.03,
    envMapIntensity: 0.68,
  });
  const terracottaRoofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.terracottaMap,
    bumpMap: tex.terracottaBump,
    bumpScale: 0.055,
    roughness: 0.72,
    metalness: 0.04,
    envMapIntensity: 0.72,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.74,
    metalness: 0.04,
    envMapIntensity: 0.58,
  });
  const metalRailingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.78,
    envMapIntensity: 1.25,
  });
  const accentPaintMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.1,
    envMapIntensity: 0.78,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.52,
  });
  const roofConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x8792a0,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });

  // Reflective residential window glass (two shared materials: warmly lit rooms at night + dark reflective unlit rooms)
  const litWindowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x26394c,
    emissive: 0xa8783e,
    emissiveMap: tex.warmWindowGlowMap,
    emissiveIntensity: 0.08,
    roughness: 0.08,
    metalness: 0.18,
    ior: 1.5,
    reflectivity: 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
  });
  const darkWindowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c2d3f,
    emissive: 0x3b4d60,
    emissiveIntensity: 0.02,
    roughness: 0.08,
    metalness: 0.22,
    ior: 1.52,
    reflectivity: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.48,
  });
  const glassBalustradeMat = new THREE.MeshPhysicalMaterial({
    color: 0x8ad0dc,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.5,
    envMapIntensity: 1.42,
  });

  // Neighbourhood shop materials (display glazing, striped fabric awning, crisp signboard)
  const shopDisplayGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8cdb8,
    map: tex.shopDisplayMap,
    emissive: 0xbe8b4c,
    emissiveMap: tex.shopDisplayMap,
    emissiveIntensity: 0.1,
    roughness: 0.1,
    metalness: 0.16,
    ior: 1.5,
    reflectivity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.38,
  });
  const stripedAwningMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.stripedAwningMap,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.55,
  });
  const shopSignMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.shopSignMap,
    emissive: 0x6b5638,
    emissiveMap: tex.shopSignMap,
    emissiveIntensity: 0.08,
    roughness: 0.42,
    metalness: 0.08,
    envMapIntensity: 0.85,
  });

  // Subtle warm residential porch / entry soffit lantern sconce (warm muted amber so it never blasts harsh neon)
  const porchLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: 0x8f6632,
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.1,
  });

  emissiveBuildingMaterials.push(
    litWindowGlassMat,
    darkWindowGlassMat,
    shopDisplayGlassMat,
    shopSignMat,
  );
  neonTrimMaterials.push(porchLanternMat);

  const sharedMaterials: THREE.Material[] = [
    trimConcreteMat,
    stoneMasonryMat,
    terracottaRoofMat,
    woodMat,
    metalRailingMat,
    accentPaintMat,
    foliageMat,
    roofConcreteMat,
    litWindowGlassMat,
    darkWindowGlassMat,
    glassBalustradeMat,
    shopDisplayGlassMat,
    stripedAwningMat,
    shopSignMat,
    porchLanternMat,
  ];
  disposables.push(...sharedMaterials);

  // 4. City-wide InstancedMesh collectors
  const trimEntries: InstanceEntry[] = [];
  const stoneEntries: InstanceEntry[] = [];
  const accentEntries: InstanceEntry[] = [];
  const woodEntries: InstanceEntry[] = [];
  const metalEntries: InstanceEntry[] = [];
  const columnEntries: InstanceEntry[] = [];
  const litGlassEntries: InstanceEntry[] = [];
  const darkGlassEntries: InstanceEntry[] = [];
  const glassBalustradeEntries: InstanceEntry[] = [];
  const archEntries: InstanceEntry[] = [];
  const corbelEntries: InstanceEntry[] = [];
  const foliageEntries: InstanceEntry[] = [];
  const lanternEntries: InstanceEntry[] = [];

  const dummy = new THREE.Object3D();
  const pushInst = (
    list: InstanceEntry[],
    wx: number,
    wy: number,
    wz: number,
    sx: number,
    sy: number,
    sz: number,
    colorHex: number,
    rotY = 0,
  ) => {
    dummy.position.set(wx, wy, wz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    list.push({ matrix: dummy.matrix.clone(), colorHex });
  };

  // Axis helper: converts face-local (along, height, outward) into world coordinates
  const faceToWorld = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    face: CoralFrontageAxis,
    along: number,
    outward: number,
  ): { x: number; z: number; rotY: number; isX: boolean; sign: number } => {
    const isX = face === '+x' || face === '-x';
    const sign = face === '+x' || face === '+z' ? 1 : -1;
    const wallDist = (isX ? halfW : halfD) + outward;
    const x = isX ? cx + sign * wallDist : cx + along;
    const z = isX ? cz + along : cz + sign * wallDist;
    const rotY =
      face === '+z' ? 0 : face === '-z' ? Math.PI : face === '+x' ? Math.PI / 2 : -Math.PI / 2;
    return { x, z, rotY, isX, sign };
  };

  let totalBalconyUnits = 0;
  let totalWindowUnits = 0;

  /**
   * Places a recessed 3D architectural window unit (glass pane + deep perimeter casing + sill + lintel
   * + mullions + optional Mediterranean arch spandrel + optional wooden shutters) flush on a facade.
   */
  const addWindowUnit = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    face: CoralFrontageAxis,
    along: number,
    centerY: number,
    winW: number,
    winH: number,
    profile: CoralHeightsBuildingProfile,
    options?: {
      lit?: boolean;
      arched?: boolean;
      shutters?: boolean;
      eyebrow?: boolean;
      fullDoor?: boolean;
      frameColor?: number;
      shutterColor?: number;
    },
  ) => {
    const isX = face === '+x' || face === '-x';
    const frameDepth = 0.16;
    const frameThick = 0.11;
    const frameCol = options?.frameColor ?? profile.trimTint;

    // 1. Reflective glass pane sitting cleanly proud of stucco (0.04m) inside the deeper 0.16m 3D frame surround
    const gPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.04);
    const glassList = options?.lit ? litGlassEntries : darkGlassEntries;
    pushInst(
      glassList,
      gPos.x,
      centerY,
      gPos.z,
      isX ? 0.05 : winW - 0.14,
      winH - 0.14,
      isX ? winW - 0.14 : 0.05,
      0xffffff,
    );

    // 2. Left & right 3D jambs (projecting 0.15m so glass visibly reads as recessed!)
    for (const side of [-1, 1]) {
      const jPos = faceToWorld(
        cx,
        cz,
        halfW,
        halfD,
        face,
        along + side * (winW * 0.5 - frameThick * 0.5),
        frameDepth * 0.5,
      );
      pushInst(
        trimEntries,
        jPos.x,
        centerY,
        jPos.z,
        isX ? frameDepth : frameThick,
        winH,
        isX ? frameThick : frameDepth,
        frameCol,
      );
    }

    // 3. Projecting bottom stone/stucco sill (omitted for full sliding doors)
    if (!options?.fullDoor) {
      const sillPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.13);
      pushInst(
        trimEntries,
        sillPos.x,
        centerY - winH * 0.5 - 0.04,
        sillPos.z,
        isX ? 0.24 : winW + 0.22,
        0.11,
        isX ? winW + 0.22 : 0.24,
        frameCol,
      );
    }

    // 4. Top header lintel OR sculpted Mediterranean arch spandrel
    if (options?.arched) {
      const archH = Math.min(0.68, winH * 0.34);
      const aPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.1);
      pushInst(
        archEntries,
        aPos.x,
        centerY + winH * 0.5 - archH,
        aPos.z,
        winW,
        archH,
        0.2,
        frameCol,
        aPos.rotY,
      );
    } else {
      const headPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.1);
      pushInst(
        trimEntries,
        headPos.x,
        centerY + winH * 0.5 - frameThick * 0.4,
        headPos.z,
        isX ? 0.2 : winW + 0.12,
        frameThick * 1.25,
        isX ? winW + 0.12 : 0.2,
        frameCol,
      );
    }

    // 5. Optional coastal shade eyebrow ledge above window
    if (options?.eyebrow) {
      const ebPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.26);
      pushInst(
        trimEntries,
        ebPos.x,
        centerY + winH * 0.5 + 0.1,
        ebPos.z,
        isX ? 0.46 : winW + 0.36,
        0.1,
        isX ? winW + 0.36 : 0.46,
        profile.trimTint,
      );
    }

    // 6. Central vertical & horizontal glazing muntin bars
    const mPos = faceToWorld(cx, cz, halfW, halfD, face, along, 0.08);
    pushInst(
      metalEntries,
      mPos.x,
      centerY,
      mPos.z,
      isX ? 0.05 : 0.06,
      winH - 0.18,
      isX ? 0.06 : 0.05,
      profile.metalTint,
    );
    if (!options?.fullDoor) {
      pushInst(
        metalEntries,
        mPos.x,
        centerY + 0.08,
        mPos.z,
        isX ? 0.05 : winW - 0.18,
        0.055,
        isX ? winW - 0.18 : 0.05,
        profile.metalTint,
      );
    }

    // 7. Optional coastal wooden louvered shutters flanking window
    if (options?.shutters) {
      const shW = Math.min(0.46, winW * 0.3);
      const shCol = options?.shutterColor ?? profile.woodTint;
      for (const side of [-1, 1]) {
        const sPos = faceToWorld(
          cx,
          cz,
          halfW,
          halfD,
          face,
          along + side * (winW * 0.5 + shW * 0.52),
          0.07,
        );
        pushInst(
          woodEntries,
          sPos.x,
          centerY,
          sPos.z,
          isX ? 0.08 : shW,
          winH - 0.08,
          isX ? shW : 0.08,
          shCol,
        );
      }
    }

    totalWindowUnits++;
  };

  /**
   * Places a structurally grounded residential balcony (concrete slab + sculpted corbel supports
   * + glass or metal/wood railings + optional privacy louver screen or planter box).
   */
  const addResidentialBalcony = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    face: CoralFrontageAxis,
    along: number,
    floorY: number,
    span: number,
    depth: number,
    profile: CoralHeightsBuildingProfile,
    options?: {
      useGlass?: boolean;
      useCorbels?: boolean;
      addWoodScreen?: boolean;
      addPlanter?: boolean;
      accentEdge?: boolean;
    },
  ) => {
    const isX = face === '+x' || face === '-x';
    const slabH = 0.22;
    const railH = 0.98;

    // 1. Concrete balcony slab
    const slabPos = faceToWorld(cx, cz, halfW, halfD, face, along, depth * 0.5);
    pushInst(
      trimEntries,
      slabPos.x,
      floorY,
      slabPos.z,
      isX ? depth : span,
      slabH,
      isX ? span : depth,
      profile.trimTint,
    );

    // Optional painted accent edge fascia
    if (options?.accentEdge) {
      const edgePos = faceToWorld(cx, cz, halfW, halfD, face, along, depth - 0.02);
      pushInst(
        accentEntries,
        edgePos.x,
        floorY,
        edgePos.z,
        isX ? 0.07 : span * 0.98,
        slabH * 0.65,
        isX ? span * 0.98 : 0.07,
        profile.accentTint,
      );
    }

    // 2. Sculpted structural corbel brackets supporting balcony slab from below
    if (options?.useCorbels) {
      const corbelOffsets = span > 4.2 ? [-span * 0.36, 0, span * 0.36] : [-span * 0.32, span * 0.32];
      for (const coff of corbelOffsets) {
        const cPos = faceToWorld(cx, cz, halfW, halfD, face, along + coff, 0);
        pushInst(
          corbelEntries,
          cPos.x,
          floorY - slabH * 0.5 - 0.52,
          cPos.z,
          0.24,
          0.52,
          depth * 0.82,
          profile.trimTint,
          cPos.rotY,
        );
      }
    }

    // 3. Top handrail & corner stanchions
    const railTopY = floorY + slabH * 0.5 + railH;
    const outerOff = depth - 0.08;
    const frontPos = faceToWorld(cx, cz, halfW, halfD, face, along, outerOff);
    const railSpan = span - 0.08;

    pushInst(
      metalEntries,
      frontPos.x,
      railTopY,
      frontPos.z,
      isX ? 0.065 : railSpan,
      0.065,
      isX ? railSpan : 0.065,
      profile.metalTint,
    );

    for (const side of [-1, 1]) {
      const sOff = along + side * (railSpan * 0.5);
      const sideRailPos = faceToWorld(cx, cz, halfW, halfD, face, sOff, outerOff * 0.5);
      pushInst(
        metalEntries,
        sideRailPos.x,
        railTopY,
        sideRailPos.z,
        isX ? outerOff : 0.065,
        0.065,
        isX ? 0.065 : outerOff,
        profile.metalTint,
      );
      const postPos = faceToWorld(cx, cz, halfW, halfD, face, sOff, outerOff);
      pushInst(
        metalEntries,
        postPos.x,
        floorY + slabH * 0.5 + railH * 0.5,
        postPos.z,
        0.065,
        railH,
        0.065,
        profile.metalTint,
      );
    }

    // 4. Translucent glass balustrade OR wrought-iron vertical balusters
    if (options?.useGlass) {
      const panelH = railH - 0.14;
      const panelY = floorY + slabH * 0.5 + panelH * 0.5 + 0.06;
      pushInst(
        glassBalustradeEntries,
        frontPos.x,
        panelY,
        frontPos.z,
        isX ? 0.055 : railSpan - 0.12,
        panelH,
        isX ? railSpan - 0.12 : 0.055,
        0xffffff,
      );
      for (const side of [-1, 1]) {
        const sOff = along + side * (railSpan * 0.5);
        const sgPos = faceToWorld(cx, cz, halfW, halfD, face, sOff, outerOff * 0.5);
        pushInst(
          glassBalustradeEntries,
          sgPos.x,
          panelY,
          sgPos.z,
          isX ? outerOff - 0.1 : 0.055,
          panelH,
          isX ? 0.055 : outerOff - 0.1,
          0xffffff,
        );
      }
      const midPosts = Math.max(1, Math.floor(railSpan / 2.2));
      for (let p = 1; p < midPosts; p++) {
        const poff = along + (p / midPosts - 0.5) * railSpan;
        const mp = faceToWorld(cx, cz, halfW, halfD, face, poff, outerOff);
        pushInst(metalEntries, mp.x, panelY, mp.z, 0.05, railH, 0.05, profile.metalTint);
      }
    } else {
      // Bottom front rail + side-return bottom bars & mid pickets for a complete enclosed wrought-iron basket
      const botRailY = floorY + slabH * 0.5 + 0.12;
      pushInst(
        metalEntries,
        frontPos.x,
        botRailY,
        frontPos.z,
        isX ? 0.05 : railSpan,
        0.05,
        isX ? railSpan : 0.05,
        profile.metalTint,
      );
      for (const side of [-1, 1]) {
        const sOff = along + side * (railSpan * 0.5);
        const sideBotPos = faceToWorld(cx, cz, halfW, halfD, face, sOff, outerOff * 0.5);
        pushInst(
          metalEntries,
          sideBotPos.x,
          botRailY,
          sideBotPos.z,
          isX ? outerOff : 0.05,
          0.05,
          isX ? 0.05 : outerOff,
          profile.metalTint,
        );
        pushInst(
          metalEntries,
          sideBotPos.x,
          floorY + slabH * 0.5 + railH * 0.5,
          sideBotPos.z,
          0.04,
          railH - 0.08,
          0.04,
          profile.metalTint,
        );
      }
      const pickets = Math.max(3, Math.min(9, Math.round(railSpan / 0.58)));
      for (let p = 1; p < pickets; p++) {
        const poff = along + (p / pickets - 0.5) * railSpan;
        const pk = faceToWorld(cx, cz, halfW, halfD, face, poff, outerOff);
        pushInst(
          metalEntries,
          pk.x,
          floorY + slabH * 0.5 + railH * 0.5,
          pk.z,
          0.04,
          railH - 0.08,
          0.04,
          profile.metalTint,
        );
      }
    }

    // 5. Optional slatted wooden privacy screen on one side
    if (options?.addWoodScreen) {
      const sOff = along + span * 0.5 - 0.08;
      const scrPos = faceToWorld(cx, cz, halfW, halfD, face, sOff, depth * 0.45);
      pushInst(
        woodEntries,
        scrPos.x,
        floorY + slabH * 0.5 + 1.05,
        scrPos.z,
        isX ? depth * 0.8 : 0.12,
        2.1,
        isX ? 0.12 : depth * 0.8,
        profile.woodTint,
      );
    }

    // 6. Optional coastal balcony planter box with tropical greenery
    if (options?.addPlanter) {
      const plPos = faceToWorld(cx, cz, halfW, halfD, face, along, depth - 0.24);
      const plW = Math.min(1.6, span * 0.44);
      pushInst(
        trimEntries,
        plPos.x,
        floorY + slabH * 0.5 + 0.22,
        plPos.z,
        isX ? 0.34 : plW,
        0.38,
        isX ? plW : 0.34,
        profile.trimTint,
      );
      for (const foff of [-plW * 0.28, plW * 0.28]) {
        const fp = faceToWorld(cx, cz, halfW, halfD, face, along + foff, depth - 0.24);
        pushInst(foliageEntries, fp.x, floorY + slabH * 0.5 + 0.58, fp.z, 0.42, 0.38, 0.42, 0x2f7d47);
      }
    }

    totalBalconyUnits++;
  };

  /**
   * Adds a grounded coastal timber pergola structure at any world position/height.
   */
  const addPergola = (
    cx: number,
    cz: number,
    baseY: number,
    pw: number,
    pd: number,
    ph: number,
    woodTint: number,
  ) => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushInst(
          woodEntries,
          cx + sx * (pw * 0.46),
          baseY + ph * 0.5,
          cz + sz * (pd * 0.46),
          0.18,
          ph,
          0.18,
          woodTint,
        );
      }
    }
    pushInst(woodEntries, cx, baseY + ph, cz + pd * 0.46, pw + 0.25, 0.18, 0.18, woodTint);
    pushInst(woodEntries, cx, baseY + ph, cz - pd * 0.46, pw + 0.25, 0.18, 0.18, woodTint);
    pushInst(woodEntries, cx + pw * 0.46, baseY + ph, cz, 0.18, 0.18, pd + 0.25, woodTint);
    pushInst(woodEntries, cx - pw * 0.46, baseY + ph, cz, 0.18, 0.18, pd + 0.25, woodTint);
    const slats = Math.max(4, Math.min(8, Math.round(pw / 0.85)));
    for (let i = 1; i < slats; i++) {
      const ox = (i / slats - 0.5) * (pw - 0.3);
      pushInst(woodEntries, cx + ox, baseY + ph + 0.08, cz, 0.11, 0.11, pd * 0.96, woodTint);
    }
  };

  /**
   * Adds flanking tropical planter boxes beside residential doors/verandas.
   */
  const addPlanterPair = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    face: CoralFrontageAxis,
    offsetSpan: number,
    outward: number,
    baseY: number,
    trimTint: number,
  ) => {
    const tints = [0x2d7a47, 0x3a8d52];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const p = faceToWorld(cx, cz, halfW, halfD, face, side * offsetSpan, outward);
      pushInst(trimEntries, p.x, baseY + 0.32, p.z, 0.68, 0.64, 0.68, trimTint);
      pushInst(foliageEntries, p.x, baseY + 0.82, p.z, 0.64, 0.62, 0.64, tints[i]);
    }
  };

  // =========================================================================
  // BUILD EACH BUILDING BY ITS ARCHETYPE
  // =========================================================================

  let villaCount = 0;
  let apartmentCount = 0;
  let shopCount = 0;
  let buildingMaterialCount = 0;
  const archetypesUsed: CoralHeightsArchetype[] = [];
  const buildings: CoralHeightsBuildingSummary[] = [];

  for (const spec of coralSpecs) {
    const profile = resolveCoralHeightsProfile(spec);
    archetypesUsed.push(profile.archetype);
    if (profile.category === 'villa') villaCount++;
    else if (profile.category === 'apartment') apartmentCount++;
    else shopCount++;

    const startBalconies = totalBalconyUnits;
    const startWindows = totalWindowUnits;

    // Dedicated matte stucco wall material per building (non-emissive painted plaster)
    const stuccoMat = new THREE.MeshStandardMaterial({
      color: spec.baseColor,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.62,
    });
    disposables.push(stuccoMat);
    buildingMaterialCount++;

    const group = new THREE.Group();
    group.name = `coral_heights_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);

    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const hw = w * 0.5;
    const hd = d * 0.5;
    let pinnacleY = h;

    // Deterministic hash for natural lit vs unlit domestic rooms at night
    const isWindowLit = (seed: number) => ((seed * 2654435761) >>> 28) % 10 < 6;

    // -----------------------------------------------------------------------
    // ARCHETYPE 1: MEDITERRANEAN COASTAL VILLA (res_villa_1)
    // -----------------------------------------------------------------------
    if (profile.archetype === 'mediterranean_villa') {
      const bodyH = h - 1.3; // 6.2m main stucco body + terracotta hipped roof to ~8.4m
      // Ground limestone plinth
      const plinth = new THREE.Mesh(unitBoxGeo, stoneMasonryMat);
      plinth.scale.set(w * 0.99, 0.55, d * 0.99);
      plinth.position.y = 0.275;
      plinth.receiveShadow = true;
      group.add(plinth);

      // Main 2-story warm cream stucco villa body
      const mainBody = new THREE.Mesh(unitBoxGeo, stuccoMat);
      mainBody.scale.set(w * 0.96, bodyH - 0.55, d * 0.96);
      mainBody.position.y = 0.55 + (bodyH - 0.55) * 0.5;
      mainBody.castShadow = true;
      mainBody.receiveShadow = true;
      group.add(mainBody);
      environmentMeshesForCamera.push(mainBody);

      const effHW = hw * 0.96;
      const effHD = hd * 0.96;

      // Decorative limestone corner quoins & mid-floor stringcourse cornice
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pushInst(stoneEntries, spec.x + sx * (effHW - 0.14), bodyH * 0.5, spec.z + sz * (effHD - 0.14), 0.46, bodyH, 0.46, 0xeadfce);
        }
      }
      const beltY = 3.35;
      pushInst(trimEntries, spec.x, beltY, spec.z + effHD + 0.08, w * 0.98, 0.24, 0.22, profile.trimTint);
      pushInst(trimEntries, spec.x, beltY, spec.z - effHD - 0.08, w * 0.98, 0.24, 0.22, profile.trimTint);
      pushInst(trimEntries, spec.x + effHW + 0.08, beltY, spec.z, 0.22, 0.24, d * 0.98, profile.trimTint);
      pushInst(trimEntries, spec.x - effHW - 0.08, beltY, spec.z, 0.22, 0.24, d * 0.98, profile.trimTint);

      // Molded eaves cornice + Terracotta hipped roof with overhanging eaves
      const roofH = 2.25;
      const roof = new THREE.Mesh(hippedRoofGeo, terracottaRoofMat);
      roof.scale.set(w + 0.9, roofH, d + 0.9);
      roof.position.y = bodyH;
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);
      pinnacleY = bodyH + roofH;

      // Decorative wooden rafter tails under front & back eaves
      for (let i = -4; i <= 4; i++) {
        const ox = i * (w * 0.11);
        pushInst(woodEntries, spec.x + ox, bodyH - 0.08, spec.z - effHD - 0.34, 0.12, 0.14, 0.52, profile.woodTint);
        pushInst(woodEntries, spec.x + ox, bodyH - 0.08, spec.z + effHD + 0.34, 0.12, 0.14, 0.52, profile.woodTint);
      }

      // Mediterranean terracotta chimney stack
      const chim = new THREE.Mesh(unitBoxGeo, stuccoMat);
      chim.scale.set(0.95, 2.1, 0.95);
      chim.position.set(w * 0.26, bodyH + 1.45, -d * 0.14);
      group.add(chim);
      pushInst(trimEntries, spec.x + w * 0.26, bodyH + 2.55, spec.z - d * 0.14, 1.12, 0.18, 1.12, profile.roofTint);

      // Arched Front Portico Loggia on North frontage (-z)
      const porchW = 5.4;
      const porchD = 1.25;
      const porchH = 3.25;
      const pDeck = faceToWorld(spec.x, spec.z, effHW, effHD, '-z', 0, porchD * 0.5);
      pushInst(stoneEntries, pDeck.x, 0.18, pDeck.z, porchW + 0.3, 0.36, porchD + 0.2, 0xe4d9c8);
      // Portico tiled lean-to roof slab
      pushInst(accentEntries, pDeck.x, porchH + 0.18, pDeck.z, porchW + 0.4, 0.28, porchD + 0.28, profile.roofTint);
      // 3 Porch columns + twin Mediterranean arches
      for (const cxOff of [-porchW * 0.46, 0, porchW * 0.46]) {
        const cp = faceToWorld(spec.x, spec.z, effHW, effHD, '-z', cxOff, porchD - 0.16);
        pushInst(columnEntries, cp.x, porchH * 0.5, cp.z, 0.34, porchH, 0.34, profile.trimTint);
      }
      for (const aOff of [-porchW * 0.23, porchW * 0.23]) {
        const ap = faceToWorld(spec.x, spec.z, effHW, effHD, '-z', aOff, porchD - 0.16);
        pushInst(archEntries, ap.x, porchH - 0.82, ap.z, porchW * 0.46, 0.82, 0.26, profile.trimTint, ap.rotY);
      }
      // Solid cedar front door + flanking arched sconces
      const doorP = faceToWorld(spec.x, spec.z, effHW, effHD, '-z', 0, 0.08);
      pushInst(woodEntries, doorP.x, 1.48, doorP.z, 1.45, 2.35, 0.14, profile.woodTint);
      pushInst(archEntries, doorP.x, 2.35, doorP.z + 0.02, 1.65, 0.58, 0.18, profile.trimTint, doorP.rotY);
      for (const side of [-1, 1]) {
        const lp = faceToWorld(spec.x, spec.z, effHW, effHD, '-z', side * 1.1, 0.18);
        pushInst(lanternEntries, lp.x, 2.25, lp.z, 0.16, 0.28, 0.16, 0xfff0cc);
      }
      addPlanterPair(spec.x, spec.z, effHW, effHD, '-z', porchW * 0.5 + 0.55, 0.65, 0, profile.trimTint);

      // Arched shuttered windows across all 4 elevations
      // North (-z) ground flanking windows + 3 upper arched windows
      addWindowUnit(spec.x, spec.z, effHW, effHD, '-z', -4.3, 1.95, 1.55, 1.85, profile, { lit: true, arched: true, shutters: true });
      addWindowUnit(spec.x, spec.z, effHW, effHD, '-z', 4.3, 1.95, 1.55, 1.85, profile, { lit: false, arched: true, shutters: true });
      for (let i = -1; i <= 1; i++) {
        addWindowUnit(spec.x, spec.z, effHW, effHD, '-z', i * 3.9, 4.75, 1.65, 1.9, profile, {
          lit: isWindowLit(10 + i),
          arched: true,
          shutters: i !== 0,
        });
      }
      // Small Juliette wrought-iron balcony above portico + south park-facing balcony
      addResidentialBalcony(spec.x, spec.z, effHW, effHD, '-z', 0, 3.68, 3.0, 0.78, profile, {
        useGlass: false,
        useCorbels: true,
        addPlanter: true,
      });

      // South (+z) park-facing elevation: wide French doors + upper balcony overlooking Bayside Park
      addWindowUnit(spec.x, spec.z, effHW, effHD, '+z', 0, 1.65, 3.2, 2.4, profile, { lit: true, fullDoor: true });
      addWindowUnit(spec.x, spec.z, effHW, effHD, '+z', -4.2, 1.95, 1.5, 1.8, profile, { lit: false, arched: true, shutters: true });
      addWindowUnit(spec.x, spec.z, effHW, effHD, '+z', 4.2, 1.95, 1.5, 1.8, profile, { lit: true, arched: true, shutters: true });
      // Low grounded stone park patio (stays well north of park lawn z=-68)
      const southPatio = faceToWorld(spec.x, spec.z, effHW, effHD, '+z', 0, 0.45);
      pushInst(stoneEntries, southPatio.x, 0.14, southPatio.z, 5.2, 0.28, 0.9, 0xe4d9c8);

      for (let i = -1; i <= 1; i++) {
        addWindowUnit(spec.x, spec.z, effHW, effHD, '+z', i * 3.8, 4.75, 1.55, 1.85, profile, {
          lit: isWindowLit(20 + i),
          arched: true,
          shutters: true,
        });
      }
      addResidentialBalcony(spec.x, spec.z, effHW, effHD, '+z', 0, 3.68, 4.0, 0.88, profile, {
        useGlass: false,
        useCorbels: true,
        addPlanter: true,
      });

      // East & West side windows
      for (const sideFace of ['+x', '-x'] as CoralFrontageAxis[]) {
        for (const along of [-2.5, 2.5]) {
          addWindowUnit(spec.x, spec.z, effHW, effHD, sideFace, along, 1.95, 1.45, 1.75, profile, {
            lit: isWindowLit(along > 0 ? 31 : 32),
            arched: true,
            shutters: true,
          });
          addWindowUnit(spec.x, spec.z, effHW, effHD, sideFace, along, 4.75, 1.45, 1.75, profile, {
            lit: isWindowLit(along > 0 ? 33 : 34),
            arched: true,
            shutters: true,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // ARCHETYPE 2: COASTAL MODERN VILLA (res_villa_2)
    // -----------------------------------------------------------------------
    else if (profile.archetype === 'coastal_modern_villa') {
      const groundH = 4.0;
      const upperH = h - groundH; // 4.5m -> total 8.5m

      // Lower volume clad in warm coral-limestone ashlar masonry (slightly wider along Z, recessed entry on East)
      const lowerBody = new THREE.Mesh(unitBoxGeo, stoneMasonryMat);
      lowerBody.scale.set(w * 0.92, groundH, d * 0.94);
      lowerBody.position.set(-w * 0.02, groundH * 0.5, 0);
      lowerBody.castShadow = true;
      lowerBody.receiveShadow = true;
      group.add(lowerBody);
      environmentMeshesForCamera.push(lowerBody);

      // Upper cantilevered modern stucco volume (offset slightly +X/+Z for authentic contemporary layering)
      const upperW = w * 0.88;
      const upperD = d * 0.88;
      const upperOffX = w * 0.04;
      const upperOffZ = -d * 0.03;
      const upperBody = new THREE.Mesh(unitBoxGeo, stuccoMat);
      upperBody.scale.set(upperW, upperH, upperD);
      upperBody.position.set(upperOffX, groundH + upperH * 0.5, upperOffZ);
      upperBody.castShadow = true;
      upperBody.receiveShadow = true;
      group.add(upperBody);
      environmentMeshesForCamera.push(upperBody);

      // Layered cantilevered flat roof overhang slabs (two stepped dark-slate / warm-white planes)
      pushInst(trimEntries, spec.x + upperOffX + 0.35, groundH + 0.14, spec.z + upperOffZ, upperW + 1.25, 0.32, upperD + 1.1, profile.trimTint);
      pushInst(trimEntries, spec.x + upperOffX, h + 0.18, spec.z + upperOffZ, upperW + 1.45, 0.36, upperD + 1.4, profile.trimTint);
      pushInst(accentEntries, spec.x + upperOffX, h + 0.38, spec.z + upperOffZ, upperW + 1.5, 0.12, upperD + 1.45, profile.accentTint);

      // Secondary elevated rooftop shade pavilion / slatted pergola over modern roof deck
      const roofDeckY = h + 0.44;
      addPergola(spec.x - 1.2, spec.z + 0.4, roofDeckY, 5.2, 4.4, 2.35, profile.woodTint);
      // Sleek modern stair-access pavilion opening onto the rooftop terrace
      const stairPav = new THREE.Mesh(unitBoxGeo, stuccoMat);
      stairPav.scale.set(2.8, 2.05, 2.6);
      stairPav.position.set(w * 0.22, roofDeckY + 1.025, -d * 0.14);
      stairPav.castShadow = true;
      stairPav.receiveShadow = true;
      group.add(stairPav);
      pushInst(trimEntries, spec.x + w * 0.22, roofDeckY + 2.1, spec.z - d * 0.14, 3.25, 0.18, 3.05, profile.trimTint);
      // Low glass roof parapet on East & South roof terrace edge
      pushInst(glassBalustradeEntries, spec.x + upperOffX + upperW * 0.48, roofDeckY + 0.48, spec.z + upperOffZ, 0.06, 0.88, upperD * 0.9, 0xffffff);
      pushInst(glassBalustradeEntries, spec.x + upperOffX, roofDeckY + 0.48, spec.z + upperOffZ + upperD * 0.48, upperW * 0.9, 0.88, 0.06, 0xffffff);
      pinnacleY = roofDeckY + 2.55;

      // Ground-floor modern recessed entrance on East (+x) with timber soffit & architectural stone fin
      const lowCX = spec.x - w * 0.02;
      const lowHW = w * 0.46;
      const lowHD = d * 0.47;
      // Floating entry steps & vertical coastal cedar feature slat wall
      const entryStep = faceToWorld(lowCX, spec.z, lowHW, lowHD, '+x', 0, 0.55);
      pushInst(trimEntries, entryStep.x, 0.12, entryStep.z, 1.1, 0.24, 3.6, 0xe6dfd2);
      // Modern timber front door + sidelight glass
      const mDoor = faceToWorld(lowCX, spec.z, lowHW, lowHD, '+x', 0, 0.06);
      pushInst(woodEntries, mDoor.x, 1.55, mDoor.z, 0.14, 2.75, 1.45, profile.woodTint);
      // Warm architectural entry downlight under cantilever
      pushInst(lanternEntries, entryStep.x, groundH - 0.06, entryStep.z, 0.65, 0.08, 2.4, 0xfff0cc);
      addPlanterPair(lowCX, spec.z, lowHW, lowHD, '+x', 2.4, 0.55, 0, 0x3b4856);

      // Large panoramic modern windows on ground floor (East, South park view, North, West)
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '+x', -3.1, 2.0, 2.4, 2.75, profile, { lit: true, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '+x', 3.1, 2.0, 2.4, 2.75, profile, { lit: false, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '+z', -2.8, 1.95, 3.4, 2.85, profile, { lit: true, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '+z', 2.6, 1.95, 3.4, 2.85, profile, { lit: true, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '-z', -2.5, 2.1, 3.2, 2.3, profile, { lit: false, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '-z', 2.5, 2.1, 3.2, 2.3, profile, { lit: true, frameColor: profile.metalTint });
      addWindowUnit(lowCX, spec.z, lowHW, lowHD, '-x', 0, 2.1, 4.4, 2.3, profile, { lit: false, frameColor: profile.metalTint });

      // Upper-story expansive floor-to-ceiling windows + cantilevered glass-railed balconies
      const upCX = spec.x + upperOffX;
      const upCZ = spec.z + upperOffZ;
      const upHW = upperW * 0.5;
      const upHD = upperD * 0.5;
      addWindowUnit(upCX, upCZ, upHW, upHD, '+x', 0, groundH + 2.25, 5.8, 2.85, profile, { lit: true, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(upCX, upCZ, upHW, upHD, '+z', 0, groundH + 2.25, 6.2, 2.85, profile, { lit: true, fullDoor: true, frameColor: profile.metalTint });
      addWindowUnit(upCX, upCZ, upHW, upHD, '-z', -2.4, groundH + 2.35, 3.0, 2.2, profile, { lit: false, frameColor: profile.metalTint });
      addWindowUnit(upCX, upCZ, upHW, upHD, '-z', 2.4, groundH + 2.35, 3.0, 2.2, profile, { lit: true, frameColor: profile.metalTint });
      addWindowUnit(upCX, upCZ, upHW, upHD, '-x', 0, groundH + 2.35, 4.2, 2.2, profile, { lit: false, frameColor: profile.metalTint });

      // Modern cantilevered glass balconies on East (+x) and South (+z)
      addResidentialBalcony(upCX, upCZ, upHW, upHD, '+x', 0, groundH + 0.16, 6.8, 1.05, profile, {
        useGlass: true,
        addWoodScreen: true,
        accentEdge: true,
      });
      addResidentialBalcony(upCX, upCZ, upHW, upHD, '+z', 0, groundH + 0.16, 7.2, 0.9, profile, {
        useGlass: true,
        addPlanter: true,
        accentEdge: true,
      });
    }

    // -----------------------------------------------------------------------
    // ARCHETYPE 3: TROPICAL GARDEN VILLA (res_villa_3)
    // -----------------------------------------------------------------------
    else if (profile.archetype === 'tropical_garden_villa') {
      const bodyH = h - 1.7; // 7.3m main body + broad tropical gable roof to ~9.8m

      // Raised coastal timber/stucco porch base
      const baseDeck = new THREE.Mesh(unitBoxGeo, trimConcreteMat);
      baseDeck.scale.set(w * 0.96, 0.42, d * 0.96);
      baseDeck.position.y = 0.21;
      baseDeck.receiveShadow = true;
      group.add(baseDeck);

      // Main tropical sage-white stucco house
      const bodyW = w * 0.92;
      const bodyD = d * 0.88;
      const body = new THREE.Mesh(unitBoxGeo, stuccoMat);
      body.scale.set(bodyW, bodyH - 0.42, bodyD);
      body.position.set(0, 0.42 + (bodyH - 0.42) * 0.5, -d * 0.04);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      environmentMeshesForCamera.push(body);

      const bCZ = spec.z - d * 0.04;
      const bHW = bodyW * 0.5;
      const bHD = bodyD * 0.5;

      // Broad overhanging tropical coastal gable roof
      const gableH = 2.45;
      const gableRoof = new THREE.Mesh(gableRoofGeo, terracottaRoofMat);
      gableRoof.scale.set(bodyW + 1.4, gableH, bodyD + 1.5);
      gableRoof.position.set(0, bodyH, -d * 0.04);
      gableRoof.castShadow = true;
      gableRoof.receiveShadow = true;
      group.add(gableRoof);
      pinnacleY = bodyH + gableH;

      // White coastal fascia trim along gable eaves + wooden soffit brackets
      pushInst(trimEntries, spec.x, bodyH - 0.04, bCZ + bHD + 0.65, bodyW + 1.45, 0.18, 0.16, profile.trimTint);
      pushInst(trimEntries, spec.x, bodyH - 0.04, bCZ - bHD - 0.65, bodyW + 1.45, 0.18, 0.16, profile.trimTint);
      for (const bx of [-4.5, -1.5, 1.5, 4.5]) {
        const bp = faceToWorld(spec.x, bCZ, bHW, bHD, '+z', bx, 0);
        pushInst(corbelEntries, bp.x, bodyH - 0.55, bp.z, 0.16, 0.52, 0.62, profile.woodTint, bp.rotY);
      }

      // Full-width Covered Front Veranda on South (+z) with timber posts, porch steps, pergola & planters
      const verD = 1.4;
      const verH = 3.55;
      const verDeck = faceToWorld(spec.x, bCZ, bHW, bHD, '+z', 0, verD * 0.5);
      pushInst(woodEntries, verDeck.x, 0.22, verDeck.z, bodyW + 0.2, 0.44, verD + 0.1, profile.woodTint);
      // Shaded veranda roof canopy sloping slightly out
      pushInst(accentEntries, verDeck.x, verH + 0.12, verDeck.z + 0.08, bodyW + 0.55, 0.24, verD + 0.35, profile.roofTint);
      // 4 Coastal veranda timber posts
      for (const px of [-bodyW * 0.46, -bodyW * 0.16, bodyW * 0.16, bodyW * 0.46]) {
        const vp = faceToWorld(spec.x, bCZ, bHW, bHD, '+z', px, verD - 0.14);
        pushInst(woodEntries, vp.x, verH * 0.5 + 0.2, vp.z, 0.22, verH - 0.2, 0.22, profile.trimTint);
        // Decorative upper knee brace
        pushInst(woodEntries, vp.x, verH - 0.3, vp.z - 0.26, 0.16, 0.28, 0.46, profile.woodTint);
      }
      // Hanging warm porch lanterns
      for (const lx of [-2.4, 2.4]) {
        const lp = faceToWorld(spec.x, bCZ, bHW, bHD, '+z', lx, verD * 0.55);
        pushInst(lanternEntries, lp.x, verH - 0.16, lp.z, 0.18, 0.24, 0.18, 0xfff0cc);
      }
      // Lush facade garden planters flanking central veranda entry stairs
      addPlanterPair(spec.x, bCZ, bHW, bHD, '+z', 2.6, verD + 0.18, 0, profile.trimTint);
      addPlanterPair(spec.x, bCZ, bHW, bHD, '+z', 5.4, verD + 0.18, 0, profile.trimTint);

      // Upper-story shaded veranda balcony + timber pergola trellis on West garden flank (-x)
      addResidentialBalcony(spec.x, bCZ, bHW, bHD, '+z', 0, verH + 0.28, bodyW * 0.86, 1.08, profile, {
        useGlass: false,
        addPlanter: true,
      });
      // Shaded garden pergola on West side terrace (-x, staying clear of west sidewalk)
      addPergola(spec.x - bHW - 0.65, bCZ, 0.15, 1.2, 5.4, 3.25, profile.woodTint);
      pushInst(stoneEntries, spec.x - bHW - 0.65, 0.1, bCZ, 1.35, 0.2, 5.8, 0xe5dccb);

      // Wide tropical sliding doors & shuttered casement windows
      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', 0, 1.85, 3.1, 2.55, profile, { lit: true, fullDoor: true });
      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', -4.2, 2.0, 1.65, 1.9, profile, { lit: false, shutters: true, eyebrow: true });
      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', 4.2, 2.0, 1.65, 1.9, profile, { lit: true, shutters: true, eyebrow: true });

      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', 0, 5.2, 2.8, 2.25, profile, { lit: true, fullDoor: true });
      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', -4.2, 5.35, 1.55, 1.8, profile, { lit: true, shutters: true, eyebrow: true });
      addWindowUnit(spec.x, bCZ, bHW, bHD, '+z', 4.2, 5.35, 1.55, 1.8, profile, { lit: false, shutters: true, eyebrow: true });

      for (const sideFace of ['-x', '+x', '-z'] as CoralFrontageAxis[]) {
        const offsets = sideFace === '-z' ? [-3.8, 0, 3.8] : [-2.6, 2.6];
        for (let oi = 0; oi < offsets.length; oi++) {
          const along = offsets[oi];
          addWindowUnit(spec.x, bCZ, bHW, bHD, sideFace, along, 2.0, 1.55, 1.85, profile, {
            lit: isWindowLit(40 + oi),
            shutters: true,
            eyebrow: true,
          });
          addWindowUnit(spec.x, bCZ, bHW, bHD, sideFace, along, 5.35, 1.5, 1.75, profile, {
            lit: isWindowLit(50 + oi),
            shutters: true,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // ARCHETYPE 4: MEDITERRANEAN COURTYARD VILLA (north_villa_1)
    // -----------------------------------------------------------------------
    else if (profile.archetype === 'mediterranean_courtyard_villa') {
      // Asymmetrical two-wing coastal estate: West 2-story hipped tower wing + East lower loggia wing with roof pergola terrace
      const westW = w * 0.56;
      const eastW = w * 0.44;
      const westH = h - 1.1; // 7.9m + terracotta roof -> 10.1m
      const eastH = 4.6;

      // Ground stone base
      const plinth = new THREE.Mesh(unitBoxGeo, stoneMasonryMat);
      plinth.scale.set(w * 0.98, 0.5, d * 0.96);
      plinth.position.y = 0.25;
      plinth.receiveShadow = true;
      group.add(plinth);

      // West tall pavilion wing
      const westRelX = -w * 0.5 + westW * 0.5;
      const westWing = new THREE.Mesh(unitBoxGeo, stuccoMat);
      westWing.scale.set(westW, westH - 0.5, d * 0.94);
      westWing.position.set(westRelX, 0.5 + (westH - 0.5) * 0.5, 0);
      westWing.castShadow = true;
      westWing.receiveShadow = true;
      group.add(westWing);
      environmentMeshesForCamera.push(westWing);

      const westRoof = new THREE.Mesh(hippedRoofGeo, terracottaRoofMat);
      westRoof.scale.set(westW + 0.95, 2.25, d * 0.94 + 0.95);
      westRoof.position.set(westRelX, westH, 0);
      westRoof.castShadow = true;
      group.add(westRoof);
      pinnacleY = westH + 2.25;

      // East lower courtyard wing + rooftop sun-terrace pergola
      const eastRelX = w * 0.5 - eastW * 0.5;
      const eastWing = new THREE.Mesh(unitBoxGeo, stuccoMat);
      eastWing.scale.set(eastW, eastH - 0.5, d * 0.86);
      eastWing.position.set(eastRelX, 0.5 + (eastH - 0.5) * 0.5, -d * 0.04);
      eastWing.castShadow = true;
      eastWing.receiveShadow = true;
      group.add(eastWing);
      environmentMeshesForCamera.push(eastWing);

      // East wing parapet & shaded rooftop pergola terrace
      pushInst(trimEntries, spec.x + eastRelX, eastH + 0.34, spec.z + d * 0.39, eastW + 0.1, 0.68, 0.26, profile.trimTint);
      pushInst(trimEntries, spec.x + eastRelX, eastH + 0.34, spec.z - d * 0.47, eastW + 0.1, 0.68, 0.26, profile.trimTint);
      pushInst(trimEntries, spec.x + w * 0.5 - 0.13, eastH + 0.34, spec.z - d * 0.04, 0.26, 0.68, d * 0.86, profile.trimTint);
      addPergola(spec.x + eastRelX, spec.z - d * 0.04, eastH + 0.1, eastW * 0.78, d * 0.68, 2.45, profile.woodTint);

      // Grand arched front entrance on South (+z) at the junction of the two wings
      const wCX = spec.x + westRelX;
      const wHW = westW * 0.5;
      const wHD = d * 0.47;
      const doorPos = faceToWorld(wCX, spec.z, wHW, wHD, '+z', 1.4, 0.1);
      pushInst(woodEntries, doorPos.x, 1.55, doorPos.z, 1.65, 2.45, 0.16, profile.woodTint);
      pushInst(archEntries, doorPos.x, 2.52, doorPos.z + 0.06, 1.95, 0.68, 0.24, profile.trimTint, doorPos.rotY);
      for (const s of [-1, 1]) {
        const cp = faceToWorld(wCX, spec.z, wHW, wHD, '+z', 1.4 + s * 1.15, 0.35);
        pushInst(columnEntries, cp.x, 1.62, cp.z, 0.34, 3.24, 0.34, 0xeadfce);
        pushInst(lanternEntries, cp.x, 2.35, cp.z + 0.18, 0.16, 0.26, 0.16, 0xfff0cc);
      }
      // Sculpted Spanish stone entablature + terracotta hood crowning the entry columns
      const hoodPos = faceToWorld(wCX, spec.z, wHW, wHD, '+z', 1.4, 0.28);
      pushInst(trimEntries, hoodPos.x, 3.34, hoodPos.z, 2.85, 0.24, 0.72, profile.trimTint);
      pushInst(accentEntries, hoodPos.x, 3.52, hoodPos.z, 3.05, 0.18, 0.86, profile.roofTint);
      addPlanterPair(wCX, spec.z, wHW, wHD, '+z', 2.8, 0.55, 0, profile.trimTint);

      // Arched shuttered windows on West tower wing
      addWindowUnit(wCX, spec.z, wHW, wHD, '+z', -2.2, 2.05, 1.65, 1.9, profile, { lit: true, arched: true, shutters: true });
      addWindowUnit(wCX, spec.z, wHW, wHD, '+z', -2.1, 5.5, 1.6, 1.9, profile, { lit: true, arched: true, shutters: true });
      addWindowUnit(wCX, spec.z, wHW, wHD, '+z', 2.0, 5.5, 1.6, 1.9, profile, { lit: false, arched: true, shutters: true });
      addResidentialBalcony(wCX, spec.z, wHW, wHD, '+z', -2.1, 4.35, 2.8, 0.88, profile, {
        useGlass: false,
        useCorbels: true,
        addPlanter: true,
      });

      // East lower courtyard arched windows
      const eCX = spec.x + eastRelX;
      const eCZ = spec.z - d * 0.04;
      const eHW = eastW * 0.5;
      const eHD = d * 0.43;
      addWindowUnit(eCX, eCZ, eHW, eHD, '+z', -1.2, 2.15, 1.65, 2.0, profile, { lit: true, arched: true, shutters: true });
      addWindowUnit(eCX, eCZ, eHW, eHD, '+z', 1.6, 2.15, 1.65, 2.0, profile, { lit: false, arched: true, shutters: true });
      addWindowUnit(eCX, eCZ, eHW, eHD, '+x', 0, 2.15, 2.0, 1.95, profile, { lit: true, arched: true, shutters: true });

      // West & North secondary windows
      for (const along of [-2.4, 2.4]) {
        addWindowUnit(wCX, spec.z, wHW, wHD, '-x', along, 2.05, 1.5, 1.85, profile, { lit: false, arched: true, shutters: true });
        addWindowUnit(wCX, spec.z, wHW, wHD, '-x', along, 5.5, 1.5, 1.85, profile, { lit: true, arched: true, shutters: true });
        addWindowUnit(wCX, spec.z, wHW, wHD, '-z', along, 2.05, 1.5, 1.85, profile, { lit: true, arched: true });
        addWindowUnit(wCX, spec.z, wHW, wHD, '-z', along, 5.5, 1.5, 1.85, profile, { lit: false, arched: true });
      }
    }

    // -----------------------------------------------------------------------
    // ARCHETYPE 5–8: FOUR DISTINCT LOW-RISE RESIDENTIAL APARTMENT COMPLEXES
    // -----------------------------------------------------------------------
    else if (profile.category === 'apartment') {
      const lobbyH = 3.6;
      const upperTotalH = h - lobbyH;
      const hasPenthouseSetback =
        profile.archetype === 'coastal_terraced_apartments' ||
        profile.archetype === 'modern_marina_lofts';
      const mainUpperH = hasPenthouseSetback ? upperTotalH * 0.74 : upperTotalH;
      const pentH = hasPenthouseSetback ? upperTotalH - mainUpperH : 0;
      const mainStories = hasPenthouseSetback ? Math.max(2, profile.stories - 1) : profile.stories - 1;
      const floorH = mainUpperH / mainStories;

      // 1. Stone-clad ground-floor residential plinth & recessed lobby glazing
      const plinth = new THREE.Mesh(unitBoxGeo, stoneMasonryMat);
      plinth.scale.set(w * 0.99, 0.45, d * 0.99);
      plinth.position.y = 0.225;
      plinth.receiveShadow = true;
      group.add(plinth);

      const groundCore = new THREE.Mesh(unitBoxGeo, stuccoMat);
      groundCore.scale.set(w * 0.97, lobbyH - 0.45, d * 0.97);
      groundCore.position.y = 0.45 + (lobbyH - 0.45) * 0.5;
      groundCore.castShadow = true;
      groundCore.receiveShadow = true;
      group.add(groundCore);
      environmentMeshesForCamera.push(groundCore);

      // 2. Main residential shaft body
      const mainBody = new THREE.Mesh(unitBoxGeo, stuccoMat);
      mainBody.scale.set(w, mainUpperH, d);
      mainBody.position.y = lobbyH + mainUpperH * 0.5;
      mainBody.castShadow = true;
      mainBody.receiveShadow = true;
      group.add(mainBody);
      environmentMeshesForCamera.push(mainBody);

      // Architectural ground-floor stone corner piers & horizontal podium stringcourse
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pushInst(stoneEntries, spec.x + sx * (hw - 0.35), lobbyH * 0.5, spec.z + sz * (hd - 0.35), 0.72, lobbyH, 0.72, 0xe8dfd0);
        }
      }
      // Floor-by-floor horizontal facade division stringcourses (clearly defines every residential story!)
      for (let f = 0; f <= mainStories; f++) {
        const fy = lobbyH + f * floorH;
        const proj = f === 0 || f === mainStories ? 0.32 : 0.2;
        const bandH = f === 0 || f === mainStories ? 0.34 : 0.22;
        pushInst(trimEntries, spec.x, fy, spec.z + hd + proj * 0.4, w + proj * 1.4, bandH, proj, profile.trimTint);
        pushInst(trimEntries, spec.x, fy, spec.z - hd - proj * 0.4, w + proj * 1.4, bandH, proj, profile.trimTint);
        pushInst(trimEntries, spec.x + hw + proj * 0.4, fy, spec.z, proj, bandH, d + proj * 1.4, profile.trimTint);
        pushInst(trimEntries, spec.x - hw - proj * 0.4, fy, spec.z, proj, bandH, d + proj * 1.4, profile.trimTint);
      }

      // 3. Distinctive Residential Ground-Floor Entrance Lobby & Canopy on Primary Frontage
      const fDir = profile.frontage;
      const fIsX = fDir === '+x' || fDir === '-x';
      const entryW = 4.6;
      const entryDoorH = 2.85;
      // Recessed warm-lit lobby glazing + framed glass double doors
      const lobbyGl = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, fDir, 0, 0.06);
      pushInst(
        litGlassEntries,
        lobbyGl.x,
        0.45 + entryDoorH * 0.5,
        lobbyGl.z,
        fIsX ? 0.08 : entryW,
        entryDoorH,
        fIsX ? entryW : 0.08,
        0xffffff,
      );
      for (const mOff of [-entryW * 0.5, -entryW * 0.18, entryW * 0.18, entryW * 0.5]) {
        const mp = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, fDir, mOff, 0.12);
        pushInst(metalEntries, mp.x, 0.45 + entryDoorH * 0.5, mp.z, 0.11, entryDoorH, 0.11, profile.metalTint);
      }
      // Entrance canopy — varied per apartment archetype!
      if (profile.hasAwning) {
        // Striped coastal canopy awning (res_apt_1)
        const awPos = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 0);
        const awMesh = new THREE.Mesh(slopedAwningGeo, stripedAwningMat);
        awMesh.scale.set(entryW + 0.8, 0.82, 1.32);
        awMesh.rotation.y = awPos.rotY;
        awMesh.position.set(awPos.x - spec.x, 2.75, awPos.z - spec.z);
        awMesh.castShadow = true;
        group.add(awMesh);
      } else if (profile.hasArchedOpenings) {
        // Arched Coral Gables portico (west_res_1)
        const portP = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 1.1);
        pushInst(trimEntries, portP.x, 3.45, portP.z, fIsX ? 1.25 : entryW + 0.9, 0.28, fIsX ? entryW + 0.9 : 1.25, profile.trimTint);
        for (const s of [-1, 1]) {
          const cp = faceToWorld(spec.x, spec.z, hw, hd, fDir, s * (entryW * 0.48), 1.1);
          pushInst(columnEntries, cp.x, 1.72, cp.z, 0.38, 3.45, 0.38, profile.trimTint);
        }
        const archP = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 1.1);
        pushInst(archEntries, archP.x, 2.5, archP.z, entryW * 0.92, 0.85, 0.26, profile.trimTint, archP.rotY);
      } else {
        // Crisp cantilevered modern entrance slab + twin slim metal columns (res_apt_2, north_apt_1)
        const canP = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 0.65);
        pushInst(trimEntries, canP.x, 3.38, canP.z, fIsX ? 1.3 : entryW + 0.8, 0.26, fIsX ? entryW + 0.8 : 1.3, profile.trimTint);
        pushInst(accentEntries, canP.x, 3.48, canP.z, fIsX ? 1.34 : entryW + 0.84, 0.1, fIsX ? entryW + 0.84 : 1.34, profile.accentTint);
        for (const s of [-1, 1]) {
          const cp = faceToWorld(spec.x, spec.z, hw, hd, fDir, s * (entryW * 0.48), 1.12);
          pushInst(metalEntries, cp.x, 1.69, cp.z, 0.16, 3.38, 0.16, profile.metalTint);
        }
      }
      // Warm soffit entrance light + flanking lobby planters
      const lghtP = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 0.55);
      pushInst(lanternEntries, lghtP.x, 3.16, lghtP.z, fIsX ? 0.42 : 2.1, 0.08, fIsX ? 2.1 : 0.42, 0xfff0cc);
      addPlanterPair(spec.x, spec.z, hw, hd, fDir, entryW * 0.5 + 0.58, 0.58, 0, profile.trimTint);

      // Ground-floor flanking apartment windows on all 4 facades
      const allFaces: CoralFrontageAxis[] = ['+x', '-x', '+z', '-z'];
      for (let fi = 0; fi < allFaces.length; fi++) {
        const face = allFaces[fi];
        const span = face === '+x' || face === '-x' ? d : w;
        const bays = span >= 15 ? [-4.6, 0, 4.6] : [-4.1, 0, 4.1];
        for (let bi = 0; bi < bays.length; bi++) {
          const along = bays[bi];
          if (face === fDir && Math.abs(along) < 2.8) continue; // open for lobby entrance
          addWindowUnit(spec.x, spec.z, hw * 0.97, hd * 0.97, face, along, 2.0, 1.75, 1.8, profile, {
            lit: isWindowLit(fi * 17 + bi * 7),
            arched: profile.hasArchedOpenings,
            shutters: profile.hasShutters,
          });
        }
      }

      // 4. Archetype-Specific Upper Facades, Recessed Windows & Varied Balconies
      const activeBalconyFaces: CoralFrontageAxis[] = profile.secondaryFrontage
        ? [profile.frontage, profile.secondaryFrontage]
        : [profile.frontage];

      // Special vertical stone bay projections on modern_marina_lofts (north_apt_1) flanking outer windows cleanly
      if (profile.archetype === 'modern_marina_lofts') {
        for (const side of [-1, 1]) {
          const pierP = faceToWorld(spec.x, spec.z, hw, hd, fDir, side * (w * 0.42), 0.22);
          pushInst(stoneEntries, pierP.x, lobbyH + mainUpperH * 0.5, pierP.z, 1.85, mainUpperH, 0.46, 0xe3dbd0);
        }
      }

      // Special central glazed breezeway vertical spine on midcentury_breezeway_apartments (res_apt_2)
      if (profile.archetype === 'midcentury_breezeway_apartments') {
        const spineP = faceToWorld(spec.x, spec.z, hw, hd, fDir, 0, 0.2);
        pushInst(accentEntries, spineP.x, lobbyH + mainUpperH * 0.5, spineP.z, 0.42, mainUpperH + 0.5, 2.75, profile.accentTint);
        // Vertical decorative sun-screen louver fins framing the breezeway
        for (const lOff of [-1.05, -0.35, 0.35, 1.05]) {
          const lp = faceToWorld(spec.x, spec.z, hw, hd, fDir, lOff, 0.48);
          pushInst(trimEntries, lp.x, lobbyH + mainUpperH * 0.5, lp.z, 0.26, mainUpperH, 0.1, profile.trimTint);
        }
      }

      for (let floor = 0; floor < mainStories; floor++) {
        const floorY = lobbyH + floor * floorH;
        const winCenterY = floorY + floorH * 0.54;
        const winH = Math.min(1.95, floorH * 0.62);

        for (let fi = 0; fi < allFaces.length; fi++) {
          const face = allFaces[fi];
          const span = face === '+x' || face === '-x' ? d : w;
          const isBalconyFace = activeBalconyFaces.includes(face);

          // Skip center bay on midcentury_breezeway_apartments primary face (occupied by louver stairwell spine)
          const bays = span >= 15 ? [-4.6, 0, 4.6] : [-4.1, 0, 4.1];
          for (let bi = 0; bi < bays.length; bi++) {
            const along = bays[bi];
            if (
              profile.archetype === 'midcentury_breezeway_apartments' &&
              face === fDir &&
              bi === 1
            ) {
              continue;
            }
            const isDoorBay =
              isBalconyFace &&
              ((profile.balconyStyle === 'corbel_wrought_iron' && (floor % 2 === 0 ? bi !== 1 : bi === 1)) ||
                (profile.balconyStyle === 'corner_glass_louver' && bi !== 1) ||
                (profile.balconyStyle === 'recessed_steel_loggia' && bi === 1) ||
                (profile.balconyStyle === 'juliet_iron_shutter' && (floor + bi) % 2 === 0));

            addWindowUnit(spec.x, spec.z, hw, hd, face, along, winCenterY, isDoorBay ? 2.25 : 1.75, isDoorBay ? Math.min(2.2, floorH * 0.72) : winH, profile, {
              lit: isWindowLit(floor * 29 + fi * 13 + bi * 7 + spec.x),
              arched: profile.hasArchedOpenings && !isDoorBay,
              shutters: profile.hasShutters && !isDoorBay,
              eyebrow: profile.archetype === 'midcentury_breezeway_apartments',
              fullDoor: isDoorBay,
            });

            if (isDoorBay) {
              if (profile.balconyStyle === 'corbel_wrought_iron') {
                addResidentialBalcony(spec.x, spec.z, hw, hd, face, along, floorY + 0.1, 3.4, profile.balconyDepth, profile, {
                  useGlass: false,
                  useCorbels: true,
                  accentEdge: true,
                  addPlanter: floor === 0,
                });
              } else if (profile.balconyStyle === 'corner_glass_louver') {
                addResidentialBalcony(spec.x, spec.z, hw, hd, face, along, floorY + 0.1, 3.6, profile.balconyDepth, profile, {
                  useGlass: true,
                  addWoodScreen: true,
                  accentEdge: floor % 2 === 0,
                });
              } else if (profile.balconyStyle === 'recessed_steel_loggia') {
                addResidentialBalcony(spec.x, spec.z, hw, hd, face, along, floorY + 0.1, 4.6, profile.balconyDepth, profile, {
                  useGlass: true,
                  accentEdge: true,
                });
              } else {
                addResidentialBalcony(spec.x, spec.z, hw, hd, face, along, floorY + 0.1, 3.0, profile.balconyDepth, profile, {
                  useGlass: false,
                  useCorbels: true,
                  addPlanter: true,
                });
              }
            }
          }
        }
      }

      // 5. Stepped Upper Penthouse Tier & Varied Apartment Rooftops
      let roofY = lobbyH + mainUpperH;
      if (hasPenthouseSetback && pentH > 1.5) {
        const pentW = w * 0.72;
        const pentD = d * 0.72;
        const pentMesh = new THREE.Mesh(unitBoxGeo, stuccoMat);
        pentMesh.scale.set(pentW, pentH, pentD);
        pentMesh.position.y = roofY + pentH * 0.5;
        pentMesh.castShadow = true;
        pentMesh.receiveShadow = true;
        group.add(pentMesh);
        environmentMeshesForCamera.push(pentMesh);

        // Setback terrace roof slab & safety railing around main roof perimeter
        const deckSlab = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        deckSlab.scale.set(w - 0.3, 0.22, d - 0.3);
        deckSlab.position.y = roofY + 0.11;
        group.add(deckSlab);

        const paraH = 0.68;
        pushInst(trimEntries, spec.x, roofY + paraH * 0.5, spec.z + hd - 0.16, w + 0.1, paraH, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x, roofY + paraH * 0.5, spec.z - hd + 0.16, w + 0.1, paraH, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x + hw - 0.16, roofY + paraH * 0.5, spec.z, 0.32, paraH, d - 0.6, profile.trimTint);
        pushInst(trimEntries, spec.x - hw + 0.16, roofY + paraH * 0.5, spec.z, 0.32, paraH, d - 0.6, profile.trimTint);

        // Penthouse panoramic windows seated cleanly above the terrace parapet
        for (const pFace of activeBalconyFaces) {
          addWindowUnit(spec.x, spec.z, pentW * 0.5, pentD * 0.5, pFace, 0, roofY + pentH * 0.58, 3.8, Math.min(2.05, pentH * 0.64), profile, {
            lit: true,
            fullDoor: true,
          });
        }

        // Penthouse roof cornice & overhanging canopy
        const topRoofY = roofY + pentH;
        const topSlab = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        topSlab.scale.set(pentW - 0.2, 0.24, pentD - 0.2);
        topSlab.position.y = topRoofY + 0.12;
        group.add(topSlab);

        pushInst(trimEntries, spec.x, topRoofY + 0.32, spec.z + pentD * 0.5 - 0.14, pentW + 0.4, 0.55, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x, topRoofY + 0.32, spec.z - pentD * 0.5 + 0.14, pentW + 0.4, 0.55, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x + pentW * 0.5 - 0.14, topRoofY + 0.32, spec.z, 0.32, 0.55, pentD + 0.4, profile.trimTint);
        pushInst(trimEntries, spec.x - pentW * 0.5 + 0.14, topRoofY + 0.32, spec.z, 0.32, 0.55, pentD + 0.4, profile.trimTint);

        // Timber terrace pergola on penthouse roof + mechanical unit
        addPergola(spec.x - pentW * 0.16, spec.z, topRoofY + 0.24, pentW * 0.52, pentD * 0.56, 2.2, profile.woodTint);
        const hvac = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        hvac.scale.set(2.2, 1.15, 1.8);
        hvac.position.set(pentW * 0.24, topRoofY + 0.8, -pentD * 0.15);
        group.add(hvac);
        pinnacleY = topRoofY + 2.55;
      } else {
        // Non-setback apartments (res_apt_2 breezeway overrun & west_res_1 garden eaves)
        const roofSlab = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        roofSlab.scale.set(w - 0.3, 0.24, d - 0.3);
        roofSlab.position.y = roofY + 0.12;
        group.add(roofSlab);

        const paraH = 0.88;
        pushInst(trimEntries, spec.x, roofY + paraH * 0.5, spec.z + hd - 0.16, w + 0.15, paraH, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x, roofY + paraH * 0.5, spec.z - hd + 0.16, w + 0.15, paraH, 0.32, profile.trimTint);
        pushInst(trimEntries, spec.x + hw - 0.16, roofY + paraH * 0.5, spec.z, 0.32, paraH, d - 0.6, profile.trimTint);
        pushInst(trimEntries, spec.x - hw + 0.16, roofY + paraH * 0.5, spec.z, 0.32, paraH, d - 0.6, profile.trimTint);

        if (profile.roofStyle === 'breezeway_overrun_parapet') {
          // Central stairwell overrun & screened HVAC enclosure
          const overrun = new THREE.Mesh(unitBoxGeo, stuccoMat);
          overrun.scale.set(4.2, 2.35, 4.4);
          overrun.position.set(w * 0.14, roofY + 1.18, 0);
          overrun.castShadow = true;
          group.add(overrun);
          pushInst(accentEntries, spec.x + w * 0.14, roofY + 2.42, spec.z, 4.6, 0.24, 4.8, profile.accentTint);
          const mech = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
          mech.scale.set(2.4, 1.15, 2.2);
          mech.position.set(-w * 0.22, roofY + 0.72, -d * 0.14);
          group.add(mech);
          pinnacleY = roofY + 2.55;
        } else {
          // Garden walk-up decorative terracotta perimeter eaves + residents' roof pergola deck
          pushInst(accentEntries, spec.x, roofY + paraH + 0.12, spec.z + hd + 0.12, w + 0.75, 0.28, 0.55, profile.roofTint);
          pushInst(accentEntries, spec.x, roofY + paraH + 0.12, spec.z - hd - 0.12, w + 0.75, 0.28, 0.55, profile.roofTint);
          pushInst(accentEntries, spec.x + hw + 0.12, roofY + paraH + 0.12, spec.z, 0.55, 0.28, d + 0.75, profile.roofTint);
          pushInst(accentEntries, spec.x - hw - 0.12, roofY + paraH + 0.12, spec.z, 0.55, 0.28, d + 0.75, profile.roofTint);
          addPergola(spec.x - 1.2, spec.z + 1.4, roofY + 0.24, 5.4, 4.8, 2.25, profile.woodTint);
          const mech = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
          mech.scale.set(2.3, 1.15, 2.0);
          mech.position.set(w * 0.24, roofY + 0.72, -d * 0.22);
          group.add(mech);
          pinnacleY = roofY + 2.55;
        }
      }
    }

    // -----------------------------------------------------------------------
    // ARCHETYPE 9: CORAL HEIGHTS NEIGHBOURHOOD SHOP (res_shop_1)
    // -----------------------------------------------------------------------
    else {
      const shopFloorH = 4.6;
      const upperFloorH = h - shopFloorH; // 5.4m -> total 10.0m

      // 1. Stone storefront bulkhead kickplate & ground-floor commercial massing
      const bulkhead = new THREE.Mesh(unitBoxGeo, stoneMasonryMat);
      bulkhead.scale.set(w * 0.99, 0.85, d * 0.99);
      bulkhead.position.y = 0.425;
      bulkhead.receiveShadow = true;
      group.add(bulkhead);

      const groundWall = new THREE.Mesh(unitBoxGeo, stuccoMat);
      groundWall.scale.set(w * 0.97, shopFloorH - 0.85, d * 0.97);
      groundWall.position.y = 0.85 + (shopFloorH - 0.85) * 0.5;
      groundWall.castShadow = true;
      groundWall.receiveShadow = true;
      group.add(groundWall);
      environmentMeshesForCamera.push(groundWall);

      // Upper live-work residential story above shop
      const upperBody = new THREE.Mesh(unitBoxGeo, stuccoMat);
      upperBody.scale.set(w, upperFloorH, d);
      upperBody.position.y = shopFloorH + upperFloorH * 0.5;
      upperBody.castShadow = true;
      upperBody.receiveShadow = true;
      group.add(upperBody);
      environmentMeshesForCamera.push(upperBody);

      // Decorative commercial belt fascia separating storefront from upper story
      pushInst(accentEntries, spec.x, shopFloorH + 0.14, spec.z + hd + 0.14, w + 0.45, 0.95, 0.32, profile.accentTint);
      pushInst(accentEntries, spec.x, shopFloorH + 0.14, spec.z - hd - 0.14, w + 0.45, 0.95, 0.32, profile.accentTint);
      pushInst(accentEntries, spec.x + hw + 0.14, shopFloorH + 0.14, spec.z, 0.32, 0.95, d + 0.45, profile.accentTint);
      pushInst(accentEntries, spec.x - hw - 0.14, shopFloorH + 0.14, spec.z, 0.32, 0.95, d + 0.45, profile.accentTint);

      // Molded cream cornice ledges above & below commercial fascia
      for (const cy of [shopFloorH - 0.36, shopFloorH + 0.64]) {
        pushInst(trimEntries, spec.x, cy, spec.z + hd + 0.18, w + 0.62, 0.16, 0.38, profile.trimTint);
        pushInst(trimEntries, spec.x, cy, spec.z - hd - 0.18, w + 0.62, 0.16, 0.38, profile.trimTint);
        pushInst(trimEntries, spec.x + hw + 0.18, cy, spec.z, 0.38, 0.16, d + 0.62, profile.trimTint);
        pushInst(trimEntries, spec.x - hw - 0.18, cy, spec.z, 0.38, 0.16, d + 0.62, profile.trimTint);
      }

      // 2. Primary East (+x) & Secondary South (+z) Commercial Storefronts
      // Storefront fluted pilasters framing display windows & entrance
      const shopFaces: Array<{ face: CoralFrontageAxis; span: number; hasMainDoor: boolean }> = [
        { face: '+x', span: d, hasMainDoor: true },
        { face: '+z', span: w, hasMainDoor: false },
      ];

      for (const sf of shopFaces) {
        const sfIsX = sf.face === '+x' || sf.face === '-x';
        const bayCount = 3;
        const baySpan = (sf.span - 1.4) / bayCount;

        // Corner & bay pilasters terminating cleanly beneath the sloped storefront awnings (y = 3.22)
        const pilasterH = 3.22;
        for (let i = 0; i <= bayCount; i++) {
          const along = -sf.span * 0.5 + 0.7 + i * baySpan;
          const pp = faceToWorld(spec.x, spec.z, hw, hd, sf.face, along, 0.12);
          pushInst(trimEntries, pp.x, pilasterH * 0.5, pp.z, 0.52, pilasterH, 0.52, profile.trimTint);
          pushInst(stoneEntries, pp.x, 0.42, pp.z, 0.64, 0.84, 0.64, 0xe4d9c8);
        }

        // Display windows & glazed shop entrance door
        for (let b = 0; b < bayCount; b++) {
          const along = -sf.span * 0.5 + 0.7 + (b + 0.5) * baySpan;
          const isDoor = sf.hasMainDoor && b === 1;
          const winW = baySpan - 0.62;
          const winH = isDoor ? 2.85 : 2.45;
          const winY = isDoor ? 0.16 + winH * 0.5 : 0.88 + winH * 0.5;

          const dp = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, sf.face, along, 0.08);
          const dispMesh = new THREE.Mesh(unitBoxGeo, shopDisplayGlassMat);
          dispMesh.scale.set(sfIsX ? 0.08 : winW, winH, sfIsX ? winW : 0.08);
          dispMesh.position.set(dp.x - spec.x, winY, dp.z - spec.z);
          group.add(dispMesh);
          totalWindowUnits++;

          // Dark bronze storefront glazing frame & door mullions
          for (const side of [-1, 1]) {
            const jPos = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, sf.face, along + side * (winW * 0.5), 0.14);
            pushInst(metalEntries, jPos.x, winY, jPos.z, 0.1, winH + 0.08, 0.1, profile.metalTint);
          }
          const topBar = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, sf.face, along, 0.14);
          pushInst(metalEntries, topBar.x, winY + winH * 0.5, topBar.z, sfIsX ? 0.12 : winW + 0.08, 0.1, sfIsX ? winW + 0.08 : 0.12, profile.metalTint);

          if (isDoor) {
            // Double commercial door center stile + brass push handles + welcome step
            pushInst(metalEntries, topBar.x, winY, topBar.z, 0.09, winH, 0.12, profile.metalTint);
            const stepP = faceToWorld(spec.x, spec.z, hw, hd, sf.face, along, 0.42);
            pushInst(stoneEntries, stepP.x, 0.09, stepP.z, sfIsX ? 0.85 : winW + 0.3, 0.18, sfIsX ? winW + 0.3 : 0.85, 0xe4d9c8);
            // Brass door handles
            for (const s of [-0.18, 0.18]) {
              const hp = faceToWorld(spec.x, spec.z, hw * 0.97, hd * 0.97, sf.face, along + s, 0.22);
              pushInst(accentEntries, hp.x, 1.25, hp.z, 0.06, 0.42, 0.06, 0xd4a359);
            }
          } else {
            // Display window bronze transom & subtle window sill
            pushInst(trimEntries, topBar.x, 0.86, topBar.z, sfIsX ? 0.22 : winW + 0.12, 0.1, sfIsX ? winW + 0.12 : 0.22, profile.trimTint);
          }
        }

        // Sloped Striped Coastal Fabric Awning projecting cleanly over display windows (1.32m)
        const awPos = faceToWorld(spec.x, spec.z, hw, hd, sf.face, 0, 0.04);
        const awning = new THREE.Mesh(slopedAwningGeo, stripedAwningMat);
        awning.scale.set(sf.span - 0.8, 0.76, 1.32);
        awning.rotation.y = awPos.rotY;
        awning.position.set(awPos.x - spec.x, 3.22, awPos.z - spec.z);
        awning.castShadow = true;
        group.add(awning);

        // Warm under-awning storefront soffit lights
        for (const lx of [-sf.span * 0.28, 0, sf.span * 0.28]) {
          const lp = faceToWorld(spec.x, spec.z, hw, hd, sf.face, lx, 0.62);
          pushInst(lanternEntries, lp.x, 3.42, lp.z, 0.24, 0.08, 0.24, 0xfff0cc);
        }

        // Readable Commercial Fascia Signboard ("CORAL COVE — MARKET · BAKERY · ESPRESSO")
        const signW = Math.min(7.4, sf.span * 0.56);
        const signH = 1.24;
        const sp = faceToWorld(spec.x, spec.z, hw, hd, sf.face, 0, 0.34);
        const signBacking = new THREE.Mesh(unitBoxGeo, trimConcreteMat);
        signBacking.scale.set(sfIsX ? 0.14 : signW + 0.2, signH + 0.2, sfIsX ? signW + 0.2 : 0.14);
        signBacking.position.set(sp.x - spec.x, shopFloorH + 0.24, sp.z - spec.z);
        group.add(signBacking);

        const signFaceP = faceToWorld(spec.x, spec.z, hw, hd, sf.face, 0, 0.43);
        const signGeo = new THREE.PlaneGeometry(signW, signH);
        disposables.push(signGeo);
        const signMesh = new THREE.Mesh(signGeo, shopSignMat);
        signMesh.name = `coral_shop_sign_${sf.face}`;
        signMesh.rotation.y = signFaceP.rotY;
        signMesh.position.set(signFaceP.x - spec.x, shopFloorH + 0.24, signFaceP.z - spec.z);
        group.add(signMesh);
      }

      // Flanking cafe planters positioned cleanly at storefront pilasters (never blocking display glazing)
      addPlanterPair(spec.x, spec.z, hw, hd, '+x', 1.95, 0.52, 0, profile.trimTint);
      addPlanterPair(spec.x, spec.z, hw, hd, '+z', 2.25, 0.52, 0, profile.trimTint);

      // 3. Upper-Story Residential Flats + Sidewall Architectural Detailing (all 4 facades!)
      for (const face of ['+x', '+z', '-x', '-z'] as CoralFrontageAxis[]) {
        const span = face === '+x' || face === '-x' ? d : w;
        const bays = span >= 14.5 ? [-4.4, 0, 4.4] : [-3.8, 0, 3.8];

        // Sidewall ground-level pilasters & service windows on non-commercial sides (-x, -z)
        if (face === '-x' || face === '-z') {
          for (const along of [-span * 0.32, span * 0.32]) {
            const pp = faceToWorld(spec.x, spec.z, hw, hd, face, along, 0.08);
            pushInst(trimEntries, pp.x, h * 0.5, pp.z, 0.42, h, 0.42, profile.trimTint);
          }
          addWindowUnit(spec.x, spec.z, hw * 0.97, hd * 0.97, face, 0, 2.35, 2.0, 1.75, profile, {
            lit: false,
            shutters: true,
            shutterColor: profile.accentTint,
          });
        }

        // Upper story shuttered coastal windows
        for (let bi = 0; bi < bays.length; bi++) {
          const along = bays[bi];
          const isBalconyBay = face === '+x' && bi === 1;
          addWindowUnit(spec.x, spec.z, hw, hd, face, along, isBalconyBay ? shopFloorH + 2.48 : shopFloorH + upperFloorH * 0.56, isBalconyBay ? 2.15 : 1.65, isBalconyBay ? 2.15 : 1.8, profile, {
            lit: isWindowLit(80 + bi * 11 + (face === '+x' ? 3 : 7)),
            shutters: !isBalconyBay,
            shutterColor: profile.accentTint,
            fullDoor: isBalconyBay,
          });
        }
      }

      // Small upper-floor wrought-iron balcony cleanly above the commercial signboard
      addResidentialBalcony(spec.x, spec.z, hw, hd, '+x', 0, shopFloorH + 1.32, 3.4, 0.9, profile, {
        useGlass: false,
        useCorbels: true,
        addPlanter: true,
      });

      // 4. Commercial Roof Cornice, Stepped Parapet Crest, Skylight Monitor & Mechanical Unit
      const roofSlab = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
      roofSlab.scale.set(w - 0.3, 0.24, d - 0.3);
      roofSlab.position.y = h + 0.12;
      group.add(roofSlab);

      // Bracketed top cornice + parapet wall
      const paraH = 0.92;
      pushInst(trimEntries, spec.x, h + paraH * 0.5, spec.z + hd - 0.16, w + 0.25, paraH, 0.34, profile.trimTint);
      pushInst(trimEntries, spec.x, h + paraH * 0.5, spec.z - hd + 0.16, w + 0.25, paraH, 0.34, profile.trimTint);
      pushInst(trimEntries, spec.x + hw - 0.16, h + paraH * 0.5, spec.z, 0.34, paraH, d - 0.5, profile.trimTint);
      pushInst(trimEntries, spec.x - hw + 0.16, h + paraH * 0.5, spec.z, 0.34, paraH, d - 0.5, profile.trimTint);

      // Stepped commercial parapet pediment crests with cream stone coping caps above East & South signage
      pushInst(accentEntries, spec.x + hw - 0.16, h + paraH + 0.42, spec.z, 0.36, 0.84, 5.2, profile.accentTint);
      pushInst(trimEntries, spec.x + hw - 0.16, h + paraH + 0.9, spec.z, 0.52, 0.18, 5.55, profile.trimTint);
      pushInst(accentEntries, spec.x, h + paraH + 0.42, spec.z + hd - 0.16, 5.6, 0.84, 0.36, profile.accentTint);
      pushInst(trimEntries, spec.x, h + paraH + 0.9, spec.z + hd - 0.16, 5.95, 0.18, 0.52, profile.trimTint);

      // Small rooftop skylight monitor + HVAC unit
      const monitor = new THREE.Mesh(unitBoxGeo, stuccoMat);
      monitor.scale.set(4.2, 1.55, 3.4);
      monitor.position.set(-1.2, h + 0.24 + 0.775, -0.8);
      monitor.castShadow = true;
      group.add(monitor);
      const monRoof = new THREE.Mesh(hippedRoofGeo, terracottaRoofMat);
      monRoof.scale.set(4.7, 0.95, 3.9);
      monRoof.position.set(-1.2, h + 1.79, -0.8);
      group.add(monRoof);

      const shopHvac = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
      shopHvac.scale.set(1.9, 1.05, 1.6);
      shopHvac.position.set(2.8, h + 0.76, -2.2);
      group.add(shopHvac);
      pinnacleY = h + 2.74;
    }

    buildings.push({
      id: spec.id,
      category: profile.category,
      archetype: profile.archetype,
      roofStyle: profile.roofStyle,
      balconyStyle: profile.balconyStyle,
      frontage: profile.frontage,
      balconyCount: totalBalconyUnits - startBalconies,
      windowCount: totalWindowUnits - startWindows,
      pinnacleY,
    });

    root.add(group);
  }

  // 5. Finalize all batched InstancedMeshes with computed bounding spheres and full GPU disposal
  const tmpColor = new THREE.Color();
  const buildInstancedBatch = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    entries: InstanceEntry[],
    castShadow: boolean,
    receiveShadow: boolean,
    useInstanceColor: boolean,
  ): number => {
    if (entries.length === 0) return 0;
    const inst = new THREE.InstancedMesh(geo, mat, entries.length);
    inst.name = name;
    for (let i = 0; i < entries.length; i++) {
      inst.setMatrixAt(i, entries[i].matrix);
      if (useInstanceColor) {
        inst.setColorAt(i, tmpColor.setHex(entries[i].colorHex));
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    if (useInstanceColor && inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = castShadow;
    inst.receiveShadow = receiveShadow;
    inst.computeBoundingSphere();
    disposables.push(inst);
    root.add(inst);
    return 1;
  };

  let instancedBatches = 0;
  instancedBatches += buildInstancedBatch('coral_heights_trim_inst', unitBoxGeo, trimConcreteMat, trimEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_stone_inst', unitBoxGeo, stoneMasonryMat, stoneEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_accent_inst', unitBoxGeo, accentPaintMat, accentEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_wood_inst', unitBoxGeo, woodMat, woodEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_metal_inst', unitBoxGeo, metalRailingMat, metalEntries, false, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_columns_inst', unitCylGeo, trimConcreteMat, columnEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_lit_glass_inst', unitBoxGeo, litWindowGlassMat, litGlassEntries, false, false, false);
  instancedBatches += buildInstancedBatch('coral_heights_dark_glass_inst', unitBoxGeo, darkWindowGlassMat, darkGlassEntries, false, false, false);
  instancedBatches += buildInstancedBatch('coral_heights_balustrade_glass_inst', unitBoxGeo, glassBalustradeMat, glassBalustradeEntries, false, false, false);
  instancedBatches += buildInstancedBatch('coral_heights_arches_inst', archedFrameGeo, trimConcreteMat, archEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_corbels_inst', corbelGeo, trimConcreteMat, corbelEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_foliage_inst', foliageGeo, foliageMat, foliageEntries, true, true, true);
  instancedBatches += buildInstancedBatch('coral_heights_lanterns_inst', unitBoxGeo, porchLanternMat, lanternEntries, false, false, false);

  const totalFacadeInstances =
    trimEntries.length +
    stoneEntries.length +
    accentEntries.length +
    woodEntries.length +
    metalEntries.length +
    columnEntries.length +
    litGlassEntries.length +
    darkGlassEntries.length +
    glassBalustradeEntries.length +
    archEntries.length +
    corbelEntries.length +
    foliageEntries.length +
    lanternEntries.length;

  return {
    totalCount: coralSpecs.length,
    villaCount,
    apartmentCount,
    shopCount,
    totalBalconyUnits,
    totalWindowUnits,
    instancedBatches,
    totalFacadeInstances,
    sharedMaterialCount: sharedMaterials.length,
    buildingMaterialCount,
    archetypesUsed,
    buildings,
  };
}
