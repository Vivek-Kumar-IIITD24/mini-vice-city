import { MissionDefinition } from '../types';

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'the_first_ride',
    title: 'THE FIRST RIDE',
    category: 'story',
    brief:
      'Welcome to Vice City. Collect the waiting Veloce GT on Ocean Drive, cruise through the coastal & downtown checkpoints, and arrive at the Marina Overlook.',
    reward: 2500,
    unlockVehicleId: 'solstice_royale',
    requiresVehicle: true,
    startPos: { x: 92, z: 44 },
    checkpoints: [
      { x: 96, z: 0, radius: 9.5, label: 'Ocean Drive Mid-Strip' },
      { x: 96, z: -64, radius: 9.5, label: 'Coral Resort Turn' },
      { x: 32, z: -96, radius: 9.5, label: 'Downtown North Gate' },
      { x: 32, z: -18, radius: 9.5, label: 'Vice Tower Avenue' },
      { x: 32, z: 64, radius: 9.5, label: 'Neon Mile Strip' },
      { x: 96, z: 96, radius: 11, label: 'Ocean Drive Marina Overlook' },
    ],
  },
  {
    id: 'ocean_drive_sprint',
    title: 'OCEAN DRIVE SPRINT',
    category: 'race',
    brief:
      'Push your ride to the limit in a timed street circuit around Ocean Drive and Neon Mile before the clock runs out.',
    reward: 3000,
    timeLimitSec: 75,
    requiresVehicle: true,
    startPos: { x: 96, z: 64 },
    checkpoints: [
      { x: 96, z: -32, radius: 10, label: 'Palm Promenade North' },
      { x: 96, z: -96, radius: 10, label: 'North Beach Hairpin' },
      { x: -32, z: -96, radius: 10, label: 'Vice Boulevard Sweep' },
      { x: -32, z: 32, radius: 10, label: 'Midtown Chicane' },
      { x: 32, z: 96, radius: 10, label: 'Neon South Straight' },
      { x: 96, z: 64, radius: 11, label: 'Ocean Drive Finish Line' },
    ],
  },
  {
    id: 'harbour_express',
    title: 'HARBOUR EXPRESS',
    category: 'challenge',
    brief:
      'Pick up a high-priority courier package at Industrial Harbour and evade VCPD patrols all the way to Vice Tower Plaza.',
    reward: 4000,
    unlockVehicleId: 'bayside_titan',
    timeLimitSec: 95,
    requiresVehicle: true,
    triggerWantedStars: 2,
    startPos: { x: -96, z: 64 },
    checkpoints: [
      { x: -96, z: 64, radius: 11, label: 'Harbour Container Gate' },
      { x: -96, z: -32, radius: 10, label: 'Coral Heights Bypass' },
      { x: -32, z: -96, radius: 10, label: 'North Bay Expressway' },
      { x: 32, z: -32, radius: 11, label: 'Vice Tower Drop-Off' },
    ],
  },
  {
    id: 'skyline_explorer',
    title: 'SKYLINE EXPLORER',
    category: 'exploration',
    brief:
      'Tour all five signature landmarks across Mini Vice City — on foot or behind the wheel.',
    reward: 2000,
    requiresVehicle: false,
    startPos: { x: 96, z: 32 },
    checkpoints: [
      { x: 110, z: 0, radius: 12, label: 'Ocean Drive Boardwalk' },
      { x: 0, z: -38, radius: 12, label: 'Vice Tower Plaza' },
      { x: -64, z: -56, radius: 12, label: 'Coral Heights Palm Park' },
      { x: -84, z: 64, radius: 12, label: 'Industrial Harbour Dock' },
      { x: 0, z: 64, radius: 12, label: 'Neon Mile Club Row' },
    ],
  },
  {
    id: 'valet_precision',
    title: 'VALET PRECISION',
    category: 'challenge',
    brief:
      'Deliver luxury vehicles smoothly to designated VIP parking zones across Downtown and Ocean Drive.',
    reward: 1500,
    timeLimitSec: 80,
    requiresVehicle: true,
    startPos: { x: 32, z: 0 },
    checkpoints: [
      { x: -24, z: 10, radius: 7.5, label: 'Downtown Parking Deck Bay' },
      { x: 84, z: -10, radius: 7.5, label: 'Palm Hotel Valet Drop' },
      { x: 84, z: 74, radius: 7.5, label: 'Marina Cafe VIP Spot' },
    ],
  },
];

export function getMissionById(id: string | null): MissionDefinition | null {
  if (!id) return null;
  return MISSIONS.find((m) => m.id === id) ?? null;
}

export interface MissionProgressState {
  missionId: string | null;
  stage: 'idle' | 'find_vehicle' | 'checkpoints' | 'completed';
  checkpointIndex: number;
  elapsedSec: number;
  remainingSec: number | null;
}

export function createMissionProgress(
  missionId: string | null,
  inVehicle: boolean,
  checkpointIndex: number = 0,
): MissionProgressState {
  const def = getMissionById(missionId);
  if (!def) {
    return {
      missionId: null,
      stage: 'idle',
      checkpointIndex: 0,
      elapsedSec: 0,
      remainingSec: null,
    };
  }
  const needsCarFirst = def.id === 'the_first_ride' && !inVehicle && checkpointIndex === 0;
  return {
    missionId: def.id,
    stage: needsCarFirst ? 'find_vehicle' : 'checkpoints',
    checkpointIndex: Math.min(checkpointIndex, Math.max(0, def.checkpoints.length - 1)),
    elapsedSec: 0,
    remainingSec: def.timeLimitSec ?? null,
  };
}

export interface MissionStepResult {
  state: MissionProgressState;
  checkpointReached: boolean;
  enteredVehicleStep: boolean;
  missionCompleted: boolean;
  missionFailedTimeout: boolean;
}

export function stepMissionProgress(
  state: MissionProgressState,
  playerX: number,
  playerZ: number,
  inVehicle: boolean,
  dt: number,
): MissionStepResult {
  const def = getMissionById(state.missionId);
  if (!def || state.stage === 'idle' || state.stage === 'completed') {
    return {
      state,
      checkpointReached: false,
      enteredVehicleStep: false,
      missionCompleted: false,
      missionFailedTimeout: false,
    };
  }

  let nextStage: MissionProgressState['stage'] = state.stage;
  let nextIdx = state.checkpointIndex;
  const elapsedSec = state.elapsedSec + dt;
  let remainingSec = state.remainingSec;
  let enteredVehicleStep = false;
  let checkpointReached = false;
  let missionCompleted = false;
  let missionFailedTimeout = false;

  if (nextStage === 'find_vehicle') {
    if (inVehicle) {
      nextStage = 'checkpoints';
      enteredVehicleStep = true;
    }
  } else if (nextStage === 'checkpoints') {
    if (remainingSec !== null) {
      remainingSec = Math.max(0, remainingSec - dt);
      if (remainingSec <= 0) {
        missionFailedTimeout = true;
      }
    }

    if (!missionFailedTimeout && (!def.requiresVehicle || inVehicle)) {
      const cp = def.checkpoints[nextIdx];
      if (cp) {
        const dx = playerX - cp.x;
        const dz = playerZ - cp.z;
        if (dx * dx + dz * dz <= cp.radius * cp.radius) {
          checkpointReached = true;
          nextIdx += 1;
          if (nextIdx >= def.checkpoints.length) {
            nextStage = 'completed';
            missionCompleted = true;
          }
        }
      }
    }
  }

  return {
    state: {
      missionId: state.missionId,
      stage: nextStage,
      checkpointIndex: nextIdx,
      elapsedSec,
      remainingSec,
    },
    checkpointReached,
    enteredVehicleStep,
    missionCompleted,
    missionFailedTimeout,
  };
}
