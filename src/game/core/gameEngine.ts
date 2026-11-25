import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraViewMode,
  DistrictId,
  GameOverSummary,
  GameSettings,
  GameState,
  GraphicsQuality,
  HudNotification,
  HudSnapshot,
  MinimapBlip,
  SaveData,
  VehicleSpec,
} from '../types';
import {
  DISTRICT_NAMES,
  clampToPlayableIsland,
  dist2D,
  formatTimeHours,
  getDistrictAt,
  getTimePhaseName,
  resolveCircleVsBoxes,
} from './math';
import { InputManager } from './input';
import {
  clearSaveData,
  createDefaultSaveData,
  loadSaveData,
  persistSaveData,
} from './saveSystem';
import {
  CityLayout,
  VEHICLE_CATALOG,
  generateCityLayout,
} from '../world/cityData';
import { createProceduralTextures, ProceduralTextureSet } from '../world/textures';
import { buildCityWorld, BuiltCityWorld } from '../world/cityBuilder';
import { createVehicleMesh, VehicleRig } from '../vehicles/vehicleModels';
import {
  VehicleBodyState,
  computeGearLabel,
  createInitialVehicleState,
  stepVehiclePhysics,
} from '../vehicles/vehiclePhysics';
import { PlayerController } from '../player/playerController';
import { CameraRig } from '../camera/cameraRig';
import { TrafficSystem } from '../traffic/trafficSystem';
import { PedestrianSystem } from '../pedestrians/pedestrianSystem';
import { PoliceSystem } from '../police/policeSystem';
import { TimeAndWeatherSystem } from '../time/timeAndWeather';
import { SoundEngine } from '../audio/soundEngine';
import {
  MISSIONS,
  MissionProgressState,
  createMissionProgress,
  getMissionById,
  stepMissionProgress,
} from '../missions/missionData';
import { WorldEffectsAndMarkers } from '../missions/missionMarkers';
import { CinematicPostPipeline } from '../rendering/postProcessing';

interface DrivableVehicleEntity {
  instanceId: string;
  spec: VehicleSpec;
  rig: VehicleRig;
  body: VehicleBodyState;
}

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GameEngine {
  private readonly mountEl: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly isSoftwareGl: boolean;
  private readonly envRT: THREE.WebGLRenderTarget;

  private readonly layout: CityLayout;
  private readonly textures: ProceduralTextureSet;
  private readonly world: BuiltCityWorld;
  private readonly player: PlayerController;
  private readonly cameraRig: CameraRig;
  private readonly traffic: TrafficSystem;
  private readonly pedestrians: PedestrianSystem;
  private readonly police: PoliceSystem;
  private readonly timeWeather: TimeAndWeatherSystem;
  private readonly postPipeline: CinematicPostPipeline;
  private readonly sound: SoundEngine;
  private readonly markers: WorldEffectsAndMarkers;
  private readonly input: InputManager;

  private vehicles: DrivableVehicleEntity[] = [];
  private activeVehicle: DrivableVehicleEntity | null = null;
  private nearbyVehicle: DrivableVehicleEntity | null = null;

  private gameState: GameState = GameState.Title;
  private saveData: SaveData;
  private hasExistingSave: boolean;
  private missionProgress: MissionProgressState;
  private gameOverSummary: GameOverSummary | null = null;
  private notification: HudNotification | null = null;
  private notificationTimer = 0;
  private notificationCounter = 1;

  private frameId = 0;
  private lastTimestamp = 0;
  private hudEmitAccum = 0;
  private hitstopTimer = 0;
  private brakeScreechCooldown = 0;
  private infractionCooldown = 0;
  private saveAccum = 0;
  private fpsSmooth = 60;
  private disposed = false;

  private readonly onHudUpdate: (snapshot: HudSnapshot) => void;
  private readonly boundResize: () => void;

  constructor(mountEl: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.mountEl = mountEl;
    this.onHudUpdate = onHudUpdate;

    // Load or initialize local save
    const loaded = loadSaveData();
    this.hasExistingSave = loaded !== null;
    this.saveData = loaded ?? createDefaultSaveData();

    // Detect software WebGL (SwiftShader / headless) strictly for rendering cost pacing
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(mountEl.clientWidth || window.innerWidth, mountEl.clientHeight || window.innerHeight);
    this.applyGraphicsSettings(this.saveData.settings);

    mountEl.innerHTML = '';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'vice-canvas');
    mountEl.appendChild(this.renderer.domElement);

    // Scene + mandatory procedural RoomEnvironment IBL
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // Build city layout & 3D world
    this.layout = generateCityLayout();
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.world = buildCityWorld(this.layout, this.textures);
    this.scene.add(this.world.root);

    // Camera
    const aspect = (mountEl.clientWidth || window.innerWidth) / Math.max(1, mountEl.clientHeight || window.innerHeight);
    this.cameraRig = new CameraRig(aspect);
    this.cameraRig.viewMode = this.saveData.settings.cameraMode;

    // Time & Weather
    this.timeWeather = new TimeAndWeatherSystem(this.scene, this.isSoftwareGl);
    this.timeWeather.setTimePreset(this.saveData.settings.timePreset);
    this.timeWeather.setWeather(
      this.saveData.settings.weather,
      this.saveData.settings.dynamicWeather,
    );

    // Modular Cinematic Post-Processing (Selective HDR Bloom + Time/Weather Colour Grading + OutputPass)
    this.postPipeline = new CinematicPostPipeline(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
      this.isSoftwareGl,
      this.saveData.settings.graphics,
    );

    // Sync renderer, post-processing composer, and directional shadow quality
    this.applyGraphicsSettings(this.saveData.settings);

    // Audio
    this.sound = new SoundEngine(this.saveData.settings);

    // Player
    this.player = new PlayerController(this.textures.contactShadowMap);
    this.player.setPosition(
      this.layout.playerSpawn.x,
      this.layout.playerSpawn.z,
      this.layout.playerSpawn.yaw,
    );
    this.scene.add(this.player.root);

    // Drivable Fleet (Sports Car, Luxury Sedan, SUV placed naturally in districts)
    this.spawnInitialVehicles();

    // Living Traffic, Pedestrians, Police & World Markers
    this.traffic = new TrafficSystem(this.textures.contactShadowMap, 14);
    this.scene.add(this.traffic.root);

    this.pedestrians = new PedestrianSystem(
      this.layout.sidewalkLoops,
      this.textures.contactShadowMap,
      22,
    );
    this.scene.add(this.pedestrians.root);

    this.police = new PoliceSystem(this.textures.contactShadowMap, 4);
    this.scene.add(this.police.root);

    this.markers = new WorldEffectsAndMarkers();
    this.scene.add(this.markers.root);

    // Mission state
    this.missionProgress = createMissionProgress(
      this.saveData.activeMissionId,
      false,
      this.saveData.activeCheckpointIndex,
    );

    // Input
    this.input = new InputManager();
    this.input.attach(this.renderer.domElement);

    // Pre-warm shaders on real GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.cameraRig.camera);
    }

    // Resize listener
    this.boundResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundResize);

    // Initial state mirror + immediate synchronous first frame so Title Screen paints the live 3D city right away
    this.setGameState(GameState.Title);
    this.cameraRig.updateTitleTour(0.016);
    this.timeWeather.update(0.016, 60, 0, this.world);
    this.renderFrame(0.016);
    this.emitHudSnapshot();

    // Start loop
    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  public getHasExistingSave(): boolean {
    return this.hasExistingSave;
  }

  public getSettings(): GameSettings {
    return { ...this.saveData.settings };
  }

  public getSaveData(): SaveData {
    return { ...this.saveData };
  }

  private spawnInitialVehicles(): void {
    const placements: Array<{ id: string; specId: string; x: number; z: number; heading: number }> = [
      // Starter Sports Car right ahead of player on Ocean Drive
      { id: 'starter_veloce', specId: 'veloce_gt', x: 90.4, z: 46.5, heading: 0 },
      // Luxury Sedan parked outside Downtown Vice Plaza
      { id: 'downtown_solstice', specId: 'solstice_royale', x: 25.5, z: -20, heading: Math.PI },
      // SUV parked near Ocean Drive South Marina
      { id: 'marina_titan', specId: 'bayside_titan', x: 91.5, z: 84, heading: 0 },
      // Second SUV at Industrial Harbour yard
      { id: 'harbour_titan', specId: 'bayside_titan', x: -88, z: 62, heading: -Math.PI / 2 },
    ];

    for (const p of placements) {
      const spec = VEHICLE_CATALOG[p.specId];
      const rig = createVehicleMesh(spec, this.textures.contactShadowMap);
      const body = createInitialVehicleState(p.x, p.z, p.heading);
      rig.root.position.set(body.x, 0, body.z);
      rig.root.rotation.y = body.heading;
      this.scene.add(rig.root);
      this.vehicles.push({ instanceId: p.id, spec, rig, body });
    }
  }

  // -------------------------------------------------------
  // PUBLIC UI ACTIONS
  // -------------------------------------------------------

  public startNewGame(): void {
    this.sound.unlock();
    this.sound.playUiClick();
    const preservedSettings = { ...this.saveData.settings };
    clearSaveData();
    this.saveData = createDefaultSaveData();
    this.saveData.settings = preservedSettings;
    this.hasExistingSave = true;
    this.resetWorldPositionsForMission('the_first_ride', true);
    this.persistNow();
    this.setGameState(GameState.Playing);
    this.pushNotification('WELCOME TO MINI VICE CITY', 'Step into the Veloce GT and cruise Ocean Drive', 'gold');
  }

  public continueGame(): void {
    this.sound.unlock();
    this.sound.playUiClick();
    const activeId = this.saveData.activeMissionId ?? 'the_first_ride';
    this.resetWorldPositionsForMission(activeId, false);
    this.setGameState(GameState.Playing);
    const m = getMissionById(activeId);
    if (m) {
      this.pushNotification(m.title, 'Welcome back to Mini Vice City', 'cyan');
    } else {
      this.pushNotification('FREE ROAM', 'Explore Mini Vice City at your own pace', 'cyan');
    }
  }

  public pauseGame(): void {
    if (this.gameState !== GameState.Playing) return;
    this.sound.playUiClick();
    this.setGameState(GameState.Paused);
  }

  public resumeGame(): void {
    if (this.gameState !== GameState.Paused) return;
    this.sound.unlock();
    this.sound.playUiClick();
    this.setGameState(GameState.Playing);
  }

  public returnToTitle(): void {
    this.sound.playUiClick();
    this.persistNow();
    this.police.clearWanted();
    this.gameOverSummary = null;
    this.setGameState(GameState.Title);
  }

  public startMission(missionId: string): void {
    this.sound.unlock();
    this.sound.playUiClick();
    const def = getMissionById(missionId);
    if (!def) return;
    this.saveData.activeMissionId = def.id;
    this.saveData.activeCheckpointIndex = 0;
    this.gameOverSummary = null;
    this.resetWorldPositionsForMission(def.id, true);
    if (def.triggerWantedStars && def.triggerWantedStars > 0) {
      this.police.reportInfraction(30, def.triggerWantedStars);
    }
    this.persistNow();
    this.setGameState(GameState.Playing);
    this.pushNotification(def.title, def.brief.slice(0, 72), 'gold');
  }

  public restartCurrentMission(): void {
    const id = this.missionProgress.missionId ?? this.saveData.activeMissionId ?? 'the_first_ride';
    this.startMission(id);
  }

  public clearActiveMissionToFreeRoam(): void {
    this.sound.playUiClick();
    this.missionProgress = createMissionProgress(null, this.activeVehicle !== null, 0);
    this.saveData.activeMissionId = null;
    this.saveData.activeCheckpointIndex = 0;
    this.gameOverSummary = null;
    this.police.clearWanted();
    this.persistNow();
    this.setGameState(GameState.Playing);
    this.pushNotification('FREE ROAM', 'Explore all 5 coastal districts freely', 'cyan');
  }

  public purchaseOrSummonVehicle(specId: string): { ok: boolean; message: string } {
    const spec = VEHICLE_CATALOG[specId];
    if (!spec) return { ok: false, message: 'Vehicle not found' };
    this.sound.unlock();

    const unlocked = this.saveData.unlockedVehicleIds.includes(specId);
    if (!unlocked) {
      if (this.saveData.money < spec.price) {
        return { ok: false, message: `Need $${spec.price.toLocaleString()}` };
      }
      this.saveData.money -= spec.price;
      this.saveData.unlockedVehicleIds.push(specId);
      this.sound.playCheckpoint();
    } else {
      this.sound.playUiClick();
    }

    // Place or move a vehicle of this spec safely beside the player
    const px = this.activeVehicle ? this.activeVehicle.body.x : this.player.x;
    const pz = this.activeVehicle ? this.activeVehicle.body.z : this.player.z;
    const heading = this.activeVehicle ? this.activeVehicle.body.heading : this.player.heading;

    if (this.activeVehicle) {
      this.exitVehicle();
    }

    let targetVeh = this.vehicles.find((v) => v.spec.id === specId);
    if (!targetVeh) {
      const rig = createVehicleMesh(spec, this.textures.contactShadowMap);
      const body = createInitialVehicleState(px, pz, heading);
      this.scene.add(rig.root);
      targetVeh = { instanceId: `garage_${specId}`, spec, rig, body };
      this.vehicles.push(targetVeh);
    }

    // Find clear curb offset near player
    const spawnX = px + Math.cos(heading) * 4.2;
    const spawnZ = pz - Math.sin(heading) * 4.2;
    const resolved = resolveCircleVsBoxes(spawnX, spawnZ, 2.2, this.layout.colliders);
    const clamped = clampToPlayableIsland(resolved.x, resolved.z, 2.2);
    targetVeh.body = createInitialVehicleState(clamped.x, clamped.z, heading);
    targetVeh.rig.root.position.set(clamped.x, 0, clamped.z);
    targetVeh.rig.root.rotation.y = heading;

    this.persistNow();
    this.setGameState(GameState.Playing);
    this.pushNotification('GARAGE DELIVERY', `${spec.name} delivered nearby`, 'emerald');
    return { ok: true, message: `${spec.name} delivered` };
  }

  public triggerTestPolicePursuit(): void {
    this.sound.unlock();
    const newStars = this.police.reportInfraction(28, 2);
    if (newStars > 0) {
      this.pushNotification('VCPD PURSUIT', `Wanted Level ${newStars} — Evade the Patrols`, 'rose');
    }
    this.emitHudSnapshot();
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.saveData.settings = { ...this.saveData.settings, ...partial };
    this.applyGraphicsSettings(this.saveData.settings);
    this.sound.updateSettings(this.saveData.settings);
    this.cameraRig.viewMode = this.saveData.settings.cameraMode;
    this.timeWeather.setTimePreset(this.saveData.settings.timePreset);
    this.timeWeather.setWeather(
      this.saveData.settings.weather,
      this.saveData.settings.dynamicWeather,
    );
    this.persistNow();
    this.emitHudSnapshot();
  }

  public toggleMute(): void {
    this.updateSettings({ muted: !this.saveData.settings.muted });
  }

  private applyGraphicsSettings(settings: GameSettings): void {
    const baseDpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    const qualityMult =
      settings.graphics === GraphicsQuality.Low
        ? 0.75
        : settings.graphics === GraphicsQuality.Medium
          ? 0.9
          : 1.0;
    const targetPr = this.isSoftwareGl
      ? 1
      : Math.max(0.7, baseDpr * qualityMult * settings.resolutionScale);
    this.renderer.setPixelRatio(targetPr);

    if (this.timeWeather) {
      if (this.isSoftwareGl || settings.graphics === GraphicsQuality.Low) {
        this.renderer.shadowMap.enabled = false;
        this.timeWeather.setShadowQuality(false, 512, settings.graphics);
      } else if (settings.graphics === GraphicsQuality.Medium) {
        this.renderer.shadowMap.enabled = true;
        this.timeWeather.setShadowQuality(true, 1024, settings.graphics);
      } else {
        this.renderer.shadowMap.enabled = true;
        this.timeWeather.setShadowQuality(true, 2048, settings.graphics);
      }
    }

    if (this.postPipeline) {
      const w = this.mountEl.clientWidth || window.innerWidth;
      const h = this.mountEl.clientHeight || window.innerHeight;
      this.postPipeline.setQuality(settings.graphics);
      this.postPipeline.setSize(w, h, targetPr);
    }
  }

  private resetWorldPositionsForMission(missionId: string, fullReset: boolean): void {
    this.police.clearWanted();
    this.player.health = this.player.maxHealth;
    this.gameOverSummary = null;

    const starterCar = this.vehicles[0];
    if (missionId === 'the_first_ride') {
      // Spawn player on Ocean Drive looking straight at the marked Veloce GT
      this.activeVehicle = null;
      this.player.setVisible(true);
      this.player.setPosition(
        this.layout.playerSpawn.x,
        this.layout.playerSpawn.z,
        this.layout.playerSpawn.yaw,
      );
      if (starterCar) {
        starterCar.body = createInitialVehicleState(90.4, 46.5, 0);
        starterCar.rig.root.position.set(90.4, 0, 46.5);
        starterCar.rig.root.rotation.y = 0;
      }
      this.cameraRig.snapToGameplay(
        this.player.x,
        0,
        this.player.z,
        this.layout.playerSpawn.yaw,
      );
    } else {
      const def = getMissionById(missionId);
      if (def && def.requiresVehicle && starterCar) {
        // Place player directly inside their sports car at mission start
        const sx = def.startPos.x;
        const sz = def.startPos.z;
        const cp0 = def.checkpoints[0];
        const startHeading = cp0
          ? Math.atan2(-(cp0.x - sx), -(cp0.z - sz))
          : 0;
        starterCar.body = createInitialVehicleState(sx, sz, startHeading);
        starterCar.rig.root.position.set(sx, 0, sz);
        starterCar.rig.root.rotation.y = startHeading;
        this.activeVehicle = starterCar;
        this.player.setVisible(false);
        this.player.setPosition(sx, sz, startHeading);
        this.cameraRig.snapToGameplay(sx, 0, sz, startHeading);
      } else if (def) {
        this.activeVehicle = null;
        this.player.setVisible(true);
        this.player.setPosition(def.startPos.x, def.startPos.z, 0);
        this.cameraRig.snapToGameplay(def.startPos.x, 0, def.startPos.z, 0);
      }
    }

    this.missionProgress = createMissionProgress(
      missionId,
      this.activeVehicle !== null,
      fullReset ? 0 : this.saveData.activeCheckpointIndex,
    );
  }

  private setGameState(next: GameState): void {
    this.gameState = next;
    document.body.dataset.state = next;

    const isPlaying = next === GameState.Playing;
    this.input.setGameplayActive(isPlaying);
    this.sound.setPaused(next === GameState.Paused);

    if (isPlaying) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    this.emitHudSnapshot();
  }

  private pushNotification(
    title: string,
    subtitle: string | undefined,
    accent: HudNotification['accent'],
  ): void {
    this.notification = {
      id: this.notificationCounter++,
      title,
      subtitle,
      accent,
    };
    this.notificationTimer = 4.2;
    this.emitHudSnapshot();
  }

  private persistNow(): void {
    this.saveData.activeMissionId = this.missionProgress.missionId;
    this.saveData.activeCheckpointIndex = this.missionProgress.checkpointIndex;
    persistSaveData(this.saveData);
    this.hasExistingSave = true;
  }

  // -------------------------------------------------------
  // VEHICLE ENTER / EXIT INTERACTION
  // -------------------------------------------------------

  private enterVehicle(veh: DrivableVehicleEntity): void {
    this.activeVehicle = veh;
    this.player.setVisible(false);
    this.player.setPosition(veh.body.x, veh.body.z, veh.body.heading);
    this.sound.playDoorLatch(true);
    this.emitHudSnapshot();
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) return;
    const v = this.activeVehicle;
    // Place character safely beside driver's left door
    const leftX = v.body.x - Math.cos(v.body.heading) * (v.spec.width * 0.5 + 1.05);
    const leftZ = v.body.z + Math.sin(v.body.heading) * (v.spec.width * 0.5 + 1.05);
    const col = resolveCircleVsBoxes(leftX, leftZ, 0.52, this.layout.colliders);
    const clamped = clampToPlayableIsland(col.x, col.z, 0.52);

    // Gently bring car to halt when exiting
    v.body.vx *= 0.25;
    v.body.vz *= 0.25;
    v.body.speed *= 0.25;

    this.activeVehicle = null;
    this.player.setPosition(clamped.x, clamped.z, v.body.heading);
    this.player.setVisible(true);
    this.sound.playDoorLatch(false);
    this.emitHudSnapshot();
  }

  // -------------------------------------------------------
  // SIMULATION TICK & SOFTWARE-WEBGL PACED LOOP
  // -------------------------------------------------------

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick(): void {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    if (rawDt > 0.001) {
      this.fpsSmooth = this.fpsSmooth * 0.9 + Math.min(120, 1 / rawDt) * 0.1;
    }

    // Handle global hotkeys in Playing state
    if (this.gameState === GameState.Playing) {
      if (this.input.consumeJustPressed('Escape') || this.input.consumeJustPressed('KeyP')) {
        this.pauseGame();
      } else if (this.input.consumeJustPressed('KeyM')) {
        this.toggleMute();
      }
    }

    // Always animate ocean & ambience smoothly (except frozen on pause)
    if (this.gameState !== GameState.Paused) {
      this.world.oceanUniforms.uTime.value += dt;
    }

    if (this.gameState === GameState.Title) {
      this.cameraRig.updateTitleTour(dt);
      this.timeWeather.update(dt, 60, 0, this.world);
      this.traffic.update(dt, 999, 999, this.timeWeather.nightFactor, this.world.trafficSignals);
      this.pedestrians.update(dt, 999, 999, false, 0);
      this.sound.updateContinuous({
        dt,
        inVehicle: false,
        speedRatio: 0,
        throttle: false,
        braking: false,
        rainAmount: this.timeWeather.rainAmount,
        sirenProximity: 0,
        playing: false,
      });
    } else if (this.gameState === GameState.Playing) {
      this.stepPlaying(dt);
    } else if (this.gameState === GameState.GameOver) {
      // Gentle slow orbit around player on outcome screen
      this.markers.update(dt);
      this.sound.updateContinuous({
        dt,
        inVehicle: false,
        speedRatio: 0,
        throttle: false,
        braking: false,
        rainAmount: this.timeWeather.rainAmount,
        sirenProximity: 0,
        playing: false,
      });
    }

    this.input.endFrame();
    this.renderFrame(dt);
    this.scheduleNextFrame();
  }

  private renderFrame(dt: number): void {
    this.postPipeline.update(dt, {
      timeHours: this.timeWeather.timeHours,
      nightFactor: this.timeWeather.nightFactor,
      rainAmount: this.timeWeather.rainAmount,
      cloudAmount: this.timeWeather.cloudAmount,
      stormDarkness: this.timeWeather.getStormDarkness(),
      wantedStars: this.police.wanted.stars,
    });
    this.postPipeline.render(dt);
  }

  private stepPlaying(dt: number): void {
    // Hitstop freeze ticks in real dt while simulation pauses briefly on heavy crash
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      const focusX = this.activeVehicle ? this.activeVehicle.body.x : this.player.x;
      const focusZ = this.activeVehicle ? this.activeVehicle.body.z : this.player.z;
      const focusH = this.activeVehicle ? this.activeVehicle.body.heading : this.player.heading;
      this.cameraRig.updateGameplay({
        dt,
        targetX: focusX,
        targetY: this.activeVehicle ? 0 : this.player.y,
        targetZ: focusZ,
        targetHeading: focusH,
        inVehicle: this.activeVehicle !== null,
        vehicleSpeed: this.activeVehicle ? this.activeVehicle.body.speed : 0,
        mouseDx: 0,
        mouseDy: 0,
        wheelDelta: 0,
        sensitivity: this.saveData.settings.mouseSensitivity,
        environmentMeshes: this.world.environmentMeshesForCamera,
      });
      this.markers.update(dt);
      return;
    }

    this.brakeScreechCooldown = Math.max(0, this.brakeScreechCooldown - dt);
    this.infractionCooldown = Math.max(0, this.infractionCooldown - dt);

    // Notification fade timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.notification = null;
      }
    }

    const { dx: mouseDx, dy: mouseDy } = this.input.consumeMouseDelta();
    const wheelDelta = this.input.consumeWheelDelta();

    // Camera view cycling when in vehicle
    if (this.activeVehicle && this.input.consumeJustPressed('KeyC')) {
      const nextView = this.cameraRig.cycleDriveView();
      this.saveData.settings.cameraMode = nextView;
      this.sound.playUiClick();
      this.emitHudSnapshot();
    }

    // Interact [F]: Enter or Exit vehicle
    const interactPressed = this.input.consumeJustPressed('KeyF');
    if (interactPressed) {
      if (this.activeVehicle) {
        this.exitVehicle();
      } else if (this.nearbyVehicle) {
        this.enterVehicle(this.nearbyVehicle);
      }
    }

    let throttleActive = false;
    let brakingActive = false;

    if (this.activeVehicle) {
      // DRIVING SIMULATION
      const v = this.activeVehicle;
      const throttle = this.input.isHeld('KeyW') || this.input.isHeld('ArrowUp') ? 1 : 0;
      const brake = this.input.isHeld('KeyS') || this.input.isHeld('ArrowDown') ? 1 : 0;
      const steerLeft = this.input.isHeld('KeyA') || this.input.isHeld('ArrowLeft') ? 1 : 0;
      const steerRight = this.input.isHeld('KeyD') || this.input.isHeld('ArrowRight') ? 1 : 0;
      const handbrake = this.input.isHeld('Space');

      throttleActive = throttle > 0;
      brakingActive = brake > 0 || handbrake;

      const prevX = v.body.x;
      const prevZ = v.body.z;
      v.body = stepVehiclePhysics(
        v.body,
        v.spec,
        { throttle, brake, steer: steerLeft - steerRight, handbrake },
        dt,
        this.layout.colliders,
        this.timeWeather.rainAmount,
      );

      // Track distance driven stat
      this.saveData.stats.distanceDrivenKm +=
        Math.hypot(v.body.x - prevX, v.body.z - prevZ) / 1000;

      // Collide against AI traffic cars
      const trafficHit = this.traffic.checkCollisionWithPlayerVehicle(
        v.body.x,
        v.body.z,
        v.spec.width * 0.56,
      );
      if (trafficHit.hit) {
        const hitSpd = Math.abs(v.body.speed);
        v.body.x += trafficHit.nx * 0.45;
        v.body.z += trafficHit.nz * 0.45;
        v.body.vx *= 0.45;
        v.body.vz *= 0.45;
        v.body.speed *= 0.45;
        v.body.impactSpeed = Math.max(v.body.impactSpeed, hitSpd);

        // Hitting traffic at speed raises police heat!
        if (hitSpd > 10 && this.infractionCooldown <= 0) {
          this.infractionCooldown = 4.5;
          const escalated = this.police.reportInfraction(14);
          if (escalated > 0) {
            this.pushNotification('WANTED LEVEL', `VCPD Alert — ${escalated} Star${escalated > 1 ? 's' : ''}`, 'rose');
          }
        }
      }

      // Impact feedback: hitstop + camera shake + sparks + impact synth + slight health loss on extreme crashes
      if (v.body.impactSpeed > 6.5) {
        const intensity = Math.min(1, v.body.impactSpeed / 24);
        this.sound.playImpact(intensity);
        this.cameraRig.addTrauma(intensity * 0.85);
        this.markers.spawnBurst(v.body.x, 0.8, v.body.z, Math.round(8 + intensity * 14), 0xfbbf24, 7.5);
        if (v.body.impactSpeed > 15) {
          this.hitstopTimer = 0.045;
          this.player.health = Math.max(15, this.player.health - Math.round(intensity * 10));
        }
      }

      // Tire screech on high-speed handbrake drift
      if (handbrake && Math.abs(v.body.speed) > 10 && this.brakeScreechCooldown <= 0) {
        this.brakeScreechCooldown = 0.28;
        this.sound.playBrakeScreech();
        this.markers.spawnBurst(v.body.x, 0.2, v.body.z, 3, 0xe2e8f0, 2.2);
      }

      // Keep hidden player synced to car position
      this.player.x = v.body.x;
      this.player.z = v.body.z;
      this.player.y = 0;
      this.player.heading = v.body.heading;
    } else {
      // ON-FOOT THIRD-PERSON PLAYER SIMULATION
      const fwd =
        (this.input.isHeld('KeyW') || this.input.isHeld('ArrowUp') ? 1 : 0) -
        (this.input.isHeld('KeyS') || this.input.isHeld('ArrowDown') ? 1 : 0);
      const right =
        (this.input.isHeld('KeyD') || this.input.isHeld('ArrowRight') ? 1 : 0) -
        (this.input.isHeld('KeyA') || this.input.isHeld('ArrowLeft') ? 1 : 0);
      const sprint = this.input.isHeld('ShiftLeft') || this.input.isHeld('ShiftRight');
      const jumpJustPressed = this.input.consumeJustPressed('Space');
      const jumpHeld = this.input.isHeld('Space');

      const vehicleCircles = [
        ...this.vehicles.map((v) => ({
          x: v.body.x,
          z: v.body.z,
          radius: Math.max(v.spec.width * 0.56, v.spec.length * 0.36),
        })),
        ...this.traffic.getObstaclePositions(),
      ];

      this.player.update({
        dt,
        moveForward: fwd,
        moveRight: right,
        sprint,
        jumpJustPressed,
        jumpHeld,
        cameraYaw: this.cameraRig.yaw,
        colliders: this.layout.colliders,
        vehicleCircles,
        onFootstep: (s) => this.sound.playFootstep(s),
        onJump: () => this.sound.playJump(),
      });
    }

    // Update all drivable vehicle 3D rigs (lights, wheels, suspension pitch/roll)
    const nightFactor = this.timeWeather.nightFactor;
    let closestVeh: DrivableVehicleEntity | null = null;
    let closestVehDist = 6.5;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      // Coasting deceleration for unoccupied cars
      if (v !== this.activeVehicle && Math.abs(v.body.speed) > 0.05) {
        v.body = stepVehiclePhysics(
          v.body,
          v.spec,
          { throttle: 0, brake: 0, steer: 0, handbrake: true },
          dt,
          this.layout.colliders,
          this.timeWeather.rainAmount,
        );
      }

      v.rig.root.position.set(v.body.x, 0, v.body.z);
      v.rig.root.rotation.y = v.body.heading;
      v.rig.bodyGroup.rotation.x = v.body.pitch;
      v.rig.bodyGroup.rotation.z = v.body.roll;
      v.rig.frontLeftPivot.rotation.y = v.body.steerAngle;
      v.rig.frontRightPivot.rotation.y = v.body.steerAngle;
      for (let w = 0; w < v.rig.wheels.length; w++) {
        v.rig.wheels[w].rotation.x = -v.body.wheelSpin;
      }

      const isDriven = v === this.activeVehicle;
      v.rig.headlightMat.emissiveIntensity = (isDriven ? 1.35 : 0.2) + nightFactor * 2.4;
      (v.rig.headlightBeam.material as THREE.MeshBasicMaterial).opacity =
        isDriven ? 0.06 + nightFactor * 0.28 : nightFactor * 0.08;
      v.rig.brakeLightMat.emissiveIntensity =
        v.body.braking || v.body.reversing ? 3.2 : (isDriven ? 0.85 : 0.25) + nightFactor * 1.15;

      if (!this.activeVehicle) {
        const d = dist2D(this.player.x, this.player.z, v.body.x, v.body.z);
        if (d < closestVehDist) {
          closestVehDist = d;
          closestVeh = v;
        }
      }
    }
    this.nearbyVehicle = closestVeh;

    // Update focus position & camera
    const focusX = this.activeVehicle ? this.activeVehicle.body.x : this.player.x;
    const focusY = this.activeVehicle ? 0 : this.player.y;
    const focusZ = this.activeVehicle ? this.activeVehicle.body.z : this.player.z;
    const focusHeading = this.activeVehicle ? this.activeVehicle.body.heading : this.player.heading;
    const currentSpeed = this.activeVehicle ? this.activeVehicle.body.speed : 0;

    this.cameraRig.updateGameplay({
      dt,
      targetX: focusX,
      targetY: focusY,
      targetZ: focusZ,
      targetHeading: focusHeading,
      inVehicle: this.activeVehicle !== null,
      vehicleSpeed: currentSpeed,
      mouseDx,
      mouseDy,
      wheelDelta,
      sensitivity: this.saveData.settings.mouseSensitivity,
      environmentMeshes: this.world.environmentMeshesForCamera,
    });

    // Update living city systems
    this.timeWeather.update(dt, focusX, focusZ, this.world, focusHeading, currentSpeed);
    this.traffic.update(dt, focusX, focusZ, nightFactor, this.world.trafficSignals);

    const startledPed = this.pedestrians.update(
      dt,
      focusX,
      focusZ,
      this.activeVehicle !== null,
      currentSpeed,
    );
    if (startledPed && this.infractionCooldown <= 0) {
      this.infractionCooldown = 4.0;
      const escalated = this.police.reportInfraction(12);
      if (escalated > 0) {
        this.pushNotification('RECKLESS DRIVING', `VCPD Notified — ${escalated} Star${escalated > 1 ? 's' : ''}`, 'rose');
      }
    }

    // Update Police Pursuit System
    const policeRes = this.police.update({
      dt,
      playerX: focusX,
      playerZ: focusZ,
      playerHeading: focusHeading,
      playerSpeed: currentSpeed,
      nightFactor,
      colliders: this.layout.colliders,
    });

    if (policeRes.rammedPlayer) {
      this.sound.playImpact(0.75);
      this.cameraRig.addTrauma(0.65);
      this.markers.spawnBurst(focusX, 0.9, focusZ, 12, 0x38bdf8, 6);
      this.player.health = Math.max(0, this.player.health - 9);
      if (this.player.health <= 0) {
        this.triggerOutcome('wasted');
        return;
      }
    }

    if (policeRes.escapedStars > 0) {
      const bonus = policeRes.escapedStars * 350;
      this.saveData.money += bonus;
      this.saveData.stats.maxWantedEscaped = Math.max(
        this.saveData.stats.maxWantedEscaped,
        policeRes.escapedStars,
      );
      this.sound.playCheckpoint();
      this.pushNotification('ESCAPED VCPD', `Wanted cleared! +$${bonus.toLocaleString()}`, 'emerald');
      this.persistNow();
    }

    if (policeRes.busted) {
      this.triggerOutcome('busted');
      return;
    }

    // Track district discovery
    const district = getDistrictAt(focusX, focusZ);
    if (!this.saveData.discoveredDistricts.includes(district)) {
      this.saveData.discoveredDistricts.push(district);
      this.saveData.money += 250;
      this.pushNotification(`DISCOVERED ${DISTRICT_NAMES[district].toUpperCase()}`, '+$250 Exploration Bonus', 'cyan');
      this.persistNow();
    }

    // Update Mission Progression & 3D World Markers
    this.updateMissionStep(dt, focusX, focusZ);
    this.markers.update(dt);

    // Continuous procedural audio
    const maxSpd = this.activeVehicle ? this.activeVehicle.spec.maxSpeed : 35;
    this.sound.updateContinuous({
      dt,
      inVehicle: this.activeVehicle !== null,
      speedRatio: Math.min(1, Math.abs(currentSpeed) / maxSpd),
      throttle: throttleActive,
      braking: brakingActive,
      rainAmount: this.timeWeather.rainAmount,
      sirenProximity: this.police.closestSirenProximity,
      playing: true,
    });

    // Periodic autosave every 15 seconds
    this.saveAccum += dt;
    if (this.saveAccum >= 15) {
      this.saveAccum = 0;
      this.persistNow();
    }

    // Throttled HUD snapshot push (~10Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private updateMissionStep(dt: number, px: number, pz: number): void {
    const def = getMissionById(this.missionProgress.missionId);
    if (!def || this.missionProgress.stage === 'idle' || this.missionProgress.stage === 'completed') {
      this.markers.setCheckpoint(0, 0, false);
      this.markers.setCarMarker(0, 0, false);
      return;
    }

    const res = stepMissionProgress(
      this.missionProgress,
      px,
      pz,
      this.activeVehicle !== null,
      dt,
    );
    this.missionProgress = res.state;

    if (res.enteredVehicleStep) {
      this.sound.playCheckpoint();
      this.pushNotification('VELOCE GT ACQUIRED', 'Follow the gold beacons along Ocean Drive', 'gold');
    }

    if (res.checkpointReached && !res.missionCompleted) {
      this.sound.playCheckpoint();
      this.markers.spawnBurst(px, 1.8, pz, 18, 0xfde047, 8);
      const cp = def.checkpoints[this.missionProgress.checkpointIndex];
      if (cp) {
        this.pushNotification(
          `CHECKPOINT ${this.missionProgress.checkpointIndex}/${def.checkpoints.length}`,
          `Next: ${cp.label}`,
          'gold',
        );
      }
      this.persistNow();
    }

    if (res.missionFailedTimeout) {
      this.pushNotification('TIME EXPIRED', `${def.title} failed — Restart from Pause menu`, 'rose');
      this.missionProgress = createMissionProgress(null, this.activeVehicle !== null, 0);
      this.markers.setCheckpoint(0, 0, false);
      this.emitHudSnapshot();
      return;
    }

    if (res.missionCompleted) {
      this.completeMission(def);
      return;
    }

    // Position 3D world beacons
    if (this.missionProgress.stage === 'find_vehicle') {
      const starterCar = this.vehicles[0];
      if (starterCar) {
        this.markers.setCarMarker(starterCar.body.x, starterCar.body.z, true);
      }
      this.markers.setCheckpoint(0, 0, false);
    } else {
      this.markers.setCarMarker(0, 0, false);
      const cp = def.checkpoints[this.missionProgress.checkpointIndex];
      if (cp) {
        this.markers.setCheckpoint(cp.x, cp.z, true, cp.radius);
      }
    }
  }

  private completeMission(def: NonNullable<ReturnType<typeof getMissionById>>): void {
    this.sound.playMissionComplete();
    this.markers.setCheckpoint(0, 0, false);
    this.markers.setCarMarker(0, 0, false);
    this.markers.spawnBurst(this.player.x, 2.2, this.player.z, 32, 0xfbbf24, 10);

    this.saveData.money += def.reward;
    if (!this.saveData.completedMissionIds.includes(def.id)) {
      this.saveData.completedMissionIds.push(def.id);
    }
    this.saveData.stats.missionsCompleted += 1;

    const clearSec = Math.round(this.missionProgress.elapsedSec * 10) / 10;
    const prevBest = this.saveData.bestTimes[def.id];
    if (!prevBest || clearSec < prevBest) {
      this.saveData.bestTimes[def.id] = clearSec;
    }

    let unlockedName: string | undefined;
    if (def.unlockVehicleId && !this.saveData.unlockedVehicleIds.includes(def.unlockVehicleId)) {
      this.saveData.unlockedVehicleIds.push(def.unlockVehicleId);
      unlockedName = VEHICLE_CATALOG[def.unlockVehicleId]?.name;
    }

    this.police.clearWanted();
    this.saveData.activeMissionId = null;
    this.saveData.activeCheckpointIndex = 0;
    this.persistNow();

    this.gameOverSummary = {
      outcome: 'mission_complete',
      title: `${def.title} COMPLETE`,
      subtitle: unlockedName
        ? `Unlocked ${unlockedName} in your Garage`
        : 'Reward deposited to your Vice account',
      reward: def.reward,
      timeElapsedSec: clearSec,
      unlockedVehicleName: unlockedName,
      stats: [
        { label: 'CLEAR TIME', value: `${clearSec.toFixed(1)}s` },
        { label: 'REWARD', value: `+$${def.reward.toLocaleString()}` },
        { label: 'BALANCE', value: `$${this.saveData.money.toLocaleString()}` },
      ],
    };
    this.setGameState(GameState.GameOver);
  }

  private triggerOutcome(outcome: 'busted' | 'wasted'): void {
    this.sound.playImpact(0.95);
    const fine = Math.min(this.saveData.money, outcome === 'busted' ? 400 : 300);
    this.saveData.money = Math.max(0, this.saveData.money - fine);
    this.police.clearWanted();
    this.persistNow();

    this.gameOverSummary = {
      outcome,
      title: outcome === 'busted' ? 'BUSTED BY VCPD' : 'WRECKED',
      subtitle:
        outcome === 'busted'
          ? 'Vice Coastal Police impounded your ride and issued a citation.'
          : 'You took too much impact damage. Recover at Ocean Drive.',
      reward: -fine,
      timeElapsedSec: Math.round(this.missionProgress.elapsedSec),
      stats: [
        { label: 'FINE', value: `-$${fine.toLocaleString()}` },
        { label: 'BALANCE', value: `$${this.saveData.money.toLocaleString()}` },
        { label: 'MISSIONS', value: `${this.saveData.completedMissionIds.length}/${MISSIONS.length}` },
      ],
    };
    this.setGameState(GameState.GameOver);
  }

  // -------------------------------------------------------
  // HUD SNAPSHOT BUILDER
  // -------------------------------------------------------

  private emitHudSnapshot(): void {
    const px = this.activeVehicle ? this.activeVehicle.body.x : this.player.x;
    const pz = this.activeVehicle ? this.activeVehicle.body.z : this.player.z;
    const pHeading = this.activeVehicle ? this.activeVehicle.body.heading : this.player.heading;
    const district = getDistrictAt(px, pz);

    const def = getMissionById(this.missionProgress.missionId);
    let missionTitle: string | null = null;
    let missionObjective: string | null = null;
    let missionProgressText: string | null = null;
    let missionTargetPos: { x: number; z: number } | null = null;

    if (def && this.missionProgress.stage !== 'idle' && this.missionProgress.stage !== 'completed') {
      missionTitle = def.title;
      if (this.missionProgress.stage === 'find_vehicle') {
        missionObjective = 'Find & enter the marked Veloce GT on Ocean Drive [F]';
        missionProgressText = `0/${def.checkpoints.length}`;
        const starter = this.vehicles[0];
        if (starter) missionTargetPos = { x: starter.body.x, z: starter.body.z };
      } else {
        const cp = def.checkpoints[this.missionProgress.checkpointIndex];
        if (cp) {
          missionObjective =
            def.requiresVehicle && !this.activeVehicle
              ? `Get into a vehicle and head to ${cp.label}`
              : `Drive to ${cp.label}`;
          missionProgressText = `${this.missionProgress.checkpointIndex}/${def.checkpoints.length}`;
          missionTargetPos = { x: cp.x, z: cp.z };
        }
      }
    }

    // Build minimap blips
    const blips: MinimapBlip[] = [];
    if (missionTargetPos) {
      blips.push({
        x: missionTargetPos.x,
        z: missionTargetPos.z,
        kind: 'mission',
        color: '#fbbf24',
      });
    }
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v === this.activeVehicle) continue;
      blips.push({
        x: v.body.x,
        z: v.body.z,
        kind: 'vehicle',
        color: '#38bdf8',
      });
    }
    blips.push(...this.police.getActiveBlips());

    let interactionPrompt: string | null = null;
    if (this.gameState === GameState.Playing) {
      if (this.activeVehicle) {
        interactionPrompt = null;
      } else if (this.nearbyVehicle) {
        interactionPrompt = `Press [F] to Enter ${this.nearbyVehicle.spec.name}`;
      }
    }

    const speedKmh = this.activeVehicle
      ? Math.round(Math.abs(this.activeVehicle.body.speed) * 3.6)
      : 0;
    const gear = this.activeVehicle
      ? computeGearLabel(this.activeVehicle.body.speed, this.activeVehicle.body.reversing)
      : 'N';

    this.onHudUpdate({
      gameState: this.gameState,
      district,
      districtName: DISTRICT_NAMES[district],
      money: this.saveData.money,
      health: Math.round(this.player.health),
      maxHealth: this.player.maxHealth,
      wantedStars: this.police.wanted.stars,
      wantedEscaping: this.police.wanted.escaping,
      wantedCooldownRatio:
        this.police.wanted.escapeDuration > 0
          ? Math.min(1, this.police.wanted.escapeTimer / this.police.wanted.escapeDuration)
          : 0,
      inVehicle: this.activeVehicle !== null,
      vehicleName: this.activeVehicle ? this.activeVehicle.spec.name : '',
      speedKmh,
      gear,
      handbrake: this.activeVehicle ? this.activeVehicle.body.handbrake : false,
      cameraMode: this.cameraRig.viewMode,
      interactionPrompt,
      playerX: px,
      playerZ: pz,
      playerHeading: pHeading,
      timeHours: this.timeWeather.timeHours,
      timeLabel: `${formatTimeHours(this.timeWeather.timeHours)} · ${getTimePhaseName(this.timeWeather.timeHours)}`,
      weather: this.timeWeather.weather,
      missionTitle,
      missionObjective,
      missionProgressText,
      missionTimerSec: this.missionProgress.remainingSec,
      missionTargetPos,
      blips,
      notification: this.notification,
      completedMissionIds: [...this.saveData.completedMissionIds],
      unlockedVehicleIds: [...this.saveData.unlockedVehicleIds],
      activeMissionId: this.missionProgress.missionId,
      gameOverSummary: this.gameOverSummary,
      pointerLocked: this.input.isPointerLocked(),
      fps: Math.round(this.fpsSmooth),
    });
  }

  private handleResize(): void {
    const w = this.mountEl.clientWidth || window.innerWidth;
    const h = this.mountEl.clientHeight || window.innerHeight;
    this.cameraRig.resize(w / Math.max(1, h));
    this.renderer.setSize(w, h);
    if (this.postPipeline) {
      this.postPipeline.setSize(w, h, this.renderer.getPixelRatio());
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.boundResize);
    this.input.detach();
    this.sound.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.player.dispose();
    this.traffic.dispose();
    this.pedestrians.dispose();
    this.police.dispose();
    this.timeWeather.dispose();
    this.markers.dispose();
    for (const v of this.vehicles) v.rig.dispose();
    this.postPipeline.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    this.mountEl.innerHTML = '';
  }
}
