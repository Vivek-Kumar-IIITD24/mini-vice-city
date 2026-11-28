import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampToPlayableIsland,
  formatTimeHours,
  getDistrictAt,
  getTimePhaseName,
  resolveCircleVsBoxes,
} from './math';
import {
  createDefaultSaveData,
  loadSaveData,
  persistSaveData,
  sanitizeSaveData,
} from './saveSystem';
import { generateCityLayout, ROAD_COORDS, TRAFFIC_COLORS, VEHICLE_CATALOG } from '../world/cityData';
import {
  computeGearLabel,
  createInitialVehicleState,
  stepVehiclePhysics,
} from '../vehicles/vehiclePhysics';
import {
  VELOCE_GT_DIMS,
  buildVeloceBodyShellGeometry,
  buildVeloceRearGlassGeometry,
  buildVeloceRearWingGeometry,
  buildVeloceRoofGeometry,
  buildVeloceSideWindowGeometry,
  buildVeloceWheelParts,
  buildVeloceWindshieldGeometry,
  evaluateVeloceBodySection,
} from '../vehicles/veloceGtGeometry';
import {
  SOLSTICE_ROYALE_DIMS,
  buildSolsticeBodyShellGeometry,
  buildSolsticeExteriorDetailsGeometry,
  buildSolsticeFrontGrilleGeometry,
  buildSolsticeHeadlightsGeometry,
  buildSolsticeInteriorGeometries,
  buildSolsticePillarsGeometry,
  buildSolsticeRearFasciaGeometry,
  buildSolsticeRearGlassGeometry,
  buildSolsticeRoofGeometry,
  buildSolsticeSideWindowGeometry,
  buildSolsticeWheelParts,
  buildSolsticeWindshieldGeometry,
  evaluateSolsticeBodySection,
} from '../vehicles/solsticeRoyaleGeometry';
import {
  BAYSIDE_TITAN_DIMS,
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
  evaluateTitanBodySection,
  sampleTitanRoofRail,
} from '../vehicles/baysideTitanGeometry';
import {
  TRAFFIC_SEDAN_DIMS,
  buildTrafficBodyShellGeometry,
  buildTrafficExteriorDetailsGeometry,
  buildTrafficFrontFasciaGeometry,
  buildTrafficGlassGeometry,
  buildTrafficInteriorGeometry,
  buildTrafficPillarsGeometry,
  buildTrafficRearFasciaGeometry,
  buildTrafficRoofGeometry,
  buildTrafficWheelParts,
  evaluateTrafficSedanSection,
  sampleTrafficSedanRoofRail,
} from '../vehicles/trafficSedanGeometry';
import { TrafficSystem } from '../traffic/trafficSystem';
import {
  VCPD_INTERCEPTOR_DIMS,
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
  evaluateVcpdBodySection,
  sampleVcpdRoofRail,
} from '../vehicles/vcpdInterceptorGeometry';
import {
  PoliceSystem,
  addWantedHeat,
  createInitialWantedState,
  stepWantedCooldown,
} from '../police/policeSystem';
import * as THREE from 'three';
import {
  PLAYER_DIMS,
  buildPlayerForearmAndHandGeometry,
  buildPlayerHeadAndHairGeometry,
  buildPlayerPelvisGeometry,
  buildPlayerShinGeometry,
  buildPlayerShoeGeometry,
  buildPlayerThighGeometry,
  buildPlayerTorsoGeometry,
  buildPlayerUpperArmGeometry,
} from '../player/playerGeometry';
import { createPlayerCharacterRig } from '../player/playerModel';
import {
  applyPlayerPoseToRig,
  createInitialPlayerAnimatorState,
  stepPlayerAnimation,
} from '../player/playerAnimator';
import { PlayerController } from '../player/playerController';
import {
  PEDESTRIAN_DIMS,
  createPedestrianSharedGeometries,
} from '../pedestrians/pedestrianGeometry';
import {
  PEDESTRIAN_ARCHETYPES,
  createPedestrianRig,
  createPedestrianSharedResources,
} from '../pedestrians/pedestrianModel';
import {
  applyPedestrianPoseToRig,
  createInitialPedestrianAnimatorState,
  stepPedestrianAnimation,
} from '../pedestrians/pedestrianAnimator';
import { PedestrianSystem } from '../pedestrians/pedestrianSystem';
import {
  createMissionProgress,
  getMissionById,
  stepMissionProgress,
} from '../missions/missionData';
import { TimeAndWeatherSystem } from '../time/timeAndWeather';
import { buildCityWorld } from '../world/cityBuilder';
import {
  createArtDecoFinGeometry,
  createSlopedCrownGeometry,
  resolveDowntownTowerProfile,
} from '../world/downtownArchitecture';
import {
  createArtDecoPedimentGeometry,
  createChamferedBlockGeometry,
  createCurvedBalconySlabGeometry,
  createRoundedCornerGeometry,
  resolveOceanDriveHotelProfile,
} from '../world/oceanDriveArchitecture';
import {
  createArchedFrameGeometry,
  createBalconyCorbelGeometry,
  createGableRoofGeometry,
  createHippedTerracottaRoofGeometry,
  createSlopedAwningGeometry,
  isCoralHeightsBuildingSpec,
  resolveCoralHeightsProfile,
} from '../world/coralHeightsArchitecture';
import {
  createArtDecoCornerPylonGeometry,
  createCurvedDecoBayGeometry,
  createCurvedNeonRibbonGeometry,
  createSteppedDecoCrownGeometry,
  createTheaterMarqueeGeometry,
  isNeonMileBuildingSpec,
  resolveNeonMileProfile,
} from '../world/neonMileArchitecture';
import {
  createIndustrialGableRoofGeometry,
  createRoofVentCowlGeometry,
  createSawtoothClerestoryRoofGeometry,
  createSlopedDockCanopyGeometry,
  createSteelGussetBracketGeometry,
  isIndustrialHarbourWarehouseSpec,
  resolveIndustrialHarbourProfile,
} from '../world/industrialHarbourArchitecture';
import {
  ALL_PALM_SPECIES,
  assignPalmSpecies,
  createCoconutClusterGeometry,
  createPalmCrownGeometry,
  createPalmTrunkGeometry,
  createPinnateFrondGeometry,
  createSabalFanLeafGeometry,
  hasCoconutCluster,
} from '../world/palmTreeAssets';
import {
  BEACH_ACCESS_Z,
  PRESERVED_BEACH_FOOTPRINT,
  PRESERVED_BOARDWALK_FOOTPRINT,
  PRESERVED_PIER_FOOTPRINT,
  SAND_MOISTURE_CONFIG,
  createBeachSandTextureSet,
  createBeveledTimberPostGeometry,
  createCoastalBeachGeometry,
  createCoastalBoardwalkWoodTextures,
  createContouredShorelineFoamGeometry,
  createMooringCleatGeometry,
  createShallowWaterVeilGeometry,
  createSurfFoamLaceTexture,
  evaluateBeachSurfaceWorldY,
  evaluateSandWetnessAt,
  evaluateShallowWaterFactor,
  sampleShorelineContourX,
} from '../world/coastalShorelineAssets';
import type { ProceduralTextureSet } from '../world/textures';
import {
  applyRoadWetness,
  createWetRoadSurface,
  stepRoadWetness,
} from '../world/wetRoadSync';
import {
  applyShadowConfigToLight,
  computeCelestialState,
  computeStabilizedShadowPlacement,
  getShadowConfigForQuality,
} from '../time/sunAndShadow';
import {
  computeCloudLightingParams,
  computeSubtleCloudShadowFactor,
  createInitialCloudState,
  getCloudQualityConfig,
  getWeatherCloudProfile,
  stepCloudAtmosphereState,
} from '../time/skyClouds';
import {
  CinematicGradeShader,
  CinematicPostPipeline,
  HARDENED_BLOOM_HIGHPASS_FRAGMENT_SHADER,
  computeCinematicPostState,
  getPostProcessingConfigForQuality,
} from '../rendering/postProcessing';
import {
  DynamicEnvironmentSystem,
  ENV_DOME_FRAGMENT_SHADER,
  computeEnvironmentDelta,
  computeEnvironmentIntensity,
  EnvironmentAtmosphereSnapshot,
  getEnvironmentQualityConfig,
  shouldRefreshEnvironment,
  type PmremGeneratorLike,
} from '../rendering/environmentReflections';
import {
  createVehicleMesh,
  disposeSharedVehicleResources,
  getVehiclePaintMaterialProfile,
  type VehicleRig,
} from '../vehicles/vehicleModels';
import { WorldEffectsAndMarkers } from '../missions/missionMarkers';
import { DistrictId, GraphicsQuality, TimePreset, VehicleKind, WeatherType } from '../types';

function createMockTextures(): ProceduralTextureSet {
  const dummyTex = () => new THREE.Texture() as unknown as THREE.CanvasTexture;
  return {
    asphaltMap: dummyTex(),
    asphaltBump: dummyTex(),
    asphaltPuddleRoughness: dummyTex(),
    sidewalkMap: dummyTex(),
    skyscraperMap: dummyTex(),
    skyscraperEmissive: dummyTex(),
    skyscraperRoughness: dummyTex(),
    skyscraperMetalness: dummyTex(),
    skyscraperGlassMask: dummyTex(),
    hotelMap: dummyTex(),
    hotelEmissive: dummyTex(),
    hotelRoughness: dummyTex(),
    hotelGlassMask: dummyTex(),
    warehouseMap: dummyTex(),
    sandMap: dummyTex(),
    contactShadowMap: dummyTex(),
    dispose: () => {},
  };
}

test('city layout places player spawn and starter vehicle in clear open space without building overlap', () => {
  const layout = generateCityLayout();
  assert.ok(layout.buildings.length >= 25, 'should have rich multi-district buildings');
  assert.ok(layout.trees.length >= 30, 'should have coastal palms & park trees');
  assert.ok(layout.streetlights.length >= 30, 'should have streetlighting along avenues');

  const spawnHit = resolveCircleVsBoxes(
    layout.playerSpawn.x,
    layout.playerSpawn.z,
    0.5,
    layout.colliders,
  );
  assert.equal(spawnHit.hit, false, 'player spawn must not collide with any building');

  const starterCarHit = resolveCircleVsBoxes(90.4, 46.5, 2.0, layout.colliders);
  assert.equal(starterCarHit.hit, false, 'starter Veloce GT must sit clear of buildings');
});

test('district lookup maps all 5 coastal districts accurately', () => {
  assert.equal(getDistrictAt(96, 20), DistrictId.OceanDrive);
  assert.equal(getDistrictAt(0, -40), DistrictId.Downtown);
  assert.equal(getDistrictAt(0, 64), DistrictId.Entertainment);
  assert.equal(getDistrictAt(-64, -56), DistrictId.Residential);
  assert.equal(getDistrictAt(-64, 64), DistrictId.Harbour);
});

test('vehicle physics accelerates, steers, brakes, reverses, and resolves wall collisions', () => {
  const spec = VEHICLE_CATALOG.veloce_gt;
  let state = createInitialVehicleState(96, 40, 0);

  // Accelerate for 1 second
  for (let i = 0; i < 30; i++) {
    state = stepVehiclePhysics(
      state,
      spec,
      { throttle: 1, brake: 0, steer: 0, handbrake: false },
      1 / 30,
      [],
    );
  }
  assert.ok(state.speed > 12, `expected speed > 12 m/s, got ${state.speed}`);
  assert.ok(state.z < 35, 'heading 0 drives toward -Z (north)');
  assert.notEqual(computeGearLabel(state.speed, state.reversing), 'N');

  // Steer left while moving
  const headingBefore = state.heading;
  state = stepVehiclePhysics(
    state,
    spec,
    { throttle: 1, brake: 0, steer: 1, handbrake: false },
    0.05,
    [],
  );
  assert.ok(state.heading > headingBefore, 'left steer increases heading');

  // Brake to stop and enter reverse
  for (let i = 0; i < 60; i++) {
    state = stepVehiclePhysics(
      state,
      spec,
      { throttle: 0, brake: 1, steer: 0, handbrake: false },
      1 / 30,
      [],
    );
  }
  assert.ok(state.speed < 0, 'holding S after stopping engages reverse');
  assert.equal(computeGearLabel(state.speed, state.reversing), 'R');

  // Building box collision prevents tunneling
  const wallBox = [{ id: 'w', minX: 90, maxX: 102, minZ: 10, maxZ: 20, height: 10, kind: 'building' as const }];
  const hitState = stepVehiclePhysics(
    { ...createInitialVehicleState(96, 21.5, 0), vz: -18, speed: 18 },
    spec,
    { throttle: 1, brake: 0, steer: 0, handbrake: false },
    0.05,
    wallBox,
  );
  assert.ok(hitState.z >= 21.5, 'car should be pushed out of building AABB');
  assert.ok(hitState.impactSpeed > 5, 'wall collision should record impactSpeed');
});

test('police wanted level escalates, counts down escape when unseen, and triggers busted when cornered', () => {
  let w = createInitialWantedState();
  w = addWantedHeat(w, 28);
  assert.equal(w.stars, 2);

  // While spotted, escape timer stays near 0
  const spottedStep = stepWantedCooldown(w, true, false, 2.0);
  assert.equal(spottedStep.state.escaping, false);
  assert.equal(spottedStep.escapedCompletely, false);

  // While unseen for escapeDuration, wanted clears completely
  const escapedStep = stepWantedCooldown(w, false, false, w.escapeDuration + 1);
  assert.equal(escapedStep.escapedCompletely, true);
  assert.equal(escapedStep.state.stars, 0);

  // While cornered for > 3.2s, triggers busted
  const bustedStep = stepWantedCooldown(w, true, true, 3.5);
  assert.equal(bustedStep.busted, true);
});

test('story mission THE FIRST RIDE advances from finding vehicle through all checkpoints to completion', () => {
  let progress = createMissionProgress('the_first_ride', false, 0);
  assert.equal(progress.stage, 'find_vehicle');

  // Entering vehicle transitions to checkpoints
  let step = stepMissionProgress(progress, 92, 42, true, 0.1);
  assert.equal(step.enteredVehicleStep, true);
  assert.equal(step.state.stage, 'checkpoints');
  progress = step.state;

  // Hit every checkpoint in order
  const coords = [
    [96, 0],
    [96, -64],
    [32, -96],
    [32, -18],
    [32, 64],
    [96, 96],
  ];
  for (let i = 0; i < coords.length; i++) {
    step = stepMissionProgress(progress, coords[i][0], coords[i][1], true, 1.0);
    assert.equal(step.checkpointReached, true, `checkpoint ${i} should trigger`);
    progress = step.state;
  }
  assert.equal(step.missionCompleted, true);
  assert.equal(progress.stage, 'completed');
});

test('timed mission starts with configured limit, flags timeout when exceeded, clamps remaining time to 0, and never marks completed', () => {
  const def = getMissionById('ocean_drive_sprint');
  assert.ok(def && typeof def.timeLimitSec === 'number');

  const initial = createMissionProgress(def.id, true, 0);
  assert.equal(initial.missionId, def.id);
  assert.equal(initial.stage, 'checkpoints');
  assert.equal(initial.remainingSec, def.timeLimitSec);

  // Advance part-way through the timer away from checkpoint 0
  const mid = stepMissionProgress(initial, 0, 0, true, 25);
  assert.equal(mid.missionFailedTimeout, false);
  assert.equal(mid.missionCompleted, false);
  assert.equal(mid.state.remainingSec, def.timeLimitSec - 25);

  // Overshoot remaining time even if positioned directly on the checkpoint
  const cp0 = def.checkpoints[0];
  const expired = stepMissionProgress(mid.state, cp0.x, cp0.z, true, def.timeLimitSec);
  assert.equal(expired.missionFailedTimeout, true);
  assert.equal(expired.state.remainingSec, 0);
  assert.equal(expired.missionCompleted, false);
  assert.equal(expired.checkpointReached, false);
  assert.notEqual(expired.state.stage, 'completed');
});

test('clearing active mission metadata on timeout persists activeMissionId null and checkpoint 0 while preserving player save data', () => {
  const memory = new Map<string, string>();
  const mockStore = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
  };

  const def = getMissionById('harbour_express');
  assert.ok(def && typeof def.timeLimitSec === 'number');

  // Seed a save with active timed mission mid-way through checkpoints and existing player progression
  const save = createDefaultSaveData();
  save.money = 6750;
  save.unlockedVehicleIds = ['veloce_gt', 'solstice_royale'];
  save.completedMissionIds = ['the_first_ride'];
  save.discoveredDistricts = [DistrictId.OceanDrive, DistrictId.Downtown, DistrictId.Harbour];
  save.stats.distanceDrivenKm = 18.4;
  save.stats.missionsCompleted = 1;
  save.stats.maxWantedEscaped = 3;
  save.settings.weather = WeatherType.Rain;
  save.activeMissionId = def.id;
  save.activeCheckpointIndex = 2;
  assert.equal(persistSaveData(save, mockStore), true);

  // Verify the active mission was initially persisted before timeout
  const beforeTimeout = loadSaveData(mockStore);
  assert.ok(beforeTimeout);
  assert.equal(beforeTimeout.activeMissionId, def.id);
  assert.equal(beforeTimeout.activeCheckpointIndex, 2);

  // Simulate mission timeout and immediate free-roam reset + persist
  const activeProgress = createMissionProgress(def.id, true, 2);
  const timeoutStep = stepMissionProgress(activeProgress, 0, 0, true, def.timeLimitSec + 5);
  assert.equal(timeoutStep.missionFailedTimeout, true);
  assert.equal(timeoutStep.state.remainingSec, 0);
  assert.equal(timeoutStep.missionCompleted, false);

  const clearedProgress = createMissionProgress(null, true, 0);
  assert.equal(clearedProgress.missionId, null);
  assert.equal(clearedProgress.stage, 'idle');
  assert.equal(clearedProgress.checkpointIndex, 0);

  save.activeMissionId = clearedProgress.missionId;
  save.activeCheckpointIndex = clearedProgress.checkpointIndex;
  assert.equal(persistSaveData(save, mockStore), true);

  // Reloading after timeout restores free-roam mission metadata and preserves all other progression/settings
  const reloaded = loadSaveData(mockStore);
  assert.ok(reloaded);
  assert.equal(reloaded.activeMissionId, null);
  assert.equal(reloaded.activeCheckpointIndex, 0);
  assert.equal(reloaded.money, 6750);
  assert.deepEqual(reloaded.unlockedVehicleIds, ['veloce_gt', 'solstice_royale']);
  assert.deepEqual(reloaded.completedMissionIds, ['the_first_ride']);
  assert.deepEqual(reloaded.discoveredDistricts, [
    DistrictId.OceanDrive,
    DistrictId.Downtown,
    DistrictId.Harbour,
  ]);
  assert.equal(reloaded.stats.distanceDrivenKm, 18.4);
  assert.equal(reloaded.stats.missionsCompleted, 1);
  assert.equal(reloaded.stats.maxWantedEscaped, 3);
  assert.equal(reloaded.settings.weather, WeatherType.Rain);
});

test('save system persists, reloads, and gracefully rejects corrupted JSON', () => {
  const memory = new Map<string, string>();
  const mockStore = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
  };

  const data = createDefaultSaveData();
  data.money = 4250;
  data.completedMissionIds.push('the_first_ride');
  assert.equal(persistSaveData(data, mockStore), true);

  const loaded = loadSaveData(mockStore);
  assert.ok(loaded);
  assert.equal(loaded.money, 4250);
  assert.deepEqual(loaded.completedMissionIds, ['the_first_ride']);

  // Corrupted JSON returns null without throwing
  mockStore.setItem('mini_vice_city_save_v1', '{broken-json');
  assert.equal(loadSaveData(mockStore), null);

  // Invalid shape returns null
  assert.equal(sanitizeSaveData({ money: 'NaN' }), null);
});

test('time formatting and island boundary clamping behave deterministically', () => {
  assert.equal(formatTimeHours(17.5), '17:30');
  assert.equal(getTimePhaseName(17.5), 'Golden Hour');
  assert.equal(getTimePhaseName(22.0), 'Night');
  const clamped = clampToPlayableIsland(250, -300, 1);
  assert.equal(clamped.clamped, true);
  assert.ok(clamped.x <= 138 && clamped.z >= -132);
});

test('wet-road synchronization wets all asphalt directions and intersections equally and restores dry baselines', () => {
  const nsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.08,
    bumpScale: 0.04,
  });
  const ewMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.08,
    bumpScale: 0.04,
  });
  const interMat = new THREE.MeshStandardMaterial({
    color: 0x262b35,
    roughness: 0.78,
    metalness: 0.08,
    bumpScale: 0.03,
  });
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xe8edf3,
    roughness: 0.65,
  });

  const dryInterR = interMat.color.r;
  const surfaces = [
    createWetRoadSurface('road_ns', nsMat, 'asphalt'),
    createWetRoadSurface('road_ew', ewMat, 'asphalt'),
    createWetRoadSurface('intersections', interMat, 'asphalt'),
    createWetRoadSurface('crosswalks', zebraMat, 'marking'),
  ];

  // Gradually increase wetness during rain
  let wetness = 0;
  for (let i = 0; i < 60; i++) {
    const prev = wetness;
    wetness = stepRoadWetness(wetness, 1, 0.05);
    assert.ok(wetness >= prev, 'wetness should increase monotonically during rain');
  }
  assert.ok(wetness > 0.9, `expected wetness > 0.9 after rain, got ${wetness}`);

  applyRoadWetness(surfaces, wetness);
  assert.equal(nsMat.roughness, ewMat.roughness, 'NS and EW road roughness must match');
  assert.equal(nsMat.roughness, interMat.roughness, 'intersection roughness must match road roughness');
  assert.equal(nsMat.metalness, ewMat.metalness, 'NS and EW metalness must match');
  assert.equal(nsMat.metalness, interMat.metalness, 'intersection metalness must match road metalness');
  assert.equal(nsMat.envMapIntensity, interMat.envMapIntensity, 'envMapIntensity must stay synced');
  assert.ok(nsMat.roughness < 0.3, `wet asphalt should have low roughness, got ${nsMat.roughness}`);
  assert.ok(zebraMat.roughness < 0.35, `wet crosswalk markings should respond to rain, got ${zebraMat.roughness}`);
  assert.ok(interMat.color.r < dryInterR, 'wet asphalt should darken slightly');

  // Gradually dry back out in clear weather
  for (let i = 0; i < 320; i++) {
    const prev = wetness;
    wetness = stepRoadWetness(wetness, 0, 0.05);
    assert.ok(wetness <= prev, 'wetness should decrease monotonically when clear');
  }
  assert.equal(wetness, 0, 'wetness should settle cleanly to 0 when dry');

  applyRoadWetness(surfaces, wetness);
  assert.equal(nsMat.roughness, 0.78);
  assert.equal(ewMat.roughness, 0.78);
  assert.equal(interMat.roughness, 0.78);
  assert.equal(zebraMat.roughness, 0.65);
  assert.equal(nsMat.metalness, 0.08);
  assert.equal(interMat.metalness, 0.08);
  assert.equal(nsMat.bumpScale, 0.04);
  assert.equal(interMat.bumpScale, 0.03);
  assert.ok(Math.abs(interMat.color.r - dryInterR) < 1e-6, 'dry color should restore cleanly');

  nsMat.dispose();
  ewMat.dispose();
  interMat.dispose();
  zebraMat.dispose();
});

test('TimeAndWeatherSystem synchronizes rain and clear weather across BuiltCityWorld NS, EW, and intersection roads', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();

  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, true);

  assert.equal(world.roadMaterials.length, 3, 'world should expose NS, EW, and intersection road materials');
  assert.equal(world.wetRoadSurfaces.length, 4, 'world should register NS, EW, intersections, and crosswalks');

  const [nsMat, ewMat, interMat] = world.roadMaterials;

  // Enable Rain and step time
  weather.setWeather(WeatherType.Rain, false);
  for (let i = 0; i < 80; i++) {
    weather.update(0.05, 0, 0, world);
  }
  assert.ok(weather.roadWetness > 0.85, 'roadWetness should build up during Rain');
  assert.equal(nsMat.roughness, ewMat.roughness);
  assert.equal(nsMat.roughness, interMat.roughness);
  assert.equal(nsMat.metalness, ewMat.metalness);
  assert.equal(nsMat.metalness, interMat.metalness);
  assert.ok(interMat.roughness < 0.35, 'intersections must become visibly wet during Rain');

  // Return to Clear weather and step until dry
  weather.setWeather(WeatherType.Clear, false);
  for (let i = 0; i < 360; i++) {
    weather.update(0.05, 0, 0, world);
  }
  assert.equal(weather.roadWetness, 0, 'roadWetness should return to 0 in Clear weather');
  assert.equal(nsMat.roughness, 0.78);
  assert.equal(ewMat.roughness, 0.78);
  assert.equal(interMat.roughness, 0.78);

  weather.dispose();
  world.dispose();
});

test('computeCelestialState produces normalized sun/moon vectors and smooth 24-hour continuity without jumps', () => {
  let prevEnv = computeCelestialState(0).keyLightEnvelope;
  let prevSun = computeCelestialState(0).sunDir;
  let prevMoon = computeCelestialState(0).moonDir;

  const steps = 1200; // 0.02h (~1.2 game minute) steps across full 24h wrap
  for (let step = 1; step <= steps; step++) {
    const h = (step / steps) * 24;
    const state = computeCelestialState(h);
    const sunLen = Math.hypot(state.sunDir.x, state.sunDir.y, state.sunDir.z);
    const moonLen = Math.hypot(state.moonDir.x, state.moonDir.y, state.moonDir.z);
    const activeLen = Math.hypot(
      state.activeLightDir.x,
      state.activeLightDir.y,
      state.activeLightDir.z,
    );
    assert.ok(Math.abs(sunLen - 1) < 1e-6, `sunDir must be normalized at h=${h}`);
    assert.ok(Math.abs(moonLen - 1) < 1e-6, `moonDir must be normalized at h=${h}`);
    assert.ok(Math.abs(activeLen - 1) < 1e-6, `activeLightDir must be normalized at h=${h}`);

    // Sun and moon paths must move continuously without sudden directional jumps
    const sunDot =
      state.sunDir.x * prevSun.x + state.sunDir.y * prevSun.y + state.sunDir.z * prevSun.z;
    const moonDot =
      state.moonDir.x * prevMoon.x + state.moonDir.y * prevMoon.y + state.moonDir.z * prevMoon.z;
    assert.ok(sunDot > 0.9998, `sun direction should move smoothly at h=${h}`);
    assert.ok(moonDot > 0.9998, `moon direction should move smoothly at h=${h}`);

    // Key light intensity envelope must never jump abruptly across dusk/dawn handoffs
    assert.ok(
      Math.abs(state.keyLightEnvelope - prevEnv) < 0.08,
      `keyLightEnvelope jumped from ${prevEnv} to ${state.keyLightEnvelope} at h=${h}`,
    );

    prevEnv = state.keyLightEnvelope;
    prevSun = state.sunDir;
    prevMoon = state.moonDir;
  }

  // Morning rises in the East (+X), Midday peaks high, Golden Hour sits low in the West (-X)
  const morning = computeCelestialState(9.5);
  assert.ok(morning.sunDir.x > 0.3 && morning.sunDir.y > 0.45 && !morning.isMoonActive);

  const midday = computeCelestialState(13.5);
  assert.ok(midday.sunDir.y > 0.78 && !midday.isMoonActive);

  const golden = computeCelestialState(17.4);
  assert.ok(golden.sunDir.x < -0.5 && golden.sunDir.y > 0.25 && golden.sunDir.y < 0.55);
  assert.equal(golden.isMoonActive, false);

  // Night switches coherently to elevated moonlight
  const night = computeCelestialState(22.5);
  assert.equal(night.isMoonActive, true);
  assert.ok(night.moonDir.y > 0.2 && night.moonDir.y < 0.5 && night.keyLightEnvelope > 0.9);
  assert.deepEqual(night.activeLightDir, night.moonDir);
});

test('TimeAndWeatherSystem aligns sunDisc, moonDisc, directional light, and sky shader uniforms identically', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();

  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);
  const focusX = 96;
  const focusZ = 44;

  // Verify daytime presets (Morning, Afternoon, Golden Hour, Sunset)
  for (const preset of [
    TimePreset.Morning,
    TimePreset.Afternoon,
    TimePreset.GoldenHour,
    TimePreset.Sunset,
  ]) {
    weather.setTimePreset(preset);
    weather.update(0.016, focusX, focusZ, world, 0, 0);
    const dbg = weather.getLightingDebugState();

    const lightDir = dbg.sunLight.position
      .clone()
      .sub(dbg.sunLight.target.position)
      .normalize();
    const discDir = dbg.sunDisc.position
      .clone()
      .sub(new THREE.Vector3(focusX, 0, focusZ))
      .normalize();
    const shaderSunDir = (dbg.skyUniforms.uSunDir.value as THREE.Vector3).clone().normalize();

    assert.ok(
      lightDir.dot(discDir) > 0.9995,
      `${preset}: directional light must align with visible sun disc (dot=${lightDir.dot(discDir)})`,
    );
    assert.ok(
      lightDir.dot(shaderSunDir) > 0.9995,
      `${preset}: directional light must align with sky shader uSunDir`,
    );
    assert.equal(dbg.sunDisc.visible, true, `${preset}: sun disc should be visible in clear weather`);
    assert.equal(weather.isMoonActive, false);
  }

  // Verify Night preset aligns moonlight with moonDisc and uMoonDir while restraining ambient fill
  weather.setTimePreset(TimePreset.Night);
  weather.update(0.016, focusX, focusZ, world, 0, 0);
  const nightDbg = weather.getLightingDebugState();
  const moonLightDir = nightDbg.sunLight.position
    .clone()
    .sub(nightDbg.sunLight.target.position)
    .normalize();
  const moonDiscDir = nightDbg.moonDisc.position
    .clone()
    .sub(new THREE.Vector3(focusX, 0, focusZ))
    .normalize();
  const shaderMoonDir = (nightDbg.skyUniforms.uMoonDir.value as THREE.Vector3).clone().normalize();

  assert.equal(weather.isMoonActive, true);
  assert.equal(nightDbg.moonDisc.visible, true, 'moon disc should be visible on clear nights');
  assert.equal(nightDbg.sunDisc.visible, false, 'sun disc should be hidden below horizon at night');
  assert.ok(moonLightDir.dot(moonDiscDir) > 0.9995, 'moonlight must align with visible moon disc');
  assert.ok(moonLightDir.dot(shaderMoonDir) > 0.9995, 'moonlight must align with sky uMoonDir');
  assert.ok(nightDbg.sunLight.intensity > 0.25 && nightDbg.sunLight.intensity < 0.65);
  assert.ok(nightDbg.hemiLight.intensity < 0.45, 'night ambient should remain restrained');
  assert.ok(scene.environmentIntensity < 0.15, 'night environment IBL should dim so night feels dark');

  weather.setTimePreset(TimePreset.Afternoon);
  weather.update(0.016, focusX, focusZ, world, 0, 0);
  assert.ok(scene.environmentIntensity > 0.45, 'midday environment IBL should stay bright');

  weather.dispose();
  world.dispose();
});

test('shadow quality tiers and texel-snapped placement preserve direction and suppress sub-texel shimmer', () => {
  const lowCfg = getShadowConfigForQuality(GraphicsQuality.Low, false);
  const swCfg = getShadowConfigForQuality(GraphicsQuality.High, true);
  const medCfg = getShadowConfigForQuality(GraphicsQuality.Medium, false);
  const highCfg = getShadowConfigForQuality(GraphicsQuality.High, false);

  assert.equal(lowCfg.enabled, false);
  assert.equal(swCfg.enabled, false, 'software WebGL must keep shadow maps disabled');
  assert.equal(medCfg.enabled, true);
  assert.equal(medCfg.mapSize, 1024);
  assert.equal(highCfg.enabled, true);
  assert.equal(highCfg.mapSize, 2048);
  assert.ok(highCfg.frustumHalfSize < 100 && medCfg.frustumHalfSize < 100, 'shadow frustum should stay focused');

  const dir = computeCelestialState(17.4).activeLightDir;
  const p1 = computeStabilizedShadowPlacement({
    focusX: 96.0,
    focusZ: 44.0,
    lightDir: dir,
    frustumHalfSize: highCfg.frustumHalfSize,
    mapSize: highCfg.mapSize,
    lightDistance: highCfg.lightDistance,
  });
  // Verify light direction (light - target).normalize() matches input lightDir exactly
  const dx = p1.lightX - p1.targetX;
  const dy = p1.lightY - p1.targetY;
  const dz = p1.lightZ - p1.targetZ;
  const len = Math.hypot(dx, dy, dz);
  const dot = (dx / len) * dir.x + (dy / len) * dir.y + (dz / len) * dir.z;
  assert.ok(dot > 0.99999, `stabilized shadow light direction must match activeLightDir (dot=${dot})`);

  // Tiny sub-texel nudge around a snapped texel center must produce zero lateral shift
  const centerX = p1.targetX;
  const centerZ = p1.targetZ;
  const pCenter = computeStabilizedShadowPlacement({
    focusX: centerX,
    focusZ: centerZ,
    lightDir: dir,
    frustumHalfSize: highCfg.frustumHalfSize,
    mapSize: highCfg.mapSize,
    lightDistance: highCfg.lightDistance,
  });
  const pNudge = computeStabilizedShadowPlacement({
    focusX: centerX + p1.texelSize * 0.15,
    focusZ: centerZ + p1.texelSize * 0.1,
    lightDir: dir,
    frustumHalfSize: highCfg.frustumHalfSize,
    mapSize: highCfg.mapSize,
    lightDistance: highCfg.lightDistance,
  });

  const dtx = pNudge.targetX - pCenter.targetX;
  const dty = pNudge.targetY - pCenter.targetY;
  const dtz = pNudge.targetZ - pCenter.targetZ;
  const alongLight = dtx * dir.x + dty * dir.y + dtz * dir.z;
  const perpSq =
    (dtx - alongLight * dir.x) ** 2 +
    (dty - alongLight * dir.y) ** 2 +
    (dtz - alongLight * dir.z) ** 2;
  assert.ok(perpSq < 1e-10, `sub-texel movement should not shift lateral shadow texels (perpSq=${perpSq})`);

  // Arbitrary movement must quantize strictly to integer texel increments in light-space right/up
  const pMove = computeStabilizedShadowPlacement({
    focusX: 109.37,
    focusZ: 18.82,
    lightDir: dir,
    frustumHalfSize: highCfg.frustumHalfSize,
    mapSize: highCfg.mapSize,
    lightDistance: highCfg.lightDistance,
  });
  const mx = pMove.targetX - p1.targetX;
  const my = pMove.targetY - p1.targetY;
  const mz = pMove.targetZ - p1.targetZ;
  const mAlong = mx * dir.x + my * dir.y + mz * dir.z;
  const perpDist = Math.hypot(
    mx - mAlong * dir.x,
    my - mAlong * dir.y,
    mz - mAlong * dir.z,
  );
  // Any 2D integer-grid step (a*t, b*t) has (perpDist / t)^2 equal to an exact integer a^2 + b^2
  const gridSq = (perpDist / p1.texelSize) ** 2;
  assert.ok(
    Math.abs(gridSq - Math.round(gridSq)) < 1e-6,
    `arbitrary shadow motion must stay locked to integer texel lattice (gridSq=${gridSq})`,
  );
});

test('procedural cloud weather profiles transition smoothly across Clear, Cloudy, and Rain with monotonic drift', () => {
  const clearP = getWeatherCloudProfile(WeatherType.Clear);
  const cloudyP = getWeatherCloudProfile(WeatherType.Cloudy);
  const rainP = getWeatherCloudProfile(WeatherType.Rain);

  assert.ok(clearP.coverage > 0.2 && clearP.coverage < 0.45, 'Clear should have scattered clouds');
  assert.ok(cloudyP.coverage > clearP.coverage + 0.25, 'Cloudy must increase coverage noticeably');
  assert.ok(rainP.coverage > cloudyP.coverage + 0.15, 'Rain must have dense storm coverage');
  assert.ok(rainP.stormDarkness > cloudyP.stormDarkness + 0.35, 'Rain must be distinctly darker than Cloudy');

  let state = createInitialCloudState(WeatherType.Clear);
  const windLen = Math.hypot(state.windDirX, state.windDirZ);
  assert.ok(Math.abs(windLen - 1) < 1e-6, 'wind direction must be normalized');

  // Transition smoothly Clear -> Cloudy
  for (let i = 0; i < 120; i++) {
    const prev = state;
    state = stepCloudAtmosphereState(state, WeatherType.Cloudy, 0.05);
    assert.ok(state.coverage >= prev.coverage - 1e-6, 'coverage should rise smoothly to Cloudy');
    assert.ok(state.cloudTime > prev.cloudTime, 'cloudTime must advance monotonically');
    assert.ok(state.coverage - prev.coverage < 0.05, 'no abrupt cloud coverage jump');
  }
  assert.ok(Math.abs(state.coverage - cloudyP.coverage) < 0.03);

  // Transition smoothly Cloudy -> Rain
  for (let i = 0; i < 120; i++) {
    const prev = state;
    state = stepCloudAtmosphereState(state, WeatherType.Rain, 0.05);
    assert.ok(state.stormDarkness >= prev.stormDarkness - 1e-6);
    assert.ok(state.cloudTime > prev.cloudTime, 'cloudTime must never rewind when wind speeds up');
  }
  assert.ok(state.stormDarkness > 0.8 && state.coverage > 0.88);

  // Transition smoothly Rain -> Clear
  for (let i = 0; i < 140; i++) {
    const prev = state;
    state = stepCloudAtmosphereState(state, WeatherType.Clear, 0.05);
    assert.ok(state.coverage <= prev.coverage + 1e-6);
    assert.ok(state.cloudTime > prev.cloudTime, 'cloudTime must never rewind when wind slows down');
  }
  assert.ok(Math.abs(state.coverage - clearP.coverage) < 0.03);
});

test('cloud quality tiers, time-of-day cloud lighting, and subtle cloud shadow modulation stay well-bounded', () => {
  const lowQ = getCloudQualityConfig(GraphicsQuality.Low, false);
  const medQ = getCloudQualityConfig(GraphicsQuality.Medium, false);
  const swQ = getCloudQualityConfig(GraphicsQuality.High, true);
  const highQ = getCloudQualityConfig(GraphicsQuality.High, false);

  assert.equal(lowQ.detailLevel, 0);
  assert.equal(lowQ.enableDomainWarp, false);
  assert.equal(lowQ.enableCirrusLayer, false);
  assert.equal(medQ.detailLevel, 1);
  assert.equal(swQ.detailLevel, 1, 'SoftwareGL should use balanced detailLevel 1 fallback');
  assert.equal(highQ.detailLevel, 2);

  const middaySun = computeCelestialState(13.5).sunDir.y;
  const goldenSun = computeCelestialState(17.4).sunDir.y;
  const nightSun = computeCelestialState(22.5).sunDir.y;

  const middayLight = computeCloudLightingParams(0.0, middaySun, 0.0);
  const goldenLight = computeCloudLightingParams(0.18, goldenSun, 0.0);
  const nightLight = computeCloudLightingParams(1.0, nightSun, 0.0);
  const stormLight = computeCloudLightingParams(0.0, middaySun, 0.88);

  assert.ok(middayLight.sunlitStrength > 0.85, 'Midday clouds should be brightly sunlit');
  assert.ok(goldenLight.warmRimStrength > middayLight.warmRimStrength, 'Golden hour clouds should have stronger warm rim');
  assert.ok(nightLight.sunlitStrength < 0.1 && nightLight.moonlitStrength > 0.8, 'Night clouds should be moonlit, not daytime bright');
  assert.ok(stormLight.undersideDarkness > middayLight.undersideDarkness + 0.4, 'Storm clouds should have much darker undersides');

  const clearState = createInitialCloudState(WeatherType.Clear);
  const cloudyState = createInitialCloudState(WeatherType.Cloudy);
  const modClear = computeSubtleCloudShadowFactor(96, 44, clearState);
  const modCloudy = computeSubtleCloudShadowFactor(96, 44, cloudyState);
  assert.ok(modClear >= 0.88 && modClear <= 1.0);
  assert.ok(modCloudy >= 0.88 && modCloudy <= 1.0);
});

test('TimeAndWeatherSystem synchronizes procedural cloud uniforms, quality tiers, and weather states seamlessly', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();

  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);

  weather.setShadowQuality(false, 512, GraphicsQuality.Low);
  assert.equal(weather.getLightingDebugState().skyUniforms.uCloudQuality.value, 0);
  weather.setShadowQuality(true, 1024, GraphicsQuality.Medium);
  assert.equal(weather.getLightingDebugState().skyUniforms.uCloudQuality.value, 1);
  weather.setShadowQuality(true, 2048, GraphicsQuality.High);
  assert.equal(weather.getLightingDebugState().skyUniforms.uCloudQuality.value, 2);

  // Clear midday baseline
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 96, 44, world, 0, 0);
  const t0 = weather.getLightingDebugState().skyUniforms.uCloudTime.value as number;
  const clearSunInt = weather.getLightingDebugState().sunLight.intensity;

  // Cloudy reduces direct sunlight and increases cloud coverage smoothly
  weather.setWeather(WeatherType.Cloudy, false);
  for (let i = 0; i < 80; i++) {
    weather.update(0.05, 96, 44, world, 0, 0);
  }
  const cloudyDbg = weather.getLightingDebugState();
  assert.ok((cloudyDbg.skyUniforms.uCloudTime.value as number) > t0, 'clouds should drift forward in time');
  assert.ok((cloudyDbg.skyUniforms.uCloudCoverage.value as number) > 0.6);
  assert.ok(cloudyDbg.sunLight.intensity < clearSunInt * 0.85, 'Cloudy weather should soften direct sunlight');

  // Rainy night produces dense dark storm clouds, wet roads, and hides moon smoothly behind overcast
  weather.setTimePreset(TimePreset.Night);
  weather.setWeather(WeatherType.Rain, false);
  for (let i = 0; i < 90; i++) {
    weather.update(0.05, 96, 44, world, 0, 0);
  }
  const rainNightDbg = weather.getLightingDebugState();
  assert.ok((rainNightDbg.skyUniforms.uStormDarkness.value as number) > 0.78);
  assert.ok((rainNightDbg.skyUniforms.uCloudCoverage.value as number) > 0.85);
  assert.ok(weather.roadWetness > 0.85, 'Phase 1A wet-road sync must remain active in rainy night');
  assert.equal(rainNightDbg.moonDisc.visible, false, 'dense storm clouds should veil the moon');

  weather.dispose();
  world.dispose();
});

test('getPostProcessingConfigForQuality configures Low direct fallback, Medium half-res bloom, High selective HDR bloom, and software GL scaling', () => {
  const lowHw = getPostProcessingConfigForQuality(GraphicsQuality.Low, false);
  const lowSw = getPostProcessingConfigForQuality(GraphicsQuality.Low, true);
  const medHw = getPostProcessingConfigForQuality(GraphicsQuality.Medium, false);
  const medSw = getPostProcessingConfigForQuality(GraphicsQuality.Medium, true);
  const highHw = getPostProcessingConfigForQuality(GraphicsQuality.High, false);
  const highSw = getPostProcessingConfigForQuality(GraphicsQuality.High, true);

  assert.equal(lowHw.enabled, false, 'Low quality must disable EffectComposer');
  assert.equal(lowHw.bloomEnabled, false);
  assert.equal(lowSw.enabled, false);

  assert.equal(medHw.enabled, true);
  assert.equal(medHw.bloomEnabled, true);
  assert.equal(medHw.bloomResolutionScale, 0.5);
  assert.equal(medSw.bloomEnabled, false, 'software GL must avoid expensive multi-pass UnrealBloomPass');
  assert.equal(medSw.gradeEnabled, true, 'software GL keeps single-pass grading & lightweight HDR halo');

  assert.equal(highHw.enabled, true);
  assert.equal(highHw.bloomEnabled, true);
  assert.equal(highHw.bloomResolutionScale, 0.75);
  assert.ok(highHw.bloomStrengthMultiplier > medHw.bloomStrengthMultiplier);
  assert.equal(highSw.bloomEnabled, false, 'software GL must avoid expensive multi-pass UnrealBloomPass');
  assert.equal(highSw.gradeEnabled, true);
});

test('computeCinematicPostState enforces selective HDR bloom threshold (>1.05) and adapts colour grading across Morning, Midday, Golden Hour, Sunset, Night, Rainy Night, and Police Pursuit', () => {
  const highCfg = getPostProcessingConfigForQuality(GraphicsQuality.High, false);
  const lowCfg = getPostProcessingConfigForQuality(GraphicsQuality.Low, false);

  const morning = computeCinematicPostState(
    { timeHours: 9.5, nightFactor: 0.0, rainAmount: 0, cloudAmount: 0.1, stormDarkness: 0, wantedStars: 0 },
    highCfg,
  );
  const midday = computeCinematicPostState(
    { timeHours: 13.5, nightFactor: 0.0, rainAmount: 0, cloudAmount: 0.1, stormDarkness: 0, wantedStars: 0 },
    highCfg,
  );
  const goldenHour = computeCinematicPostState(
    { timeHours: 17.4, nightFactor: 0.18, rainAmount: 0, cloudAmount: 0.15, stormDarkness: 0, wantedStars: 0 },
    highCfg,
  );
  const sunset = computeCinematicPostState(
    { timeHours: 19.3, nightFactor: 0.76, rainAmount: 0, cloudAmount: 0.2, stormDarkness: 0, wantedStars: 0 },
    highCfg,
  );
  const night = computeCinematicPostState(
    { timeHours: 22.5, nightFactor: 1.0, rainAmount: 0, cloudAmount: 0.1, stormDarkness: 0, wantedStars: 0 },
    highCfg,
  );
  const rainyNight = computeCinematicPostState(
    { timeHours: 22.5, nightFactor: 1.0, rainAmount: 1.0, cloudAmount: 1.0, stormDarkness: 0.88, wantedStars: 0 },
    highCfg,
  );
  const policeNight = computeCinematicPostState(
    { timeHours: 22.5, nightFactor: 1.0, rainAmount: 0, cloudAmount: 0.1, stormDarkness: 0, wantedStars: 3 },
    highCfg,
  );
  const lowNight = computeCinematicPostState(
    { timeHours: 22.5, nightFactor: 1.0, rainAmount: 0, cloudAmount: 0.1, stormDarkness: 0, wantedStars: 0 },
    lowCfg,
  );

  // All presets must keep bloomThreshold >= 1.05 so ordinary sunlit diffuse surfaces (<= 1.0) never bloom
  for (const s of [morning, midday, goldenHour, sunset, night, rainyNight, policeNight]) {
    assert.ok(s.bloomThreshold >= 1.05, `bloomThreshold must exceed 1.05, got ${s.bloomThreshold}`);
    assert.ok(s.bloomStrength >= 0 && s.bloomStrength <= 0.78, 'bloomStrength must remain restrained');
    assert.ok(s.vignetteStrength >= 0.1 && s.vignetteStrength <= 0.25, 'vignette must stay subtle');
    assert.ok(s.grainStrength >= 0.005 && s.grainStrength <= 0.018, 'film grain must stay fine');
  }

  // Daytime bloom is strictly restrained compared to Golden Hour, Night, and Rainy Night
  assert.ok(midday.bloomStrength < 0.22, 'midday bloom strength must be minimal');
  assert.ok(midday.bloomThreshold > 1.2, 'midday bloom threshold must stay high');
  assert.ok(goldenHour.bloomStrength > midday.bloomStrength, 'Golden Hour adds warm subtle bloom');
  assert.ok(night.bloomStrength > goldenHour.bloomStrength + 0.15, 'Night elevates neon/headlight bloom');
  assert.ok(rainyNight.bloomStrength > night.bloomStrength, 'Rainy Night enhances wet-atmosphere neon bloom');
  assert.ok(policeNight.bloomStrength > night.bloomStrength, 'Police pursuit slightly boosts lightbar bloom');
  assert.equal(lowNight.bloomStrength, 0, 'Low quality disables bloom strength');

  // Golden Hour & Sunset colour grading: warm highlights + cool balanced shadows
  assert.ok(goldenHour.warmth > midday.warmth + 0.08, 'Golden Hour shifts warmth positive');
  assert.ok(goldenHour.highlightTint.r > goldenHour.highlightTint.b, 'Golden Hour warms highlights');
  assert.ok(goldenHour.shadowTint.b > goldenHour.shadowTint.r, 'Golden Hour keeps cool coastal shadow balance');
  assert.ok(sunset.warmth > midday.warmth + 0.08, 'Sunset keeps warm horizon grading');

  // Night & Rainy Night colour grading: deeper blue shadows + readable shadow lift (no crushed blacks)
  assert.ok(night.warmth < 0, 'Night shifts temperature cool');
  assert.ok(night.shadowTint.b > night.shadowTint.r + 0.1, 'Night deepens blue shadows');
  assert.ok(night.shadowLift > midday.shadowLift, 'Night lifts deep darks for readability');
  assert.ok(rainyNight.shadowLift > night.shadowLift, 'Rainy Night preserves uncrushed darks under storm cover');
});

test('selective HDR emissive calibration keeps daytime windows below bloom threshold while night emitters exceed threshold', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();

  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);
  const highCfg = getPostProcessingConfigForQuality(GraphicsQuality.High, false);

  // Midday: building windows and streetlights remain below bloom threshold so buildings do not glow
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 96, 44, world, 0, 0);
  const middayPost = computeCinematicPostState(
    {
      timeHours: weather.timeHours,
      nightFactor: weather.nightFactor,
      rainAmount: weather.rainAmount,
      cloudAmount: weather.cloudAmount,
      stormDarkness: weather.getStormDarkness(),
      wantedStars: 0,
    },
    highCfg,
  );
  const unmappedLobbyMat = world.emissiveBuildingMaterials.find((m) => !m.emissiveMap)!;
  const mappedWindowMat = world.emissiveBuildingMaterials.find((m) => Boolean(m.emissiveMap))!;
  assert.ok(unmappedLobbyMat, 'should have unmapped lobby glass podium material');
  assert.ok(mappedWindowMat, 'should have mapped window emissive material');

  assert.ok(
    mappedWindowMat.emissiveIntensity < 0.25,
    'Daytime building windows must stay well below HDR bloom threshold',
  );
  assert.ok(
    world.streetlightBulbMaterial.emissiveIntensity < middayPost.bloomThreshold,
    'Daytime streetlights must not bloom',
  );

  // Night: mapped illuminated windows, neon signs, and streetlights all exceed bloomThreshold (> 1.08),
  // while unmapped lobby podium walls stay restrained (< 0.25) so solid walls never wash out
  weather.setTimePreset(TimePreset.Night);
  weather.update(0.05, 96, 44, world, 0, 0);
  const nightPost = computeCinematicPostState(
    {
      timeHours: weather.timeHours,
      nightFactor: weather.nightFactor,
      rainAmount: weather.rainAmount,
      cloudAmount: weather.cloudAmount,
      stormDarkness: weather.getStormDarkness(),
      wantedStars: 0,
    },
    highCfg,
  );
  assert.ok(
    unmappedLobbyMat.emissiveIntensity < 0.25,
    'Night unmapped podium glass must stay below HDR bloom threshold so solid ground floors do not glow',
  );
  assert.ok(
    mappedWindowMat.emissiveIntensity > nightPost.bloomThreshold,
    'Night mapped building windows must exceed HDR bloom threshold',
  );
  assert.ok(
    world.neonTrimMaterials[0].emissiveIntensity > nightPost.bloomThreshold + 1.2,
    'Night neon signs must strongly exceed HDR bloom threshold',
  );
  assert.ok(
    world.streetlightBulbMaterial.emissiveIntensity > nightPost.bloomThreshold + 1.5,
    'Night streetlights must strongly exceed HDR bloom threshold',
  );

  weather.dispose();
  world.dispose();
});

test('dynamic environment reflection config, caching, interval throttling, and instant preset jump detection', () => {
  const lowCfg = getEnvironmentQualityConfig(GraphicsQuality.Low, false);
  const medCfg = getEnvironmentQualityConfig(GraphicsQuality.Medium, false);
  const highCfg = getEnvironmentQualityConfig(GraphicsQuality.High, false);
  const swCfg = getEnvironmentQualityConfig(GraphicsQuality.High, true);

  assert.ok(lowCfg.minIntervalSec > medCfg.minIntervalSec && medCfg.minIntervalSec > highCfg.minIntervalSec);
  assert.ok(highCfg.sigma < medCfg.sigma && medCfg.sigma < lowCfg.sigma);
  assert.ok(swCfg.minIntervalSec >= 5.0, 'Software GL should use conservative continuous refresh interval');

  const makeSnap = (overrides: Partial<EnvironmentAtmosphereSnapshot> = {}): EnvironmentAtmosphereSnapshot => ({
    timeHours: 17.4,
    sunDir: { x: -0.82, y: 0.43, z: -0.37 },
    moonDir: { x: 0.5, y: 0.29, z: -0.81 },
    skyTop: { r: 0.145, g: 0.31, b: 0.52 },
    skyMid: { r: 0.45, g: 0.56, b: 0.7 },
    skyHorizon: { r: 0.87, g: 0.7, b: 0.59 },
    sunColor: { r: 1.0, g: 0.74, b: 0.44 },
    moonColor: { r: 0.61, g: 0.75, b: 0.96 },
    hemiGround: { r: 0.33, g: 0.29, b: 0.28 },
    nightFactor: 0.18,
    cloudCoverage: 0.28,
    stormDarkness: 0.0,
    rainAmount: 0.0,
    ...overrides,
  });

  const base = makeSnap();
  // First update always refreshes
  const initDecision = shouldRefreshEnvironment(null, base, 0, highCfg, false);
  assert.equal(initDecision.refresh, true);
  assert.equal(initDecision.reason, 'initial');

  // Identical state after interval remains cached (no wasted PMREM regeneration)
  const cachedDecision = shouldRefreshEnvironment(base, makeSnap(), 10.0, highCfg, false);
  assert.equal(cachedDecision.refresh, false);
  assert.equal(cachedDecision.reason, 'cached');

  // Moderate drift before minIntervalSec is throttled
  const moderateDrift = makeSnap({ cloudCoverage: 0.35 });
  const throttled = shouldRefreshEnvironment(base, moderateDrift, 0.4, highCfg, false);
  assert.equal(throttled.refresh, false);
  assert.equal(throttled.reason, 'interval_throttled');

  // Same moderate drift after minIntervalSec refreshes
  const allowed = shouldRefreshEnvironment(base, moderateDrift, 2.0, highCfg, false);
  assert.equal(allowed.refresh, true);
  assert.equal(allowed.reason, 'threshold_exceeded');

  // Major preset switch (Golden Hour -> Night) refreshes immediately even at elapsedSec = 0.05
  const nightSnap = makeSnap({
    timeHours: 22.5,
    sunDir: { x: 0.15, y: -0.82, z: 0.55 },
    nightFactor: 1.0,
    skyTop: { r: 0.02, g: 0.04, b: 0.09 },
  });
  const delta = computeEnvironmentDelta(base, nightSnap);
  assert.equal(delta.isMajorTransition, true);
  const presetJump = shouldRefreshEnvironment(base, nightSnap, 0.05, lowCfg, false);
  assert.equal(presetJump.refresh, true);
  assert.equal(presetJump.reason, 'major_transition');

  // Environment intensity adapts smoothly across Midday, Golden Hour, Night, and Rainy Storm
  const middayInt = computeEnvironmentIntensity(0.0, 0.25, 0.0, GraphicsQuality.High);
  const stormDayInt = computeEnvironmentIntensity(0.0, 0.94, 0.88, GraphicsQuality.High);
  const nightInt = computeEnvironmentIntensity(1.0, 0.25, 0.0, GraphicsQuality.High);
  assert.ok(middayInt > 0.7 && middayInt < 1.0, `midday env intensity should stay balanced, got ${middayInt}`);
  assert.ok(stormDayInt < middayInt * 0.8, 'storm cover should attenuate env intensity');
  assert.ok(nightInt < 0.15 && nightInt > 0.08, `night env intensity must stay restrained (< 0.15), got ${nightInt}`);
});

test('vehicle models use physical clearcoat paint differentiated by class and tinted reflective automotive glass', () => {
  const dummyShadow = new THREE.Texture();
  const veloce = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const solstice = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow);
  const titan = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow);
  const vcpd = createVehicleMesh(VEHICLE_CATALOG.vcpd_interceptor, dummyShadow);

  const sportsProf = getVehiclePaintMaterialProfile(VehicleKind.Sports);
  const suvProf = getVehiclePaintMaterialProfile(VehicleKind.Suv);
  assert.ok(sportsProf.clearcoat > suvProf.clearcoat, 'Veloce GT sports paint should have higher clearcoat than SUV');
  assert.ok(sportsProf.clearcoatRoughness < suvProf.clearcoatRoughness, 'Veloce GT clearcoat should be glossier than SUV');

  for (const rig of [veloce, solstice, titan, vcpd]) {
    assert.ok(rig.paintMat instanceof THREE.MeshPhysicalMaterial, 'vehicle paint must be MeshPhysicalMaterial');
    assert.ok(rig.paintMat.clearcoat >= 0.75, 'vehicle paint must have clearcoat');
    assert.ok(rig.glassMat instanceof THREE.MeshPhysicalMaterial, 'vehicle glass must be MeshPhysicalMaterial');
    assert.ok(rig.glassMat.ior >= 1.48 && rig.glassMat.clearcoat >= 0.95, 'vehicle glass must have automotive IOR & clearcoat');
    assert.ok(rig.glassMat.roughness <= 0.08, 'vehicle glass must remain sleek and reflective');
    assert.equal(rig.glassMat.transparent, true, 'vehicle glass should use subtle tinted transparency over dark interior');
    rig.dispose();
  }
  dummyShadow.dispose();
});

test('BuiltCityWorld and TimeAndWeatherSystem synchronize glass/concrete PBR masks, puddle wetness uniform, and dynamic ocean lighting', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);

  // Verify skyscraper & hotel building materials use MeshPhysicalMaterial with dedicated glass masks
  const physicalBuildingMats = world.emissiveBuildingMaterials.filter(
    (m): m is THREE.MeshPhysicalMaterial => m instanceof THREE.MeshPhysicalMaterial,
  );
  assert.ok(
    physicalBuildingMats.length >= 10,
    'Downtown skyscrapers, hotels, and lobbies should use MeshPhysicalMaterial',
  );
  const skyscraperMat = physicalBuildingMats.find((m) => m.roughnessMap === mockTextures.skyscraperRoughness);
  const hotelMat = physicalBuildingMats.find((m) => m.roughnessMap === mockTextures.hotelRoughness);
  assert.ok(skyscraperMat, 'skyscrapers must bind skyscraperRoughness map for window vs concrete separation');
  assert.equal(skyscraperMat.metalnessMap, mockTextures.skyscraperMetalness);
  assert.equal(skyscraperMat.clearcoatMap, mockTextures.skyscraperGlassMask);
  assert.ok(hotelMat, 'Art Deco hotels must bind hotelRoughness & hotelGlassMask for window vs stucco separation');
  assert.equal(hotelMat.clearcoatMap, mockTextures.hotelGlassMask);

  // Verify ocean material uses MeshPhysicalMaterial and synchronizes with Sunset, Night, and Rain
  assert.ok(world.oceanMaterial instanceof THREE.MeshPhysicalMaterial);

  weather.setTimePreset(TimePreset.Sunset);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 96, 44, world, 0, 0);
  const sunsetEnv = weather.getEnvironmentSnapshot();
  assert.ok(
    world.oceanUniforms.uSunDir.value.distanceTo(weather.sunDirection) < 1e-5,
    'ocean uSunDir must match unified sunDirection',
  );
  assert.ok(
    Math.abs(sunsetEnv.sunDir.x - weather.sunDirection.x) < 1e-5 &&
      Math.abs(sunsetEnv.nightFactor - weather.nightFactor) < 1e-5,
    'environment snapshot must match TimeAndWeatherSystem single source of truth',
  );
  assert.equal(world.roadWetnessUniform.value, 0, 'puddle shader wetness uniform starts dry in Clear weather');

  // Switch to Rainy Night and step until wet + stormy
  weather.setTimePreset(TimePreset.Night);
  weather.setWeather(WeatherType.Rain, false);
  for (let i = 0; i < 90; i++) {
    weather.update(0.05, 96, 44, world, 0, 0);
  }
  const rainNightEnv = weather.getEnvironmentSnapshot();
  assert.ok(world.roadWetnessUniform.value > 0.85, 'puddle shader wetness uniform must sync during Rain');
  assert.ok(world.oceanUniforms.uNightFactor.value > 0.9, 'ocean must reflect Night state');
  assert.ok(world.oceanUniforms.uStormDarkness.value > 0.78, 'ocean must respond to stormy rain darkness');
  assert.ok(rainNightEnv.rainAmount > 0.85 && rainNightEnv.stormDarkness > 0.78);

  weather.dispose();
  world.dispose();
});

test('Phase 1F: repeated time-of-day and weather transitions keep all 5 rendering phases synchronized without drift or flashes', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);
  const highPostCfg = getPostProcessingConfigForQuality(GraphicsQuality.High, false);

  const times = [
    TimePreset.Morning,
    TimePreset.Afternoon,
    TimePreset.GoldenHour,
    TimePreset.Sunset,
    TimePreset.Night,
    TimePreset.Afternoon,
    TimePreset.Night,
  ];
  const weathers = [WeatherType.Clear, WeatherType.Cloudy, WeatherType.Rain, WeatherType.Clear];

  let prevCloudTime = -1;

  for (const tp of times) {
    for (const wt of weathers) {
      weather.setTimePreset(tp);
      weather.setWeather(wt, false);
      for (let step = 0; step < 30; step++) {
        weather.update(0.05, 48, 24, world, 0.4, 14);
      }

      const dbg = weather.getLightingDebugState();
      const env = weather.getEnvironmentSnapshot();
      const fog = scene.fog as THREE.FogExp2;

      // 1. Unified sun/moon direction across sky dome, ocean shader, and PMREM snapshot
      const skySun = dbg.skyUniforms.uSunDir.value as THREE.Vector3;
      const skyMoon = dbg.skyUniforms.uMoonDir.value as THREE.Vector3;
      assert.ok(skySun.distanceTo(weather.sunDirection) < 1e-5);
      assert.ok(skyMoon.distanceTo(weather.moonDirection) < 1e-5);
      assert.ok(world.oceanUniforms.uSunDir.value.distanceTo(weather.sunDirection) < 1e-5);
      assert.ok(world.oceanUniforms.uMoonDir.value.distanceTo(weather.moonDirection) < 1e-5);
      assert.ok(Math.hypot(env.sunDir.x, env.sunDir.y, env.sunDir.z) > 0.999);

      // 2. Fog & sky horizon colour synchronization across scene.fog, sky dome, ocean, and PMREM
      const skyBottom = dbg.skyUniforms.uBottomColor.value as THREE.Color;
      assert.ok(Math.abs(fog.color.r - skyBottom.r) < 1e-5);
      assert.ok(Math.abs(fog.color.g - skyBottom.g) < 1e-5);
      assert.ok(Math.abs(fog.color.b - skyBottom.b) < 1e-5);
      assert.ok(Math.abs(world.oceanUniforms.uSkyHorizon.value.r - fog.color.r) < 1e-5);
      assert.ok(Math.abs(env.skyHorizon.r - fog.color.r) < 1e-5);

      // 3. Monotonic cloud time across repeated weather & time switches (never rewinds)
      assert.ok(dbg.cloudState.cloudTime > prevCloudTime, 'cloudTime must advance monotonically');
      prevCloudTime = dbg.cloudState.cloudTime;

      // 4. Synchronized wet road roughness across NS, EW, and intersections
      const [ns, ew, inter] = world.roadMaterials;
      assert.ok(Math.abs(ns.roughness - ew.roughness) < 1e-6);
      assert.ok(Math.abs(ns.roughness - inter.roughness) < 1e-6);

      // 5. Controlled selective HDR bloom & bounded exposure
      const post = computeCinematicPostState(
        {
          timeHours: weather.timeHours,
          nightFactor: weather.nightFactor,
          rainAmount: weather.rainAmount,
          cloudAmount: weather.cloudAmount,
          stormDarkness: weather.getStormDarkness(),
          wantedStars: 0,
        },
        highPostCfg,
      );
      assert.ok(post.bloomThreshold >= 1.05 && post.bloomThreshold <= 1.45);
      assert.ok(post.exposure >= 0.98 && post.exposure <= 1.24);
    }
  }

  // Verify wet roads dry completely back to dry baseline after Clear weather persists
  weather.setWeather(WeatherType.Clear, false);
  for (let i = 0; i < 360; i++) {
    weather.update(0.05, 48, 24, world, 0, 0);
  }
  assert.equal(weather.roadWetness, 0, 'roads must dry cleanly to 0 in Clear weather');
  assert.equal(world.roadWetnessUniform.value, 0, 'puddle shader wetness uniform must return to 0');
  assert.ok(Math.abs(world.roadMaterials[0].roughness - 0.78) < 1e-5);

  weather.dispose();
  world.dispose();
});

test('Phase 1F: graphics-quality tiers and shadow/resource disposal clean up GPU targets cleanly', () => {
  const light = new THREE.DirectionalLight(0xffffff, 2.0);
  const highShadow = getShadowConfigForQuality(GraphicsQuality.High, false);
  const medShadow = getShadowConfigForQuality(GraphicsQuality.Medium, false);
  const lowShadow = getShadowConfigForQuality(GraphicsQuality.Low, false);
  const swShadow = getShadowConfigForQuality(GraphicsQuality.High, true);

  assert.equal(highShadow.enabled, true);
  assert.equal(highShadow.mapSize, 2048);
  assert.equal(medShadow.enabled, true);
  assert.equal(medShadow.mapSize, 1024);
  assert.equal(lowShadow.enabled, false);
  assert.equal(swShadow.enabled, false);

  // Verify shadow map disposal when downgrading High -> Low
  applyShadowConfigToLight(light, highShadow);
  let shadowMapDisposed = false;
  (light.shadow as unknown as { map: { dispose: () => void } | null }).map = {
    dispose: () => {
      shadowMapDisposed = true;
    },
  };
  applyShadowConfigToLight(light, lowShadow);
  assert.equal(shadowMapDisposed, true, 'downgrading to Low quality must dispose GPU shadow map');
  assert.equal(light.shadow.map, null);
  assert.equal(light.castShadow, false);

  // Verify TimeAndWeatherSystem.dispose() also disposes any allocated shadow map
  const scene = new THREE.Scene();
  const weather = new TimeAndWeatherSystem(scene, false);
  const dbg = weather.getLightingDebugState();
  let weatherShadowDisposed = false;
  (dbg.sunLight.shadow as unknown as { map: { dispose: () => void } | null }).map = {
    dispose: () => {
      weatherShadowDisposed = true;
    },
  };
  weather.dispose();
  assert.equal(weatherShadowDisposed, true, 'TimeAndWeatherSystem.dispose must free shadow map');

  // Verify WorldEffectsAndMarkers and shared vehicle resources dispose cleanly without throwing
  const markers = new WorldEffectsAndMarkers();
  markers.spawnBurst(0, 1, 0, 8, 0xfbbf24, 5);
  markers.update(0.05);
  markers.dispose();
  disposeSharedVehicleResources();
});

test('Phase 2A: Veloce GT parametric body profile has exotic coupe proportions, coke-bottle waist, arched wheel wells, and open cockpit aperture', () => {
  const nose = evaluateVeloceBodySection(-2.22);
  const frontAxle = evaluateVeloceBodySection(VELOCE_GT_DIMS.frontAxleZ);
  const waist = evaluateVeloceBodySection(0.02);
  const rearAxle = evaluateVeloceBodySection(VELOCE_GT_DIMS.rearAxleZ);
  const tail = evaluateVeloceBodySection(2.22);

  // Exotic sports car planform: tapered nose, muscular front fenders, pinched waist, widest rear haunches
  assert.ok(frontAxle.halfWidthMid > nose.halfWidthMid + 0.15, 'front fenders should flare beyond nose');
  assert.ok(waist.halfWidthMid < frontAxle.halfWidthMid, 'coke-bottle waist should tuck inward between axles');
  assert.ok(rearAxle.halfWidthMid > waist.halfWidthMid + 0.08, 'rear haunches should flare wide behind waist');
  assert.ok(rearAxle.halfWidthMid >= frontAxle.halfWidthMid, 'rear haunches should be at least as wide as front fenders');
  assert.ok(tail.halfWidthMid < rearAxle.halfWidthMid, 'rear fascia should taper cleanly from haunches');

  // Genuine circular wheel-arch cutouts provide clearance above wheelRadius (0.34m) for steering & suspension
  assert.equal(frontAxle.inFrontArch, true);
  assert.equal(rearAxle.inRearArch, true);
  assert.ok(
    frontAxle.sillY > VELOCE_GT_DIMS.wheelRadius + 0.32,
    `front wheel arch crown must clear wheel top, got ${frontAxle.sillY}`,
  );
  assert.ok(
    rearAxle.sillY > VELOCE_GT_DIMS.wheelRadius + 0.35,
    `rear wheel arch crown must clear wheel top, got ${rearAxle.sillY}`,
  );
  assert.ok(waist.sillY < 0.22, 'low aerodynamic rocker sill between wheel arches');

  // Open cockpit tub between windshield cowl and rear bulkhead, closed across bonnet and rear deck
  assert.equal(frontAxle.cabinOpenHalfWidth, 0, 'bonnet over front axle must stay closed');
  assert.ok(waist.cabinOpenHalfWidth > 0.5, 'cabin aperture must open so interior is visible through glass');
  assert.equal(rearAxle.cabinOpenHalfWidth, 0, 'rear engine deck over rear axle must stay closed');
});

test('Phase 2A: Veloce GT custom sculpted geometries have finite vertices, valid outward normals, and staggered rounded Lathe wheels', () => {
  const body = buildVeloceBodyShellGeometry();
  const roof = buildVeloceRoofGeometry();
  const windshield = buildVeloceWindshieldGeometry();
  const rearGlass = buildVeloceRearGlassGeometry();
  const sideL = buildVeloceSideWindowGeometry(-1);
  const sideR = buildVeloceSideWindowGeometry(1);
  const frontWheel = buildVeloceWheelParts(VELOCE_GT_DIMS.frontWheelWidth);
  const rearWheel = buildVeloceWheelParts(VELOCE_GT_DIMS.rearWheelWidth);

  const checkFiniteAndUnitNormals = (geo: THREE.BufferGeometry, name: string) => {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 20, `${name} should have dense sculpted vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} should have vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)));
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(len > 0.8 && len < 1.2, `${name} normal ${i} must be unit length, got ${len}`);
    }
  };

  checkFiniteAndUnitNormals(body, 'bodyShell');
  checkFiniteAndUnitNormals(roof, 'roof');
  checkFiniteAndUnitNormals(windshield, 'windshield');
  checkFiniteAndUnitNormals(rearGlass, 'rearGlass');
  checkFiniteAndUnitNormals(sideL, 'sideWindowL');
  checkFiniteAndUnitNormals(sideR, 'sideWindowR');
  checkFiniteAndUnitNormals(frontWheel.tireGeo, 'frontTire');
  checkFiniteAndUnitNormals(rearWheel.tireGeo, 'rearTire');

  // Verify outward normal orientation on roof (+Y), windshield (+Y,-Z), rearGlass (+Y,+Z), side windows (-X / +X)
  const avgNormal = (geo: THREE.BufferGeometry) => {
    const n = geo.getAttribute('normal');
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < n.count; i++) {
      x += n.getX(i); y += n.getY(i); z += n.getZ(i);
    }
    return { x: x / n.count, y: y / n.count, z: z / n.count };
  };
  const nRoof = avgNormal(roof);
  const nWind = avgNormal(windshield);
  const nRear = avgNormal(rearGlass);
  const nSideL = avgNormal(sideL);
  const nSideR = avgNormal(sideR);
  assert.ok(nRoof.y > 0.85, `roof normals must point upward (+Y), got ${nRoof.y}`);
  assert.ok(nWind.y > 0.5 && nWind.z < -0.35, `windshield normals must point up-forward, got (${nWind.y}, ${nWind.z})`);
  assert.ok(nRear.y > 0.7 && nRear.z > 0.15, `rear glass normals must point up-rearward, got (${nRear.y}, ${nRear.z})`);
  assert.ok(nSideL.x < -0.6, `left side window normals must point outward (-X), got ${nSideL.x}`);
  assert.ok(nSideR.x > 0.6, `right side window normals must point outward (+X), got ${nSideR.x}`);

  // Verify staggered tire widths (rear wider than front) and grounded diameter (~0.68m)
  frontWheel.tireGeo.computeBoundingBox();
  rearWheel.tireGeo.computeBoundingBox();
  const fSize = new THREE.Vector3();
  const rSize = new THREE.Vector3();
  frontWheel.tireGeo.boundingBox!.getSize(fSize);
  rearWheel.tireGeo.boundingBox!.getSize(rSize);
  assert.ok(Math.abs(fSize.y - VELOCE_GT_DIMS.wheelRadius * 2) < 0.02, 'front tire outer diameter matches wheelRadius');
  assert.ok(rSize.x > fSize.x + 0.03, 'rear tires should be wider than front tires (staggered sports fitment)');

  // Verify rear wing endplates sit symmetrically flush with wing blade tips
  const rearWing = buildVeloceRearWingGeometry();
  rearWing.endplates.computeBoundingBox();
  const epBox = rearWing.endplates.boundingBox!;
  assert.ok(
    Math.abs(epBox.min.x + epBox.max.x) < 1e-4,
    `rear wing endplates must be laterally symmetric, got [${epBox.min.x}, ${epBox.max.x}]`,
  );

  for (const g of [
    body, roof, windshield, rearGlass, sideL, sideR,
    rearWing.blade, rearWing.endplates, rearWing.pylons,
    frontWheel.tireGeo, frontWheel.rimAlloyGeo, frontWheel.hubDarkGeo, frontWheel.lugGeo, frontWheel.rotorGeo, frontWheel.caliperGeo,
    rearWheel.tireGeo, rearWheel.rimAlloyGeo, rearWheel.hubDarkGeo, rearWheel.lugGeo, rearWheel.rotorGeo, rearWheel.caliperGeo,
  ]) {
    g.dispose();
  }
});

test('Phase 2A: Veloce GT VehicleRig preserves physics/wheel pivots, transparent glass over interior LOD, distinct PBR materials, and clean disposal', () => {
  const dummyShadow = new THREE.Texture();
  const rig1 = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const rig2 = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow, 0x2563eb);

  // VehicleRig contract & steering/wheel pivot hierarchy
  assert.equal(rig1.wheels.length, 4);
  assert.ok(rig1.frontLeftPivot.children.includes(rig1.wheels[0]), 'frontLeftPivot must parent front-left spinning wheel');
  assert.ok(rig1.frontRightPivot.children.includes(rig1.wheels[1]), 'frontRightPivot must parent front-right spinning wheel');
  assert.ok(rig1.frontLeftPivot.children.length >= 2, 'frontLeftPivot should also mount stationary brake caliper');
  assert.ok(Math.abs(rig1.frontLeftPivot.position.y - VELOCE_GT_DIMS.wheelRadius) < 1e-5);
  assert.ok(rig1.frontLeftPivot.position.z < -1.0 && rig1.wheels[2].position.z > 1.0);

  // Glass must be genuinely transparent over the cockpit interior and use high-clearcoat PBR
  assert.equal(rig1.glassMat.transparent, true);
  assert.ok(rig1.glassMat.opacity >= 0.25 && rig1.glassMat.opacity <= 0.55, 'Veloce GT glass should reveal interior clearly');
  assert.equal(rig1.glassMat.depthWrite, false);

  // Verify 3-tier LOD exists inside bodyGroup with interior cockpit, wipers, panel seams & emblem at near distance
  const lod = rig1.bodyGroup.children.find((c): c is THREE.LOD => c instanceof THREE.LOD);
  assert.ok(lod, 'Veloce GT bodyGroup should include a distance-based THREE.LOD for micro-details');
  assert.ok(lod.levels.length >= 3, 'Veloce GT LOD must provide near, medium, and far detail tiers');
  assert.ok(
    lod.levels[0].object.children.length >= 12,
    'near LOD level must include interior cockpit, wipers, panel seams, and rear emblem',
  );
  assert.ok(
    lod.levels[1].object.children.length >= 3 &&
      lod.levels[1].object.children.length < lod.levels[0].object.children.length,
    'medium LOD level should reduce detail relative to near LOD',
  );

  // Verify full Veloce GT rig sits cleanly on ground (no wheel-well liners piercing y < 0)
  // and cockpit dashboard stays below windshield with display screens proud on dash face
  rig1.root.updateMatrixWorld(true);
  const rigBox = new THREE.Box3().setFromObject(rig1.root);
  const bodyBox = new THREE.Box3().setFromObject(rig1.bodyGroup);
  assert.ok(rigBox.min.y >= -0.002, `Veloce GT must not pierce ground plane y=0, got min.y=${rigBox.min.y}`);
  assert.ok(bodyBox.min.y >= 0.1, `Veloce GT body & liners must stay above ground clearance, got min.y=${bodyBox.min.y}`);

  const dashMesh = lod.levels[0].object.children[3] as THREE.Mesh;
  const clusterScreen = lod.levels[0].object.children[6] as THREE.Mesh;
  const centerScreen = lod.levels[0].object.children[7] as THREE.Mesh;
  dashMesh.geometry.computeBoundingBox();
  clusterScreen.geometry.computeBoundingBox();
  centerScreen.geometry.computeBoundingBox();
  assert.ok(dashMesh.geometry.boundingBox!.max.y < 0.96, 'dashboard binnacle must clear curved windshield');
  assert.ok(clusterScreen.geometry.boundingBox!.max.z > -0.29, 'instrument cluster screen must sit proud of dash face');
  assert.ok(centerScreen.geometry.boundingBox!.max.z > -0.29, 'center infotainment screen must sit proud of dash face');

  // Verify cached geometry reuse between multiple Veloce GT instances
  const bodyMesh1 = rig1.bodyGroup.children[0] as THREE.Mesh;
  const bodyMesh2 = rig2.bodyGroup.children[0] as THREE.Mesh;
  assert.equal(bodyMesh1.geometry, bodyMesh2.geometry, 'multiple Veloce GT instances must share cached GPU geometry');

  // Verify other vehicle models are NOT accidentally replaced by the Veloce GT rig
  const policeRig = createVehicleMesh(VEHICLE_CATALOG.vcpd_interceptor, dummyShadow);
  const policeBody = policeRig.bodyGroup.children[0] as THREE.Mesh;
  assert.notEqual(policeBody.geometry, bodyMesh1.geometry, 'VCPD Interceptor must retain its own distinct vehicle model');
  assert.ok(policeRig.policeRedMat && policeRig.policeBlueMat, 'VCPD Interceptor emergency lights must stay intact');

  rig1.dispose();
  rig2.dispose();
  policeRig.dispose();
  disposeSharedVehicleResources();
  dummyShadow.dispose();
});

test('Phase 2B-1: protagonist character geometry & articulated rig have realistic human proportions, grounded feet, valid normals, PBR materials, and clean disposal', () => {
  const pelvisParts = buildPlayerPelvisGeometry();
  const torsoParts = buildPlayerTorsoGeometry();
  const headParts = buildPlayerHeadAndHairGeometry();
  const upperArmParts = buildPlayerUpperArmGeometry();
  const forearmLeft = buildPlayerForearmAndHandGeometry(-1);
  const forearmRight = buildPlayerForearmAndHandGeometry(1);
  const thigh = buildPlayerThighGeometry();
  const shinParts = buildPlayerShinGeometry();
  const shoeParts = buildPlayerShoeGeometry();

  assert.ok(forearmLeft.watch !== null, 'left wrist should include stainless watch detail');
  assert.equal(forearmRight.watch, null, 'right wrist should not duplicate watch');

  const allGeoms: Array<[string, THREE.BufferGeometry]> = [
    ['pelvis', pelvisParts.pelvis],
    ['belt', pelvisParts.belt],
    ['buckle', pelvisParts.buckle],
    ['innerShirt', torsoParts.innerShirt],
    ['jacket', torsoParts.jacket],
    ['jacketAccent', torsoParts.jacketAccent],
    ['headSkin', headParts.skin],
    ['hair', headParts.hair],
    ['eyeWhites', headParts.eyeWhites],
    ['eyeIrises', headParts.eyeIrises],
    ['lips', headParts.lips],
    ['upperArmSleeve', upperArmParts.sleeve],
    ['upperArmCuff', upperArmParts.cuff],
    ['forearmLeft', forearmLeft.forearmAndHand],
    ['forearmRight', forearmRight.forearmAndHand],
    ['watch', forearmLeft.watch],
    ['thigh', thigh],
    ['trouserShin', shinParts.trouserShin],
    ['ankleSkin', shinParts.ankleSkin],
    ['shoeUpper', shoeParts.upper],
    ['shoeSole', shoeParts.sole],
    ['shoeAccent', shoeParts.accent],
  ];

  for (const [name, g] of allGeoms) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    assert.ok(pos && pos.count > 12, `${name} should have sculpted vertex detail`);
    assert.ok(norm && norm.count === pos.count, `${name} must have vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${name} vertex ${i} must be finite`,
      );
      const nLen = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(Number.isFinite(nLen) && Math.abs(nLen - 1) < 0.05, `${name} normal ${i} must be unit length`);
    }
    g.dispose();
  }

  const dummyShadow = new THREE.Texture();
  const rig = createPlayerCharacterRig(dummyShadow);
  rig.root.updateMatrixWorld(true);

  // Full protagonist silhouette dimensions (excluding contact shadow disc)
  const bodyBox = new THREE.Box3().setFromObject(rig.bodyRig);
  const size = bodyBox.getSize(new THREE.Vector3());
  assert.ok(
    bodyBox.min.y >= -0.005 && bodyBox.min.y <= 0.005,
    `protagonist soles must stand flush on y=0, got min.y=${bodyBox.min.y.toFixed(4)}`,
  );
  assert.ok(
    size.y >= 1.75 && size.y <= 1.9,
    `protagonist height should be realistic adult scale (1.75-1.90m), got ${size.y.toFixed(3)}m`,
  );
  assert.ok(
    size.x >= 0.48 && size.x <= 0.65,
    `protagonist shoulder/arm width should be natural adult width, got ${size.x.toFixed(3)}m`,
  );

  // Articulated hierarchy integrity: pelvis -> spine -> neck & shoulders -> elbows, pelvis -> hips -> knees -> ankles
  assert.ok(rig.hipsPivot.children.includes(rig.spinePivot));
  assert.ok(rig.spinePivot.children.includes(rig.neckPivot));
  assert.ok(rig.spinePivot.children.includes(rig.leftShoulderPivot));
  assert.ok(rig.spinePivot.children.includes(rig.rightShoulderPivot));
  assert.ok(rig.leftShoulderPivot.children.includes(rig.leftElbowPivot));
  assert.ok(rig.rightShoulderPivot.children.includes(rig.rightElbowPivot));
  assert.ok(rig.hipsPivot.children.includes(rig.leftHipPivot));
  assert.ok(rig.hipsPivot.children.includes(rig.rightHipPivot));
  assert.ok(rig.leftHipPivot.children.includes(rig.leftKneePivot));
  assert.ok(rig.rightHipPivot.children.includes(rig.rightKneePivot));
  assert.ok(rig.leftKneePivot.children.includes(rig.leftAnklePivot));
  assert.ok(rig.rightKneePivot.children.includes(rig.rightAnklePivot));

  // Verify PBR materials are distinct (skin, jacket, shirt, pants, shoes, hair, eyes, watch/buckle)
  const uniqueMaterials = new Set<THREE.Material>();
  rig.bodyRig.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      uniqueMaterials.add(obj.material);
    }
  });
  assert.ok(uniqueMaterials.size >= 8, `protagonist should use rich distinct PBR materials, found ${uniqueMaterials.size}`);
  assert.ok(Math.abs(rig.hipsPivot.position.y - PLAYER_DIMS.hipY) < 1e-5);

  rig.dispose();
  dummyShadow.dispose();
});

test('Phase 2B-1: player locomotion animator drives idle, stride-matched walk/sprint, jump/fall/landing recovery, and turning with anatomical joint limits', () => {
  const dummyShadow = new THREE.Texture();
  const rig = createPlayerCharacterRig(dummyShadow);
  const anim = createInitialPlayerAnimatorState();

  // 1. Idle: keeps legs planted near neutral, does not advance walking gait, has subtle breathing
  const idlePhaseBefore = anim.gaitPhase;
  for (let i = 0; i < 60; i++) {
    stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 0,
      vy: 0,
      grounded: true,
      justLandedStrength: 0,
      headingDelta: 0,
      state: 'idle',
    });
  }
  applyPlayerPoseToRig(rig, anim);
  assert.equal(anim.gaitPhase, idlePhaseBefore, 'idle must not advance locomotion gait phase');
  assert.ok(Math.abs(anim.leftHipX) < 0.08 && Math.abs(anim.rightHipX) < 0.08, 'idle hips should stay near neutral');
  assert.ok(anim.leftElbowX >= 0 && anim.rightElbowX >= 0, 'elbows must only bend anatomically forward (>= 0)');

  // 2. Walk: coordinated opposite-phase limb swing, backward knee flexion (<= 0), forward elbow flexion (>= 0), and footsteps
  let walkFootsteps = 0;
  let maxLeftHip = -Infinity;
  let minLeftHip = Infinity;
  let minKneeFlex = 0;
  let maxWalkForwardLean = 0;
  for (let i = 0; i < 120; i++) {
    const res = stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 5.2,
      vy: 0,
      grounded: true,
      justLandedStrength: 0,
      headingDelta: 0,
      state: 'walk',
    });
    if (res.footstepTriggered) walkFootsteps++;
    maxLeftHip = Math.max(maxLeftHip, anim.leftHipX);
    minLeftHip = Math.min(minLeftHip, anim.leftHipX);
    minKneeFlex = Math.min(minKneeFlex, anim.leftKneeX, anim.rightKneeX);
    maxWalkForwardLean = Math.min(maxWalkForwardLean, anim.spinePitch);
    assert.ok(anim.leftKneeX <= 1e-4 && anim.rightKneeX <= 1e-4, 'knees must only flex backward (<= 0)');
    assert.ok(anim.leftElbowX >= -1e-4 && anim.rightElbowX >= -1e-4, 'elbows must only flex forward (>= 0)');
  }
  assert.ok(walkFootsteps >= 3, `expected stride-matched walk footsteps over 2s, got ${walkFootsteps}`);
  assert.ok(maxLeftHip > 0.3 && minLeftHip < -0.3, 'walking must swing legs forward and back');
  assert.ok(minKneeFlex < -0.35, 'walking swing phase must bend knee naturally');

  // 3. Sprint: greater forward lean, larger stride amplitude, faster cadence, turning head anticipation
  let sprintFootsteps = 0;
  let maxSprintForwardLean = 0;
  let maxHeadAnticipation = 0;
  for (let i = 0; i < 120; i++) {
    const res = stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 9.4,
      vy: 0,
      grounded: true,
      justLandedStrength: 0,
      headingDelta: 0.04,
      state: 'sprint',
    });
    if (res.footstepTriggered) sprintFootsteps++;
    maxSprintForwardLean = Math.min(maxSprintForwardLean, anim.spinePitch);
    maxHeadAnticipation = Math.max(maxHeadAnticipation, Math.abs(anim.neckYaw));
    assert.ok(anim.leftKneeX <= 1e-4 && anim.rightKneeX <= 1e-4);
    assert.ok(anim.leftElbowX >= -1e-4 && anim.rightElbowX >= -1e-4);
  }
  assert.ok(sprintFootsteps > walkFootsteps, 'sprinting should have a faster footstep cadence than walking');
  assert.ok(maxSprintForwardLean < maxWalkForwardLean - 0.06, 'sprinting should lean torso further forward than walking');
  assert.ok(maxHeadAnticipation > 0.08, 'turning should produce subtle head anticipation');

  // 4. Jump ascent -> descent -> landing knee compression and smooth recovery
  for (let i = 0; i < 12; i++) {
    stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 4.5,
      vy: 6.5 - i * 0.4,
      grounded: false,
      justLandedStrength: 0,
      headingDelta: 0,
      state: 'jump',
    });
  }
  assert.ok(anim.leftKneeX < -0.25 || anim.rightKneeX < -0.25, 'airborne pose should tuck knee naturally');

  // Fall fast before impact
  for (let i = 0; i < 15; i++) {
    stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 3.0,
      vy: -9.5,
      grounded: false,
      justLandedStrength: 0,
      headingDelta: 0,
      state: 'jump',
    });
  }

  // Touch down -> triggers landing compression
  stepPlayerAnimation(anim, {
    dt: 1 / 60,
    planarSpeed: 0,
    vy: 0,
    grounded: true,
    justLandedStrength: 0.85,
    headingDelta: 0,
    state: 'idle',
  });
  const impactDrop = anim.hipsOffsetY;
  assert.ok(anim.landingImpact > 0.5, 'hard touchdown should trigger landing compression');
  assert.ok(impactDrop < -0.02, 'landing compression should momentarily lower hips');

  // Settle back to neutral standing posture
  for (let i = 0; i < 45; i++) {
    stepPlayerAnimation(anim, {
      dt: 1 / 60,
      planarSpeed: 0,
      vy: 0,
      grounded: true,
      justLandedStrength: 0,
      headingDelta: 0,
      state: 'idle',
    });
  }
  assert.ok(anim.landingImpact < 0.05, 'landing compression should smoothly recover to standing');

  applyPlayerPoseToRig(rig, anim);
  assert.ok(Number.isFinite(rig.hipsPivot.position.y) && Number.isFinite(rig.leftHipPivot.rotation.x));

  rig.dispose();
  dummyShadow.dispose();
});

test('Phase 2B-1: PlayerController preserves movement, sprint, jump, collision resolution, vehicle visibility toggle, and clean disposal', () => {
  const dummyShadow = new THREE.Texture();
  const player = new PlayerController(dummyShadow);
  player.setPosition(0, 0, 0);

  let footsteps = 0;
  let jumps = 0;

  // Walk forward (-Z when cameraYaw = 0)
  for (let i = 0; i < 45; i++) {
    player.update({
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      sprint: false,
      jumpJustPressed: false,
      jumpHeld: false,
      cameraYaw: 0,
      colliders: [],
      vehicleCircles: [],
      onFootstep: () => footsteps++,
      onJump: () => jumps++,
    });
  }
  assert.equal(player.state, 'walk');
  assert.ok(player.z < -2.0, `player should move forward (-Z), got z=${player.z}`);
  assert.ok(footsteps >= 1, 'walking should invoke onFootstep callback');

  // Sprint increases speed beyond walk speed
  for (let i = 0; i < 30; i++) {
    player.update({
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      sprint: true,
      jumpJustPressed: false,
      jumpHeld: false,
      cameraYaw: 0,
      colliders: [],
      vehicleCircles: [],
    });
  }
  assert.equal(player.state, 'sprint');
  assert.ok(Math.hypot(player.vx, player.vz) > 7.5, 'sprint should exceed walking speed');

  // Jump launches off ground and lands back at y = 0
  player.update({
    dt: 1 / 60,
    moveForward: 0,
    moveRight: 0,
    sprint: false,
    jumpJustPressed: true,
    jumpHeld: true,
    cameraYaw: 0,
    colliders: [],
    vehicleCircles: [],
    onJump: () => jumps++,
  });
  assert.equal(jumps, 1);
  assert.equal(player.grounded, false);
  assert.equal(player.state, 'jump');

  let peakY = 0;
  for (let i = 0; i < 90; i++) {
    player.update({
      dt: 1 / 60,
      moveForward: 0,
      moveRight: 0,
      sprint: false,
      jumpJustPressed: false,
      jumpHeld: true,
      cameraYaw: 0,
      colliders: [],
      vehicleCircles: [],
    });
    peakY = Math.max(peakY, player.y);
  }
  assert.ok(peakY > 0.8, `jump should clear ground cleanly, got peakY=${peakY}`);
  assert.equal(player.grounded, true);
  assert.equal(player.y, 0);

  // Wall collision stops penetration
  player.setPosition(0, 0, 0);
  for (let i = 0; i < 40; i++) {
    player.update({
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      sprint: false,
      jumpJustPressed: false,
      jumpHeld: false,
      cameraYaw: 0,
      colliders: [{ id: 'test-wall', minX: -5, maxX: 5, minZ: -3, maxZ: -1, height: 4, kind: 'building' }],
      vehicleCircles: [],
    });
  }
  assert.ok(player.z >= -1.0 + 0.47, `wall collision must keep player outside box, got z=${player.z}`);

  // Vehicle entry/exit visibility contract
  player.setVisible(false);
  assert.equal(player.visible, false);
  assert.equal(player.root.visible, false);
  player.setVisible(true);
  assert.equal(player.visible, true);
  assert.equal(player.root.visible, true);

  player.dispose();
  dummyShadow.dispose();
});

test('Phase 2B-2: pedestrian shared geometries, 8 coastal outfit archetypes, natural adult proportions, and GPU resource reuse across 26 NPCs', () => {
  const sharedGeo = createPedestrianSharedGeometries();
  const geoEntries: Array<[string, THREE.BufferGeometry]> = [
    ['pelvis', sharedGeo.pelvis],
    ['belt', sharedGeo.belt],
    ['tshirtTorso', sharedGeo.tshirtTorso],
    ['collaredTorso', sharedGeo.collaredTorso],
    ['openJacketInner', sharedGeo.openJacketInner],
    ['openJacketShell', sharedGeo.openJacketShell],
    ['headSkin', sharedGeo.headSkin],
    ['eyeWhites', sharedGeo.eyeWhites],
    ['eyeIrises', sharedGeo.eyeIrises],
    ['lips', sharedGeo.lips],
    ['hairShortCrop', sharedGeo.hairStyles.shortCrop],
    ['hairSweptWaves', sharedGeo.hairStyles.sweptWaves],
    ['hairBobCut', sharedGeo.hairStyles.bobCut],
    ['hairHighPonytail', sharedGeo.hairStyles.highPonytail],
    ['longSleeveUpperArm', sharedGeo.longSleeveUpperArm],
    ['shortSleeveFabricUpper', sharedGeo.shortSleeveFabricUpper],
    ['shortSleeveSkinLower', sharedGeo.shortSleeveSkinLower],
    ['bareForearmAndHand', sharedGeo.bareForearmAndHand],
    ['longSleeveForearm', sharedGeo.longSleeveForearm],
    ['handOnly', sharedGeo.handOnly],
    ['thighTrouser', sharedGeo.thighTrouser],
    ['thighShortsFabric', sharedGeo.thighShortsFabric],
    ['thighShortsBareLower', sharedGeo.thighShortsBareLower],
    ['shinTrouser', sharedGeo.shinTrouser],
    ['shinAnkleSkin', sharedGeo.shinAnkleSkin],
    ['shinBare', sharedGeo.shinBare],
    ['sneakerUpper', sharedGeo.shoes.sneaker.upper],
    ['sneakerSole', sharedGeo.shoes.sneaker.sole],
    ['loaferUpper', sharedGeo.shoes.loafer.upper],
    ['loaferSole', sharedGeo.shoes.loafer.sole],
    ['sunglasses', sharedGeo.sunglasses],
    ['backpack', sharedGeo.backpack],
  ];

  for (const [name, g] of geoEntries) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    assert.ok(pos && pos.count > 12, `${name} should have sculpted vertex detail`);
    assert.ok(norm && norm.count === pos.count, `${name} must have vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${name} vertex ${i} must be finite`,
      );
      const nLen = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(Number.isFinite(nLen) && Math.abs(nLen - 1) < 0.05, `${name} normal ${i} must be unit length`);
    }
  }
  sharedGeo.dispose();

  // Verify at least 6 cohesive coastal city visual archetypes (8 provided)
  assert.ok(PEDESTRIAN_ARCHETYPES.length >= 6, 'expected at least 6 pedestrian archetypes');
  const themes = new Set(PEDESTRIAN_ARCHETYPES.map((a) => a.theme));
  assert.ok(
    themes.has('tourist') && themes.has('office') && themes.has('local') && themes.has('sporty') && themes.has('beach'),
    'archetypes should span tourist, office, local, sporty, and beach coastal themes',
  );

  const dummyShadow = new THREE.Texture();
  const resources = createPedestrianSharedResources(dummyShadow);
  const heights: number[] = [];
  const usedGeos = new Set<THREE.BufferGeometry>();
  const usedMats = new Set<THREE.Material>();

  for (let i = 0; i < 26; i++) {
    const rig = createPedestrianRig(resources, i);
    rig.root.updateMatrixWorld(true);
    const bodyBox = new THREE.Box3().setFromObject(rig.bodyRig);
    const size = bodyBox.getSize(new THREE.Vector3());
    heights.push(size.y);

    assert.ok(
      bodyBox.min.y >= -0.005 && bodyBox.min.y <= 0.005,
      `pedestrian ${rig.archetypeId} soles must stand flush on y=0, got min.y=${bodyBox.min.y.toFixed(4)}`,
    );
    assert.ok(
      size.y >= 1.6 && size.y <= 1.92,
      `pedestrian ${rig.archetypeId} height must be natural adult range, got ${size.y.toFixed(3)}m`,
    );
    assert.ok(
      size.x >= 0.45 && size.x <= 0.62,
      `pedestrian ${rig.archetypeId} width must be natural adult range, got ${size.x.toFixed(3)}m`,
    );
    assert.ok(Math.abs(rig.hipsPivot.position.y - PEDESTRIAN_DIMS.hipY) < 1e-5);

    // Articulated rig hierarchy check
    assert.ok(rig.hipsPivot.children.includes(rig.spinePivot));
    assert.ok(rig.spinePivot.children.includes(rig.neckPivot));
    assert.ok(rig.leftShoulderPivot.children.includes(rig.leftElbowPivot));
    assert.ok(rig.rightShoulderPivot.children.includes(rig.rightElbowPivot));
    assert.ok(rig.leftHipPivot.children.includes(rig.leftKneePivot));
    assert.ok(rig.leftKneePivot.children.includes(rig.leftAnklePivot));

    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        usedGeos.add(obj.geometry);
        if (obj.material instanceof THREE.Material) {
          usedMats.add(obj.material);
          if (obj.material instanceof THREE.MeshStandardMaterial && obj.material !== resources.sunglassesMat) {
            assert.ok(obj.material.metalness <= 0.1, 'ordinary pedestrian clothing/skin/hair must not look metallic');
          }
        }
      }
    });
  }

  // Natural adult height variation across the population
  const heightSpan = Math.max(...heights) - Math.min(...heights);
  assert.ok(heightSpan >= 0.08, `expected noticeable adult height variation across pedestrians, got ${heightSpan.toFixed(3)}m`);

  // Performance guarantee: 26 pedestrians reuse a compact bounded pool of shared geometries & materials
  assert.ok(usedGeos.size <= 35, `expected compact shared geometry pool across 26 NPCs, got ${usedGeos.size}`);
  assert.ok(usedMats.size <= 50, `expected compact shared material pool across 26 NPCs, got ${usedMats.size}`);
  assert.equal(usedMats.size, resources.getMaterialCount());

  resources.dispose();
  dummyShadow.dispose();
});

test('Phase 2B-2: pedestrian locomotion animator supports idle, stride-matched walk, fleeing run, turning anticipation, smooth stop/start, and anatomical limits', () => {
  const dummyShadow = new THREE.Texture();
  const resources = createPedestrianSharedResources(dummyShadow);
  const rig = createPedestrianRig(resources, 0);
  const anim = createInitialPedestrianAnimatorState(0);

  // 1. Idle: keeps legs near neutral, does not advance walking gait, has subtle breathing & head glance
  const startPhase = anim.gaitPhase;
  let maxNeckIdle = 0;
  for (let i = 0; i < 90; i++) {
    stepPedestrianAnimation(anim, {
      dt: 1 / 60,
      actualSpeed: 0,
      headingDelta: 0,
      state: 'idle',
      heightScale: rig.heightScale,
    });
    maxNeckIdle = Math.max(maxNeckIdle, Math.abs(anim.neckYaw));
  }
  assert.equal(anim.gaitPhase, startPhase, 'idle must not advance walk gait phase');
  assert.ok(Math.abs(anim.leftHipX) < 0.08 && Math.abs(anim.rightHipX) < 0.08, 'idle legs should stay planted near neutral');
  assert.ok(maxNeckIdle > 0.02, 'idle should include subtle head look-around motion');

  // 2. Walking: coordinated opposite limb swing, anatomical knee/elbow limits, smooth turning bank
  let maxWalkHip = -Infinity;
  let minWalkHip = Infinity;
  let minWalkKnee = 0;
  let walkTurnNeck = 0;
  for (let i = 0; i < 120; i++) {
    stepPedestrianAnimation(anim, {
      dt: 1 / 60,
      actualSpeed: 1.85,
      headingDelta: 0.03,
      state: 'walk',
      heightScale: rig.heightScale,
    });
    maxWalkHip = Math.max(maxWalkHip, anim.leftHipX);
    minWalkHip = Math.min(minWalkHip, anim.leftHipX);
    minWalkKnee = Math.min(minWalkKnee, anim.leftKneeX, anim.rightKneeX);
    walkTurnNeck = Math.max(walkTurnNeck, Math.abs(anim.neckYaw));
    assert.ok(anim.leftKneeX <= 1e-4 && anim.rightKneeX <= 1e-4, 'knees must flex backward (<= 0)');
    assert.ok(anim.leftElbowX >= -1e-4 && anim.rightElbowX >= -1e-4, 'elbows must flex forward (>= 0)');
  }
  assert.ok(maxWalkHip > 0.22 && minWalkHip < -0.22, 'walking must swing legs forward and back');
  assert.ok(minWalkKnee < -0.22, 'walking must bend knees naturally');
  assert.ok(walkTurnNeck > 0.05, 'turning while walking should create subtle head anticipation');

  // 3. Fleeing (preserved state): deeper forward torso lean & larger stride amplitude than walking
  let maxFleeLean = 0;
  let maxFleeHip = -Infinity;
  for (let i = 0; i < 90; i++) {
    stepPedestrianAnimation(anim, {
      dt: 1 / 60,
      actualSpeed: 4.6,
      headingDelta: 0,
      state: 'flee',
      heightScale: rig.heightScale,
    });
    maxFleeLean = Math.min(maxFleeLean, anim.spinePitch);
    maxFleeHip = Math.max(maxFleeHip, anim.leftHipX);
    assert.ok(anim.leftKneeX <= 1e-4 && anim.rightKneeX <= 1e-4);
    assert.ok(anim.leftElbowX >= -1e-4 && anim.rightElbowX >= -1e-4);
  }
  assert.ok(maxFleeLean < -0.15, 'fleeing run should lean torso forward');
  assert.ok(maxFleeHip > maxWalkHip + 0.12, 'fleeing run should use a longer stride than casual walk');

  // 4. Stopping smoothly transitions back toward idle without snapping in 1 frame
  const hipBeforeStop = anim.leftHipX;
  stepPedestrianAnimation(anim, {
    dt: 1 / 60,
    actualSpeed: 0,
    headingDelta: 0,
    state: 'idle',
    heightScale: rig.heightScale,
  });
  const firstStepDelta = Math.abs(anim.leftHipX - hipBeforeStop);
  assert.ok(firstStepDelta < 0.25, 'stopping must damp smoothly instead of snapping to idle in one frame');
  for (let i = 0; i < 60; i++) {
    stepPedestrianAnimation(anim, {
      dt: 1 / 60,
      actualSpeed: 0,
      headingDelta: 0,
      state: 'idle',
      heightScale: rig.heightScale,
    });
  }
  assert.ok(Math.abs(anim.leftHipX) < 0.08, 'after stopping, legs should smoothly settle to neutral standing pose');

  applyPedestrianPoseToRig(rig, anim);
  assert.ok(Number.isFinite(rig.hipsPivot.position.y) && Number.isFinite(rig.leftKneePivot.rotation.x));

  resources.dispose();
  dummyShadow.dispose();
});

test('Phase 2B-2: PedestrianSystem preserves sidewalk traversal, player avoidance, fast-vehicle fleeing, LOD culling, and clean disposal', () => {
  const layout = generateCityLayout();
  const dummyShadow = new THREE.Texture();
  const pedSys = new PedestrianSystem(layout.sidewalkLoops, dummyShadow, 26);

  assert.equal(pedSys.getActorCount(), 26);
  assert.equal(pedSys.root.children.length, 26);

  // Confirm all 8 visual archetypes are represented in a 26-pedestrian city population
  const spawnedArchetypes = new Set(pedSys.getArchetypeIds());
  assert.equal(spawnedArchetypes.size, PEDESTRIAN_ARCHETYPES.length);

  // Record initial positions, advance 2 seconds of sidewalk walking
  const initialPos = pedSys.root.children.map((c) => c.position.clone());
  let startled = false;
  for (let i = 0; i < 120; i++) {
    startled = pedSys.update(1 / 60, 999, 999, false, 0) || startled;
  }
  assert.equal(startled, false, 'pedestrians far from player must not report startledByVehicle');

  let movedCount = 0;
  for (let i = 0; i < pedSys.root.children.length; i++) {
    if (pedSys.root.children[i].position.distanceTo(initialPos[i]) > 0.5) movedCount++;
  }
  assert.ok(movedCount >= 18, `most pedestrians should actively walk sidewalk loops, moved=${movedCount}`);

  // Fast vehicle approaching right next to pedestrian 0 must trigger startledByVehicle and flee movement
  const p0 = pedSys.root.children[0].position.clone();
  const triggered = pedSys.update(1 / 60, p0.x + 1.5, p0.z, true, 14);
  assert.equal(triggered, true, 'fast vehicle passing close to a pedestrian must trigger startledByVehicle');

  // Clean disposal empties scene group and frees shared GPU resources
  pedSys.dispose();
  assert.equal(pedSys.getActorCount(), 0);
  assert.equal(pedSys.root.children.length, 0);
  dummyShadow.dispose();
});

test('Phase 2C-1: Solstice Royale parametric three-box saloon profile has executive proportions, upright prow, circular arches, and 4-door cabin aperture distinct from Veloce GT', () => {
  const prow = evaluateSolsticeBodySection(-2.4);
  const frontAxle = evaluateSolsticeBodySection(SOLSTICE_ROYALE_DIMS.frontAxleZ);
  const midDoor = evaluateSolsticeBodySection(0.25);
  const rearAxle = evaluateSolsticeBodySection(SOLSTICE_ROYALE_DIMS.rearAxleZ);
  const trunk = evaluateSolsticeBodySection(2.05);

  // Executive saloon is longer, taller, and has a much more upright prow than the wedge-nosed Veloce GT
  assert.ok(SOLSTICE_ROYALE_DIMS.length > VELOCE_GT_DIMS.length + 0.3, 'Solstice Royale must be longer than Veloce GT');
  assert.ok(SOLSTICE_ROYALE_DIMS.height > VELOCE_GT_DIMS.height + 0.14, 'Solstice Royale must be taller than Veloce GT');
  const veloceNose = evaluateVeloceBodySection(-2.2);
  assert.ok(prow.beltY > veloceNose.beltY + 0.2, 'Solstice Royale prow must sit taller and more upright than Veloce GT nose');

  // Wheelbase and genuine circular wheel-arch clearances above wheelRadius (0.34m)
  assert.equal(frontAxle.inFrontArch, true);
  assert.equal(rearAxle.inRearArch, true);
  assert.ok(
    frontAxle.sillY > SOLSTICE_ROYALE_DIMS.wheelRadius + 0.38,
    `front wheel arch crown must clear wheel top cleanly, got ${frontAxle.sillY}`,
  );
  assert.ok(
    rearAxle.sillY > SOLSTICE_ROYALE_DIMS.wheelRadius + 0.38,
    `rear wheel arch crown must clear wheel top cleanly, got ${rearAxle.sillY}`,
  );
  assert.ok(midDoor.sillY >= SOLSTICE_ROYALE_DIMS.groundClearance - 0.01 && midDoor.sillY < 0.28);

  // Long four-door open cabin aperture between cowl and rear glass, closed over long bonnet and formal rear trunk
  assert.equal(frontAxle.cabinOpenHalfWidth, 0, 'bonnet over front axle must remain closed');
  assert.ok(midDoor.cabinOpenHalfWidth > 0.65, '4-door cabin aperture must open wide for visible executive interior');
  assert.equal(trunk.cabinOpenHalfWidth, 0, 'formal rear trunk deck must remain closed');
  assert.ok(
    SOLSTICE_ROYALE_DIMS.cabinEndZ - SOLSTICE_ROYALE_DIMS.cabinStartZ >
      VELOCE_GT_DIMS.cabinEndZ - VELOCE_GT_DIMS.cabinStartZ + 0.4,
    '4-door executive cabin must span significantly longer than 2-seat sports coupe cabin',
  );
});

test('Phase 2C-1: Solstice Royale sculpted geometries have finite vertices, valid outward normals, luxury interior & waterfall grille, and rounded 14-spoke Lathe wheels', () => {
  const body = buildSolsticeBodyShellGeometry();
  const { paintedRoof, sunroofGlass } = buildSolsticeRoofGeometry();
  const windshield = buildSolsticeWindshieldGeometry();
  const rearGlass = buildSolsticeRearGlassGeometry();
  const sideL = buildSolsticeSideWindowGeometry(-1);
  const sideR = buildSolsticeSideWindowGeometry(1);
  const pillars = buildSolsticePillarsGeometry();
  const grille = buildSolsticeFrontGrilleGeometry();
  const headlights = buildSolsticeHeadlightsGeometry();
  const rearFascia = buildSolsticeRearFasciaGeometry();
  const extDetails = buildSolsticeExteriorDetailsGeometry();
  const interior = buildSolsticeInteriorGeometries();
  const wheel = buildSolsticeWheelParts();

  const checkFiniteAndUnitNormals = (geo: THREE.BufferGeometry, name: string) => {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 12, `${name} should contain valid vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} should have vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${name} vertex ${i} must be finite`,
      );
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(len > 0.8 && len < 1.2, `${name} normal ${i} must be unit length, got ${len}`);
    }
  };

  checkFiniteAndUnitNormals(body, 'solsticeBodyShell');
  checkFiniteAndUnitNormals(paintedRoof, 'solsticeRoof');
  checkFiniteAndUnitNormals(sunroofGlass, 'solsticeSunroof');
  checkFiniteAndUnitNormals(windshield, 'solsticeWindshield');
  checkFiniteAndUnitNormals(rearGlass, 'solsticeRearGlass');
  checkFiniteAndUnitNormals(sideL, 'solsticeSideWindowL');
  checkFiniteAndUnitNormals(sideR, 'solsticeSideWindowR');
  checkFiniteAndUnitNormals(pillars.paintedPillars, 'solsticePaintedPillars');
  checkFiniteAndUnitNormals(grille.grilleChrome, 'solsticeWaterfallGrille');
  checkFiniteAndUnitNormals(headlights.emissiveOptics, 'solsticeHeadlights');
  checkFiniteAndUnitNormals(rearFascia.taillightEmissive, 'solsticeTaillights');
  checkFiniteAndUnitNormals(interior.leatherSeats, 'solsticeExecutiveSeats');
  checkFiniteAndUnitNormals(wheel.tireGeo, 'solsticeTire');
  checkFiniteAndUnitNormals(wheel.rimAlloyGeo, 'solstice14SpokeRim');

  // Verify outward normal orientations on greenhouse surfaces
  const avgNormal = (geo: THREE.BufferGeometry) => {
    const n = geo.getAttribute('normal');
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < n.count; i++) {
      x += n.getX(i); y += n.getY(i); z += n.getZ(i);
    }
    return { x: x / n.count, y: y / n.count, z: z / n.count };
  };

  const nRoof = avgNormal(paintedRoof);
  const nSun = avgNormal(sunroofGlass);
  const nWind = avgNormal(windshield);
  const nRear = avgNormal(rearGlass);
  const nSideL = avgNormal(sideL);
  const nSideR = avgNormal(sideR);
  assert.ok(nRoof.y > 0.85, `roof normals must point upward (+Y), got ${nRoof.y}`);
  assert.ok(nSun.y > 0.85, `sunroof normals must point upward (+Y), got ${nSun.y}`);
  assert.ok(nWind.y > 0.45 && nWind.z < -0.45, `windshield normals must point up-forward, got (${nWind.y}, ${nWind.z})`);
  assert.ok(nRear.y > 0.45 && nRear.z > 0.45, `rear glass normals must point up-rearward, got (${nRear.y}, ${nRear.z})`);
  assert.ok(nSideL.x < -0.6, `left side window normals must point outward (-X), got ${nSideL.x}`);
  assert.ok(nSideR.x > 0.6, `right side window normals must point outward (+X), got ${nSideR.x}`);

  // Verify overall body dimensions match catalog (4.90m x 2.10m) and tire diameter matches wheelRadius (0.68m)
  body.computeBoundingBox();
  const bSize = new THREE.Vector3();
  body.boundingBox!.getSize(bSize);
  assert.ok(Math.abs(bSize.z - VEHICLE_CATALOG.solstice_royale.length) < 0.08, `body length should match 4.90m, got ${bSize.z}`);
  assert.ok(bSize.x > 1.95 && bSize.x <= 2.14, `body width should match luxury sedan stance, got ${bSize.x}`);

  wheel.tireGeo.computeBoundingBox();
  const tSize = new THREE.Vector3();
  wheel.tireGeo.boundingBox!.getSize(tSize);
  assert.ok(Math.abs(tSize.y - SOLSTICE_ROYALE_DIMS.wheelRadius * 2) < 0.02, 'tire diameter must match 0.68m');
  assert.ok(Math.abs(tSize.x - SOLSTICE_ROYALE_DIMS.wheelWidth) < 0.02, 'tire width must match 0.25m');

  // Verify four-seat interior spans front & rear rows inside cabin bounds
  interior.leatherSeats.computeBoundingBox();
  const seatBox = interior.leatherSeats.boundingBox!;
  assert.ok(seatBox.min.z < -0.15 && seatBox.max.z > 0.95, 'interior seats must include both front seats and rear lounge bench');

  for (const g of [
    body, paintedRoof, sunroofGlass, windshield, rearGlass, sideL, sideR,
    pillars.paintedPillars, pillars.bPillars, pillars.chromeWindowTrim,
    grille.grilleChrome, grille.grilleRecess, grille.bumperAccentBar,
    headlights.housings, headlights.chromeBezels, headlights.emissiveOptics, headlights.amberMarkers, headlights.clearLenses,
    rearFascia.taillightEmissive, rearFascia.rearChromeTrim, rearFascia.rearDarkCove, rearFascia.exhaustOuter, rearFascia.exhaustInner, rearFascia.licensePlate, rearFascia.rearEmblem,
    extDetails.mirrorHousings, extDetails.mirrorStalks, extDetails.mirrorGlass, extDetails.chromeHandlesAndCrest, extDetails.sideSpearAccent, extDetails.underbodyAndLiners, extDetails.wipers, extDetails.panelSeams,
    interior.cabinTub, interior.leatherSeats, interior.woodTrim, interior.dashboard, interior.steeringWheel, interior.clusterScreen, interior.centerScreen, interior.rearViewMirror,
    wheel.tireGeo, wheel.rimAlloyGeo, wheel.centerCapGeo, wheel.innerBarrelGeo, wheel.rotorGeo, wheel.caliperGeo,
  ]) {
    g.dispose();
  }
});

test('Phase 2C-1: Solstice Royale VehicleRig preserves physics/wheel pivots, transparent glass over 4-seat interior LOD, PBR materials, disposal, and other vehicle branches', () => {
  const dummyShadow = new THREE.Texture();
  const rig1 = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow);
  const rig2 = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow, 0x1e293b);

  // VehicleRig wheel pivot & steering hierarchy
  assert.equal(rig1.wheels.length, 4);
  assert.ok(rig1.frontLeftPivot.children.includes(rig1.wheels[0]), 'frontLeftPivot must parent front-left spinning wheel');
  assert.ok(rig1.frontRightPivot.children.includes(rig1.wheels[1]), 'frontRightPivot must parent front-right spinning wheel');
  assert.ok(rig1.frontLeftPivot.children.length >= 2, 'frontLeftPivot must also mount stationary brake caliper');
  assert.ok(Math.abs(rig1.frontLeftPivot.position.y - SOLSTICE_ROYALE_DIMS.wheelRadius) < 1e-5);
  assert.ok(rig1.frontLeftPivot.position.z < -1.4 && rig1.wheels[2].position.z > 1.4, 'executive long wheelbase placement');

  // Verify steering & physics step work identically on Solstice Royale
  let phys = createInitialVehicleState(25.5, -20, Math.PI);
  for (let i = 0; i < 20; i++) {
    phys = stepVehiclePhysics(
      phys,
      VEHICLE_CATALOG.solstice_royale,
      { throttle: 1, brake: 0, steer: 0.6, handbrake: false },
      1 / 30,
      [],
    );
  }
  rig1.frontLeftPivot.rotation.y = phys.steerAngle;
  rig1.frontRightPivot.rotation.y = phys.steerAngle;
  for (const w of rig1.wheels) w.rotation.x = -phys.wheelSpin;
  assert.ok(Math.abs(rig1.frontLeftPivot.rotation.y) > 0.1, 'front steering pivot must respond to physics steerAngle');
  assert.ok(Math.abs(rig1.wheels[0].rotation.x) > 1.0, 'wheels must spin smoothly from physics wheelSpin');

  // Reset pivot transforms before ground-plane bounding check
  rig1.frontLeftPivot.rotation.y = 0;
  rig1.frontRightPivot.rotation.y = 0;
  for (const w of rig1.wheels) w.rotation.x = 0;

  // PBR luxury paint & transparent solar glass revealing interior
  assert.ok(rig1.paintMat instanceof THREE.MeshPhysicalMaterial);
  assert.equal(rig1.paintMat.color.getHex(), VEHICLE_CATALOG.solstice_royale.color);
  assert.equal(rig2.paintMat.color.getHex(), 0x1e293b, 'overrideColor must apply cleanly to Solstice Royale');
  assert.ok(rig1.paintMat.clearcoat >= 0.9, 'Solstice Royale lacquer must have luxury clearcoat');
  assert.ok(rig1.glassMat instanceof THREE.MeshPhysicalMaterial);
  assert.equal(rig1.glassMat.transparent, true);
  assert.ok(rig1.glassMat.opacity >= 0.25 && rig1.glassMat.opacity <= 0.5, 'glass must stay transparent enough to show interior');
  assert.equal(rig1.glassMat.depthWrite, false);

  // 3-tier LOD with 4-seat executive interior, walnut wood trim, wipers & emblem
  const lod = rig1.bodyGroup.children.find((c): c is THREE.LOD => c instanceof THREE.LOD);
  assert.ok(lod, 'Solstice Royale bodyGroup must include distance-based THREE.LOD');
  assert.ok(lod.levels.length >= 3, 'Solstice Royale LOD must have near, medium, and far tiers');
  assert.ok(lod.levels[0].object.children.length >= 11, 'near LOD must include full interior, wood trim, handles, emblem, wipers, and seams');
  assert.ok(
    lod.levels[1].object.children.length >= 3 &&
      lod.levels[1].object.children.length < lod.levels[0].object.children.length,
    'medium LOD must reduce draw complexity relative to near LOD',
  );

  // Grounding & clearance verification (no wheels or liners piercing y < 0; height matches ~1.42m)
  rig1.root.updateMatrixWorld(true);
  const rigBox = new THREE.Box3().setFromObject(rig1.root);
  const bodyBox = new THREE.Box3().setFromObject(rig1.bodyGroup);
  assert.ok(rigBox.min.y >= -0.002, `Solstice Royale must sit flush on ground y=0, got min.y=${rigBox.min.y}`);
  assert.ok(bodyBox.min.y >= 0.14, `Solstice Royale body & liners must keep clean ground clearance, got min.y=${bodyBox.min.y}`);
  assert.ok(Math.abs(rigBox.max.y - VEHICLE_CATALOG.solstice_royale.height) < 0.06, `roof height should match ~1.42m, got ${rigBox.max.y}`);

  // Shared GPU geometry cache reused across multiple Solstice Royale instances
  const sBody1 = rig1.bodyGroup.children[0] as THREE.Mesh;
  const sBody2 = rig2.bodyGroup.children[0] as THREE.Mesh;
  assert.equal(sBody1.geometry, sBody2.geometry, 'multiple Solstice Royale instances must reuse shared cached geometry');

  // Regression protection: Veloce GT, Bayside Titan, and VCPD Interceptor remain distinct and functional
  const veloceRig = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const titanRig = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow);
  const policeRig = createVehicleMesh(VEHICLE_CATALOG.vcpd_interceptor, dummyShadow);
  assert.notEqual((veloceRig.bodyGroup.children[0] as THREE.Mesh).geometry, sBody1.geometry, 'Veloce GT must keep its own unique geometry');
  assert.notEqual((titanRig.bodyGroup.children[0] as THREE.Mesh).geometry, sBody1.geometry, 'Bayside Titan must keep its own unique geometry');
  assert.notEqual((policeRig.bodyGroup.children[0] as THREE.Mesh).geometry, sBody1.geometry, 'VCPD Interceptor must keep its own unique geometry');
  assert.ok(policeRig.policeRedMat && policeRig.policeBlueMat, 'VCPD Interceptor emergency lights must stay intact');

  rig1.dispose();
  rig2.dispose();
  veloceRig.dispose();
  titanRig.dispose();
  policeRig.dispose();
  disposeSharedVehicleResources();
  dummyShadow.dispose();
});

test('Phase 2C-2: Bayside Titan parametric two-box luxury SUV profile has elevated ground clearance, tall SUV arches, full-length 4-door + cargo cabin aperture, and proportions distinct from Veloce GT and Solstice Royale', () => {
  const nose = evaluateTitanBodySection(-2.4);
  const frontArch = evaluateTitanBodySection(BAYSIDE_TITAN_DIMS.frontAxleZ);
  const midDoor = evaluateTitanBodySection(0.15);
  const rearArch = evaluateTitanBodySection(BAYSIDE_TITAN_DIMS.rearAxleZ);
  const cargoBay = evaluateTitanBodySection(1.75);
  const tail = evaluateTitanBodySection(2.42);
  const roofMid = sampleTitanRoofRail(0.8);

  // Elevated all-terrain ride height & tall commanding SUV beltline vs sedan & coupe
  const solsticeMid = evaluateSolsticeBodySection(0.15);
  const veloceMid = evaluateVeloceBodySection(0.15);
  assert.ok(
    midDoor.sillY >= 0.33 && midDoor.sillY > solsticeMid.sillY + 0.1,
    `SUV ground clearance must exceed Solstice Royale sedan by >10cm, got titan=${midDoor.sillY}, solstice=${solsticeMid.sillY}`,
  );
  assert.ok(
    midDoor.beltY > solsticeMid.beltY + 0.2 && midDoor.beltY > veloceMid.beltY + 0.28,
    `SUV beltline must stand noticeably taller than sedan and sports coupe, got ${midDoor.beltY}`,
  );
  assert.ok(
    roofMid.crownY > 1.72 && roofMid.crownY < 1.82,
    `SUV roof crown must align below 1.82m rail top, got ${roofMid.crownY}`,
  );

  // Muscular flared haunches & tall wheel-arch clearance around 0.42m wheels
  assert.equal(frontArch.inFrontArch, true);
  assert.equal(rearArch.inRearArch, true);
  assert.ok(
    frontArch.sillY > BAYSIDE_TITAN_DIMS.wheelRadius + 0.48,
    `front SUV wheel arch must clear 0.42m wheel with travel room, got ${frontArch.sillY}`,
  );
  assert.ok(
    rearArch.sillY > BAYSIDE_TITAN_DIMS.wheelRadius + 0.48,
    `rear SUV wheel arch must clear 0.42m wheel with travel room, got ${rearArch.sillY}`,
  );
  assert.ok(
    frontArch.halfWidthMid > midDoor.halfWidthMid + 0.02,
    'front SUV fender haunch must flare cleanly beyond mid-door waist',
  );
  assert.ok(
    rearArch.halfWidthMid > midDoor.halfWidthMid + 0.02,
    'rear SUV haunch must flare cleanly beyond mid-door waist',
  );

  // Two-box SUV greenhouse spans all four doors AND rear cargo bay (unlike 3-box sedan trunk)
  assert.equal(nose.cabinOpenHalfWidth, 0, 'clamshell bonnet must remain closed');
  assert.ok(midDoor.cabinOpenHalfWidth > 0.72, '4-door SUV cabin must open wide for visible interior');
  assert.ok(cargoBay.cabinOpenHalfWidth > 0.65, 'two-box SUV rear cargo bay must remain open under rear quarter glass');
  assert.equal(tail.cabinOpenHalfWidth, 0, 'rear tailgate upper cap must close cleanly');
  assert.ok(
    BAYSIDE_TITAN_DIMS.cabinEndZ - BAYSIDE_TITAN_DIMS.cabinStartZ >
      SOLSTICE_ROYALE_DIMS.cabinEndZ - SOLSTICE_ROYALE_DIMS.cabinStartZ + 0.6,
    'two-box SUV cabin + cargo aperture must span significantly longer than 3-box sedan cabin',
  );
});

test('Phase 2C-2: Bayside Titan sculpted geometries have finite vertices, valid outward normals, SUV all-terrain exterior, 2-row + cargo interior, and rounded 0.42m Lathe wheels', () => {
  const body = buildTitanBodyShellGeometry();
  const roof = buildTitanRoofGeometry();
  const windshield = buildTitanWindshieldGeometry();
  const rearGlass = buildTitanRearGlassGeometry();
  const sideL = buildTitanSideWindowGeometry(-1);
  const sideR = buildTitanSideWindowGeometry(1);
  const pillars = buildTitanPillarsGeometry();
  const front = buildTitanFrontFasciaGeometry();
  const rear = buildTitanRearFasciaGeometry();
  const ext = buildTitanExteriorDetailsGeometry();
  const interior = buildTitanInteriorGeometries();
  const wheel = buildTitanWheelParts();

  const checkFiniteAndUnitNormals = (geo: THREE.BufferGeometry, name: string) => {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 12, `${name} should contain valid vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} should have vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${name} vertex ${i} must be finite`,
      );
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(len > 0.8 && len < 1.2, `${name} normal ${i} must be unit length, got ${len}`);
    }
  };

  checkFiniteAndUnitNormals(body, 'titanBodyShell');
  checkFiniteAndUnitNormals(roof.paintedRoof, 'titanRoof');
  checkFiniteAndUnitNormals(roof.moonroofGlass, 'titanMoonroof');
  checkFiniteAndUnitNormals(roof.roofRails, 'titanRoofRails');
  checkFiniteAndUnitNormals(roof.roofSpoiler, 'titanRoofSpoiler');
  checkFiniteAndUnitNormals(windshield, 'titanWindshield');
  checkFiniteAndUnitNormals(rearGlass, 'titanRearGlass');
  checkFiniteAndUnitNormals(sideL, 'titanSideWindowL');
  checkFiniteAndUnitNormals(sideR, 'titanSideWindowR');
  checkFiniteAndUnitNormals(pillars.glossPillars, 'titanPillars');
  checkFiniteAndUnitNormals(front.grilleSatin, 'titanGrille');
  checkFiniteAndUnitNormals(front.skidPlateSatin, 'titanFrontSkid');
  checkFiniteAndUnitNormals(front.hlEmissiveOptics, 'titanMatrixHeadlights');
  checkFiniteAndUnitNormals(rear.taillightEmissive, 'titanTailLightbar');
  checkFiniteAndUnitNormals(ext.fenderFlaresAndCladding, 'titanFenderFlares');
  checkFiniteAndUnitNormals(ext.sideStepsSatin, 'titanSideSteps');
  checkFiniteAndUnitNormals(interior.leatherSeats, 'titanSuvSeats');
  checkFiniteAndUnitNormals(wheel.tireGeo, 'titanAllTerrainTire');
  checkFiniteAndUnitNormals(wheel.rimAlloyGeo, 'titan6TwinSpokeRim');
  checkFiniteAndUnitNormals(wheel.caliperGeo, 'titanBrakeCaliper');

  // Verify outward normal orientations on greenhouse surfaces
  const avgNormal = (geo: THREE.BufferGeometry) => {
    const n = geo.getAttribute('normal');
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < n.count; i++) {
      x += n.getX(i); y += n.getY(i); z += n.getZ(i);
    }
    return { x: x / n.count, y: y / n.count, z: z / n.count };
  };

  const nRoof = avgNormal(roof.paintedRoof);
  const nMoon = avgNormal(roof.moonroofGlass);
  const nWind = avgNormal(windshield);
  const nRear = avgNormal(rearGlass);
  const nSideL = avgNormal(sideL);
  const nSideR = avgNormal(sideR);
  assert.ok(nRoof.y > 0.85, `SUV roof normals must point upward (+Y), got ${nRoof.y}`);
  assert.ok(nMoon.y > 0.85, `SUV moonroof normals must point upward (+Y), got ${nMoon.y}`);
  assert.ok(nWind.y > 0.4 && nWind.z < -0.5, `SUV windshield normals must point up-forward, got (${nWind.y}, ${nWind.z})`);
  assert.ok(nRear.y > 0.35 && nRear.z > 0.5, `SUV rear tailgate glass normals must point up-rearward, got (${nRear.y}, ${nRear.z})`);
  assert.ok(nSideL.x < -0.6, `SUV left side window normals must point outward (-X), got ${nSideL.x}`);
  assert.ok(nSideR.x > 0.6, `SUV right side window normals must point outward (+X), got ${nSideR.x}`);

  // Verify overall body dimensions match catalog (4.95m x 2.22m) and wheel dimensions match SUV spec (0.84m dia x 0.31m wide)
  body.computeBoundingBox();
  const bSize = new THREE.Vector3();
  body.boundingBox!.getSize(bSize);
  assert.ok(Math.abs(bSize.z - VEHICLE_CATALOG.bayside_titan.length) < 0.08, `SUV length should match 4.95m, got ${bSize.z}`);
  assert.ok(bSize.x > 2.1 && bSize.x <= 2.25, `SUV width should match ~2.22m stance, got ${bSize.x}`);

  wheel.tireGeo.computeBoundingBox();
  const tSize = new THREE.Vector3();
  wheel.tireGeo.boundingBox!.getSize(tSize);
  assert.ok(Math.abs(tSize.y - BAYSIDE_TITAN_DIMS.wheelRadius * 2) < 0.02, `SUV tyre diameter must match 0.84m, got ${tSize.y}`);
  assert.ok(Math.abs(tSize.z - BAYSIDE_TITAN_DIMS.wheelRadius * 2) < 0.02, `SUV tyre must be circular in YZ plane, got ${tSize.z}`);
  assert.ok(Math.abs(tSize.x - BAYSIDE_TITAN_DIMS.wheelWidth) < 0.02, `SUV tyre width must match 0.31m, got ${tSize.x}`);
  assert.ok(tSize.x > SOLSTICE_ROYALE_DIMS.wheelWidth + 0.04, 'all-terrain SUV tyres must be noticeably wider than sedan tyres');

  // Verify 2-row seats + rear cargo deck span interior bounds cleanly
  interior.leatherSeats.computeBoundingBox();
  const seatBox = interior.leatherSeats.boundingBox!;
  assert.ok(seatBox.min.z < -0.15 && seatBox.max.z > 1.15, 'SUV interior seats must include front captain seats and 3-across rear bench');
  interior.cabinTub.computeBoundingBox();
  assert.ok(interior.cabinTub.boundingBox!.max.z > 2.0, 'SUV cabin tub must extend into rear luggage cargo bay');

  for (const g of [
    body, roof.paintedRoof, roof.moonroofGlass, roof.roofRails, roof.roofSpoiler,
    windshield, rearGlass, sideL, sideR,
    pillars.glossPillars, pillars.satinWindowTrim,
    front.grilleSatin, front.grilleMesh, front.bumperMatte, front.skidPlateSatin,
    front.hlHousings, front.hlChromeBezels, front.hlEmissiveOptics, front.hlAmberMarkers, front.hlClearLenses,
    rear.taillightEmissive, rear.rearDarkHousing, rear.rearSatinTrim, rear.exhaustOuter, rear.exhaustInner,
    rear.licensePlate, rear.rearEmblem, rear.hoodEmblem,
    ext.fenderFlaresAndCladding, ext.sideStepsSatin, ext.mirrorHousings, ext.mirrorStalks, ext.mirrorGlass,
    ext.satinHandlesAndBadges, ext.underbodyAndLiners, ext.wipers, ext.panelSeams,
    interior.cabinTub, interior.leatherSeats, interior.satinInteriorTrim, interior.dashboard,
    interior.steeringWheel, interior.cockpitDisplay, interior.rearViewMirror,
    wheel.tireGeo, wheel.rimAlloyGeo, wheel.rimPocketGeo, wheel.centerCapGeo,
    wheel.innerBarrelGeo, wheel.rotorGeo, wheel.caliperGeo,
  ]) {
    g.dispose();
  }
});

test('Phase 2C-2: Bayside Titan VehicleRig preserves physics/0.42m wheel pivots, steering, transparent glass over SUV interior LOD, PBR materials, disposal, and non-regression of Veloce GT & Solstice Royale', () => {
  const dummyShadow = new THREE.Texture();
  const rig1 = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow);
  const rig2 = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow, 0x334155);

  // VehicleRig wheel pivot, stationary calipers & SUV wheel dimensions
  assert.equal(rig1.wheels.length, 4);
  assert.ok(rig1.frontLeftPivot.children.includes(rig1.wheels[0]), 'frontLeftPivot must parent front-left spinning wheel');
  assert.ok(rig1.frontRightPivot.children.includes(rig1.wheels[1]), 'frontRightPivot must parent front-right spinning wheel');
  assert.ok(rig1.frontLeftPivot.children.length >= 2, 'frontLeftPivot must mount stationary SUV brake caliper');
  assert.ok(Math.abs(rig1.frontLeftPivot.position.y - BAYSIDE_TITAN_DIMS.wheelRadius) < 1e-5, 'wheel center Y must match 0.42m radius');
  assert.ok(Math.abs(rig1.frontLeftPivot.position.x + BAYSIDE_TITAN_DIMS.frontTrackHalf) < 1e-5);
  assert.ok(rig1.frontLeftPivot.position.z < -1.45 && rig1.wheels[2].position.z > 1.45, 'SUV wheelbase placement');

  // Verify steering & physics step match Bayside Titan catalog & 0.42m wheelSpin
  let phys = createInitialVehicleState(91.5, 84, 0);
  for (let i = 0; i < 20; i++) {
    phys = stepVehiclePhysics(
      phys,
      VEHICLE_CATALOG.bayside_titan,
      { throttle: 1, brake: 0, steer: -0.65, handbrake: false },
      1 / 30,
      [],
    );
  }
  rig1.frontLeftPivot.rotation.y = phys.steerAngle;
  rig1.frontRightPivot.rotation.y = phys.steerAngle;
  for (const w of rig1.wheels) w.rotation.x = -phys.wheelSpin;
  assert.ok(Math.abs(rig1.frontLeftPivot.rotation.y) > 0.1, 'front steering pivot must respond to physics steerAngle');
  assert.ok(Math.abs(rig1.wheels[0].rotation.x) > 0.8, 'all-terrain SUV wheels must spin cleanly from physics wheelSpin');

  // Reset pivot transforms before ground-plane bounding check
  rig1.frontLeftPivot.rotation.y = 0;
  rig1.frontRightPivot.rotation.y = 0;
  for (const w of rig1.wheels) w.rotation.x = 0;

  // PBR luxury SUV satin-clearcoat paint & transparent glass revealing interior
  assert.ok(rig1.paintMat instanceof THREE.MeshPhysicalMaterial);
  assert.equal(rig1.paintMat.color.getHex(), VEHICLE_CATALOG.bayside_titan.color);
  assert.equal(rig2.paintMat.color.getHex(), 0x334155, 'overrideColor must apply cleanly to Bayside Titan');
  assert.ok(rig1.paintMat.clearcoat >= 0.75 && rig1.paintMat.clearcoat < 0.9, 'Bayside Titan must preserve rugged satin-clearcoat SUV profile');
  assert.ok(rig1.glassMat instanceof THREE.MeshPhysicalMaterial);
  assert.equal(rig1.glassMat.transparent, true);
  assert.ok(rig1.glassMat.opacity >= 0.25 && rig1.glassMat.opacity <= 0.5, 'SUV glass must stay transparent enough to reveal interior');
  assert.equal(rig1.glassMat.depthWrite, false);

  // Headlight, brake-light & headlight beam integration contract
  assert.ok(rig1.headlightMat instanceof THREE.MeshStandardMaterial);
  assert.ok(rig1.brakeLightMat instanceof THREE.MeshStandardMaterial);
  assert.ok(rig1.headlightBeam instanceof THREE.Mesh);

  // 3-tier LOD with 2-row + cargo SUV interior, brushed trim, emblems, wipers & flush seams
  const lod = rig1.bodyGroup.children.find((c): c is THREE.LOD => c instanceof THREE.LOD);
  assert.ok(lod, 'Bayside Titan bodyGroup must include distance-based THREE.LOD');
  assert.ok(lod.levels.length >= 3, 'Bayside Titan LOD must have near, medium, and far tiers');
  assert.ok(lod.levels[0].object.children.length >= 11, 'near LOD must include full interior, brushed trim, handles, emblems, wipers, and seams');
  assert.ok(
    lod.levels[1].object.children.length >= 3 &&
      lod.levels[1].object.children.length < lod.levels[0].object.children.length,
    'medium LOD must reduce draw complexity relative to near LOD',
  );

  // Grounding, elevated SUV clearance & overall roof-rail height verification (~1.82m)
  rig1.root.updateMatrixWorld(true);
  const rigBox = new THREE.Box3().setFromObject(rig1.root);
  const bodyBox = new THREE.Box3().setFromObject(rig1.bodyGroup);
  assert.ok(rigBox.min.y >= -0.002, `Bayside Titan must sit flush on ground y=0, got min.y=${rigBox.min.y}`);
  assert.ok(bodyBox.min.y >= 0.28, `Bayside Titan body & side steps must preserve elevated SUV ground clearance, got min.y=${bodyBox.min.y}`);
  assert.ok(
    Math.abs(rigBox.max.y - VEHICLE_CATALOG.bayside_titan.height) < 0.06,
    `Bayside Titan roof-rail height should match catalog ~1.82m, got ${rigBox.max.y}`,
  );

  // Shared GPU geometry cache reused across multiple Bayside Titan instances
  const tBody1 = rig1.bodyGroup.children[0] as THREE.Mesh;
  const tBody2 = rig2.bodyGroup.children[0] as THREE.Mesh;
  assert.equal(tBody1.geometry, tBody2.geometry, 'multiple Bayside Titan instances must reuse shared cached geometry');

  // Non-regression: Veloce GT, Solstice Royale, and VCPD Interceptor remain distinct and intact
  const veloceRig = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const solsticeRig = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow);
  const policeRig = createVehicleMesh(VEHICLE_CATALOG.vcpd_interceptor, dummyShadow);
  assert.notEqual((veloceRig.bodyGroup.children[0] as THREE.Mesh).geometry, tBody1.geometry, 'Veloce GT must keep its own unique geometry');
  assert.notEqual((solsticeRig.bodyGroup.children[0] as THREE.Mesh).geometry, tBody1.geometry, 'Solstice Royale must keep its own unique geometry');
  assert.notEqual((policeRig.bodyGroup.children[0] as THREE.Mesh).geometry, tBody1.geometry, 'VCPD Interceptor must keep its own unique geometry');
  assert.ok(policeRig.policeRedMat && policeRig.policeBlueMat, 'VCPD Interceptor emergency lightbar must remain intact');

  rig1.dispose();
  rig2.dispose();
  veloceRig.dispose();
  solsticeRig.dispose();
  policeRig.dispose();
  disposeSharedVehicleResources();
  dummyShadow.dispose();
});

test('Phase 2C-3A: Civilian traffic sedan parametric profile enforces compact everyday 4-door proportions distinct from Veloce GT, Solstice Royale, and Bayside Titan', () => {
  // Exact spec dimensions matching TRAFFIC_SEDAN_SPEC (4.35 x 1.94 x 1.38, wheelRadius = 0.34)
  assert.equal(TRAFFIC_SEDAN_DIMS.length, 4.35);
  assert.equal(TRAFFIC_SEDAN_DIMS.width, 1.94);
  assert.equal(TRAFFIC_SEDAN_DIMS.height, 1.38);
  assert.equal(TRAFFIC_SEDAN_DIMS.wheelRadius, 0.34);
  assert.equal(TRAFFIC_SEDAN_DIMS.wheelWidth, 0.23);

  // Distinct compact commuter envelope compared to all other upgraded vehicles
  assert.ok(
    TRAFFIC_SEDAN_DIMS.length < SOLSTICE_ROYALE_DIMS.length - 0.5,
    'City Cruiser must be clearly more compact than the Solstice Royale flagship sedan',
  );
  assert.ok(
    TRAFFIC_SEDAN_DIMS.width < SOLSTICE_ROYALE_DIMS.width - 0.14,
    'City Cruiser must be narrower than Solstice Royale',
  );
  assert.ok(
    TRAFFIC_SEDAN_DIMS.height > VELOCE_GT_DIMS.height + 0.1 &&
      TRAFFIC_SEDAN_DIMS.height < BAYSIDE_TITAN_DIMS.height - 0.4,
    'City Cruiser height must sit cleanly between Veloce GT sports coupe and Bayside Titan SUV',
  );

  // Cross-section validity along the full body length [-2.175, +2.175]
  const samples = [-2.175, -1.8, -1.34, -0.72, 0.0, 0.65, 1.34, 1.8, 2.175];
  for (const z of samples) {
    const s = evaluateTrafficSedanSection(z);
    assert.ok(Number.isFinite(s.sillY) && Number.isFinite(s.beltY) && Number.isFinite(s.deckY));
    assert.ok(s.halfWidthMid <= TRAFFIC_SEDAN_DIMS.width * 0.5 + 0.002, `width exceeds spec at z=${z}`);
    assert.ok(s.beltY > s.lowerBeltY && s.lowerBeltY > s.sillY, `monotonic vertical profile violated at z=${z}`);
    assert.ok(s.sillY >= TRAFFIC_SEDAN_DIMS.groundClearance - 0.005, `sill dips below clearance at z=${z}`);
  }

  // Front and rear wheel arches clear the 0.34m commuter wheels
  const frontArchSec = evaluateTrafficSedanSection(TRAFFIC_SEDAN_DIMS.frontAxleZ);
  const rearArchSec = evaluateTrafficSedanSection(TRAFFIC_SEDAN_DIMS.rearAxleZ);
  assert.equal(frontArchSec.inFrontArch, true);
  assert.equal(rearArchSec.inRearArch, true);
  assert.ok(
    frontArchSec.sillY >= TRAFFIC_SEDAN_DIMS.wheelRadius + 0.37,
    `front wheel arch must clear 0.34m wheel cleanly, got ${frontArchSec.sillY}`,
  );
  assert.ok(
    rearArchSec.sillY >= TRAFFIC_SEDAN_DIMS.wheelRadius + 0.37,
    `rear wheel arch must clear 0.34m wheel cleanly, got ${rearArchSec.sillY}`,
  );

  // Compact 4-door cabin aperture open mid-cabin and closed at hood/trunk
  const midCabin = evaluateTrafficSedanSection(0.2);
  const hoodMid = evaluateTrafficSedanSection(-1.45);
  const trunkMid = evaluateTrafficSedanSection(1.85);
  assert.ok(midCabin.cabinOpenHalfWidth > 0.65, '4-door cabin aperture must be open across mid-cabin');
  assert.equal(hoodMid.cabinOpenHalfWidth, 0, 'hood section must remain closed');
  assert.equal(trunkMid.cabinOpenHalfWidth, 0, 'trunk deck section must remain closed');

  // Roofline hits ~1.38m crown cleanly
  const roofPeak = sampleTrafficSedanRoofRail(0.34);
  assert.ok(
    Math.abs(roofPeak.crownY - TRAFFIC_SEDAN_DIMS.height) < 0.025,
    `roof peak must match 1.38m spec height, got ${roofPeak.crownY}`,
  );
});

test('Phase 2C-3A: Civilian traffic sedan geometries have valid finite buffers, outward normals, solid 3D roof edges, rounded 0.34m wheels, and visible interior', () => {
  const bodyShell = buildTrafficBodyShellGeometry();
  const roof = buildTrafficRoofGeometry();
  const glass = buildTrafficGlassGeometry();
  const pillars = buildTrafficPillarsGeometry();
  const front = buildTrafficFrontFasciaGeometry();
  const rear = buildTrafficRearFasciaGeometry();
  const ext = buildTrafficExteriorDetailsGeometry();
  const interior = buildTrafficInteriorGeometry();
  const wheel = buildTrafficWheelParts();

  const allGeos: Array<[string, THREE.BufferGeometry]> = [
    ['bodyShell', bodyShell],
    ['paintedRoof', roof.paintedRoof],
    ['roofEdges', roof.roofEdges],
    ['roofHeadliner', roof.roofHeadliner],
    ['windshield', glass.windshield],
    ['rearGlass', glass.rearGlass],
    ['sideWindowL', glass.sideWindowL],
    ['sideWindowR', glass.sideWindowR],
    ['sideWindowsMerged', glass.sideWindowsMerged],
    ['paintedPillars', pillars.paintedPillars],
    ['darkPillarsAndTrim', pillars.darkPillarsAndTrim],
    ['grilleDark', front.grilleDark],
    ['grilleChromeAccent', front.grilleChromeAccent],
    ['hlHousings', front.hlHousings],
    ['hlEmissiveOptics', front.hlEmissiveOptics],
    ['hlAmberMarkers', front.hlAmberMarkers],
    ['hlClearLenses', front.hlClearLenses],
    ['taillightEmissive', rear.taillightEmissive],
    ['rearDarkValance', rear.rearDarkValance],
    ['rearChromeAccent', rear.rearChromeAccent],
    ['licensePlate', rear.licensePlate],
    ['paintedMirrorsAndHandles', ext.paintedMirrorsAndHandles],
    ['darkMirrorsAndUnderbody', ext.darkMirrorsAndUnderbody],
    ['panelSeams', ext.panelSeams],
    ['cabinTub', interior.cabinTub],
    ['seats', interior.seats],
    ['dashAndWheel', interior.dashAndWheel],
    ['wheel.tireGeo', wheel.tireGeo],
    ['wheel.rimAlloyGeo', wheel.rimAlloyGeo],
    ['wheel.hubCapGeo', wheel.hubCapGeo],
    ['wheel.rotorGeo', wheel.rotorGeo],
  ];

  for (const [name, geo] of allGeos) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 0, `${name} must have vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} must have matching normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) &&
          Number.isFinite(pos.getY(i)) &&
          Number.isFinite(pos.getZ(i)),
        `${name} has non-finite position at vertex ${i}`,
      );
      assert.ok(
        Number.isFinite(norm.getX(i)) &&
          Number.isFinite(norm.getY(i)) &&
          Number.isFinite(norm.getZ(i)),
        `${name} has non-finite normal at vertex ${i}`,
      );
    }
  }

  const meanNormal = (geo: THREE.BufferGeometry): THREE.Vector3 => {
    const n = geo.getAttribute('normal');
    const sum = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) {
      sum.x += n.getX(i);
      sum.y += n.getY(i);
      sum.z += n.getZ(i);
    }
    return sum.divideScalar(n.count);
  };

  // Outward normal checks for roof and all glass surfaces
  const roofN = meanNormal(roof.paintedRoof);
  const wsN = meanNormal(glass.windshield);
  const rgN = meanNormal(glass.rearGlass);
  const swLN = meanNormal(glass.sideWindowL);
  const swRN = meanNormal(glass.sideWindowR);

  assert.ok(roofN.y > 0.85, `paintedRoof normal must point upward, got ${roofN.y}`);
  assert.ok(wsN.y > 0.4 && wsN.z < -0.4, `windshield normal must point up & forward, got (${wsN.y}, ${wsN.z})`);
  assert.ok(rgN.y > 0.4 && rgN.z > 0.4, `rearGlass normal must point up & rearward, got (${rgN.y}, ${rgN.z})`);
  assert.ok(swLN.x < -0.5, `left side window normal must point -X, got ${swLN.x}`);
  assert.ok(swRN.x > 0.5, `right side window normal must point +X, got ${swRN.x}`);

  // Solid 3D roof slab perimeter skirts prevent back-face vanishing from low camera angles
  roof.roofEdges.computeBoundingBox();
  const roofEdgeBox = roof.roofEdges.boundingBox!;
  assert.ok(
    roofEdgeBox.max.y - roofEdgeBox.min.y >= 0.024,
    `roof edge skirts must provide solid vertical thickness, got ${roofEdgeBox.max.y - roofEdgeBox.min.y}`,
  );

  // Flush-proud front headlights & rear taillights tucked cleanly within sedan width
  front.hlEmissiveOptics.computeBoundingBox();
  const hlBox = front.hlEmissiveOptics.boundingBox!;
  assert.ok(hlBox.min.z <= -2.175, `headlight optics must sit flush-proud of nose skin, got min.z=${hlBox.min.z}`);
  assert.ok(hlBox.max.x <= TRAFFIC_SEDAN_DIMS.width * 0.5, 'headlight optics must stay within sedan width');

  rear.taillightEmissive.computeBoundingBox();
  const tlBox = rear.taillightEmissive.boundingBox!;
  assert.ok(tlBox.max.z >= 2.18, `taillights must sit flush-proud of rear tail skin, got max.z=${tlBox.max.z}`);
  assert.ok(tlBox.max.x <= TRAFFIC_SEDAN_DIMS.width * 0.5, 'taillights must stay tucked within rear fender width');

  // Rounded 0.34m touring tire geometry dimensions
  wheel.tireGeo.computeBoundingBox();
  const tireBox = wheel.tireGeo.boundingBox!;
  assert.ok(
    Math.abs((tireBox.max.y - tireBox.min.y) * 0.5 - TRAFFIC_SEDAN_DIMS.wheelRadius) < 0.008,
    `tire radius must match 0.34m, got ${(tireBox.max.y - tireBox.min.y) * 0.5}`,
  );
  assert.ok(
    Math.abs(tireBox.max.x - tireBox.min.x - TRAFFIC_SEDAN_DIMS.wheelWidth) < 0.008,
    `tire width must match 0.23m, got ${tireBox.max.x - tireBox.min.x}`,
  );

  // Lightweight geometry budget for smooth 14+ car traffic rendering
  const bodyVerts = bodyShell.getAttribute('position').count;
  assert.ok(bodyVerts < 4500, `traffic sedan body shell should remain lightweight (<4500 verts), got ${bodyVerts}`);

  for (const [, geo] of allGeos) geo.dispose();
});

test('Phase 2C-3A: Civilian traffic sedan VehicleRig preserves overrideColor variations, independent brake lights, shared GPU resources, TrafficSystem 14-car lifecycle, and non-regression', () => {
  const dummyShadow = new THREE.Texture();
  const trafficSpec = {
    id: 'traffic_car',
    name: 'City Cruiser',
    subtitle: 'Traffic Vehicle',
    kind: VehicleKind.Traffic,
    color: 0x3b82f6,
    accentColor: 0x1e293b,
    maxSpeed: 15,
    reverseSpeed: 6,
    acceleration: 8,
    braking: 16,
    turnRate: 2.0,
    grip: 7,
    driftGrip: 3,
    length: 4.35,
    width: 1.94,
    height: 1.38,
    price: 0,
  };

  // Verify every coastal TRAFFIC_COLORS override applies cleanly with Traffic paint profile
  const trafficProfile = getVehiclePaintMaterialProfile(VehicleKind.Traffic);
  const colorRigs = TRAFFIC_COLORS.map((hex) => createVehicleMesh(trafficSpec, dummyShadow, hex));
  assert.equal(colorRigs.length, TRAFFIC_COLORS.length);

  for (let i = 0; i < TRAFFIC_COLORS.length; i++) {
    const rig = colorRigs[i];
    assert.equal(
      rig.paintMat.color.getHex(),
      TRAFFIC_COLORS[i],
      `overrideColor 0x${TRAFFIC_COLORS[i].toString(16)} must apply cleanly`,
    );
    assert.equal(rig.paintMat.roughness, trafficProfile.roughness);
    assert.equal(rig.paintMat.clearcoat, trafficProfile.clearcoat);
    assert.equal(rig.wheels.length, 4);
  }

  const rigA = colorRigs[0];
  const rigB = colorRigs[1];

  // Shared GPU geometries AND shared static materials across simultaneous traffic cars
  const paintedMeshA = rigA.bodyGroup.children[0] as THREE.Mesh;
  const paintedMeshB = rigB.bodyGroup.children[0] as THREE.Mesh;
  assert.equal(paintedMeshA.geometry, paintedMeshB.geometry, 'traffic sedans must reuse shared painted geometry');
  assert.equal(rigA.glassMat, rigB.glassMat, 'traffic sedans should share static transparent glassMat');
  assert.equal(rigA.headlightBeam.geometry, rigB.headlightBeam.geometry, 'traffic sedans should share headlight beam geometry');

  const wheelTireA = (rigA.wheels[0].children[0].children[0] as THREE.Mesh);
  const wheelTireB = (rigB.wheels[0].children[0].children[0] as THREE.Mesh);
  assert.equal(wheelTireA.geometry, wheelTireB.geometry, 'traffic sedans must share wheel tire geometry');
  assert.equal(wheelTireA.material, wheelTireB.material, 'traffic sedans must share static tire material');

  // Per-instance paintMat and brakeLightMat must remain strictly independent
  assert.notEqual(rigA.paintMat, rigB.paintMat, 'each traffic car needs an independent paintMat for color variation');
  assert.notEqual(rigA.brakeLightMat, rigB.brakeLightMat, 'each traffic car needs an independent brakeLightMat for braking');
  rigA.brakeLightMat.emissiveIntensity = 2.85;
  rigB.brakeLightMat.emissiveIntensity = 0.4;
  assert.equal(rigA.brakeLightMat.emissiveIntensity, 2.85);
  assert.equal(rigB.brakeLightMat.emissiveIntensity, 0.4);

  // Transparent automotive glass PBR contract
  assert.ok(rigA.glassMat instanceof THREE.MeshPhysicalMaterial);
  assert.equal(rigA.glassMat.transparent, true);
  assert.ok(rigA.glassMat.ior >= 1.48 && rigA.glassMat.clearcoat >= 0.95 && rigA.glassMat.roughness <= 0.08);
  assert.equal(rigA.glassMat.depthWrite, false);

  // 3-tier distance LOD for lightweight distant traffic rendering
  const lod = rigA.bodyGroup.children.find((c): c is THREE.LOD => c instanceof THREE.LOD);
  assert.ok(lod, 'traffic sedan bodyGroup must include distance-based THREE.LOD');
  assert.ok(lod.levels.length >= 3, 'traffic sedan LOD must include near, medium, and far tiers');
  assert.ok(lod.levels[0].object.children.length >= 4, 'near LOD must render cabin, seats, license plate, and panel seams');
  assert.ok(
    lod.levels[1].object.children.length < lod.levels[0].object.children.length,
    'medium LOD must reduce draw complexity relative to near LOD',
  );

  // Grounding & overall dimensions (~4.35m x 1.94m x 1.38m)
  rigA.root.updateMatrixWorld(true);
  const rigBox = new THREE.Box3().setFromObject(rigA.root);
  const bodyBox = new THREE.Box3().setFromObject(rigA.bodyGroup);
  assert.ok(rigBox.min.y >= -0.002, `traffic sedan must sit flush on ground y=0, got min.y=${rigBox.min.y}`);
  assert.ok(bodyBox.min.y >= 0.18, `traffic sedan body must preserve commuter ground clearance, got ${bodyBox.min.y}`);
  assert.ok(
    Math.abs(rigBox.max.y - trafficSpec.height) < 0.04,
    `traffic sedan roof height should match ~1.38m, got ${rigBox.max.y}`,
  );

  // Disposing one instance must NOT break remaining active traffic cars
  rigB.dispose();
  assert.ok(rigA.bodyGroup.children.length > 0 && rigA.glassMat.transparent === true);

  // Real TrafficSystem integration: spawns all 14 sedans, advances traffic, spins 0.34m wheels, and disposes cleanly
  const trafficSystem = new TrafficSystem(dummyShadow);
  const obstaclesBefore = trafficSystem.getObstaclePositions();
  assert.equal(obstaclesBefore.length, 14, 'TrafficSystem must continue spawning 14 civilian traffic sedans');
  assert.equal(trafficSystem.root.children.length, 14, 'TrafficSystem root must hold all 14 traffic sedan rigs');
  trafficSystem.update(0.05, 999, 999, 0.5, []);
  const obstaclesAfter = trafficSystem.getObstaclePositions();
  assert.ok(
    obstaclesAfter.some(
      (pos, idx) =>
        Math.hypot(pos.x - obstaclesBefore[idx].x, pos.z - obstaclesBefore[idx].z) > 0.1,
    ),
    'moving traffic sedans must advance cleanly during TrafficSystem.update()',
  );
  trafficSystem.dispose();

  // Non-regression: Veloce GT, Solstice Royale, Bayside Titan, and VCPD Interceptor remain untouched
  const veloceRig = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const solsticeRig = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow);
  const titanRig = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow);
  const policeRig = createVehicleMesh(VEHICLE_CATALOG.vcpd_interceptor, dummyShadow);

  assert.notEqual((veloceRig.bodyGroup.children[0] as THREE.Mesh).geometry, paintedMeshA.geometry);
  assert.notEqual((solsticeRig.bodyGroup.children[0] as THREE.Mesh).geometry, paintedMeshA.geometry);
  assert.notEqual((titanRig.bodyGroup.children[0] as THREE.Mesh).geometry, paintedMeshA.geometry);
  assert.notEqual((policeRig.bodyGroup.children[0] as THREE.Mesh).geometry, paintedMeshA.geometry);
  assert.ok(policeRig.policeRedMat && policeRig.policeBlueMat, 'VCPD Interceptor lightbar must remain intact');

  for (let i = 0; i < colorRigs.length; i++) {
    if (i !== 1) colorRigs[i].dispose();
  }
  veloceRig.dispose();
  solsticeRig.dispose();
  titanRig.dispose();
  policeRig.dispose();
  disposeSharedVehicleResources();
  dummyShadow.dispose();
});

test('Phase 2C-3B: VCPD Interceptor geometry has distinct pursuit proportions, two-tone livery, push-bar, lightbar, patrol interior, 0.34m wheels, and valid normals', () => {
  const nose = evaluateVcpdBodySection(-2.335);
  const cowl = evaluateVcpdBodySection(-0.78);
  const mid = evaluateVcpdBodySection(0.1);
  const rearArch = evaluateVcpdBodySection(VCPD_INTERCEPTOR_DIMS.rearAxleZ);
  const roofPeak = sampleVcpdRoofRail(0.32);

  assert.ok(VCPD_INTERCEPTOR_DIMS.wheelRadius === 0.34, 'VCPD wheelRadius must match PoliceSystem 0.34m divisor');
  assert.ok(VCPD_INTERCEPTOR_DIMS.length === 4.75);
  assert.ok(VCPD_INTERCEPTOR_DIMS.width === 2.08);
  assert.ok(mid.halfWidthMid > 0.96 && mid.halfWidthMid <= 1.04, 'broad pursuit body width within 2.08m catalog spec');
  assert.ok(nose.beltY < cowl.beltY && cowl.cabinOpenHalfWidth === 0);
  assert.ok(rearArch.inRearArch && rearArch.sillY > VCPD_INTERCEPTOR_DIMS.wheelRadius + 0.35);
  assert.ok(roofPeak.crownY >= 1.43 && roofPeak.crownY <= 1.47, `pursuit roofline crown expected ~1.45-1.46m, got ${roofPeak.crownY}`);

  const body = buildVcpdBodyShellGeometry();
  const roof = buildVcpdRoofGeometry();
  const glass = buildVcpdGlassGeometry();
  const pillars = buildVcpdPillarsGeometry();
  const front = buildVcpdFrontFasciaGeometry();
  const lightbar = buildVcpdLightbarGeometry();
  const rear = buildVcpdRearFasciaGeometry();
  const ext = buildVcpdExteriorDetailsGeometry();
  const interior = buildVcpdInteriorGeometry();
  const wheel = buildVcpdWheelParts();

  const allGeos: Array<[string, THREE.BufferGeometry]> = [
    ['hullBodyShell', body.hullBodyShell],
    ['whiteDoorPanels', body.whiteDoorPanels],
    ['doorDecals', body.doorDecals],
    ['whiteRoof', roof.whiteRoof],
    ['roofEdges', roof.roofEdges],
    ['roofHeadliner', roof.roofHeadliner],
    ['windshield', glass.windshield],
    ['rearGlass', glass.rearGlass],
    ['sideWindowL', glass.sideWindowL],
    ['sideWindowR', glass.sideWindowR],
    ['sideWindowsMerged', glass.sideWindowsMerged],
    ['paintedPillars', pillars.paintedPillars],
    ['darkPillarsAndTrim', pillars.darkPillarsAndTrim],
    ['grilleAndPushBarDark', front.grilleAndPushBarDark],
    ['grilleChromeAccent', front.grilleChromeAccent],
    ['hlHousings', front.hlHousings],
    ['hlEmissiveOptics', front.hlEmissiveOptics],
    ['hlAmberMarkers', front.hlAmberMarkers],
    ['hlClearLenses', front.hlClearLenses],
    ['barBaseAndHousing', lightbar.barBaseAndHousing],
    ['redEmitters', lightbar.redEmitters],
    ['blueEmitters', lightbar.blueEmitters],
    ['clearOuterDome', lightbar.clearOuterDome],
    ['whiteTakedowns', lightbar.whiteTakedowns],
    ['taillightEmissive', rear.taillightEmissive],
    ['rearDarkValance', rear.rearDarkValance],
    ['rearChromeAccent', rear.rearChromeAccent],
    ['licensePlate', rear.licensePlate],
    ['paintedDetails', ext.paintedDetails],
    ['whiteHandleDetails', ext.whiteHandleDetails],
    ['darkTrimAndUnderbody', ext.darkTrimAndUnderbody],
    ['chromeSpotlightAndAccents', ext.chromeSpotlightAndAccents],
    ['spotlightLens', ext.spotlightLens],
    ['panelSeams', ext.panelSeams],
    ['cabinTub', interior.cabinTub],
    ['seats', interior.seats],
    ['dashAndWheel', interior.dashAndWheel],
    ['prisonerPartition', interior.prisonerPartition],
    ['mdcScreen', interior.mdcScreen],
    ['wheel.tireGeo', wheel.tireGeo],
    ['wheel.rimGeo', wheel.rimGeo],
    ['wheel.chromeCenterCapGeo', wheel.chromeCenterCapGeo],
    ['wheel.rotorGeo', wheel.rotorGeo],
    ['wheel.caliperGeo', wheel.caliperGeo],
  ];

  for (const [name, geo] of allGeos) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 0, `${name} must have vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} must have matching normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) &&
          Number.isFinite(pos.getY(i)) &&
          Number.isFinite(pos.getZ(i)),
        `${name} has non-finite position at vertex ${i}`,
      );
      assert.ok(
        Number.isFinite(norm.getX(i)) &&
          Number.isFinite(norm.getY(i)) &&
          Number.isFinite(norm.getZ(i)),
        `${name} has non-finite normal at vertex ${i}`,
      );
    }
  }

  const meanNormal = (geo: THREE.BufferGeometry): THREE.Vector3 => {
    const n = geo.getAttribute('normal');
    const sum = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) {
      sum.x += n.getX(i);
      sum.y += n.getY(i);
      sum.z += n.getZ(i);
    }
    return sum.divideScalar(n.count);
  };

  const roofN = meanNormal(roof.whiteRoof);
  const headlinerN = meanNormal(roof.roofHeadliner);
  const wsN = meanNormal(glass.windshield);
  const rgN = meanNormal(glass.rearGlass);
  const swLN = meanNormal(glass.sideWindowL);
  const swRN = meanNormal(glass.sideWindowR);

  assert.ok(roofN.y > 0.85, `whiteRoof normal must point upward, got ${roofN.y}`);
  assert.ok(headlinerN.y < -0.85, `roofHeadliner normal must point downward, got ${headlinerN.y}`);
  assert.ok(wsN.y > 0.4 && wsN.z < -0.4, `windshield normal must point up & forward, got (${wsN.y}, ${wsN.z})`);
  assert.ok(rgN.y > 0.4 && rgN.z > 0.4, `rearGlass normal must point up & rearward, got (${rgN.y}, ${rgN.z})`);
  assert.ok(swLN.x < -0.5, `left side window normal must point -X, got ${swLN.x}`);
  assert.ok(swRN.x > 0.5, `right side window normal must point +X, got ${swRN.x}`);

  // Heavy push-bar sits at front nose (-2.375m.. -2.418m), and roof lightbar sits above roof crown (> 1.46m)
  front.grilleAndPushBarDark.computeBoundingBox();
  const pushBarBox = front.grilleAndPushBarDark.boundingBox!;
  assert.ok(pushBarBox.min.z <= -2.375, `front push-bar must extend cleanly in front of nose grille, got ${pushBarBox.min.z}`);

  lightbar.redEmitters.computeBoundingBox();
  lightbar.blueEmitters.computeBoundingBox();
  const redBox = lightbar.redEmitters.boundingBox!;
  const blueBox = lightbar.blueEmitters.boundingBox!;
  assert.ok(redBox.max.x < 0 && blueBox.min.x > 0, 'roof lightbar red emitters occupy left (-X) wing and blue emitters occupy right (+X) wing');
  assert.ok(redBox.max.y > 1.52 && blueBox.max.y > 1.52, 'roof lightbar sits visibly atop patrol roof crown');

  // Wheel radius 0.34m x width 0.25m check
  wheel.tireGeo.computeBoundingBox();
  const tireBox = wheel.tireGeo.boundingBox!;
  assert.ok(
    Math.abs((tireBox.max.y - tireBox.min.y) * 0.5 - VCPD_INTERCEPTOR_DIMS.wheelRadius) < 0.008,
    `tire radius must match 0.34m, got ${(tireBox.max.y - tireBox.min.y) * 0.5}`,
  );
  assert.ok(
    Math.abs(tireBox.max.x - tireBox.min.x - VCPD_INTERCEPTOR_DIMS.wheelWidth) < 0.008,
    `tire width must match 0.25m, got ${tireBox.max.x - tireBox.min.x}`,
  );

  for (const [, geo] of allGeos) geo.dispose();
});

test('Phase 2C-3B: VCPD Interceptor integrates cleanly with PoliceSystem, shared GPU buffers, independent lightbar flashing, LOD, and preserves all other vehicles', () => {
  const dummyShadow = new THREE.Texture();
  const spec = VEHICLE_CATALOG.vcpd_interceptor;

  const unit1 = createVehicleMesh(spec, dummyShadow);
  const unit2 = createVehicleMesh(spec, dummyShadow);

  // Catalog color, VehicleKind.Police PBR profile, and rig contract
  const policeProf = getVehiclePaintMaterialProfile(VehicleKind.Police);
  assert.equal(unit1.paintMat.color.getHex(), spec.color);
  assert.equal(unit1.paintMat.roughness, policeProf.roughness);
  assert.equal(unit1.paintMat.clearcoat, policeProf.clearcoat);
  assert.equal(unit1.wheels.length, 4);
  assert.ok(unit1.policeRedMat instanceof THREE.MeshStandardMaterial);
  assert.ok(unit1.policeBlueMat instanceof THREE.MeshStandardMaterial);

  // Shared GPU geometries & static glass/tires across multiple interceptors
  const hull1 = unit1.bodyGroup.children[0] as THREE.Mesh;
  const hull2 = unit2.bodyGroup.children[0] as THREE.Mesh;
  assert.equal(hull1.geometry, hull2.geometry, 'multiple VCPD Interceptors must share cached GPU hull geometry');
  assert.equal(unit1.glassMat, unit2.glassMat, 'multiple VCPD Interceptors must share static transparent glassMat');
  assert.equal(unit1.headlightBeam.geometry, unit2.headlightBeam.geometry);

  const tire1 = unit1.wheels[0].children[0].children[0] as THREE.Mesh;
  const tire2 = unit2.wheels[0].children[0].children[0] as THREE.Mesh;
  assert.equal(tire1.geometry, tire2.geometry);
  assert.equal(tire1.material, tire2.material);

  // Per-instance mutable materials remain independent (flashing, braking, paint)
  assert.ok(unit1.policeRedMat && unit2.policeRedMat);
  assert.notEqual(unit1.policeRedMat, unit2.policeRedMat);
  assert.notEqual(unit1.policeBlueMat, unit2.policeBlueMat);
  assert.notEqual(unit1.brakeLightMat, unit2.brakeLightMat);
  assert.notEqual(unit1.headlightMat, unit2.headlightMat);

  unit1.policeRedMat.emissiveIntensity = 4.2;
  unit2.policeRedMat.emissiveIntensity = 0.15;
  assert.equal(unit1.policeRedMat.emissiveIntensity, 4.2);
  assert.equal(unit2.policeRedMat.emissiveIntensity, 0.15);

  // 3-tier distance LOD present
  const lod = unit1.bodyGroup.children.find((c): c is THREE.LOD => c instanceof THREE.LOD);
  assert.ok(lod && lod.levels.length >= 3, 'VCPD Interceptor must expose 3-tier distance LOD');
  assert.ok(lod.levels[0].object.children.length >= 6, 'near LOD includes cabin, seats, prisoner partition, MDC screen, decals, plate, seams');

  // Grounding & full body silhouette dimensions (~4.75m x 2.08m x ~1.56m incl. roof lightbar)
  unit1.root.updateMatrixWorld(true);
  const rigBox = new THREE.Box3().setFromObject(unit1.root);
  const bodyBox = new THREE.Box3().setFromObject(unit1.bodyGroup);
  const bodySize = bodyBox.getSize(new THREE.Vector3());
  assert.ok(rigBox.min.y >= -0.002, `VCPD Interceptor must sit flush on ground y=0, got min.y=${rigBox.min.y}`);
  assert.ok(bodyBox.min.y >= 0.19, `VCPD body must maintain realistic ground clearance, got ${bodyBox.min.y}`);
  assert.ok(bodySize.z >= 4.70 && bodySize.z <= 4.86, `VCPD body length incl. push-bar/plate expected ~4.75-4.82m, got ${bodySize.z}`);
  assert.ok(bodySize.x >= 2.02 && bodySize.x <= 2.18, `VCPD body width incl. mirrors/spotlight expected ~2.08-2.16m, got ${bodySize.x}`);

  // Disposing one interceptor does not break remaining active units
  unit2.dispose();
  assert.ok(unit1.bodyGroup.children.length > 0 && unit1.glassMat.transparent === true);

  // Real PoliceSystem integration: spawn wanted pursuit units, verify flashing lightbar + wheel spin + cleanup
  const policeSystem = new PoliceSystem(dummyShadow);
  assert.equal(policeSystem.root.children.length, 4, 'PoliceSystem pre-allocates 4 VCPD Interceptor rigs');
  policeSystem.reportInfraction(100, 1);
  assert.ok(policeSystem.wanted.stars >= 1);

  for (let step = 0; step < 15; step++) {
    policeSystem.update({
      dt: 0.05,
      playerX: 40,
      playerZ: 40,
      playerHeading: 0,
      playerSpeed: 14,
      nightFactor: 0.9,
      colliders: [],
    });
    const visibleUnit = policeSystem.root.children.find((c) => c.visible);
    assert.ok(visibleUnit, 'active pursuit VCPD Interceptor must become visible during wanted chase');
  }
  assert.ok(policeSystem.getActiveBlips().length >= 1);
  // Step enough frames for alternating red/blue phase flip
  let sawRedPeak = false;
  let sawBluePeak = false;
  for (let step = 0; step < 25; step++) {
    policeSystem.update({
      dt: 0.05,
      playerX: 40,
      playerZ: 40,
      playerHeading: 0,
      playerSpeed: 14,
      nightFactor: 0.9,
      colliders: [],
    });
    const u0 = (policeSystem as unknown as { units: Array<{ active: boolean; rig: VehicleRig }> }).units.find((u) => u.active);
    if (u0?.rig.policeRedMat && u0?.rig.policeBlueMat) {
      if (u0.rig.policeRedMat.emissiveIntensity > 3.0 && u0.rig.policeBlueMat.emissiveIntensity < 0.5) sawRedPeak = true;
      if (u0.rig.policeBlueMat.emissiveIntensity > 3.0 && u0.rig.policeRedMat.emissiveIntensity < 0.5) sawBluePeak = true;
      assert.ok(Math.abs(u0.rig.wheels[0].rotation.x) > 0.01, 'PoliceSystem must spin VCPD wheels cleanly');
    }
  }
  assert.ok(sawRedPeak && sawBluePeak, 'PoliceSystem must alternate VCPD red & blue lightbar emitters');
  policeSystem.dispose();

  // Distinctness & non-regression across ALL 5 custom vehicles
  const veloceRig = createVehicleMesh(VEHICLE_CATALOG.veloce_gt, dummyShadow);
  const solsticeRig = createVehicleMesh(VEHICLE_CATALOG.solstice_royale, dummyShadow);
  const titanRig = createVehicleMesh(VEHICLE_CATALOG.bayside_titan, dummyShadow);
  const trafficRig = createVehicleMesh(
    {
      ...spec,
      id: 'traffic_car',
      name: 'City Cruiser',
      kind: VehicleKind.Traffic,
      length: 4.35,
      width: 1.94,
      height: 1.38,
    },
    dummyShadow,
  );

  assert.notEqual((veloceRig.bodyGroup.children[0] as THREE.Mesh).geometry, hull1.geometry);
  assert.notEqual((solsticeRig.bodyGroup.children[0] as THREE.Mesh).geometry, hull1.geometry);
  assert.notEqual((titanRig.bodyGroup.children[0] as THREE.Mesh).geometry, hull1.geometry);
  assert.notEqual((trafficRig.bodyGroup.children[0] as THREE.Mesh).geometry, hull1.geometry);

  unit1.dispose();
  veloceRig.dispose();
  solsticeRig.dispose();
  titanRig.dispose();
  trafficRig.dispose();
  disposeSharedVehicleResources();
  dummyShadow.dispose();
});

test('Phase 2D-1: Downtown custom crown and Art Deco fin geometries have finite vertices, valid normals, and normalized bounds', () => {
  const crownGeo = createSlopedCrownGeometry();
  const finGeo = createArtDecoFinGeometry();

  for (const [label, geo] of [
    ['slopedCrown', crownGeo],
    ['artDecoFin', finGeo],
  ] as const) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 12, `${label} must have valid vertex count`);
    assert.ok(norm && norm.count === pos.count, `${label} must have normals matching vertices`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) &&
          Number.isFinite(pos.getY(i)) &&
          Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} must be finite`,
      );
      const nLen = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(nLen > 0.9 && nLen < 1.1, `${label} normal ${i} must be unit length`);
    }
    assert.ok(geo.boundingBox && geo.boundingSphere, `${label} must compute bounds`);
    assert.ok(geo.boundingBox.min.y >= -0.05 && geo.boundingBox.max.y <= 1.08);
  }

  crownGeo.dispose();
  finGeo.dispose();
});

test('Phase 2D-1: Downtown skyscrapers and Vice Tower use distinct silhouettes, InstancedMesh facade batches, safe PBR day/night lighting, and clean disposal', () => {
  const layout = generateCityLayout();
  const downtownTowers = layout.buildings.filter(
    (b) => b.style === 'skyscraper' || b.style === 'landmark',
  );
  assert.equal(downtownTowers.length, 7, 'Downtown should have 6 skyscrapers + 1 Vice Tower landmark');

  // Every Downtown tower resolves to a distinct architectural archetype and crown kind
  const profiles = downtownTowers.map((b) => resolveDowntownTowerProfile(b));
  assert.equal(new Set(profiles.map((p) => p.archetype)).size, 7);
  assert.equal(new Set(profiles.map((p) => p.crownKind)).size, 7);

  const viceSpec = downtownTowers.find((b) => b.id === 'vice_tower_landmark')!;
  const viceProfile = resolveDowntownTowerProfile(viceSpec);
  assert.equal(viceProfile.archetype, 'vice_tower_art_deco');
  assert.equal(viceProfile.crownKind, 'art_deco_spire');
  assert.equal(viceSpec.x, 0);
  assert.equal(viceSpec.z, -66);
  assert.equal(viceSpec.height, 66);

  // Build full city world and inspect Phase 2D-1 Downtown integration
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const stats = world.downtownArchitectureStats;

  assert.equal(stats.skyscraperCount, 6);
  assert.equal(stats.landmarkCount, 1);
  assert.equal(stats.towerMaterialCount, 7);
  assert.ok(stats.sharedMaterialCount <= 12, 'shared Downtown materials should stay compact');
  assert.ok(stats.instancedBatches >= 7, 'repeated mullions/spandrels/columns/fins should use InstancedMesh batches');
  assert.ok(stats.totalFacadeInstances >= 300, `expected rich instanced facade detail, got ${stats.totalFacadeInstances}`);
  assert.ok(
    stats.viceTowerPinnacleHeight > 85,
    `Vice Tower pinnacle with Art Deco crown and spire should soar above 85m, got ${stats.viceTowerPinnacleHeight}`,
  );

  // Verify Vice Tower group exists at exact coordinates with multi-part Art Deco architecture
  const viceGroup = world.root.getObjectByName('downtown_vice_tower_landmark') as THREE.Group | undefined;
  assert.ok(viceGroup, 'Vice Tower group must be mounted in city world');
  assert.equal(viceGroup.position.x, 0);
  assert.equal(viceGroup.position.z, -66);
  assert.ok(viceGroup.children.length >= 25, 'Vice Tower should be a rich composite Art Deco landmark');

  // Verify all Downtown InstancedMesh batches have valid finite matrices and bounding spheres
  const downtownInstMeshes = world.root.children.filter(
    (c): c is THREE.InstancedMesh =>
      c instanceof THREE.InstancedMesh && c.name.startsWith('downtown_'),
  );
  assert.equal(downtownInstMeshes.length, stats.instancedBatches);
  const tmpMat = new THREE.Matrix4();
  for (const inst of downtownInstMeshes) {
    assert.ok(inst.count > 0);
    assert.ok(
      inst.boundingSphere && Number.isFinite(inst.boundingSphere.radius) && inst.boundingSphere.radius > 0,
      `${inst.name} must have a valid bounding sphere`,
    );
    inst.getMatrixAt(0, tmpMat);
    assert.ok(tmpMat.elements.every((v) => Number.isFinite(v)), `${inst.name} matrices must be finite`);
  }

  // Verify daytime vs night lighting modulation keeps daytime windows/accents below selective HDR bloom threshold
  const weather = new TimeAndWeatherSystem(scene, false);
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 0, -38, world, 0, 0);
  const skyMats = world.emissiveBuildingMaterials.filter(
    (m) => m.roughnessMap === mockTextures.skyscraperRoughness,
  );
  assert.equal(skyMats.length, 7, 'all 7 Downtown towers must register PBR glass curtain-wall materials');
  for (const m of skyMats) {
    assert.ok(m.emissiveIntensity < 0.3, `daytime tower window glow should stay restrained, got ${m.emissiveIntensity}`);
  }
  for (const m of world.neonTrimMaterials) {
    assert.ok(m.emissiveIntensity < 0.9, `daytime architectural accents should stay below bloom threshold, got ${m.emissiveIntensity}`);
  }

  // At Neon Nightlife, tower windows & Vice Tower architectural accents illuminate cleanly
  weather.setTimePreset(TimePreset.Night);
  weather.update(0.05, 0, -38, world, 0, 0);
  for (const m of skyMats) {
    assert.ok(m.emissiveIntensity > 1.2, `night tower windows should illuminate, got ${m.emissiveIntensity}`);
  }
  for (const m of world.neonTrimMaterials) {
    assert.ok(m.emissiveIntensity > 2.0, `night architectural accents should glow, got ${m.emissiveIntensity}`);
  }

  weather.dispose();
  world.dispose();
});

test('Phase 2D-2: Ocean Drive custom Art Deco geometries have finite vertices, valid outward normals, and normalized bounds', () => {
  const roundedCorner = createRoundedCornerGeometry();
  const decoPediment = createArtDecoPedimentGeometry();
  const curvedBalcony = createCurvedBalconySlabGeometry();
  const chamferedBlock = createChamferedBlockGeometry();

  for (const [label, geo] of [
    ['roundedCorner', roundedCorner],
    ['decoPediment', decoPediment],
    ['curvedBalcony', curvedBalcony],
    ['chamferedBlock', chamferedBlock],
  ] as const) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count > 24, `${label} must have genuine sculpted vertex detail`);
    assert.ok(norm && norm.count === pos.count, `${label} must have vertex normals matching positions`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) &&
          Number.isFinite(pos.getY(i)) &&
          Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} must be finite`,
      );
      const nLen = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(nLen > 0.9 && nLen < 1.1, `${label} normal ${i} must be unit length, got ${nLen}`);
    }
    assert.ok(geo.boundingBox && geo.boundingSphere, `${label} must compute bounds`);
    assert.ok(
      geo.boundingBox.min.y >= -0.06 && geo.boundingBox.max.y <= 1.06,
      `${label} Y bounds must be normalized [0..1], got [${geo.boundingBox.min.y}, ${geo.boundingBox.max.y}]`,
    );
  }

  // Verify rounded corner curved arc faces outward (+X/+Z quadrant)
  const rcPos = roundedCorner.getAttribute('position');
  const rcNorm = roundedCorner.getAttribute('normal');
  let outwardArcSamples = 0;
  for (let i = 0; i < rcPos.count; i++) {
    const x = rcPos.getX(i);
    const z = rcPos.getZ(i);
    const nx = rcNorm.getX(i);
    const nz = rcNorm.getZ(i);
    if (x > 0.15 && z > 0.15 && Math.abs(rcNorm.getY(i)) < 0.25) {
      assert.ok(nx * x + nz * z > 0, 'roundedCorner outer arc normals must point outward');
      outwardArcSamples++;
    }
  }
  assert.ok(outwardArcSamples > 12, 'roundedCorner should have curved outer arc faces');

  // Verify curved balcony anchors cleanly at wall plane Z=0 and extends outward to Z=+1
  assert.ok(Math.abs(curvedBalcony.boundingBox!.min.z) < 0.01);
  assert.ok(Math.abs(curvedBalcony.boundingBox!.max.z - 1) < 0.01);

  roundedCorner.dispose();
  decoPediment.dispose();
  curvedBalcony.dispose();
  chamferedBlock.dispose();
});

test('Phase 2D-2: Ocean Drive hotels receive distinct archetypes, aligned balconies, grounded varied rooftops, InstancedMesh batching, day/night PBR calibration, disposal, and preserve Phase 2D-1', () => {
  const layout = generateCityLayout();
  const hotelSpecs = layout.buildings.filter((b) => b.style === 'hotel');
  assert.equal(hotelSpecs.length, 11, 'Ocean Drive should contain all 11 hotel-style buildings');

  // 1. Distinct architectural configurations across hotels
  const profiles = hotelSpecs.map((h) => resolveOceanDriveHotelProfile(h));
  const uniqueArchetypes = new Set(profiles.map((p) => p.archetype));
  const uniqueBalconyPatterns = new Set(profiles.map((p) => p.balconyPattern));
  const uniqueRooftops = new Set(profiles.map((p) => p.rooftopKind));
  const uniqueCornerStyles = new Set(profiles.map((p) => p.cornerStyle));
  assert.ok(uniqueArchetypes.size >= 6, `expected >= 6 distinct hotel archetypes, got ${uniqueArchetypes.size}`);
  assert.ok(uniqueBalconyPatterns.size >= 6, 'expected varied balcony arrangements across archetypes');
  assert.ok(uniqueRooftops.size >= 4, 'expected varied rooftop designs across Ocean Drive');
  assert.equal(uniqueCornerStyles.size, 3, 'expected rounded, chamfered, and fluted pilaster corners');

  // Rooftop pools should appear only on suitable select hotels (not every hotel)
  const poolProfiles = profiles.filter((p) => p.hasRooftopPool);
  assert.ok(
    poolProfiles.length >= 3 && poolProfiles.length <= 5,
    `rooftop pools should be selective rather than on every hotel, got ${poolProfiles.length}/${hotelSpecs.length}`,
  );

  // Build full city world and inspect Ocean Drive integration
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const odStats = world.oceanDriveArchitectureStats;
  const dtStats = world.downtownArchitectureStats;

  // 2. Verify Ocean Drive stats & non-regression of Phase 2D-1 Downtown stats
  assert.equal(odStats.hotelCount, 11);
  assert.equal(odStats.rooftopPoolCount, poolProfiles.length);
  assert.equal(odStats.hotelMaterialCount, 11);
  assert.ok(odStats.sharedMaterialCount <= 18, `shared Ocean Drive material pool should stay compact, got ${odStats.sharedMaterialCount}`);
  assert.ok(odStats.totalBalconyUnits >= 60, `expected rich hotel balconies across Ocean Drive, got ${odStats.totalBalconyUnits}`);
  assert.ok(odStats.instancedBatches >= 10, `expected batched InstancedMesh hotel details, got ${odStats.instancedBatches}`);
  assert.ok(odStats.totalFacadeInstances >= 1200, `expected detailed instanced balconies/railings/trim, got ${odStats.totalFacadeInstances}`);

  // Phase 2D-1 Downtown skyscrapers & Vice Tower must remain completely preserved
  assert.equal(dtStats.skyscraperCount, 6);
  assert.equal(dtStats.landmarkCount, 1);
  assert.ok(dtStats.viceTowerPinnacleHeight > 85);
  assert.ok(world.root.getObjectByName('downtown_vice_tower_landmark'));

  // 3. Verify every hotel group sits at exact layout coordinates with grounded rooftops & pools
  for (const spec of hotelSpecs) {
    const group = world.root.getObjectByName(`ocean_drive_${spec.id}`) as THREE.Group | undefined;
    assert.ok(group, `hotel group ocean_drive_${spec.id} must be mounted`);
    assert.equal(group.position.x, spec.x);
    assert.equal(group.position.z, spec.z);
    assert.ok(group.children.length >= 4, `hotel ${spec.id} must be composite multi-part architecture`);

    const summary = odStats.hotels.find((h) => h.id === spec.id)!;
    assert.ok(summary.balconyCount >= 4, `hotel ${spec.id} must have balconies`);
    assert.ok(summary.pinnacleY > spec.height + 0.5, `hotel ${spec.id} rooftop structures must sit above roof height`);

    const poolMesh = group.getObjectByName(`rooftop_pool_${spec.id}`) as THREE.Mesh | undefined;
    if (summary.hasRooftopPool) {
      assert.ok(poolMesh, `hotel ${spec.id} with rooftop pool must include grounded pool water mesh`);
      assert.ok(
        poolMesh.position.y >= spec.height + 0.5 && poolMesh.position.y <= spec.height + 1.2,
        `pool on ${spec.id} must sit grounded on roof coping (y=${poolMesh.position.y}, roof=${spec.height})`,
      );
    } else {
      assert.equal(poolMesh, undefined, `hotel ${spec.id} without pool must not build a rooftop pool`);
    }
  }

  // 4. Verify all Ocean Drive InstancedMesh batches have finite matrices, valid bounding spheres,
  // and stay clear of Ocean Drive roadway (x >= 89)
  const odInstMeshes = world.root.children.filter(
    (c): c is THREE.InstancedMesh =>
      c instanceof THREE.InstancedMesh && c.name.startsWith('ocean_drive_'),
  );
  assert.equal(odInstMeshes.length, odStats.instancedBatches);

  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const roadEdgeOceanDrive = 96 - 14 / 2; // x = 89.0
  for (const inst of odInstMeshes) {
    assert.ok(inst.count > 0);
    assert.ok(
      inst.boundingSphere && Number.isFinite(inst.boundingSphere.radius) && inst.boundingSphere.radius > 0,
      `${inst.name} must have a valid bounding sphere`,
    );
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, tmpMat);
      assert.ok(tmpMat.elements.every((v) => Number.isFinite(v)), `${inst.name}[${i}] matrix must be finite`);
      tmpPos.setFromMatrixPosition(tmpMat);
      assert.ok(tmpPos.y >= 0, `${inst.name}[${i}] must not sink below ground y=0`);
      assert.ok(
        tmpPos.x < roadEdgeOceanDrive - 2.0,
        `${inst.name}[${i}] must stay well clear of Ocean Drive road (x=${tmpPos.x})`,
      );
    }
  }

  // 5. Verify day vs night PBR lighting modulation (stucco windows stay subtle by day, glow warmly at night)
  const weather = new TimeAndWeatherSystem(scene, false);
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 86, 52, world, 0, 0);

  const hotelFacadeMats = world.emissiveBuildingMaterials.filter(
    (m) => m.roughnessMap === mockTextures.hotelRoughness,
  );
  assert.ok(hotelFacadeMats.length >= 11, 'all 11 Ocean Drive hotels must register PBR stucco/window materials');
  for (const m of hotelFacadeMats) {
    assert.ok(m.emissiveIntensity < 0.25, `daytime hotel window glow must stay subtle, got ${m.emissiveIntensity}`);
  }
  for (const m of world.neonTrimMaterials) {
    assert.ok(m.emissiveIntensity < 0.9, `daytime hotel neon trims must stay below bloom threshold, got ${m.emissiveIntensity}`);
  }

  weather.setTimePreset(TimePreset.Night);
  weather.update(0.05, 86, 52, world, 0, 0);
  for (const m of hotelFacadeMats) {
    assert.ok(m.emissiveIntensity > 1.2, `night hotel windows should illuminate warmly, got ${m.emissiveIntensity}`);
  }
  for (const m of world.neonTrimMaterials) {
    assert.ok(m.emissiveIntensity > 2.0, `night Ocean Drive neon trims should glow, got ${m.emissiveIntensity}`);
  }

  // 6. Clean resource disposal
  weather.dispose();
  world.dispose();
});

test('Phase 2D-3: Coral Heights custom architectural geometries have finite vertices, valid outward normals, and normalized bounds', () => {
  const hippedRoof = createHippedTerracottaRoofGeometry();
  const gableRoof = createGableRoofGeometry();
  const archedFrame = createArchedFrameGeometry();
  const slopedAwning = createSlopedAwningGeometry();
  const corbel = createBalconyCorbelGeometry();

  for (const [label, geo] of [
    ['hippedRoof', hippedRoof],
    ['gableRoof', gableRoof],
    ['archedFrame', archedFrame],
    ['slopedAwning', slopedAwning],
    ['corbel', corbel],
  ] as const) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count >= 18, `${label} must have sculpted vertex geometry`);
    assert.ok(norm && norm.count === pos.count, `${label} must have vertex normals matching positions`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) &&
          Number.isFinite(pos.getY(i)) &&
          Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} must be finite`,
      );
      const nLen = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(nLen > 0.9 && nLen < 1.1, `${label} normal ${i} must be unit length, got ${nLen}`);
    }
    assert.ok(geo.boundingBox && geo.boundingSphere, `${label} must compute bounds`);
    assert.ok(
      geo.boundingBox.min.y >= -0.02 && geo.boundingBox.max.y <= 1.02,
      `${label} Y bounds must be normalized [0..1], got [${geo.boundingBox.min.y}, ${geo.boundingBox.max.y}]`,
    );
  }

  // Verify hipped and gable roof top slopes point upward (+Y)
  for (const [label, geo] of [
    ['hippedRoof', hippedRoof],
    ['gableRoof', gableRoof],
  ] as const) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    let upwardSlopeVerts = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0.5 && norm.getY(i) > 0.35) {
        upwardSlopeVerts++;
      }
    }
    assert.ok(upwardSlopeVerts >= 4, `${label} ridge/slope normals must face outward/upward`);
  }

  // Verify sloped awning and corbel anchor flush at wall plane Z=0 and extend outward to Z=+1
  assert.ok(Math.abs(slopedAwning.boundingBox!.min.z) < 0.01);
  assert.ok(Math.abs(slopedAwning.boundingBox!.max.z - 1) < 0.01);
  assert.ok(Math.abs(corbel.boundingBox!.min.z) < 0.01);
  assert.ok(Math.abs(corbel.boundingBox!.max.z - 1) < 0.01);

  hippedRoof.dispose();
  gableRoof.dispose();
  archedFrame.dispose();
  slopedAwning.dispose();
  corbel.dispose();
});

test('Phase 2D-3: Coral Heights villas, apartments, and neighbourhood shop have distinct archetypes, safe clearances, InstancedMesh batching, subtle day/night PBR, disposal, and preserve Phase 2D-1 & 2D-2', () => {
  const layout = generateCityLayout();
  const coralSpecs = layout.buildings.filter(isCoralHeightsBuildingSpec);

  // 1. Exact Coral Heights residential-district selection (9 buildings; excludes Downtown dt_plaza_shop and Ocean Drive hotels)
  const expectedIds = [
    'res_villa_1',
    'res_villa_2',
    'res_villa_3',
    'res_apt_1',
    'res_apt_2',
    'res_shop_1',
    'north_villa_1',
    'north_apt_1',
    'west_res_1',
  ].sort();
  assert.deepEqual(
    coralSpecs.map((b) => b.id).sort(),
    expectedIds,
    'only the 9 Coral Heights residential-district buildings should route to buildCoralHeightsArchitecture',
  );
  const dtShop = layout.buildings.find((b) => b.id === 'dt_plaza_shop')!;
  assert.equal(isCoralHeightsBuildingSpec(dtShop), false, 'Downtown dt_plaza_shop must NOT route into Coral Heights');
  for (const h of layout.buildings.filter((b) => b.style === 'hotel')) {
    assert.equal(isCoralHeightsBuildingSpec(h), false, `Ocean Drive hotel ${h.id} must NOT route into Coral Heights`);
  }

  // 2. Distinct villa archetypes (4 villas -> 4 distinct archetypes & rooflines)
  const villaProfiles = coralSpecs
    .filter((b) => b.style === 'villa')
    .map((b) => resolveCoralHeightsProfile(b));
  assert.equal(villaProfiles.length, 4);
  assert.equal(new Set(villaProfiles.map((p) => p.archetype)).size, 4, 'all 4 villas must have distinct archetypes');
  assert.equal(new Set(villaProfiles.map((p) => p.roofStyle)).size, 4, 'all 4 villas must have distinct rooflines');

  // 3. Varied apartment complexes (4 apartments -> 4 distinct archetypes, balcony styles & rooftops)
  const aptProfiles = coralSpecs
    .filter((b) => b.style === 'apartment')
    .map((b) => resolveCoralHeightsProfile(b));
  assert.equal(aptProfiles.length, 4);
  assert.equal(new Set(aptProfiles.map((p) => p.archetype)).size, 4, 'all 4 apartments must have distinct archetypes');
  assert.equal(new Set(aptProfiles.map((p) => p.balconyStyle)).size, 4, 'apartments must vary balcony configurations');
  assert.equal(new Set(aptProfiles.map((p) => p.roofStyle)).size, 4, 'apartments must vary rooftop forms');

  // 4. Neighbourhood shop distinct commercial storefront
  const shopSpec = coralSpecs.find((b) => b.id === 'res_shop_1')!;
  const shopProfile = resolveCoralHeightsProfile(shopSpec);
  assert.equal(shopProfile.archetype, 'neighbourhood_corner_shop');
  assert.equal(shopProfile.hasAwning, true);
  assert.equal(shopProfile.hasSignage, true);

  // Build full city world and verify live integration
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const chStats = world.coralHeightsArchitectureStats;
  const odStats = world.oceanDriveArchitectureStats;
  const dtStats = world.downtownArchitectureStats;

  assert.equal(chStats.totalCount, 9);
  assert.equal(chStats.villaCount, 4);
  assert.equal(chStats.apartmentCount, 4);
  assert.equal(chStats.shopCount, 1);
  assert.equal(chStats.buildingMaterialCount, 9);
  assert.ok(chStats.sharedMaterialCount <= 16, `shared Coral Heights materials should stay compact, got ${chStats.sharedMaterialCount}`);
  assert.ok(chStats.instancedBatches >= 11, `expected InstancedMesh batching for repeated details, got ${chStats.instancedBatches}`);
  assert.ok(chStats.totalFacadeInstances >= 900, `expected rich instanced windows/balconies/trims, got ${chStats.totalFacadeInstances}`);
  assert.ok(chStats.totalWindowUnits >= 120, `expected recessed 3D windows across Coral Heights, got ${chStats.totalWindowUnits}`);
  assert.ok(chStats.totalBalconyUnits >= 22, `expected residential balconies across villas/apartments/shop, got ${chStats.totalBalconyUnits}`);

  // 5. Verify mounted groups, exact positions, commercial shop signage & rooftops
  for (const spec of coralSpecs) {
    const group = world.root.getObjectByName(`coral_heights_${spec.id}`) as THREE.Group | undefined;
    assert.ok(group, `group coral_heights_${spec.id} must be mounted in city world`);
    assert.equal(group.position.x, spec.x);
    assert.equal(group.position.z, spec.z);
    assert.ok(group.children.length >= 3, `${spec.id} must be composite multi-part architecture`);
    const summary = chStats.buildings.find((b) => b.id === spec.id)!;
    assert.ok(summary.windowCount >= 8, `${spec.id} must have multi-facade residential windows`);
    assert.ok(summary.pinnacleY > spec.height + 0.4, `${spec.id} roof structure must sit cleanly atop building`);
  }

  const shopGroup = world.root.getObjectByName('coral_heights_res_shop_1') as THREE.Group;
  assert.ok(shopGroup.getObjectByName('coral_shop_sign_+x'), 'shop must mount East boulevard signboard');
  assert.ok(shopGroup.getObjectByName('coral_shop_sign_+z'), 'shop must mount South corner street signboard');

  // 6. Verify all Coral Heights InstancedMesh batches have finite matrices, valid bounding spheres,
  // stay grounded (y >= 0), keep full road & sidewalk clearances, and never encroach on Bayside Palm Park
  const chInstMeshes = world.root.children.filter(
    (c): c is THREE.InstancedMesh =>
      c instanceof THREE.InstancedMesh && c.name.startsWith('coral_heights_'),
  );
  assert.equal(chInstMeshes.length, chStats.instancedBatches);

  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const roadHalf = 7.0; // ROAD_WIDTH / 2
  const sidewalkOuter = 10.5; // ROAD_WIDTH / 2 + SIDEWALK_WIDTH
  for (const inst of chInstMeshes) {
    assert.ok(inst.count > 0);
    assert.ok(
      inst.boundingSphere && Number.isFinite(inst.boundingSphere.radius) && inst.boundingSphere.radius > 0,
      `${inst.name} must compute a valid bounding sphere`,
    );
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, tmpMat);
      assert.ok(tmpMat.elements.every((v) => Number.isFinite(v)), `${inst.name}[${i}] matrix must be finite`);
      tmpPos.setFromMatrixPosition(tmpMat);
      assert.ok(tmpPos.y >= 0, `${inst.name}[${i}] must not sink below ground (y=${tmpPos.y})`);

      // Must never protrude into any actual road strip ([-112..112]) or sidewalk corridor ([-106.5..106.5])
      const inRoadSpanZ = Math.abs(tmpPos.z) <= 112;
      const inRoadSpanX = Math.abs(tmpPos.x) <= 112;
      const inSidewalkSpanZ = Math.abs(tmpPos.z) <= 106.5;
      const inSidewalkSpanX = Math.abs(tmpPos.x) <= 106.5;
      for (const rc of ROAD_COORDS) {
        if (inRoadSpanZ) {
          assert.ok(
            Math.abs(tmpPos.x - rc) > roadHalf + 0.5,
            `${inst.name}[${i}] must stay clear of NS road x=${rc} (got x=${tmpPos.x.toFixed(2)}, z=${tmpPos.z.toFixed(2)})`,
          );
        }
        if (inRoadSpanX) {
          assert.ok(
            Math.abs(tmpPos.z - rc) > roadHalf + 0.5,
            `${inst.name}[${i}] must stay clear of EW road z=${rc} (got x=${tmpPos.x.toFixed(2)}, z=${tmpPos.z.toFixed(2)})`,
          );
        }
        if (inSidewalkSpanZ) {
          assert.ok(
            Math.abs(tmpPos.x - rc) > sidewalkOuter,
            `${inst.name}[${i}] must stay clear of NS sidewalk around x=${rc} (got x=${tmpPos.x.toFixed(2)}, z=${tmpPos.z.toFixed(2)})`,
          );
        }
        if (inSidewalkSpanX) {
          assert.ok(
            Math.abs(tmpPos.z - rc) > sidewalkOuter,
            `${inst.name}[${i}] must stay clear of EW sidewalk around z=${rc} (got x=${tmpPos.x.toFixed(2)}, z=${tmpPos.z.toFixed(2)})`,
          );
        }
      }

      // Must never encroach onto Bayside Palm Park lawn (x in [-82, -46], z in [-68, -44])
      const insidePark =
        tmpPos.x > -82 && tmpPos.x < -46 && tmpPos.z > -68.0 && tmpPos.z < -44.0;
      assert.equal(
        insidePark,
        false,
        `${inst.name}[${i}] must not overlap Bayside Palm Park lawn (x=${tmpPos.x.toFixed(2)}, z=${tmpPos.z.toFixed(2)})`,
      );
    }
  }

  // 7. Verify natural day/night lighting calibration via TimeAndWeatherSystem
  const weather = new TimeAndWeatherSystem(scene, false);
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, -64, -24, world, 0, 0);
  const litWindowBatch = world.root.getObjectByName('coral_heights_lit_glass_inst') as THREE.InstancedMesh;
  const darkWindowBatch = world.root.getObjectByName('coral_heights_dark_glass_inst') as THREE.InstancedMesh;
  const litMat = litWindowBatch.material as THREE.MeshPhysicalMaterial;
  const darkMat = darkWindowBatch.material as THREE.MeshPhysicalMaterial;
  assert.ok(litMat.emissiveIntensity < 0.25, `daytime residential windows must stay subtle, got ${litMat.emissiveIntensity}`);
  assert.ok(darkMat.emissiveIntensity < 0.1, `daytime unlit glass must stay restrained, got ${darkMat.emissiveIntensity}`);

  weather.setTimePreset(TimePreset.Night);
  weather.update(0.05, -64, -24, world, 0, 0);
  assert.ok(litMat.emissiveIntensity > 1.0, `night lit residential windows should glow warmly, got ${litMat.emissiveIntensity}`);
  assert.ok(darkMat.emissiveIntensity < 0.15, `night unlit residential windows must stay dark/reflective, got ${darkMat.emissiveIntensity}`);

  // 8. Verify Phase 2D-1 (Downtown) and Phase 2D-2 (Ocean Drive) remain 100% preserved
  assert.equal(dtStats.skyscraperCount, 6);
  assert.equal(dtStats.landmarkCount, 1);
  assert.ok(dtStats.viceTowerPinnacleHeight > 85);
  assert.ok(world.root.getObjectByName('downtown_vice_tower_landmark'));
  assert.equal(odStats.hotelCount, 11);
  assert.ok(odStats.rooftopPoolCount >= 3 && odStats.rooftopPoolCount <= 5);
  assert.ok(world.root.getObjectByName('ocean_drive_od_hotel_deco'));

  // 9. Clean GPU disposal
  weather.dispose();
  world.dispose();
});

function assertValidGeometryNormals(geo: THREE.BufferGeometry, label: string): void {
  const pos = geo.getAttribute('position');
  if (pos) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      assert.ok(
        Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z),
        `${label}: vertex ${i} has non-finite position (${x}, ${y}, ${z})`,
      );
    }
  }
  const norm = geo.getAttribute('normal');
  if (norm) {
    for (let i = 0; i < norm.count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      assert.ok(
        Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz),
        `${label}: vertex ${i} has non-finite normal (${nx}, ${ny}, ${nz})`,
      );
      const len = Math.hypot(nx, ny, nz);
      assert.ok(
        len > 1e-4,
        `${label}: vertex ${i} has degenerate zero-length normal (${nx}, ${ny}, ${nz})`,
      );
    }
  }
}

test('all vehicle, character, and city geometries have strictly finite non-zero vertex normals (prevents PBR NaN -> bloom blackout)', () => {
  const mockTextures = createMockTextures();

  // 1. Traffic Sedan & VCPD Interceptor (direct regression check for lofted hood/nose vertex 2807)
  const auditGeometryBundle = (bundle: unknown, label: string): void => {
    if (bundle instanceof THREE.BufferGeometry) {
      assertValidGeometryNormals(bundle, label);
      bundle.dispose();
      return;
    }
    if (bundle && typeof bundle === 'object') {
      for (const [k, v] of Object.entries(bundle as Record<string, unknown>)) {
        auditGeometryBundle(v, `${label}.${k}`);
      }
    }
  };

  const trafficBundles: Array<[string, unknown]> = [
    ['traffic_body', buildTrafficBodyShellGeometry()],
    ['traffic_roof', buildTrafficRoofGeometry()],
    ['traffic_pillars', buildTrafficPillarsGeometry()],
    ['traffic_glass', buildTrafficGlassGeometry()],
    ['traffic_front', buildTrafficFrontFasciaGeometry()],
    ['traffic_rear', buildTrafficRearFasciaGeometry()],
    ['traffic_interior', buildTrafficInteriorGeometry()],
    ['traffic_details', buildTrafficExteriorDetailsGeometry()],
    ['vcpd_body', buildVcpdBodyShellGeometry()],
    ['vcpd_roof', buildVcpdRoofGeometry()],
    ['vcpd_pillars', buildVcpdPillarsGeometry()],
    ['vcpd_glass', buildVcpdGlassGeometry()],
    ['vcpd_front', buildVcpdFrontFasciaGeometry()],
    ['vcpd_rear', buildVcpdRearFasciaGeometry()],
    ['vcpd_interior', buildVcpdInteriorGeometry()],
    ['vcpd_details', buildVcpdExteriorDetailsGeometry()],
    ['vcpd_lightbar', buildVcpdLightbarGeometry()],
  ];
  for (const [label, bundle] of trafficBundles) {
    auditGeometryBundle(bundle, label);
  }

  // 2. All drivable vehicles via createVehicleMesh
  for (const spec of Object.values(VEHICLE_CATALOG)) {
    const rig = createVehicleMesh(spec, mockTextures.contactShadowMap);
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BufferGeometry) {
        assertValidGeometryNormals(obj.geometry, `vehicle:${spec.id}:${obj.name || 'mesh'}`);
      }
    });
    rig.dispose();
  }
  disposeSharedVehicleResources();

  // 3. Player & Pedestrians
  const playerRig = createPlayerCharacterRig(mockTextures.contactShadowMap);
  playerRig.root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BufferGeometry) {
      assertValidGeometryNormals(obj.geometry, `player:${obj.name || 'mesh'}`);
    }
  });
  playerRig.dispose();

  const pedGeos = createPedestrianSharedGeometries();
  for (const [k, g] of Object.entries(pedGeos)) {
    if (g instanceof THREE.BufferGeometry) {
      assertValidGeometryNormals(g, `ped:${k}`);
      g.dispose();
    }
  }

  // 4. Full CityWorld (all 5 districts including Phase 2D-1/2D-2/2D-3 + ocean)
  const layout = generateCityLayout();
  const world = buildCityWorld(layout, mockTextures);
  world.root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BufferGeometry) {
      assertValidGeometryNormals(obj.geometry, `world:${obj.name || 'mesh'}`);
    }
  });
  world.dispose();
});

test('DynamicEnvironmentSystem restores full WebGLRenderer state on PMREM success/error, preserves last valid RT on failure, and skips on context loss', () => {
  let activeTarget: THREE.WebGLRenderTarget | null = null;
  let activeCubeFace = 0;
  let activeMipLevel = 0;
  const viewport = new THREE.Vector4(0, 0, 1318, 710);
  const scissor = new THREE.Vector4(0, 0, 1318, 710);
  let scissorTest = false;
  const clearColor = new THREE.Color(0x112233);
  let clearAlpha = 0.75;
  let contextLost = false;
  const callLog: string[] = [];

  const mockRenderer = {
    autoClear: true,
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: true,
    getContext: () => ({ isContextLost: () => contextLost }),
    getRenderTarget: () => activeTarget,
    getActiveCubeFace: () => activeCubeFace,
    getActiveMipmapLevel: () => activeMipLevel,
    setRenderTarget: (rt: THREE.WebGLRenderTarget | null, face = 0, mip = 0) => {
      activeTarget = rt;
      activeCubeFace = face;
      activeMipLevel = mip;
      callLog.push(`setRenderTarget:${rt ? 'rt' : 'null'}:${face}:${mip}`);
    },
    getViewport: (target: THREE.Vector4) => target.copy(viewport),
    setViewport: (v: THREE.Vector4) => {
      viewport.copy(v);
      callLog.push(`setViewport:${v.x},${v.y},${v.z},${v.w}`);
    },
    getScissor: (target: THREE.Vector4) => target.copy(scissor),
    setScissor: (v: THREE.Vector4) => {
      scissor.copy(v);
      callLog.push(`setScissor:${v.x},${v.y},${v.z},${v.w}`);
    },
    getScissorTest: () => scissorTest,
    setScissorTest: (enable: boolean) => {
      scissorTest = enable;
      callLog.push(`setScissorTest:${enable}`);
    },
    getClearColor: (target: THREE.Color) => target.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (c: THREE.Color, a = 1) => {
      clearColor.copy(c);
      clearAlpha = a;
      callLog.push(`setClearColor:${c.getHexString()}:${a}`);
    },
  } as unknown as THREE.WebGLRenderer;

  let shouldThrow = false;
  let rtSeq = 0;
  const disposedIds: string[] = [];

  const makeMockRT = (id: string): THREE.WebGLRenderTarget => {
    const tex = new THREE.Texture();
    tex.name = `env_tex_${id}`;
    return {
      texture: tex,
      dispose: () => {
        callLog.push(`dispose:${id}`);
        disposedIds.push(id);
      },
    } as unknown as THREE.WebGLRenderTarget;
  };

  const mockPmrem: PmremGeneratorLike = {
    compileCubemapShader: () => {},
    fromScene: () => {
      // Simulate PMREM mutating WebGLRenderer state mid-flight
      mockRenderer.autoClear = false;
      mockRenderer.autoClearColor = false;
      mockRenderer.setRenderTarget(makeMockRT('temp_cube'), 3, 2);
      mockRenderer.setViewport(new THREE.Vector4(0, 0, 256, 256));
      mockRenderer.setScissor(new THREE.Vector4(10, 10, 64, 64));
      mockRenderer.setScissorTest(true);
      mockRenderer.setClearColor(new THREE.Color(0x000000), 0);
      if (shouldThrow) {
        throw new Error('simulated_pmrem_failure');
      }
      rtSeq += 1;
      return makeMockRT(`env_${rtSeq}`);
    },
    dispose: () => {},
  };

  const makeSnapshot = (nightFactor: number): EnvironmentAtmosphereSnapshot => ({
    timeHours: nightFactor > 0.5 ? 22.5 : 17.4,
    sunDir: { x: -0.8, y: 0.4, z: -0.4 },
    moonDir: { x: 0.5, y: 0.3, z: -0.8 },
    skyTop: { r: 0.15, g: 0.31, b: 0.52 },
    skyMid: { r: 0.45, g: 0.56, b: 0.7 },
    skyHorizon: { r: 0.87, g: 0.7, b: 0.58 },
    sunColor: { r: 1.0, g: 0.74, b: 0.44 },
    moonColor: { r: 0.61, g: 0.75, b: 0.96 },
    hemiGround: { r: 0.33, g: 0.29, b: 0.28 },
    nightFactor,
    cloudCoverage: 0.25,
    stormDarkness: 0.0,
    rainAmount: 0.0,
  });

  const scene = new THREE.Scene();
  const envSystem = new DynamicEnvironmentSystem(
    mockRenderer,
    scene,
    GraphicsQuality.High,
    false,
    mockPmrem,
  );

  // 1. Initial refresh succeeds and restores every renderer state field cleanly
  assert.equal(envSystem.update(0.016, makeSnapshot(0.18), true), true);
  assert.equal(activeTarget, null);
  assert.equal(activeCubeFace, 0);
  assert.equal(activeMipLevel, 0);
  assert.deepEqual(viewport.toArray(), [0, 0, 1318, 710]);
  assert.deepEqual(scissor.toArray(), [0, 0, 1318, 710]);
  assert.equal(scissorTest, false);
  assert.equal(mockRenderer.autoClear, true);
  assert.equal(mockRenderer.autoClearColor, true);
  assert.equal(clearColor.getHex(), 0x112233);
  assert.equal(clearAlpha, 0.75);
  assert.equal(scene.environment?.name, 'env_tex_env_1');

  // 2. Subsequent refresh disposes old RT strictly AFTER renderer state restoration
  callLog.length = 0;
  assert.equal(envSystem.update(0.016, makeSnapshot(0.95), true), true);
  assert.equal(scene.environment?.name, 'env_tex_env_2');
  assert.deepEqual(disposedIds, ['env_1']);
  const restoreIdx = callLog.lastIndexOf('setScissorTest:false');
  const disposeIdx = callLog.indexOf('dispose:env_1');
  assert.ok(restoreIdx >= 0 && disposeIdx > restoreIdx, 'old RT must be disposed AFTER state restore');

  // 3. Failed refresh restores full renderer state AND preserves previous valid RT without disposing it
  shouldThrow = true;
  assert.equal(envSystem.update(0.016, makeSnapshot(0.1), true), false);
  assert.equal(activeTarget, null);
  assert.deepEqual(viewport.toArray(), [0, 0, 1318, 710]);
  assert.equal(scissorTest, false);
  assert.equal(mockRenderer.autoClear, true);
  assert.equal(clearColor.getHex(), 0x112233);
  assert.equal(clearAlpha, 0.75);
  assert.equal(scene.environment?.name, 'env_tex_env_2', 'previous valid environment must remain bound on error');
  assert.deepEqual(disposedIds, ['env_1'], 'previous valid RT must NOT be disposed on failure');
  const errStats = envSystem.getStats();
  assert.equal(errStats.failedRefreshCount, 1);
  assert.equal(errStats.lastRefreshSuccess, false);
  assert.equal(errStats.lastError, 'simulated_pmrem_failure');

  // 4. Context loss skips PMREM cleanly
  shouldThrow = false;
  contextLost = true;
  assert.equal(envSystem.update(0.016, makeSnapshot(0.5), true), false);
  assert.equal(envSystem.getStats().contextLostSkips, 1);
  assert.equal(scene.environment?.name, 'env_tex_env_2');

  envSystem.dispose();
  assert.equal(scene.environment, null);
});

test('CinematicPostPipeline & shader firewalls guard against NaN/Infinity, unsafe pow/atan, and WebGL context loss', () => {
  // 1. Verify shader firewalls exist in bloom high-pass, grade pass, and env dome
  assert.ok(
    HARDENED_BLOOM_HIGHPASS_FRAGMENT_SHADER.includes('sanitizeHdrColor'),
    'UnrealBloomPass high-pass shader must sanitize NaN/Infinity before 5-mip Gaussian blur',
  );
  assert.ok(
    CinematicGradeShader.fragmentShader.includes('sanitizeHdrColor'),
    'CinematicGradeShader must sanitize HDR buffer samples',
  );
  assert.equal(
    ENV_DOME_FRAGMENT_SHADER.includes('pow((y -'),
    false,
    'ENV_DOME_FRAGMENT_SHADER must not pass negative bases into GLSL pow()',
  );
  assert.ok(
    ENV_DOME_FRAGMENT_SHADER.includes('length(dir.xz) > 1e-4 ? atan(dir.z, dir.x) : 0.0'),
    'ENV_DOME_FRAGMENT_SHADER must guard atan(0, 0) at cubemap poles',
  );

  // 2. Verify CinematicPostPipeline context-loss skip and state-preserving direct fallback
  let contextLost = false;
  let directRenderCalls = 0;
  let scissorTest = false;
  let activeTarget: THREE.WebGLRenderTarget | null = null;
  const clearColor = new THREE.Color(0x0a0b0c);
  let clearAlpha = 1;

  const mockRenderer = {
    autoClear: true,
    toneMappingExposure: 1.0,
    getContext: () => ({ isContextLost: () => contextLost }),
    getSize: (t: THREE.Vector2) => t.set(1318, 710),
    getPixelRatio: () => 1,
    getScissorTest: () => scissorTest,
    setScissorTest: (v: boolean) => {
      scissorTest = v;
    },
    getClearColor: (t: THREE.Color) => t.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (c: THREE.Color, a = 1) => {
      clearColor.copy(c);
      clearAlpha = a;
    },
    setRenderTarget: (rt: THREE.WebGLRenderTarget | null) => {
      activeTarget = rt;
    },
    render: () => {
      directRenderCalls += 1;
    },
  } as unknown as THREE.WebGLRenderer;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1318 / 710, 0.1, 1000);
  const pipeline = new CinematicPostPipeline(
    mockRenderer,
    scene,
    camera,
    false,
    GraphicsQuality.Low,
  );

  // Normal Low-quality direct render
  pipeline.render(0.016);
  assert.equal(directRenderCalls, 1);
  assert.equal(activeTarget, null);
  assert.equal(scissorTest, false);
  assert.equal(pipeline.getDiagnostics().fallbackRenderCount, 1);

  // Context-lost frame must skip cleanly without issuing renderer.render
  contextLost = true;
  pipeline.render(0.016);
  assert.equal(directRenderCalls, 1);
  assert.equal(pipeline.getDiagnostics().contextLostSkips, 1);

  // Context restored resumes rendering cleanly
  contextLost = false;
  pipeline.handleContextRestored();
  pipeline.render(0.016);
  assert.equal(directRenderCalls, 2);

  pipeline.dispose();
});

test('Phase 2D-4: Neon Mile routes strictly the 5 Entertainment club venues with distinct identities and valid custom geometry normals', () => {
  const layout = generateCityLayout();
  const neonSpecs = layout.buildings.filter((b) => isNeonMileBuildingSpec(b));

  const expectedIds = [
    'ent_club_velvet',
    'ent_club_solaris',
    'ent_lounge_amber',
    'ent_theater_vice',
    'south_club_1',
  ];
  assert.equal(neonSpecs.length, 5, 'Neon Mile must route exactly 5 Entertainment club venues');
  assert.deepEqual(
    neonSpecs.map((b) => b.id).sort(),
    [...expectedIds].sort(),
    'Neon Mile routed IDs must match the exact 5 Entertainment venues',
  );

  // Verify non-Entertainment buildings (including Ocean Drive's od_club_south) are NOT routed to Neon Mile
  const odClubSouth = layout.buildings.find((b) => b.id === 'od_club_south');
  assert.ok(odClubSouth, 'od_club_south must exist in layout');
  assert.equal(isNeonMileBuildingSpec(odClubSouth), false, 'Ocean Drive od_club_south must remain an Ocean Drive hotel');
  for (const b of layout.buildings) {
    if (!expectedIds.includes(b.id)) {
      assert.equal(isNeonMileBuildingSpec(b), false, `Building ${b.id} must not be routed to Neon Mile`);
    }
  }

  // Verify all 5 profiles have distinct archetypes, crisp titles, road-facing frontages, and safe sidewalk clearances
  const profiles = neonSpecs.map((s) => ({ spec: s, profile: resolveNeonMileProfile(s) }));
  assert.equal(new Set(profiles.map((p) => p.profile.archetype)).size, 5, 'All 5 Neon Mile venues must have distinct archetypes');

  const byId = new Map(profiles.map((p) => [p.spec.id, p]));
  assert.equal(byId.get('ent_club_velvet')?.profile.signTitle, 'VELVET');
  assert.equal(byId.get('ent_club_velvet')?.profile.neonBand, 'magenta');
  assert.equal(byId.get('ent_club_velvet')?.profile.frontage, '-z');

  assert.equal(byId.get('ent_club_solaris')?.profile.signTitle, 'SOLARIS');
  assert.equal(byId.get('ent_club_solaris')?.profile.neonBand, 'cyan');
  assert.equal(byId.get('ent_club_solaris')?.profile.hasVerticalSignTower, true);
  assert.equal(byId.get('ent_club_solaris')?.profile.secondaryFrontage, '+x');

  assert.equal(byId.get('ent_lounge_amber')?.profile.signTitle, 'AMBER LOUNGE');
  assert.equal(byId.get('ent_lounge_amber')?.profile.neonBand, 'amber');
  assert.equal(byId.get('ent_lounge_amber')?.profile.hasRooftopPergola, true);
  assert.equal(byId.get('ent_lounge_amber')?.profile.frontage, '+z');

  assert.equal(byId.get('ent_theater_vice')?.profile.signTitle, 'VICE THEATER');
  assert.equal(byId.get('ent_theater_vice')?.profile.neonBand, 'violet');
  assert.equal(byId.get('ent_theater_vice')?.profile.hasMarquee, true);
  assert.equal(byId.get('ent_theater_vice')?.profile.hasVerticalSignTower, true);

  assert.equal(byId.get('south_club_1')?.profile.signTitle, 'SOUTH CLUB');
  assert.equal(byId.get('south_club_1')?.profile.hasDecorativeLattice, true);
  assert.equal(byId.get('south_club_1')?.profile.frontage, '-z');
  // South Club sits at z=116 (depth 14 -> north wall z=109, north sidewalk outer edge z=106.5 -> clearance = 2.5m)
  assert.ok(
    (byId.get('south_club_1')?.profile.canopyProjection ?? 99) <= 2.0,
    'South Club projecting canopy must leave clear pedestrian sidewalk north of z=106.5',
  );

  // Verify every custom procedural Neon Mile geometry has finite positions, valid bounding sphere, and strictly unit normals
  const customGeos: Array<[string, THREE.BufferGeometry]> = [
    ['curvedDecoBay', createCurvedDecoBayGeometry()],
    ['curvedNeonRibbon', createCurvedNeonRibbonGeometry()],
    ['theaterMarquee', createTheaterMarqueeGeometry()],
    ['steppedDecoCrown', createSteppedDecoCrownGeometry()],
    ['artDecoCornerPylon', createArtDecoCornerPylonGeometry()],
  ];

  for (const [label, geo] of customGeos) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count >= 18, `${label} must have non-trivial procedural vertex count`);
    assert.ok(norm && norm.count === pos.count, `${label} must have vertex normals matching positions`);
    assert.ok(geo.boundingSphere && Number.isFinite(geo.boundingSphere.radius) && geo.boundingSphere.radius > 0);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} position must be finite`,
      );
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(len > 0.85 && len < 1.15, `${label} vertex ${i} normal must be unit-length, got ${len}`);
    }
    geo.dispose();
  }
});

test('Phase 2D-4: buildCityWorld builds Neon Mile with InstancedMesh batching, readable signage, day/night lighting calibration, and zero regressions', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);

  const nm = world.neonMileArchitectureStats;
  assert.equal(nm.totalCount, 5, 'buildCityWorld must build all 5 Neon Mile venues');
  assert.equal(nm.archetypesUsed.length, 5, 'all 5 Neon Mile venue archetypes must be instantiated');
  assert.ok(nm.instancedBatches >= 8, `Neon Mile must batch repeated details into InstancedMeshes, got ${nm.instancedBatches}`);
  assert.ok(nm.totalFacadeInstances >= 180, `Neon Mile must render rich architectural instances, got ${nm.totalFacadeInstances}`);
  assert.ok(nm.sharedMaterialCount <= 24, `Neon Mile shared PBR pool should stay compact, got ${nm.sharedMaterialCount}`);

  // Verify Vice Theater landmark features (projecting 3-face marquee + 2-sided vertical sign tower + 4 posters + stepped crown)
  const viceSummary = nm.venues.find((v) => v.id === 'ent_theater_vice');
  assert.ok(viceSummary, 'Vice Theater summary must be present');
  assert.equal(viceSummary.hasMarquee, true);
  assert.equal(viceSummary.hasVerticalSignTower, true);
  assert.equal(viceSummary.posterCount, 4, 'Vice Theater must render 4 procedural movie/show posters');
  assert.ok(viceSummary.signMeshCount >= 5, 'Vice Theater must render 3 marquee boards + 2 vertical sign tower faces');
  assert.ok(viceSummary.pinnacleY > 24, `Vice Theater crown/tower pinnacle must rise above 24m, got ${viceSummary.pinnacleY}`);

  // Verify all 5 venues have mounted signage planes and grounded heights
  for (const v of nm.venues) {
    assert.ok(v.signMeshCount >= 1, `${v.id} must have readable signage mounted`);
    assert.ok(Number.isFinite(v.pinnacleY) && v.pinnacleY > 14, `${v.id} pinnacleY must be finite and grounded`);
    const group = world.root.getObjectByName(`neon_mile_${v.id}`);
    assert.ok(group, `Scene graph must contain named group neon_mile_${v.id}`);
  }

  // Verify all Neon Mile InstancedMesh batches have finite bounding spheres & finite instance matrices
  const neonInstMeshes: THREE.InstancedMesh[] = [];
  const matCheck = new THREE.Matrix4();
  world.root.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh && obj.name.startsWith('neon_mile_inst_')) {
      neonInstMeshes.push(obj);
      assert.ok(
        obj.boundingSphere && Number.isFinite(obj.boundingSphere.radius) && obj.boundingSphere.radius > 0,
        `${obj.name} must have computed finite boundingSphere`,
      );
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, matCheck);
        for (const elem of matCheck.elements) {
          assert.ok(Number.isFinite(elem), `${obj.name} instance ${i} has non-finite matrix element`);
        }
      }
    }
  });
  assert.equal(neonInstMeshes.length, nm.instancedBatches, 'All reported Neon Mile InstancedMesh batches must exist in scene graph');

  // Verify daytime vs nighttime emissive calibration via TimeAndWeatherSystem (no excessive daytime glow, rich nightlife glow)
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 0, 64, world, 0, 0);
  const daySignIntensities = world.emissiveBuildingMaterials
    .filter((m) => m.emissiveMap != null)
    .map((m) => m.emissiveIntensity);
  assert.ok(daySignIntensities.length >= 12, 'Neon Mile interior glass & signage must use emissiveMaps');
  assert.ok(
    daySignIntensities.every((v) => v <= 0.14),
    `Daytime emissiveMap signage/windows must stay calm (<=0.14), got max ${Math.max(...daySignIntensities)}`,
  );
  const dayNeonIntensities = world.neonTrimMaterials.map((m) => m.emissiveIntensity);
  assert.ok(
    dayNeonIntensities.every((v) => v <= 0.7),
    `Daytime neon trims must stay below bloom threshold (<=0.70), got max ${Math.max(...dayNeonIntensities)}`,
  );

  weather.setTimePreset(TimePreset.Night);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, 0, 64, world, 0, 0);
  const nightSignIntensities = world.emissiveBuildingMaterials
    .filter((m) => m.emissiveMap != null)
    .map((m) => m.emissiveIntensity);
  assert.ok(
    nightSignIntensities.every((v) => v >= 1.35 && v <= 1.65),
    `Nighttime emissiveMap signage/windows must glow cleanly (1.35..1.65), got ${nightSignIntensities[0]}`,
  );
  const nightNeonIntensities = world.neonTrimMaterials.map((m) => m.emissiveIntensity);
  assert.ok(
    nightNeonIntensities.every((v) => v >= 2.55),
    `Nighttime neon trims must bloom richly (>=2.55), got min ${Math.min(...nightNeonIntensities)}`,
  );

  // Verify zero regression on Phase 2D-1 (Downtown), Phase 2D-2 (Ocean Drive), and Phase 2D-3 (Coral Heights)
  assert.ok(world.downtownArchitectureStats.skyscraperCount >= 6, 'Downtown skyscrapers must remain intact');
  assert.equal(world.downtownArchitectureStats.landmarkCount, 1, 'Vice Tower landmark must remain intact');
  assert.equal(world.oceanDriveArchitectureStats.hotelCount, 11, 'All 11 Ocean Drive hotels must remain intact');
  assert.equal(world.coralHeightsArchitectureStats.totalCount, 9, 'All 9 Coral Heights residential buildings must remain intact');

  weather.dispose();
  world.dispose();
});

test('Phase 2D-5: Industrial Harbour routes strictly the 3 warehouse buildings with distinct identities and valid custom geometry normals', () => {
  const layout = generateCityLayout();
  const harbourWarehouses = layout.buildings.filter((b) => isIndustrialHarbourWarehouseSpec(b));

  const expectedIds = ['harbour_wh_1', 'harbour_wh_2', 'west_harbour_1'];
  assert.equal(harbourWarehouses.length, 3, 'Industrial Harbour must route exactly 3 warehouse buildings');
  assert.deepEqual(
    harbourWarehouses.map((b) => b.id).sort(),
    [...expectedIds].sort(),
    'Industrial Harbour routed IDs must match harbour_wh_1, harbour_wh_2, and west_harbour_1',
  );

  // Verify no non-warehouse or non-Harbour building is routed to Industrial Harbour architecture
  for (const b of layout.buildings) {
    if (!expectedIds.includes(b.id)) {
      assert.equal(
        isIndustrialHarbourWarehouseSpec(b),
        false,
        `Building ${b.id} must not be routed to Industrial Harbour architecture`,
      );
    }
  }

  // Verify 3 distinct industrial identities, roof types, palettes, and frontage orientations
  const profiles = harbourWarehouses.map((spec) => ({
    spec,
    profile: resolveIndustrialHarbourProfile(spec),
  }));
  assert.equal(
    new Set(profiles.map((p) => p.profile.archetype)).size,
    3,
    'All 3 Industrial Harbour warehouses must have distinct archetypes',
  );
  assert.equal(
    new Set(profiles.map((p) => p.profile.roofType)).size,
    3,
    'All 3 Industrial Harbour warehouses must have distinct roof silhouettes',
  );
  assert.equal(
    new Set(profiles.map((p) => p.profile.wallBaseTint)).size,
    3,
    'All 3 Industrial Harbour warehouses must have distinct cladding palettes',
  );

  const byId = new Map(profiles.map((p) => [p.spec.id, p]));
  const wh1 = byId.get('harbour_wh_1')!;
  const wh2 = byId.get('harbour_wh_2')!;
  const westWh = byId.get('west_harbour_1')!;

  assert.equal(wh1.profile.archetype, 'freight_distribution_terminal');
  assert.equal(wh1.profile.primaryFrontage, '+z');
  assert.equal(wh1.profile.loadingBayCount, 3);
  assert.equal(wh1.profile.hasWallXBracing, true);

  assert.equal(wh2.profile.archetype, 'marine_cargo_depot');
  assert.equal(wh2.profile.primaryFrontage, '-z');
  assert.equal(wh2.profile.loadingBayCount, 2);
  assert.equal(wh2.profile.hasClerestoryWindows, true);

  assert.equal(westWh.profile.archetype, 'cold_storage_logistics');
  assert.equal(westWh.profile.primaryFrontage, '+x');
  assert.equal(westWh.profile.loadingBayCount, 4);
  assert.equal(westWh.profile.claddingOrientation, 'horizontal');
  assert.equal(westWh.profile.hasRefrigerationPlant, true);

  // Verify every custom procedural Industrial Harbour geometry has finite positions,
  // finite bounding sphere, and strictly unit-length outward vertex normals
  const customGeos: Array<[string, THREE.BufferGeometry]> = [
    ['industrialGableRoof', createIndustrialGableRoofGeometry()],
    ['sawtoothClerestoryRoof', createSawtoothClerestoryRoofGeometry()],
    ['slopedDockCanopy', createSlopedDockCanopyGeometry()],
    ['steelGussetBracket', createSteelGussetBracketGeometry()],
    ['roofVentCowl', createRoofVentCowlGeometry()],
  ];

  for (const [label, geo] of customGeos) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count >= 18, `${label} must have non-trivial procedural vertex count`);
    assert.ok(norm && norm.count === pos.count, `${label} must have vertex normals matching positions`);
    assert.ok(
      geo.boundingSphere && Number.isFinite(geo.boundingSphere.radius) && geo.boundingSphere.radius > 0,
      `${label} must have valid positive boundingSphere`,
    );
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} position must be finite`,
      );
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(len > 0.85 && len < 1.15, `${label} vertex ${i} normal must be unit-length, got ${len}`);
    }
    geo.dispose();
  }
});

test('Phase 2D-5: buildCityWorld builds Industrial Harbour with clearances vs roads/containers/cranes, InstancedMesh batching, lighting calibration, and zero regressions', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const scene = new THREE.Scene();
  const world = buildCityWorld(layout, mockTextures);
  const weather = new TimeAndWeatherSystem(scene, false);

  const ih = world.industrialHarbourArchitectureStats;
  assert.equal(ih.warehouseCount, 3, 'buildCityWorld must build all 3 Industrial Harbour warehouses');
  assert.equal(ih.archetypesUsed.length, 3, 'all 3 Industrial Harbour warehouse archetypes must be used');
  assert.equal(ih.totalLoadingBays, 9, 'Industrial Harbour must build 3 + 2 + 4 = 9 loading bays');
  assert.ok(
    ih.instancedBatches >= 9,
    `Industrial Harbour must batch repeated details into InstancedMeshes, got ${ih.instancedBatches}`,
  );
  assert.ok(
    ih.totalFacadeInstances >= 160,
    `Industrial Harbour must render rich structural instances, got ${ih.totalFacadeInstances}`,
  );
  assert.ok(
    ih.sharedMaterialCount <= 20,
    `Industrial Harbour shared PBR pool should stay compact, got ${ih.sharedMaterialCount}`,
  );
  assert.equal(ih.signageMaterialCount, 3, 'Each of the 3 warehouses must have its own crisp facility signage');

  // Verify named scene groups, mounted signage, grounded heights, and strict clearances
  const containerColliders = layout.colliders.filter((c) => c.id.startsWith('container_'));
  assert.equal(containerColliders.length, 7, 'All 7 Harbour container stack colliders must remain unchanged');
  assert.equal(layout.containers.length, 12, 'All 12 stacked shipping containers must remain unchanged');

  // Both existing gantry crane leg envelopes: centered at (-124, 44) and (-124, 82), legs ±4.5m
  const gantryCraneBoxes = [
    { id: 'crane_north', minX: -128.6, maxX: -119.4, minZ: 39.4, maxZ: 48.6 },
    { id: 'crane_south', minX: -128.6, maxX: -119.4, minZ: 77.4, maxZ: 86.6 },
  ];

  for (const wh of ih.warehouses) {
    const spec = layout.buildings.find((b) => b.id === wh.id)!;
    assert.ok(wh.signMeshCount >= 2, `${wh.id} must have crisp readable signage mounted`);
    assert.ok(
      Number.isFinite(wh.pinnacleY) && wh.pinnacleY > spec.height + 1.5,
      `${wh.id} must have grounded rooftop architecture rising above base shell`,
    );
    const group = world.root.getObjectByName(`industrial_harbour_${wh.id}`);
    assert.ok(group, `Scene graph must contain named group industrial_harbour_${wh.id}`);

    // Verify zero overlap with any shipping container collider
    for (const c of containerColliders) {
      const overlapX = wh.worldBounds.minX < c.maxX && wh.worldBounds.maxX > c.minX;
      const overlapZ = wh.worldBounds.minZ < c.maxZ && wh.worldBounds.maxZ > c.minZ;
      assert.equal(
        overlapX && overlapZ,
        false,
        `${wh.id} architectural bounds must not overlap shipping container ${c.id}`,
      );
    }

    // Verify zero overlap with either gantry crane
    for (const cr of gantryCraneBoxes) {
      const overlapX = wh.worldBounds.minX < cr.maxX && wh.worldBounds.maxX > cr.minX;
      const overlapZ = wh.worldBounds.minZ < cr.maxZ && wh.worldBounds.maxZ > cr.minZ;
      assert.equal(
        overlapX && overlapZ,
        false,
        `${wh.id} architectural bounds must not intersect ${cr.id}`,
      );
    }
  }

  // Specific road & sidewalk clearance checks
  const wh1Summary = ih.warehouses.find((w) => w.id === 'harbour_wh_1')!;
  const wh2Summary = ih.warehouses.find((w) => w.id === 'harbour_wh_2')!;
  const westWhSummary = ih.warehouses.find((w) => w.id === 'west_harbour_1')!;

  assert.ok(wh1Summary.worldBounds.minZ > 43.0, 'harbour_wh_1 north features must stay clear of z=42.5 sidewalk');
  assert.ok(wh1Summary.worldBounds.maxZ < 66.0, 'harbour_wh_1 south loading dock must leave wide container apron');
  assert.ok(wh2Summary.worldBounds.maxZ < 84.5, 'harbour_wh_2 south features must stay clear of z=85.5 sidewalk');
  assert.ok(wh2Summary.worldBounds.minZ > 58.0, 'harbour_wh_2 north loading dock must stay clear of north container');
  assert.ok(
    westWhSummary.worldBounds.maxX < -107.0,
    'west_harbour_1 east loading bays must stay clear of x=-106.5 sidewalk edge',
  );
  assert.ok(
    westWhSummary.worldBounds.maxZ < 38.0,
    'west_harbour_1 south facade must maintain generous clearance from north gantry crane at z=40',
  );

  // Verify all Industrial Harbour InstancedMesh batches have finite bounding spheres & finite instance matrices
  const ihInstMeshes: THREE.InstancedMesh[] = [];
  const matCheck = new THREE.Matrix4();
  world.root.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh && obj.name.startsWith('industrial_harbour_inst_')) {
      ihInstMeshes.push(obj);
      assert.ok(
        obj.boundingSphere && Number.isFinite(obj.boundingSphere.radius) && obj.boundingSphere.radius > 0,
        `${obj.name} must have computed finite boundingSphere`,
      );
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, matCheck);
        for (const elem of matCheck.elements) {
          assert.ok(Number.isFinite(elem), `${obj.name} instance ${i} has non-finite matrix element`);
        }
      }
    }
  });
  assert.equal(
    ihInstMeshes.length,
    ih.instancedBatches,
    'All reported Industrial Harbour InstancedMesh batches must exist in scene graph',
  );

  // Verify daytime, golden hour, nighttime, and rainy-night lighting calibration
  weather.setTimePreset(TimePreset.Afternoon);
  weather.setWeather(WeatherType.Clear, false);
  weather.update(0.05, -72, 62, world, 0, 0);
  assert.ok(
    world.emissiveBuildingMaterials.filter((m) => m.emissiveMap != null).every((m) => m.emissiveIntensity <= 0.14),
    'Daytime industrial clerestory glazing and signage must stay calm without artificial glow',
  );

  weather.setTimePreset(TimePreset.Night);
  weather.setWeather(WeatherType.Rain, false);
  for (let i = 0; i < 40; i++) {
    weather.update(0.05, -72, 62, world, 0, 0);
  }
  assert.ok(
    world.emissiveBuildingMaterials.filter((m) => m.emissiveMap != null).every((m) => m.emissiveIntensity >= 1.35),
    'Nighttime industrial clerestory glazing and signage must remain clearly illuminated',
  );
  assert.ok(weather.roadWetness > 0.5, 'Rainy Harbour weather must drive wet road reflections');

  // Verify zero regression on all 4 prior Phase 2D architectural districts
  assert.ok(world.downtownArchitectureStats.skyscraperCount >= 6, 'Downtown skyscrapers must remain intact');
  assert.equal(world.downtownArchitectureStats.landmarkCount, 1, 'Vice Tower landmark must remain intact');
  assert.equal(world.oceanDriveArchitectureStats.hotelCount, 11, 'All 11 Ocean Drive hotels must remain intact');
  assert.equal(world.coralHeightsArchitectureStats.totalCount, 9, 'All 9 Coral Heights residential buildings must remain intact');
  assert.equal(world.neonMileArchitectureStats.totalCount, 5, 'All 5 Neon Mile venues must remain intact');

  weather.dispose();
  world.dispose();
});

test('Phase 2E-1: palm species assignment is deterministic, covers all 4 tropical species, and validates custom pinnate, Sabal fan, trunk, and coconut geometries', () => {
  const layoutA = generateCityLayout();
  const layoutB = generateCityLayout();
  const palmsA = layoutA.trees.filter((t) => t.kind === 'palm');
  const palmsB = layoutB.trees.filter((t) => t.kind === 'palm');

  assert.equal(palmsA.length, palmsB.length, 'Palm placement count must be deterministic');
  assert.ok(palmsA.length >= 25, `Expected full city palm distribution, got ${palmsA.length}`);

  // Verify deterministic species and coconut assignment across repeated generations
  const counts: Record<string, number> = {
    coconut: 0,
    royal: 0,
    sabal: 0,
    compact_tropical: 0,
  };
  let coconutClusterCount = 0;

  for (let i = 0; i < palmsA.length; i++) {
    const spA = assignPalmSpecies(palmsA[i]);
    const spB = assignPalmSpecies(palmsB[i]);
    assert.equal(spA, spB, `Palm ${i} species assignment must be deterministic`);
    assert.equal(
      hasCoconutCluster(palmsA[i], spA),
      hasCoconutCluster(palmsB[i], spB),
      `Palm ${i} coconut cluster assignment must be deterministic`,
    );
    counts[spA] += 1;
    if (spA !== 'coconut') {
      assert.equal(
        hasCoconutCluster(palmsA[i], spA),
        false,
        `Non-coconut species (${spA}) must never receive coconut clusters`,
      );
    } else if (hasCoconutCluster(palmsA[i], spA)) {
      coconutClusterCount += 1;
    }
  }

  for (const sp of ALL_PALM_SPECIES) {
    assert.ok(counts[sp] >= 3, `Species ${sp} must be well-represented across the city, got ${counts[sp]}`);
  }
  assert.ok(
    coconutClusterCount > 0 && coconutClusterCount <= counts.coconut,
    `Coconut clusters must appear on a subset of coconut palms, got ${coconutClusterCount}/${counts.coconut}`,
  );

  // Helper to verify finite positions, unit normals, and valid bounding box/sphere
  const assertGeometryValid = (geo: THREE.BufferGeometry, label: string) => {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count >= 24, `${label} must have valid vertex positions`);
    assert.ok(norm && norm.count === pos.count, `${label} must have matching vertex normals`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${label} vertex ${i} position must be finite`,
      );
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      assert.ok(Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz), `${label} normal ${i} must be finite`);
      const len = Math.hypot(nx, ny, nz);
      assert.ok(len >= 0.85 && len <= 1.15, `${label} normal ${i} must be unit length, got ${len}`);
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    assert.ok(geo.boundingBox && !geo.boundingBox.isEmpty(), `${label} must have valid boundingBox`);
    assert.ok(
      geo.boundingSphere && Number.isFinite(geo.boundingSphere.radius) && geo.boundingSphere.radius > 0,
      `${label} must have finite positive boundingSphere`,
    );
  };

  // Validate individual pinnate feather frond geometry (paired left & right leaflets + lateral spread)
  const frond = createPinnateFrondGeometry({
    length: 3.4,
    archHeight: 0.72,
    tipDrop: 1.05,
    leafletPairs: 16,
    maxLeafletLength: 0.88,
    leafletWidth: 0.085,
    leafletDroop: 0.42,
  });
  assertGeometryValid(frond.geometry, 'pinnate_frond');
  assert.equal(frond.leftLeafletCount, frond.rightLeafletCount, 'Pinnate frond must have paired left & right leaflets');
  assert.ok(frond.leafletPairCount >= 12, `Pinnate frond must have >= 12 leaflet pairs, got ${frond.leafletPairCount}`);
  assert.ok(
    frond.geometry.boundingBox!.min.x < -0.45 && frond.geometry.boundingBox!.max.x > 0.45,
    'Pinnate frond leaflets must spread symmetrically on both sides of rachis',
  );
  frond.geometry.dispose();

  // Validate individual Sabal costapalmate fan leaf geometry (distinct radial segments + curved depth)
  const fan = createSabalFanLeafGeometry({
    petioleLength: 1.05,
    petioleArch: 0.24,
    fanRadius: 1.15,
    segmentCount: 11,
    fanArcRadians: Math.PI * 1.12,
    segmentDroop: 0.34,
  });
  assertGeometryValid(fan.geometry, 'sabal_fan_leaf');
  assert.ok(fan.radialSegmentCount >= 9, `Sabal fan leaf must have >= 9 radial segments, got ${fan.radialSegmentCount}`);
  const fanBox = fan.geometry.boundingBox!;
  assert.ok(fanBox.max.x - fanBox.min.x > 1.2, 'Sabal fan leaf must span a wide palmate fan arc');
  assert.ok(fanBox.max.y - fanBox.min.y > 0.25, 'Sabal fan leaf must have non-flat 3D folded bend');
  fan.geometry.dispose();

  // Validate all 4 species trunks and crowns plus coconut cluster geometry
  for (const sp of ALL_PALM_SPECIES) {
    const trunk = createPalmTrunkGeometry(sp);
    const crown = createPalmCrownGeometry(sp);
    assertGeometryValid(trunk.geometry, `trunk_${sp}`);
    assertGeometryValid(crown.geometry, `crown_${sp}`);
    assert.ok(trunk.height >= 5.5 && trunk.height <= 11.5, `trunk_${sp} height ${trunk.height} must be realistic`);
    assert.ok(trunk.ringCount >= 18, `trunk_${sp} must have clear ringed/segmented detail`);
    assert.ok(crown.frondCount >= 12, `crown_${sp} must have multi-tiered frond fullness, got ${crown.frondCount}`);
    assert.ok(crown.totalLeafletCount >= 140, `crown_${sp} must have rich leaflet/segment geometry`);
    assert.ok(
      Number.isFinite(trunk.crownOrigin.x) && Number.isFinite(trunk.crownOrigin.y) && Number.isFinite(trunk.crownOrigin.z),
      `trunk_${sp} crownOrigin must be finite`,
    );
    trunk.geometry.dispose();
    crown.geometry.dispose();
  }

  const coconuts = createCoconutClusterGeometry();
  assertGeometryValid(coconuts.geometry, 'coconut_cluster');
  assert.ok(coconuts.coconutCount >= 5, `Coconut cluster must include multiple coconuts, got ${coconuts.coconutCount}`);
  coconuts.geometry.dispose();
});

test('Phase 2E-1: BuiltCityWorld integrates instanced multi-species palms, preserves exact TreeSpec placements, park broadleaf trees, and all Phase 2D districts', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const world = buildCityWorld(layout, mockTextures);

  const expectedPalms = layout.trees.filter((t) => t.kind === 'palm');
  const expectedParkTrees = layout.trees.filter((t) => t.kind === 'park');
  const stats = world.palmTreeAssetsStats;

  // 1. Exact palm count & preserved TreeSpec placements (x, z, scale, lean, rotY)
  assert.equal(stats.totalPalmCount, expectedPalms.length, 'Every palm TreeSpec must be built');
  assert.equal(stats.totalCrownInstances, expectedPalms.length, 'Every palm must have a matching instanced crown');
  assert.equal(stats.placements.length, expectedPalms.length);
  for (let i = 0; i < expectedPalms.length; i++) {
    const src = expectedPalms[i];
    const placed = stats.placements[i];
    assert.equal(placed.x, src.x, `Palm ${i} x coordinate must be preserved`);
    assert.equal(placed.z, src.z, `Palm ${i} z coordinate must be preserved`);
    assert.equal(placed.scale, src.scale, `Palm ${i} scale must be preserved`);
    assert.equal(placed.lean, src.lean, `Palm ${i} lean must be preserved`);
    assert.equal(placed.rotY, src.rotY, `Palm ${i} rotY must be preserved`);
  }

  // 2. All 4 species active & compact shared material/geometry budgets
  let speciesSum = 0;
  for (const sp of ALL_PALM_SPECIES) {
    assert.ok(stats.speciesDistribution[sp] > 0, `BuiltCityWorld must contain ${sp} palms`);
    speciesSum += stats.speciesDistribution[sp];
  }
  assert.equal(speciesSum, expectedPalms.length);
  assert.ok(
    stats.sharedMaterialCount <= 6,
    `Palm shared PBR material pool must stay compact (<= 6), got ${stats.sharedMaterialCount}`,
  );
  assert.equal(stats.sharedGeometryCount, 9, 'Expected 4 trunk + 4 crown + 1 coconut shared geometries');
  assert.ok(stats.coconutClusterInstances > 0, 'Coastal coconut palms must instantiate coconut clusters');

  // 3. Every palm InstancedMesh has finite instance matrices and valid computed boundingSphere
  const palmInstMeshes: THREE.InstancedMesh[] = [];
  const matCheck = new THREE.Matrix4();
  world.root.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh && obj.name.startsWith('palm_inst_')) {
      palmInstMeshes.push(obj);
      assert.ok(
        obj.boundingSphere && Number.isFinite(obj.boundingSphere.radius) && obj.boundingSphere.radius > 0,
        `${obj.name} must have computed finite boundingSphere`,
      );
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, matCheck);
        for (const elem of matCheck.elements) {
          assert.ok(Number.isFinite(elem), `${obj.name} instance ${i} has non-finite matrix element`);
        }
      }
    }
  });
  assert.equal(
    palmInstMeshes.length,
    stats.instancedBatches,
    'Every reported palm InstancedMesh batch must be mounted in scene graph',
  );

  // 4. Verify Coral Heights park broadleaf trees (kind === 'park') remain completely untouched
  assert.equal(expectedParkTrees.length, 6, 'Coral Heights Bayside Park must retain all 6 broadleaf trees');
  let parkGroupsFound = 0;
  for (const child of world.root.children) {
    if (child instanceof THREE.Group && child.children.length === 3) {
      const matchesParkPos = expectedParkTrees.some(
        (pt) => Math.abs(child.position.x - pt.x) < 1e-4 && Math.abs(child.position.z - pt.z) < 1e-4,
      );
      if (matchesParkPos) parkGroupsFound++;
    }
  }
  assert.equal(parkGroupsFound, expectedParkTrees.length, 'All 6 Coral Heights park broadleaf trees must remain intact');

  // 5. Verify zero regressions across all 5 completed Phase 2D architectural districts
  assert.ok(world.downtownArchitectureStats.skyscraperCount >= 6, 'Downtown skyscrapers must remain intact');
  assert.equal(world.downtownArchitectureStats.landmarkCount, 1, 'Vice Tower landmark must remain intact');
  assert.equal(world.oceanDriveArchitectureStats.hotelCount, 11, 'Ocean Drive hotels must remain intact');
  assert.equal(world.coralHeightsArchitectureStats.totalCount, 9, 'Coral Heights villas/apartments/shop must remain intact');
  assert.equal(world.neonMileArchitectureStats.totalCount, 5, 'Neon Mile venues must remain intact');
  assert.equal(world.industrialHarbourArchitectureStats.warehouseCount, 3, 'Industrial Harbour warehouses must remain intact');

  // 6. Clean resource disposal without throwing
  assert.doesNotThrow(() => world.dispose(), 'world.dispose() must cleanly release all palm geometries, materials, textures, and InstancedMeshes');
});

test('Phase 2E-2: coastal sand textures, dry-to-wet moisture curve, organic shoreline contour, shallow water gradient, and custom coastal geometries are valid and bounded', () => {
  // 1. Procedural textures (Node fallback DataTexture or CanvasTexture) contain finite valid image data & non-zero dimensions
  const sandTex = createBeachSandTextureSet(4);
  const foamTex = createSurfFoamLaceTexture(4);
  const woodTex = createCoastalBoardwalkWoodTextures(4);

  const checkTexValid = (tex: THREE.Texture, label: string) => {
    const img = tex.image as { width?: number; height?: number; data?: Uint8Array } | undefined;
    assert.ok(img && (img.width ?? 0) >= 8 && (img.height ?? 0) >= 8, `${label} must have valid non-zero dimensions`);
    if (img.data) {
      assert.equal(img.data.length, (img.width ?? 0) * (img.height ?? 0) * 4, `${label} RGBA buffer length must match dimensions`);
      let nonZero = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        assert.ok(Number.isFinite(img.data[i]), `${label} channel must be finite`);
        if (img.data[i] > 0 || img.data[i + 1] > 0 || img.data[i + 2] > 0) nonZero++;
      }
      assert.ok(nonZero > 0, `${label} must not be empty black data`);
    }
  };

  checkTexValid(sandTex.albedo, 'sandAlbedo');
  checkTexValid(sandTex.bump, 'sandBump');
  checkTexValid(sandTex.roughness, 'sandRoughness');
  checkTexValid(sandTex.worldNoise, 'sandWorldNoise');
  checkTexValid(foamTex.texture, 'surfFoamLace');
  checkTexValid(woodTex.albedo, 'boardwalkWoodAlbedo');
  checkTexValid(woodTex.bump, 'boardwalkWoodBump');
  checkTexValid(woodTex.roughness, 'boardwalkWoodRoughness');

  sandTex.dispose();
  foamTex.texture.dispose();
  woodTex.dispose();

  // 2. Dry -> Damp -> Wet sand moisture config & evaluator are finite, monotonic, and rain-responsive
  assert.ok(
    SAND_MOISTURE_CONFIG.dryRoughness > SAND_MOISTURE_CONFIG.dampRoughness &&
      SAND_MOISTURE_CONFIG.dampRoughness > SAND_MOISTURE_CONFIG.wetRoughness &&
      SAND_MOISTURE_CONFIG.wetRoughness >= 0.12,
    'Sand roughness must decrease smoothly from dry -> damp -> wet shoreline',
  );
  assert.ok(
    SAND_MOISTURE_CONFIG.rainDarkenFactor > 0.5 && SAND_MOISTURE_CONFIG.rainDarkenFactor < 1.0,
    'Rain darken factor must darken sand realistically without turning black',
  );

  const drySample = evaluateSandWetnessAt(126, 0, 0);
  const dampSample = evaluateSandWetnessAt(146.5, 0, 0);
  const wetSample = evaluateSandWetnessAt(151.0, 0, 0);
  const dryRainSample = evaluateSandWetnessAt(126, 0, 1);

  assert.ok(
    drySample.dampFactor < dampSample.dampFactor && dampSample.wetFactor < wetSample.wetFactor,
    'Sand moisture factors must rise smoothly toward shoreline',
  );
  assert.ok(
    drySample.effectiveRoughness > dampSample.effectiveRoughness &&
      dampSample.effectiveRoughness > wetSample.effectiveRoughness,
    'Sand effective roughness must drop smoothly from dry -> damp -> wet',
  );
  assert.ok(
    dryRainSample.effectiveRoughness < drySample.effectiveRoughness,
    'Rain must reduce dry sand roughness realistically',
  );

  // 3. Organic shoreline contour varies naturally across Z (never a flat straight line)
  const contourSamples: number[] = [];
  for (let z = -120; z <= 120; z += 12) {
    const sx = sampleShorelineContourX(z);
    assert.ok(Number.isFinite(sx) && sx >= 146 && sx <= 155, `Shoreline contour X=${sx} must stay along east beach`);
    contourSamples.push(sx);
  }
  const contourSpan = Math.max(...contourSamples) - Math.min(...contourSamples);
  assert.ok(contourSpan >= 2.2, `Shoreline contour must vary organically across Z (>= 2.2m), got ${contourSpan.toFixed(2)}m`);

  // 4. Shallow-to-deep water gradient stays bounded in [0, 1], peaking near shore and decaying offshore
  const nearShoreShallow = evaluateShallowWaterFactor(sampleShorelineContourX(0) + 2, 0);
  const midShoalShallow = evaluateShallowWaterFactor(sampleShorelineContourX(0) + 22, 0);
  const deepOceanShallow = evaluateShallowWaterFactor(sampleShorelineContourX(0) + 80, 0);
  assert.ok(nearShoreShallow >= 0.85 && nearShoreShallow <= 1.0, `Near-shore shallow factor must peak near 1, got ${nearShoreShallow}`);
  assert.ok(midShoalShallow > deepOceanShallow && midShoalShallow < nearShoreShallow, 'Shallow factor must transition smoothly offshore');
  assert.ok(deepOceanShallow >= 0 && deepOceanShallow <= 0.05, `Deep offshore shallow factor must decay near 0, got ${deepOceanShallow}`);

  // 5. Beach surface Y descends smoothly from boardwalk edge into seabed
  assert.ok(
    evaluateBeachSurfaceWorldY(120, 0) > evaluateBeachSurfaceWorldY(142, 0) &&
      evaluateBeachSurfaceWorldY(142, 0) > evaluateBeachSurfaceWorldY(155, 0),
    'Beach profile must slope smoothly seaward into Atlantic surf',
  );

  // 6. All custom coastal geometries have finite vertices and valid unit-length normals
  const assertCoastalGeoValid = (geo: THREE.BufferGeometry, name: string) => {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    assert.ok(pos && pos.count >= 24, `${name} must contain sculpted vertices`);
    assert.ok(norm && norm.count === pos.count, `${name} must contain vertex normals`);
    assert.ok(geo.boundingBox && geo.boundingSphere && Number.isFinite(geo.boundingSphere.radius), `${name} must compute bounds`);
    for (let i = 0; i < pos.count; i++) {
      assert.ok(
        Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)),
        `${name} vertex ${i} must be finite`,
      );
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(Number.isFinite(len) && len >= 0.85 && len <= 1.15, `${name} normal ${i} must be unit length, got ${len}`);
    }
  };

  const beachGeo = createCoastalBeachGeometry();
  const foamGeo = createContouredShorelineFoamGeometry();
  const veilGeo = createShallowWaterVeilGeometry();
  const postGeo = createBeveledTimberPostGeometry();
  const cleatGeo = createMooringCleatGeometry();

  assertCoastalGeoValid(beachGeo, 'coastal_beach');
  assertCoastalGeoValid(foamGeo, 'contoured_surf_foam');
  assertCoastalGeoValid(veilGeo, 'shallow_water_veil');
  assertCoastalGeoValid(postGeo, 'beveled_timber_post');
  assertCoastalGeoValid(cleatGeo, 'mooring_cleat');

  // Verify contoured foam mesh inland edge genuinely undulates across Z (not a straight rectangle!)
  const foamPos = foamGeo.getAttribute('position');
  const foamUv = foamGeo.getAttribute('uv');
  const inlandXs: number[] = [];
  for (let i = 0; i < foamPos.count; i++) {
    if (foamUv.getX(i) < 0.001) inlandXs.push(foamPos.getX(i));
  }
  const inlandSpan = Math.max(...inlandXs) - Math.min(...inlandXs);
  assert.ok(inlandSpan >= 2.2, `Contoured foam ribbon inland edge must undulate organically (>= 2.2m), got ${inlandSpan.toFixed(2)}m`);

  beachGeo.dispose();
  foamGeo.dispose();
  veilGeo.dispose();
  postGeo.dispose();
  cleatGeo.dispose();
});

test('Phase 2E-2: BuiltCityWorld integrates realistic beach, animated shoreline surf, boardwalk, Marina Overlook Pier, and preserves palms, lifeguard towers & all Phase 2D districts', () => {
  const layout = generateCityLayout();
  const mockTextures = createMockTextures();
  const world = buildCityWorld(layout, mockTextures);
  const stats = world.coastalShorelineStats;

  // 1. Exact preserved footprints for Beach, Boardwalk, and Marina Overlook Pier
  assert.deepEqual(stats.beachFootprint, PRESERVED_BEACH_FOOTPRINT);
  assert.deepEqual(stats.boardwalkFootprint, PRESERVED_BOARDWALK_FOOTPRINT);
  assert.deepEqual(stats.pierFootprint, PRESERVED_PIER_FOOTPRINT);

  const beachMesh = world.root.getObjectByName('coastal_beach_sand') as THREE.Mesh | undefined;
  const foamMesh = world.root.getObjectByName('coastal_shoreline_surf_foam') as THREE.Mesh | undefined;
  const veilMesh = world.root.getObjectByName('coastal_shallow_water_veil') as THREE.Mesh | undefined;
  const boardwalkMesh = world.root.getObjectByName('coastal_boardwalk_deck') as THREE.Mesh | undefined;
  const pierMesh = world.root.getObjectByName('coastal_marina_pier_deck') as THREE.Mesh | undefined;

  assert.ok(beachMesh instanceof THREE.Mesh, 'Beach sand mesh must be mounted');
  assert.ok(foamMesh instanceof THREE.Mesh, 'Contoured shoreline surf foam mesh must be mounted');
  assert.ok(veilMesh instanceof THREE.Mesh, 'Shallow-water turquoise veil mesh must be mounted');
  assert.ok(boardwalkMesh instanceof THREE.Mesh, 'Boardwalk deck mesh must be mounted');
  assert.ok(pierMesh instanceof THREE.Mesh, 'Marina Overlook Pier deck mesh must be mounted');

  assert.equal(beachMesh.position.x, 137);
  assert.equal(beachMesh.position.y, -0.06);
  assert.equal(beachMesh.position.z, 0);
  assert.ok(Math.abs(beachMesh.rotation.z - -0.025) < 1e-6);
  assert.equal((beachMesh.material as THREE.MeshStandardMaterial).metalness, 0, 'Beach sand material must be strictly non-metallic');

  assert.equal(boardwalkMesh.position.x, 113.5);
  assert.equal(boardwalkMesh.position.y, 0.08);
  assert.equal(boardwalkMesh.position.z, 0);
  assert.equal(pierMesh.position.x, 136);
  assert.equal(pierMesh.position.y, 0.25);
  assert.equal(pierMesh.position.z, 96);

  // 2. Surf foam & shallow water veil shaders reference the exact live world.oceanUniforms.uTime object
  const foamMat = foamMesh.material as THREE.ShaderMaterial;
  const veilMat = veilMesh.material as THREE.ShaderMaterial;
  assert.strictEqual(foamMat.uniforms.uTime, world.oceanUniforms.uTime, 'Surf foam must share live oceanUniforms.uTime');
  assert.strictEqual(veilMat.uniforms.uTime, world.oceanUniforms.uTime, 'Shallow veil must share live oceanUniforms.uTime');
  assert.strictEqual(foamMat.uniforms.uNightFactor, world.oceanUniforms.uNightFactor, 'Surf foam must respond to nightFactor');

  // 3. Instanced coastal batches (boardwalk planks, beams, posts, rails, pier pilings, beams, cleats, ropes, hardware, lanterns)
  const coastalInstMeshes: THREE.InstancedMesh[] = [];
  const matCheck = new THREE.Matrix4();
  const posCheck = new THREE.Vector3();
  world.root.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh && obj.name.startsWith('coastal_inst_')) {
      coastalInstMeshes.push(obj);
      assert.ok(
        obj.boundingSphere && Number.isFinite(obj.boundingSphere.radius) && obj.boundingSphere.radius > 0,
        `${obj.name} must have computed finite boundingSphere`,
      );
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, matCheck);
        for (const elem of matCheck.elements) {
          assert.ok(Number.isFinite(elem), `${obj.name} instance ${i} has non-finite matrix element`);
        }
      }
    }
  });
  assert.equal(coastalInstMeshes.length, stats.instancedBatches, 'All coastal InstancedMesh batches must be mounted');
  assert.ok(stats.instancedBatches >= 8, `Expected >= 8 instanced coastal batches, got ${stats.instancedBatches}`);
  assert.ok(stats.boardwalkPlankCount >= 200, `Expected >= 200 instanced plank/border details, got ${stats.boardwalkPlankCount}`);
  assert.ok(stats.pierStructuralInstanceCount >= 50, `Expected >= 50 pier structural instances (pilings/beams/cleats/ropes), got ${stats.pierStructuralInstanceCount}`);
  assert.ok(stats.coastalDetailCount >= 10, `Expected authentic coastal details (ramps/showers/markers), got ${stats.coastalDetailCount}`);

  // 4. Verify boardwalk interior pedestrian corridor (x ∈ [109.2, 117.8]) and pier west approach are completely unobstructed!
  const postsBatch = world.root.getObjectByName('coastal_inst_timber_posts') as THREE.InstancedMesh | undefined;
  assert.ok(postsBatch instanceof THREE.InstancedMesh, 'Timber guardrail posts must be instanced');
  let postsInPierApproach = 0;
  for (let i = 0; i < postsBatch.count; i++) {
    postsBatch.getMatrixAt(i, matCheck);
    posCheck.setFromMatrixPosition(matCheck);
    // Boardwalk interior walking corridor must have zero vertical posts
    assert.ok(
      !(posCheck.x > 109.2 && posCheck.x < 117.8),
      `Guardrail post at x=${posCheck.x.toFixed(2)}, z=${posCheck.z.toFixed(2)} must not block boardwalk corridor`,
    );
    // Marina Pier west entrance (x ≈ 118.1, z ∈ [90.5, 101.5]) must remain open
    if (posCheck.x >= 117.5 && posCheck.x <= 119.0 && posCheck.z > 90.5 && posCheck.z < 101.5) {
      postsInPierApproach++;
    }
    // Beach access ramp openings must remain open along east guardrail (x ≈ 118.1)
    if (Math.abs(posCheck.x - 118.1) < 0.2) {
      for (const az of BEACH_ACCESS_Z) {
        assert.ok(Math.abs(posCheck.z - az) >= 2.2, `Beach access opening at z=${az} must remain clear of posts`);
      }
    }
  }
  assert.equal(postsInPierApproach, 0, 'Marina Overlook Pier west boardwalk approach must stay completely open');

  // 5. Verify Marina Overlook Pier pilings, cleats, and ropes are placed accurately
  const pilingsBatch = world.root.getObjectByName('coastal_inst_pier_pilings') as THREE.InstancedMesh | undefined;
  const cleatsBatch = world.root.getObjectByName('coastal_inst_pier_cleats') as THREE.InstancedMesh | undefined;
  const ropesBatch = world.root.getObjectByName('coastal_inst_pier_ropes') as THREE.InstancedMesh | undefined;
  assert.ok(pilingsBatch && pilingsBatch.count >= 24, 'Pier must have heavy support pilings');
  assert.ok(cleatsBatch && cleatsBatch.count >= 8, 'Pier must have cast-iron mooring cleats');
  assert.ok(ropesBatch && ropesBatch.count >= 4, 'Pier corner pilings must have coiled mooring ropes');

  // 6. Verify both Ocean Drive lifeguard towers at (130, 0, ±36) remain intact
  let lifeguardTowersFound = 0;
  for (const child of world.root.children) {
    if (child instanceof THREE.Group && child.children.length === 3) {
      if (Math.abs(child.position.x - 130) < 1e-4 && Math.abs(Math.abs(child.position.z) - 36) < 1e-4) {
        lifeguardTowersFound++;
      }
    }
  }
  assert.equal(lifeguardTowersFound, 2, 'Both Ocean Drive lifeguard towers at (130, 0, ±36) must remain preserved');

  // 7. Verify Phase 2E-1 palms (all 27 & 4 species) and all 5 Phase 2D architectural districts remain intact
  const expectedPalms = layout.trees.filter((t) => t.kind === 'palm');
  assert.equal(world.palmTreeAssetsStats.totalPalmCount, expectedPalms.length, 'All 27 palm trees must remain preserved');
  for (const sp of ALL_PALM_SPECIES) {
    assert.ok(world.palmTreeAssetsStats.speciesDistribution[sp] > 0, `Palm species ${sp} must remain active`);
  }
  assert.ok(world.downtownArchitectureStats.skyscraperCount >= 6);
  assert.equal(world.downtownArchitectureStats.landmarkCount, 1);
  assert.equal(world.oceanDriveArchitectureStats.hotelCount, 11);
  assert.equal(world.coralHeightsArchitectureStats.totalCount, 9);
  assert.equal(world.neonMileArchitectureStats.totalCount, 5);
  assert.equal(world.industrialHarbourArchitectureStats.warehouseCount, 3);

  // 8. Clean GPU disposal without throwing
  assert.doesNotThrow(() => world.dispose(), 'world.dispose() must cleanly release all coastal assets');
});


















