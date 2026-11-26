import * as THREE from 'three';

/**
 * Canonical adult base dimensions (meters) for procedural coastal city pedestrians.
 * Visually consistent with the Phase 2B-1 protagonist (~1.76m base, scaled 0.93..1.06 per person).
 * Character faces -Z, +Y up, +X right, with shoe soles strictly flush at world y = 0.000.
 */
export const PEDESTRIAN_DIMS = {
  baseHeight: 1.76,
  ankleY: 0.09,
  kneeY: 0.485,
  hipY: 0.895,
  hipHalfX: 0.092,
  spineLocalY: 0.088,
  shoulderLocalY: 0.415,
  shoulderHalfX: 0.2,
  upperArmLen: 0.265,
  forearmLen: 0.245,
  neckLocalY: 0.478,
  thighLen: 0.41, // hipY - kneeY
  shinLen: 0.395, // kneeY - ankleY
} as const;

export type PedestrianHairStyle = 'shortCrop' | 'sweptWaves' | 'bobCut' | 'highPonytail';
export type PedestrianTopStyle = 'tshirt' | 'collared' | 'openJacket';
export type PedestrianSleeveStyle = 'short' | 'long';
export type PedestrianBottomStyle = 'trousers' | 'shorts';
export type PedestrianShoeStyle = 'sneaker' | 'loafer';

interface LoftSection {
  y: number;
  rx: number;
  rz: number;
  offsetX?: number;
  offsetZ?: number;
  frontScale?: number;
  backScale?: number;
  superPower?: number;
}

/**
 * Merges multiple non-indexed/indexed BufferGeometries into a single indexed BufferGeometry
 * with finite positions, normals, and UVs. Disposes source parts automatically.
 */
export function mergePedestrianGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  let totalVerts = 0;
  let totalIndices = 0;

  for (const raw of parts) {
    const g = raw.index ? raw : raw.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position');
    if (!g.getAttribute('uv')) {
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = pos.getX(i) * 2.5 + 0.5;
        uvs[i * 2 + 1] = pos.getY(i) * 2.5 + 0.5;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    const idx = g.getIndex();
    totalVerts += pos.count;
    totalIndices += idx ? idx.count : pos.count;
    normalized.push(g);
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of normalized) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const idx = g.getIndex();

    for (let i = 0; i < pos.count; i++) {
      const v3 = (vOffset + i) * 3;
      const v2 = (vOffset + i) * 2;
      positions[v3] = pos.getX(i);
      positions[v3 + 1] = pos.getY(i);
      positions[v3 + 2] = pos.getZ(i);
      normals[v3] = norm.getX(i);
      normals[v3 + 1] = norm.getY(i);
      normals[v3 + 2] = norm.getZ(i);
      uvs[v2] = uv.getX(i);
      uvs[v2 + 1] = uv.getY(i);
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOffset + i] = idx.getX(i) + vOffset;
      }
      iOffset += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += pos.count;
    }

    vOffset += pos.count;
  }

  for (let i = 0; i < parts.length; i++) {
    if (normalized[i] !== parts[i]) normalized[i].dispose();
    parts[i].dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function evalRingPoint(sec: LoftSection, theta: number, radialPad: number = 0): [number, number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const p = sec.superPower ?? 2.0;
  const exp = 2 / p;
  const sx = Math.sign(c) * Math.pow(Math.abs(c), exp);
  const sz = Math.sign(s) * Math.pow(Math.abs(s), exp);
  const zScale = s < 0 ? (sec.frontScale ?? 1.0) : (sec.backScale ?? 1.0);
  const x = (sec.offsetX ?? 0) + sx * (sec.rx + radialPad);
  const z = (sec.offsetZ ?? 0) + sz * (sec.rz * zScale + radialPad);
  return [x, sec.y, z];
}

/**
 * Builds a closed, smoothly shaded superellipse-lofted tube with outward-facing normals.
 * Tuned to lightweight segment counts (10-14) for crisp silhouettes and high multi-NPC FPS.
 */
function buildLoftedTube(
  sections: LoftSection[],
  radialSegments: number = 12,
  capBottom: boolean = true,
  capTop: boolean = true,
): THREE.BufferGeometry {
  const numRings = sections.length;
  const ringStride = radialSegments + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let r = 0; r < numRings; r++) {
    const sec = sections[r];
    const v = r / Math.max(1, numRings - 1);
    for (let c = 0; c <= radialSegments; c++) {
      const u = c / radialSegments;
      const theta = u * Math.PI * 2;
      const [x, y, z] = evalRingPoint(sec, theta, 0);
      pos.push(x, y, z);
      uv.push(u, v);
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    for (let c = 0; c < radialSegments; c++) {
      const a = r * ringStride + c;
      const b = a + 1;
      const e = (r + 1) * ringStride + c;
      const d = e + 1;
      idx.push(a, e, b, b, e, d);
    }
  }

  if (capBottom) {
    const bSec = sections[0];
    const centerIdx = pos.length / 3;
    pos.push(bSec.offsetX ?? 0, bSec.y, bSec.offsetZ ?? 0);
    uv.push(0.5, 0);
    for (let c = 0; c < radialSegments; c++) {
      idx.push(centerIdx, c, c + 1);
    }
  }

  if (capTop) {
    const tSec = sections[numRings - 1];
    const topStart = (numRings - 1) * ringStride;
    const centerIdx = pos.length / 3;
    pos.push(tSec.offsetX ?? 0, tSec.y, tSec.offsetZ ?? 0);
    uv.push(0.5, 1);
    for (let c = 0; c < radialSegments; c++) {
      idx.push(centerIdx, topStart + c + 1, topStart + c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an open-front layered jacket/overshirt shell with outer wall, inner lining,
 * front placket edges, and closed bottom hem (outward-pointing normals throughout).
 */
function buildOpenJacketShell(
  sections: LoftSection[],
  openingHalfAngle: number,
  thickness: number,
  arcSegments: number = 14,
): THREE.BufferGeometry {
  const numRings = sections.length;
  const thetaStart = -Math.PI / 2 + openingHalfAngle;
  const thetaEnd = (3 * Math.PI) / 2 - openingHalfAngle;
  const parts: THREE.BufferGeometry[] = [];

  for (const wall of ['outer', 'inner'] as const) {
    const pad = wall === 'outer' ? thickness : 0;
    const stride = arcSegments + 1;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    for (let r = 0; r < numRings; r++) {
      const v = r / Math.max(1, numRings - 1);
      for (let c = 0; c <= arcSegments; c++) {
        const u = c / arcSegments;
        const th = thetaStart + u * (thetaEnd - thetaStart);
        const [x, y, z] = evalRingPoint(sections[r], th, pad);
        pos.push(x, y, z);
        uv.push(u, v);
      }
    }

    for (let r = 0; r < numRings - 1; r++) {
      for (let c = 0; c < arcSegments; c++) {
        const a = r * stride + c;
        const b = a + 1;
        const e = (r + 1) * stride + c;
        const d = e + 1;
        if (wall === 'outer') {
          idx.push(a, e, b, b, e, d);
        } else {
          idx.push(a, b, e, b, d, e);
        }
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
  }

  for (const edgeIdx of [0, 1] as const) {
    const th = edgeIdx === 0 ? thetaStart : thetaEnd;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let r = 0; r < numRings; r++) {
      const v = r / (numRings - 1);
      const pOut = evalRingPoint(sections[r], th, thickness);
      const pIn = evalRingPoint(sections[r], th, 0);
      pos.push(pOut[0], pOut[1], pOut[2], pIn[0], pIn[1], pIn[2]);
      uv.push(0, v, 1, v);
    }
    for (let r = 0; r < numRings - 1; r++) {
      const a = r * 2;
      const b = r * 2 + 1;
      const e = (r + 1) * 2;
      const d = (r + 1) * 2 + 1;
      if (edgeIdx === 0) {
        idx.push(a, b, e, b, d, e);
      } else {
        idx.push(a, e, b, b, e, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
  }

  // Bottom hem closure
  {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let c = 0; c <= arcSegments; c++) {
      const u = c / arcSegments;
      const th = thetaStart + u * (thetaEnd - thetaStart);
      const pOut = evalRingPoint(sections[0], th, thickness);
      const pIn = evalRingPoint(sections[0], th, 0);
      pos.push(pOut[0], pOut[1], pOut[2], pIn[0], pIn[1], pIn[2]);
      uv.push(u, 0, u, 1);
    }
    for (let c = 0; c < arcSegments; c++) {
      const a = c * 2;
      const b = c * 2 + 1;
      const e = (c + 1) * 2;
      const d = (c + 1) * 2 + 1;
      idx.push(a, e, b, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
  }

  return mergePedestrianGeometries(parts);
}

/**
 * Shared geometry pool built ONCE per PedestrianSystem and reused across all pedestrian instances.
 */
export interface PedestrianSharedGeometrySet {
  // Pelvis & waist
  pelvis: THREE.BufferGeometry;
  belt: THREE.BufferGeometry;

  // Torso tops (origin at spinePivot)
  tshirtTorso: THREE.BufferGeometry;
  collaredTorso: THREE.BufferGeometry;
  openJacketInner: THREE.BufferGeometry;
  openJacketShell: THREE.BufferGeometry;

  // Head & facial detail (origin at neckPivot)
  headSkin: THREE.BufferGeometry;
  eyeWhites: THREE.BufferGeometry;
  eyeIrises: THREE.BufferGeometry;
  lips: THREE.BufferGeometry;

  // 4 distinct reusable hairstyles (origin at neckPivot)
  hairStyles: Record<PedestrianHairStyle, THREE.BufferGeometry>;

  // Arms (upper arm origin at shoulderPivot, forearm origin at elbowPivot)
  longSleeveUpperArm: THREE.BufferGeometry;
  shortSleeveFabricUpper: THREE.BufferGeometry;
  shortSleeveSkinLower: THREE.BufferGeometry;
  bareForearmAndHand: THREE.BufferGeometry;
  longSleeveForearm: THREE.BufferGeometry;
  handOnly: THREE.BufferGeometry;

  // Legs (thigh origin at hipPivot, shin origin at kneePivot)
  thighTrouser: THREE.BufferGeometry;
  thighShortsFabric: THREE.BufferGeometry;
  thighShortsBareLower: THREE.BufferGeometry;
  shinTrouser: THREE.BufferGeometry;
  shinAnkleSkin: THREE.BufferGeometry;
  shinBare: THREE.BufferGeometry;

  // Footwear (origin at anklePivot, soles flush at y = -PEDESTRIAN_DIMS.ankleY => world y = 0.000)
  shoes: Record<PedestrianShoeStyle, { upper: THREE.BufferGeometry; sole: THREE.BufferGeometry }>;

  // Optional reusable coastal accessories
  sunglasses: THREE.BufferGeometry;
  backpack: THREE.BufferGeometry;

  // Grounding contact shadow disc
  contactShadow: THREE.BufferGeometry;

  dispose: () => void;
}

function buildHeadAndFaceGeometries(): {
  headSkin: THREE.BufferGeometry;
  eyeWhites: THREE.BufferGeometry;
  eyeIrises: THREE.BufferGeometry;
  lips: THREE.BufferGeometry;
} {
  const skinParts: THREE.BufferGeometry[] = [];

  // Contoured human neck anchoring cleanly inside collar
  const neck = buildLoftedTube(
    [
      { y: -0.028, rx: 0.056, rz: 0.055 },
      { y: 0.025, rx: 0.05, rz: 0.05 },
      { y: 0.088, rx: 0.052, rz: 0.052 },
    ],
    10,
    true,
    true,
  );
  skinParts.push(neck);

  // Sculpted cranium, cheekbones, jaw & chin (origin at neckPivot, head spans y = 0.085..0.305)
  const head = buildLoftedTube(
    [
      { y: 0.082, rx: 0.044, rz: 0.056, offsetZ: -0.012, frontScale: 1.12 },
      { y: 0.115, rx: 0.068, rz: 0.08, offsetZ: -0.006, frontScale: 1.08, superPower: 2.1 },
      { y: 0.165, rx: 0.082, rz: 0.095, offsetZ: -0.002, frontScale: 1.04, superPower: 2.05 },
      { y: 0.215, rx: 0.086, rz: 0.1, offsetZ: 0.002, superPower: 2.0 },
      { y: 0.265, rx: 0.081, rz: 0.096, offsetZ: 0.006, superPower: 2.0 },
      { y: 0.298, rx: 0.056, rz: 0.068, offsetZ: 0.008, superPower: 2.0 },
      { y: 0.312, rx: 0.024, rz: 0.03, offsetZ: 0.008, superPower: 2.0 },
    ],
    12,
    true,
    true,
  );
  skinParts.push(head);

  // Sculpted nose bridge & tip
  const nose = buildLoftedTube(
    [
      { y: 0.156, rx: 0.013, rz: 0.016, offsetZ: -0.104 },
      { y: 0.172, rx: 0.011, rz: 0.014, offsetZ: -0.102 },
      { y: 0.194, rx: 0.008, rz: 0.01, offsetZ: -0.094 },
    ],
    8,
    true,
    true,
  );
  skinParts.push(nose);

  // Subtle ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.SphereGeometry(0.019, 7, 6);
    ear.scale(0.55, 1.32, 0.8);
    ear.translate(side * 0.084, 0.18, 0.004);
    skinParts.push(ear);
  }

  // Subtle recessed eyes (sclera + dark irises) and lips
  const eyeWhiteParts: THREE.BufferGeometry[] = [];
  const eyeIrisParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const sclera = new THREE.SphereGeometry(0.013, 7, 6);
    sclera.scale(1.18, 0.72, 0.55);
    sclera.translate(side * 0.032, 0.186, -0.091);
    eyeWhiteParts.push(sclera);

    const iris = new THREE.SphereGeometry(0.007, 6, 5);
    iris.scale(1.0, 1.0, 0.45);
    iris.translate(side * 0.032, 0.186, -0.097);
    eyeIrisParts.push(iris);
  }

  const lips = new THREE.SphereGeometry(0.02, 7, 5);
  lips.scale(1.12, 0.42, 0.48);
  lips.translate(0, 0.129, -0.093);

  return {
    headSkin: mergePedestrianGeometries(skinParts),
    eyeWhites: mergePedestrianGeometries(eyeWhiteParts),
    eyeIrises: mergePedestrianGeometries(eyeIrisParts),
    lips,
  };
}

function buildEyebrows(): THREE.BufferGeometry[] {
  const brows: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const brow = new THREE.BoxGeometry(0.029, 0.007, 0.01);
    brow.rotateZ(side * -0.07);
    brow.rotateY(side * -0.18);
    brow.translate(side * 0.032, 0.201, -0.094);
    brows.push(brow);
  }
  return brows;
}

function buildHairStyles(): Record<PedestrianHairStyle, THREE.BufferGeometry> {
  // 1. Short Crop (neat coastal short cut)
  const shortParts: THREE.BufferGeometry[] = [...buildEyebrows()];
  const shortCap = buildLoftedTube(
    [
      { y: 0.165, rx: 0.088, rz: 0.098, offsetZ: 0.012, frontScale: 0.72 },
      { y: 0.215, rx: 0.093, rz: 0.104, offsetZ: 0.008, frontScale: 0.88 },
      { y: 0.268, rx: 0.091, rz: 0.105, offsetZ: 0.005 },
      { y: 0.306, rx: 0.068, rz: 0.082, offsetZ: 0.004 },
      { y: 0.322, rx: 0.032, rz: 0.04, offsetZ: 0.003 },
    ],
    12,
    true,
    true,
  );
  shortParts.push(shortCap);

  // 2. Swept Waves (casual fuller coastal wave)
  const sweptParts: THREE.BufferGeometry[] = [...buildEyebrows()];
  const sweptCap = buildLoftedTube(
    [
      { y: 0.155, rx: 0.091, rz: 0.104, offsetZ: 0.016, frontScale: 0.68 },
      { y: 0.215, rx: 0.097, rz: 0.11, offsetZ: 0.01, frontScale: 0.86 },
      { y: 0.272, rx: 0.098, rz: 0.114, offsetZ: 0.005 },
      { y: 0.312, rx: 0.074, rz: 0.088, offsetZ: 0.002 },
      { y: 0.33, rx: 0.036, rz: 0.044, offsetZ: 0.001 },
    ],
    12,
    true,
    true,
  );
  sweptParts.push(sweptCap);
  const waveCrest = new THREE.SphereGeometry(0.064, 10, 7);
  waveCrest.scale(1.22, 0.56, 1.32);
  waveCrest.rotateX(-0.18);
  waveCrest.rotateZ(-0.14);
  waveCrest.translate(0.012, 0.296, -0.022);
  sweptParts.push(waveCrest);

  // 3. Layered Coastal Bob Cut (wraps sides & back down toward chin/neck)
  const bobParts: THREE.BufferGeometry[] = [...buildEyebrows()];
  const bobCrown = buildLoftedTube(
    [
      { y: 0.19, rx: 0.098, rz: 0.106, offsetZ: 0.012, frontScale: 0.72 },
      { y: 0.245, rx: 0.102, rz: 0.112, offsetZ: 0.008, frontScale: 0.92 },
      { y: 0.295, rx: 0.086, rz: 0.098, offsetZ: 0.005 },
      { y: 0.324, rx: 0.044, rz: 0.052, offsetZ: 0.004 },
    ],
    12,
    true,
    true,
  );
  bobParts.push(bobCrown);
  // Open-front lower bob drape covering sides and back of neck cleanly without obscuring face
  const bobDrape = buildOpenJacketShell(
    [
      { y: 0.085, rx: 0.094, rz: 0.096, offsetZ: 0.014 },
      { y: 0.14, rx: 0.1, rz: 0.104, offsetZ: 0.013 },
      { y: 0.205, rx: 0.096, rz: 0.104, offsetZ: 0.011 },
    ],
    0.85,
    0.016,
    12,
  );
  bobParts.push(bobDrape);

  // 4. High Ponytail (sleek pulled-back crown + sculpted flowing ponytail behind head)
  const ponyParts: THREE.BufferGeometry[] = [...buildEyebrows()];
  const ponyCrown = buildLoftedTube(
    [
      { y: 0.168, rx: 0.088, rz: 0.099, offsetZ: 0.012, frontScale: 0.7 },
      { y: 0.222, rx: 0.093, rz: 0.105, offsetZ: 0.008, frontScale: 0.9 },
      { y: 0.274, rx: 0.089, rz: 0.103, offsetZ: 0.006 },
      { y: 0.312, rx: 0.06, rz: 0.072, offsetZ: 0.005 },
      { y: 0.324, rx: 0.026, rz: 0.032, offsetZ: 0.005 },
    ],
    12,
    true,
    true,
  );
  ponyParts.push(ponyCrown);
  const ponyTail = buildLoftedTube(
    [
      { y: 0.09, rx: 0.018, rz: 0.022, offsetZ: 0.152 },
      { y: 0.155, rx: 0.034, rz: 0.038, offsetZ: 0.156 },
      { y: 0.215, rx: 0.038, rz: 0.042, offsetZ: 0.138 },
      { y: 0.252, rx: 0.024, rz: 0.028, offsetZ: 0.106 },
    ],
    10,
    true,
    true,
  );
  ponyParts.push(ponyTail);

  return {
    shortCrop: mergePedestrianGeometries(shortParts),
    sweptWaves: mergePedestrianGeometries(sweptParts),
    bobCut: mergePedestrianGeometries(bobParts),
    highPonytail: mergePedestrianGeometries(ponyParts),
  };
}

function buildShoePair(style: PedestrianShoeStyle): {
  upper: THREE.BufferGeometry;
  sole: THREE.BufferGeometry;
} {
  const groundY = -PEDESTRIAN_DIMS.ankleY; // -0.090 => world y = 0.000
  const isSneaker = style === 'sneaker';

  const soleShape = new THREE.Shape();
  soleShape.moveTo(-0.044, -0.08);
  soleShape.quadraticCurveTo(0, -0.088, 0.044, -0.08);
  soleShape.quadraticCurveTo(0.053, 0.02, 0.049, 0.108);
  soleShape.quadraticCurveTo(0.041, 0.16, 0, 0.164);
  soleShape.quadraticCurveTo(-0.041, 0.16, -0.049, 0.108);
  soleShape.quadraticCurveTo(-0.053, 0.02, -0.044, -0.08);
  soleShape.closePath();

  const soleDepth = isSneaker ? 0.022 : 0.014;
  const sole = new THREE.ExtrudeGeometry(soleShape, {
    depth: soleDepth,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 1,
    curveSegments: 10,
  });
  sole.rotateX(-Math.PI / 2);
  // Bottom sits strictly at groundY (-0.090 local => 0.000 world!)
  sole.translate(0, groundY + 0.003, 0);
  sole.computeVertexNormals();

  const upperParts: THREE.BufferGeometry[] = [];
  const quarter = buildLoftedTube(
    [
      { y: groundY + soleDepth + 0.002, rx: 0.046, rz: 0.076, superPower: 2.2 },
      { y: groundY + soleDepth + (isSneaker ? 0.032 : 0.024), rx: 0.045, rz: 0.07, offsetZ: 0.005, superPower: 2.1 },
      { y: groundY + soleDepth + (isSneaker ? 0.058 : 0.044), rx: 0.042, rz: 0.056, offsetZ: 0.01, superPower: 2.0 },
    ],
    10,
    true,
    true,
  );
  upperParts.push(quarter);

  const toeBox = new THREE.SphereGeometry(0.049, 10, 7);
  toeBox.scale(0.95, isSneaker ? 0.58 : 0.48, 1.66);
  toeBox.translate(0, groundY + soleDepth + (isSneaker ? 0.022 : 0.016), -0.068);
  upperParts.push(toeBox);

  return {
    upper: mergePedestrianGeometries(upperParts),
    sole,
  };
}

/**
 * Builds the complete reusable shared geometry library for all city pedestrians.
 */
export function createPedestrianSharedGeometries(): PedestrianSharedGeometrySet {
  // Pelvis & belt (origin at hipsPivot, y = 0.895 world)
  const pelvis = buildLoftedTube(
    [
      { y: -0.095, rx: 0.138, rz: 0.092, superPower: 2.0 },
      { y: -0.045, rx: 0.165, rz: 0.112, offsetZ: 0.005, backScale: 1.07, superPower: 2.1 },
      { y: 0.02, rx: 0.168, rz: 0.112, offsetZ: 0.004, backScale: 1.05, superPower: 2.1 },
      { y: 0.08, rx: 0.158, rz: 0.106, superPower: 2.2 },
      { y: 0.11, rx: 0.152, rz: 0.102, superPower: 2.2 },
    ],
    14,
    true,
    true,
  );

  const belt = buildLoftedTube(
    [
      { y: 0.056, rx: 0.161, rz: 0.11, superPower: 2.2 },
      { y: 0.096, rx: 0.163, rz: 0.112, superPower: 2.2 },
      { y: 0.104, rx: 0.159, rz: 0.108, superPower: 2.2 },
    ],
    14,
    true,
    true,
  );

  // Base torso sections (origin at spinePivot)
  const baseTorsoSections: LoftSection[] = [
    { y: -0.025, rx: 0.152, rz: 0.102, superPower: 2.2 },
    { y: 0.08, rx: 0.158, rz: 0.106, superPower: 2.2 },
    { y: 0.2, rx: 0.175, rz: 0.116, offsetZ: -0.003, frontScale: 1.06, superPower: 2.3 },
    { y: 0.32, rx: 0.194, rz: 0.122, offsetZ: -0.003, frontScale: 1.07, superPower: 2.3 },
    { y: 0.415, rx: 0.192, rz: 0.11, superPower: 2.2 },
    { y: 0.468, rx: 0.108, rz: 0.08, superPower: 2.0 },
    { y: 0.488, rx: 0.068, rz: 0.064, superPower: 2.0 },
  ];

  // 1. Casual T-shirt torso (with crew-neck rim)
  const tshirtParts: THREE.BufferGeometry[] = [buildLoftedTube(baseTorsoSections, 14, true, true)];
  const crewRim = new THREE.TorusGeometry(0.069, 0.01, 6, 14);
  crewRim.rotateX(Math.PI / 2 + 0.16);
  crewRim.translate(0, 0.474, -0.006);
  tshirtParts.push(crewRim);
  const tshirtTorso = mergePedestrianGeometries(tshirtParts);

  // 2. Collared button-down / polo shirt (with turned collar & crisp front placket)
  const collaredParts: THREE.BufferGeometry[] = [buildLoftedTube(baseTorsoSections, 14, true, true)];
  const shirtCollar = buildOpenJacketShell(
    [
      { y: 0.456, rx: 0.082, rz: 0.076, offsetZ: 0.004 },
      { y: 0.494, rx: 0.086, rz: 0.08, offsetZ: 0.006 },
      { y: 0.514, rx: 0.081, rz: 0.075, offsetZ: 0.007 },
    ],
    0.58,
    0.01,
    12,
  );
  collaredParts.push(shirtCollar);
  const placket = new THREE.BoxGeometry(0.032, 0.34, 0.012);
  placket.translate(0, 0.25, -0.122);
  collaredParts.push(placket);
  const collaredTorso = mergePedestrianGeometries(collaredParts);

  // 3. Open coastal jacket / camp-shirt over inner tee
  const openJacketInner = buildLoftedTube(baseTorsoSections, 14, true, true);
  const jacketShellParts: THREE.BufferGeometry[] = [
    buildOpenJacketShell(
      [
        { y: -0.05, rx: 0.164, rz: 0.114, superPower: 2.2 },
        { y: 0.06, rx: 0.168, rz: 0.117, superPower: 2.2 },
        { y: 0.2, rx: 0.185, rz: 0.126, offsetZ: -0.002, frontScale: 1.05, superPower: 2.3 },
        { y: 0.33, rx: 0.204, rz: 0.131, offsetZ: -0.002, frontScale: 1.06, superPower: 2.3 },
        { y: 0.425, rx: 0.202, rz: 0.12, superPower: 2.2 },
        { y: 0.474, rx: 0.118, rz: 0.088, superPower: 2.0 },
      ],
      0.36,
      0.013,
      14,
    ),
    buildOpenJacketShell(
      [
        { y: 0.456, rx: 0.086, rz: 0.08, offsetZ: 0.004 },
        { y: 0.502, rx: 0.09, rz: 0.084, offsetZ: 0.006 },
        { y: 0.524, rx: 0.085, rz: 0.079, offsetZ: 0.007 },
      ],
      0.62,
      0.01,
      12,
    ),
  ];
  const openJacketShell = mergePedestrianGeometries(jacketShellParts);

  // Head & hair
  const { headSkin, eyeWhites, eyeIrises, lips } = buildHeadAndFaceGeometries();
  const hairStyles = buildHairStyles();

  // Arms (upper arm origin at shoulderPivot, extends down to -upperArmLen)
  const uL = PEDESTRIAN_DIMS.upperArmLen;
  const longSleeveUpperArm = buildLoftedTube(
    [
      { y: -uL - 0.014, rx: 0.049, rz: 0.051 },
      { y: -uL * 0.6, rx: 0.055, rz: 0.058 },
      { y: -uL * 0.25, rx: 0.062, rz: 0.065 },
      { y: 0.0, rx: 0.065, rz: 0.068 },
      { y: 0.042, rx: 0.052, rz: 0.055 },
      { y: 0.06, rx: 0.025, rz: 0.026 },
    ],
    10,
    true,
    true,
  );

  const shortSleeveFabricUpper = buildLoftedTube(
    [
      { y: -uL * 0.56, rx: 0.058, rz: 0.06 },
      { y: -uL * 0.25, rx: 0.063, rz: 0.066 },
      { y: 0.0, rx: 0.066, rz: 0.069 },
      { y: 0.042, rx: 0.052, rz: 0.055 },
      { y: 0.06, rx: 0.025, rz: 0.026 },
    ],
    10,
    true,
    true,
  );

  const shortSleeveSkinLower = buildLoftedTube(
    [
      { y: -uL - 0.014, rx: 0.044, rz: 0.046 },
      { y: -uL * 0.62, rx: 0.048, rz: 0.05 },
      { y: -uL * 0.42, rx: 0.05, rz: 0.052 },
    ],
    10,
    true,
    true,
  );

  // Forearm & sculpted hand (origin at elbowPivot, extends down to -forearmLen)
  const fL = PEDESTRIAN_DIMS.forearmLen;
  const buildHandGeometry = (): THREE.BufferGeometry => {
    const hParts: THREE.BufferGeometry[] = [];
    const palm = buildLoftedTube(
      [
        { y: -fL - 0.082, rx: 0.017, rz: 0.036, superPower: 2.2 },
        { y: -fL - 0.048, rx: 0.02, rz: 0.04, superPower: 2.2 },
        { y: -fL - 0.012, rx: 0.024, rz: 0.036, superPower: 2.0 },
        { y: -fL + 0.01, rx: 0.028, rz: 0.032, superPower: 2.0 },
      ],
      10,
      true,
      true,
    );
    hParts.push(palm);
    const fingers = buildLoftedTube(
      [
        { y: -fL - 0.135, rx: 0.011, rz: 0.026, superPower: 2.2 },
        { y: -fL - 0.105, rx: 0.015, rz: 0.032, superPower: 2.2 },
        { y: -fL - 0.078, rx: 0.017, rz: 0.036, superPower: 2.2 },
      ],
      8,
      true,
      true,
    );
    hParts.push(fingers);
    return mergePedestrianGeometries(hParts);
  };

  const bareForearmTube = buildLoftedTube(
    [
      { y: -fL, rx: 0.031, rz: 0.035 },
      { y: -fL * 0.62, rx: 0.038, rz: 0.041 },
      { y: -fL * 0.2, rx: 0.044, rz: 0.046 },
      { y: 0.014, rx: 0.044, rz: 0.046 },
      { y: 0.038, rx: 0.028, rz: 0.03 },
    ],
    10,
    true,
    true,
  );
  const bareForearmAndHand = mergePedestrianGeometries([bareForearmTube, buildHandGeometry()]);

  const longSleeveForearm = buildLoftedTube(
    [
      { y: -fL + 0.015, rx: 0.04, rz: 0.043 },
      { y: -fL * 0.58, rx: 0.045, rz: 0.048 },
      { y: -fL * 0.18, rx: 0.049, rz: 0.051 },
      { y: 0.016, rx: 0.049, rz: 0.051 },
      { y: 0.04, rx: 0.032, rz: 0.034 },
    ],
    10,
    true,
    true,
  );
  const handOnly = buildHandGeometry();

  // Legs (thigh origin at hipPivot, shin origin at kneePivot)
  const tL = PEDESTRIAN_DIMS.thighLen;
  const thighTrouser = buildLoftedTube(
    [
      { y: -tL - 0.028, rx: 0.054, rz: 0.056 },
      { y: -tL + 0.025, rx: 0.068, rz: 0.072 },
      { y: -tL * 0.52, rx: 0.081, rz: 0.088, frontScale: 1.05 },
      { y: -tL * 0.14, rx: 0.09, rz: 0.097, backScale: 1.05 },
      { y: 0.024, rx: 0.086, rz: 0.092 },
      { y: 0.064, rx: 0.06, rz: 0.064 },
    ],
    12,
    true,
    true,
  );

  const thighShortsFabric = buildLoftedTube(
    [
      { y: -tL * 0.72, rx: 0.078, rz: 0.084 },
      { y: -tL * 0.35, rx: 0.086, rz: 0.092, frontScale: 1.04 },
      { y: -tL * 0.1, rx: 0.092, rz: 0.099, backScale: 1.05 },
      { y: 0.024, rx: 0.087, rz: 0.093 },
      { y: 0.064, rx: 0.06, rz: 0.064 },
    ],
    12,
    true,
    true,
  );

  const thighShortsBareLower = buildLoftedTube(
    [
      { y: -tL - 0.028, rx: 0.051, rz: 0.053 },
      { y: -tL + 0.022, rx: 0.058, rz: 0.062 },
      { y: -tL * 0.62, rx: 0.066, rz: 0.07 },
    ],
    12,
    true,
    true,
  );

  const sL = PEDESTRIAN_DIMS.shinLen;
  const shinTrouser = buildLoftedTube(
    [
      { y: -sL + 0.026, rx: 0.052, rz: 0.055 },
      { y: -sL + 0.062, rx: 0.057, rz: 0.061 },
      { y: -sL * 0.5, rx: 0.066, rz: 0.072, backScale: 1.07 },
      { y: -sL * 0.15, rx: 0.069, rz: 0.074 },
      { y: 0.014, rx: 0.064, rz: 0.068 },
      { y: 0.048, rx: 0.042, rz: 0.046 },
    ],
    12,
    true,
    true,
  );

  const shinAnkleSkin = buildLoftedTube(
    [
      { y: -sL - 0.018, rx: 0.04, rz: 0.044 },
      { y: -sL + 0.012, rx: 0.04, rz: 0.044 },
      { y: -sL + 0.042, rx: 0.044, rz: 0.048 },
    ],
    10,
    true,
    true,
  );

  const shinBare = buildLoftedTube(
    [
      { y: -sL - 0.018, rx: 0.039, rz: 0.043 },
      { y: -sL + 0.045, rx: 0.043, rz: 0.047 },
      { y: -sL * 0.44, rx: 0.056, rz: 0.064, backScale: 1.12 }, // anatomical calf muscle
      { y: -sL * 0.14, rx: 0.057, rz: 0.06 },
      { y: 0.014, rx: 0.055, rz: 0.058 },
      { y: 0.046, rx: 0.039, rz: 0.042 },
    ],
    12,
    true,
    true,
  );

  // Footwear
  const shoes: Record<PedestrianShoeStyle, { upper: THREE.BufferGeometry; sole: THREE.BufferGeometry }> = {
    sneaker: buildShoePair('sneaker'),
    loafer: buildShoePair('loafer'),
  };

  // Optional coastal accessories
  const sunglassesParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const lens = new THREE.BoxGeometry(0.034, 0.02, 0.008);
    lens.rotateY(side * -0.14);
    lens.translate(side * 0.031, 0.186, -0.103);
    sunglassesParts.push(lens);
    const arm = new THREE.BoxGeometry(0.005, 0.006, 0.088);
    arm.translate(side * 0.072, 0.19, -0.054);
    sunglassesParts.push(arm);
  }
  const bridge = new THREE.BoxGeometry(0.022, 0.006, 0.008);
  bridge.translate(0, 0.189, -0.104);
  sunglassesParts.push(bridge);
  const sunglasses = mergePedestrianGeometries(sunglassesParts);

  const backpackParts: THREE.BufferGeometry[] = [];
  const packBody = buildLoftedTube(
    [
      { y: 0.1, rx: 0.118, rz: 0.052, offsetZ: 0.156, superPower: 2.8 },
      { y: 0.22, rx: 0.128, rz: 0.06, offsetZ: 0.16, superPower: 2.8 },
      { y: 0.34, rx: 0.12, rz: 0.056, offsetZ: 0.156, superPower: 2.6 },
      { y: 0.395, rx: 0.088, rz: 0.04, offsetZ: 0.146, superPower: 2.4 },
    ],
    12,
    true,
    true,
  );
  backpackParts.push(packBody);
  const backpack = mergePedestrianGeometries(backpackParts);

  const contactShadow = new THREE.PlaneGeometry(0.95, 0.95);
  contactShadow.rotateX(-Math.PI / 2);

  const allGeometries: THREE.BufferGeometry[] = [
    pelvis,
    belt,
    tshirtTorso,
    collaredTorso,
    openJacketInner,
    openJacketShell,
    headSkin,
    eyeWhites,
    eyeIrises,
    lips,
    hairStyles.shortCrop,
    hairStyles.sweptWaves,
    hairStyles.bobCut,
    hairStyles.highPonytail,
    longSleeveUpperArm,
    shortSleeveFabricUpper,
    shortSleeveSkinLower,
    bareForearmAndHand,
    longSleeveForearm,
    handOnly,
    thighTrouser,
    thighShortsFabric,
    thighShortsBareLower,
    shinTrouser,
    shinAnkleSkin,
    shinBare,
    shoes.sneaker.upper,
    shoes.sneaker.sole,
    shoes.loafer.upper,
    shoes.loafer.sole,
    sunglasses,
    backpack,
    contactShadow,
  ];

  return {
    pelvis,
    belt,
    tshirtTorso,
    collaredTorso,
    openJacketInner,
    openJacketShell,
    headSkin,
    eyeWhites,
    eyeIrises,
    lips,
    hairStyles,
    longSleeveUpperArm,
    shortSleeveFabricUpper,
    shortSleeveSkinLower,
    bareForearmAndHand,
    longSleeveForearm,
    handOnly,
    thighTrouser,
    thighShortsFabric,
    thighShortsBareLower,
    shinTrouser,
    shinAnkleSkin,
    shinBare,
    shoes,
    sunglasses,
    backpack,
    contactShadow,
    dispose: () => {
      for (const g of allGeometries) g.dispose();
    },
  };
}
