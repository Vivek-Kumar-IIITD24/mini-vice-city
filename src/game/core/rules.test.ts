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
  addWantedHeat,
  createInitialWantedState,
  stepWantedCooldown,
} from '../police/policeSystem';
import {
  createMissionProgress,
  stepMissionProgress,
} from '../missions/missionData';
import { DistrictId } from '../types';

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
