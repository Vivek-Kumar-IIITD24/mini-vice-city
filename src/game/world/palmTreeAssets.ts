import * as THREE from 'three';
import { TreeSpec } from './cityData';

export type PalmSpecies = 'coconut' | 'royal' | 'sabal' | 'compact_tropical';

export const ALL_PALM_SPECIES: readonly PalmSpecies[] = [
  'coconut',
  'royal',
  'sabal',
  'compact_tropical',
] as const;

export interface PalmTrunkBuildResult {
  geometry: THREE.BufferGeometry;
  crownOrigin: THREE.Vector3;
  crownTiltX: number;
  crownTiltZ: number;
  height: number;
  ringCount: number;
}

export interface PinnateFrondBuildOptions {
  length: number;
  archHeight: number;
  tipDrop: number;
  leafletPairs: number;
  maxLeafletLength: number;
  leafletWidth: number;
  leafletDroop: number;
  plumoseSpread?: number;
  baseColorHex?: number;
  midColorHex?: number;
  tipColorHex?: number;
  rachisColorHex?: number;
}

export interface PinnateFrondBuildResult {
  geometry: THREE.BufferGeometry;
  leafletPairCount: number;
  leftLeafletCount: number;
  rightLeafletCount: number;
}

export interface SabalFanLeafBuildOptions {
  petioleLength: number;
  petioleArch: number;
  fanRadius: number;
  segmentCount: number;
  fanArcRadians: number;
  segmentDroop: number;
  baseColorHex?: number;
  midColorHex?: number;
  tipColorHex?: number;
  petioleColorHex?: number;
}

export interface SabalFanLeafBuildResult {
  geometry: THREE.BufferGeometry;
  radialSegmentCount: number;
}

export interface PalmCrownBuildResult {
  geometry: THREE.BufferGeometry;
  frondCount: number;
  totalLeafletCount: number;
  crownRadius: number;
}

export interface CoconutClusterBuildResult {
  geometry: THREE.BufferGeometry;
  coconutCount: number;
}

export interface PalmPlacementRecord {
  x: number;
  z: number;
  scale: number;
  lean: number;
  rotY: number;
  species: PalmSpecies;
  hasCoconuts: boolean;
}

export interface PalmTreeAssetsStats {
  totalPalmCount: number;
  speciesDistribution: Record<PalmSpecies, number>;
  instancedBatches: number;
  sharedGeometryCount: number;
  sharedMaterialCount: number;
  totalCrownInstances: number;
  totalFrondCount: number;
  coconutClusterInstances: number;
  placements: PalmPlacementRecord[];
}

export interface PalmTreeAssetsContext {
  root: THREE.Group;
  disposables: Array<{ dispose: () => void }>;
  windTimeUniform?: { value: number };
}

// =========================================================================
// DETERMINISTIC HASHING & SPECIES ASSIGNMENT (Zero Math.random())
// =========================================================================

function hashPosition(x: number, z: number, salt = 0): number {
  const xi = Math.round(x * 10);
  const zi = Math.round(z * 10);
  let h = (xi * 374761393 + zi * 668265263 + salt * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function hashFloat01(seed: number): number {
  let h = (seed * 747796405 + 2891336453) | 0;
  h = (((h >>> ((h >>> 28) + 4)) ^ h) * 277803737) | 0;
  return ((h ^ (h >>> 22)) >>> 0) / 4294967295;
}

/**
 * Deterministically assigns each existing TreeSpec (`kind === 'palm'`) to one of the 4 distinct
 * coastal Florida / Miami tropical palm species based purely on its world position.
 * - Beach sand (`x >= 118`): primarily leaning Coconut Palms + hardy coastal Sabal Palmettos.
 * - Ocean Drive beachfront promenade (`100 <= x < 118`): iconic mix of Coconut, Royal & Sabal palms.
 * - Hotel-side Ocean Drive (`75 <= x < 100`): manicured Royal, Compact Tropical & Sabal palms (clear of balconies).
 * - Bayfront Ave & Vice Blvd (`|x| < 40`): stately Royal, Compact Tropical & Sabal palms (clear of buildings).
 */
export function assignPalmSpecies(spec: TreeSpec): PalmSpecies {
  const bucket = hashPosition(spec.x, spec.z, 17) % 100;

  if (spec.x >= 118) {
    // Beach sand strip: iconic leaning coconut palms + coastal sabal palmettos
    return bucket < 74 ? 'coconut' : 'sabal';
  }
  if (spec.x >= 100) {
    // Ocean Drive beachfront promenade
    if (bucket < 42) return 'coconut';
    if (bucket < 74) return 'royal';
    if (bucket < 92) return 'sabal';
    return 'compact_tropical';
  }
  if (spec.x >= 75) {
    // Hotel-side landscaping along Ocean Drive
    if (bucket < 36) return 'royal';
    if (bucket < 72) return 'compact_tropical';
    return 'sabal';
  }
  // Bayfront Avenue & Vice Boulevard medians
  if (bucket < 36) return 'royal';
  if (bucket < 70) return 'compact_tropical';
  if (bucket < 92) return 'sabal';
  return 'coconut';
}

export function hasCoconutCluster(spec: TreeSpec, species: PalmSpecies): boolean {
  if (species !== 'coconut') return false;
  return hashPosition(spec.x, spec.z, 53) % 100 < 68;
}

// =========================================================================
// LOW-LEVEL VERTEX BUFFER BUILDER (Guaranteed Finite Positions & Unit Normals)
// =========================================================================

class MeshBufferBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];

  private readonly _vA = new THREE.Vector3();
  private readonly _vB = new THREE.Vector3();
  private readonly _vC = new THREE.Vector3();
  private readonly _e1 = new THREE.Vector3();
  private readonly _e2 = new THREE.Vector3();
  private readonly _n = new THREE.Vector3();

  addTriangle(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    au: number,
    av: number,
    bu: number,
    bv: number,
    cu: number,
    cv: number,
    cA: THREE.Color,
    cB: THREE.Color,
    cC: THREE.Color,
    customNormal?: THREE.Vector3,
  ): void {
    this._vA.set(ax, ay, az);
    this._vB.set(bx, by, bz);
    this._vC.set(cx, cy, cz);

    if (customNormal && customNormal.lengthSq() > 1e-6) {
      this._n.copy(customNormal).normalize();
    } else {
      this._e1.subVectors(this._vB, this._vA);
      this._e2.subVectors(this._vC, this._vA);
      this._n.crossVectors(this._e1, this._e2);
      const len = this._n.length();
      if (!Number.isFinite(len) || len < 1e-6) {
        return; // Skip degenerate micro-triangle to guarantee strictly valid unit normals
      }
      this._n.divideScalar(len);
    }

    this.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    this.normals.push(
      this._n.x,
      this._n.y,
      this._n.z,
      this._n.x,
      this._n.y,
      this._n.z,
      this._n.x,
      this._n.y,
      this._n.z,
    );
    this.uvs.push(au, av, bu, bv, cu, cv);
    this.colors.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b, cC.r, cC.g, cC.b);
  }

  addQuad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    au: number,
    av: number,
    bu: number,
    bv: number,
    cu: number,
    cv: number,
    du: number,
    dv: number,
    cA: THREE.Color,
    cB: THREE.Color,
    cC: THREE.Color,
    cD: THREE.Color,
  ): void {
    this.addTriangle(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, au, av, bu, bv, cu, cv, cA, cB, cC);
    this.addTriangle(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z, au, av, cu, cv, du, dv, cA, cC, cD);
  }

  toBufferGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    sanitizeGeometryNormals(geo);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }
}

function sanitizeGeometryNormals(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position');
  let norm = geo.getAttribute('normal');
  if (!norm) {
    geo.computeVertexNormals();
    norm = geo.getAttribute('normal');
  }
  for (let i = 0; i < pos.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const len = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(len) || len < 1e-4) {
      norm.setXYZ(i, 0, 1, 0);
    } else {
      norm.setXYZ(i, nx / len, ny / len, nz / len);
    }
  }
  norm.needsUpdate = true;
}

// =========================================================================
// STEP 3 — REALISTIC PROCEDURAL PALM TRUNKS & CROWNSHAFTS
// =========================================================================

interface TrunkSpecParams {
  height: number;
  baseRadius: number;
  midRadius: number;
  topRadius: number;
  crownshaftStartT: number;
  crownshaftBulge: number;
  crownshaftTopRadius: number;
  curveZ: number;
  curveX: number;
  ringCount: number;
  ringDepth: number;
  bootTextureStrength: number;
  barkLightHex: number;
  barkDarkHex: number;
  collarHex: number;
  crownshaftBaseHex: number;
  crownshaftTopHex: number;
}

function getTrunkParams(species: PalmSpecies): TrunkSpecParams {
  switch (species) {
    case 'coconut':
      return {
        height: 8.5,
        baseRadius: 0.38,
        midRadius: 0.22,
        topRadius: 0.175,
        crownshaftStartT: 0.90,
        crownshaftBulge: 0.052,
        crownshaftTopRadius: 0.20,
        curveZ: 1.24,
        curveX: 0.26,
        ringCount: 25,
        ringDepth: 0.024,
        bootTextureStrength: 0.020,
        barkLightHex: 0xb2a390,
        barkDarkHex: 0x766654,
        collarHex: 0x6f5536,
        crownshaftBaseHex: 0x6c7539,
        crownshaftTopHex: 0x527a30,
      };
    case 'royal':
      return {
        height: 10.2,
        baseRadius: 0.43,
        midRadius: 0.33,
        topRadius: 0.245,
        crownshaftStartT: 0.80,
        crownshaftBulge: 0.062,
        crownshaftTopRadius: 0.205,
        curveZ: 0.11,
        curveX: 0.04,
        ringCount: 28,
        ringDepth: 0.005,
        bootTextureStrength: 0.0,
        barkLightHex: 0xe2dfd8,
        barkDarkHex: 0xc5c1b8,
        collarHex: 0xb2ac9f,
        crownshaftBaseHex: 0x568a37,
        crownshaftTopHex: 0x3f7529,
      };
    case 'sabal':
      return {
        height: 7.4,
        baseRadius: 0.39,
        midRadius: 0.29,
        topRadius: 0.275,
        crownshaftStartT: 0.89,
        crownshaftBulge: 0.06,
        crownshaftTopRadius: 0.29,
        curveZ: 0.18,
        curveX: -0.07,
        ringCount: 22,
        ringDepth: 0.025,
        bootTextureStrength: 0.038,
        barkLightHex: 0x90867a,
        barkDarkHex: 0x5f564c,
        collarHex: 0x7c684b,
        crownshaftBaseHex: 0x756444,
        crownshaftTopHex: 0x5f6e3b,
      };
    case 'compact_tropical':
    default:
      return {
        height: 6.4,
        baseRadius: 0.30,
        midRadius: 0.19,
        topRadius: 0.15,
        crownshaftStartT: 0.84,
        crownshaftBulge: 0.032,
        crownshaftTopRadius: 0.145,
        curveZ: 0.28,
        curveX: 0.09,
        ringCount: 20,
        ringDepth: 0.015,
        bootTextureStrength: 0.009,
        barkLightHex: 0xaa9c88,
        barkDarkHex: 0x7b6d5b,
        collarHex: 0x78744b,
        crownshaftBaseHex: 0x629640,
        crownshaftTopHex: 0x4b802f,
      };
  }
}

/**
 * Generates organic curved, tapered, ringed palm trunk + crownshaft geometry per species.
 * Returns exact crown apex anchor & tilt so the canopy and coconuts lock cleanly onto the trunk.
 */
export function createPalmTrunkGeometry(species: PalmSpecies): PalmTrunkBuildResult {
  const p = getTrunkParams(species);
  const radialSegs = species === 'royal' ? 12 : 10;
  const heightSegs = Math.max(24, p.ringCount + 6);

  // Spine curve evaluator: starts vertical-ish at root buttress, curves naturally mid-trunk,
  // and turns subtly skyward near crownshaft (authentic coastal phototropism!)
  const evalSpine = (t: number, out: THREE.Vector3): THREE.Vector3 => {
    const y = t * p.height;
    const arch = Math.sin(t * Math.PI * 0.82) * t;
    const z = p.curveZ * arch;
    const x = p.curveX * Math.sin(t * Math.PI * 0.95) * t;
    return out.set(x, y, z);
  };

  const cBarkLight = new THREE.Color(p.barkLightHex);
  const cBarkDark = new THREE.Color(p.barkDarkHex);
  const cCollar = new THREE.Color(p.collarHex);
  const cShaftBase = new THREE.Color(p.crownshaftBaseHex);
  const cShaftTop = new THREE.Color(p.crownshaftTopHex);
  const tmpCol = new THREE.Color();

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const spinePt = new THREE.Vector3();
  const spinePrev = new THREE.Vector3();
  const spineNext = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const sideX = new THREE.Vector3();
  const sideZ = new THREE.Vector3();
  const worldUpX = new THREE.Vector3(1, 0, 0);

  for (let iy = 0; iy <= heightSegs; iy++) {
    const t = iy / heightSegs;
    evalSpine(t, spinePt);
    evalSpine(Math.max(0, t - 0.015), spinePrev);
    evalSpine(Math.min(1, t + 0.015), spineNext);
    tangent.subVectors(spineNext, spinePrev).normalize();

    // Stable orthonormal frame along curved trunk
    sideZ.crossVectors(worldUpX, tangent).normalize();
    sideX.crossVectors(tangent, sideZ).normalize();

    const inShaft = t >= p.crownshaftStartT;
    let baseR: number;

    if (!inShaft) {
      const trunkT = t / p.crownshaftStartT;
      // Flared root buttress at bottom 12%, smooth species taper up to collar
      const buttress = Math.pow(Math.max(0, 1 - trunkT / 0.16), 2) * (p.baseRadius - p.midRadius) * 0.65;
      const midLerp =
        trunkT < 0.45
          ? THREE.MathUtils.lerp(p.baseRadius * 0.85, p.midRadius, trunkT / 0.45)
          : THREE.MathUtils.lerp(p.midRadius, p.topRadius, (trunkT - 0.45) / 0.55);
      // Royal palm subtle mid-belly swelling (Roystonea signature!)
      const royalBelly = species === 'royal' ? Math.sin(trunkT * Math.PI) * 0.042 : 0;
      // Pronounced annular growth rings (sawtooth step profile for realistic leaf scars)
      const ringPhase = (trunkT * p.ringCount) % 1;
      const ringProfile = Math.sin(ringPhase * Math.PI) - 0.35;
      const ringOffset = ringProfile * p.ringDepth;
      baseR = Math.max(0.09, midLerp + buttress + royalBelly + ringOffset);

      // Ring crevice shading in vertex color
      const shade = 0.45 + 0.55 * Math.sin(ringPhase * Math.PI);
      tmpCol.copy(cBarkDark).lerp(cBarkLight, shade);
      if (trunkT > 0.86) {
        tmpCol.lerp(cCollar, (trunkT - 0.86) / 0.14);
      }
    } else {
      const shaftT = (t - p.crownshaftStartT) / Math.max(0.001, 1 - p.crownshaftStartT);
      // Bulbous swelling at lower crownshaft transitioning cleanly to frond emergence
      const bulge = Math.sin(shaftT * Math.PI * 0.85) * p.crownshaftBulge;
      baseR = THREE.MathUtils.lerp(p.topRadius * 1.04, p.crownshaftTopRadius, shaftT) + bulge;
      tmpCol.copy(cShaftBase).lerp(cShaftTop, shaftT);
    }

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const angle = u * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);

      // Subtle organic radius irregularity + overlapping old leaf-base scars on coconut & sabal
      let r = baseR;
      if (!inShaft && p.bootTextureStrength > 0) {
        const upperBias = THREE.MathUtils.smoothstep(t, 0.25, p.crownshaftStartT);
        const diamondBoot =
          Math.abs(Math.sin(angle * 3.0 + iy * 1.15)) * p.bootTextureStrength * (0.35 + 0.65 * upperBias);
        r += diamondBoot;
      } else if (!inShaft) {
        r += Math.sin(angle * 2.0 + t * 9.0) * 0.005;
      }

      const vx = spinePt.x + (sideX.x * ca + sideZ.x * sa) * r;
      const vy = spinePt.y + (sideX.y * ca + sideZ.y * sa) * r;
      const vz = spinePt.z + (sideX.z * ca + sideZ.z * sa) * r;

      positions.push(vx, vy, vz);
      uvs.push(u * 2.0, t * (p.height * 0.65));
      colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
    }
  }

  const ringStride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * ringStride + ix;
      const b = a + 1;
      const c = (iy + 1) * ringStride + ix;
      const d = c + 1;
      // Outward radial normals (CCW when viewed from outside)
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Cap top of crownshaft cleanly so looking from elevated overview never sees a hollow tube
  const topCenterIdx = positions.length / 3;
  evalSpine(1.0, spinePt);
  positions.push(spinePt.x, spinePt.y + 0.08, spinePt.z);
  uvs.push(0.5, 1.0);
  colors.push(cShaftTop.r, cShaftTop.g, cShaftTop.b);
  const topRingStart = heightSegs * ringStride;
  for (let ix = 0; ix < radialSegs; ix++) {
    indices.push(topRingStart + ix, topCenterIdx, topRingStart + ix + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  sanitizeGeometryNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  // Compute exact apex anchor and subtle tip tilt for locked crown attachment
  const crownOrigin = evalSpine(0.985, new THREE.Vector3());
  const pPrev = evalSpine(0.92, new THREE.Vector3());
  const tipDir = crownOrigin.clone().sub(pPrev).normalize();
  const crownTiltX = Math.atan2(tipDir.z, tipDir.y) * 0.45;
  const crownTiltZ = -Math.atan2(tipDir.x, tipDir.y) * 0.45;

  return {
    geometry: geo,
    crownOrigin,
    crownTiltX,
    crownTiltZ,
    height: p.height,
    ringCount: p.ringCount,
  };
}

// =========================================================================
// STEP 4 — REALISTIC COMPOUND FEATHER-LIKE PINNATE FRONDS & SABAL FANS
// =========================================================================

function appendPinnateFrond(
  builder: MeshBufferBuilder,
  opts: PinnateFrondBuildOptions,
  transformMatrix: THREE.Matrix4,
  seed: number,
): { leftCount: number; rightCount: number } {
  const rachisSegs = 8;
  const rachisPts: THREE.Vector3[] = [];
  const rachisTans: THREE.Vector3[] = [];

  const evalRachis = (t: number, out: THREE.Vector3): THREE.Vector3 => {
    const z = t * opts.length;
    // Graceful upward arch then natural gravity droop toward tip
    const y = Math.sin(t * Math.PI * 0.86) * opts.archHeight - Math.pow(t, 2.25) * opts.tipDrop;
    return out.set(0, y, z);
  };

  for (let i = 0; i <= rachisSegs; i++) {
    const t = i / rachisSegs;
    const pt = evalRachis(t, new THREE.Vector3());
    const p0 = evalRachis(Math.max(0, t - 0.02), new THREE.Vector3());
    const p1 = evalRachis(Math.min(1, t + 0.02), new THREE.Vector3());
    rachisPts.push(pt);
    rachisTans.push(p1.sub(p0).normalize());
  }

  const cRachis = new THREE.Color(opts.rachisColorHex ?? 0x6f8b34);
  const cBase = new THREE.Color(opts.baseColorHex ?? 0x2e6e2b);
  const cMid = new THREE.Color(opts.midColorHex ?? 0x458b35);
  const cTip = new THREE.Color(opts.tipColorHex ?? 0x6ca33b);

  const worldPt = (v: THREE.Vector3) => v.clone().applyMatrix4(transformMatrix);

  // 1. 3D Tapered Triangular-Prism Central Rachis (real botanical stem, zero flat stick!)
  const ringTop: THREE.Vector3[] = [];
  const ringLeft: THREE.Vector3[] = [];
  const ringRight: THREE.Vector3[] = [];

  const upVec = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= rachisSegs; i++) {
    const t = i / rachisSegs;
    const r = THREE.MathUtils.lerp(0.044, 0.009, t);
    const center = rachisPts[i];
    const tan = rachisTans[i];
    const right = new THREE.Vector3().crossVectors(upVec, tan).normalize();
    const localUp = new THREE.Vector3().crossVectors(tan, right).normalize();

    ringTop.push(worldPt(center.clone().addScaledVector(localUp, r * 0.95)));
    ringLeft.push(worldPt(center.clone().addScaledVector(right, -r).addScaledVector(localUp, -r * 0.5)));
    ringRight.push(worldPt(center.clone().addScaledVector(right, r).addScaledVector(localUp, -r * 0.5)));
  }

  for (let i = 0; i < rachisSegs; i++) {
    const t0 = i / rachisSegs;
    const t1 = (i + 1) / rachisSegs;
    builder.addQuad(
      ringLeft[i],
      ringTop[i],
      ringTop[i + 1],
      ringLeft[i + 1],
      0,
      t0,
      0.5,
      t0,
      0.5,
      t1,
      0,
      t1,
      cRachis,
      cRachis,
      cRachis,
      cRachis,
    );
    builder.addQuad(
      ringTop[i],
      ringRight[i],
      ringRight[i + 1],
      ringTop[i + 1],
      0.5,
      t0,
      1,
      t0,
      1,
      t1,
      0.5,
      t1,
      cRachis,
      cRachis,
      cRachis,
      cRachis,
    );
    builder.addQuad(
      ringRight[i],
      ringLeft[i],
      ringLeft[i + 1],
      ringRight[i + 1],
      0,
      t0,
      1,
      t0,
      1,
      t1,
      0,
      t1,
      cBase,
      cBase,
      cBase,
      cBase,
    );
  }

  // 2. Paired Alternating Narrow Tapered Leaflets Along Both Sides of the Rachis
  let leftCount = 0;
  let rightCount = 0;
  const plumose = opts.plumoseSpread ?? 0.0;

  for (let pi = 0; pi < opts.leafletPairs; pi++) {
    const pairNorm = pi / Math.max(1, opts.leafletPairs - 1);
    const tBase = THREE.MathUtils.lerp(0.14, 0.96, pairNorm);

    // Botanical length envelope: shorter near petiole, longest through lush mid-frond, pointed at tip
    const env = Math.sin(Math.pow(pairNorm, 0.72) * Math.PI * 0.92 + 0.18);
    const baseLen = opts.maxLeafletLength * THREE.MathUtils.clamp(env, 0.26, 1.0);
    const baseW = opts.leafletWidth * THREE.MathUtils.lerp(1.05, 0.62, pairNorm);

    for (const side of [-1, 1] as const) {
      // Subtle botanical alternation between left & right leaflets along the rachis
      const t = THREE.MathUtils.clamp(tBase + (side > 0 ? 0.012 : 0), 0.12, 0.985);
      const jitter = (hashFloat01(seed + pi * 31 + (side > 0 ? 7 : 13)) - 0.5) * 0.16;
      const leafLen = baseLen * (1.0 + jitter * 0.5);

      const anchor = evalRachis(t, new THREE.Vector3());
      const p0 = evalRachis(Math.max(0, t - 0.015), new THREE.Vector3());
      const p1 = evalRachis(Math.min(1, t + 0.015), new THREE.Vector3());
      const tan = p1.sub(p0).normalize();
      const right = new THREE.Vector3().crossVectors(upVec, tan).normalize();
      const localUp = new THREE.Vector3().crossVectors(tan, right).normalize();

      // Forward sweep along rachis increases toward tip
      const forwardSweep = THREE.MathUtils.lerp(0.46, 0.84, pairNorm);
      // Plumose vertical angle variation (for Royal Palm multi-plane feathery canopy!)
      const plumoseAngle = plumose > 0 ? ((pi % 3) - 1) * plumose + jitter * 0.35 : jitter * 0.22;

      const outDir = new THREE.Vector3()
        .addScaledVector(right, side * (1.0 - forwardSweep * 0.32))
        .addScaledVector(tan, forwardSweep)
        .addScaledVector(localUp, 0.16 + plumoseAngle)
        .normalize();

      // Width axis along rachis direction with pronounced V-fold tilt so leaflets read clearly
      // from street level, close-up, and elevated overview without turning paper-thin
      const bladeEdge = new THREE.Vector3()
        .addScaledVector(tan, 0.78)
        .addScaledVector(localUp, 0.46 * side)
        .normalize();

      const droop = opts.leafletDroop * THREE.MathUtils.lerp(0.78, 1.18, pairNorm);

      // 3-segment curved pointed leaflet: base -> mid1 (arch) -> mid2 (droop) -> sharp pointed tip
      const pBase = anchor.clone().addScaledVector(right, side * 0.016);
      const pMid1 = pBase
        .clone()
        .addScaledVector(outDir, leafLen * 0.36)
        .addScaledVector(localUp, leafLen * 0.07);
      const pMid2 = pBase
        .clone()
        .addScaledVector(outDir, leafLen * 0.72)
        .addScaledVector(upVec, -droop * leafLen * 0.48);
      const pTip = pBase
        .clone()
        .addScaledVector(outDir, leafLen * 1.0)
        .addScaledVector(upVec, -droop * leafLen * 1.12);

      const w0 = baseW * 0.62;
      const w1 = baseW * 0.88;
      const w2 = baseW * 0.50;

      const bL = worldPt(pBase.clone().addScaledVector(bladeEdge, -w0));
      const bR = worldPt(pBase.clone().addScaledVector(bladeEdge, w0));
      const m1L = worldPt(pMid1.clone().addScaledVector(bladeEdge, -w1));
      const m1R = worldPt(pMid1.clone().addScaledVector(bladeEdge, w1));
      const m2L = worldPt(pMid2.clone().addScaledVector(bladeEdge, -w2));
      const m2R = worldPt(pMid2.clone().addScaledVector(bladeEdge, w2));
      const tipW = worldPt(pTip);

      // Subtle per-leaflet green tone variation (sunlit chartreuse tips vs rich emerald mid-blade)
      const shadeJitter = 0.90 + hashFloat01(seed + pi * 97 + (side > 0 ? 3 : 19)) * 0.20;
      const colB = cBase.clone().multiplyScalar(shadeJitter);
      const colM = cMid.clone().multiplyScalar(shadeJitter);
      const colT = cTip.clone().multiplyScalar(shadeJitter);

      builder.addQuad(bL, bR, m1R, m1L, 0, 0, 1, 0, 1, 0.38, 0, 0.38, colB, colB, colM, colM);
      builder.addQuad(m1L, m1R, m2R, m2L, 0, 0.38, 1, 0.38, 1, 0.74, 0, 0.74, colM, colM, colT, colT);
      builder.addTriangle(
        m2L.x,
        m2L.y,
        m2L.z,
        m2R.x,
        m2R.y,
        m2R.z,
        tipW.x,
        tipW.y,
        tipW.z,
        0,
        0.74,
        1,
        0.74,
        0.5,
        1.0,
        colT,
        colT,
        colT,
      );

      if (side < 0) leftCount += 1;
      else rightCount += 1;
    }
  }

  return { leftCount, rightCount };
}

/**
 * Builds a single standalone compound pinnate palm frond (central arched rachis + paired alternating
 * tapered leaflets) for unit inspection or composition.
 */
export function createPinnateFrondGeometry(
  opts: Partial<PinnateFrondBuildOptions> = {},
): PinnateFrondBuildResult {
  const full: PinnateFrondBuildOptions = {
    length: opts.length ?? 3.6,
    archHeight: opts.archHeight ?? 0.65,
    tipDrop: opts.tipDrop ?? 1.15,
    leafletPairs: opts.leafletPairs ?? 15,
    maxLeafletLength: opts.maxLeafletLength ?? 0.74,
    leafletWidth: opts.leafletWidth ?? 0.115,
    leafletDroop: opts.leafletDroop ?? 0.42,
    plumoseSpread: opts.plumoseSpread ?? 0.0,
    baseColorHex: opts.baseColorHex ?? 0x2a6627,
    midColorHex: opts.midColorHex ?? 0x458b35,
    tipColorHex: opts.tipColorHex ?? 0x6ea63c,
    rachisColorHex: opts.rachisColorHex ?? 0x718b35,
  };
  const builder = new MeshBufferBuilder();
  const { leftCount, rightCount } = appendPinnateFrond(builder, full, new THREE.Matrix4(), 101);
  return {
    geometry: builder.toBufferGeometry(),
    leafletPairCount: full.leafletPairs,
    leftLeafletCount: leftCount,
    rightLeafletCount: rightCount,
  };
}

function appendSabalFanLeaf(
  builder: MeshBufferBuilder,
  opts: SabalFanLeafBuildOptions,
  transformMatrix: THREE.Matrix4,
  seed: number,
): number {
  const worldPt = (v: THREE.Vector3) => v.clone().applyMatrix4(transformMatrix);
  const cPetiole = new THREE.Color(opts.petioleColorHex ?? 0x6b7f36);
  const cBase = new THREE.Color(opts.baseColorHex ?? 0x2e642d);
  const cMid = new THREE.Color(opts.midColorHex ?? 0x437c39);
  const cTip = new THREE.Color(opts.tipColorHex ?? 0x6c8e43);

  // 1. Sturdy 3D curved petiole stalk from crown center (0,0,0) to hastula (fan hub)
  const petSegs = 4;
  const petPts: THREE.Vector3[] = [];
  for (let i = 0; i <= petSegs; i++) {
    const t = i / petSegs;
    petPts.push(new THREE.Vector3(0, Math.sin(t * Math.PI * 0.7) * opts.petioleArch, t * opts.petioleLength));
  }
  const petTop: THREE.Vector3[] = [];
  const petLeft: THREE.Vector3[] = [];
  const petRight: THREE.Vector3[] = [];
  for (let i = 0; i <= petSegs; i++) {
    const t = i / petSegs;
    const r = THREE.MathUtils.lerp(0.042, 0.022, t);
    const p = petPts[i];
    petTop.push(worldPt(new THREE.Vector3(p.x, p.y + r, p.z)));
    petLeft.push(worldPt(new THREE.Vector3(p.x - r, p.y - r * 0.5, p.z)));
    petRight.push(worldPt(new THREE.Vector3(p.x + r, p.y - r * 0.5, p.z)));
  }
  for (let i = 0; i < petSegs; i++) {
    builder.addQuad(
      petLeft[i],
      petTop[i],
      petTop[i + 1],
      petLeft[i + 1],
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      cPetiole,
      cPetiole,
      cPetiole,
      cPetiole,
    );
    builder.addQuad(
      petTop[i],
      petRight[i],
      petRight[i + 1],
      petTop[i + 1],
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      cPetiole,
      cPetiole,
      cPetiole,
      cPetiole,
    );
  }

  // 2. Palmate Fan Hub (Hastula) radiating `segmentCount` clearly separated folded radial segments
  const hub = petPts[petSegs];
  const segCount = Math.max(7, opts.segmentCount);
  const halfArc = opts.fanArcRadians * 0.5;

  for (let si = 0; si < segCount; si++) {
    const u = segCount === 1 ? 0.5 : si / (segCount - 1);
    const theta = THREE.MathUtils.lerp(-halfArc, halfArc, u);
    const jitter = (hashFloat01(seed + si * 43) - 0.5) * 0.14;
    // Costapalmate shape: central segments extend slightly farther than side segments
    const radialScale = THREE.MathUtils.lerp(0.76, 1.08, Math.cos(theta * 0.72)) * (1.0 + jitter * 0.4);
    const segLen = opts.fanRadius * radialScale;

    // Direction of this radiating blade in the fan plane
    const dirX = Math.sin(theta);
    const dirZ = Math.cos(theta);
    const perpX = Math.cos(theta);
    const perpZ = -Math.sin(theta);

    // Subtle costapalmate cup/arch across the fan + natural gravity droop on outer tips
    const cupLift = Math.abs(Math.sin(theta)) * 0.14;
    const droop = opts.segmentDroop * (0.85 + Math.abs(jitter));

    // 3 longitudinal stations along each radial segment with a crisp V-rib ridge along the centerline!
    // Base (r=0) -> Mid1 (r=0.34, widest fan blade) -> Mid2 (r=0.72, clearly separated finger) -> Pointed tip (r=1.0)
    const p0 = new THREE.Vector3(hub.x, hub.y, hub.z);
    const p1 = new THREE.Vector3(
      hub.x + dirX * segLen * 0.36,
      hub.y + cupLift * 0.4 + segLen * 0.08,
      hub.z + dirZ * segLen * 0.36,
    );
    const p2 = new THREE.Vector3(
      hub.x + dirX * segLen * 0.74,
      hub.y + cupLift * 0.7 - droop * segLen * 0.32,
      hub.z + dirZ * segLen * 0.74,
    );
    const p3 = new THREE.Vector3(
      hub.x + dirX * segLen * 1.0,
      hub.y + cupLift * 0.45 - droop * segLen * 0.92,
      hub.z + dirZ * segLen * 1.0,
    );

    // Segment angular half-width: lush palmate fan blades with crisp sky separation between outer fingers
    const angularStep = opts.fanArcRadians / Math.max(1, segCount - 1);
    const w0 = 0.032;
    const w1 = segLen * 0.36 * Math.sin(angularStep * 0.49);
    const w2 = segLen * 0.74 * Math.sin(angularStep * 0.30);
    const ridgeH1 = 0.048;
    const ridgeH2 = 0.028;

    const shade = 0.88 + hashFloat01(seed + si * 71) * 0.24;
    const colB = cBase.clone().multiplyScalar(shade);
    const colM = cMid.clone().multiplyScalar(shade);
    const colT = cTip.clone().multiplyScalar(shade);

    // Left & right folded halves meeting at a raised structural rib along p0->p1->p2->p3
    const p0C = worldPt(p0);
    const p0L = worldPt(new THREE.Vector3(p0.x - perpX * w0, p0.y - 0.01, p0.z - perpZ * w0));
    const p0R = worldPt(new THREE.Vector3(p0.x + perpX * w0, p0.y - 0.01, p0.z + perpZ * w0));

    const p1C = worldPt(new THREE.Vector3(p1.x, p1.y + ridgeH1, p1.z));
    const p1L = worldPt(new THREE.Vector3(p1.x - perpX * w1, p1.y - ridgeH1 * 0.4, p1.z - perpZ * w1));
    const p1R = worldPt(new THREE.Vector3(p1.x + perpX * w1, p1.y - ridgeH1 * 0.4, p1.z + perpZ * w1));

    const p2C = worldPt(new THREE.Vector3(p2.x, p2.y + ridgeH2, p2.z));
    const p2L = worldPt(new THREE.Vector3(p2.x - perpX * w2, p2.y - ridgeH2 * 0.4, p2.z - perpZ * w2));
    const p2R = worldPt(new THREE.Vector3(p2.x + perpX * w2, p2.y - ridgeH2 * 0.4, p2.z + perpZ * w2));

    const p3Tip = worldPt(p3);

    // Inner web section (left & right rib faces)
    builder.addQuad(p0L, p0C, p1C, p1L, 0, 0, 0.5, 0, 0.5, 0.36, 0, 0.36, colB, colB, colM, colM);
    builder.addQuad(p0C, p0R, p1R, p1C, 0.5, 0, 1, 0, 1, 0.36, 0.5, 0.36, colB, colB, colM, colM);

    // Outer separated blade fingers
    builder.addQuad(p1L, p1C, p2C, p2L, 0, 0.36, 0.5, 0.36, 0.5, 0.74, 0, 0.74, colM, colM, colT, colT);
    builder.addQuad(p1C, p1R, p2R, p2C, 0.5, 0.36, 1, 0.36, 1, 0.74, 0.5, 0.74, colM, colM, colT, colT);

    // Pointed drooping tips
    builder.addTriangle(
      p2L.x,
      p2L.y,
      p2L.z,
      p2C.x,
      p2C.y,
      p2C.z,
      p3Tip.x,
      p3Tip.y,
      p3Tip.z,
      0,
      0.74,
      0.5,
      0.74,
      0.5,
      1.0,
      colT,
      colT,
      colT,
    );
    builder.addTriangle(
      p2C.x,
      p2C.y,
      p2C.z,
      p2R.x,
      p2R.y,
      p2R.z,
      p3Tip.x,
      p3Tip.y,
      p3Tip.z,
      0.5,
      0.74,
      1,
      0.74,
      0.5,
      1.0,
      colT,
      colT,
      colT,
    );
  }

  return segCount;
}

/**
 * Builds a single standalone Sabal palmate fan leaf with curved petiole and clearly separated
 * bent radial segments with structural fold ribs.
 */
export function createSabalFanLeafGeometry(
  opts: Partial<SabalFanLeafBuildOptions> = {},
): SabalFanLeafBuildResult {
  const full: SabalFanLeafBuildOptions = {
    petioleLength: opts.petioleLength ?? 1.15,
    petioleArch: opts.petioleArch ?? 0.22,
    fanRadius: opts.fanRadius ?? 1.45,
    segmentCount: opts.segmentCount ?? 11,
    fanArcRadians: opts.fanArcRadians ?? Math.PI * 1.18,
    segmentDroop: opts.segmentDroop ?? 0.42,
    baseColorHex: opts.baseColorHex ?? 0x2c632d,
    midColorHex: opts.midColorHex ?? 0x458039,
    tipColorHex: opts.tipColorHex ?? 0x6f8f45,
    petioleColorHex: opts.petioleColorHex ?? 0x6a7d37,
  };
  const builder = new MeshBufferBuilder();
  const radialSegmentCount = appendSabalFanLeaf(builder, full, new THREE.Matrix4(), 211);
  return {
    geometry: builder.toBufferGeometry(),
    radialSegmentCount,
  };
}

// =========================================================================
// STEP 5 — NATURAL ASYMMETRIC CROWN COMPOSITION PER SPECIES
// =========================================================================

/**
 * Composes a complete, organically varied, multi-tier palm canopy geometry for a given species.
 * Uses deterministic per-frond radial jitter, length variation, upright young central fronds,
 * and drooping mature outer fronds — never perfectly symmetrical!
 */
export function createPalmCrownGeometry(species: PalmSpecies): PalmCrownBuildResult {
  const builder = new MeshBufferBuilder();
  const mat = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);

  let frondCount = 0;
  let totalLeafletCount = 0;

  if (species === 'sabal') {
    // Sabal Palm: iconic lush spherical Florida palmetto ball crown of 22 layered fan leaves across 4 tiers
    const tiers = [
      {
        count: 5,
        pitch: -0.82, // upright young central fans
        yOff: 0.32,
        petiole: 0.96,
        radius: 1.38,
        droop: 0.32,
        baseHex: 0x3b7a35,
        midHex: 0x579d42,
        tipHex: 0x84b34c,
      },
      {
        count: 6,
        pitch: -0.24, // upper-mid spherical dome fans
        yOff: 0.16,
        petiole: 1.20,
        radius: 1.56,
        droop: 0.40,
        baseHex: 0x316c30,
        midHex: 0x4b873b,
        tipHex: 0x769c4a,
      },
      {
        count: 6,
        pitch: 0.26, // lower-mid wide equatorial fans
        yOff: -0.05,
        petiole: 1.16,
        radius: 1.54,
        droop: 0.50,
        baseHex: 0x2b5e2b,
        midHex: 0x457937,
        tipHex: 0x7b8c47,
      },
      {
        count: 5,
        pitch: 0.74, // older drooping coastal skirt fans with warm sunlit olive-tan tips
        yOff: -0.28,
        petiole: 1.02,
        radius: 1.40,
        droop: 0.60,
        baseHex: 0x485d2d,
        midHex: 0x72763b,
        tipHex: 0xa18c4f,
      },
    ];

    let seed = 400;
    for (let ti = 0; ti < tiers.length; ti++) {
      const tier = tiers[ti];
      for (let fi = 0; fi < tier.count; fi++) {
        seed += 37;
        const yawBase = (fi / tier.count) * Math.PI * 2 + ti * 0.68;
        const yawJitter = (hashFloat01(seed) - 0.5) * 0.34;
        const pitchJitter = (hashFloat01(seed + 11) - 0.5) * 0.18;
        const rollJitter = (hashFloat01(seed + 23) - 0.5) * 0.24;
        const lenScale = 0.91 + hashFloat01(seed + 31) * 0.18;

        pos.set(0, tier.yOff, 0);
        euler.set(tier.pitch + pitchJitter, yawBase + yawJitter, rollJitter, 'YXZ');
        quat.setFromEuler(euler);
        mat.compose(pos, quat, scale);

        const segs = appendSabalFanLeaf(
          builder,
          {
            petioleLength: tier.petiole * lenScale,
            petioleArch: 0.20,
            fanRadius: tier.radius * lenScale,
            segmentCount: 11,
            fanArcRadians: Math.PI * 1.18,
            segmentDroop: tier.droop,
            baseColorHex: tier.baseHex,
            midColorHex: tier.midHex,
            tipColorHex: tier.tipHex,
            petioleColorHex: 0x70833c,
          },
          mat,
          seed,
        );
        frondCount += 1;
        totalLeafletCount += segs;
      }
    }
  } else {
    // Pinnate species: Coconut, Royal, Compact Tropical — each with distinct tiering, sweep, & lush leaflet ribbons
    type PinnateTier = {
      count: number;
      pitch: number;
      yOff: number;
      length: number;
      archHeight: number;
      tipDrop: number;
      leafletPairs: number;
      maxLeafletLength: number;
      leafletWidth: number;
      leafletDroop: number;
      plumoseSpread: number;
      baseHex: number;
      midHex: number;
      tipHex: number;
    };

    const tiers: PinnateTier[] =
      species === 'coconut'
        ? [
            // Coconut Palm: 16 sweeping sunlit fronds with dense hanging ribbon leaflets (Refs 1 & 4)
            {
              count: 4,
              pitch: -0.72,
              yOff: 0.28,
              length: 3.35,
              archHeight: 0.68,
              tipDrop: 0.88,
              leafletPairs: 20,
              maxLeafletLength: 0.86,
              leafletWidth: 0.155,
              leafletDroop: 0.42,
              plumoseSpread: 0.05,
              baseHex: 0x42882f,
              midHex: 0x67b23b,
              tipHex: 0x97cb43,
            },
            {
              count: 7,
              pitch: -0.14,
              yOff: 0.10,
              length: 4.15,
              archHeight: 0.78,
              tipDrop: 1.56,
              leafletPairs: 22,
              maxLeafletLength: 1.02,
              leafletWidth: 0.168,
              leafletDroop: 0.56,
              plumoseSpread: 0.07,
              baseHex: 0x33752b,
              midHex: 0x529b38,
              tipHex: 0x82ba41,
            },
            {
              count: 5,
              pitch: 0.28,
              yOff: -0.14,
              length: 3.85,
              archHeight: 0.46,
              tipDrop: 1.78,
              leafletPairs: 20,
              maxLeafletLength: 0.94,
              leafletWidth: 0.160,
              leafletDroop: 0.64,
              plumoseSpread: 0.06,
              baseHex: 0x2f6527,
              midHex: 0x4e8334,
              tipHex: 0x8a9e42,
            },
          ]
        : species === 'royal'
          ? [
              // Royal Palm: 20 lush stately plumose fronds framing the smooth emerald crownshaft (Refs 2 & 5)
              {
                count: 6,
                pitch: -0.68,
                yOff: 0.34,
                length: 3.45,
                archHeight: 0.70,
                tipDrop: 0.86,
                leafletPairs: 20,
                maxLeafletLength: 0.82,
                leafletWidth: 0.152,
                leafletDroop: 0.36,
                plumoseSpread: 0.28,
                baseHex: 0x2d7732,
                midHex: 0x45983f,
                tipHex: 0x6bb249,
              },
              {
                count: 8,
                pitch: -0.10,
                yOff: 0.12,
                length: 4.10,
                archHeight: 0.74,
                tipDrop: 1.38,
                leafletPairs: 22,
                maxLeafletLength: 0.94,
                leafletWidth: 0.162,
                leafletDroop: 0.48,
                plumoseSpread: 0.32,
                baseHex: 0x24642a,
                midHex: 0x3a8537,
                tipHex: 0x5fa144,
              },
              {
                count: 6,
                pitch: 0.28,
                yOff: -0.12,
                length: 3.80,
                archHeight: 0.44,
                tipDrop: 1.62,
                leafletPairs: 20,
                maxLeafletLength: 0.86,
                leafletWidth: 0.155,
                leafletDroop: 0.54,
                plumoseSpread: 0.26,
                baseHex: 0x1f5624,
                midHex: 0x347231,
                tipHex: 0x588a3c,
              },
            ]
          : [
              // Compact Tropical Palm: 16 dense lush hotel/boulevard resort fronds
              {
                count: 5,
                pitch: -0.64,
                yOff: 0.22,
                length: 2.30,
                archHeight: 0.50,
                tipDrop: 0.56,
                leafletPairs: 18,
                maxLeafletLength: 0.58,
                leafletWidth: 0.140,
                leafletDroop: 0.36,
                plumoseSpread: 0.14,
                baseHex: 0x388432,
                midHex: 0x58a741,
                tipHex: 0x84c24f,
              },
              {
                count: 6,
                pitch: -0.08,
                yOff: 0.06,
                length: 2.75,
                archHeight: 0.56,
                tipDrop: 0.94,
                leafletPairs: 19,
                maxLeafletLength: 0.68,
                leafletWidth: 0.148,
                leafletDroop: 0.46,
                plumoseSpread: 0.16,
                baseHex: 0x2e712c,
                midHex: 0x4a923b,
                tipHex: 0x72ac48,
              },
              {
                count: 5,
                pitch: 0.28,
                yOff: -0.10,
                length: 2.55,
                archHeight: 0.34,
                tipDrop: 1.08,
                leafletPairs: 18,
                maxLeafletLength: 0.60,
                leafletWidth: 0.140,
                leafletDroop: 0.52,
                plumoseSpread: 0.12,
                baseHex: 0x275d26,
                midHex: 0x407b34,
                tipHex: 0x67923f,
              },
            ];

    let seed = species === 'coconut' ? 700 : species === 'royal' ? 1100 : 1500;
    for (let ti = 0; ti < tiers.length; ti++) {
      const tier = tiers[ti];
      for (let fi = 0; fi < tier.count; fi++) {
        seed += 41;
        const yawBase = (fi / tier.count) * Math.PI * 2 + ti * 0.57;
        const yawJitter = (hashFloat01(seed) - 0.5) * 0.34;
        const pitchJitter = (hashFloat01(seed + 13) - 0.5) * 0.18;
        const rollJitter = (hashFloat01(seed + 29) - 0.5) * 0.24;
        const lenScale = 0.88 + hashFloat01(seed + 47) * 0.24;

        pos.set(0, tier.yOff, 0);
        euler.set(tier.pitch + pitchJitter, yawBase + yawJitter, rollJitter, 'YXZ');
        quat.setFromEuler(euler);
        mat.compose(pos, quat, scale);

        const res = appendPinnateFrond(
          builder,
          {
            length: tier.length * lenScale,
            archHeight: tier.archHeight * lenScale,
            tipDrop: tier.tipDrop * lenScale,
            leafletPairs: tier.leafletPairs,
            maxLeafletLength: tier.maxLeafletLength * lenScale,
            leafletWidth: tier.leafletWidth,
            leafletDroop: tier.leafletDroop,
            plumoseSpread: tier.plumoseSpread,
            baseColorHex: tier.baseHex,
            midColorHex: tier.midHex,
            tipColorHex: tier.tipHex,
            rachisColorHex: species === 'coconut' ? 0x7c9538 : 0x5b7a30,
          },
          mat,
          seed,
        );
        frondCount += 1;
        totalLeafletCount += res.leftCount + res.rightCount;
      }
    }
  }

  const geometry = builder.toBufferGeometry();
  const box = geometry.boundingBox!;
  const crownRadius = Math.max(
    Math.abs(box.min.x),
    Math.abs(box.max.x),
    Math.abs(box.min.z),
    Math.abs(box.max.z),
  );

  return {
    geometry,
    frondCount,
    totalLeafletCount,
    crownRadius,
  };
}

// =========================================================================
// COCONUT CLUSTER GEOMETRY (Anchored Flush Below Coconut Crownshaft)
// =========================================================================

/**
 * Builds an organic cluster of 7 nestled coconuts (elongated smooth spheres + short stems)
 * arranged tightly around local origin `(0, -0.22..-0.42, 0)` so every coconut hugs the trunk
 * collar immediately beneath the coconut palm's fronds with zero floating.
 */
export function createCoconutClusterGeometry(): CoconutClusterBuildResult {
  const builder = new MeshBufferBuilder();
  const baseSphere = new THREE.SphereGeometry(1, 8, 6);
  const nonIdx = baseSphere.toNonIndexed();
  baseSphere.dispose();

  const posAttr = nonIdx.getAttribute('position');
  const uvAttr = nonIdx.getAttribute('uv');

  const clusters: Array<{
    angle: number;
    radial: number;
    y: number;
    rx: number;
    ry: number;
    rz: number;
    colorHex: number;
  }> = [
    { angle: 0.15, radial: 0.22, y: -0.24, rx: 0.145, ry: 0.175, rz: 0.145, colorHex: 0x6f8c2d },
    { angle: 0.92, radial: 0.25, y: -0.34, rx: 0.14, ry: 0.17, rz: 0.14, colorHex: 0x899a32 },
    { angle: 1.78, radial: 0.21, y: -0.22, rx: 0.15, ry: 0.18, rz: 0.15, colorHex: 0x5c7a26 },
    { angle: 2.65, radial: 0.24, y: -0.33, rx: 0.135, ry: 0.165, rz: 0.135, colorHex: 0x9b8634 },
    { angle: 3.60, radial: 0.22, y: -0.26, rx: 0.145, ry: 0.175, rz: 0.145, colorHex: 0x6d892c },
    { angle: 4.55, radial: 0.25, y: -0.36, rx: 0.14, ry: 0.168, rz: 0.14, colorHex: 0x7e7232 },
    { angle: 5.45, radial: 0.22, y: -0.25, rx: 0.142, ry: 0.172, rz: 0.142, colorHex: 0x607d27 },
  ];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (const nut of clusters) {
    const cx = Math.cos(nut.angle) * nut.radial;
    const cz = Math.sin(nut.angle) * nut.radial;
    const col = new THREE.Color(nut.colorHex);
    const colDark = col.clone().multiplyScalar(0.76);

    for (let i = 0; i < posAttr.count; i += 3) {
      vA.set(
        cx + posAttr.getX(i) * nut.rx,
        nut.y + posAttr.getY(i) * nut.ry,
        cz + posAttr.getZ(i) * nut.rz,
      );
      vB.set(
        cx + posAttr.getX(i + 1) * nut.rx,
        nut.y + posAttr.getY(i + 1) * nut.ry,
        cz + posAttr.getZ(i + 1) * nut.rz,
      );
      vC.set(
        cx + posAttr.getX(i + 2) * nut.rx,
        nut.y + posAttr.getY(i + 2) * nut.ry,
        cz + posAttr.getZ(i + 2) * nut.rz,
      );

      const c0 = posAttr.getY(i) < -0.25 ? colDark : col;
      const c1 = posAttr.getY(i + 1) < -0.25 ? colDark : col;
      const c2 = posAttr.getY(i + 2) < -0.25 ? colDark : col;

      builder.addTriangle(
        vA.x,
        vA.y,
        vA.z,
        vB.x,
        vB.y,
        vB.z,
        vC.x,
        vC.y,
        vC.z,
        uvAttr.getX(i),
        uvAttr.getY(i),
        uvAttr.getX(i + 1),
        uvAttr.getY(i + 1),
        uvAttr.getX(i + 2),
        uvAttr.getY(i + 2),
        c0,
        c1,
        c2,
      );
    }
  }

  nonIdx.dispose();
  return {
    geometry: builder.toBufferGeometry(),
    coconutCount: clusters.length,
  };
}

// =========================================================================
// STEP 7 — COMPACT SHARED PBR MATERIALS & PROCEDURAL TEXTURES
// =========================================================================

function createSafePalmTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb: boolean,
): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([215, 215, 215, 255]), 1, 1);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createRingedBarkTextures(disposables: Array<{ dispose: () => void }>): {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
} {
  const map = createSafePalmTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#d4d0ca';
      ctx.fillRect(0, 0, w, h);

      // Horizontal annular leaf-scar bands
      const bands = 16;
      const bh = h / bands;
      for (let i = 0; i < bands; i++) {
        const y = i * bh;
        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0.0, '#8d877f');
        grad.addColorStop(0.24, '#e4e0d9');
        grad.addColorStop(0.75, '#cbc5bc');
        grad.addColorStop(1.0, '#78726a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, bh + 0.5);
      }

      // Fine vertical fibrous bark grain
      for (let i = 0; i < 420; i++) {
        const fx = (i * 59) % w;
        const fy = (i * 31) % h;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(42, 36, 30, 0.14)' : 'rgba(248, 245, 238, 0.10)';
        ctx.fillRect(fx, fy, 2, 10 + (i % 14));
      }
    },
    true,
  );

  const bumpMap = createSafePalmTexture(
    256,
    256,
    (ctx, w, h) => {
      const bands = 16;
      const bh = h / bands;
      for (let i = 0; i < bands; i++) {
        const y = i * bh;
        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0.0, '#323232');
        grad.addColorStop(0.28, '#e8e8e8');
        grad.addColorStop(0.78, '#b4b4b4');
        grad.addColorStop(1.0, '#282828');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, bh + 0.5);
      }
    },
    false,
  );

  disposables.push(map, bumpMap);
  return { map, bumpMap };
}

function createLeafVeinTexture(disposables: Array<{ dispose: () => void }>): THREE.Texture {
  const tex = createSafePalmTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#dcdcdc';
      ctx.fillRect(0, 0, w, h);
      // Subtle parallel palm-leaflet venation & glossy midrib highlight
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0.0, '#b5b5b5');
      grad.addColorStop(0.46, '#e2e2e2');
      grad.addColorStop(0.50, '#ffffff');
      grad.addColorStop(0.54, '#e2e2e2');
      grad.addColorStop(1.0, '#b5b5b5');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(70, 90, 50, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 8; x < w; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    },
    true,
  );
  disposables.push(tex);
  return tex;
}

function attachGentleBreezeSway(
  material: THREE.MeshStandardMaterial,
  windTimeUniform: { value: number },
): void {
  material.customProgramCacheKey = () => 'vice_palm_breeze_sway_v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPalmWindTime = windTimeUniform;
    shader.vertexShader =
      `uniform float uPalmWindTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float frondSpan = length(position.xz);
         float tipWeight = smoothstep(0.35, 3.6, frondSpan);
         vec4 palmWorldOrigin = vec4(0.0, 0.0, 0.0, 1.0);
         #ifdef USE_INSTANCING
           palmWorldOrigin = instanceMatrix * palmWorldOrigin;
         #endif
         float phase = uPalmWindTime * 1.45 + palmWorldOrigin.x * 0.11 + palmWorldOrigin.z * 0.09 + position.x * 0.65;
         float sway = sin(phase) * 0.11 + sin(phase * 2.1 + 1.3) * 0.035;
         transformed.x += sway * tipWeight;
         transformed.y += cos(phase * 1.15) * 0.045 * tipWeight;
         transformed.z += sin(phase * 0.85 + 0.7) * 0.065 * tipWeight;`,
      );
  };
}

// =========================================================================
// STEP 8 & 9 — INSTANCED PALM FOREST BUILDER
// =========================================================================

export function buildPalmTreeAssets(
  palms: TreeSpec[],
  ctx: PalmTreeAssetsContext,
): PalmTreeAssetsStats {
  const { root, disposables, windTimeUniform } = ctx;

  // Compact shared procedural textures & 4 shared PBR materials
  const barkTex = createRingedBarkTextures(disposables);
  const leafVeinTex = createLeafVeinTexture(disposables);

  const roughBarkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTex.map,
    bumpMap: barkTex.bumpMap,
    bumpScale: 0.08,
    vertexColors: true,
    roughness: 0.90,
    metalness: 0.02,
  });

  const smoothRoyalTrunkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTex.map,
    bumpMap: barkTex.bumpMap,
    bumpScale: 0.028,
    vertexColors: true,
    roughness: 0.74,
    metalness: 0.03,
  });

  const palmFoliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: leafVeinTex,
    vertexColors: true,
    roughness: 0.60,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  if (windTimeUniform) {
    attachGentleBreezeSway(palmFoliageMat, windTimeUniform);
  }

  const coconutMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.54,
    metalness: 0.04,
  });

  const sharedMaterials = [roughBarkMat, smoothRoyalTrunkMat, palmFoliageMat, coconutMat];
  disposables.push(...sharedMaterials);

  // Build shared procedural trunk & crown geometries once per species + shared coconut cluster
  const trunkBuilds: Record<PalmSpecies, PalmTrunkBuildResult> = {
    coconut: createPalmTrunkGeometry('coconut'),
    royal: createPalmTrunkGeometry('royal'),
    sabal: createPalmTrunkGeometry('sabal'),
    compact_tropical: createPalmTrunkGeometry('compact_tropical'),
  };
  const crownBuilds: Record<PalmSpecies, PalmCrownBuildResult> = {
    coconut: createPalmCrownGeometry('coconut'),
    royal: createPalmCrownGeometry('royal'),
    sabal: createPalmCrownGeometry('sabal'),
    compact_tropical: createPalmCrownGeometry('compact_tropical'),
  };
  const coconutCluster = createCoconutClusterGeometry();

  let sharedGeometryCount = 0;
  for (const sp of ALL_PALM_SPECIES) {
    disposables.push(trunkBuilds[sp].geometry, crownBuilds[sp].geometry);
    sharedGeometryCount += 2;
  }
  disposables.push(coconutCluster.geometry);
  sharedGeometryCount += 1;

  // Deterministic species bucketing preserving EVERY TreeSpec (x, z, scale, lean, rotY)
  const speciesBuckets: Record<PalmSpecies, TreeSpec[]> = {
    coconut: [],
    royal: [],
    sabal: [],
    compact_tropical: [],
  };
  const placements: PalmPlacementRecord[] = [];
  const coconutPlacements: TreeSpec[] = [];

  for (const p of palms) {
    const species = assignPalmSpecies(p);
    const hasNuts = hasCoconutCluster(p, species);
    speciesBuckets[species].push(p);
    if (hasNuts) {
      coconutPlacements.push(p);
    }
    placements.push({
      x: p.x,
      z: p.z,
      scale: p.scale,
      lean: p.lean,
      rotY: p.rotY,
      species,
      hasCoconuts: hasNuts,
    });
  }

  const treeDummy = new THREE.Object3D();
  const crownLocalMat = new THREE.Matrix4();
  const finalCrownMat = new THREE.Matrix4();
  const tintColor = new THREE.Color();
  const crownEuler = new THREE.Euler();
  const crownQuat = new THREE.Quaternion();
  const unitScale = new THREE.Vector3(1, 1, 1);

  let instancedBatches = 0;
  let totalCrownInstances = 0;
  let totalFrondCount = 0;

  for (const sp of ALL_PALM_SPECIES) {
    const list = speciesBuckets[sp];
    if (list.length === 0) continue;

    const trunkBuild = trunkBuilds[sp];
    const crownBuild = crownBuilds[sp];
    const trunkMat = sp === 'royal' ? smoothRoyalTrunkMat : roughBarkMat;

    const trunkInst = new THREE.InstancedMesh(trunkBuild.geometry, trunkMat, list.length);
    trunkInst.name = `palm_inst_trunk_${sp}`;
    const crownInst = new THREE.InstancedMesh(crownBuild.geometry, palmFoliageMat, list.length);
    crownInst.name = `palm_inst_crown_${sp}`;

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const h = hashPosition(p.x, p.z, 91);

      // Exact preserved TreeSpec world transform (x, z, lean, rotY, scale)
      treeDummy.position.set(p.x, 0, p.z);
      // Royal & Sabal stay slightly straighter than coastal coconut palms while preserving lean direction
      const speciesLeanFactor = sp === 'royal' ? 0.45 : sp === 'sabal' ? 0.62 : 1.0;
      treeDummy.rotation.set(p.lean * speciesLeanFactor, p.rotY, 0);
      treeDummy.scale.set(p.scale, p.scale, p.scale);
      treeDummy.updateMatrix();
      trunkInst.setMatrixAt(i, treeDummy.matrix);

      // Subtle per-tree bark brightness variation (0.93..1.05)
      const barkShade = 0.93 + hashFloat01(h + 5) * 0.12;
      trunkInst.setColorAt(i, tintColor.setRGB(barkShade, barkShade, barkShade));

      // Lock crown directly onto the exact top anchor of the curved trunk!
      const crownYawOffset = (hashFloat01(h + 19) - 0.5) * 1.4;
      crownEuler.set(trunkBuild.crownTiltX, crownYawOffset, trunkBuild.crownTiltZ, 'YXZ');
      crownQuat.setFromEuler(crownEuler);
      crownLocalMat.compose(trunkBuild.crownOrigin, crownQuat, unitScale);
      finalCrownMat.multiplyMatrices(treeDummy.matrix, crownLocalMat);
      crownInst.setMatrixAt(i, finalCrownMat);

      // Subtle natural per-tree chlorophyll/sunlight tint variation (keeps foliage rich & organic)
      const gTintR = 0.92 + hashFloat01(h + 37) * 0.15;
      const gTintG = 0.94 + hashFloat01(h + 53) * 0.12;
      const gTintB = 0.88 + hashFloat01(h + 71) * 0.14;
      crownInst.setColorAt(i, tintColor.setRGB(gTintR, gTintG, gTintB));
    }

    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (trunkInst.instanceColor) trunkInst.instanceColor.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    trunkInst.castShadow = true;
    trunkInst.receiveShadow = true;
    crownInst.castShadow = true;
    crownInst.receiveShadow = true;
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();

    disposables.push(trunkInst, crownInst);
    root.add(trunkInst, crownInst);
    instancedBatches += 2;
    totalCrownInstances += list.length;
    totalFrondCount += list.length * crownBuild.frondCount;
  }

  // Optional nestled coconut clusters anchored strictly to selected Coconut Palms
  let coconutClusterInstances = 0;
  if (coconutPlacements.length > 0) {
    const cocoBuild = trunkBuilds.coconut;
    const cocoInst = new THREE.InstancedMesh(
      coconutCluster.geometry,
      coconutMat,
      coconutPlacements.length,
    );
    cocoInst.name = 'palm_inst_coconuts';

    for (let i = 0; i < coconutPlacements.length; i++) {
      const p = coconutPlacements[i];
      const h = hashPosition(p.x, p.z, 131);

      treeDummy.position.set(p.x, 0, p.z);
      treeDummy.rotation.set(p.lean, p.rotY, 0);
      treeDummy.scale.set(p.scale, p.scale, p.scale);
      treeDummy.updateMatrix();

      crownEuler.set(cocoBuild.crownTiltX, hashFloat01(h + 7) * Math.PI * 2, cocoBuild.crownTiltZ, 'YXZ');
      crownQuat.setFromEuler(crownEuler);
      crownLocalMat.compose(cocoBuild.crownOrigin, crownQuat, unitScale);
      finalCrownMat.multiplyMatrices(treeDummy.matrix, crownLocalMat);
      cocoInst.setMatrixAt(i, finalCrownMat);
    }

    cocoInst.instanceMatrix.needsUpdate = true;
    cocoInst.castShadow = true;
    cocoInst.receiveShadow = true;
    cocoInst.computeBoundingSphere();
    disposables.push(cocoInst);
    root.add(cocoInst);
    instancedBatches += 1;
    coconutClusterInstances = coconutPlacements.length;
  }

  return {
    totalPalmCount: palms.length,
    speciesDistribution: {
      coconut: speciesBuckets.coconut.length,
      royal: speciesBuckets.royal.length,
      sabal: speciesBuckets.sabal.length,
      compact_tropical: speciesBuckets.compact_tropical.length,
    },
    instancedBatches,
    sharedGeometryCount,
    sharedMaterialCount: sharedMaterials.length,
    totalCrownInstances,
    totalFrondCount,
    coconutClusterInstances,
    placements,
  };
}
