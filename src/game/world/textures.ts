import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  asphaltPuddleRoughness: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  skyscraperMap: THREE.CanvasTexture;
  skyscraperEmissive: THREE.CanvasTexture;
  skyscraperRoughness: THREE.CanvasTexture;
  skyscraperMetalness: THREE.CanvasTexture;
  skyscraperGlassMask: THREE.CanvasTexture;
  hotelMap: THREE.CanvasTexture;
  hotelEmissive: THREE.CanvasTexture;
  hotelRoughness: THREE.CanvasTexture;
  hotelGlassMask: THREE.CanvasTexture;
  warehouseMap: THREE.CanvasTexture;
  sandMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function configureLinearDataTexture(tex: THREE.CanvasTexture, aniso: number): THREE.CanvasTexture {
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Asphalt Road Texture (with fine aggregate grain + double yellow center + white dashed lanes)
  const [asphC, asphCtx] = makeCanvas(512, 512);
  asphCtx.fillStyle = '#252932';
  asphCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % 512;
    const y = (i * 197 + Math.floor(i / 7)) % 512;
    const shade = 30 + (i % 24);
    asphCtx.fillStyle = `rgb(${shade},${shade + 2},${shade + 7})`;
    asphCtx.fillRect(x, y, 2, 2);
  }
  // Subtle wheel wear tracks
  asphCtx.fillStyle = 'rgba(12, 14, 20, 0.25)';
  asphCtx.fillRect(108, 0, 56, 512);
  asphCtx.fillRect(348, 0, 56, 512);
  // Edge curb lines
  asphCtx.fillStyle = '#cbd5e1';
  asphCtx.fillRect(18, 0, 7, 512);
  asphCtx.fillRect(487, 0, 7, 512);
  // Double amber centerline
  asphCtx.fillStyle = '#eab308';
  asphCtx.fillRect(247, 0, 6, 512);
  asphCtx.fillRect(259, 0, 6, 512);

  const asphaltMap = new THREE.CanvasTexture(asphC);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.RepeatWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.anisotropy = aniso;

  // Asphalt micro-relief bump map (linear)
  const [asphBC, asphBCtx] = makeCanvas(256, 256);
  asphBCtx.fillStyle = '#808080';
  asphBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const x = (i * 53) % 256;
    const y = (i * 113 + i) % 256;
    const v = 90 + (i % 75);
    asphBCtx.fillStyle = `rgb(${v},${v},${v})`;
    asphBCtx.fillRect(x, y, 2, 2);
  }
  const asphaltBump = configureLinearDataTexture(new THREE.CanvasTexture(asphBC), aniso);

  // Seamless tileable organic puddle-variation mask (linear, 0 = dry/damp ridge, 255 = standing puddle)
  const [pudC, pudCtx] = makeCanvas(256, 256);
  const pudImg = pudCtx.createImageData(256, 256);
  const pudData = pudImg.data;
  const TAU = Math.PI * 2;
  for (let y = 0; y < 256; y++) {
    const ty = (y / 256) * TAU;
    for (let x = 0; x < 256; x++) {
      const tx = (x / 256) * TAU;
      // Seamless periodic multi-octave puddle height field
      const n1 = Math.sin(tx * 2 + 0.4) * Math.cos(ty * 2 - 0.7);
      const n2 = Math.sin(tx * 3 - ty * 2 + 1.1) * 0.55;
      const n3 = Math.cos(tx * 5 + ty * 4 - 0.5) * 0.28;
      const n4 = Math.sin(tx * 9 - ty * 7 + 2.1) * 0.14;
      const raw = (n1 + n2 + n3 + n4) * 0.34 + 0.5;
      // Shape into distinct standing puddles + damp sheen transitions
      const clamped = Math.max(0, Math.min(1, raw));
      const shaped = clamped * clamped * (3 - 2 * clamped);
      const byte = Math.round(shaped * 255);
      const idx = (y * 256 + x) * 4;
      pudData[idx] = byte;
      pudData[idx + 1] = byte;
      pudData[idx + 2] = byte;
      pudData[idx + 3] = 255;
    }
  }
  pudCtx.putImageData(pudImg, 0, 0);
  const asphaltPuddleRoughness = configureLinearDataTexture(new THREE.CanvasTexture(pudC), aniso);

  // 2. Warm Coastal Concrete Sidewalk Tiles
  const [swC, swCtx] = makeCanvas(256, 256);
  swCtx.fillStyle = '#cfc7bc';
  swCtx.fillRect(0, 0, 256, 256);
  swCtx.strokeStyle = '#9c9489';
  swCtx.lineWidth = 3;
  for (let p = 0; p <= 256; p += 64) {
    swCtx.beginPath();
    swCtx.moveTo(p, 0);
    swCtx.lineTo(p, 256);
    swCtx.stroke();
    swCtx.beginPath();
    swCtx.moveTo(0, p);
    swCtx.lineTo(256, p);
    swCtx.stroke();
  }
  for (let i = 0; i < 1600; i++) {
    const x = (i * 37) % 256;
    const y = (i * 89) % 256;
    swCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(60,55,48,0.06)';
    swCtx.fillRect(x, y, 2, 2);
  }
  const sidewalkMap = new THREE.CanvasTexture(swC);
  sidewalkMap.colorSpace = THREE.SRGBColorSpace;
  sidewalkMap.wrapS = THREE.RepeatWrapping;
  sidewalkMap.wrapT = THREE.RepeatWrapping;
  sidewalkMap.anisotropy = aniso;

  // 3. Skyscraper Curtain-Wall Glass Grid (Day Albedo + Night Emissive + Linear Roughness/Metalness/Glass Masks)
  const [skyC, skyCtx] = makeCanvas(512, 512);
  const [skyEC, skyECtx] = makeCanvas(512, 512);
  const [skyRC, skyRCtx] = makeCanvas(512, 512);
  const [skyMC, skyMCtx] = makeCanvas(512, 512);
  const [skyGC, skyGCtx] = makeCanvas(512, 512);

  // Structural mullion / concrete frame base: matte roughness (~0.84), low metalness (~0.08), no glass clearcoat
  skyCtx.fillStyle = '#2d4052';
  skyCtx.fillRect(0, 0, 512, 512);
  skyECtx.fillStyle = '#000000';
  skyECtx.fillRect(0, 0, 512, 512);
  skyRCtx.fillStyle = 'rgb(214,214,214)';
  skyRCtx.fillRect(0, 0, 512, 512);
  skyMCtx.fillStyle = 'rgb(20,20,20)';
  skyMCtx.fillRect(0, 0, 512, 512);
  skyGCtx.fillStyle = 'rgb(0,0,0)';
  skyGCtx.fillRect(0, 0, 512, 512);

  const cols = 8;
  const rows = 16;
  const cw = 512 / cols;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    // Spandrel structural floor band (matte precast concrete)
    skyCtx.fillStyle = '#d4dde6';
    skyCtx.fillRect(0, r * rh, 512, 5);
    skyRCtx.fillStyle = 'rgb(226,226,226)';
    skyRCtx.fillRect(0, r * rh, 512, 5);
    skyMCtx.fillStyle = 'rgb(12,12,12)';
    skyMCtx.fillRect(0, r * rh, 512, 5);

    for (let c = 0; c < cols; c++) {
      const hash = ((r * 31 + c * 17) * 2654435761) >>> 0;
      const lit = (hash % 100) < 42;
      const wx = c * cw + 5;
      const wy = r * rh + 7;
      const ww = cw - 10;
      const wh = rh - 10;

      // Reflective architectural tinted glass tint
      const grad = skyCtx.createLinearGradient(wx, wy, wx, wy + wh);
      grad.addColorStop(0, '#7eb0cc');
      grad.addColorStop(1, '#335773');
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(wx, wy, ww, wh);

      // Per-pane subtle roughness & coating variation so curtain-wall reflections read naturally
      const paneRoughByte = 24 + (hash % 18); // ~0.09..0.16 linear roughness
      skyRCtx.fillStyle = `rgb(${paneRoughByte},${paneRoughByte},${paneRoughByte})`;
      skyRCtx.fillRect(wx, wy, ww, wh);

      const paneMetalByte = 68 + ((hash >>> 8) % 24); // ~0.27..0.36 architectural coated glass
      skyMCtx.fillStyle = `rgb(${paneMetalByte},${paneMetalByte},${paneMetalByte})`;
      skyMCtx.fillRect(wx, wy, ww, wh);

      skyGCtx.fillStyle = 'rgb(245,245,245)';
      skyGCtx.fillRect(wx, wy, ww, wh);

      if (lit) {
        const warm = (hash % 3) !== 0;
        skyECtx.fillStyle = warm ? '#ffd89b' : '#b7e6ff';
        skyECtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
      }
    }
  }
  const skyscraperMap = new THREE.CanvasTexture(skyC);
  skyscraperMap.colorSpace = THREE.SRGBColorSpace;
  skyscraperMap.wrapS = THREE.RepeatWrapping;
  skyscraperMap.wrapT = THREE.RepeatWrapping;
  skyscraperMap.anisotropy = aniso;

  const skyscraperEmissive = new THREE.CanvasTexture(skyEC);
  skyscraperEmissive.colorSpace = THREE.SRGBColorSpace;
  skyscraperEmissive.wrapS = THREE.RepeatWrapping;
  skyscraperEmissive.wrapT = THREE.RepeatWrapping;

  const skyscraperRoughness = configureLinearDataTexture(new THREE.CanvasTexture(skyRC), aniso);
  const skyscraperMetalness = configureLinearDataTexture(new THREE.CanvasTexture(skyMC), aniso);
  const skyscraperGlassMask = configureLinearDataTexture(new THREE.CanvasTexture(skyGC), aniso);

  // 4. Art Deco Coastal Hotel / Apartment Facade + Warm Night Windows + Stucco/Glass Masks
  const [hotC, hotCtx] = makeCanvas(512, 512);
  const [hotEC, hotECtx] = makeCanvas(512, 512);
  const [hotRC, hotRCtx] = makeCanvas(512, 512);
  const [hotGC, hotGCtx] = makeCanvas(512, 512);

  hotCtx.fillStyle = '#f5f1ea'; // white/neutral so building color tint works cleanly
  hotCtx.fillRect(0, 0, 512, 512);
  hotECtx.fillStyle = '#000000';
  hotECtx.fillRect(0, 0, 512, 512);
  // Matte coastal stucco walls (~0.88 roughness) & zero clearcoat
  hotRCtx.fillStyle = 'rgb(225,225,225)';
  hotRCtx.fillRect(0, 0, 512, 512);
  hotGCtx.fillStyle = 'rgb(0,0,0)';
  hotGCtx.fillRect(0, 0, 512, 512);

  const hCols = 6;
  const hRows = 8;
  const hcw = 512 / hCols;
  const hrh = 512 / hRows;
  for (let r = 0; r < hRows; r++) {
    // Art Deco horizontal eyebrow ledge (matte plaster)
    hotCtx.fillStyle = '#d9d3c9';
    hotCtx.fillRect(0, r * hrh + 2, 512, 6);
    hotRCtx.fillStyle = 'rgb(232,232,232)';
    hotRCtx.fillRect(0, r * hrh + 2, 512, 6);

    for (let c = 0; c < hCols; c++) {
      const wx = c * hcw + 14;
      const wy = r * hrh + 14;
      const ww = hcw - 28;
      const wh = hrh - 24;
      // Window recess (sleek reflective glass)
      hotCtx.fillStyle = '#2c3d4f';
      hotCtx.fillRect(wx, wy, ww, wh);
      hotRCtx.fillStyle = 'rgb(28,28,28)'; // ~0.11 roughness glass
      hotRCtx.fillRect(wx, wy, ww, wh);
      hotGCtx.fillStyle = 'rgb(245,245,245)';
      hotGCtx.fillRect(wx, wy, ww, wh);

      // White Art Deco mullion (matte painted frame)
      hotCtx.fillStyle = '#ece6dc';
      hotCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      hotRCtx.fillStyle = 'rgb(215,215,215)';
      hotRCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      hotGCtx.fillStyle = 'rgb(0,0,0)';
      hotGCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);

      const hash = ((r * 19 + c * 43) * 1103515245) >>> 0;
      if (hash % 10 < 5) {
        hotECtx.fillStyle = hash % 2 === 0 ? '#ffcf87' : '#ffe6b8';
        hotECtx.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
      }
    }
  }
  const hotelMap = new THREE.CanvasTexture(hotC);
  hotelMap.colorSpace = THREE.SRGBColorSpace;
  hotelMap.wrapS = THREE.RepeatWrapping;
  hotelMap.wrapT = THREE.RepeatWrapping;
  hotelMap.anisotropy = aniso;

  const hotelEmissive = new THREE.CanvasTexture(hotEC);
  hotelEmissive.colorSpace = THREE.SRGBColorSpace;
  hotelEmissive.wrapS = THREE.RepeatWrapping;
  hotelEmissive.wrapT = THREE.RepeatWrapping;

  const hotelRoughness = configureLinearDataTexture(new THREE.CanvasTexture(hotRC), aniso);
  const hotelGlassMask = configureLinearDataTexture(new THREE.CanvasTexture(hotGC), aniso);

  // 5. Industrial Corrugated Metal (Harbour Warehouses & Containers)
  const [whC, whCtx] = makeCanvas(256, 256);
  whCtx.fillStyle = '#cbd5e1';
  whCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 12) {
    whCtx.fillStyle = '#aeb9c7';
    whCtx.fillRect(x, 0, 5, 256);
    whCtx.fillStyle = '#dde5ee';
    whCtx.fillRect(x + 5, 0, 2, 256);
  }
  whCtx.fillStyle = 'rgba(30, 41, 59, 0.25)';
  whCtx.fillRect(0, 124, 256, 6);
  const warehouseMap = new THREE.CanvasTexture(whC);
  warehouseMap.colorSpace = THREE.SRGBColorSpace;
  warehouseMap.wrapS = THREE.RepeatWrapping;
  warehouseMap.wrapT = THREE.RepeatWrapping;
  warehouseMap.anisotropy = aniso;

  // 6. Golden Coastal Beach Sand
  const [sandC, sandCtx] = makeCanvas(256, 256);
  sandCtx.fillStyle = '#e8cfa6';
  sandCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const x = (i * 41) % 256;
    const y = (i * 97) % 256;
    sandCtx.fillStyle = i % 2 === 0 ? 'rgba(255,244,218,0.35)' : 'rgba(186,152,102,0.28)';
    sandCtx.fillRect(x, y, 2, 2);
  }
  const sandMap = new THREE.CanvasTexture(sandC);
  sandMap.colorSpace = THREE.SRGBColorSpace;
  sandMap.wrapS = THREE.RepeatWrapping;
  sandMap.wrapT = THREE.RepeatWrapping;

  // 7. Radial Contact Shadow (for grounded vehicles & characters)
  const [csC, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(6, 8, 14, 0.72)');
  csGrad.addColorStop(0.55, 'rgba(6, 8, 14, 0.38)');
  csGrad.addColorStop(1, 'rgba(6, 8, 14, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(csC);

  return {
    asphaltMap,
    asphaltBump,
    asphaltPuddleRoughness,
    sidewalkMap,
    skyscraperMap,
    skyscraperEmissive,
    skyscraperRoughness,
    skyscraperMetalness,
    skyscraperGlassMask,
    hotelMap,
    hotelEmissive,
    hotelRoughness,
    hotelGlassMask,
    warehouseMap,
    sandMap,
    contactShadowMap,
    dispose: () => {
      asphaltMap.dispose();
      asphaltBump.dispose();
      asphaltPuddleRoughness.dispose();
      sidewalkMap.dispose();
      skyscraperMap.dispose();
      skyscraperEmissive.dispose();
      skyscraperRoughness.dispose();
      skyscraperMetalness.dispose();
      skyscraperGlassMask.dispose();
      hotelMap.dispose();
      hotelEmissive.dispose();
      hotelRoughness.dispose();
      hotelGlassMask.dispose();
      warehouseMap.dispose();
      sandMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
