import * as THREE from 'three';
import { BuildingSpec } from './cityData';
import { ProceduralTextureSet } from './textures';

export type SkyscraperArchetype =
  | 'setback_corporate'
  | 'sloped_modernist'
  | 'exoskeleton_twin'
  | 'chamfered_midrise'
  | 'slab_asymmetrical'
  | 'terraced_plaza'
  | 'vice_tower_art_deco';

export interface DowntownTowerProfile {
  archetype: SkyscraperArchetype;
  podiumHeight: number;
  floorHeight: number;
  baySpacing: number;
  mullionDepth: number;
  spandrelDepth: number;
  cornerPierSize: number;
  setbackRatios: number[];
  crownKind:
    | 'art_deco_spire'
    | 'mechanical_twins'
    | 'sloped_glass_wedge'
    | 'open_pergola'
    | 'parapet_helipad'
    | 'asymmetric_fin'
    | 'stepped_louver';
  mullionTint: number;
  spandrelTint: number;
  columnTint: number;
  trimTint: number;
  hasMidMechanicalBand: boolean;
  hasCrownAccentLight: boolean;
}

export interface DowntownArchitectureStats {
  skyscraperCount: number;
  landmarkCount: number;
  instancedBatches: number;
  totalFacadeInstances: number;
  sharedMaterialCount: number;
  towerMaterialCount: number;
  archetypesUsed: SkyscraperArchetype[];
  viceTowerPinnacleHeight: number;
}

export interface DowntownArchitectureContext {
  root: THREE.Group;
  textures: ProceduralTextureSet;
  lobbyGlassMat: THREE.MeshPhysicalMaterial;
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
 * Pure deterministic mapping from a Downtown BuildingSpec to its architectural archetype and facade proportions.
 * Keeps every Downtown skyscraper visually distinct while strictly preserving its footprint and height identity.
 */
export function resolveDowntownTowerProfile(spec: BuildingSpec): DowntownTowerProfile {
  if (spec.style === 'landmark' || spec.id === 'vice_tower_landmark') {
    return {
      archetype: 'vice_tower_art_deco',
      podiumHeight: 7.4,
      floorHeight: 3.8,
      baySpacing: 2.35,
      mullionDepth: 0.2,
      spandrelDepth: 0.26,
      cornerPierSize: 1.55,
      setbackRatios: [0.76, 0.56],
      crownKind: 'art_deco_spire',
      mullionTint: 0xd6dee8,
      spandrelTint: 0xd9d2c4,
      columnTint: 0xe2dacb,
      trimTint: 0x2a3648,
      hasMidMechanicalBand: true,
      hasCrownAccentLight: true,
    };
  }

  switch (spec.id) {
    case 'dt_core_1':
      return {
        archetype: 'setback_corporate',
        podiumHeight: 5.4,
        floorHeight: 3.7,
        baySpacing: 2.4,
        mullionDepth: 0.18,
        spandrelDepth: 0.24,
        cornerPierSize: 1.25,
        setbackRatios: [0.84, 0.64],
        crownKind: 'mechanical_twins',
        mullionTint: 0xdce4ee,
        spandrelTint: 0xe6d9c5,
        columnTint: 0xd5cbb8,
        trimTint: 0x2b3646,
        hasMidMechanicalBand: false,
        hasCrownAccentLight: false,
      };
    case 'dt_north_east':
      return {
        archetype: 'sloped_modernist',
        podiumHeight: 4.8,
        floorHeight: 3.6,
        baySpacing: 2.1,
        mullionDepth: 0.22,
        spandrelDepth: 0.16,
        cornerPierSize: 0.92,
        setbackRatios: [0.82],
        crownKind: 'sloped_glass_wedge',
        mullionTint: 0xd4b073,
        spandrelTint: 0x3b4d63,
        columnTint: 0x2a3a4d,
        trimTint: 0x1f2b3a,
        hasMidMechanicalBand: true,
        hasCrownAccentLight: true,
      };
    case 'dt_core_2':
      return {
        archetype: 'exoskeleton_twin',
        podiumHeight: 4.8,
        floorHeight: 3.8,
        baySpacing: 2.3,
        mullionDepth: 0.16,
        spandrelDepth: 0.22,
        cornerPierSize: 1.32,
        setbackRatios: [0.86],
        crownKind: 'open_pergola',
        mullionTint: 0xe2e8f0,
        spandrelTint: 0xcbd5e1,
        columnTint: 0xdbe4ee,
        trimTint: 0x334155,
        hasMidMechanicalBand: true,
        hasCrownAccentLight: true,
      };
    case 'dt_north_west':
      return {
        archetype: 'chamfered_midrise',
        podiumHeight: 4.5,
        floorHeight: 3.6,
        baySpacing: 2.15,
        mullionDepth: 0.17,
        spandrelDepth: 0.22,
        cornerPierSize: 1.05,
        setbackRatios: [0.78],
        crownKind: 'parapet_helipad',
        mullionTint: 0xe5ecf4,
        spandrelTint: 0xd5dce3,
        columnTint: 0xc9d2dc,
        trimTint: 0x384659,
        hasMidMechanicalBand: false,
        hasCrownAccentLight: false,
      };
    case 'north_tower_1':
      return {
        archetype: 'slab_asymmetrical',
        podiumHeight: 5.0,
        floorHeight: 3.8,
        baySpacing: 2.5,
        mullionDepth: 0.15,
        spandrelDepth: 0.3,
        cornerPierSize: 1.18,
        setbackRatios: [0.76],
        crownKind: 'asymmetric_fin',
        mullionTint: 0xd2dde8,
        spandrelTint: 0xd8dee6,
        columnTint: 0xbac6d4,
        trimTint: 0x263242,
        hasMidMechanicalBand: true,
        hasCrownAccentLight: false,
      };
    case 'north_tower_2':
    default:
      return {
        archetype: 'terraced_plaza',
        podiumHeight: 4.6,
        floorHeight: 3.6,
        baySpacing: 2.35,
        mullionDepth: 0.18,
        spandrelDepth: 0.24,
        cornerPierSize: 1.12,
        setbackRatios: [0.8, 0.62],
        crownKind: 'stepped_louver',
        mullionTint: 0xdcc59e,
        spandrelTint: 0xd9cfc0,
        columnTint: 0xc8beb0,
        trimTint: 0x2c3645,
        hasMidMechanicalBand: false,
        hasCrownAccentLight: false,
      };
  }
}

/**
 * Builds a clean outward-normal sloped architectural crown wedge centered in XZ [-0.5..0.5], Y [0..1].
 * Slopes upward from -Z (low edge at y=0.18) to +Z (high ridge at y=1.0).
 */
export function createSlopedCrownGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 1.0);
  shape.lineTo(-0.5, 0.22);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  // ExtrudeGeometry extrudes along +Z; rotate so the slope runs along Z and width along X, centered at origin in XZ
  geo.translate(0, 0, -0.5);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds a tapered Art Deco stepped vertical fin geometry centered at origin in XZ, Y [0..1].
 */
export function createArtDecoFinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 0.78);
  shape.lineTo(0.24, 0.9);
  shape.lineTo(0.24, 1.0);
  shape.lineTo(-0.24, 1.0);
  shape.lineTo(-0.24, 0.9);
  shape.lineTo(-0.5, 0.78);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.5);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds all Downtown skyscrapers and the iconic 66m Vice Tower using shared PBR materials,
 * custom architectural crown/fin geometry, and city-wide InstancedMesh facade batches.
 */
export function buildDowntownArchitecture(
  downtownSpecs: BuildingSpec[],
  ctx: DowntownArchitectureContext,
): DowntownArchitectureStats {
  const {
    root,
    textures,
    lobbyGlassMat,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    environmentMeshesForCamera,
    disposables,
  } = ctx;

  // Shared procedural geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const octaPrismGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  octaPrismGeo.rotateY(Math.PI / 8);
  const slopedCrownGeo = createSlopedCrownGeometry();
  const artDecoFinGeo = createArtDecoFinGeometry();
  disposables.push(unitBoxGeo, unitCylGeo, octaPrismGeo, slopedCrownGeo, artDecoFinGeo);

  // Shared architectural material pool (per-instance color tints provide natural tower variation)
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.76,
    envMapIntensity: 1.25,
  });
  const spandrelInstMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.06,
    envMapIntensity: 0.7,
  });
  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xe3dccf,
    roughness: 0.82,
    metalness: 0.06,
    envMapIntensity: 0.72,
  });
  const graniteColumnMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.16,
    envMapIntensity: 0.92,
  });
  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.78,
    envMapIntensity: 1.18,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a854,
    roughness: 0.24,
    metalness: 0.88,
    envMapIntensity: 1.38,
  });
  const roofConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x677483,
    roughness: 0.88,
    metalness: 0.05,
    envMapIntensity: 0.55,
  });
  const darkPlinthMat = new THREE.MeshStandardMaterial({
    color: 0x232c38,
    roughness: 0.44,
    metalness: 0.2,
    envMapIntensity: 0.95,
  });
  // Tasteful architectural crown/fin lighting — modulated by timeAndWeather via neonTrimMaterials
  // Stays subdued (0.55, well under selective bloom threshold ~1.10) by day, glows crisply at night
  const cyanAccentLightMat = new THREE.MeshStandardMaterial({
    color: 0x8be2ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.15,
  });
  const warmAmberLightMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a3,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.15,
  });
  const aviationBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xef4444,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  neonTrimMaterials.push(cyanAccentLightMat, warmAmberLightMat, aviationBeaconMat);
  const sharedMaterials = [
    aluminumMat,
    spandrelInstMat,
    limestoneMat,
    graniteColumnMat,
    darkBronzeMat,
    champagneGoldMat,
    roofConcreteMat,
    darkPlinthMat,
    cyanAccentLightMat,
    warmAmberLightMat,
    aviationBeaconMat,
  ];
  disposables.push(...sharedMaterials);

  // City-wide InstancedMesh collectors for repeated architectural facade elements
  const mullionEntries: InstanceEntry[] = [];
  const spandrelEntries: InstanceEntry[] = [];
  const columnEntries: InstanceEntry[] = [];
  const trimEntries: InstanceEntry[] = [];
  const goldEntries: InstanceEntry[] = [];
  const cyanLightEntries: InstanceEntry[] = [];
  const amberLightEntries: InstanceEntry[] = [];
  const cylinderTrimEntries: InstanceEntry[] = [];

  const dummy = new THREE.Object3D();
  const pushBox = (
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
   * Adds 3D structural curtain-wall relief (recessed glass core framed by protruding corner columns,
   * vertical mullions, and horizontal floor spandrels) for a single rectangular tower shaft tier.
   */
  const addCurtainWallTier = (
    parentGroup: THREE.Group,
    cx: number,
    cz: number,
    yBottom: number,
    tierH: number,
    w: number,
    d: number,
    glassMat: THREE.MeshPhysicalMaterial,
    profile: DowntownTowerProfile,
    options?: {
      omitCornerPiers?: boolean;
      extraCentralSpine?: boolean;
      recessMargin?: number;
      spandrelEveryN?: number;
      mullionColor?: number;
      spandrelColor?: number;
      columnColor?: number;
    },
  ) => {
    const recess = options?.recessMargin ?? 0.24;
    const glassW = Math.max(1.5, w - recess * 2);
    const glassD = Math.max(1.5, d - recess * 2);

    // Recessed curtain-wall glass core
    const coreMesh = new THREE.Mesh(unitBoxGeo, glassMat);
    coreMesh.scale.set(glassW, tierH, glassD);
    coreMesh.position.set(cx - parentGroup.position.x, yBottom + tierH / 2, cz - parentGroup.position.z);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    parentGroup.add(coreMesh);
    environmentMeshesForCamera.push(coreMesh);

    const mullionCol = options?.mullionColor ?? profile.mullionTint;
    const spandrelCol = options?.spandrelColor ?? profile.spandrelTint;
    const columnCol = options?.columnColor ?? profile.columnTint;

    // 4 Architectural corner columns framing the recessed curtain wall
    const pier = Math.min(profile.cornerPierSize, Math.min(w, d) * 0.16);
    if (!options?.omitCornerPiers) {
      const halfX = w / 2 - pier * 0.46;
      const halfZ = d / 2 - pier * 0.46;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pushBox(
            columnEntries,
            cx + sx * halfX,
            yBottom + tierH / 2,
            cz + sz * halfZ,
            pier,
            tierH + 0.08,
            pier,
            columnCol,
          );
        }
      }
    }

    // Optional central structural exoskeleton spine
    if (options?.extraCentralSpine) {
      const spineW = pier * 0.9;
      pushBox(columnEntries, cx, yBottom + tierH / 2, cz + d / 2 - spineW * 0.35, spineW, tierH, spineW * 0.72, columnCol);
      pushBox(columnEntries, cx, yBottom + tierH / 2, cz - d / 2 + spineW * 0.35, spineW, tierH, spineW * 0.72, columnCol);
      pushBox(columnEntries, cx + w / 2 - spineW * 0.35, yBottom + tierH / 2, cz, spineW * 0.72, tierH, spineW, columnCol);
      pushBox(columnEntries, cx - w / 2 + spineW * 0.35, yBottom + tierH / 2, cz, spineW * 0.72, tierH, spineW, columnCol);
    }

    // Vertical curtain-wall mullions locked to the 8-column skyscraper texture grid so 3D bars align cleanly between glass panes
    const baysX = glassW >= 11.5 ? 8 : 4;
    const baysZ = glassD >= 11.5 ? 8 : 4;
    const mullionThick = 0.17;
    const mullionProj = profile.mullionDepth;
    const pierClearX = glassW / 2 - pier * 0.65;
    const pierClearZ = glassD / 2 - pier * 0.65;

    for (let i = 1; i < baysX; i++) {
      const t = i / baysX - 0.5;
      const ox = t * glassW;
      if (!options?.omitCornerPiers && Math.abs(ox) >= pierClearX) continue;
      if (options?.extraCentralSpine && Math.abs(t) < 0.04) continue;
      const mx = cx + ox;
      // North & South facades
      pushBox(
        mullionEntries,
        mx,
        yBottom + tierH / 2,
        cz + glassD / 2 + mullionProj * 0.35,
        mullionThick,
        tierH,
        mullionProj,
        mullionCol,
      );
      pushBox(
        mullionEntries,
        mx,
        yBottom + tierH / 2,
        cz - glassD / 2 - mullionProj * 0.35,
        mullionThick,
        tierH,
        mullionProj,
        mullionCol,
      );
    }
    for (let i = 1; i < baysZ; i++) {
      const t = i / baysZ - 0.5;
      const oz = t * glassD;
      if (!options?.omitCornerPiers && Math.abs(oz) >= pierClearZ) continue;
      if (options?.extraCentralSpine && Math.abs(t) < 0.04) continue;
      const mz = cz + oz;
      // East & West facades
      pushBox(
        mullionEntries,
        cx + glassW / 2 + mullionProj * 0.35,
        yBottom + tierH / 2,
        mz,
        mullionProj,
        tierH,
        mullionThick,
        mullionCol,
      );
      pushBox(
        mullionEntries,
        cx - glassW / 2 - mullionProj * 0.35,
        yBottom + tierH / 2,
        mz,
        mullionProj,
        tierH,
        mullionThick,
        mullionCol,
      );
    }

    // Horizontal floor spandrel bands locked to the 16-row skyscraper texture floor bands so spandrels never bisect windows
    const baseStep = tierH >= 28 ? 1 : tierH >= 14 ? 2 : 4;
    const stepN = Math.min(8, baseStep * (options?.spandrelEveryN ?? 1));
    const spandrelH = Math.min(0.42, (tierH / 16) * 0.28);
    const spandrelW = glassW + profile.spandrelDepth * 1.45;
    const spandrelD = glassD + profile.spandrelDepth * 1.45;

    for (let f = stepN; f < 16; f += stepN) {
      const fy = yBottom + (f / 16) * tierH;
      // Four perimeter spandrel beams projecting proud of recessed glass
      pushBox(spandrelEntries, cx, fy, cz + spandrelD / 2 - 0.14, spandrelW, spandrelH, 0.28, spandrelCol);
      pushBox(spandrelEntries, cx, fy, cz - spandrelD / 2 + 0.14, spandrelW, spandrelH, 0.28, spandrelCol);
      pushBox(spandrelEntries, cx + spandrelW / 2 - 0.14, fy, cz, 0.28, spandrelH, spandrelD - 0.56, spandrelCol);
      pushBox(spandrelEntries, cx - spandrelW / 2 + 0.14, fy, cz, 0.28, spandrelH, spandrelD - 0.56, spandrelCol);
    }

    // Top setback cornice ledge + recessed concrete roof slab
    const corniceH = 0.62;
    const corniceW = w + 0.32;
    const corniceD = d + 0.32;
    pushBox(spandrelEntries, cx, yBottom + tierH + corniceH * 0.35, cz + corniceD / 2 - 0.24, corniceW, corniceH, 0.48, spandrelCol);
    pushBox(spandrelEntries, cx, yBottom + tierH + corniceH * 0.35, cz - corniceD / 2 + 0.24, corniceW, corniceH, 0.48, spandrelCol);
    pushBox(spandrelEntries, cx + corniceW / 2 - 0.24, yBottom + tierH + corniceH * 0.35, cz, 0.48, corniceH, corniceD - 0.96, spandrelCol);
    pushBox(spandrelEntries, cx - corniceW / 2 + 0.24, yBottom + tierH + corniceH * 0.35, cz, 0.48, corniceH, corniceD - 0.96, spandrelCol);

    const roofSlab = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
    roofSlab.scale.set(w - 0.3, 0.28, d - 0.3);
    roofSlab.position.set(cx - parentGroup.position.x, yBottom + tierH + 0.12, cz - parentGroup.position.z);
    roofSlab.receiveShadow = true;
    parentGroup.add(roofSlab);
  };

  /**
   * Builds a rich double-height ground-floor entrance podium with stone plinth, recessed lobby glass,
   * colonnade piers, and street-facing entrance canopies.
   */
  const addEntrancePodium = (
    parentGroup: THREE.Group,
    spec: BuildingSpec,
    profile: DowntownTowerProfile,
    isViceTower: boolean,
  ) => {
    const podiumH = profile.podiumHeight;
    const w = spec.width;
    const d = spec.depth;

    // Ground stone plinth (strictly grounded at y=0, within collider footprint)
    const plinth = new THREE.Mesh(unitBoxGeo, darkPlinthMat);
    plinth.scale.set(w * 0.99, 0.52, d * 0.99);
    plinth.position.y = 0.26;
    plinth.receiveShadow = true;
    parentGroup.add(plinth);

    // Recessed double-height lobby glass enclosure
    const lobbyGlass = new THREE.Mesh(unitBoxGeo, lobbyGlassMat);
    lobbyGlass.scale.set(w - 0.85, podiumH - 0.5, d - 0.85);
    lobbyGlass.position.y = 0.5 + (podiumH - 0.5) / 2;
    lobbyGlass.castShadow = true;
    lobbyGlass.receiveShadow = true;
    parentGroup.add(lobbyGlass);
    environmentMeshesForCamera.push(lobbyGlass);

    // Podium frieze / entablature collar separating lobby from tower shaft
    pushBox(spandrelEntries, spec.x, podiumH - 0.22, spec.z + d / 2 - 0.26, w + 0.18, 0.72, 0.52, profile.spandrelTint);
    pushBox(spandrelEntries, spec.x, podiumH - 0.22, spec.z - d / 2 + 0.26, w + 0.18, 0.72, 0.52, profile.spandrelTint);
    pushBox(spandrelEntries, spec.x + w / 2 - 0.26, podiumH - 0.22, spec.z, 0.52, 0.72, d - 0.86, profile.spandrelTint);
    pushBox(spandrelEntries, spec.x - w / 2 + 0.26, podiumH - 0.22, spec.z, 0.52, 0.72, d - 0.86, profile.spandrelTint);

    // Ground-floor perimeter colonnade piers
    const pierCol = isViceTower ? 0xe4dccb : profile.columnTint;
    const pierSize = isViceTower ? 0.92 : 0.72;
    const colsX = Math.max(3, Math.round(w / 3.6));
    const colsZ = Math.max(3, Math.round(d / 3.6));
    for (let i = 0; i <= colsX; i++) {
      const px = spec.x - (w / 2 - pierSize / 2) + (i / colsX) * (w - pierSize);
      // Skip middle pair on entrance faces to open a grand double-door portal
      const isCenterEntry = Math.abs(px - spec.x) < 1.9;
      if (!isCenterEntry) {
        pushBox(columnEntries, px, podiumH / 2, spec.z + d / 2 - pierSize * 0.48, pierSize, podiumH, pierSize, pierCol);
        pushBox(columnEntries, px, podiumH / 2, spec.z - d / 2 + pierSize * 0.48, pierSize, podiumH, pierSize, pierCol);
      }
    }
    for (let i = 1; i < colsZ; i++) {
      const pz = spec.z - (d / 2 - pierSize / 2) + (i / colsZ) * (d - pierSize);
      const isCenterEntry = Math.abs(pz - spec.z) < 1.8;
      if (!isCenterEntry) {
        pushBox(columnEntries, spec.x + w / 2 - pierSize * 0.48, podiumH / 2, pz, pierSize, podiumH, pierSize, pierCol);
        pushBox(columnEntries, spec.x - w / 2 + pierSize * 0.48, podiumH / 2, pz, pierSize, podiumH, pierSize, pierCol);
      }
    }

    // Lobby glass horizontal transom beam & slim vertical storefront glazing mullions
    const transomY = Math.min(3.3, podiumH * 0.64);
    pushBox(trimEntries, spec.x, transomY, spec.z + d / 2 - 0.36, w - 0.5, 0.16, 0.22, profile.trimTint);
    pushBox(trimEntries, spec.x, transomY, spec.z - d / 2 + 0.36, w - 0.5, 0.16, 0.22, profile.trimTint);
    pushBox(trimEntries, spec.x + w / 2 - 0.36, transomY, spec.z, 0.22, 0.16, d - 0.5, profile.trimTint);
    pushBox(trimEntries, spec.x - w / 2 + 0.36, transomY, spec.z, 0.22, 0.16, d - 0.5, profile.trimTint);

    const lobbyBarsX = Math.max(4, Math.round(w / 2.2));
    const lobbyBarsZ = Math.max(4, Math.round(d / 2.2));
    const lobbyBarH = podiumH - 0.7;
    const lobbyBarY = 0.5 + lobbyBarH / 2;
    for (let i = 1; i < lobbyBarsX; i++) {
      const lx = spec.x - (w - 1.1) / 2 + (i / lobbyBarsX) * (w - 1.1);
      pushBox(trimEntries, lx, lobbyBarY, spec.z + d / 2 - 0.38, 0.11, lobbyBarH, 0.16, profile.trimTint);
      pushBox(trimEntries, lx, lobbyBarY, spec.z - d / 2 + 0.38, 0.11, lobbyBarH, 0.16, profile.trimTint);
    }
    for (let i = 1; i < lobbyBarsZ; i++) {
      const lz = spec.z - (d - 1.1) / 2 + (i / lobbyBarsZ) * (d - 1.1);
      pushBox(trimEntries, spec.x + w / 2 - 0.38, lobbyBarY, lz, 0.16, lobbyBarH, 0.11, profile.trimTint);
      pushBox(trimEntries, spec.x - w / 2 + 0.38, lobbyBarY, lz, 0.16, lobbyBarH, 0.11, profile.trimTint);
    }

    // Street-facing entrance marquee canopy (projects cleanly at y ~ 3.6m, well above pedestrian/player head)
    const canopyY = Math.min(3.9, podiumH * 0.72);
    const canopyW = isViceTower ? 6.8 : Math.min(5.6, w * 0.46);
    const canopyD = isViceTower ? 1.8 : 1.25;
    const portalList = isViceTower ? goldEntries : trimEntries;
    const portalTint = isViceTower ? 0xd9a854 : profile.trimTint;

    // South entrance canopy (faces Downtown core / Vice Tower Plaza)
    pushBox(portalList, spec.x, canopyY, spec.z + d / 2 + canopyD * 0.36, canopyW, 0.26, canopyD, portalTint);
    // Entrance frame jambs
    pushBox(portalList, spec.x - canopyW * 0.42, canopyY / 2, spec.z + d / 2 - 0.22, 0.28, canopyY, 0.36, portalTint);
    pushBox(portalList, spec.x + canopyW * 0.42, canopyY / 2, spec.z + d / 2 - 0.22, 0.28, canopyY, 0.36, portalTint);

    if (isViceTower) {
      // Grand Art Deco stepped entrance portal on BOTH South (Plaza) & North elevations
      pushBox(goldEntries, spec.x, canopyY + 0.32, spec.z + d / 2 + canopyD * 0.28, canopyW * 0.72, 0.36, canopyD * 0.7, 0xd9a854);
      pushBox(amberLightEntries, spec.x, canopyY - 0.14, spec.z + d / 2 + canopyD * 0.34, canopyW * 0.84, 0.08, canopyD * 0.55, 0xffe4a3);

      // Matching secondary portal on North elevation
      pushBox(goldEntries, spec.x, canopyY, spec.z - d / 2 - canopyD * 0.32, canopyW * 0.82, 0.26, canopyD * 0.85, 0xd9a854);
      pushBox(goldEntries, spec.x - canopyW * 0.36, canopyY / 2, spec.z - d / 2 + 0.22, 0.28, canopyY, 0.36, 0xd9a854);
      pushBox(goldEntries, spec.x + canopyW * 0.36, canopyY / 2, spec.z - d / 2 + 0.22, 0.28, canopyY, 0.36, 0xd9a854);
    } else if (spec.hasAwning) {
      // Additional East/West canopy for corner corporate towers with awnings
      pushBox(trimEntries, spec.x + w / 2 + 0.45, canopyY, spec.z, 1.05, 0.24, Math.min(5.2, d * 0.44), profile.trimTint);
    }
  };

  /**
   * Adds the iconic Art Deco architectural treatment exclusively for the 66m Vice Tower Landmark.
   */
  const buildViceTower = (
    spec: BuildingSpec,
    profile: DowntownTowerProfile,
    glassMat: THREE.MeshPhysicalMaterial,
  ): number => {
    const group = new THREE.Group();
    group.name = `downtown_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);

    addEntrancePodium(group, spec, profile, true);

    // Tier 1: Primary Art Deco Shaft (7.4m -> 43.0m)
    const t1Bottom = profile.podiumHeight;
    const t1Height = spec.height * 0.54; // 35.64m -> top at ~43.04m
    addCurtainWallTier(group, spec.x, spec.z, t1Bottom, t1Height, spec.width, spec.depth, glassMat, profile, {
      recessMargin: 0.32,
    });

    // Signature Vice Tower Art Deco stepped corner buttresses & triple central vertical fins on all 4 facades
    const finHeights = [t1Height + 1.8, t1Height + 0.5];
    const finOffsets = [0, 2.35, -2.35];
    for (let fi = 0; fi < finOffsets.length; fi++) {
      const off = finOffsets[fi];
      const isCenter = fi === 0;
      const fh = isCenter ? finHeights[0] : finHeights[1];
      const fw = isCenter ? 0.85 : 0.48;
      const fd = isCenter ? 0.72 : 0.52;

      // North & South vertical Art Deco fins
      const finS = new THREE.Mesh(artDecoFinGeo, limestoneMat);
      finS.scale.set(fw, fh, fd);
      finS.position.set(off, t1Bottom, spec.depth / 2 - 0.12);
      finS.castShadow = true;
      group.add(finS);

      const finN = new THREE.Mesh(artDecoFinGeo, limestoneMat);
      finN.scale.set(fw, fh, fd);
      finN.position.set(off, t1Bottom, -spec.depth / 2 + 0.12);
      finN.castShadow = true;
      group.add(finN);

      // East & West vertical Art Deco fins
      const finE = new THREE.Mesh(artDecoFinGeo, limestoneMat);
      finE.scale.set(fw, fh, fd);
      finE.rotation.y = Math.PI / 2;
      finE.position.set(spec.width / 2 - 0.12, t1Bottom, off);
      finE.castShadow = true;
      group.add(finE);

      const finW = new THREE.Mesh(artDecoFinGeo, limestoneMat);
      finW.scale.set(fw, fh, fd);
      finW.rotation.y = Math.PI / 2;
      finW.position.set(-spec.width / 2 + 0.12, t1Bottom, off);
      finW.castShadow = true;
      group.add(finW);

      // Gold Art Deco crest trim caps on central vertical fins
      if (isCenter) {
        pushBox(goldEntries, spec.x, t1Bottom + fh * 0.5, spec.z + spec.depth / 2 + 0.28, 0.24, fh * 0.96, 0.16, 0xd9a854);
        pushBox(goldEntries, spec.x, t1Bottom + fh * 0.5, spec.z - spec.depth / 2 - 0.28, 0.24, fh * 0.96, 0.16, 0xd9a854);
        pushBox(goldEntries, spec.x + spec.width / 2 + 0.28, t1Bottom + fh * 0.5, spec.z, 0.16, fh * 0.96, 0.24, 0xd9a854);
        pushBox(goldEntries, spec.x - spec.width / 2 - 0.28, t1Bottom + fh * 0.5, spec.z, 0.16, fh * 0.96, 0.24, 0xd9a854);
      }
    }

    // Subtle mid-shaft recessed mechanical louver band at ~27m
    const mechY = t1Bottom + t1Height * 0.55;
    pushBox(trimEntries, spec.x, mechY, spec.z + spec.depth / 2 - 0.2, spec.width - 0.5, 1.3, 0.42, 0x1e293b);
    pushBox(trimEntries, spec.x, mechY, spec.z - spec.depth / 2 + 0.2, spec.width - 0.5, 1.3, 0.42, 0x1e293b);
    pushBox(trimEntries, spec.x + spec.width / 2 - 0.2, mechY, spec.z, 0.42, 1.3, spec.depth - 0.5, 0x1e293b);
    pushBox(trimEntries, spec.x - spec.width / 2 + 0.2, mechY, spec.z, 0.42, 1.3, spec.depth - 0.5, 0x1e293b);

    // Tier 1 top gold Art Deco collar + subtle illuminated cyan terrace uplight
    const t2Bottom = t1Bottom + t1Height;
    pushBox(goldEntries, spec.x, t2Bottom + 0.42, spec.z + spec.depth / 2 + 0.12, spec.width + 0.5, 0.36, 0.34, 0xd9a854);
    pushBox(goldEntries, spec.x, t2Bottom + 0.42, spec.z - spec.depth / 2 - 0.12, spec.width + 0.5, 0.36, 0.34, 0xd9a854);
    pushBox(goldEntries, spec.x + spec.width / 2 + 0.12, t2Bottom + 0.42, spec.z, 0.34, 0.36, spec.depth + 0.5, 0xd9a854);
    pushBox(goldEntries, spec.x - spec.width / 2 - 0.12, t2Bottom + 0.42, spec.z, 0.34, 0.36, spec.depth + 0.5, 0xd9a854);

    // Tier 2: Upper Stepped Executive Shaft (~43m -> ~55.5m)
    const t2W = spec.width * 0.76;
    const t2D = spec.depth * 0.76;
    const t2H = spec.height * 0.19; // ~12.54m
    addCurtainWallTier(group, spec.x, spec.z, t2Bottom + 0.25, t2H, t2W, t2D, glassMat, profile, {
      recessMargin: 0.24,
      columnColor: 0xe6decb,
    });

    // Illuminated cyan horizontal setback strip at top of Tier 2
    const t3Bottom = t2Bottom + 0.25 + t2H;
    pushBox(cyanLightEntries, spec.x, t3Bottom + 0.34, spec.z + t2D / 2 + 0.14, t2W + 0.3, 0.24, 0.18, 0x8be2ff);
    pushBox(cyanLightEntries, spec.x, t3Bottom + 0.34, spec.z - t2D / 2 - 0.14, t2W + 0.3, 0.24, 0.18, 0x8be2ff);
    pushBox(cyanLightEntries, spec.x + t2W / 2 + 0.14, t3Bottom + 0.34, spec.z, 0.18, 0.24, t2D + 0.3, 0x8be2ff);
    pushBox(cyanLightEntries, spec.x - t2W / 2 - 0.14, t3Bottom + 0.34, spec.z, 0.18, 0.24, t2D + 0.3, 0x8be2ff);

    // Tier 3: Art Deco Observatory Gallery (~55.5m -> ~64.5m)
    const t3W = spec.width * 0.54;
    const t3D = spec.depth * 0.54;
    const t3H = spec.height * 0.14; // ~9.24m
    addCurtainWallTier(group, spec.x, spec.z, t3Bottom + 0.25, t3H, t3W, t3D, glassMat, profile, {
      recessMargin: 0.2,
      columnColor: 0xd9a854,
      mullionColor: 0xe9cfa0,
    });

    // Illuminated vertical corner gold-amber light channels on Tier 3 observatory
    const t3MidY = t3Bottom + 0.25 + t3H / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushBox(
          amberLightEntries,
          spec.x + sx * (t3W / 2 + 0.08),
          t3MidY,
          spec.z + sz * (t3D / 2 + 0.08),
          0.22,
          t3H * 0.92,
          0.22,
          0xffe4a3,
        );
      }
    }

    // Tier 4: Faceted Octagonal Art Deco Crown Lantern (~64.8m -> ~73.5m)
    const crownBaseY = t3Bottom + 0.25 + t3H + 0.25;
    const crownLevels: Array<{ diam: number; h: number; glowCyan: boolean }> = [
      { diam: t3W * 0.86, h: 4.4, glowCyan: false },
      { diam: t3W * 0.62, h: 3.2, glowCyan: true },
      { diam: t3W * 0.38, h: 2.1, glowCyan: false },
    ];
    let curY = crownBaseY;
    for (let li = 0; li < crownLevels.length; li++) {
      const lv = crownLevels[li];
      const coreCrown = new THREE.Mesh(octaPrismGeo, li === 1 ? glassMat : limestoneMat);
      coreCrown.scale.set(lv.diam, lv.h, lv.diam);
      coreCrown.position.set(0, curY + lv.h / 2, 0);
      coreCrown.castShadow = true;
      group.add(coreCrown);

      // 8 radial champagne-gold Art Deco ribs around each octagonal crown tier
      const r = lv.diam * 0.5;
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const rx = spec.x + Math.sin(ang) * r;
        const rz = spec.z + Math.cos(ang) * r;
        pushBox(goldEntries, rx, curY + lv.h * 0.54, rz, 0.28, lv.h * 1.08, 0.38, 0xd9a854, ang);
        if (lv.glowCyan && k % 2 === 0) {
          pushBox(
            cyanLightEntries,
            spec.x + Math.sin(ang) * (r + 0.14),
            curY + lv.h * 0.52,
            spec.z + Math.cos(ang) * (r + 0.14),
            0.14,
            lv.h * 0.88,
            0.14,
            0x8be2ff,
            ang,
          );
        }
      }

      // Gold ring collar at top of each crown step
      const collar = new THREE.Mesh(octaPrismGeo, champagneGoldMat);
      collar.scale.set(lv.diam + 0.35, 0.35, lv.diam + 0.35);
      collar.position.set(0, curY + lv.h + 0.14, 0);
      group.add(collar);

      curY += lv.h + 0.25;
    }

    // Telescoping Art Deco Landmark Spire & Aviation Beacon (~74.5m -> ~91m)
    const spireStages: Array<{ rad: number; h: number }> = [
      { rad: 0.72, h: 4.5 },
      { rad: 0.44, h: 5.5 },
      { rad: 0.22, h: 6.2 },
    ];
    for (let si = 0; si < spireStages.length; si++) {
      const st = spireStages[si];
      const stageMesh = new THREE.Mesh(unitCylGeo, si === 0 ? champagneGoldMat : darkBronzeMat);
      stageMesh.scale.set(st.rad, st.h, st.rad);
      stageMesh.position.set(0, curY + st.h / 2, 0);
      group.add(stageMesh);

      // Gold flange collar ring between spire stages
      const flange = new THREE.Mesh(unitCylGeo, champagneGoldMat);
      flange.scale.set(st.rad * 1.85, 0.28, st.rad * 1.85);
      flange.position.set(0, curY + st.h, 0);
      group.add(flange);

      curY += st.h;
    }

    // Aviation warning beacon at spire pinnacle
    const beacon = new THREE.Mesh(unitCylGeo, aviationBeaconMat);
    beacon.scale.set(0.36, 0.52, 0.36);
    beacon.position.set(0, curY + 0.26, 0);
    group.add(beacon);

    root.add(group);
    return curY + 0.52;
  };

  /**
   * Builds a distinct Downtown corporate/modern skyscraper according to its resolved archetype.
   */
  const buildDowntownSkyscraper = (
    spec: BuildingSpec,
    profile: DowntownTowerProfile,
    glassMat: THREE.MeshPhysicalMaterial,
  ) => {
    const group = new THREE.Group();
    group.name = `downtown_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);

    addEntrancePodium(group, spec, profile, false);

    // Split tower vertical massing into primary shaft + distinctive setback tiers
    const usableH = spec.height - profile.podiumHeight;
    const tierCount = 1 + profile.setbackRatios.length;

    let curY = profile.podiumHeight;
    let curW = spec.width;
    let curD = spec.depth;
    let curX = spec.x;
    let curZ = spec.z;

    const mainFrac = tierCount === 3 ? 0.58 : tierCount === 2 ? 0.72 : 1.0;
    const mainH = usableH * mainFrac;

    // Primary shaft
    addCurtainWallTier(group, curX, curZ, curY, mainH, curW, curD, glassMat, profile, {
      extraCentralSpine: profile.archetype === 'exoskeleton_twin',
      spandrelEveryN: profile.archetype === 'sloped_modernist' ? 2 : 1,
    });

    // Optional mid-height dark louvered mechanical floor band (breaks visual monotony on tall towers)
    if (profile.hasMidMechanicalBand && mainH > 18) {
      const bandY = curY + mainH * 0.58;
      pushBox(trimEntries, curX, bandY, curZ + curD / 2 - 0.14, curW - 0.4, 1.35, 0.34, profile.trimTint);
      pushBox(trimEntries, curX, bandY, curZ - curD / 2 + 0.14, curW - 0.4, 1.35, 0.34, profile.trimTint);
      pushBox(trimEntries, curX + curW / 2 - 0.14, bandY, curZ, 0.34, 1.35, curD - 0.4, profile.trimTint);
      pushBox(trimEntries, curX - curW / 2 + 0.14, bandY, curZ, 0.34, 1.35, curD - 0.4, profile.trimTint);
    }

    curY += mainH + 0.25;

    // Upper stepped setback tiers
    const remH = usableH * (1 - mainFrac);
    for (let ti = 0; ti < profile.setbackRatios.length; ti++) {
      const ratio = profile.setbackRatios[ti];
      const nextW = spec.width * ratio;
      const nextD = spec.depth * ratio;
      const tFrac =
        profile.setbackRatios.length === 2 ? (ti === 0 ? 0.58 : 0.42) : 1.0;
      const tierH = Math.max(4.8, remH * tFrac);

      // Asymmetrical offset for slab_asymmetrical & sloped_modernist for varied skyline silhouettes
      if (profile.archetype === 'slab_asymmetrical') {
        curX = spec.x - (spec.width - nextW) * 0.34;
        curZ = spec.z;
      } else if (profile.archetype === 'sloped_modernist') {
        curX = spec.x;
        curZ = spec.z - (spec.depth - nextD) * 0.25;
      } else {
        curX = spec.x;
        curZ = spec.z;
      }

      curW = nextW;
      curD = nextD;

      addCurtainWallTier(group, curX, curZ, curY, tierH, curW, curD, glassMat, profile, {
        extraCentralSpine: profile.archetype === 'exoskeleton_twin',
        recessMargin: 0.2,
      });

      curY += tierH + 0.25;
    }

    // Tasteful subtle crown accent light strip on select modern corporate towers
    if (profile.hasCrownAccentLight) {
      const lightList = profile.archetype === 'sloped_modernist' ? amberLightEntries : cyanLightEntries;
      const lightTint = profile.archetype === 'sloped_modernist' ? 0xffe4a3 : 0x8be2ff;
      pushBox(lightList, curX, curY + 0.12, curZ + curD / 2 + 0.08, curW - 0.4, 0.2, 0.14, lightTint);
      pushBox(lightList, curX, curY + 0.12, curZ - curD / 2 - 0.08, curW - 0.4, 0.2, 0.14, lightTint);
      pushBox(lightList, curX + curW / 2 + 0.08, curY + 0.12, curZ, 0.14, 0.2, curD - 0.4, lightTint);
      pushBox(lightList, curX - curW / 2 - 0.08, curY + 0.12, curZ, 0.14, 0.2, curD - 0.4, lightTint);
    }

    // Distinct Rooftop Crown & Mechanical Structures per Archetype
    const relX = curX - spec.x;
    const relZ = curZ - spec.z;

    switch (profile.crownKind) {
      case 'sloped_glass_wedge': {
        // Dramatic diagonal glass-and-steel crown wedge
        const wedgeH = 6.2;
        const wedge = new THREE.Mesh(slopedCrownGeo, glassMat);
        wedge.scale.set(curW * 0.94, wedgeH, curD * 0.94);
        wedge.position.set(relX, curY, relZ);
        wedge.castShadow = true;
        group.add(wedge);

        // Metallic ridge frame along high edge of wedge
        pushBox(trimEntries, curX, curY + wedgeH, curZ + curD * 0.45, curW * 0.96, 0.38, 0.36, profile.trimTint);
        // Recessed mechanical equipment behind lower edge
        pushBox(trimEntries, curX, curY + 1.1, curZ - curD * 0.22, curW * 0.42, 1.9, curD * 0.32, profile.trimTint);
        break;
      }

      case 'mechanical_twins': {
        // Stepped mechanical penthouse + louvered screen + twin slender comms masts
        const pentW = curW * 0.62;
        const pentD = curD * 0.58;
        const pentH = 3.4;
        const pent = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        pent.scale.set(pentW, pentH, pentD);
        pent.position.set(relX, curY + pentH / 2, relZ);
        pent.castShadow = true;
        group.add(pent);

        // Dark metal louver band wrapping mechanical penthouse
        pushBox(trimEntries, curX, curY + pentH * 0.55, curZ + pentD / 2 + 0.06, pentW + 0.16, 1.5, 0.16, profile.trimTint);
        pushBox(trimEntries, curX, curY + pentH * 0.55, curZ - pentD / 2 - 0.06, pentW + 0.16, 1.5, 0.16, profile.trimTint);
        pushBox(trimEntries, curX + pentW / 2 + 0.06, curY + pentH * 0.55, curZ, 0.16, 1.5, pentD + 0.16, profile.trimTint);
        pushBox(trimEntries, curX - pentW / 2 - 0.06, curY + pentH * 0.55, curZ, 0.16, 1.5, pentD + 0.16, profile.trimTint);

        // Twin rooftop antenna masts
        for (const ox of [-pentW * 0.24, pentW * 0.24]) {
          pushBox(cylinderTrimEntries, curX + ox, curY + pentH + 3.2, curZ, 0.2, 6.4, 0.2, 0xcbd5e1);
        }
        break;
      }

      case 'open_pergola': {
        // Cantilevered architectural roof frame pergola + twin cylindrical HVAC chiller drums
        const frameH = 2.8;
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            pushBox(
              columnEntries,
              curX + sx * (curW * 0.42),
              curY + frameH / 2,
              curZ + sz * (curD * 0.42),
              0.55,
              frameH,
              0.55,
              profile.columnTint,
            );
          }
        }
        // Overhead perimeter frame beams
        pushBox(spandrelEntries, curX, curY + frameH, curZ + curD * 0.42, curW * 0.94, 0.48, 0.55, profile.spandrelTint);
        pushBox(spandrelEntries, curX, curY + frameH, curZ - curD * 0.42, curW * 0.94, 0.48, 0.55, profile.spandrelTint);
        pushBox(spandrelEntries, curX + curW * 0.42, curY + frameH, curZ, 0.55, 0.48, curD * 0.94, profile.spandrelTint);
        pushBox(spandrelEntries, curX - curW * 0.42, curY + frameH, curZ, 0.55, 0.48, curD * 0.94, profile.spandrelTint);

        // Twin cylindrical cooling towers inside pergola
        pushBox(cylinderTrimEntries, curX - curW * 0.16, curY + 1.0, curZ, 1.9, 2.0, 1.9, 0x94a3b8);
        pushBox(cylinderTrimEntries, curX + curW * 0.16, curY + 1.0, curZ, 1.9, 2.0, 1.9, 0x94a3b8);
        break;
      }

      case 'parapet_helipad': {
        // Raised parapet screen + sleek rooftop service core + cylindrical radar/comms mast
        const coreW = curW * 0.44;
        const coreD = curD * 0.42;
        const coreH = 2.4;
        const core = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        core.scale.set(coreW, coreH, coreD);
        core.position.set(relX + curW * 0.12, curY + coreH / 2, relZ - curD * 0.1);
        group.add(core);

        pushBox(trimEntries, curX + curW * 0.12, curY + coreH + 0.16, curZ - curD * 0.1, coreW + 0.2, 0.28, coreD + 0.2, profile.trimTint);
        pushBox(cylinderTrimEntries, curX - curW * 0.2, curY + 0.75, curZ + curD * 0.16, 1.6, 1.5, 1.6, 0x64748b);
        pushBox(cylinderTrimEntries, curX + curW * 0.12, curY + coreH + 2.1, curZ - curD * 0.1, 0.18, 4.2, 0.18, 0xcbd5e1);
        break;
      }

      case 'asymmetric_fin': {
        // Architectural vertical crown blade fin + mechanical enclosure
        const finW = 0.75;
        const finH = 5.4;
        pushBox(columnEntries, curX + curW * 0.32, curY + finH / 2, curZ, finW, finH, curD * 0.96, profile.columnTint);
        pushBox(mullionEntries, curX + curW * 0.32 + 0.35, curY + finH / 2, curZ, 0.18, finH * 0.92, curD * 0.84, profile.mullionTint);

        const mech = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        mech.scale.set(curW * 0.48, 2.5, curD * 0.56);
        mech.position.set(relX - curW * 0.14, curY + 1.25, relZ);
        group.add(mech);
        pushBox(trimEntries, curX - curW * 0.14, curY + 2.6, curZ, curW * 0.5, 0.24, curD * 0.58, profile.trimTint);
        pushBox(cylinderTrimEntries, curX + curW * 0.32, curY + finH + 2.4, curZ - curD * 0.22, 0.18, 4.8, 0.18, 0xdbe4ee);
        break;
      }

      case 'stepped_louver':
      default: {
        // Louvered rooftop mechanical box with stepped cap
        const boxW = curW * 0.58;
        const boxD = curD * 0.54;
        const boxH = 2.6;
        const box = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
        box.scale.set(boxW, boxH, boxD);
        box.position.set(relX, curY + boxH / 2, relZ);
        group.add(box);
        pushBox(trimEntries, curX, curY + boxH * 0.55, curZ + boxD / 2 + 0.05, boxW + 0.14, 1.2, 0.14, profile.trimTint);
        pushBox(trimEntries, curX, curY + boxH * 0.55, curZ - boxD / 2 - 0.05, boxW + 0.14, 1.2, 0.14, profile.trimTint);
        pushBox(spandrelEntries, curX, curY + boxH + 0.22, curZ, boxW + 0.3, 0.34, boxD + 0.3, profile.spandrelTint);
        break;
      }
    }

    root.add(group);
  };

  let skyscraperCount = 0;
  let landmarkCount = 0;
  let towerMaterialCount = 0;
  let viceTowerPinnacleHeight = 0;
  const archetypesUsed: SkyscraperArchetype[] = [];

  for (const spec of downtownSpecs) {
    const profile = resolveDowntownTowerProfile(spec);
    archetypesUsed.push(profile.archetype);

    // Per-tower physical curtain-wall material preserving shared PBR glass/concrete masks
    // and selective night emissive calibration via emissiveBuildingMaterials
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: spec.baseColor,
      map: textures.skyscraperMap,
      emissive: spec.style === 'landmark' ? 0xffe0a8 : 0xffd699,
      emissiveMap: textures.skyscraperEmissive,
      emissiveIntensity: 0.22,
      roughness: 1.0,
      roughnessMap: textures.skyscraperRoughness,
      metalness: 1.0,
      metalnessMap: textures.skyscraperMetalness,
      clearcoat: 0.94,
      clearcoatMap: textures.skyscraperGlassMask,
      clearcoatRoughness: 0.06,
      ior: 1.52,
      reflectivity: 0.94,
      envMapIntensity: spec.style === 'landmark' ? 1.48 : 1.38,
    });
    emissiveBuildingMaterials.push(glassMat);
    disposables.push(glassMat);
    towerMaterialCount++;

    if (spec.style === 'landmark') {
      landmarkCount++;
      viceTowerPinnacleHeight = buildViceTower(spec, profile, glassMat);
    } else {
      skyscraperCount++;
      buildDowntownSkyscraper(spec, profile, glassMat);
    }
  }

  // Finalize all batched InstancedMeshes with per-instance color tinting and safe bounding spheres
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
  instancedBatches += buildInstancedBatch('downtown_mullions_inst', unitBoxGeo, aluminumMat, mullionEntries, false, true, true);
  instancedBatches += buildInstancedBatch('downtown_spandrels_inst', unitBoxGeo, spandrelInstMat, spandrelEntries, true, true, true);
  instancedBatches += buildInstancedBatch('downtown_columns_inst', unitBoxGeo, graniteColumnMat, columnEntries, true, true, true);
  instancedBatches += buildInstancedBatch('downtown_trim_inst', unitBoxGeo, darkBronzeMat, trimEntries, true, true, true);
  instancedBatches += buildInstancedBatch('downtown_gold_fins_inst', unitBoxGeo, champagneGoldMat, goldEntries, true, true, false);
  instancedBatches += buildInstancedBatch('downtown_cyl_trim_inst', unitCylGeo, aluminumMat, cylinderTrimEntries, true, true, true);
  instancedBatches += buildInstancedBatch('downtown_cyan_accents_inst', unitBoxGeo, cyanAccentLightMat, cyanLightEntries, false, false, false);
  instancedBatches += buildInstancedBatch('downtown_amber_accents_inst', unitBoxGeo, warmAmberLightMat, amberLightEntries, false, false, false);

  const totalFacadeInstances =
    mullionEntries.length +
    spandrelEntries.length +
    columnEntries.length +
    trimEntries.length +
    goldEntries.length +
    cylinderTrimEntries.length +
    cyanLightEntries.length +
    amberLightEntries.length;

  return {
    skyscraperCount,
    landmarkCount,
    instancedBatches,
    totalFacadeInstances,
    sharedMaterialCount: sharedMaterials.length,
    towerMaterialCount,
    archetypesUsed,
    viceTowerPinnacleHeight,
  };
}
