import * as THREE from 'three';
import {
  PLAYER_DIMS,
  buildPlayerForearmAndHandGeometry,
  buildPlayerHeadAndHairGeometry,
  buildPlayerPelvisGeometry,
  buildPlayerShinGeometry,
  buildPlayerShoeGeometry,
  buildPlayerThighGeometry,
  buildPlayerTorsoGeometry,
  buildPlayerUpperArmGeometry,
} from './playerGeometry';

export interface PlayerCharacterRig {
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
  shadowDisc: THREE.Mesh;
  materials: {
    jacket: THREE.MeshStandardMaterial;
    shirt: THREE.MeshStandardMaterial;
    trousers: THREE.MeshStandardMaterial;
    skin: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    shoeUpper: THREE.MeshStandardMaterial;
    shoeSole: THREE.MeshStandardMaterial;
    metalAccent: THREE.MeshStandardMaterial;
  };
  dispose: () => void;
}

function makeCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function buildCoastalTwillTexture(baseHex: string, threadA: string, threadB: string): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, w, h);
      // Subtle diagonal twill weave + vertical seam shading
      ctx.strokeStyle = threadA;
      ctx.lineWidth = 1.2;
      for (let i = -h; i < w + h; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
      ctx.strokeStyle = threadB;
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    },
    3,
    3,
  );
}

function buildHairStrandTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#241a15';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 2) {
        ctx.fillStyle = x % 4 === 0 ? '#32251d' : '#1b130f';
        ctx.fillRect(x, 0, 1, h);
      }
      // Subtle soft highlight sheen band
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.45, 'rgba(196,158,128,0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    2,
    2,
  );
}

/**
 * Builds the upgraded Phase 2B-1 protagonist 3D model and hierarchical articulated rig.
 * All geometries, materials, and procedural textures are tracked and cleanly disposed via `dispose()`.
 */
export function createPlayerCharacterRig(contactShadowMap: THREE.Texture): PlayerCharacterRig {
  const disposables: Array<{ dispose: () => void }> = [];

  const root = new THREE.Group();
  const bodyRig = new THREE.Group();
  root.add(bodyRig);

  // 1. Procedural woven fabric & hair textures (zero external asset dependencies)
  const jacketTex = buildCoastalTwillTexture('#12606a', 'rgba(255,255,255,0.06)', 'rgba(8,24,30,0.08)');
  const chinoTex = buildCoastalTwillTexture('#d9cfc1', 'rgba(255,255,255,0.08)', 'rgba(82,66,48,0.06)');
  const hairTex = buildHairStrandTexture();
  if (jacketTex) disposables.push(jacketTex);
  if (chinoTex) disposables.push(chinoTex);
  if (hairTex) disposables.push(hairTex);

  // 2. Coherent Coastal-Streetwear PBR Material Suite
  //    Calibrated for daylight, golden hour, night, and rain readability
  const jacketMat = new THREE.MeshStandardMaterial({
    color: jacketTex ? 0xffffff : 0x12606a, // Deep coastal slate-teal overshirt jacket
    map: jacketTex ?? null,
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.55,
  });

  const jacketCuffMat = new THREE.MeshStandardMaterial({
    color: 0x0f4e57, // Slightly deeper collar/cuff interior fold contrast
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe4, // Crisp warm-ivory coastal crew tee
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.42,
  });

  const trousersMat = new THREE.MeshStandardMaterial({
    color: chinoTex ? 0xffffff : 0xd9cfc1, // Warm sandstone coastal chinos
    map: chinoTex ?? null,
    roughness: 0.84,
    metalness: 0.03,
    envMapIntensity: 0.45,
  });

  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x2b1f1a, // Rich espresso leather belt
    roughness: 0.46,
    metalness: 0.08,
    envMapIntensity: 0.75,
  });

  const metalAccentMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee9, // Brushed stainless watch & belt buckle
    roughness: 0.24,
    metalness: 0.88,
    envMapIntensity: 1.3,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd9a27c, // Natural sun-warmed coastal skin tone
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.48,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairTex ? 0xffffff : 0x241a15, // Espresso brown textured hair (reads well at night & golden hour)
    map: hairTex ?? null,
    roughness: 0.68,
    metalness: 0.06,
    envMapIntensity: 0.6,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f2,
    roughness: 0.25,
    metalness: 0.0,
    envMapIntensity: 0.8,
  });

  const eyeIrisMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.14,
    metalness: 0.12,
    envMapIntensity: 1.15,
  });

  const lipsMat = new THREE.MeshStandardMaterial({
    color: 0xb77760,
    roughness: 0.56,
    metalness: 0.02,
    envMapIntensity: 0.45,
  });

  const shoeUpperMat = new THREE.MeshStandardMaterial({
    color: 0x1d2a3a, // Deep coastal navy suede low-top sneakers
    roughness: 0.74,
    metalness: 0.05,
    envMapIntensity: 0.52,
  });

  const shoeSoleMat = new THREE.MeshStandardMaterial({
    color: 0xf1f3f5, // Crisp white vulcanized rubber sneaker sole
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.48,
  });

  const shoeAccentMat = new THREE.MeshStandardMaterial({
    color: 0xe6e9ee, // Laces & subtle heel tab
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.4,
  });

  disposables.push(
    jacketMat,
    jacketCuffMat,
    shirtMat,
    trousersMat,
    beltMat,
    metalAccentMat,
    skinMat,
    hairMat,
    eyeWhiteMat,
    eyeIrisMat,
    lipsMat,
    shoeUpperMat,
    shoeSoleMat,
    shoeAccentMat,
  );

  // 3. Build sculpted shared anatomical & garment geometries
  const pelvisParts = buildPlayerPelvisGeometry();
  const torsoParts = buildPlayerTorsoGeometry();
  const headParts = buildPlayerHeadAndHairGeometry();
  const upperArmParts = buildPlayerUpperArmGeometry();
  const forearmLParts = buildPlayerForearmAndHandGeometry(-1);
  const forearmRParts = buildPlayerForearmAndHandGeometry(1);
  const thighGeo = buildPlayerThighGeometry();
  const shinParts = buildPlayerShinGeometry();
  const shoeParts = buildPlayerShoeGeometry();

  disposables.push(
    pelvisParts.pelvis,
    pelvisParts.belt,
    pelvisParts.buckle,
    torsoParts.innerShirt,
    torsoParts.jacket,
    torsoParts.jacketAccent,
    headParts.skin,
    headParts.hair,
    headParts.eyeWhites,
    headParts.eyeIrises,
    headParts.lips,
    upperArmParts.sleeve,
    upperArmParts.cuff,
    forearmLParts.forearmAndHand,
    forearmRParts.forearmAndHand,
    thighGeo,
    shinParts.trouserShin,
    shinParts.ankleSkin,
    shoeParts.upper,
    shoeParts.sole,
    shoeParts.accent,
  );
  if (forearmLParts.watch) disposables.push(forearmLParts.watch);
  if (forearmRParts.watch) disposables.push(forearmRParts.watch);

  const makeMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    return m;
  };

  // 4. Assemble Articulated Skeleton Hierarchy
  // Root Pelvis / Hips Pivot (world y = 0.925)
  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, PLAYER_DIMS.hipY, 0);
  bodyRig.add(hipsPivot);

  hipsPivot.add(
    makeMesh(pelvisParts.pelvis, trousersMat),
    makeMesh(pelvisParts.belt, beltMat, false, true),
    makeMesh(pelvisParts.buckle, metalAccentMat, false, false),
  );

  // Spine / Upper Torso Pivot (local y = +0.09 -> world y = 1.015)
  const spinePivot = new THREE.Group();
  spinePivot.position.set(0, PLAYER_DIMS.spineLocalY, 0);
  hipsPivot.add(spinePivot);

  spinePivot.add(
    makeMesh(torsoParts.innerShirt, shirtMat),
    makeMesh(torsoParts.jacket, jacketMat),
    makeMesh(torsoParts.jacketAccent, shirtMat, false, true),
  );

  // Neck & Head Pivot (local y = +0.495 -> world y = 1.51)
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, PLAYER_DIMS.neckLocalY, 0);
  spinePivot.add(neckPivot);

  neckPivot.add(
    makeMesh(headParts.skin, skinMat),
    makeMesh(headParts.hair, hairMat),
    makeMesh(headParts.eyeWhites, eyeWhiteMat, false, false),
    makeMesh(headParts.eyeIrises, eyeIrisMat, false, false),
    makeMesh(headParts.lips, lipsMat, false, false),
  );

  // Left Arm Chain (Shoulder -> Elbow -> Forearm + Watch + Hand)
  const leftShoulderPivot = new THREE.Group();
  leftShoulderPivot.position.set(-PLAYER_DIMS.shoulderHalfX, PLAYER_DIMS.shoulderLocalY, 0);
  spinePivot.add(leftShoulderPivot);
  leftShoulderPivot.add(
    makeMesh(upperArmParts.sleeve, jacketMat),
    makeMesh(upperArmParts.cuff, jacketCuffMat, false, true),
  );

  const leftElbowPivot = new THREE.Group();
  leftElbowPivot.position.set(0, -PLAYER_DIMS.upperArmLen, 0);
  leftShoulderPivot.add(leftElbowPivot);
  leftElbowPivot.add(makeMesh(forearmLParts.forearmAndHand, skinMat));
  if (forearmLParts.watch) {
    leftElbowPivot.add(makeMesh(forearmLParts.watch, metalAccentMat, false, false));
  }

  // Right Arm Chain (Shoulder -> Elbow -> Forearm + Hand)
  const rightShoulderPivot = new THREE.Group();
  rightShoulderPivot.position.set(PLAYER_DIMS.shoulderHalfX, PLAYER_DIMS.shoulderLocalY, 0);
  spinePivot.add(rightShoulderPivot);
  rightShoulderPivot.add(
    makeMesh(upperArmParts.sleeve, jacketMat),
    makeMesh(upperArmParts.cuff, jacketCuffMat, false, true),
  );

  const rightElbowPivot = new THREE.Group();
  rightElbowPivot.position.set(0, -PLAYER_DIMS.upperArmLen, 0);
  rightShoulderPivot.add(rightElbowPivot);
  rightElbowPivot.add(makeMesh(forearmRParts.forearmAndHand, skinMat));

  // Left Leg Chain (Hip -> Knee -> Ankle -> Sneaker)
  const leftHipPivot = new THREE.Group();
  leftHipPivot.position.set(-PLAYER_DIMS.hipHalfX, 0, 0);
  hipsPivot.add(leftHipPivot);
  leftHipPivot.add(makeMesh(thighGeo, trousersMat));

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.set(0, -PLAYER_DIMS.thighLen, 0);
  leftHipPivot.add(leftKneePivot);
  leftKneePivot.add(
    makeMesh(shinParts.trouserShin, trousersMat),
    makeMesh(shinParts.ankleSkin, skinMat, false, true),
  );

  const leftAnklePivot = new THREE.Group();
  leftAnklePivot.position.set(0, -PLAYER_DIMS.shinLen, 0);
  leftKneePivot.add(leftAnklePivot);
  leftAnklePivot.add(
    makeMesh(shoeParts.upper, shoeUpperMat),
    makeMesh(shoeParts.sole, shoeSoleMat, false, true),
    makeMesh(shoeParts.accent, shoeAccentMat, false, false),
  );

  // Right Leg Chain (Hip -> Knee -> Ankle -> Sneaker)
  const rightHipPivot = new THREE.Group();
  rightHipPivot.position.set(PLAYER_DIMS.hipHalfX, 0, 0);
  hipsPivot.add(rightHipPivot);
  rightHipPivot.add(makeMesh(thighGeo, trousersMat));

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.set(0, -PLAYER_DIMS.thighLen, 0);
  rightHipPivot.add(rightKneePivot);
  rightKneePivot.add(
    makeMesh(shinParts.trouserShin, trousersMat),
    makeMesh(shinParts.ankleSkin, skinMat, false, true),
  );

  const rightAnklePivot = new THREE.Group();
  rightAnklePivot.position.set(0, -PLAYER_DIMS.shinLen, 0);
  rightKneePivot.add(rightAnklePivot);
  rightAnklePivot.add(
    makeMesh(shoeParts.upper, shoeUpperMat),
    makeMesh(shoeParts.sole, shoeSoleMat, false, true),
    makeMesh(shoeParts.accent, shoeAccentMat, false, false),
  );

  // 5. Grounding Radial Contact Shadow Disc (sits cleanly above asphalt at y = 0.085)
  const shadowGeo = new THREE.PlaneGeometry(1.15, 1.15);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  disposables.push(shadowGeo, shadowMat);
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.085;
  root.add(shadowDisc);

  return {
    root,
    bodyRig,
    hipsPivot,
    spinePivot,
    neckPivot,
    leftShoulderPivot,
    leftElbowPivot,
    rightShoulderPivot,
    rightElbowPivot,
    leftHipPivot,
    leftKneePivot,
    leftAnklePivot,
    rightHipPivot,
    rightKneePivot,
    rightAnklePivot,
    shadowDisc,
    materials: {
      jacket: jacketMat,
      shirt: shirtMat,
      trousers: trousersMat,
      skin: skinMat,
      hair: hairMat,
      shoeUpper: shoeUpperMat,
      shoeSole: shoeSoleMat,
      metalAccent: metalAccentMat,
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
