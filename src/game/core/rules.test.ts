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
import { generateCityLayout, TRAFFIC_COLORS, VEHICLE_CATALOG } from '../world/cityData';
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
  computeCinematicPostState,
  getPostProcessingConfigForQuality,
} from '../rendering/postProcessing';
import {
  computeEnvironmentDelta,
  computeEnvironmentIntensity,
  EnvironmentAtmosphereSnapshot,
  getEnvironmentQualityConfig,
  shouldRefreshEnvironment,
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











