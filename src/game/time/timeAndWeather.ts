import * as THREE from 'three';
import { TimePreset, WeatherType } from '../types';
import { damp, lerp } from '../core/math';
import { BuiltCityWorld } from '../world/cityBuilder';

interface SkyPalette {
  sky: THREE.Color;
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
      sky: new THREE.Color(0x0b1224),
      fog: new THREE.Color(0x0f1a33),
      sun: new THREE.Color(0x88b4ff),
      hemiSky: new THREE.Color(0x1f355c),
      hemiGround: new THREE.Color(0x10141f),
      sunIntensity: 0.45,
      hemiIntensity: 0.55,
      nightFactor: 1.0,
    },
  },
  {
    hour: 6.2, // Sunrise
    p: {
      sky: new THREE.Color(0xe8997a),
      fog: new THREE.Color(0xf0b290),
      sun: new THREE.Color(0xffbe85),
      hemiSky: new THREE.Color(0xf7c5a8),
      hemiGround: new THREE.Color(0x4b4657),
      sunIntensity: 1.55,
      hemiIntensity: 0.72,
      nightFactor: 0.35,
    },
  },
  {
    hour: 9.5, // Morning
    p: {
      sky: new THREE.Color(0x69b5e8),
      fog: new THREE.Color(0xaad6f2),
      sun: new THREE.Color(0xfff4dc),
      hemiSky: new THREE.Color(0x9bd3f5),
      hemiGround: new THREE.Color(0x7c7468),
      sunIntensity: 2.15,
      hemiIntensity: 0.85,
      nightFactor: 0.0,
    },
  },
  {
    hour: 13.5, // Afternoon
    p: {
      sky: new THREE.Color(0x4ea3e0),
      fog: new THREE.Color(0x9bcce8),
      sun: new THREE.Color(0xfff9ea),
      hemiSky: new THREE.Color(0x9cd1f2),
      hemiGround: new THREE.Color(0x80786c),
      sunIntensity: 2.35,
      hemiIntensity: 0.88,
      nightFactor: 0.0,
    },
  },
  {
    hour: 17.4, // Golden Hour (Signature Miami look)
    p: {
      sky: new THREE.Color(0xd9876c),
      fog: new THREE.Color(0xe8a98a),
      sun: new THREE.Color(0xffb56b),
      hemiSky: new THREE.Color(0xf4b698),
      hemiGround: new THREE.Color(0x554954),
      sunIntensity: 2.1,
      hemiIntensity: 0.78,
      nightFactor: 0.28,
    },
  },
  {
    hour: 19.3, // Sunset Dusk
    p: {
      sky: new THREE.Color(0x4c3566),
      fog: new THREE.Color(0x6b4570),
      sun: new THREE.Color(0xff7e5f),
      hemiSky: new THREE.Color(0x6d5285),
      hemiGround: new THREE.Color(0x282136),
      sunIntensity: 0.9,
      hemiIntensity: 0.62,
      nightFactor: 0.82,
    },
  },
  {
    hour: 21.5, // Night
    p: {
      sky: new THREE.Color(0x0b1224),
      fog: new THREE.Color(0x0f1a33),
      sun: new THREE.Color(0x88b4ff),
      hemiSky: new THREE.Color(0x1f355c),
      hemiGround: new THREE.Color(0x10141f),
      sunIntensity: 0.45,
      hemiIntensity: 0.55,
      nightFactor: 1.0,
    },
  },
  {
    hour: 24,
    p: {
      sky: new THREE.Color(0x0b1224),
      fog: new THREE.Color(0x0f1a33),
      sun: new THREE.Color(0x88b4ff),
      hemiSky: new THREE.Color(0x1f355c),
      hemiGround: new THREE.Color(0x10141f),
      sunIntensity: 0.45,
      hemiIntensity: 0.55,
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

export class TimeAndWeatherSystem {
  public timeHours = 17.4; // Start in signature golden hour
  public nightFactor = 0.25;
  public rainAmount = 0; // 0..1 smooth transition
  public cloudAmount = 0; // 0..1 smooth transition
  public weather: WeatherType = WeatherType.Clear;
  public timePreset: TimePreset = TimePreset.GoldenHour;
  public dynamicWeather = false;

  private weatherChangeTimer = 90;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly fog: THREE.FogExp2;
  private readonly bgColor = new THREE.Color(0xd9876c);

  // Scratch colors (zero GC in loop)
  private readonly tmpSky = new THREE.Color();
  private readonly tmpFog = new THREE.Color();
  private readonly tmpSun = new THREE.Color();
  private readonly tmpHemiSky = new THREE.Color();
  private readonly tmpHemiGround = new THREE.Color();
  private readonly stormTint = new THREE.Color(0x4b5868);
  private readonly zenithBlue = new THREE.Color(0x1d4e89);

  // Cinematic atmospheric gradient sky dome + glowing sun disc
  private readonly skyDomeGeo: THREE.SphereGeometry;
  private readonly skyDomeMat: THREE.ShaderMaterial;
  private readonly skyDome: THREE.Mesh;
  private readonly sunDiscGeo: THREE.SphereGeometry;
  private readonly sunDiscMat: THREE.MeshBasicMaterial;
  private readonly sunDisc: THREE.Mesh;

  // Pooled rain particle streaks (zero allocation)
  private readonly rainPoints: THREE.Points;
  private readonly rainCount = 900;
  private readonly rainPositions: Float32Array;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly rainGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.fog = new THREE.FogExp2(0xe8a98a, 0.0024);
    scene.fog = this.fog;
    scene.background = this.bgColor;

    this.hemiLight = new THREE.HemisphereLight(0xf4b698, 0x554954, 0.78);
    this.hemiLight.position.set(0, 80, 0);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffb56b, 2.1);
    this.sunLight.position.set(110, 65, 55);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 360;
    const d = 135;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Procedural Gradient Sky Dome (Zenith -> Mid -> Horizon Glow)
    this.skyDomeGeo = new THREE.SphereGeometry(520, 24, 16);
    this.skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x2d4f7c) },
        uMidColor: { value: new THREE.Color(0xd97b66) },
        uBottomColor: { value: new THREE.Color(0xf6be8f) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = position;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float lowMix = smoothstep(-0.04, 0.22, h);
          float highMix = smoothstep(0.18, 0.72, h);
          vec3 col = mix(uBottomColor, uMidColor, lowMix);
          col = mix(col, uTopColor, highMix);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(this.skyDomeGeo, this.skyDomeMat);
    this.skyDome.frustumCulled = false;
    scene.add(this.skyDome);

    // Glowing Solar / Lunar Horizon Disc
    this.sunDiscGeo = new THREE.SphereGeometry(14, 16, 12);
    this.sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a8,
      fog: false,
    });
    this.sunDisc = new THREE.Mesh(this.sunDiscGeo, this.sunDiscMat);
    scene.add(this.sunDisc);

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

  public setShadowQuality(enabled: boolean, mapSize: number): void {
    this.sunLight.castShadow = enabled;
    if (enabled && this.sunLight.shadow.mapSize.width !== mapSize) {
      this.sunLight.shadow.mapSize.width = mapSize;
      this.sunLight.shadow.mapSize.height = mapSize;
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  public update(
    dt: number,
    focusX: number,
    focusZ: number,
    world: BuiltCityWorld,
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

    // Smooth weather transitions
    const targetRain = this.weather === WeatherType.Rain ? 1 : 0;
    const targetCloud =
      this.weather === WeatherType.Rain ? 1 : this.weather === WeatherType.Cloudy ? 0.65 : 0;
    this.rainAmount = damp(this.rainAmount, targetRain, 1.4, dt);
    this.cloudAmount = damp(this.cloudAmount, targetCloud, 1.2, dt);

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

    this.tmpSky.copy(a.p.sky).lerp(b.p.sky, t);
    this.tmpFog.copy(a.p.fog).lerp(b.p.fog, t);
    this.tmpSun.copy(a.p.sun).lerp(b.p.sun, t);
    this.tmpHemiSky.copy(a.p.hemiSky).lerp(b.p.hemiSky, t);
    this.tmpHemiGround.copy(a.p.hemiGround).lerp(b.p.hemiGround, t);

    const sunIntBase = lerp(a.p.sunIntensity, b.p.sunIntensity, t);
    const hemiIntBase = lerp(a.p.hemiIntensity, b.p.hemiIntensity, t);
    this.nightFactor = lerp(a.p.nightFactor, b.p.nightFactor, t);

    // Apply overcast / rain atmospheric desaturation & fog density
    if (this.cloudAmount > 0.01) {
      this.tmpSky.lerp(this.stormTint, this.cloudAmount * 0.58);
      this.tmpFog.lerp(this.stormTint, this.cloudAmount * 0.65);
    }

    this.bgColor.copy(this.tmpSky);
    this.fog.color.copy(this.tmpFog);
    this.fog.density = 0.0022 + this.cloudAmount * 0.0015 + this.rainAmount * 0.0024;

    this.sunLight.color.copy(this.tmpSun);
    this.sunLight.intensity = sunIntBase * (1 - this.cloudAmount * 0.45);
    this.hemiLight.color.copy(this.tmpHemiSky);
    this.hemiLight.groundColor.copy(this.tmpHemiGround);
    this.hemiLight.intensity = hemiIntBase;

    // Smooth sun arc across the sky (East sunrise -> overhead -> West sunset)
    const sunAngle = ((this.timeHours - 6) / 12) * Math.PI;
    const sunElev = Math.max(0.22, Math.sin(sunAngle));
    const sunHoriz = Math.cos(sunAngle);
    this.sunLight.position.set(
      focusX + sunHoriz * 130,
      Math.max(28, sunElev * 140),
      focusZ + 55,
    );
    this.sunLight.target.position.set(focusX, 0, focusZ);
    this.sunLight.target.updateMatrixWorld();

    // Update sky dome gradient & sun disc position
    this.skyDome.position.set(focusX, 0, focusZ);
    const uTop = this.skyDomeMat.uniforms.uTopColor.value as THREE.Color;
    const uMid = this.skyDomeMat.uniforms.uMidColor.value as THREE.Color;
    const uBot = this.skyDomeMat.uniforms.uBottomColor.value as THREE.Color;
    uBot.copy(this.tmpFog);
    uMid.copy(this.tmpSky);
    // Rich deeper zenith color for true sky depth
    uTop.copy(this.tmpSky).multiplyScalar(this.nightFactor > 0.6 ? 0.35 : 0.62);
    if (this.nightFactor < 0.5 && this.cloudAmount < 0.5) {
      uTop.lerp(this.zenithBlue, 0.55);
    }

    const discElev = Math.max(0.14, Math.sin(sunAngle));
    this.sunDisc.position.set(
      focusX + sunHoriz * 360,
      discElev * 240,
      focusZ - 160,
    );
    this.sunDiscMat.color.copy(this.tmpSun);
    this.sunDisc.visible = this.cloudAmount < 0.85;

    // 4. Update city night lights, building windows, neon, and wet roads
    const windowGlow = 0.14 + this.nightFactor * 1.15;
    for (let i = 0; i < world.emissiveBuildingMaterials.length; i++) {
      world.emissiveBuildingMaterials[i].emissiveIntensity = windowGlow;
    }
    const neonGlow = 0.45 + this.nightFactor * 1.35;
    for (let i = 0; i < world.neonTrimMaterials.length; i++) {
      world.neonTrimMaterials[i].emissiveIntensity = neonGlow;
    }
    world.streetlightBulbMaterial.emissiveIntensity = 0.2 + this.nightFactor * 2.2;
    const hubLightIntensity = this.nightFactor * 38;
    for (let i = 0; i < world.streetPointLights.length; i++) {
      world.streetPointLights[i].intensity = hubLightIntensity;
    }

    // Wet road slick reflection during rain
    world.roadMaterial.roughness = lerp(0.78, 0.24, this.rainAmount);
    world.roadMaterial.metalness = lerp(0.08, 0.38, this.rainAmount);

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
    this.rainGeo.dispose();
    this.rainMaterial.dispose();
  }
}
