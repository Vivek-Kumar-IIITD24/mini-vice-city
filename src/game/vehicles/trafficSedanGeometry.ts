import * as THREE from 'three';

/**
 * Pure parametric geometry builders for the Phase 2C-3A Civilian Traffic Sedan
 * ("City Cruiser", VehicleKind.Traffic).
 *
 * Local coordinate system matches VehicleRig:
 *   +X = right, +Y = up, -Z = forward (nose), +Z = rear (tail).
 * Ground contact plane is y = 0.
 *
 * Kept DOM-free so compact commuter sedan proportions, wheel-arch clearances,
 * lightweight vertex budgets, interior layout, and outward normals can be
 * verified directly under node:test.
 */

export const TRAFFIC_SEDAN_DIMS = {
  length: 4.35,
  width: 1.94,
  height: 1.38,
  wheelRadius: 0.34,
  wheelWidth: 0.23,
  frontAxleZ: -1.34,
  rearAxleZ: 1.34,
  frontTrackHalf: 0.855,
  rearTrackHalf: 0.855,
  frontArchRadius: 0.405,
  rearArchRadius: 0.41,
  cabinStartZ: -0.72,
  cabinEndZ: 1.32,
  groundClearance: 0.215,
} as const;

export interface TrafficBodySection {
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

export interface TrafficRoofRailSample {
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
 * Evaluates the compact modern 4-door civilian sedan cross-section at z in [-2.175, +2.175].
 * Proportioned as an everyday coastal commuter sedan: gently sloped nose, clean waist
 * shoulder crease, practical 4-door cabin aperture, and compact horizontal trunk deck.
 */
export function evaluateTrafficSedanSection(z: number): TrafficBodySection {
  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    frontArchRadius,
    rearArchRadius,
    cabinStartZ,
    cabinEndZ,
    groundClearance,
  } = TRAFFIC_SEDAN_DIMS;

  // Smooth everyday compact sedan planform taper at nose & tail
  const noseTaper = smoothstep(-2.18, -1.62, z);
  const tailTaper = 1 - smoothstep(1.64, 2.18, z) * 0.105;

  // Modest everyday fender flares over the 0.34m wheels + clean door side sculpting
  const frontFlare = bell(z, frontAxleZ + 0.02, 0.64) * 0.036;
  const rearFlare = bell(z, rearAxleZ - 0.02, 0.68) * 0.04;
  const doorScallop = bell(z, 0.04, 0.78) * 0.015;

  const baseHalfW = (0.805 + 0.132 * noseTaper) * tailTaper;
  const halfWidthMid = Math.min(0.968, baseHalfW + frontFlare + rearFlare - doorScallop);
  const halfWidthLower = halfWidthMid * (0.942 - (1 - noseTaper) * 0.045);
  const halfWidthBelt = halfWidthMid * (0.918 - (1 - noseTaper) * 0.03);

  // Clean sloping commuter bonnet rising gently toward cowl, crisp beltline, compact trunk deck
  const noseRise = smoothstep(-2.175, -1.78, z);
  const hoodRise = smoothstep(-1.92, -0.72, z);
  const rearQuarterLift = smoothstep(0.65, 1.55, z) * 0.036;
  const trunkSlope = smoothstep(1.62, 2.175, z) * 0.038;

  const beltY = 0.725 + 0.072 * noseRise + 0.095 * hoodRise + rearQuarterLift - trunkSlope;

  // Soft shoulder roll into bonnet & trunk deck
  const deckY =
    beltY +
    0.032 * smoothstep(-2.12, -1.55, z) -
    0.016 * smoothstep(1.98, 2.175, z);

  // Subtle central hood crown and nose roll-off
  const hoodCrown = bell(z, -1.36, 0.74) * 0.024 * smoothstep(-2.14, -1.9, z);
  const noseRoll = (1 - smoothstep(-2.175, -1.92, z)) * 0.038;
  const trunkLip = bell(z, 2.02, 0.24) * 0.012;
  const centerDeckY = deckY + 0.016 + hoodCrown + trunkLip - noseRoll;

  // Everyday ground clearance with gentle front/rear bumper lip tuck + circular wheel arches
  const frontLipTuck = (1 - smoothstep(-2.175, -1.82, z)) * 0.055;
  const rearLipTuck = smoothstep(1.82, 2.175, z) * 0.062;
  let sillY = groundClearance + frontLipTuck + rearLipTuck;
  let inFrontArch = false;
  let inRearArch = false;

  const dzFront = z - frontAxleZ;
  if (Math.abs(dzFront) < frontArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, frontArchRadius * frontArchRadius - dzFront * dzFront));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.078);
      inFrontArch = true;
    }
  }

  const dzRear = z - rearAxleZ;
  if (Math.abs(dzRear) < rearArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, rearArchRadius * rearArchRadius - dzRear * dzRear));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.082);
      inRearArch = true;
    }
  }

  // Keep lower body crease strictly monotonic between sill/wheel-arch lip and beltline
  const rawLowerBeltY = Math.max(groundClearance + 0.21, beltY * 0.61);
  const lowerBeltY = Math.max(sillY + 0.03, Math.min(beltY - 0.03, rawLowerBeltY));

  // Four-door sedan cabin aperture (z from -0.72 to +1.32)
  let cabinOpenHalfWidth = 0;
  if (z > cabinStartZ && z < cabinEndZ) {
    const openIn = smoothstep(cabinStartZ, cabinStartZ + 0.14, z);
    const openOut = 1 - smoothstep(cabinEndZ - 0.14, cabinEndZ, z);
    const rearNarrow = 1 - smoothstep(0.65, cabinEndZ, z) * 0.045;
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
 * Evaluates the compact sedan roof rail along z in [-0.18, +0.86].
 * Peak height hits 1.38m cleanly at the cabin crown.
 */
export function sampleTrafficSedanRoofRail(z: number): TrafficRoofRailSample {
  const zFront = -0.18;
  const zRear = 0.86;
  const t = Math.max(0, Math.min(1, (z - zFront) / (zRear - zFront)));

  // Smooth everyday sedan arch: rises from 1.335 at windshield header to 1.362 rail / 1.380 crown, slopes gently to 1.325
  const arch = Math.sin(t * Math.PI);
  const railY = 1.332 * (1 - t) + 1.322 * t + arch * 0.033;
  const crownY = railY + 0.014 + arch * 0.008;

  // Compact tumblehome width along roof rail
  const halfWidth = 0.665 + Math.sin(t * Math.PI) * 0.022 - smoothstep(0.62, 1.0, t) * 0.026;
  return { z, y: railY, halfWidth, crownY };
}

// ---------------------------------------------------------------------------
// Internal Geometry Utilities (Lightweight & Self-Contained)
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

export function mergeTrafficGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
// 1. Sculpted Everyday 4-Door Sedan Body Shell
// ---------------------------------------------------------------------------

/**
 * Builds the primary sculpted painted body shell with rounded wheel arches,
 * clean hood & shoulder character creases, recessed 4-door cabin aperture,
 * and closed front/rear bumper caps at z = ±2.175.
 */
export function buildTrafficBodyShellGeometry(): THREE.BufferGeometry {
  // Compact, well-placed station grid (~28 longitudinal slices -> fast fleet rendering)
  const zStations = [
    -2.175, -2.14, -2.06, -1.94, -1.78,
    -1.66, -1.55, -1.45, -1.34, -1.23, -1.13, -1.02, -0.92,
    -0.78, -0.72, -0.52, -0.22, 0.12, 0.46, 0.78,
    0.94, 1.04, 1.14, 1.24, 1.34, 1.44, 1.54, 1.65, 1.76,
    1.94, 2.08, 2.15, 2.175,
  ];

  const rightRows: Array<Array<[number, number, number]>> = [];
  const leftRows: Array<Array<[number, number, number]>> = [];
  const topRows: Array<Array<[number, number, number]>> = [];

  for (const z of zStations) {
    const s = evaluateTrafficSedanSection(z);
    const inCabin = s.cabinOpenHalfWidth > 0.04;

    // Right side profile from sill tuck -> rocker -> mid character crease -> shoulder -> deck edge
    const rCol: Array<[number, number, number]> = [
      [s.halfWidthLower * 0.9, s.sillY, z],
      [s.halfWidthLower, s.sillY + 0.032, z],
      [s.halfWidthMid, s.lowerBeltY, z],
      [s.halfWidthMid * 0.992, s.beltY - 0.045, z],
      [s.halfWidthBelt, s.beltY, z],
      [s.halfWidthBelt - 0.048, s.deckY, z],
    ];
    rightRows.push(rCol);

    // Left side mirrors X
    const lCol: Array<[number, number, number]> = rCol.map(([x, y, zz]) => [-x, y, zz]);
    leftRows.push(lCol);

    // Upper deck: across hood/trunk it crowns smoothly; inside cabin it dips cleanly into cabin tub lip
    const outerX = s.halfWidthBelt - 0.048;
    const innerX = inCabin ? Math.max(0.12, s.cabinOpenHalfWidth) : outerX * 0.45;
    const centerY = inCabin ? s.beltY - 0.14 : s.centerDeckY;
    const midY = inCabin ? s.beltY - 0.025 : (s.deckY + s.centerDeckY) * 0.5 + 0.008;

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

  // Front nose cap at z = -2.175 (closed painted bumper face, normal -Z)
  const sf = evaluateTrafficSedanSection(-2.175);
  const frontRows: Array<Array<[number, number, number]>> = [];
  const fYLevels = [
    sf.sillY,
    sf.sillY + 0.05,
    sf.lowerBeltY,
    sf.beltY - 0.04,
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
    const zProtrude = -2.175 - Math.sin((i / (fYLevels.length - 1)) * Math.PI) * 0.022;
    frontRows.push([
      [-hw, y, -2.175],
      [-hw * 0.48, y, zProtrude],
      [0, y + (i === fYLevels.length - 1 ? sf.centerDeckY - sf.deckY : 0), zProtrude - 0.008],
      [hw * 0.48, y, zProtrude],
      [hw, y, -2.175],
    ]);
  }
  const frontCap = createLoftedGrid(frontRows, new THREE.Vector3(0, 0, -1));

  // Rear tail cap at z = +2.175 (closed painted trunk & bumper face, normal +Z)
  const sr = evaluateTrafficSedanSection(2.175);
  const rearRows: Array<Array<[number, number, number]>> = [];
  const rYLevels = [
    sr.sillY,
    sr.sillY + 0.05,
    sr.lowerBeltY,
    sr.beltY - 0.04,
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
    const zOut = 2.175 + Math.sin((i / (rYLevels.length - 1)) * Math.PI) * 0.014;
    rearRows.push([
      [-hw, y, 2.175],
      [-hw * 0.5, y, zOut],
      [0, y + (i === rYLevels.length - 1 ? sr.centerDeckY - sr.deckY : 0), zOut + 0.005],
      [hw * 0.5, y, zOut],
      [hw, y, 2.175],
    ]);
  }
  const rearCap = createLoftedGrid(rearRows, new THREE.Vector3(0, 0, 1));

  return mergeGeometries([rightSide, leftSide, topDeck, frontCap, rearCap]);
}

// ---------------------------------------------------------------------------
// 2. Solid 3D Painted Roof Slab + Perimeter Edge Skirts (Zero Back-Face Vanishing)
// ---------------------------------------------------------------------------

export interface TrafficRoofGeometries {
  paintedRoof: THREE.BufferGeometry;
  roofEdges: THREE.BufferGeometry;
  roofHeadliner: THREE.BufferGeometry;
}

export function buildTrafficRoofGeometry(): TrafficRoofGeometries {
  const zSamples = [-0.18, -0.02, 0.16, 0.34, 0.54, 0.72, 0.86];
  const rows: Array<Array<[number, number, number]>> = [];
  const headlinerRows: Array<Array<[number, number, number]>> = [];
  const lipDrop = 0.03;

  for (const z of zSamples) {
    const rail = sampleTrafficSedanRoofRail(z);
    const hw = rail.halfWidth;
    const midY = (rail.y + rail.crownY) * 0.5 + 0.004;
    rows.push([
      [-hw, rail.y, z],
      [-hw * 0.52, midY, z],
      [0, rail.crownY, z],
      [hw * 0.52, midY, z],
      [hw, rail.y, z],
    ]);

    // Contoured downward-facing headliner stitched flush to the lower edge of roofEdges
    headlinerRows.push([
      [-hw - 0.004, rail.y - lipDrop, z],
      [-hw * 0.52, midY - lipDrop, z],
      [0, rail.crownY - lipDrop, z],
      [hw * 0.52, midY - lipDrop, z],
      [hw + 0.004, rail.y - lipDrop, z],
    ]);
  }

  const paintedRoof = createLoftedGrid(rows, new THREE.Vector3(0, 1, 0));
  const roofHeadliner = createLoftedGrid(headlinerRows, new THREE.Vector3(0, -1, 0));

  // Solid 3.0cm downward perimeter roof slab skirts (left, right, front, rear)
  // so the roof retains real 3D thickness from eye-level and low-angle camera views.
  const edgeParts: THREE.BufferGeometry[] = [];

  const leftSkirtRows: Array<Array<[number, number, number]>> = [];
  const rightSkirtRows: Array<Array<[number, number, number]>> = [];
  for (const z of zSamples) {
    const rail = sampleTrafficSedanRoofRail(z);
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

  // Front & rear roof header edge skirts
  const rf = sampleTrafficSedanRoofRail(-0.18);
  const frontSkirt = createLoftedGrid(
    [
      [
        [-rf.halfWidth, rf.y, -0.18],
        [-rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5, -0.18],
        [0, rf.crownY, -0.18],
        [rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5, -0.18],
        [rf.halfWidth, rf.y, -0.18],
      ],
      [
        [-rf.halfWidth, rf.y - lipDrop, -0.184],
        [-rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5 - lipDrop, -0.184],
        [0, rf.crownY - lipDrop, -0.184],
        [rf.halfWidth * 0.5, (rf.y + rf.crownY) * 0.5 - lipDrop, -0.184],
        [rf.halfWidth, rf.y - lipDrop, -0.184],
      ],
    ],
    new THREE.Vector3(0, 0, -1),
  );

  const rr = sampleTrafficSedanRoofRail(0.86);
  const rearSkirt = createLoftedGrid(
    [
      [
        [-rr.halfWidth, rr.y, 0.86],
        [-rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5, 0.86],
        [0, rr.crownY, 0.86],
        [rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5, 0.86],
        [rr.halfWidth, rr.y, 0.86],
      ],
      [
        [-rr.halfWidth, rr.y - lipDrop, 0.864],
        [-rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5 - lipDrop, 0.864],
        [0, rr.crownY - lipDrop, 0.864],
        [rr.halfWidth * 0.5, (rr.y + rr.crownY) * 0.5 - lipDrop, 0.864],
        [rr.halfWidth, rr.y - lipDrop, 0.864],
      ],
    ],
    new THREE.Vector3(0, 0, 1),
  );

  edgeParts.push(frontSkirt, rearSkirt);

  return {
    paintedRoof,
    roofEdges: mergeGeometries(edgeParts),
    roofHeadliner,
  };
}

// ---------------------------------------------------------------------------
// 3. Curved Transparent Automotive Glass (Windshield, Rear Glass, Merged Sides)
// ---------------------------------------------------------------------------

export interface TrafficGlassGeometries {
  windshield: THREE.BufferGeometry;
  rearGlass: THREE.BufferGeometry;
  sideWindowL: THREE.BufferGeometry;
  sideWindowR: THREE.BufferGeometry;
  sideWindowsMerged: THREE.BufferGeometry;
}

export function buildTrafficGlassGeometry(): TrafficGlassGeometries {
  // Windshield: z from -0.72 (cowl) to -0.18 (roof front header)
  const cowl = evaluateTrafficSedanSection(-0.72);
  const rf = sampleTrafficSedanRoofRail(-0.18);
  const wsRows: Array<Array<[number, number, number]>> = [];
  const wsSteps = 4;
  for (let i = 0; i <= wsSteps; i++) {
    const t = i / wsSteps;
    const zBase = -0.72 * (1 - t) + -0.18 * t;
    const yEdge = (cowl.deckY - 0.006) * (1 - t) + (rf.y - 0.008) * t;
    const hw = (cowl.halfWidthBelt - 0.072) * (1 - t) + (rf.halfWidth - 0.012) * t;
    const bowZ = -0.036 * (1 - t * 0.35);
    const crownLift = 0.012 * t + 0.006;
    wsRows.push([
      [-hw, yEdge, zBase],
      [-hw * 0.5, yEdge + crownLift * 0.72, zBase + bowZ * 0.75],
      [0, yEdge + crownLift, zBase + bowZ],
      [hw * 0.5, yEdge + crownLift * 0.72, zBase + bowZ * 0.75],
      [hw, yEdge, zBase],
    ]);
  }
  const windshield = createLoftedGrid(wsRows, new THREE.Vector3(0, 0.65, -0.76));

  // Rear backlight: z from +0.86 (roof rear header) to +1.32 (trunk transition)
  const rr = sampleTrafficSedanRoofRail(0.86);
  const trunk = evaluateTrafficSedanSection(1.32);
  const rgRows: Array<Array<[number, number, number]>> = [];
  const rgSteps = 4;
  for (let i = 0; i <= rgSteps; i++) {
    const t = i / rgSteps;
    const zBase = 0.86 * (1 - t) + 1.32 * t;
    const yEdge = (rr.y - 0.008) * (1 - t) + (trunk.deckY - 0.004) * t;
    const hw = (rr.halfWidth - 0.012) * (1 - t) + (trunk.halfWidthBelt - 0.075) * t;
    const bowZ = 0.03 * (0.65 + t * 0.35);
    const crownLift = 0.012 * (1 - t) + 0.005;
    rgRows.push([
      [-hw, yEdge, zBase],
      [-hw * 0.5, yEdge + crownLift * 0.7, zBase + bowZ * 0.75],
      [0, yEdge + crownLift, zBase + bowZ],
      [hw * 0.5, yEdge + crownLift * 0.7, zBase + bowZ * 0.75],
      [hw, yEdge, zBase],
    ]);
  }
  const rearGlass = createLoftedGrid(rgRows, new THREE.Vector3(0, 0.62, 0.78));

  // Curved side windows with realistic tumblehome (left & right)
  const buildSideWindow = (side: -1 | 1): THREE.BufferGeometry => {
    const zPairs: Array<{ zBot: number; zTop: number }> = [
      { zBot: -0.66, zTop: -0.17 },
      { zBot: -0.34, zTop: 0.02 },
      { zBot: 0.02, zTop: 0.24 },
      { zBot: 0.42, zTop: 0.52 },
      { zBot: 0.84, zTop: 0.74 },
      { zBot: 1.24, zTop: 0.85 },
    ];

    const rows: Array<Array<[number, number, number]>> = [];
    for (const pair of zPairs) {
      const botSec = evaluateTrafficSedanSection(pair.zBot);
      const topRail = sampleTrafficSedanRoofRail(pair.zTop);
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
// 4. Flush Pillars & Everyday Satin-Black Window Belt Trim
// ---------------------------------------------------------------------------

export interface TrafficPillarGeometries {
  paintedPillars: THREE.BufferGeometry;
  darkPillarsAndTrim: THREE.BufferGeometry;
}

export function buildTrafficPillarsGeometry(): TrafficPillarGeometries {
  const paintedParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];

  const cowl = evaluateTrafficSedanSection(-0.71);
  const rf = sampleTrafficSedanRoofRail(-0.18);
  const rr = sampleTrafficSedanRoofRail(0.86);
  const trunk = evaluateTrafficSedanSection(1.31);
  const bBot = evaluateTrafficSedanSection(0.24);
  const bTop = sampleTrafficSedanRoofRail(0.24);

  for (const side of [-1, 1] as const) {
    // Slim painted A-pillar (tucked cleanly into roof header & cowl)
    const aBot = new THREE.Vector3((cowl.halfWidthBelt - 0.062) * side, cowl.deckY - 0.008, -0.71);
    const aTop = new THREE.Vector3((rf.halfWidth - 0.022) * side, rf.y - 0.024, -0.155);
    paintedParts.push(makeStrut(aBot, aTop, 0.052, 0.048));

    // Clean painted C-pillar (tucked cleanly under roof trailing edge with zero protruding top corner)
    const cBot = new THREE.Vector3((trunk.halfWidthBelt - 0.066) * side, trunk.deckY - 0.008, 1.29);
    const cTop = new THREE.Vector3((rr.halfWidth - 0.022) * side, rr.y - 0.028, 0.825);
    paintedParts.push(makeStrut(cBot, cTop, 0.064, 0.072));

    // Flush gloss-black B-pillar divider between front & rear doors
    const bBotV = new THREE.Vector3((bBot.halfWidthBelt - 0.05) * side, bBot.deckY - 0.005, 0.24);
    const bTopV = new THREE.Vector3((bTop.halfWidth - 0.01) * side, bTop.y - 0.01, 0.24);
    darkParts.push(makeStrut(bBotV, bTopV, 0.044, 0.062));

    // Everyday matte/satin black lower window beltline weatherstrip
    const zBelt = [-0.66, -0.2, 0.26, 0.74, 1.24];
    for (let i = 0; i < zBelt.length - 1; i++) {
      const s0 = evaluateTrafficSedanSection(zBelt[i]);
      const s1 = evaluateTrafficSedanSection(zBelt[i + 1]);
      const p0 = new THREE.Vector3((s0.halfWidthBelt - 0.046) * side, s0.deckY + 0.002, zBelt[i]);
      const p1 = new THREE.Vector3((s1.halfWidthBelt - 0.046) * side, s1.deckY + 0.002, zBelt[i + 1]);
      darkParts.push(makeStrut(p0, p1, 0.022, 0.02));
    }

    // Subtle dark rubberized upper drip rail
    const zRoof = [-0.18, 0.16, 0.52, 0.86];
    for (let i = 0; i < zRoof.length - 1; i++) {
      const r0 = sampleTrafficSedanRoofRail(zRoof[i]);
      const r1 = sampleTrafficSedanRoofRail(zRoof[i + 1]);
      const p0 = new THREE.Vector3((r0.halfWidth - 0.002) * side, r0.y - 0.008, zRoof[i]);
      const p1 = new THREE.Vector3((r1.halfWidth - 0.002) * side, r1.y - 0.008, zRoof[i + 1]);
      darkParts.push(makeStrut(p0, p1, 0.016, 0.016));
    }
  }

  return {
    paintedPillars: mergeGeometries(paintedParts),
    darkPillarsAndTrim: mergeGeometries(darkParts),
  };
}

// ---------------------------------------------------------------------------
// 5. Modern Everyday Front Fascia (Hexagonal Grille, Slim Chrome Bar & Headlights)
// ---------------------------------------------------------------------------

export interface TrafficFrontFasciaGeometries {
  grilleDark: THREE.BufferGeometry;
  grilleChromeAccent: THREE.BufferGeometry;
  hlHousings: THREE.BufferGeometry;
  hlEmissiveOptics: THREE.BufferGeometry;
  hlAmberMarkers: THREE.BufferGeometry;
  hlClearLenses: THREE.BufferGeometry;
}

export function buildTrafficFrontFasciaGeometry(): TrafficFrontFasciaGeometries {
  const darkParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];
  const hlHousings: THREE.BufferGeometry[] = [];
  const hlOptics: THREE.BufferGeometry[] = [];
  const hlAmber: THREE.BufferGeometry[] = [];
  const hlLens: THREE.BufferGeometry[] = [];

  // Front nose surface at centerline sits around z = -2.183..-2.202.
  // Place grille, slats, and headlights cleanly flush-proud (z ≈ -2.185..-2.208) so zero clipping occurs.

  // Upper modern hexagonal commuter grille recess (friendly everyday proportions)
  darkParts.push(makeBox(0.92, 0.175, 0.06, 0, 0.575, -2.186));
  // Subtle dark surround frame lips
  darkParts.push(makeBox(0.96, 0.02, 0.068, 0, 0.662, -2.19));
  darkParts.push(makeBox(0.84, 0.02, 0.068, 0, 0.488, -2.192));
  // Horizontal dark grille slats
  darkParts.push(makeBox(0.88, 0.014, 0.05, 0, 0.618, -2.198));
  darkParts.push(makeBox(0.84, 0.014, 0.05, 0, 0.532, -2.198));

  // Wide matte-black lower bumper intake + left/right fog pocket bezels
  darkParts.push(makeBox(1.1, 0.11, 0.056, 0, 0.34, -2.18));
  for (const side of [-1, 1] as const) {
    // Angled corner bumper fog-lamp recesses (strictly inside halfWidthLower at nose)
    darkParts.push(makeBox(0.19, 0.08, 0.05, side * 0.62, 0.37, -2.156, 0, -side * 0.24, 0));
    // Slim silver/chrome fog accent brow
    chromeParts.push(makeBox(0.15, 0.012, 0.036, side * 0.62, 0.415, -2.164, 0, -side * 0.24, 0));
  }

  // Single slim horizontal chrome wing bar across upper grille + compact center badge
  chromeParts.push(makeBox(0.92, 0.022, 0.04, 0, 0.576, -2.204));
  const badge = new THREE.CylinderGeometry(0.038, 0.038, 0.026, 12);
  badge.rotateX(Math.PI / 2);
  badge.translate(0, 0.576, -2.212);
  chromeParts.push(badge);

  // Front subtle commuter bumper lip spoiler
  darkParts.push(makeBox(1.26, 0.032, 0.13, 0, 0.262, -2.13));

  // Swept-back everyday dual-element headlights (proud of front fender corners, tucked cleanly within width)
  for (const side of [-1, 1] as const) {
    const yaw = -side * 0.26;
    const xOuter = side * 0.66;
    const yLamp = 0.625;
    const zLamp = -2.142;

    // Dark recessed headlamp housing
    hlHousings.push(makeBox(0.32, 0.105, 0.11, xOuter, yLamp, zLamp, 0, yaw, 0));

    // Dual compact LED projector optics + clean lower L-shaped DRL light guide
    hlOptics.push(makeBox(0.088, 0.056, 0.04, side * 0.59, yLamp + 0.008, -2.186, 0, yaw, 0));
    hlOptics.push(makeBox(0.082, 0.052, 0.04, side * 0.70, yLamp + 0.01, -2.156, 0, yaw, 0));
    // Crisp lower horizontal DRL blade
    hlOptics.push(makeBox(0.24, 0.016, 0.036, side * 0.65, yLamp - 0.032, -2.178, 0, yaw, 0));

    // Outer amber turn signal / side marker
    hlAmber.push(makeBox(0.052, 0.044, 0.055, side * 0.805, yLamp + 0.006, -2.092, 0, -side * 0.52, 0));

    // Protective clear outer headlamp lens
    hlLens.push(makeBox(0.33, 0.112, 0.026, side * 0.668, yLamp, -2.186, 0, yaw, 0));
  }

  return {
    grilleDark: mergeGeometries(darkParts),
    grilleChromeAccent: mergeGeometries(chromeParts),
    hlHousings: mergeGeometries(hlHousings),
    hlEmissiveOptics: mergeGeometries(hlOptics),
    hlAmberMarkers: mergeGeometries(hlAmber),
    hlClearLenses: mergeGeometries(hlLens),
  };
}

// ---------------------------------------------------------------------------
// 6. Modern Compact Rear Fascia (Wraparound Two-Piece Taillights & Single Exhaust)
// ---------------------------------------------------------------------------

export interface TrafficRearFasciaGeometries {
  taillightEmissive: THREE.BufferGeometry;
  rearDarkValance: THREE.BufferGeometry;
  rearChromeAccent: THREE.BufferGeometry;
  licensePlate: THREE.BufferGeometry;
}

export function buildTrafficRearFasciaGeometry(): TrafficRearFasciaGeometries {
  const tailParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];

  // Rear tail cap extends to ~+2.192 at centerline and +2.175 at outer corners.
  // Half width at rear belt is ~0.77m at z=2.175 and ~0.83m at z=2.04.
  for (const side of [-1, 1] as const) {
    // Dark recessed taillight housing
    darkParts.push(makeBox(0.38, 0.115, 0.065, side * 0.56, 0.775, 2.164, 0, side * 0.14, 0));

    // Main horizontal glowing ruby taillight bar (flush-proud of rear deck)
    tailParts.push(makeBox(0.34, 0.072, 0.036, side * 0.555, 0.78, 2.192, 0, side * 0.14, 0));
    // Crisp side wraparound corner lens (tucked neatly inside rear fender shoulder!)
    tailParts.push(makeBox(0.038, 0.072, 0.14, side * 0.775, 0.775, 2.11, 0, side * 0.2, 0));

    // Small lower bumper safety reflector
    tailParts.push(makeBox(0.15, 0.024, 0.022, side * 0.6, 0.365, 2.186, 0, side * 0.12, 0));
  }

  // Subtle horizontal chrome trunk garnish strip above license recess
  chromeParts.push(makeBox(0.56, 0.018, 0.026, 0, 0.715, 2.194));

  // Recessed dark trunk license plate cove
  darkParts.push(makeBox(0.42, 0.165, 0.03, 0, 0.585, 2.186));

  // Matte-black lower rear commuter bumper valance
  darkParts.push(makeBox(1.38, 0.135, 0.08, 0, 0.315, 2.148));

  // Single modest left-side commuter chrome exhaust tip (distinct from sports quad / luxury dual!)
  const exhaustOuter = new THREE.CylinderGeometry(0.036, 0.038, 0.12, 12);
  exhaustOuter.rotateX(Math.PI / 2);
  exhaustOuter.translate(-0.54, 0.265, 2.155);
  chromeParts.push(exhaustOuter);

  const exhaustInner = new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10);
  exhaustInner.rotateX(Math.PI / 2);
  exhaustInner.translate(-0.54, 0.265, 2.202);
  darkParts.push(exhaustInner);

  // Rear license plate with clean UV mapping (facing +Z)
  const licensePlate = new THREE.PlaneGeometry(0.34, 0.15);
  licensePlate.translate(0, 0.585, 2.204);

  return {
    taillightEmissive: mergeGeometries(tailParts),
    rearDarkValance: mergeGeometries(darkParts),
    rearChromeAccent: mergeGeometries(chromeParts),
    licensePlate,
  };
}

// ---------------------------------------------------------------------------
// 7. Everyday Exterior Details (Painted Mirrors, Painted Door Handles, Liners, Seams)
// ---------------------------------------------------------------------------

export interface TrafficExteriorDetailsGeometries {
  paintedMirrorsAndHandles: THREE.BufferGeometry;
  darkMirrorsAndUnderbody: THREE.BufferGeometry;
  panelSeams: THREE.BufferGeometry;
}

export function buildTrafficExteriorDetailsGeometry(): TrafficExteriorDetailsGeometries {
  const paintedParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const seamParts: THREE.BufferGeometry[] = [];

  const mirrorSec = evaluateTrafficSedanSection(-0.54);
  const fHandleSec = evaluateTrafficSedanSection(-0.08);
  const rHandleSec = evaluateTrafficSedanSection(0.68);

  for (const side of [-1, 1] as const) {
    // Compact everyday body-colored wing mirror housing + dark mounting stalk
    const mBaseX = (mirrorSec.halfWidthBelt - 0.02) * side;
    const mY = mirrorSec.beltY + 0.055;
    darkParts.push(makeBox(0.075, 0.038, 0.06, mBaseX + side * 0.025, mY - 0.012, -0.54));
    paintedParts.push(makeBox(0.135, 0.078, 0.095, mBaseX + side * 0.082, mY + 0.015, -0.525, 0, -side * 0.12, 0));

    // Four body-colored everyday pull door handles (front + rear doors)
    paintedParts.push(
      makeBox(0.024, 0.028, 0.115, (fHandleSec.halfWidthMid + 0.008) * side, fHandleSec.beltY - 0.07, -0.06),
    );
    paintedParts.push(
      makeBox(0.024, 0.028, 0.115, (rHandleSec.halfWidthMid + 0.008) * side, rHandleSec.beltY - 0.07, 0.68),
    );

    // Subtle dark protective lower rocker trim
    darkParts.push(makeBox(0.04, 0.06, 1.88, side * 0.875, TRAFFIC_SEDAN_DIMS.groundClearance + 0.025, 0.0));

    // Arched dark wheel-well liners (front & rear) oriented cleanly along the wheel arch & enclosing the inner well
    for (const [axleZ, archR] of [
      [TRAFFIC_SEDAN_DIMS.frontAxleZ, TRAFFIC_SEDAN_DIMS.frontArchRadius],
      [TRAFFIC_SEDAN_DIMS.rearAxleZ, TRAFFIC_SEDAN_DIMS.rearArchRadius],
    ] as const) {
      const rLiner = archR - 0.014;
      const liner = new THREE.CylinderGeometry(
        rLiner,
        rLiner,
        0.27,
        14,
        1,
        true,
        0,
        Math.PI,
      );
      liner.rotateZ(Math.PI / 2);
      flipWinding(liner);
      liner.translate(side * 0.76, TRAFFIC_SEDAN_DIMS.wheelRadius - 0.01, axleZ);
      liner.computeVertexNormals();
      darkParts.push(liner);

      const innerWell = new THREE.CircleGeometry(rLiner * 0.94, 12, 0, Math.PI);
      innerWell.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
      innerWell.translate(side * 0.61, TRAFFIC_SEDAN_DIMS.wheelRadius - 0.01, axleZ);
      innerWell.computeVertexNormals();
      darkParts.push(innerWell);
    }

    // Subtle vertical door shut-lines (front door, B-pillar seam, rear door)
    for (const seamZ of [-0.64, 0.24, 1.02]) {
      const sec = evaluateTrafficSedanSection(seamZ);
      const seamH = sec.beltY - sec.sillY - 0.09;
      seamParts.push(
        makeBox(
          0.008,
          Math.max(0.25, seamH),
          0.009,
          (sec.halfWidthMid + 0.003) * side,
          sec.sillY + 0.04 + seamH * 0.5,
          seamZ,
        ),
      );
    }
  }

  // Flat dark protective underbody floorpan tray (eliminates any see-through from low views)
  darkParts.push(makeBox(1.52, 0.06, 3.64, 0, TRAFFIC_SEDAN_DIMS.groundClearance + 0.02, 0.0));

  // Subtle hood & trunk shut-lines
  seamParts.push(makeBox(1.34, 0.008, 0.009, 0, 0.892, -0.74));
  seamParts.push(makeBox(1.26, 0.008, 0.009, 0, 0.895, 1.35));

  return {
    paintedMirrorsAndHandles: mergeGeometries(paintedParts),
    darkMirrorsAndUnderbody: mergeGeometries(darkParts),
    panelSeams: mergeGeometries(seamParts),
  };
}

// ---------------------------------------------------------------------------
// 8. Lightweight Visible 4-Door Interior (Dashboard, Steering Wheel, 2 Front + Rear Bench)
// ---------------------------------------------------------------------------

export interface TrafficInteriorGeometries {
  cabinTub: THREE.BufferGeometry;
  seats: THREE.BufferGeometry;
  dashAndWheel: THREE.BufferGeometry;
}

export function buildTrafficInteriorGeometry(): TrafficInteriorGeometries {
  const tubParts: THREE.BufferGeometry[] = [];
  const seatParts: THREE.BufferGeometry[] = [];
  const dashParts: THREE.BufferGeometry[] = [];

  // Cabin floor, center console, front firewall, rear parcel shelf, inner door panels
  tubParts.push(makeBox(1.38, 0.07, 1.92, 0, 0.34, 0.3));
  tubParts.push(makeBox(0.22, 0.24, 1.15, 0, 0.49, 0.05));
  tubParts.push(makeBox(1.42, 0.48, 0.08, 0, 0.62, -0.66));
  tubParts.push(makeBox(1.36, 0.14, 0.46, 0, 0.82, 1.12));
  for (const side of [-1, 1] as const) {
    tubParts.push(makeBox(0.06, 0.46, 1.84, side * 0.72, 0.62, 0.28));
  }

  // Two sculpted everyday front cloth seats (cushions, backrests, headrests)
  for (const side of [-1, 1] as const) {
    const sx = side * 0.34;
    // Seat cushion
    seatParts.push(makeBox(0.46, 0.11, 0.46, sx, 0.46, 0.02));
    // Gently reclined backrest
    seatParts.push(makeBox(0.44, 0.48, 0.11, sx, 0.72, 0.22, 0.18, 0, 0));
    // Compact headrest
    seatParts.push(makeBox(0.2, 0.16, 0.09, sx, 1.03, 0.27, 0.12, 0, 0));
  }

  // Rear 3-passenger cloth bench seat + 2 outer headrests
  seatParts.push(makeBox(1.26, 0.12, 0.44, 0, 0.48, 0.74));
  seatParts.push(makeBox(1.24, 0.46, 0.12, 0, 0.74, 0.95, 0.16, 0, 0));
  for (const side of [-1, 1] as const) {
    seatParts.push(makeBox(0.2, 0.15, 0.09, side * 0.38, 1.02, 1.0, 0.1, 0, 0));
  }

  // Commuter dashboard, gauge binnacle hood, center console screen bezel
  dashParts.push(makeBox(1.38, 0.22, 0.38, 0, 0.78, -0.49));
  dashParts.push(makeBox(0.38, 0.1, 0.24, -0.34, 0.9, -0.48));
  dashParts.push(makeBox(0.22, 0.13, 0.05, 0, 0.86, -0.36));

  // Steering column + 3-spoke steering wheel on driver side (-X)
  dashParts.push(makeBox(0.06, 0.06, 0.22, -0.34, 0.81, -0.31, -0.22, 0, 0));
  const rim = new THREE.TorusGeometry(0.145, 0.017, 7, 16);
  rim.rotateX(0.26);
  rim.translate(-0.34, 0.84, -0.22);
  dashParts.push(rim);
  // Steering wheel hub + 3 spokes
  dashParts.push(makeBox(0.26, 0.022, 0.022, -0.34, 0.84, -0.22, 0.26, 0, 0));
  dashParts.push(makeBox(0.024, 0.13, 0.022, -0.34, 0.78, -0.21, 0.26, 0, 0));

  // Interior rear-view mirror mounted below front roof header
  dashParts.push(makeBox(0.18, 0.048, 0.032, 0, 1.22, -0.24));

  return {
    cabinTub: mergeGeometries(tubParts),
    seats: mergeGeometries(seatParts),
    dashAndWheel: mergeGeometries(dashParts),
  };
}

// ---------------------------------------------------------------------------
// 9. Rounded Touring Tire + Everyday 5-V-Spoke Compact Alloy Wheel (r = 0.34m)
// ---------------------------------------------------------------------------

export interface TrafficWheelParts {
  tireGeo: THREE.BufferGeometry;
  rimAlloyGeo: THREE.BufferGeometry;
  hubCapGeo: THREE.BufferGeometry;
  rotorGeo: THREE.BufferGeometry;
}

/**
 * Builds lightweight, rounded everyday commuter wheels (r = 0.34m, w = 0.23m).
 * Local wheel axis is X (matching VehicleRig spin rotation.x); outer face points +X.
 */
export function buildTrafficWheelParts(
  wheelRadius: number = TRAFFIC_SEDAN_DIMS.wheelRadius,
  wheelWidth: number = TRAFFIC_SEDAN_DIMS.wheelWidth,
): TrafficWheelParts {
  const halfW = wheelWidth * 0.5;
  const rimR = wheelRadius * 0.62; // Everyday 16-inch commuter alloy rim with comfortable tire sidewall

  // Smooth rounded LatheGeometry touring tire profile (rotated so axis = X)
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(rimR - 0.008, -halfW * 0.84),
    new THREE.Vector2(rimR + 0.022, -halfW * 0.96),
    new THREE.Vector2(wheelRadius - 0.048, -halfW),
    new THREE.Vector2(wheelRadius - 0.012, -halfW * 0.86),
    new THREE.Vector2(wheelRadius, -halfW * 0.55),
    new THREE.Vector2(wheelRadius, halfW * 0.55),
    new THREE.Vector2(wheelRadius - 0.012, halfW * 0.86),
    new THREE.Vector2(wheelRadius - 0.048, halfW),
    new THREE.Vector2(rimR + 0.022, halfW * 0.96),
    new THREE.Vector2(rimR - 0.008, halfW * 0.84),
  ];
  // 20 radial segments keep rounded silhouette crisp while keeping fleet poly count low
  const tireGeo = new THREE.LatheGeometry(profile, 20);
  tireGeo.rotateZ(-Math.PI / 2);
  tireGeo.computeVertexNormals();

  // Everyday 5-V-spoke compact silver alloy wheel (distinct from Veloce 5-Y, Solstice 14-spoke, Titan 6-twin)
  const rimParts: THREE.BufferGeometry[] = [];

  // Outer alloy rim barrel lip
  const rimLip = new THREE.TorusGeometry(rimR, 0.016, 7, 20);
  rimLip.rotateY(Math.PI / 2);
  rimLip.translate(halfW * 0.72, 0, 0);
  rimParts.push(rimLip);

  // Inner dark/alloy recessed wheel barrel backing
  const innerBarrel = new THREE.CylinderGeometry(rimR - 0.008, rimR - 0.008, wheelWidth * 0.74, 16, 1, true);
  innerBarrel.rotateZ(Math.PI / 2);
  rimParts.push(innerBarrel);

  // 5 clean V-spoke pairs (10 sleek angled commuter spokes)
  const spokeCount = 5;
  const spokeLen = rimR - 0.05;
  for (let i = 0; i < spokeCount; i++) {
    const baseAngle = (i / spokeCount) * Math.PI * 2;
    for (const sgn of [-1, 1] as const) {
      const a = baseAngle + sgn * 0.18;
      const spoke = new THREE.BoxGeometry(0.022, spokeLen, 0.024);
      // Slight inward dish toward hub
      spoke.translate(halfW * 0.58, spokeLen * 0.5 + 0.04, 0);
      spoke.rotateX(a);
      rimParts.push(spoke);
    }
  }

  const rimAlloyGeo = mergeGeometries(rimParts);

  // Clean center hub cap
  const hubCapGeo = new THREE.CylinderGeometry(0.052, 0.058, 0.036, 12);
  hubCapGeo.rotateZ(Math.PI / 2);
  hubCapGeo.translate(halfW * 0.62, 0, 0);

  // Inboard brake rotor disc (visible cleanly through the 5-V-spoke gaps)
  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.76, rimR * 0.76, 0.018, 16);
  rotorGeo.rotateZ(Math.PI / 2);
  rotorGeo.translate(halfW * 0.16, 0, 0);

  return {
    tireGeo,
    rimAlloyGeo,
    hubCapGeo,
    rotorGeo,
  };
}
