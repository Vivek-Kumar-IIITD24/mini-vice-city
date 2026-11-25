import * as THREE from 'three';
import { GraphicsQuality, TimePreset, WeatherType } from '../types';
import { clamp, damp, lerp } from '../core/math';
import { BuiltCityWorld } from '../world/cityBuilder';
import { applyRoadWetness, stepRoadWetness } from '../world/wetRoadSync';
import {
  applyShadowConfigToLight,
  computeCelestialState,
  computeStabilizedShadowPlacement,
  getShadowConfigForQuality,
  ShadowQualityConfig,
} from './sunAndShadow';
import {
  CloudAtmosphereState,
  CloudQualityConfig,
  computeSubtleCloudShadowFactor,
  createInitialCloudState,
  getCloudQualityConfig,
  SKY_DOME_FRAGMENT_SHADER,
  SKY_DOME_VERTEX_SHADER,
  stepCloudAtmosphereState,
} from './skyClouds';

interface SkyPalette {
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  sunIntensity: number;
  hemiIntensity: number;
  nightFactor: number;
}

const PALETTES: Array<{ hour: number; p: SkyPalette }> = [
  {
    hour: 0,
    p: {
      skyTop: new THREE.Color(0x050b18),
      skyMid: new THREE.Color(0x0b162c),
      fog: new THREE.Color(0x111f38),
      sun: new THREE.Color(0x9cbef5),
      hemiSky: new THREE.Color(0x223860),
      hemiGround: new THREE.Color(0x0b0f18),
      sunIntensity: 0.42,
      hemiIntensity: 0.34,
      nightFactor: 1.0,
    },
  },
  {
    hour: 6.2, // Sunrise
    p: {
      skyTop: new THREE.Color(0x2b4e7e),
      skyMid: new THREE.Color(0x8e8da6),
      fog: new THREE.Color(0xe6b696),
      sun: new THREE.Color(0xffc68f),
      hemiSky: new THREE.Color(0xa6bdd9),
      hemiGround: new THREE.Color(0x43414f),
      sunIntensity: 1.45,
      hemiIntensity: 0.62,
      nightFactor: 0.28,
    },
  },
  {
    hour: 9.5, // Morning
    p: {
      skyTop: new THREE.Color(0x266bb8),
      skyMid: new THREE.Color(0x64ade6),
      fog: new THREE.Color(0xbadbf2),
      sun: new THREE.Color(0xfff5e0),
      hemiSky: new THREE.Color(0x95c9f0),
      hemiGround: new THREE.Color(0x767064),
      sunIntensity: 2.2,
      hemiIntensity: 0.78,
      nightFactor: 0.0,
    },
  },
  {
    hour: 13.5, // Midday / Bright Afternoon
    p: {
      skyTop: new THREE.Color(0x1a5db0),
      skyMid: new THREE.Color(0x4e9de0),
      fog: new THREE.Color(0xa6d2ee),
      sun: new THREE.Color(0xfffaf0),
      hemiSky: new THREE.Color(0x8fc7f0),
      hemiGround: new THREE.Color(0x7d766b),
      sunIntensity: 2.45,
      hemiIntensity: 0.8,
      nightFactor: 0.0,
    },
  },
  {
    hour: 17.4, // Golden Hour (Warm low coastal sun + cool steel-blue sky contrast)
    p: {
      skyTop: new THREE.Color(0x254f85),
      skyMid: new THREE.Color(0x748fb2),
      fog: new THREE.Color(0xdeb396),
      sun: new THREE.Color(0xffbd70),
      hemiSky: new THREE.Color(0x8ca8cc),
      hemiGround: new THREE.Color(0x544a48),
      sunIntensity: 2.25,
      hemiIntensity: 0.68,
      nightFactor: 0.18,
    },
  },
  {
    hour: 19.3, // Sunset Dusk
    p: {
      skyTop: new THREE.Color(0x162348),
      skyMid: new THREE.Color(0x41446e),
      fog: new THREE.Color(0xa66b68),
      sun: new THREE.Color(0xff8c5a),
      hemiSky: new THREE.Color(0x525d87),
      hemiGround: new THREE.Color(0x242030),
      sunIntensity: 1.25,
      hemiIntensity: 0.48,
      nightFactor: 0.76,
    },
  },
  {
    hour: 21.5, // Night
    p: {
      skyTop: new THREE.Color(0x050b18),
      skyMid: new THREE.Color(0x0b162c),
      fog: new THREE.Color(0x111f38),
      sun: new THREE.Color(0x9cbef5),
      hemiSky: new THREE.Color(0x223860),
      hemiGround: new THREE.Color(0x0b0f18),
      sunIntensity: 0.42,
      hemiIntensity: 0.34,
      nightFactor: 1.0,
    },
  },
  {
    hour: 24,
    p: {
      skyTop: new THREE.Color(0x050b18),
      skyMid: new THREE.Color(0x0b162c),
      fog: new THREE.Color(0x111f38),
      sun: new THREE.Color(0x9cbef5),
      hemiSky: new THREE.Color(0x223860),
      hemiGround: new THREE.Color(0x0b0f18),
      sunIntensity: 0.42,
      hemiIntensity: 0.34,
      nightFactor: 1.0,
    },
  },
];

const PRESET_HOURS: Record<Exclude<TimePreset, TimePreset.Dynamic>, number> = {
  [TimePreset.Morning]: 9.5,
  [TimePreset.Afternoon]: 13.5,
  [TimePreset.GoldenHour]: 17.4,
  [TimePreset.Sunset]: 19.3,
  [TimePreset.Night]: 22.5,
};

const CELESTIAL_DISC_DISTANCE = 420;

export class TimeAndWeatherSystem {
  public timeHours = 17.4; // Start in signature golden hour
  public nightFactor = 0.18;
  public rainAmount = 0; // 0..1 smooth transition
  public roadWetness = 0; // 0..1 smooth road surface wetness (wets during rain, dries gradually)
  public cloudAmount = 0; // 0..1 smooth transition
  public weather: WeatherType = WeatherType.Clear;
  public timePreset: TimePreset = TimePreset.GoldenHour;
  public dynamicWeather = false;

  // Consistent world-space celestial direction vectors (from scene toward celestial body)
  public readonly sunDirection = new THREE.Vector3(-0.82, 0.43, -0.37).normalize();
  public readonly moonDirection = new THREE.Vector3(0.5, 0.29, -0.81).normalize();
  public readonly activeLightDirection = new THREE.Vector3(-0.82, 0.43, -0.37).normalize();
  public isMoonActive = false;

  private weatherChangeTimer = 90;
  private readonly scene: THREE.Scene;
  private readonly isSoftwareGl: boolean;
  private shadowConfig: ShadowQualityConfig;
  private cloudQuality: CloudQualityConfig;
  private cloudState: CloudAtmosphereState;
  private shadowLeadX = 0;
  private shadowLeadZ = 0;

  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly fog: THREE.FogExp2;
  private readonly bgColor = new THREE.Color(0x748fb2);

  // Scratch colors (zero GC in loop)
  private readonly tmpSkyTop = new THREE.Color();
  private readonly tmpSkyMid = new THREE.Color();
  private readonly tmpFog = new THREE.Color();
  private readonly tmpSun = new THREE.Color();
  private readonly tmpHemiSky = new THREE.Color();
  private readonly tmpHemiGround = new THREE.Color();
  private readonly tmpStormColor = new THREE.Color();
  private readonly overcastSkyTop = new THREE.Color(0x4c5d70);
  private readonly overcastSkyMid = new THREE.Color(0x78889a);
  private readonly overcastFog = new THREE.Color(0x8897a6);
  private readonly stormSkyTop = new THREE.Color(0x1f2834);
  private readonly stormSkyMid = new THREE.Color(0x323d4c);
  private readonly stormFog = new THREE.Color(0x3d4958);
  private readonly stormHemiSky = new THREE.Color(0x526175);
  private readonly sunDiscCoreTint = new THREE.Color(0xfff4d6);
  private readonly moonKeyColor = new THREE.Color(0x9cbef5);
  private readonly moonDiscColor = new THREE.Color(0xe6f0ff);

  // Atmospheric gradient + procedural cloud sky dome & aligned sun/moon discs
  private readonly skyDomeGeo: THREE.SphereGeometry;
  private readonly skyDomeMat: THREE.ShaderMaterial;
  private readonly skyDome: THREE.Mesh;
  private readonly sunDiscGeo: THREE.SphereGeometry;
  private readonly sunDiscMat: THREE.MeshBasicMaterial;
  private readonly sunDisc: THREE.Mesh;
  private readonly moonDiscGeo: THREE.SphereGeometry;
  private readonly moonDiscMat: THREE.MeshBasicMaterial;
  private readonly moonDisc: THREE.Mesh;

  // Pooled rain particle streaks (zero allocation)
  private readonly rainPoints: THREE.Points;
  private readonly rainCount = 900;
  private readonly rainPositions: Float32Array;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly rainGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.shadowConfig = getShadowConfigForQuality(GraphicsQuality.High, isSoftwareGl);
    this.cloudQuality = getCloudQualityConfig(GraphicsQuality.High, isSoftwareGl);
    this.cloudState = createInitialCloudState(this.weather);
    this.scene.environmentIntensity = 0.45;

    this.fog = new THREE.FogExp2(0xdeb396, this.cloudState.fogDensity);
    scene.fog = this.fog;
    scene.background = this.bgColor;

    this.hemiLight = new THREE.HemisphereLight(0x8ca8cc, 0x544a48, 0.68);
    this.hemiLight.position.set(0, 80, 0);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffbd70, 2.25);
    this.sunLight.position.set(-140, 80, -65);
    applyShadowConfigToLight(this.sunLight, this.shadowConfig);
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Atmospheric Gradient + Procedural Layered Clouds Sky Dome
    this.skyDomeGeo = new THREE.SphereGeometry(520, 32, 20);
    this.skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x254f85) },
        uMidColor: { value: new THREE.Color(0x748fb2) },
        uBottomColor: { value: new THREE.Color(0xdeb396) },
        uSunDir: { value: this.sunDirection.clone() },
        uMoonDir: { value: this.moonDirection.clone() },
        uSunColor: { value: new THREE.Color(0xffbd70) },
        uMoonColor: { value: new THREE.Color(0x9cbef5) },
        uHemiSkyColor: { value: new THREE.Color(0x8ca8cc) },
        uNightFactor: { value: 0.18 },
        uCloudAmount: { value: 0.0 },
        uCloudCoverage: { value: this.cloudState.coverage },
        uCloudDensity: { value: this.cloudState.density },
        uStormDarkness: { value: this.cloudState.stormDarkness },
        uCirrusAmount: { value: this.cloudState.cirrusAmount },
        uHazeStrength: { value: this.cloudState.hazeStrength },
        uCloudTime: { value: this.cloudState.cloudTime },
        uCloudQuality: { value: this.cloudQuality.detailLevel },
        uWindDir: { value: new THREE.Vector2(this.cloudState.windDirX, this.cloudState.windDirZ) },
        uWorldOffset: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: SKY_DOME_VERTEX_SHADER,
      fragmentShader: SKY_DOME_FRAGMENT_SHADER,
    });
    this.skyDome = new THREE.Mesh(this.skyDomeGeo, this.skyDomeMat);
    this.skyDome.frustumCulled = false;
    this.skyDome.renderOrder = -2;
    scene.add(this.skyDome);

    // Visible Sun Disc aligned with sunDirection (smoothly veils behind thick storm clouds)
    this.sunDiscGeo = new THREE.SphereGeometry(11.5, 18, 14);
    this.sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a8,
      fog: false,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    this.sunDisc = new THREE.Mesh(this.sunDiscGeo, this.sunDiscMat);
    this.sunDisc.renderOrder = -1;
    scene.add(this.sunDisc);

    // Visible Moon Disc aligned with moonDirection (smoothly veils behind thick storm clouds)
    this.moonDiscGeo = new THREE.SphereGeometry(9.5, 16, 12);
    this.moonDiscMat = new THREE.MeshBasicMaterial({
      color: this.moonDiscColor.clone(),
      fog: false,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    this.moonDisc = new THREE.Mesh(this.moonDiscGeo, this.moonDiscMat);
    this.moonDisc.visible = false;
    this.moonDisc.renderOrder = -1;
    scene.add(this.moonDisc);

    // Pooled rain drops positioned around camera/player
    this.rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 90;
      this.rainPositions[i * 3 + 1] = Math.random() * 40;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMaterial = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.24,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(this.rainGeo, this.rainMaterial);
    this.rainPoints.frustumCulled = false;
    scene.add(this.rainPoints);
  }

  public setTimePreset(preset: TimePreset): void {
    this.timePreset = preset;
    if (preset !== TimePreset.Dynamic) {
      this.timeHours = PRESET_HOURS[preset];
    }
  }

  public setWeather(weather: WeatherType, dynamicWeather: boolean): void {
    this.weather = weather;
    this.dynamicWeather = dynamicWeather;
  }

  public setShadowQuality(
    enabled: boolean,
    mapSize: number,
    quality?: GraphicsQuality,
  ): void {
    const resolvedQuality =
      quality ??
      (!enabled || mapSize <= 512
        ? GraphicsQuality.Low
        : mapSize <= 1024
          ? GraphicsQuality.Medium
          : GraphicsQuality.High);
    const config = getShadowConfigForQuality(resolvedQuality, this.isSoftwareGl || !enabled);
    if (config.enabled && mapSize > 0) {
      config.mapSize = mapSize;
    }
    this.shadowConfig = config;
    applyShadowConfigToLight(this.sunLight, this.shadowConfig);

    // Synchronize procedural cloud shader complexity with existing GraphicsQuality tier
    this.cloudQuality = getCloudQualityConfig(resolvedQuality, this.isSoftwareGl);
    this.skyDomeMat.uniforms.uCloudQuality.value = this.cloudQuality.detailLevel;
  }

  public getLightingDebugState(): {
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    sunDisc: THREE.Mesh;
    moonDisc: THREE.Mesh;
    skyUniforms: THREE.ShaderMaterial['uniforms'];
    shadowConfig: ShadowQualityConfig;
    cloudState: CloudAtmosphereState;
    cloudQuality: CloudQualityConfig;
  } {
    return {
      sunLight: this.sunLight,
      hemiLight: this.hemiLight,
      sunDisc: this.sunDisc,
      moonDisc: this.moonDisc,
      skyUniforms: this.skyDomeMat.uniforms,
      shadowConfig: { ...this.shadowConfig },
      cloudState: { ...this.cloudState },
      cloudQuality: { ...this.cloudQuality },
    };
  }

  public getStormDarkness(): number {
    return this.cloudState.stormDarkness;
  }

  public update(
    dt: number,
    focusX: number,
    focusZ: number,
    world: BuiltCityWorld,
    focusHeading = 0,
    focusSpeed = 0,
  ): void {
    // 1. Advance dynamic clock (1 game hour every ~28 real seconds)
    if (this.timePreset === TimePreset.Dynamic) {
      this.timeHours = (this.timeHours + dt * 0.036) % 24;
    }

    // 2. Dynamic weather rotation if enabled
    if (this.dynamicWeather) {
      this.weatherChangeTimer -= dt;
      if (this.weatherChangeTimer <= 0) {
        this.weatherChangeTimer = 75 + Math.random() * 50;
        const seq = [WeatherType.Clear, WeatherType.Cloudy, WeatherType.Rain];
        this.weather = seq[(seq.indexOf(this.weather) + 1) % seq.length];
      }
    }

    // Smooth weather & procedural cloud atmosphere transitions
    const targetRain = this.weather === WeatherType.Rain ? 1 : 0;
    const targetCloud =
      this.weather === WeatherType.Rain ? 1 : this.weather === WeatherType.Cloudy ? 0.65 : 0;
    this.rainAmount = damp(this.rainAmount, targetRain, 1.4, dt);
    this.roadWetness = stepRoadWetness(this.roadWetness, this.rainAmount, dt);
    this.cloudAmount = damp(this.cloudAmount, targetCloud, 1.0, dt);
    this.cloudState = stepCloudAtmosphereState(this.cloudState, this.weather, dt);

    // 3. Interpolate sky/lighting palette from timeHours
    let a = PALETTES[0];
    let b = PALETTES[1];
    for (let i = 0; i < PALETTES.length - 1; i++) {
      if (this.timeHours >= PALETTES[i].hour && this.timeHours <= PALETTES[i + 1].hour) {
        a = PALETTES[i];
        b = PALETTES[i + 1];
        break;
      }
    }
    const span = Math.max(0.001, b.hour - a.hour);
    const t = (this.timeHours - a.hour) / span;

    this.tmpSkyTop.copy(a.p.skyTop).lerp(b.p.skyTop, t);
    this.tmpSkyMid.copy(a.p.skyMid).lerp(b.p.skyMid, t);
    this.tmpFog.copy(a.p.fog).lerp(b.p.fog, t);
    this.tmpSun.copy(a.p.sun).lerp(b.p.sun, t);
    this.tmpHemiSky.copy(a.p.hemiSky).lerp(b.p.hemiSky, t);
    this.tmpHemiGround.copy(a.p.hemiGround).lerp(b.p.hemiGround, t);

    const sunIntBase = lerp(a.p.sunIntensity, b.p.sunIntensity, t);
    const hemiIntBase = lerp(a.p.hemiIntensity, b.p.hemiIntensity, t);
    this.nightFactor = lerp(a.p.nightFactor, b.p.nightFactor, t);

    // Apply graduated Cloudy vs Rainy storm atmospheric desaturation, cooling & horizon haze
    const storm = this.cloudState.stormDarkness;
    if (this.cloudAmount > 0.005 || storm > 0.005) {
      const overcastMix = clamp(this.cloudAmount * 0.55, 0, 0.55);
      const stormMix = clamp(storm * 0.78, 0, 0.78);
      const nightDim = 1 - this.nightFactor * 0.78;

      // Subtle cool overcast shift (Cloudy)
      this.tmpStormColor.copy(this.overcastSkyTop).multiplyScalar(nightDim);
      this.tmpSkyTop.lerp(this.tmpStormColor, overcastMix * 0.65);
      this.tmpStormColor.copy(this.overcastSkyMid).multiplyScalar(nightDim);
      this.tmpSkyMid.lerp(this.tmpStormColor, overcastMix * 0.65);
      this.tmpStormColor.copy(this.overcastFog).multiplyScalar(nightDim);
      this.tmpFog.lerp(this.tmpStormColor, overcastMix * 0.65);

      // Deep tropical storm darkening (Rain — visibly distinct from Cloudy)
      this.tmpStormColor.copy(this.stormSkyTop).multiplyScalar(nightDim);
      this.tmpSkyTop.lerp(this.tmpStormColor, stormMix);
      this.tmpStormColor.copy(this.stormSkyMid).multiplyScalar(nightDim);
      this.tmpSkyMid.lerp(this.tmpStormColor, stormMix);
      this.tmpStormColor.copy(this.stormFog).multiplyScalar(nightDim);
      this.tmpFog.lerp(this.tmpStormColor, stormMix * 0.92);
      this.tmpStormColor.copy(this.stormHemiSky).multiplyScalar(nightDim);
      this.tmpHemiSky.lerp(this.tmpStormColor, stormMix * 0.58);
    }

    this.bgColor.copy(this.tmpSkyMid);
    this.fog.color.copy(this.tmpFog);
    this.fog.density = this.cloudState.fogDensity;

    // Single unified celestial calculation for sun, moon, sky shader, and directional shadows
    const celestial = computeCelestialState(this.timeHours);
    this.sunDirection.set(celestial.sunDir.x, celestial.sunDir.y, celestial.sunDir.z);
    this.moonDirection.set(celestial.moonDir.x, celestial.moonDir.y, celestial.moonDir.z);
    this.activeLightDirection.set(
      celestial.activeLightDir.x,
      celestial.activeLightDir.y,
      celestial.activeLightDir.z,
    );
    this.isMoonActive = celestial.isMoonActive;

    // Directional key light color, smooth sun<->moon envelope, storm attenuation & subtle passing-cloud shadow
    if (celestial.isMoonActive) {
      this.sunLight.color.copy(this.moonKeyColor);
    } else {
      this.sunLight.color.copy(this.tmpSun);
    }
    const weatherLightMult = clamp(1 - storm * 0.58 - this.cloudAmount * 0.16, 0.18, 1);
    const cloudShadowFactor = computeSubtleCloudShadowFactor(focusX, focusZ, this.cloudState);
    this.sunLight.intensity =
      sunIntBase * celestial.keyLightEnvelope * weatherLightMult * cloudShadowFactor;
    this.hemiLight.color.copy(this.tmpHemiSky);
    this.hemiLight.groundColor.copy(this.tmpHemiGround);
    this.hemiLight.intensity = hemiIntBase * (1 - storm * 0.24 - this.cloudAmount * 0.08);

    // Modulate RoomEnvironment IBL intensity by time-of-day & storm cover so daylight keeps crisp contrast
    // and night genuinely reads as dark moonlit night where emissive lights & neon pop
    const baseEnvIntensity = lerp(0.52, 0.09, this.nightFactor);
    this.scene.environmentIntensity = baseEnvIntensity * (1 - storm * 0.34 - this.cloudAmount * 0.1);

    // Smooth forward shadow frustum lead while driving + light-space texel snapping
    const signedSpeed = clamp(focusSpeed, -10, 34);
    const targetLeadDist = Math.abs(signedSpeed) > 1.5 ? signedSpeed * 0.45 : 0;
    const targetLeadX = -Math.sin(focusHeading) * targetLeadDist;
    const targetLeadZ = -Math.cos(focusHeading) * targetLeadDist;
    this.shadowLeadX = damp(this.shadowLeadX, targetLeadX, 4.0, dt);
    this.shadowLeadZ = damp(this.shadowLeadZ, targetLeadZ, 4.0, dt);

    const shadowPlacement = computeStabilizedShadowPlacement({
      focusX,
      focusZ,
      lightDir: celestial.activeLightDir,
      frustumHalfSize: this.shadowConfig.frustumHalfSize,
      mapSize: this.shadowConfig.mapSize,
      lightDistance: this.shadowConfig.lightDistance,
      leadX: this.shadowLeadX,
      leadZ: this.shadowLeadZ,
    });
    this.sunLight.target.position.set(
      shadowPlacement.targetX,
      shadowPlacement.targetY,
      shadowPlacement.targetZ,
    );
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.position.set(
      shadowPlacement.lightX,
      shadowPlacement.lightY,
      shadowPlacement.lightZ,
    );

    // Update sky dome uniforms & world-anchored cloud drift (zero allocations)
    this.skyDome.position.set(focusX, 0, focusZ);
    const u = this.skyDomeMat.uniforms;
    (u.uTopColor.value as THREE.Color).copy(this.tmpSkyTop);
    (u.uMidColor.value as THREE.Color).copy(this.tmpSkyMid);
    (u.uBottomColor.value as THREE.Color).copy(this.tmpFog);
    (u.uSunDir.value as THREE.Vector3).copy(this.sunDirection);
    (u.uMoonDir.value as THREE.Vector3).copy(this.moonDirection);
    (u.uSunColor.value as THREE.Color).copy(this.tmpSun);
    (u.uMoonColor.value as THREE.Color).copy(this.moonKeyColor);
    (u.uHemiSkyColor.value as THREE.Color).copy(this.tmpHemiSky);
    u.uNightFactor.value = this.nightFactor;
    u.uCloudAmount.value = this.cloudAmount;
    u.uCloudCoverage.value = this.cloudState.coverage;
    u.uCloudDensity.value = this.cloudState.density;
    u.uStormDarkness.value = this.cloudState.stormDarkness;
    u.uCirrusAmount.value = this.cloudState.cirrusAmount;
    u.uHazeStrength.value = this.cloudState.hazeStrength;
    u.uCloudTime.value = this.cloudState.cloudTime;
    u.uCloudQuality.value = this.cloudQuality.detailLevel;
    (u.uWindDir.value as THREE.Vector2).set(this.cloudState.windDirX, this.cloudState.windDirZ);
    (u.uWorldOffset.value as THREE.Vector2).set(focusX * 0.00018, focusZ * 0.00018);

    // Sun & moon discs smoothly veil behind overcast/storm cover without popping
    const celestialOpacity = clamp(1 - storm * 1.15 - this.cloudAmount * 0.25, 0, 1);

    this.sunDisc.position.set(
      focusX + this.sunDirection.x * CELESTIAL_DISC_DISTANCE,
      this.sunDirection.y * CELESTIAL_DISC_DISTANCE,
      focusZ + this.sunDirection.z * CELESTIAL_DISC_DISTANCE,
    );
    this.sunDiscMat.color.copy(this.tmpSun).lerp(this.sunDiscCoreTint, 0.35);
    this.sunDiscMat.opacity = celestialOpacity;
    this.sunDisc.visible = this.sunDirection.y > -0.04 && celestialOpacity > 0.03;

    this.moonDisc.position.set(
      focusX + this.moonDirection.x * CELESTIAL_DISC_DISTANCE,
      this.moonDirection.y * CELESTIAL_DISC_DISTANCE,
      focusZ + this.moonDirection.z * CELESTIAL_DISC_DISTANCE,
    );
    this.moonDiscMat.color.copy(this.moonDiscColor);
    this.moonDiscMat.opacity = celestialOpacity;
    this.moonDisc.visible =
      this.moonDirection.y > 0.02 && this.nightFactor > 0.35 && celestialOpacity > 0.03;

    // 4. Update city night lights, building windows, neon, and wet roads
    // Calibrated for selective HDR bloom (threshold ~1.08-1.24):
    // - Daytime building windows stay well below bloom threshold (~0.08-0.28)
    // - Unmapped podium glass (lobbyGlassMat, emissiveMap == null) stays subtle (<= 0.20) so solid podium walls never bloom
    // - Mapped upper-story windows (emissiveMap != null), neon signs, and streetlight bulbs exceed 1.15 at night to bloom selectively
    const windowGlow = 0.08 + Math.pow(this.nightFactor, 1.15) * 1.42;
    const lobbyGlassGlow = 0.04 + this.nightFactor * 0.16;
    for (let i = 0; i < world.emissiveBuildingMaterials.length; i++) {
      const mat = world.emissiveBuildingMaterials[i];
      mat.emissiveIntensity = mat.emissiveMap ? windowGlow : lobbyGlassGlow;
    }
    const neonGlow = 0.55 + this.nightFactor * 2.15 + this.rainAmount * 0.35;
    for (let i = 0; i < world.neonTrimMaterials.length; i++) {
      world.neonTrimMaterials[i].emissiveIntensity = neonGlow;
    }
    world.streetlightBulbMaterial.emissiveIntensity = 0.15 + this.nightFactor * 2.85;
    const hubLightIntensity = this.nightFactor * 7.5;
    for (let i = 0; i < world.streetPointLights.length; i++) {
      world.streetPointLights[i].intensity = hubLightIntensity;
    }

    // Wet road slick reflection synchronized across all road directions, intersections & markings
    applyRoadWetness(world.wetRoadSurfaces, this.roadWetness);

    // 5. Update rain particles around focus point
    this.rainMaterial.opacity = this.rainAmount * 0.68;
    this.rainPoints.visible = this.rainAmount > 0.03;
    if (this.rainPoints.visible) {
      const posAttr = this.rainGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const fallSpeed = 34 * dt;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        arr[idx + 1] -= fallSpeed;
        if (arr[idx + 1] < 0) {
          arr[idx] = focusX + (Math.random() - 0.5) * 90;
          arr[idx + 1] = 26 + Math.random() * 14;
          arr[idx + 2] = focusZ + (Math.random() - 0.5) * 90;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.skyDomeGeo.dispose();
    this.skyDomeMat.dispose();
    this.sunDiscGeo.dispose();
    this.sunDiscMat.dispose();
    this.moonDiscGeo.dispose();
    this.moonDiscMat.dispose();
    this.rainGeo.dispose();
    this.rainMaterial.dispose();
  }
}


