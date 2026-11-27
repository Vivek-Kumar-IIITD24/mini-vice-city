import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import type { VehicleRig } from './vehicleModels';
import { getVehiclePaintMaterialProfile } from './vehicleModels';
import {
  TRAFFIC_SEDAN_DIMS,
  TrafficWheelParts,
  buildTrafficBodyShellGeometry,
  buildTrafficExteriorDetailsGeometry,
  buildTrafficFrontFasciaGeometry,
  buildTrafficGlassGeometry,
  buildTrafficInteriorGeometry,
  buildTrafficPillarsGeometry,
  buildTrafficRearFasciaGeometry,
  buildTrafficRoofGeometry,
  buildTrafficWheelParts,
  mergeTrafficGeometries,
} from './trafficSedanGeometry';

interface TrafficSedanSharedCache {
  geometries: {
    paintedExterior: THREE.BufferGeometry;
    matteDarkExterior: THREE.BufferGeometry;
    glossBlackExterior: THREE.BufferGeometry;
    chromeExterior: THREE.BufferGeometry;
    allGlass: THREE.BufferGeometry;
    hlEmissiveOptics: THREE.BufferGeometry;
    hlAmberMarkers: THREE.BufferGeometry;
    hlClearLenses: THREE.BufferGeometry;
    taillightEmissive: THREE.BufferGeometry;
    licensePlate: THREE.BufferGeometry;
    panelSeams: THREE.BufferGeometry;
    cabinDark: THREE.BufferGeometry;
    seats: THREE.BufferGeometry;
    wheel: TrafficWheelParts;
    beamGeo: THREE.BufferGeometry;
    shadowGeo: THREE.BufferGeometry;
  };
  materials: {
    glassMat: THREE.MeshPhysicalMaterial;
    clearLensMat: THREE.MeshPhysicalMaterial;
    glossBlackMat: THREE.MeshPhysicalMaterial;
    matteTrimMat: THREE.MeshStandardMaterial;
    chromeMat: THREE.MeshStandardMaterial;
    alloyMat: THREE.MeshStandardMaterial;
    tireMat: THREE.MeshStandardMaterial;
    rotorMat: THREE.MeshStandardMaterial;
    interiorDarkMat: THREE.MeshStandardMaterial;
    seatFabricMat: THREE.MeshStandardMaterial;
    amberMat: THREE.MeshStandardMaterial;
    plateMat: THREE.MeshStandardMaterial;
    seamMat: THREE.MeshStandardMaterial;
  };
  textures: {
    tireTreadMap: THREE.Texture | null;
    plateMap: THREE.Texture | null;
  };
}

let sharedCache: TrafficSedanSharedCache | null = null;

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

function buildCommuterTireTreadTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    96,
    96,
    (ctx, w, h) => {
      ctx.fillStyle = '#1b1d23';
      ctx.fillRect(0, 0, w, h);
      // Three quiet all-season circumferential grooves
      ctx.fillStyle = '#101218';
      for (const gx of [24, 46, 68]) {
        ctx.fillRect(gx, 0, 4, h);
      }
      ctx.strokeStyle = '#252932';
      ctx.lineWidth = 2;
      for (let y = 0; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(6, y);
        ctx.lineTo(22, y + 4);
        ctx.moveTo(74, y + 4);
        ctx.lineTo(90, y);
        ctx.stroke();
      }
    },
    1,
    4,
  );
}

function buildCivilianPlateTexture(): THREE.Texture | null {
  return makeCanvasTexture(192, 96, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.65, '#eef2f6');
    grad.addColorStop(1, '#dbe4ee');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VICE COAST', w / 2, 24);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('VC 428', w / 2, 68);
  });
}

function mergeAndDisposeInputs(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeTrafficGeometries(geos);
  for (const g of geos) {
    g.dispose();
  }
  return merged;
}

function getSharedCache(): TrafficSedanSharedCache {
  if (sharedCache) return sharedCache;

  // Build individual parametric sub-assemblies and consolidate by material
  // so 14+ active civilian traffic cars share one compact set of GPU buffers & materials.
  const bodyShell = buildTrafficBodyShellGeometry();
  const roof = buildTrafficRoofGeometry();
  const glass = buildTrafficGlassGeometry();
  const pillars = buildTrafficPillarsGeometry();
  const front = buildTrafficFrontFasciaGeometry();
  const rear = buildTrafficRearFasciaGeometry();
  const ext = buildTrafficExteriorDetailsGeometry();
  const interior = buildTrafficInteriorGeometry();
  const wheel = buildTrafficWheelParts(
    TRAFFIC_SEDAN_DIMS.wheelRadius,
    TRAFFIC_SEDAN_DIMS.wheelWidth,
  );

  // Consolidate rigid same-material exterior sub-meshes to minimize per-car draw calls
  const paintedExterior = mergeAndDisposeInputs([
    bodyShell,
    roof.paintedRoof,
    roof.roofEdges,
    pillars.paintedPillars,
    ext.paintedMirrorsAndHandles,
  ]);

  const matteDarkExterior = mergeAndDisposeInputs([
    roof.roofHeadliner,
    front.grilleDark,
    rear.rearDarkValance,
    ext.darkMirrorsAndUnderbody,
  ]);

  const glossBlackExterior = mergeAndDisposeInputs([
    pillars.darkPillarsAndTrim,
    front.hlHousings,
  ]);

  const chromeExterior = mergeAndDisposeInputs([
    front.grilleChromeAccent,
    rear.rearChromeAccent,
  ]);

  // Dispose unused separate left/right side windows after using sideWindowsMerged
  glass.sideWindowL.dispose();
  glass.sideWindowR.dispose();
  const allGlass = mergeAndDisposeInputs([
    glass.windshield,
    glass.rearGlass,
    glass.sideWindowsMerged,
  ]);

  const cabinDark = mergeAndDisposeInputs([interior.cabinTub, interior.dashAndWheel]);

  const beamGeo = new THREE.PlaneGeometry(TRAFFIC_SEDAN_DIMS.width * 2.15, 8.8);
  beamGeo.rotateX(-Math.PI / 2);

  const shadowGeo = new THREE.PlaneGeometry(
    TRAFFIC_SEDAN_DIMS.width * 1.38,
    TRAFFIC_SEDAN_DIMS.length * 1.24,
  );
  shadowGeo.rotateX(-Math.PI / 2);

  const tireTreadMap = buildCommuterTireTreadTexture();
  const plateMap = buildCivilianPlateTexture();

  // Shared static PBR material suite (never mutated per-car)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x152534,
    roughness: 0.055,
    metalness: 0.1,
    ior: 1.5,
    reflectivity: 0.94,
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
    metalness: 0.05,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.5,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });

  const glossBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x11151d,
    roughness: 0.16,
    metalness: 0.16,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.15,
  });

  const matteTrimMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.82,
    metalness: 0.1,
    envMapIntensity: 0.38,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe6ecf3,
    roughness: 0.14,
    metalness: 0.92,
    envMapIntensity: 1.4,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xd8dfe8,
    roughness: 0.22,
    metalness: 0.86,
    envMapIntensity: 1.35,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: tireTreadMap ? 0xffffff : 0x1a1d24,
    map: tireTreadMap ?? null,
    roughness: 0.88,
    metalness: 0.04,
    envMapIntensity: 0.26,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x9ca5b3,
    roughness: 0.34,
    metalness: 0.82,
    envMapIntensity: 0.95,
  });

  const interiorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.86,
    metalness: 0.04,
    envMapIntensity: 0.28,
  });

  // Soft everyday medium-slate woven cloth seats
  const seatFabricMat = new THREE.MeshStandardMaterial({
    color: 0x525b68,
    roughness: 0.9,
    metalness: 0.02,
    envMapIntensity: 0.25,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xe68a00,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.08,
    envMapIntensity: 1.0,
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plateMap ?? null,
    roughness: 0.42,
    metalness: 0.1,
    envMapIntensity: 0.65,
  });

  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e14,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.15,
  });

  sharedCache = {
    geometries: {
      paintedExterior,
      matteDarkExterior,
      glossBlackExterior,
      chromeExterior,
      allGlass,
      hlEmissiveOptics: front.hlEmissiveOptics,
      hlAmberMarkers: front.hlAmberMarkers,
      hlClearLenses: front.hlClearLenses,
      taillightEmissive: rear.taillightEmissive,
      licensePlate: rear.licensePlate,
      panelSeams: ext.panelSeams,
      cabinDark,
      seats: interior.seats,
      wheel,
      beamGeo,
      shadowGeo,
    },
    materials: {
      glassMat,
      clearLensMat,
      glossBlackMat,
      matteTrimMat,
      chromeMat,
      alloyMat,
      tireMat,
      rotorMat,
      interiorDarkMat,
      seatFabricMat,
      amberMat,
      plateMat,
      seamMat,
    },
    textures: {
      tireTreadMap,
      plateMap,
    },
  };

  return sharedCache;
}

export function disposeTrafficSedanSharedResources(): void {
  if (!sharedCache) return;
  const g = sharedCache.geometries;
  const geoList: THREE.BufferGeometry[] = [
    g.paintedExterior,
    g.matteDarkExterior,
    g.glossBlackExterior,
    g.chromeExterior,
    g.allGlass,
    g.hlEmissiveOptics,
    g.hlAmberMarkers,
    g.hlClearLenses,
    g.taillightEmissive,
    g.licensePlate,
    g.panelSeams,
    g.cabinDark,
    g.seats,
    g.wheel.tireGeo,
    g.wheel.rimAlloyGeo,
    g.wheel.hubCapGeo,
    g.wheel.rotorGeo,
    g.beamGeo,
    g.shadowGeo,
  ];
  for (const geo of geoList) geo.dispose();

  const m = sharedCache.materials;
  const matList: THREE.Material[] = [
    m.glassMat,
    m.clearLensMat,
    m.glossBlackMat,
    m.matteTrimMat,
    m.chromeMat,
    m.alloyMat,
    m.tireMat,
    m.rotorMat,
    m.interiorDarkMat,
    m.seatFabricMat,
    m.amberMat,
    m.plateMat,
    m.seamMat,
  ];
  for (const mat of matList) mat.dispose();

  sharedCache.textures.tireTreadMap?.dispose();
  sharedCache.textures.plateMap?.dispose();
  sharedCache = null;
}

/**
 * Builds the upgraded Phase 2C-3A Civilian Traffic Sedan ("City Cruiser"),
 * designed specifically for 14+ simultaneous fleet instances:
 * - Shares all GPU geometries, procedural textures, and static PBR materials.
 * - Allocates only per-instance mutable materials (paintMat for color variation,
 *   headlightMat, brakeLightMat for independent traffic braking, beamMat, shadowMat).
 * - Preserves full VehicleRig compatibility (pivots, 0.34m spinning wheels, lights, disposal).
 */
export function createTrafficSedanRig(
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
  const paintProfile = getVehiclePaintMaterialProfile(VehicleKind.Traffic);
  const mainColor = overrideColor ?? spec.color;

  // Per-instance paint material supporting all coastal TRAFFIC_COLORS variations
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: paintProfile.metalness,
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: paintProfile.clearcoatRoughness,
    reflectivity: 0.88,
    envMapIntensity: paintProfile.envMapIntensity,
  });

  // Per-instance headlights & brake lights so each traffic car modulates independently
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e7,
    emissive: 0xfff2cc,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.08,
    envMapIntensity: 1.1,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x881322,
    emissive: 0xef233c,
    emissiveIntensity: 0.4,
    roughness: 0.14,
    metalness: 0.08,
    envMapIntensity: 1.05,
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
    opacity: 0.72,
    depthWrite: false,
  });

  instanceDisposables.push(paintMat, headlightMat, brakeLightMat, beamMat, shadowMat);

  // 1. Consolidated Sculpted Exterior Meshes (low draw calls per car)
  const paintedMesh = new THREE.Mesh(g.paintedExterior, paintMat);
  paintedMesh.castShadow = true;
  paintedMesh.receiveShadow = true;

  const matteDarkMesh = new THREE.Mesh(g.matteDarkExterior, m.matteTrimMat);
  const glossBlackMesh = new THREE.Mesh(g.glossBlackExterior, m.glossBlackMat);
  const chromeMesh = new THREE.Mesh(g.chromeExterior, m.chromeMat);

  const hlOpticsMesh = new THREE.Mesh(g.hlEmissiveOptics, headlightMat);
  const hlAmberMesh = new THREE.Mesh(g.hlAmberMarkers, m.amberMat);
  const hlLensMesh = new THREE.Mesh(g.hlClearLenses, m.clearLensMat);
  hlLensMesh.renderOrder = 3;

  const taillightMesh = new THREE.Mesh(g.taillightEmissive, brakeLightMat);

  const glassMesh = new THREE.Mesh(g.allGlass, m.glassMat);
  glassMesh.renderOrder = 2;

  bodyGroup.add(
    paintedMesh,
    matteDarkMesh,
    glossBlackMesh,
    chromeMesh,
    hlOpticsMesh,
    hlAmberMesh,
    hlLensMesh,
    taillightMesh,
    glassMesh,
  );

  // 2. Three-Tier Distance LOD for Lightweight Cabin Interior & Micro-Details
  const detailLod = new THREE.LOD();
  const nearDetails = new THREE.Group();
  nearDetails.add(
    new THREE.Mesh(g.cabinDark, m.interiorDarkMat),
    new THREE.Mesh(g.seats, m.seatFabricMat),
    new THREE.Mesh(g.licensePlate, m.plateMat),
    new THREE.Mesh(g.panelSeams, m.seamMat),
  );
  const mediumDetails = new THREE.Group();
  mediumDetails.add(
    new THREE.Mesh(g.cabinDark, m.interiorDarkMat),
    new THREE.Mesh(g.seats, m.seatFabricMat),
  );
  detailLod.addLevel(nearDetails, 0);
  detailLod.addLevel(mediumDetails, 26);
  detailLod.addLevel(new THREE.Group(), 64);
  bodyGroup.add(detailLod);

  // 3. Four Lightweight Compact 5-V-Spoke Silver Alloy Wheels (r = 0.34m)
  const makeSpinningWheel = (isLeft: boolean): THREE.Group => {
    const spinGroup = new THREE.Group();
    const visual = new THREE.Group();
    if (isLeft) {
      visual.rotation.y = Math.PI;
    }
    const tire = new THREE.Mesh(g.wheel.tireGeo, m.tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.wheel.rimAlloyGeo, m.alloyMat);
    const cap = new THREE.Mesh(g.wheel.hubCapGeo, m.chromeMat);
    const rotor = new THREE.Mesh(g.wheel.rotorGeo, m.rotorMat);
    visual.add(tire, rim, cap, rotor);
    spinGroup.add(visual);
    return spinGroup;
  };

  const { wheelRadius, frontAxleZ, rearAxleZ, frontTrackHalf, rearTrackHalf } =
    TRAFFIC_SEDAN_DIMS;

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

  // 4. Projected Dual-Headlight Road Beam Pool (shared plane geometry)
  const headlightBeam = new THREE.Mesh(g.beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -spec.length / 2 - 4.3);
  root.add(headlightBeam);

  // 5. Grounding Radial Contact Shadow Disc (shared plane geometry)
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
    dispose: () => {
      for (const d of instanceDisposables) d.dispose();
    },
  };
}
