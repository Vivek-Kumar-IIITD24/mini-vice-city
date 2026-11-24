import { ColliderBox, DistrictId, Vec2 } from '../types';

export const DISTRICT_NAMES: Record<DistrictId, string> = {
  [DistrictId.Downtown]: 'Downtown Vice',
  [DistrictId.OceanDrive]: 'Ocean Drive',
  [DistrictId.Residential]: 'Coral Heights',
  [DistrictId.Harbour]: 'Vice Industrial Harbour',
  [DistrictId.Entertainment]: 'Neon Mile',
};

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = wrapAngle(target - current);
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function distSq2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function dist2D(ax: number, az: number, bx: number, bz: number): number {
  return Math.sqrt(distSq2D(ax, az, bx, bz));
}

export function getDistrictAt(x: number, z: number): DistrictId {
  if (x >= 60) {
    return DistrictId.OceanDrive;
  }
  if (x < -34) {
    return z < 0 ? DistrictId.Residential : DistrictId.Harbour;
  }
  return z < 16 ? DistrictId.Downtown : DistrictId.Entertainment;
}

export function formatTimeHours(hours: number): string {
  const norm = ((hours % 24) + 24) % 24;
  const h = Math.floor(norm);
  const m = Math.floor((norm - h) * 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export function getTimePhaseName(hours: number): string {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 5.5 && h < 8) return 'Sunrise';
  if (h >= 8 && h < 12) return 'Morning';
  if (h >= 12 && h < 16.5) return 'Afternoon';
  if (h >= 16.5 && h < 18.8) return 'Golden Hour';
  if (h >= 18.8 && h < 20.5) return 'Sunset';
  return 'Night';
}

export interface CircleCollisionResult {
  x: number;
  z: number;
  hit: boolean;
  normalX: number;
  normalZ: number;
  hitKind?: ColliderBox['kind'];
}

/**
 * Resolves a 2D circle against an array of axis-aligned bounding boxes.
 * Mutates nothing external; pure and fast for unit testing and physics.
 */
export function resolveCircleVsBoxes(
  cx: number,
  cz: number,
  radius: number,
  boxes: readonly ColliderBox[],
): CircleCollisionResult {
  let x = cx;
  let z = cz;
  let hit = false;
  let normalX = 0;
  let normalZ = 0;
  let hitKind: ColliderBox['kind'] | undefined;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    // Quick broadphase reject
    if (
      x + radius < b.minX ||
      x - radius > b.maxX ||
      z + radius < b.minZ ||
      z - radius > b.maxZ
    ) {
      continue;
    }

    const closestX = clamp(x, b.minX, b.maxX);
    const closestZ = clamp(z, b.minZ, b.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    const dSq = dx * dx + dz * dz;

    if (dSq < radius * radius) {
      hit = true;
      hitKind = b.kind;
      if (dSq > 1e-6) {
        const d = Math.sqrt(dSq);
        const nx = dx / d;
        const nz = dz / d;
        const push = radius - d;
        x += nx * push;
        z += nz * push;
        normalX = nx;
        normalZ = nz;
      } else {
        // Center is inside box; push out along shortest axis
        const penLeft = Math.abs(x - b.minX);
        const penRight = Math.abs(b.maxX - x);
        const penTop = Math.abs(z - b.minZ);
        const penBottom = Math.abs(b.maxZ - z);
        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        if (minPen === penLeft) {
          x = b.minX - radius;
          normalX = -1;
          normalZ = 0;
        } else if (minPen === penRight) {
          x = b.maxX + radius;
          normalX = 1;
          normalZ = 0;
        } else if (minPen === penTop) {
          z = b.minZ - radius;
          normalX = 0;
          normalZ = -1;
        } else {
          z = b.maxZ + radius;
          normalX = 0;
          normalZ = 1;
        }
      }
    }
  }

  return { x, z, hit, normalX, normalZ, hitKind };
}

/**
 * Keeps entities inside the island metropolis playable perimeter
 * (West bay seawall at -138, North seawall at -136, South marina seawall at +136, East shoreline at +140).
 */
export function clampToPlayableIsland(
  x: number,
  z: number,
  radius: number,
): { x: number; z: number; clamped: boolean } {
  const minX = -134 + radius;
  const maxX = 138 - radius;
  const minZ = -132 + radius;
  const maxZ = 132 - radius;
  const nx = clamp(x, minX, maxX);
  const nz = clamp(z, minZ, maxZ);
  return { x: nx, z: nz, clamped: nx !== x || nz !== z };
}

/**
 * Deterministic pseudo-random generator for reproducible city architecture.
 */
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pointInCircle(px: number, pz: number, target: Vec2, radius: number): boolean {
  return distSq2D(px, pz, target.x, target.z) <= radius * radius;
}
