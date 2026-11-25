import * as THREE from 'three';
import {
  BuildingSpec,
  CityLayout,
  ROAD_COORDS,
  ROAD_WIDTH,
} from './cityData';
import { ProceduralTextureSet } from './textures';
import {
  createWetRoadSurface,
  WetRoadSurface,
} from './wetRoadSync';

export interface TrafficSignalVisual {
  intersectionX: number;
  intersectionZ: number;
  nsRedMat: THREE.MeshStandardMaterial;
  nsGreenMat: THREE.MeshStandardMaterial;
  ewRedMat: THREE.MeshStandardMaterial;
  ewGreenMat: THREE.MeshStandardMaterial;
}

export interface BuiltCityWorld {
  root: THREE.Group;
  roadMaterial: THREE.MeshStandardMaterial;
  roadMaterials: THREE.MeshStandardMaterial[];
  wetRoadSurfaces: WetRoadSurface<THREE.MeshStandardMaterial>[];
  emissiveBuildingMaterials: THREE.MeshStandardMaterial[];
  neonTrimMaterials: THREE.MeshStandardMaterial[];
  streetlightBulbMaterial: THREE.MeshStandardMaterial;
  streetPointLights: THREE.PointLight[];
  oceanUniforms: { uTime: { value: number } };
  oceanMaterial: THREE.MeshStandardMaterial;
  trafficSignals: TrafficSignalVisual[];
  environmentMeshesForCamera: THREE.Object3D[];
  dispose: () => void;
}

export function buildCityWorld(
  layout: CityLayout,
  textures: ProceduralTextureSet,
): BuiltCityWorld {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const emissiveBuildingMaterials: THREE.MeshStandardMaterial[] = [];
  const neonTrimMaterials: THREE.MeshStandardMaterial[] = [];
  const environmentMeshesForCamera: THREE.Object3D[] = [];
  const trafficSignals: TrafficSignalVisual[] = [];

  // -------------------------------------------------------
  // 1. EXTENDED COASTAL OCEAN & ISLAND TERRAIN (No Void!)
  // -------------------------------------------------------
  const oceanUniforms = { uTime: { value: 0 } };
  const oceanGeo = new THREE.PlaneGeometry(1400, 1400, 64, 64);
  oceanGeo.rotateX(-Math.PI / 2);
  disposables.push(oceanGeo);

  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    roughness: 0.16,
    metalness: 0.35,
    envMapIntensity: 1.2,
  });
  oceanMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float wave1 = sin(transformed.x * 0.045 + uTime * 1.15) * 0.24;
         float wave2 = cos(transformed.z * 0.055 + uTime * 0.85) * 0.18;
         transformed.y += wave1 + wave2;`,
      );
  };
  disposables.push(oceanMaterial);

  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMaterial);
  oceanMesh.position.set(160, -0.75, 0);
  oceanMesh.receiveShadow = true;
  root.add(oceanMesh);

  // Island base plinth (seawall concrete slab)
  const islandBaseGeo = new THREE.BoxGeometry(272, 2.2, 276);
  const islandBaseMat = new THREE.MeshStandardMaterial({
    color: 0xbeb5a8,
    roughness: 0.86,
    metalness: 0.04,
  });
  disposables.push(islandBaseGeo, islandBaseMat);
  const islandBase = new THREE.Mesh(islandBaseGeo, islandBaseMat);
  islandBase.position.set(-4, -1.12, 0);
  islandBase.receiveShadow = true;
  root.add(islandBase);

  // Urban sidewalk & plaza surface
  const sidewalkTex = textures.sidewalkMap.clone();
  sidewalkTex.needsUpdate = true;
  sidewalkTex.repeat.set(48, 48);
  disposables.push(sidewalkTex);

  const groundGeo = new THREE.PlaneGeometry(256, 268);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sidewalkTex,
    roughness: 0.84,
    metalness: 0.04,
  });
  disposables.push(groundGeo, groundMat);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(-10, 0.0, 0);
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // East Beachfront Golden Sand Strip (Ocean Drive Beach: x = 118..154)
  const sandTex = textures.sandMap.clone();
  sandTex.needsUpdate = true;
  sandTex.repeat.set(6, 36);
  disposables.push(sandTex);

  const beachGeo = new THREE.PlaneGeometry(40, 274);
  beachGeo.rotateX(-Math.PI / 2);
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sandTex,
    roughness: 0.92,
    metalness: 0.0,
  });
  disposables.push(beachGeo, beachMat);
  const beachMesh = new THREE.Mesh(beachGeo, beachMat);
  beachMesh.position.set(137, -0.06, 0);
  beachMesh.rotation.z = -0.025; // slopes gently into Atlantic surf
  beachMesh.receiveShadow = true;
  root.add(beachMesh);

  // Shoreline foam band
  const foamGeo = new THREE.PlaneGeometry(5, 274);
  foamGeo.rotateX(-Math.PI / 2);
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    roughness: 0.45,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  disposables.push(foamGeo, foamMat);
  const foamMesh = new THREE.Mesh(foamGeo, foamMat);
  foamMesh.position.set(154, -0.45, 0);
  root.add(foamMesh);

  // Ocean Drive Wooden Boardwalk Promenade (x = 109..118)
  const boardGeo = new THREE.BoxGeometry(9.5, 0.16, 252);
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xc9a982,
    roughness: 0.78,
    metalness: 0.05,
  });
  disposables.push(boardGeo, boardMat);
  const boardwalk = new THREE.Mesh(boardGeo, boardMat);
  boardwalk.position.set(113.5, 0.08, 0);
  boardwalk.receiveShadow = true;
  root.add(boardwalk);

  // Marina Overlook Pier at South Ocean Drive (z = 96, x = 118..156)
  const pierGeo = new THREE.BoxGeometry(38, 0.45, 12);
  const pierMesh = new THREE.Mesh(pierGeo, boardMat);
  pierMesh.position.set(136, 0.25, 96);
  pierMesh.receiveShadow = true;
  root.add(pierMesh);
  disposables.push(pierGeo);

  // Coastal Seawall Low Parapet on West/North/South edges (natural marina railing, not an indoor wall!)
  const seawallMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc4,
    roughness: 0.75,
    metalness: 0.08,
  });
  disposables.push(seawallMat);
  const swNSGeo = new THREE.BoxGeometry(274, 0.85, 1.2);
  const swWGeo = new THREE.BoxGeometry(1.2, 0.85, 274);
  disposables.push(swNSGeo, swWGeo);
  const swNorth = new THREE.Mesh(swNSGeo, seawallMat);
  swNorth.position.set(-4, 0.42, -137);
  const swSouth = new THREE.Mesh(swNSGeo, seawallMat);
  swSouth.position.set(-4, 0.42, 137);
  const swWest = new THREE.Mesh(swWGeo, seawallMat);
  swWest.position.set(-139, 0.42, 0);
  root.add(swNorth, swSouth, swWest);

  // Distant coastal islands on the horizon for panoramic realism
  const distantIsleGeo = new THREE.ConeGeometry(48, 12, 7);
  const distantIsleMat = new THREE.MeshStandardMaterial({
    color: 0x3f6b5c,
    roughness: 0.92,
  });
  disposables.push(distantIsleGeo, distantIsleMat);
  const islePositions = [
    [-310, 120, 1.8],
    [-290, -180, 1.4],
    [40, -340, 2.2],
    [-190, 320, 1.6],
  ];
  for (const [ix, iz, isc] of islePositions) {
    const isle = new THREE.Mesh(distantIsleGeo, distantIsleMat);
    isle.position.set(ix, 1.2, iz);
    isle.scale.set(isc, 0.7, isc * 0.7);
    root.add(isle);
  }

  // -------------------------------------------------------
  // 2. ROAD NETWORK, INTERSECTIONS & CROSSWALKS
  // -------------------------------------------------------
  const roadTexNS = textures.asphaltMap.clone();
  roadTexNS.needsUpdate = true;
  roadTexNS.repeat.set(1, 18);
  disposables.push(roadTexNS);

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roadTexNS,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.04,
    roughness: 0.78,
    metalness: 0.08,
  });
  disposables.push(roadMaterial);

  const roadTexEW = textures.asphaltMap.clone();
  roadTexEW.needsUpdate = true;
  roadTexEW.repeat.set(1, 18);
  disposables.push(roadTexEW);

  const roadMatEW = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roadTexEW,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.04,
    roughness: 0.78,
    metalness: 0.08,
  });
  disposables.push(roadMatEW);

  const roadStripNSGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 224);
  roadStripNSGeo.rotateX(-Math.PI / 2);
  disposables.push(roadStripNSGeo);

  const roadStripEWGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 224);
  roadStripEWGeo.rotateX(-Math.PI / 2);
  roadStripEWGeo.rotateY(Math.PI / 2);
  disposables.push(roadStripEWGeo);

  for (const rx of ROAD_COORDS) {
    const m = new THREE.Mesh(roadStripNSGeo, roadMaterial);
    m.position.set(rx, 0.03, 0);
    m.receiveShadow = true;
    root.add(m);
  }

  for (const rz of ROAD_COORDS) {
    const m = new THREE.Mesh(roadStripEWGeo, roadMatEW);
    m.position.set(0, 0.04, rz);
    m.receiveShadow = true;
    root.add(m);
  }

  // Clean intersection asphalt squares + zebra crosswalk stripes (InstancedMesh)
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.4, ROAD_WIDTH + 0.4);
  interGeo.rotateX(-Math.PI / 2);
  const interMat = new THREE.MeshStandardMaterial({
    color: 0x262b35,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.03,
    roughness: 0.78,
    metalness: 0.08,
  });
  disposables.push(interGeo, interMat);

  const zebraStripeGeo = new THREE.PlaneGeometry(0.75, 2.6);
  zebraStripeGeo.rotateX(-Math.PI / 2);
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xe8edf3,
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposables.push(zebraStripeGeo, zebraMat);

  const roadMaterials: THREE.MeshStandardMaterial[] = [
    roadMaterial,
    roadMatEW,
    interMat,
  ];
  const wetRoadSurfaces: WetRoadSurface<THREE.MeshStandardMaterial>[] = [
    createWetRoadSurface('road_ns', roadMaterial, 'asphalt'),
    createWetRoadSurface('road_ew', roadMatEW, 'asphalt'),
    createWetRoadSurface('intersections', interMat, 'asphalt'),
    createWetRoadSurface('crosswalks', zebraMat, 'marking'),
  ];

  const stripeTransforms: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  for (const node of layout.intersections) {
    const sq = new THREE.Mesh(interGeo, interMat);
    sq.position.set(node.x, 0.055, node.z);
    sq.receiveShadow = true;
    root.add(sq);

    // 4 crosswalks per intersection (5 stripes each)
    for (let s = -2; s <= 2; s++) {
      // North & South crosswalks
      dummy.position.set(node.x + s * 2.1, 0.075, node.z - ROAD_WIDTH / 2 - 1.6);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stripeTransforms.push(dummy.matrix.clone());

      dummy.position.set(node.x + s * 2.1, 0.075, node.z + ROAD_WIDTH / 2 + 1.6);
      dummy.updateMatrix();
      stripeTransforms.push(dummy.matrix.clone());

      // East & West crosswalks
      dummy.position.set(node.x - ROAD_WIDTH / 2 - 1.6, 0.075, node.z + s * 2.1);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      stripeTransforms.push(dummy.matrix.clone());

      dummy.position.set(node.x + ROAD_WIDTH / 2 + 1.6, 0.075, node.z + s * 2.1);
      dummy.updateMatrix();
      stripeTransforms.push(dummy.matrix.clone());
    }
  }

  const zebraInst = new THREE.InstancedMesh(zebraStripeGeo, zebraMat, stripeTransforms.length);
  stripeTransforms.forEach((m, i) => zebraInst.setMatrixAt(i, m));
  zebraInst.instanceMatrix.needsUpdate = true;
  zebraInst.computeBoundingSphere();
  root.add(zebraInst);

  // -------------------------------------------------------
  // 3. CORAL HEIGHTS BAYSIDE PALM PARK (Lawn + Fountain)
  // -------------------------------------------------------
  const parkLawnGeo = new THREE.BoxGeometry(36, 0.14, 24);
  const parkLawnMat = new THREE.MeshStandardMaterial({
    color: 0x3b7a4a,
    roughness: 0.9,
  });
  disposables.push(parkLawnGeo, parkLawnMat);
  const parkLawn = new THREE.Mesh(parkLawnGeo, parkLawnMat);
  parkLawn.position.set(-64, 0.07, -56);
  parkLawn.receiveShadow = true;
  root.add(parkLawn);

  // Park Fountain (composite 4-part centerpiece)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(-64, 0.14, -56);
  const basinGeo = new THREE.CylinderGeometry(4.2, 4.5, 0.75, 24);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.7 });
  const poolWaterGeo = new THREE.CylinderGeometry(3.7, 3.7, 0.55, 24);
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.12,
    metalness: 0.25,
  });
  const spireGeo = new THREE.CylinderGeometry(0.45, 0.85, 2.2, 16);
  const bowlGeo = new THREE.CylinderGeometry(1.6, 0.5, 0.45, 18);
  disposables.push(basinGeo, stoneMat, poolWaterGeo, poolWaterMat, spireGeo, bowlGeo);

  const fBasin = new THREE.Mesh(basinGeo, stoneMat);
  fBasin.position.y = 0.375;
  const fWater = new THREE.Mesh(poolWaterGeo, poolWaterMat);
  fWater.position.y = 0.52;
  const fSpire = new THREE.Mesh(spireGeo, stoneMat);
  fSpire.position.y = 1.2;
  const fBowl = new THREE.Mesh(bowlGeo, stoneMat);
  fBowl.position.y = 2.2;
  fountainGroup.add(fBasin, fWater, fSpire, fBowl);
  root.add(fountainGroup);

  // -------------------------------------------------------
  // 4. COMPOSITE ARCHITECTURAL BUILDINGS (All 5 Districts)
  // -------------------------------------------------------
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.7,
  });
  const roofConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.88,
    metalness: 0.05,
  });
  const lobbyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1b3248,
    roughness: 0.12,
    metalness: 0.5,
    emissive: 0xffd599,
    emissiveIntensity: 0.15,
  });
  emissiveBuildingMaterials.push(lobbyGlassMat);
  disposables.push(darkMetalMat, roofConcreteMat, lobbyGlassMat);

  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  disposables.push(unitBoxGeo, unitCylGeo);

  const buildArchitecturalStructure = (spec: BuildingSpec) => {
    const group = new THREE.Group();
    group.position.set(spec.x, 0, spec.z);

    // Choose material template by architectural style
    let mainMat: THREE.MeshStandardMaterial;
    if (spec.style === 'skyscraper' || spec.style === 'landmark') {
      mainMat = new THREE.MeshStandardMaterial({
        color: spec.baseColor,
        map: textures.skyscraperMap,
        emissive: 0xffd699,
        emissiveMap: textures.skyscraperEmissive,
        emissiveIntensity: 0.25,
        roughness: 0.24,
        metalness: 0.55,
      });
      emissiveBuildingMaterials.push(mainMat);
    } else if (spec.style === 'warehouse') {
      mainMat = new THREE.MeshStandardMaterial({
        color: spec.baseColor,
        map: textures.warehouseMap,
        roughness: 0.65,
        metalness: 0.38,
      });
    } else if (spec.style === 'parking') {
      mainMat = new THREE.MeshStandardMaterial({
        color: spec.baseColor,
        roughness: 0.85,
        metalness: 0.05,
      });
    } else {
      // Art Deco Hotel, Club, Villa, Apartment, Shop
      mainMat = new THREE.MeshStandardMaterial({
        color: spec.baseColor,
        map: textures.hotelMap,
        emissive: 0xffcf87,
        emissiveMap: textures.hotelEmissive,
        emissiveIntensity: 0.22,
        roughness: 0.68,
        metalness: 0.08,
      });
      emissiveBuildingMaterials.push(mainMat);
    }
    disposables.push(mainMat);

    const accentMat = new THREE.MeshStandardMaterial({
      color: spec.accentColor,
      roughness: 0.38,
      metalness: 0.32,
    });
    disposables.push(accentMat);

    // Part 1: Ground-floor Podium / Lobby Base
    const podiumH = Math.min(4.2, spec.height * 0.32);
    const podium = new THREE.Mesh(unitBoxGeo, spec.style === 'warehouse' ? mainMat : lobbyGlassMat);
    podium.scale.set(spec.width * 0.96, podiumH, spec.depth * 0.96);
    podium.position.y = podiumH / 2;
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);
    environmentMeshesForCamera.push(podium);

    // Part 2: Primary Tower / Main Massing
    const mainH = spec.height - podiumH;
    const mainBody = new THREE.Mesh(unitBoxGeo, mainMat);
    mainBody.scale.set(spec.width, mainH, spec.depth);
    mainBody.position.y = podiumH + mainH / 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);
    environmentMeshesForCamera.push(mainBody);

    // Part 3: Architectural Roof Cornice / Trim Collar
    const cornice = new THREE.Mesh(unitBoxGeo, accentMat);
    cornice.scale.set(spec.width + 0.7, 0.75, spec.depth + 0.7);
    cornice.position.y = spec.height + 0.35;
    group.add(cornice);

    // Part 4: Stepped Upper Tiers (for tall skyscrapers, Vice Tower landmark, hotels)
    let topY = spec.height + 0.7;
    if (spec.tiers >= 2) {
      const tierW = spec.width * 0.72;
      const tierD = spec.depth * 0.72;
      const tierH = Math.max(3.5, spec.height * 0.18);
      const tierMesh = new THREE.Mesh(unitBoxGeo, mainMat);
      tierMesh.scale.set(tierW, tierH, tierD);
      tierMesh.position.y = topY + tierH / 2;
      tierMesh.castShadow = true;
      group.add(tierMesh);
      topY += tierH;

      const tierTrim = new THREE.Mesh(unitBoxGeo, accentMat);
      tierTrim.scale.set(tierW + 0.5, 0.55, tierD + 0.5);
      tierTrim.position.y = topY + 0.25;
      group.add(tierTrim);
      topY += 0.55;
    }

    // Special Crown & Spire for VICE TOWER LANDMARK
    if (spec.style === 'landmark') {
      const crown = new THREE.Mesh(unitBoxGeo, accentMat);
      crown.scale.set(spec.width * 0.42, 6.5, spec.depth * 0.42);
      crown.position.y = topY + 3.25;
      group.add(crown);

      const spire = new THREE.Mesh(unitCylGeo, darkMetalMat);
      spire.scale.set(0.45, 16, 0.45);
      spire.position.y = topY + 6.5 + 8;
      group.add(spire);
    }

    // Art Deco Vertical Central Fin on Ocean Drive Hotels & Clubs
    if (spec.style === 'hotel' || spec.style === 'club') {
      const fin = new THREE.Mesh(unitBoxGeo, accentMat);
      fin.scale.set(1.1, spec.height * 0.85, spec.depth + 0.9);
      fin.position.y = spec.height * 0.52;
      group.add(fin);
    }

    // Storefront Awning Canopy
    if (spec.hasAwning) {
      const awning = new THREE.Mesh(unitBoxGeo, accentMat);
      awning.scale.set(spec.width + 1.3, 0.32, spec.depth + 1.3);
      awning.position.y = podiumH + 0.15;
      group.add(awning);
    }

    // Parking Deck Horizontal Slabs
    if (spec.style === 'parking') {
      for (let f = 1; f <= 3; f++) {
        const deckBand = new THREE.Mesh(unitBoxGeo, darkMetalMat);
        deckBand.scale.set(spec.width + 0.35, 0.95, spec.depth + 0.35);
        deckBand.position.y = f * 3.6;
        group.add(deckBand);
      }
    }

    // Warehouse Gable Roof Ridge + Loading Bay Door
    if (spec.style === 'warehouse') {
      const ridge = new THREE.Mesh(unitBoxGeo, accentMat);
      ridge.scale.set(spec.width + 0.4, 1.1, spec.depth * 0.55);
      ridge.position.y = spec.height + 0.55;
      group.add(ridge);

      const bayDoor = new THREE.Mesh(unitBoxGeo, darkMetalMat);
      bayDoor.scale.set(5.5, 4.2, spec.depth + 0.25);
      bayDoor.position.y = 2.1;
      group.add(bayDoor);
    }

    // Tasteful Architectural Neon Accent Bar (Entertainment Clubs & Ocean Drive Hotels)
    if (spec.neonColor !== undefined) {
      const neonMat = new THREE.MeshStandardMaterial({
        color: spec.neonColor,
        emissive: spec.neonColor,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      });
      neonTrimMaterials.push(neonMat);
      disposables.push(neonMat);

      const neonBand = new THREE.Mesh(unitBoxGeo, neonMat);
      neonBand.scale.set(spec.width + 0.85, 0.38, spec.depth + 0.85);
      neonBand.position.y = spec.height - 0.8;
      group.add(neonBand);

      if (spec.style === 'club') {
        const marquee = new THREE.Mesh(unitBoxGeo, neonMat);
        marquee.scale.set(spec.width * 0.65, 1.2, spec.depth + 1.1);
        marquee.position.y = podiumH + 1.4;
        group.add(marquee);
      }
    }

    // Rooftop Mechanical Unit or Pool
    if (spec.hasRooftopPool) {
      const poolDeck = new THREE.Mesh(unitBoxGeo, poolWaterMat);
      poolDeck.scale.set(spec.width * 0.48, 0.22, spec.depth * 0.48);
      poolDeck.position.y = topY + 0.12;
      group.add(poolDeck);
    } else if (spec.style !== 'landmark') {
      const hvac = new THREE.Mesh(unitBoxGeo, roofConcreteMat);
      hvac.scale.set(spec.width * 0.28, 1.4, spec.depth * 0.28);
      hvac.position.set(spec.width * 0.15, topY + 0.7, -spec.depth * 0.12);
      group.add(hvac);
    }

    root.add(group);
  };

  for (const b of layout.buildings) {
    buildArchitecturalStructure(b);
  }

  // -------------------------------------------------------
  // 5. INDUSTRIAL HARBOUR CONTAINERS & GANTRY CRANES
  // -------------------------------------------------------
  const containerGeo = new THREE.BoxGeometry(6.1, 2.6, 2.5);
  const containerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.warehouseMap,
    roughness: 0.58,
    metalness: 0.42,
  });
  disposables.push(containerGeo, containerMat);

  const containerInst = new THREE.InstancedMesh(
    containerGeo,
    containerMat,
    layout.containers.length,
  );
  const tmpColor = new THREE.Color();
  layout.containers.forEach((c, idx) => {
    dummy.position.set(c.x, c.y + 1.3, c.z);
    dummy.rotation.set(0, c.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    containerInst.setMatrixAt(idx, dummy.matrix);
    containerInst.setColorAt(idx, tmpColor.setHex(c.color));
  });
  containerInst.instanceMatrix.needsUpdate = true;
  if (containerInst.instanceColor) containerInst.instanceColor.needsUpdate = true;
  containerInst.castShadow = true;
  containerInst.receiveShadow = true;
  containerInst.computeBoundingSphere();
  root.add(containerInst);

  // Two Harbour Gantry Cranes at West Pier
  const craneYellowMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.42,
    metalness: 0.55,
  });
  disposables.push(craneYellowMat);
  for (const cz of [44, 82]) {
    const crane = new THREE.Group();
    crane.position.set(-124, 0, cz);
    const legOffsets = [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(unitBoxGeo, craneYellowMat);
      leg.scale.set(0.85, 22, 0.85);
      leg.position.set(lx, 11, lz);
      crane.add(leg);
    }
    const boom = new THREE.Mesh(unitBoxGeo, craneYellowMat);
    boom.scale.set(28, 1.8, 3.2);
    boom.position.set(-2, 22, 0);
    const cab = new THREE.Mesh(unitBoxGeo, darkMetalMat);
    cab.scale.set(3.2, 2.8, 2.8);
    cab.position.set(-6, 19.5, 0);
    crane.add(boom, cab);
    root.add(crane);
  }

  // Ocean Drive Beach Lifeguard Tower & Cabana Umbrellas
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.68 });
  const towerRoofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
  disposables.push(towerMat, towerRoofMat);
  for (const lz of [-36, 36]) {
    const lg = new THREE.Group();
    lg.position.set(130, 0, lz);
    const stilts = new THREE.Mesh(unitBoxGeo, boardMat);
    stilts.scale.set(2.8, 2.4, 2.8);
    stilts.position.y = 1.2;
    const cabin = new THREE.Mesh(unitBoxGeo, towerMat);
    cabin.scale.set(3.2, 2.5, 3.2);
    cabin.position.y = 3.5;
    const roof = new THREE.Mesh(unitBoxGeo, towerRoofMat);
    roof.scale.set(4.0, 0.45, 4.0);
    roof.position.y = 4.95;
    lg.add(stilts, cabin, roof);
    root.add(lg);
  }

  // -------------------------------------------------------
  // 6. INSTANCED PALM TREES & PARK TREES
  // -------------------------------------------------------
  const palms = layout.trees.filter((t) => t.kind === 'palm');
  const parkTrees = layout.trees.filter((t) => t.kind === 'park');

  // Palm trunks (tapered cylinder) + 8 gracefully arched coastal fronds per palm (InstancedMesh)
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 8.8, 8);
  trunkGeo.translate(0, 4.4, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x70543e, roughness: 0.92 });
  const frondGeo = new THREE.ConeGeometry(0.82, 4.6, 4);
  frondGeo.scale(1.05, 1.0, 0.16);
  frondGeo.translate(0, 2.2, 0);
  frondGeo.rotateX(Math.PI * 0.58);
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.04,
  });
  disposables.push(trunkGeo, trunkMat, frondGeo, frondMat);

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const frondInst = new THREE.InstancedMesh(frondGeo, frondMat, palms.length * 8);
  const frondPalette = [0x266e3d, 0x328249, 0x1f5c33, 0x3d8f51];

  let frondIdx = 0;
  palms.forEach((p, idx) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(p.lean, p.rotY, 0);
    dummy.scale.set(p.scale, p.scale, p.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    // Top of leaning trunk
    const topX = p.x + Math.sin(p.rotY) * Math.sin(p.lean) * 8.6 * p.scale;
    const topY = Math.cos(p.lean) * 8.6 * p.scale;
    const topZ = p.z + Math.cos(p.rotY) * Math.sin(p.lean) * 8.6 * p.scale;

    for (let f = 0; f < 8; f++) {
      const upperLayer = f >= 6;
      dummy.position.set(topX, topY + (upperLayer ? 0.25 : 0), topZ);
      dummy.rotation.set(upperLayer ? -0.22 : 0.14, p.rotY + (f / 8) * Math.PI * 2, 0);
      const fs = p.scale * (upperLayer ? 0.78 : 1.05);
      dummy.scale.set(fs, fs, fs);
      dummy.updateMatrix();
      frondInst.setMatrixAt(frondIdx, dummy.matrix);
      frondInst.setColorAt(
        frondIdx,
        tmpColor.setHex(frondPalette[(idx + f) % frondPalette.length]),
      );
      frondIdx++;
    }
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  frondInst.instanceMatrix.needsUpdate = true;
  if (frondInst.instanceColor) frondInst.instanceColor.needsUpdate = true;
  trunkInst.castShadow = true;
  frondInst.castShadow = true;
  trunkInst.computeBoundingSphere();
  frondInst.computeBoundingSphere();
  root.add(trunkInst, frondInst);

  // Park Broadleaf Trees (Coral Heights)
  const parkTrunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 3.6, 8);
  parkTrunkGeo.translate(0, 1.8, 0);
  const parkCanopyGeo = new THREE.DodecahedronGeometry(2.6, 1);
  const parkCanopyMat = new THREE.MeshStandardMaterial({ color: 0x2f7d47, roughness: 0.82 });
  disposables.push(parkTrunkGeo, parkCanopyGeo, parkCanopyMat);

  for (const pt of parkTrees) {
    const g = new THREE.Group();
    g.position.set(pt.x, 0.14, pt.z);
    g.scale.setScalar(pt.scale);
    const t = new THREE.Mesh(parkTrunkGeo, trunkMat);
    const c1 = new THREE.Mesh(parkCanopyGeo, parkCanopyMat);
    c1.position.y = 4.6;
    const c2 = new THREE.Mesh(parkCanopyGeo, parkCanopyMat);
    c2.scale.setScalar(0.72);
    c2.position.set(1.1, 5.4, 0.6);
    g.add(t, c1, c2);
    root.add(g);
  }

  // -------------------------------------------------------
  // 7. INSTANCED STREETLIGHTS + TRAFFIC LIGHT POLES
  // -------------------------------------------------------
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 7.2, 8);
  poleGeo.translate(0, 3.6, 0);
  const armGeo = new THREE.BoxGeometry(0.14, 0.14, 2.2);
  armGeo.translate(0, 7.1, 1.0);
  const bulbGeo = new THREE.BoxGeometry(0.38, 0.18, 0.65);
  bulbGeo.translate(0, 6.98, 2.0);

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.72,
  });
  const streetlightBulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffc876,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  disposables.push(poleGeo, armGeo, bulbGeo, poleMat, streetlightBulbMaterial);

  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, layout.streetlights.length);
  const armInst = new THREE.InstancedMesh(armGeo, poleMat, layout.streetlights.length);
  const bulbInst = new THREE.InstancedMesh(
    bulbGeo,
    streetlightBulbMaterial,
    layout.streetlights.length,
  );

  layout.streetlights.forEach((sl, idx) => {
    dummy.position.set(sl.x, 0, sl.z);
    dummy.rotation.set(0, sl.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(idx, dummy.matrix);
    armInst.setMatrixAt(idx, dummy.matrix);
    bulbInst.setMatrixAt(idx, dummy.matrix);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  poleInst.computeBoundingSphere();
  armInst.computeBoundingSphere();
  bulbInst.computeBoundingSphere();
  root.add(poleInst, armInst, bulbInst);

  // 4 Key Night-Time PointLights in central hubs (within 4-6 unshadowed budget!)
  const streetPointLights: THREE.PointLight[] = [];
  const hubLightCoords: Array<[number, number, number]> = [
    [96, 20, 0xffc278], // Ocean Drive strip
    [0, 56, 0xf472b6], // Neon Mile Entertainment
    [16, -32, 0x38bdf8], // Downtown Vice Plaza
    [96, 88, 0xfbbf24], // Ocean Drive Marina
  ];
  for (const [lx, lz, lcol] of hubLightCoords) {
    const pl = new THREE.PointLight(lcol, 0, 52, 1.6);
    pl.position.set(lx, 10, lz);
    root.add(pl);
    streetPointLights.push(pl);
  }

  // Traffic Light Signals at the 4 central intersections
  const signalBoxGeo = new THREE.BoxGeometry(0.5, 1.35, 0.5);
  const lampGeo = new THREE.SphereGeometry(0.16, 8, 8);
  disposables.push(signalBoxGeo, lampGeo);

  const centralIntersections = layout.intersections.filter(
    (n) => (n.gridX === 1 || n.gridX === 2) && (n.gridZ === 1 || n.gridZ === 2),
  );
  for (const inter of centralIntersections) {
    const nsRedMat = new THREE.MeshStandardMaterial({
      color: 0x3b0a0a,
      emissive: 0xef4444,
      emissiveIntensity: 0,
    });
    const nsGreenMat = new THREE.MeshStandardMaterial({
      color: 0x0a3b1c,
      emissive: 0x22c55e,
      emissiveIntensity: 1.5,
    });
    const ewRedMat = new THREE.MeshStandardMaterial({
      color: 0x3b0a0a,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
    });
    const ewGreenMat = new THREE.MeshStandardMaterial({
      color: 0x0a3b1c,
      emissive: 0x22c55e,
      emissiveIntensity: 0,
    });
    disposables.push(nsRedMat, nsGreenMat, ewRedMat, ewGreenMat);

    // Place 2 signal posts on opposite diagonal corners
    const corners: Array<[number, number, boolean]> = [
      [inter.x + 8.4, inter.z + 8.4, true],
      [inter.x - 8.4, inter.z - 8.4, false],
    ];
    for (const [cx, cz, isNS] of corners) {
      const post = new THREE.Group();
      post.position.set(cx, 0, cz);
      const pMesh = new THREE.Mesh(poleGeo, poleMat);
      pMesh.scale.set(0.85, 0.72, 0.85);
      const housing = new THREE.Mesh(signalBoxGeo, darkMetalMat);
      housing.position.set(0, 5.1, 0);
      const rLamp = new THREE.Mesh(lampGeo, isNS ? nsRedMat : ewRedMat);
      rLamp.position.set(0, 5.45, isNS ? 0.25 : 0);
      if (!isNS) rLamp.position.x = 0.25;
      const gLamp = new THREE.Mesh(lampGeo, isNS ? nsGreenMat : ewGreenMat);
      gLamp.position.set(0, 4.75, isNS ? 0.25 : 0);
      if (!isNS) gLamp.position.x = 0.25;
      post.add(pMesh, housing, rLamp, gLamp);
      root.add(post);
    }

    trafficSignals.push({
      intersectionX: inter.x,
      intersectionZ: inter.z,
      nsRedMat,
      nsGreenMat,
      ewRedMat,
      ewGreenMat,
    });
  }

  return {
    root,
    roadMaterial,
    roadMaterials,
    wetRoadSurfaces,
    emissiveBuildingMaterials,
    neonTrimMaterials,
    streetlightBulbMaterial,
    streetPointLights,
    oceanUniforms,
    oceanMaterial,
    trafficSignals,
    environmentMeshesForCamera,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
