import * as THREE from 'three';
import { BuildingSpec } from './cityData';
import { DistrictId } from '../types';

export type NeonMileVenueArchetype =
  | 'velvet_deco_nightclub'
  | 'solaris_glass_nightclub'
  | 'amber_luxury_lounge'
  | 'vice_deco_theater'
  | 'south_grand_club';

export type NeonMileFrontageAxis = '+x' | '-x' | '+z' | '-z';

export type NeonMileNeonBand = 'magenta' | 'cyan' | 'amber' | 'violet' | 'warm_gold';

export interface NeonMileVenueProfile {
  id: string;
  archetype: NeonMileVenueArchetype;
  signTitle: string;
  signSubtitle: string;
  frontage: NeonMileFrontageAxis;
  secondaryFrontage: NeonMileFrontageAxis | null;
  neonBand: NeonMileNeonBand;
  secondaryNeonBand: NeonMileNeonBand;
  baseTint: number;
  secondaryWallTint: number;
  trimTint: number;
  metalTint: number;
  accentTint: number;
  podiumHeight: number;
  canopyProjection: number;
  hasRooftopTerrace: boolean;
  hasRooftopPergola: boolean;
  hasMarquee: boolean;
  hasVerticalSignTower: boolean;
  hasDecorativeLattice: boolean;
}

export interface NeonMileVenueSummary {
  id: string;
  archetype: NeonMileVenueArchetype;
  signTitle: string;
  frontage: NeonMileFrontageAxis;
  secondaryFrontage: NeonMileFrontageAxis | null;
  neonBand: NeonMileNeonBand;
  canopyProjection: number;
  hasMarquee: boolean;
  hasVerticalSignTower: boolean;
  hasRooftopTerrace: boolean;
  signMeshCount: number;
  posterCount: number;
  pinnacleY: number;
}

export interface NeonMileArchitectureStats {
  totalCount: number;
  instancedBatches: number;
  totalFacadeInstances: number;
  sharedMaterialCount: number;
  signageMaterialCount: number;
  archetypesUsed: NeonMileVenueArchetype[];
  venues: NeonMileVenueSummary[];
}

export interface NeonMileArchitectureContext {
  root: THREE.Group;
  emissiveBuildingMaterials: THREE.MeshStandardMaterial[];
  neonTrimMaterials: THREE.MeshStandardMaterial[];
  environmentMeshesForCamera: THREE.Object3D[];
  disposables: Array<{ dispose: () => void }>;
}

interface InstanceEntry {
  matrix: THREE.Matrix4;
  colorHex: number;
}

/**
 * Identifies strictly Neon Mile entertainment venues (Entertainment district + club style).
 * Preserves Downtown skyscrapers/shops, Ocean Drive hotels/resorts, Coral Heights residential buildings,
 * and Industrial Harbour warehouses completely untouched.
 */
export function isNeonMileBuildingSpec(spec: BuildingSpec): boolean {
  return spec.district === DistrictId.Entertainment && spec.style === 'club';
}

/**
 * Pure deterministic mapping from a Neon Mile BuildingSpec to its distinctive architectural
 * identity, road-facing frontage orientation, lighting palette, signage, and structural features.
 */
export function resolveNeonMileProfile(spec: BuildingSpec): NeonMileVenueProfile {
  switch (spec.id) {
    case 'ent_club_velvet':
      return {
        id: spec.id,
        archetype: 'velvet_deco_nightclub',
        signTitle: 'VELVET',
        signSubtitle: 'VIP NIGHTCLUB  •  LOUNGE',
        frontage: '-z', // faces North avenue (z=32), 4.5m clearance to sidewalk
        secondaryFrontage: '-x', // faces West avenue (x=-32), 3.5m clearance
        neonBand: 'magenta',
        secondaryNeonBand: 'warm_gold',
        baseTint: 0x35334f,
        secondaryWallTint: 0x4b2f56,
        trimTint: 0x26243b,
        metalTint: 0xd6c4d2,
        accentTint: spec.accentColor,
        podiumHeight: 4.9,
        canopyProjection: 2.2,
        hasRooftopTerrace: true,
        hasRooftopPergola: false,
        hasMarquee: true,
        hasVerticalSignTower: false,
        hasDecorativeLattice: false,
      };
    case 'ent_club_solaris':
      return {
        id: spec.id,
        archetype: 'solaris_glass_nightclub',
        signTitle: 'SOLARIS',
        signSubtitle: 'ELECTRONIC  •  SKY CLUB',
        frontage: '-z', // faces North avenue (z=32), 4.5m clearance
        secondaryFrontage: '+x', // faces East avenue (x=32), 4.0m clearance (corner glass curtain wall!)
        neonBand: 'cyan',
        secondaryNeonBand: 'cyan',
        baseTint: 0x2a3b4f,
        secondaryWallTint: 0x344860,
        trimTint: 0xe2ecf5,
        metalTint: 0x35485d,
        accentTint: spec.accentColor,
        podiumHeight: 5.8,
        canopyProjection: 2.15,
        hasRooftopTerrace: true,
        hasRooftopPergola: true,
        hasMarquee: false,
        hasVerticalSignTower: true,
        hasDecorativeLattice: false,
      };
    case 'ent_lounge_amber':
      return {
        id: spec.id,
        archetype: 'amber_luxury_lounge',
        signTitle: 'AMBER LOUNGE',
        signSubtitle: 'COCKTAILS  •  JAZZ  •  TERRACE',
        frontage: '+z', // faces South Neon Mile boulevard (z=96), 4.5m clearance
        secondaryFrontage: '-x', // faces West avenue (x=-32), 4.0m clearance
        neonBand: 'amber',
        secondaryNeonBand: 'warm_gold',
        baseTint: 0x473a48,
        secondaryWallTint: 0x7c6a5b,
        trimTint: 0xdfd0ba,
        metalTint: 0xc99450,
        accentTint: spec.accentColor,
        podiumHeight: 4.6,
        canopyProjection: 2.05,
        hasRooftopTerrace: true,
        hasRooftopPergola: true,
        hasMarquee: false,
        hasVerticalSignTower: false,
        hasDecorativeLattice: false,
      };
    case 'ent_theater_vice':
      return {
        id: spec.id,
        archetype: 'vice_deco_theater',
        signTitle: 'VICE THEATER',
        signSubtitle: 'MIDNIGHT PREMIERE  •  LIVE SHOWS',
        frontage: '+z', // faces South Neon Mile boulevard (z=96), 4.5m clearance
        secondaryFrontage: '+x', // faces East avenue (x=32), 3.5m clearance
        neonBand: 'violet',
        secondaryNeonBand: 'magenta',
        baseTint: 0x3b4360,
        secondaryWallTint: 0x52486e,
        trimTint: 0xe6dff0,
        metalTint: 0xd8dfec,
        accentTint: spec.accentColor,
        podiumHeight: 5.4,
        canopyProjection: 2.45,
        hasRooftopTerrace: false,
        hasRooftopPergola: false,
        hasMarquee: true,
        hasVerticalSignTower: true,
        hasDecorativeLattice: false,
      };
    case 'south_club_1':
    default:
      return {
        id: spec.id,
        archetype: 'south_grand_club',
        signTitle: 'SOUTH CLUB',
        signSubtitle: 'SUPPER CLUB  •  ROOFTOP EVENTS',
        frontage: '-z', // faces North toward z=96 boulevard (2.5m clearance to sidewalk; keep <= 1.85m!)
        secondaryFrontage: null,
        neonBand: 'amber',
        secondaryNeonBand: 'warm_gold',
        baseTint: 0x2f364c,
        secondaryWallTint: 0x3d364d,
        trimTint: 0x1e2433,
        metalTint: 0xdfb468,
        accentTint: spec.accentColor,
        podiumHeight: 5.2,
        canopyProjection: 1.75,
        hasRooftopTerrace: true,
        hasRooftopPergola: true,
        hasMarquee: true,
        hasVerticalSignTower: false,
        hasDecorativeLattice: true,
      };
  }
}

// =========================================================================
// CUSTOM PROCEDURAL ARCHITECTURAL GEOMETRIES (Verified Finite & Outward)
// =========================================================================

/**
 * Semicircular Streamline Moderne projecting bay prism normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors flush against a wall at Z = 0 and curves smoothly outward to Z = 1 (used for Velvet's
 * curved central Art Deco glazed bay and sculpted curved nightclub canopy).
 */
export function createCurvedDecoBayGeometry(segments = 14): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  // Smooth semicircular arch bulging into +Y in 2D shape space (becomes +Z after rotateX(+PI/2))
  for (let i = 1; i <= segments; i++) {
    const theta = (i / segments) * Math.PI;
    const x = Math.cos(theta) * 0.5;
    const y = Math.sin(theta) * 1.0;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    curveSegments: segments,
    bevelEnabled: false,
    steps: 1,
  });
  // Rigid rotation only (no negative scale!): extrude +Z -> -Y, shape +Y -> +Z; translate Y by +1 -> Y in [0..1]
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 1, 0);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Dimensional projecting trapezoid Art Deco theatre marquee hull normalized in X [-0.5..0.5], Y [0..1], Z [0..1].
 * Anchors flush against the facade at Z = 0, widens slightly then angles cleanly to a bold front face at Z = 1.
 */
export function createTheaterMarqueeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 0.36);
  shape.lineTo(0.32, 1.0);
  shape.lineTo(-0.32, 1.0);
  shape.lineTo(-0.5, 0.36);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  // Rigid rotation: extrude +Z -> -Y, shape +Y -> +Z; shift up +1 so Y spans [0..1], Z spans [0..1]
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 1, 0);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Stepped Art Deco ziggurat theatre crown / rooftop pediment normalized in X [-0.5..0.5], Y [0..1], Z [-0.5..0.5].
 * Gives Vice Theater and Velvet an unmistakable Miami Art Deco skyline silhouette.
 */
export function createSteppedDecoCrownGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, 0.28);
  shape.lineTo(0.36, 0.28);
  shape.lineTo(0.36, 0.58);
  shape.lineTo(0.2, 0.58);
  shape.lineTo(0.2, 0.84);
  shape.lineTo(0.08, 0.84);
  shape.lineTo(0.08, 1.0);
  shape.lineTo(-0.08, 1.0);
  shape.lineTo(-0.08, 0.84);
  shape.lineTo(-0.2, 0.84);
  shape.lineTo(-0.2, 0.58);
  shape.lineTo(-0.36, 0.58);
  shape.lineTo(-0.36, 0.28);
  shape.lineTo(-0.5, 0.28);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.5);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Sculpted rounded Art Deco corner pylon geometry (quarter-cylinder vertical column fused into a squared back).
 * Normalized in X [0..1], Y [0..1], Z [0..1], with smooth curved outer corner in +X/+Z.
 * Built with explicit outward-wound geometry (zero negative scaling, strictly unit normals).
 */
export function createArtDecoCornerPylonGeometry(segments = 8): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...uva, ...uvb, ...uvc);
  };

  // Arc points in XZ from angle 0 (+X: (1, 0)) to PI/2 (+Z: (0, 1))
  const arc: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI / 2);
    arc.push([Math.cos(t), Math.sin(t)]);
  }

  for (let i = 0; i < segments; i++) {
    const [x0, z0] = arc[i];
    const [x1, z1] = arc[i + 1];
    const u0 = i / segments;
    const u1 = (i + 1) / segments;

    // Curved outer wall (outward normal points along (+x, 0, +z))
    // For (+x, 0, +z): edge1 = (x0,1,z0)-(x0,0,z0) = (0,1,0), edge2 = (x1,0,z1)-(x0,0,z0) = (-dx,0,+dz)
    // (0,1,0) x (-dx,0,+dz) = (+dz, 0, +dx) -> outward!
    pushTri([x0, 0, z0], [x0, 1, z0], [x1, 0, z1], [u0, 0], [u0, 1], [u1, 0]);
    pushTri([x0, 1, z0], [x1, 1, z1], [x1, 0, z1], [u0, 1], [u1, 1], [u1, 0]);

    // Top cap (+Y): normal (0, 1, 0)
    pushTri([0, 1, 0], [x1, 1, z1], [x0, 1, z0], [0, 0], [x1, z1], [x0, z0]);

    // Bottom cap (-Y): normal (0, -1, 0)
    pushTri([0, 0, 0], [x0, 0, z0], [x1, 0, z1], [0, 0], [x0, z0], [x1, z1]);
  }

  // Flat back wall on X = 0 (normal -X: (-1, 0, 0))
  pushTri([0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 0], [1, 0], [1, 1]);
  pushTri([0, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0], [1, 1], [0, 1]);

  // Flat back wall on Z = 0 (normal -Z: (0, 0, -1))
  pushTri([0, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0], [0, 1], [1, 1]);
  pushTri([0, 0, 0], [1, 1, 0], [1, 0, 0], [0, 0], [1, 1], [1, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Curved horizontal neon ribbon band matching createCurvedDecoBayGeometry's semicircular perimeter.
 * Normalized in X [-0.5..0.5], Y [-0.5..0.5], Z [0..1] with radial thickness 0.08.
 */
export function createCurvedNeonRibbonGeometry(segments = 14): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  const rOutX = 0.5;
  const rOutY = 1.0;
  const rInX = 0.44;
  const rInY = 0.88;

  outer.moveTo(rOutX, 0);
  for (let i = 1; i <= segments; i++) {
    const theta = (i / segments) * Math.PI;
    outer.lineTo(Math.cos(theta) * rOutX, Math.sin(theta) * rOutY);
  }
  for (let i = segments; i >= 0; i--) {
    const theta = (i / segments) * Math.PI;
    outer.lineTo(Math.cos(theta) * rInX, Math.sin(theta) * rInY);
  }
  outer.closePath();

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 1,
    curveSegments: segments,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.5, 0);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// =========================================================================
// PROCEDURAL CANVAS TEXTURES FOR SIGNAGE, INTERIORS & MOVIE POSTERS
// (Browser CanvasTexture with Safe Node.js DataTexture Fallback)
// =========================================================================

function createSafeNeonCanvasTexture(
  width: number,
  height: number,
  isColor: boolean,
  fallbackRgb: [number, number, number],
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat = false,
): THREE.Texture {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      draw(ctx, width, height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      return tex;
    }
  }
  const data = new Uint8Array([fallbackRgb[0], fallbackRgb[1], fallbackRgb[2], 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

interface NeonMileTextures {
  flutedDarkStoneMap: THREE.Texture;
  flutedDarkStoneBump: THREE.Texture;
  velvetSignMap: THREE.Texture;
  solarisBladeSignMap: THREE.Texture;
  solarisFasciaSignMap: THREE.Texture;
  amberSignMap: THREE.Texture;
  viceMarqueeFrontMap: THREE.Texture;
  viceMarqueeSideMap: THREE.Texture;
  viceVerticalBladeMap: THREE.Texture;
  southClubSignMap: THREE.Texture;
  velvetInteriorGlassMap: THREE.Texture;
  solarisInteriorGlassMap: THREE.Texture;
  amberInteriorGlassMap: THREE.Texture;
  viceGlassBlockMap: THREE.Texture;
  southLatticeBacklitMap: THREE.Texture;
  posterMaps: THREE.Texture[];
}

function createNeonMileTextures(disposables: Array<{ dispose: () => void }>): NeonMileTextures {
  // 1. Subtle architectural dark stone / fluted plaster cladding + bump
  const flutedDarkStoneMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [48, 52, 72],
    (ctx, w, h) => {
      ctx.fillStyle = '#d4d8e2';
      ctx.fillRect(0, 0, w, h);
      const cols = 16;
      const cw = w / cols;
      for (let c = 0; c < cols; c++) {
        const g = ctx.createLinearGradient(c * cw, 0, (c + 1) * cw, 0);
        g.addColorStop(0, '#a8b0c0');
        g.addColorStop(0.5, '#e6ebf5');
        g.addColorStop(1, '#9ca4b6');
        ctx.fillStyle = g;
        ctx.fillRect(c * cw, 0, cw, h);
      }
      // Subtle horizontal masonry coursing joints
      ctx.fillStyle = 'rgba(20, 24, 36, 0.24)';
      for (let y = 0; y < h; y += 64) {
        ctx.fillRect(0, y, w, 2);
      }
    },
    true,
  );

  const flutedDarkStoneBump = createSafeNeonCanvasTexture(
    128,
    128,
    false,
    [128, 128, 128],
    (ctx, w, h) => {
      const cols = 16;
      const cw = w / cols;
      for (let c = 0; c < cols; c++) {
        const g = ctx.createLinearGradient(c * cw, 0, (c + 1) * cw, 0);
        g.addColorStop(0, '#444444');
        g.addColorStop(0.5, '#e8e8e8');
        g.addColorStop(1, '#444444');
        ctx.fillStyle = g;
        ctx.fillRect(c * cw, 0, cw, h);
      }
      ctx.fillStyle = '#262626';
      for (let y = 0; y < h; y += 32) {
        ctx.fillRect(0, y, w, 2);
      }
    },
    true,
  );

  // 2. VELVET Nightclub Signboard (deep plum-black background, luminous rose-magenta neon script border & crisp lettering)
  const velvetSignMap = createSafeNeonCanvasTexture(
    512,
    160,
    true,
    [244, 63, 142],
    (ctx, w, h) => {
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(0, 0, w, h);

      // Subtle rose-magenta inner radial sheen
      const rad = ctx.createRadialGradient(w * 0.5, h * 0.5, 16, w * 0.5, h * 0.5, w * 0.46);
      rad.addColorStop(0, 'rgba(244, 63, 142, 0.34)');
      rad.addColorStop(1, 'rgba(20, 12, 28, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, w, h);

      // Double Art Deco rose-gold / magenta neon border
      ctx.strokeStyle = '#ff66b2';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeStyle = '#f8c4d8';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      // Decorative Art Deco side speed-lines
      ctx.fillStyle = '#f472b6';
      for (const yOff of [-16, 0, 16]) {
        ctx.fillRect(36, h * 0.44 + yOff, 46, 3);
        ctx.fillRect(w - 82, h * 0.44 + yOff, 46, 3);
      }

      // Main title: VELVET
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f43f8e';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffe4f2';
      ctx.font = 'bold 66px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('VELVET', w / 2, 68);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.fillStyle = '#f9a8d4';
      ctx.font = '600 18px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('VIP NIGHTCLUB  •  ROOFTOP LOUNGE', w / 2, 122);
    },
  );

  // 3. SOLARIS Vertical Architectural Sign Blade (reads top-to-bottom: S O L A R I S)
  const solarisBladeSignMap = createSafeNeonCanvasTexture(
    160,
    512,
    true,
    [34, 211, 238],
    (ctx, w, h) => {
      ctx.fillStyle = '#0c1824';
      ctx.fillRect(0, 0, w, h);

      // Sleek cyan architectural vertical edge rails
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(10, 12, 6, h - 24);
      ctx.fillRect(w - 16, 12, 6, h - 24);
      ctx.fillRect(10, 12, w - 20, 6);
      ctx.fillRect(10, h - 18, w - 20, 6);

      const letters = ['S', 'O', 'L', 'A', 'R', 'I', 'S'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#e0fbff';
      ctx.font = 'bold 54px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      const step = (h - 76) / letters.length;
      letters.forEach((ch, idx) => {
        ctx.fillText(ch, w * 0.5, 44 + step * (idx + 0.5));
      });
      ctx.shadowBlur = 0;
    },
  );

  // 4. SOLARIS Horizontal Entrance Fascia Sign
  const solarisFasciaSignMap = createSafeNeonCanvasTexture(
    512,
    128,
    true,
    [34, 211, 238],
    (ctx, w, h) => {
      ctx.fillStyle = '#0c1926';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(12, 10, w - 24, 4);
      ctx.fillRect(12, h - 14, w - 24, 4);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#e6fcff';
      ctx.font = 'bold 54px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('S O L A R I S', w * 0.5, 52);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#67e8f9';
      ctx.font = '600 17px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('MODERN GLASS CLUB  •  SKY DECK', w * 0.5, 96);
    },
  );

  // 5. AMBER LOUNGE Warm Bronze & Stone Signboard
  const amberSignMap = createSafeNeonCanvasTexture(
    512,
    128,
    true,
    [245, 158, 11],
    (ctx, w, h) => {
      ctx.fillStyle = '#1b141c';
      ctx.fillRect(0, 0, w, h);

      // Warm brushed bronze border
      ctx.strokeStyle = '#d99a3a';
      ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeStyle = '#f7d58b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff0cb';
      ctx.font = 'bold 42px Georgia, "Times New Roman", serif';
      ctx.fillText('AMBER LOUNGE', w * 0.5, 52);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f3be62';
      ctx.font = '600 16px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('COCKTAILS  •  LATE JAZZ  •  TERRACE', w * 0.5, 94);
    },
  );

  // 6. VICE THEATER Projecting Marquee Front Letterboard (high-contrast backlit marquee rows that stay crisp at night!)
  const viceMarqueeFrontMap = createSafeNeonCanvasTexture(
    512,
    192,
    true,
    [224, 196, 158],
    (ctx, w, h) => {
      // Deep Art Deco violet-plum outer trim
      ctx.fillStyle = '#180d29';
      ctx.fillRect(0, 0, w, h);

      // Warm vintage ivory backlit cinema panel (controlled luminance so text never washes out under bloom)
      ctx.fillStyle = '#e8d4b2';
      ctx.fillRect(14, 14, w - 28, h - 28);

      // Classic cinema horizontal letter tracks
      ctx.fillStyle = 'rgba(46, 16, 101, 0.36)';
      for (const ry of [66, 118, 156]) {
        ctx.fillRect(18, ry, w - 36, 3);
      }

      // Outer violet & rose-gold neon frame
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 7;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      // Ultra-crisp dark bold cinema marquee letters
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#120324';
      ctx.font = '900 50px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('VICE THEATER', w * 0.5, 42);

      ctx.fillStyle = '#700834';
      ctx.font = '900 30px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('MIDNIGHT PREMIERE', w * 0.5, 92);

      ctx.fillStyle = '#180533';
      ctx.font = '900 24px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('NEON HEAT  •  LIVE SHOWS', w * 0.5, 138);

      ctx.fillStyle = '#3b0764';
      ctx.font = '800 16px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('DOORS 8 PM  •  MAIN STAGE', w * 0.5, 169);
    },
  );

  // 7. VICE THEATER Angled Marquee Side Wing Letterboard
  const viceMarqueeSideMap = createSafeNeonCanvasTexture(
    320,
    192,
    true,
    [224, 196, 158],
    (ctx, w, h) => {
      ctx.fillStyle = '#180d29';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8d4b2';
      ctx.fillRect(12, 14, w - 24, h - 28);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 7;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = 'rgba(46, 16, 101, 0.36)';
      ctx.fillRect(16, 72, w - 32, 3);
      ctx.fillRect(16, 128, w - 32, 3);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#120324';
      ctx.font = '900 38px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('VICE', w * 0.5, 44);
      ctx.fillStyle = '#700834';
      ctx.font = '900 32px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('THEATER', w * 0.5, 100);
      ctx.fillStyle = '#180533';
      ctx.font = '900 22px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('NOW SHOWING', w * 0.5, 153);
    },
  );

  // 8. VICE THEATER Tall Vertical Architectural Sign Blade (reads top-to-bottom: V I C E / T H E A T E R)
  const viceVerticalBladeMap = createSafeNeonCanvasTexture(
    180,
    640,
    true,
    [168, 85, 247],
    (ctx, w, h) => {
      ctx.fillStyle = '#170f29';
      ctx.fillRect(0, 0, w, h);

      // Art Deco violet + pink neon double frame
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      // Top marquee star burst motif
      ctx.fillStyle = '#f5d0fe';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 28);
      ctx.lineTo(w * 0.5 + 14, 46);
      ctx.lineTo(w * 0.5, 64);
      ctx.lineTo(w * 0.5 - 14, 46);
      ctx.closePath();
      ctx.fill();

      // V I C E in bold glowing violet-white
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#faf5ff';
      ctx.font = 'bold 50px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      const topWord = ['V', 'I', 'C', 'E'];
      topWord.forEach((ch, idx) => {
        ctx.fillText(ch, w * 0.5, 96 + idx * 50);
      });

      // Divider rule
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(36, 286, w - 72, 4);

      // T H E A T E R in crisp warm rose-gold
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 34px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      const subWord = ['T', 'H', 'E', 'A', 'T', 'E', 'R'];
      subWord.forEach((ch, idx) => {
        ctx.fillText(ch, w * 0.5, 326 + idx * 42);
      });
      ctx.shadowBlur = 0;
    },
  );

  // 9. SOUTH CLUB Grand Fascia Signage (matte obsidian background, brushed champagne-gold typography)
  const southClubSignMap = createSafeNeonCanvasTexture(
    640,
    144,
    true,
    [245, 158, 11],
    (ctx, w, h) => {
      ctx.fillStyle = '#11141e';
      ctx.fillRect(0, 0, w, h);

      // Champagne gold horizontal accent bars
      ctx.fillStyle = '#eab308';
      ctx.fillRect(24, 14, w - 48, 3);
      ctx.fillRect(24, h - 17, w - 48, 3);

      // Flanking geometric diamond accents
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      for (const cx of [60, w - 60]) {
        ctx.beginPath();
        ctx.moveTo(cx, h * 0.5 - 22);
        ctx.lineTo(cx + 22, h * 0.5);
        ctx.lineTo(cx, h * 0.5 + 22);
        ctx.lineTo(cx - 22, h * 0.5);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 56px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('SOUTH CLUB', w * 0.5, 58);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 18px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText('SUPPER CLUB  •  VIP TABLES  •  ROOFTOP DECK', w * 0.5, 108);
    },
  );

  // 10. Procedural Venue Interior Glass Glow Maps (gives each club authentic depth & night glow via emissiveMap!)
  const velvetInteriorGlassMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [180, 52, 128],
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#1e1028');
      g.addColorStop(0.35, '#591c48');
      g.addColorStop(0.75, '#9d2466');
      g.addColorStop(1.0, '#3a1230');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Art Deco geometric chevron grid + warm pendant chandelier halos
      ctx.strokeStyle = 'rgba(255, 190, 224, 0.35)';
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (const lx of [64, 192]) {
        const rg = ctx.createRadialGradient(lx, 96, 6, lx, 96, 68);
        rg.addColorStop(0, 'rgba(255, 220, 240, 0.85)');
        rg.addColorStop(0.5, 'rgba(244, 63, 142, 0.45)');
        rg.addColorStop(1, 'rgba(244, 63, 142, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(lx - 68, 28, 136, 136);
      }
    },
    true,
  );

  // Solaris double-height modern club interior (diagonal LED stair lines + electric cyan architectural wash, inspired by reference Image 2)
  const solarisInteriorGlassMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [34, 196, 232],
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#0d1d2e');
      g.addColorStop(0.28, '#164568');
      g.addColorStop(0.68, '#1b7da4');
      g.addColorStop(1.0, '#0f2d46');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Warm upper mezzanine glow vs cool cyan lower atrium (exact contrast from "THE GRAND" reference!)
      const topWarm = ctx.createLinearGradient(0, 0, 0, h * 0.32);
      topWarm.addColorStop(0, 'rgba(245, 184, 86, 0.65)');
      topWarm.addColorStop(1, 'rgba(245, 184, 86, 0)');
      ctx.fillStyle = topWarm;
      ctx.fillRect(0, 0, w, h * 0.35);

      // Crisp diagonal architectural LED staircase strips
      ctx.strokeStyle = '#bdf6ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(16, h * 0.92);
      ctx.lineTo(w * 0.72, h * 0.42);
      ctx.lineTo(w - 16, h * 0.42);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(16, h * 0.72);
      ctx.lineTo(w * 0.56, h * 0.28);
      ctx.lineTo(w - 16, h * 0.28);
      ctx.stroke();

      // Horizontal floor deck line
      ctx.fillStyle = 'rgba(12, 22, 34, 0.72)';
      ctx.fillRect(0, h * 0.46, w, 12);
    },
    false,
  );

  // Amber Lounge intimate warm golden-amber interior bar glow
  const amberInteriorGlassMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [214, 146, 62],
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#2a1d14');
      g.addColorStop(0.35, '#7c4e20');
      g.addColorStop(0.74, '#c98836');
      g.addColorStop(1.0, '#4e2e14');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Warm intimate pendant lamps & backlit bar shelves
      for (const lx of [56, 128, 200]) {
        const rg = ctx.createRadialGradient(lx, 62, 4, lx, 62, 52);
        rg.addColorStop(0, 'rgba(255, 244, 208, 0.92)');
        rg.addColorStop(0.45, 'rgba(245, 178, 72, 0.48)');
        rg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(lx - 52, 10, 104, 104);
      }
      ctx.fillStyle = 'rgba(34, 20, 12, 0.55)';
      ctx.fillRect(0, h * 0.76, w, h * 0.24);
    },
    false,
  );

  // Vice Theater iconic recessed Art Deco glass-block feature grid (from Cameo reference Image 3!)
  const viceGlassBlockMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [164, 118, 220],
    (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#4c1d95');
      bg.addColorStop(0.5, '#7e22ce');
      bg.addColorStop(1, '#c084fc');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 8x8 luminous glass-block grid with dark mortar mullions
      const n = 8;
      const cell = w / n;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const x = c * cell;
          const y = r * cell;
          const grad = ctx.createRadialGradient(
            x + cell * 0.5,
            y + cell * 0.5,
            2,
            x + cell * 0.5,
            y + cell * 0.5,
            cell * 0.62,
          );
          const warmCenter = (r + c) % 3 === 0 ? '#fde68a' : '#f5d0fe';
          grad.addColorStop(0, warmCenter);
          grad.addColorStop(0.65, '#a855f7');
          grad.addColorStop(1, '#2e1065');
          ctx.fillStyle = grad;
          ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        }
      }
    },
    false,
  );

  // South Club backlit warm-amber & champagne-rose wall behind the 3D gold geometric lattice screen (inspired by Image 4!)
  const southLatticeBacklitMap = createSafeNeonCanvasTexture(
    256,
    256,
    true,
    [235, 162, 68],
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#2a1826');
      g.addColorStop(0.32, '#8a4822');
      g.addColorStop(0.72, '#e0912e');
      g.addColorStop(1.0, '#f5c26b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural uplight cones from floor edge
      for (let i = 0; i < 4; i++) {
        const cx = (i + 0.5) * (w / 4);
        const rg = ctx.createRadialGradient(cx, h - 16, 4, cx, h - 16, 92);
        rg.addColorStop(0, 'rgba(255, 245, 210, 0.92)');
        rg.addColorStop(0.55, 'rgba(245, 168, 56, 0.45)');
        rg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(cx - 92, h - 108, 184, 108);
      }
    },
    false,
  );

  // 11. Four Stylized Miami Art Deco Show/Film Posters for Vice Theater Lobby Display Cases
  const posterSpecs = [
    {
      title: 'NEON HEAT',
      sub: 'MIAMI NOIR',
      bgTop: '#1e1b4b',
      bgBot: '#be185d',
      accent: '#fde047',
      motif: 'sun',
    },
    {
      title: 'MIDNIGHT',
      sub: 'DRIVE 1986',
      bgTop: '#0f172a',
      bgBot: '#0284c7',
      accent: '#f472b6',
      motif: 'grid',
    },
    {
      title: 'PALM NOIR',
      sub: 'LIVE JAZZ',
      bgTop: '#2e1065',
      bgBot: '#7c3aed',
      accent: '#fbbf24',
      motif: 'deco',
    },
    {
      title: 'STARLIGHT',
      sub: 'GALA SHOW',
      bgTop: '#1f1024',
      bgBot: '#9333ea',
      accent: '#38bdf8',
      motif: 'rays',
    },
  ] as const;

  const posterMaps = posterSpecs.map((ps) =>
    createSafeNeonCanvasTexture(128, 192, true, [192, 132, 252], (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, ps.bgTop);
      g.addColorStop(1, ps.bgBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Art Deco graphic motif in center
      ctx.fillStyle = ps.accent;
      ctx.strokeStyle = ps.accent;
      if (ps.motif === 'sun') {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.48, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ps.bgBot;
        for (let y = h * 0.48; y < h * 0.66; y += 7) {
          ctx.fillRect(w * 0.5 - 34, y, 68, 3);
        }
      } else if (ps.motif === 'grid') {
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.36);
          ctx.lineTo(i * (w / 5), h * 0.72);
          ctx.stroke();
        }
        for (let y = h * 0.42; y <= h * 0.72; y += 10) {
          ctx.fillRect(14, y, w - 28, 2);
        }
      } else if (ps.motif === 'deco') {
        ctx.lineWidth = 3;
        for (const r of [16, 28, 40]) {
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.48 - r);
          ctx.lineTo(w * 0.5 + r * 0.7, h * 0.48);
          ctx.lineTo(w * 0.5, h * 0.48 + r);
          ctx.lineTo(w * 0.5 - r * 0.7, h * 0.48);
          ctx.closePath();
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = 3;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.48);
          ctx.lineTo(w * 0.5 + Math.cos(ang) * 38, h * 0.48 + Math.sin(ang) * 38);
          ctx.stroke();
        }
      }

      // Outer border
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      // Poster title & subtitle
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText(ps.title, w * 0.5, 28);
      ctx.fillStyle = ps.accent;
      ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
      ctx.fillText(ps.sub, w * 0.5, h - 22);
    }),
  );

  disposables.push(
    flutedDarkStoneMap,
    flutedDarkStoneBump,
    velvetSignMap,
    solarisBladeSignMap,
    solarisFasciaSignMap,
    amberSignMap,
    viceMarqueeFrontMap,
    viceMarqueeSideMap,
    viceVerticalBladeMap,
    southClubSignMap,
    velvetInteriorGlassMap,
    solarisInteriorGlassMap,
    amberInteriorGlassMap,
    viceGlassBlockMap,
    southLatticeBacklitMap,
    ...posterMaps,
  );

  return {
    flutedDarkStoneMap,
    flutedDarkStoneBump,
    velvetSignMap,
    solarisBladeSignMap,
    solarisFasciaSignMap,
    amberSignMap,
    viceMarqueeFrontMap,
    viceMarqueeSideMap,
    viceVerticalBladeMap,
    southClubSignMap,
    velvetInteriorGlassMap,
    solarisInteriorGlassMap,
    amberInteriorGlassMap,
    viceGlassBlockMap,
    southLatticeBacklitMap,
    posterMaps,
  };
}

// =========================================================================
// MAIN NEON MILE PROCEDURAL ARCHITECTURE BUILDER
// =========================================================================

export function buildNeonMileArchitecture(
  venueSpecs: BuildingSpec[],
  ctx: NeonMileArchitectureContext,
): NeonMileArchitectureStats {
  const {
    root,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    environmentMeshesForCamera,
    disposables,
  } = ctx;

  // 1. Shared procedural geometries
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const unitPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const foliageGeo = new THREE.DodecahedronGeometry(0.55, 1);
  const curvedBayGeo = createCurvedDecoBayGeometry(14);
  const curvedNeonGeo = createCurvedNeonRibbonGeometry(14);
  const marqueeGeo = createTheaterMarqueeGeometry();
  const decoCrownGeo = createSteppedDecoCrownGeometry();
  const cornerPylonGeo = createArtDecoCornerPylonGeometry(8);

  disposables.push(
    unitBoxGeo,
    unitCylGeo,
    unitPlaneGeo,
    foliageGeo,
    curvedBayGeo,
    curvedNeonGeo,
    marqueeGeo,
    decoCrownGeo,
    cornerPylonGeo,
  );

  // 2. Procedural textures
  const tex = createNeonMileTextures(disposables);

  // 3. Compact calibrated PBR material pool (matte stone/plaster vs brushed chrome/bronze vs glossy dark glass vs selective neon)
  const matteWallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.flutedDarkStoneMap,
    bumpMap: tex.flutedDarkStoneBump,
    bumpScale: 0.04,
    roughness: 0.82,
    metalness: 0.06,
    envMapIntensity: 0.72,
  });
  const smoothTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.74,
    metalness: 0.08,
    envMapIntensity: 0.78,
  });
  const brushedMetalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.84,
    envMapIntensity: 1.38,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.36,
    metalness: 0.76,
    envMapIntensity: 1.24,
  });
  const warmWoodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.05,
    envMapIntensity: 0.62,
  });
  const velvetCarpetMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.45,
  });
  const roofDeckMat = new THREE.MeshStandardMaterial({
    color: 0x3b4254,
    roughness: 0.86,
    metalness: 0.06,
    envMapIntensity: 0.55,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.52,
  });
  const darkReflectiveGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x162230,
    emissive: 0x1e2c3e,
    emissiveIntensity: 0.02,
    roughness: 0.07,
    metalness: 0.24,
    ior: 1.52,
    reflectivity: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.55,
  });
  const glassRailingMat = new THREE.MeshPhysicalMaterial({
    color: 0x8cc8dc,
    roughness: 0.08,
    metalness: 0.14,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.5,
    envMapIntensity: 1.48,
  });

  // Venue-specific backlit interior glazing materials (use emissiveMap -> calm 0.08 in day, vivid 1.50 at night!)
  const makeInteriorGlassMat = (
    map: THREE.Texture,
    emissiveHex: number,
    baseColorHex: number,
  ): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: baseColorHex,
      map,
      emissive: emissiveHex,
      emissiveMap: map,
      emissiveIntensity: 0.08,
      roughness: 0.09,
      metalness: 0.18,
      ior: 1.52,
      reflectivity: 0.94,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.48,
    });

  const velvetGlassMat = makeInteriorGlassMat(tex.velvetInteriorGlassMap, 0xf43f8e, 0xd8a8c4);
  const solarisGlassMat = makeInteriorGlassMat(tex.solarisInteriorGlassMap, 0x22d3ee, 0xb8dde8);
  const amberGlassMat = makeInteriorGlassMat(tex.amberInteriorGlassMap, 0xf59e0b, 0xdfd0b8);
  const viceGlassBlockMat = makeInteriorGlassMat(tex.viceGlassBlockMap, 0xc084fc, 0xd8c8ec);
  const southBacklitWallMat = new THREE.MeshStandardMaterial({
    color: 0xe6d4b8,
    map: tex.southLatticeBacklitMap,
    emissive: 0xf59e0b,
    emissiveMap: tex.southLatticeBacklitMap,
    emissiveIntensity: 0.08,
    roughness: 0.34,
    metalness: 0.18,
    envMapIntensity: 0.95,
  });

  // Signage & Poster materials (emissiveMap keeps them crisp & glare-free by day, luminous & readable at night!)
  const makeSignMat = (map: THREE.Texture, emissiveHex: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      emissive: emissiveHex,
      emissiveMap: map,
      emissiveIntensity: 0.08,
      roughness: 0.32,
      metalness: 0.12,
      envMapIntensity: 0.95,
    });

  const velvetSignMat = makeSignMat(tex.velvetSignMap, 0xffd0e8);
  const solarisBladeSignMat = makeSignMat(tex.solarisBladeSignMap, 0xcffafe);
  const solarisFasciaSignMat = makeSignMat(tex.solarisFasciaSignMap, 0xcffafe);
  const amberSignMat = makeSignMat(tex.amberSignMap, 0xfde68a);
  const viceMarqueeFrontMat = makeSignMat(tex.viceMarqueeFrontMap, 0x9c8260);
  const viceMarqueeSideMat = makeSignMat(tex.viceMarqueeSideMap, 0x9c8260);
  const viceVerticalBladeMat = makeSignMat(tex.viceVerticalBladeMap, 0xf3e8ff);
  const southClubSignMat = makeSignMat(tex.southClubSignMap, 0xfef3c7);
  const posterMats = tex.posterMaps.map((pm) => makeSignMat(pm, 0xede9fe));

  // Shared selective-bloom neon accent materials (driven by TimeAndWeatherSystem.neonTrimMaterials: 0.55 day -> 2.70 night)
  const neonMaterials: Record<NeonMileNeonBand, THREE.MeshStandardMaterial> = {
    magenta: new THREE.MeshStandardMaterial({
      color: 0xffb8dc,
      emissive: 0xf43f8e,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0xbaf6ff,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
    violet: new THREE.MeshStandardMaterial({
      color: 0xe9d5ff,
      emissive: 0xa855f7,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
    warm_gold: new THREE.MeshStandardMaterial({
      color: 0xfff1cc,
      emissive: 0xffbf5e,
      emissiveIntensity: 0.55,
      roughness: 0.22,
    }),
  };

  emissiveBuildingMaterials.push(
    darkReflectiveGlassMat,
    velvetGlassMat,
    solarisGlassMat,
    amberGlassMat,
    viceGlassBlockMat,
    southBacklitWallMat,
    velvetSignMat,
    solarisBladeSignMat,
    solarisFasciaSignMat,
    amberSignMat,
    viceMarqueeFrontMat,
    viceMarqueeSideMat,
    viceVerticalBladeMat,
    southClubSignMat,
    ...posterMats,
  );
  neonTrimMaterials.push(
    neonMaterials.magenta,
    neonMaterials.cyan,
    neonMaterials.amber,
    neonMaterials.violet,
    neonMaterials.warm_gold,
  );

  const sharedCoreMaterials: THREE.Material[] = [
    matteWallMat,
    smoothTrimMat,
    brushedMetalMat,
    darkSteelMat,
    warmWoodMat,
    velvetCarpetMat,
    roofDeckMat,
    foliageMat,
    darkReflectiveGlassMat,
    glassRailingMat,
    velvetGlassMat,
    solarisGlassMat,
    amberGlassMat,
    viceGlassBlockMat,
    southBacklitWallMat,
    neonMaterials.magenta,
    neonMaterials.cyan,
    neonMaterials.amber,
    neonMaterials.violet,
    neonMaterials.warm_gold,
  ];
  const signageMaterials: THREE.Material[] = [
    velvetSignMat,
    solarisBladeSignMat,
    solarisFasciaSignMat,
    amberSignMat,
    viceMarqueeFrontMat,
    viceMarqueeSideMat,
    viceVerticalBladeMat,
    southClubSignMat,
    ...posterMats,
  ];
  disposables.push(...sharedCoreMaterials, ...signageMaterials);

  // 4. InstancedMesh collectors for repeated fins, mullions, railings, lattice bars, columns, planters & neon tubes
  const trimEntries: InstanceEntry[] = [];
  const metalEntries: InstanceEntry[] = [];
  const darkSteelEntries: InstanceEntry[] = [];
  const woodEntries: InstanceEntry[] = [];
  const carpetEntries: InstanceEntry[] = [];
  const columnEntries: InstanceEntry[] = [];
  const glassRailEntries: InstanceEntry[] = [];
  const foliageEntries: InstanceEntry[] = [];
  const neonEntries: Record<NeonMileNeonBand, InstanceEntry[]> = {
    magenta: [],
    cyan: [],
    amber: [],
    violet: [],
    warm_gold: [],
  };

  const dummy = new THREE.Object3D();
  const pushInst = (
    list: InstanceEntry[],
    wx: number,
    wy: number,
    wz: number,
    sx: number,
    sy: number,
    sz: number,
    colorHex: number,
    rotY = 0,
    rotZ = 0,
    rotX = 0,
  ) => {
    dummy.position.set(wx, wy, wz);
    dummy.rotation.set(rotX, rotY, rotZ);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    list.push({ matrix: dummy.matrix.clone(), colorHex });
  };

  // Axis helper: converts face-local (along, outward) relative to building center & half-extents into world coords
  const faceToWorld = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    face: NeonMileFrontageAxis,
    along: number,
    outward: number,
  ): { x: number; z: number; rotY: number; isX: boolean; sign: number } => {
    const isX = face === '+x' || face === '-x';
    const sign = face === '+x' || face === '+z' ? 1 : -1;
    const wallDist = (isX ? halfW : halfD) + outward;
    // Consistent right-handed tangent along each outward face:
    // +Z: right = +X; -Z: right = -X; +X: right = -Z; -X: right = +Z
    let x = cx;
    let z = cz;
    if (face === '+z') {
      x = cx + along;
      z = cz + wallDist;
    } else if (face === '-z') {
      x = cx - along;
      z = cz - wallDist;
    } else if (face === '+x') {
      x = cx + wallDist;
      z = cz - along;
    } else {
      x = cx - wallDist;
      z = cz + along;
    }
    const rotY =
      face === '+z' ? 0 : face === '-z' ? Math.PI : face === '+x' ? Math.PI / 2 : -Math.PI / 2;
    return { x, z, rotY, isX, sign };
  };

  /**
   * Helper: mounts a crisp readable procedural signage PlaneGeometry flush proud of a backing board
   * so text always reads left-to-right from the street with zero z-fighting.
   */
  const addSignPlane = (
    group: THREE.Group,
    localX: number,
    localY: number,
    localZ: number,
    width: number,
    height: number,
    rotY: number,
    mat: THREE.MeshStandardMaterial,
  ) => {
    const plane = new THREE.Mesh(unitPlaneGeo, mat);
    plane.scale.set(width, height, 1);
    plane.position.set(localX, localY, localZ);
    plane.rotation.y = rotY;
    group.add(plane);
  };

  /**
   * Helper: adds perimeter rooftop terrace railings (low stone/dark coping + glass balustrades + metallic handrail + corner planters).
   */
  const addRooftopTerracePerimeter = (
    spec: BuildingSpec,
    roofY: number,
    tw: number,
    td: number,
    metalTint: number,
    trimTint: number,
    neonBand: NeonMileNeonBand,
    includeGlassRail = true,
  ): number => {
    const parapetH = 0.44;
    const wallT = 0.34;
    pushInst(trimEntries, spec.x, roofY + parapetH * 0.5, spec.z + td * 0.5 - wallT * 0.5, tw, parapetH, wallT, trimTint);
    pushInst(trimEntries, spec.x, roofY + parapetH * 0.5, spec.z - td * 0.5 + wallT * 0.5, tw, parapetH, wallT, trimTint);
    pushInst(trimEntries, spec.x + tw * 0.5 - wallT * 0.5, roofY + parapetH * 0.5, spec.z, wallT, parapetH, td - wallT * 2, trimTint);
    pushInst(trimEntries, spec.x - tw * 0.5 + wallT * 0.5, roofY + parapetH * 0.5, spec.z, wallT, parapetH, td - wallT * 2, trimTint);

    // Architectural roofline neon accent tube
    const neonY = roofY - 0.14;
    pushInst(neonEntries[neonBand], spec.x, neonY, spec.z + td * 0.5 + 0.1, tw - 0.4, 0.16, 0.12, 0xffffff);
    pushInst(neonEntries[neonBand], spec.x, neonY, spec.z - td * 0.5 - 0.1, tw - 0.4, 0.16, 0.12, 0xffffff);
    pushInst(neonEntries[neonBand], spec.x + tw * 0.5 + 0.1, neonY, spec.z, 0.12, 0.16, td - 0.4, 0xffffff);
    pushInst(neonEntries[neonBand], spec.x - tw * 0.5 - 0.1, neonY, spec.z, 0.12, 0.16, td - 0.4, 0xffffff);

    let topY = roofY + parapetH;
    if (includeGlassRail) {
      const glassH = 0.82;
      const gy = roofY + parapetH + glassH * 0.5;
      const topRailY = roofY + parapetH + glassH;
      pushInst(glassRailEntries, spec.x, gy, spec.z + td * 0.5 - wallT * 0.5, tw - 0.5, glassH, 0.06, 0xffffff);
      pushInst(glassRailEntries, spec.x, gy, spec.z - td * 0.5 + wallT * 0.5, tw - 0.5, glassH, 0.06, 0xffffff);
      pushInst(glassRailEntries, spec.x + tw * 0.5 - wallT * 0.5, gy, spec.z, 0.06, glassH, td - 0.5, 0xffffff);
      pushInst(glassRailEntries, spec.x - tw * 0.5 + wallT * 0.5, gy, spec.z, 0.06, glassH, td - 0.5, 0xffffff);

      pushInst(metalEntries, spec.x, topRailY, spec.z + td * 0.5 - wallT * 0.5, tw - 0.4, 0.07, 0.09, metalTint);
      pushInst(metalEntries, spec.x, topRailY, spec.z - td * 0.5 + wallT * 0.5, tw - 0.4, 0.07, 0.09, metalTint);
      pushInst(metalEntries, spec.x + tw * 0.5 - wallT * 0.5, topRailY, spec.z, 0.09, 0.07, td - 0.4, metalTint);
      pushInst(metalEntries, spec.x - tw * 0.5 + wallT * 0.5, topRailY, spec.z, 0.09, 0.07, td - 0.4, metalTint);
      topY = topRailY + 0.06;
    }

    // Grounded corner planters with tropical greenery
    const pxOff = tw * 0.5 - 1.15;
    const pzOff = td * 0.5 - 1.15;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushInst(trimEntries, spec.x + sx * pxOff, roofY + 0.34, spec.z + sz * pzOff, 0.85, 0.68, 0.85, trimTint);
        pushInst(foliageEntries, spec.x + sx * pxOff, roofY + 0.88, spec.z + sz * pzOff, 0.78, 0.72, 0.78, 0x2a7644);
      }
    }
    return topY;
  };

  /**
   * Helper: adds a grounded rooftop pergola / shade structure (4 posts + header beams + shade louvers + subtle underside lighting).
   */
  const addRooftopPergola = (
    cx: number,
    cz: number,
    deckY: number,
    pw: number,
    pd: number,
    ph: number,
    postList: InstanceEntry[],
    postColor: number,
    slatList: InstanceEntry[],
    slatColor: number,
    lightBand: NeonMileNeonBand,
  ): number => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushInst(postList, cx + sx * (pw * 0.46), deckY + ph * 0.5, cz + sz * (pd * 0.46), 0.22, ph, 0.22, postColor);
      }
    }
    pushInst(postList, cx, deckY + ph, cz + pd * 0.46, pw, 0.2, 0.22, postColor);
    pushInst(postList, cx, deckY + ph, cz - pd * 0.46, pw, 0.2, 0.22, postColor);
    pushInst(postList, cx + pw * 0.46, deckY + ph, cz, 0.22, 0.2, pd, postColor);
    pushInst(postList, cx - pw * 0.46, deckY + ph, cz, 0.22, 0.2, pd, postColor);

    const slats = Math.max(4, Math.min(8, Math.round(pw / 0.95)));
    for (let i = 1; i < slats; i++) {
      const ox = (i / slats - 0.5) * (pw - 0.4);
      pushInst(slatList, cx + ox, deckY + ph + 0.08, cz, 0.14, 0.12, pd * 0.92, slatColor);
    }
    // Warm or cyan soffit architectural light strip beneath pergola perimeter
    pushInst(neonEntries[lightBand], cx, deckY + ph - 0.12, cz + pd * 0.42, pw * 0.78, 0.07, 0.07, 0xffffff);
    pushInst(neonEntries[lightBand], cx, deckY + ph - 0.12, cz - pd * 0.42, pw * 0.78, 0.07, 0.07, 0xffffff);
    return deckY + ph + 0.18;
  };

  /**
   * Helper: adds velvet VIP entrance carpet runner & flanking brass/chrome stanchion posts within property clearance.
   */
  const addVipArrivalQueue = (
    spec: BuildingSpec,
    face: NeonMileFrontageAxis,
    projDepth: number,
    carpetWidth: number,
    carpetHex: number,
    postHex: number,
    alongOffset = 0,
  ) => {
    const isX = face === '+x' || face === '-x';
    const hw = spec.width * 0.5;
    const hd = spec.depth * 0.5;

    const cPos = faceToWorld(spec.x, spec.z, hw, hd, face, alongOffset, projDepth * 0.5);
    pushInst(
      carpetEntries,
      cPos.x,
      0.04,
      cPos.z,
      isX ? projDepth : carpetWidth,
      0.08,
      isX ? carpetWidth : projDepth,
      carpetHex,
    );

    // Flanking stanchion posts & horizontal rope bars
    for (const side of [-1, 1]) {
      const sideAlong = alongOffset + side * (carpetWidth * 0.5 + 0.16);
      const pNear = faceToWorld(spec.x, spec.z, hw, hd, face, sideAlong, 0.32);
      const pFar = faceToWorld(spec.x, spec.z, hw, hd, face, sideAlong, projDepth - 0.16);
      pushInst(columnEntries, pNear.x, 0.52, pNear.z, 0.1, 1.04, 0.1, postHex);
      pushInst(columnEntries, pFar.x, 0.52, pFar.z, 0.1, 1.04, 0.1, postHex);

      const ropeMid = faceToWorld(spec.x, spec.z, hw, hd, face, sideAlong, projDepth * 0.5 + 0.08);
      pushInst(
        carpetEntries,
        ropeMid.x,
        0.84,
        ropeMid.z,
        isX ? projDepth - 0.48 : 0.06,
        0.06,
        isX ? 0.06 : projDepth - 0.48,
        carpetHex,
      );
    }
  };

  // =========================================================================
  // VENUE 1: VELVET — MAGENTA LUXURY ART DECO NIGHTCLUB (ent_club_velvet)
  // Inspired by Reference Image 1 (curved central glazed bay, horizontal glowing neon rings,
  // twin vertical neon fins, curved soffit canopy & rooftop sign)
  // =========================================================================
  const buildVelvetClub = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: NeonMileVenueProfile,
  ): NeonMileVenueSummary => {
    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const hw = w * 0.5;
    const hd = d * 0.5;
    let signMeshCount = 0;

    // Ground stone/slate base plinth
    const plinth = new THREE.Mesh(unitBoxGeo, smoothTrimMat.clone());
    (plinth.material as THREE.MeshStandardMaterial).color.setHex(0x161824);
    disposables.push(plinth.material as THREE.Material);
    plinth.scale.set(w * 0.99, 0.34, d * 0.99);
    plinth.position.y = 0.17;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Main charcoal-plum Art Deco club mass
    const bodyMat = matteWallMat.clone();
    bodyMat.color.setHex(profile.baseTint);
    const plumWingMat = matteWallMat.clone();
    plumWingMat.color.setHex(profile.secondaryWallTint);
    disposables.push(bodyMat, plumWingMat);

    const mainBody = new THREE.Mesh(unitBoxGeo, bodyMat);
    mainBody.scale.set(w - 0.4, h - 0.34, d - 0.4);
    mainBody.position.y = 0.34 + (h - 0.34) * 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);
    environmentMeshesForCamera.push(mainBody);

    // Stepped flanking deep-plum Art Deco side wings on primary (-Z) facade
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(unitBoxGeo, plumWingMat);
      wing.scale.set(4.6, h - 1.2, 0.9);
      wing.position.set(side * (hw - 2.5), 0.34 + (h - 1.2) * 0.5, -hd + 0.15);
      wing.castShadow = true;
      group.add(wing);

      // Tall recessed vertical backlit window bay on each flanking wing
      const winPanel = new THREE.Mesh(unitBoxGeo, velvetGlassMat);
      winPanel.scale.set(2.1, h - 6.8, 0.18);
      winPanel.position.set(side * (hw - 2.5), 4.6 + (h - 6.8) * 0.5, -hd - 0.25);
      group.add(winPanel);

      // Twin vertical rose-magenta neon fin tubes framing each flanking wing (signature Miami deco!)
      for (const fSide of [-1, 1]) {
        const finX = spec.x + side * (hw - 2.5) + fSide * 1.38;
        pushInst(trimEntries, finX, 0.34 + (h - 1.0) * 0.5, spec.z - hd - 0.34, 0.3, h - 1.0, 0.42, 0x1c1a2e);
        pushInst(neonEntries.magenta, finX, 4.4 + (h - 5.2) * 0.5, spec.z - hd - 0.58, 0.11, h - 5.4, 0.11, 0xffffff);
      }

      // Horizontal mullions across flanking wing windows
      for (let floorY = 6.2; floorY < h - 2.5; floorY += 2.2) {
        pushInst(metalEntries, spec.x + side * (hw - 2.5), floorY, spec.z - hd - 0.35, 2.2, 0.1, 0.12, profile.metalTint);
      }
    }

    // Signature Curved Central Art Deco Glazed Bay projecting on primary (-Z) facade (from Reference Image 1!)
    const bayW = 5.4;
    const bayProj = 1.65;
    const bayStartY = 5.55;
    const bayH = h - bayStartY + 1.0; // rises cleanly above roofline as focal drum
    const curvedBay = new THREE.Mesh(curvedBayGeo, velvetGlassMat);
    curvedBay.scale.set(bayW, bayH, bayProj);
    curvedBay.position.set(0, bayStartY, -hd + 0.12);
    curvedBay.rotation.y = Math.PI; // projects outward along -Z
    curvedBay.castShadow = true;
    group.add(curvedBay);

    // Curved dark-metallic cap & solid architectural top drum on curved bay
    const curvedCap = new THREE.Mesh(curvedBayGeo, bodyMat);
    curvedCap.scale.set(bayW + 0.35, 0.55, bayProj + 0.14);
    curvedCap.position.set(0, bayStartY + bayH, -hd + 0.12);
    curvedCap.rotation.y = Math.PI;
    group.add(curvedCap);

    // Three Glowing Horizontal Curved Magenta Neon Bands wrapping the central bay drum
    for (const bandY of [bayStartY + 0.28, bayStartY + bayH * 0.5, bayStartY + bayH - 0.14]) {
      const neonRing = new THREE.Mesh(curvedNeonGeo, neonMaterials.magenta);
      neonRing.scale.set(bayW + 0.28, 0.2, bayProj + 0.16);
      neonRing.position.set(0, bandY, -hd + 0.12);
      neonRing.rotation.y = Math.PI;
      group.add(neonRing);
    }

    // Vertical metallic mullions along the curved bay drum
    for (let i = 1; i < 6; i++) {
      const theta = (i / 6) * Math.PI;
      const mx = Math.cos(theta) * (bayW * 0.5 + 0.04);
      const mz = -hd + 0.12 - Math.sin(theta) * (bayProj + 0.04);
      pushInst(metalEntries, spec.x + mx, bayStartY + bayH * 0.5, spec.z + mz, 0.09, bayH, 0.09, profile.metalTint);
    }

    // Recessed VIP Entrance Vestibule & Large Reflective Glazed Doors on -Z (cleanly proud of mainBody wall!)
    const vestibule = new THREE.Mesh(unitBoxGeo, velvetGlassMat);
    vestibule.scale.set(6.2, 4.1, 0.24);
    vestibule.position.set(0, 0.34 + 2.05, -hd + 0.06);
    group.add(vestibule);

    // Chrome entrance portal frame & double doors
    for (const dx of [-2.4, -0.8, 0.8, 2.4]) {
      pushInst(metalEntries, spec.x + dx, 2.3, spec.z - hd - 0.08, 0.14, 3.9, 0.18, profile.metalTint);
    }
    pushInst(metalEntries, spec.x, 3.65, spec.z - hd - 0.08, 5.2, 0.16, 0.2, profile.metalTint);

    // Sculpted Curved Dark-Lacquer Entrance Canopy projecting 2.2m on -Z
    const canopyMat = smoothTrimMat.clone();
    canopyMat.color.setHex(0x141522);
    disposables.push(canopyMat);
    const canopy = new THREE.Mesh(curvedBayGeo, canopyMat);
    canopy.scale.set(7.6, 0.62, profile.canopyProjection);
    canopy.position.set(0, 4.0, -hd + 0.1);
    canopy.rotation.y = Math.PI;
    canopy.castShadow = true;
    group.add(canopy);

    // Curved Magenta Neon Perimeter Rim around Entrance Canopy
    const canopyRim = new THREE.Mesh(curvedNeonGeo, neonMaterials.magenta);
    canopyRim.scale.set(7.76, 0.14, profile.canopyProjection + 0.08);
    canopyRim.position.set(0, 4.3, -hd + 0.1);
    canopyRim.rotation.y = Math.PI;
    group.add(canopyRim);

    // Warm Golden Soffit Downlight Discs beneath Canopy (Signature Reference Image 1 glow!)
    for (const ox of [-2.4, -1.2, 0, 1.2, 2.4]) {
      const zCurve = Math.sqrt(Math.max(0.2, 1 - (ox / 3.8) ** 2)) * (profile.canopyProjection * 0.68);
      pushInst(neonEntries.warm_gold, spec.x + ox, 3.96, spec.z - hd - zCurve, 0.34, 0.08, 0.34, 0xffffff);
    }

    // Supporting chrome canopy columns
    for (const side of [-1, 1]) {
      pushInst(columnEntries, spec.x + side * 3.1, 2.0, spec.z - hd - 0.85, 0.34, 4.0, 0.34, profile.metalTint);
    }

    // Crisp Readable Elevated Rooftop VELVET Signboard (lifted cleanly above curved drum cap — 100% unobstructed from street!)
    const roofSignY = bayStartY + bayH + 1.92;
    const roofSignZ = -hd - 0.72;
    const roofSignBox = new THREE.Mesh(unitBoxGeo, canopyMat);
    roofSignBox.scale.set(6.4, 2.0, 0.38);
    roofSignBox.position.set(0, roofSignY, roofSignZ);
    group.add(roofSignBox);
    // Support struts grounding rooftop sign onto curved bay drum
    for (const sx of [-2.1, 2.1]) {
      pushInst(darkSteelEntries, spec.x + sx, bayStartY + bayH + 0.72, spec.z + roofSignZ, 0.18, 0.92, 0.18, 0x202436);
    }
    addSignPlane(group, 0, roofSignY, roofSignZ - 0.21, 6.2, 1.88, Math.PI, velvetSignMat);
    signMeshCount++;

    // Entrance Canopy Fascia VELVET Signboard (sits cleanly forward of curved glass bay with zero intersection!)
    const fasciaBox = new THREE.Mesh(unitBoxGeo, canopyMat);
    fasciaBox.scale.set(4.5, 0.94, 0.22);
    fasciaBox.position.set(0, 4.92, -hd - 1.92);
    group.add(fasciaBox);
    addSignPlane(group, 0, 4.92, -hd - 2.05, 4.34, 0.84, Math.PI, velvetSignMat);
    signMeshCount++;

    // VIP Magenta Carpet & Chrome Stanchions
    addVipArrivalQueue(spec, '-z', 2.0, 2.5, 0x9d174d, profile.metalTint);

    // Secondary West (-X) Facade: Art Deco vertical pilasters, glazed VIP windows & magenta accent strip
    for (const zOff of [-3.6, 0, 3.6]) {
      const sideWin = new THREE.Mesh(unitBoxGeo, velvetGlassMat);
      sideWin.scale.set(0.18, h - 6.6, 2.1);
      sideWin.position.set(-hw + 0.12, 4.6 + (h - 6.6) * 0.5, zOff);
      group.add(sideWin);
      pushInst(trimEntries, spec.x - hw - 0.12, 0.34 + (h - 1.0) * 0.5, spec.z + zOff - 1.35, 0.34, h - 1.0, 0.34, 0x1d1b30);
    }
    pushInst(neonEntries.magenta, spec.x - hw - 0.16, 4.4, spec.z, 0.12, 0.16, d - 1.4, 0xffffff);

    // Rooftop Lounge Terrace (grounded deck slab, glass railings, plum lounge sofas & subtle bar counter)
    const roofDeck = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    roofDeck.scale.set(w - 0.5, 0.24, d - 0.5);
    roofDeck.position.y = h + 0.12;
    roofDeck.receiveShadow = true;
    group.add(roofDeck);
    const deckY = h + 0.24;

    addRooftopTerracePerimeter(spec, deckY, w - 0.4, d - 0.4, profile.metalTint, 0x1e2032, 'magenta', true);

    // Rooftop lounge bar counter & seating sofas
    pushInst(trimEntries, spec.x, deckY + 0.52, spec.z + 2.8, 5.4, 1.04, 1.1, 0x2c1d38);
    pushInst(neonEntries.magenta, spec.x, deckY + 0.98, spec.z + 2.2, 5.2, 0.1, 0.08, 0xffffff);
    for (const sx of [-4.2, 4.2]) {
      pushInst(carpetEntries, spec.x + sx, deckY + 0.38, spec.z - 0.4, 2.4, 0.76, 1.0, 0x6b1d4c);
      pushInst(trimEntries, spec.x + sx, deckY + 0.22, spec.z + 1.2, 1.6, 0.44, 0.9, 0x1d2030);
    }

    const pinnacleY = bayStartY + bayH + 2.55;
    return {
      id: spec.id,
      archetype: profile.archetype,
      signTitle: profile.signTitle,
      frontage: profile.frontage,
      secondaryFrontage: profile.secondaryFrontage,
      neonBand: profile.neonBand,
      canopyProjection: profile.canopyProjection,
      hasMarquee: profile.hasMarquee,
      hasVerticalSignTower: profile.hasVerticalSignTower,
      hasRooftopTerrace: profile.hasRooftopTerrace,
      signMeshCount,
      posterCount: 0,
      pinnacleY,
    };
  };

  // =========================================================================
  // VENUE 2: SOLARIS — CYAN MODERN GLASS NIGHTCLUB (ent_club_solaris)
  // Inspired by Reference Image 2 ("THE GRAND"): double-height glass-and-metal corner
  // curtain wall with interior cyan LED geometry, cantilevered upper block & vertical sign blade
  // =========================================================================
  const buildSolarisClub = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: NeonMileVenueProfile,
  ): NeonMileVenueSummary => {
    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const hw = w * 0.5;
    const hd = d * 0.5;
    let signMeshCount = 0;

    // Ground dark basalt plinth
    const plinth = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    plinth.scale.set(w * 0.99, 0.32, d * 0.99);
    plinth.position.y = 0.16;
    plinth.receiveShadow = true;
    group.add(plinth);

    const lowerH = 10.6; // Dramatic double-height glowing glass atrium podium
    const upperH = h - lowerH;

    // Structural solid core set back slightly from the North-East corner glass curtain wall
    const coreMat = matteWallMat.clone();
    coreMat.color.setHex(profile.baseTint);
    const upperMat = smoothTrimMat.clone();
    upperMat.color.setHex(profile.secondaryWallTint);
    disposables.push(coreMat, upperMat);

    // Lower solid west/south structural L-core
    const lowerCore = new THREE.Mesh(unitBoxGeo, coreMat);
    lowerCore.scale.set(w - 0.6, lowerH - 0.32, d - 0.6);
    lowerCore.position.y = 0.32 + (lowerH - 0.32) * 0.5;
    lowerCore.castShadow = true;
    lowerCore.receiveShadow = true;
    group.add(lowerCore);
    environmentMeshesForCamera.push(lowerCore);

    // Dramatic Double-Height Illuminated Cyan Glass Corner Curtain Wall wrapping North (-Z) & East (+X)!
    const northCurtain = new THREE.Mesh(unitBoxGeo, solarisGlassMat);
    northCurtain.scale.set(w - 0.4, lowerH - 0.5, 0.22);
    northCurtain.position.set(0, 0.32 + (lowerH - 0.5) * 0.5, -hd + 0.16);
    group.add(northCurtain);

    const eastCurtain = new THREE.Mesh(unitBoxGeo, solarisGlassMat);
    eastCurtain.scale.set(0.22, lowerH - 0.5, d - 0.4);
    eastCurtain.position.set(hw - 0.16, 0.32 + (lowerH - 0.5) * 0.5, 0);
    group.add(eastCurtain);

    // Crisp Dark-Steel Structural Curtain-Wall Grid Mullions (vertical + horizontal transoms)
    const mullionsX = 6;
    for (let i = 0; i <= mullionsX; i++) {
      const mx = spec.x - hw + 0.18 + (i / mullionsX) * (w - 0.36);
      pushInst(darkSteelEntries, mx, 0.32 + lowerH * 0.5, spec.z - hd + 0.04, 0.16, lowerH, 0.24, profile.metalTint);
    }
    const mullionsZ = 5;
    for (let i = 0; i <= mullionsZ; i++) {
      const mz = spec.z - hd + 0.18 + (i / mullionsZ) * (d - 0.36);
      pushInst(darkSteelEntries, spec.x + hw - 0.04, 0.32 + lowerH * 0.5, mz, 0.24, lowerH, 0.16, profile.metalTint);
    }
    for (const ty of [3.5, 6.9, lowerH - 0.18]) {
      pushInst(darkSteelEntries, spec.x, ty, spec.z - hd + 0.04, w + 0.08, 0.18, 0.28, profile.metalTint);
      pushInst(darkSteelEntries, spec.x + hw - 0.04, ty, spec.z, 0.28, 0.18, d + 0.08, profile.metalTint);
    }

    // Architectural Glowing Cyan Linear Strips tracing the modern curtain-wall frame & corner edge
    pushInst(neonEntries.cyan, spec.x + hw + 0.08, 0.4 + lowerH * 0.5, spec.z - hd - 0.08, 0.14, lowerH - 0.4, 0.14, 0xffffff);
    pushInst(neonEntries.cyan, spec.x, lowerH - 0.12, spec.z - hd - 0.14, w - 0.3, 0.15, 0.12, 0xffffff);
    pushInst(neonEntries.cyan, spec.x + hw + 0.14, lowerH - 0.12, spec.z, 0.12, 0.15, d - 0.3, 0xffffff);

    // Cantilevered Upper Modern Club Volume (slightly overhangs North & East over lower podium for futuristic silhouette!)
    const upperBox = new THREE.Mesh(unitBoxGeo, upperMat);
    upperBox.scale.set(w + 0.5, upperH, d + 0.2);
    upperBox.position.set(0.35, lowerH + upperH * 0.5, -0.35);
    upperBox.castShadow = true;
    upperBox.receiveShadow = true;
    group.add(upperBox);
    environmentMeshesForCamera.push(upperBox);

    // Sleek Architectural Silver-White Fascia Frame Wrapping the Cantilevered Upper Volume
    const uMinX = spec.x + 0.35 - (w + 0.5) * 0.5;
    const uMaxX = spec.x + 0.35 + (w + 0.5) * 0.5;
    const uMinZ = spec.z - 0.35 - (d + 0.2) * 0.5;
    const uMaxZ = spec.z - 0.35 + (d + 0.2) * 0.5;
    for (const fy of [lowerH + 0.24, h - 0.22]) {
      pushInst(trimEntries, spec.x + 0.35, fy, uMinZ - 0.06, w + 0.64, 0.46, 0.34, profile.trimTint);
      pushInst(trimEntries, spec.x + 0.35, fy, uMaxZ + 0.06, w + 0.64, 0.46, 0.34, profile.trimTint);
      pushInst(trimEntries, uMaxX + 0.06, fy, spec.z - 0.35, 0.34, 0.46, d + 0.34, profile.trimTint);
      pushInst(trimEntries, uMinX - 0.06, fy, spec.z - 0.35, 0.34, 0.46, d + 0.34, profile.trimTint);
    }

    // Upper Ribbon Dark Reflective Glazing & Cyan Linear Accent
    const upperGlassN = new THREE.Mesh(unitBoxGeo, darkReflectiveGlassMat);
    upperGlassN.scale.set(w - 1.2, upperH - 2.0, 0.16);
    upperGlassN.position.set(0.35, lowerH + upperH * 0.5, -0.35 - (d + 0.2) * 0.5 - 0.02);
    group.add(upperGlassN);
    const upperGlassE = new THREE.Mesh(unitBoxGeo, darkReflectiveGlassMat);
    upperGlassE.scale.set(0.16, upperH - 2.0, d - 1.2);
    upperGlassE.position.set(0.35 + (w + 0.5) * 0.5 + 0.02, lowerH + upperH * 0.5, -0.35);
    group.add(upperGlassE);

    // Structural vertical louver fins across upper glass
    for (let i = -2; i <= 2; i++) {
      pushInst(darkSteelEntries, spec.x + 0.35 + i * 2.4, lowerH + upperH * 0.5, uMinZ - 0.14, 0.14, upperH - 0.6, 0.34, profile.metalTint);
      pushInst(darkSteelEntries, uMaxX + 0.14, lowerH + upperH * 0.5, spec.z - 0.35 + i * 2.2, 0.34, upperH - 0.6, 0.14, profile.metalTint);
    }
    pushInst(neonEntries.cyan, spec.x + 0.35, h - 0.54, uMinZ - 0.22, w + 0.4, 0.14, 0.12, 0xffffff);
    pushInst(neonEntries.cyan, uMaxX + 0.22, h - 0.54, spec.z - 0.35, 0.12, 0.14, d + 0.1, 0xffffff);

    // Layered Glass Entrance Vestibule & Cantilevered Illuminated Modern Canopy on North (-Z)
    const canopyBox = new THREE.Mesh(unitBoxGeo, darkSteelMat.clone());
    (canopyBox.material as THREE.MeshStandardMaterial).color.setHex(0x16202c);
    disposables.push(canopyBox.material as THREE.Material);
    canopyBox.scale.set(7.6, 0.44, profile.canopyProjection);
    canopyBox.position.set(-1.4, 3.85, -hd - profile.canopyProjection * 0.5 + 0.1);
    canopyBox.castShadow = true;
    group.add(canopyBox);

    // Cyan glowing edge & underside strip on cantilevered entrance canopy
    pushInst(neonEntries.cyan, spec.x - 1.4, 3.85, spec.z - hd - profile.canopyProjection + 0.06, 7.6, 0.12, 0.1, 0xffffff);
    pushInst(neonEntries.cyan, spec.x - 1.4, 3.6, spec.z - hd - profile.canopyProjection * 0.5, 6.2, 0.08, 0.55, 0xffffff);

    // Crisp SOLARIS Horizontal Entrance Fascia Sign mounted atop the cantilevered canopy
    const fasciaSignBack = new THREE.Mesh(unitBoxGeo, canopyBox.material as THREE.Material);
    fasciaSignBack.scale.set(5.4, 1.16, 0.22);
    fasciaSignBack.position.set(-1.4, 4.68, -hd - profile.canopyProjection + 0.26);
    group.add(fasciaSignBack);
    addSignPlane(group, -1.4, 4.68, -hd - profile.canopyProjection + 0.13, 5.26, 1.04, Math.PI, solarisFasciaSignMat);
    signMeshCount++;

    // Sleek Vertical Illuminated SOLARIS Corner Blade Sign (like "THE GRAND" vertical corner blade in Reference Image 2!)
    const bladeH = 7.4;
    const bladeW = 1.65;
    const bladeY = 7.6 + bladeH * 0.5;
    const bladeX = hw + 0.92;
    const bladeZ = -hd + 2.6;
    const bladeHousing = new THREE.Mesh(unitBoxGeo, canopyBox.material as THREE.Material);
    bladeHousing.scale.set(bladeW, bladeH, 0.28);
    bladeHousing.position.set(bladeX, bladeY, bladeZ);
    bladeHousing.castShadow = true;
    group.add(bladeHousing);
    // Steel mounting struts anchoring vertical blade into East wall
    for (const sy of [bladeY - 2.6, bladeY + 2.6]) {
      pushInst(darkSteelEntries, spec.x + hw + 0.28, sy, spec.z + bladeZ, 0.62, 0.18, 0.18, profile.metalTint);
    }
    // Outer vertical cyan neon spine along blade edge
    pushInst(neonEntries.cyan, spec.x + bladeX + bladeW * 0.5 + 0.05, bladeY, spec.z + bladeZ, 0.1, bladeH, 0.12, 0xffffff);
    // Double-sided readable SOLARIS vertical text planes (facing North -Z and South +Z)
    addSignPlane(group, bladeX, bladeY, bladeZ - 0.16, bladeW - 0.14, bladeH - 0.16, Math.PI, solarisBladeSignMat);
    addSignPlane(group, bladeX, bladeY, bladeZ + 0.16, bladeW - 0.14, bladeH - 0.16, 0, solarisBladeSignMat);
    signMeshCount += 2;

    // VIP entrance carpet & sleek dark-chrome stanchions (aligned cleanly with entrance canopy at x = -1.4!)
    addVipArrivalQueue(spec, '-z', 1.95, 2.6, 0x0e3a52, 0x94a3b8, 1.4);

    // Rooftop Sky Terrace with Modern Steel Pergola Shade Structure & Cyan Linear Lighting
    const roofDeck = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    roofDeck.scale.set(w + 0.1, 0.24, d - 0.1);
    roofDeck.position.set(0.35, h + 0.12, -0.35);
    roofDeck.receiveShadow = true;
    group.add(roofDeck);
    const deckY = h + 0.24;

    const fakeCenterSpec: BuildingSpec = { ...spec, x: spec.x + 0.35, z: spec.z - 0.35 };
    addRooftopTerracePerimeter(fakeCenterSpec, deckY, w + 0.2, d - 0.1, 0x64748b, 0x202d3d, 'cyan', true);
    const pergolaTop = addRooftopPergola(
      spec.x + 0.35,
      spec.z - 0.8,
      deckY,
      8.4,
      5.4,
      3.1,
      darkSteelEntries,
      profile.metalTint,
      metalEntries,
      0x94a3b8,
      'cyan',
    );
    // Rooftop sleek DJ/Sky bar counter
    pushInst(trimEntries, spec.x + 0.35, deckY + 0.54, spec.z + 3.4, 5.6, 1.08, 1.1, 0x1a2638);
    pushInst(neonEntries.cyan, spec.x + 0.35, deckY + 0.96, spec.z + 2.8, 5.4, 0.09, 0.08, 0xffffff);

    return {
      id: spec.id,
      archetype: profile.archetype,
      signTitle: profile.signTitle,
      frontage: profile.frontage,
      secondaryFrontage: profile.secondaryFrontage,
      neonBand: profile.neonBand,
      canopyProjection: profile.canopyProjection,
      hasMarquee: profile.hasMarquee,
      hasVerticalSignTower: profile.hasVerticalSignTower,
      hasRooftopTerrace: profile.hasRooftopTerrace,
      signMeshCount,
      posterCount: 0,
      pinnacleY: pergolaTop,
    };
  };

  // =========================================================================
  // VENUE 3: AMBER LOUNGE — INTIMATE WARM LUXURY LOUNGE (ent_lounge_amber)
  // Warm bronze, charcoal & stone cladding, vertical architectural fins, large framed warm
  // windows, recessed entrance portal, covered outdoor seating terrace & rooftop pergola
  // =========================================================================
  const buildAmberLounge = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: NeonMileVenueProfile,
  ): NeonMileVenueSummary => {
    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const hw = w * 0.5;
    const hd = d * 0.5;
    let signMeshCount = 0;

    // Warm travertine/limestone grounded base plinth
    const stonePlinthMat = smoothTrimMat.clone();
    stonePlinthMat.color.setHex(0xbca993);
    const bodyMat = matteWallMat.clone();
    bodyMat.color.setHex(profile.baseTint);
    const bronzeStonePanelMat = matteWallMat.clone();
    bronzeStonePanelMat.color.setHex(profile.secondaryWallTint);
    disposables.push(stonePlinthMat, bodyMat, bronzeStonePanelMat);

    const plinth = new THREE.Mesh(unitBoxGeo, stonePlinthMat);
    plinth.scale.set(w * 0.99, 0.36, d * 0.99);
    plinth.position.y = 0.18;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Main charcoal-plum luxury lounge volume
    const mainBody = new THREE.Mesh(unitBoxGeo, bodyMat);
    mainBody.scale.set(w - 0.36, h - 0.36, d - 0.36);
    mainBody.position.y = 0.36 + (h - 0.36) * 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);
    environmentMeshesForCamera.push(mainBody);

    // Textured warm stone architectural pier panels framing South (+Z) and West (-X) facades
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(unitBoxGeo, bronzeStonePanelMat);
      pier.scale.set(3.4, h - 0.6, 0.52);
      pier.position.set(side * (hw - 1.85), 0.36 + (h - 0.6) * 0.5, hd - 0.02);
      pier.castShadow = true;
      group.add(pier);

      // Vertical architectural bronze/timber slat fins across upper textured stone piers
      for (let f = -3; f <= 3; f++) {
        pushInst(
          woodEntries,
          spec.x + side * (hw - 1.85) + f * 0.42,
          5.0 + (h - 5.6) * 0.5,
          spec.z + hd + 0.28,
          0.11,
          h - 5.8,
          0.22,
          0x784a27,
        );
      }
    }

    // Large Framed Warm-Lit Lounge Windows (Ground & Upper Stories on +Z and -X)
    const upperWinS = new THREE.Mesh(unitBoxGeo, amberGlassMat);
    upperWinS.scale.set(7.0, 5.2, 0.18);
    upperWinS.position.set(0, 8.2, hd - 0.08);
    group.add(upperWinS);
    // Warm bronze window surround frame & vertical mullions
    pushInst(metalEntries, spec.x, 10.85, spec.z + hd + 0.06, 7.3, 0.18, 0.28, profile.metalTint);
    pushInst(metalEntries, spec.x, 5.55, spec.z + hd + 0.06, 7.3, 0.18, 0.28, profile.metalTint);
    for (const mx of [-3.55, -1.75, 0, 1.75, 3.55]) {
      pushInst(metalEntries, spec.x + mx, 8.2, spec.z + hd + 0.06, 0.14, 5.3, 0.24, profile.metalTint);
    }

    // Subtle linear amber architectural wash strips framing upper stone piers
    for (const side of [-1, 1]) {
      pushInst(neonEntries.amber, spec.x + side * 3.75, 8.2, spec.z + hd + 0.22, 0.09, 6.2, 0.09, 0xffffff);
    }

    // Ground Floor Sophisticated Recessed Entrance & Warm Glazed Bar Frontage on South (+Z)
    // Positioned flush proud of mainBody's +Z face (hd - 0.18) with deep bronze portal surround so interior glows warmly!
    const groundGlaze = new THREE.Mesh(unitBoxGeo, amberGlassMat);
    groundGlaze.scale.set(w - 2.6, 3.85, 0.18);
    groundGlaze.position.set(0, 0.36 + 1.92, hd - 0.08);
    group.add(groundGlaze);
    // Framed central double glass doors + warm bronze transom
    for (const dx of [-1.45, 0, 1.45]) {
      pushInst(metalEntries, spec.x + dx, 0.36 + 1.82, spec.z + hd + 0.04, 0.12, 3.65, 0.16, profile.metalTint);
    }
    pushInst(metalEntries, spec.x, 3.32, spec.z + hd + 0.04, w - 2.4, 0.14, 0.18, profile.metalTint);

    // Fluted bronze entrance portal columns & deep overhang canopy framing the compact outdoor seating terrace
    const canopySpan = w - 1.2;
    const canopyProj = profile.canopyProjection;
    const canopyMat = smoothTrimMat.clone();
    canopyMat.color.setHex(0x231b24);
    disposables.push(canopyMat);

    const canopy = new THREE.Mesh(unitBoxGeo, canopyMat);
    canopy.scale.set(canopySpan, 0.42, canopyProj);
    canopy.position.set(0, 4.35, hd + canopyProj * 0.5 - 0.08);
    canopy.castShadow = true;
    group.add(canopy);

    // Warm brushed bronze fascia edge + intimate amber soffit glow strip
    pushInst(metalEntries, spec.x, 4.35, spec.z + hd + canopyProj - 0.06, canopySpan + 0.1, 0.46, 0.1, profile.metalTint);
    pushInst(neonEntries.warm_gold, spec.x, 4.1, spec.z + hd + canopyProj * 0.5, canopySpan - 1.2, 0.07, 0.16, 0xffffff);

    // Four bronze entrance columns framing central entry & flanking outdoor lounge bays
    for (const cx of [-canopySpan * 0.46, -2.0, 2.0, canopySpan * 0.46]) {
      pushInst(columnEntries, spec.x + cx, 2.15, spec.z + hd + canopyProj - 0.26, 0.34, 4.3, 0.34, profile.metalTint);
      pushInst(trimEntries, spec.x + cx, 0.22, spec.z + hd + canopyProj - 0.26, 0.54, 0.44, 0.54, profile.trimTint);
    }

    // Compact Grounded Outdoor Lounge Seating Terrace (two intimate booth zones flanking the central entrance, strictly inside z <= 83.2!)
    for (const side of [-1, 1]) {
      const tx = spec.x + side * 4.25;
      const tz = spec.z + hd + 1.02;
      // Low stone terrace planter barrier
      pushInst(trimEntries, tx, 0.36, spec.z + hd + canopyProj - 0.14, 3.6, 0.72, 0.32, profile.trimTint);
      pushInst(foliageEntries, tx - 1.2, 0.88, spec.z + hd + canopyProj - 0.14, 0.65, 0.55, 0.55, 0x357a49);
      pushInst(foliageEntries, tx + 1.2, 0.88, spec.z + hd + canopyProj - 0.14, 0.65, 0.55, 0.55, 0x2b693e);
      // Warm timber cafe table & cushioned leather bench sofa
      pushInst(woodEntries, tx, 0.42, tz - 0.38, 2.2, 0.84, 0.68, 0x5c361e);
      pushInst(metalEntries, tx, 0.68, tz + 0.32, 1.3, 0.08, 0.72, profile.metalTint);
      pushInst(metalEntries, tx, 0.34, tz + 0.32, 0.14, 0.68, 0.14, 0x262128);
      // Intimate warm tabletop candle/lantern glow
      pushInst(neonEntries.warm_gold, tx, 0.84, tz + 0.32, 0.18, 0.22, 0.18, 0xffffff);
    }

    // Crisp AMBER LOUNGE Backlit Bronze Fascia Signboard mounted above canopy
    const signBack = new THREE.Mesh(unitBoxGeo, canopyMat);
    signBack.scale.set(6.2, 1.32, 0.26);
    signBack.position.set(0, 5.18, hd + canopyProj - 0.22);
    group.add(signBack);
    addSignPlane(group, 0, 5.18, hd + canopyProj - 0.07, 6.06, 1.2, 0, amberSignMat);
    signMeshCount++;

    // Secondary West (-X) Facade: Large warm bronze-framed windows + vertical timber fins
    for (const zOff of [-3.4, 3.4]) {
      const wWin = new THREE.Mesh(unitBoxGeo, amberGlassMat);
      wWin.scale.set(0.18, 4.6, 3.6);
      wWin.position.set(-hw + 0.12, 8.0, zOff);
      group.add(wWin);
      pushInst(metalEntries, spec.x - hw - 0.04, 10.35, spec.z + zOff, 0.24, 0.14, 3.8, profile.metalTint);
      pushInst(metalEntries, spec.x - hw - 0.04, 5.65, spec.z + zOff, 0.24, 0.14, 3.8, profile.metalTint);
    }
    for (let f = -2; f <= 2; f++) {
      pushInst(woodEntries, spec.x - hw - 0.12, 7.6, spec.z + f * 0.44, 0.2, 8.2, 0.11, 0x784a27);
    }

    // Rooftop Intimate Lounge Pergola Terrace (timber pergola, glass rails, warm amber lighting)
    const roofDeck = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    roofDeck.scale.set(w - 0.4, 0.24, d - 0.4);
    roofDeck.position.y = h + 0.12;
    roofDeck.receiveShadow = true;
    group.add(roofDeck);
    const deckY = h + 0.24;

    addRooftopTerracePerimeter(spec, deckY, w - 0.36, d - 0.36, profile.metalTint, 0x3b3136, 'amber', true);
    const pergolaTop = addRooftopPergola(
      spec.x,
      spec.z - 1.2,
      deckY,
      8.8,
      5.6,
      2.95,
      metalEntries,
      profile.metalTint,
      woodEntries,
      0x8f5b34,
      'warm_gold',
    );
    // Warm rooftop lounge seating & fire-pit centerpiece
    pushInst(trimEntries, spec.x, deckY + 0.32, spec.z + 2.8, 2.2, 0.64, 1.4, 0x453a38);
    pushInst(neonEntries.amber, spec.x, deckY + 0.68, spec.z + 2.8, 1.4, 0.12, 0.55, 0xffffff);

    return {
      id: spec.id,
      archetype: profile.archetype,
      signTitle: profile.signTitle,
      frontage: profile.frontage,
      secondaryFrontage: profile.secondaryFrontage,
      neonBand: profile.neonBand,
      canopyProjection: profile.canopyProjection,
      hasMarquee: profile.hasMarquee,
      hasVerticalSignTower: profile.hasVerticalSignTower,
      hasRooftopTerrace: profile.hasRooftopTerrace,
      signMeshCount,
      posterCount: 0,
      pinnacleY: pergolaTop,
    };
  };

  // =========================================================================
  // VENUE 4: VICE THEATER — SIGNATURE ART DECO LANDMARK (ent_theater_vice)
  // Inspired directly by Reference Image 3 ("CAMEO" South Beach Art Deco Theatre):
  // Stepped stucco-slate crown, recessed central glass-block feature grid, bold projecting
  // dimensional 3-face theatre marquee, vertical VICE THEATER sign tower, lobby doors & posters
  // =========================================================================
  const buildViceTheater = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: NeonMileVenueProfile,
  ): NeonMileVenueSummary => {
    const w = spec.width;
    const d = spec.depth;
    const h = spec.height;
    const hw = w * 0.5;
    const hd = d * 0.5;
    let signMeshCount = 0;
    let posterCount = 0;

    // Ground marble/terrazzo theatre lobby plinth
    const plinthMat = smoothTrimMat.clone();
    plinthMat.color.setHex(0x28263b);
    const bodyMat = matteWallMat.clone();
    bodyMat.color.setHex(profile.baseTint);
    const upperStuccoMat = smoothTrimMat.clone();
    upperStuccoMat.color.setHex(0x3a3754);
    const decoTrimMat = smoothTrimMat.clone();
    decoTrimMat.color.setHex(profile.trimTint);
    disposables.push(plinthMat, bodyMat, upperStuccoMat, decoTrimMat);

    const plinth = new THREE.Mesh(unitBoxGeo, plinthMat);
    plinth.scale.set(w * 0.99, 0.34, d * 0.99);
    plinth.position.y = 0.17;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Main theatre auditorium hall mass
    const mainBody = new THREE.Mesh(unitBoxGeo, bodyMat);
    mainBody.scale.set(w - 0.5, h - 0.34, d - 0.5);
    mainBody.position.y = 0.34 + (h - 0.34) * 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);
    environmentMeshesForCamera.push(mainBody);

    // Sculpted Art Deco Rounded Corner Pylons on South-West and South-East facade corners (like Cameo's rounded shoulders!)
    const pylonR = 1.65;
    const pylonH = h - 0.8;
    const sePylon = new THREE.Mesh(cornerPylonGeo, upperStuccoMat);
    sePylon.scale.set(pylonR, pylonH, pylonR);
    sePylon.position.set(hw - pylonR, 0.34, hd - pylonR);
    sePylon.castShadow = true;
    group.add(sePylon);

    const swPylon = new THREE.Mesh(cornerPylonGeo, upperStuccoMat);
    swPylon.scale.set(pylonR, pylonH, pylonR);
    swPylon.rotation.y = -Math.PI / 2;
    swPylon.position.set(-hw + pylonR, 0.34, hd - pylonR);
    swPylon.castShadow = true;
    group.add(swPylon);

    // Tall Stepped Central Art Deco Facade Frame + Iconic Recessed Illuminated Glass-Block Grid (Reference Image 3!)
    const centerFrameW = 7.4;
    const centerFrameH = h - 5.8;
    const centerFrame = new THREE.Mesh(unitBoxGeo, upperStuccoMat);
    centerFrame.scale.set(centerFrameW, centerFrameH, 0.65);
    centerFrame.position.set(0, 5.8 + centerFrameH * 0.5, hd - 0.1);
    centerFrame.castShadow = true;
    group.add(centerFrame);

    // Stepped nested Art Deco molding frames surrounding the glass-block feature window
    for (const [fw, fh, fz, col] of [
      [6.4, centerFrameH - 1.2, hd + 0.14, 0xd8cce6],
      [5.6, centerFrameH - 2.0, hd + 0.22, 0x261d3a],
    ] as Array<[number, number, number, number]>) {
      pushInst(trimEntries, spec.x, 5.8 + centerFrameH * 0.5, spec.z + fz, fw, fh, 0.16, col);
    }

    // Recessed Glowing Art Deco Glass-Block Window Grid
    const glassBlockPanel = new THREE.Mesh(unitBoxGeo, viceGlassBlockMat);
    glassBlockPanel.scale.set(4.8, centerFrameH - 2.8, 0.14);
    glassBlockPanel.position.set(0, 5.8 + centerFrameH * 0.5, hd + 0.28);
    group.add(glassBlockPanel);

    // Vertical Art Deco Fluted Fins & Violet/Pink Linear Accent Tubes on South Facade
    for (const fx of [-5.2, -4.4, 4.4, 5.2]) {
      pushInst(trimEntries, spec.x + fx, 6.2 + (h - 6.6) * 0.5, spec.z + hd + 0.16, 0.32, h - 6.8, 0.42, profile.trimTint);
    }
    for (const nx of [-3.9, 3.9]) {
      pushInst(neonEntries.violet, spec.x + nx, 6.4 + (h - 7.0) * 0.5, spec.z + hd + 0.34, 0.12, h - 7.4, 0.12, 0xffffff);
    }

    // Horizontal Art Deco Speed-Bands wrapping upper theatre facade & East (+X) avenue elevation
    for (const by of [6.0, h - 2.6, h - 0.35]) {
      pushInst(trimEntries, spec.x, by, spec.z + hd + 0.1, w - 0.6, 0.3, 0.3, profile.trimTint);
      pushInst(trimEntries, spec.x + hw + 0.1, by, spec.z, 0.3, 0.3, d - 0.6, profile.trimTint);
    }
    pushInst(neonEntries.violet, spec.x, h - 0.72, spec.z + hd + 0.28, w - 1.6, 0.16, 0.12, 0xffffff);
    pushInst(neonEntries.violet, spec.x + hw + 0.28, h - 0.72, spec.z, 0.12, 0.16, d - 1.6, 0xffffff);

    // --- SIGNATURE PROJECTING DIMENSIONAL TRAPEZOID THEATRE MARQUEE (on South +Z) ---
    const marqueeW = 9.2;
    const marqueeH = 2.05;
    const marqueeProj = profile.canopyProjection; // 2.45m (keeps 2.05m clear of z=85.5 sidewalk!)
    const marqueeBaseY = 3.8;

    const marqueeHull = new THREE.Mesh(marqueeGeo, plinthMat);
    marqueeHull.scale.set(marqueeW, marqueeH, marqueeProj);
    marqueeHull.position.set(0, marqueeBaseY, hd - 0.08);
    marqueeHull.castShadow = true;
    group.add(marqueeHull);

    // Upper & lower glowing rose-magenta / violet neon marquee perimeter trim frames
    const frontFaceW = marqueeW * 0.64; // matches shape's -0.32..+0.32 front flat face
    const frontZ = hd - 0.08 + marqueeProj;
    for (const ny of [marqueeBaseY + 0.14, marqueeBaseY + marqueeH - 0.14]) {
      // Front horizontal racing neon
      pushInst(neonEntries.magenta, spec.x, ny, spec.z + frontZ + 0.06, frontFaceW + 0.12, 0.12, 0.1, 0xffffff);
      // Angled left & right wing neon bars
      for (const side of [-1, 1]) {
        const x0 = side * (marqueeW * 0.5);
        const z0 = hd - 0.08 + marqueeProj * 0.36;
        const x1 = side * (marqueeW * 0.32);
        const z1 = frontZ;
        const dx = x1 - x0;
        const dz = z1 - z0;
        const wingLen = Math.hypot(dx, dz);
        const angY = Math.atan2(dx, dz);
        pushInst(
          neonEntries.violet,
          spec.x + (x0 + x1) * 0.5 + side * 0.06,
          ny,
          spec.z + (z0 + z1) * 0.5 + 0.04,
          0.1,
          0.12,
          wingLen,
          0xffffff,
          angY,
        );
      }
    }

    // Crisp Readable Marquee Letterboards on Front Face AND Both Angled Side Wings!
    addSignPlane(
      group,
      0,
      marqueeBaseY + marqueeH * 0.5,
      frontZ + 0.04,
      frontFaceW - 0.18,
      marqueeH - 0.36,
      0,
      viceMarqueeFrontMat,
    );
    signMeshCount++;

    for (const side of [-1, 1]) {
      const x0 = side * (marqueeW * 0.5);
      const z0 = hd - 0.08 + marqueeProj * 0.36;
      const x1 = side * (marqueeW * 0.32);
      const z1 = frontZ;
      const dx = x1 - x0;
      const dz = z1 - z0;
      const wingLen = Math.hypot(dx, dz);
      // Outward normal of the angled wing in XZ:
      // For right side (+1): edge from (x0,z0) to (x1,z1) has dx<0, dz>0 -> outward normal (+dz, -dx)
      // For left side (-1): edge from (x1,z1) to (x0,z0) has dx<0, dz<0 -> outward normal (-dz, +dx) -> (+z, -x)
      const nx = side * (dz / wingLen);
      const nz = Math.abs(dx) / wingLen;
      const rotY = Math.atan2(nx, nz);
      addSignPlane(
        group,
        (x0 + x1) * 0.5 + nx * 0.04,
        marqueeBaseY + marqueeH * 0.5,
        (z0 + z1) * 0.5 + nz * 0.04,
        wingLen - 0.18,
        marqueeH - 0.36,
        rotY,
        viceMarqueeSideMat,
      );
      signMeshCount++;
    }

    // Warm Golden Cinema Marquee Soffit Bulbs glowing underneath the marquee overhang!
    for (let gx = -2.8; gx <= 2.8; gx += 1.4) {
      for (let gz = 0.65; gz <= marqueeProj - 0.45; gz += 0.78) {
        pushInst(neonEntries.warm_gold, spec.x + gx, marqueeBaseY - 0.04, spec.z + hd + gz, 0.24, 0.08, 0.24, 0xffffff);
      }
    }

    // Flanking Neon-Trimmed Entrance Wing Canopies on South (+Z) left & right of marquee
    for (const side of [-1, 1]) {
      const wx = spec.x + side * (marqueeW * 0.5 + 1.55);
      pushInst(trimEntries, wx, marqueeBaseY + 0.26, spec.z + hd + 0.68, 3.0, 0.34, 1.36, 0x2a243d);
      pushInst(neonEntries.magenta, wx, marqueeBaseY + 0.26, spec.z + hd + 1.38, 3.0, 0.1, 0.09, 0xffffff);
    }

    // --- TICKET-LOBBY FRONTAGE: Central Box Office, Multiple Glazed Entry Doors & 4 Backlit Poster Cases ---
    // Mounted flush proud of mainBody's +Z face (hd - 0.25) so warm cinema lobby glow is fully visible!
    const lobbyGlass = new THREE.Mesh(unitBoxGeo, amberGlassMat);
    lobbyGlass.scale.set(7.6, 3.45, 0.18);
    lobbyGlass.position.set(0, 0.34 + 1.72, hd - 0.14);
    group.add(lobbyGlass);

    // Three pairs of bronze-framed glazed theatre doors + central ticket booth kiosk
    for (const dx of [-3.75, -2.5, -1.25, 1.25, 2.5, 3.75]) {
      pushInst(metalEntries, spec.x + dx, 0.34 + 1.68, spec.z + hd - 0.02, 0.12, 3.35, 0.18, profile.metalTint);
    }
    pushInst(metalEntries, spec.x, 3.32, spec.z + hd - 0.02, 7.6, 0.14, 0.18, profile.metalTint);
    // Central Art Deco rounded ticket booth kiosk
    pushInst(trimEntries, spec.x, 0.34 + 0.6, spec.z + hd + 0.32, 1.55, 1.2, 1.05, 0x2c2240);
    pushInst(metalEntries, spec.x, 0.34 + 1.85, spec.z + hd + 0.32, 1.48, 1.3, 0.98, profile.metalTint);
    pushInst(neonEntries.warm_gold, spec.x, 0.34 + 2.6, spec.z + hd + 0.32, 1.42, 0.14, 0.94, 0xffffff);

    // Four Procedural Movie/Show Poster Display Cases flanking the lobby & East entrance wall!
    const posterPlacements: Array<{ x: number; z: number; rotY: number }> = [
      { x: -6.1, z: hd + 0.06, rotY: 0 },
      { x: -4.6, z: hd + 0.06, rotY: 0 },
      { x: 4.6, z: hd + 0.06, rotY: 0 },
      { x: 6.1, z: hd + 0.06, rotY: 0 },
    ];
    posterPlacements.forEach((pp, idx) => {
      // Recessed chrome poster showcase box
      pushInst(metalEntries, spec.x + pp.x, 2.1, spec.z + pp.z - 0.06, 1.18, 1.72, 0.14, profile.metalTint);
      addSignPlane(group, pp.x, 2.1, pp.z + 0.03, 1.04, 1.56, pp.rotY, posterMats[idx % posterMats.length]);
      posterCount++;
    });

    // --- ICONIC VERTICAL ARCHITECTURAL SIGN TOWER ("VICE THEATER") on South-East Corner ---
    const towerH = 14.2;
    const towerW = 2.15;
    const towerY = 8.4 + towerH * 0.5;
    const towerX = hw - 0.4;
    const towerZ = hd + 1.05;
    const signTowerBody = new THREE.Mesh(unitBoxGeo, plinthMat);
    signTowerBody.scale.set(0.42, towerH, towerW);
    signTowerBody.position.set(towerX, towerY, towerZ);
    signTowerBody.castShadow = true;
    group.add(signTowerBody);

    // Horizontal steel brackets tying vertical sign tower into the South-East corner pylon
    for (const by of [towerY - 5.2, towerY, towerY + 5.2]) {
      pushInst(metalEntries, spec.x + towerX, by, spec.z + hd + 0.18, 0.22, 0.24, 1.0, profile.metalTint);
    }
    // Glowing violet neon vertical spine & Art Deco stepped finial crowning the sign tower
    pushInst(neonEntries.violet, spec.x + towerX, towerY, spec.z + towerZ + towerW * 0.5 + 0.08, 0.16, towerH + 0.6, 0.16, 0xffffff);
    pushInst(neonEntries.magenta, spec.x + towerX, towerY + towerH * 0.5 + 0.55, spec.z + towerZ, 0.26, 0.9, 0.72, 0xffffff);

    // Double-sided crisp readable VICE THEATER vertical sign faces (facing East +X and West -X)
    addSignPlane(group, towerX + 0.23, towerY, towerZ, towerW - 0.16, towerH - 0.28, Math.PI / 2, viceVerticalBladeMat);
    addSignPlane(group, towerX - 0.23, towerY, towerZ, towerW - 0.16, towerH - 0.28, -Math.PI / 2, viceVerticalBladeMat);
    signMeshCount += 2;

    // Secondary East (+X) Facade: Art Deco vertical relief fins + warm glazed exit bay
    for (const zOff of [-3.6, 0, 3.6]) {
      pushInst(trimEntries, spec.x + hw + 0.12, 6.0 + (h - 6.5) * 0.5, spec.z + zOff, 0.34, h - 6.8, 0.42, profile.trimTint);
    }
    const eastAccentGlass = new THREE.Mesh(unitBoxGeo, viceGlassBlockMat);
    eastAccentGlass.scale.set(0.16, 7.6, 3.2);
    eastAccentGlass.position.set(hw - 0.1, 12.2, 0);
    group.add(eastAccentGlass);

    // --- DISTINCTIVE STEPPED ART DECO ROOFTOP CROWN & SILHOUETTE ---
    const roofDeck = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    roofDeck.scale.set(w - 0.5, 0.26, d - 0.5);
    roofDeck.position.y = h + 0.13;
    group.add(roofDeck);

    const crownH = 4.6;
    const crown = new THREE.Mesh(decoCrownGeo, decoTrimMat);
    crown.scale.set(9.6, crownH, 1.2);
    crown.position.set(0, h + 0.18, hd - 0.85);
    crown.castShadow = true;
    group.add(crown);

    // Authentic Miami Art Deco Triple-Fin Stepped Neon Crest on the theatre crown (no horizontal crossbar!)
    pushInst(neonEntries.violet, spec.x, h + 0.18 + crownH * 0.56, spec.z + hd - 0.16, 0.22, crownH * 0.78, 0.18, 0xffffff);
    pushInst(neonEntries.magenta, spec.x - 1.15, h + 0.18 + crownH * 0.38, spec.z + hd - 0.16, 0.18, crownH * 0.5, 0.18, 0xffffff);
    pushInst(neonEntries.magenta, spec.x + 1.15, h + 0.18 + crownH * 0.38, spec.z + hd - 0.16, 0.18, crownH * 0.5, 0.18, 0xffffff);
    pushInst(neonEntries.violet, spec.x - 2.2, h + 0.18 + crownH * 0.24, spec.z + hd - 0.16, 0.15, crownH * 0.3, 0.18, 0xffffff);
    pushInst(neonEntries.violet, spec.x + 2.2, h + 0.18 + crownH * 0.24, spec.z + hd - 0.16, 0.15, crownH * 0.3, 0.18, 0xffffff);

    // Screened stagehouse fly-tower volume behind the Art Deco crown (authentic cinema architecture!)
    const flyTower = new THREE.Mesh(unitBoxGeo, bodyMat);
    flyTower.scale.set(w * 0.56, 3.2, d * 0.46);
    flyTower.position.set(0, h + 0.26 + 1.6, -1.6);
    flyTower.castShadow = true;
    group.add(flyTower);

    const pinnacleY = Math.max(h + 0.18 + crownH, towerY + towerH * 0.5 + 1.0);
    return {
      id: spec.id,
      archetype: profile.archetype,
      signTitle: profile.signTitle,
      frontage: profile.frontage,
      secondaryFrontage: profile.secondaryFrontage,
      neonBand: profile.neonBand,
      canopyProjection: profile.canopyProjection,
      hasMarquee: profile.hasMarquee,
      hasVerticalSignTower: profile.hasVerticalSignTower,
      hasRooftopTerrace: profile.hasRooftopTerrace,
      signMeshCount,
      posterCount,
      pinnacleY,
    };
  };

  // =========================================================================
  // VENUE 5: SOUTH CLUB — LARGE SOUTHERN NIGHTLIFE VENUE (south_club_1)
  // Wide 24m frontage inspired by Reference Image 4 ("ELETOKYO") + grand Miami supper club:
  // Flanking 3D champagne-gold geometric lattice screens over backlit amber-gold walls,
  // prominent central recessed VIP entrance, long illuminated canopy, queue area & rooftop deck
  // =========================================================================
  const buildSouthClub = (
    group: THREE.Group,
    spec: BuildingSpec,
    profile: NeonMileVenueProfile,
  ): NeonMileVenueSummary => {
    const w = spec.width; // 24m wide!
    const d = spec.depth; // 14m deep
    const h = spec.height; // 17m tall
    const hw = w * 0.5;
    const hd = d * 0.5;
    let signMeshCount = 0;

    // Ground dark obsidian plinth
    const darkObsidianMat = smoothTrimMat.clone();
    darkObsidianMat.color.setHex(0x141722);
    const mainWallMat = matteWallMat.clone();
    mainWallMat.color.setHex(profile.baseTint);
    const upperTierMat = matteWallMat.clone();
    upperTierMat.color.setHex(profile.secondaryWallTint);
    disposables.push(darkObsidianMat, mainWallMat, upperTierMat);

    const plinth = new THREE.Mesh(unitBoxGeo, darkObsidianMat);
    plinth.scale.set(w * 0.99, 0.34, d * 0.99);
    plinth.position.y = 0.17;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Layered Lower Grand Hall (full 24m width, height 9.6m) + Setback Upper VIP Tier (20.4m wide, top 7.4m)
    const lowerH = 9.6;
    const upperH = h - lowerH;

    const lowerMass = new THREE.Mesh(unitBoxGeo, mainWallMat);
    lowerMass.scale.set(w - 0.3, lowerH - 0.34, d - 0.3);
    lowerMass.position.y = 0.34 + (lowerH - 0.34) * 0.5;
    lowerMass.castShadow = true;
    lowerMass.receiveShadow = true;
    group.add(lowerMass);
    environmentMeshesForCamera.push(lowerMass);

    const upperW = w - 3.4;
    const upperD = d - 1.6;
    const upperMass = new THREE.Mesh(unitBoxGeo, upperTierMat);
    upperMass.scale.set(upperW, upperH, upperD);
    upperMass.position.set(0, lowerH + upperH * 0.5, 0.45);
    upperMass.castShadow = true;
    upperMass.receiveShadow = true;
    group.add(upperMass);
    environmentMeshesForCamera.push(upperMass);

    // --- SIGNATURE 3D CHAMPAGNE-GOLD GEOMETRIC LATTICE FACADE SCREENS (North -Z Left & Right Wings!) ---
    // Inspired directly by Reference Image 4 ("ELETOKYO"): backlit amber-gold wall behind real 3D diagonal diamond lattice!
    const latticeYCenter = 3.55;
    const latticeH = 6.2;
    const latticeW = 7.4;
    for (const side of [-1, 1]) {
      const wingCenterX = side * 7.55;

      // Backlit warm amber-gold inner glow panel
      const backlitPanel = new THREE.Mesh(unitBoxGeo, southBacklitWallMat);
      backlitPanel.scale.set(latticeW, latticeH, 0.16);
      backlitPanel.position.set(wingCenterX, latticeYCenter, -hd + 0.08);
      group.add(backlitPanel);

      // Outer brushed champagne-gold frame perimeter
      pushInst(metalEntries, spec.x + wingCenterX, latticeYCenter + latticeH * 0.5, spec.z - hd - 0.14, latticeW + 0.24, 0.18, 0.32, profile.metalTint);
      pushInst(metalEntries, spec.x + wingCenterX, latticeYCenter - latticeH * 0.5, spec.z - hd - 0.14, latticeW + 0.24, 0.18, 0.32, profile.metalTint);
      pushInst(metalEntries, spec.x + wingCenterX - latticeW * 0.5, latticeYCenter, spec.z - hd - 0.14, 0.18, latticeH, 0.32, profile.metalTint);
      pushInst(metalEntries, spec.x + wingCenterX + latticeW * 0.5, latticeYCenter, spec.z - hd - 0.14, 0.18, latticeH, 0.32, profile.metalTint);

      // 3D Diagonal Champagne-Gold Diamond Lattice Bars (instanced, proud of backlit wall by 0.22m!)
      const cols = 4;
      const rows = 3;
      const cellW = latticeW / cols;
      const cellH = latticeH / rows;
      const diagLen = Math.hypot(cellW, cellH);
      const diagAng = Math.atan2(cellH, cellW);
      for (let r = 0; r < rows; r++) {
        const cy = latticeYCenter - latticeH * 0.5 + (r + 0.5) * cellH;
        for (let c = 0; c < cols; c++) {
          const cx = spec.x + wingCenterX - latticeW * 0.5 + (c + 0.5) * cellW;
          pushInst(metalEntries, cx, cy, spec.z - hd - 0.18, diagLen, 0.12, 0.16, profile.metalTint, 0, diagAng);
          pushInst(metalEntries, cx, cy, spec.z - hd - 0.18, diagLen, 0.12, 0.16, profile.metalTint, 0, -diagAng);
        }
      }
    }

    // Matte-Black Upper Fascia Band above Lattice Screens (exact visual balance of Reference Image 4!)
    const fasciaBand = new THREE.Mesh(unitBoxGeo, darkObsidianMat);
    fasciaBand.scale.set(w + 0.16, 2.55, 0.55);
    fasciaBand.position.set(0, 8.2, -hd - 0.14);
    fasciaBand.castShadow = true;
    group.add(fasciaBand);

    // Crisp Readable SOUTH CLUB Champagne-Gold Signage centered on the Obsidian Fascia Band
    addSignPlane(group, 0, 8.2, -hd - 0.44, 9.6, 2.12, Math.PI, southClubSignMat);
    signMeshCount++;

    // Amber architectural hairline trim along top & bottom of fascia band
    pushInst(neonEntries.amber, spec.x, 9.52, spec.z - hd - 0.44, w - 0.4, 0.13, 0.11, 0xffffff);
    pushInst(neonEntries.warm_gold, spec.x, 6.86, spec.z - hd - 0.44, w - 0.4, 0.11, 0.1, 0xffffff);

    // --- PROMINENT CENTRAL RECESSED METALLIC VIP ENTRANCE PORTAL & LONG ILLUMINATED CANOPY ---
    // Mounted flush proud of lowerMass's -Z wall (-hd + 0.15) so warm illuminated triple-bay doors shine cleanly!
    const portalGlaze = new THREE.Mesh(unitBoxGeo, amberGlassMat);
    portalGlaze.scale.set(6.8, 4.55, 0.18);
    portalGlaze.position.set(0, 0.34 + 2.28, -hd + 0.04);
    group.add(portalGlaze);

    // Multiple Glazed Entrance Bays (3 double doors framed in brushed champagne gold)
    for (const dx of [-3.3, -1.1, 1.1, 3.3]) {
      pushInst(metalEntries, spec.x + dx, 0.34 + 2.25, spec.z - hd - 0.08, 0.2, 4.5, 0.26, profile.metalTint);
    }
    pushInst(metalEntries, spec.x, 0.34 + 4.55, spec.z - hd - 0.08, 6.9, 0.24, 0.28, profile.metalTint);
    pushInst(metalEntries, spec.x, 3.38, spec.z - hd - 0.08, 6.7, 0.14, 0.22, profile.metalTint);

    // Long Illuminated Modern Entrance Canopy (11.6m wide, projecting 1.75m -> stays strictly at z >= 107.25!)
    const canopySpan = 11.6;
    const canopyProj = profile.canopyProjection; // 1.75m
    const canopy = new THREE.Mesh(unitBoxGeo, darkObsidianMat);
    canopy.scale.set(canopySpan, 0.44, canopyProj);
    canopy.position.set(0, 4.85, -hd - canopyProj * 0.5 + 0.06);
    canopy.castShadow = true;
    group.add(canopy);

    // Brushed gold fascia lip & glowing warm-amber canopy soffit downlights
    pushInst(metalEntries, spec.x, 4.85, spec.z - hd - canopyProj + 0.04, canopySpan + 0.1, 0.48, 0.1, profile.metalTint);
    pushInst(neonEntries.amber, spec.x, 4.85, spec.z - hd - canopyProj - 0.02, canopySpan - 0.4, 0.11, 0.08, 0xffffff);
    for (let lx = -4.6; lx <= 4.6; lx += 1.84) {
      pushInst(neonEntries.warm_gold, spec.x + lx, 4.6, spec.z - hd - canopyProj * 0.52, 0.34, 0.08, 0.34, 0xffffff);
    }
    // Supporting brushed-gold entrance columns
    for (const cx of [-canopySpan * 0.46, -3.5, 3.5, canopySpan * 0.46]) {
      pushInst(columnEntries, spec.x + cx, 2.4, spec.z - hd - canopyProj + 0.28, 0.34, 4.8, 0.34, profile.metalTint);
    }

    // Ground-Level Stepped Arrival & VIP Queue Area strictly within property clearance (proj 1.65m -> z >= 107.35!)
    addVipArrivalQueue(spec, '-z', 1.65, 3.6, 0x7f1d1d, profile.metalTint);
    // Flanking sculptural entrance planters
    for (const side of [-1, 1]) {
      pushInst(trimEntries, spec.x + side * 4.5, 0.4, spec.z - hd - 0.72, 0.92, 0.8, 0.92, 0x1b2030);
      pushInst(foliageEntries, spec.x + side * 4.5, 1.0, spec.z - hd - 0.72, 0.85, 0.76, 0.85, 0x2d7c47);
    }

    // --- UPPER LAYERED GLAZING BAYS & SIDE FACADE ARTICULATION ---
    const upperGlassN = new THREE.Mesh(unitBoxGeo, darkReflectiveGlassMat);
    upperGlassN.scale.set(upperW - 1.6, upperH - 1.8, 0.18);
    upperGlassN.position.set(0, lowerH + upperH * 0.5, 0.45 - upperD * 0.5 - 0.02);
    group.add(upperGlassN);

    // Subtle warmly lit VIP lounge interior bays inset behind the upper champagne-gold mullions
    for (const ux of [-5.8, 0, 5.8]) {
      const vipBay = new THREE.Mesh(unitBoxGeo, amberGlassMat);
      vipBay.scale.set(4.1, upperH - 2.2, 0.14);
      vipBay.position.set(ux, lowerH + upperH * 0.5, 0.45 - upperD * 0.5 - 0.06);
      group.add(vipBay);
    }

    // Champagne-gold vertical mullions across wide upper glazing facade
    const uMullions = 8;
    for (let i = 0; i <= uMullions; i++) {
      const mx = spec.x - (upperW - 1.6) * 0.5 + (i / uMullions) * (upperW - 1.6);
      pushInst(metalEntries, mx, lowerH + upperH * 0.5, spec.z + 0.45 - upperD * 0.5 - 0.1, 0.14, upperH - 1.5, 0.22, profile.metalTint);
    }

    // Side East/West lower terrace coping & accent strips
    for (const side of [-1, 1]) {
      pushInst(neonEntries.amber, spec.x + side * (hw + 0.08), 9.52, spec.z, 0.1, 0.13, d - 0.8, 0xffffff);
      const sideGlass = new THREE.Mesh(unitBoxGeo, amberGlassMat);
      sideGlass.scale.set(0.18, 4.4, d - 4.0);
      sideGlass.position.set(side * (hw - 0.08), 4.6, 0);
      group.add(sideGlass);
    }

    // --- GRAND ROOFTOP EVENT TERRACE (Full-width upper deck with pavilion pergola, glass rails, bar & lounge) ---
    const roofDeck = new THREE.Mesh(unitBoxGeo, roofDeckMat);
    roofDeck.scale.set(upperW - 0.3, 0.24, upperD - 0.3);
    roofDeck.position.set(0, h + 0.12, 0.45);
    roofDeck.receiveShadow = true;
    group.add(roofDeck);
    const deckY = h + 0.24;

    const upperCenterSpec: BuildingSpec = { ...spec, z: spec.z + 0.45 };
    addRooftopTerracePerimeter(upperCenterSpec, deckY, upperW, upperD, profile.metalTint, 0x1a2030, 'amber', true);

    // Grand Rooftop Event Pavilion Pergola + Bar & Seating
    const pergolaTop = addRooftopPergola(
      spec.x,
      spec.z + 1.4,
      deckY,
      12.6,
      5.8,
      3.25,
      darkSteelEntries,
      0x202738,
      metalEntries,
      profile.metalTint,
      'warm_gold',
    );
    pushInst(trimEntries, spec.x, deckY + 0.56, spec.z + 3.2, 7.6, 1.12, 1.15, 0x181e2c);
    pushInst(neonEntries.amber, spec.x, deckY + 1.0, spec.z + 2.58, 7.4, 0.1, 0.08, 0xffffff);
    for (const sx of [-6.4, 6.4]) {
      pushInst(carpetEntries, spec.x + sx, deckY + 0.38, spec.z - 1.2, 3.2, 0.76, 1.1, 0x7c2d12);
      pushInst(trimEntries, spec.x + sx, deckY + 0.24, spec.z + 0.4, 1.8, 0.48, 0.9, 0x202636);
    }

    return {
      id: spec.id,
      archetype: profile.archetype,
      signTitle: profile.signTitle,
      frontage: profile.frontage,
      secondaryFrontage: profile.secondaryFrontage,
      neonBand: profile.neonBand,
      canopyProjection: profile.canopyProjection,
      hasMarquee: profile.hasMarquee,
      hasVerticalSignTower: profile.hasVerticalSignTower,
      hasRooftopTerrace: profile.hasRooftopTerrace,
      signMeshCount,
      posterCount: 0,
      pinnacleY: pergolaTop,
    };
  };

  // 5. Build each Neon Mile venue with its dedicated archetype generator
  const venueSummaries: NeonMileVenueSummary[] = [];
  const archetypesUsedSet = new Set<NeonMileVenueArchetype>();

  for (const spec of venueSpecs) {
    const profile = resolveNeonMileProfile(spec);
    archetypesUsedSet.add(profile.archetype);

    const group = new THREE.Group();
    group.name = `neon_mile_${spec.id}`;
    group.position.set(spec.x, 0, spec.z);

    let summary: NeonMileVenueSummary;
    switch (profile.archetype) {
      case 'velvet_deco_nightclub':
        summary = buildVelvetClub(group, spec, profile);
        break;
      case 'solaris_glass_nightclub':
        summary = buildSolarisClub(group, spec, profile);
        break;
      case 'amber_luxury_lounge':
        summary = buildAmberLounge(group, spec, profile);
        break;
      case 'vice_deco_theater':
        summary = buildViceTheater(group, spec, profile);
        break;
      case 'south_grand_club':
      default:
        summary = buildSouthClub(group, spec, profile);
        break;
    }

    root.add(group);
    venueSummaries.push(summary);
  }

  // 6. Commit all batched InstancedMeshes with computeBoundingSphere() & full disposal registration
  let instancedBatches = 0;
  let totalFacadeInstances = 0;
  const tmpColor = new THREE.Color();

  const commitBatch = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    entries: InstanceEntry[],
    castShadow = true,
    receiveShadow = true,
  ) => {
    if (entries.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, entries.length);
    inst.name = `neon_mile_inst_${name}`;
    for (let i = 0; i < entries.length; i++) {
      inst.setMatrixAt(i, entries[i].matrix);
      inst.setColorAt(i, tmpColor.setHex(entries[i].colorHex));
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = castShadow;
    inst.receiveShadow = receiveShadow;
    inst.computeBoundingSphere();
    root.add(inst);
    disposables.push(inst);
    instancedBatches++;
    totalFacadeInstances += entries.length;
  };

  commitBatch('trim', unitBoxGeo, smoothTrimMat, trimEntries, true, true);
  commitBatch('metal', unitBoxGeo, brushedMetalMat, metalEntries, true, true);
  commitBatch('dark_steel', unitBoxGeo, darkSteelMat, darkSteelEntries, true, true);
  commitBatch('wood', unitBoxGeo, warmWoodMat, woodEntries, true, true);
  commitBatch('carpet', unitBoxGeo, velvetCarpetMat, carpetEntries, false, true);
  commitBatch('columns', unitCylGeo, brushedMetalMat, columnEntries, true, true);
  commitBatch('glass_rails', unitBoxGeo, glassRailingMat, glassRailEntries, false, false);
  commitBatch('foliage', foliageGeo, foliageMat, foliageEntries, true, true);
  commitBatch('neon_magenta', unitBoxGeo, neonMaterials.magenta, neonEntries.magenta, false, false);
  commitBatch('neon_cyan', unitBoxGeo, neonMaterials.cyan, neonEntries.cyan, false, false);
  commitBatch('neon_amber', unitBoxGeo, neonMaterials.amber, neonEntries.amber, false, false);
  commitBatch('neon_violet', unitBoxGeo, neonMaterials.violet, neonEntries.violet, false, false);
  commitBatch('neon_warm_gold', unitBoxGeo, neonMaterials.warm_gold, neonEntries.warm_gold, false, false);

  return {
    totalCount: venueSummaries.length,
    instancedBatches,
    totalFacadeInstances,
    sharedMaterialCount: sharedCoreMaterials.length,
    signageMaterialCount: signageMaterials.length,
    archetypesUsed: Array.from(archetypesUsedSet),
    venues: venueSummaries,
  };
}
