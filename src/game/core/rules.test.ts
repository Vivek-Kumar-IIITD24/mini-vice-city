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
import { generateCityLayout, VEHICLE_CATALOG } from '../world/cityData';
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
  addWantedHeat,
  createInitialWantedState,
  stepWantedCooldown,
} from '../police/policeSystem';
import * as THREE from 'three';
import {
  createMissionProgress,
  stepMissionProgress,
} from '../missions/missionData';
import { TimeAndWeatherSystem } from '../time/timeAndWeather';
import { buildCityWorld } from '../world/cityBuilder';
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




