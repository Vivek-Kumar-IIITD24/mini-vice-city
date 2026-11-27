import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import { createVeloceGtRig, disposeVeloceGtSharedResources } from './veloceGtModel';
import {
  createSolsticeRoyaleRig,
  disposeSolsticeRoyaleSharedResources,
} from './solsticeRoyaleModel';
import {
  createBaysideTitanRig,
  disposeBaysideTitanSharedResources,
} from './baysideTitanModel';
import {
  createTrafficSedanRig,
  disposeTrafficSedanSharedResources,
} from './trafficSedanModel';
import {
  createVcpdInterceptorRig,
  disposeVcpdInterceptorSharedResources,
} from './vcpdInterceptorModel';

export interface VehiclePaintProfile {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
}

export function getVehiclePaintMaterialProfile(kind: VehicleKind): VehiclePaintProfile {
  switch (kind) {
    case VehicleKind.Sports:
      // Veloce GT: deep glossy automotive metallic clearcoat
      return {
        roughness: 0.22,
        metalness: 0.48,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.32,
      };
    case VehicleKind.Sedan:
      // Solstice Royale: luxury pearlescent metallic lacquer
      return {
        roughness: 0.2,
        metalness: 0.56,
        clearcoat: 0.96,
        clearcoatRoughness: 0.075,
        envMapIntensity: 1.28,
      };
    case VehicleKind.Suv:
      // Bayside Titan: rugged satin-clearcoat SUV finish
      return {
        roughness: 0.29,
        metalness: 0.34,
        clearcoat: 0.78,
        clearcoatRoughness: 0.14,
        envMapIntensity: 1.08,
      };
    case VehicleKind.Police:
      // VCPD Interceptor: crisp patrol fleet gloss
      return {
        roughness: 0.23,
        metalness: 0.32,
        clearcoat: 0.92,
        clearcoatRoughness: 0.085,
        envMapIntensity: 1.2,
      };
    case VehicleKind.Traffic:
    default:
      // Ambient coastal traffic fleet
      return {
        roughness: 0.28,
        metalness: 0.34,
        clearcoat: 0.82,
        clearcoatRoughness: 0.13,
        envMapIntensity: 1.1,
      };
  }
}

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  wheels: THREE.Object3D[];
  paintMat: THREE.MeshPhysicalMaterial;
  glassMat: THREE.MeshPhysicalMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  headlightBeam: THREE.Mesh;
  policeRedMat?: THREE.MeshStandardMaterial;
  policeBlueMat?: THREE.MeshStandardMaterial;
  dispose: () => void;
}

let cachedBeamTexture: THREE.Texture | null = null;

function getSoftHeadlightBeamTexture(): THREE.Texture | null {
  if (cachedBeamTexture) return cachedBeamTexture;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  // Left & right soft elliptical headlight cones (bright near bumper at bottom y=110, fading forward toward y=12)
  for (const cx of [44, 84]) {
    const grad = ctx.createRadialGradient(cx, 102, 4, cx, 64, 56);
    grad.addColorStop(0.0, 'rgba(255, 248, 225, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 244, 214, 0.48)');
    grad.addColorStop(0.72, 'rgba(255, 240, 200, 0.12)');
    grad.addColorStop(1.0, 'rgba(255, 240, 200, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  cachedBeamTexture = tex;
  return tex;
}

export function disposeSharedVehicleResources(): void {
  if (cachedBeamTexture) {
    cachedBeamTexture.dispose();
    cachedBeamTexture = null;
  }
  disposeVeloceGtSharedResources();
  disposeSolsticeRoyaleSharedResources();
  disposeBaysideTitanSharedResources();
  disposeTrafficSedanSharedResources();
  disposeVcpdInterceptorSharedResources();
}

/**
 * Builds a composite procedural 3D vehicle pivoted at bottom-center (y = 0).
 * Local forward direction is -Z.
 * Routes Veloce GT (Sports), Solstice Royale (Luxury Sedan), Bayside Titan (Luxury SUV),
 * City Cruiser (Civilian Traffic Sedan), and VCPD Interceptor (Police Pursuit)
 * to their dedicated sculpted builders.
 */
export function createVehicleMesh(
  spec: VehicleSpec,
  contactShadowMap: THREE.Texture,
  overrideColor?: number,
): VehicleRig {
  if (spec.id === 'veloce_gt') {
    return createVeloceGtRig(spec, contactShadowMap, getSoftHeadlightBeamTexture(), overrideColor);
  }
  if (spec.id === 'solstice_royale') {
    return createSolsticeRoyaleRig(spec, contactShadowMap, getSoftHeadlightBeamTexture(), overrideColor);
  }
  if (spec.id === 'bayside_titan') {
    return createBaysideTitanRig(spec, contactShadowMap, getSoftHeadlightBeamTexture(), overrideColor);
  }
  if (spec.id === 'traffic_car') {
    return createTrafficSedanRig(spec, contactShadowMap, getSoftHeadlightBeamTexture(), overrideColor);
  }
  if (spec.id === 'vcpd_interceptor') {
    return createVcpdInterceptorRig(spec, contactShadowMap, getSoftHeadlightBeamTexture(), overrideColor);
  }

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const disposables: Array<{ dispose: () => void }> = [];
  const mainColor = overrideColor ?? spec.color;
  const paintProfile = getVehiclePaintMaterialProfile(spec.kind);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: paintProfile.metalness,
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: paintProfile.clearcoatRoughness,
    reflectivity: 0.9,
    envMapIntensity: paintProfile.envMapIntensity,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: spec.accentColor,
    roughness: spec.kind === VehicleKind.Police ? 0.24 : 0.34,
    metalness: spec.kind === VehicleKind.Police ? 0.22 : 0.42,
    clearcoat: spec.kind === VehicleKind.Police ? 0.88 : 0.65,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
  });
  // Realistic dark-tinted reflective automotive windshield & cabin glass (no multi-pass transmission cost)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e2236,
    roughness: 0.055,
    metalness: 0.14,
    ior: 1.52,
    reflectivity: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.55,
    transparent: true,
    opacity: 0.86,
  });
  const cabinInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.2,
  });
  const trimDarkMat = new THREE.MeshStandardMaterial({
    color: 0x161922,
    roughness: 0.68,
    metalness: 0.22,
    envMapIntensity: 0.55,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe6edf6,
    roughness: 0.12,
    metalness: 0.95,
    envMapIntensity: 1.45,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x17191e,
    roughness: 0.9,
    metalness: 0.04,
    envMapIntensity: 0.3,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdce4ef,
    roughness: 0.2,
    metalness: 0.88,
    envMapIntensity: 1.35,
  });
  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff8e7,
    emissive: 0xfff3c4,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.12,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.25,
  });
  const brakeLightMat = new THREE.MeshPhysicalMaterial({
    color: 0x7f1d1d,
    emissive: 0xef4444,
    emissiveIntensity: 0.35,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.15,
  });

  disposables.push(
    paintMat,
    accentMat,
    glassMat,
    cabinInteriorMat,
    trimDarkMat,
    chromeMat,
    tireMat,
    rimMat,
    headlightMat,
    brakeLightMat,
  );

  const w = spec.width;
  const l = spec.length;
  const isSuv = spec.kind === VehicleKind.Suv;
  const isSports = spec.kind === VehicleKind.Sports;
  const isPolice = spec.kind === VehicleKind.Police;

  const groundClearance = isSuv ? 0.34 : isSports ? 0.2 : 0.25;
  const lowerH = isSuv ? 0.68 : isSports ? 0.46 : 0.54;
  const cabinH = isSuv ? 0.64 : isSports ? 0.42 : 0.52;

  // 1. Sculpted Lower Chassis / Hull
  const lowerGeo = new THREE.BoxGeometry(w, lowerH, l);
  const lowerMesh = new THREE.Mesh(lowerGeo, paintMat);
  lowerMesh.position.y = groundClearance + lowerH / 2;
  lowerMesh.castShadow = true;
  lowerMesh.receiveShadow = true;
  bodyGroup.add(lowerMesh);
  disposables.push(lowerGeo);

  // Police white side doors livery band
  if (isPolice) {
    const doorBandGeo = new THREE.BoxGeometry(w + 0.03, lowerH * 0.82, l * 0.44);
    const doorBand = new THREE.Mesh(doorBandGeo, accentMat);
    doorBand.position.set(0, groundClearance + lowerH * 0.52, 0.05);
    bodyGroup.add(doorBand);
    disposables.push(doorBandGeo);
  }

  // 2. Sculpted Front Hood Taper + Front Bumper Splitter
  const hoodGeo = new THREE.BoxGeometry(w * 0.92, lowerH * 0.35, l * 0.32);
  const hoodMesh = new THREE.Mesh(hoodGeo, paintMat);
  hoodMesh.position.set(0, groundClearance + lowerH + 0.04, -l * 0.27);
  hoodMesh.rotation.x = 0.08;
  bodyGroup.add(hoodMesh);
  disposables.push(hoodGeo);

  const frontBumperGeo = new THREE.BoxGeometry(w + 0.06, 0.22, 0.32);
  const frontBumper = new THREE.Mesh(frontBumperGeo, isPolice ? trimDarkMat : trimDarkMat);
  frontBumper.position.set(0, groundClearance + 0.11, -l / 2 - 0.04);
  bodyGroup.add(frontBumper);
  disposables.push(frontBumperGeo);

  // Police front push bar
  if (isPolice) {
    const pushBarGeo = new THREE.BoxGeometry(w * 0.58, 0.34, 0.16);
    const pushBar = new THREE.Mesh(pushBarGeo, trimDarkMat);
    pushBar.position.set(0, groundClearance + 0.28, -l / 2 - 0.18);
    bodyGroup.add(pushBar);
    disposables.push(pushBarGeo);
  }

  // 3. Front Grille
  const grilleGeo = new THREE.BoxGeometry(w * 0.54, lowerH * 0.44, 0.08);
  const grilleMesh = new THREE.Mesh(grilleGeo, spec.kind === VehicleKind.Sedan ? chromeMat : trimDarkMat);
  grilleMesh.position.set(0, groundClearance + lowerH * 0.48, -l / 2 - 0.02);
  bodyGroup.add(grilleMesh);
  disposables.push(grilleGeo);

  // 4. Upper Greenhouse Cabin (Dark Interior Core + Reflective Tinted Automotive Glass) & Roof
  const cabinLen = isSuv ? l * 0.62 : isSports ? l * 0.44 : l * 0.48;
  const cabinZ = isSuv ? 0.38 : isSports ? 0.22 : 0.18;
  const cabinY = groundClearance + lowerH + cabinH / 2 - 0.04;

  const cabinCoreGeo = new THREE.BoxGeometry(w * 0.74, cabinH * 0.84, cabinLen * 0.86);
  const cabinCoreMesh = new THREE.Mesh(cabinCoreGeo, cabinInteriorMat);
  cabinCoreMesh.position.set(0, cabinY - 0.02, cabinZ);
  bodyGroup.add(cabinCoreMesh);
  disposables.push(cabinCoreGeo);

  const cabinGeo = new THREE.BoxGeometry(w * 0.84, cabinH, cabinLen);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, cabinY, cabinZ);
  cabinMesh.castShadow = true;
  bodyGroup.add(cabinMesh);
  disposables.push(cabinGeo);

  // Painted Roof Cap
  const roofGeo = new THREE.BoxGeometry(w * 0.8, 0.09, cabinLen * 0.86);
  const roofMesh = new THREE.Mesh(roofGeo, isPolice ? accentMat : paintMat);
  roofMesh.position.set(0, groundClearance + lowerH + cabinH - 0.03, cabinZ + 0.04);
  bodyGroup.add(roofMesh);
  disposables.push(roofGeo);

  // 5. Rear Bumper + Twin Chrome Exhausts
  const rearBumperGeo = new THREE.BoxGeometry(w + 0.04, 0.22, 0.26);
  const rearBumper = new THREE.Mesh(rearBumperGeo, trimDarkMat);
  rearBumper.position.set(0, groundClearance + 0.12, l / 2 + 0.02);
  bodyGroup.add(rearBumper);
  disposables.push(rearBumperGeo);

  const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.24, 8);
  exhaustGeo.rotateX(Math.PI / 2);
  disposables.push(exhaustGeo);
  for (const sx of [-0.46, 0.46]) {
    const ex = new THREE.Mesh(exhaustGeo, chromeMat);
    ex.position.set(sx, groundClearance + 0.09, l / 2 + 0.12);
    bodyGroup.add(ex);
  }

  // 6. Sports Rear Wing OR SUV Roof Rails
  if (isSports) {
    const wingGeo = new THREE.BoxGeometry(w * 0.94, 0.07, 0.34);
    const strutGeo = new THREE.BoxGeometry(0.08, 0.24, 0.18);
    disposables.push(wingGeo, strutGeo);
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, groundClearance + lowerH + 0.24, l / 2 - 0.22);
    const sL = new THREE.Mesh(strutGeo, accentMat);
    sL.position.set(-w * 0.3, groundClearance + lowerH + 0.12, l / 2 - 0.22);
    const sR = new THREE.Mesh(strutGeo, accentMat);
    sR.position.set(w * 0.3, groundClearance + lowerH + 0.12, l / 2 - 0.22);
    bodyGroup.add(wing, sL, sR);
  } else if (isSuv) {
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, cabinLen * 0.8);
    disposables.push(railGeo);
    for (const sx of [-w * 0.34, w * 0.34]) {
      const rail = new THREE.Mesh(railGeo, chromeMat);
      rail.position.set(sx, groundClearance + lowerH + cabinH + 0.06, cabinZ + 0.04);
      bodyGroup.add(rail);
    }
  }

  // 7. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.1, 0.14);
  disposables.push(mirrorGeo);
  for (const sx of [-w * 0.52, w * 0.52]) {
    const mir = new THREE.Mesh(mirrorGeo, paintMat);
    mir.position.set(sx, groundClearance + lowerH + 0.14, -l * 0.07);
    bodyGroup.add(mir);
  }

  // 8. Headlights & Rear Brake Lightbar
  const hlGeo = new THREE.BoxGeometry(0.42, 0.14, 0.08);
  disposables.push(hlGeo);
  for (const sx of [-w * 0.34, w * 0.34]) {
    const hl = new THREE.Mesh(hlGeo, headlightMat);
    hl.position.set(sx, groundClearance + lowerH * 0.68, -l / 2 - 0.02);
    bodyGroup.add(hl);
  }

  const tailGeo = new THREE.BoxGeometry(isSports ? w * 0.84 : 0.46, 0.14, 0.08);
  disposables.push(tailGeo);
  if (isSports) {
    const tailBar = new THREE.Mesh(tailGeo, brakeLightMat);
    tailBar.position.set(0, groundClearance + lowerH * 0.72, l / 2 + 0.02);
    bodyGroup.add(tailBar);
  } else {
    for (const sx of [-w * 0.33, w * 0.33]) {
      const tl = new THREE.Mesh(tailGeo, brakeLightMat);
      tl.position.set(sx, groundClearance + lowerH * 0.68, l / 2 + 0.02);
      bodyGroup.add(tl);
    }
  }

  // Subtle projected dual-headlight light-beam pool on road ahead (soft gradient falloff at edges)
  const beamGeo = new THREE.PlaneGeometry(w * 2.3, 9.5);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff4d6,
    map: getSoftHeadlightBeamTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(beamGeo, beamMat);
  const headlightBeam = new THREE.Mesh(beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -l / 2 - 4.7);
  root.add(headlightBeam);

  // 9. Police Roof Lightbar (Alternating Red/Blue)
  let policeRedMat: THREE.MeshStandardMaterial | undefined;
  let policeBlueMat: THREE.MeshStandardMaterial | undefined;
  if (isPolice) {
    policeRedMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xff2233,
      emissiveIntensity: 0.4,
      roughness: 0.15,
    });
    policeBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x2563eb,
      emissiveIntensity: 0.4,
      roughness: 0.15,
    });
    const barBaseGeo = new THREE.BoxGeometry(1.24, 0.08, 0.28);
    const lensGeo = new THREE.BoxGeometry(0.52, 0.14, 0.24);
    disposables.push(policeRedMat, policeBlueMat, barBaseGeo, lensGeo);

    const roofY = groundClearance + lowerH + cabinH + 0.05;
    const barBase = new THREE.Mesh(barBaseGeo, trimDarkMat);
    barBase.position.set(0, roofY, cabinZ);
    const redLens = new THREE.Mesh(lensGeo, policeRedMat);
    redLens.position.set(-0.32, roofY + 0.09, cabinZ);
    const blueLens = new THREE.Mesh(lensGeo, policeBlueMat);
    blueLens.position.set(0.32, roofY + 0.09, cabinZ);
    bodyGroup.add(barBase, redLens, blueLens);
  }

  // 10. Four Composite Wheel Assemblies (Tire + Alloy Rim)
  const wheelRadius = isSuv ? 0.42 : 0.34;
  const wheelWidth = isSuv ? 0.28 : 0.24;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(wheelWidth + 0.03, wheelRadius * 1.05, 0.07);
  disposables.push(tireGeo, rimGeo, spokeGeo);

  const makeWheel = () => {
    const wg = new THREE.Group();
    const t = new THREE.Mesh(tireGeo, tireMat);
    const r = new THREE.Mesh(rimGeo, rimMat);
    const sp = new THREE.Mesh(spokeGeo, trimDarkMat);
    wg.add(t, r, sp);
    return wg;
  };

  const frontZ = -l * 0.31;
  const rearZ = l * 0.31;
  const wheelX = w * 0.49;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-wheelX, wheelRadius, frontZ);
  const wFL = makeWheel();
  frontLeftPivot.add(wFL);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(wheelX, wheelRadius, frontZ);
  const wFR = makeWheel();
  frontRightPivot.add(wFR);

  const wRL = makeWheel();
  wRL.position.set(-wheelX, wheelRadius, rearZ);

  const wRR = makeWheel();
  wRR.position.set(wheelX, wheelRadius, rearZ);

  root.add(frontLeftPivot, frontRightPivot, wRL, wRR);

  // 11. Radial Contact Shadow Grounding Disc
  const shadowGeo = new THREE.PlaneGeometry(w * 1.38, l * 1.24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  disposables.push(shadowGeo, shadowMat);
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
    policeRedMat,
    policeBlueMat,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
