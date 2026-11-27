import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import type { VehicleRig } from './vehicleModels';
import { getVehiclePaintMaterialProfile } from './vehicleModels';
import {
  VCPD_INTERCEPTOR_DIMS,
  VcpdWheelParts,
  buildVcpdBodyShellGeometry,
  buildVcpdExteriorDetailsGeometry,
  buildVcpdFrontFasciaGeometry,
  buildVcpdGlassGeometry,
  buildVcpdInteriorGeometry,
  buildVcpdLightbarGeometry,
  buildVcpdPillarsGeometry,
  buildVcpdRearFasciaGeometry,
  buildVcpdRoofGeometry,
  buildVcpdWheelParts,
  mergeVcpdGeometries,
} from './vcpdInterceptorGeometry';

interface VcpdInterceptorSharedCache {
  geometries: {
    paintedHullExterior: THREE.BufferGeometry;
    whiteTwoToneLivery: THREE.BufferGeometry;
    matteDarkExterior: THREE.BufferGeometry;
    glossBlackExterior: THREE.BufferGeometry;
    chromeExterior: THREE.BufferGeometry;
    allGlass: THREE.BufferGeometry;
    hlEmissiveOptics: THREE.BufferGeometry;
    hlAmberMarkers: THREE.BufferGeometry;
    hlClearLenses: THREE.BufferGeometry;
    taillightEmissive: THREE.BufferGeometry;
    redEmergencyEmitters: THREE.BufferGeometry;
    blueEmergencyEmitters: THREE.BufferGeometry;
    lightbarClearDomes: THREE.BufferGeometry;
    lightbarWhiteTakedowns: THREE.BufferGeometry;
    doorDecals: THREE.BufferGeometry;
    licensePlate: THREE.BufferGeometry;
    panelSeams: THREE.BufferGeometry;
    cabinDark: THREE.BufferGeometry;
    seats: THREE.BufferGeometry;
    prisonerPartition: THREE.BufferGeometry;
    mdcScreen: THREE.BufferGeometry;
    wheel: VcpdWheelParts;
    beamGeo: THREE.BufferGeometry;
    shadowGeo: THREE.BufferGeometry;
  };
  materials: {
    whiteLiveryMat: THREE.MeshPhysicalMaterial;
    glassMat: THREE.MeshPhysicalMaterial;
    clearLensMat: THREE.MeshPhysicalMaterial;
    glossBlackMat: THREE.MeshPhysicalMaterial;
    matteTrimMat: THREE.MeshStandardMaterial;
    chromeMat: THREE.MeshStandardMaterial;
    pursuitRimMat: THREE.MeshStandardMaterial;
    tireMat: THREE.MeshStandardMaterial;
    rotorMat: THREE.MeshStandardMaterial;
    caliperMat: THREE.MeshStandardMaterial;
    interiorDarkMat: THREE.MeshStandardMaterial;
    seatVinylMat: THREE.MeshStandardMaterial;
    partitionSteelMat: THREE.MeshStandardMaterial;
    amberMat: THREE.MeshStandardMaterial;
    takedownWhiteMat: THREE.MeshStandardMaterial;
    decalMat: THREE.MeshStandardMaterial;
    plateMat: THREE.MeshStandardMaterial;
    mdcScreenMat: THREE.MeshStandardMaterial;
    seamMat: THREE.MeshStandardMaterial;
  };
  textures: {
    tireTreadMap: THREE.Texture | null;
    doorDecalMap: THREE.Texture | null;
    plateMap: THREE.Texture | null;
    mdcMap: THREE.Texture | null;
  };
}

let sharedCache: VcpdInterceptorSharedCache | null = null;

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

function buildPursuitTireTreadTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    96,
    96,
    (ctx, w, h) => {
      ctx.fillStyle = '#16181e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0c0e13';
      for (const gx of [20, 44, 70]) {
        ctx.fillRect(gx, 0, 5, h);
      }
      ctx.strokeStyle = '#222731';
      ctx.lineWidth = 2.5;
      for (let y = 0; y < h; y += 10) {
        ctx.beginPath();
        ctx.moveTo(4, y);
        ctx.lineTo(18, y + 5);
        ctx.moveTo(77, y + 5);
        ctx.lineTo(92, y);
        ctx.stroke();
      }
    },
    1,
    4,
  );
}

/**
 * Crisp fictional Vice Coastal Police Department ("VCPD") door crest & pursuit striping.
 */
function buildVcpdDoorDecalTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    // Coastal cyan + midnight patrol accent speed stripe along door waist
    ctx.fillStyle = '#0f2942';
    ctx.fillRect(8, 86, w - 16, 16);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(8, 102, w - 16, 6);

    // Crisp coastal badge shield on forward portion of front door
    ctx.save();
    ctx.translate(48, 48);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(24, -18);
    ctx.lineTo(20, 12);
    ctx.lineTo(0, 28);
    ctx.lineTo(-20, 12);
    ctx.lineTo(-24, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner gold coastal star emblem
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 12 : 5;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bold fictional "VCPD" & "INTERCEPTOR" lettering
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VCPD', 84, 52);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('INTERCEPTOR', 86, 74);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('EMERGENCY  911  ·  VICE COASTAL POLICE', 18, 98);
  });
}

function buildPolicePlateTexture(): THREE.Texture | null {
  return makeCanvasTexture(192, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(6, 6, w - 12, 22);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCPD PURSUIT', w / 2, 22);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('VCPD 911', w / 2, 68);
  });
}

function buildMdcScreenTexture(): THREE.Texture | null {
  return makeCanvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#071426';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('VCPD CAD // LIVE', 8, 17);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(8, 24, 52, 42);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(11, 27, 46, 36);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(34, 45, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('UNIT 04', 66, 36);
    ctx.fillText('INTERCEPT', 66, 50);
    ctx.fillText('ACTIVE', 66, 64);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(8, 76, w - 16, 10);
  });
}

function mergeAndDisposeInputs(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeVcpdGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

function getSharedCache(): VcpdInterceptorSharedCache {
  if (sharedCache) return sharedCache;

  const body = buildVcpdBodyShellGeometry();
  const roof = buildVcpdRoofGeometry();
  const glass = buildVcpdGlassGeometry();
  const pillars = buildVcpdPillarsGeometry();
  const front = buildVcpdFrontFasciaGeometry();
  const lightbar = buildVcpdLightbarGeometry();
  const rear = buildVcpdRearFasciaGeometry();
  const ext = buildVcpdExteriorDetailsGeometry();
  const interior = buildVcpdInteriorGeometry();
  const wheel = buildVcpdWheelParts(
    VCPD_INTERCEPTOR_DIMS.wheelRadius,
    VCPD_INTERCEPTOR_DIMS.wheelWidth,
  );

  // Midnight-navy patrol exterior body hull
  const paintedHullExterior = mergeAndDisposeInputs([
    body.hullBodyShell,
    pillars.paintedPillars,
    ext.paintedDetails,
  ]);

  // Crisp patrol white two-tone livery (doors + roof + roof edge skirts + subtle trunk trim)
  const whiteTwoToneLivery = mergeAndDisposeInputs([
    body.whiteDoorPanels,
    roof.whiteRoof,
    roof.roofEdges,
    ext.whiteHandleDetails,
  ]);

  // Matte tactical dark exterior (push-bar, grille, roof headliner, rear diffuser/spoiler, liners, antennas)
  const matteDarkExterior = mergeAndDisposeInputs([
    roof.roofHeadliner,
    front.grilleAndPushBarDark,
    lightbar.barBaseAndHousing,
    rear.rearDarkValance,
    ext.darkTrimAndUnderbody,
  ]);

  const glossBlackExterior = mergeAndDisposeInputs([
    pillars.darkPillarsAndTrim,
    front.hlHousings,
  ]);

  const chromeExterior = mergeAndDisposeInputs([
    front.grilleChromeAccent,
    rear.rearChromeAccent,
    ext.chromeSpotlightAndAccents,
  ]);

  glass.sideWindowL.dispose();
  glass.sideWindowR.dispose();
  const allGlass = mergeAndDisposeInputs([
    glass.windshield,
    glass.rearGlass,
    glass.sideWindowsMerged,
  ]);

  const hlEmissiveOptics = mergeAndDisposeInputs([
    front.hlEmissiveOptics,
    ext.spotlightLens,
  ]);

  const cabinDark = mergeAndDisposeInputs([interior.cabinTub, interior.dashAndWheel]);

  const beamGeo = new THREE.PlaneGeometry(VCPD_INTERCEPTOR_DIMS.width * 2.25, 9.6);
  beamGeo.rotateX(-Math.PI / 2);

  const shadowGeo = new THREE.PlaneGeometry(
    VCPD_INTERCEPTOR_DIMS.width * 1.38,
    VCPD_INTERCEPTOR_DIMS.length * 1.24,
  );
  shadowGeo.rotateX(-Math.PI / 2);

  const tireTreadMap = buildPursuitTireTreadTexture();
  const doorDecalMap = buildVcpdDoorDecalTexture();
  const plateMap = buildPolicePlateTexture();
  const mdcMap = buildMdcScreenTexture();

  const whiteLiveryMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.24,
    metalness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.88,
    envMapIntensity: 1.15,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x111f2e,
    roughness: 0.055,
    metalness: 0.1,
    ior: 1.5,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.65,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const clearLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f9ff,
    roughness: 0.05,
    metalness: 0.06,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.55,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  const glossBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f131a,
    roughness: 0.16,
    metalness: 0.18,
    clearcoat: 0.88,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.15,
  });

  const matteTrimMat = new THREE.MeshStandardMaterial({
    color: 0x161a22,
    roughness: 0.78,
    metalness: 0.16,
    envMapIntensity: 0.42,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeaf0f7,
    roughness: 0.12,
    metalness: 0.94,
    envMapIntensity: 1.45,
  });

  const pursuitRimMat = new THREE.MeshStandardMaterial({
    color: 0x262c36,
    roughness: 0.34,
    metalness: 0.78,
    envMapIntensity: 1.05,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: tireTreadMap ? 0xffffff : 0x16181e,
    map: tireTreadMap ?? null,
    roughness: 0.88,
    metalness: 0.04,
    envMapIntensity: 0.26,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x9ca5b3,
    roughness: 0.32,
    metalness: 0.84,
    envMapIntensity: 0.95,
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.36,
    metalness: 0.32,
    envMapIntensity: 0.75,
  });

  const interiorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f27,
    roughness: 0.86,
    metalness: 0.05,
    envMapIntensity: 0.28,
  });

  const seatVinylMat = new THREE.MeshStandardMaterial({
    color: 0x2e3540,
    roughness: 0.72,
    metalness: 0.05,
    envMapIntensity: 0.35,
  });

  const partitionSteelMat = new THREE.MeshStandardMaterial({
    color: 0x2b323d,
    roughness: 0.48,
    metalness: 0.72,
    envMapIntensity: 0.75,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xe68a00,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.08,
    envMapIntensity: 1.0,
  });

  const takedownWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.1,
  });

  const decalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: doorDecalMap ?? null,
    transparent: true,
    alphaTest: 0.15,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    roughness: 0.3,
    metalness: 0.08,
    envMapIntensity: 0.85,
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plateMap ?? null,
    roughness: 0.38,
    metalness: 0.1,
    envMapIntensity: 0.7,
  });

  const mdcScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: mdcMap ?? null,
    emissive: 0x38bdf8,
    emissiveMap: mdcMap ?? null,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.08,
  });

  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d12,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.15,
  });

  sharedCache = {
    geometries: {
      paintedHullExterior,
      whiteTwoToneLivery,
      matteDarkExterior,
      glossBlackExterior,
      chromeExterior,
      allGlass,
      hlEmissiveOptics,
      hlAmberMarkers: front.hlAmberMarkers,
      hlClearLenses: front.hlClearLenses,
      taillightEmissive: rear.taillightEmissive,
      redEmergencyEmitters: lightbar.redEmitters,
      blueEmergencyEmitters: lightbar.blueEmitters,
      lightbarClearDomes: lightbar.clearOuterDome,
      lightbarWhiteTakedowns: lightbar.whiteTakedowns,
      doorDecals: body.doorDecals,
      licensePlate: rear.licensePlate,
      panelSeams: ext.panelSeams,
      cabinDark,
      seats: interior.seats,
      prisonerPartition: interior.prisonerPartition,
      mdcScreen: interior.mdcScreen,
      wheel,
      beamGeo,
      shadowGeo,
    },
    materials: {
      whiteLiveryMat,
      glassMat,
      clearLensMat,
      glossBlackMat,
      matteTrimMat,
      chromeMat,
      pursuitRimMat,
      tireMat,
      rotorMat,
      caliperMat,
      interiorDarkMat,
      seatVinylMat,
      partitionSteelMat,
      amberMat,
      takedownWhiteMat,
      decalMat,
      plateMat,
      mdcScreenMat,
      seamMat,
    },
    textures: {
      tireTreadMap,
      doorDecalMap,
      plateMap,
      mdcMap,
    },
  };

  return sharedCache;
}

export function disposeVcpdInterceptorSharedResources(): void {
  if (!sharedCache) return;
  const g = sharedCache.geometries;
  const geoList: THREE.BufferGeometry[] = [
    g.paintedHullExterior,
    g.whiteTwoToneLivery,
    g.matteDarkExterior,
    g.glossBlackExterior,
    g.chromeExterior,
    g.allGlass,
    g.hlEmissiveOptics,
    g.hlAmberMarkers,
    g.hlClearLenses,
    g.taillightEmissive,
    g.redEmergencyEmitters,
    g.blueEmergencyEmitters,
    g.lightbarClearDomes,
    g.lightbarWhiteTakedowns,
    g.doorDecals,
    g.licensePlate,
    g.panelSeams,
    g.cabinDark,
    g.seats,
    g.prisonerPartition,
    g.mdcScreen,
    g.wheel.tireGeo,
    g.wheel.rimGeo,
    g.wheel.chromeCenterCapGeo,
    g.wheel.rotorGeo,
    g.wheel.caliperGeo,
    g.beamGeo,
    g.shadowGeo,
  ];
  for (const geo of geoList) geo.dispose();

  const m = sharedCache.materials;
  const matList: THREE.Material[] = [
    m.whiteLiveryMat,
    m.glassMat,
    m.clearLensMat,
    m.glossBlackMat,
    m.matteTrimMat,
    m.chromeMat,
    m.pursuitRimMat,
    m.tireMat,
    m.rotorMat,
    m.caliperMat,
    m.interiorDarkMat,
    m.seatVinylMat,
    m.partitionSteelMat,
    m.amberMat,
    m.takedownWhiteMat,
    m.decalMat,
    m.plateMat,
    m.mdcScreenMat,
    m.seamMat,
  ];
  for (const mat of matList) mat.dispose();

  sharedCache.textures.tireTreadMap?.dispose();
  sharedCache.textures.doorDecalMap?.dispose();
  sharedCache.textures.plateMap?.dispose();
  sharedCache.textures.mdcMap?.dispose();
  sharedCache = null;
}

/**
 * Builds the Phase 2C-3B VCPD Interceptor police pursuit sedan (`vcpd_interceptor`):
 * - Shares all heavy GPU geometries, procedural VCPD textures, and static PBR materials.
 * - Allocates independent per-instance mutable materials (`paintMat`, `headlightMat`,
 *   `brakeLightMat`, `policeRedMat`, `policeBlueMat`, `beamMat`, `shadowMat`) so each
 *   interceptor flashes, brakes, and responds to night lighting cleanly inside PoliceSystem.
 */
export function createVcpdInterceptorRig(
  spec: VehicleSpec,
  contactShadowMap: THREE.Texture,
  headlightBeamTex: THREE.Texture | null,
  overrideColor?: number,
): VehicleRig {
  const cache = getSharedCache();
  const g = cache.geometries;
  const m = cache.materials;

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const instanceDisposables: Array<{ dispose: () => void }> = [];
  const paintProfile = getVehiclePaintMaterialProfile(VehicleKind.Police);
  const mainColor = overrideColor ?? spec.color;

  // Per-instance patrol body hull clearcoat paint
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: paintProfile.metalness,
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: paintProfile.clearcoatRoughness,
    reflectivity: 0.9,
    envMapIntensity: paintProfile.envMapIntensity,
  });

  // Per-instance headlights & brake lights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e7,
    emissive: 0xfff2cc,
    emissiveIntensity: 0.65,
    roughness: 0.12,
    metalness: 0.08,
    envMapIntensity: 1.15,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x881322,
    emissive: 0xef233c,
    emissiveIntensity: 0.4,
    roughness: 0.14,
    metalness: 0.08,
    envMapIntensity: 1.05,
  });

  // Per-instance alternating emergency red/blue emitters driven by PoliceSystem
  const policeRedMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xff2233,
    emissiveIntensity: 0.4,
    roughness: 0.15,
    metalness: 0.08,
  });

  const policeBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    emissive: 0x2563eb,
    emissiveIntensity: 0.4,
    roughness: 0.15,
    metalness: 0.08,
  });

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6dc,
    map: headlightBeamTex ?? null,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });

  instanceDisposables.push(
    paintMat,
    headlightMat,
    brakeLightMat,
    policeRedMat,
    policeBlueMat,
    beamMat,
    shadowMat,
  );

  // 1. Consolidated Pursuit Hull, Two-Tone White Doors/Roof & Tactical Hardware
  //    (Keep paintedMesh as bodyGroup.children[0] for contract parity across all vehicles.)
  const paintedMesh = new THREE.Mesh(g.paintedHullExterior, paintMat);
  paintedMesh.castShadow = true;
  paintedMesh.receiveShadow = true;

  const whiteLiveryMesh = new THREE.Mesh(g.whiteTwoToneLivery, m.whiteLiveryMat);
  whiteLiveryMesh.castShadow = true;
  whiteLiveryMesh.receiveShadow = true;

  const matteDarkMesh = new THREE.Mesh(g.matteDarkExterior, m.matteTrimMat);
  matteDarkMesh.castShadow = true;

  const glossBlackMesh = new THREE.Mesh(g.glossBlackExterior, m.glossBlackMat);
  const chromeMesh = new THREE.Mesh(g.chromeExterior, m.chromeMat);

  const hlOpticsMesh = new THREE.Mesh(g.hlEmissiveOptics, headlightMat);
  const hlAmberMesh = new THREE.Mesh(g.hlAmberMarkers, m.amberMat);
  const hlLensMesh = new THREE.Mesh(g.hlClearLenses, m.clearLensMat);
  hlLensMesh.renderOrder = 3;

  const taillightMesh = new THREE.Mesh(g.taillightEmissive, brakeLightMat);

  // 2. Always-Visible Emergency Lightbar Emitters & Clear Polycarbonate Shell
  //    (Kept outside distance culling so flashing cruisers read from afar during pursuits.)
  const redLightsMesh = new THREE.Mesh(g.redEmergencyEmitters, policeRedMat);
  const blueLightsMesh = new THREE.Mesh(g.blueEmergencyEmitters, policeBlueMat);
  const takedownMesh = new THREE.Mesh(g.lightbarWhiteTakedowns, m.takedownWhiteMat);
  const lightbarDomeMesh = new THREE.Mesh(g.lightbarClearDomes, m.clearLensMat);
  lightbarDomeMesh.renderOrder = 3;

  const glassMesh = new THREE.Mesh(g.allGlass, m.glassMat);
  glassMesh.renderOrder = 2;

  bodyGroup.add(
    paintedMesh,
    whiteLiveryMesh,
    matteDarkMesh,
    glossBlackMesh,
    chromeMesh,
    hlOpticsMesh,
    hlAmberMesh,
    hlLensMesh,
    taillightMesh,
    redLightsMesh,
    blueLightsMesh,
    takedownMesh,
    lightbarDomeMesh,
    glassMesh,
  );

  // 3. Three-Tier Distance LOD for Patrol Cabin, Partition, MDC Laptop & Decals
  const detailLod = new THREE.LOD();
  const nearDetails = new THREE.Group();
  nearDetails.add(
    new THREE.Mesh(g.cabinDark, m.interiorDarkMat),
    new THREE.Mesh(g.seats, m.seatVinylMat),
    new THREE.Mesh(g.prisonerPartition, m.partitionSteelMat),
    new THREE.Mesh(g.mdcScreen, m.mdcScreenMat),
    new THREE.Mesh(g.doorDecals, m.decalMat),
    new THREE.Mesh(g.licensePlate, m.plateMat),
    new THREE.Mesh(g.panelSeams, m.seamMat),
  );
  const mediumDetails = new THREE.Group();
  mediumDetails.add(
    new THREE.Mesh(g.cabinDark, m.interiorDarkMat),
    new THREE.Mesh(g.seats, m.seatVinylMat),
    new THREE.Mesh(g.prisonerPartition, m.partitionSteelMat),
    new THREE.Mesh(g.doorDecals, m.decalMat),
  );
  detailLod.addLevel(nearDetails, 0);
  detailLod.addLevel(mediumDetails, 28);
  detailLod.addLevel(new THREE.Group(), 68);
  bodyGroup.add(detailLod);

  // 4. Four Heavy-Duty Pursuit Interceptor Wheels (r = 0.34m matching PoliceSystem)
  const makeSpinningWheel = (isLeft: boolean): THREE.Group => {
    const spinGroup = new THREE.Group();
    const visual = new THREE.Group();
    if (isLeft) {
      visual.rotation.y = Math.PI;
    }
    const tire = new THREE.Mesh(g.wheel.tireGeo, m.tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.wheel.rimGeo, m.pursuitRimMat);
    const cap = new THREE.Mesh(g.wheel.chromeCenterCapGeo, m.chromeMat);
    const rotor = new THREE.Mesh(g.wheel.rotorGeo, m.rotorMat);
    const caliper = new THREE.Mesh(g.wheel.caliperGeo, m.caliperMat);
    visual.add(tire, rim, cap, rotor, caliper);
    spinGroup.add(visual);
    return spinGroup;
  };

  const { wheelRadius, frontAxleZ, rearAxleZ, frontTrackHalf, rearTrackHalf } =
    VCPD_INTERCEPTOR_DIMS;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-frontTrackHalf, wheelRadius, frontAxleZ);
  const wFL = makeSpinningWheel(true);
  frontLeftPivot.add(wFL);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(frontTrackHalf, wheelRadius, frontAxleZ);
  const wFR = makeSpinningWheel(false);
  frontRightPivot.add(wFR);

  const wRL = makeSpinningWheel(true);
  wRL.position.set(-rearTrackHalf, wheelRadius, rearAxleZ);

  const wRR = makeSpinningWheel(false);
  wRR.position.set(rearTrackHalf, wheelRadius, rearAxleZ);

  root.add(frontLeftPivot, frontRightPivot, wRL, wRR);

  // 5. Projected Dual-Headlight Road Beam Pool
  const headlightBeam = new THREE.Mesh(g.beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -spec.length / 2 - 4.7);
  root.add(headlightBeam);

  // 6. Grounding Radial Contact Shadow Disc
  const shadowDisc = new THREE.Mesh(g.shadowGeo, shadowMat);
  shadowDisc.position.y = 0.085;
  root.add(shadowDisc);

  return {
    root,
    bodyGroup,
    frontLeftPivot,
    frontRightPivot,
    wheels: [wFL, wFR, wRL, wRR],
    paintMat,
    glassMat: m.glassMat,
    headlightMat,
    brakeLightMat,
    headlightBeam,
    policeRedMat,
    policeBlueMat,
    dispose: () => {
      for (const d of instanceDisposables) d.dispose();
    },
  };
}
