import {
  CameraViewMode,
  DistrictId,
  GameSettings,
  GraphicsQuality,
  SaveData,
  TimePreset,
  WeatherType,
} from '../types';

export const SAVE_STORAGE_KEY = 'mini_vice_city_save_v1';
export const SAVE_VERSION = 1;

export function createDefaultSettings(): GameSettings {
  return {
    graphics: GraphicsQuality.High,
    resolutionScale: 1,
    mouseSensitivity: 1.0,
    masterVolume: 0.75,
    musicVolume: 0.38,
    effectsVolume: 0.8,
    ambienceVolume: 0.55,
    muted: false,
    cameraMode: CameraViewMode.Chase,
    timePreset: TimePreset.GoldenHour,
    weather: WeatherType.Clear,
    dynamicWeather: false,
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    money: 500,
    completedMissionIds: [],
    unlockedVehicleIds: ['veloce_gt'],
    activeMissionId: 'the_first_ride',
    activeCheckpointIndex: 0,
    discoveredDistricts: [DistrictId.OceanDrive],
    bestTimes: {},
    stats: {
      distanceDrivenKm: 0,
      missionsCompleted: 0,
      maxWantedEscaped: 0,
    },
    settings: createDefaultSettings(),
    savedAt: Date.now(),
  };
}

export function sanitizeSaveData(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.money !== 'number' || !Number.isFinite(obj.money)) return null;

  const defaults = createDefaultSaveData();
  const defSettings = defaults.settings;
  const rawSettings = (obj.settings && typeof obj.settings === 'object'
    ? obj.settings
    : {}) as Record<string, unknown>;

  const validGraphics = Object.values(GraphicsQuality);
  const validCam = Object.values(CameraViewMode);
  const validTime = Object.values(TimePreset);
  const validWeather = Object.values(WeatherType);
  const validDistricts = new Set<string>(Object.values(DistrictId));

  const settings: GameSettings = {
    graphics: validGraphics.includes(rawSettings.graphics as GraphicsQuality)
      ? (rawSettings.graphics as GraphicsQuality)
      : defSettings.graphics,
    resolutionScale:
      typeof rawSettings.resolutionScale === 'number' &&
      rawSettings.resolutionScale >= 0.6 &&
      rawSettings.resolutionScale <= 1
        ? rawSettings.resolutionScale
        : defSettings.resolutionScale,
    mouseSensitivity:
      typeof rawSettings.mouseSensitivity === 'number' &&
      rawSettings.mouseSensitivity >= 0.3 &&
      rawSettings.mouseSensitivity <= 2.5
        ? rawSettings.mouseSensitivity
        : defSettings.mouseSensitivity,
    masterVolume:
      typeof rawSettings.masterVolume === 'number'
        ? Math.max(0, Math.min(1, rawSettings.masterVolume))
        : defSettings.masterVolume,
    musicVolume:
      typeof rawSettings.musicVolume === 'number'
        ? Math.max(0, Math.min(1, rawSettings.musicVolume))
        : defSettings.musicVolume,
    effectsVolume:
      typeof rawSettings.effectsVolume === 'number'
        ? Math.max(0, Math.min(1, rawSettings.effectsVolume))
        : defSettings.effectsVolume,
    ambienceVolume:
      typeof rawSettings.ambienceVolume === 'number'
        ? Math.max(0, Math.min(1, rawSettings.ambienceVolume))
        : defSettings.ambienceVolume,
    muted: typeof rawSettings.muted === 'boolean' ? rawSettings.muted : defSettings.muted,
    cameraMode: validCam.includes(rawSettings.cameraMode as CameraViewMode)
      ? (rawSettings.cameraMode as CameraViewMode)
      : defSettings.cameraMode,
    timePreset: validTime.includes(rawSettings.timePreset as TimePreset)
      ? (rawSettings.timePreset as TimePreset)
      : defSettings.timePreset,
    weather: validWeather.includes(rawSettings.weather as WeatherType)
      ? (rawSettings.weather as WeatherType)
      : defSettings.weather,
    dynamicWeather:
      typeof rawSettings.dynamicWeather === 'boolean'
        ? rawSettings.dynamicWeather
        : defSettings.dynamicWeather,
  };

  const completedMissionIds = Array.isArray(obj.completedMissionIds)
    ? obj.completedMissionIds.filter((x): x is string => typeof x === 'string')
    : [];

  const unlockedVehicleIds = Array.isArray(obj.unlockedVehicleIds)
    ? Array.from(
        new Set([
          'veloce_gt',
          ...obj.unlockedVehicleIds.filter((x): x is string => typeof x === 'string'),
        ]),
      )
    : ['veloce_gt'];

  const discoveredDistricts = Array.isArray(obj.discoveredDistricts)
    ? (obj.discoveredDistricts.filter(
        (x): x is DistrictId => typeof x === 'string' && validDistricts.has(x),
      ) as DistrictId[])
    : [DistrictId.OceanDrive];

  const rawStats = (obj.stats && typeof obj.stats === 'object'
    ? obj.stats
    : {}) as Record<string, unknown>;

  const bestTimes: Record<string, number> = {};
  if (obj.bestTimes && typeof obj.bestTimes === 'object') {
    for (const [k, v] of Object.entries(obj.bestTimes as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        bestTimes[k] = v;
      }
    }
  }

  return {
    version: SAVE_VERSION,
    money: Math.max(0, Math.round(obj.money)),
    completedMissionIds,
    unlockedVehicleIds,
    activeMissionId: typeof obj.activeMissionId === 'string' ? obj.activeMissionId : null,
    activeCheckpointIndex:
      typeof obj.activeCheckpointIndex === 'number' && obj.activeCheckpointIndex >= 0
        ? Math.floor(obj.activeCheckpointIndex)
        : 0,
    discoveredDistricts:
      discoveredDistricts.length > 0 ? discoveredDistricts : [DistrictId.OceanDrive],
    bestTimes,
    stats: {
      distanceDrivenKm:
        typeof rawStats.distanceDrivenKm === 'number' && Number.isFinite(rawStats.distanceDrivenKm)
          ? Math.max(0, rawStats.distanceDrivenKm)
          : 0,
      missionsCompleted:
        typeof rawStats.missionsCompleted === 'number' && Number.isFinite(rawStats.missionsCompleted)
          ? Math.max(0, Math.floor(rawStats.missionsCompleted))
          : completedMissionIds.length,
      maxWantedEscaped:
        typeof rawStats.maxWantedEscaped === 'number' && Number.isFinite(rawStats.maxWantedEscaped)
          ? Math.max(0, Math.min(5, Math.floor(rawStats.maxWantedEscaped)))
          : 0,
    },
    settings,
    savedAt: typeof obj.savedAt === 'number' ? obj.savedAt : Date.now(),
  };
}

export function loadSaveData(storage?: Pick<Storage, 'getItem'>): SaveData | null {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return null;
    const raw = store.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeSaveData(parsed);
  } catch {
    return null;
  }
}

export function persistSaveData(
  data: SaveData,
  storage?: Pick<Storage, 'setItem'>,
): boolean {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return false;
    const payload: SaveData = { ...data, savedAt: Date.now() };
    store.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSaveData(storage?: Pick<Storage, 'removeItem'>): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
