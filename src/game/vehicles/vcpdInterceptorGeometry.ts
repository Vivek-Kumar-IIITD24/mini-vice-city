import * as THREE from 'three';

/**
 * Pure parametric geometry builders for the Phase 2C-3B VCPD Interceptor
 * (`vcpd_interceptor`, VehicleKind.Police — Vice Coastal Police Pursuit Sedan).
 *
 * Local coordinate system matches VehicleRig:
 *   +X = right, +Y = up, -Z = forward (nose), +Z = rear (tail).
 * Ground contact plane is y = 0.
 *
 * Kept DOM-free so pursuit proportions, wheel-arch clearances (r = 0.34m),
 * two-tone door/roof livery, push-bar, roof lightbar, patrol partition/MDC
 * interior, and outward vertex normals can be verified under node:test.
 */

export const VCPD_INTERCEPTOR_DIMS = {
  length: 4.75,
  width: 2.08,
  height: 1.46,
  wheelRadius: 0.34,
  wheelWidth: 0.25,
  frontAxleZ: -1.46,
  rearAxleZ: 1.46,
  frontTrackHalf: 0.89,
  rearTrackHalf: 0.9,
  frontArchRadius: 0.415,
  rearArchRadius: 0.42,
  cabinStartZ: -0.78,
  cabinEndZ: 1.36,
  groundClearance: 0.225,
} as const;

export interface VcpdBodySection {
  z: number;
  sillY: number;
  lowerBeltY: number;
  beltY: number;
  deckY: number;
  centerDeckY: number;
  halfWidthLower: number;
  halfWidthMid: number;
  halfWidthBelt: number;
  cabinOpenHalfWidth: number;
  inFrontArch: boolean;
  inRearArch: boolean;
}

export interface VcpdRoofRailSample {
  z: number;
  y: number;
  halfWidth: number;
  crownY: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function bell(x: number, center: number, radius: number): number {
  const d = Math.abs(x - center) / radius;
  if (d >= 1) return 0;
  const u = 1 - d * d;
  return u * u;
}

/**
 * Evaluates the muscular 4-door law-enforcement pursuit sedan cross-section
 * across hull body length z in [-2.335, +2.355] (with heavy push-bar extending
 * cleanly to -2.375m so total length matches spec 4.75m).
 */
export function evaluateVcpdBodySection(z: number): VcpdBodySection {
  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    frontArchRadius,
    rearArchRadius,
    cabinStartZ,
    cabinEndZ,
    groundClearance,
  } = VCPD_INTERCEPTOR_DIMS;

  // Authoritative pursuit stance: broad shoulder haunches + tapered interceptor nose/tail
  const noseTaper = smoothstep(-2.34, -1.72, z);
  const tailTaper = 1 - smoothstep(1.74, 2.36, z) * 0.09;

  // Muscular wide pursuit fender flares over the 0.34m wheels + taut door flank crease
  const frontFlare = bell(z, frontAxleZ + 0.02, 0.68) * 0.056;
  const rearFlare = bell(z, rearAxleZ - 0.02, 0.72) * 0.064;
  const doorSculpt = bell(z, 0.02, 0.82) * 0.014;

  const baseHalfW = (0.855 + 0.145 * noseTaper) * tailTaper;
  const halfWidthMid = Math.min(1.035, baseHalfW + frontFlare + rearFlare - doorSculpt);
  const halfWidthLower = halfWidthMid * (0.946 - (1 - noseTaper) * 0.045);
  const halfWidthBelt = halfWidthMid * (0.916 - (1 - noseTaper) * 0.025);

  // Broad planted interceptor hood, confident beltline, muscular fastback rear deck
  const noseRise = smoothstep(-2.335, -1.86, z);
  const hoodRise = smoothstep(-2.05, -0.78, z);
  const rearHaunchLift = smoothstep(0.62, 1.66, z) * 0.044;
  const trunkSlope = smoothstep(1.74, 2.355, z) * 0.036;

  const beltY = 0.745 + 0.08 * noseRise + 0.095 * hoodRise + rearHaunchLift - trunkSlope;

  const deckY =
    beltY +
    0.034 * smoothstep(-2.26, -1.62, z) -
    0.015 * smoothstep(2.14, 2.355, z);

  // Sculpted pursuit power-bulge hood & subtle rear trunk lip
  const powerBulge = bell(z, -1.46, 0.72) * 0.032 * smoothstep(-2.28, -1.96, z);
  const noseRoll = (1 - smoothstep(-2.335, -2.02, z)) * 0.038;
  const trunkCrown = bell(z, 2.16, 0.28) * 0.016;
  const centerDeckY = deckY + 0.018 + powerBulge + trunkCrown - noseRoll;

  // Ground clearance with clean front splitter lip & circular wheel arches
  const frontLipTuck = (1 - smoothstep(-2.335, -1.94, z)) * 0.052;
  const rearLipTuck = smoothstep(1.94, 2.355, z) * 0.068;
  let sillY = groundClearance + frontLipTuck + rearLipTuck;
  let inFrontArch = false;
  let inRearArch = false;

  const dzFront = z - frontAxleZ;
  if (Math.abs(dzFront) < frontArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, frontArchRadius * frontArchRadius - dzFront * dzFront));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.082);
      inFrontArch = true;
    }
  }

  const dzRear = z - rearAxleZ;
  if (Math.abs(dzRear) < rearArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, rearArchRadius * rearArchRadius - dzRear * dzRear));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.086);
      inRearArch = true;
    }
  }

  const rawLowerBeltY = Math.max(groundClearance + 0.22, beltY * 0.615);
  const lowerBeltY = Math.max(sillY + 0.03, Math.min(beltY - 0.03, rawLowerBeltY));

  let cabinOpenHalfWidth = 0;
  if (z > cabinStartZ && z < cabinEndZ) {
    const openIn = smoothstep(cabinStartZ, cabinStartZ + 0.14, z);
    const openOut = 1 - smoothstep(cabinEndZ - 0.14, cabinEndZ, z);
    const rearNarrow = 1 - smoothstep(0.68, cabinEndZ, z) * 0.045;
    cabinOpenHalfWidth = (halfWidthBelt - 0.095) * openIn * openOut * rearNarrow;
  }

  return {
    z,
    sillY,
    lowerBeltY,
    beltY,
    deckY,
    centerDeckY,
    halfWidthLower,
    halfWidthMid,
    halfWidthBelt,
    cabinOpenHalfWidth,
    inFrontArch,
    inRearArch,
  };
}

/**
 * Evaluates the pursuit sedan roof rail along z in [-0.22, +0.92].
 * Cabin roof crown sits cleanly at 1.46m (matching catalog spec.height = 1.46m),
 * with the aerodynamic lightbar mounted cleanly on top around 1.465..1.58m.
 */
export function sampleVcpdRoofRail(z: number): VcpdRoofRailSample {
  const zFront = -0.22;
  const zRear = 0.92;
  const t = Math.max(0, Math.min(1, (z - zFront) / (zRear - zFront)));

  const arch = Math.sin(t * Math.PI);
  const railY = 1.406 * (1 - t) + 1.394 * t + arch * 0.034;
  const crownY = railY + 0.016 + arch * 0.008;

  const halfWidth = 0.705 + Math.sin(t * Math.PI) * 0.022 - smoothstep(0.64, 1.0, t) * 0.028;
  return { z, y: railY, halfWidth, crownY };
}

// ---------------------------------------------------------------------------
// Internal Geometry Utilities
// ---------------------------------------------------------------------------

function repairDegenerateNormals(
  geo: THREE.BufferGeometry,
  fallbackDir?: THREE.Vector3,
): void {
  const norm = geo.getAttribute('normal');
  if (!norm) return;
  const fx = fallbackDir ? fallbackDir.x : 0;
  const fy = fallbackDir ? fallbackDir.y : 1;
  const fz = fallbackDir ? fallbackDir.z : 0;
  const fLen = Math.hypot(fx, fy, fz);
  const rx = fLen > 1e-6 ? fx / fLen : 0;
  const ry = fLen > 1e-6 ? fy / fLen : 1;
  const rz = fLen > 1e-6 ? fz / fLen : 0;

  let modified = false;
  for (let i = 0; i < norm.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const lenSq = nx * nx + ny * ny + nz * nz;
    if (!Number.isFinite(lenSq) || lenSq < 1e-6) {
      norm.setXYZ(i, rx, ry, rz);
      modified = true;
    }
  }
  if (modified) {
    norm.needsUpdate = true;
  }
}

function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  const posAttr = nonIndexed.getAttribute('position');
  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }
  repairDegenerateNormals(nonIndexed);
  if (!nonIndexed.getAttribute('uv')) {
    const uvs = new Float32Array(posAttr.count * 2);
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  return nonIndexed;
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = geos.map(normalizeForMerge);
  let totalVerts = 0;
  for (const g of prepared) {
    totalVerts += g.getAttribute('position').count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let vOffset = 0;
  for (const g of prepared) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const i3 = (vOffset + i) * 3;
      const i2 = (vOffset + i) * 2;
      positions[i3] = pos.getX(i);
      positions[i3 + 1] = pos.getY(i);
      positions[i3 + 2] = pos.getZ(i);
      normals[i3] = norm.getX(i);
      normals[i3 + 1] = norm.getY(i);
      normals[i3 + 2] = norm.getZ(i);
      uvs[i2] = uv.getX(i);
      uvs[i2 + 1] = uv.getY(i);
    }
    vOffset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return merged;
}

export function mergeVcpdGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(geos);
}

function flipWinding(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geo.getIndex();
  if (index) {
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    index.needsUpdate = true;
  } else {
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < pos.count; i += 3) {
      const x1 = pos.getX(i + 1);
      const y1 = pos.getY(i + 1);
      const z1 = pos.getZ(i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, x1, y1, z1);
      if (uv) {
        const u1 = uv.getX(i + 1);
        const v1 = uv.getY(i + 1);
        uv.setXY(i + 1, uv.getX(i + 2), uv.getY(i + 2));
        uv.setXY(i + 2, u1, v1);
      }
    }
    pos.needsUpdate = true;
    if (uv) uv.needsUpdate = true;
  }
  geo.computeVertexNormals();
  return geo;
}

function ensureMeanNormalDirection(
  geo: THREE.BufferGeometry,
  expectedDir: THREE.Vector3,
): THREE.BufferGeometry {
  geo.computeVertexNormals();
  const norm = geo.getAttribute('normal');
  let dotSum = 0;
  for (let i = 0; i < norm.count; i++) {
    dotSum +=
      norm.getX(i) * expectedDir.x +
      norm.getY(i) * expectedDir.y +
      norm.getZ(i) * expectedDir.z;
  }
  if (dotSum < 0) {
    flipWinding(geo);
  }
  repairDegenerateNormals(geo, expectedDir);
  return geo;
}

function createLoftedGrid(
  rows: Array<Array<[number, number, number]>>,
  expectedDir?: THREE.Vector3,
): THREE.BufferGeometry {
  const numRows = rows.length;
  const numCols = rows[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < numRows; r++) {
    const v = numRows > 1 ? r / (numRows - 1) : 0;
    for (let c = 0; c < numCols; c++) {
      const u = numCols > 1 ? c / (numCols - 1) : 0;
      const [x, y, z] = rows[r][c];
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < numRows - 1; r++) {
    for (let c = 0; c < numCols - 1; c++) {
      const a = r * numCols + c;
      const b = a + 1;
      const d = (r + 1) * numCols + c;
      const e = d + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  if (expectedDir) {
    ensureMeanNormalDirection(geo, expectedDir);
  } else {
    repairDegenerateNormals(geo);
  }
  return geo;
}

function makeBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function makeStrut(
  a: THREE.Vector3,
  b: THREE.Vector3,
  widthX: number,
  thickness: number,
): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const g = new THREE.BoxGeometry(widthX, len, thickness);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  g.applyQuaternion(q);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

// ---------------------------------------------------------------------------
// 1. Primary Midnight-Navy Pursuit Body Shell + Two-Tone White Door Panels & Decals
// ---------------------------------------------------------------------------

export interface VcpdBodyAndLiveryGeometries {
  hullBodyShell: THREE.BufferGeometry;
  whiteDoorPanels: THREE.BufferGeometry;
  doorDecals: THREE.BufferGeometry;
}

/**
 * Builds the primary dark midnight-navy interceptor hull, flush white two-tone
 * front+rear door skin panels (classic VCPD black-and-white contrast), and cleanly
 * UV-mapped front door VCPD shield decals.
 */
export function buildVcpdBodyShellGeometry(): VcpdBodyAndLiveryGeometries {
  const zStations = [
    -2.335, -2.295, -2.20, -2.06, -1.90,
    -1.78, -1.67, -1.56, -1.46, -1.35, -1.24, -1.12, -1.00,
    -0.84, -0.78, -0.56, -0.24, 0.12, 0.48, 0.82, 0.98,
    1.12, 1.24, 1.36, 1.46, 1.56, 1.67, 1.78, 1.90,
    2.08, 2.22, 2.31, 2.355,
  ];

  const rightRows: Array<Array<[number, number, number]>> = [];
  const leftRows: Array<Array<[number, number, number]>> = [];
  const topRows: Array<Array<[number, number, number]>> = [];

  for (const z of zStations) {
    const s = evaluateVcpdBodySection(z);
    const inCabin = s.cabinOpenHalfWidth > 0.04;

    const rCol: Array<[number, number, number]> = [
      [s.halfWidthLower * 0.9, s.sillY, z],
      [s.halfWidthLower, s.sillY + 0.034, z],
      [s.halfWidthMid, s.lowerBeltY, z],
      [s.halfWidthMid * 0.992, s.beltY - 0.048, z],
      [s.halfWidthBelt, s.beltY, z],
      [s.halfWidthBelt - 0.048, s.deckY, z],
    ];
    rightRows.push(rCol);
    leftRows.push(rCol.map(([x, y, zz]) => [-x, y, zz]));

    const outerX = s.halfWidthBelt - 0.048;
    const innerX = inCabin ? Math.max(0.12, s.cabinOpenHalfWidth) : outerX * 0.45;
    const centerY = inCabin ? s.beltY - 0.15 : s.centerDeckY;
    const midY = inCabin ? s.beltY - 0.026 : (s.deckY + s.centerDeckY) * 0.5 + 0.008;

    topRows.push([
      [-outerX, s.deckY, z],
      [-innerX, midY, z],
      [0, centerY, z],
      [innerX, midY, z],
      [outerX, s.deckY, z],
    ]);
  }

  const rightSide = createLoftedGrid(rightRows, new THREE.Vector3(1, 0, 0));
  const leftSide = createLoftedGrid(leftRows, new THREE.Vector3(-1, 0, 0));
  const topDeck = createLoftedGrid(topRows, new THREE.Vector3(0, 1, 0));

  // Front nose bumper cap at z = -2.335 (normal -Z)
  const sf = evaluateVcpdBodySection(-2.335);
  const frontRows: Array<Array<[number, number, number]>> = [];
  const fYLevels = [
    sf.sillY,
    sf.sillY + 0.055,
    sf.lowerBeltY,
    sf.beltY - 0.045,
    sf.beltY,
    sf.deckY,
  ];
  const fWidths = [
    sf.halfWidthLower * 0.9,
    sf.halfWidthLower,
    sf.halfWidthMid,
    sf.halfWidthMid * 0.992,
    sf.halfWidthBelt,
    sf.halfWidthBelt - 0.048,
  ];
  for (let i = 0; i < fYLevels.length; i++) {
    const hw = fWidths[i];
    const y = fYLevels[i];
    const zProtrude = -2.335 - Math.sin((i / (fYLevels.length - 1)) * Math.PI) * 0.02;
    frontRows.push([
      [-hw, y, -2.335],
      [-hw * 0.48, y, zProtrude],
      [0, y + (i === fYLevels.length - 1 ? sf.centerDeckY - sf.deckY : 0), zProtrude - 0.006],
      [hw * 0.48, y, zProtrude],
      [hw, y, -2.335],
    ]);
  }
  const frontCap = createLoftedGrid(frontRows, new THREE.Vector3(0, 0, -1));

  // Rear tail bumper & trunk cap at z = +2.355 (normal +Z)
  const sr = evaluateVcpdBodySection(2.355);
  const rearRows: Array<Array<[number, number, number]>> = [];
  const rYLevels = [
    sr.sillY,
    sr.sillY + 0.055,
    sr.lowerBeltY,
    sr.beltY - 0.045,
    sr.beltY,
    sr.deckY,
  ];
  const rWidths = [
    sr.halfWidthLower * 0.9,
    sr.halfWidthLower,
    sr.halfWidthMid,
    sr.halfWidthMid * 0.992,
    sr.halfWidthBelt,
    sr.halfWidthBelt - 0.048,
  ];
  for (let i = 0; i < rYLevels.length; i++) {
    const hw = rWidths[i];
    const y = rYLevels[i];
    const zOut = 2.355 + Math.sin((i / (rYLevels.length - 1)) * Math.PI) * 0.014;
    rearRows.push([
      [-hw, y, 2.355],
      [-hw * 0.5, y, zOut],
      [0, y + (i === rYLevels.length - 1 ? sr.centerDeckY - sr.deckY : 0), zOut + 0.005],
      [hw * 0.5, y, zOut],
      [hw, y, 2.355],
    ]);
  }
  const rearCap = createLoftedGrid(rearRows, new THREE.Vector3(0, 0, 1));

  // Sculpted crisp patrol white two-tone door cladding panels (z from -0.74 to +0.96)
  // Conform directly to evaluateVcpdBodySection with +5mm pride to eliminate z-fighting
  const doorZStations = [-0.74, -0.56, -0.24, 0.12, 0.48, 0.78, 0.96];
  const whiteDoorParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const dRows: Array<Array<[number, number, number]>> = [];
    for (const z of doorZStations) {
      const s = evaluateVcpdBodySection(z);
      const offset = 0.0055 * side;
      dRows.push([
        [s.halfWidthLower * side + offset * 0.8, s.sillY + 0.05, z],
        [s.halfWidthMid * side + offset, s.lowerBeltY, z],
        [s.halfWidthMid * 0.992 * side + offset, s.beltY - 0.048, z],
        [s.halfWidthBelt * side + offset * 0.9, s.beltY - 0.008, z],
      ]);
    }
    whiteDoorParts.push(createLoftedGrid(dRows, new THREE.Vector3(side, 0, 0)));
  }

  // Front door VCPD badge & patrol stripe decals on both left and right front doors
  const decalParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const dFrontZ = -0.56;
    const dRearZ = 0.14;
    const sF = evaluateVcpdBodySection(dFrontZ);
    const sR = evaluateVcpdBodySection(dRearZ);
    const decalOffset = 0.009 * side;

    const rFBot = sF.lowerBeltY + 0.055;
    const rFTop = sF.beltY - 0.042;
    const rRBot = sR.lowerBeltY + 0.055;
    const rRTop = sR.beltY - 0.042;

    const xFBot = sF.halfWidthMid * side + decalOffset;
    const xFTop = sF.halfWidthMid * 0.992 * side + decalOffset;
    const xRBot = sR.halfWidthMid * side + decalOffset;
    const xRTop = sR.halfWidthMid * 0.992 * side + decalOffset;

    const geo = new THREE.BufferGeometry();
    // Side-aware U ordering so "VCPD" text reads left-to-right from outside on BOTH sides
    if (side < 0) {
      // Looking at -X (driver) side from outside: screen-left is -Z (dFrontZ), screen-right is +Z (dRearZ)
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            xFBot, rFBot, dFrontZ,
            xRBot, rRBot, dRearZ,
            xFTop, rFTop, dFrontZ,
            xRTop, rRTop, dRearZ,
          ],
          3,
        ),
      );
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      geo.setIndex([0, 2, 1, 1, 2, 3]);
    } else {
      // Looking at +X (passenger) side from outside: screen-left is +Z (dRearZ), screen-right is -Z (dFrontZ)
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            xRBot, rRBot, dRearZ,
            xFBot, rFBot, dFrontZ,
            xRTop, rRTop, dRearZ,
            xFTop, rFTop, dFrontZ,
          ],
          3,
        ),
      );
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      geo.setIndex([0, 2, 1, 1, 2, 3]);
    }
    ensureMeanNormalDirection(geo, new THREE.Vector3(side, 0, 0));
    decalParts.push(geo);
  }

  return {
    hullBodyShell: mergeGeometries([rightSide, leftSide, topDeck, frontCap, rearCap]),
    whiteDoorPanels: mergeGeometries(whiteDoorParts),
    doorDecals: mergeGeometries(decalParts),
  };
}

// ---------------------------------------------------------------------------
// 2. Solid 3D White Patrol Roof Slab + Perimeter Skirts + Contoured Dark Headliner
// ---------------------------------------------------------------------------

export interface VcpdRoofGeometries {
  whiteRoof: THREE.BufferGeometry;
  roofEdges: THREE.BufferGeometry;
  roofHeadliner: THREE.BufferGeometry;
}

export function buildVcpdRoofGeometry(): VcpdRoofGeometries {
  const zSamples = [-0.22, -0.04, 0.16, 0.36, 0.56, 0.74, 0.92];
  const rows: Array<Array<[number, number, number]>> = [];
  const headlinerRows: Array<Array<[number, number, number]>> = [];
  const lipDrop = 0.032;

  for (const z of zSamples) {
    const rail = sampleVcpdRoofRail(z);
    const hw = rail.halfWidth;
    const midY = (rail.y + rail.crownY) * 0.5 + 0.004;
    rows.push([
      [-hw, rail.y, z],
      [-hw * 0.52, midY, z],
      [0, rail.crownY, z],
      [hw * 0.52, midY, z],
      [hw, rail.y, z],
    ]);

    headlinerRows.push([
      [-hw - 0.004, rail.y - lipDrop, z],
      [-hw * 0.52, midY - lipDrop, z],
      [0, rail.crownY - lipDrop, z],
      [hw * 0.52, midY - lipDrop, z],
      [hw + 0.004, rail.y - lipDrop, z],
    ]);
  }

  const whiteRoof = createLoftedGrid(rows, new THREE.Vector3(0, 1, 0));
  const roofHeadliner = createLoftedGrid(headlinerRows, new THREE.Vector3(0, -1, 0));

  const edgeParts: THREE.BufferGeometry[] = [];
  const leftSkirtRows: Array<Array<[number, number, number]>> = [];
  const rightSkirtRows: Array<Array<[number, number, number]>> = [];
  for (const z of zSamples) {
    const rail = sampleVcpdRoofRail(z);
    leftSkirtRows.push([
      [-rail.halfWidth, rail.y, z],
      [-rail.halfWidth - 0.006, rail.y - lipDrop, z],
    ]);
    rightSkirtRows.push([
      [rail.halfWidth, rail.y, z],
      [rail.halfWidth + 0.006, rail.y - lipDrop, z],
    ]);
  }
  edgeParts.push(
    createLoftedGrid(leftSkirtRows, new THREE.Vector3(-1, 0, 0)),
    createLoftedGrid(rightSkirtRows, new THREE.Vector3(1, 0, 0)),
  );

  const rf = sampleVcpdRoofRail(-0.22);
  const frontSkirt = createLoftedGrid(
    [
      [
        [-rf.halfWidth, rf.y, -0.22],
        [-rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5, -0.22],
        [0, rf.crownY, -0.22],
        [rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5, -0.22],
        [rf.halfWidth, rf.y, -0.22],
      ],
      [
        [-rf.halfWidth, rf.y - lipDrop, -0.224],
        [-rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5 - lipDrop, -0.224],
        [0, rf.crownY - lipDrop, -0.224],
        [rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5 - lipDrop, -0.224],
        [rf.halfWidth, rf.y - lipDrop, -0.224],
      ],
    ],
    new THREE.Vector3(0, 0, -1),
  );

  const rr = sampleVcpdRoofRail(0.92);
  const rearSkirt = createLoftedGrid(
    [
      [
        [-rr.halfWidth, rr.y, 0.92],
        [-rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5, 0.92],
        [0, rr.crownY, 0.92],
        [rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5, 0.92],
        [rr.halfWidth, rr.y, 0.92],
      ],
      [
        [-rr.halfWidth, rr.y - lipDrop, 0.924],
        [-rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5 - lipDrop, 0.924],
        [0, rr.crownY - lipDrop, 0.924],
        [rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5 - lipDrop, 0.924],
        [rr.halfWidth, rr.y - lipDrop, 0.924],
      ],
    ],
    new THREE.Vector3(0, 0, 1),
  );

  edgeParts.push(frontSkirt, rearSkirt);

  return {
    whiteRoof,
    roofEdges: mergeGeometries(edgeParts),
    roofHeadliner,
  };
}

// ---------------------------------------------------------------------------
// 3. Curved Transparent Pursuit Glass (Windshield, Rear Glass, Side Windows)
// ---------------------------------------------------------------------------

export interface VcpdGlassGeometries {
  windshield: THREE.BufferGeometry;
  rearGlass: THREE.BufferGeometry;
  sideWindowL: THREE.BufferGeometry;
  sideWindowR: THREE.BufferGeometry;
  sideWindowsMerged: THREE.BufferGeometry;
}

export function buildVcpdGlassGeometry(): VcpdGlassGeometries {
  const cowl = evaluateVcpdBodySection(-0.78);
  const rf = sampleVcpdRoofRail(-0.22);
  const wsRows: Array<Array<[number, number, number]>> = [];
  const wsSteps = 4;
  for (let i = 0; i <= wsSteps; i++) {
    const t = i / wsSteps;
    const zBase = -0.78 * (1 - t) + -0.22 * t;
    const yEdge = (cowl.deckY - 0.006) * (1 - t) + (rf.y - 0.008) * t;
    const hw = (cowl.halfWidthBelt - 0.072) * (1 - t) + (rf.halfWidth - 0.012) * t;
    const bowZ = -0.038 * (1 - t * 0.35);
    const crownLift = 0.014 * t + 0.006;
    wsRows.push([
      [-hw, yEdge, zBase],
      [-hw * 0.5, yEdge + crownLift * 0.72, zBase + bowZ * 0.75],
      [0, yEdge + crownLift, zBase + bowZ],
      [hw * 0.5, yEdge + crownLift * 0.72, zBase + bowZ * 0.75],
      [hw, yEdge, zBase],
    ]);
  }
  const windshield = createLoftedGrid(wsRows, new THREE.Vector3(0, 0.65, -0.76));

  const rr = sampleVcpdRoofRail(0.92);
  const trunk = evaluateVcpdBodySection(1.36);
  const rgRows: Array<Array<[number, number, number]>> = [];
  const rgSteps = 4;
  for (let i = 0; i <= rgSteps; i++) {
    const t = i / rgSteps;
    const zBase = 0.92 * (1 - t) + 1.36 * t;
    const yEdge = (rr.y - 0.008) * (1 - t) + (trunk.deckY - 0.004) * t;
    const hw = (rr.halfWidth - 0.012) * (1 - t) + (trunk.halfWidthBelt - 0.075) * t;
    const bowZ = 0.032 * (0.65 + t * 0.35);
    const crownLift = 0.013 * (1 - t) + 0.005;
    rgRows.push([
      [-hw, yEdge, zBase],
      [-hw * 0.5, yEdge + crownLift * 0.7, zBase + bowZ * 0.75],
      [0, yEdge + crownLift, zBase + bowZ],
      [hw * 0.5, yEdge + crownLift * 0.7, zBase + bowZ * 0.75],
      [hw, yEdge, zBase],
    ]);
  }
  const rearGlass = createLoftedGrid(rgRows, new THREE.Vector3(0, 0.62, 0.78));

  const buildSideWindow = (side: -1 | 1): THREE.BufferGeometry => {
    const zPairs: Array<{ zBot: number; zTop: number }> = [
      { zBot: -0.72, zTop: -0.21 },
      { zBot: -0.36, zTop: 0.02 },
      { zBot: 0.02, zTop: 0.28 },
      { zBot: 0.44, zTop: 0.56 },
      { zBot: 0.88, zTop: 0.78 },
      { zBot: 1.28, zTop: 0.91 },
    ];

    const rows: Array<Array<[number, number, number]>> = [];
    for (const pair of zPairs) {
      const botSec = evaluateVcpdBodySection(pair.zBot);
      const topRail = sampleVcpdRoofRail(pair.zTop);
      const botX = (botSec.halfWidthBelt - 0.056) * side;
      const topX = (topRail.halfWidth - 0.014) * side;
      const botY = botSec.deckY - 0.006;
      const topY = topRail.y - 0.012;

      const midX = (botX + topX) * 0.5 + 0.014 * side;
      const midY = (botY + topY) * 0.5;
      const midZ = (pair.zBot + pair.zTop) * 0.5;

      rows.push([
        [botX, botY, pair.zBot],
        [midX, midY, midZ],
        [topX, topY, pair.zTop],
      ]);
    }

    return createLoftedGrid(rows, new THREE.Vector3(side, 0.2, 0));
  };

  const sideWindowL = buildSideWindow(-1);
  const sideWindowR = buildSideWindow(1);
  const sideWindowsMerged = mergeGeometries([sideWindowL, sideWindowR]);

  return {
    windshield,
    rearGlass,
    sideWindowL,
    sideWindowR,
    sideWindowsMerged,
  };
}

// ---------------------------------------------------------------------------
// 4. Pursuit Pillars & Tactical Window Trim
// ---------------------------------------------------------------------------

export interface VcpdPillarGeometries {
  paintedPillars: THREE.BufferGeometry;
  darkPillarsAndTrim: THREE.BufferGeometry;
}

export function buildVcpdPillarsGeometry(): VcpdPillarGeometries {
  const paintedParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];

  const cowl = evaluateVcpdBodySection(-0.77);
  const rf = sampleVcpdRoofRail(-0.22);
  const rr = sampleVcpdRoofRail(0.92);
  const trunk = evaluateVcpdBodySection(1.35);
  const bBot = evaluateVcpdBodySection(0.28);
  const bTop = sampleVcpdRoofRail(0.28);

  for (const side of [-1, 1] as const) {
    // Structural A-pillar tucked cleanly under roof header & cowl
    const aBot = new THREE.Vector3((cowl.halfWidthBelt - 0.064) * side, cowl.deckY - 0.008, -0.77);
    const aTop = new THREE.Vector3((rf.halfWidth - 0.022) * side, rf.y - 0.024, -0.195);
    paintedParts.push(makeStrut(aBot, aTop, 0.056, 0.05));

    // Muscular fastback C-pillar tucked cleanly beneath trailing white roof cap
    const cBot = new THREE.Vector3((trunk.halfWidthBelt - 0.064) * side, trunk.deckY - 0.008, 1.33);
    const cTop = new THREE.Vector3((rr.halfWidth - 0.014) * side, rr.y - 0.018, 0.905);
    paintedParts.push(makeStrut(cBot, cTop, 0.084, 0.112));

    // Reinforced gloss-black B-pillar divider + protective center door frame bar
    const bBotV = new THREE.Vector3((bBot.halfWidthBelt - 0.05) * side, bBot.deckY - 0.005, 0.28);
    const bTopV = new THREE.Vector3((bTop.halfWidth - 0.01) * side, bTop.y - 0.01, 0.28);
    darkParts.push(makeStrut(bBotV, bTopV, 0.048, 0.068));

    // Lower satin-black tactical beltline window trim
    const zBelt = [-0.72, -0.22, 0.28, 0.78, 1.28];
    for (let i = 0; i < zBelt.length - 1; i++) {
      const s0 = evaluateVcpdBodySection(zBelt[i]);
      const s1 = evaluateVcpdBodySection(zBelt[i + 1]);
      const p0 = new THREE.Vector3((s0.halfWidthBelt - 0.046) * side, s0.deckY + 0.002, zBelt[i]);
      const p1 = new THREE.Vector3((s1.halfWidthBelt - 0.046) * side, s1.deckY + 0.002, zBelt[i + 1]);
      darkParts.push(makeStrut(p0, p1, 0.024, 0.022));
    }

    // Dark drip rail channel along roof edges
    const zRoof = [-0.22, 0.16, 0.54, 0.92];
    for (let i = 0; i < zRoof.length - 1; i++) {
      const r0 = sampleVcpdRoofRail(zRoof[i]);
      const r1 = sampleVcpdRoofRail(zRoof[i + 1]);
      const p0 = new THREE.Vector3((r0.halfWidth - 0.002) * side, r0.y - 0.008, zRoof[i]);
      const p1 = new THREE.Vector3((r1.halfWidth - 0.002) * side, r1.y - 0.008, zRoof[i + 1]);
      darkParts.push(makeStrut(p0, p1, 0.018, 0.018));
    }
  }

  return {
    paintedPillars: mergeGeometries(paintedParts),
    darkPillarsAndTrim: mergeGeometries(darkParts),
  };
}

// ---------------------------------------------------------------------------
// 5. Front Pursuit Fascia: Heavy-Duty Push-Bar, Wide Pursuit Grille & Headlights
// ---------------------------------------------------------------------------

export interface VcpdFrontFasciaGeometries {
  grilleAndPushBarDark: THREE.BufferGeometry;
  grilleChromeAccent: THREE.BufferGeometry;
  hlHousings: THREE.BufferGeometry;
  hlEmissiveOptics: THREE.BufferGeometry;
  hlAmberMarkers: THREE.BufferGeometry;
  hlClearLenses: THREE.BufferGeometry;
}

export function buildVcpdFrontFasciaGeometry(): VcpdFrontFasciaGeometries {
  const darkParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];
  const hlHousings: THREE.BufferGeometry[] = [];
  const hlOptics: THREE.BufferGeometry[] = [];
  const hlAmber: THREE.BufferGeometry[] = [];
  const hlLens: THREE.BufferGeometry[] = [];

  // Aggressive wide blacked-out pursuit grille recess (front nose surface sits around z = -2.335..-2.361)
  darkParts.push(makeBox(1.02, 0.2, 0.065, 0, 0.59, -2.346));
  darkParts.push(makeBox(1.06, 0.022, 0.072, 0, 0.692, -2.352));
  darkParts.push(makeBox(0.94, 0.022, 0.072, 0, 0.492, -2.354));
  // Horizontal tactical grille bars
  darkParts.push(makeBox(0.98, 0.016, 0.055, 0, 0.635, -2.36));
  darkParts.push(makeBox(0.95, 0.016, 0.055, 0, 0.585, -2.362));
  darkParts.push(makeBox(0.92, 0.016, 0.055, 0, 0.535, -2.36));

  // Twin chrome patrol grille chevron accents + subtle interceptor shield emblem
  chromeParts.push(makeBox(0.82, 0.016, 0.028, 0, 0.59, -2.368));
  const shield = new THREE.CylinderGeometry(0.042, 0.036, 0.026, 6);
  shield.rotateX(Math.PI / 2);
  shield.translate(0, 0.59, -2.374);
  chromeParts.push(shield);

  // Lower interceptor air intake & twin brake-cooling ducts
  darkParts.push(makeBox(1.22, 0.125, 0.06, 0, 0.345, -2.34));
  for (const side of [-1, 1] as const) {
    darkParts.push(makeBox(0.22, 0.095, 0.055, side * 0.68, 0.375, -2.312, 0, -side * 0.24, 0));
  }
  // Tactical lower chin splitter
  darkParts.push(makeBox(1.48, 0.034, 0.14, 0, 0.248, -2.285));

  // Heavy-Duty Law Enforcement Tubular Front Push-Bar / PIT Bumper
  // Anchored into bumper reinforcement rails; forward face sits cleanly at -2.375m (spec length = 4.75m!)
  for (const side of [-1, 1] as const) {
    const ux = side * 0.36;
    // Vertical steel upright stanchions + thick rubberized PIT bumper face pads
    darkParts.push(makeBox(0.055, 0.34, 0.075, ux, 0.51, -2.372));
    darkParts.push(makeBox(0.068, 0.28, 0.028, ux, 0.515, -2.404));
    // Lower mounting bracket extending firmly into nose hull
    darkParts.push(makeBox(0.06, 0.06, 0.15, ux, 0.355, -2.32));
    // Side headlight wraparound steel brush guard tubes
    darkParts.push(makeBox(0.32, 0.028, 0.032, side * 0.54, 0.625, -2.356, 0, -side * 0.16, 0));
    darkParts.push(makeBox(0.30, 0.028, 0.032, side * 0.53, 0.455, -2.356, 0, -side * 0.16, 0));
    darkParts.push(makeBox(0.034, 0.195, 0.034, side * 0.67, 0.54, -2.326, 0, -side * 0.18, 0));
  }
  // Upper & center tubular horizontal steel crossbars
  darkParts.push(makeBox(0.76, 0.034, 0.036, 0, 0.665, -2.374));
  darkParts.push(makeBox(0.76, 0.036, 0.038, 0, 0.455, -2.378));
  // Integrated push-bar siren speaker horn box
  darkParts.push(makeBox(0.18, 0.07, 0.065, 0, 0.52, -2.37));

  // Swept Dual-Projector Pursuit Headlights (proud of front nose cap so LED optics & DRL read crisply)
  for (const side of [-1, 1] as const) {
    const yaw = -side * 0.16;
    const xOuter = side * 0.68;
    const yLamp = 0.655;
    const zLamp = -2.315;

    hlHousings.push(makeBox(0.32, 0.104, 0.07, xOuter, yLamp, zLamp, 0, yaw, 0));
    hlOptics.push(makeBox(0.088, 0.054, 0.032, side * 0.615, yLamp + 0.007, -2.360, 0, yaw, 0));
    hlOptics.push(makeBox(0.082, 0.050, 0.032, side * 0.725, yLamp + 0.009, -2.350, 0, yaw, 0));
    // Crisp high-intensity pursuit LED eyebrow blade
    hlOptics.push(makeBox(0.24, 0.018, 0.030, side * 0.675, yLamp - 0.033, -2.358, 0, yaw, 0));

    hlAmber.push(makeBox(0.044, 0.040, 0.048, side * 0.835, yLamp + 0.004, -2.272, 0, -side * 0.42, 0));
    hlLens.push(makeBox(0.33, 0.108, 0.012, side * 0.684, yLamp, -2.374, 0, yaw, 0));
  }

  return {
    grilleAndPushBarDark: mergeGeometries(darkParts),
    grilleChromeAccent: mergeGeometries(chromeParts),
    hlHousings: mergeGeometries(hlHousings),
    hlEmissiveOptics: mergeGeometries(hlOptics),
    hlAmberMarkers: mergeGeometries(hlAmber),
    hlClearLenses: mergeGeometries(hlLens),
  };
}

// ---------------------------------------------------------------------------
// 6. Aerodynamic Roof Emergency Lightbar + Auxiliary Grille Strobes
// ---------------------------------------------------------------------------

export interface VcpdLightbarGeometries {
  barBaseAndHousing: THREE.BufferGeometry;
  redEmitters: THREE.BufferGeometry;
  blueEmitters: THREE.BufferGeometry;
  clearOuterDome: THREE.BufferGeometry;
  whiteTakedowns: THREE.BufferGeometry;
}

export function buildVcpdLightbarGeometry(): VcpdLightbarGeometries {
  const darkParts: THREE.BufferGeometry[] = [];
  const redParts: THREE.BufferGeometry[] = [];
  const blueParts: THREE.BufferGeometry[] = [];
  const domeParts: THREE.BufferGeometry[] = [];
  const whiteParts: THREE.BufferGeometry[] = [];

  // Seated cleanly atop the white roof slab (roof crown ~1.454 at z = 0.22)
  const baseZ = 0.22;
  const roofMountY = 1.434;

  // Low-profile extruded tactical aluminum base frame + dual roof gutter feet
  darkParts.push(makeBox(1.26, 0.032, 0.28, 0, roofMountY + 0.028, baseZ));
  for (const side of [-1, 1] as const) {
    darkParts.push(makeBox(0.095, 0.052, 0.22, side * 0.58, roofMountY - 0.008, baseZ, 0, 0, -side * 0.16));
  }

  // Center tactical black speaker / takedown bridge divider
  darkParts.push(makeBox(0.22, 0.088, 0.25, 0, roofMountY + 0.072, baseZ));
  // Center white forward takedown work-lamps
  whiteParts.push(makeBox(0.14, 0.044, 0.03, 0, roofMountY + 0.072, baseZ - 0.128));

  // Left (-X) Multi-Pod Red Emergency Emitters + End Alley Cap
  redParts.push(makeBox(0.42, 0.068, 0.18, -0.35, roofMountY + 0.072, baseZ));
  redParts.push(makeBox(0.055, 0.062, 0.13, -0.58, roofMountY + 0.072, baseZ));

  // Right (+X) Multi-Pod Blue Emergency Emitters + End Alley Cap
  blueParts.push(makeBox(0.42, 0.068, 0.18, 0.35, roofMountY + 0.072, baseZ));
  blueParts.push(makeBox(0.055, 0.062, 0.13, 0.58, roofMountY + 0.072, baseZ));

  // Auxiliary Push-Bar Grille Alternating Strobe Pods (highly visible head-on in pursuit!)
  redParts.push(makeBox(0.11, 0.04, 0.032, -0.22, 0.62, -2.376));
  blueParts.push(makeBox(0.11, 0.04, 0.032, 0.22, 0.62, -2.376));

  // Auxiliary Rear Deck Window Flasher Strip (highly visible from behind during chases!)
  redParts.push(makeBox(0.24, 0.032, 0.04, -0.22, 1.07, 1.21));
  blueParts.push(makeBox(0.24, 0.032, 0.04, 0.22, 1.07, 1.21));

  // Sleek aerodynamic polycarbonate outer lightbar shells enclosing Left Red & Right Blue wings
  domeParts.push(makeBox(0.50, 0.092, 0.24, -0.36, roofMountY + 0.076, baseZ));
  domeParts.push(makeBox(0.50, 0.092, 0.24, 0.36, roofMountY + 0.076, baseZ));

  return {
    barBaseAndHousing: mergeGeometries(darkParts),
    redEmitters: mergeGeometries(redParts),
    blueEmitters: mergeGeometries(blueParts),
    clearOuterDome: mergeGeometries(domeParts),
    whiteTakedowns: mergeGeometries(whiteParts),
  };
}

// ---------------------------------------------------------------------------
// 7. Rear Pursuit Fascia: Wraparound Ruby Taillights, Spoiler Lip, Plate & Dual Exhausts
// ---------------------------------------------------------------------------

export interface VcpdRearFasciaGeometries {
  taillightEmissive: THREE.BufferGeometry;
  rearDarkValance: THREE.BufferGeometry;
  rearChromeAccent: THREE.BufferGeometry;
  licensePlate: THREE.BufferGeometry;
}

export function buildVcpdRearFasciaGeometry(): VcpdRearFasciaGeometries {
  const tailParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    // Smoked rear lamp surround housing
    darkParts.push(makeBox(0.42, 0.12, 0.068, side * 0.60, 0.80, 2.342, 0, side * 0.14, 0));

    // Bold horizontal pursuit taillight blades + side wraparound corners
    tailParts.push(makeBox(0.38, 0.076, 0.038, side * 0.595, 0.804, 2.372, 0, side * 0.14, 0));
    tailParts.push(makeBox(0.04, 0.076, 0.15, side * 0.83, 0.80, 2.285, 0, side * 0.2, 0));

    // Lower bumper safety reflector
    tailParts.push(makeBox(0.16, 0.025, 0.024, side * 0.64, 0.37, 2.364, 0, side * 0.12, 0));

    // Twin dual-bore chrome pursuit exhaust outlets (left & right!)
    for (const dx of [-0.046, 0.046]) {
      const exX = side * 0.58 + dx;
      const exhaustOuter = new THREE.CylinderGeometry(0.034, 0.036, 0.12, 12);
      exhaustOuter.rotateX(Math.PI / 2);
      exhaustOuter.translate(exX, 0.268, 2.338);
      chromeParts.push(exhaustOuter);

      const exhaustInner = new THREE.CylinderGeometry(0.026, 0.026, 0.04, 10);
      exhaustInner.rotateX(Math.PI / 2);
      exhaustInner.translate(exX, 0.268, 2.382);
      darkParts.push(exhaustInner);
    }
  }

  // Low-drag matte-black pursuit trunk deck spoiler lip
  darkParts.push(makeBox(1.42, 0.032, 0.095, 0, 0.96, 2.28, -0.06, 0, 0));

  // Smoked rear trunk panel trim + recessed license cove
  darkParts.push(makeBox(0.58, 0.045, 0.028, 0, 0.80, 2.368));
  darkParts.push(makeBox(0.42, 0.165, 0.03, 0, 0.595, 2.364));

  // Sculpted lower rear pursuit diffuser valance
  darkParts.push(makeBox(1.38, 0.14, 0.085, 0, 0.32, 2.326));
  for (const fx of [-0.3, 0, 0.3]) {
    darkParts.push(makeBox(0.024, 0.09, 0.075, fx, 0.29, 2.346));
  }

  // Trunk subtle chrome VCPD badge garnish bar
  chromeParts.push(makeBox(0.46, 0.016, 0.024, 0, 0.74, 2.374));

  const licensePlate = new THREE.PlaneGeometry(0.35, 0.155);
  licensePlate.translate(0, 0.595, 2.382);

  return {
    taillightEmissive: mergeGeometries(tailParts),
    rearDarkValance: mergeGeometries(darkParts),
    rearChromeAccent: mergeGeometries(chromeParts),
    licensePlate,
  };
}

// ---------------------------------------------------------------------------
// 8. Tactical Exterior Details (A-Pillar Spotlight, Mirrors, Handles, Liners, Antennas)
// ---------------------------------------------------------------------------

export interface VcpdExteriorDetailsGeometries {
  paintedDetails: THREE.BufferGeometry;
  whiteHandleDetails: THREE.BufferGeometry;
  darkTrimAndUnderbody: THREE.BufferGeometry;
  chromeSpotlightAndAccents: THREE.BufferGeometry;
  spotlightLens: THREE.BufferGeometry;
  panelSeams: THREE.BufferGeometry;
}

export function buildVcpdExteriorDetailsGeometry(): VcpdExteriorDetailsGeometries {
  const paintedParts: THREE.BufferGeometry[] = [];
  const whiteParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];
  const seamParts: THREE.BufferGeometry[] = [];

  const mirrorSec = evaluateVcpdBodySection(-0.6);
  const fHandleSec = evaluateVcpdBodySection(-0.08);
  const rHandleSec = evaluateVcpdBodySection(0.72);

  for (const side of [-1, 1] as const) {
    // Wing mirrors (midnight dark patrol finish)
    const mBaseX = (mirrorSec.halfWidthBelt - 0.02) * side;
    const mY = mirrorSec.beltY + 0.056;
    darkParts.push(makeBox(0.08, 0.04, 0.062, mBaseX + side * 0.025, mY - 0.012, -0.6));
    paintedParts.push(
      makeBox(0.145, 0.082, 0.1, mBaseX + side * 0.086, mY + 0.016, -0.585, 0, -side * 0.12, 0),
    );

    // Tactical dark door handles recessed subtly against the crisp white door skins
    darkParts.push(
      makeBox(0.025, 0.028, 0.12, (fHandleSec.halfWidthMid + 0.014) * side, fHandleSec.beltY - 0.072, -0.06),
    );
    darkParts.push(
      makeBox(0.025, 0.028, 0.12, (rHandleSec.halfWidthMid + 0.014) * side, rHandleSec.beltY - 0.072, 0.72),
    );

    // Subtle heavy-duty side rocker skirts
    darkParts.push(
      makeBox(0.045, 0.062, 2.02, side * 0.94, VCPD_INTERCEPTOR_DIMS.groundClearance + 0.026, 0.0),
    );

    // Arched dark wheel-well liners + inner circular backing (tucked cleanly behind fender arch lip)
    for (const [axleZ, archR] of [
      [VCPD_INTERCEPTOR_DIMS.frontAxleZ, VCPD_INTERCEPTOR_DIMS.frontArchRadius],
      [VCPD_INTERCEPTOR_DIMS.rearAxleZ, VCPD_INTERCEPTOR_DIMS.rearArchRadius],
    ] as const) {
      const rLiner = archR + 0.016;
      const liner = new THREE.CylinderGeometry(
        rLiner,
        rLiner,
        0.42,
        16,
        1,
        true,
        0,
        Math.PI,
      );
      liner.rotateZ(Math.PI / 2);
      flipWinding(liner);
      liner.translate(side * 0.76, VCPD_INTERCEPTOR_DIMS.wheelRadius, axleZ);
      liner.computeVertexNormals();
      darkParts.push(liner);

      const innerWell = new THREE.CircleGeometry(rLiner, 14, 0, Math.PI);
      innerWell.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
      innerWell.translate(side * 0.56, VCPD_INTERCEPTOR_DIMS.wheelRadius, axleZ);
      innerWell.computeVertexNormals();
      darkParts.push(innerWell);

      // Seal the lower rear/front corners between wheel center height and sill ground clearance
      const sealH = VCPD_INTERCEPTOR_DIMS.wheelRadius - VCPD_INTERCEPTOR_DIMS.groundClearance;
      darkParts.push(
        makeBox(
          0.02,
          sealH,
          rLiner * 1.92,
          side * 0.56,
          VCPD_INTERCEPTOR_DIMS.groundClearance + sealH * 0.5,
          axleZ,
        ),
      );
    }

    // Crisp vertical door shut-lines
    for (const seamZ of [-0.74, 0.28, 0.96]) {
      const sec = evaluateVcpdBodySection(seamZ);
      const seamH = sec.beltY - sec.sillY - 0.095;
      seamParts.push(
        makeBox(
          0.008,
          Math.max(0.26, seamH),
          0.009,
          (sec.halfWidthMid + 0.008) * side,
          sec.sillY + 0.042 + seamH * 0.5,
          seamZ,
        ),
      );
    }
  }

  // Driver-Side (-X) A-Pillar Articulated Pursuit Spotlight
  const cowlSpot = evaluateVcpdBodySection(-0.74);
  const spotX = -(cowlSpot.halfWidthBelt - 0.025);
  const spotY = cowlSpot.deckY + 0.095;
  const spotZ = -0.73;
  // Spotlight swivel stalk
  chromeParts.push(makeBox(0.088, 0.024, 0.024, spotX - 0.038, spotY - 0.014, spotZ - 0.004, 0, 0, -0.35));
  // Spotlight tapered bullet housing
  const spotBody = new THREE.CylinderGeometry(0.056, 0.038, 0.11, 12);
  spotBody.rotateX(Math.PI / 2);
  spotBody.translate(spotX - 0.068, spotY, spotZ - 0.012);
  darkParts.push(spotBody);
  // Chrome bezel ring around spotlight lens
  const spotBezel = new THREE.CylinderGeometry(0.058, 0.058, 0.022, 12);
  spotBezel.rotateX(Math.PI / 2);
  spotBezel.translate(spotX - 0.068, spotY, spotZ - 0.064);
  chromeParts.push(spotBezel);
  // Forward luminous spotlight face
  const spotlightLens = new THREE.CylinderGeometry(0.048, 0.048, 0.014, 12);
  spotlightLens.rotateX(Math.PI / 2);
  spotlightLens.translate(spotX - 0.068, spotY, spotZ - 0.072);

  // Twin rear tactical radio whip antennas mounted neatly on rear roof edge
  for (const ax of [-0.36, 0.36]) {
    const antBase = new THREE.CylinderGeometry(0.016, 0.022, 0.026, 8);
    antBase.translate(ax, 1.41, 0.86);
    darkParts.push(antBase);
    const whip = new THREE.CylinderGeometry(0.004, 0.008, 0.24, 6);
    whip.rotateX(0.12);
    whip.translate(ax, 1.53, 0.875);
    darkParts.push(whip);
  }

  // Twin recessed hood heat-extractor louvers on power-bulge hood
  for (const side of [-1, 1] as const) {
    darkParts.push(makeBox(0.22, 0.016, 0.28, side * 0.29, 0.935, -1.48, -0.05, 0, 0));
  }

  // Protective dark underbody floorpan tray
  darkParts.push(
    makeBox(1.62, 0.06, 3.94, 0, VCPD_INTERCEPTOR_DIMS.groundClearance + 0.022, 0.0),
  );

  // White trunk VCPD subtle stripe trim on trunk deck edge (optional subtle police accent)
  whiteParts.push(makeBox(1.24, 0.012, 0.036, 0, 0.934, 2.24));

  // Hood & trunk shut-lines
  seamParts.push(makeBox(1.42, 0.008, 0.009, 0, 0.938, -0.80));
  seamParts.push(makeBox(1.34, 0.008, 0.009, 0, 0.94, 1.39));

  return {
    paintedDetails: mergeGeometries(paintedParts),
    whiteHandleDetails: mergeGeometries(whiteParts),
    darkTrimAndUnderbody: mergeGeometries(darkParts),
    chromeSpotlightAndAccents: mergeGeometries(chromeParts),
    spotlightLens,
    panelSeams: mergeGeometries(seamParts),
  };
}

// ---------------------------------------------------------------------------
// 9. Police Cruiser Interior (Patrol Seats, Prisoner Partition Cage & MDC Laptop)
// ---------------------------------------------------------------------------

export interface VcpdInteriorGeometries {
  cabinTub: THREE.BufferGeometry;
  seats: THREE.BufferGeometry;
  dashAndWheel: THREE.BufferGeometry;
  prisonerPartition: THREE.BufferGeometry;
  mdcScreen: THREE.BufferGeometry;
}

export function buildVcpdInteriorGeometry(): VcpdInteriorGeometries {
  const tubParts: THREE.BufferGeometry[] = [];
  const seatParts: THREE.BufferGeometry[] = [];
  const dashParts: THREE.BufferGeometry[] = [];
  const partitionParts: THREE.BufferGeometry[] = [];

  // Heavy-duty vinyl cabin floor, front firewall, center equipment console, rear parcel shelf
  tubParts.push(makeBox(1.48, 0.07, 2.02, 0, 0.35, 0.32));
  tubParts.push(makeBox(0.24, 0.28, 1.18, 0, 0.51, -0.04));
  tubParts.push(makeBox(1.5, 0.5, 0.08, 0, 0.64, -0.71));
  tubParts.push(makeBox(1.44, 0.14, 0.46, 0, 0.85, 1.17));
  for (const side of [-1, 1] as const) {
    tubParts.push(makeBox(0.06, 0.48, 1.94, side * 0.77, 0.64, 0.3));
  }

  // Front pursuit bolstered bucket seats
  for (const side of [-1, 1] as const) {
    const sx = side * 0.36;
    seatParts.push(makeBox(0.48, 0.11, 0.46, sx, 0.48, -0.02));
    seatParts.push(makeBox(0.46, 0.5, 0.11, sx, 0.74, 0.18, 0.16, 0, 0));
    seatParts.push(makeBox(0.21, 0.17, 0.09, sx, 1.07, 0.23, 0.1, 0, 0));
  }

  // Rear molded prisoner bench seat
  seatParts.push(makeBox(1.34, 0.12, 0.45, 0, 0.5, 0.78));
  seatParts.push(makeBox(1.32, 0.48, 0.12, 0, 0.76, 1.0, 0.15, 0, 0));

  // Patrol dashboard, gauge hood & radio console stack
  dashParts.push(makeBox(1.46, 0.23, 0.38, 0, 0.81, -0.53));
  dashParts.push(makeBox(0.4, 0.11, 0.24, -0.36, 0.93, -0.52));
  // Center patrol radio / siren controller bezel + swivel mount arm for MDC laptop
  dashParts.push(makeBox(0.24, 0.2, 0.14, 0, 0.74, -0.36));
  dashParts.push(makeBox(0.036, 0.16, 0.036, 0.1, 0.84, -0.26, 0.25, 0, -0.2));
  // Rugged MDC patrol laptop chassis lid & keyboard deck
  dashParts.push(makeBox(0.28, 0.024, 0.2, 0.14, 0.91, -0.25, 0.06, -0.22, 0));
  dashParts.push(makeBox(0.28, 0.19, 0.022, 0.12, 1.01, -0.33, -0.18, -0.22, 0));

  // Glowing MDC patrol radar / dispatch screen plane angled toward driver
  const mdcScreen = new THREE.PlaneGeometry(0.24, 0.15);
  mdcScreen.rotateX(-0.18);
  mdcScreen.rotateY(-0.22);
  mdcScreen.translate(0.116, 1.01, -0.316);

  // Driver steering column & heavy-duty pursuit steering wheel
  dashParts.push(makeBox(0.062, 0.062, 0.22, -0.36, 0.84, -0.34, -0.22, 0, 0));
  const rim = new THREE.TorusGeometry(0.15, 0.018, 7, 16);
  rim.rotateX(0.26);
  rim.translate(-0.36, 0.87, -0.25);
  dashParts.push(rim);
  dashParts.push(makeBox(0.27, 0.024, 0.024, -0.36, 0.87, -0.25, 0.26, 0, 0));
  dashParts.push(makeBox(0.025, 0.135, 0.024, -0.36, 0.81, -0.24, 0.26, 0, 0));

  // Interior dashcam & rear-view mirror below front header
  dashParts.push(makeBox(0.19, 0.05, 0.035, 0, 1.29, -0.27));

  // Law-Enforcement Prisoner Security Partition Screen (behind front seats at z = 0.36)
  partitionParts.push(makeBox(1.42, 0.38, 0.04, 0, 0.62, 0.38)); // Lower steel divider bulkhead
  partitionParts.push(makeBox(1.38, 0.035, 0.04, 0, 1.29, 0.38)); // Upper frame header
  for (const px of [-0.66, -0.22, 0.22, 0.66]) {
    partitionParts.push(makeBox(0.03, 0.5, 0.035, px, 1.04, 0.38)); // Vertical steel cage stanchions
  }
  for (const py of [0.92, 1.06, 1.18]) {
    partitionParts.push(makeBox(1.34, 0.02, 0.024, 0, py, 0.38)); // Horizontal protective security bars
  }

  return {
    cabinTub: mergeGeometries(tubParts),
    seats: mergeGeometries(seatParts),
    dashAndWheel: mergeGeometries(dashParts),
    prisonerPartition: mergeGeometries(partitionParts),
    mdcScreen,
  };
}

// ---------------------------------------------------------------------------
// 10. Heavy-Duty Pursuit Interceptor Wheels (r = 0.34m, Gunmetal Rim + Chrome Center Cap)
// ---------------------------------------------------------------------------

export interface VcpdWheelParts {
  tireGeo: THREE.BufferGeometry;
  rimGeo: THREE.BufferGeometry;
  chromeCenterCapGeo: THREE.BufferGeometry;
  rotorGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
}

/**
 * Builds heavy-duty pursuit wheels (r = 0.34m, w = 0.25m) matching PoliceSystem's
 * 0.34m wheel spin divisor: wide pursuit rubber, dark gunmetal 6-slot tactical wheel,
 * iconic polished chrome police dog-dish center cap, brake rotor, and pursuit caliper.
 */
export function buildVcpdWheelParts(
  wheelRadius: number = VCPD_INTERCEPTOR_DIMS.wheelRadius,
  wheelWidth: number = VCPD_INTERCEPTOR_DIMS.wheelWidth,
): VcpdWheelParts {
  const halfW = wheelWidth * 0.5;
  const rimR = wheelRadius * 0.63;

  const profile: THREE.Vector2[] = [
    new THREE.Vector2(rimR - 0.008, -halfW * 0.85),
    new THREE.Vector2(rimR + 0.022, -halfW * 0.96),
    new THREE.Vector2(wheelRadius - 0.048, -halfW),
    new THREE.Vector2(wheelRadius - 0.012, -halfW * 0.86),
    new THREE.Vector2(wheelRadius, -halfW * 0.56),
    new THREE.Vector2(wheelRadius, halfW * 0.56),
    new THREE.Vector2(wheelRadius - 0.012, halfW * 0.86),
    new THREE.Vector2(wheelRadius - 0.048, halfW),
    new THREE.Vector2(rimR + 0.022, halfW * 0.96),
    new THREE.Vector2(rimR - 0.008, halfW * 0.85),
  ];
  const tireGeo = new THREE.LatheGeometry(profile, 24);
  tireGeo.rotateZ(-Math.PI / 2);
  tireGeo.computeVertexNormals();

  // Heavy-duty gunmetal 6-lug tactical steelie / 6-spoke pursuit wheel
  const rimParts: THREE.BufferGeometry[] = [];
  const rimLip = new THREE.TorusGeometry(rimR, 0.018, 8, 24);
  rimLip.rotateY(Math.PI / 2);
  rimLip.translate(halfW * 0.72, 0, 0);
  rimParts.push(rimLip);

  const innerBarrel = new THREE.CylinderGeometry(rimR - 0.008, rimR - 0.008, wheelWidth * 0.76, 18, 1, true);
  innerBarrel.rotateZ(Math.PI / 2);
  rimParts.push(innerBarrel);

  // Recessed steelie dish flange + 6 chunky tactical pursuit spokes
  const dishRing = new THREE.TorusGeometry(rimR * 0.56, 0.018, 7, 18);
  dishRing.rotateY(Math.PI / 2);
  dishRing.translate(halfW * 0.54, 0, 0);
  rimParts.push(dishRing);

  const spokeCount = 6;
  const spokeLen = rimR - 0.05;
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.BoxGeometry(0.028, spokeLen, 0.046);
    spoke.translate(halfW * 0.58, spokeLen * 0.5 + 0.042, 0);
    spoke.rotateX(a);
    rimParts.push(spoke);
  }
  const rimGeo = mergeGeometries(rimParts);

  // Iconic bright polished chrome dog-dish pursuit hub cap
  const capBody = new THREE.CylinderGeometry(0.072, 0.088, 0.044, 16);
  capBody.rotateZ(Math.PI / 2);
  capBody.translate(halfW * 0.64, 0, 0);
  const chromeCenterCapGeo = capBody;

  // Heavy-duty ventilated steel brake rotor
  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.02, 18);
  rotorGeo.rotateZ(Math.PI / 2);
  rotorGeo.translate(halfW * 0.18, 0, 0);

  // Heavy-duty pursuit brake caliper
  const caliperGeo = makeBox(0.044, 0.095, 0.068, halfW * 0.24, 0.02, -rimR * 0.58, -0.35, 0, 0);

  return {
    tireGeo,
    rimGeo,
    chromeCenterCapGeo,
    rotorGeo,
    caliperGeo,
  };
}
