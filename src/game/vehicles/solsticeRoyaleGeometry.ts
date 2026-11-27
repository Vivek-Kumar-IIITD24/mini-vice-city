import * as THREE from 'three';

/**
 * Pure parametric geometry builders for the Phase 2C-1 Solstice Royale
 * Executive Luxury Grand Sedan.
 *
 * Local coordinate system matches VehicleRig:
 *   +X = right, +Y = up, -Z = forward (nose), +Z = rear (tail).
 * Ground contact plane is y = 0.
 *
 * Kept DOM-free so proportions, three-box silhouette, wheel-arch clearances,
 * interior placement, and mesh normals can be unit-tested directly under node:test.
 */

export const SOLSTICE_ROYALE_DIMS = {
  length: 4.9,
  width: 2.1,
  height: 1.42,
  wheelRadius: 0.34,
  wheelWidth: 0.25,
  frontAxleZ: -1.52,
  rearAxleZ: 1.5,
  frontTrackHalf: 0.9,
  rearTrackHalf: 0.9,
  frontArchRadius: 0.415,
  rearArchRadius: 0.42,
  cabinStartZ: -0.82,
  cabinEndZ: 1.38,
  groundClearance: 0.21,
} as const;

export interface SolsticeBodySection {
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
 * Evaluates the sculpted three-box luxury saloon cross-section at station z in [-2.45, +2.45].
 * Characterized by an upright dignified prow, long sculpted bonnet, continuous executive
 * shoulder crease across four doors, generous open cabin aperture, and a formal rear trunk deck.
 */
export function evaluateSolsticeBodySection(z: number): SolsticeBodySection {
  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    frontArchRadius,
    rearArchRadius,
    cabinStartZ,
    cabinEndZ,
    groundClearance,
  } = SOLSTICE_ROYALE_DIMS;

  // Regal, slightly tapered nose and formal tapered tail (wider & straighter through doors than a sports coupe)
  const noseTaper = smoothstep(-2.46, -1.86, z);
  const tailTaper = 1 - smoothstep(1.88, 2.46, z) * 0.1;

  // Dignified fender shoulders around wheel arches with poised unbroken flank between axles
  const frontFenderFlare = bell(z, frontAxleZ + 0.02, 0.72) * 0.048;
  const rearQuarterFlare = bell(z, rearAxleZ - 0.04, 0.82) * 0.056;
  const sideSculptInset = bell(z, 0.02, 0.95) * 0.014;

  const baseHalfW = (0.86 + 0.145 * noseTaper) * tailTaper;
  const halfWidthMid = Math.min(1.045, baseHalfW + frontFenderFlare + rearQuarterFlare - sideSculptInset);
  const halfWidthLower = halfWidthMid * (0.955 - (1 - noseTaper) * 0.035);
  const halfWidthBelt = halfWidthMid * (0.925 - (1 - noseTaper) * 0.02);

  // Stately executive beltline: tall upright nose prow -> gently rising bonnet -> poised flat cabin belt -> formal trunk
  const prowRise = smoothstep(-2.45, -2.02, z);
  const bonnetSlope = smoothstep(-2.22, -0.78, z);
  const rearDeckRise = smoothstep(0.65, 1.48, z) * 0.045;
  const trunkTailDrop = smoothstep(1.98, 2.45, z) * 0.048;

  const beltY = 0.75 + 0.08 * prowRise + 0.085 * bonnetSlope + rearDeckRise - trunkTailDrop;
  const lowerBeltY = Math.max(groundClearance + 0.22, beltY * 0.62);

  // Subtle rounded outer shoulder crowning slightly above the sharp executive crease
  const deckY =
    beltY +
    0.032 * smoothstep(-2.36, -1.7, z) -
    0.015 * smoothstep(2.15, 2.45, z);

  // Sculpted central luxury hood power-dome (front) and gentle trunk crown (rear)
  const hoodPowerDome = bell(z, -1.55, 0.82) * 0.036 * smoothstep(-2.42, -2.18, z);
  const trunkCrown = bell(z, 1.9, 0.52) * 0.024;
  const prowDrop = (1 - smoothstep(-2.45, -2.18, z)) * 0.034;
  const tailRoll = smoothstep(2.24, 2.45, z) * 0.026;
  const centerDeckY = deckY + 0.012 + hoodPowerDome + trunkCrown - prowDrop - tailRoll;

  // Underbody rocker sill height with genuine circular wheel-arch cutouts
  let sillY =
    groundClearance +
    smoothstep(1.88, 2.45, z) * 0.055 +
    (1 - smoothstep(-2.45, -2.05, z)) * 0.025;
  let inFrontArch = false;
  let inRearArch = false;

  const dzFront = z - frontAxleZ;
  if (Math.abs(dzFront) < frontArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, frontArchRadius * frontArchRadius - dzFront * dzFront));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.065);
      inFrontArch = true;
    }
  }

  const dzRear = z - rearAxleZ;
  if (Math.abs(dzRear) < rearArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, rearArchRadius * rearArchRadius - dzRear * dzRear));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.07);
      inRearArch = true;
    }
  }

  // Spacious 4-door executive cabin aperture between windshield cowl (-0.82) and rear glass base (+1.38)
  let cabinOpenHalfWidth = 0;
  if (z > cabinStartZ && z < cabinEndZ) {
    const openIn = smoothstep(cabinStartZ, cabinStartZ + 0.14, z);
    const openOut = 1 - smoothstep(cabinEndZ - 0.14, cabinEndZ, z);
    const subtleRearTaper = 1 - smoothstep(0.6, cabinEndZ, z) * 0.07;
    cabinOpenHalfWidth = (halfWidthBelt - 0.115) * openIn * openOut * subtleRearTaper;
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
 * Merges multiple BufferGeometries into a single non-indexed BufferGeometry
 * with finite position, normal, and uv attributes, disposing input geometries.
 */
export function mergeSolsticeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
 * Helper to create a smooth outward-facing quad surface from a grid of 3D points.
 * Grid orientation: `rows` = longitudinal stations (increasing Z), `cols` = transverse samples.
 * Set `flipWinding` so normals point outward.
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

function buildSolsticeStations(): number[] {
  return [
    // Front prow & nose
    -2.44, -2.4, -2.32, -2.22, -2.08, -1.96,
    // Front wheel arch dense arc (frontAxleZ = -1.52, r = 0.415 => [-1.935, -1.105])
    -1.92, -1.86, -1.78, -1.68, -1.58, -1.52, -1.46, -1.36, -1.26, -1.18, -1.12, -1.07,
    // Bonnet to windshield cowl & 4-door cabin flank
    -0.96, -0.84, -0.76, -0.62, -0.4, -0.14, 0.14, 0.42, 0.7, 0.96,
    // Rear wheel arch dense arc (rearAxleZ = 1.50, r = 0.42 => [1.08, 1.92])
    1.07, 1.12, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.88, 1.93,
    // Formal rear trunk deck & tail
    2.04, 2.16, 2.28, 2.38, 2.44,
  ];
}

/**
 * Builds the primary sculpted three-box luxury saloon body shell with circular wheel arches,
 * long sculpted bonnet, continuous executive shoulder line, open 4-door cabin tub rim,
 * and formal rear boot deck.
 */
export function buildSolsticeBodyShellGeometry(): THREE.BufferGeometry {
  const stations = buildSolsticeStations();
  const rings: THREE.Vector3[][] = [];

  for (const z of stations) {
    const s = evaluateSolsticeBodySection(z);
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

    const underY = Math.min(sillY, SOLSTICE_ROYALE_DIMS.groundClearance + 0.01);
    const midY = sillY + (beltY - sillY) * 0.54;
    const shoulderY = Math.max(midY + 0.05, beltY - 0.055);
    const upperShoulderY = Math.max(shoulderY + 0.035, beltY);
    const outerDeckX = halfWidthBelt * 0.92;
    const midDeckX = halfWidthBelt * 0.56;

    // 17-point symmetric closed ring walking CCW when looking from +Z toward -Z:
    // bottom center -> right sill -> right lower flank -> right mid flank -> right shoulder
    // -> right deck -> top deck/cabin rim -> left deck -> left shoulder -> left mid -> left lower -> left sill
    const open = cabinOpenHalfWidth > 0.04;
    const tubFloorY = 0.34;
    const innerEdgeX = open ? cabinOpenHalfWidth : midDeckX;
    const innerEdgeY = open ? deckY - 0.025 : centerDeckY + (deckY - centerDeckY) * 0.38;
    const centerTopY = open ? tubFloorY : centerDeckY;
    const innerWallX = open ? Math.max(0.08, cabinOpenHalfWidth * 0.88) : halfWidthBelt * 0.22;
    const innerWallY = open ? tubFloorY + 0.02 : centerDeckY + 0.004;

    const ring: THREE.Vector3[] = [
      // 0: bottom center
      new THREE.Vector3(0, underY, z),
      // 1: right inner underbody edge
      new THREE.Vector3(halfWidthLower * 0.72, underY, z),
      // 2: right lower rocker / arch lip
      new THREE.Vector3(halfWidthLower, sillY, z),
      // 3: right lower flank swell
      new THREE.Vector3(halfWidthMid * 0.99, Math.max(sillY + 0.03, lowerBeltY), z),
      // 4: right mid flank crease
      new THREE.Vector3(halfWidthMid, Math.max(sillY + 0.06, midY), z),
      // 5: right shoulder tuck
      new THREE.Vector3(halfWidthBelt * 1.015, Math.max(sillY + 0.09, shoulderY), z),
      // 6: right executive beltline crease
      new THREE.Vector3(halfWidthBelt, upperShoulderY, z),
      // 7: right outer deck shoulder
      new THREE.Vector3(outerDeckX, deckY, z),
      // 8: right inner deck / cabin lip
      new THREE.Vector3(innerEdgeX, innerEdgeY, z),
      // 9: right cabin inner wall / hood crest
      new THREE.Vector3(innerWallX, innerWallY, z),
      // 10: top center (bonnet dome, trunk crown, or recessed cabin floor)
      new THREE.Vector3(0, centerTopY, z),
      // 11: left cabin inner wall / hood crest
      new THREE.Vector3(-innerWallX, innerWallY, z),
      // 12: left inner deck / cabin lip
      new THREE.Vector3(-innerEdgeX, innerEdgeY, z),
      // 13: left outer deck shoulder
      new THREE.Vector3(-outerDeckX, deckY, z),
      // 14: left executive beltline crease
      new THREE.Vector3(-halfWidthBelt, upperShoulderY, z),
      // 15: left shoulder tuck
      new THREE.Vector3(-halfWidthBelt * 1.015, Math.max(sillY + 0.09, shoulderY), z),
      // 16: left mid flank crease
      new THREE.Vector3(-halfWidthMid, Math.max(sillY + 0.06, midY), z),
      // 17: left lower flank swell
      new THREE.Vector3(-halfWidthMid * 0.99, Math.max(sillY + 0.03, lowerBeltY), z),
      // 18: left lower rocker / arch lip
      new THREE.Vector3(-halfWidthLower, sillY, z),
      // 19: left inner underbody edge
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

  // Loft quads around ring with verified outward normals: (a, e, b), (e, d, b)
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

  // Front upright nose cap at z = -2.45 (outward normal -Z)
  const frontCenterIdx = positions.length / 3;
  const frontS = evaluateSolsticeBodySection(stations[0]);
  positions.push(0, (frontS.sillY + frontS.centerDeckY) * 0.52, -2.45);
  uvs.push(0.5, 0);
  for (let c = 0; c < ringLen; c++) {
    const nextC = (c + 1) % ringLen;
    indices.push(frontCenterIdx, nextC, c);
  }

  // Rear formal fascia cap at z = +2.45 (outward normal +Z)
  const rearCenterIdx = positions.length / 3;
  const lastRowOffset = (rings.length - 1) * ringLen;
  const rearS = evaluateSolsticeBodySection(stations[stations.length - 1]);
  positions.push(0, (rearS.sillY + rearS.centerDeckY) * 0.52, 2.45);
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
 * Evaluates a point along the Solstice Royale greenhouse roofline.
 * Returns roof outer rail half-width and rail/center heights for z in [-0.26, +0.94].
 */
function sampleRoofRail(z: number): { halfW: number; railY: number; crownY: number } {
  const t = Math.max(0, Math.min(1, (z + 0.26) / 1.2));
  const halfW = 0.70 - 0.025 * Math.pow(t - 0.38, 2) - 0.02 * smoothstep(0.65, 1, t);
  const arch = Math.sin(t * Math.PI);
  const railY = 1.365 + arch * 0.026;
  const crownY = railY + 0.031 + arch * 0.008;
  return { halfW, railY, crownY };
}

/**
 * Builds the softly crowned executive saloon roof panel (painted surround) and recessed
 * tinted panoramic glass sunroof panel.
 */
export function buildSolsticeRoofGeometry(): {
  paintedRoof: THREE.BufferGeometry;
  sunroofGlass: THREE.BufferGeometry;
} {
  const zStations = [-0.26, -0.14, 0.02, 0.2, 0.4, 0.6, 0.78, 0.94];
  const uCols = [-1, -0.82, -0.5, 0, 0.5, 0.82, 1];
  const roofGrid: THREE.Vector3[][] = [];

  for (const z of zStations) {
    const { halfW, railY, crownY } = sampleRoofRail(z);
    const row: THREE.Vector3[] = [];
    for (const u of uCols) {
      const x = u * halfW;
      const camber = 1 - u * u;
      const y = railY + (crownY - railY) * Math.pow(camber, 0.75);
      row.push(new THREE.Vector3(x, y, z));
    }
    roofGrid.push(row);
  }
  // Increasing Z rows and increasing X cols (-halfW -> +halfW): (B-A)x(C-A) = (+Z)x(+X) = +Y -> flipWinding = true!
  const paintedRoof = buildSurfaceGrid(roofGrid, true);

  // Subtle recessed panoramic glass sunroof sitting 5mm proud of roof crown in the central cabin bay
  const sunZ = [-0.12, 0.08, 0.3, 0.52, 0.72];
  const sunU = [-0.72, -0.36, 0, 0.36, 0.72];
  const sunGrid: THREE.Vector3[][] = [];
  for (const z of sunZ) {
    const { halfW, railY, crownY } = sampleRoofRail(z);
    const row: THREE.Vector3[] = [];
    for (const u of sunU) {
      const x = u * halfW;
      const camber = 1 - u * u;
      const y = railY + (crownY - railY) * Math.pow(camber, 0.75) + 0.006;
      row.push(new THREE.Vector3(x, y, z));
    }
    sunGrid.push(row);
  }
  const sunroofGlass = buildSurfaceGrid(sunGrid, true);

  return { paintedRoof, sunroofGlass };
}

/**
 * Builds the curved, formally raked executive windshield with upward-forward outward normals.
 */
export function buildSolsticeWindshieldGeometry(): THREE.BufferGeometry {
  const rows = 7;
  const cols = 9;
  const grid: THREE.Vector3[][] = [];

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1); // 0 = cowl base (z=-0.78), 1 = roof header (z=-0.26)
    const zBase = -0.78 + v * 0.52;
    const baseS = evaluateSolsticeBodySection(-0.78);
    const roofFront = sampleRoofRail(-0.26);

    const halfW = (baseS.halfWidthBelt * 0.87) * (1 - v) + roofFront.halfW * v;
    const edgeY = (baseS.deckY - 0.01) * (1 - v) + roofFront.railY * v;
    const crownBoost = 0.025 * (1 - v) + (roofFront.crownY - roofFront.railY) * v;

    const row: THREE.Vector3[] = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1; // -1..+1
      const x = u * halfW;
      const curveZ = zBase - (1 - u * u) * (0.075 - v * 0.025);
      const y = edgeY + (1 - u * u) * crownBoost;
      row.push(new THREE.Vector3(x, y, curveZ));
    }
    grid.push(row);
  }
  // Rows advance +Z & +Y, cols advance +X => flipWinding = true gives outward (+Y, -Z) normal!
  return buildSurfaceGrid(grid, true);
}

/**
 * Builds the formal rear saloon backlight glass sweeping smoothly from roof rear header to trunk deck.
 */
export function buildSolsticeRearGlassGeometry(): THREE.BufferGeometry {
  const rows = 7;
  const cols = 9;
  const grid: THREE.Vector3[][] = [];

  const roofRear = sampleRoofRail(0.94);
  const deckRear = evaluateSolsticeBodySection(1.38);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1); // 0 = roof rear header (z=0.94), 1 = trunk cowl (z=1.38)
    const zBase = 0.94 + v * 0.44;
    const halfW = roofRear.halfW * (1 - v) + deckRear.halfWidthBelt * 0.84 * v;
    const edgeY = roofRear.railY * (1 - v) + (deckRear.deckY - 0.005) * v;
    const crownBoost = (roofRear.crownY - roofRear.railY) * (1 - v) + 0.022 * v;

    const row: THREE.Vector3[] = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1; // -1..+1
      const x = u * halfW;
      const curveZ = zBase + (1 - u * u) * (0.045 + v * 0.02);
      const y = edgeY + (1 - u * u) * crownBoost;
      row.push(new THREE.Vector3(x, y, curveZ));
    }
    grid.push(row);
  }
  // Rows advance +Z & -Y, cols advance +X => flipWinding = true gives outward (+Y, +Z) normal!
  return buildSurfaceGrid(grid, true);
}

/**
 * Builds the continuous sculpted four-door + rear opera-quarter side glazing for side (-1 left, +1 right).
 */
export function buildSolsticeSideWindowGeometry(side: -1 | 1): THREE.BufferGeometry {
  const zStations = [-0.66, -0.45, -0.22, 0.02, 0.26, 0.52, 0.78, 1.0, 1.18, 1.3];
  const grid: THREE.Vector3[][] = [];

  for (const z of zStations) {
    const s = evaluateSolsticeBodySection(z);
    const bottomY = s.deckY - 0.005;
    const bottomX = side * (s.halfWidthBelt * 0.885);

    // Top window edge follows A-pillar up to z=-0.26, roof rail across [-0.26..0.94], and formal C-pillar taper
    let topY: number;
    let topHalfW: number;
    if (z < -0.26) {
      const t = Math.max(0, Math.min(1, (z + 0.76) / 0.5));
      const rf = sampleRoofRail(-0.26);
      topY = bottomY + (rf.railY - bottomY) * Math.pow(t, 0.88);
      topHalfW = s.halfWidthBelt * 0.88 * (1 - t) + rf.halfW * t;
    } else if (z <= 0.94) {
      const rf = sampleRoofRail(z);
      topY = rf.railY;
      topHalfW = rf.halfW;
    } else {
      const t = Math.max(0, Math.min(1, (z - 0.94) / 0.42));
      const rr = sampleRoofRail(0.94);
      topY = rr.railY * (1 - t) + (bottomY + 0.03) * t;
      topHalfW = rr.halfW * (1 - t) + s.halfWidthBelt * 0.85 * t;
    }

    const topX = side * topHalfW;
    const row: THREE.Vector3[] = [];
    for (let k = 0; k < 4; k++) {
      const f = k / 3; // 0 = bottom sill, 1 = top rail
      const bow = Math.sin(f * Math.PI) * 0.022;
      const x = bottomX + (topX - bottomX) * f + side * bow;
      const y = bottomY + (topY - bottomY) * f;
      row.push(new THREE.Vector3(x, y, z));
    }
    grid.push(row);
  }
  // Rows advance +Z, cols advance +Y:
  // (B-A)x(C-A) = (+Z)x(+Y) = -X.
  // For left side (-1), we want normal -X => flipWinding = true.
  // For right side (+1), we want normal +X => flipWinding = false.
  return buildSurfaceGrid(grid, side < 0);
}

/**
 * Sweeps an elliptical cross-section along a 3D Catmull-Rom curve for sculpted window pillars.
 */
function buildSweptBarGeometry(
  points: THREE.Vector3[],
  rx: number,
  ry: number,
  tubularSegments = 12,
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

/**
 * Builds the executive greenhouse pillar structure:
 * - Painted A-pillars & wide formal luxury C-pillars (classic saloon Hofmeister silhouette)
 * - Gloss-black flush B-pillars dividing front and rear executive doors
 * - Chrome daylight-opening (DLO) upper window surround trim
 */
export function buildSolsticePillarsGeometry(): {
  paintedPillars: THREE.BufferGeometry;
  bPillars: THREE.BufferGeometry;
  chromeWindowTrim: THREE.BufferGeometry;
} {
  const paintedParts: THREE.BufferGeometry[] = [];
  const bParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    // Swept painted A-pillar
    paintedParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.815, 0.905, -0.76),
          new THREE.Vector3(side * 0.765, 1.15, -0.52),
          new THREE.Vector3(side * 0.695, 1.365, -0.25),
        ],
        0.032,
        0.028,
        12,
        8,
      ),
    );

    // Formal stately painted C-pillar (sculpted thick twin-swept sail panel behind rear doors)
    paintedParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.69, 1.365, 0.88),
          new THREE.Vector3(side * 0.755, 1.19, 1.14),
          new THREE.Vector3(side * 0.825, 0.955, 1.36),
        ],
        0.048,
        0.075,
        12,
        8,
      ),
    );
    // Inner rear sail infill tying C-pillar cleanly into trunk shoulder
    paintedParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.685, 1.365, 0.96),
          new THREE.Vector3(side * 0.745, 1.18, 1.22),
          new THREE.Vector3(side * 0.805, 0.955, 1.42),
        ],
        0.04,
        0.055,
        10,
        8,
      ),
    );

    // Gloss-black flush B-pillar (between front and rear executive doors)
    bParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.84, 0.915, 0.25),
          new THREE.Vector3(side * 0.785, 1.15, 0.26),
          new THREE.Vector3(side * 0.70, 1.385, 0.26),
        ],
        0.018,
        0.042,
        10,
        8,
      ),
    );

    // Thin chrome daylight-opening (DLO) arch molding framing the upper side windows & beltline
    chromeParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.84, 0.93, -0.68),
          new THREE.Vector3(side * 0.78, 1.17, -0.45),
          new THREE.Vector3(side * 0.71, 1.38, -0.22),
          new THREE.Vector3(side * 0.705, 1.39, 0.34),
          new THREE.Vector3(side * 0.695, 1.375, 0.88),
          new THREE.Vector3(side * 0.77, 1.17, 1.12),
          new THREE.Vector3(side * 0.845, 0.955, 1.28),
        ],
        0.011,
        0.011,
        24,
        6,
      ),
    );
    // Horizontal chrome beltline window sill strip
    chromeParts.push(
      buildSweptBarGeometry(
        [
          new THREE.Vector3(side * 0.86, 0.915, -0.7),
          new THREE.Vector3(side * 0.875, 0.922, 0.28),
          new THREE.Vector3(side * 0.855, 0.948, 1.3),
        ],
        0.01,
        0.012,
        16,
        6,
      ),
    );
  }

  return {
    paintedPillars: mergeSolsticeGeometries(paintedParts),
    bPillars: mergeSolsticeGeometries(bParts),
    chromeWindowTrim: mergeSolsticeGeometries(chromeParts),
  };
}

/**
 * Builds the signature monumental Solstice Royale vertical-slat waterfall luxury grille,
 * lower executive bumper intake with horizontal chrome/champagne bar, and sculpted bumper fascias.
 */
export function buildSolsticeFrontGrilleGeometry(): {
  grilleChrome: THREE.BufferGeometry;
  grilleRecess: THREE.BufferGeometry;
  bumperAccentBar: THREE.BufferGeometry;
} {
  const chromeParts: THREE.BufferGeometry[] = [];
  const recessParts: THREE.BufferGeometry[] = [];
  const accentParts: THREE.BufferGeometry[] = [];

  // Dark recessed radiator cavity behind the temple waterfall grille
  const cavity = new THREE.BoxGeometry(0.84, 0.36, 0.09);
  cavity.translate(0, 0.56, -2.415);
  recessParts.push(cavity);

  // Sculpted outer chrome temple surround frame (top arch, bottom sill, left & right uprights)
  const topBar = new THREE.BoxGeometry(0.92, 0.038, 0.065);
  topBar.translate(0, 0.745, -2.442);
  chromeParts.push(topBar);

  const botBar = new THREE.BoxGeometry(0.84, 0.034, 0.065);
  botBar.translate(0, 0.375, -2.442);
  chromeParts.push(botBar);

  for (const side of [-1, 1] as const) {
    const pillar = new THREE.BoxGeometry(0.036, 0.38, 0.065);
    pillar.rotateZ(side * -0.09);
    pillar.translate(side * 0.435, 0.56, -2.442);
    chromeParts.push(pillar);
  }

  // 11 vertical luxury waterfall vanes
  const vaneCount = 11;
  for (let i = 0; i < vaneCount; i++) {
    const frac = (i / (vaneCount - 1)) * 2 - 1;
    const vx = frac * 0.36;
    const vane = new THREE.BoxGeometry(0.016, 0.34, 0.045);
    vane.translate(vx, 0.56, -2.448);
    chromeParts.push(vane);
  }

  // Wide lower executive bumper intake recess (refined, understated — no race splitter)
  const lowerIntake = new THREE.BoxGeometry(1.56, 0.135, 0.08);
  lowerIntake.translate(0, 0.295, -2.41);
  recessParts.push(lowerIntake);

  // Horizontal brushed champagne-gold luxury lower bumper blade + side corner whiskers
  const lowerBlade = new THREE.BoxGeometry(1.64, 0.024, 0.055);
  lowerBlade.translate(0, 0.295, -2.448);
  accentParts.push(lowerBlade);

  const chinLip = new THREE.BoxGeometry(1.74, 0.022, 0.12);
  chinLip.translate(0, 0.218, -2.39);
  accentParts.push(chinLip);

  return {
    grilleChrome: mergeSolsticeGeometries(chromeParts),
    grilleRecess: mergeSolsticeGeometries(recessParts),
    bumperAccentBar: mergeSolsticeGeometries(accentParts),
  };
}

/**
 * Builds authoritative dual-projector horizontal luxury jewel headlights + amber side markers
 * and clear curved outer lenses.
 */
export function buildSolsticeHeadlightsGeometry(): {
  housings: THREE.BufferGeometry;
  chromeBezels: THREE.BufferGeometry;
  emissiveOptics: THREE.BufferGeometry;
  amberMarkers: THREE.BufferGeometry;
  clearLenses: THREE.BufferGeometry;
} {
  const housingParts: THREE.BufferGeometry[] = [];
  const bezelParts: THREE.BufferGeometry[] = [];
  const emissiveParts: THREE.BufferGeometry[] = [];
  const amberParts: THREE.BufferGeometry[] = [];
  const lensParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    const yaw = side * -0.18;

    // Dark recessed headlamp bucket
    const bucket = new THREE.BoxGeometry(0.41, 0.135, 0.12);
    bucket.rotateY(yaw);
    bucket.translate(side * 0.72, 0.655, -2.335);
    housingParts.push(bucket);

    // Dual rectangular crystal projector surrounds + glowing LED cores
    for (const offset of [-0.095, 0.075]) {
      const px = side * (0.72 + offset * side);
      const pz = -2.372 + Math.abs(px - side * 0.5) * 0.14;

      const bezel = new THREE.BoxGeometry(0.115, 0.082, 0.032);
      bezel.rotateY(yaw);
      bezel.translate(px, 0.648, pz);
      bezelParts.push(bezel);

      const core = new THREE.BoxGeometry(0.088, 0.056, 0.024);
      core.rotateY(yaw);
      core.translate(px, 0.648, pz - 0.012);
      emissiveParts.push(core);
    }

    // Crisp horizontal luxury LED DRL brow spanning top edge of each lamp
    const drl = new THREE.BoxGeometry(0.39, 0.022, 0.024);
    drl.rotateY(yaw);
    drl.translate(side * 0.725, 0.706, -2.378);
    emissiveParts.push(drl);

    // Subtle amber outer corner turn signal accent
    const amber = new THREE.BoxGeometry(0.055, 0.078, 0.03);
    amber.rotateY(side * -0.45);
    amber.translate(side * 0.915, 0.652, -2.285);
    amberParts.push(amber);

    // Clear outer protective jewel glass lens sitting flush over lamp cluster
    const lens = new THREE.BoxGeometry(0.425, 0.142, 0.022);
    lens.rotateY(yaw);
    lens.translate(side * 0.725, 0.656, -2.396);
    lensParts.push(lens);
  }

  return {
    housings: mergeSolsticeGeometries(housingParts),
    chromeBezels: mergeSolsticeGeometries(bezelParts),
    emissiveOptics: mergeSolsticeGeometries(emissiveParts),
    amberMarkers: mergeSolsticeGeometries(amberParts),
    clearLenses: mergeSolsticeGeometries(lensParts),
  };
}

/**
 * Builds the executive wrap-around split ruby-crystal taillight clusters, champagne-chrome
 * horizontal trunk garnish bar, recessed license plate cove, and lower bumper reflectors.
 */
export function buildSolsticeRearFasciaGeometry(): {
  taillightEmissive: THREE.BufferGeometry;
  rearChromeTrim: THREE.BufferGeometry;
  rearDarkCove: THREE.BufferGeometry;
  exhaustOuter: THREE.BufferGeometry;
  exhaustInner: THREE.BufferGeometry;
  licensePlate: THREE.BufferGeometry;
  rearEmblem: THREE.BufferGeometry;
} {
  const tailParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const exOuterParts: THREE.BufferGeometry[] = [];
  const exInnerParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    const yaw = side * 0.14;
    // Recessed dark jewel housing behind each taillight
    const housing = new THREE.BoxGeometry(0.5, 0.155, 0.055);
    housing.rotateY(yaw);
    housing.translate(side * 0.68, 0.745, 2.385);
    darkParts.push(housing);

    // Dual-tier glowing ruby LED light bars (distinctive executive horizontal split optic)
    for (const dy of [-0.034, 0.034]) {
      const bar = new THREE.BoxGeometry(0.46, 0.044, 0.036);
      bar.rotateY(yaw);
      bar.translate(side * 0.68, 0.745 + dy, 2.414);
      tailParts.push(bar);
    }

    // Wrap-around rear fender side marker return
    const sideWrap = new THREE.BoxGeometry(0.042, 0.12, 0.18);
    sideWrap.translate(side * 0.915, 0.745, 2.29);
    tailParts.push(sideWrap);

    // Lower bumper slim ruby reflector
    const refl = new THREE.BoxGeometry(0.24, 0.03, 0.026);
    refl.rotateY(yaw);
    refl.translate(side * 0.69, 0.365, 2.418);
    tailParts.push(refl);

    // Integrated luxury oval twin exhaust finishers (one per side, refined chrome bezel)
    const exOuter = new THREE.CylinderGeometry(0.055, 0.058, 0.14, 14, 1, true);
    exOuter.rotateX(Math.PI / 2);
    exOuter.scale(1.48, 0.76, 1);
    exOuter.translate(side * 0.61, 0.285, 2.415);
    exOuterParts.push(exOuter);

    const exRim = new THREE.TorusGeometry(0.055, 0.009, 8, 16);
    exRim.scale(1.48, 0.76, 1);
    exRim.translate(side * 0.61, 0.285, 2.482);
    exOuterParts.push(exRim);

    const exBore = new THREE.CylinderGeometry(0.046, 0.046, 0.13, 12);
    exBore.rotateX(Math.PI / 2);
    exBore.scale(1.46, 0.74, 1);
    exBore.translate(side * 0.61, 0.285, 2.412);
    exInnerParts.push(exBore);
  }

  // High-mounted center third brake light (CHMSL) along top of rear glass
  const chmsl = new THREE.BoxGeometry(0.42, 0.022, 0.028);
  chmsl.translate(0, 1.355, 0.99);
  tailParts.push(chmsl);

  // Horizontal chrome/champagne trunk garnish bar connecting inner tail clusters
  const trunkBar = new THREE.BoxGeometry(1.16, 0.026, 0.035);
  trunkBar.translate(0, 0.755, 2.442);
  chromeParts.push(trunkBar);

  // Lower rear bumper satin accent trim
  const rearValanceTrim = new THREE.BoxGeometry(1.56, 0.024, 0.045);
  rearValanceTrim.translate(0, 0.325, 2.442);
  chromeParts.push(rearValanceTrim);

  // Subtle dark lower valance strip & license plate pocket
  const valance = new THREE.BoxGeometry(1.58, 0.11, 0.09);
  valance.translate(0, 0.275, 2.40);
  darkParts.push(valance);

  const platePocket = new THREE.BoxGeometry(0.48, 0.2, 0.042);
  platePocket.translate(0, 0.56, 2.435);
  darkParts.push(platePocket);

  const licensePlate = new THREE.PlaneGeometry(0.4, 0.175);
  licensePlate.translate(0, 0.56, 2.46);

  const rearEmblem = new THREE.PlaneGeometry(0.44, 0.048);
  rearEmblem.translate(0, 0.818, 2.444);

  return {
    taillightEmissive: mergeSolsticeGeometries(tailParts),
    rearChromeTrim: mergeSolsticeGeometries(chromeParts),
    rearDarkCove: mergeSolsticeGeometries(darkParts),
    exhaustOuter: mergeSolsticeGeometries(exOuterParts),
    exhaustInner: mergeSolsticeGeometries(exInnerParts),
    licensePlate,
    rearEmblem,
  };
}

/**
 * Builds luxury exterior details: sculpted door-mounted side mirrors, four flush chrome door
 * handles, champagne-gold lower rocker spears, standing hood crest ornament, wipers, underbody
 * pan + arched wheel-well liners, and clean door/bonnet/trunk shut lines.
 */
export function buildSolsticeExteriorDetailsGeometry(): {
  mirrorHousings: THREE.BufferGeometry;
  mirrorStalks: THREE.BufferGeometry;
  mirrorGlass: THREE.BufferGeometry;
  chromeHandlesAndCrest: THREE.BufferGeometry;
  sideSpearAccent: THREE.BufferGeometry;
  underbodyAndLiners: THREE.BufferGeometry;
  wipers: THREE.BufferGeometry;
  panelSeams: THREE.BufferGeometry;
} {
  const { frontAxleZ, rearAxleZ, wheelRadius } = SOLSTICE_ROYALE_DIMS;

  const mirHousingParts: THREE.BufferGeometry[] = [];
  const mirStalkParts: THREE.BufferGeometry[] = [];
  const mirGlassParts: THREE.BufferGeometry[] = [];
  const chromeParts: THREE.BufferGeometry[] = [];
  const spearParts: THREE.BufferGeometry[] = [];
  const seamParts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1] as const) {
    // Executive door-mounted side mirrors
    const stalk = new THREE.BoxGeometry(0.11, 0.032, 0.07);
    stalk.rotateZ(side * 0.2);
    stalk.translate(side * 0.97, 0.94, -0.52);
    mirStalkParts.push(stalk);

    const housing = new THREE.SphereGeometry(0.088, 12, 10);
    housing.scale(1.25, 0.72, 0.82);
    housing.translate(side * 1.07, 0.975, -0.5);
    mirHousingParts.push(housing);

    const glass = new THREE.CircleGeometry(0.06, 12);
    glass.scale(1.22, 0.72, 1);
    glass.translate(side * 1.07, 0.975, -0.432);
    mirGlassParts.push(glass);

    // Four executive chrome door handles (front & rear doors!)
    for (const hz of [0.06, 0.92]) {
      const handle = new THREE.BoxGeometry(0.026, 0.026, 0.16);
      handle.translate(side * 0.992, 0.825, hz);
      chromeParts.push(handle);
    }

    // Full-length champagne-gold rocker sill spear between wheel arches
    const spear = new THREE.BoxGeometry(0.024, 0.032, 2.02);
    spear.translate(side * 0.985, 0.285, -0.01);
    spearParts.push(spear);

    // Subtle front fender chrome vent badge behind front wheel arch
    const fenderBadge = new THREE.BoxGeometry(0.02, 0.042, 0.17);
    fenderBadge.translate(side * 0.996, 0.67, -0.96);
    chromeParts.push(fenderBadge);

    // Crisp door shut lines (front edge, B-pillar split, rear door trailing edge)
    for (const sz of [-0.74, 0.25, 1.12]) {
      const doorSeam = new THREE.BoxGeometry(0.01, 0.56, 0.01);
      doorSeam.translate(side * 0.992, 0.61, sz);
      seamParts.push(doorSeam);
    }
    // Bonnet side shut line
    const hoodSeam = new THREE.BoxGeometry(0.01, 0.01, 1.48);
    hoodSeam.translate(side * 0.76, 0.895, -1.56);
    seamParts.push(hoodSeam);
    // Trunk lid side shut line
    const trunkSeam = new THREE.BoxGeometry(0.01, 0.01, 0.88);
    trunkSeam.translate(side * 0.74, 0.945, 1.88);
    seamParts.push(trunkSeam);
  }

  // Signature standing Solstice Royale hood crest ornament perched above waterfall grille
  const crestBase = new THREE.CylinderGeometry(0.032, 0.04, 0.018, 10);
  crestBase.translate(0, 0.818, -2.355);
  chromeParts.push(crestBase);
  const crestWing = new THREE.ConeGeometry(0.024, 0.068, 6);
  crestWing.rotateX(0.28);
  crestWing.scale(0.55, 1, 1.35);
  crestWing.translate(0, 0.858, -2.352);
  chromeParts.push(crestWing);

  // Underbody flat pan + 4 arched inner wheel-well liners (staying cleanly above ground & clear of ±0.52 rad steer)
  const linerParts: THREE.BufferGeometry[] = [];
  const spine = new THREE.BoxGeometry(1.1, 0.07, 4.24);
  spine.translate(0, 0.22, 0);
  linerParts.push(spine);

  const midPan = new THREE.BoxGeometry(1.58, 0.07, 2.04);
  midPan.translate(0, 0.22, -0.01);
  linerParts.push(midPan);

  const wells: Array<{ x: number; z: number; r: number; w: number; wallX: number; side: -1 | 1 }> = [
    { x: -0.76, z: frontAxleZ, r: wheelRadius + 0.045, w: 0.28, wallX: -0.61, side: -1 },
    { x: 0.76, z: frontAxleZ, r: wheelRadius + 0.045, w: 0.28, wallX: 0.61, side: 1 },
    { x: -0.76, z: rearAxleZ, r: wheelRadius + 0.048, w: 0.29, wallX: -0.61, side: -1 },
    { x: 0.76, z: rearAxleZ, r: wheelRadius + 0.048, w: 0.29, wallX: 0.61, side: 1 },
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

    const innerArch = new THREE.CircleGeometry(wp.r * 0.95, 14, 0, Math.PI);
    innerArch.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerArch.translate(wp.wallX, wheelRadius - 0.01, wp.z);
    innerArch.computeVertexNormals();
    linerParts.push(innerArch);

    const lowerH = Math.max(0.05, wheelRadius - 0.01 - 0.2);
    const innerLower = new THREE.PlaneGeometry(wp.r * 1.88, lowerH);
    innerLower.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerLower.translate(wp.wallX, 0.2 + lowerH * 0.5, wp.z);
    innerLower.computeVertexNormals();
    linerParts.push(innerLower);
  }

  // Twin windshield wiper blades parked cleanly along cowl base
  const wiperParts: THREE.BufferGeometry[] = [];
  for (const wx of [-0.3, 0.24]) {
    const blade = new THREE.BoxGeometry(0.46, 0.014, 0.018);
    blade.rotateY(-0.08);
    blade.translate(wx, 0.922, -0.785);
    wiperParts.push(blade);
  }

  return {
    mirrorHousings: mergeSolsticeGeometries(mirHousingParts),
    mirrorStalks: mergeSolsticeGeometries(mirStalkParts),
    mirrorGlass: mergeSolsticeGeometries(mirGlassParts),
    chromeHandlesAndCrest: mergeSolsticeGeometries(chromeParts),
    sideSpearAccent: mergeSolsticeGeometries(spearParts),
    underbodyAndLiners: mergeSolsticeGeometries(linerParts),
    wipers: mergeSolsticeGeometries(wiperParts),
    panelSeams: mergeSolsticeGeometries(seamParts),
  };
}

function buildExecutiveLoungeSeat(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Plush wide cushion
  const cushion = new THREE.BoxGeometry(0.48, 0.12, 0.48);
  cushion.translate(0, 0.06, 0);
  parts.push(cushion);

  // Soft side thigh bolsters
  for (const side of [-1, 1] as const) {
    const bolster = new THREE.BoxGeometry(0.08, 0.14, 0.46);
    bolster.translate(side * 0.23, 0.09, 0.01);
    parts.push(bolster);
  }

  // Reclined padded backrest
  const back = new THREE.BoxGeometry(0.48, 0.52, 0.11);
  back.rotateX(-0.2);
  back.translate(0, 0.34, 0.24);
  parts.push(back);

  // Luxury pillow headrest
  const headrest = new THREE.BoxGeometry(0.24, 0.15, 0.1);
  headrest.rotateX(-0.12);
  headrest.translate(0, 0.68, 0.29);
  parts.push(headrest);

  return mergeSolsticeGeometries(parts);
}

/**
 * Builds the spacious four-seat Solstice Royale executive cabin interior:
 * dark carpet floor & door panels, warm saddle-tan front lounge seats + rear executive bench,
 * wide sculpted dashboard with burled walnut wood veneer trim, 3-spoke luxury steering wheel,
 * illuminated gauge cluster & wide infotainment screen, center console, and rear-view mirror.
 */
export function buildSolsticeInteriorGeometries(): {
  cabinTub: THREE.BufferGeometry;
  leatherSeats: THREE.BufferGeometry;
  woodTrim: THREE.BufferGeometry;
  dashboard: THREE.BufferGeometry;
  steeringWheel: THREE.BufferGeometry;
  clusterScreen: THREE.BufferGeometry;
  centerScreen: THREE.BufferGeometry;
  rearViewMirror: THREE.BufferGeometry;
} {
  const tubParts: THREE.BufferGeometry[] = [];
  const seatParts: THREE.BufferGeometry[] = [];
  const woodParts: THREE.BufferGeometry[] = [];
  const dashParts: THREE.BufferGeometry[] = [];

  // Full cabin carpet floor & continuous executive center console
  const floor = new THREE.BoxGeometry(1.56, 0.06, 2.08);
  floor.translate(0, 0.34, 0.28);
  tubParts.push(floor);

  const consoleTunnel = new THREE.BoxGeometry(0.28, 0.36, 1.82);
  consoleTunnel.translate(0, 0.52, 0.16);
  tubParts.push(consoleTunnel);

  // Rear parcel shelf & trunk bulkhead behind rear lounge bench
  const rearBulkhead = new THREE.BoxGeometry(1.54, 0.58, 0.14);
  rearBulkhead.translate(0, 0.65, 1.24);
  tubParts.push(rearBulkhead);
  const parcelShelf = new THREE.BoxGeometry(1.52, 0.06, 0.34);
  parcelShelf.translate(0, 0.92, 1.22);
  tubParts.push(parcelShelf);

  // Four-door interior door cards with armrests & burled walnut door inlays
  for (const side of [-1, 1] as const) {
    const card = new THREE.BoxGeometry(0.08, 0.54, 1.98);
    card.translate(side * 0.78, 0.64, 0.26);
    tubParts.push(card);

    const arm = new THREE.BoxGeometry(0.11, 0.075, 1.72);
    arm.translate(side * 0.72, 0.64, 0.28);
    tubParts.push(arm);

    const woodInlay = new THREE.BoxGeometry(0.03, 0.075, 1.66);
    woodInlay.translate(side * 0.73, 0.79, 0.24);
    woodParts.push(woodInlay);
  }

  // Front driver & passenger executive lounge seats
  const frontL = buildExecutiveLoungeSeat();
  frontL.translate(-0.42, 0.38, -0.02);
  seatParts.push(frontL);

  const frontR = buildExecutiveLoungeSeat();
  frontR.translate(0.42, 0.38, -0.02);
  seatParts.push(frontR);

  // Full-width rear executive lounge bench + 2 plush headrests + center fold-down armrest
  const rearCushion = new THREE.BoxGeometry(1.38, 0.14, 0.52);
  rearCushion.translate(0, 0.46, 0.78);
  seatParts.push(rearCushion);

  const rearBack = new THREE.BoxGeometry(1.38, 0.52, 0.14);
  rearBack.rotateX(-0.2);
  rearBack.translate(0, 0.74, 1.04);
  seatParts.push(rearBack);

  for (const hx of [-0.42, 0.42]) {
    const hr = new THREE.BoxGeometry(0.25, 0.15, 0.11);
    hr.rotateX(-0.1);
    hr.translate(hx, 1.07, 1.09);
    seatParts.push(hr);
  }
  const rearArmrest = new THREE.BoxGeometry(0.26, 0.1, 0.38);
  rearArmrest.translate(0, 0.62, 0.82);
  seatParts.push(rearArmrest);

  // Executive horizontal dashboard + gauge binnacle + steering column
  const dashBody = new THREE.BoxGeometry(1.54, 0.28, 0.38);
  dashBody.translate(0, 0.79, -0.64);
  dashParts.push(dashBody);

  const binnacle = new THREE.CylinderGeometry(0.11, 0.12, 0.32, 12, 1, false, 0, Math.PI);
  binnacle.rotateZ(Math.PI / 2);
  binnacle.rotateY(Math.PI / 2);
  binnacle.translate(-0.42, 0.905, -0.55);
  dashParts.push(binnacle);

  const steerCol = new THREE.CylinderGeometry(0.034, 0.042, 0.22, 10);
  steerCol.rotateX(Math.PI / 2 - 0.22);
  steerCol.translate(-0.42, 0.84, -0.49);
  dashParts.push(steerCol);

  // Burled walnut full-width dashboard fascia & center console lid
  const dashWood = new THREE.BoxGeometry(1.48, 0.095, 0.04);
  dashWood.translate(0, 0.82, -0.445);
  woodParts.push(dashWood);

  const consoleWood = new THREE.BoxGeometry(0.22, 0.03, 0.86);
  consoleWood.translate(0, 0.705, -0.04);
  woodParts.push(consoleWood);

  // Classic luxury 3-spoke steering wheel
  const swParts: THREE.BufferGeometry[] = [];
  const swRim = new THREE.TorusGeometry(0.165, 0.019, 10, 22);
  swRim.rotateX(-0.24);
  swRim.translate(-0.42, 0.88, -0.37);
  swParts.push(swRim);

  const swHub = new THREE.CylinderGeometry(0.052, 0.052, 0.036, 12);
  swHub.rotateX(Math.PI / 2 - 0.24);
  swHub.translate(-0.42, 0.88, -0.375);
  swParts.push(swHub);

  for (const ang of [0, Math.PI, -Math.PI / 2]) {
    const sp = new THREE.BoxGeometry(0.14, 0.024, 0.018);
    sp.translate(0.07, 0, 0);
    sp.rotateZ(ang);
    sp.rotateX(-0.24);
    sp.translate(-0.42, 0.88, -0.375);
    swParts.push(sp);
  }

  // Illuminated executive instrument panel + wide center navigation screen (proud of dash face)
  const clusterScreen = new THREE.PlaneGeometry(0.28, 0.095);
  clusterScreen.rotateX(-0.12);
  clusterScreen.translate(-0.42, 0.905, -0.422);

  const centerScreen = new THREE.PlaneGeometry(0.3, 0.13);
  centerScreen.rotateX(-0.14);
  centerScreen.translate(0, 0.86, -0.42);

  // Interior rear-view mirror suspended from windshield header
  const rmParts: THREE.BufferGeometry[] = [];
  const rmStalk = new THREE.CylinderGeometry(0.008, 0.01, 0.1, 6);
  rmStalk.translate(0, 1.32, -0.34);
  rmParts.push(rmStalk);
  const rmHead = new THREE.BoxGeometry(0.2, 0.054, 0.028);
  rmHead.translate(0, 1.265, -0.35);
  rmParts.push(rmHead);

  return {
    cabinTub: mergeSolsticeGeometries(tubParts),
    leatherSeats: mergeSolsticeGeometries(seatParts),
    woodTrim: mergeSolsticeGeometries(woodParts),
    dashboard: mergeSolsticeGeometries(dashParts),
    steeringWheel: mergeSolsticeGeometries(swParts),
    clusterScreen,
    centerScreen,
    rearViewMirror: mergeSolsticeGeometries(rmParts),
  };
}

export interface SolsticeWheelParts {
  tireGeo: THREE.BufferGeometry;
  rimAlloyGeo: THREE.BufferGeometry;
  centerCapGeo: THREE.BufferGeometry;
  innerBarrelGeo: THREE.BufferGeometry;
  rotorGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
}

/**
 * Builds the Solstice Royale luxury multi-spoke touring wheel assembly centered at origin,
 * oriented so the outer face points toward +X (right side; mirrored via rotation.y = PI on left).
 * Uses a rounded Lathe tyre with plush touring sidewall ratio and a 14-spoke turbine luxury rim
 * with weighted chrome center cap, vented brake rotor, and stationary luxury brake caliper.
 */
export function buildSolsticeWheelParts(
  wheelWidth = SOLSTICE_ROYALE_DIMS.wheelWidth,
): SolsticeWheelParts {
  const R = SOLSTICE_ROYALE_DIMS.wheelRadius; // 0.34m
  const rimR = R * 0.65; // ~0.221m (plush grand-touring sidewall ratio, distinct from sports low-profile!)
  const halfW = wheelWidth * 0.5;

  // 1. Rounded touring tyre profile via LatheGeometry rotated so revolution axis is X
  const lathePts: THREE.Vector2[] = [
    new THREE.Vector2(rimR - 0.008, -halfW * 0.86),
    new THREE.Vector2(rimR + 0.026, -halfW * 0.98),
    new THREE.Vector2(R - 0.044, -halfW),
    new THREE.Vector2(R - 0.014, -halfW * 0.92),
    new THREE.Vector2(R, -halfW * 0.72),
    new THREE.Vector2(R, halfW * 0.72),
    new THREE.Vector2(R - 0.014, halfW * 0.92),
    new THREE.Vector2(R - 0.044, halfW),
    new THREE.Vector2(rimR + 0.026, halfW * 0.98),
    new THREE.Vector2(rimR - 0.008, halfW * 0.86),
  ];
  const tireGeo = new THREE.LatheGeometry(lathePts, 28);
  tireGeo.rotateZ(-Math.PI / 2);
  tireGeo.computeVertexNormals();
  tireGeo.computeBoundingBox();
  tireGeo.computeBoundingSphere();

  // 2. Signature 14-spoke turbine luxury alloy rim + outer polished lip
  const rimParts: THREE.BufferGeometry[] = [];
  const outerLip = new THREE.TorusGeometry(rimR - 0.006, 0.017, 10, 28);
  outerLip.rotateY(Math.PI / 2);
  outerLip.translate(halfW * 0.76, 0, 0);
  rimParts.push(outerLip);

  const midRing = new THREE.TorusGeometry(rimR * 0.44, 0.014, 8, 20);
  midRing.rotateY(Math.PI / 2);
  midRing.translate(halfW * 0.68, 0, 0);
  rimParts.push(midRing);

  const spokeCount = 14;
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2;
    const len = rimR * 0.56;
    const spoke = new THREE.BoxGeometry(0.024, len, 0.017);
    // Subtle turbine rake angle for unmistakable executive wheel identity
    spoke.translate(0, rimR * 0.42 + len * 0.5 - 0.01, 0);
    spoke.rotateX(a);
    spoke.translate(halfW * 0.67, 0, 0);
    rimParts.push(spoke);
  }
  const rimAlloyGeo = mergeSolsticeGeometries(rimParts);

  // 3. Large signature weighted chrome center cap + subtle champagne collar ring
  const capParts: THREE.BufferGeometry[] = [];
  const centerCap = new THREE.CylinderGeometry(rimR * 0.34, rimR * 0.36, 0.036, 20);
  centerCap.rotateZ(Math.PI / 2);
  centerCap.translate(halfW * 0.78, 0, 0);
  capParts.push(centerCap);
  const centerCapGeo = mergeSolsticeGeometries(capParts);

  // 4. Dark inner rim barrel
  const barrel = new THREE.CylinderGeometry(rimR - 0.014, rimR - 0.014, wheelWidth * 0.78, 22, 1, true);
  barrel.rotateZ(Math.PI / 2);
  const innerBarrelGeo = mergeSolsticeGeometries([barrel]);

  // 5. Vented brake rotor sitting cleanly inboard behind spokes
  const rotor = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.024, 20);
  rotor.rotateZ(Math.PI / 2);
  rotor.translate(halfW * 0.16, 0, 0);
  const rotorGeo = mergeSolsticeGeometries([rotor]);

  // 6. Stationary luxury brake caliper hugging the rotor edge
  const calParts: THREE.BufferGeometry[] = [];
  const calBody = new THREE.BoxGeometry(0.068, 0.125, 0.072);
  calBody.rotateX(0.32);
  calBody.translate(halfW * 0.22, 0.05, 0.125);
  calParts.push(calBody);
  const caliperGeo = mergeSolsticeGeometries(calParts);

  return {
    tireGeo,
    rimAlloyGeo,
    centerCapGeo,
    innerBarrelGeo,
    rotorGeo,
    caliperGeo,
  };
}
