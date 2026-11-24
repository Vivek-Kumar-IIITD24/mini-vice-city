import { ColliderBox, DistrictId, Vec2, VehicleKind, VehicleSpec } from '../types';
import { createSeededRng } from '../core/math';

export const ROAD_COORDS = [-96, -32, 32, 96] as const;
export const ROAD_WIDTH = 14;
export const SIDEWALK_WIDTH = 3.5;
export const BLOCK_HALF_SPAN = 32 - ROAD_WIDTH / 2 - SIDEWALK_WIDTH; // 21.5m from block center to sidewalk edge

export interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  district: DistrictId;
  style:
    | 'skyscraper'
    | 'landmark'
    | 'hotel'
    | 'club'
    | 'villa'
    | 'apartment'
    | 'warehouse'
    | 'parking'
    | 'shop';
  baseColor: number;
  accentColor: number;
  neonColor?: number;
  tiers: number;
  hasAwning?: boolean;
  hasRooftopPool?: boolean;
}

export interface ContainerSpec {
  x: number;
  z: number;
  y: number;
  rotY: number;
  color: number;
}

export interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  lean: number;
  rotY: number;
  kind: 'palm' | 'park';
}

export interface StreetlightSpec {
  x: number;
  z: number;
  rotY: number;
}

export interface IntersectionNode {
  id: string;
  x: number;
  z: number;
  gridX: number;
  gridZ: number;
}

export interface SidewalkLoop {
  points: Vec2[];
}

export interface CityLayout {
  buildings: BuildingSpec[];
  containers: ContainerSpec[];
  trees: TreeSpec[];
  streetlights: StreetlightSpec[];
  intersections: IntersectionNode[];
  colliders: ColliderBox[];
  sidewalkLoops: SidewalkLoop[];
  parkCenter: Vec2;
  playerSpawn: { x: number; z: number; yaw: number };
}

export const VEHICLE_CATALOG: Record<string, VehicleSpec> = {
  veloce_gt: {
    id: 'veloce_gt',
    name: 'Veloce GT',
    subtitle: 'Twin-Turbo Coastal Sports Coupe',
    kind: VehicleKind.Sports,
    color: 0xe63946,
    accentColor: 0x181b24,
    maxSpeed: 38, // ~137 km/h
    reverseSpeed: 12,
    acceleration: 20,
    braking: 30,
    turnRate: 2.45,
    grip: 7.5,
    driftGrip: 2.3,
    length: 4.5,
    width: 2.05,
    height: 1.24,
    price: 0,
  },
  solstice_royale: {
    id: 'solstice_royale',
    name: 'Solstice Royale',
    subtitle: 'Executive Luxury Grand Sedan',
    kind: VehicleKind.Sedan,
    color: 0xf4efe6,
    accentColor: 0xd4a359,
    maxSpeed: 33,
    reverseSpeed: 11,
    acceleration: 15.5,
    braking: 26,
    turnRate: 2.15,
    grip: 8.2,
    driftGrip: 2.8,
    length: 4.9,
    width: 2.1,
    height: 1.42,
    price: 2500,
  },
  bayside_titan: {
    id: 'bayside_titan',
    name: 'Bayside Titan',
    subtitle: 'All-Terrain Coastal Luxury SUV',
    kind: VehicleKind.Suv,
    color: 0x1d4e5f,
    accentColor: 0xcbd5e1,
    maxSpeed: 30,
    reverseSpeed: 10,
    acceleration: 14,
    braking: 24,
    turnRate: 1.95,
    grip: 8.8,
    driftGrip: 3.4,
    length: 4.95,
    width: 2.22,
    height: 1.82,
    price: 4000,
  },
  vcpd_interceptor: {
    id: 'vcpd_interceptor',
    name: 'VCPD Interceptor',
    subtitle: 'Vice Coastal Police Pursuit Unit',
    kind: VehicleKind.Police,
    color: 0x111827,
    accentColor: 0xf8fafc,
    maxSpeed: 36,
    reverseSpeed: 12,
    acceleration: 19,
    braking: 29,
    turnRate: 2.4,
    grip: 8.4,
    driftGrip: 2.6,
    length: 4.75,
    width: 2.08,
    height: 1.46,
    price: 99999,
  },
};

export const TRAFFIC_COLORS = [
  0x2b6cb0, // coastal blue
  0xe2e8f0, // pearl silver
  0xd97706, // sunset amber
  0x0f766e, // seafoam teal
  0x475569, // slate charcoal
  0xb91c1c, // crimson
  0xf5e6ca, // warm cream
];

export function generateCityLayout(): CityLayout {
  const rng = createSeededRng(19860512);
  const buildings: BuildingSpec[] = [];
  const containers: ContainerSpec[] = [];
  const trees: TreeSpec[] = [];
  const streetlights: StreetlightSpec[] = [];
  const intersections: IntersectionNode[] = [];
  const colliders: ColliderBox[] = [];
  const sidewalkLoops: SidewalkLoop[] = [];

  // 1. Intersections grid (4x4 = 16 main intersections)
  for (let gx = 0; gx < ROAD_COORDS.length; gx++) {
    for (let gz = 0; gz < ROAD_COORDS.length; gz++) {
      intersections.push({
        id: `int_${gx}_${gz}`,
        x: ROAD_COORDS[gx],
        z: ROAD_COORDS[gz],
        gridX: gx,
        gridZ: gz,
      });
    }
  }

  const addBuilding = (b: BuildingSpec) => {
    buildings.push(b);
    colliders.push({
      id: b.id,
      minX: b.x - b.width / 2,
      maxX: b.x + b.width / 2,
      minZ: b.z - b.depth / 2,
      maxZ: b.z + b.depth / 2,
      height: b.height,
      kind: 'building',
    });
  };

  // Block centers between ROAD_COORDS: -64, 0, +64
  // Block (cx=-64, cz=-64): RESIDENTIAL PARK & VILLAS (Coral Heights)
  const parkCenter: Vec2 = { x: -64, z: -64 };
  // Add 2 villas on north edge of residential block, leaving southern 2/3 as lush Bayside Palm Park
  addBuilding({
    id: 'res_villa_1',
    x: -74,
    z: -76,
    width: 14,
    depth: 11,
    height: 7.5,
    district: DistrictId.Residential,
    style: 'villa',
    baseColor: 0xf7e7d3,
    accentColor: 0xc26a4a,
    tiers: 1,
  });
  addBuilding({
    id: 'res_villa_2',
    x: -54,
    z: -76,
    width: 14,
    depth: 11,
    height: 8.5,
    district: DistrictId.Residential,
    style: 'villa',
    baseColor: 0xf3d6c8,
    accentColor: 0x3b8ea5,
    tiers: 2,
  });
  // Park trees around Bayside Park
  const parkTreeOffsets: Vec2[] = [
    { x: -78, z: -56 },
    { x: -72, z: -48 },
    { x: -56, z: -48 },
    { x: -50, z: -56 },
    { x: -78, z: -64 },
    { x: -50, z: -64 },
  ];
  for (const pt of parkTreeOffsets) {
    trees.push({
      x: pt.x,
      z: pt.z,
      scale: 0.9 + rng() * 0.25,
      lean: 0.04,
      rotY: rng() * Math.PI * 2,
      kind: 'park',
    });
  }

  // Block (cx=-64, cz=0): RESIDENTIAL APARTMENTS & NEIGHBOURHOOD SHOPS
  addBuilding({
    id: 'res_apt_1',
    x: -73,
    z: -10,
    width: 15,
    depth: 15,
    height: 16,
    district: DistrictId.Residential,
    style: 'apartment',
    baseColor: 0xf5e2cf,
    accentColor: 0x4ca6a8,
    tiers: 2,
    hasAwning: true,
  });
  addBuilding({
    id: 'res_apt_2',
    x: -54,
    z: -10,
    width: 14,
    depth: 14,
    height: 13,
    district: DistrictId.Residential,
    style: 'apartment',
    baseColor: 0xfae6d2,
    accentColor: 0xd97757,
    tiers: 1,
  });
  addBuilding({
    id: 'res_villa_3',
    x: -73,
    z: 10,
    width: 14,
    depth: 13,
    height: 9,
    district: DistrictId.Residential,
    style: 'villa',
    baseColor: 0xe8efe8,
    accentColor: 0xb85d43,
    tiers: 1,
  });
  addBuilding({
    id: 'res_shop_1',
    x: -54,
    z: 10,
    width: 15,
    depth: 13,
    height: 10,
    district: DistrictId.Residential,
    style: 'shop',
    baseColor: 0xf2dec5,
    accentColor: 0x2b7a78,
    tiers: 1,
    hasAwning: true,
  });

  // Block (cx=-64, cz=+64): INDUSTRIAL HARBOUR (Warehouses + Container Yard)
  addBuilding({
    id: 'harbour_wh_1',
    x: -72,
    z: 52,
    width: 20,
    depth: 13,
    height: 10,
    district: DistrictId.Harbour,
    style: 'warehouse',
    baseColor: 0x64748b,
    accentColor: 0xc2410c,
    tiers: 1,
  });
  addBuilding({
    id: 'harbour_wh_2',
    x: -52,
    z: 74,
    width: 16,
    depth: 14,
    height: 11,
    district: DistrictId.Harbour,
    style: 'warehouse',
    baseColor: 0x526173,
    accentColor: 0xd97706,
    tiers: 1,
  });
  // Shipping containers inside Harbour yard
  const containerPalette = [0xb91c1c, 0x1d4ed8, 0xd97706, 0x0f766e, 0x475569];
  const containerSpots: Array<{ x: number; z: number; rotY: number; stack: number }> = [
    { x: -76, z: 70, rotY: 0, stack: 2 },
    { x: -76, z: 75, rotY: 0, stack: 1 },
    { x: -67, z: 70, rotY: 0, stack: 2 },
    { x: -52, z: 53, rotY: Math.PI / 2, stack: 2 },
    { x: -115, z: 54, rotY: 0, stack: 2 },
    { x: -115, z: 60, rotY: 0, stack: 1 },
    { x: -115, z: 78, rotY: 0, stack: 2 },
  ];
  for (let i = 0; i < containerSpots.length; i++) {
    const sp = containerSpots[i];
    for (let layer = 0; layer < sp.stack; layer++) {
      containers.push({
        x: sp.x,
        z: sp.z,
        y: layer * 2.7,
        rotY: sp.rotY,
        color: containerPalette[(i + layer * 2) % containerPalette.length],
      });
    }
    const halfX = sp.rotY === 0 ? 3.2 : 1.35;
    const halfZ = sp.rotY === 0 ? 1.35 : 3.2;
    colliders.push({
      id: `container_${i}`,
      minX: sp.x - halfX,
      maxX: sp.x + halfX,
      minZ: sp.z - halfZ,
      maxZ: sp.z + halfZ,
      height: sp.stack * 2.7,
      kind: 'prop',
    });
  }

  // Block (cx=0, cz=-64): DOWNTOWN VICE NORTH — Iconic VICE TOWER Landmark + Corporate Towers
  addBuilding({
    id: 'vice_tower_landmark',
    x: 0,
    z: -66,
    width: 18,
    depth: 18,
    height: 66,
    district: DistrictId.Downtown,
    style: 'landmark',
    baseColor: 0x3b607a,
    accentColor: 0xf59e0b,
    neonColor: 0x38bdf8,
    tiers: 4,
  });
  addBuilding({
    id: 'dt_north_west',
    x: -14,
    z: -51,
    width: 11,
    depth: 11,
    height: 36,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x4b6b82,
    accentColor: 0xe2e8f0,
    tiers: 2,
  });
  addBuilding({
    id: 'dt_north_east',
    x: 14,
    z: -51,
    width: 11,
    depth: 11,
    height: 44,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x2f4d66,
    accentColor: 0xd4a359,
    tiers: 3,
  });

  // Block (cx=0, cz=0): DOWNTOWN VICE CORE — Skyscrapers + Multi-Level Parking Deck + Shops
  addBuilding({
    id: 'dt_core_1',
    x: -10,
    z: -10,
    width: 15,
    depth: 15,
    height: 52,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x35536b,
    accentColor: 0xf0d9b5,
    tiers: 3,
    hasAwning: true,
  });
  addBuilding({
    id: 'dt_core_2',
    x: 11,
    z: -10,
    width: 14,
    depth: 14,
    height: 38,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x5d768a,
    accentColor: 0x38bdf8,
    tiers: 2,
  });
  addBuilding({
    id: 'dt_parking_deck',
    x: -10,
    z: 10,
    width: 16,
    depth: 14,
    height: 15,
    district: DistrictId.Downtown,
    style: 'parking',
    baseColor: 0x9aa5b1,
    accentColor: 0x334155,
    tiers: 1,
  });
  addBuilding({
    id: 'dt_plaza_shop',
    x: 11,
    z: 10,
    width: 14,
    depth: 14,
    height: 22,
    district: DistrictId.Downtown,
    style: 'shop',
    baseColor: 0xe7d8c5,
    accentColor: 0x0ea5a4,
    tiers: 2,
    hasAwning: true,
  });

  // Block (cx=0, cz=+64): ENTERTAINMENT DISTRICT (Neon Mile Clubs & Lounges)
  addBuilding({
    id: 'ent_club_velvet',
    x: -10,
    z: 54,
    width: 16,
    depth: 14,
    height: 16,
    district: DistrictId.Entertainment,
    style: 'club',
    baseColor: 0x26293d,
    accentColor: 0xf472b6,
    neonColor: 0xf43f8e,
    tiers: 2,
    hasAwning: true,
  });
  addBuilding({
    id: 'ent_club_solaris',
    x: 10,
    z: 54,
    width: 15,
    depth: 14,
    height: 19,
    district: DistrictId.Entertainment,
    style: 'club',
    baseColor: 0x1e2b3c,
    accentColor: 0x22d3ee,
    neonColor: 0x22d3ee,
    tiers: 2,
    hasAwning: true,
  });
  addBuilding({
    id: 'ent_lounge_amber',
    x: -10,
    z: 74,
    width: 15,
    depth: 14,
    height: 14,
    district: DistrictId.Entertainment,
    style: 'club',
    baseColor: 0x31263a,
    accentColor: 0xfbbf24,
    neonColor: 0xf59e0b,
    tiers: 1,
    hasAwning: true,
  });
  addBuilding({
    id: 'ent_theater_vice',
    x: 10,
    z: 74,
    width: 16,
    depth: 14,
    height: 21,
    district: DistrictId.Entertainment,
    style: 'club',
    baseColor: 0x252d42,
    accentColor: 0xc084fc,
    neonColor: 0xa855f7,
    tiers: 2,
    hasAwning: true,
  });

  // East Blocks (cx=+64, cz=-64, 0, +64): OCEAN DRIVE ART DECO HOTELS & RESORTS
  const hotelBlocks = [
    {
      id: 'od_hotel_coral',
      x: 70,
      z: -72,
      w: 16,
      d: 14,
      h: 22,
      base: 0xf6c5ba,
      acc: 0x2ec4b6,
      neon: 0xff758f,
    },
    {
      id: 'od_hotel_azure',
      x: 70,
      z: -54,
      w: 16,
      d: 14,
      h: 28,
      base: 0xf8ebd8,
      acc: 0x0ea5e9,
      neon: 0x38bdf8,
    },
    {
      id: 'od_tower_bay',
      x: 52,
      z: -64,
      w: 13,
      d: 26,
      h: 42,
      base: 0x456982,
      acc: 0xf5d0a9,
      neon: 0xfbbf24,
    },
    {
      id: 'od_hotel_palm',
      x: 70,
      z: -10,
      w: 16,
      d: 15,
      h: 24,
      base: 0xd4efe6,
      acc: 0xf28482,
      neon: 0x2dd4bf,
    },
    {
      id: 'od_hotel_sun',
      x: 70,
      z: 10,
      w: 16,
      d: 15,
      h: 19,
      base: 0xfbe5c8,
      acc: 0xe76f51,
      neon: 0xf59e0b,
    },
    {
      id: 'od_resort_west',
      x: 52,
      z: 0,
      w: 13,
      d: 28,
      h: 34,
      base: 0xeee2d3,
      acc: 0x2a9d8f,
      neon: 0x22d3ee,
    },
    {
      id: 'od_hotel_deco',
      x: 70,
      z: 54,
      w: 16,
      d: 15,
      h: 20,
      base: 0xf9d5d3,
      acc: 0x14b8a6,
      neon: 0xf472b6,
    },
    {
      id: 'od_cafe_marina',
      x: 70,
      z: 74,
      w: 16,
      d: 14,
      h: 15,
      base: 0xf6eedf,
      acc: 0x0284c7,
      neon: 0x38bdf8,
    },
    {
      id: 'od_club_south',
      x: 52,
      z: 64,
      w: 14,
      d: 24,
      h: 23,
      base: 0x2c354b,
      acc: 0xfb7185,
      neon: 0xfb7185,
    },
  ];
  for (const h of hotelBlocks) {
    addBuilding({
      id: h.id,
      x: h.x,
      z: h.z,
      width: h.w,
      depth: h.d,
      height: h.h,
      district: DistrictId.OceanDrive,
      style: 'hotel',
      baseColor: h.base,
      accentColor: h.acc,
      neonColor: h.neon,
      tiers: 2,
      hasAwning: true,
      hasRooftopPool: h.h <= 24,
    });
  }

  // Outer perimeter urban flavor (North of z=-96, West of x=-96, South of z=+96)
  // North Residential & Downtown Fringe
  addBuilding({
    id: 'north_villa_1',
    x: -70,
    z: -116,
    width: 16,
    depth: 12,
    height: 9,
    district: DistrictId.Residential,
    style: 'villa',
    baseColor: 0xf6e6d4,
    accentColor: 0xc26a4a,
    tiers: 1,
  });
  addBuilding({
    id: 'north_apt_1',
    x: -48,
    z: -116,
    width: 16,
    depth: 13,
    height: 15,
    district: DistrictId.Residential,
    style: 'apartment',
    baseColor: 0xe6efe9,
    accentColor: 0x3b8ea5,
    tiers: 2,
  });
  addBuilding({
    id: 'north_tower_1',
    x: -8,
    z: -116,
    width: 18,
    depth: 14,
    height: 46,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x3a5a75,
    accentColor: 0xe2e8f0,
    tiers: 3,
  });
  addBuilding({
    id: 'north_tower_2',
    x: 16,
    z: -116,
    width: 15,
    depth: 14,
    height: 35,
    district: DistrictId.Downtown,
    style: 'skyscraper',
    baseColor: 0x4f6d82,
    accentColor: 0xf59e0b,
    tiers: 2,
  });
  addBuilding({
    id: 'north_resort_1',
    x: 68,
    z: -116,
    width: 22,
    depth: 14,
    height: 26,
    district: DistrictId.OceanDrive,
    style: 'hotel',
    baseColor: 0xf8decb,
    accentColor: 0x0ea5a4,
    neonColor: 0x2dd4bf,
    tiers: 2,
    hasAwning: true,
  });

  // West Industrial Harbour Pier Warehouses
  addBuilding({
    id: 'west_harbour_1',
    x: -118,
    z: 18,
    width: 16,
    depth: 22,
    height: 11,
    district: DistrictId.Harbour,
    style: 'warehouse',
    baseColor: 0x5c6b7a,
    accentColor: 0xea580c,
    tiers: 1,
  });
  addBuilding({
    id: 'west_res_1',
    x: -118,
    z: -56,
    width: 15,
    depth: 16,
    height: 12,
    district: DistrictId.Residential,
    style: 'apartment',
    baseColor: 0xf3e4d2,
    accentColor: 0x2b7a78,
    tiers: 1,
  });

  // South Marina & Entertainment Fringe
  addBuilding({
    id: 'south_club_1',
    x: 0,
    z: 116,
    width: 24,
    depth: 14,
    height: 17,
    district: DistrictId.Entertainment,
    style: 'club',
    baseColor: 0x232a3e,
    accentColor: 0xf59e0b,
    neonColor: 0xf59e0b,
    tiers: 2,
    hasAwning: true,
  });
  addBuilding({
    id: 'south_marina_house',
    x: 66,
    z: 116,
    width: 20,
    depth: 13,
    height: 13,
    district: DistrictId.OceanDrive,
    style: 'hotel',
    baseColor: 0xf3eadc,
    accentColor: 0x0284c7,
    neonColor: 0x38bdf8,
    tiers: 1,
    hasAwning: true,
  });

  // 2. Palm Trees lining Ocean Drive Promenade, Bayfront Ave, and Boulevard Medians
  for (let z = -114; z <= 114; z += 14) {
    // Skip right across cross-street intersections
    const nearRoad = ROAD_COORDS.some((rc) => Math.abs(z - rc) < 10.5);
    if (!nearRoad) {
      // Beachfront promenade palms (east side of Ocean Drive)
      trees.push({
        x: 106.5,
        z,
        scale: 0.92 + rng() * 0.25,
        lean: 0.08 + rng() * 0.08,
        rotY: rng() * Math.PI * 2,
        kind: 'palm',
      });
      // Beach sand palms
      if (Math.abs(z) % 28 < 14) {
        trees.push({
          x: 123 + rng() * 4,
          z: z + 4,
          scale: 0.85 + rng() * 0.28,
          lean: 0.14 + rng() * 0.08,
          rotY: rng() * Math.PI * 2,
          kind: 'palm',
        });
      }
      // Hotel side of Ocean Drive
      trees.push({
        x: 86.2,
        z: z + 5,
        scale: 0.88 + rng() * 0.2,
        lean: 0.06,
        rotY: rng() * Math.PI * 2,
        kind: 'palm',
      });
      // Bayfront Ave & Vice Blvd accent palms
      if (z % 28 === 0 || Math.abs(z) === 56 || Math.abs(z) === 14) {
        trees.push({
          x: 22.4,
          z,
          scale: 0.86 + rng() * 0.18,
          lean: 0.05,
          rotY: rng() * Math.PI * 2,
          kind: 'palm',
        });
        trees.push({
          x: -22.4,
          z,
          scale: 0.86 + rng() * 0.18,
          lean: 0.05,
          rotY: rng() * Math.PI * 2,
          kind: 'palm',
        });
      }
    }
  }

  // 3. Streetlights cleanly placed along road sidewalks (outside intersections & spawn vista)
  for (const rx of ROAD_COORDS) {
    for (let z = -112; z <= 112; z += 24) {
      if (ROAD_COORDS.some((rc) => Math.abs(z - rc) < 11)) continue;
      // Keep Ocean Drive opening spawn vista clear of foreground poles
      const blocksSpawnVista = rx === 96 && z >= 40 && z <= 68;
      if (!blocksSpawnVista) {
        streetlights.push({ x: rx - 8.2, z, rotY: Math.PI / 2 });
      }
      streetlights.push({ x: rx + 8.2, z: z + 10, rotY: -Math.PI / 2 });
    }
  }
  for (const rz of ROAD_COORDS) {
    for (let x = -112; x <= 84; x += 28) {
      if (ROAD_COORDS.some((rc) => Math.abs(x - rc) < 11)) continue;
      streetlights.push({ x, z: rz - 8.2, rotY: 0 });
    }
  }

  // 4. Sidewalk loops around each of the 9 inner city blocks + Ocean Drive boardwalk
  const blockCenters = [-64, 0, 64];
  for (const bx of blockCenters) {
    for (const bz of blockCenters) {
      const s = 23.0; // sidewalk centerline around block
      sidewalkLoops.push({
        points: [
          { x: bx - s, z: bz - s },
          { x: bx + s, z: bz - s },
          { x: bx + s, z: bz + s },
          { x: bx - s, z: bz + s },
        ],
      });
    }
  }
  // Ocean Drive boardwalk stroll loop
  sidewalkLoops.push({
    points: [
      { x: 111, z: -86 },
      { x: 116, z: -86 },
      { x: 116, z: 86 },
      { x: 111, z: 86 },
    ],
  });

  // Player spawns on wide Ocean Drive west sidewalk facing directly toward the Veloce GT & skyline
  const playerSpawn = { x: 87.2, z: 51.8, yaw: -0.44 };

  return {
    buildings,
    containers,
    trees,
    streetlights,
    intersections,
    colliders,
    sidewalkLoops,
    parkCenter,
    playerSpawn,
  };
}
