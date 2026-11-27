import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import type { VehicleRig } from './vehicleModels';
import { getVehiclePaintMaterialProfile } from './vehicleModels';
import {
  SOLSTICE_ROYALE_DIMS,
  SolsticeWheelParts,
  buildSolsticeBodyShellGeometry,
  buildSolsticeExteriorDetailsGeometry,
  buildSolsticeFrontGrilleGeometry,
  buildSolsticeHeadlightsGeometry,
  buildSolsticeInteriorGeometries,
  buildSolsticePillarsGeometry,
  buildSolsticeRearFasciaGeometry,
  buildSolsticeRoofGeometry,
  buildSolsticeSideWindowGeometry,
  buildSolsticeWheelParts,
  buildSolsticeWindshieldGeometry,
  buildSolsticeRearGlassGeometry,
} from './solsticeRoyaleGeometry';

interface SolsticeRoyaleSharedCache {
  geometries: {
    bodyShell: THREE.BufferGeometry;
    paintedRoof: THREE.BufferGeometry;
    sunroofGlass: THREE.BufferGeometry;
    windshield: THREE.BufferGeometry;
    rearGlass: THREE.BufferGeometry;
    sideWindowL: THREE.BufferGeometry;
    sideWindowR: THREE.BufferGeometry;
    paintedPillars: THREE.BufferGeometry;
    bPillars: THREE.BufferGeometry;
    chromeWindowTrim: THREE.BufferGeometry;
    grilleChrome: THREE.BufferGeometry;
    grilleRecess: THREE.BufferGeometry;
    bumperAccentBar: THREE.BufferGeometry;
    hlHousings: THREE.BufferGeometry;
    hlChromeBezels: THREE.BufferGeometry;
    hlEmissiveOptics: THREE.BufferGeometry;
    hlAmberMarkers: THREE.BufferGeometry;
    hlClearLenses: THREE.BufferGeometry;
    taillightEmissive: THREE.BufferGeometry;
    rearChromeTrim: THREE.BufferGeometry;
    rearDarkCove: THREE.BufferGeometry;
    exhaustOuter: THREE.BufferGeometry;
    exhaustInner: THREE.BufferGeometry;
    licensePlate: THREE.BufferGeometry;
    rearEmblem: THREE.BufferGeometry;
    mirrorHousings: THREE.BufferGeometry;
    mirrorStalks: THREE.BufferGeometry;
    mirrorGlass: THREE.BufferGeometry;
    chromeHandlesAndCrest: THREE.BufferGeometry;
    sideSpearAccent: THREE.BufferGeometry;
    underbodyAndLiners: THREE.BufferGeometry;
    wipers: THREE.BufferGeometry;
    panelSeams: THREE.BufferGeometry;
    cabinTub: THREE.BufferGeometry;
    leatherSeats: THREE.BufferGeometry;
    woodTrim: THREE.BufferGeometry;
    dashboard: THREE.BufferGeometry;
    steeringWheel: THREE.BufferGeometry;
    clusterScreen: THREE.BufferGeometry;
    centerScreen: THREE.BufferGeometry;
    rearViewMirror: THREE.BufferGeometry;
    wheel: SolsticeWheelParts;
  };
  textures: {
    walnutWoodMap: THREE.Texture | null;
    grilleMeshMap: THREE.Texture | null;
    tireTreadMap: THREE.Texture | null;
    rotorMap: THREE.Texture | null;
    clusterMap: THREE.Texture | null;
    plateMap: THREE.Texture | null;
    emblemMap: THREE.Texture | null;
  };
}

let sharedCache: SolsticeRoyaleSharedCache | null = null;

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

function buildWalnutWoodTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    128,
    64,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#4a2511');
      grad.addColorStop(0.5, '#683619');
      grad.addColorStop(1, '#3c1d0d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(28, 12, 5, 0.45)';
      ctx.lineWidth = 2;
      for (let y = 4; y < h; y += 6) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const wave = Math.sin(x * 0.08 + y * 0.22) * 3.5;
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    },
    2,
    1,
  );
}

function buildLuxuryGrilleMeshTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#232934';
      ctx.lineWidth = 2;
      const step = 12;
      for (let y = -h; y < h * 2; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + w * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w, y);
        ctx.lineTo(0, y + w * 0.6);
        ctx.stroke();
      }
    },
    4,
    2,
  );
}

function buildTouringTireTreadTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#181a20';
      ctx.fillRect(0, 0, w, h);
      // Four quiet grand-touring circumferential water channels
      ctx.fillStyle = '#0e1015';
      for (const gx of [30, 52, 74, 96]) {
        ctx.fillRect(gx, 0, 4, h);
      }
      // Fine touring shoulder sipes
      ctx.strokeStyle = '#232730';
      ctx.lineWidth = 2;
      for (let y = 0; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(28, y + 4);
        ctx.moveTo(102, y + 4);
        ctx.lineTo(118, y);
        ctx.stroke();
      }
    },
    1,
    4,
  );
}

function buildLuxuryBrakeRotorTexture(): THREE.Texture | null {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#9aa3b2';
    ctx.fillRect(0, 0, w, h);
    for (let r = 20; r < 60; r += 3) {
      ctx.strokeStyle = r % 6 === 0 ? '#b4bdcb' : '#808a99';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b303a';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

function buildExecutiveClusterTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);
    // Warm champagne dual-dial luxury gauges
    for (const cx of [54, 120]) {
      ctx.strokeStyle = '#d4a359';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, 50, 26, Math.PI * 0.78, Math.PI * 2.22);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 50);
      ctx.lineTo(cx + 14, 34);
      ctx.stroke();
    }
    // Right executive navigation screen
    ctx.fillStyle = '#111b2e';
    ctx.fillRect(160, 14, 86, 68);
    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 14, 86, 68);
    ctx.fillStyle = '#f4efe6';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROYALE', 203, 42);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(172, 54, 62, 6);
  });
}

function buildRoyaleLicensePlateTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fffbf2');
    grad.addColorStop(0.55, '#f6e7c1');
    grad.addColorStop(1, '#e6c281');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#332415';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VICE COAST', w / 2, 34);
    ctx.fillStyle = '#1e1b18';
    ctx.font = '900 44px serif';
    ctx.fillText('ROYALE', w / 2, 92);
  });
}

function buildRoyaleEmblemTexture(): THREE.Texture | null {
  return makeCanvasTexture(320, 48, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S O L S T I C E   R O Y A L E', w / 2, h / 2);
  });
}

function getSharedCache(): SolsticeRoyaleSharedCache {
  if (sharedCache) return sharedCache;

  const bodyShell = buildSolsticeBodyShellGeometry();
  const { paintedRoof, sunroofGlass } = buildSolsticeRoofGeometry();
  const windshield = buildSolsticeWindshieldGeometry();
  const rearGlass = buildSolsticeRearGlassGeometry();
  const sideWindowL = buildSolsticeSideWindowGeometry(-1);
  const sideWindowR = buildSolsticeSideWindowGeometry(1);
  const { paintedPillars, bPillars, chromeWindowTrim } = buildSolsticePillarsGeometry();
  const { grilleChrome, grilleRecess, bumperAccentBar } = buildSolsticeFrontGrilleGeometry();
  const hl = buildSolsticeHeadlightsGeometry();
  const rear = buildSolsticeRearFasciaGeometry();
  const ext = buildSolsticeExteriorDetailsGeometry();
  const interior = buildSolsticeInteriorGeometries();
  const wheel = buildSolsticeWheelParts(SOLSTICE_ROYALE_DIMS.wheelWidth);

  sharedCache = {
    geometries: {
      bodyShell,
      paintedRoof,
      sunroofGlass,
      windshield,
      rearGlass,
      sideWindowL,
      sideWindowR,
      paintedPillars,
      bPillars,
      chromeWindowTrim,
      grilleChrome,
      grilleRecess,
      bumperAccentBar,
      hlHousings: hl.housings,
      hlChromeBezels: hl.chromeBezels,
      hlEmissiveOptics: hl.emissiveOptics,
      hlAmberMarkers: hl.amberMarkers,
      hlClearLenses: hl.clearLenses,
      taillightEmissive: rear.taillightEmissive,
      rearChromeTrim: rear.rearChromeTrim,
      rearDarkCove: rear.rearDarkCove,
      exhaustOuter: rear.exhaustOuter,
      exhaustInner: rear.exhaustInner,
      licensePlate: rear.licensePlate,
      rearEmblem: rear.rearEmblem,
      mirrorHousings: ext.mirrorHousings,
      mirrorStalks: ext.mirrorStalks,
      mirrorGlass: ext.mirrorGlass,
      chromeHandlesAndCrest: ext.chromeHandlesAndCrest,
      sideSpearAccent: ext.sideSpearAccent,
      underbodyAndLiners: ext.underbodyAndLiners,
      wipers: ext.wipers,
      panelSeams: ext.panelSeams,
      cabinTub: interior.cabinTub,
      leatherSeats: interior.leatherSeats,
      woodTrim: interior.woodTrim,
      dashboard: interior.dashboard,
      steeringWheel: interior.steeringWheel,
      clusterScreen: interior.clusterScreen,
      centerScreen: interior.centerScreen,
      rearViewMirror: interior.rearViewMirror,
      wheel,
    },
    textures: {
      walnutWoodMap: buildWalnutWoodTexture(),
      grilleMeshMap: buildLuxuryGrilleMeshTexture(),
      tireTreadMap: buildTouringTireTreadTexture(),
      rotorMap: buildLuxuryBrakeRotorTexture(),
      clusterMap: buildExecutiveClusterTexture(),
      plateMap: buildRoyaleLicensePlateTexture(),
      emblemMap: buildRoyaleEmblemTexture(),
    },
  };

  return sharedCache;
}

export function disposeSolsticeRoyaleSharedResources(): void {
  if (!sharedCache) return;
  const g = sharedCache.geometries;
  const geoList: THREE.BufferGeometry[] = [
    g.bodyShell,
    g.paintedRoof,
    g.sunroofGlass,
    g.windshield,
    g.rearGlass,
    g.sideWindowL,
    g.sideWindowR,
    g.paintedPillars,
    g.bPillars,
    g.chromeWindowTrim,
    g.grilleChrome,
    g.grilleRecess,
    g.bumperAccentBar,
    g.hlHousings,
    g.hlChromeBezels,
    g.hlEmissiveOptics,
    g.hlAmberMarkers,
    g.hlClearLenses,
    g.taillightEmissive,
    g.rearChromeTrim,
    g.rearDarkCove,
    g.exhaustOuter,
    g.exhaustInner,
    g.licensePlate,
    g.rearEmblem,
    g.mirrorHousings,
    g.mirrorStalks,
    g.mirrorGlass,
    g.chromeHandlesAndCrest,
    g.sideSpearAccent,
    g.underbodyAndLiners,
    g.wipers,
    g.panelSeams,
    g.cabinTub,
    g.leatherSeats,
    g.woodTrim,
    g.dashboard,
    g.steeringWheel,
    g.clusterScreen,
    g.centerScreen,
    g.rearViewMirror,
    g.wheel.tireGeo,
    g.wheel.rimAlloyGeo,
    g.wheel.centerCapGeo,
    g.wheel.innerBarrelGeo,
    g.wheel.rotorGeo,
    g.wheel.caliperGeo,
  ];
  for (const geo of geoList) geo.dispose();

  const t = sharedCache.textures;
  t.walnutWoodMap?.dispose();
  t.grilleMeshMap?.dispose();
  t.tireTreadMap?.dispose();
  t.rotorMap?.dispose();
  t.clusterMap?.dispose();
  t.plateMap?.dispose();
  t.emblemMap?.dispose();
  sharedCache = null;
}

/**
 * Builds the upgraded Phase 2C-1 Solstice Royale Executive Luxury Grand Sedan,
 * returning a 100% compatible VehicleRig for physics, wheel pivots, steering,
 * suspension, headlights, brake lights, garage spawning, and clean resource disposal.
 */
export function createSolsticeRoyaleRig(
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
  const paintProfile = getVehiclePaintMaterialProfile(VehicleKind.Sedan);
  const mainColor = overrideColor ?? spec.color;

  // 1. Flagship Luxury PBR Material Suite
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: paintProfile.metalness,
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: paintProfile.clearcoatRoughness,
    reflectivity: 0.94,
    envMapIntensity: paintProfile.envMapIntensity,
  });

  // Warm brushed champagne-gold accent trim (honors spec.accentColor 0xd4a359)
  const champagneMat = new THREE.MeshPhysicalMaterial({
    color: spec.accentColor,
    roughness: 0.22,
    metalness: 0.88,
    clearcoat: 0.85,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.4,
  });

  // Mirror-polished luxury chrome (waterfall grille, DLO molding, door handles, hood crest, oval exhausts)
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.09,
    metalness: 0.97,
    envMapIntensity: 1.6,
  });

  // Crystal solar-tinted transparent automotive glass revealing warm 4-seat executive cabin
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2030,
    roughness: 0.045,
    metalness: 0.1,
    ior: 1.52,
    reflectivity: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.75,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Darker panoramic glass sunroof tint
  const sunroofMat = new THREE.MeshPhysicalMaterial({
    color: 0x09131e,
    roughness: 0.04,
    metalness: 0.12,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.8,
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
    envMapIntensity: 1.7,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });

  const glossBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e1118,
    roughness: 0.12,
    metalness: 0.18,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
  });

  const matteTrimMat = new THREE.MeshStandardMaterial({
    color: 0x151820,
    roughness: 0.78,
    metalness: 0.14,
    envMapIntensity: 0.4,
  });

  const grilleMeshMat = new THREE.MeshStandardMaterial({
    color: tex.grilleMeshMap ? 0xffffff : 0x11151d,
    map: tex.grilleMeshMap ?? null,
    roughness: 0.66,
    metalness: 0.28,
    envMapIntensity: 0.55,
  });

  // Warm polished platinum-silver multi-spoke luxury alloy rims
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe6ebf2,
    roughness: 0.16,
    metalness: 0.92,
    envMapIntensity: 1.5,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: tex.tireTreadMap ? 0xffffff : 0x17191f,
    map: tex.tireTreadMap ?? null,
    roughness: 0.88,
    metalness: 0.04,
    envMapIntensity: 0.28,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: tex.rotorMap ? 0xffffff : 0x9aa3b2,
    map: tex.rotorMap ?? null,
    roughness: 0.3,
    metalness: 0.86,
    envMapIntensity: 1.1,
  });

  // Understated executive anthracite-satin luxury brake calipers
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: 0x333b48,
    roughness: 0.28,
    metalness: 0.62,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
  });

  // Warm cognac/saddle-tan leather seats + deep espresso cabin trim + lacquered burled walnut wood
  const leatherSeatMat = new THREE.MeshStandardMaterial({
    color: 0x8f5634,
    roughness: 0.72,
    metalness: 0.04,
    envMapIntensity: 0.42,
  });

  const cabinDarkMat = new THREE.MeshStandardMaterial({
    color: 0x261d19,
    roughness: 0.84,
    metalness: 0.04,
    envMapIntensity: 0.32,
  });

  const woodTrimMat = new THREE.MeshPhysicalMaterial({
    color: tex.walnutWoodMap ? 0xffffff : 0x5c2e14,
    map: tex.walnutWoodMap ?? null,
    roughness: 0.24,
    metalness: 0.06,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.95,
  });

  const dashScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.clusterMap ?? null,
    emissive: 0xd4a359,
    emissiveMap: tex.clusterMap ?? null,
    emissiveIntensity: 0.78,
    roughness: 0.22,
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
    map: tex.emblemMap ?? null,
    transparent: true,
    roughness: 0.14,
    metalness: 0.95,
    envMapIntensity: 1.45,
    depthWrite: false,
  });

  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d12,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.18,
  });

  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffaf0,
    emissive: 0xfff5d6,
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
    emissive: 0xe11d48,
    emissiveIntensity: 0.42,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });

  instanceDisposables.push(
    paintMat,
    champagneMat,
    chromeMat,
    glassMat,
    sunroofMat,
    clearLensMat,
    glossBlackMat,
    matteTrimMat,
    grilleMeshMat,
    alloyMat,
    tireMat,
    rotorMat,
    caliperMat,
    leatherSeatMat,
    cabinDarkMat,
    woodTrimMat,
    dashScreenMat,
    plateMat,
    rearEmblemMat,
    seamMat,
    headlightMat,
    amberMat,
    brakeLightMat,
  );

  // 2. Primary Exterior Body, Greenhouse, Waterfall Grille, Lighting & Chrome Trim
  const bodyMesh = new THREE.Mesh(g.bodyShell, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;

  const roofMesh = new THREE.Mesh(g.paintedRoof, paintMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  const sunroofMesh = new THREE.Mesh(g.sunroofGlass, sunroofMat);
  sunroofMesh.renderOrder = 2;

  const paintedPillarsMesh = new THREE.Mesh(g.paintedPillars, paintMat);
  paintedPillarsMesh.castShadow = true;
  paintedPillarsMesh.receiveShadow = true;

  const bPillarsMesh = new THREE.Mesh(g.bPillars, glossBlackMat);
  const chromeWindowTrimMesh = new THREE.Mesh(g.chromeWindowTrim, chromeMat);

  const grilleChromeMesh = new THREE.Mesh(g.grilleChrome, chromeMat);
  grilleChromeMesh.castShadow = true;
  const grilleRecessMesh = new THREE.Mesh(g.grilleRecess, grilleMeshMat);
  const bumperAccentMesh = new THREE.Mesh(g.bumperAccentBar, champagneMat);
  const sideSpearMesh = new THREE.Mesh(g.sideSpearAccent, champagneMat);
  const underbodyMesh = new THREE.Mesh(g.underbodyAndLiners, matteTrimMat);

  // Mirrors & exhausts
  const mirrorHousingMesh = new THREE.Mesh(g.mirrorHousings, paintMat);
  mirrorHousingMesh.castShadow = true;
  const mirrorStalkMesh = new THREE.Mesh(g.mirrorStalks, glossBlackMat);
  const mirrorGlassMesh = new THREE.Mesh(g.mirrorGlass, chromeMat);

  const exhaustOuterMesh = new THREE.Mesh(g.exhaustOuter, chromeMat);
  const exhaustInnerMesh = new THREE.Mesh(g.exhaustInner, matteTrimMat);

  // Headlights, amber markers, rear jewel taillights & chrome trunk garnish
  const hlHousingMesh = new THREE.Mesh(g.hlHousings, glossBlackMat);
  const hlBezelMesh = new THREE.Mesh(g.hlChromeBezels, chromeMat);
  const hlEmissiveMesh = new THREE.Mesh(g.hlEmissiveOptics, headlightMat);
  const hlAmberMesh = new THREE.Mesh(g.hlAmberMarkers, amberMat);
  const hlLensMesh = new THREE.Mesh(g.hlClearLenses, clearLensMat);
  hlLensMesh.renderOrder = 3;

  const rearDarkMesh = new THREE.Mesh(g.rearDarkCove, matteTrimMat);
  const rearChromeMesh = new THREE.Mesh(g.rearChromeTrim, champagneMat);
  const taillightMesh = new THREE.Mesh(g.taillightEmissive, brakeLightMat);
  const plateMesh = new THREE.Mesh(g.licensePlate, plateMat);

  // Curved transparent luxury solar glass (rendered after interior with renderOrder = 2)
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
    sunroofMesh,
    paintedPillarsMesh,
    bPillarsMesh,
    chromeWindowTrimMesh,
    grilleChromeMesh,
    grilleRecessMesh,
    bumperAccentMesh,
    sideSpearMesh,
    underbodyMesh,
    mirrorHousingMesh,
    mirrorStalkMesh,
    mirrorGlassMesh,
    exhaustOuterMesh,
    exhaustInnerMesh,
    hlHousingMesh,
    hlBezelMesh,
    hlEmissiveMesh,
    hlAmberMesh,
    hlLensMesh,
    rearDarkMesh,
    rearChromeMesh,
    taillightMesh,
    plateMesh,
    windshieldMesh,
    rearGlassMesh,
    sideWinLMesh,
    sideWinRMesh,
  );

  // 3. Three-Tier Distance-Based LOD for Executive 4-Seat Interior & Coachwork Micro-Details
  const detailLod = new THREE.LOD();
  const nearDetails = new THREE.Group();
  nearDetails.add(
    new THREE.Mesh(g.cabinTub, cabinDarkMat),
    new THREE.Mesh(g.leatherSeats, leatherSeatMat),
    new THREE.Mesh(g.woodTrim, woodTrimMat),
    new THREE.Mesh(g.dashboard, cabinDarkMat),
    new THREE.Mesh(g.steeringWheel, cabinDarkMat),
    new THREE.Mesh(g.clusterScreen, dashScreenMat),
    new THREE.Mesh(g.centerScreen, dashScreenMat),
    new THREE.Mesh(g.rearViewMirror, matteTrimMat),
    new THREE.Mesh(g.chromeHandlesAndCrest, chromeMat),
    new THREE.Mesh(g.rearEmblem, rearEmblemMat),
    new THREE.Mesh(g.wipers, matteTrimMat),
    new THREE.Mesh(g.panelSeams, seamMat),
  );
  const mediumDetails = new THREE.Group();
  mediumDetails.add(
    new THREE.Mesh(g.cabinTub, cabinDarkMat),
    new THREE.Mesh(g.leatherSeats, leatherSeatMat),
    new THREE.Mesh(g.dashboard, cabinDarkMat),
    new THREE.Mesh(g.chromeHandlesAndCrest, chromeMat),
  );
  detailLod.addLevel(nearDetails, 0);
  detailLod.addLevel(mediumDetails, 34);
  detailLod.addLevel(new THREE.Group(), 78);
  bodyGroup.add(detailLod);

  // 4. Four Luxury 14-Spoke Turbine Touring Wheels + Stationary Brake Calipers
  const makeSpinningWheel = (isLeft: boolean): THREE.Group => {
    const spinGroup = new THREE.Group();
    const visual = new THREE.Group();
    if (isLeft) {
      visual.rotation.y = Math.PI;
    }
    const tire = new THREE.Mesh(g.wheel.tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.wheel.rimAlloyGeo, alloyMat);
    const cap = new THREE.Mesh(g.wheel.centerCapGeo, chromeMat);
    const barrel = new THREE.Mesh(g.wheel.innerBarrelGeo, glossBlackMat);
    const rotor = new THREE.Mesh(g.wheel.rotorGeo, rotorMat);
    visual.add(tire, rim, cap, barrel, rotor);
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

  const { wheelRadius, frontAxleZ, rearAxleZ, frontTrackHalf, rearTrackHalf } =
    SOLSTICE_ROYALE_DIMS;

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
  const beamGeo = new THREE.PlaneGeometry(spec.width * 2.3, 9.8);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6dc,
    map: headlightBeamTex ?? null,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  instanceDisposables.push(beamGeo, beamMat);
  const headlightBeam = new THREE.Mesh(beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -spec.length / 2 - 4.8);
  root.add(headlightBeam);

  // 6. Grounding Radial Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(spec.width * 1.38, spec.length * 1.24);
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
