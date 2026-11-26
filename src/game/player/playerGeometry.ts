import * as THREE from 'three';

/**
 * Pure parametric sculpted 3D geometry builders for the Phase 2B-1 MINI VICE CITY
 * protagonist character.
 *
 * Coordinate convention (matches PlayerController & Three.js):
 *   +X = character right, +Y = up, -Z = character forward (facing direction).
 * Ground contact plane is y = 0.000 (shoe soles sit flush at y = 0).
 *
 * Kept DOM-free so proportions, joint alignment, and mesh validity can be
 * unit-tested directly under node:test.
 */

export const PLAYER_DIMS = {
  totalHeight: 1.81,
  ankleY: 0.095,
  kneeY: 0.505,
  hipY: 0.925,
  hipHalfX: 0.098,
  spineLocalY: 0.09, // relative to hipsPivot -> world y = 1.015
  shoulderLocalY: 0.43, // relative to spinePivot -> world y = 1.445
  shoulderHalfX: 0.212,
  upperArmLen: 0.275, // shoulder -> elbow
  forearmLen: 0.255, // elbow -> wrist
  neckLocalY: 0.495, // relative to spinePivot -> world y = 1.51
  headLocalY: 0.095, // relative to neckPivot -> world y = 1.605 (crown ~1.81)
  thighLen: 0.42, // hip -> knee
  shinLen: 0.41, // knee -> ankle
} as const;

export interface LoftSection {
  y: number;
  rx: number;
  rz: number;
  offsetX?: number;
  offsetZ?: number;
  /** Slight flattening/shaping exponent (2 = ellipse, 2.4 = softly squared athletic chest/torso) */
  superPower?: number;
  /** Extra rear/front asymmetry: shifts +Z vs -Z radius slightly */
  frontScale?: number;
  backScale?: number;
}

/**
 * Merges an array of simple BufferGeometries into a single draw-call-friendly BufferGeometry
 * and disposes the temporary source geometries.
 */
export function mergePlayerGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const g of geos) {
    const pos = g.getAttribute('position');
    totalVerts += pos.count;
    const idx = g.getIndex();
    totalIndices += idx ? idx.count : pos.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const v3 = (vOffset + i) * 3;
      positions[v3] = pos.getX(i);
      positions[v3 + 1] = pos.getY(i);
      positions[v3 + 2] = pos.getZ(i);
      normals[v3] = norm.getX(i);
      normals[v3 + 1] = norm.getY(i);
      normals[v3 + 2] = norm.getZ(i);
      const v2 = (vOffset + i) * 2;
      if (uv) {
        uvs[v2] = uv.getX(i);
        uvs[v2 + 1] = uv.getY(i);
      }
    }

    const idx = g.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOffset++] = idx.getX(i) + vOffset;
      }
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset++] = vOffset + i;
      }
    }

    vOffset += count;
    g.dispose();
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

/**
 * Lofts a closed organic tube/shell from vertical cross-section rings (bottom to top),
 * producing smooth outward normals and seamless UV mapping.
 */
export function buildLoftedTube(
  sections: readonly LoftSection[],
  radialSegments = 16,
  capBottom = true,
  capTop = true,
): THREE.BufferGeometry {
  const numRings = sections.length;
  const ringCols = radialSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < numRings; r++) {
    const s = sections[r];
    const v = numRings > 1 ? r / (numRings - 1) : 0;
    const ox = s.offsetX ?? 0;
    const oz = s.offsetZ ?? 0;
    const p = s.superPower ?? 2;
    const frontScale = s.frontScale ?? 1;
    const backScale = s.backScale ?? 1;

    for (let c = 0; c <= radialSegments; c++) {
      const u = c / radialSegments;
      const theta = u * Math.PI * 2;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      // Superellipse shaping for subtle anatomical contours (ribcage, jaw, deltoids)
      const sx = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p);
      const sz = Math.sign(st) * Math.pow(Math.abs(st), 2 / p);
      const zScale = sz < 0 ? frontScale : backScale;

      positions.push(ox + sx * s.rx, s.y, oz + sz * s.rz * zScale);
      uvs.push(u, v);
    }
  }

  // Side quads: increasing theta goes (+X -> +Z -> -X -> -Z), so (a, b, c) faces outward
  for (let r = 0; r < numRings - 1; r++) {
    for (let c = 0; c < radialSegments; c++) {
      const a = r * ringCols + c;
      const b = r * ringCols + (c + 1);
      const d = (r + 1) * ringCols + (c + 1);
      const e = (r + 1) * ringCols + c;
      indices.push(a, e, b, b, e, d);
    }
  }

  // Optional bottom cap (normal -Y)
  if (capBottom && numRings > 0) {
    const first = sections[0];
    const centerIdx = positions.length / 3;
    positions.push(first.offsetX ?? 0, first.y, first.offsetZ ?? 0);
    uvs.push(0.5, 0);
    for (let c = 0; c < radialSegments; c++) {
      indices.push(centerIdx, c, c + 1);
    }
  }

  // Optional top cap (normal +Y)
  if (capTop && numRings > 0) {
    const last = sections[numRings - 1];
    const topStart = (numRings - 1) * ringCols;
    const centerIdx = positions.length / 3;
    positions.push(last.offsetX ?? 0, last.y, last.offsetZ ?? 0);
    uvs.push(0.5, 1);
    for (let c = 0; c < radialSegments; c++) {
      indices.push(centerIdx, topStart + c + 1, topStart + c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an open-front shell (angular arc from thetaStart to thetaEnd) with interior
 * thickness so the coastal overshirt/jacket wraps organically over the inner tee with
 * visible lapels, collar, and hem depth.
 */
function buildOpenJacketShell(
  sections: readonly LoftSection[],
  gapHalfAngle: number, // radians half-opening centered at front (-Z, theta = 1.5*PI)
  thickness = 0.011,
  arcSegments = 16,
): THREE.BufferGeometry {
  const numRings = sections.length;
  const cols = arcSegments + 1;
  // Front is theta = -Math.PI / 2 (= 1.5 * PI). Sweep from (-PI/2 + gap) around +X, +Z, -X to (3*PI/2 - gap).
  const thetaStart = -Math.PI * 0.5 + gapHalfAngle;
  const thetaEnd = Math.PI * 1.5 - gapHalfAngle;

  const evalRingPoint = (s: LoftSection, theta: number, radOffset: number): [number, number, number] => {
    const ox = s.offsetX ?? 0;
    const oz = s.offsetZ ?? 0;
    const p = s.superPower ?? 2.2;
    const frontScale = s.frontScale ?? 1;
    const backScale = s.backScale ?? 1;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const sx = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p);
    const sz = Math.sign(st) * Math.pow(Math.abs(st), 2 / p);
    const zScale = sz < 0 ? frontScale : backScale;
    return [ox + sx * (s.rx + radOffset), s.y, oz + sz * (s.rz * zScale + radOffset)];
  };

  const parts: THREE.BufferGeometry[] = [];

  // Outer jacket surface
  {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let r = 0; r < numRings; r++) {
      const v = r / (numRings - 1);
      for (let c = 0; c <= arcSegments; c++) {
        const u = c / arcSegments;
        const th = thetaStart + u * (thetaEnd - thetaStart);
        const [x, y, z] = evalRingPoint(sections[r], th, thickness);
        pos.push(x, y, z);
        uv.push(u, v);
      }
    }
    for (let r = 0; r < numRings - 1; r++) {
      for (let c = 0; c < arcSegments; c++) {
        const a = r * cols + c;
        const b = r * cols + (c + 1);
        const d = (r + 1) * cols + (c + 1);
        const e = (r + 1) * cols + c;
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

  // Inner lining face (flipped winding so lapels/hem have real thickness from any angle)
  {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let r = 0; r < numRings; r++) {
      const v = r / (numRings - 1);
      for (let c = 0; c <= arcSegments; c++) {
        const u = c / arcSegments;
        const th = thetaStart + u * (thetaEnd - thetaStart);
        const [x, y, z] = evalRingPoint(sections[r], th, 0);
        pos.push(x, y, z);
        uv.push(u, v);
      }
    }
    for (let r = 0; r < numRings - 1; r++) {
      for (let c = 0; c < arcSegments; c++) {
        const a = r * cols + c;
        const b = r * cols + (c + 1);
        const d = (r + 1) * cols + (c + 1);
        const e = (r + 1) * cols + c;
        idx.push(a, b, e, b, d, e);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
  }

  // Front placket / lapel edge strips closing left and right openings
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

  // Bottom hem rim closing outer -> inner at r = 0
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

  return mergePlayerGeometries(parts);
}

/**
 * Builds the contoured pelvis & upper-trouser hip block centered on hipsPivot (y = 0.925 world).
 */
export function buildPlayerPelvisGeometry(): {
  pelvis: THREE.BufferGeometry;
  belt: THREE.BufferGeometry;
  buckle: THREE.BufferGeometry;
} {
  const pelvis = buildLoftedTube(
    [
      { y: -0.105, rx: 0.145, rz: 0.095, superPower: 2.0 },
      { y: -0.055, rx: 0.175, rz: 0.118, offsetZ: 0.006, backScale: 1.08, superPower: 2.1 },
      { y: 0.015, rx: 0.178, rz: 0.118, offsetZ: 0.005, backScale: 1.06, superPower: 2.1 },
      { y: 0.075, rx: 0.168, rz: 0.112, superPower: 2.2 },
      { y: 0.115, rx: 0.162, rz: 0.108, superPower: 2.2 },
    ],
    18,
    true,
    true,
  );

  // Tailored leather belt wrapping cleanly around waist seam (y = +0.06..+0.105 local)
  const belt = buildLoftedTube(
    [
      { y: 0.058, rx: 0.171, rz: 0.116, superPower: 2.2 },
      { y: 0.072, rx: 0.175, rz: 0.12, superPower: 2.2 },
      { y: 0.096, rx: 0.175, rz: 0.12, superPower: 2.2 },
      { y: 0.108, rx: 0.17, rz: 0.115, superPower: 2.2 },
    ],
    18,
    true,
    true,
  );

  // Sculpted brushed-metal rectangular belt buckle facing forward (-Z)
  const buckleShape = new THREE.Shape();
  buckleShape.moveTo(-0.028, -0.021);
  buckleShape.lineTo(0.028, -0.021);
  buckleShape.lineTo(0.028, 0.021);
  buckleShape.lineTo(-0.028, 0.021);
  buckleShape.closePath();
  const buckle = new THREE.ExtrudeGeometry(buckleShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  buckle.translate(0, 0.084, -0.124);
  buckle.computeVertexNormals();

  return { pelvis, belt, buckle };
}

/**
 * Builds the layered upper torso (origin at spinePivot, y = 1.015 world):
 *  - Sculpted inner crew-neck Henley shirt
 *  - Open-front tailored coastal overshirt/jacket with collar, rolled lapels & chest pockets
 *  - Subtle metallic zipper/button placket accents
 */
export function buildPlayerTorsoGeometry(): {
  innerShirt: THREE.BufferGeometry;
  jacket: THREE.BufferGeometry;
  jacketAccent: THREE.BufferGeometry;
} {
  const innerShirt = buildLoftedTube(
    [
      { y: -0.02, rx: 0.158, rz: 0.106, superPower: 2.2 },
      { y: 0.08, rx: 0.165, rz: 0.11, superPower: 2.2 },
      { y: 0.2, rx: 0.184, rz: 0.122, offsetZ: -0.004, frontScale: 1.06, superPower: 2.3 },
      { y: 0.33, rx: 0.206, rz: 0.128, offsetZ: -0.004, frontScale: 1.08, superPower: 2.35 },
      { y: 0.43, rx: 0.205, rz: 0.116, superPower: 2.25 },
      { y: 0.485, rx: 0.115, rz: 0.085, superPower: 2.0 },
      { y: 0.505, rx: 0.072, rz: 0.068, superPower: 2.0 },
    ],
    18,
    true,
    true,
  );

  const jacketSections: LoftSection[] = [
    { y: -0.055, rx: 0.174, rz: 0.119, superPower: 2.2 },
    { y: 0.05, rx: 0.177, rz: 0.122, superPower: 2.2 },
    { y: 0.19, rx: 0.195, rz: 0.132, offsetZ: -0.002, frontScale: 1.05, superPower: 2.3 },
    { y: 0.34, rx: 0.217, rz: 0.137, offsetZ: -0.002, frontScale: 1.06, superPower: 2.35 },
    { y: 0.445, rx: 0.216, rz: 0.126, superPower: 2.25 },
    { y: 0.492, rx: 0.126, rz: 0.094, superPower: 2.0 },
  ];
  const shell = buildOpenJacketShell(jacketSections, 0.34, 0.014, 18);

  const jacketParts: THREE.BufferGeometry[] = [shell];

  // Turned-up tailored collar wrapping cleanly around the back & sides of the neck
  const collarSections: LoftSection[] = [
    { y: 0.472, rx: 0.092, rz: 0.086, offsetZ: 0.004, superPower: 2.0 },
    { y: 0.515, rx: 0.096, rz: 0.09, offsetZ: 0.006, superPower: 2.0 },
    { y: 0.542, rx: 0.092, rz: 0.086, offsetZ: 0.008, superPower: 2.0 },
  ];
  jacketParts.push(buildOpenJacketShell(collarSections, 0.62, 0.011, 14));

  // Folded lapels + chest pocket welts on left and right fronts
  for (const side of [-1, 1] as const) {
    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(0, 0);
    lapelShape.lineTo(0.052, 0.04);
    lapelShape.lineTo(0.044, 0.165);
    lapelShape.lineTo(-0.005, 0.18);
    lapelShape.closePath();

    const lapel = new THREE.ExtrudeGeometry(lapelShape, {
      depth: 0.011,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
    });
    if (side < 0) {
      lapel.scale(-1, 1, 1);
      // Flip winding after negative scale so normals stay outward
      const idx = lapel.getIndex();
      if (idx) {
        const arr = idx.array as Uint16Array | Uint32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const tmp = arr[i + 1];
          arr[i + 1] = arr[i + 2];
          arr[i + 2] = tmp;
        }
      } else {
        const pos = lapel.getAttribute('position');
        for (let i = 0; i < pos.count; i += 3) {
          const x1 = pos.getX(i + 1), y1 = pos.getY(i + 1), z1 = pos.getZ(i + 1);
          pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
          pos.setXYZ(i + 2, x1, y1, z1);
        }
      }
    }
    lapel.rotateY(side * -0.26);
    lapel.translate(side * 0.068, 0.305, -0.146);
    lapel.computeVertexNormals();
    jacketParts.push(lapel);

    // Subtle chest pocket flap
    const pocket = new THREE.BoxGeometry(0.068, 0.022, 0.012);
    pocket.rotateY(side * -0.28);
    pocket.translate(side * 0.122, 0.325, -0.132);
    jacketParts.push(pocket);
  }

  // Subtle jacket cuff/hem trim & brushed buttons
  const accentParts: THREE.BufferGeometry[] = [];
  for (const by of [0.06, 0.16, 0.26]) {
    const btn = new THREE.CylinderGeometry(0.0085, 0.0085, 0.007, 10);
    btn.rotateX(Math.PI / 2);
    btn.rotateY(-0.22);
    btn.translate(0.078, by, -0.138);
    accentParts.push(btn);
  }
  // Ribbed crew-neck collar ring on inner shirt
  const shirtNeckRing = new THREE.TorusGeometry(0.072, 0.011, 8, 18);
  shirtNeckRing.rotateX(Math.PI / 2 + 0.18);
  shirtNeckRing.translate(0, 0.492, -0.008);
  accentParts.push(shirtNeckRing);

  return {
    innerShirt,
    jacket: mergePlayerGeometries(jacketParts),
    jacketAccent: mergePlayerGeometries(accentParts),
  };
}

/**
 * Builds the anatomical neck, sculpted human head with subtle facial features
 * (nose, ears, brow ridge, eyes, lips), and swept layered coastal hairstyle.
 * Local origin is neckPivot (world y = 1.51).
 */
export function buildPlayerHeadAndHairGeometry(): {
  skin: THREE.BufferGeometry;
  hair: THREE.BufferGeometry;
  eyeWhites: THREE.BufferGeometry;
  eyeIrises: THREE.BufferGeometry;
  lips: THREE.BufferGeometry;
} {
  const skinParts: THREE.BufferGeometry[] = [];

  // 1. Anatomical neck bridging cleanly down into chest collar and up into jaw/skull base
  const neck = buildLoftedTube(
    [
      { y: -0.04, rx: 0.074, rz: 0.068 },
      { y: 0.015, rx: 0.06, rz: 0.058 },
      { y: 0.075, rx: 0.056, rz: 0.056 },
      { y: 0.12, rx: 0.06, rz: 0.062 },
    ],
    14,
    true,
    true,
  );
  skinParts.push(neck);

  // 2. Sculpted adult cranium & jaw (origin around y = 0.075..0.305 -> head height ~0.23m)
  const head = buildLoftedTube(
    [
      { y: 0.075, rx: 0.036, rz: 0.038, offsetZ: -0.022, superPower: 2.0 }, // chin tip
      { y: 0.098, rx: 0.068, rz: 0.078, offsetZ: -0.012, frontScale: 1.12, superPower: 2.1 }, // jawline
      { y: 0.135, rx: 0.084, rz: 0.098, offsetZ: -0.006, frontScale: 1.1, superPower: 2.05 }, // cheeks/mouth
      { y: 0.175, rx: 0.092, rz: 0.106, offsetZ: -0.002, frontScale: 1.07, superPower: 2.0 }, // cheekbones/eyes
      { y: 0.215, rx: 0.096, rz: 0.11, offsetZ: 0.002, frontScale: 1.04, superPower: 2.0 }, // forehead/temples
      { y: 0.258, rx: 0.088, rz: 0.102, offsetZ: 0.005, superPower: 2.0 }, // upper cranium
      { y: 0.288, rx: 0.062, rz: 0.072, offsetZ: 0.006, superPower: 2.0 },
      { y: 0.302, rx: 0.024, rz: 0.028, offsetZ: 0.005, superPower: 2.0 }, // crown
    ],
    20,
    true,
    true,
  );
  skinParts.push(head);

  // 3. Sculpted nose (bridge + rounded tip facing -Z)
  const noseBridge = new THREE.CylinderGeometry(0.009, 0.015, 0.044, 8);
  noseBridge.rotateX(0.28);
  noseBridge.translate(0, 0.168, -0.108);
  skinParts.push(noseBridge);
  const noseTip = new THREE.SphereGeometry(0.015, 10, 8);
  noseTip.scale(1.05, 0.85, 1.05);
  noseTip.translate(0, 0.15, -0.114);
  skinParts.push(noseTip);

  // 4. Sculpted left & right ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.SphereGeometry(0.024, 10, 8);
    ear.scale(0.45, 1.15, 0.72);
    ear.rotateY(side * -0.2);
    ear.translate(side * 0.093, 0.17, 0.004);
    skinParts.push(ear);
  }

  // 5. Eyes (sclera + irises tucked neatly beneath subtle brow ridge)
  const eyeWhiteParts: THREE.BufferGeometry[] = [];
  const eyeIrisParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const sclera = new THREE.SphereGeometry(0.015, 10, 8);
    sclera.scale(1.18, 0.72, 0.65);
    sclera.translate(side * 0.034, 0.184, -0.097);
    eyeWhiteParts.push(sclera);

    const iris = new THREE.SphereGeometry(0.009, 10, 8);
    iris.scale(1.0, 0.92, 0.6);
    iris.translate(side * 0.034, 0.184, -0.104);
    eyeIrisParts.push(iris);
  }

  // 6. Subtle natural lips
  const lipUpper = new THREE.SphereGeometry(0.022, 10, 6);
  lipUpper.scale(1.18, 0.34, 0.45);
  lipUpper.translate(0, 0.123, -0.098);
  const lipLower = new THREE.SphereGeometry(0.02, 10, 6);
  lipLower.scale(1.08, 0.36, 0.45);
  lipLower.translate(0, 0.115, -0.097);
  const lips = mergePlayerGeometries([lipUpper, lipLower]);

  // 7. Swept, layered modern coastal hairstyle + sculpted eyebrows
  const hairParts: THREE.BufferGeometry[] = [];

  // Tapered back & sides hair cap hugging cranium cleanly (leaving face open from -Z)
  const backCap = buildOpenJacketShell(
    [
      { y: 0.135, rx: 0.088, rz: 0.102, offsetZ: 0.008, superPower: 2.0 },
      { y: 0.185, rx: 0.098, rz: 0.112, offsetZ: 0.008, superPower: 2.0 },
      { y: 0.23, rx: 0.102, rz: 0.116, offsetZ: 0.008, superPower: 2.0 },
      { y: 0.272, rx: 0.092, rz: 0.106, offsetZ: 0.008, superPower: 2.0 },
    ],
    1.12,
    0.012,
    16,
  );
  hairParts.push(backCap);

  // Voluminous swept-back textured top crown & side-part quiff
  const crown = new THREE.SphereGeometry(0.104, 16, 12);
  crown.scale(0.98, 0.66, 1.14);
  crown.rotateX(0.16);
  crown.translate(0.006, 0.268, 0.008);
  hairParts.push(crown);

  // Layered forehead swept wave locks (modern coastal hairstyle silhouette)
  const frontWave = new THREE.SphereGeometry(0.068, 12, 10);
  frontWave.scale(1.28, 0.56, 0.92);
  frontWave.rotateZ(-0.18);
  frontWave.rotateY(0.15);
  frontWave.translate(0.022, 0.262, -0.056);
  hairParts.push(frontWave);

  const sideLock = new THREE.SphereGeometry(0.056, 12, 8);
  sideLock.scale(1.05, 0.52, 0.88);
  sideLock.rotateZ(0.24);
  sideLock.translate(-0.044, 0.252, -0.042);
  hairParts.push(sideLock);

  // Subtle sideburns
  for (const side of [-1, 1] as const) {
    const burn = new THREE.BoxGeometry(0.014, 0.042, 0.024);
    burn.translate(side * 0.09, 0.186, -0.02);
    hairParts.push(burn);
  }

  // Sculpted eyebrows above eyes
  for (const side of [-1, 1] as const) {
    const brow = new THREE.BoxGeometry(0.032, 0.008, 0.012);
    brow.rotateZ(side * -0.08);
    brow.rotateY(side * -0.2);
    brow.translate(side * 0.035, 0.203, -0.099);
    hairParts.push(brow);
  }

  return {
    skin: mergePlayerGeometries(skinParts),
    hair: mergePlayerGeometries(hairParts),
    eyeWhites: mergePlayerGeometries(eyeWhiteParts),
    eyeIrises: mergePlayerGeometries(eyeIrisParts),
    lips,
  };
}

/**
 * Builds contoured jacket upper-arm sleeve with rounded deltoid shoulder cap and
 * rolled-up forearm cuff (origin at shoulderPivot, extends down to -upperArmLen).
 */
export function buildPlayerUpperArmGeometry(): {
  sleeve: THREE.BufferGeometry;
  cuff: THREE.BufferGeometry;
} {
  const L = PLAYER_DIMS.upperArmLen;
  const sleeve = buildLoftedTube(
    [
      { y: -L - 0.015, rx: 0.054, rz: 0.056 },
      { y: -L * 0.65, rx: 0.06, rz: 0.064 },
      { y: -L * 0.28, rx: 0.068, rz: 0.072 },
      { y: 0.0, rx: 0.072, rz: 0.076 },
      { y: 0.042, rx: 0.058, rz: 0.062 },
      { y: 0.064, rx: 0.028, rz: 0.03 },
    ],
    14,
    true,
    true,
  );

  // Rolled sleeve cuff fold right above the elbow
  const cuff = buildLoftedTube(
    [
      { y: -L - 0.022, rx: 0.058, rz: 0.06 },
      { y: -L + 0.005, rx: 0.062, rz: 0.064 },
      { y: -L + 0.028, rx: 0.061, rz: 0.063 },
      { y: -L + 0.042, rx: 0.055, rz: 0.057 },
    ],
    14,
    true,
    true,
  );

  return { sleeve, cuff };
}

/**
 * Builds anatomical skin forearm + sculpted hand (palm, curled fingers & thumb).
 * Origin at elbowPivot, extends down along -Y.
 */
export function buildPlayerForearmAndHandGeometry(side: -1 | 1): {
  forearmAndHand: THREE.BufferGeometry;
  watch: THREE.BufferGeometry | null;
} {
  const L = PLAYER_DIMS.forearmLen;
  const parts: THREE.BufferGeometry[] = [];

  // Rounded elbow overlap cap + tapered forearm musculature -> narrow wrist
  const forearm = buildLoftedTube(
    [
      { y: -L, rx: 0.033, rz: 0.038 },
      { y: -L * 0.65, rx: 0.041, rz: 0.045 },
      { y: -L * 0.22, rx: 0.048, rz: 0.05 },
      { y: 0.015, rx: 0.048, rz: 0.05 },
      { y: 0.042, rx: 0.032, rz: 0.034 },
    ],
    14,
    true,
    true,
  );
  parts.push(forearm);

  // Sculpted palm (slight anatomical flatness along X so palms face inward toward thighs)
  const palm = buildLoftedTube(
    [
      { y: -L - 0.088, rx: 0.018, rz: 0.038, superPower: 2.3 },
      { y: -L - 0.055, rx: 0.021, rz: 0.043, superPower: 2.3 },
      { y: -L - 0.018, rx: 0.024, rz: 0.04, superPower: 2.2 },
      { y: -L + 0.008, rx: 0.028, rz: 0.034, superPower: 2.0 },
    ],
    12,
    true,
    true,
  );
  parts.push(palm);

  // Naturally relaxed slightly curled finger block (sculpted rounded taper)
  const fingers = buildLoftedTube(
    [
      { y: -L - 0.148, rx: 0.011, rz: 0.028, offsetX: -side * 0.012, superPower: 2.2 },
      { y: -L - 0.118, rx: 0.015, rz: 0.035, offsetX: -side * 0.006, superPower: 2.3 },
      { y: -L - 0.082, rx: 0.018, rz: 0.038, superPower: 2.3 },
    ],
    10,
    true,
    true,
  );
  parts.push(fingers);

  // Sculpted thumb angled slightly forward (-Z) and inward
  const thumb = new THREE.CapsuleGeometry(0.011, 0.036, 4, 8);
  thumb.rotateX(0.45);
  thumb.rotateZ(side * 0.25);
  thumb.translate(-side * 0.014, -L - 0.052, -0.042);
  parts.push(thumb);

  // Subtle coastal stainless-steel wristwatch on left wrist only
  let watch: THREE.BufferGeometry | null = null;
  if (side < 0) {
    const band = new THREE.TorusGeometry(0.038, 0.006, 8, 16);
    band.rotateX(Math.PI / 2);
    band.scale(0.95, 1.0, 1.08);
    band.translate(0, -L + 0.025, 0);
    const dial = new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12);
    dial.rotateZ(Math.PI / 2);
    dial.translate(-0.036, -L + 0.025, 0);
    watch = mergePlayerGeometries([band, dial]);
  }

  return {
    forearmAndHand: mergePlayerGeometries(parts),
    watch,
  };
}

/**
 * Builds sculpted chino trouser thigh (origin at hipPivot, extends down to -thighLen)
 * with rounded hip & knee joint overlap caps so extreme bends show zero gaps.
 */
export function buildPlayerThighGeometry(): THREE.BufferGeometry {
  const L = PLAYER_DIMS.thighLen;
  return buildLoftedTube(
    [
      { y: -L - 0.032, rx: 0.056, rz: 0.058 },
      { y: -L + 0.02, rx: 0.072, rz: 0.076 },
      { y: -L * 0.55, rx: 0.086, rz: 0.094, frontScale: 1.05 },
      { y: -L * 0.15, rx: 0.096, rz: 0.104, backScale: 1.06 },
      { y: 0.025, rx: 0.092, rz: 0.098 },
      { y: 0.068, rx: 0.064, rz: 0.068 },
    ],
    16,
    true,
    true,
  );
}

/**
 * Builds sculpted chino trouser calf/shin + rolled ankle hem + subtle ankle skin collar.
 * Origin at kneePivot, extends down to -shinLen (ankleY).
 */
export function buildPlayerShinGeometry(): {
  trouserShin: THREE.BufferGeometry;
  ankleSkin: THREE.BufferGeometry;
} {
  const L = PLAYER_DIMS.shinLen;
  const trouserShin = buildLoftedTube(
    [
      { y: -L + 0.03, rx: 0.054, rz: 0.058 }, // crisp tapered trouser cuff above sneaker
      { y: -L + 0.065, rx: 0.059, rz: 0.064 },
      { y: -L * 0.52, rx: 0.069, rz: 0.076, backScale: 1.08 }, // sculpted calf silhouette
      { y: -L * 0.16, rx: 0.073, rz: 0.078 },
      { y: 0.015, rx: 0.068, rz: 0.072 }, // overlaps smoothly inside knee
      { y: 0.052, rx: 0.044, rz: 0.048 },
    ],
    16,
    true,
    true,
  );

  const ankleSkin = buildLoftedTube(
    [
      { y: -L - 0.02, rx: 0.044, rz: 0.048 },
      { y: -L + 0.01, rx: 0.044, rz: 0.048 },
      { y: -L + 0.045, rx: 0.048, rz: 0.052 },
    ],
    12,
    true,
    true,
  );

  return { trouserShin, ankleSkin };
}

/**
 * Builds a contoured modern coastal low-top sneaker (origin at anklePivot, world y = 0.095).
 * Sole bottom sits strictly at y = -PLAYER_DIMS.ankleY (-0.095) => world y = 0.000!
 */
export function buildPlayerShoeGeometry(): {
  upper: THREE.BufferGeometry;
  sole: THREE.BufferGeometry;
  accent: THREE.BufferGeometry;
} {
  const groundY = -PLAYER_DIMS.ankleY; // -0.095

  // Contoured vulcanized rubber sole footprint (Z: heel at +0.085, toe at -0.175 => 26cm shoe)
  const soleShape = new THREE.Shape();
  soleShape.moveTo(-0.048, -0.085); // heel left (+Z after rotateX)
  soleShape.quadraticCurveTo(0, -0.095, 0.048, -0.085); // rounded heel
  soleShape.quadraticCurveTo(0.058, 0.02, 0.054, 0.115); // outer arch -> forefoot
  soleShape.quadraticCurveTo(0.046, 0.172, 0.0, 0.176); // rounded toe tip (-Z)
  soleShape.quadraticCurveTo(-0.046, 0.172, -0.054, 0.115);
  soleShape.quadraticCurveTo(-0.058, 0.02, -0.048, -0.085);
  soleShape.closePath();

  const sole = new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 14,
  });
  // ExtrudeGeometry depth is +Z; rotating X by -PI/2 maps shape +Y -> -Z (toe forward!) and depth +Z -> +Y (upward!)
  sole.rotateX(-Math.PI / 2);
  // With bevelThickness=0.004, bottom is at -0.004 -> translate to groundY + 0.004 so min.y === groundY (0.000 world!)
  sole.translate(0, groundY + 0.004, 0);
  sole.computeVertexNormals();

  // Sculpted sneaker upper (heel counter + vamp + rounded toe box)
  const upperParts: THREE.BufferGeometry[] = [];
  const heelQuarter = buildLoftedTube(
    [
      { y: groundY + 0.026, rx: 0.051, rz: 0.082, offsetZ: 0.0, superPower: 2.2 },
      { y: groundY + 0.056, rx: 0.05, rz: 0.076, offsetZ: 0.006, superPower: 2.1 },
      { y: groundY + 0.086, rx: 0.047, rz: 0.062, offsetZ: 0.012, superPower: 2.0 },
    ],
    14,
    true,
    true,
  );
  upperParts.push(heelQuarter);

  // Sloping rounded toe vamp extending forward to -0.168
  const toeBox = new THREE.SphereGeometry(0.054, 14, 10);
  toeBox.scale(0.96, 0.62, 1.72);
  toeBox.translate(0, groundY + 0.046, -0.074);
  upperParts.push(toeBox);

  // Padded tongue rising gently over instep
  const tongue = new THREE.BoxGeometry(0.058, 0.044, 0.024);
  tongue.rotateX(-0.42);
  tongue.translate(0, groundY + 0.086, -0.048);
  upperParts.push(tongue);

  // Crisp lace bars & heel pull-tab accent
  const accentParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const lace = new THREE.CylinderGeometry(0.004, 0.004, 0.054, 6);
    lace.rotateZ(Math.PI / 2);
    lace.translate(0, groundY + 0.072 - i * 0.01, -0.064 - i * 0.02);
    accentParts.push(lace);
  }
  const heelTab = new THREE.BoxGeometry(0.036, 0.022, 0.01);
  heelTab.translate(0, groundY + 0.082, 0.072);
  accentParts.push(heelTab);

  return {
    upper: mergePlayerGeometries(upperParts),
    sole,
    accent: mergePlayerGeometries(accentParts),
  };
}
