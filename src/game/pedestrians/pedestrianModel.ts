import * as THREE from 'three';
import {
  PEDESTRIAN_DIMS,
  type PedestrianBottomStyle,
  type PedestrianHairStyle,
  type PedestrianSharedGeometrySet,
  type PedestrianShoeStyle,
  type PedestrianSleeveStyle,
  type PedestrianTopStyle,
  createPedestrianSharedGeometries,
} from './pedestrianGeometry';

export type PedestrianTheme =
  | 'tourist'
  | 'office'
  | 'local'
  | 'sporty'
  | 'beach';

export interface PedestrianArchetypeSpec {
  id: string;
  label: string;
  theme: PedestrianTheme;
  topStyle: PedestrianTopStyle;
  sleeveStyle: PedestrianSleeveStyle;
  bottomStyle: PedestrianBottomStyle;
  shoeStyle: PedestrianShoeStyle;
  hairStyle: PedestrianHairStyle;
  topColor: number;
  innerShirtColor: number;
  bottomColor: number;
  shoeUpperColor: number;
  shoeSoleTone: 'white' | 'dark';
  beltTone: 'none' | 'dark' | 'tan';
  sunglasses: boolean;
  backpack: 'none' | 'slate' | 'sand';
  heightRange: [number, number];
  widthRange: [number, number];
}

/**
 * 8 cohesive, modern coastal-city pedestrian archetypes covering tourists,
 * local residents, office commuters, sporty walkers, and relaxed beach visitors.
 * All reuse the exact same shared geometry & material pools.
 */
export const PEDESTRIAN_ARCHETYPES: readonly PedestrianArchetypeSpec[] = [
  {
    id: 'coastal_tourist',
    label: 'Coastal Tourist',
    theme: 'tourist',
    topStyle: 'openJacket',
    sleeveStyle: 'short',
    bottomStyle: 'shorts',
    shoeStyle: 'sneaker',
    hairStyle: 'sweptWaves',
    topColor: 0x3b82b6, // breezy coastal sky camp shirt
    innerShirtColor: 0xf4f1ea, // crisp ivory tee
    bottomColor: 0xc2b294, // warm khaki shorts
    shoeUpperColor: 0xe9edf2, // crisp white sneakers
    shoeSoleTone: 'white',
    beltTone: 'none',
    sunglasses: true,
    backpack: 'sand',
    heightRange: [0.98, 1.04],
    widthRange: [0.98, 1.04],
  },
  {
    id: 'office_commuter',
    label: 'Office Commuter',
    theme: 'office',
    topStyle: 'collared',
    sleeveStyle: 'long',
    bottomStyle: 'trousers',
    shoeStyle: 'loafer',
    hairStyle: 'shortCrop',
    topColor: 0xc7d9ea, // crisp ice-blue dress shirt
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0x333c48, // charcoal tailored trousers
    shoeUpperColor: 0x2a2320, // dark leather loafers
    shoeSoleTone: 'dark',
    beltTone: 'dark',
    sunglasses: false,
    backpack: 'none',
    heightRange: [0.99, 1.06],
    widthRange: [0.97, 1.03],
  },
  {
    id: 'local_casual',
    label: 'Local Resident',
    theme: 'local',
    topStyle: 'tshirt',
    sleeveStyle: 'short',
    bottomStyle: 'trousers',
    shoeStyle: 'sneaker',
    hairStyle: 'bobCut',
    topColor: 0xd96b56, // warm coastal coral-terracotta tee
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0x2c3f59, // dark indigo jeans
    shoeUpperColor: 0xe9edf2,
    shoeSoleTone: 'white',
    beltTone: 'tan',
    sunglasses: false,
    backpack: 'none',
    heightRange: [0.93, 0.99],
    widthRange: [0.93, 0.98],
  },
  {
    id: 'sporty_runner',
    label: 'Sporty Coastal Walker',
    theme: 'sporty',
    topStyle: 'tshirt',
    sleeveStyle: 'short',
    bottomStyle: 'shorts',
    shoeStyle: 'sneaker',
    hairStyle: 'highPonytail',
    topColor: 0x2d8a7e, // athletic seafoam-teal jersey tee
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0x2b333e, // slate athletic shorts
    shoeUpperColor: 0x223854, // navy trainers
    shoeSoleTone: 'white',
    beltTone: 'none',
    sunglasses: false,
    backpack: 'none',
    heightRange: [0.94, 1.01],
    widthRange: [0.94, 0.99],
  },
  {
    id: 'beach_visitor',
    label: 'Beach Visitor',
    theme: 'beach',
    topStyle: 'tshirt',
    sleeveStyle: 'short',
    bottomStyle: 'shorts',
    shoeStyle: 'loafer',
    hairStyle: 'sweptWaves',
    topColor: 0xd9a85b, // sun-washed ochre linen tee
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0xe2dac8, // relaxed sand linen shorts
    shoeUpperColor: 0x8f6b4b, // tan slip-ons
    shoeSoleTone: 'white',
    beltTone: 'none',
    sunglasses: true,
    backpack: 'none',
    heightRange: [0.96, 1.03],
    widthRange: [0.96, 1.03],
  },
  {
    id: 'smart_local',
    label: 'Smart Casual Local',
    theme: 'office',
    topStyle: 'openJacket',
    sleeveStyle: 'long',
    bottomStyle: 'trousers',
    shoeStyle: 'loafer',
    hairStyle: 'shortCrop',
    topColor: 0x26384d, // navy light coastal blazer/jacket
    innerShirtColor: 0xece6d8, // warm oatmeal tee
    bottomColor: 0xc2b294, // sandstone chinos
    shoeUpperColor: 0x5c3e2a, // chestnut loafers
    shoeSoleTone: 'dark',
    beltTone: 'tan',
    sunglasses: false,
    backpack: 'slate',
    heightRange: [0.99, 1.05],
    widthRange: [0.99, 1.05],
  },
  {
    id: 'cafe_stroller',
    label: 'Boardwalk Local',
    theme: 'local',
    topStyle: 'collared',
    sleeveStyle: 'short',
    bottomStyle: 'trousers',
    shoeStyle: 'sneaker',
    hairStyle: 'bobCut',
    topColor: 0x5e785c, // coastal olive-sage polo/shirt
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0xddd4c2, // light stone chinos
    shoeUpperColor: 0x3b424d, // charcoal sneakers
    shoeSoleTone: 'white',
    beltTone: 'dark',
    sunglasses: false,
    backpack: 'none',
    heightRange: [0.93, 1.0],
    widthRange: [0.94, 1.0],
  },
  {
    id: 'active_walker',
    label: 'Active Promenade Visitor',
    theme: 'sporty',
    topStyle: 'tshirt',
    sleeveStyle: 'short',
    bottomStyle: 'trousers',
    shoeStyle: 'sneaker',
    hairStyle: 'highPonytail',
    topColor: 0xb96876, // muted coastal dusty-rose tee
    innerShirtColor: 0xf4f1ea,
    bottomColor: 0x333c48, // charcoal slim trousers
    shoeUpperColor: 0xe9edf2,
    shoeSoleTone: 'white',
    beltTone: 'none',
    sunglasses: true,
    backpack: 'slate',
    heightRange: [0.94, 1.0],
    widthRange: [0.93, 0.99],
  },
] as const;

const SKIN_TONES = [0xe8be98, 0xd8a175, 0xbc8254, 0x8f5b38, 0xf0ccb0] as const;
const HAIR_TONES = [0x241a14, 0x4b3322, 0xa88652, 0x6b3a24, 0x5d626b] as const;

function createSharedFabricTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#efefef';
  ctx.fillRect(0, 0, size, size);

  // Subtle woven linen/cotton crosshatch so garments read like real fabric under golden hour & night light
  for (let y = 0; y < size; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(x, 0, 1, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export interface PedestrianSharedResources {
  geometries: PedestrianSharedGeometrySet;
  fabricTexture: THREE.CanvasTexture | null;
  skinMats: THREE.MeshStandardMaterial[];
  hairMats: THREE.MeshStandardMaterial[];
  eyeWhiteMat: THREE.MeshStandardMaterial;
  eyeIrisMat: THREE.MeshStandardMaterial;
  lipMat: THREE.MeshStandardMaterial;
  beltDarkMat: THREE.MeshStandardMaterial;
  beltTanMat: THREE.MeshStandardMaterial;
  soleWhiteMat: THREE.MeshStandardMaterial;
  soleDarkMat: THREE.MeshStandardMaterial;
  sunglassesMat: THREE.MeshStandardMaterial;
  backpackSlateMat: THREE.MeshStandardMaterial;
  backpackSandMat: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  getFabricMat: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
  getShoeUpperMat: (color: number) => THREE.MeshStandardMaterial;
  getMaterialCount: () => number;
  dispose: () => void;
}

/**
 * Creates the single shared geometry + PBR material pool reused across all pedestrians.
 */
export function createPedestrianSharedResources(
  contactShadowMap: THREE.Texture,
): PedestrianSharedResources {
  const geometries = createPedestrianSharedGeometries();
  const fabricTexture = createSharedFabricTexture();

  const skinMats = SKIN_TONES.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.64,
        metalness: 0.0,
      }),
  );

  const hairMats = HAIR_TONES.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.62,
        metalness: 0.04,
      }),
  );

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f2,
    roughness: 0.25,
    metalness: 0.0,
  });
  const eyeIrisMat = new THREE.MeshStandardMaterial({
    color: 0x1e262e,
    roughness: 0.18,
    metalness: 0.05,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0xa96f62,
    roughness: 0.56,
    metalness: 0.0,
  });

  const beltDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2b2019,
    roughness: 0.46,
    metalness: 0.06,
  });
  const beltTanMat = new THREE.MeshStandardMaterial({
    color: 0x6f4a2e,
    roughness: 0.5,
    metalness: 0.05,
  });

  const soleWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xebeae4,
    roughness: 0.84,
    metalness: 0.0,
  });
  const soleDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    roughness: 0.82,
    metalness: 0.02,
  });

  const sunglassesMat = new THREE.MeshStandardMaterial({
    color: 0x15191f,
    roughness: 0.14,
    metalness: 0.35,
  });
  const backpackSlateMat = new THREE.MeshStandardMaterial({
    color: 0x3b4654,
    map: fabricTexture,
    roughness: 0.82,
    metalness: 0.02,
  });
  const backpackSandMat = new THREE.MeshStandardMaterial({
    color: 0x9e8c72,
    map: fabricTexture,
    roughness: 0.84,
    metalness: 0.01,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  const fabricCache = new Map<string, THREE.MeshStandardMaterial>();
  const shoeCache = new Map<number, THREE.MeshStandardMaterial>();

  const getFabricMat = (color: number, roughness: number = 0.82): THREE.MeshStandardMaterial => {
    const key = `${color}_${roughness.toFixed(2)}`;
    const existing = fabricCache.get(key);
    if (existing) return existing;
    const mat = new THREE.MeshStandardMaterial({
      color,
      map: fabricTexture,
      roughness,
      metalness: 0.01,
    });
    fabricCache.set(key, mat);
    return mat;
  };

  const getShoeUpperMat = (color: number): THREE.MeshStandardMaterial => {
    const existing = shoeCache.get(color);
    if (existing) return existing;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.56,
      metalness: 0.04,
    });
    shoeCache.set(color, mat);
    return mat;
  };

  return {
    geometries,
    fabricTexture,
    skinMats,
    hairMats,
    eyeWhiteMat,
    eyeIrisMat,
    lipMat,
    beltDarkMat,
    beltTanMat,
    soleWhiteMat,
    soleDarkMat,
    sunglassesMat,
    backpackSlateMat,
    backpackSandMat,
    contactShadowMat,
    getFabricMat,
    getShoeUpperMat,
    getMaterialCount: () =>
      skinMats.length +
      hairMats.length +
      11 +
      fabricCache.size +
      shoeCache.size,
    dispose: () => {
      geometries.dispose();
      fabricTexture?.dispose();
      for (const m of skinMats) m.dispose();
      for (const m of hairMats) m.dispose();
      eyeWhiteMat.dispose();
      eyeIrisMat.dispose();
      lipMat.dispose();
      beltDarkMat.dispose();
      beltTanMat.dispose();
      soleWhiteMat.dispose();
      soleDarkMat.dispose();
      sunglassesMat.dispose();
      backpackSlateMat.dispose();
      backpackSandMat.dispose();
      contactShadowMat.dispose();
      for (const m of fabricCache.values()) m.dispose();
      for (const m of shoeCache.values()) m.dispose();
      fabricCache.clear();
      shoeCache.clear();
    },
  };
}

export interface PedestrianRig {
  root: THREE.Group;
  bodyRig: THREE.Group;
  hipsPivot: THREE.Group;
  spinePivot: THREE.Group;
  neckPivot: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  leftAnklePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  rightAnklePivot: THREE.Group;
  contactShadow: THREE.Mesh;
  archetypeId: string;
  heightScale: number;
  widthScale: number;
  setDetailVisible: (visible: boolean) => void;
}

function addCastShadowMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  castShadow: boolean = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * Instantiates a lightweight articulated pedestrian rig referencing ONLY shared
 * geometries and shared materials (zero per-instance GPU allocations).
 */
export function createPedestrianRig(
  resources: PedestrianSharedResources,
  variantIndex: number,
): PedestrianRig {
  const spec = PEDESTRIAN_ARCHETYPES[variantIndex % PEDESTRIAN_ARCHETYPES.length];
  const g = resources.geometries;

  // Deterministic, natural adult height & build variation
  const fracH = ((variantIndex * 0.6180339) % 1 + 1) % 1;
  const fracW = ((variantIndex * 0.381966) % 1 + 1) % 1;
  const heightScale = spec.heightRange[0] + (spec.heightRange[1] - spec.heightRange[0]) * fracH;
  const widthScale = spec.widthRange[0] + (spec.widthRange[1] - spec.widthRange[0]) * fracW;

  // Coherent skin & hair variation across instances
  const skinMat = resources.skinMats[(variantIndex * 3 + 1) % resources.skinMats.length];
  const hairMat = resources.hairMats[(variantIndex * 2 + (spec.theme === 'office' ? 0 : 1)) % resources.hairMats.length];
  const topMat = resources.getFabricMat(spec.topColor, 0.8);
  const innerMat = resources.getFabricMat(spec.innerShirtColor, 0.85);
  const bottomMat = resources.getFabricMat(spec.bottomColor, 0.84);
  const shoeUpperMat = resources.getShoeUpperMat(spec.shoeUpperColor);
  const shoeSoleMat = spec.shoeSoleTone === 'white' ? resources.soleWhiteMat : resources.soleDarkMat;

  const root = new THREE.Group();
  const bodyRig = new THREE.Group();
  bodyRig.scale.set(widthScale, heightScale, widthScale);
  root.add(bodyRig);

  const detailMeshes: THREE.Object3D[] = [];

  // 1. Pelvis / hips root pivot
  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, PEDESTRIAN_DIMS.hipY, 0);
  bodyRig.add(hipsPivot);
  addCastShadowMesh(hipsPivot, g.pelvis, bottomMat);

  if (spec.beltTone !== 'none') {
    const beltMat = spec.beltTone === 'dark' ? resources.beltDarkMat : resources.beltTanMat;
    detailMeshes.push(addCastShadowMesh(hipsPivot, g.belt, beltMat, false));
  }

  // 2. Upper torso / spine pivot
  const spinePivot = new THREE.Group();
  spinePivot.position.set(0, PEDESTRIAN_DIMS.spineLocalY, 0);
  hipsPivot.add(spinePivot);

  if (spec.topStyle === 'openJacket') {
    addCastShadowMesh(spinePivot, g.openJacketInner, innerMat);
    addCastShadowMesh(spinePivot, g.openJacketShell, topMat);
  } else if (spec.topStyle === 'collared') {
    addCastShadowMesh(spinePivot, g.collaredTorso, topMat);
  } else {
    addCastShadowMesh(spinePivot, g.tshirtTorso, topMat);
  }

  if (spec.backpack !== 'none') {
    const packMat = spec.backpack === 'sand' ? resources.backpackSandMat : resources.backpackSlateMat;
    detailMeshes.push(addCastShadowMesh(spinePivot, g.backpack, packMat, true));
  }

  // 3. Neck, head, hair & subtle facial features
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, PEDESTRIAN_DIMS.neckLocalY, 0);
  spinePivot.add(neckPivot);

  addCastShadowMesh(neckPivot, g.headSkin, skinMat);
  addCastShadowMesh(neckPivot, g.hairStyles[spec.hairStyle], hairMat);

  // Close-range facial & accessory detail (toggled via distance LOD)
  detailMeshes.push(addCastShadowMesh(neckPivot, g.eyeWhites, resources.eyeWhiteMat, false));
  detailMeshes.push(addCastShadowMesh(neckPivot, g.eyeIrises, resources.eyeIrisMat, false));
  detailMeshes.push(addCastShadowMesh(neckPivot, g.lips, resources.lipMat, false));
  if (spec.sunglasses) {
    detailMeshes.push(addCastShadowMesh(neckPivot, g.sunglasses, resources.sunglassesMat, false));
  }

  // 4. Arms (shoulders -> elbows)
  const buildArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * PEDESTRIAN_DIMS.shoulderHalfX, PEDESTRIAN_DIMS.shoulderLocalY, 0);
    spinePivot.add(shoulder);

    const elbow = new THREE.Group();
    elbow.position.set(0, -PEDESTRIAN_DIMS.upperArmLen, 0);
    shoulder.add(elbow);

    if (spec.sleeveStyle === 'long') {
      addCastShadowMesh(shoulder, g.longSleeveUpperArm, topMat);
      addCastShadowMesh(elbow, g.longSleeveForearm, topMat);
      addCastShadowMesh(elbow, g.handOnly, skinMat);
    } else {
      addCastShadowMesh(shoulder, g.shortSleeveFabricUpper, topMat);
      addCastShadowMesh(shoulder, g.shortSleeveSkinLower, skinMat);
      addCastShadowMesh(elbow, g.bareForearmAndHand, skinMat);
    }

    return { shoulder, elbow };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // 5. Legs (hips -> knees -> ankles -> shoes)
  const shoePair = g.shoes[spec.shoeStyle];
  const buildLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * PEDESTRIAN_DIMS.hipHalfX, 0, 0);
    hipsPivot.add(hip);

    const knee = new THREE.Group();
    knee.position.set(0, -PEDESTRIAN_DIMS.thighLen, 0);
    hip.add(knee);

    const ankle = new THREE.Group();
    ankle.position.set(0, -PEDESTRIAN_DIMS.shinLen, 0);
    knee.add(ankle);

    if (spec.bottomStyle === 'shorts') {
      addCastShadowMesh(hip, g.thighShortsFabric, bottomMat);
      addCastShadowMesh(hip, g.thighShortsBareLower, skinMat);
      addCastShadowMesh(knee, g.shinBare, skinMat);
    } else {
      addCastShadowMesh(hip, g.thighTrouser, bottomMat);
      addCastShadowMesh(knee, g.shinTrouser, bottomMat);
      addCastShadowMesh(knee, g.shinAnkleSkin, skinMat, false);
    }

    addCastShadowMesh(ankle, shoePair.upper, shoeUpperMat);
    addCastShadowMesh(ankle, shoePair.sole, shoeSoleMat, false);

    return { hip, knee, ankle };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // 6. Grounding contact shadow disc
  const contactShadow = new THREE.Mesh(g.contactShadow, resources.contactShadowMat);
  contactShadow.position.y = 0.085;
  root.add(contactShadow);

  let lastDetailVisible = true;

  return {
    root,
    bodyRig,
    hipsPivot,
    spinePivot,
    neckPivot,
    leftShoulderPivot: leftArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightShoulderPivot: rightArm.shoulder,
    rightElbowPivot: rightArm.elbow,
    leftHipPivot: leftLeg.hip,
    leftKneePivot: leftLeg.knee,
    leftAnklePivot: leftLeg.ankle,
    rightHipPivot: rightLeg.hip,
    rightKneePivot: rightLeg.knee,
    rightAnklePivot: rightLeg.ankle,
    contactShadow,
    archetypeId: spec.id,
    heightScale,
    widthScale,
    setDetailVisible: (visible: boolean) => {
      if (visible === lastDetailVisible) return;
      lastDetailVisible = visible;
      for (let i = 0; i < detailMeshes.length; i++) {
        detailMeshes[i].visible = visible;
      }
    },
  };
}
