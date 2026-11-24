export enum GameState {
  Title = 'title',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'gameover',
}

export enum DistrictId {
  Downtown = 'downtown',
  OceanDrive = 'ocean_drive',
  Residential = 'residential',
  Harbour = 'harbour',
  Entertainment = 'entertainment',
}

export enum WeatherType {
  Clear = 'clear',
  Cloudy = 'cloudy',
  Rain = 'rain',
}

export enum VehicleKind {
  Sports = 'sports',
  Sedan = 'sedan',
  Suv = 'suv',
  Police = 'police',
  Traffic = 'traffic',
}

export enum GraphicsQuality {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum CameraViewMode {
  Chase = 'chase',
  Close = 'close',
  Hood = 'hood',
}

export enum TimePreset {
  Dynamic = 'dynamic',
  Morning = 'morning',
  Afternoon = 'afternoon',
  GoldenHour = 'golden_hour',
  Sunset = 'sunset',
  Night = 'night',
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  kind: 'building' | 'prop' | 'barrier';
}

export interface VehicleSpec {
  id: string;
  name: string;
  subtitle: string;
  kind: VehicleKind;
  color: number;
  accentColor: number;
  maxSpeed: number; // m/s
  reverseSpeed: number; // m/s
  acceleration: number; // m/s^2
  braking: number; // m/s^2
  turnRate: number; // rad/s
  grip: number;
  driftGrip: number;
  length: number;
  width: number;
  height: number;
  price: number;
}

export interface GameSettings {
  graphics: GraphicsQuality;
  resolutionScale: number; // 0.75 - 1.0
  mouseSensitivity: number; // 0.4 - 2.0
  masterVolume: number; // 0 - 1
  musicVolume: number; // 0 - 1
  effectsVolume: number; // 0 - 1
  ambienceVolume: number; // 0 - 1
  muted: boolean;
  cameraMode: CameraViewMode;
  timePreset: TimePreset;
  weather: WeatherType;
  dynamicWeather: boolean;
}

export interface MissionCheckpoint {
  x: number;
  z: number;
  radius: number;
  label: string;
}

export interface MissionDefinition {
  id: string;
  title: string;
  category: 'story' | 'race' | 'challenge' | 'exploration';
  brief: string;
  reward: number;
  unlockVehicleId?: string;
  timeLimitSec?: number;
  requiresVehicle: boolean;
  triggerWantedStars?: number;
  startPos: Vec2;
  checkpoints: MissionCheckpoint[];
}

export interface SaveData {
  version: number;
  money: number;
  completedMissionIds: string[];
  unlockedVehicleIds: string[];
  activeMissionId: string | null;
  activeCheckpointIndex: number;
  discoveredDistricts: DistrictId[];
  bestTimes: Record<string, number>;
  stats: {
    distanceDrivenKm: number;
    missionsCompleted: number;
    maxWantedEscaped: number;
  };
  settings: GameSettings;
  savedAt: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'mission' | 'vehicle' | 'police' | 'activity';
  color: string;
  label?: string;
}

export interface HudNotification {
  id: number;
  title: string;
  subtitle?: string;
  accent: 'gold' | 'cyan' | 'rose' | 'emerald';
}

export interface GameOverSummary {
  outcome: 'busted' | 'wasted' | 'mission_complete';
  title: string;
  subtitle: string;
  reward: number;
  timeElapsedSec: number;
  unlockedVehicleName?: string;
  stats: Array<{ label: string; value: string }>;
}

export interface HudSnapshot {
  gameState: GameState;
  district: DistrictId;
  districtName: string;
  money: number;
  health: number;
  maxHealth: number;
  wantedStars: number;
  wantedEscaping: boolean;
  wantedCooldownRatio: number; // 0..1
  inVehicle: boolean;
  vehicleName: string;
  speedKmh: number;
  gear: string;
  handbrake: boolean;
  cameraMode: CameraViewMode;
  interactionPrompt: string | null;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  timeHours: number; // 0..24
  timeLabel: string;
  weather: WeatherType;
  missionTitle: string | null;
  missionObjective: string | null;
  missionProgressText: string | null;
  missionTimerSec: number | null;
  missionTargetPos: Vec2 | null;
  blips: MinimapBlip[];
  notification: HudNotification | null;
  completedMissionIds: string[];
  unlockedVehicleIds: string[];
  activeMissionId: string | null;
  gameOverSummary: GameOverSummary | null;
  pointerLocked: boolean;
  fps: number;
}
