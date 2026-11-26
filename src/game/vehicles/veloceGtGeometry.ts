import * as THREE from 'three';

/**
 * Pure parametric geometry builders for the Phase 2A Veloce GT sports coupe.
 * Local coordinate system matches VehicleRig:
 *   +X = right, +Y = up, -Z = forward (nose), +Z = rear (tail).
 * Ground contact plane is y = 0.
 *
 * Kept DOM-free so proportions, wheel-arch clearances, and mesh validity can be
 * unit-tested directly under node:test.
 */

export const VELOCE_GT_DIMS = {
  length: 4.5,
  width: 2.06,
  height: 1.24,
  wheelRadius: 0.34,
  frontWheelWidth: 0.25,
  rearWheelWidth: 0.29,
  frontAxleZ: -1.395,
  rearAxleZ: 1.365,
  frontTrackHalf: 0.885,
  rearTrackHalf: 0.875,
  frontArchRadius: 0.42,
  rearArchRadius: 0.43,
  cabinStartZ: -0.58,
  cabinEndZ: 0.94,
} as const;

export interface BodySectionSample {
  z: number;
  sillY: number;
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
 * Evaluates the sculpted longitudinal & cross-sectional curves of the Veloce GT
 * at any station z in [-2.25, +2.21].
 */
export function evaluateVeloceBodySection(z: number): BodySectionSample {
  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    frontArchRadius,
    rearArchRadius,
    cabinStartZ,
    cabinEndZ,
  } = VELOCE_GT_DIMS;

  const u = Math.max(0, Math.min(1, (z + 2.25) / 4.46));

  // Nose and tail planform taper (sleek shark nose, wide muscular rear haunches)
  const noseTaper = smoothstep(-2.26, -1.62, z);
  const tailTaper = 1 - smoothstep(1.68, 2.24, z) * 0.12;

  // Front fender flare, coke-bottle door waist pinch, and muscular rear haunch flare
  const frontFlare = bell(z, frontAxleZ + 0.04, 0.72) * 0.085;
  const waistPinch = bell(z, 0.04, 0.78) * 0.075;
  const rearHaunch = bell(z, rearAxleZ - 0.06, 0.88) * 0.115;

  const baseHalfW = (0.74 + 0.23 * noseTaper) * tailTaper;
  const halfWidthMid = Math.min(1.03, baseHalfW + frontFlare - waistPinch + rearHaunch);
  const halfWidthLower = halfWidthMid * (0.935 - (1 - noseTaper) * 0.05);
  const halfWidthBelt =
    halfWidthMid * (0.88 + smoothstep(0.45, 0.82, u) * 0.055) -
    bell(z, 0.12, 0.95) * 0.028;

  // Taut, athletic modern exotic wedge height profile (eliminates bulbous front-fender hump while keeping sculpted fender peaks):
  const noseWedge = smoothstep(-2.26, -0.92, z);
  const frontFenderCrown = bell(z, frontAxleZ + 0.02, 0.64) * 0.052;
  const rearHaunchRise = smoothstep(-0.18, 1.28, z) * 0.118;
  const tailDrop = smoothstep(1.62, 2.23, z) * 0.042;
  const beltY = 0.44 + 0.35 * noseWedge + frontFenderCrown + rearHaunchRise - tailDrop;

  // Outer fender ridge crowns cleanly above the shoulder crease
  const deckY =
    beltY +
    0.032 * smoothstep(-2.14, -1.35, z) +
    frontFenderCrown * 0.22 -
    0.012 * smoothstep(1.88, 2.22, z);

  // Sculpted central bonnet valley & recessed mid-rear engine deck trough beneath fastback glass (zero glass/deck z-fighting)
  const bonnetValley = bell(z, -1.44, 0.74) * 0.038;
  const noseSlopeDrop = (1 - smoothstep(-2.25, -1.84, z)) * 0.032;
  const engineBayRecess = bell(z, 1.32, 0.42) * 0.115;
  const rearSpoilerKick = smoothstep(1.86, 2.20, z) * 0.022;
  const centerDeckY =
    deckY + 0.004 - bonnetValley - noseSlopeDrop - engineBayRecess + rearSpoilerKick;

  // Rocker / sill height with genuine circular front and rear wheel-well cutouts
  let sillY =
    0.165 +
    smoothstep(1.55, 2.22, z) * 0.065 -
    (1 - smoothstep(-2.25, -1.8, z)) * 0.015;
  let inFrontArch = false;
  let inRearArch = false;

  const dzFront = z - frontAxleZ;
  if (Math.abs(dzFront) < frontArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, frontArchRadius * frontArchRadius - dzFront * dzFront));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.045);
      inFrontArch = true;
    }
  }

  const dzRear = z - rearAxleZ;
  if (Math.abs(dzRear) < rearArchRadius) {
    const archY =
      wheelRadius + Math.sqrt(Math.max(0, rearArchRadius * rearArchRadius - dzRear * dzRear));
    if (archY > sillY) {
      sillY = Math.min(archY, beltY - 0.075);
      inRearArch = true;
    }
  }

  // Open cockpit aperture width (0 outside cabin, smoothly opens between windshield cowl & rear bulkhead)
  let cabinOpenHalfWidth = 0;
  if (z > cabinStartZ && z < cabinEndZ) {
    const openIn = smoothstep(cabinStartZ, cabinStartZ + 0.12, z);
    const openOut = 1 - smoothstep(cabinEndZ - 0.14, cabinEndZ, z);
    const taper = 1 - smoothstep(0.1, cabinEndZ, z) * 0.14;
    cabinOpenHalfWidth = (halfWidthBelt - 0.13) * openIn * openOut * taper;
  }

  return {
    z,
    sillY,
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
 * Evaluates the exact height of the upper bonnet/fender surface at `(absX, z)`
 * so headlights, DRL blades, hood vents, and lenses conform flush to the sculpted front nose!
 */
export function sampleFrontDeckSurfaceY(absX: number, z: number): number {
  const s = evaluateVeloceBodySection(z);
  const outerX = s.halfWidthBelt * 0.93;
  const t = Math.max(0, Math.min(1, absX / Math.max(0.01, outerX)));
  // Smooth S-curve from center power-dome through hood valley up to arched outer fender crown
  const fenderArch = t * t * (3 - 2 * t);
  const centerDome = Math.exp(-Math.pow(t / 0.28, 2)) * 0.008 * smoothstep(-2.05, -0.75, z);
  return s.centerDeckY + centerDome + (s.deckY - s.centerDeckY) * fenderArch;
}

function buildBodyStations(): number[] {
  return [
    -2.24, -2.20, -2.13, -2.03, -1.92, -1.83,
    // Front wheel arch high-res arc (frontAxleZ = -1.395, r = 0.42 => [-1.815, -0.975])
    -1.80, -1.75, -1.68, -1.59, -1.49, -1.395, -1.30, -1.20, -1.11, -1.04, -0.98,
    // Cowl, doors & sculpted coke-bottle waist
    -0.88, -0.74, -0.60, -0.54, -0.42, -0.22, 0.0, 0.24, 0.48, 0.72, 0.88, 0.93,
    // Rear wheel arch high-res arc (rearAxleZ = 1.365, r = 0.43 => [0.935, 1.795])
    0.95, 1.02, 1.10, 1.19, 1.28, 1.365, 1.45, 1.54, 1.63, 1.71, 1.78,
    // Rear haunch & Kammback tail (stops cleanly at z = 2.20 so recessed rear fascia & taillights sit proud!)
    1.88, 2.0, 2.11, 2.17, 2.20,
  ];
}

function loftGrid(
  rings: Array<Array<[number, number, number]>>,
  flipWinding: boolean,
): THREE.BufferGeometry {
  const numStations = rings.length;
  const ringLen = rings[0].length;
  const positions = new Float32Array(numStations * ringLen * 3);
  const uvs = new Float32Array(numStations * ringLen * 2);

  let pIdx = 0;
  let uvIdx = 0;
  for (let i = 0; i < numStations; i++) {
    const v = i / (numStations - 1);
    const ring = rings[i];
    for (let j = 0; j < ringLen; j++) {
      const pt = ring[j];
      positions[pIdx++] = pt[0];
      positions[pIdx++] = pt[1];
      positions[pIdx++] = pt[2];
      uvs[uvIdx++] = j / (ringLen - 1);
      uvs[uvIdx++] = v;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < numStations - 1; i++) {
    for (let j = 0; j < ringLen - 1; j++) {
      const a = i * ringLen + j;
      const b = i * ringLen + (j + 1);
      const c = (i + 1) * ringLen + j;
      const d = (i + 1) * ringLen + (j + 1);
      if (!flipWinding) {
        indices.push(a, b, c, b, d, c);
      } else {
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function mergeSimpleGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
 * Builds the primary sculpted painted body shell of the Veloce GT.
 */
export function buildVeloceBodyShellGeometry(): THREE.BufferGeometry {
  const stations = buildBodyStations();
  const samples = stations.map((z) => evaluateVeloceBodySection(z));

  const rightRings: Array<Array<[number, number, number]>> = [];
  const leftRings: Array<Array<[number, number, number]>> = [];

  for (const s of samples) {
    const h = Math.max(0.06, s.beltY - s.sillY);
    const sideScoopIndent = bell(s.z, 0.54, 0.46) * 0.062;
    const archLipFlare = s.inFrontArch || s.inRearArch ? 0.022 : 0;

    const outerDeckX = s.halfWidthBelt * 0.93;
    const innerEdgeX = s.cabinOpenHalfWidth > 0.02 ? s.cabinOpenHalfWidth : 0;
    const innerEdgeY = s.cabinOpenHalfWidth > 0.02 ? s.deckY - 0.022 : s.centerDeckY;

    // Two intermediate deck profile points for silky-smooth hood & rear-haunch cross-sections
    const deckX1 = innerEdgeX + (outerDeckX - innerEdgeX) * 0.68;
    const deckX2 = innerEdgeX + (outerDeckX - innerEdgeX) * 0.34;
    const deckY1 =
      s.cabinOpenHalfWidth > 0.02
        ? s.deckY - 0.005
        : s.z > 0.9
          ? s.centerDeckY + (s.deckY - s.centerDeckY) * 0.78
          : sampleFrontDeckSurfaceY(deckX1, s.z);
    const deckY2 =
      s.cabinOpenHalfWidth > 0.02
        ? s.deckY - 0.014
        : s.z > 0.9
          ? s.centerDeckY + (s.deckY - s.centerDeckY) * 0.22
          : sampleFrontDeckSurfaceY(deckX2, s.z);

    // At the rear valence (z > 2.05), raise the lower painted sill edge to y = 0.55m
    // so the full-width carbon diffuser valence owns the entire lower rear bumper cleanly!
    const rearValenceCut = smoothstep(2.02, 2.18, s.z) * 0.32;
    const effSillY = Math.min(s.beltY - 0.14, s.sillY + rearValenceCut);
    const effH = Math.max(0.06, s.beltY - effSillY);

    const rRing: Array<[number, number, number]> = [
      [s.halfWidthLower - 0.045, effSillY - 0.012, s.z],
      [s.halfWidthLower + archLipFlare, effSillY + effH * 0.07, s.z],
      [s.halfWidthMid - sideScoopIndent * 0.65 + archLipFlare * 0.45, effSillY + effH * 0.36, s.z],
      [s.halfWidthMid - sideScoopIndent, effSillY + effH * 0.66, s.z],
      [s.halfWidthBelt + 0.02, s.beltY - 0.01, s.z],
      [outerDeckX, s.deckY, s.z],
      [deckX1, deckY1, s.z],
      [deckX2, deckY2, s.z],
      [innerEdgeX, innerEdgeY, s.z],
    ];

    rightRings.push(rRing);
    leftRings.push(rRing.map(([x, y, z]) => [-x, y, z] as [number, number, number]));
  }

  const rightHalf = loftGrid(rightRings, false);
  const leftHalf = loftGrid(leftRings, true);

  // Sleek aerodynamic front nose wrap (z = -2.24 -> -2.275)
  const frontNose = buildEndCapBand(samples[0], -2.265, 0.032, true, 0);
  // Crisp painted upper rear Kammback fascia beam (y = 0.55..0.90m, leaving lower rear to full-width carbon diffuser!)
  const rearTail = buildEndCapBand(samples[samples.length - 1], 2.21, 0.014, false, 0.55);

  return mergeSimpleGeometries([rightHalf, leftHalf, frontNose, rearTail]);
}

function buildEndCapBand(
  s: BodySectionSample,
  tipZ: number,
  bulgeAmt: number,
  isFront: boolean,
  minSillY = 0,
): THREE.BufferGeometry {
  const cols = 15;
  const rows = 5;
  const rings: Array<Array<[number, number, number]>> = [];
  const startY = Math.max(s.sillY, minSillY);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = startY + (s.deckY - startY) * v;
    const widthAtRow =
      s.halfWidthLower + (s.halfWidthBelt * 0.93 - s.halfWidthLower) * Math.sin(v * Math.PI * 0.65);
    const rowPts: Array<[number, number, number]> = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * widthAtRow;
      const curveBulge =
        (1 - u * u) * (isFront ? -bulgeAmt : bulgeAmt) * Math.sin(v * Math.PI * 0.85 + 0.15);
      const z = s.z + (tipZ - s.z) * (1 - u * u) + curveBulge;
      rowPts.push([x, y, z]);
    }
    rings.push(rowPts);
  }

  return loftGrid(rings, isFront);
}

/**
 * Builds the curved double-bubble exotic coupe roof panel.
 */
export function buildVeloceRoofGeometry(): THREE.BufferGeometry {
  const zVals = [-0.12, 0.04, 0.24, 0.46, 0.68, 0.86, 0.98];
  const cols = 13;
  const rings: Array<Array<[number, number, number]>> = [];

  for (let i = 0; i < zVals.length; i++) {
    const z = zVals[i];
    const t = i / (zVals.length - 1);
    const archY = 1.175 + Math.sin(t * Math.PI) * 0.062 - t * 0.025;
    const halfW = 0.575 + Math.sin(t * Math.PI) * 0.045 - t * 0.04;

    const ring: Array<[number, number, number]> = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * halfW;
      const crown = (1 - u * u) * 0.036;
      const doubleBubble = Math.exp(-Math.pow((Math.abs(u) - 0.46) / 0.28, 2)) * 0.008;
      ring.push([x, archY + crown + doubleBubble, z]);
    }
    rings.push(ring);
  }

  return loftGrid(rings, true);
}

/**
 * Builds the sloping, laterally wrapped curved windshield pane.
 */
export function buildVeloceWindshieldGeometry(): THREE.BufferGeometry {
  const rows = 9;
  const cols = 15;
  const rings: Array<Array<[number, number, number]>> = [];

  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const zBase = -0.64 + t * 0.54;
    const yBase = 0.815 + t * 0.365 + Math.sin(t * Math.PI) * 0.018;
    const halfW = 0.725 - t * 0.145;

    const ring: Array<[number, number, number]> = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * halfW;
      const zWrap = u * u * (0.12 - t * 0.035);
      const yCrown = (1 - u * u) * (0.032 + t * 0.008);
      ring.push([x, yBase + yCrown, zBase + zWrap]);
    }
    rings.push(ring);
  }

  return loftGrid(rings, true);
}

/**
 * Builds the sloping curved fastback rear glass hatch pane sitting cleanly above the recessed engine bay.
 */
export function buildVeloceRearGlassGeometry(): THREE.BufferGeometry {
  const rows = 8;
  const cols = 13;
  const rings: Array<Array<[number, number, number]>> = [];

  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const zBase = 0.96 + t * 0.72;
    const yBase = 1.158 - t * 0.205 + Math.sin(t * Math.PI) * 0.014;
    const halfW = 0.525 - t * 0.085;

    const ring: Array<[number, number, number]> = [];
    for (let c = 0; c < cols; c++) {
      const u = (c / (cols - 1)) * 2 - 1;
      const x = u * halfW;
      const zWrap = -u * u * 0.045;
      const yCrown = (1 - u * u) * 0.026;
      ring.push([x, yBase + yCrown, zBase + zWrap]);
    }
    rings.push(ring);
  }

  return loftGrid(rings, true);
}

/**
 * Builds curved left or right side cabin glass:
 *   1. Front door window pane (z = -0.52..0.41) between A-pillar and B-pillar
 *   2. Distinct tapered rear-quarter window pane (z = 0.47..0.89) behind B-pillar into C-pillar sail
 */
export function buildVeloceSideWindowGeometry(side: -1 | 1): THREE.BufferGeometry {
  const buildPane = (zStart: number, zEnd: number, isQuarter: boolean): THREE.BufferGeometry => {
    const stations = isQuarter ? 6 : 8;
    const rows = 5;
    const rings: Array<Array<[number, number, number]>> = [];

    for (let i = 0; i < stations; i++) {
      const u = i / (stations - 1);
      const z = zStart + u * (zEnd - zStart);
      const s = evaluateVeloceBodySection(z);

      const roofT = Math.max(0, Math.min(1, (z + 0.12) / 1.1));
      let topY =
        z < -0.1
          ? 0.835 + smoothstep(-0.52, -0.1, z) * 0.345
          : 1.175 + Math.sin(roofT * Math.PI) * 0.055 - roofT * 0.03;
      const topHalfW =
        z < -0.1
          ? 0.725 - smoothstep(-0.52, -0.1, z) * 0.145
          : 0.58 + Math.sin(roofT * Math.PI) * 0.04 - roofT * 0.045;

      let botY = s.deckY - 0.008;
      // Taper the rear-quarter window upward & inward to a sleek exotic teardrop point at the rear C-pillar
      if (isQuarter) {
        const qT = u * u;
        botY += qT * 0.11;
        topY -= qT * 0.075;
      }

      const botHalfW = Math.min(s.halfWidthBelt * 0.89, topHalfW + 0.18 * (1 - (isQuarter ? u * 0.45 : 0)));

      const col: Array<[number, number, number]> = [];
      for (let r = 0; r < rows; r++) {
        const v = r / (rows - 1);
        const y = botY + (topY - botY) * v;
        const bulge = Math.sin(v * Math.PI) * 0.022;
        const x = side * (botHalfW + (topHalfW - botHalfW) * v + bulge);
        col.push([x, y, z]);
      }
      rings.push(col);
    }

    return loftGrid(rings, side < 0);
  };

  return mergeSimpleGeometries([
    buildPane(-0.52, 0.415, false),
    buildPane(0.465, 0.885, true),
  ]);
}

/**
 * Builds sculpted integrated fastback C-pillar sail buttresses
 * that blend smoothly from the roof trailing edge straight down into the rear haunch shoulders.
 */
export function buildVeloceFastbackButtressGeometry(side: -1 | 1): THREE.BufferGeometry {
  const zVals = [0.84, 0.98, 1.16, 1.36, 1.56, 1.74];
  const rings: Array<Array<[number, number, number]>> = [];

  for (let i = 0; i < zVals.length; i++) {
    const z = zVals[i];
    const t = i / (zVals.length - 1);
    const smoothT = t * t * (3 - 2 * t);
    const s = evaluateVeloceBodySection(z);

    // Top outer spine sweeps seamlessly from curved roof cant rail down into rear fender crown
    const topY = 1.144 * (1 - smoothT) + (s.deckY + 0.004) * smoothT + Math.sin(t * Math.PI) * 0.01;
    const outerX = (0.548 * (1 - smoothT) + s.halfWidthBelt * 0.875 * smoothT) * side;
    const innerX = (0.502 * (1 - smoothT) + 0.45 * smoothT) * side;
    const baseY = s.deckY - 0.024;

    const ring: Array<[number, number, number]> = [
      [outerX + side * 0.014, baseY, z],
      [outerX, topY, z],
      [innerX, topY - 0.012, z],
      [innerX, baseY, z],
      [outerX + side * 0.014, baseY, z],
    ];
    rings.push(ring);
  }

  return loftGrid(rings, side < 0);
}

export function buildSweptPillarGeometry(
  points: THREE.Vector3[],
  rx: number,
  ry: number,
  tubularSegments = 16,
  radialSegments = 10,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const rings: Array<Array<[number, number, number]>> = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const center = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const ring: Array<[number, number, number]> = [];
    for (let j = 0; j <= radialSegments; j++) {
      const ang = (j / radialSegments) * Math.PI * 2;
      const ca = Math.cos(ang) * rx;
      const sa = Math.sin(ang) * ry;
      ring.push([
        center.x + N.x * ca + B.x * sa,
        center.y + N.y * ca + B.y * sa,
        center.z + N.z * ca + B.z * sa,
      ]);
    }
    rings.push(ring);
  }
  return loftGrid(rings, false);
}

/**
 * Builds conformal swept shark-eye headlight housing, dual projector optics, angular V-blade DRL,
 * and flush clear lens that hug the exact curved front fender surface with zero protrusion!
 */
export function buildVeloceConformalHeadlightCluster(side: -1 | 1): {
  housing: THREE.BufferGeometry;
  bezels: THREE.BufferGeometry;
  emissive: THREE.BufferGeometry;
  indicator: THREE.BufferGeometry;
  lens: THREE.BufferGeometry;
} {
  const makeConformalPatch = (yLift: number, insetScale: number): THREE.BufferGeometry => {
    const zSteps = 8;
    const xSteps = 6;
    const rings: Array<Array<[number, number, number]>> = [];

    for (let i = 0; i < zSteps; i++) {
      const u = i / (zSteps - 1);
      const z = -2.16 + u * 0.44;
      const halfSpan = (0.048 + Math.sin(u * Math.PI) * 0.118) * insetScale;
      const centerAbsX = 0.585 + u * 0.215;

      const ring: Array<[number, number, number]> = [];
      for (let j = 0; j < xSteps; j++) {
        const v = (j / (xSteps - 1)) * 2 - 1;
        const absX = centerAbsX + v * halfSpan;
        const baseY = sampleFrontDeckSurfaceY(absX, z);
        const dome = (1 - v * v) * yLift * 0.55;
        ring.push([side * absX, baseY + yLift + dome, z]);
      }
      rings.push(ring);
    }

    return loftGrid(rings, side > 0);
  };

  const housing = makeConformalPatch(0.004, 1.0);
  const lens = makeConformalPatch(0.021, 0.98);

  const bezelParts: THREE.BufferGeometry[] = [];
  const emissiveParts: THREE.BufferGeometry[] = [];

  for (const [absX, z] of [
    [0.62, -2.06],
    [0.72, -1.91],
  ]) {
    const surfY = sampleFrontDeckSurfaceY(absX, z) + 0.011;
    const bezel = new THREE.TorusGeometry(0.032, 0.007, 8, 14);
    bezel.rotateX(0.55);
    bezel.rotateY(side * -0.25);
    bezel.translate(side * absX, surfY, z);
    bezelParts.push(bezel);

    const core = new THREE.SphereGeometry(0.026, 10, 8);
    core.scale(1.0, 0.55, 0.9);
    core.translate(side * absX, surfY + 0.002, z);
    emissiveParts.push(core);
  }

  // Signature razor-sharp angular "V-blade" LED DRL hugging the exact curved fender contour
  const drlSamples: Array<[number, number]> = [
    [0.53, -2.14],
    [0.65, -2.09],
    [0.76, -1.96],
    [0.82, -1.80],
    [0.84, -1.72],
  ];
  const drlPts = drlSamples.map(([ax, z]) => {
    const y = sampleFrontDeckSurfaceY(ax, z) + 0.015;
    return new THREE.Vector3(side * ax, y, z);
  });
  emissiveParts.push(buildSweptPillarGeometry(drlPts, 0.009, 0.009, 14, 6));

  // Separate sleek amber indicator strip along outer-lower edge of headlight housing
  const indSamples: Array<[number, number]> = [
    [0.70, -2.03],
    [0.78, -1.92],
    [0.825, -1.81],
  ];
  const indPts = indSamples.map(([ax, z]) => {
    const y = sampleFrontDeckSurfaceY(ax, z) + 0.013;
    return new THREE.Vector3(side * ax, y, z);
  });
  const indicator = buildSweptPillarGeometry(indPts, 0.0075, 0.0075, 10, 6);

  return {
    housing,
    bezels: mergeSimpleGeometries(bezelParts),
    emissive: mergeSimpleGeometries(emissiveParts),
    indicator,
    lens,
  };
}

/**
 * Builds conformal twin recessed hood heat-extractor vents on the sculpted front bonnet.
 */
export function buildVeloceHoodVentsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const zSteps = 5;
    const xSteps = 4;
    const rings: Array<Array<[number, number, number]>> = [];
    for (let i = 0; i < zSteps; i++) {
      const u = i / (zSteps - 1);
      const z = -1.62 + u * 0.28;
      const centerX = 0.22 + u * 0.04;
      const halfW = 0.032 * (1 - u * 0.22);
      const ring: Array<[number, number, number]> = [];
      for (let j = 0; j < xSteps; j++) {
        const v = (j / (xSteps - 1)) * 2 - 1;
        const ax = centerX + v * halfW;
        const y = sampleFrontDeckSurfaceY(ax, z) + 0.0025;
        ring.push([side * ax, y, z]);
      }
      rings.push(ring);
    }
    parts.push(loftGrid(rings, side > 0));
  }
  return mergeSimpleGeometries(parts);
}

/**
 * Builds sculpted swept crescent side-haunch aero intake scoops.
 */
export function buildVeloceSideIntakeGeometry(side: -1 | 1): {
  recess: THREE.BufferGeometry;
  blade: THREE.BufferGeometry;
} {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, -0.11);
  shape.lineTo(0.14, -0.14);
  shape.quadraticCurveTo(0.24, 0.0, 0.16, 0.14);
  shape.lineTo(-0.14, 0.11);
  shape.quadraticCurveTo(-0.08, 0.0, -0.22, -0.11);
  shape.closePath();

  const recess = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  recess.rotateY(-Math.PI / 2);
  const baseX = side > 0 ? 0.945 : -0.90;
  recess.translate(baseX, 0.54, 0.56);
  recess.computeVertexNormals();

  const strake = new THREE.BoxGeometry(0.055, 0.022, 0.30);
  strake.rotateY(side * 0.12);
  strake.translate(side * 0.935, 0.54, 0.56);

  return { recess, blade: strake };
}

/**
 * Builds the aerodynamic carbon-fiber front splitter with upturned outer aero winglets.
 */
export function buildVeloceFrontSplitterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shape = new THREE.Shape();
  shape.moveTo(-0.92, 0.0);
  shape.quadraticCurveTo(-0.96, -0.18, -0.74, -0.34);
  shape.quadraticCurveTo(0, -0.47, 0.74, -0.34);
  shape.quadraticCurveTo(0.96, -0.18, 0.92, 0.0);
  shape.lineTo(0.76, 0.14);
  shape.lineTo(-0.76, 0.14);
  shape.closePath();

  const mainBlade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.034,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 16,
  });
  mainBlade.rotateX(Math.PI / 2);
  mainBlade.translate(0, 0.172, -1.87);
  mainBlade.computeVertexNormals();
  parts.push(mainBlade);

  // Outer vertical carbon splitter endplate winglets
  for (const side of [-1, 1] as const) {
    const winglet = new THREE.BoxGeometry(0.024, 0.11, 0.24);
    winglet.rotateY(side * -0.18);
    winglet.translate(side * 0.89, 0.21, -2.02);
    parts.push(winglet);
  }

  return mergeSimpleGeometries(parts);
}

/**
 * Builds a sculpted carbon side skirt blade with rear aero winglet ahead of the rear wheel arch.
 */
export function buildVeloceSideSkirtGeometry(side: -1 | 1): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.94, 0.0);
  shape.lineTo(0.87, 0.0);
  shape.quadraticCurveTo(0.93, 0.02, 0.91, 0.11);
  shape.lineTo(0.82, 0.048);
  shape.lineTo(-0.92, 0.042);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.009,
    bevelSegments: 2,
  });
  geo.rotateY(-Math.PI / 2);
  const offsetX = side > 0 ? 0.97 : -0.85;
  geo.translate(offsetX, 0.14, 0.0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an aerodynamic cambered airfoil rear wing + swept carbon endplates + swan-neck pylons.
 */
export function buildVeloceRearWingGeometry(): {
  blade: THREE.BufferGeometry;
  endplates: THREE.BufferGeometry;
  pylons: THREE.BufferGeometry;
} {
  const foil = new THREE.Shape();
  foil.moveTo(-0.16, 0.015);
  foil.quadraticCurveTo(-0.04, 0.04, 0.16, 0.005);
  foil.quadraticCurveTo(0.02, -0.022, -0.16, 0.015);

  const blade = new THREE.ExtrudeGeometry(foil, {
    depth: 1.72,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 12,
  });
  blade.translate(0, 0, -0.86);
  blade.rotateY(Math.PI / 2);
  const pos = blade.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const normX = x / 0.86;
    pos.setXYZ(i, x, y - normX * normX * 0.026, z + normX * normX * 0.05);
  }
  pos.needsUpdate = true;
  blade.translate(0, 1.07, 2.0);
  blade.computeVertexNormals();

  const epShape = new THREE.Shape();
  epShape.moveTo(-0.18, -0.045);
  epShape.lineTo(0.18, -0.025);
  epShape.quadraticCurveTo(0.22, 0.04, 0.16, 0.075);
  epShape.lineTo(-0.16, 0.04);
  epShape.closePath();

  const makeEndplate = (side: -1 | 1) => {
    const g = new THREE.ExtrudeGeometry(epShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    g.rotateY(-Math.PI / 2);
    g.translate(side * 0.87 + (side > 0 ? 0.011 : -0.011), 1.045, 2.055);
    return g;
  };
  const endplates = mergeSimpleGeometries([makeEndplate(-1), makeEndplate(1)]);

  const pylonShape = new THREE.Shape();
  pylonShape.moveTo(-0.12, 0.0);
  pylonShape.lineTo(0.06, 0.0);
  pylonShape.quadraticCurveTo(0.11, 0.12, 0.04, 0.21);
  pylonShape.lineTo(-0.08, 0.21);
  pylonShape.quadraticCurveTo(-0.04, 0.1, -0.12, 0.0);
  const makePylon = (side: -1 | 1) => {
    const g = new THREE.ExtrudeGeometry(pylonShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    g.rotateY(-Math.PI / 2);
    g.translate(side * 0.44 + 0.016, 0.875, 1.96);
    return g;
  };
  const pylons = mergeSimpleGeometries([makePylon(-1), makePylon(1)]);

  return { blade, endplates, pylons };
}

/**
 * Builds the full-width sculpted carbon rear valence, wrap-around corner spats,
 * aerodynamic diffuser tunnel, and 5 vertical strake fins.
 */
export function buildVeloceRearDiffuserGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Full-width sculpted lower carbon rear bumper valence (sits cleanly behind license plate pocket)
  const upperValence = new THREE.BoxGeometry(1.74, 0.24, 0.12);
  upperValence.translate(0, 0.44, 2.155);
  parts.push(upperValence);

  const lowerTray = new THREE.BoxGeometry(1.68, 0.18, 0.22);
  lowerTray.rotateX(-0.18);
  lowerTray.translate(0, 0.265, 2.175);
  parts.push(lowerTray);

  // Wrap-around outer carbon corner spats behind rear wheels
  for (const side of [-1, 1] as const) {
    const spat = new THREE.BoxGeometry(0.16, 0.34, 0.28);
    spat.rotateY(side * 0.18);
    spat.translate(side * 0.82, 0.35, 2.11);
    parts.push(spat);
  }

  // 5 vertical aerodynamic diffuser strake fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.32, 0.065);
  finShape.lineTo(0.3, 0.185);
  finShape.lineTo(0, 0.115);
  finShape.closePath();

  for (const fx of [-0.36, -0.18, 0, 0.18, 0.36]) {
    const fin = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    fin.rotateY(-Math.PI / 2);
    fin.translate(fx + 0.011, 0.165, 1.98);
    parts.push(fin);
  }

  return mergeSimpleGeometries(parts);
}

/**
 * Builds a realistic low-profile rounded tyre (LatheGeometry), deep concave forged
 * 10-spoke (5 split-Y) alloy wheel, inner barrel shroud, lug bolts, ventilated brake disc, and sculpted caliper.
 */
export function buildVeloceWheelParts(wheelWidth: number): {
  tireGeo: THREE.BufferGeometry;
  rimAlloyGeo: THREE.BufferGeometry;
  hubDarkGeo: THREE.BufferGeometry;
  lugGeo: THREE.BufferGeometry;
  rotorGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
} {
  const R = VELOCE_GT_DIMS.wheelRadius;
  const hw = wheelWidth * 0.5;
  const rimR = R * 0.69;

  const tireProfile: THREE.Vector2[] = [
    new THREE.Vector2(rimR * 0.96, -hw * 0.88),
    new THREE.Vector2(rimR * 1.03, -hw * 0.96),
    new THREE.Vector2(R * 0.86, -hw * 1.01),
    new THREE.Vector2(R * 0.965, -hw * 0.95),
    new THREE.Vector2(R * 0.996, -hw * 0.72),
    new THREE.Vector2(R, -hw * 0.35),
    new THREE.Vector2(R, hw * 0.35),
    new THREE.Vector2(R * 0.996, hw * 0.72),
    new THREE.Vector2(R * 0.965, hw * 0.95),
    new THREE.Vector2(R * 0.86, hw * 1.01),
    new THREE.Vector2(rimR * 1.03, hw * 0.96),
    new THREE.Vector2(rimR * 0.96, hw * 0.88),
  ];
  const tireGeo = new THREE.LatheGeometry(tireProfile, 30);
  tireGeo.rotateZ(Math.PI / 2);
  tireGeo.computeVertexNormals();

  const alloyParts: THREE.BufferGeometry[] = [];
  const barrelProfile: THREE.Vector2[] = [
    new THREE.Vector2(rimR * 0.91, -hw * 0.82),
    new THREE.Vector2(rimR * 0.99, -hw * 0.82),
    new THREE.Vector2(rimR * 1.015, hw * 0.84),
    new THREE.Vector2(rimR * 0.94, hw * 0.89),
    new THREE.Vector2(rimR * 0.87, hw * 0.74),
    new THREE.Vector2(rimR * 0.87, -hw * 0.74),
  ];
  const barrel = new THREE.LatheGeometry(barrelProfile, 28);
  barrel.rotateZ(Math.PI / 2);
  alloyParts.push(barrel);

  const hubRing = new THREE.CylinderGeometry(rimR * 0.29, rimR * 0.32, 0.045, 18);
  hubRing.rotateZ(Math.PI / 2);
  hubRing.translate(hw * 0.42, 0, 0);
  alloyParts.push(hubRing);

  const spokeCount = 5;
  const spokeLen = rimR * 0.69;
  for (let i = 0; i < spokeCount; i++) {
    const baseAngle = (i / spokeCount) * Math.PI * 2;
    for (const branch of [-1, 1]) {
      const sp = new THREE.BoxGeometry(0.025, spokeLen, 0.021);
      sp.rotateZ(-0.18);
      sp.translate(hw * 0.62, rimR * 0.56, branch * 0.036);
      sp.rotateX(baseAngle + branch * 0.11);
      alloyParts.push(sp);
    }
  }
  const rimAlloyGeo = mergeSimpleGeometries(alloyParts);

  // Center cap + inner wheel barrel backing shroud so road markings never leak through lower wheel spokes
  const centerCap = new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.2, 0.055, 16);
  centerCap.rotateZ(Math.PI / 2);
  centerCap.translate(hw * 0.44, 0, 0);
  const innerShroud = new THREE.CylinderGeometry(rimR * 0.9, rimR * 0.9, 0.025, 20);
  innerShroud.rotateZ(Math.PI / 2);
  innerShroud.translate(-hw * 0.52, 0, 0);
  const hubDarkGeo = mergeSimpleGeometries([centerCap, innerShroud]);

  const lugParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const lug = new THREE.CylinderGeometry(0.011, 0.011, 0.022, 6);
    lug.rotateZ(Math.PI / 2);
    lug.translate(hw * 0.56, Math.cos(ang) * rimR * 0.2, Math.sin(ang) * rimR * 0.2);
    lugParts.push(lug);
  }
  const lugGeo = mergeSimpleGeometries(lugParts);

  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.79, rimR * 0.79, 0.026, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  rotorGeo.translate(hw * 0.2, 0, 0);

  // Prominent sculpted Brembo-style brake caliper positioned clearly visible behind upper spokes
  const calShape = new THREE.Shape();
  const rIn = rimR * 0.52;
  const rOut = rimR * 0.86;
  calShape.absarc(0, 0, rOut, -0.52, 0.52, false);
  calShape.absarc(0, 0, rIn, 0.52, -0.52, true);
  calShape.closePath();

  const caliperGeo = new THREE.ExtrudeGeometry(calShape, {
    depth: 0.072,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 10,
  });
  caliperGeo.rotateY(Math.PI / 2);
  caliperGeo.translate(hw * 0.2 - 0.024, 0, 0);
  caliperGeo.computeVertexNormals();

  return { tireGeo, rimAlloyGeo, hubDarkGeo, lugGeo, rotorGeo, caliperGeo };
}

export function buildVeloceSideMirrorGeometry(side: -1 | 1): {
  housing: THREE.BufferGeometry;
  stalk: THREE.BufferGeometry;
} {
  const housing = new THREE.SphereGeometry(0.092, 14, 10);
  housing.scale(1.15, 0.62, 1.38);
  housing.rotateY(side * -0.18);
  housing.translate(side * 0.995, 0.875, -0.46);

  const stalkPts = [
    new THREE.Vector3(side * 0.84, 0.81, -0.49),
    new THREE.Vector3(side * 0.92, 0.84, -0.48),
    new THREE.Vector3(side * 0.98, 0.865, -0.46),
  ];
  const stalk = buildSweptPillarGeometry(stalkPts, 0.018, 0.026, 8, 8);
  return { housing, stalk };
}

export function buildVeloceBucketSeatGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pan = new THREE.BoxGeometry(0.42, 0.09, 0.44);
  pan.rotateX(-0.08);
  pan.translate(0, 0.05, 0.02);
  parts.push(pan);

  for (const sx of [-0.21, 0.21]) {
    const tb = new THREE.BoxGeometry(0.075, 0.12, 0.42);
    tb.rotateZ(sx > 0 ? 0.25 : -0.25);
    tb.translate(sx, 0.09, 0.02);
    parts.push(tb);
  }

  const back = new THREE.BoxGeometry(0.4, 0.5, 0.085);
  back.rotateX(0.24);
  back.translate(0, 0.3, 0.25);
  parts.push(back);

  for (const sx of [-0.2, 0.2]) {
    const sb = new THREE.BoxGeometry(0.075, 0.44, 0.11);
    sb.rotateX(0.24);
    sb.rotateY(sx > 0 ? -0.28 : 0.28);
    sb.translate(sx, 0.3, 0.22);
    parts.push(sb);
  }

  const head = new THREE.BoxGeometry(0.22, 0.18, 0.085);
  head.rotateX(0.14);
  head.translate(0, 0.61, 0.31);
  parts.push(head);

  return mergeSimpleGeometries(parts);
}

/**
 * Builds the signature Veloce GT full-width curved LED taillight blade + wrap-around outboard claws
 * positioned proudly in front of the recessed matte-black rear lightbar bay (z = 2.24..2.27)!
 */
export function buildVeloceTaillightBladeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Continuous glowing central LED lightblade spanning the rear fascia
  const barPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = (i / 16) * 2 - 1;
    const x = u * 0.81;
    const z = 2.262 - u * u * 0.032;
    const y = 0.785 + Math.abs(u) * 0.012;
    barPts.push(new THREE.Vector3(x, y, z));
  }
  parts.push(buildSweptPillarGeometry(barPts, 0.017, 0.02, 20, 8));

  // Outboard angular C-claw signature brake clusters on left and right
  for (const side of [-1, 1] as const) {
    const clawPts = [
      new THREE.Vector3(side * 0.52, 0.725, 2.256),
      new THREE.Vector3(side * 0.81, 0.728, 2.238),
      new THREE.Vector3(side * 0.865, 0.78, 2.205),
      new THREE.Vector3(side * 0.81, 0.835, 2.235),
      new THREE.Vector3(side * 0.56, 0.835, 2.254),
    ];
    parts.push(buildSweptPillarGeometry(clawPts, 0.016, 0.018, 16, 6));
  }

  return mergeSimpleGeometries(parts);
}

/**
 * Builds slim outboard amber rear indicator strips nestled cleanly inside the taillight C-claws.
 */
export function buildVeloceRearIndicatorGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const pts = [
      new THREE.Vector3(side * 0.58, 0.758, 2.256),
      new THREE.Vector3(side * 0.70, 0.759, 2.250),
      new THREE.Vector3(side * 0.80, 0.762, 2.238),
    ];
    parts.push(buildSweptPillarGeometry(pts, 0.0085, 0.009, 10, 6));
  }
  return mergeSimpleGeometries(parts);
}

/**
 * Builds twin low-profile aerodynamic windscreen wipers tucked against the curved windshield cowl.
 */
export function buildVeloceWipersGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    buildSweptPillarGeometry(
      [
        new THREE.Vector3(-0.06, 0.86, -0.602),
        new THREE.Vector3(-0.30, 0.878, -0.582),
        new THREE.Vector3(-0.56, 0.885, -0.532),
      ],
      0.007,
      0.009,
      10,
      6,
    ),
  );
  parts.push(
    buildSweptPillarGeometry(
      [
        new THREE.Vector3(0.46, 0.872, -0.558),
        new THREE.Vector3(0.24, 0.878, -0.585),
        new THREE.Vector3(0.02, 0.872, -0.598),
      ],
      0.007,
      0.009,
      10,
      6,
    ),
  );
  return mergeSimpleGeometries(parts);
}

/**
 * Builds subtle flush panel shut lines (door seams & bonnet contour lines) hugging the
 * exact lofted Veloce GT body shell to give real coachbuilt panel definition.
 */
export function buildVelocePanelSeamsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const r = 0.0045;

  const sideSurfacePt = (side: -1 | 1, z: number, fracY: number): THREE.Vector3 => {
    const s = evaluateVeloceBodySection(z);
    const h = Math.max(0.06, s.beltY - s.sillY);
    const scoop = bell(z, 0.54, 0.46) * 0.062;
    const xBase =
      fracY < 0.35
        ? s.halfWidthLower + (s.halfWidthMid - scoop * 0.65 - s.halfWidthLower) * (fracY / 0.35)
        : fracY < 0.72
          ? s.halfWidthMid - scoop * (0.65 + ((fracY - 0.35) / 0.37) * 0.35)
          : s.halfWidthMid -
            scoop +
            (s.halfWidthBelt + 0.02 - (s.halfWidthMid - scoop)) * ((fracY - 0.72) / 0.28);
    return new THREE.Vector3(side * (xBase + 0.003), s.sillY + h * fracY, z);
  };

  for (const side of [-1, 1] as const) {
    // Front door shut line (z = -0.54)
    const frontDoorPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const fy = 0.08 + (i / 6) * 0.88;
      frontDoorPts.push(sideSurfacePt(side, -0.54 + fy * 0.03, fy));
    }
    parts.push(buildSweptPillarGeometry(frontDoorPts, r, r, 10, 5));

    // Rear door shut line curving cleanly ahead of the crescent side intake
    const rearDoorPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const fy = 0.08 + (i / 6) * 0.88;
      const zCurve = 0.35 + Math.sin(fy * Math.PI) * 0.05 + fy * 0.08;
      rearDoorPts.push(sideSurfacePt(side, zCurve, fy));
    }
    parts.push(buildSweptPillarGeometry(rearDoorPts, r, r, 10, 5));

    // Lower door rocker shut line connecting front & rear seams
    const sillPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const z = -0.53 + (i / 6) * 0.88;
      sillPts.push(sideSurfacePt(side, z, 0.11));
    }
    parts.push(buildSweptPillarGeometry(sillPts, r, r, 10, 5));

    // Sculpted bonnet / hood side shut line nestled inside each front fender valley
    const hoodPts: THREE.Vector3[] = [];
    const hoodStations: Array<[number, number]> = [
      [0.36, -2.09],
      [0.45, -1.86],
      [0.52, -1.52],
      [0.57, -1.12],
      [0.63, -0.68],
    ];
    for (const [ax, z] of hoodStations) {
      hoodPts.push(new THREE.Vector3(side * ax, sampleFrontDeckSurfaceY(ax, z) + 0.0035, z));
    }
    parts.push(buildSweptPillarGeometry(hoodPts, r, r, 12, 5));
  }

  // Front bonnet leading-edge shut arc connecting left & right hood lines above nose badge
  const noseArcPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = (i / 8) * 2 - 1;
    const x = u * 0.36;
    const z = -2.115 + u * u * 0.025;
    noseArcPts.push(new THREE.Vector3(x, sampleFrontDeckSurfaceY(Math.abs(x), z) + 0.0035, z));
  }
  parts.push(buildSweptPillarGeometry(noseArcPts, r, r, 10, 5));

  return mergeSimpleGeometries(parts);
}
