import * as THREE from 'three';
import { BuildingSpec } from './cityData';
import { ProceduralTextureSet } from './textures';

export type HotelArchetype =
  | 'art_deco_boutique'
  | 'grand_deco_tower'
  | 'modern_coastal_resort'
  | 'tropical_veranda_hotel'
  | 'coastal_cafe_boutique'
  | 'boutique_nightlife_hotel';

export type HotelCornerStyle = 'rounded' | 'chamfered' | 'fluted_pilaster';

export type HotelBalconyPattern =
  | 'curved_center_wings'
  | 'corner_paired_glass'
  | 'wrap_around_glass'
  | 'checkerboard_veranda'
  | 'juliet_cafe_metal'
  | 'staggered_bronze_glass';

export type HotelRooftopKind =
  | 'pool_terrace'
  | 'stepped_deco_crown'
  | 'pergola_sun_deck'
  | 'cafe_terrace'
  | 'sky_lounge_hvac';

export type FrontageAxis = '+x' | '-x' | '+z' | '-z';

export interface OceanDriveHotelProfile {
  archetype: HotelArchetype;
  frontage: FrontageAxis;
  cornerStyle: HotelCornerStyle;
  balconyPattern: HotelBalconyPattern;
  rooftopKind: HotelRooftopKind;
  hasRooftopPool: boolean;
  podiumHeight: number;
  balconyDepth: number;
  useGlassRailings: boolean;
  hasSteppedPediment: boolean;
  hasPorteCochere: boolean;
  hasValetPlinth: boolean;
  trimTint: number;
  accentTint: number;
  metalTint: number;
  neonBand: 'pink' | 'teal' | 'cyan' | 'amber';
}

export interface HotelPlacementSummary {
  id: string;
  archetype: HotelArchetype;
  rooftopKind: HotelRooftopKind;
  hasRooftopPool: boolean;
  roofBaseY: number;
  pinnacleY: number;
  balconyCount: number;
  frontage: FrontageAxis;
}

export interface OceanDriveArchitectureStats {
  hotelCount: number;
  rooftopPoolCount: number;
  totalBalconyUnits: number;
  instancedBatches: number;
  totalFacadeInstances: number;
  sharedMaterialCount: number;
  hotelMaterialCount: number;
  archetypesUsed: HotelArchetype[];
  hotels: HotelPlacementSummary[];
}

export interface OceanDriveArchitectureContext {
  root: THREE.Group;
  textures: ProceduralTextureSet;
  emissiveBuildingMaterials: THREE.MeshStandardMaterial[];
  neonTrimMaterials: THREE.MeshStandardMaterial[];
  environmentMeshesForCamera: THREE.Object3D[];
  disposables: Array<{ dispose: () => void }>;
}

interface InstanceEntry {
  matrix: THREE.Matrix4;
  colorHex: number;
}

function resolveNeonBand(neonColor?: number): 'pink' | 'teal' | 'cyan' | 'amber' {
  if (neonColor === 0xff758f || neonColor === 0xf472b6 || neonColor === 0xfb7185) return 'pink';
  if (neonColor === 0x2dd4bf) return 'teal';
  if (neonColor === 0xf59e0b || neonColor === 0xfbbf24) return 'amber';
  return 'cyan';
}

function resolveFrontage(spec: BuildingSpec): FrontageAxis {
  if (spec.z <= -100) return '+z';
  if (spec.z >= 100) return '-z';
  if (spec.x >= 64) return '+x';
  return '-x';
}

/**
 * Pure deterministic mapping from an Ocean Drive hotel BuildingSpec to its Miami architectural archetype,
 * balcony arrangement, entrance portico, and rooftop configuration.
 */
export function resolveOceanDriveHotelProfile(spec: BuildingSpec): OceanDriveHotelProfile {
  const frontage = resolveFrontage(spec);
  const neonBand = resolveNeonBand(spec.neonColor);

  switch (spec.id) {
    case 'od_hotel_deco':
      return {
        archetype: 'art_deco_boutique',
        frontage,
        cornerStyle: 'rounded',
        balconyPattern: 'curved_center_wings',
        rooftopKind: 'pool_terrace',
        hasRooftopPool: true,
        podiumHeight: 4.5,
        balconyDepth: 1.05,
        useGlassRailings: false,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xfaf5ec,
        accentTint: spec.accentColor,
        metalTint: 0xdbe5ee,
        neonBand,
      };
    case 'od_hotel_coral':
      return {
        archetype: 'art_deco_boutique',
        frontage,
        cornerStyle: 'rounded',
        balconyPattern: 'curved_center_wings',
        rooftopKind: 'pergola_sun_deck',
        hasRooftopPool: false,
        podiumHeight: 4.5,
        balconyDepth: 1.0,
        useGlassRailings: false,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: false,
        trimTint: 0xfbf4ea,
        accentTint: spec.accentColor,
        metalTint: 0xd9e4ec,
        neonBand,
      };
    case 'od_tower_bay':
      return {
        archetype: 'grand_deco_tower',
        frontage,
        cornerStyle: 'chamfered',
        balconyPattern: 'corner_paired_glass',
        rooftopKind: 'stepped_deco_crown',
        hasRooftopPool: false,
        podiumHeight: 5.4,
        balconyDepth: 1.05,
        useGlassRailings: true,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xf5ebd8,
        accentTint: spec.accentColor,
        metalTint: 0xd4a962,
        neonBand,
      };
    case 'od_hotel_azure':
      return {
        archetype: 'grand_deco_tower',
        frontage,
        cornerStyle: 'chamfered',
        balconyPattern: 'corner_paired_glass',
        rooftopKind: 'stepped_deco_crown',
        hasRooftopPool: false,
        podiumHeight: 4.8,
        balconyDepth: 1.0,
        useGlassRailings: true,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xfaf7f0,
        accentTint: spec.accentColor,
        metalTint: 0xcbd8e6,
        neonBand,
      };
    case 'od_resort_west':
      return {
        archetype: 'modern_coastal_resort',
        frontage,
        cornerStyle: 'fluted_pilaster',
        balconyPattern: 'wrap_around_glass',
        rooftopKind: 'sky_lounge_hvac',
        hasRooftopPool: false,
        podiumHeight: 5.0,
        balconyDepth: 1.12,
        useGlassRailings: true,
        hasSteppedPediment: false,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xf8f6f2,
        accentTint: spec.accentColor,
        metalTint: 0x3b4d61,
        neonBand,
      };
    case 'north_resort_1':
      return {
        archetype: 'modern_coastal_resort',
        frontage,
        cornerStyle: 'fluted_pilaster',
        balconyPattern: 'wrap_around_glass',
        rooftopKind: 'pool_terrace',
        hasRooftopPool: true,
        podiumHeight: 4.8,
        balconyDepth: 1.15,
        useGlassRailings: true,
        hasSteppedPediment: false,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xfaf6ef,
        accentTint: spec.accentColor,
        metalTint: 0x45586c,
        neonBand,
      };
    case 'od_hotel_palm':
      return {
        archetype: 'tropical_veranda_hotel',
        frontage,
        cornerStyle: 'fluted_pilaster',
        balconyPattern: 'checkerboard_veranda',
        rooftopKind: 'pool_terrace',
        hasRooftopPool: true,
        podiumHeight: 4.5,
        balconyDepth: 1.08,
        useGlassRailings: false,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: false,
        trimTint: 0xf9f6ee,
        accentTint: spec.accentColor,
        metalTint: 0x265b63,
        neonBand,
      };
    case 'od_hotel_sun':
      return {
        archetype: 'tropical_veranda_hotel',
        frontage,
        cornerStyle: 'fluted_pilaster',
        balconyPattern: 'checkerboard_veranda',
        rooftopKind: 'pergola_sun_deck',
        hasRooftopPool: false,
        podiumHeight: 4.3,
        balconyDepth: 1.02,
        useGlassRailings: false,
        hasSteppedPediment: false,
        hasPorteCochere: true,
        hasValetPlinth: false,
        trimTint: 0xfcf5e9,
        accentTint: spec.accentColor,
        metalTint: 0x6b4534,
        neonBand,
      };
    case 'od_cafe_marina':
      return {
        archetype: 'coastal_cafe_boutique',
        frontage,
        cornerStyle: 'rounded',
        balconyPattern: 'juliet_cafe_metal',
        rooftopKind: 'cafe_terrace',
        hasRooftopPool: false,
        podiumHeight: 4.2,
        balconyDepth: 0.86,
        useGlassRailings: false,
        hasSteppedPediment: true,
        hasPorteCochere: false,
        hasValetPlinth: false,
        trimTint: 0xfdf9f1,
        accentTint: spec.accentColor,
        metalTint: 0x243b53,
        neonBand,
      };
    case 'south_marina_house':
      return {
        archetype: 'coastal_cafe_boutique',
        frontage,
        cornerStyle: 'rounded',
        balconyPattern: 'juliet_cafe_metal',
        rooftopKind: 'cafe_terrace',
        hasRooftopPool: false,
        podiumHeight: 4.0,
        balconyDepth: 0.85,
        useGlassRailings: false,
        hasSteppedPediment: false,
        hasPorteCochere: false,
        hasValetPlinth: false,
        trimTint: 0xfbf7ef,
        accentTint: spec.accentColor,
        metalTint: 0x1e3a5f,
        neonBand,
      };
    case 'od_club_south':
    default:
      return {
        archetype: 'boutique_nightlife_hotel',
        frontage,
        cornerStyle: 'chamfered',
        balconyPattern: 'staggered_bronze_glass',
        rooftopKind: 'pool_terrace',
        hasRooftopPool: true,
        podiumHeight: 4.6,
        balconyDepth: 1.05,
        useGlassRailings: true,
        hasSteppedPediment: true,
        hasPorteCochere: true,
        hasValetPlinth: true,
        trimTint: 0xe9dfd2,
        accentTint: spec.accentColor,
        metalTint: 0xc99c58,
        neonBand,
      };
  }
}

/**
 * Quarter-round Streamline Moderne corner pier geometry normalized in X [0..1], Z [0..1], Y [0..1].
 * Smooth outer curved arc gives Miami Art Deco hotels authentic rounded corners.
 */
export function createRoundedCornerGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1, 0);
  shape.absarc(0, 0, 1, 0, Math.PI / 2, false);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    curveSegments: 8,
    bevelEnabled: false,
    steps: 1,
  });
  // Rotate so extrusion axis (+Z) becomes vertical (+Y [0..1]), with curved corner in +X/+Z quadrant
  geo.rotateX(-Math.PI / 2);
  // After rotateX(-PI/2): (x, y, z) -> (x, z, -y), so flip Z to keep positive quadrant +X,+Z
  geo.scale(1, 1, -1);
  // Negative scale flips winding; reverse triangle index/vertex winding cleanly
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i += 3) {
    const x1 = pos.getX(i + 1), y1 = pos.getY(i + 1), z1 = pos.getZ(i + 1);
    const x2 = pos.getX(i + 2), y2 = pos.getY(i + 2), z2 = pos.getZ(i + 2);
    pos.setXYZ(i + 1, x2, y2, z2);
    pos.setXYZ(i + 2, x1, y1, z1);
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Stepped Miami Art Deco ziggurat pediment geometry normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 */
export function createArtDecoPedimentGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 0.34);
  shape.lineTo(0.32, 0.34);
  shape.lineTo(0.32, 0.68);
  shape.lineTo(0.14, 0.68);
  shape.lineTo(0.14, 1.0);
  shape.lineTo(-0.14, 1.0);
  shape.lineTo(-0.14, 0.68);
  shape.lineTo(-0.32, 0.68);
  shape.lineTo(-0.32, 0.34);
  shape.lineTo(-0.5, 0.34);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.025,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.5);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Streamline Moderne curved-front balcony slab geometry normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors flush against a facade at Z = 0 and projects outward to Z = 1 with rounded front corners.
 */
export function createCurvedBalconySlabGeometry(): THREE.BufferGeometry {
  const r = 0.16;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 1 - r);
  shape.quadraticCurveTo(0.5, 1, 0.5 - r, 1);
  shape.lineTo(-0.5 + r, 1);
  shape.quadraticCurveTo(-0.5, 1, -0.5, 1 - r);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    curveSegments: 6,
    bevelEnabled: false,
    steps: 1,
  });
  // Extrusion along +Z becomes vertical height Y [0..1]; shape Y [0..1] becomes outward +Z [0..1]
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 1, 0);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Chamfered-corner architectural prism normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 * Used for grand Art Deco hotel corner piers and stepped penthouse crowns.
 */
export function createChamferedBlockGeometry(): THREE.BufferGeometry {
  const c = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5 + c, -0.5);
  shape.lineTo(0.5 - c, -0.5);
  shape.lineTo(0.5, -0.5 + c);
  shape.lineTo(0.5, 0.5 - c);
  shape.lineTo(0.5 - c, 0.5);
  shape.lineTo(-0.5 + c, 0.5);
  shape.lineTo(-0.5, 0.5 - c);
  shape.lineTo(-0.5, -0.5 + c);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds all Ocean Drive hotel and resort buildings using Miami Art Deco & coastal resort archetypes,
 * shared custom procedural geometry, calibrated PBR materials, and city-wide InstancedMesh batching.
 */
export function buildOceanDriveArchitecture(
  hotelSpecs: BuildingSpec[],
  ctx: OceanDriveArchitectureContext,
): OceanDriveArchitectureStats {
  const {
    root,
    textures,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    environmentMeshesForCamera,
    disposables,
  } = ctx;

  // Shared procedural geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const foliageGeo = new THREE.DodecahedronGeometry(0.55, 1);
  const roundedCornerGeo = createRoundedCornerGeometry();
  const decoPedimentGeo = createArtDecoPedimentGeometry();
  const curvedBalconyGeo = createCurvedBalconySlabGeometry();
  const chamferedBlockGeo = createChamferedBlockGeometry();
  disposables.push(
    unitBoxGeo,
    unitCylGeo,
    foliageGeo,
    roundedCornerGeo,
    decoPedimentGeo,
    curvedBalconyGeo,
    chamferedBlockGeo,
  );

  // Shared PBR material pool (distinct roughness/metalness separation across stucco, metal, glass, wood, stone, water)
  const stuccoTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.72,
  });
  const artDecoCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf7f2e8,
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.72,
  });
  const pastelAccentMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.14,
    envMapIntensity: 0.85,
  });
  const balconyMetalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.82,
    envMapIntensity: 1.3,
  });
  const glassRailingMat = new THREE.MeshPhysicalMaterial({
    color: 0x82d4e2,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.5,
    envMapIntensity: 1.48,
  });
  const warmLobbyGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3042,
    emissive: 0xffc97d,
    emissiveIntensity: 0.04,
    roughness: 0.08,
    metalness: 0.22,
    ior: 1.52,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.52,
  });
  const terraceStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6dccb,
    roughness: 0.84,
    metalness: 0.04,
    envMapIntensity: 0.65,
  });
  const pergolaWoodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.76,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });
  const poolWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x14b8c8,
    roughness: 0.07,
    metalness: 0.12,
    ior: 1.333,
    reflectivity: 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.55,
  });
  const poolTileMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.34,
    metalness: 0.08,
    envMapIntensity: 0.92,
  });
  const roofFoliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.55,
  });
  const roofConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x8c96a4,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });
  const warmEntranceLightMat = new THREE.MeshStandardMaterial({
    color: 0xffe8b8,
    emissive: 0xffc668,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.12,
  });

  // 4 shared Miami Art Deco neon tube materials (stays under bloom threshold by day, glows cleanly at night)
  const neonPinkMat = new THREE.MeshStandardMaterial({
    color: 0xffb3c4,
    emissive: 0xff6b8b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const neonTealMat = new THREE.MeshStandardMaterial({
    color: 0xa7f3e8,
    emissive: 0x2dd4bf,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const neonAmberMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  emissiveBuildingMaterials.push(warmLobbyGlassMat);
  neonTrimMaterials.push(
    warmEntranceLightMat,
    neonPinkMat,
    neonTealMat,
    neonCyanMat,
    neonAmberMat,
  );

  const sharedMaterials: THREE.Material[] = [
    stuccoTrimMat,
    artDecoCreamMat,
    pastelAccentMat,
    balconyMetalMat,
    glassRailingMat,
    warmLobbyGlassMat,
    terraceStoneMat,
    pergolaWoodMat,
    poolWaterMat,
    poolTileMat,
    roofFoliageMat,
    roofConcreteMat,
    warmEntranceLightMat,
    neonPinkMat,
    neonTealMat,
    neonCyanMat,
    neonAmberMat,
  ];
  disposables.push(...sharedMaterials);

  // City-wide InstancedMesh collectors
  const stuccoTrimEntries: InstanceEntry[] = [];
  const curvedBalconyEntries: InstanceEntry[] = [];
  const accentTrimEntries: InstanceEntry[] = [];
  const metalRailEntries: InstanceEntry[] = [];
  const glassPanelEntries: InstanceEntry[] = [];
  const columnEntries: InstanceEntry[] = [];
  const pergolaWoodEntries: InstanceEntry[] = [];
  const foliageEntries: InstanceEntry[] = [];
  const warmLightEntries: InstanceEntry[] = [];
  const neonEntries: Record<'pink' | 'teal' | 'cyan' | 'amber', InstanceEntry[]> = {
    pink: [],
    teal: [],
    cyan: [],
    amber: [],
  };

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

  /**
   * Adds a complete projecting hotel balcony (structural slab + either glass panels or metal balusters + top rail + side dividers)
   * oriented along a facade normal:
   * - dir === '+x' or '-x': span runs along Z, projects outward along X
   * - dir === '+z' or '-z': span runs along X, projects outward along Z
   */
  const addBalconyUnit = (
    dir: FrontageAxis,
    wallCenterX: number,
    wallCenterZ: number,
    floorY: number,
    span: number,
    depth: number,
    profile: OceanDriveHotelProfile,
    options?: {
      curved?: boolean;
      addPrivacyDividers?: boolean;
      accentFascia?: boolean;
    },
  ) => {
    const slabH = 0.24;
    const railH = 1.02;
    const isX = dir === '+x' || dir === '-x';
    const sign = dir === '+x' || dir === '+z' ? 1 : -1;

    // Rotation so local +Z points outward along facade normal
    const rotY =
      dir === '+z' ? 0 : dir === '-z' ? Math.PI : dir === '+x' ? Math.PI / 2 : -Math.PI / 2;

    // 1. Structural balcony floor slab
    if (options?.curved) {
      // createCurvedBalconySlabGeometry anchors at Z=0, extends to Z=+1, Y [0..1]
      pushInst(
        curvedBalconyEntries,
        wallCenterX,
        floorY - slabH * 0.5,
        wallCenterZ,
        span,
        slabH,
        depth,
        profile.trimTint,
        rotY,
      );
    } else {
      const midX = isX ? wallCenterX + sign * (depth * 0.5) : wallCenterX;
      const midZ = isX ? wallCenterZ : wallCenterZ + sign * (depth * 0.5);
      pushInst(
        stuccoTrimEntries,
        midX,
        floorY,
        midZ,
        isX ? depth : span,
        slabH,
        isX ? span : depth,
        profile.trimTint,
      );
    }

    // Optional pastel Art Deco fascia strip along outer slab edge
    if (options?.accentFascia) {
      const edgeOff = depth - 0.04;
      const fx = isX ? wallCenterX + sign * edgeOff : wallCenterX;
      const fz = isX ? wallCenterZ : wallCenterZ + sign * edgeOff;
      pushInst(
        accentTrimEntries,
        fx,
        floorY,
        fz,
        isX ? 0.08 : span * 0.94,
        slabH * 0.62,
        isX ? span * 0.94 : 0.08,
        profile.accentTint,
      );
    }

    // 2. Top handrail & side return rails (for curved slabs, anchor corner posts strictly inside curved slab radius)
    const railTopY = floorY + slabH * 0.5 + railH;
    const outerDist = options?.curved ? depth * 0.86 : depth - 0.09;
    const frontX = isX ? wallCenterX + sign * outerDist : wallCenterX;
    const frontZ = isX ? wallCenterZ : wallCenterZ + sign * outerDist;
    const railSpan = options?.curved ? span * 0.78 : span - 0.08;

    // Front top handrail
    pushInst(
      metalRailEntries,
      frontX,
      railTopY,
      frontZ,
      isX ? 0.07 : railSpan,
      0.07,
      isX ? railSpan : 0.07,
      profile.metalTint,
    );
    // Mid horizontal rail bar (Streamline Moderne horizontal railing detail)
    pushInst(
      metalRailEntries,
      frontX,
      floorY + slabH * 0.5 + railH * 0.52,
      frontZ,
      isX ? 0.05 : railSpan,
      0.05,
      isX ? railSpan : 0.05,
      profile.metalTint,
    );

    // Side return handrails & corner posts
    for (const side of [-1, 1]) {
      const sideOff = side * (railSpan * 0.5);
      const sx = isX ? wallCenterX + sign * (outerDist * 0.5) : wallCenterX + sideOff;
      const sz = isX ? wallCenterZ + sideOff : wallCenterZ + sign * (outerDist * 0.5);
      pushInst(
        metalRailEntries,
        sx,
        railTopY,
        sz,
        isX ? outerDist : 0.07,
        0.07,
        isX ? 0.07 : outerDist,
        profile.metalTint,
      );
      // Front corner vertical stanchion post
      const px = isX ? frontX : wallCenterX + sideOff;
      const pz = isX ? wallCenterZ + sideOff : frontZ;
      pushInst(
        metalRailEntries,
        px,
        floorY + slabH * 0.5 + railH * 0.5,
        pz,
        0.07,
        railH,
        0.07,
        profile.metalTint,
      );
    }

    // 3. Glass balustrade panels OR vertical metal balusters
    if (profile.useGlassRailings) {
      const panelH = railH - 0.14;
      const panelY = floorY + slabH * 0.5 + panelH * 0.5 + 0.06;
      // Front glass panel
      pushInst(
        glassPanelEntries,
        frontX,
        panelY,
        frontZ,
        isX ? 0.06 : railSpan - 0.12,
        panelH,
        isX ? railSpan - 0.12 : 0.06,
        0xffffff,
      );
      // Side glass panels
      for (const side of [-1, 1]) {
        const sideOff = side * (railSpan * 0.5);
        const gx = isX ? wallCenterX + sign * (outerDist * 0.5) : wallCenterX + sideOff;
        const gz = isX ? wallCenterZ + sideOff : wallCenterZ + sign * (outerDist * 0.5);
        pushInst(
          glassPanelEntries,
          gx,
          panelY,
          gz,
          isX ? outerDist - 0.1 : 0.06,
          panelH,
          isX ? 0.06 : outerDist - 0.1,
          0xffffff,
        );
      }
      // Intermediate slim vertical mullion stanchions
      const posts = Math.max(1, Math.floor(railSpan / 2.2));
      for (let p = 1; p < posts; p++) {
        const off = (p / posts - 0.5) * railSpan;
        pushInst(
          metalRailEntries,
          isX ? frontX : wallCenterX + off,
          panelY,
          isX ? wallCenterZ + off : frontZ,
          0.055,
          railH,
          0.055,
          profile.metalTint,
        );
      }
    } else {
      // Classic Art Deco / Coastal vertical metal balustrade + bottom rail
      pushInst(
        metalRailEntries,
        frontX,
        floorY + slabH * 0.5 + 0.12,
        frontZ,
        isX ? 0.05 : railSpan,
        0.05,
        isX ? railSpan : 0.05,
        profile.metalTint,
      );
      const pickets = Math.max(3, Math.min(8, Math.round(railSpan / 0.72)));
      for (let p = 1; p < pickets; p++) {
        const off = (p / pickets - 0.5) * railSpan;
        pushInst(
          metalRailEntries,
          isX ? frontX : wallCenterX + off,
          floorY + slabH * 0.5 + railH * 0.5,
          isX ? wallCenterZ + off : frontZ,
          0.045,
          railH - 0.06,
          0.045,
          profile.metalTint,
        );
      }
    }

    // 4. Optional stucco side privacy divider wing walls (MiMo / Tropical Veranda signature)
    if (options?.addPrivacyDividers) {
      for (const side of [-1, 1]) {
        const sideOff = side * (span * 0.5 - 0.09);
        const dx = isX ? wallCenterX + sign * (depth * 0.44) : wallCenterX + sideOff;
        const dz = isX ? wallCenterZ + sideOff : wallCenterZ + sign * (depth * 0.44);
        pushInst(
          stuccoTrimEntries,
          dx,
          floorY + slabH * 0.5 + 0.85,
          dz,
          isX ? depth * 0.82 : 0.16,
          1.7,
          isX ? 0.16 : depth * 0.82,
          profile.trimTint,
        );
      }
    }
  };

  /**
   * Adds a premium Ocean Drive hotel entrance lobby, fluted portico/porte-cochere canopy,
   * framed double glass doors, warm interior lighting, and optional valet plinth & planters.
   */
  const addResortEntrance = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: OceanDriveHotelProfile,
  ) => {
    const podiumH = profile.podiumHeight;
    const w = spec.width;
    const d = spec.depth;

    // Ground stone base plinth (grounded strictly at y=0, within collider footprint)
    const plinth = new THREE.Mesh(unitBoxGeo, terraceStoneMat);
    plinth.scale.set(w * 0.99, 0.36, d * 0.99);
    plinth.position.y = 0.18;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Recessed warm-lit lobby glazing enclosure
    const lobbyW = w - 0.92;
    const lobbyD = d - 0.92;
    const lobbyH = podiumH - 0.36;
    const lobbyGlass = new THREE.Mesh(unitBoxGeo, warmLobbyGlassMat);
    lobbyGlass.scale.set(lobbyW, lobbyH, lobbyD);
    lobbyGlass.position.y = 0.36 + lobbyH * 0.5;
    lobbyGlass.castShadow = true;
    lobbyGlass.receiveShadow = true;
    group.add(lobbyGlass);
    environmentMeshesForCamera.push(lobbyGlass);

    // Perimeter lobby colonnade columns + vertical glazing mullions
    const colY = 0.36 + lobbyH * 0.5;
    const colsX = Math.max(3, Math.round(w / 3.8));
    const colsZ = Math.max(3, Math.round(d / 3.8));
    for (let i = 0; i <= colsX; i++) {
      const px = spec.x - (w * 0.5 - 0.42) + (i / colsX) * (w - 0.84);
      const nearCenter = Math.abs(px - spec.x) < 2.2;
      if (!nearCenter || (profile.frontage !== '+z' && profile.frontage !== '-z')) {
        pushInst(columnEntries, px, colY, spec.z + d * 0.5 - 0.38, 0.48, lobbyH, 0.48, profile.trimTint);
        pushInst(columnEntries, px, colY, spec.z - d * 0.5 + 0.38, 0.48, lobbyH, 0.48, profile.trimTint);
      }
    }
    for (let i = 1; i < colsZ; i++) {
      const pz = spec.z - (d * 0.5 - 0.42) + (i / colsZ) * (d - 0.84);
      const nearCenter = Math.abs(pz - spec.z) < 2.2;
      if (!nearCenter || (profile.frontage !== '+x' && profile.frontage !== '-x')) {
        pushInst(columnEntries, spec.x + w * 0.5 - 0.38, colY, pz, 0.48, lobbyH, 0.48, profile.trimTint);
        pushInst(columnEntries, spec.x - w * 0.5 + 0.38, colY, pz, 0.48, lobbyH, 0.48, profile.trimTint);
      }
    }

    // Lobby storefront glazing mullions & transom beam
    const transomY = Math.min(3.15, podiumH * 0.68);
    pushInst(metalRailEntries, spec.x, transomY, spec.z + d * 0.5 - 0.42, lobbyW, 0.14, 0.14, profile.metalTint);
    pushInst(metalRailEntries, spec.x, transomY, spec.z - d * 0.5 + 0.42, lobbyW, 0.14, 0.14, profile.metalTint);
    pushInst(metalRailEntries, spec.x + w * 0.5 - 0.42, transomY, spec.z, 0.14, 0.14, lobbyD, profile.metalTint);
    pushInst(metalRailEntries, spec.x - w * 0.5 + 0.42, transomY, spec.z, 0.14, 0.14, lobbyD, profile.metalTint);

    const barsX = Math.max(4, Math.round(w / 2.2));
    const barsZ = Math.max(4, Math.round(d / 2.2));
    for (let i = 1; i < barsX; i++) {
      const bx = spec.x - lobbyW * 0.5 + (i / barsX) * lobbyW;
      pushInst(metalRailEntries, bx, colY, spec.z + d * 0.5 - 0.43, 0.09, lobbyH, 0.12, profile.metalTint);
      pushInst(metalRailEntries, bx, colY, spec.z - d * 0.5 + 0.43, 0.09, lobbyH, 0.12, profile.metalTint);
    }
    for (let i = 1; i < barsZ; i++) {
      const bz = spec.z - lobbyD * 0.5 + (i / barsZ) * lobbyD;
      pushInst(metalRailEntries, spec.x + w * 0.5 - 0.43, colY, bz, 0.12, lobbyH, 0.09, profile.metalTint);
      pushInst(metalRailEntries, spec.x - w * 0.5 + 0.43, colY, bz, 0.12, lobbyH, 0.09, profile.metalTint);
    }

    // Podium Art Deco entablature / wrap-around belt cornice
    pushInst(stuccoTrimEntries, spec.x, podiumH - 0.12, spec.z + d * 0.5 + 0.06, w + 0.55, 0.52, 0.44, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x, podiumH - 0.12, spec.z - d * 0.5 - 0.06, w + 0.55, 0.52, 0.44, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x + w * 0.5 + 0.06, podiumH - 0.12, spec.z, 0.44, 0.52, d + 0.55, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x - w * 0.5 - 0.06, podiumH - 0.12, spec.z, 0.44, 0.52, d + 0.55, profile.trimTint);

    // Primary Street-Facing Resort Entrance Portico / Porte-Cochere Canopy
    const dir = profile.frontage;
    const isX = dir === '+x' || dir === '-x';
    const sign = dir === '+x' || dir === '+z' ? 1 : -1;
    const faceSpan = isX ? d : w;
    const faceHalf = (isX ? w : d) * 0.5;
    const canopySpan = profile.archetype === 'coastal_cafe_boutique'
      ? Math.min(faceSpan * 0.84, 12.2)
      : Math.min(faceSpan * 0.54, 7.6);
    const canopyProj = profile.hasPorteCochere ? 2.15 : 1.75;
    const canopyY = Math.min(3.85, podiumH - 0.42);
    const rotY =
      dir === '+z' ? 0 : dir === '-z' ? Math.PI : dir === '+x' ? Math.PI / 2 : -Math.PI / 2;

    const wallX = isX ? spec.x + sign * faceHalf : spec.x;
    const wallZ = isX ? spec.z : spec.z + sign * faceHalf;

    // Sculpted entrance canopy (curved Streamline Moderne slab for rounded hotels, crisp slab for others)
    if (profile.cornerStyle === 'rounded') {
      pushInst(
        curvedBalconyEntries,
        wallX,
        canopyY - 0.16,
        wallZ,
        canopySpan,
        0.34,
        canopyProj,
        profile.trimTint,
        rotY,
      );
    } else {
      pushInst(
        stuccoTrimEntries,
        isX ? wallX + sign * (canopyProj * 0.5) : wallX,
        canopyY,
        isX ? wallZ : wallZ + sign * (canopyProj * 0.5),
        isX ? canopyProj : canopySpan,
        0.34,
        isX ? canopySpan : canopyProj,
        profile.trimTint,
      );
    }

    // Pastel Art Deco canopy fascia accent band
    const fasciaDist = canopyProj - 0.06;
    pushInst(
      accentTrimEntries,
      isX ? wallX + sign * fasciaDist : wallX,
      canopyY + 0.04,
      isX ? wallZ : wallZ + sign * fasciaDist,
      isX ? 0.12 : canopySpan * 0.92,
      0.24,
      isX ? canopySpan * 0.92 : 0.12,
      profile.accentTint,
    );

    // Warm recessed canopy soffit lighting bar (welcoming hotel arrival glow)
    pushInst(
      warmLightEntries,
      isX ? wallX + sign * (canopyProj * 0.48) : wallX,
      canopyY - 0.2,
      isX ? wallZ : wallZ + sign * (canopyProj * 0.48),
      isX ? canopyProj * 0.56 : canopySpan * 0.72,
      0.08,
      isX ? canopySpan * 0.72 : canopyProj * 0.56,
      0xffe8b8,
    );

    // Portico entrance columns supporting outer canopy edge (leaving wide unobstructed central arrival bay)
    const pillarDist = canopyProj - 0.34;
    const pillarOffsets =
      profile.archetype === 'grand_deco_tower' || profile.archetype === 'coastal_cafe_boutique'
        ? [-canopySpan * 0.44, -canopySpan * 0.22, canopySpan * 0.22, canopySpan * 0.44]
        : [-canopySpan * 0.42, canopySpan * 0.42];
    for (const off of pillarOffsets) {
      const px = isX ? wallX + sign * pillarDist : wallX + off;
      const pz = isX ? wallZ + off : wallZ + sign * pillarDist;
      pushInst(columnEntries, px, canopyY * 0.5, pz, 0.44, canopyY, 0.44, profile.trimTint);
      // Decorative column base plinth collar
      pushInst(stuccoTrimEntries, px, 0.22, pz, 0.62, 0.44, 0.62, profile.trimTint);
    }

    // Framed double glass entrance doors + decorative Art Deco portal surround
    const doorW = 3.1;
    const doorH = Math.min(3.05, canopyY - 0.28);
    for (const side of [-1, 0, 1]) {
      const off = side * (doorW * 0.5);
      pushInst(
        metalRailEntries,
        isX ? wallX - sign * 0.34 : wallX + off,
        0.36 + doorH * 0.5,
        isX ? wallZ + off : wallZ - sign * 0.34,
        isX ? 0.16 : 0.12,
        doorH,
        isX ? 0.12 : 0.16,
        profile.metalTint,
      );
    }
    // Decorative stepped Art Deco surround header above canopy
    pushInst(
      accentTrimEntries,
      isX ? wallX + sign * 0.18 : wallX,
      canopyY + 0.44,
      isX ? wallZ : wallZ + sign * 0.18,
      isX ? 0.34 : canopySpan * 0.62,
      0.42,
      isX ? canopySpan * 0.62 : 0.34,
      profile.accentTint,
    );

    // Optional valet arrival carpet plinth & flanking tropical entrance planters
    if (profile.hasValetPlinth) {
      pushInst(
        accentTrimEntries,
        isX ? wallX + sign * (canopyProj * 0.45) : wallX,
        0.04,
        isX ? wallZ : wallZ + sign * (canopyProj * 0.45),
        isX ? canopyProj * 0.92 : 2.6,
        0.08,
        isX ? 2.6 : canopyProj * 0.92,
        profile.accentTint,
      );
    }
    for (const side of [-1, 1]) {
      const off = side * (canopySpan * 0.46 + 0.55);
      if (Math.abs(off) < faceSpan * 0.46) {
        const px = isX ? wallX + sign * 0.65 : wallX + off;
        const pz = isX ? wallZ + off : wallZ + sign * 0.65;
        pushInst(stuccoTrimEntries, px, 0.38, pz, 0.78, 0.76, 0.78, profile.trimTint);
        pushInst(foliageEntries, px, 0.96, pz, 0.72, 0.72, 0.72, 0x2e7d47);
      }
    }
  };

  /**
   * Builds varied, grounded rooftop resort environments (pools, sun-deck pergolas,
   * Art Deco stepped crowns, rooftop cafes, or screened mechanical equipment).
   */
  const addResortRooftop = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: OceanDriveHotelProfile,
    roofY: number,
  ): number => {
    const w = spec.width;
    const d = spec.depth;

    // Grounded concrete/travertine roof deck slab sitting flush at roofY
    const roofDeck = new THREE.Mesh(
      unitBoxGeo,
      profile.rooftopKind === 'stepped_deco_crown' || profile.rooftopKind === 'sky_lounge_hvac'
        ? roofConcreteMat
        : terraceStoneMat,
    );
    roofDeck.scale.set(w - 0.36, 0.26, d - 0.36);
    roofDeck.position.set(0, roofY + 0.13, 0);
    roofDeck.receiveShadow = true;
    group.add(roofDeck);

    const deckTopY = roofY + 0.26;

    // Perimeter rooftop parapet wall (low masonry coping + optional glass safety railing on walkable terraces)
    const parapetH = profile.rooftopKind === 'pool_terrace' || profile.rooftopKind === 'cafe_terrace'
      ? 0.48
      : 0.85;
    const wallT = 0.36;
    pushInst(stuccoTrimEntries, spec.x, deckTopY + parapetH * 0.5, spec.z + d * 0.5 - wallT * 0.5, w + 0.12, parapetH, wallT, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x, deckTopY + parapetH * 0.5, spec.z - d * 0.5 + wallT * 0.5, w + 0.12, parapetH, wallT, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x + w * 0.5 - wallT * 0.5, deckTopY + parapetH * 0.5, spec.z, wallT, parapetH, d - wallT * 2, profile.trimTint);
    pushInst(stuccoTrimEntries, spec.x - w * 0.5 + wallT * 0.5, deckTopY + parapetH * 0.5, spec.z, wallT, parapetH, d - wallT * 2, profile.trimTint);

    // Subtle Art Deco rooftop neon trim outline along primary facade parapet
    const neonList = neonEntries[profile.neonBand];
    const neonY = roofY - 0.24;
    pushInst(neonList, spec.x, neonY, spec.z + d * 0.5 + 0.16, w - 0.4, 0.2, 0.14, 0xffffff);
    pushInst(neonList, spec.x, neonY, spec.z - d * 0.5 - 0.16, w - 0.4, 0.2, 0.14, 0xffffff);
    pushInst(neonList, spec.x + w * 0.5 + 0.16, neonY, spec.z, 0.14, 0.2, d - 0.4, 0xffffff);
    pushInst(neonList, spec.x - w * 0.5 - 0.16, neonY, spec.z, 0.14, 0.2, d - 0.4, 0xffffff);

    let pinnacleY = deckTopY + parapetH;

    // Stepped Art Deco Ziggurat Pediment Crown on primary frontage (for classic Art Deco hotels)
    if (profile.hasSteppedPediment) {
      const dir = profile.frontage;
      const isX = dir === '+x' || dir === '-x';
      const sign = dir === '+x' || dir === '+z' ? 1 : -1;
      const pedW = Math.min((isX ? d : w) * 0.52, 7.6);
      const pedH = profile.archetype === 'grand_deco_tower' ? 3.8 : 2.9;
      const ped = new THREE.Mesh(decoPedimentGeo, artDecoCreamMat);
      ped.scale.set(pedW, pedH, 0.72);
      if (isX) {
        ped.rotation.y = Math.PI / 2;
        ped.position.set(sign * (w * 0.5 - 0.36), roofY + 0.2, 0);
      } else {
        ped.position.set(0, roofY + 0.2, sign * (d * 0.5 - 0.36));
      }
      ped.castShadow = true;
      group.add(ped);

      // Decorative pastel chevron relief accent mounted on pediment center
      pushInst(
        accentTrimEntries,
        isX ? spec.x + sign * (w * 0.5 + 0.04) : spec.x,
        roofY + 0.2 + pedH * 0.56,
        isX ? spec.z : spec.z + sign * (d * 0.5 + 0.04),
        isX ? 0.14 : pedW * 0.32,
        pedH * 0.46,
        isX ? pedW * 0.32 : 0.14,
        profile.accentTint,
      );
      // Neon vertical crest bar on pediment peak
      pushInst(
        neonList,
        isX ? spec.x + sign * (w * 0.5 + 0.12) : spec.x,
        roofY + 0.2 + pedH * 0.62,
        isX ? spec.z : spec.z + sign * (d * 0.5 + 0.12),
        isX ? 0.12 : 0.2,
        pedH * 0.72,
        isX ? 0.2 : 0.12,
        0xffffff,
      );
      pinnacleY = Math.max(pinnacleY, roofY + 0.2 + pedH);
    }

    // Helper: Glass safety railing on top of low roof parapet (for walkable pools, sun decks & roof cafes)
    const addRoofGlassRailing = () => {
      const glassH = 0.78;
      const railY = deckTopY + parapetH + glassH * 0.5;
      const topBarY = deckTopY + parapetH + glassH;
      pushInst(glassPanelEntries, spec.x, railY, spec.z + d * 0.5 - wallT * 0.5, w - 0.6, glassH, 0.07, 0xffffff);
      pushInst(glassPanelEntries, spec.x, railY, spec.z - d * 0.5 + wallT * 0.5, w - 0.6, glassH, 0.07, 0xffffff);
      pushInst(glassPanelEntries, spec.x + w * 0.5 - wallT * 0.5, railY, spec.z, 0.07, glassH, d - 0.6, 0xffffff);
      pushInst(glassPanelEntries, spec.x - w * 0.5 + wallT * 0.5, railY, spec.z, 0.07, glassH, d - 0.6, 0xffffff);

      pushInst(metalRailEntries, spec.x, topBarY, spec.z + d * 0.5 - wallT * 0.5, w - 0.5, 0.07, 0.09, profile.metalTint);
      pushInst(metalRailEntries, spec.x, topBarY, spec.z - d * 0.5 + wallT * 0.5, w - 0.5, 0.07, 0.09, profile.metalTint);
      pushInst(metalRailEntries, spec.x + w * 0.5 - wallT * 0.5, topBarY, spec.z, 0.09, 0.07, d - 0.5, profile.metalTint);
      pushInst(metalRailEntries, spec.x - w * 0.5 + wallT * 0.5, topBarY, spec.z, 0.09, 0.07, d - 0.5, profile.metalTint);
      pinnacleY = Math.max(pinnacleY, topBarY + 0.06);
    };

    // Helper: Grounded coastal timber lounge pergola
    const addRoofPergola = (cx: number, cz: number, pw: number, pd: number, ph: number) => {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pushInst(
            pergolaWoodEntries,
            cx + sx * (pw * 0.46),
            deckTopY + ph * 0.5,
            cz + sz * (pd * 0.46),
            0.22,
            ph,
            0.22,
            0x9b6b43,
          );
        }
      }
      // Perimeter header beams
      pushInst(pergolaWoodEntries, cx, deckTopY + ph, cz + pd * 0.46, pw, 0.2, 0.22, 0x9b6b43);
      pushInst(pergolaWoodEntries, cx, deckTopY + ph, cz - pd * 0.46, pw, 0.2, 0.22, 0x9b6b43);
      pushInst(pergolaWoodEntries, cx + pw * 0.46, deckTopY + ph, cz, 0.22, 0.2, pd, 0x9b6b43);
      pushInst(pergolaWoodEntries, cx - pw * 0.46, deckTopY + ph, cz, 0.22, 0.2, pd, 0x9b6b43);
      // Shaded louver rafters
      const slatCount = Math.max(3, Math.min(6, Math.round(pw / 1.05)));
      for (let i = 1; i < slatCount; i++) {
        const ox = (i / slatCount - 0.5) * (pw - 0.4);
        pushInst(pergolaWoodEntries, cx + ox, deckTopY + ph + 0.08, cz, 0.14, 0.12, pd * 0.92, 0xb07d4f);
      }
      pinnacleY = Math.max(pinnacleY, deckTopY + ph + 0.18);
    };

    // Helper: Rooftop tropical planter boxes in corners
    const addCornerPlanters = () => {
      const pxOff = w * 0.5 - 1.25;
      const pzOff = d * 0.5 - 1.25;
      const shrubTints = [0x2c7a47, 0x378c52, 0x246b3c, 0x3e9456];
      let idx = 0;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const px = spec.x + sx * pxOff;
          const pz = spec.z + sz * pzOff;
          pushInst(stuccoTrimEntries, px, deckTopY + 0.34, pz, 0.9, 0.68, 0.9, profile.trimTint);
          pushInst(foliageEntries, px, deckTopY + 0.92, pz, 0.85, 0.78, 0.85, shrubTints[idx++ % shrubTints.length]);
        }
      }
    };

    switch (profile.rooftopKind) {
      case 'pool_terrace': {
        addRoofGlassRailing();
        addCornerPlanters();

        // Raised tiled coping platform + recessed turquoise swimming pool water basin
        const poolW = Math.min(w * 0.56, 9.2);
        const poolD = Math.min(d * 0.52, 8.6);
        const poolOffsetX = w > d ? -w * 0.12 : 0;
        const poolOffsetZ = d >= w ? -d * 0.12 : 0;

        // Raised stone pool surround coping (grounded cleanly at deckTopY)
        const copingH = 0.56;
        const coping = new THREE.Mesh(unitBoxGeo, terraceStoneMat);
        coping.scale.set(poolW + 1.15, copingH, poolD + 1.15);
        coping.position.set(poolOffsetX, deckTopY + copingH * 0.5, poolOffsetZ);
        coping.receiveShadow = true;
        group.add(coping);

        // Ceramic tile pool rim
        const tileRim = new THREE.Mesh(unitBoxGeo, poolTileMat);
        tileRim.scale.set(poolW + 0.24, copingH + 0.04, poolD + 0.24);
        tileRim.position.set(poolOffsetX, deckTopY + copingH * 0.5 + 0.02, poolOffsetZ);
        group.add(tileRim);

        // Shimmering turquoise pool water surface (offset >= 0.04 above rim to eliminate any Z-fighting)
        const poolWater = new THREE.Mesh(unitBoxGeo, poolWaterMat);
        poolWater.name = `rooftop_pool_${spec.id}`;
        poolWater.scale.set(poolW - 0.16, 0.12, poolD - 0.16);
        poolWater.position.set(poolOffsetX, deckTopY + copingH + 0.05, poolOffsetZ);
        poolWater.receiveShadow = true;
        group.add(poolWater);

        // Subtle underwater aqua pool-edge illumination strips (understated by day, glowing resort pool at night)
        const poolLightY = deckTopY + copingH + 0.06;
        pushInst(neonEntries.teal, spec.x + poolOffsetX, poolLightY, spec.z + poolOffsetZ + (poolD - 0.24) * 0.5, poolW - 0.28, 0.08, 0.12, 0xffffff);
        pushInst(neonEntries.teal, spec.x + poolOffsetX, poolLightY, spec.z + poolOffsetZ - (poolD - 0.24) * 0.5, poolW - 0.28, 0.08, 0.12, 0xffffff);
        pushInst(neonEntries.teal, spec.x + poolOffsetX + (poolW - 0.24) * 0.5, poolLightY, spec.z + poolOffsetZ, 0.12, 0.08, poolD - 0.28, 0xffffff);
        pushInst(neonEntries.teal, spec.x + poolOffsetX - (poolW - 0.24) * 0.5, poolLightY, spec.z + poolOffsetZ, 0.12, 0.08, poolD - 0.28, 0xffffff);

        // Poolside shaded lounge pergola opposite the pool
        const pergX = spec.x + (w > d ? w * 0.26 : 0);
        const pergZ = spec.z + (d >= w ? d * 0.26 : 0);
        addRoofPergola(pergX, pergZ, Math.min(w * 0.32, 4.6), Math.min(d * 0.3, 4.2), 2.65);

        // Poolside lounge chairs (wood frame + white cushion)
        const chairX = spec.x + poolOffsetX + (w > d ? 0 : poolW * 0.62);
        const chairZ = spec.z + poolOffsetZ + (d >= w ? 0 : poolD * 0.64);
        for (const cOff of [-1.05, 1.05]) {
          const lx = w > d ? chairX + cOff : chairX;
          const lz = w > d ? chairZ : chairZ + cOff;
          pushInst(pergolaWoodEntries, lx, deckTopY + 0.18, lz, 0.72, 0.22, 1.65, 0x9b6b43);
          pushInst(stuccoTrimEntries, lx, deckTopY + 0.34, lz, 0.64, 0.12, 1.5, 0xfaf7f2);
        }
        break;
      }

      case 'stepped_deco_crown': {
        // Grand multi-step Art Deco wedding-cake penthouse & chamfered crown pavilion (NO pool!)
        const t1W = w * 0.72;
        const t1D = d * 0.72;
        const t1H = Math.max(3.6, spec.height * 0.12);
        const tier1 = new THREE.Mesh(chamferedBlockGeo, artDecoCreamMat);
        tier1.scale.set(t1W, t1H, t1D);
        tier1.position.set(0, deckTopY, 0);
        tier1.castShadow = true;
        tier1.receiveShadow = true;
        group.add(tier1);

        // Accent cornice collar + glowing horizontal crown ring
        pushInst(accentTrimEntries, spec.x, deckTopY + t1H + 0.18, spec.z, t1W + 0.45, 0.38, t1D + 0.45, profile.accentTint);
        pushInst(neonList, spec.x, deckTopY + t1H - 0.24, spec.z + t1D * 0.5 + 0.1, t1W * 0.84, 0.2, 0.14, 0xffffff);
        pushInst(neonList, spec.x, deckTopY + t1H - 0.24, spec.z - t1D * 0.5 - 0.1, t1W * 0.84, 0.2, 0.14, 0xffffff);
        pushInst(neonList, spec.x + t1W * 0.5 + 0.1, deckTopY + t1H - 0.24, spec.z, 0.14, 0.2, t1D * 0.84, 0xffffff);
        pushInst(neonList, spec.x - t1W * 0.5 - 0.1, deckTopY + t1H - 0.24, spec.z, 0.14, 0.2, t1D * 0.84, 0xffffff);

        // Upper cupola lantern & Art Deco spire finial
        const t2W = t1W * 0.58;
        const t2D = t1D * 0.58;
        const t2H = 2.6;
        const tier2 = new THREE.Mesh(chamferedBlockGeo, artDecoCreamMat);
        tier2.scale.set(t2W, t2H, t2D);
        tier2.position.set(0, deckTopY + t1H + 0.36, 0);
        tier2.castShadow = true;
        group.add(tier2);

        // Louvered dark metal band on upper crown mechanical core
        pushInst(metalRailEntries, spec.x, deckTopY + t1H + 0.36 + t2H * 0.52, spec.z, t2W + 0.14, 1.05, t2D + 0.14, profile.metalTint);

        // Sleek Art Deco coastal spire finial
        const finialH = spec.height > 35 ? 6.2 : 4.2;
        const finialBaseY = deckTopY + t1H + 0.36 + t2H;
        pushInst(columnEntries, spec.x, finialBaseY + finialH * 0.5, spec.z, 0.24, finialH, 0.24, profile.metalTint);
        pinnacleY = Math.max(pinnacleY, finialBaseY + finialH);
        break;
      }

      case 'pergola_sun_deck': {
        addRoofGlassRailing();
        addCornerPlanters();
        // Twin shaded rooftop timber pergolas + subtle mechanical bulkhead
        addRoofPergola(spec.x - w * 0.16, spec.z, Math.min(w * 0.38, 5.2), Math.min(d * 0.5, 6.2), 2.75);
        const hvac = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        hvac.scale.set(w * 0.26, 1.7, d * 0.32);
        hvac.position.set(w * 0.24, deckTopY + 0.85, -d * 0.12);
        hvac.castShadow = true;
        group.add(hvac);
        pushInst(metalRailEntries, spec.x + w * 0.24, deckTopY + 1.0, spec.z - d * 0.12, w * 0.27, 0.85, d * 0.33, profile.metalTint);
        pinnacleY = Math.max(pinnacleY, deckTopY + 2.8);
        break;
      }

      case 'cafe_terrace': {
        addRoofGlassRailing();
        addCornerPlanters();
        // Breezy rooftop terrace pergola + accent canopy trim + compact service bulkhead
        addRoofPergola(spec.x + w * 0.08, spec.z, Math.min(w * 0.5, 7.2), Math.min(d * 0.46, 5.4), 2.6);
        const hvac = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        hvac.scale.set(w * 0.22, 1.35, d * 0.24);
        hvac.position.set(-w * 0.28, deckTopY + 0.675, -d * 0.2);
        group.add(hvac);
        break;
      }

      case 'sky_lounge_hvac':
      default: {
        // Modern coastal resort cantilevered roof overhang + screened mechanical penthouse + sky pergola
        const pentW = w * 0.56;
        const pentD = d * 0.42;
        const pentH = 3.1;
        const pent = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        pent.scale.set(pentW, pentH, pentD);
        pent.position.set(0, deckTopY + pentH * 0.5, -d * 0.16);
        pent.castShadow = true;
        group.add(pent);

        // Cantilevered white modern sun-canopy roof slab overhanging the mechanical penthouse
        pushInst(stuccoTrimEntries, spec.x, deckTopY + pentH + 0.22, spec.z - d * 0.14, pentW + 2.2, 0.44, pentD + 2.2, profile.trimTint);
        // Glass safety railing & breezy sky-terrace pergola on the southern half of the roof
        addRoofGlassRailing();
        addRoofPergola(spec.x, spec.z + d * 0.24, w * 0.62, d * 0.26, 2.7);
        pinnacleY = Math.max(pinnacleY, deckTopY + pentH + 0.44);
        break;
      }
    }

    return pinnacleY;
  };

  let rooftopPoolCount = 0;
  let totalBalconyUnits = 0;
  let hotelMaterialCount = 0;
  const archetypesUsed: HotelArchetype[] = [];
  const hotels: HotelPlacementSummary[] = [];

  for (const spec of hotelSpecs) {
    const profile = resolveOceanDriveHotelProfile(spec);
    archetypesUsed.push(profile.archetype);
    if (profile.hasRooftopPool) rooftopPoolCount++;

    const group = new THREE.Group();
    group.name = `ocean_drive_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);

    // Per-hotel pastel stucco + reflective recessed glass PBR material
    // Uses hotelRoughness (~0.88 matte stucco vs ~0.11 glossy windows) & hotelGlassMask so only windows reflect/glow
    const facadeMat = new THREE.MeshPhysicalMaterial({
      color: spec.baseColor,
      map: textures.hotelMap,
      emissive: 0xffd088,
      emissiveMap: textures.hotelEmissive,
      emissiveIntensity: 0.18,
      roughness: 1.0,
      roughnessMap: textures.hotelRoughness,
      metalness: 0.06,
      clearcoat: 0.92,
      clearcoatMap: textures.hotelGlassMask,
      clearcoatRoughness: 0.08,
      ior: 1.5,
      reflectivity: 0.9,
      envMapIntensity: 1.18,
    });
    emissiveBuildingMaterials.push(facadeMat);
    disposables.push(facadeMat);
    hotelMaterialCount++;

    // 1. Ground-floor Resort Entrance Lobby & Portico
    addResortEntrance(group, spec, profile);

    // 2. Main Guest-Room Massing (slightly recessed inside corners so rounded/chamfered piers & pilasters sit proud)
    const mainBottom = profile.podiumHeight;
    const mainH = spec.height - mainBottom;
    const recess = profile.cornerStyle === 'rounded' ? 0.22 : 0.18;
    const bodyW = spec.width - recess * 2;
    const bodyD = spec.depth - recess * 2;

    const mainBody = new THREE.Mesh(unitBoxGeo, facadeMat);
    mainBody.scale.set(bodyW, mainH, bodyD);
    mainBody.position.y = mainBottom + mainH * 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);
    environmentMeshesForCamera.push(mainBody);

    // 3. Signature Miami Art Deco Corner Treatments (Rounded Streamline Moderne, Chamfered, or Fluted Pilasters)
    if (profile.cornerStyle === 'rounded') {
      const cornerR = Math.min(1.45, Math.min(spec.width, spec.depth) * 0.1);
      // 4 smooth quarter-round Streamline Moderne corner turrets
      const cornerConfigs: Array<[number, number, number]> = [
        [spec.width * 0.5 - cornerR, spec.depth * 0.5 - cornerR, 0],
        [-spec.width * 0.5 + cornerR, spec.depth * 0.5 - cornerR, -Math.PI / 2],
        [-spec.width * 0.5 + cornerR, -spec.depth * 0.5 + cornerR, Math.PI],
        [spec.width * 0.5 - cornerR, -spec.depth * 0.5 + cornerR, Math.PI / 2],
      ];
      for (const [cx, cz, ry] of cornerConfigs) {
        const cornerMesh = new THREE.Mesh(roundedCornerGeo, artDecoCreamMat);
        cornerMesh.scale.set(cornerR, mainH + 0.3, cornerR);
        cornerMesh.rotation.y = ry;
        cornerMesh.position.set(cx, mainBottom, cz);
        cornerMesh.castShadow = true;
        cornerMesh.receiveShadow = true;
        group.add(cornerMesh);
      }
    } else if (profile.cornerStyle === 'chamfered') {
      // Sculpted chamfered corner piers rising proud past the parapet as Art Deco corner finials
      const pierSize = Math.min(1.55, Math.min(spec.width, spec.depth) * 0.12);
      const pierH = mainH + 1.1;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const pier = new THREE.Mesh(chamferedBlockGeo, artDecoCreamMat);
          pier.scale.set(pierSize, pierH, pierSize);
          pier.position.set(
            sx * (spec.width * 0.5 - pierSize * 0.44),
            mainBottom,
            sz * (spec.depth * 0.5 - pierSize * 0.44),
          );
          pier.castShadow = true;
          group.add(pier);
        }
      }
    } else {
      // Crisp white vertical fluted corner pilasters
      const pierSize = 0.85;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pushInst(
            stuccoTrimEntries,
            spec.x + sx * (spec.width * 0.5 - pierSize * 0.45),
            mainBottom + mainH * 0.5,
            spec.z + sz * (spec.depth * 0.5 - pierSize * 0.45),
            pierSize,
            mainH + 0.35,
            pierSize,
            profile.trimTint,
          );
        }
      }
    }

    // 4. Vertical Art Deco Architectural Fins & Pilasters (locked to 6-column hotelMap grid: c/6 - 0.5)
    // Never bisect window panes!
    const finIndices =
      profile.archetype === 'art_deco_boutique' || profile.archetype === 'grand_deco_tower'
        ? [2, 3, 4] // Signature Miami triple central vertical fluted fins
        : profile.archetype === 'tropical_veranda_hotel'
          ? [1, 3, 5] // Rhythmic MiMo brise-soleil vertical screen fins
          : [2, 4]; // Clean twin structural bay piers

    for (const c of finIndices) {
      const t = c / 6 - 0.5;
      const isCenterFin = c === 3;
      const finW = isCenterFin ? 0.42 : 0.24;
      const finProj = isCenterFin ? 0.56 : 0.34;
      const finExtraH = isCenterFin && profile.hasSteppedPediment ? 1.55 : 0.25;
      const finH = mainH + finExtraH;
      const finY = mainBottom + finH * 0.5;
      const finCol = isCenterFin ? profile.accentTint : profile.trimTint;
      const finList = isCenterFin ? accentTrimEntries : stuccoTrimEntries;

      // Place vertical fins along X faces (Z offset = t * bodyD) & Z faces (X offset = t * bodyW)
      const ox = t * bodyW;
      const oz = t * bodyD;
      pushInst(finList, spec.x + ox, finY, spec.z + bodyD * 0.5 + finProj * 0.35, finW, finH, finProj, finCol);
      pushInst(finList, spec.x + ox, finY, spec.z - bodyD * 0.5 - finProj * 0.35, finW, finH, finProj, finCol);
      pushInst(finList, spec.x + bodyW * 0.5 + finProj * 0.35, finY, spec.z + oz, finProj, finH, finW, finCol);
      pushInst(finList, spec.x - bodyW * 0.5 - finProj * 0.35, finY, spec.z + oz, finProj, finH, finW, finCol);
    }

    // 5. Horizontal Floor Divisions, Miami Eyebrow Sunshades & Balconies (strictly locked to 8-row hotelMap grid!)
    const rowStep = mainH >= 24 ? 1 : 2;
    const floorRows: number[] = [];
    for (let r = rowStep; r < 8; r += rowStep) {
      floorRows.push(r);
    }

    // Horizontal wrap-around Art Deco eyebrow bands / floor stringcourses at every aligned floor line
    const eyebrowProj = profile.archetype === 'coastal_cafe_boutique' ? 0.38 : 0.28;
    for (const r of floorRows) {
      const fy = mainBottom + (r / 8) * mainH;
      pushInst(stuccoTrimEntries, spec.x, fy, spec.z + bodyD * 0.5 + eyebrowProj * 0.35, bodyW + eyebrowProj * 1.4, 0.22, eyebrowProj, profile.trimTint);
      pushInst(stuccoTrimEntries, spec.x, fy, spec.z - bodyD * 0.5 - eyebrowProj * 0.35, bodyW + eyebrowProj * 1.4, 0.22, eyebrowProj, profile.trimTint);
      pushInst(stuccoTrimEntries, spec.x + bodyW * 0.5 + eyebrowProj * 0.35, fy, spec.z, eyebrowProj, 0.22, bodyD + eyebrowProj * 1.4, profile.trimTint);
      pushInst(stuccoTrimEntries, spec.x - bodyW * 0.5 - eyebrowProj * 0.35, fy, spec.z, eyebrowProj, 0.22, bodyD + eyebrowProj * 1.4, profile.trimTint);
    }

    // Streamline Moderne horizontal decorative "speed-lines" near top cornice
    for (let s = 0; s < 2; s++) {
      const sy = spec.height - 0.55 - s * 0.38;
      const list = s === 0 ? accentTrimEntries : stuccoTrimEntries;
      const col = s === 0 ? profile.accentTint : profile.trimTint;
      pushInst(list, spec.x, sy, spec.z + spec.depth * 0.5 + 0.08, spec.width + 0.38, 0.16, 0.24, col);
      pushInst(list, spec.x, sy, spec.z - spec.depth * 0.5 - 0.08, spec.width + 0.38, 0.16, 0.24, col);
      pushInst(list, spec.x + spec.width * 0.5 + 0.08, sy, spec.z, 0.24, 0.16, spec.depth + 0.38, col);
      pushInst(list, spec.x - spec.width * 0.5 - 0.08, sy, spec.z, 0.24, 0.16, spec.depth + 0.38, col);
    }

    // 6. Archetype-Specific Projecting Balconies (varied across facades & floors, zero window bisecting!)
    let hotelBalconies = 0;
    const balconyFaces: FrontageAxis[] =
      profile.frontage === '+x'
        ? ['+x', spec.z >= 0 ? '+z' : '-z']
        : profile.frontage === '-x'
          ? ['-x', '+x']
          : [profile.frontage, '+x'];

    for (let fi = 0; fi < floorRows.length; fi++) {
      const r = floorRows[fi];
      const fy = mainBottom + (r / 8) * mainH;

      for (const face of balconyFaces) {
        const isX = face === '+x' || face === '-x';
        const sign = face === '+x' || face === '+z' ? 1 : -1;
        const wallSpan = isX ? bodyD : bodyW;
        const wallFacePos = (isX ? bodyW : bodyD) * 0.5;
        const bayW = wallSpan / 6;

        const placeOnFace = (
          centerOffset: number,
          span: number,
          opts?: { curved?: boolean; addPrivacyDividers?: boolean; accentFascia?: boolean },
        ) => {
          const wx = isX ? spec.x + sign * wallFacePos : spec.x + centerOffset;
          const wz = isX ? spec.z + centerOffset : spec.z + sign * wallFacePos;
          addBalconyUnit(face, wx, wz, fy, span, profile.balconyDepth, profile, opts);
          hotelBalconies++;
        };

        switch (profile.balconyPattern) {
          case 'curved_center_wings':
            // Flanking curved Streamline Moderne balconies left & right of central Art Deco fins
            placeOnFace(-bayW * 1.85, bayW * 1.85, { curved: true, accentFascia: fi === 0 });
            placeOnFace(bayW * 1.85, bayW * 1.85, { curved: true, accentFascia: fi === 0 });
            break;

          case 'corner_paired_glass':
            // Symmetrical twin glass balconies framing the central grand vertical tower shaft
            placeOnFace(-bayW * 1.65, bayW * 1.7, { accentFascia: fi % 2 === 0 });
            placeOnFace(bayW * 1.65, bayW * 1.7, { accentFascia: fi % 2 === 0 });
            break;

          case 'wrap_around_glass':
            // Expansive modern coastal resort continuous glass-railed balconies spanning full bays
            placeOnFace(0, wallSpan * 0.84, { accentFascia: fi % 2 === 1 });
            // Suite glass divider mullions aligned to grid piers
            for (const c of [2, 4]) {
              const off = (c / 6 - 0.5) * wallSpan;
              const dx = isX ? spec.x + sign * (wallFacePos + profile.balconyDepth * 0.45) : spec.x + off;
              const dz = isX ? spec.z + off : spec.z + sign * (wallFacePos + profile.balconyDepth * 0.45);
              pushInst(
                stuccoTrimEntries,
                dx,
                fy + 0.9,
                dz,
                isX ? profile.balconyDepth * 0.85 : 0.16,
                1.65,
                isX ? 0.16 : profile.balconyDepth * 0.85,
                profile.trimTint,
              );
            }
            break;

          case 'checkerboard_veranda':
            // Authentic MiMo alternating checkerboard projecting suite verandas with stucco privacy walls
            if (fi % 2 === 0) {
              placeOnFace(-bayW * 1.75, bayW * 1.8, { addPrivacyDividers: true, accentFascia: true });
              placeOnFace(bayW * 1.75, bayW * 1.8, { addPrivacyDividers: true, accentFascia: true });
            } else {
              placeOnFace(0, bayW * 2.1, { addPrivacyDividers: true, accentFascia: true });
            }
            break;

          case 'juliet_cafe_metal':
            // Charming coastal boutique balconies over ground-floor waterfront cafe
            placeOnFace(-bayW * 1.5, bayW * 1.85, { curved: true });
            placeOnFace(bayW * 1.5, bayW * 1.85, { curved: true });
            break;

          case 'staggered_bronze_glass':
            // Upscale South Beach boutique staggered bronze-and-glass balconies
            if (fi % 2 === 0) {
              placeOnFace(-bayW * 1.0, bayW * 2.4, { accentFascia: true });
            } else {
              placeOnFace(bayW * 1.0, bayW * 2.4, { accentFascia: true });
            }
            break;
        }
      }
    }

    totalBalconyUnits += hotelBalconies;

    // 7. Rooftop Resort Features (Pools, Pergolas, Stepped Art Deco Crowns, Roof Cafes, HVAC)
    const pinnacleY = addResortRooftop(group, spec, profile, spec.height);

    hotels.push({
      id: spec.id,
      archetype: profile.archetype,
      rooftopKind: profile.rooftopKind,
      hasRooftopPool: profile.hasRooftopPool,
      roofBaseY: spec.height,
      pinnacleY,
      balconyCount: hotelBalconies,
      frontage: profile.frontage,
    });

    root.add(group);
  }

  // Finalize all batched InstancedMeshes with safe bounding spheres and full GPU disposal
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
  instancedBatches += buildInstancedBatch('ocean_drive_stucco_trim_inst', unitBoxGeo, stuccoTrimMat, stuccoTrimEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_curved_balconies_inst', curvedBalconyGeo, stuccoTrimMat, curvedBalconyEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_accent_trim_inst', unitBoxGeo, pastelAccentMat, accentTrimEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_metal_rails_inst', unitBoxGeo, balconyMetalMat, metalRailEntries, false, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_glass_panels_inst', unitBoxGeo, glassRailingMat, glassPanelEntries, false, false, false);
  instancedBatches += buildInstancedBatch('ocean_drive_columns_inst', unitCylGeo, stuccoTrimMat, columnEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_pergola_wood_inst', unitBoxGeo, pergolaWoodMat, pergolaWoodEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_foliage_inst', foliageGeo, roofFoliageMat, foliageEntries, true, true, true);
  instancedBatches += buildInstancedBatch('ocean_drive_warm_lights_inst', unitBoxGeo, warmEntranceLightMat, warmLightEntries, false, false, false);
  instancedBatches += buildInstancedBatch('ocean_drive_neon_pink_inst', unitBoxGeo, neonPinkMat, neonEntries.pink, false, false, false);
  instancedBatches += buildInstancedBatch('ocean_drive_neon_teal_inst', unitBoxGeo, neonTealMat, neonEntries.teal, false, false, false);
  instancedBatches += buildInstancedBatch('ocean_drive_neon_cyan_inst', unitBoxGeo, neonCyanMat, neonEntries.cyan, false, false, false);
  instancedBatches += buildInstancedBatch('ocean_drive_neon_amber_inst', unitBoxGeo, neonAmberMat, neonEntries.amber, false, false, false);

  const totalFacadeInstances =
    stuccoTrimEntries.length +
    curvedBalconyEntries.length +
    accentTrimEntries.length +
    metalRailEntries.length +
    glassPanelEntries.length +
    columnEntries.length +
    pergolaWoodEntries.length +
    foliageEntries.length +
    warmLightEntries.length +
    neonEntries.pink.length +
    neonEntries.teal.length +
    neonEntries.cyan.length +
    neonEntries.amber.length;

  return {
    hotelCount: hotelSpecs.length,
    rooftopPoolCount,
    totalBalconyUnits,
    instancedBatches,
    totalFacadeInstances,
    sharedMaterialCount: sharedMaterials.length,
    hotelMaterialCount,
    archetypesUsed,
    hotels,
  };
}
