import * as THREE from 'three';

/**
 * Pure parametric geometry builders for the Phase 2C-2 Bayside Titan
 * All-Terrain Coastal Luxury SUV.
 *
 * Local coordinate system matches VehicleRig:
 *   +X = right, +Y = up, -Z = forward (nose), +Z = rear (tail).
 * Ground contact plane is y = 0.
 *
 * Kept DOM-free so SUV proportions, elevated ground clearance, wheel-arch clearances,
 * two-box four-door + cargo greenhouse, interior layout, and outward normals can be
 * verified directly under node:test.
 */

export const BAYSIDE_TITAN_DIMS = {
  length: 4.95,
  width: 2.22,
  height: 1.82,
  wheelRadius: 0.42,
  wheelWidth: 0.31,
  frontAxleZ: -1.52,
  rearAxleZ: 1.5,
  frontTrackHalf: 0.96,
  rearTrackHalf: 0.96,
  frontArchRadius: 0.505,
  rearArchRadius: 0.51,
  cabinStartZ: -0.78,
  cabinEndZ: 2.24,
  groundClearance: 0.34,
} as const;

export interface TitanBodySection {
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
 * Evaluates the sculpted two-box luxury SUV cross-section at station z in [-2.475, +2.475].
 * Characterized by an elevated all-terrain stance (0.34m clearance), bold upright prow with
 * sculpted clamshell bonnet, muscular flared wheel haunches, full-length four-door + rear cargo
 * cabin aperture, and crisp architectural tailgate shoulder.
 */
export function evaluateTitanBodySection(z: number): TitanBodySection {
  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    frontArchRadius,
    rearArchRadius,
    cabinStartZ,
    cabinEndZ,
    groundClearance,
  } = BAYSIDE_TITAN_DIMS;

  // Confident architectural SUV taper at nose & tail (broad planted shoulders across cabin)
  const noseTaper = smoothstep(-2.48, -1.9, z);
  const tailTaper = 1 - smoothstep(1.94, 2.48, z) * 0.085;

  // Muscular all-terrain fender haunches around the 0.42m wheels + subtle sculpted door waist
  const frontHaunch = bell(z, frontAxleZ + 0.02, 0.78) * 0.064;
  const rearHaunch = bell(z, rearAxleZ - 0.02, 0.84) * 0.068;
  const doorSculptInset = bell(z, 0.02, 0.92) * 0.018;

  const baseHalfW = (0.93 + 0.125 * noseTaper) * tailTaper;
  const halfWidthMid = Math.min(1.105, baseHalfW + frontHaunch + rearHaunch - doorSculptInset);
  const halfWidthLower = halfWidthMid * (0.955 - (1 - noseTaper) * 0.045);
  const halfWidthBelt = halfWidthMid * (0.935 - (1 - noseTaper) * 0.022);

  // Commanding SUV beltline: tall upright prow (~1.04m) rising smoothly into high flat cabin sill (~1.16m)
  const prowRise = smoothstep(-2.475, -2.02, z);
  const bonnetRise = smoothstep(-2.15, -0.78, z);
  const rearBeltLift = smoothstep(0.95, 2.28, z) * 0.032;
  const tailRoll = smoothstep(2.34, 2.475, z) * 0.025;

  const beltY = 1.0 + 0.085 * prowRise + 0.068 * bonnetRise + rearBeltLift - tailRoll;
  const lowerBeltY = Math.max(groundClearance + 0.28, beltY * 0.64);

  // Rounded clamshell hood edge and continuous luxury shoulder bevel
  const deckY =
    beltY +
    0.034 * smoothstep(-2.4, -1.78, z) -
    0.014 * smoothstep(2.26, 2.475, z);

  // Sculpted central clamshell hood power dome (athletic SUV bonnet) + clean nose chamfer
  const hoodPowerDome = bell(z, -1.56, 0.84) * 0.042 * smoothstep(-2.44, -2.18, z);
  const prowChamfer = (1 - smoothstep(-2.475, -2.2, z)) * 0.042;
  const centerDeckY = deckY + 0.014 + hoodPowerDome - prowChamfer;

  // Elevated all-terrain rocker sill with front approach & rear departure angles + tall circular wheel arches
  const frontApproach = (1 - smoothstep(-2.475, -2.04, z)) * 0.095;
  const rearDeparture = smoothstep(2.02, 2.475, z) * 0.1;
  let sillY = groundClearance + frontApproach + rearDeparture;
  let inFrontArch = false;
  let inRearArch = false;

  const dzFront = z - frontAxleZ;
  if (Math.abs(dzFront) < frontArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, frontArchRadius * frontArchRadius - dzFront * dzFront));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.085);
      inFrontArch = true;
    }
  }

  const dzRear = z - rearAxleZ;
  if (Math.abs(dzRear) < rearArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, rearArchRadius * rearArchRadius - dzRear * dzRear));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.09);
      inRearArch = true;
    }
  }

  // Full-length two-box SUV cabin + rear cargo aperture (z from -0.78 to +2.24)
  let cabinOpenHalfWidth = 0;
  if (z > cabinStartZ && z < cabinEndZ) {
    const openIn = smoothstep(cabinStartZ, cabinStartZ + 0.14, z);
    const openOut = 1 - smoothstep(cabinEndZ - 0.14, cabinEndZ, z);
    const cargoTaper = 1 - smoothstep(1.35, cabinEndZ, z) * 0.065;
    cabinOpenHalfWidth = (halfWidthBelt - 0.12) * openIn * openOut * cargoTaper;
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
 * Evaluates the sculpted luxury SUV roofline rail and central crown for z in [-0.28, +1.98].
 * Slight rearward architectural taper with subtle floating-roof crown peaking at ~1.755m
 * (with elevated brushed roof rails bringing total vehicle height to ~1.82m).
 */
export function sampleTitanRoofRail(z: number): { halfW: number; railY: number; crownY: number } {
  const t = Math.max(0, Math.min(1, (z + 0.28) / 2.26));
  // Subtle coastal Range-Rover-inspired gentle downward taper toward the rear spoiler
  const halfW = 0.775 - 0.018 * Math.pow(t - 0.35, 2) - 0.025 * smoothstep(0.68, 1, t);
  const arch = Math.sin(t * Math.PI);
  const rearSlope = smoothstep(0.55, 1, t) * 0.028;
  const railY = 1.718 + arch * 0.022 - rearSlope;
  const crownY = railY + 0.032 + arch * 0.008;
  return { halfW, railY, crownY };
}

/**
 * Merges multiple BufferGeometries into a single non-indexed BufferGeometry
 * with finite position, normal, and uv attributes, disposing input geometries.
 */
export function mergeTitanGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  let totalVerts = 0;

  for (const raw of geometries) {
    const g = raw.index ? raw.toNonIndexed() : raw.clone();
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    const pos = g.getAttribute('position');
    if (!pos || pos.count === 0) {
      g.dispose();
      raw.dispose();
      continue;
    }
    if (!g.getAttribute('uv')) {
      const uvs = new Float32Array(pos.count * 2);
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    totalVerts += pos.count;
    normalized.push(g);
    raw.dispose();
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let offset = 0;
  for (const g of normalized) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const i3 = (offset + i) * 3;
      const i2 = (offset + i) * 2;
      positions[i3] = pos.getX(i);
      positions[i3 + 1] = pos.getY(i);
      positions[i3 + 2] = pos.getZ(i);
      normals[i3] = norm.getX(i);
      normals[i3 + 1] = norm.getY(i);
      normals[i3 + 2] = norm.getZ(i);
      uvs[i2] = uv.getX(i);
      uvs[i2 + 1] = uv.getY(i);
    }
    offset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Creates a smooth outward-facing quad surface from a grid of 3D points.
 */
function buildSurfaceGrid(
  grid: THREE.Vector3[][],
  flipWinding = false,
): THREE.BufferGeometry {
  const rows = grid.length;
  const cols = grid[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rows; r++) {
    const v = rows > 1 ? r / (rows - 1) : 0;
    for (let c = 0; c < cols; c++) {
      const u = cols > 1 ? c / (cols - 1) : 0;
      const p = grid[r][c];
      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = (r + 1) * cols + c;
      const d = (r + 1) * cols + (c + 1);
      const e = r * cols + (c + 1);
      if (flipWinding) {
        indices.push(a, b, e);
        indices.push(e, b, d);
      } else {
        indices.push(a, e, b);
        indices.push(e, d, b);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Sweeps an elliptical cross-section along a 3D Catmull-Rom curve for flush pillars,
 * window surrounds, roof rails, and sculpted wheel-arch flares.
 */
function buildSweptBarGeometry(
  points: THREE.Vector3[],
  rx: number,
  ry: number,
  tubularSegments = 14,
  radialSegments = 8,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pt = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, pt);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radialSegments; j++) {
      const ang = (j / radialSegments) * Math.PI * 2;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      v.copy(pt)
        .addScaledVector(N, cos * rx)
        .addScaledVector(B, sin * ry);
      positions.push(v.x, v.y, v.z);
      uvs.push(j / radialSegments, t);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const d = (i + 1) * stride + (j + 1);
      const e = i * stride + (j + 1);
      indices.push(a, b, e);
      indices.push(e, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildTitanStations(): number[] {
  return [
    // Bold upright SUV nose & front bumper overhang
    -2.465, -2.42, -2.34, -2.22, -2.08,
    // Front wheel arch dense arc (frontAxleZ = -1.52, r = 0.505 => [-2.025, -1.015])
    -2.01, -1.94, -1.85, -1.74, -1.62, -1.52, -1.42, -1.3, -1.19, -1.1, -1.03, -0.97,
    // Cowl & four-door cabin flanks
    -0.86, -0.76, -0.62, -0.38, -0.1, 0.2, 0.5, 0.78,
    // Rear wheel arch dense arc (rearAxleZ = 1.50, r = 0.51 => [0.99, 2.01])
    0.96, 1.02, 1.1, 1.21, 1.33, 1.44, 1.5, 1.58, 1.7, 1.82, 1.92, 1.99,
    // Rear quarter & upright tailgate overhang
    2.06, 2.18, 2.28, 2.38, 2.465,
  ];
}

/**
 * Builds the primary sculpted two-box luxury SUV body shell with elevated ground clearance,
 * clamshell bonnet, muscular wheel-arch haunches, open full-length cabin + cargo tub rim,
 * and upright rear tailgate base.
 */
export function buildTitanBodyShellGeometry(): THREE.BufferGeometry {
  const stations = buildTitanStations();
  const rings: THREE.Vector3[][] = [];

  for (const z of stations) {
    const s = evaluateTitanBodySection(z);
    const {
      sillY,
      lowerBeltY,
      beltY,
      deckY,
      centerDeckY,
      halfWidthLower,
      halfWidthMid,
      halfWidthBelt,
      cabinOpenHalfWidth,
    } = s;

    const underY = Math.min(sillY, BAYSIDE_TITAN_DIMS.groundClearance + 0.015);
    const midY = sillY + (beltY - sillY) * 0.52;
    const shoulderY = Math.max(midY + 0.06, beltY - 0.07);
    const upperShoulderY = Math.max(shoulderY + 0.04, beltY);
    const outerDeckX = halfWidthBelt * 0.925;
    const midDeckX = halfWidthBelt * 0.56;

    const open = cabinOpenHalfWidth > 0.04;
    const tubFloorY = 0.48;
    const innerEdgeX = open ? cabinOpenHalfWidth : midDeckX;
    const innerEdgeY = open ? deckY - 0.025 : centerDeckY + (deckY - centerDeckY) * 0.36;
    const centerTopY = open ? tubFloorY : centerDeckY;
    const innerWallX = open ? Math.max(0.08, cabinOpenHalfWidth * 0.88) : halfWidthBelt * 0.24;
    const innerWallY = open ? tubFloorY + 0.02 : centerDeckY + 0.005;

    const ring: THREE.Vector3[] = [
      // 0: bottom center
      new THREE.Vector3(0, underY, z),
      // 1: right inner underbody
      new THREE.Vector3(halfWidthLower * 0.72, underY, z),
      // 2: right lower rocker / arch lip
      new THREE.Vector3(halfWidthLower, sillY, z),
      // 3: right lower sculpted door swell
      new THREE.Vector3(halfWidthMid * 0.99, Math.max(sillY + 0.035, lowerBeltY), z),
      // 4: right mid flank athletic crease
      new THREE.Vector3(halfWidthMid, Math.max(sillY + 0.07, midY), z),
      // 5: right shoulder tuck
      new THREE.Vector3(halfWidthBelt * 1.015, Math.max(sillY + 0.1, shoulderY), z),
      // 6: right architectural beltline
      new THREE.Vector3(halfWidthBelt, upperShoulderY, z),
      // 7: right outer deck shoulder
      new THREE.Vector3(outerDeckX, deckY, z),
      // 8: right inner deck / cabin lip
      new THREE.Vector3(innerEdgeX, innerEdgeY, z),
      // 9: right cabin inner wall / hood crest
      new THREE.Vector3(innerWallX, innerWallY, z),
      // 10: top center (clamshell hood power dome or recessed SUV cabin floor)
      new THREE.Vector3(0, centerTopY, z),
      // 11: left cabin inner wall / hood crest
      new THREE.Vector3(-innerWallX, innerWallY, z),
      // 12: left inner deck / cabin lip
      new THREE.Vector3(-innerEdgeX, innerEdgeY, z),
      // 13: left outer deck shoulder
      new THREE.Vector3(-outerDeckX, deckY, z),
      // 14: left architectural beltline
      new THREE.Vector3(-halfWidthBelt, upperShoulderY, z),
      // 15: left shoulder tuck
      new THREE.Vector3(-halfWidthBelt * 1.015, Math.max(sillY + 0.1, shoulderY), z),
      // 16: left mid flank athletic crease
      new THREE.Vector3(-halfWidthMid, Math.max(sillY + 0.07, midY), z),
      // 17: left lower sculpted door swell
      new THREE.Vector3(-halfWidthMid * 0.99, Math.max(sillY + 0.035, lowerBeltY), z),
      // 18: left lower rocker / arch lip
      new THREE.Vector3(-halfWidthLower, sillY, z),
      // 19: left inner underbody
      new THREE.Vector3(-halfWidthLower * 0.72, underY, z),
    ];
    rings.push(ring);
  }

  const ringLen = rings[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings.length; r++) {
    const v = r / (rings.length - 1);
    for (let c = 0; c < ringLen; c++) {
      const p = rings[r][c];
      positions.push(p.x, p.y, p.z);
      uvs.push(c / ringLen, v);
    }
  }

  // Loft outward-facing quads: (a, e, b), (e, d, b)
  for (let r = 0; r < rings.length - 1; r++) {
    for (let c = 0; c < ringLen; c++) {
      const nextC = (c + 1) % ringLen;
      const a = r * ringLen + c;
      const e = r * ringLen + nextC;
      const b = (r + 1) * ringLen + c;
      const d = (r + 1) * ringLen + nextC;
      indices.push(a, e, b);
      indices.push(e, d, b);
    }
  }

  // Front upright prow cap at z = -2.475 (outward normal -Z)
  const frontCenterIdx = positions.length / 3;
  const frontS = evaluateTitanBodySection(stations[0]);
  positions.push(0, (frontS.sillY + frontS.centerDeckY) * 0.52, -2.475);
  uvs.push(0.5, 0);
  for (let c = 0; c < ringLen; c++) {
    const nextC = (c + 1) % ringLen;
    indices.push(frontCenterIdx, nextC, c);
  }

  // Rear upright tailgate lower fascia cap at z = +2.475 (outward normal +Z)
  const rearCenterIdx = positions.length / 3;
  const lastRowOffset = (rings.length - 1) * ringLen;
  const rearS = evaluateTitanBodySection(stations[stations.length - 1]);
  positions.push(0, (rearS.sillY + rearS.centerDeckY) * 0.52, 2.475);
  uvs.push(0.5, 1);
  for (let c = 0; c < ringLen; c++) {
    const nextC = (c + 1) % ringLen;
    indices.push(rearCenterIdx, lastRowOffset + c, lastRowOffset + nextC);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds the full-length SUV floating roof panel, panoramic smoked glass moonroof,
 * integrated rear roof spoiler, sculpted brushed-aluminum roof rails on stanchions,
 * and aerodynamic shark-fin antenna.
 */
export function buildTitanRoofGeometry(): {
  paintedRoof: THREE.BufferGeometry;
  moonroofGlass: THREE.BufferGeometry;
  roofRails: THREE.BufferGeometry;
  roofSpoiler: THREE.BufferGeometry;
} {
  const zStations = [-0.28, -0.05, 0.25, 0.58, 0.92, 1.26, 1.6, 1.84, 1.98];
  const uCols = [-1, -0.82, -0.5, 0, 0.5, 0.82, 1];
  const roofGrid: THREE.Vector3[][] = [];

  for (const z of zStations) {
    const { halfW, railY, crownY } = sampleTitanRoofRail(z);
    const row: THREE.Vector3[] = [];
    for (const u of uCols) {
      const x = u * halfW;
      const camber = 1 - u * u;
      const y = railY + (crownY - railY) * Math.pow(camber, 0.78);
      row.push(new THREE.Vector3(x, y, z));
    }
    roofGrid.push(row);
  }
  const paintedRoof = buildSurfaceGrid(roofGrid, true);
  // Give the floating roof real 3D slab thickness (~3.4 cm) around all 4 perimeter edges
  // (attached to spoilerParts which renders in the exact same paintMat, keeping paintedRoof upward-only!)
  const slabThick = 0.034;
  const roofEdgeParts: THREE.BufferGeometry[] = [];
  const lastRow = roofGrid.length - 1;
  const lastCol = roofGrid[0].length - 1;

  const makeEdgeSkirt = (edgePts: THREE.Vector3[], flip: boolean) => {
    const skirtGrid: THREE.Vector3[][] = [
      edgePts.map((p) => p.clone()),
      edgePts.map((p) => new THREE.Vector3(p.x, p.y - slabThick, p.z)),
    ];
    roofEdgeParts.push(buildSurfaceGrid(skirtGrid, flip));
  };

  // Left roof rail edge (u = -1, z front -> rear): outward normal -X
  makeEdgeSkirt(
    roofGrid.map((row) => row[0]),
    true,
  );
  // Right roof rail edge (u = +1, z front -> rear): outward normal +X
  makeEdgeSkirt(
    roofGrid.map((row) => row[lastCol]),
    false,
  );
  // Front windshield header edge (z = -0.28, left -> right): outward normal -Z
  makeEdgeSkirt(roofGrid[0], false);
  // Rear tailgate header edge (z = +1.98, left -> right): outward normal +Z
  makeEdgeSkirt(roofGrid[lastRow], true);

  // Full-length panoramic luxury glass moonroof spanning front & second-row seats
  const moonZ = [-0.08, 0.26, 0.62, 0.98, 1.32];
  const moonU = [-0.74, -0.37, 0, 0.37, 0.74];
  const moonGrid: THREE.Vector3[][] = [];
  for (const z of moonZ) {
    const { halfW, railY, crownY } = sampleTitanRoofRail(z);
    const row: THREE.Vector3[] = [];
    for (const u of moonU) {
      const x = u * halfW;
      const camber = 1 - u * u;
      const y = railY + (crownY - railY) * Math.pow(camber, 0.78) + 0.006;
      row.push(new THREE.Vector3(x, y, z));
    }
    moonGrid.push(row);
  }
  const moonroofGlass = buildSurfaceGrid(moonGrid, true);

  // Sculpted elevated brushed-aluminum roof rails + 3 mounting stanchions per side
  // Raises total vehicle height cleanly to ~1.82m matching catalog spec!
  const railParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const railPts: THREE.Vector3[] = [];
    const railZs = [-0.14, 0.28, 0.75, 1.24, 1.78];
    for (const z of railZs) {
      const rf = sampleTitanRoofRail(z);
      const u = 0.85;
      const camber = 1 - u * u;
      const baseY = rf.railY + (rf.crownY - rf.railY) * Math.pow(camber, 0.78);
      const lift = z === -0.14 || z === 1.78 ? 0.032 : 0.072;
      railPts.push(new THREE.Vector3(side * (rf.halfW * u), baseY + lift, z));
    }
    railParts.push(buildSweptBarGeometry(railPts, 0.022, 0.017, 20, 8));

    // Three architectural stanchions tying each roof rail cleanly to the roof channel
    for (const sz of [-0.06, 0.82, 1.7]) {
      const rf = sampleTitanRoofRail(sz);
      const u = 0.85;
      const baseY = rf.railY + (rf.crownY - rf.railY) * Math.pow(1 - u * u, 0.78);
      const post = new THREE.BoxGeometry(0.036, 0.072, 0.11);
      post.translate(side * (rf.halfW * u), baseY + 0.034, sz);
      railParts.push(post);
    }
  }

  // Sculpted integrated rear tailgate roof spoiler + shark-fin antenna + painted roof slab edges
  const spoilerParts: THREE.BufferGeometry[] = [...roofEdgeParts];
  const rfRear = sampleTitanRoofRail(1.98);
  const spoiler = new THREE.BoxGeometry(rfRear.halfW * 1.92, 0.056, 0.24);
  spoiler.rotateX(-0.08);
  spoiler.translate(0, rfRear.railY + 0.014, 2.08);
  spoilerParts.push(spoiler);

  // Subtle sculpted shark-fin roof antenna
  const fin = new THREE.BoxGeometry(0.032, 0.065, 0.17);
  fin.rotateX(0.24);
  fin.translate(0, sampleTitanRoofRail(1.68).crownY + 0.028, 1.68);
  spoilerParts.push(fin);

  return {
    paintedRoof,
    moonroofGlass,
    roofRails: mergeTitanGeometries(railParts),
    roofSpoiler: mergeTitanGeometries(spoilerParts),
  };
}

/**
 * Builds the upright, subtly curved luxury SUV windshield with outward (+Y, -Z) normals.
 */
export function buildTitanWindshieldGeometry(): THREE.BufferGeometry {
  const rows = 7;
  const cols = 9;
  const grid: THREE.Vector3[][] = [];

  const baseS = evaluateTitanBodySection(-0.76);
  const roofFront = sampleTitanRoofRail(-0.28);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1); // 0 = cowl base (z=-0.76), 1 = roof header (z=-0.28)
    const zBase = -0.76 + v * 0.48;
    const halfW = baseS.halfWidthBelt * 0.885 * (1 - v) + roofFront.halfW * v;
    const edgeY = (baseS.deckY - 0.01) * (1 - v) + roofFront.railY * v;
    const crownBoost = 0.028 * (1 - v) + (roofFront.crownY - roofFront.railY) * v;

    const row: THREE.Vector3[] = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * halfW;
      const curveZ = zBase - (1 - u * u) * (0.068 - v * 0.022);
      const y = edgeY + (1 - u * u) * crownBoost;
      row.push(new THREE.Vector3(x, y, curveZ));
    }
    grid.push(row);
  }
  return buildSurfaceGrid(grid, true);
}

/**
 * Builds the crisp, subtly raked SUV tailgate rear window sweeping from roof spoiler header
 * down to the upright rear tailgate beltline (z = 1.98 -> 2.34).
 */
export function buildTitanRearGlassGeometry(): THREE.BufferGeometry {
  const rows = 7;
  const cols = 9;
  const grid: THREE.Vector3[][] = [];

  const roofRear = sampleTitanRoofRail(1.98);
  const deckRear = evaluateTitanBodySection(2.34);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1); // 0 = roof rear header (z=1.98), 1 = tailgate beltline (z=2.34)
    const zBase = 1.98 + v * 0.36;
    const halfW = roofRear.halfW * (1 - v) + deckRear.halfWidthBelt * 0.85 * v;
    const edgeY = roofRear.railY * (1 - v) + (deckRear.deckY - 0.006) * v;
    const crownBoost = (roofRear.crownY - roofRear.railY) * (1 - v) + 0.02 * v;

    const row: THREE.Vector3[] = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * halfW;
      const curveZ = zBase + (1 - u * u) * (0.036 + v * 0.018);
      const y = edgeY + (1 - u * u) * crownBoost;
      row.push(new THREE.Vector3(x, y, curveZ));
    }
    grid.push(row);
  }
  return buildSurfaceGrid(grid, true);
}

/**
 * Builds the continuous sculpted 3-bay SUV side glazing (front door, rear passenger door,
 * and spacious rear cargo quarter window) for side (-1 left, +1 right).
 */
export function buildTitanSideWindowGeometry(side: -1 | 1): THREE.BufferGeometry {
  const zStations = [-0.66, -0.46, -0.26, 0.05, 0.36, 0.68, 1.0, 1.32, 1.66, 1.96, 2.16, 2.28];
  const grid: THREE.Vector3[][] = [];

  for (const z of zStations) {
    const s = evaluateTitanBodySection(z);
    const bottomY = s.deckY - 0.008;
    const bottomX = side * (s.halfWidthBelt * 0.895);

    let topY: number;
    let topHalfW: number;
    if (z < -0.28) {
      const t = Math.max(0, Math.min(1, (z + 0.76) / 0.48));
      const rf = sampleTitanRoofRail(-0.28);
      topY = bottomY + (rf.railY - bottomY) * Math.pow(t, 0.9);
      topHalfW = s.halfWidthBelt * 0.89 * (1 - t) + rf.halfW * t;
    } else if (z <= 1.98) {
      const rf = sampleTitanRoofRail(z);
      topY = rf.railY;
      topHalfW = rf.halfW;
    } else {
      const t = Math.max(0, Math.min(1, (z - 1.98) / 0.36));
      const rr = sampleTitanRoofRail(1.98);
      topY = rr.railY * (1 - t) + (bottomY + 0.025) * t;
      topHalfW = rr.halfW * (1 - t) + s.halfWidthBelt * 0.855 * t;
    }

    const topX = side * topHalfW;
    const row: THREE.Vector3[] = [];
    for (let k = 0; k < 4; k++) {
      const f = k / 3;
      const bow = Math.sin(f * Math.PI) * 0.018;
      const x = bottomX + (topX - bottomX) * f + side * bow;
      const y = bottomY + (topY - bottomY) * f;
      row.push(new THREE.Vector3(x, y, z));
    }
    grid.push(row);
  }
  return buildSurfaceGrid(grid, side < 0);
}

/**
 * Builds the modern "floating-roof" luxury SUV pillar suite:
 * - Flush gloss-black A-pillars, B-pillars (between front & rear doors), C-pillars (behind rear doors),
 *   and bold raked D-pillars framing the rear cargo quarter glass — all mathematically anchored to
 *   exact `evaluateTitanBodySection(z)` and `sampleTitanRoofRail(z)` coordinates so zero corners protrude!
 * - Brushed satin-silver beltline window sill & upper roof cantrail signature molding.
 */
export function buildTitanPillarsGeometry(): {
  glossPillars: THREE.BufferGeometry;
  satinWindowTrim: THREE.BufferGeometry;
} {
  const pillarParts: THREE.BufferGeometry[] = [];
  const trimParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    // Helper to compute exact flush beltline & roof-rail anchor points (inset slightly so bar never protrudes)
    const beltPt = (z: number, xScale = 0.895, yOffset = 0.005) => {
      const s = evaluateTitanBodySection(z);
      return new THREE.Vector3(side * s.halfWidthBelt * xScale, s.deckY + yOffset, z);
    };
    const roofPt = (z: number, insetX = 0.016, insetY = -0.012) => {
      const rf = sampleTitanRoofRail(z);
      return new THREE.Vector3(side * (rf.halfW - insetX), rf.railY + insetY, z);
    };
    const midPt = (p0: THREE.Vector3, p1: THREE.Vector3, bow = 0.016) =>
      new THREE.Vector3(
        (p0.x + p1.x) * 0.5 + side * bow,
        (p0.y + p1.y) * 0.5,
        (p0.z + p1.z) * 0.5,
      );

    // 1. Sleek gloss-black A-pillar (front windshield surround)
    const aBot = beltPt(-0.75, 0.888, 0.004);
    const aTop = roofPt(-0.27, 0.016, -0.012);
    pillarParts.push(buildSweptBarGeometry([aBot, midPt(aBot, aTop, 0.014), aTop], 0.028, 0.024, 12, 8));

    // 2. Flush gloss-black B-pillar (dividing front & rear passenger doors at z = 0.24)
    const bBot = beltPt(0.24, 0.896, 0.002);
    const bTop = roofPt(0.24, 0.014, -0.01);
    pillarParts.push(buildSweptBarGeometry([bBot, midPt(bBot, bTop, 0.016), bTop], 0.018, 0.044, 10, 8));

    // 3. Flush gloss-black C-pillar (dividing rear passenger door & rear cargo window at z = 1.24)
    const cBot = beltPt(1.24, 0.896, 0.002);
    const cTop = roofPt(1.24, 0.014, -0.01);
    pillarParts.push(buildSweptBarGeometry([cBot, midPt(cBot, cTop, 0.016), cTop], 0.018, 0.048, 10, 8));

    // 4. Architectural floating-roof D-pillar (framing rear cargo quarter & tailgate glass, flush to roof!)
    const dBotFront = beltPt(2.24, 0.865, 0.004);
    const dTopFront = roofPt(1.94, 0.018, -0.014);
    pillarParts.push(
      buildSweptBarGeometry(
        [dBotFront, midPt(dBotFront, dTopFront, 0.014), dTopFront],
        0.026,
        0.056,
        12,
        8,
      ),
    );
    const dBotRear = beltPt(2.33, 0.852, 0.004);
    const dTopRear = roofPt(1.99, 0.02, -0.014);
    pillarParts.push(
      buildSweptBarGeometry(
        [dBotRear, midPt(dBotRear, dTopRear, 0.012), dTopRear],
        0.024,
        0.044,
        10,
        8,
      ),
    );

    // 5. Crisp brushed satin-silver lower window beltline finisher spanning entire 3-bay greenhouse
    const beltTrimPts: THREE.Vector3[] = [];
    for (const z of [-0.7, -0.2, 0.35, 0.9, 1.5, 2.02, 2.28]) {
      const s = evaluateTitanBodySection(z);
      beltTrimPts.push(new THREE.Vector3(side * (s.halfWidthBelt * 0.908), s.deckY + 0.006, z));
    }
    trimParts.push(buildSweptBarGeometry(beltTrimPts, 0.011, 0.014, 22, 6));

    // 6. Signature satin-silver upper roof-rail cantrail accent line (tracing the floating roofline)
    const cantrailPts: THREE.Vector3[] = [];
    for (const z of [-0.26, 0.25, 0.82, 1.4, 1.94]) {
      const rf = sampleTitanRoofRail(z);
      cantrailPts.push(new THREE.Vector3(side * (rf.halfW + 0.004), rf.railY - 0.002, z));
    }
    trimParts.push(buildSweptBarGeometry(cantrailPts, 0.01, 0.012, 18, 6));
  }

  return {
    glossPillars: mergeTitanGeometries(pillarParts),
    satinWindowTrim: mergeTitanGeometries(trimParts),
  };
}

/**
 * Builds the commanding Bayside Titan architectural luxury SUV front fascia:
 * - Wide octagonal brushed satin-silver grille surround + 4 bold twin-blade horizontal slats
 *   over recessed dark geometric honeycomb mesh (distinct from Solstice Royale vertical waterfall!)
 * - Sculpted all-terrain front bumper with matte protective lower lip, satin-silver skid plate
 *   with vertical strakes, twin metallic recovery tow hooks, and lower fog-light intakes
 * - Flush-integrated Matrix-LED headlights with signature C-bracket DRLs, amber outer markers,
 *   and clear curved protective lenses.
 */
export function buildTitanFrontFasciaGeometry(): {
  grilleSatin: THREE.BufferGeometry;
  grilleMesh: THREE.BufferGeometry;
  bumperMatte: THREE.BufferGeometry;
  skidPlateSatin: THREE.BufferGeometry;
  hlHousings: THREE.BufferGeometry;
  hlChromeBezels: THREE.BufferGeometry;
  hlEmissiveOptics: THREE.BufferGeometry;
  hlAmberMarkers: THREE.BufferGeometry;
  hlClearLenses: THREE.BufferGeometry;
} {
  const satinParts: THREE.BufferGeometry[] = [];
  const meshParts: THREE.BufferGeometry[] = [];
  const matteParts: THREE.BufferGeometry[] = [];
  const skidParts: THREE.BufferGeometry[] = [];
  const hlHousingParts: THREE.BufferGeometry[] = [];
  const hlBezelParts: THREE.BufferGeometry[] = [];
  const hlEmissiveParts: THREE.BufferGeometry[] = [];
  const hlAmberParts: THREE.BufferGeometry[] = [];
  const hlLensParts: THREE.BufferGeometry[] = [];

  // 1. Wide Octagonal Architectural Luxury SUV Grille (centered at y = 0.855, z = -2.46)
  const cavity = new THREE.BoxGeometry(1.1, 0.34, 0.09);
  cavity.translate(0, 0.855, -2.435);
  meshParts.push(cavity);

  // Satin-silver outer octagonal surround frame
  const topFrame = new THREE.BoxGeometry(1.16, 0.04, 0.068);
  topFrame.translate(0, 1.028, -2.462);
  satinParts.push(topFrame);

  const botFrame = new THREE.BoxGeometry(1.04, 0.036, 0.068);
  botFrame.translate(0, 0.682, -2.462);
  satinParts.push(botFrame);

  for (const side of [-1, 1] as const) {
    const sideFrame = new THREE.BoxGeometry(0.04, 0.355, 0.068);
    sideFrame.rotateZ(side * -0.15);
    sideFrame.translate(side * 0.555, 0.855, -2.462);
    satinParts.push(sideFrame);
  }

  // 4 signature bold horizontal satin-silver architectural slats + central vertical rib
  for (const sy of [0.745, 0.818, 0.892, 0.965]) {
    const wSlat = 1.04 + ((sy - 0.745) / 0.22) * 0.08;
    const slat = new THREE.BoxGeometry(wSlat, 0.022, 0.048);
    slat.translate(0, sy, -2.468);
    satinParts.push(slat);
  }
  const centerEmblemPlate = new THREE.BoxGeometry(0.16, 0.095, 0.045);
  centerEmblemPlate.translate(0, 0.855, -2.478);
  satinParts.push(centerEmblemPlate);

  // 2. Sculpted All-Terrain Front Bumper, Lower Air Dam, Skid Plate & Corner Fog-Light Intakes
  const lowerBumper = new THREE.BoxGeometry(1.94, 0.22, 0.14);
  lowerBumper.translate(0, 0.535, -2.425);
  matteParts.push(lowerBumper);

  const lowerIntake = new THREE.BoxGeometry(1.08, 0.14, 0.08);
  lowerIntake.translate(0, 0.54, -2.47);
  meshParts.push(lowerIntake);

  // Brushed satin-silver front all-terrain skid plate curving neatly beneath the approach angle
  const skidFront = new THREE.BoxGeometry(1.18, 0.16, 0.065);
  skidFront.rotateX(0.42);
  skidFront.translate(0, 0.415, -2.415);
  skidParts.push(skidFront);

  const skidUnder = new THREE.BoxGeometry(1.14, 0.045, 0.38);
  skidUnder.translate(0, 0.348, -2.23);
  skidParts.push(skidUnder);

  // Sculpted skid plate protective ribs
  for (const rx of [-0.36, -0.18, 0, 0.18, 0.36]) {
    const rib = new THREE.BoxGeometry(0.032, 0.15, 0.04);
    rib.rotateX(0.42);
    rib.translate(rx, 0.415, -2.435);
    skidParts.push(rib);
  }

  // Twin recessed satin-silver recovery tow hooks integrated cleanly beside skid plate
  for (const side of [-1, 1] as const) {
    const hook = new THREE.TorusGeometry(0.036, 0.012, 8, 14);
    hook.rotateY(Math.PI / 2);
    hook.translate(side * 0.48, 0.44, -2.475);
    skidParts.push(hook);

    // Sculpted side bumper corner intakes + LED all-weather fog lights flush on lower bumper face
    const fogCove = new THREE.BoxGeometry(0.31, 0.13, 0.072);
    fogCove.rotateY(side * -0.08);
    fogCove.translate(side * 0.75, 0.545, -2.47);
    matteParts.push(fogCove);

    const fogBezel = new THREE.BoxGeometry(0.24, 0.03, 0.028);
    fogBezel.rotateY(side * -0.08);
    fogBezel.translate(side * 0.75, 0.578, -2.502);
    satinParts.push(fogBezel);

    const fogLed = new THREE.BoxGeometry(0.18, 0.042, 0.024);
    fogLed.rotateY(side * -0.08);
    fogLed.translate(side * 0.75, 0.542, -2.506);
    hlEmissiveParts.push(fogLed);
  }

  // 3. Flush-Integrated Sleek Matrix-LED Headlights + C-Bracket DRLs + Amber Side Markers
  // Positioned flush-proud on the upright front prow fascia (z = -2.465..-2.475) so all optics shine cleanly!
  for (const side of [-1, 1] as const) {
    const yaw = side * -0.08;
    const cx = side * 0.745;
    const cy = 0.915;
    const cz = -2.452;

    // Dark internal optical housing sitting flush-proud on the front fender cheek
    const housing = new THREE.BoxGeometry(0.34, 0.142, 0.078);
    housing.rotateY(yaw);
    housing.translate(cx, cy, cz);
    hlHousingParts.push(housing);

    // Triple Matrix-LED projector cubes + chrome micro-bezels clearly visible behind jewel lens
    for (const off of [-0.085, 0.005, 0.095]) {
      const px = cx + off * side;
      const pz = cz - 0.024 + Math.abs(off + 0.085) * 0.065;
      const bezel = new THREE.BoxGeometry(0.07, 0.066, 0.024);
      bezel.rotateY(yaw);
      bezel.translate(px, cy - 0.006, pz);
      hlBezelParts.push(bezel);

      const core = new THREE.BoxGeometry(0.052, 0.048, 0.022);
      core.rotateY(yaw);
      core.translate(px, cy - 0.006, pz - 0.012);
      hlEmissiveParts.push(core);
    }

    // Iconic C-bracket Luxury SUV Daytime Running Light (upper brow + lower signature bar + outer vertical bar)
    const drlTop = new THREE.BoxGeometry(0.335, 0.022, 0.02);
    drlTop.rotateY(yaw);
    drlTop.translate(cx, cy + 0.056, cz - 0.036);
    hlEmissiveParts.push(drlTop);

    const drlBot = new THREE.BoxGeometry(0.3, 0.018, 0.02);
    drlBot.rotateY(yaw);
    drlBot.translate(cx - side * 0.01, cy - 0.056, cz - 0.036);
    hlEmissiveParts.push(drlBot);

    const drlOuter = new THREE.BoxGeometry(0.022, 0.122, 0.022);
    drlOuter.rotateY(yaw);
    drlOuter.translate(side * 0.902, cy, cz - 0.022);
    hlEmissiveParts.push(drlOuter);

    // Flush amber outer fender turn-signal marker wrapping neatly onto the fender shoulder
    const amber = new THREE.BoxGeometry(0.034, 0.092, 0.054);
    amber.rotateY(side * -0.32);
    amber.translate(side * 0.935, cy, cz + 0.058);
    hlAmberParts.push(amber);

    // Clear flush protective outer jewel glass lens
    const lens = new THREE.BoxGeometry(0.355, 0.148, 0.016);
    lens.rotateY(yaw);
    lens.translate(cx, cy, cz - 0.046);
    hlLensParts.push(lens);
  }

  return {
    grilleSatin: mergeTitanGeometries(satinParts),
    grilleMesh: mergeTitanGeometries(meshParts),
    bumperMatte: mergeTitanGeometries(matteParts),
    skidPlateSatin: mergeTitanGeometries(skidParts),
    hlHousings: mergeTitanGeometries(hlHousingParts),
    hlChromeBezels: mergeTitanGeometries(hlBezelParts),
    hlEmissiveOptics: mergeTitanGeometries(hlEmissiveParts),
    hlAmberMarkers: mergeTitanGeometries(hlAmberParts),
    hlClearLenses: mergeTitanGeometries(hlLensParts),
  };
}

/**
 * Builds the upright luxury SUV rear tailgate & bumper fascia:
 * - Signature vertical-blade outer ruby taillights linked by a sleek continuous horizontal LED lightbar
 * - High-mounted third brake light (CHMSL) embedded inside the rear roof spoiler
 * - Sculpted matte rear bumper, brushed satin-silver rear skid/diffuser plate, twin trapezoidal
 *   brushed-silver exhaust finishers, recessed `TITAN` license plate cove, and `BAYSIDE TITAN` badge.
 */
export function buildTitanRearFasciaGeometry(): {
  taillightEmissive: THREE.BufferGeometry;
  rearDarkHousing: THREE.BufferGeometry;
  rearSatinTrim: THREE.BufferGeometry;
  exhaustOuter: THREE.BufferGeometry;
  exhaustInner: THREE.BufferGeometry;
  licensePlate: THREE.BufferGeometry;
  rearEmblem: THREE.BufferGeometry;
  hoodEmblem: THREE.BufferGeometry;
} {
  const tailParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const satinParts: THREE.BufferGeometry[] = [];
  const exOuterParts: THREE.BufferGeometry[] = [];
  const exInnerParts: THREE.BufferGeometry[] = [];

  // Full-width dark gloss optical lightbar channel spanning tailgate flush inside rear shoulders
  const barChannel = new THREE.BoxGeometry(1.66, 0.115, 0.05);
  barChannel.translate(0, 1.025, 2.438);
  darkParts.push(barChannel);

  // Continuous sleek horizontal ruby LED tail lightbar across tailgate
  const centerLightBar = new THREE.BoxGeometry(1.58, 0.036, 0.032);
  centerLightBar.translate(0, 1.025, 2.466);
  tailParts.push(centerLightBar);

  for (const side of [-1, 1] as const) {
    const yaw = side * 0.1;
    // Bold vertical SUV signature taillight blades tucked flush inside outer tailgate corners
    const vertHousing = new THREE.BoxGeometry(0.13, 0.295, 0.062);
    vertHousing.rotateY(yaw);
    vertHousing.translate(side * 0.822, 1.01, 2.42);
    darkParts.push(vertHousing);

    const vertBlade = new THREE.BoxGeometry(0.082, 0.26, 0.036);
    vertBlade.rotateY(yaw);
    vertBlade.translate(side * 0.826, 1.01, 2.452);
    tailParts.push(vertBlade);

    // Side quarter wrap-around taillight return flush along rear quarter shoulder
    const sideWrap = new THREE.BoxGeometry(0.034, 0.215, 0.15);
    sideWrap.translate(side * 0.908, 1.01, 2.315);
    tailParts.push(sideWrap);

    // Lower rear bumper horizontal reflector strip
    const refl = new THREE.BoxGeometry(0.28, 0.034, 0.026);
    refl.rotateY(yaw);
    refl.translate(side * 0.74, 0.565, 2.445);
    tailParts.push(refl);

    // Integrated brushed-silver trapezoidal twin SUV exhaust finishers
    const exBezel = new THREE.BoxGeometry(0.21, 0.095, 0.12);
    exBezel.translate(side * 0.66, 0.455, 2.425);
    exOuterParts.push(exBezel);

    const exBore = new THREE.BoxGeometry(0.165, 0.062, 0.13);
    exBore.translate(side * 0.66, 0.455, 2.432);
    exInnerParts.push(exBore);
  }

  // High-mounted third brake light (CHMSL) centered in the rear roof spoiler
  const chmsl = new THREE.BoxGeometry(0.52, 0.026, 0.03);
  chmsl.translate(0, 1.71, 2.205);
  tailParts.push(chmsl);

  // Rugged sculpted matte-graphite rear bumper + brushed satin-silver rear skid/diffuser plate
  const rearBumper = new THREE.BoxGeometry(1.96, 0.22, 0.14);
  rearBumper.translate(0, 0.51, 2.41);
  darkParts.push(rearBumper);

  const rearSkid = new THREE.BoxGeometry(1.16, 0.15, 0.075);
  rearSkid.rotateX(-0.32);
  rearSkid.translate(0, 0.445, 2.435);
  satinParts.push(rearSkid);

  for (const rx of [-0.34, -0.17, 0, 0.17, 0.34]) {
    const strake = new THREE.BoxGeometry(0.03, 0.13, 0.04);
    strake.rotateX(-0.32);
    strake.translate(rx, 0.445, 2.455);
    satinParts.push(strake);
  }

  // Tailgate brushed horizontal trim garnish above license plate
  const tailgateBar = new THREE.BoxGeometry(1.48, 0.024, 0.035);
  tailgateBar.translate(0, 0.96, 2.468);
  satinParts.push(tailgateBar);

  // Recessed rear license plate cove & plate plane
  const platePocket = new THREE.BoxGeometry(0.5, 0.22, 0.044);
  platePocket.translate(0, 0.78, 2.45);
  darkParts.push(platePocket);

  const licensePlate = new THREE.PlaneGeometry(0.42, 0.185);
  licensePlate.translate(0, 0.78, 2.476);

  // Tailgate brushed silver `BAYSIDE TITAN` script + clamshell hood leading-edge `TITAN` script
  const rearEmblem = new THREE.PlaneGeometry(0.56, 0.056);
  rearEmblem.translate(0, 1.125, 2.472);

  const hoodEmblem = new THREE.PlaneGeometry(0.46, 0.052);
  hoodEmblem.rotateX(-Math.PI / 2 + 0.22);
  hoodEmblem.rotateZ(Math.PI);
  hoodEmblem.translate(0, 1.072, -2.355);

  return {
    taillightEmissive: mergeTitanGeometries(tailParts),
    rearDarkHousing: mergeTitanGeometries(darkParts),
    rearSatinTrim: mergeTitanGeometries(satinParts),
    exhaustOuter: mergeTitanGeometries(exOuterParts),
    exhaustInner: mergeTitanGeometries(exInnerParts),
    licensePlate,
    rearEmblem,
    hoodEmblem,
  };
}

/**
 * Builds the all-terrain luxury SUV exterior details:
 * - Prominent matte-graphite sculpted wheel-arch fender flares hugging all 4 wheel wells
 * - Integrated brushed-silver & rubberized side steps / running boards between wheel arches
 * - Sculpted two-tone SUV side mirrors, 4 flush satin-silver door handles, front fender vent gill
 * - Front windshield wipers & rear tailgate wiper
 * - Contour-hugging flush door & tailgate panel shutlines (no floating straight strips!)
 * - Protective underbody pan + tall arched wheel-well liners clearing ±0.52 rad full steering lock.
 */
export function buildTitanExteriorDetailsGeometry(): {
  fenderFlaresAndCladding: THREE.BufferGeometry;
  sideStepsSatin: THREE.BufferGeometry;
  mirrorHousings: THREE.BufferGeometry;
  mirrorStalks: THREE.BufferGeometry;
  mirrorGlass: THREE.BufferGeometry;
  satinHandlesAndBadges: THREE.BufferGeometry;
  underbodyAndLiners: THREE.BufferGeometry;
  wipers: THREE.BufferGeometry;
  panelSeams: THREE.BufferGeometry;
} {
  const { frontAxleZ, rearAxleZ, wheelRadius, frontArchRadius, rearArchRadius } = BAYSIDE_TITAN_DIMS;

  const claddingParts: THREE.BufferGeometry[] = [];
  const stepParts: THREE.BufferGeometry[] = [];
  const mirHousingParts: THREE.BufferGeometry[] = [];
  const mirStalkParts: THREE.BufferGeometry[] = [];
  const mirGlassParts: THREE.BufferGeometry[] = [];
  const handleParts: THREE.BufferGeometry[] = [];
  const seamParts: THREE.BufferGeometry[] = [];
  const wiperParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    // 1. Prominent sculpted wheel-arch cladding flares (front & rear)
    for (const arch of [
      { cz: frontAxleZ, r: frontArchRadius + 0.012 },
      { cz: rearAxleZ, r: rearArchRadius + 0.012 },
    ]) {
      const pts: THREE.Vector3[] = [];
      const samples = 13;
      for (let i = 0; i <= samples; i++) {
        const ang = (i / samples) * Math.PI; // 0 = rear lip, PI = front lip
        const pz = arch.cz + Math.cos(ang) * arch.r;
        const py = Math.max(BAYSIDE_TITAN_DIMS.groundClearance + 0.02, wheelRadius + Math.sin(ang) * arch.r);
        const s = evaluateTitanBodySection(pz);
        pts.push(new THREE.Vector3(side * (s.halfWidthMid + 0.008), py, pz));
      }
      claddingParts.push(buildSweptBarGeometry(pts, 0.036, 0.044, 16, 8));
    }

    // Lower rocker sill matte protective cladding strip between arches
    const rockerClad = new THREE.BoxGeometry(0.055, 0.115, 2.02);
    rockerClad.translate(side * 1.035, 0.395, -0.01);
    claddingParts.push(rockerClad);

    // 2. Integrated Luxury SUV Side Steps / Running Boards (satin aluminum step + matte grip pad)
    const stepBase = new THREE.BoxGeometry(0.16, 0.048, 1.92);
    stepBase.translate(side * 1.075, 0.325, -0.01);
    stepParts.push(stepBase);

    const stepGrip = new THREE.BoxGeometry(0.115, 0.016, 1.82);
    stepGrip.translate(side * 1.088, 0.354, -0.01);
    claddingParts.push(stepGrip);

    // Step mounting brackets tucked under rocker
    for (const bz of [-0.68, 0.0, 0.66]) {
      const brk = new THREE.BoxGeometry(0.22, 0.042, 0.075);
      brk.translate(side * 0.96, 0.315, bz);
      claddingParts.push(brk);
    }

    // 3. Commanding SUV door-mounted side mirrors
    const stalk = new THREE.BoxGeometry(0.125, 0.042, 0.08);
    stalk.rotateZ(side * 0.18);
    stalk.translate(side * 1.03, 1.195, -0.52);
    mirStalkParts.push(stalk);

    const housing = new THREE.BoxGeometry(0.21, 0.145, 0.13);
    housing.translate(side * 1.155, 1.24, -0.5);
    mirHousingParts.push(housing);

    const glass = new THREE.PlaneGeometry(0.175, 0.115);
    glass.translate(side * 1.155, 1.24, -0.432);
    mirGlassParts.push(glass);

    // 4. Four flush brushed satin-silver SUV door handles + front fender architectural vent gill
    for (const hz of [0.06, 0.96]) {
      const s = evaluateTitanBodySection(hz);
      const handle = new THREE.BoxGeometry(0.028, 0.032, 0.18);
      handle.translate(side * (s.halfWidthMid + 0.002), 1.02, hz);
      handleParts.push(handle);
    }

    // Architectural vertical side fender luxury vent garnish behind front wheel arch
    const gill = new THREE.BoxGeometry(0.022, 0.24, 0.095);
    gill.translate(side * 1.055, 0.89, -0.92);
    handleParts.push(gill);

    // Subtle brushed lower door trim spear sitting neatly above rocker cladding
    const doorSpear = new THREE.BoxGeometry(0.024, 0.036, 1.88);
    doorSpear.translate(side * 1.062, 0.485, -0.01);
    handleParts.push(doorSpear);

    // 5. Flush vertical door shutlines anchored directly to evaluated flank halfWidthMid (zero float!)
    for (const sz of [-0.74, 0.24, 1.2]) {
      const s = evaluateTitanBodySection(sz);
      const seamH = Math.max(0.25, s.beltY - Math.max(s.sillY + 0.04, 0.46));
      const seamCenterY = Math.max(s.sillY + 0.04, 0.46) + seamH * 0.5;
      const doorSeam = new THREE.BoxGeometry(0.01, seamH, 0.011);
      doorSeam.translate(side * (s.halfWidthMid - 0.002), seamCenterY, sz);
      seamParts.push(doorSeam);
    }

    // Contour-following clamshell bonnet seam (follows exact evaluated hood deckY!)
    const hoodPts: THREE.Vector3[] = [];
    for (const hz of [-2.28, -1.92, -1.52, -1.14, -0.82]) {
      const s = evaluateTitanBodySection(hz);
      hoodPts.push(new THREE.Vector3(side * (s.halfWidthBelt * 0.87), s.deckY + 0.002, hz));
    }
    seamParts.push(buildSweptBarGeometry(hoodPts, 0.006, 0.006, 12, 4));
  }

  // 6. Front windshield wipers + rear tailgate wiper blade
  for (const wx of [-0.32, 0.26]) {
    const blade = new THREE.BoxGeometry(0.48, 0.016, 0.02);
    blade.rotateY(-0.08);
    blade.translate(wx, 1.175, -0.78);
    wiperParts.push(blade);
  }
  const rearWiper = new THREE.BoxGeometry(0.38, 0.018, 0.022);
  rearWiper.rotateZ(0.05);
  rearWiper.translate(0.12, 1.215, 2.345);
  wiperParts.push(rearWiper);

  // 7. Protective flat all-terrain underbody skid spine + 4 tall arched wheel-well liners
  const linerParts: THREE.BufferGeometry[] = [];
  const spine = new THREE.BoxGeometry(1.16, 0.08, 4.1);
  spine.translate(0, 0.35, 0);
  linerParts.push(spine);

  const midPan = new THREE.BoxGeometry(1.66, 0.08, 1.98);
  midPan.translate(0, 0.35, -0.01);
  linerParts.push(midPan);

  const wells: Array<{ x: number; z: number; r: number; w: number; wallX: number; side: -1 | 1 }> = [
    { x: -0.82, z: frontAxleZ, r: frontArchRadius - 0.015, w: 0.34, wallX: -0.64, side: -1 },
    { x: 0.82, z: frontAxleZ, r: frontArchRadius - 0.015, w: 0.34, wallX: 0.64, side: 1 },
    { x: -0.82, z: rearAxleZ, r: rearArchRadius - 0.015, w: 0.34, wallX: -0.64, side: -1 },
    { x: 0.82, z: rearAxleZ, r: rearArchRadius - 0.015, w: 0.34, wallX: 0.64, side: 1 },
  ];

  for (const wp of wells) {
    const archShell = new THREE.CylinderGeometry(wp.r, wp.r, wp.w, 16, 1, true, 0, Math.PI);
    archShell.rotateZ(Math.PI / 2);
    const idx = archShell.getIndex();
    if (idx) {
      const arr = idx.array as Uint16Array | Uint32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const tmp = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = tmp;
      }
      idx.needsUpdate = true;
    }
    archShell.translate(wp.x, wheelRadius - 0.01, wp.z);
    archShell.computeVertexNormals();
    linerParts.push(archShell);

    const innerArch = new THREE.CircleGeometry(wp.r * 0.94, 14, 0, Math.PI);
    innerArch.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerArch.translate(wp.wallX, wheelRadius - 0.01, wp.z);
    innerArch.computeVertexNormals();
    linerParts.push(innerArch);

    const lowerH = Math.max(0.05, wheelRadius - 0.01 - 0.33);
    const innerLower = new THREE.PlaneGeometry(wp.r * 1.84, lowerH);
    innerLower.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerLower.translate(wp.wallX, 0.33 + lowerH * 0.5, wp.z);
    innerLower.computeVertexNormals();
    linerParts.push(innerLower);
  }

  return {
    fenderFlaresAndCladding: mergeTitanGeometries(claddingParts),
    sideStepsSatin: mergeTitanGeometries(stepParts),
    mirrorHousings: mergeTitanGeometries(mirHousingParts),
    mirrorStalks: mergeTitanGeometries(mirStalkParts),
    mirrorGlass: mergeTitanGeometries(mirGlassParts),
    satinHandlesAndBadges: mergeTitanGeometries(handleParts),
    underbodyAndLiners: mergeTitanGeometries(linerParts),
    wipers: mergeTitanGeometries(wiperParts),
    panelSeams: mergeTitanGeometries(seamParts),
  };
}

function buildLuxurySuvCaptainSeat(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Wide supportive SUV captain seat cushion
  const cushion = new THREE.BoxGeometry(0.52, 0.14, 0.5);
  cushion.translate(0, 0.07, 0);
  parts.push(cushion);

  for (const side of [-1, 1] as const) {
    const bolster = new THREE.BoxGeometry(0.085, 0.16, 0.48);
    bolster.translate(side * 0.25, 0.1, 0.01);
    parts.push(bolster);
  }

  // Tall upright command-position SUV backrest
  const back = new THREE.BoxGeometry(0.52, 0.58, 0.12);
  back.rotateX(-0.16);
  back.translate(0, 0.38, 0.24);
  parts.push(back);

  // Sculpted luxury headrest
  const headrest = new THREE.BoxGeometry(0.26, 0.16, 0.11);
  headrest.rotateX(-0.1);
  headrest.translate(0, 0.76, 0.29);
  parts.push(headrest);

  return mergeTitanGeometries(parts);
}

/**
 * Builds the airy, spacious Bayside Titan coastal luxury SUV interior:
 * - Elevated cabin floor, full command center console, 4-door interior cards with armrests,
 *   and rear luggage bay with retractable privacy cover & cargo side panels
 * - Warm coastal cream/oyster leather front captain seats + 3-passenger second-row bench with 3 headrests
 * - Wide architectural dashboard with brushed satin-aluminum inlay, panoramic digital cockpit screen,
 *   4-spoke luxury SUV steering wheel, and overhead rear-view mirror.
 */
export function buildTitanInteriorGeometries(): {
  cabinTub: THREE.BufferGeometry;
  leatherSeats: THREE.BufferGeometry;
  satinInteriorTrim: THREE.BufferGeometry;
  dashboard: THREE.BufferGeometry;
  steeringWheel: THREE.BufferGeometry;
  cockpitDisplay: THREE.BufferGeometry;
  rearViewMirror: THREE.BufferGeometry;
} {
  const tubParts: THREE.BufferGeometry[] = [];
  const seatParts: THREE.BufferGeometry[] = [];
  const trimParts: THREE.BufferGeometry[] = [];
  const dashParts: THREE.BufferGeometry[] = [];

  // Elevated full-length SUV cabin floor + rear cargo load deck
  const floor = new THREE.BoxGeometry(1.68, 0.07, 2.86);
  floor.translate(0, 0.5, 0.72);
  tubParts.push(floor);

  // Dark luxury interior roof headliner (downward-facing underside beneath paintedRoof slab)
  const headlinerZ = [-0.26, 0.24, 0.84, 1.44, 1.95];
  const headlinerU = [-0.94, -0.5, 0, 0.5, 0.94];
  const headlinerGrid: THREE.Vector3[][] = [];
  for (const z of headlinerZ) {
    const { halfW, railY, crownY } = sampleTitanRoofRail(z);
    const row: THREE.Vector3[] = [];
    for (const u of headlinerU) {
      const camber = 1 - u * u;
      const y = railY + (crownY - railY) * Math.pow(camber, 0.78) - 0.032;
      row.push(new THREE.Vector3(u * halfW, y, z));
    }
    headlinerGrid.push(row);
  }
  tubParts.push(buildSurfaceGrid(headlinerGrid, false));

  // Tall commanding SUV center console tunnel & forward bridge
  const consoleTunnel = new THREE.BoxGeometry(0.32, 0.44, 1.86);
  consoleTunnel.translate(0, 0.74, 0.18);
  tubParts.push(consoleTunnel);

  // Rear cargo compartment raised floor deck + luggage privacy tonneau cover + tailgate inner sill
  const cargoDeck = new THREE.BoxGeometry(1.62, 0.22, 0.92);
  cargoDeck.translate(0, 0.64, 1.72);
  tubParts.push(cargoDeck);

  const privacyCover = new THREE.BoxGeometry(1.56, 0.04, 0.78);
  privacyCover.translate(0, 1.08, 1.74);
  tubParts.push(privacyCover);

  // Brushed aluminum cargo floor tie-down rails (visible through rear quarter windows!)
  for (const rx of [-0.56, 0.56]) {
    const rail = new THREE.BoxGeometry(0.035, 0.02, 0.76);
    rail.translate(rx, 0.76, 1.74);
    trimParts.push(rail);
  }

  // Four-door interior door cards + cargo side trim panels + brushed aluminum door inlays
  for (const side of [-1, 1] as const) {
    const card = new THREE.BoxGeometry(0.085, 0.64, 2.74);
    card.translate(side * 0.85, 0.86, 0.74);
    tubParts.push(card);

    const armrest = new THREE.BoxGeometry(0.12, 0.08, 1.88);
    armrest.translate(side * 0.78, 0.88, 0.24);
    tubParts.push(armrest);

    const doorInlay = new THREE.BoxGeometry(0.032, 0.075, 1.82);
    doorInlay.translate(side * 0.79, 1.03, 0.24);
    trimParts.push(doorInlay);
  }

  // Front driver & passenger commanding captain seats
  const frontL = buildLuxurySuvCaptainSeat();
  frontL.translate(-0.46, 0.58, -0.02);
  seatParts.push(frontL);

  const frontR = buildLuxurySuvCaptainSeat();
  frontR.translate(0.46, 0.58, -0.02);
  seatParts.push(frontR);

  // Spacious 3-across second-row luxury SUV bench + 3 headrests + fold-down center armrest
  const rearCushion = new THREE.BoxGeometry(1.52, 0.16, 0.54);
  rearCushion.translate(0, 0.68, 0.88);
  seatParts.push(rearCushion);

  const rearBack = new THREE.BoxGeometry(1.52, 0.58, 0.14);
  rearBack.rotateX(-0.16);
  rearBack.translate(0, 1.0, 1.15);
  seatParts.push(rearBack);

  for (const hx of [-0.48, 0, 0.48]) {
    const hr = new THREE.BoxGeometry(hx === 0 ? 0.22 : 0.26, 0.15, 0.11);
    hr.rotateX(-0.08);
    hr.translate(hx, 1.37, 1.2);
    seatParts.push(hr);
  }

  // Wide architectural SUV dashboard + gauge binnacle + steering column
  const dashBody = new THREE.BoxGeometry(1.66, 0.34, 0.42);
  dashBody.translate(0, 1.04, -0.62);
  dashParts.push(dashBody);

  const binnacle = new THREE.BoxGeometry(0.48, 0.14, 0.26);
  binnacle.translate(-0.46, 1.22, -0.54);
  dashParts.push(binnacle);

  const steerCol = new THREE.CylinderGeometry(0.038, 0.046, 0.24, 10);
  steerCol.rotateX(Math.PI / 2 - 0.2);
  steerCol.translate(-0.46, 1.11, -0.47);
  dashParts.push(steerCol);

  // Brushed satin-aluminum horizontal dashboard fascia & center console trim + drive-mode dial
  const dashTrim = new THREE.BoxGeometry(1.6, 0.085, 0.042);
  dashTrim.translate(0, 1.07, -0.405);
  trimParts.push(dashTrim);

  const consoleTop = new THREE.BoxGeometry(0.24, 0.032, 0.96);
  consoleTop.translate(0, 0.97, -0.02);
  trimParts.push(consoleTop);

  const modeDial = new THREE.CylinderGeometry(0.034, 0.038, 0.028, 12);
  modeDial.translate(0, 0.995, -0.18);
  trimParts.push(modeDial);

  // Luxury 4-spoke heated SUV steering wheel
  const swParts: THREE.BufferGeometry[] = [];
  const swRim = new THREE.TorusGeometry(0.18, 0.021, 10, 24);
  swRim.rotateX(-0.22);
  swRim.translate(-0.46, 1.15, -0.35);
  swParts.push(swRim);

  const swHub = new THREE.CylinderGeometry(0.058, 0.058, 0.04, 12);
  swHub.rotateX(Math.PI / 2 - 0.22);
  swHub.translate(-0.46, 1.15, -0.355);
  swParts.push(swHub);

  for (const ang of [0.22, Math.PI - 0.22, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36]) {
    const sp = new THREE.BoxGeometry(0.155, 0.026, 0.02);
    sp.translate(0.078, 0, 0);
    sp.rotateZ(ang);
    sp.rotateX(-0.22);
    sp.translate(-0.46, 1.15, -0.355);
    swParts.push(sp);
  }

  // Panoramic dual-screen illuminated digital cockpit & center coastal nav display
  const cockpitDisplay = new THREE.PlaneGeometry(0.92, 0.145);
  cockpitDisplay.rotateX(-0.1);
  cockpitDisplay.translate(-0.18, 1.18, -0.39);

  // Overhead rear-view mirror suspended from windshield header
  const rmParts: THREE.BufferGeometry[] = [];
  const rmStalk = new THREE.CylinderGeometry(0.009, 0.011, 0.11, 6);
  rmStalk.translate(0, 1.66, -0.36);
  rmParts.push(rmStalk);
  const rmHead = new THREE.BoxGeometry(0.22, 0.06, 0.03);
  rmHead.translate(0, 1.595, -0.37);
  rmParts.push(rmHead);

  return {
    cabinTub: mergeTitanGeometries(tubParts),
    leatherSeats: mergeTitanGeometries(seatParts),
    satinInteriorTrim: mergeTitanGeometries(trimParts),
    dashboard: mergeTitanGeometries(dashParts),
    steeringWheel: mergeTitanGeometries(swParts),
    cockpitDisplay,
    rearViewMirror: mergeTitanGeometries(rmParts),
  };
}

export interface TitanWheelParts {
  tireGeo: THREE.BufferGeometry;
  rimAlloyGeo: THREE.BufferGeometry;
  rimPocketGeo: THREE.BufferGeometry;
  centerCapGeo: THREE.BufferGeometry;
  innerBarrelGeo: THREE.BufferGeometry;
  rotorGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
}

/**
 * Builds the Bayside Titan all-terrain luxury SUV wheel assembly centered at origin,
 * oriented so the outer face points toward +X (right side; mirrored via rotation.y = PI on left).
 *
 * - Outer radius = 0.42m (exact match to vehiclePhysics.ts wheelSpin calculation!)
 * - Width = 0.31m (muscular wide all-terrain luxury SUV stance)
 * - Rounded Lathe all-terrain tyre with substantial off-road-capable sidewall profile
 * - 6-twin-spoke machined-face + dark-anthracite-pocket SUV alloy rim with 6 lug nuts & center cap
 * - Oversized vented SUV brake rotor + stationary brake caliper.
 */
export function buildTitanWheelParts(
  wheelWidth = BAYSIDE_TITAN_DIMS.wheelWidth,
): TitanWheelParts {
  const R = BAYSIDE_TITAN_DIMS.wheelRadius; // 0.42m
  const rimR = R * 0.61; // ~0.256m (beefy all-terrain luxury sidewall ratio!)
  const halfW = wheelWidth * 0.5; // 0.155m

  // 1. Rounded All-Terrain SUV Tyre Profile via LatheGeometry (revolution axis rotated to X)
  const lathePts: THREE.Vector2[] = [
    new THREE.Vector2(rimR - 0.01, -halfW * 0.84),
    new THREE.Vector2(rimR + 0.034, -halfW * 0.97),
    new THREE.Vector2(R - 0.056, -halfW),
    new THREE.Vector2(R - 0.018, -halfW * 0.94),
    new THREE.Vector2(R, -halfW * 0.76),
    new THREE.Vector2(R, halfW * 0.76),
    new THREE.Vector2(R - 0.018, halfW * 0.94),
    new THREE.Vector2(R - 0.056, halfW),
    new THREE.Vector2(rimR + 0.034, halfW * 0.97),
    new THREE.Vector2(rimR - 0.01, halfW * 0.84),
  ];
  const tireGeo = new THREE.LatheGeometry(lathePts, 30);
  tireGeo.rotateZ(-Math.PI / 2);
  tireGeo.computeVertexNormals();
  tireGeo.computeBoundingBox();
  tireGeo.computeBoundingSphere();

  // 2. Signature 6-Twin-Spoke Machined-Face Luxury SUV Alloy Rim
  const rimParts: THREE.BufferGeometry[] = [];
  const pocketParts: THREE.BufferGeometry[] = [];

  const outerLip = new THREE.TorusGeometry(rimR - 0.008, 0.022, 10, 28);
  outerLip.rotateY(Math.PI / 2);
  outerLip.translate(halfW * 0.74, 0, 0);
  rimParts.push(outerLip);

  const hubRing = new THREE.TorusGeometry(rimR * 0.38, 0.018, 8, 22);
  hubRing.rotateY(Math.PI / 2);
  hubRing.translate(halfW * 0.64, 0, 0);
  rimParts.push(hubRing);

  const pairCount = 6;
  for (let i = 0; i < pairCount; i++) {
    const baseAngle = (i / pairCount) * Math.PI * 2;
    const len = rimR * 0.64;

    // Two machined parallel-tapered twin spokes per sector
    for (const sgn of [-1, 1] as const) {
      const spoke = new THREE.BoxGeometry(0.03, len, 0.024);
      spoke.translate(0, rimR * 0.34 + len * 0.5 - 0.012, sgn * 0.028);
      spoke.rotateX(baseAngle);
      spoke.translate(halfW * 0.66, 0, 0);
      rimParts.push(spoke);
    }

    // Contrasting dark-anthracite recessed structural webbing between twin spokes
    const pocket = new THREE.BoxGeometry(0.022, len * 0.86, 0.034);
    pocket.translate(0, rimR * 0.36 + len * 0.44, 0);
    pocket.rotateX(baseAngle);
    pocket.translate(halfW * 0.56, 0, 0);
    pocketParts.push(pocket);

    // Sculpted exposed SUV lug bolt recessed around center cap
    const lug = new THREE.CylinderGeometry(0.011, 0.011, 0.026, 6);
    lug.rotateZ(Math.PI / 2);
    lug.translate(
      halfW * 0.69,
      Math.cos(baseAngle + Math.PI / 6) * (rimR * 0.29),
      Math.sin(baseAngle + Math.PI / 6) * (rimR * 0.29),
    );
    rimParts.push(lug);
  }
  const rimAlloyGeo = mergeTitanGeometries(rimParts);
  const rimPocketGeo = mergeTitanGeometries(pocketParts);

  // 3. Brushed satin-silver center cap
  const centerCap = new THREE.CylinderGeometry(rimR * 0.21, rimR * 0.23, 0.038, 18);
  centerCap.rotateZ(Math.PI / 2);
  centerCap.translate(halfW * 0.72, 0, 0);
  const centerCapGeo = mergeTitanGeometries([centerCap]);

  // 4. Dark inner wheel barrel
  const barrel = new THREE.CylinderGeometry(rimR - 0.016, rimR - 0.016, wheelWidth * 0.76, 22, 1, true);
  barrel.rotateZ(Math.PI / 2);
  const innerBarrelGeo = mergeTitanGeometries([barrel]);

  // 5. Oversized vented SUV brake rotor sitting inboard behind spokes
  const rotor = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.028, 22);
  rotor.rotateZ(Math.PI / 2);
  rotor.translate(halfW * 0.14, 0, 0);
  const rotorGeo = mergeTitanGeometries([rotor]);

  // 6. Stationary heavy-duty luxury SUV brake caliper
  const calBody = new THREE.BoxGeometry(0.082, 0.155, 0.088);
  calBody.rotateX(0.32);
  calBody.translate(halfW * 0.2, 0.06, 0.15);
  const caliperGeo = mergeTitanGeometries([calBody]);

  return {
    tireGeo,
    rimAlloyGeo,
    rimPocketGeo,
    centerCapGeo,
    innerBarrelGeo,
    rotorGeo,
    caliperGeo,
  };
}
