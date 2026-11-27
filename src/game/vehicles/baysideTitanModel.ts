import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import type { VehicleRig } from './vehicleModels';
import { getVehiclePaintMaterialProfile } from './vehicleModels';
import {
  BAYSIDE_TITAN_DIMS,
  TitanWheelParts,
  buildTitanBodyShellGeometry,
  buildTitanExteriorDetailsGeometry,
  buildTitanFrontFasciaGeometry,
  buildTitanInteriorGeometries,
  buildTitanPillarsGeometry,
  buildTitanRearFasciaGeometry,
  buildTitanRearGlassGeometry,
  buildTitanRoofGeometry,
  buildTitanSideWindowGeometry,
  buildTitanWheelParts,
  buildTitanWindshieldGeometry,
} from './baysideTitanGeometry';

interface BaysideTitanSharedCache {
  geometries: {
    bodyShell: THREE.BufferGeometry;
    paintedRoof: THREE.BufferGeometry;
    moonroofGlass: THREE.BufferGeometry;
    roofRails: THREE.BufferGeometry;
    roofSpoiler: THREE.BufferGeometry;
    windshield: THREE.BufferGeometry;
    rearGlass: THREE.BufferGeometry;
    sideWindowL: THREE.BufferGeometry;
    sideWindowR: THREE.BufferGeometry;
    glossPillars: THREE.BufferGeometry;
    satinWindowTrim: THREE.BufferGeometry;
    grilleSatin: THREE.BufferGeometry;
    grilleMesh: THREE.BufferGeometry;
    bumperMatte: THREE.BufferGeometry;
    skidPlateSatin: THREE.BufferGeometry;
    hlHousings: THREE.BufferGeometry;
    hlChromeBezels: THREE.BufferGeometry;
    hlEmissiveOptics: THREE.BufferGeometry;
    hlAmberMarkers: THREE.BufferGeometry;
    hlClearLenses: THREE.BufferGeometry;
    taillightEmissive: THREE.BufferGeometry;
    rearDarkHousing: THREE.BufferGeometry;
    rearSatinTrim: THREE.BufferGeometry;
    exhaustOuter: THREE.BufferGeometry;
    exhaustInner: THREE.BufferGeometry;
    licensePlate: THREE.BufferGeometry;
    rearEmblem: THREE.BufferGeometry;
    hoodEmblem: THREE.BufferGeometry;
    fenderFlaresAndCladding: THREE.BufferGeometry;
    sideStepsSatin: THREE.BufferGeometry;
    mirrorHousings: THREE.BufferGeometry;
    mirrorStalks: THREE.BufferGeometry;
    mirrorGlass: THREE.BufferGeometry;
    satinHandlesAndBadges: THREE.BufferGeometry;
    underbodyAndLiners: THREE.BufferGeometry;
    wipers: THREE.BufferGeometry;
    panelSeams: THREE.BufferGeometry;
    cabinTub: THREE.BufferGeometry;
    leatherSeats: THREE.BufferGeometry;
    satinInteriorTrim: THREE.BufferGeometry;
    dashboard: THREE.BufferGeometry;
    steeringWheel: THREE.BufferGeometry;
    cockpitDisplay: THREE.BufferGeometry;
    rearViewMirror: THREE.BufferGeometry;
    wheel: TitanWheelParts;
  };
  textures: {
    brushedMetalMap: THREE.Texture | null;
    grilleMeshMap: THREE.Texture | null;
    allTerrainTreadMap: THREE.Texture | null;
    rotorMap: THREE.Texture | null;
    cockpitMap: THREE.Texture | null;
    plateMap: THREE.Texture | null;
    rearEmblemMap: THREE.Texture | null;
    hoodEmblemMap: THREE.Texture | null;
  };
}

let sharedCache: BaysideTitanSharedCache | null = null;

function makeCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function buildBrushedAluminumTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    128,
    64,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#c6d0dc');
      grad.addColorStop(0.5, '#dde5ef');
      grad.addColorStop(1, '#bcc7d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let y = 1; y < h; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(40, 52, 68, 0.16)';
      for (let y = 2; y < h; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    },
    2,
    1,
  );
}

function buildSuvGrilleMeshTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#090c11';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#252c38';
      ctx.lineWidth = 2.4;
      const step = 14;
      for (let y = -h; y < h * 2; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + w * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w, y);
        ctx.lineTo(0, y + w * 0.5);
        ctx.stroke();
      }
    },
    4,
    2,
  );
}

function buildAllTerrainTreadTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#15181e';
      ctx.fillRect(0, 0, w, h);

      // Deep all-terrain circumferential mud/water evacuation channels
      ctx.fillStyle = '#0b0d12';
      for (const gx of [34, 62, 90]) {
        ctx.fillRect(gx, 0, 6, h);
      }

      // Bold staggered all-terrain shoulder lugs and center traction blocks
      ctx.fillStyle = '#232832';
      for (let y = 0; y < h; y += 16) {
        ctx.fillRect(4, y + 2, 26, 11);
        ctx.fillRect(98, y + 8, 26, 11);
        ctx.fillRect(42, y + 4, 18, 10);
        ctx.fillRect(70, y + 10, 18, 10);
      }

      // Micro-sipes across tread blocks for wet coastal tarmac grip look
      ctx.strokeStyle = '#0e1117';
      ctx.lineWidth = 1.6;
      for (let y = 6; y < h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(6, y);
        ctx.lineTo(28, y + 3);
        ctx.moveTo(100, y + 5);
        ctx.lineTo(122, y + 2);
        ctx.stroke();
      }
    },
    1,
    5,
  );
}

function buildSuvBrakeRotorTexture(): THREE.Texture | null {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#9aa4b4';
    ctx.fillRect(0, 0, w, h);
    for (let r = 22; r < 60; r += 3) {
      ctx.strokeStyle = r % 6 === 0 ? '#b7c0ce' : '#7f8999';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-drilled SUV heavy-duty cooling vents
    ctx.fillStyle = '#232833';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#272d38';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

function buildSuvCockpitDisplayTexture(): THREE.Texture | null {
  return makeCanvasTexture(320, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0a111c';
    ctx.fillRect(0, 0, w, h);

    // Driver digital instrument cluster (left half)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (const cx of [48, 114]) {
      ctx.beginPath();
      ctx.arc(cx, 52, 24, Math.PI * 0.78, Math.PI * 2.22);
      ctx.stroke();
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AWD', 81, 56);

    // Panoramic coastal topography & terrain mode display (right half)
    ctx.fillStyle = '#112031';
    ctx.fillRect(160, 12, 148, 72);
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 12, 148, 72);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('BAYSIDE TITAN', 234, 38);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(176, 52, 116, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('COASTAL ALL-TERRAIN', 234, 72);
  });
}

function buildTitanLicensePlateTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f0fdfa');
    grad.addColorStop(0.55, '#d5f3ee');
    grad.addColorStop(1, '#99ddd4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#163847';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#0f5c6e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VICE COAST', w / 2, 34);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 46px sans-serif';
    ctx.fillText('TITAN', w / 2, 94);
  });
}

function buildTitanRearEmblemTexture(): THREE.Texture | null {
  return makeCanvasTexture(384, 48, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B A Y S I D E   T I T A N', w / 2, h / 2);
  });
}

function buildTitanHoodEmblemTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 48, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T  I  T  A  N', w / 2, h / 2);
  });
}

function getSharedCache(): BaysideTitanSharedCache {
  if (sharedCache) return sharedCache;

  const bodyShell = buildTitanBodyShellGeometry();
  const roof = buildTitanRoofGeometry();
  const windshield = buildTitanWindshieldGeometry();
  const rearGlass = buildTitanRearGlassGeometry();
  const sideWindowL = buildTitanSideWindowGeometry(-1);
  const sideWindowR = buildTitanSideWindowGeometry(1);
  const pillars = buildTitanPillarsGeometry();
  const front = buildTitanFrontFasciaGeometry();
  const rear = buildTitanRearFasciaGeometry();
  const ext = buildTitanExteriorDetailsGeometry();
  const interior = buildTitanInteriorGeometries();
  const wheel = buildTitanWheelParts(BAYSIDE_TITAN_DIMS.wheelWidth);

  sharedCache = {
    geometries: {
      bodyShell,
      paintedRoof: roof.paintedRoof,
      moonroofGlass: roof.moonroofGlass,
      roofRails: roof.roofRails,
      roofSpoiler: roof.roofSpoiler,
      windshield,
      rearGlass,
      sideWindowL,
      sideWindowR,
      glossPillars: pillars.glossPillars,
      satinWindowTrim: pillars.satinWindowTrim,
      grilleSatin: front.grilleSatin,
      grilleMesh: front.grilleMesh,
      bumperMatte: front.bumperMatte,
      skidPlateSatin: front.skidPlateSatin,
      hlHousings: front.hlHousings,
      hlChromeBezels: front.hlChromeBezels,
      hlEmissiveOptics: front.hlEmissiveOptics,
      hlAmberMarkers: front.hlAmberMarkers,
      hlClearLenses: front.hlClearLenses,
      taillightEmissive: rear.taillightEmissive,
      rearDarkHousing: rear.rearDarkHousing,
      rearSatinTrim: rear.rearSatinTrim,
      exhaustOuter: rear.exhaustOuter,
      exhaustInner: rear.exhaustInner,
      licensePlate: rear.licensePlate,
      rearEmblem: rear.rearEmblem,
      hoodEmblem: rear.hoodEmblem,
      fenderFlaresAndCladding: ext.fenderFlaresAndCladding,
      sideStepsSatin: ext.sideStepsSatin,
      mirrorHousings: ext.mirrorHousings,
      mirrorStalks: ext.mirrorStalks,
      mirrorGlass: ext.mirrorGlass,
      satinHandlesAndBadges: ext.satinHandlesAndBadges,
      underbodyAndLiners: ext.underbodyAndLiners,
      wipers: ext.wipers,
      panelSeams: ext.panelSeams,
      cabinTub: interior.cabinTub,
      leatherSeats: interior.leatherSeats,
      satinInteriorTrim: interior.satinInteriorTrim,
      dashboard: interior.dashboard,
      steeringWheel: interior.steeringWheel,
      cockpitDisplay: interior.cockpitDisplay,
      rearViewMirror: interior.rearViewMirror,
      wheel,
    },
    textures: {
      brushedMetalMap: buildBrushedAluminumTexture(),
      grilleMeshMap: buildSuvGrilleMeshTexture(),
      allTerrainTreadMap: buildAllTerrainTreadTexture(),
      rotorMap: buildSuvBrakeRotorTexture(),
      cockpitMap: buildSuvCockpitDisplayTexture(),
      plateMap: buildTitanLicensePlateTexture(),
      rearEmblemMap: buildTitanRearEmblemTexture(),
      hoodEmblemMap: buildTitanHoodEmblemTexture(),
    },
  };

  return sharedCache;
}

export function disposeBaysideTitanSharedResources(): void {
  if (!sharedCache) return;
  const g = sharedCache.geometries;
  const geoList: THREE.BufferGeometry[] = [
    g.bodyShell,
    g.paintedRoof,
    g.moonroofGlass,
    g.roofRails,
    g.roofSpoiler,
    g.windshield,
    g.rearGlass,
    g.sideWindowL,
    g.sideWindowR,
    g.glossPillars,
    g.satinWindowTrim,
    g.grilleSatin,
    g.grilleMesh,
    g.bumperMatte,
    g.skidPlateSatin,
    g.hlHousings,
    g.hlChromeBezels,
    g.hlEmissiveOptics,
    g.hlAmberMarkers,
    g.hlClearLenses,
    g.taillightEmissive,
    g.rearDarkHousing,
    g.rearSatinTrim,
    g.exhaustOuter,
    g.exhaustInner,
    g.licensePlate,
    g.rearEmblem,
    g.hoodEmblem,
    g.fenderFlaresAndCladding,
    g.sideStepsSatin,
    g.mirrorHousings,
    g.mirrorStalks,
    g.mirrorGlass,
    g.satinHandlesAndBadges,
    g.underbodyAndLiners,
    g.wipers,
    g.panelSeams,
    g.cabinTub,
    g.leatherSeats,
    g.satinInteriorTrim,
    g.dashboard,
    g.steeringWheel,
    g.cockpitDisplay,
    g.rearViewMirror,
    g.wheel.tireGeo,
    g.wheel.rimAlloyGeo,
    g.wheel.rimPocketGeo,
    g.wheel.centerCapGeo,
    g.wheel.innerBarrelGeo,
    g.wheel.rotorGeo,
    g.wheel.caliperGeo,
  ];
  for (const geo of geoList) geo.dispose();

  const t = sharedCache.textures;
  t.brushedMetalMap?.dispose();
  t.grilleMeshMap?.dispose();
  t.allTerrainTreadMap?.dispose();
  t.rotorMap?.dispose();
  t.cockpitMap?.dispose();
  t.plateMap?.dispose();
  t.rearEmblemMap?.dispose();
  t.hoodEmblemMap?.dispose();
  sharedCache = null;
}

/**
 * Builds the upgraded Phase 2C-2 Bayside Titan All-Terrain Coastal Luxury SUV,
 * preserving 100% compatibility with VehicleRig, VehiclePhysics (0.42m wheels),
 * steering pivots, wheel rotation, suspension pitch/roll, headlights, brake lights,
 * garage delivery, and clean resource disposal.
 */
export function createBaysideTitanRig(
  spec: VehicleSpec,
  contactShadowMap: THREE.Texture,
  headlightBeamTex: THREE.Texture | null,
  overrideColor?: number,
): VehicleRig {
  const cache = getSharedCache();
  const g = cache.geometries;
  const tex = cache.textures;

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const instanceDisposables: Array<{ dispose: () => void }> = [];
  const paintProfile = getVehiclePaintMaterialProfile(VehicleKind.Suv);
  const mainColor = overrideColor ?? spec.color;

  // 1. Coastal Luxury All-Terrain SUV PBR Material Suite
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: paintProfile.metalness,
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: paintProfile.clearcoatRoughness,
    reflectivity: 0.9,
    envMapIntensity: paintProfile.envMapIntensity,
  });

  // Brushed satin-silver titanium exterior accents (honors spec.accentColor 0xcbd5e1)
  const satinSilverMat = new THREE.MeshPhysicalMaterial({
    color: spec.accentColor,
    roughness: 0.24,
    metalness: 0.88,
    clearcoat: 0.68,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.38,
  });

  // Polished mirror chrome for headlight micro-bezels, mirror faces, and wheel center caps
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeef3f9,
    roughness: 0.1,
    metalness: 0.96,
    envMapIntensity: 1.55,
  });

  // Clear coastal-tinted transparent automotive glass revealing bright 2-row + cargo SUV cabin
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2433,
    roughness: 0.045,
    metalness: 0.1,
    ior: 1.52,
    reflectivity: 0.97,
    clearcoat: 1.0,
    clearcoatRoughness: 0.038,
    envMapIntensity: 1.72,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Darker panoramic smoked glass moonroof
  const moonroofMat = new THREE.MeshPhysicalMaterial({
    color: 0x09141f,
    roughness: 0.04,
    metalness: 0.12,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.75,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  const clearLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f9ff,
    roughness: 0.04,
    metalness: 0.05,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.65,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });

  // Piano-black floating-roof pillars & taillight channel
  const glossBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1118,
    roughness: 0.12,
    metalness: 0.18,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
  });

  // Rugged matte-graphite protective polymer cladding (wheel-arch flares, lower bumpers, step grip)
  const claddingMat = new THREE.MeshStandardMaterial({
    color: 0x1d2129,
    roughness: 0.84,
    metalness: 0.08,
    envMapIntensity: 0.36,
  });

  const grilleMeshMat = new THREE.MeshStandardMaterial({
    color: tex.grilleMeshMap ? 0xffffff : 0x11151d,
    map: tex.grilleMeshMap ?? null,
    roughness: 0.66,
    metalness: 0.28,
    envMapIntensity: 0.55,
  });

  // Two-tone machined-face luxury SUV alloy rims + anthracite spoke pockets
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe3e9f2,
    roughness: 0.18,
    metalness: 0.9,
    envMapIntensity: 1.45,
  });

  const rimPocketMat = new THREE.MeshStandardMaterial({
    color: 0x2a313d,
    roughness: 0.36,
    metalness: 0.72,
    envMapIntensity: 0.95,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: tex.allTerrainTreadMap ? 0xffffff : 0x171a20,
    map: tex.allTerrainTreadMap ?? null,
    roughness: 0.9,
    metalness: 0.04,
    envMapIntensity: 0.26,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: tex.rotorMap ? 0xffffff : 0x9aa4b4,
    map: tex.rotorMap ?? null,
    roughness: 0.3,
    metalness: 0.86,
    envMapIntensity: 1.1,
  });

  // Refined satin-titanium luxury SUV brake calipers
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: 0x475569,
    roughness: 0.28,
    metalness: 0.66,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.15,
  });

  // Coastal yacht-inspired bright Oyster/Cream leather seats + dark slate cabin trim + brushed aluminum
  const leatherSeatMat = new THREE.MeshStandardMaterial({
    color: 0xd8cfc2,
    roughness: 0.72,
    metalness: 0.03,
    envMapIntensity: 0.42,
  });

  const cabinDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1d232b,
    roughness: 0.84,
    metalness: 0.06,
    envMapIntensity: 0.34,
  });

  const interiorMetalMat = new THREE.MeshStandardMaterial({
    color: tex.brushedMetalMap ? 0xffffff : 0xcbd5e1,
    map: tex.brushedMetalMap ?? null,
    roughness: 0.28,
    metalness: 0.78,
    envMapIntensity: 1.15,
  });

  const cockpitScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.cockpitMap ?? null,
    emissive: 0x38bdf8,
    emissiveMap: tex.cockpitMap ?? null,
    emissiveIntensity: 0.76,
    roughness: 0.2,
    metalness: 0.1,
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.plateMap ?? null,
    roughness: 0.38,
    metalness: 0.14,
    envMapIntensity: 0.7,
  });

  const rearEmblemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.rearEmblemMap ?? null,
    transparent: true,
    roughness: 0.16,
    metalness: 0.92,
    envMapIntensity: 1.4,
    depthWrite: false,
  });

  const hoodEmblemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.hoodEmblemMap ?? null,
    transparent: true,
    roughness: 0.16,
    metalness: 0.92,
    envMapIntensity: 1.4,
    depthWrite: false,
  });

  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e13,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.18,
  });

  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fcff,
    emissive: 0xeef6ff,
    emissiveIntensity: 0.75,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3,
  });

  const amberMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    emissive: 0xff9500,
    emissiveIntensity: 0.5,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });

  const brakeLightMat = new THREE.MeshPhysicalMaterial({
    color: 0x7f1320,
    emissive: 0xef4444,
    emissiveIntensity: 0.42,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });

  instanceDisposables.push(
    paintMat,
    satinSilverMat,
    chromeMat,
    glassMat,
    moonroofMat,
    clearLensMat,
    glossBlackMat,
    claddingMat,
    grilleMeshMat,
    alloyMat,
    rimPocketMat,
    tireMat,
    rotorMat,
    caliperMat,
    leatherSeatMat,
    cabinDarkMat,
    interiorMetalMat,
    cockpitScreenMat,
    plateMat,
    rearEmblemMat,
    hoodEmblemMat,
    seamMat,
    headlightMat,
    amberMat,
    brakeLightMat,
  );

  // 2. Primary Exterior SUV Body, Roof, Rails, Cladding, Front/Rear Fascias & Transparent Glass
  const bodyMesh = new THREE.Mesh(g.bodyShell, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;

  const roofMesh = new THREE.Mesh(g.paintedRoof, paintMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  const roofSpoilerMesh = new THREE.Mesh(g.roofSpoiler, paintMat);
  roofSpoilerMesh.castShadow = true;

  const roofRailsMesh = new THREE.Mesh(g.roofRails, satinSilverMat);
  roofRailsMesh.castShadow = true;

  const moonroofMesh = new THREE.Mesh(g.moonroofGlass, moonroofMat);
  moonroofMesh.renderOrder = 2;

  const glossPillarsMesh = new THREE.Mesh(g.glossPillars, glossBlackMat);
  glossPillarsMesh.castShadow = true;
  const satinWindowTrimMesh = new THREE.Mesh(g.satinWindowTrim, satinSilverMat);

  // Front grille, all-terrain skid armour & flush Matrix-LED headlights
  const grilleSatinMesh = new THREE.Mesh(g.grilleSatin, satinSilverMat);
  grilleSatinMesh.castShadow = true;
  const grilleRecessMesh = new THREE.Mesh(g.grilleMesh, grilleMeshMat);
  const frontBumperMesh = new THREE.Mesh(g.bumperMatte, claddingMat);
  const frontSkidMesh = new THREE.Mesh(g.skidPlateSatin, satinSilverMat);

  const hlHousingMesh = new THREE.Mesh(g.hlHousings, glossBlackMat);
  const hlBezelMesh = new THREE.Mesh(g.hlChromeBezels, chromeMat);
  const hlEmissiveMesh = new THREE.Mesh(g.hlEmissiveOptics, headlightMat);
  const hlAmberMesh = new THREE.Mesh(g.hlAmberMarkers, amberMat);
  const hlLensMesh = new THREE.Mesh(g.hlClearLenses, clearLensMat);
  hlLensMesh.renderOrder = 3;

  // Rear tailgate lightbar, bumper, rear skid diffuser & trapezoidal twin exhausts
  const rearDarkMesh = new THREE.Mesh(g.rearDarkHousing, claddingMat);
  const rearSatinMesh = new THREE.Mesh(g.rearSatinTrim, satinSilverMat);
  const taillightMesh = new THREE.Mesh(g.taillightEmissive, brakeLightMat);
  const exhaustOuterMesh = new THREE.Mesh(g.exhaustOuter, satinSilverMat);
  const exhaustInnerMesh = new THREE.Mesh(g.exhaustInner, claddingMat);
  const plateMesh = new THREE.Mesh(g.licensePlate, plateMat);

  // Prominent wheel-arch fender flares, side steps, mirrors & underbody liners
  const flaresMesh = new THREE.Mesh(g.fenderFlaresAndCladding, claddingMat);
  flaresMesh.castShadow = true;
  const sideStepsMesh = new THREE.Mesh(g.sideStepsSatin, satinSilverMat);
  sideStepsMesh.castShadow = true;
  const underbodyMesh = new THREE.Mesh(g.underbodyAndLiners, claddingMat);

  const mirrorHousingMesh = new THREE.Mesh(g.mirrorHousings, paintMat);
  mirrorHousingMesh.castShadow = true;
  const mirrorStalkMesh = new THREE.Mesh(g.mirrorStalks, glossBlackMat);
  const mirrorGlassMesh = new THREE.Mesh(g.mirrorGlass, chromeMat);

  // Transparent coastal solar glass (rendered after interior with renderOrder = 2)
  const windshieldMesh = new THREE.Mesh(g.windshield, glassMat);
  const rearGlassMesh = new THREE.Mesh(g.rearGlass, glassMat);
  const sideWinLMesh = new THREE.Mesh(g.sideWindowL, glassMat);
  const sideWinRMesh = new THREE.Mesh(g.sideWindowR, glassMat);
  windshieldMesh.renderOrder = 2;
  rearGlassMesh.renderOrder = 2;
  sideWinLMesh.renderOrder = 2;
  sideWinRMesh.renderOrder = 2;

  bodyGroup.add(
    bodyMesh,
    roofMesh,
    roofSpoilerMesh,
    roofRailsMesh,
    moonroofMesh,
    glossPillarsMesh,
    satinWindowTrimMesh,
    grilleSatinMesh,
    grilleRecessMesh,
    frontBumperMesh,
    frontSkidMesh,
    hlHousingMesh,
    hlBezelMesh,
    hlEmissiveMesh,
    hlAmberMesh,
    hlLensMesh,
    rearDarkMesh,
    rearSatinMesh,
    taillightMesh,
    exhaustOuterMesh,
    exhaustInnerMesh,
    plateMesh,
    flaresMesh,
    sideStepsMesh,
    underbodyMesh,
    mirrorHousingMesh,
    mirrorStalkMesh,
    mirrorGlassMesh,
    windshieldMesh,
    rearGlassMesh,
    sideWinLMesh,
    sideWinRMesh,
  );

  // 3. Three-Tier Distance-Based LOD for Spacious 2-Row + Cargo Interior & Exterior Micro-Details
  const detailLod = new THREE.LOD();
  const nearDetails = new THREE.Group();
  nearDetails.add(
    new THREE.Mesh(g.cabinTub, cabinDarkMat),
    new THREE.Mesh(g.leatherSeats, leatherSeatMat),
    new THREE.Mesh(g.satinInteriorTrim, interiorMetalMat),
    new THREE.Mesh(g.dashboard, cabinDarkMat),
    new THREE.Mesh(g.steeringWheel, cabinDarkMat),
    new THREE.Mesh(g.cockpitDisplay, cockpitScreenMat),
    new THREE.Mesh(g.rearViewMirror, claddingMat),
    new THREE.Mesh(g.satinHandlesAndBadges, satinSilverMat),
    new THREE.Mesh(g.rearEmblem, rearEmblemMat),
    new THREE.Mesh(g.hoodEmblem, hoodEmblemMat),
    new THREE.Mesh(g.wipers, claddingMat),
    new THREE.Mesh(g.panelSeams, seamMat),
  );
  const mediumDetails = new THREE.Group();
  mediumDetails.add(
    new THREE.Mesh(g.cabinTub, cabinDarkMat),
    new THREE.Mesh(g.leatherSeats, leatherSeatMat),
    new THREE.Mesh(g.dashboard, cabinDarkMat),
    new THREE.Mesh(g.satinHandlesAndBadges, satinSilverMat),
  );
  detailLod.addLevel(nearDetails, 0);
  detailLod.addLevel(mediumDetails, 34);
  detailLod.addLevel(new THREE.Group(), 78);
  bodyGroup.add(detailLod);

  // 4. Four All-Terrain Luxury 0.42m SUV Wheels + Stationary Heavy-Duty Brake Calipers
  const makeSpinningWheel = (isLeft: boolean): THREE.Group => {
    const spinGroup = new THREE.Group();
    const visual = new THREE.Group();
    if (isLeft) {
      visual.rotation.y = Math.PI;
    }
    const tire = new THREE.Mesh(g.wheel.tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.wheel.rimAlloyGeo, alloyMat);
    const pockets = new THREE.Mesh(g.wheel.rimPocketGeo, rimPocketMat);
    const cap = new THREE.Mesh(g.wheel.centerCapGeo, chromeMat);
    const barrel = new THREE.Mesh(g.wheel.innerBarrelGeo, glossBlackMat);
    const rotor = new THREE.Mesh(g.wheel.rotorGeo, rotorMat);
    visual.add(tire, rim, pockets, cap, barrel, rotor);
    spinGroup.add(visual);
    return spinGroup;
  };

  const makeStationaryCaliper = (isLeft: boolean): THREE.Group => {
    const cg = new THREE.Group();
    const cal = new THREE.Mesh(g.wheel.caliperGeo, caliperMat);
    if (isLeft) {
      cg.rotation.y = Math.PI;
    }
    cg.add(cal);
    return cg;
  };

  const { wheelRadius, frontAxleZ, rearAxleZ, frontTrackHalf, rearTrackHalf } = BAYSIDE_TITAN_DIMS;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-frontTrackHalf, wheelRadius, frontAxleZ);
  const wFL = makeSpinningWheel(true);
  frontLeftPivot.add(wFL, makeStationaryCaliper(true));

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(frontTrackHalf, wheelRadius, frontAxleZ);
  const wFR = makeSpinningWheel(false);
  frontRightPivot.add(wFR, makeStationaryCaliper(false));

  const wRL = makeSpinningWheel(true);
  wRL.position.set(-rearTrackHalf, wheelRadius, rearAxleZ);
  const calRL = makeStationaryCaliper(true);
  calRL.position.set(-rearTrackHalf, wheelRadius, rearAxleZ);

  const wRR = makeSpinningWheel(false);
  wRR.position.set(rearTrackHalf, wheelRadius, rearAxleZ);
  const calRR = makeStationaryCaliper(false);
  calRR.position.set(rearTrackHalf, wheelRadius, rearAxleZ);

  root.add(frontLeftPivot, frontRightPivot, wRL, wRR, calRL, calRR);

  // 5. Projected Dual-Headlight Road Beam Pool
  const beamGeo = new THREE.PlaneGeometry(spec.width * 2.35, 10.2);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xf4f9ff,
    map: headlightBeamTex ?? null,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  instanceDisposables.push(beamGeo, beamMat);
  const headlightBeam = new THREE.Mesh(beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -spec.length / 2 - 5.0);
  root.add(headlightBeam);

  // 6. Grounding Radial Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(spec.width * 1.4, spec.length * 1.24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  instanceDisposables.push(shadowGeo, shadowMat);
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.085;
  root.add(shadowDisc);

  return {
    root,
    bodyGroup,
    frontLeftPivot,
    frontRightPivot,
    wheels: [wFL, wFR, wRL, wRR],
    paintMat,
    glassMat,
    headlightMat,
    brakeLightMat,
    headlightBeam,
    dispose: () => {
      for (const d of instanceDisposables) d.dispose();
    },
  };
}
