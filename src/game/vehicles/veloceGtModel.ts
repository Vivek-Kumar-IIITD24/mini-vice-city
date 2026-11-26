import * as THREE from 'three';
import { VehicleKind, VehicleSpec } from '../types';
import type { VehicleRig } from './vehicleModels';
import { getVehiclePaintMaterialProfile } from './vehicleModels';
import {
  VELOCE_GT_DIMS,
  buildSweptPillarGeometry,
  buildVeloceBodyShellGeometry,
  buildVeloceBucketSeatGeometry,
  buildVeloceConformalHeadlightCluster,
  buildVeloceFastbackButtressGeometry,
  buildVeloceFrontSplitterGeometry,
  buildVeloceHoodVentsGeometry,
  buildVelocePanelSeamsGeometry,
  buildVeloceRearDiffuserGeometry,
  buildVeloceRearGlassGeometry,
  buildVeloceRearIndicatorGeometry,
  buildVeloceRearWingGeometry,
  buildVeloceRoofGeometry,
  buildVeloceSideIntakeGeometry,
  buildVeloceSideMirrorGeometry,
  buildVeloceSideSkirtGeometry,
  buildVeloceSideWindowGeometry,
  buildVeloceTaillightBladeGeometry,
  buildVeloceWheelParts,
  buildVeloceWindshieldGeometry,
  buildVeloceWipersGeometry,
  mergeSimpleGeometries,
} from './veloceGtGeometry';

interface VeloceGtSharedCache {
  geometries: {
    bodyShell: THREE.BufferGeometry;
    roof: THREE.BufferGeometry;
    windshield: THREE.BufferGeometry;
    rearGlass: THREE.BufferGeometry;
    sideWindowL: THREE.BufferGeometry;
    sideWindowR: THREE.BufferGeometry;
    aPillars: THREE.BufferGeometry;
    cPillars: THREE.BufferGeometry;
    bPillars: THREE.BufferGeometry;
    splitter: THREE.BufferGeometry;
    sideSkirts: THREE.BufferGeometry;
    rearWingBlade: THREE.BufferGeometry;
    rearWingEndplates: THREE.BufferGeometry;
    rearWingPylons: THREE.BufferGeometry;
    diffuser: THREE.BufferGeometry;
    underbodyAndLiners: THREE.BufferGeometry;
    frontGrilleAndIntakes: THREE.BufferGeometry;
    sideIntakeBlades: THREE.BufferGeometry;
    rearFasciaCove: THREE.BufferGeometry;
    mirrorHousings: THREE.BufferGeometry;
    mirrorStalks: THREE.BufferGeometry;
    mirrorGlass: THREE.BufferGeometry;
    doorHandlesAndTrim: THREE.BufferGeometry;
    exhaustOuter: THREE.BufferGeometry;
    exhaustInner: THREE.BufferGeometry;
    headlightHousing: THREE.BufferGeometry;
    headlightProjectorBezels: THREE.BufferGeometry;
    headlightEmissive: THREE.BufferGeometry;
    headlightLenses: THREE.BufferGeometry;
    indicatorStrips: THREE.BufferGeometry;
    taillightBlade: THREE.BufferGeometry;
    licensePlate: THREE.BufferGeometry;
    rearEmblem: THREE.BufferGeometry;
    wipers: THREE.BufferGeometry;
    panelSeams: THREE.BufferGeometry;
    interiorTub: THREE.BufferGeometry;
    interiorSeats: THREE.BufferGeometry;
    interiorSeatAccents: THREE.BufferGeometry;
    interiorDash: THREE.BufferGeometry;
    interiorSteeringWheel: THREE.BufferGeometry;
    interiorSteeringAccents: THREE.BufferGeometry;
    interiorClusterScreen: THREE.BufferGeometry;
    interiorCenterScreen: THREE.BufferGeometry;
    interiorRearMirror: THREE.BufferGeometry;
    engineBayCover: THREE.BufferGeometry;
    frontWheel: ReturnType<typeof buildVeloceWheelParts>;
    rearWheel: ReturnType<typeof buildVeloceWheelParts>;
  };
  textures: {
    carbonMap: THREE.Texture | null;
    grilleMap: THREE.Texture | null;
    tireMap: THREE.Texture | null;
    rotorMap: THREE.Texture | null;
    clusterMap: THREE.Texture | null;
    plateMap: THREE.Texture | null;
    emblemMap: THREE.Texture | null;
  };
}

let sharedCache: VeloceGtSharedCache | null = null;

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

function buildCarbonWeaveTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#14171f';
      ctx.fillRect(0, 0, w, h);
      const cell = 8;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const alt = ((x / cell + y / cell) & 1) === 0;
          const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
          if (alt) {
            grad.addColorStop(0, '#1e2430');
            grad.addColorStop(0.5, '#2b3242');
            grad.addColorStop(1, '#151922');
          } else {
            grad.addColorStop(0, '#10131a');
            grad.addColorStop(0.5, '#1b202b');
            grad.addColorStop(1, '#0e1117');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    },
    6,
    6,
  );
}

function buildTireTreadTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#181a20';
      ctx.fillRect(0, 0, w, h);
      // Circumferential grooves + subtle chevron tread channels
      ctx.fillStyle = '#0f1116';
      for (const gx of [34, 58, 70, 94]) {
        ctx.fillRect(gx, 0, 4, h);
      }
      ctx.strokeStyle = '#22262f';
      ctx.lineWidth = 3;
      for (let y = -16; y < h + 16; y += 16) {
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(64, y + 10);
        ctx.lineTo(112, y);
        ctx.stroke();
      }
    },
    1,
    4,
  );
}

function buildBrakeRotorTexture(): THREE.Texture | null {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#8b95a5';
    ctx.fillRect(0, 0, w, h);
    // Concentric machined rotor grooves
    for (let r = 18; r < 60; r += 3) {
      ctx.strokeStyle = r % 6 === 0 ? '#a8b2c2' : '#737d8c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-drilled / slotted racing channels
    ctx.strokeStyle = '#333a45';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
      ctx.lineTo(cx + Math.cos(a + 0.25) * 56, cy + Math.sin(a + 0.25) * 56);
      ctx.stroke();
    }
    // Dark rotor hat center
    ctx.fillStyle = '#262b35';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function buildInstrumentClusterTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#070c15';
    ctx.fillRect(0, 0, w, h);
    // Left digital rev-counter arc
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 54, 30, Math.PI * 0.78, Math.PI * 1.92);
    ctx.stroke();
    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(64, 54, 30, Math.PI * 1.92, Math.PI * 2.22);
    ctx.stroke();
    // Center digital readout
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GT', 64, 62);
    // Right nav / telemetry panel
    ctx.fillStyle = '#0f1d30';
    ctx.fillRect(118, 14, 122, 68);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.strokeRect(118, 14, 122, 68);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('VICE TELEMETRY', 179, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(132, 54, 92, 8);
  });
}

function buildLicensePlateTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    // Coastal Vice City gradient license plate
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff7ed');
    grad.addColorStop(0.55, '#fde68a');
    grad.addColorStop(1, '#f472b6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VICE COAST', w / 2, 34);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 46px sans-serif';
    ctx.fillText('VELOCE', w / 2, 92);
  });
}

function buildGrilleMeshTexture(): THREE.Texture | null {
  return makeCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#07090d';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#252b36';
      ctx.lineWidth = 2.5;
      const step = 16;
      for (let y = 0; y <= h + step; y += step) {
        for (let x = 0; x <= w + step; x += step) {
          const ox = ((y / step) & 1) === 0 ? 0 : step * 0.5;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const px = x + ox + Math.cos(a) * 6.5;
            const py = y + Math.sin(a) * 6.5;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    },
    4,
    2,
  );
}

function buildVeloceEmblemTexture(): THREE.Texture | null {
  return makeCanvasTexture(256, 48, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e5edf7';
    ctx.font = 'italic 900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V E L O C E   G T', w / 2, h / 2);
  });
}

function getSharedCache(): VeloceGtSharedCache {
  if (sharedCache) return sharedCache;

  const { frontAxleZ, rearAxleZ, wheelRadius } = VELOCE_GT_DIMS;

  // 1. Primary sculpted exterior shell & greenhouse
  const bodyShell = buildVeloceBodyShellGeometry();
  const roof = buildVeloceRoofGeometry();
  const windshield = buildVeloceWindshieldGeometry();
  const rearGlass = buildVeloceRearGlassGeometry();
  const sideWindowL = buildVeloceSideWindowGeometry(-1);
  const sideWindowR = buildVeloceSideWindowGeometry(1);

  // 2. Curved swept A-pillars, B-pillars, and sculpted integrated C-pillar fastback buttresses
  const aPillarParts: THREE.BufferGeometry[] = [];
  const bPillarParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    aPillarParts.push(
      buildSweptPillarGeometry(
        [
          new THREE.Vector3(side * 0.72, 0.825, -0.52),
          new THREE.Vector3(side * 0.65, 1.02, -0.32),
          new THREE.Vector3(side * 0.575, 1.18, -0.10),
        ],
        0.028,
        0.024,
        14,
        8,
      ),
    );
    bPillarParts.push(
      buildSweptPillarGeometry(
        [
          new THREE.Vector3(side * 0.72, 0.875, 0.44),
          new THREE.Vector3(side * 0.66, 1.05, 0.48),
          new THREE.Vector3(side * 0.59, 1.215, 0.50),
        ],
        0.018,
        0.026,
        10,
        8,
      ),
    );
  }
  const aPillars = mergeSimpleGeometries(aPillarParts);
  const bPillars = mergeSimpleGeometries(bPillarParts);
  const cPillars = mergeSimpleGeometries([
    buildVeloceFastbackButtressGeometry(-1),
    buildVeloceFastbackButtressGeometry(1),
  ]);

  // 3. Aero package: splitter, side skirts, rear wing, rear diffuser
  const splitter = buildVeloceFrontSplitterGeometry();
  const sideSkirts = mergeSimpleGeometries([
    buildVeloceSideSkirtGeometry(-1),
    buildVeloceSideSkirtGeometry(1),
  ]);
  const wingParts = buildVeloceRearWingGeometry();
  const diffuser = buildVeloceRearDiffuserGeometry();

  // 4. Dark underbody pan + 4 recessed inner wheel-well liners (zero see-through gaps, zero steering clip!)
  const linerParts: THREE.BufferGeometry[] = [];
  // Narrow central chassis spine clear of full ±0.52 rad front steering lock + wider mid-cabin floor pan
  const chassisSpine = new THREE.BoxGeometry(1.06, 0.08, 3.82);
  chassisSpine.translate(0, 0.195, 0.0);
  linerParts.push(chassisSpine);
  const midFloorPan = new THREE.BoxGeometry(1.42, 0.08, 1.84);
  midFloorPan.translate(0, 0.195, 0.02);
  linerParts.push(midFloorPan);

  const wellPlacements: Array<{ x: number; z: number; r: number; w: number; wallX: number; side: -1 | 1 }> = [
    { x: -0.71, z: frontAxleZ, r: wheelRadius + 0.032, w: 0.28, wallX: -0.56, side: -1 },
    { x: 0.71, z: frontAxleZ, r: wheelRadius + 0.032, w: 0.28, wallX: 0.56, side: 1 },
    { x: -0.72, z: rearAxleZ, r: wheelRadius + 0.04, w: 0.30, wallX: -0.57, side: -1 },
    { x: 0.72, z: rearAxleZ, r: wheelRadius + 0.04, w: 0.30, wallX: 0.57, side: 1 },
  ];
  for (const wp of wellPlacements) {
    // Upper arched fender liner shell arching cleanly over +Y (y >= wheelRadius - 0.015)
    // Flip winding so concave inner surface normals face toward the wheel (visible from outside)
    const archShell = new THREE.CylinderGeometry(wp.r, wp.r, wp.w, 16, 1, true, 0, Math.PI);
    archShell.rotateZ(Math.PI / 2);
    const archIdx = archShell.getIndex();
    if (archIdx) {
      const arr = archIdx.array as Uint16Array | Uint32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const tmp = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = tmp;
      }
      archIdx.needsUpdate = true;
    }
    archShell.translate(wp.x, wheelRadius - 0.015, wp.z);
    archShell.computeVertexNormals();
    linerParts.push(archShell);

    // Recessed inner bulkhead wall behind wheel (upper half-arch + lower skirt trimmed safely above y=0.165)
    const innerArchWall = new THREE.CircleGeometry(wp.r * 0.96, 16, 0, Math.PI);
    innerArchWall.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerArchWall.translate(wp.wallX, wheelRadius - 0.015, wp.z);
    innerArchWall.computeVertexNormals();
    linerParts.push(innerArchWall);

    const lowerWallH = Math.max(0.05, wheelRadius - 0.015 - 0.165);
    const innerLowerWall = new THREE.PlaneGeometry(wp.r * 1.9, lowerWallH);
    innerLowerWall.rotateY(wp.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    innerLowerWall.translate(wp.wallX, 0.165 + lowerWallH * 0.5, wp.z);
    innerLowerWall.computeVertexNormals();
    linerParts.push(innerLowerWall);
  }
  const underbodyAndLiners = mergeSimpleGeometries(linerParts);

  // 5. Recessed aggressive front radiator mouth, twin brake-cooling intakes, & swept crescent side intakes
  const intakeParts: THREE.BufferGeometry[] = [];
  const centerGrille = new THREE.BoxGeometry(0.96, 0.17, 0.09);
  centerGrille.translate(0, 0.275, -2.26);
  intakeParts.push(centerGrille);
  // Horizontal grille aero louvers sitting proud in front of the dark radiator mouth
  for (const gy of [0.228, 0.275, 0.322]) {
    const slat = new THREE.BoxGeometry(0.90, 0.015, 0.05);
    slat.translate(0, gy, -2.288);
    intakeParts.push(slat);
  }
  const sideIntakeBladeParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    // Front outboard brake-cooling air intakes wrapping around nose corners
    const brakeIntake = new THREE.BoxGeometry(0.32, 0.155, 0.09);
    brakeIntake.rotateY(side * -0.26);
    brakeIntake.translate(side * 0.66, 0.278, -2.192);
    intakeParts.push(brakeIntake);

    // Sculpted swept crescent side-haunch aero intake scoops ahead of rear fenders
    const sideScoop = buildVeloceSideIntakeGeometry(side);
    intakeParts.push(sideScoop.recess);
    sideIntakeBladeParts.push(sideScoop.blade);
  }
  intakeParts.push(buildVeloceHoodVentsGeometry());
  const frontGrilleAndIntakes = mergeSimpleGeometries(intakeParts);
  const sideIntakeBlades = mergeSimpleGeometries(sideIntakeBladeParts);

  // 6. Curved matte-black rear lightbar bay (strictly behind glowing LED blade & C-claws) + license plate recess
  const rearCoveParts: THREE.BufferGeometry[] = [];
  const centerLightBay = new THREE.BoxGeometry(1.18, 0.165, 0.036);
  centerLightBay.translate(0, 0.785, 2.222);
  rearCoveParts.push(centerLightBay);
  for (const side of [-1, 1] as const) {
    const outerLightBay = new THREE.BoxGeometry(0.34, 0.16, 0.032);
    outerLightBay.rotateY(side * 0.14);
    outerLightBay.translate(side * 0.69, 0.785, 2.202);
    rearCoveParts.push(outerLightBay);
  }
  const platePocket = new THREE.BoxGeometry(0.46, 0.20, 0.036);
  platePocket.translate(0, 0.49, 2.238);
  rearCoveParts.push(platePocket);
  // Recessed engine bay louver bay tucked cleanly below rear glass trailing edge
  const rearVent = new THREE.BoxGeometry(0.76, 0.025, 0.56);
  rearVent.translate(0, 0.805, 1.32);
  rearCoveParts.push(rearVent);
  const rearFasciaCove = mergeSimpleGeometries(rearCoveParts);

  // 7. Side mirrors (aerodynamic teardrop housings + stalks + reflective mirror glass)
  const mirL = buildVeloceSideMirrorGeometry(-1);
  const mirR = buildVeloceSideMirrorGeometry(1);
  const mirrorHousings = mergeSimpleGeometries([mirL.housing, mirR.housing]);
  const mirrorStalks = mergeSimpleGeometries([mirL.stalk, mirR.stalk]);
  const mirrorGlassParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const mg = new THREE.CircleGeometry(0.056, 12);
    mg.scale(1.25, 0.72, 1);
    mg.translate(side * 0.995, 0.872, -0.355);
    mirrorGlassParts.push(mg);
  }
  const mirrorGlass = mergeSimpleGeometries(mirrorGlassParts);

  // 8. Flush chrome door handles + sculpted nose crest badge
  const trimParts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const handle = new THREE.BoxGeometry(0.022, 0.024, 0.15);
    handle.translate(side * 0.872, 0.745, 0.22);
    trimParts.push(handle);
  }
  // Sculpted front nose badge crest resting flush on the sleek wedge nose
  const badge = new THREE.CylinderGeometry(0.036, 0.028, 0.014, 6);
  badge.rotateX(0.32);
  badge.translate(0, 0.436, -2.155);
  trimParts.push(badge);
  const doorHandlesAndTrim = mergeSimpleGeometries(trimParts);

  // 9. Quad sculpted chrome/titanium exhaust tips extending cleanly past diffuser valence
  const exOuterParts: THREE.BufferGeometry[] = [];
  const exInnerParts: THREE.BufferGeometry[] = [];
  for (const ex of [-0.62, -0.49, 0.49, 0.62]) {
    const outer = new THREE.CylinderGeometry(0.048, 0.052, 0.16, 14, 1, true);
    outer.rotateX(Math.PI / 2);
    outer.translate(ex, 0.245, 2.22);
    exOuterParts.push(outer);
    const lip = new THREE.TorusGeometry(0.048, 0.008, 8, 16);
    lip.translate(ex, 0.245, 2.30);
    exOuterParts.push(lip);

    const bore = new THREE.CylinderGeometry(0.041, 0.041, 0.14, 12);
    bore.rotateX(Math.PI / 2);
    bore.translate(ex, 0.245, 2.215);
    exInnerParts.push(bore);
  }
  const exhaustOuter = mergeSimpleGeometries(exOuterParts);
  const exhaustInner = mergeSimpleGeometries(exInnerParts);

  // 10. Conformal Swept Shark-Eye Headlights + Separate Amber Indicator Elements
  const hlL = buildVeloceConformalHeadlightCluster(-1);
  const hlR = buildVeloceConformalHeadlightCluster(1);
  const headlightHousing = mergeSimpleGeometries([hlL.housing, hlR.housing]);
  const headlightProjectorBezels = mergeSimpleGeometries([hlL.bezels, hlR.bezels]);
  const headlightEmissive = mergeSimpleGeometries([hlL.emissive, hlR.emissive]);
  const headlightLenses = mergeSimpleGeometries([hlL.lens, hlR.lens]);
  const indicatorStrips = mergeSimpleGeometries([
    hlL.indicator,
    hlR.indicator,
    buildVeloceRearIndicatorGeometry(),
  ]);

  // 11. Signature Veloce GT full-width curved LED taillight blade + wrap-around claws
  const taillightBlade = buildVeloceTaillightBladeGeometry();

  // 12. Rear license plate, metallic VELOCE GT rear deck emblem, twin windscreen wipers & panel shut lines
  const licensePlate = new THREE.PlaneGeometry(0.39, 0.175);
  licensePlate.translate(0, 0.49, 2.260);

  const rearEmblem = new THREE.PlaneGeometry(0.28, 0.044);
  rearEmblem.translate(0, 0.892, 2.224);

  const wipers = buildVeloceWipersGeometry();
  const panelSeams = buildVelocePanelSeamsGeometry();

  // 13. Full Visible Cockpit Interior (Tub, Bucket Seats, Dashboard, Steering Wheel, Cluster, Center Screen, Rear-view Mirror, Door Cards)
  const tubParts: THREE.BufferGeometry[] = [];
  const cabinFloor = new THREE.BoxGeometry(1.36, 0.06, 1.48);
  cabinFloor.translate(0, 0.28, 0.14);
  tubParts.push(cabinFloor);
  // Center transmission tunnel / console
  const consoleTunnel = new THREE.BoxGeometry(0.24, 0.34, 1.38);
  consoleTunnel.translate(0, 0.45, 0.10);
  tubParts.push(consoleTunnel);
  // Rear cabin firewall / parcel shelf behind seats
  const rearBulkhead = new THREE.BoxGeometry(1.34, 0.58, 0.12);
  rearBulkhead.rotateX(-0.18);
  rearBulkhead.translate(0, 0.58, 0.80);
  tubParts.push(rearBulkhead);
  // Interior door cards with armrests
  for (const side of [-1, 1] as const) {
    const doorCard = new THREE.BoxGeometry(0.08, 0.48, 1.32);
    doorCard.translate(side * 0.71, 0.56, 0.12);
    tubParts.push(doorCard);
    const armRest = new THREE.BoxGeometry(0.11, 0.07, 0.76);
    armRest.translate(side * 0.66, 0.58, 0.14);
    tubParts.push(armRest);
  }
  const interiorTub = mergeSimpleGeometries(tubParts);

  // Driver & passenger contoured bucket seats
  const seatL = buildVeloceBucketSeatGeometry();
  seatL.translate(-0.36, 0.30, 0.16);
  const seatR = buildVeloceBucketSeatGeometry();
  seatR.translate(0.36, 0.30, 0.16);
  const interiorSeats = mergeSimpleGeometries([seatL, seatR]);

  // Contrasting crimson sports bolster stripes & console trim
  const seatAccentParts: THREE.BufferGeometry[] = [];
  for (const cx of [-0.36, 0.36]) {
    for (const bx of [-0.19, 0.19]) {
      const stripe = new THREE.BoxGeometry(0.032, 0.38, 0.04);
      stripe.rotateX(0.24);
      stripe.translate(cx + bx, 0.62, 0.33);
      seatAccentParts.push(stripe);
    }
  }
  // Center console metallic toggle / gear selector
  const gearShift = new THREE.CylinderGeometry(0.022, 0.016, 0.11, 8);
  gearShift.rotateX(-0.18);
  gearShift.translate(0, 0.66, -0.05);
  seatAccentParts.push(gearShift);
  const interiorSeatAccents = mergeSimpleGeometries(seatAccentParts);

  // Sculpted wrap-around dashboard + driver instrument binnacle hood (stays cleanly below windshield glass)
  const dashParts: THREE.BufferGeometry[] = [];
  const dashMain = new THREE.BoxGeometry(1.38, 0.24, 0.34);
  dashMain.rotateX(0.08);
  dashMain.translate(0, 0.715, -0.46);
  dashParts.push(dashMain);
  const dashBinnacle = new THREE.CylinderGeometry(0.105, 0.12, 0.26, 12, 1, false, 0, Math.PI);
  dashBinnacle.rotateZ(Math.PI / 2);
  dashBinnacle.rotateY(Math.PI / 2);
  dashBinnacle.translate(-0.36, 0.805, -0.37);
  dashParts.push(dashBinnacle);
  const steerCol = new THREE.CylinderGeometry(0.032, 0.04, 0.22, 10);
  steerCol.rotateX(Math.PI / 2 - 0.26);
  steerCol.translate(-0.36, 0.75, -0.31);
  dashParts.push(steerCol);
  const interiorDash = mergeSimpleGeometries(dashParts);

  // Sports steering wheel (rim + hub + 3 spokes)
  const swParts: THREE.BufferGeometry[] = [];
  const swRim = new THREE.TorusGeometry(0.155, 0.019, 10, 22);
  swRim.rotateX(-0.28);
  swRim.translate(-0.36, 0.785, -0.20);
  swParts.push(swRim);
  const swHub = new THREE.CylinderGeometry(0.048, 0.048, 0.035, 12);
  swHub.rotateX(Math.PI / 2 - 0.28);
  swHub.translate(-0.36, 0.785, -0.205);
  swParts.push(swHub);
  for (const ang of [0, Math.PI, -Math.PI / 2]) {
    const spoke = new THREE.BoxGeometry(0.13, 0.022, 0.018);
    spoke.translate(0.065, 0, 0);
    spoke.rotateZ(ang);
    spoke.rotateX(-0.28);
    spoke.translate(-0.36, 0.785, -0.205);
    swParts.push(spoke);
  }
  const interiorSteeringWheel = mergeSimpleGeometries(swParts);

  // Crimson 12-o'clock racing band on steering wheel top
  const swMarker = new THREE.BoxGeometry(0.026, 0.042, 0.042);
  swMarker.rotateX(-0.28);
  swMarker.translate(-0.36, 0.935, -0.24);
  const interiorSteeringAccents = swMarker;

  // Illuminated driver instrument cluster + angled central infotainment touchscreen (mounted proud on dash face)
  const interiorClusterScreen = new THREE.PlaneGeometry(0.24, 0.095);
  interiorClusterScreen.rotateX(-0.14);
  interiorClusterScreen.translate(-0.36, 0.815, -0.278);

  const interiorCenterScreen = new THREE.PlaneGeometry(0.22, 0.14);
  interiorCenterScreen.rotateX(-0.18);
  interiorCenterScreen.translate(0, 0.765, -0.275);

  // Interior rear-view mirror suspended from windshield header
  const rmParts: THREE.BufferGeometry[] = [];
  const rmStalk = new THREE.CylinderGeometry(0.008, 0.01, 0.10, 6);
  rmStalk.translate(0, 1.135, -0.17);
  rmParts.push(rmStalk);
  const rmHead = new THREE.BoxGeometry(0.18, 0.052, 0.028);
  rmHead.translate(0, 1.08, -0.18);
  rmParts.push(rmHead);
  const interiorRearMirror = mergeSimpleGeometries(rmParts);

  // Mid-rear engine bay cover & twin metallic intake manifolds visible beneath fastback rear glass
  const engParts: THREE.BufferGeometry[] = [];
  const engBase = new THREE.BoxGeometry(0.68, 0.04, 0.54);
  engBase.translate(0, 0.815, 1.32);
  engParts.push(engBase);
  for (const ex of [-0.15, 0.15]) {
    const plenum = new THREE.CylinderGeometry(0.042, 0.048, 0.48, 10);
    plenum.rotateX(Math.PI / 2);
    plenum.translate(ex, 0.855, 1.31);
    engParts.push(plenum);
  }
  const engineBayCover = mergeSimpleGeometries(engParts);

  // 14. Staggered front & rear wheel assemblies (Lathe tyres, 10-spoke alloy rims, rotors, calipers)
  const frontWheel = buildVeloceWheelParts(VELOCE_GT_DIMS.frontWheelWidth);
  const rearWheel = buildVeloceWheelParts(VELOCE_GT_DIMS.rearWheelWidth);

  sharedCache = {
    geometries: {
      bodyShell,
      roof,
      windshield,
      rearGlass,
      sideWindowL,
      sideWindowR,
      aPillars,
      cPillars,
      bPillars,
      splitter,
      sideSkirts,
      rearWingBlade: wingParts.blade,
      rearWingEndplates: wingParts.endplates,
      rearWingPylons: wingParts.pylons,
      diffuser,
      underbodyAndLiners,
      frontGrilleAndIntakes,
      sideIntakeBlades,
      rearFasciaCove,
      mirrorHousings,
      mirrorStalks,
      mirrorGlass,
      doorHandlesAndTrim,
      exhaustOuter,
      exhaustInner,
      headlightHousing,
      headlightProjectorBezels,
      headlightEmissive,
      headlightLenses,
      indicatorStrips,
      taillightBlade,
      licensePlate,
      rearEmblem,
      wipers,
      panelSeams,
      interiorTub,
      interiorSeats,
      interiorSeatAccents,
      interiorDash,
      interiorSteeringWheel,
      interiorSteeringAccents,
      interiorClusterScreen,
      interiorCenterScreen,
      interiorRearMirror,
      engineBayCover,
      frontWheel,
      rearWheel,
    },
    textures: {
      carbonMap: buildCarbonWeaveTexture(),
      grilleMap: buildGrilleMeshTexture(),
      tireMap: buildTireTreadTexture(),
      rotorMap: buildBrakeRotorTexture(),
      clusterMap: buildInstrumentClusterTexture(),
      plateMap: buildLicensePlateTexture(),
      emblemMap: buildVeloceEmblemTexture(),
    },
  };

  return sharedCache;
}

export function disposeVeloceGtSharedResources(): void {
  if (!sharedCache) return;
  const g = sharedCache.geometries;
  const geoList: THREE.BufferGeometry[] = [
    g.bodyShell,
    g.roof,
    g.windshield,
    g.rearGlass,
    g.sideWindowL,
    g.sideWindowR,
    g.aPillars,
    g.cPillars,
    g.bPillars,
    g.splitter,
    g.sideSkirts,
    g.rearWingBlade,
    g.rearWingEndplates,
    g.rearWingPylons,
    g.diffuser,
    g.underbodyAndLiners,
    g.frontGrilleAndIntakes,
    g.sideIntakeBlades,
    g.rearFasciaCove,
    g.mirrorHousings,
    g.mirrorStalks,
    g.mirrorGlass,
    g.doorHandlesAndTrim,
    g.exhaustOuter,
    g.exhaustInner,
    g.headlightHousing,
    g.headlightProjectorBezels,
    g.headlightEmissive,
    g.headlightLenses,
    g.indicatorStrips,
    g.taillightBlade,
    g.licensePlate,
    g.rearEmblem,
    g.wipers,
    g.panelSeams,
    g.interiorTub,
    g.interiorSeats,
    g.interiorSeatAccents,
    g.interiorDash,
    g.interiorSteeringWheel,
    g.interiorSteeringAccents,
    g.interiorClusterScreen,
    g.interiorCenterScreen,
    g.interiorRearMirror,
    g.engineBayCover,
    g.frontWheel.tireGeo,
    g.frontWheel.rimAlloyGeo,
    g.frontWheel.hubDarkGeo,
    g.frontWheel.lugGeo,
    g.frontWheel.rotorGeo,
    g.frontWheel.caliperGeo,
    g.rearWheel.tireGeo,
    g.rearWheel.rimAlloyGeo,
    g.rearWheel.hubDarkGeo,
    g.rearWheel.lugGeo,
    g.rearWheel.rotorGeo,
    g.rearWheel.caliperGeo,
  ];
  for (const geo of geoList) geo.dispose();

  const t = sharedCache.textures;
  t.carbonMap?.dispose();
  t.grilleMap?.dispose();
  t.tireMap?.dispose();
  t.rotorMap?.dispose();
  t.clusterMap?.dispose();
  t.plateMap?.dispose();
  t.emblemMap?.dispose();
  sharedCache = null;
}

/**
 * Builds the upgraded Phase 2A AAA-style procedural Veloce GT sports coupe,
 * returning a 100% compatible VehicleRig for physics, wheels, steering,
 * suspension, cameras, headlights, brake lights, and clean disposal.
 */
export function createVeloceGtRig(
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
  const paintProfile = getVehiclePaintMaterialProfile(VehicleKind.Sports);
  const mainColor = overrideColor ?? spec.color;

  // 1. Premium Multi-Material Automotive PBR Suite
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: mainColor,
    roughness: paintProfile.roughness,
    metalness: Math.max(paintProfile.metalness, 0.52),
    clearcoat: paintProfile.clearcoat,
    clearcoatRoughness: Math.min(paintProfile.clearcoatRoughness, 0.05),
    reflectivity: 0.94,
    envMapIntensity: Math.max(paintProfile.envMapIntensity, 1.42),
  });

  const carbonMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: tex.carbonMap ?? null,
    roughness: 0.34,
    metalness: 0.24,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.05,
  });

  // Tinted transparent automotive glass: catches bright sky/coastal reflections while revealing cockpit interior!
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c1b29,
    roughness: 0.045,
    metalness: 0.1,
    ior: 1.52,
    reflectivity: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.8,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const clearLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef6ff,
    roughness: 0.04,
    metalness: 0.05,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.75,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });

  const matteTrimMat = new THREE.MeshStandardMaterial({
    color: 0x13161e,
    roughness: 0.76,
    metalness: 0.14,
    envMapIntensity: 0.42,
  });

  const glossBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e1118,
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xdde5f0,
    roughness: 0.18,
    metalness: 0.9,
    envMapIntensity: 1.45,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeef3fa,
    roughness: 0.1,
    metalness: 0.96,
    envMapIntensity: 1.55,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: tex.tireMap ? 0xffffff : 0x17191f,
    map: tex.tireMap ?? null,
    roughness: 0.88,
    metalness: 0.04,
    envMapIntensity: 0.28,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: tex.rotorMap ? 0xffffff : 0x9aa4b4,
    map: tex.rotorMap ?? null,
    roughness: 0.3,
    metalness: 0.86,
    envMapIntensity: 1.1,
  });

  // Anodized Vice Gold calipers pop crisply behind the forged silver Y-spokes
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    emissive: 0x3a2000,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.44,
    clearcoat: 0.88,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.25,
  });

  const interiorLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e28,
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.35,
  });

  const interiorSeatMat = new THREE.MeshStandardMaterial({
    color: 0x222633,
    roughness: 0.78,
    metalness: 0.06,
    envMapIntensity: 0.38,
  });

  const interiorAccentMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.56,
    metalness: 0.12,
    envMapIntensity: 0.55,
  });

  const dashScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.clusterMap ?? null,
    emissive: 0x38bdf8,
    emissiveMap: tex.clusterMap ?? null,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.1,
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.plateMap ?? null,
    roughness: 0.38,
    metalness: 0.15,
    envMapIntensity: 0.7,
  });

  const engineBayMat = new THREE.MeshStandardMaterial({
    color: 0x3a4150,
    roughness: 0.36,
    metalness: 0.72,
    envMapIntensity: 1.0,
  });

  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff9eb,
    emissive: 0xfff4cc,
    emissiveIntensity: 0.8,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3,
  });

  const brakeLightMat = new THREE.MeshPhysicalMaterial({
    color: 0x881322,
    emissive: 0xff2233,
    emissiveIntensity: 0.45,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });

  instanceDisposables.push(
    paintMat,
    carbonMat,
    glassMat,
    clearLensMat,
    matteTrimMat,
    glossBlackMat,
    alloyMat,
    chromeMat,
    tireMat,
    rotorMat,
    caliperMat,
    interiorLeatherMat,
    interiorSeatMat,
    interiorAccentMat,
    dashScreenMat,
    plateMat,
    engineBayMat,
    headlightMat,
    brakeLightMat,
  );

  // Additional specialized trim, grille mesh, emblem, seam, and amber indicator materials
  const grilleMeshMat = new THREE.MeshStandardMaterial({
    color: tex.grilleMap ? 0xffffff : 0x11151d,
    map: tex.grilleMap ?? null,
    roughness: 0.68,
    metalness: 0.25,
    envMapIntensity: 0.52,
  });

  const indicatorMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    emissive: 0xff8c00,
    emissiveIntensity: 0.55,
    roughness: 0.14,
    metalness: 0.12,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });

  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.18,
  });

  const rearEmblemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.emblemMap ?? null,
    transparent: true,
    roughness: 0.18,
    metalness: 0.92,
    envMapIntensity: 1.4,
    depthWrite: false,
  });

  instanceDisposables.push(grilleMeshMat, indicatorMat, seamMat, rearEmblemMat);

  // 2. Primary Sculpted Body & Greenhouse Meshes (Always Visible at All LOD Distances)
  const bodyMesh = new THREE.Mesh(g.bodyShell, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;

  const roofMesh = new THREE.Mesh(g.roof, paintMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  const cPillarMesh = new THREE.Mesh(g.cPillars, paintMat);
  cPillarMesh.castShadow = true;
  cPillarMesh.receiveShadow = true;

  const aPillarMesh = new THREE.Mesh(g.aPillars, glossBlackMat);
  aPillarMesh.castShadow = true;
  const bPillarMesh = new THREE.Mesh(g.bPillars, glossBlackMat);

  const underbodyMesh = new THREE.Mesh(g.underbodyAndLiners, matteTrimMat);
  const grilleMesh = new THREE.Mesh(g.frontGrilleAndIntakes, grilleMeshMat);
  const sideIntakeBladesMesh = new THREE.Mesh(g.sideIntakeBlades, carbonMat);
  const rearCoveMesh = new THREE.Mesh(g.rearFasciaCove, matteTrimMat);

  // Aerodynamic carbon package
  const splitterMesh = new THREE.Mesh(g.splitter, carbonMat);
  splitterMesh.castShadow = true;
  const skirtsMesh = new THREE.Mesh(g.sideSkirts, carbonMat);
  skirtsMesh.castShadow = true;
  const diffuserMesh = new THREE.Mesh(g.diffuser, carbonMat);
  const wingBladeMesh = new THREE.Mesh(g.rearWingBlade, paintMat);
  wingBladeMesh.castShadow = true;
  const wingEndplatesMesh = new THREE.Mesh(g.rearWingEndplates, carbonMat);
  const wingPylonsMesh = new THREE.Mesh(g.rearWingPylons, carbonMat);

  // Mirrors & exhausts
  const mirrorHousingMesh = new THREE.Mesh(g.mirrorHousings, paintMat);
  mirrorHousingMesh.castShadow = true;
  const mirrorStalkMesh = new THREE.Mesh(g.mirrorStalks, carbonMat);
  const mirrorGlassMesh = new THREE.Mesh(g.mirrorGlass, chromeMat);
  const exhaustOuterMesh = new THREE.Mesh(g.exhaustOuter, chromeMat);
  const exhaustInnerMesh = new THREE.Mesh(g.exhaustInner, matteTrimMat);

  // Headlight, indicator & taillight assemblies
  const hlHousingMesh = new THREE.Mesh(g.headlightHousing, glossBlackMat);
  const hlBezelMesh = new THREE.Mesh(g.headlightProjectorBezels, chromeMat);
  const hlEmissiveMesh = new THREE.Mesh(g.headlightEmissive, headlightMat);
  const indicatorMesh = new THREE.Mesh(g.indicatorStrips, indicatorMat);
  const hlLensMesh = new THREE.Mesh(g.headlightLenses, clearLensMat);
  hlLensMesh.renderOrder = 3;

  const tailBladeMesh = new THREE.Mesh(g.taillightBlade, brakeLightMat);
  const plateMesh = new THREE.Mesh(g.licensePlate, plateMat);
  const engineBayMesh = new THREE.Mesh(g.engineBayCover, engineBayMat);

  // Curved transparent tinted cabin glass (rendered after interior with renderOrder = 2)
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
    cPillarMesh,
    aPillarMesh,
    bPillarMesh,
    underbodyMesh,
    grilleMesh,
    sideIntakeBladesMesh,
    rearCoveMesh,
    splitterMesh,
    skirtsMesh,
    diffuserMesh,
    wingBladeMesh,
    wingEndplatesMesh,
    wingPylonsMesh,
    mirrorHousingMesh,
    mirrorStalkMesh,
    mirrorGlassMesh,
    exhaustOuterMesh,
    exhaustInnerMesh,
    hlHousingMesh,
    hlBezelMesh,
    hlEmissiveMesh,
    indicatorMesh,
    hlLensMesh,
    tailBladeMesh,
    plateMesh,
    engineBayMesh,
    windshieldMesh,
    rearGlassMesh,
    sideWinLMesh,
    sideWinRMesh,
  );

  // 3. Three-Tier Distance-Based LOD Group for Cockpit Interior & Coachbuilt Micro-Details:
  //    - Near (0..32m): full interior, illuminated displays, wipers, panel shut lines, handles & VELOCE GT emblem
  //    - Medium (32..75m): core cockpit silhouette (tub, seats, dash) & exterior handles
  //    - Far (>75m): lightweight exterior shell & wheels only
  const detailLod = new THREE.LOD();
  const nearDetails = new THREE.Group();
  nearDetails.add(
    new THREE.Mesh(g.interiorTub, interiorLeatherMat),
    new THREE.Mesh(g.interiorSeats, interiorSeatMat),
    new THREE.Mesh(g.interiorSeatAccents, interiorAccentMat),
    new THREE.Mesh(g.interiorDash, interiorLeatherMat),
    new THREE.Mesh(g.interiorSteeringWheel, matteTrimMat),
    new THREE.Mesh(g.interiorSteeringAccents, interiorAccentMat),
    new THREE.Mesh(g.interiorClusterScreen, dashScreenMat),
    new THREE.Mesh(g.interiorCenterScreen, dashScreenMat),
    new THREE.Mesh(g.interiorRearMirror, matteTrimMat),
    new THREE.Mesh(g.doorHandlesAndTrim, chromeMat),
    new THREE.Mesh(g.rearEmblem, rearEmblemMat),
    new THREE.Mesh(g.wipers, matteTrimMat),
    new THREE.Mesh(g.panelSeams, seamMat),
  );
  const mediumDetails = new THREE.Group();
  mediumDetails.add(
    new THREE.Mesh(g.interiorTub, interiorLeatherMat),
    new THREE.Mesh(g.interiorSeats, interiorSeatMat),
    new THREE.Mesh(g.interiorDash, interiorLeatherMat),
    new THREE.Mesh(g.doorHandlesAndTrim, chromeMat),
  );
  detailLod.addLevel(nearDetails, 0);
  detailLod.addLevel(mediumDetails, 32);
  detailLod.addLevel(new THREE.Group(), 75);
  bodyGroup.add(detailLod);

  // 4. Four Staggered Multi-Spoke Alloy Wheels + Spinning Slotted Rotors + Stationary Calipers
  const makeSpinningWheel = (
    parts: ReturnType<typeof buildVeloceWheelParts>,
    isLeft: boolean,
  ): THREE.Group => {
    const spinGroup = new THREE.Group();
    const visual = new THREE.Group();
    if (isLeft) {
      visual.rotation.y = Math.PI;
    }
    const tire = new THREE.Mesh(parts.tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(parts.rimAlloyGeo, alloyMat);
    const hub = new THREE.Mesh(parts.hubDarkGeo, glossBlackMat);
    const lugs = new THREE.Mesh(parts.lugGeo, chromeMat);
    const rotor = new THREE.Mesh(parts.rotorGeo, rotorMat);
    visual.add(tire, rim, hub, lugs, rotor);
    spinGroup.add(visual);
    return spinGroup;
  };

  const makeStationaryCaliper = (
    parts: ReturnType<typeof buildVeloceWheelParts>,
    isLeft: boolean,
  ): THREE.Group => {
    const cg = new THREE.Group();
    const cal = new THREE.Mesh(parts.caliperGeo, caliperMat);
    if (isLeft) {
      cg.rotation.y = Math.PI;
    }
    cg.add(cal);
    return cg;
  };

  const { wheelRadius, frontAxleZ, rearAxleZ, frontTrackHalf, rearTrackHalf } = VELOCE_GT_DIMS;

  // Front Left Steering Pivot (steers caliper + wheel together; wheel spins independently!)
  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-frontTrackHalf, wheelRadius, frontAxleZ);
  const wFL = makeSpinningWheel(g.frontWheel, true);
  frontLeftPivot.add(wFL, makeStationaryCaliper(g.frontWheel, true));

  // Front Right Steering Pivot
  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(frontTrackHalf, wheelRadius, frontAxleZ);
  const wFR = makeSpinningWheel(g.frontWheel, false);
  frontRightPivot.add(wFR, makeStationaryCaliper(g.frontWheel, false));

  // Rear Left & Right Wheels + Stationary Rear Calipers
  const wRL = makeSpinningWheel(g.rearWheel, true);
  wRL.position.set(-rearTrackHalf, wheelRadius, rearAxleZ);
  const calRL = makeStationaryCaliper(g.rearWheel, true);
  calRL.position.set(-rearTrackHalf, wheelRadius, rearAxleZ);

  const wRR = makeSpinningWheel(g.rearWheel, false);
  wRR.position.set(rearTrackHalf, wheelRadius, rearAxleZ);
  const calRR = makeStationaryCaliper(g.rearWheel, false);
  calRR.position.set(rearTrackHalf, wheelRadius, rearAxleZ);

  root.add(frontLeftPivot, frontRightPivot, wRL, wRR, calRL, calRR);

  // 5. Projected Dual-Headlight Road Beam Pool (matches VehicleRig contract)
  const beamGeo = new THREE.PlaneGeometry(spec.width * 2.3, 9.5);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff4d6,
    map: headlightBeamTex ?? null,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  instanceDisposables.push(beamGeo, beamMat);
  const headlightBeam = new THREE.Mesh(beamGeo, beamMat);
  headlightBeam.position.set(0, 0.12, -spec.length / 2 - 4.7);
  root.add(headlightBeam);

  // 6. Grounding Radial Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(spec.width * 1.38, spec.length * 1.24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.76,
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
