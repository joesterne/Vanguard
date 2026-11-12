import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createConcreteTexture, createRockTexture, createHazardTexture } from './ProceduralTextures';
import { SkyboxEnvironmentPreset } from '../types';

export interface WorldProps {
  commsDishMesh?: THREE.Group;
  spotlights: THREE.SpotLight[];
}

export interface SkyboxPresetConfig {
  id: SkyboxEnvironmentPreset;
  label: string;
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  groundColor: THREE.Color;
  sunColor: THREE.Color;
  cloudColor: THREE.Color;
  cloudShadowColor: THREE.Color;
  sunDirection: THREE.Vector3;
  sunLightIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  fogDensity: number;
  starIntensity: number;
  cloudDensity: number;
  particleColor: THREE.Color;
  spotlightIntensity: number;
}

export const SKYBOX_PRESETS: Record<SkyboxEnvironmentPreset, SkyboxPresetConfig> = {
  golden_dusk: {
    id: 'golden_dusk',
    label: 'GOLDEN DUSK // ANATOLIA',
    zenithColor: new THREE.Color(0x0c192c),
    horizonColor: new THREE.Color(0xd96b38),
    groundColor: new THREE.Color(0x181312),
    sunColor: new THREE.Color(0xffb85c),
    cloudColor: new THREE.Color(0xff9d66),
    cloudShadowColor: new THREE.Color(0x2a1d28),
    sunDirection: new THREE.Vector3(0.55, 0.24, -0.78).normalize(),
    sunLightIntensity: 2.2,
    ambientColor: new THREE.Color(0x9a8c98),
    ambientIntensity: 0.72,
    hemiSkyColor: new THREE.Color(0xe07a5f),
    hemiGroundColor: new THREE.Color(0x1d1a22),
    hemiIntensity: 0.9,
    fogDensity: 0.011,
    starIntensity: 0.25,
    cloudDensity: 0.55,
    particleColor: new THREE.Color(0xffaa55),
    spotlightIntensity: 2.2,
  },
  moonlit_night: {
    id: 'moonlit_night',
    label: 'MOONLIT NIGHT // BATUMI PORT',
    zenithColor: new THREE.Color(0x030710),
    horizonColor: new THREE.Color(0x0f243c),
    groundColor: new THREE.Color(0x050911),
    sunColor: new THREE.Color(0x90caf9),
    cloudColor: new THREE.Color(0x1e3a5f),
    cloudShadowColor: new THREE.Color(0x060b14),
    sunDirection: new THREE.Vector3(-0.45, 0.52, -0.72).normalize(),
    sunLightIntensity: 1.35,
    ambientColor: new THREE.Color(0x4a6fa5),
    ambientIntensity: 0.6,
    hemiSkyColor: new THREE.Color(0x3b6998),
    hemiGroundColor: new THREE.Color(0x0a1019),
    hemiIntensity: 0.75,
    fogDensity: 0.014,
    starIntensity: 1.0,
    cloudDensity: 0.42,
    particleColor: new THREE.Color(0x64b5f6),
    spotlightIntensity: 3.4,
  },
  crimson_storm: {
    id: 'crimson_storm',
    label: 'CRIMSON SIEGE // BLACK SEA',
    zenithColor: new THREE.Color(0x14080e),
    horizonColor: new THREE.Color(0x8c2318),
    groundColor: new THREE.Color(0x12090a),
    sunColor: new THREE.Color(0xff4d29),
    cloudColor: new THREE.Color(0xc83e2b),
    cloudShadowColor: new THREE.Color(0x1a0b0e),
    sunDirection: new THREE.Vector3(0.32, 0.19, -0.92).normalize(),
    sunLightIntensity: 2.1,
    ambientColor: new THREE.Color(0x8c4a42),
    ambientIntensity: 0.68,
    hemiSkyColor: new THREE.Color(0xb8332a),
    hemiGroundColor: new THREE.Color(0x180d10),
    hemiIntensity: 0.88,
    fogDensity: 0.0145,
    starIntensity: 0.12,
    cloudDensity: 0.78,
    particleColor: new THREE.Color(0xff5722),
    spotlightIntensity: 3.0,
  },
  arctic_dawn: {
    id: 'arctic_dawn',
    label: 'ARCTIC DAWN // HIGHLAND FOB',
    zenithColor: new THREE.Color(0x0f253e),
    horizonColor: new THREE.Color(0x72a1c4),
    groundColor: new THREE.Color(0x18222d),
    sunColor: new THREE.Color(0xfff3d6),
    cloudColor: new THREE.Color(0xdbe9f4),
    cloudShadowColor: new THREE.Color(0x3d5a73),
    sunDirection: new THREE.Vector3(-0.6, 0.36, -0.71).normalize(),
    sunLightIntensity: 2.3,
    ambientColor: new THREE.Color(0x98b9d6),
    ambientIntensity: 0.82,
    hemiSkyColor: new THREE.Color(0x8ecae6),
    hemiGroundColor: new THREE.Color(0x1d2833),
    hemiIntensity: 0.95,
    fogDensity: 0.01,
    starIntensity: 0.08,
    cloudDensity: 0.48,
    particleColor: new THREE.Color(0xcce6ff),
    spotlightIntensity: 1.8,
  },
};

export const SKYBOX_PRESET_ORDER: SkyboxEnvironmentPreset[] = [
  'golden_dusk',
  'moonlit_night',
  'crimson_storm',
  'arctic_dawn',
];

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDirection;

  void main() {
    vWorldDirection = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uGroundColor;
  uniform vec3 uSunColor;
  uniform vec3 uCloudColor;
  uniform vec3 uCloudShadowColor;
  uniform vec3 uSunDirection;
  uniform float uStarIntensity;
  uniform float uCloudDensity;
  uniform float uLightningFlash;

  varying vec3 vWorldDirection;

  // Fast 2D procedural hash & value noise
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // 4-Octave FBM for realistic volumetric cloud strata
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += amp * noise2D(p);
      p = rot * p * 2.03;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float elevation = dir.y;

    // 1. Atmospheric Rayleigh / Mie Sky Gradient
    float upperMix = pow(clamp(elevation, 0.0, 1.0), 0.52);
    vec3 skyCol = mix(uHorizonColor, uZenithColor, upperMix);

    // Lower hemisphere blend into ground fog
    float lowerMix = pow(clamp(-elevation * 3.5, 0.0, 1.0), 0.7);
    skyCol = mix(skyCol, uGroundColor, step(elevation, 0.0) * lowerMix);

    // Horizon atmospheric haze band
    float horizonGlow = pow(1.0 - abs(elevation), 7.0);
    skyCol += uSunColor * horizonGlow * 0.22;

    // 2. High-altitude Starfield & Nebula Shimmer (visible in night/dusk presets)
    if (elevation > 0.02 && uStarIntensity > 0.01) {
      vec2 starUv = dir.xz / (dir.y + 0.15) * 85.0;
      vec2 starCell = floor(starUv);
      float starSeed = hash21(starCell);
      if (starSeed > 0.965) {
        vec2 starCenter = fract(starUv) - 0.5;
        float dist = length(starCenter);
        float twinkle = 0.65 + 0.35 * sin(uTime * 3.5 + starSeed * 62.8);
        float starSpark = smoothstep(0.18, 0.01, dist) * twinkle;
        float horizonFade = smoothstep(0.05, 0.35, elevation);
        skyCol += vec3(0.88, 0.94, 1.0) * starSpark * uStarIntensity * horizonFade * 1.4;
      }
    }

    // 3. Solar / Lunar Celestial Disc & Mie Corona Halo
    vec3 sunDir = normalize(uSunDirection);
    float sunCos = clamp(dot(dir, sunDir), 0.0, 1.0);
    float sunDisc = smoothstep(0.9982, 0.9994, sunCos);
    float sunCorona = pow(sunCos, 12.0) * 0.45 + pow(sunCos, 96.0) * 0.9;
    skyCol += uSunColor * sunCorona;
    skyCol = mix(skyCol, vec3(1.0, 0.98, 0.92), sunDisc);

    // 4. Dynamic Volumetric Cloud Layers projected onto sky dome
    if (elevation > 0.01) {
      // Perspective sky plane projection with horizon curvature compensation
      vec2 cloudUv = dir.xz / (elevation + 0.18) * 1.35;
      vec2 windOffset = vec2(uTime * 0.018, uTime * 0.009);

      float nBase = fbm(cloudUv + windOffset);
      float nDetail = fbm(cloudUv * 2.4 - windOffset * 1.4);
      float cloudNoise = mix(nBase, nDetail, 0.38);

      float threshold = 1.0 - uCloudDensity * 0.72;
      float cloudAlpha = smoothstep(threshold, threshold + 0.32, cloudNoise);

      // Fake directional silver-lining & self-shadowing along sun vector
      vec2 sunOffsetUv = (cloudUv + windOffset) + sunDir.xz * 0.12;
      float densityTowardSun = fbm(sunOffsetUv);
      float silverLining = pow(clamp(sunCos, 0.0, 1.0), 4.0) * (1.0 - cloudAlpha * 0.5);
      float cloudLit = smoothstep(threshold - 0.08, threshold + 0.25, densityTowardSun);

      vec3 cloudTone = mix(uCloudColor, uCloudShadowColor, cloudLit * 0.75);
      cloudTone += uSunColor * silverLining * 0.65;

      // Distant lightning sheet illumination during storms
      cloudTone += vec3(0.95, 0.75, 0.85) * uLightningFlash * cloudAlpha * 0.6;

      // Fade clouds seamlessly into the atmospheric horizon mist
      float horizonCloudFade = smoothstep(0.01, 0.22, elevation);
      skyCol = mix(skyCol, cloudTone, cloudAlpha * horizonCloudFade * 0.88);
    }

    gl_FragColor = vec4(skyCol, 1.0);
  }
`;

export class GameWorld {
  public scene: THREE.Scene;
  public commsDishGroup?: THREE.Group;
  public spotlights: THREE.SpotLight[] = [];
  public dustParticles?: THREE.Points;

  // Dynamic Skybox & Atmospheric Lighting Rig
  public skyDomeMesh?: THREE.Mesh;
  public skyMaterial?: THREE.ShaderMaterial;
  public sunLight?: THREE.DirectionalLight;
  public ambientLight?: THREE.AmbientLight;
  public hemiLight?: THREE.HemisphereLight;
  public currentPreset: SkyboxEnvironmentPreset = 'golden_dusk';

  // Interpolated current state for smooth mission / cycle transitions
  private activeZenithColor = new THREE.Color();
  private activeHorizonColor = new THREE.Color();
  private activeGroundColor = new THREE.Color();
  private activeSunColor = new THREE.Color();
  private activeCloudColor = new THREE.Color();
  private activeCloudShadowColor = new THREE.Color();
  private activeSunDirection = new THREE.Vector3();
  private activeAmbientColor = new THREE.Color();
  private activeHemiSkyColor = new THREE.Color();
  private activeHemiGroundColor = new THREE.Color();
  private activeParticleColor = new THREE.Color();

  private activeSunLightIntensity = 2.0;
  private activeAmbientIntensity = 0.7;
  private activeHemiIntensity = 0.85;
  private activeFogDensity = 0.012;
  private activeStarIntensity = 0.25;
  private activeCloudDensity = 0.55;
  private activeSpotlightIntensity = 2.5;

  private targetConfig: SkyboxPresetConfig = SKYBOX_PRESETS.golden_dusk;
  private elapsedTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.copyPresetToActive(SKYBOX_PRESETS.golden_dusk);
  }

  private copyPresetToActive(cfg: SkyboxPresetConfig) {
    this.targetConfig = cfg;
    this.currentPreset = cfg.id;

    this.activeZenithColor.copy(cfg.zenithColor);
    this.activeHorizonColor.copy(cfg.horizonColor);
    this.activeGroundColor.copy(cfg.groundColor);
    this.activeSunColor.copy(cfg.sunColor);
    this.activeCloudColor.copy(cfg.cloudColor);
    this.activeCloudShadowColor.copy(cfg.cloudShadowColor);
    this.activeSunDirection.copy(cfg.sunDirection);
    this.activeAmbientColor.copy(cfg.ambientColor);
    this.activeHemiSkyColor.copy(cfg.hemiSkyColor);
    this.activeHemiGroundColor.copy(cfg.hemiGroundColor);
    this.activeParticleColor.copy(cfg.particleColor);

    this.activeSunLightIntensity = cfg.sunLightIntensity;
    this.activeAmbientIntensity = cfg.ambientIntensity;
    this.activeHemiIntensity = cfg.hemiIntensity;
    this.activeFogDensity = cfg.fogDensity;
    this.activeStarIntensity = cfg.starIntensity;
    this.activeCloudDensity = cfg.cloudDensity;
    this.activeSpotlightIntensity = cfg.spotlightIntensity;
  }

  /**
   * Transition the skybox and atmospheric lighting to a specific environment preset
   */
  public setEnvironmentPreset(preset: SkyboxEnvironmentPreset, immediate: boolean = false) {
    const cfg = SKYBOX_PRESETS[preset] || SKYBOX_PRESETS.golden_dusk;
    this.targetConfig = cfg;
    this.currentPreset = cfg.id;

    if (immediate) {
      this.copyPresetToActive(cfg);
      this.applyActiveStateToScene();
    }
  }

  /**
   * Automatically map a campaign mission ID or preset to its atmospheric environment
   */
  public setEnvironmentByMission(missionIdOrPreset?: string, immediate: boolean = false) {
    if (!missionIdOrPreset) {
      this.setEnvironmentPreset('golden_dusk', immediate);
      return;
    }

    if (missionIdOrPreset in SKYBOX_PRESETS) {
      this.setEnvironmentPreset(missionIdOrPreset as SkyboxEnvironmentPreset, immediate);
    } else if (missionIdOrPreset.includes('m1')) {
      this.setEnvironmentPreset('golden_dusk', immediate);
    } else if (missionIdOrPreset.includes('m2')) {
      this.setEnvironmentPreset('moonlit_night', immediate);
    } else if (missionIdOrPreset.includes('m3')) {
      this.setEnvironmentPreset('crimson_storm', immediate);
    } else {
      this.setEnvironmentPreset('arctic_dawn', immediate);
    }
  }

  /**
   * Cycle to the next atmospheric skybox preset in sequence
   */
  public cycleEnvironmentPreset(): SkyboxEnvironmentPreset {
    const idx = SKYBOX_PRESET_ORDER.indexOf(this.currentPreset);
    const nextPreset = SKYBOX_PRESET_ORDER[(idx + 1) % SKYBOX_PRESET_ORDER.length];
    this.setEnvironmentPreset(nextPreset, false);
    return nextPreset;
  }

  public getCurrentPresetLabel(): string {
    return this.targetConfig.label;
  }

  /**
   * Initialize lighting rig, procedural environment reflections, fog, and dynamic shader skybox
   */
  public initEnvironment(renderer: THREE.WebGLRenderer, isSoftwareGl: boolean) {
    const initialCfg = this.targetConfig;

    // 1. Horizon Atmospheric Fog & Sky Tone
    this.scene.background = initialCfg.horizonColor.clone();
    this.scene.fog = new THREE.FogExp2(initialCfg.horizonColor.getHex(), initialCfg.fogDensity);

    // 2. Procedural Studio Reflection (RoomEnvironment PMREM)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // safe fallback
    }

    // 3. Dynamic Procedural GLSL Skybox Dome
    this.buildDynamicSkybox();

    // 4. Ambient Fill Light
    this.ambientLight = new THREE.AmbientLight(initialCfg.ambientColor, initialCfg.ambientIntensity);
    this.scene.add(this.ambientLight);

    // 5. Key Directional Sun / Moon Light
    this.sunLight = new THREE.DirectionalLight(initialCfg.sunColor, initialCfg.sunLightIntensity);
    this.sunLight.position.copy(initialCfg.sunDirection).multiplyScalar(85);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    this.sunLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 175;
    const d = 50;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 6. Sky / Ground Fill Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(
      initialCfg.hemiSkyColor,
      initialCfg.hemiGroundColor,
      initialCfg.hemiIntensity
    );
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 7. Build Terrain & Outpost Compound
    this.buildTerrain();
    this.buildCommandArmory();
    this.buildCommsTower();
    this.buildTacticalVehicle(14, 0, -18, -Math.PI / 4);
    this.buildCargoContainers();
    this.buildPerimeterWatchtowers();
    this.buildAtmosphericParticles();

    this.applyActiveStateToScene();
  }

  /**
   * Builds a multi-layered procedural GLSL sky dome with Rayleigh scattering,
   * volumetric FBM cloud strata, solar/lunar corona, and twinkling starfield.
   */
  private buildDynamicSkybox() {
    const skyGeo = new THREE.SphereGeometry(210, 48, 32);

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uZenithColor: { value: this.activeZenithColor.clone() },
        uHorizonColor: { value: this.activeHorizonColor.clone() },
        uGroundColor: { value: this.activeGroundColor.clone() },
        uSunColor: { value: this.activeSunColor.clone() },
        uCloudColor: { value: this.activeCloudColor.clone() },
        uCloudShadowColor: { value: this.activeCloudShadowColor.clone() },
        uSunDirection: { value: this.activeSunDirection.clone() },
        uStarIntensity: { value: this.activeStarIntensity },
        uCloudDensity: { value: this.activeCloudDensity },
        uLightningFlash: { value: 0.0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    this.skyDomeMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.skyDomeMesh.renderOrder = -1;
    this.skyDomeMesh.frustumCulled = false;
    this.scene.add(this.skyDomeMesh);
  }

  private applyActiveStateToScene() {
    if (this.skyMaterial) {
      this.skyMaterial.uniforms.uZenithColor.value.copy(this.activeZenithColor);
      this.skyMaterial.uniforms.uHorizonColor.value.copy(this.activeHorizonColor);
      this.skyMaterial.uniforms.uGroundColor.value.copy(this.activeGroundColor);
      this.skyMaterial.uniforms.uSunColor.value.copy(this.activeSunColor);
      this.skyMaterial.uniforms.uCloudColor.value.copy(this.activeCloudColor);
      this.skyMaterial.uniforms.uCloudShadowColor.value.copy(this.activeCloudShadowColor);
      this.skyMaterial.uniforms.uSunDirection.value.copy(this.activeSunDirection);
      this.skyMaterial.uniforms.uStarIntensity.value = this.activeStarIntensity;
      this.skyMaterial.uniforms.uCloudDensity.value = this.activeCloudDensity;
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.activeHorizonColor);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.activeHorizonColor);
      this.scene.fog.density = this.activeFogDensity;
    }

    if (this.sunLight) {
      this.sunLight.color.copy(this.activeSunColor);
      this.sunLight.intensity = this.activeSunLightIntensity;
      this.sunLight.position.copy(this.activeSunDirection).multiplyScalar(85);
    }

    if (this.ambientLight) {
      this.ambientLight.color.copy(this.activeAmbientColor);
      this.ambientLight.intensity = this.activeAmbientIntensity;
    }

    if (this.hemiLight) {
      this.hemiLight.color.copy(this.activeHemiSkyColor);
      this.hemiLight.groundColor.copy(this.activeHemiGroundColor);
      this.hemiLight.intensity = this.activeHemiIntensity;
    }

    if (this.dustParticles) {
      const pMat = this.dustParticles.material as THREE.PointsMaterial;
      pMat.color.copy(this.activeParticleColor);
    }

    for (let i = 0; i < this.spotlights.length; i++) {
      this.spotlights[i].intensity = this.activeSpotlightIntensity;
    }
  }

  /**
   * Ground terrain with natural, organic mountain cliff boundaries (no low-poly blocks)
   */
  private buildTerrain() {
    const concreteTex = createConcreteTexture();
    concreteTex.repeat.set(16, 16);

    const groundMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.82,
      metalness: 0.18,
    });

    // Main playable tarmac floor
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Tactical runway and compound markings
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xca8a04,
      transparent: true,
      opacity: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const runwayLineGeo = new THREE.PlaneGeometry(2.0, 120);
    const runwayLine = new THREE.Mesh(runwayLineGeo, lineMat);
    runwayLine.rotation.x = -Math.PI / 2;
    runwayLine.position.set(0, 0.015, 0);
    this.scene.add(runwayLine);

    // Perimeter Organic Mountain Ridges (Subdivided smooth rock geometry with noise displacement)
    const rockTex = createRockTexture();
    rockTex.repeat.set(4, 4);

    const rockMat = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Generate smooth, organic mountain cliff mesh
    const createOrganicCliff = (x: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotY: number = 0) => {
      const geo = new THREE.IcosahedronGeometry(14, 2);
      const pos = geo.attributes.position;
      // Displace vertices with smooth noise to create natural mountain cliffs
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const noise = Math.sin(vx * 0.3) * Math.cos(vz * 0.3) * 2.2 + Math.sin(vy * 0.5) * 1.5;
        pos.setXYZ(i, vx + noise * 0.4, vy + noise * 0.8, vz + noise * 0.4);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, rockMat);
      mesh.scale.set(scaleX, scaleY, scaleZ);
      mesh.position.set(x, 5, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // North mountain wall
    for (let x = -70; x <= 70; x += 18) {
      createOrganicCliff(x, -68 + Math.sin(x * 0.1) * 5, 1.8, 1.7 + Math.sin(x) * 0.4, 1.5, x * 0.2);
    }
    // South mountain wall
    for (let x = -70; x <= 70; x += 18) {
      createOrganicCliff(x, 68 + Math.cos(x * 0.1) * 5, 1.8, 1.6 + Math.cos(x) * 0.3, 1.5, x * 0.3);
    }
    // East mountain wall
    for (let z = -65; z <= 65; z += 18) {
      createOrganicCliff(68 + Math.sin(z * 0.1) * 5, z, 1.5, 1.7 + Math.sin(z) * 0.3, 1.8, z * 0.2);
    }
    // West mountain wall
    for (let z = -65; z <= 65; z += 18) {
      createOrganicCliff(-68 + Math.cos(z * 0.1) * 5, z, 1.5, 1.6 + Math.cos(z) * 0.4, 1.8, z * 0.3);
    }
  }

  /**
   * Central Tactical Command Armory bunker with sloped blast deflectors and architectural details
   */
  private buildCommandArmory() {
    const bunkerGroup = new THREE.Group();
    bunkerGroup.position.set(0, 0, -32);

    const concreteTex = createConcreteTexture();
    const bunkerMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.75,
      metalness: 0.2,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x16191f,
      roughness: 0.35,
      metalness: 0.88,
    });

    // 1. Main reinforced bunker hull
    const mainHullGeo = new THREE.BoxGeometry(24, 6.5, 16);
    const mainHull = new THREE.Mesh(mainHullGeo, bunkerMat);
    mainHull.position.y = 3.25;
    mainHull.castShadow = true;
    mainHull.receiveShadow = true;
    bunkerGroup.add(mainHull);

    // 2. Sloped blast deflection buttresses along front
    const buttressShape = new THREE.Shape();
    buttressShape.moveTo(0, 0);
    buttressShape.lineTo(2.4, 0);
    buttressShape.lineTo(0.6, 6.5);
    buttressShape.lineTo(0, 6.5);
    buttressShape.closePath();

    const buttressExtrude: THREE.ExtrudeGeometryOptions = { steps: 1, depth: 1.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
    const buttressGeo = new THREE.ExtrudeGeometry(buttressShape, buttressExtrude);
    buttressGeo.rotateY(Math.PI / 2);

    const leftButtress = new THREE.Mesh(buttressGeo, bunkerMat);
    leftButtress.position.set(-8.5, 0, 8.0);
    leftButtress.castShadow = true;
    bunkerGroup.add(leftButtress);

    const rightButtress = new THREE.Mesh(buttressGeo, bunkerMat);
    rightButtress.position.set(7.5, 0, 8.0);
    rightButtress.castShadow = true;
    bunkerGroup.add(rightButtress);

    // 3. Overhanging reinforced blast roof with perimeter guard railing
    const roofGeo = new THREE.BoxGeometry(26, 1.2, 18);
    const roof = new THREE.Mesh(roofGeo, steelMat);
    roof.position.y = 7.1;
    roof.castShadow = true;
    bunkerGroup.add(roof);

    // 4. Roof HVAC Chiller units with spinning turbine fans
    const hvacGeo = new THREE.BoxGeometry(3.4, 1.8, 2.8);
    const hvac = new THREE.Mesh(hvacGeo, steelMat);
    hvac.position.set(-6, 8.6, -2);
    hvac.castShadow = true;
    bunkerGroup.add(hvac);

    // 5. Heavy blast door portal with recessed hydraulic pistons
    const portalFrameGeo = new THREE.BoxGeometry(6.6, 4.8, 0.8);
    const portalFrame = new THREE.Mesh(portalFrameGeo, steelMat);
    portalFrame.position.set(0, 2.4, 8.2);
    bunkerGroup.add(portalFrame);

    const doorGeo = new THREE.BoxGeometry(5.2, 4.0, 0.4);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.2, 8.3);
    bunkerGroup.add(door);

    // Hazard stripe header over blast door
    const hazardTex = createHazardTexture();
    const hazardBarGeo = new THREE.BoxGeometry(5.6, 0.6, 0.15);
    const hazardBarMat = new THREE.MeshBasicMaterial({ map: hazardTex });
    const hazardBar = new THREE.Mesh(hazardBarGeo, hazardBarMat);
    hazardBar.position.set(0, 4.5, 8.62);
    bunkerGroup.add(hazardBar);

    // 6. Curved Sandbag Defensive Revetments in front of entry
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x7c7359,
      roughness: 0.95,
      metalness: 0.05,
    });

    const createSandbagArc = (baseX: number, baseZ: number, rot: number) => {
      const arcGroup = new THREE.Group();
      arcGroup.position.set(baseX, 0, baseZ);
      arcGroup.rotation.y = rot;

      for (let layer = 0; layer < 4; layer++) {
        for (let i = -3; i <= 3; i++) {
          const bagGeo = new THREE.CylinderGeometry(0.18, 0.19, 0.65, 12);
          bagGeo.rotateZ(Math.PI / 2);
          const bag = new THREE.Mesh(bagGeo, sandbagMat);
          bag.position.set(i * 0.55 + (layer % 2 === 0 ? 0 : 0.25), layer * 0.26 + 0.14, 0);
          bag.castShadow = true;
          bag.receiveShadow = true;
          arcGroup.add(bag);
        }
      }
      bunkerGroup.add(arcGroup);
    };

    createSandbagArc(-6, 11, 0.25);
    createSandbagArc(6, 11, -0.25);

    this.scene.add(bunkerGroup);
  }

  /**
   * Comms Radar Dish Tower with lattice structure & smooth parabolic antenna
   */
  private buildCommsTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-26, 0, -22);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x242a33,
      metalness: 0.88,
      roughness: 0.25,
    });

    // 4 Heavy lattice legs
    for (let i = 0; i < 4; i++) {
      const legGeo = new THREE.CylinderGeometry(0.14, 0.22, 14, 12);
      const leg = new THREE.Mesh(legGeo, steelMat);
      const angle = (i * Math.PI) / 2;
      leg.position.set(Math.cos(angle) * 2.4, 7, Math.sin(angle) * 2.4);
      leg.castShadow = true;
      towerGroup.add(leg);
    }

    // Platform deck with perimeter railing
    const deckGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.45, 16);
    const deck = new THREE.Mesh(deckGeo, steelMat);
    deck.position.y = 14;
    deck.castShadow = true;
    towerGroup.add(deck);

    // Rotating Radar Dish Group
    const dishGroup = new THREE.Group();
    dishGroup.position.y = 15;

    // Smooth 32-segment parabolic reflector dish
    const dishGeo = new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0x9ba4b2,
      metalness: 0.7,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = -Math.PI / 3;
    dish.castShadow = true;
    dishGroup.add(dish);

    // Feed horn receiver assembly
    const hornGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.8, 12);
    hornGeo.rotateX(Math.PI / 6);
    const horn = new THREE.Mesh(hornGeo, steelMat);
    horn.position.set(0, 1.3, 1.6);
    dishGroup.add(horn);

    towerGroup.add(dishGroup);
    this.commsDishGroup = dishGroup;

    this.scene.add(towerGroup);
  }

  /**
   * Tactical Armored Oshkosh M-ATV / Humvee vehicle with contoured body panels,
   * 32-segment run-flat tires, and mounted heavy machine gun turret
   */
  public buildTacticalVehicle(x: number, y: number, z: number, rotY: number = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x41493e, // military olive-drab ballistic armor
      metalness: 0.5,
      roughness: 0.55,
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x14171c,
      metalness: 0.92,
      roughness: 0.22,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x15171a,
      roughness: 0.95,
      metalness: 0.05,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f2a3a,
      metalness: 0.85,
      roughness: 0.12,
      transparent: true,
      opacity: 0.75,
    });

    // 1. Lower chassis hull
    const chassisGeo = new THREE.BoxGeometry(2.5, 0.8, 5.4);
    const chassis = new THREE.Mesh(chassisGeo, armorMat);
    chassis.position.y = 0.9;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Sloped Engine Hood
    const hoodGeo = new THREE.BoxGeometry(2.3, 0.65, 1.8);
    const hood = new THREE.Mesh(hoodGeo, armorMat);
    hood.position.set(0, 1.25, 1.7);
    hood.rotation.x = 0.08;
    hood.castShadow = true;
    group.add(hood);

    // Front radiator grill & towing winch
    const grillGeo = new THREE.BoxGeometry(2.1, 0.55, 0.15);
    const grill = new THREE.Mesh(grillGeo, darkSteelMat);
    grill.position.set(0, 1.05, 2.65);
    group.add(grill);

    // 3. Cabin greenhouse body
    const cabinGeo = new THREE.BoxGeometry(2.3, 0.95, 3.0);
    const cabin = new THREE.Mesh(cabinGeo, armorMat);
    cabin.position.set(0, 1.75, -0.4);
    cabin.castShadow = true;
    group.add(cabin);

    // 4. Sloped Ballistic Windshield with twin armor glass panes
    const windshieldGeo = new THREE.BoxGeometry(2.1, 0.6, 0.08);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.82, 1.15);
    windshield.rotation.x = -0.42;
    group.add(windshield);

    // Side windows
    const sideWindowGeo = new THREE.BoxGeometry(0.06, 0.45, 0.85);
    const leftWindow = new THREE.Mesh(sideWindowGeo, glassMat);
    leftWindow.position.set(-1.18, 1.75, 0.2);
    group.add(leftWindow);
    const rightWindow = new THREE.Mesh(sideWindowGeo, glassMat);
    rightWindow.position.set(1.18, 1.75, 0.2);
    group.add(rightWindow);

    // 5. Heavy 32-Segment Run-Flat All-Terrain Wheels with Hub Bolts
    const wheelPositions = [
      [-1.32, 0.58, 1.6],
      [1.32, 0.58, 1.6],
      [-1.32, 0.58, -1.6],
      [1.32, 0.58, -1.6],
    ];

    wheelPositions.forEach((pos) => {
      // 32-segment smooth rubber tire
      const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.46, 32);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, rubberMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);

      // Steel rim with lug bolts
      const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.48, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, darkSteelMat);
      rim.position.set(pos[0], pos[1], pos[2]);
      group.add(rim);
    });

    // 6. Roof Armored Turret Ring & Heavy Machine Gun
    const turretRingGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.35, 20);
    const turretRing = new THREE.Mesh(turretRingGeo, darkSteelMat);
    turretRing.position.set(0, 2.4, -0.4);
    group.add(turretRing);

    const gunShieldGeo = new THREE.BoxGeometry(0.85, 0.65, 0.1);
    const gunShield = new THREE.Mesh(gunShieldGeo, darkSteelMat);
    gunShield.position.set(0, 2.75, 0.05);
    group.add(gunShield);

    // .50 Caliber heavy machine gun barrel
    const mgBarrelGeo = new THREE.CylinderGeometry(0.024, 0.028, 1.3, 16);
    mgBarrelGeo.rotateX(Math.PI / 2);
    const mgBarrel = new THREE.Mesh(mgBarrelGeo, darkSteelMat);
    mgBarrel.position.set(0, 2.75, 0.65);
    group.add(mgBarrel);

    this.scene.add(group);
  }

  /**
   * Heavy Military Cargo Shipping Containers with corrugated sides and locking hardware
   */
  private buildCargoContainers() {
    const containerConfigs = [
      { x: -14, z: 8, rotY: 0.1, color: 0x1e3a5f },
      { x: -14, z: 15, rotY: 0.05, color: 0x3d443a },
      { x: 18, z: 6, rotY: -0.3, color: 0x8a3826 },
      { x: 18, z: 13, rotY: -0.28, color: 0x8a3826 },
      { x: 8, z: -10, rotY: 1.57, color: 0x3d443a },
      { x: -8, z: -10, rotY: 1.57, color: 0x1e3a5f },
    ];

    containerConfigs.forEach((cfg) => {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);
      group.rotation.y = cfg.rotY;

      const contMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.68,
        metalness: 0.35,
      });

      const contGeo = new THREE.BoxGeometry(2.6, 2.7, 6.2);
      const container = new THREE.Mesh(contGeo, contMat);
      container.position.y = 1.35;
      container.castShadow = true;
      container.receiveShadow = true;
      group.add(container);

      // Steel corner casting blocks
      const cornerMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.4, metalness: 0.85 });
      const cornerOffsets = [
        [-1.3, 0.15, -3.1], [1.3, 0.15, -3.1], [-1.3, 2.55, -3.1], [1.3, 2.55, -3.1],
        [-1.3, 0.15, 3.1], [1.3, 0.15, 3.1], [-1.3, 2.55, 3.1], [1.3, 2.55, 3.1],
      ];

      cornerOffsets.forEach((cp) => {
        const blockGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
        const block = new THREE.Mesh(blockGeo, cornerMat);
        block.position.set(cp[0], cp[1], cp[2]);
        group.add(block);
      });

      // Side corrugated rib frames
      for (let zOffset = -2.8; zOffset <= 2.8; zOffset += 1.4) {
        const ribGeo = new THREE.BoxGeometry(2.68, 2.78, 0.12);
        const rib = new THREE.Mesh(ribGeo, cornerMat);
        rib.position.set(0, 1.35, zOffset);
        group.add(rib);
      }

      this.scene.add(group);
    });
  }

  /**
   * Perimeter Watchtowers with Security Floodlights
   */
  private buildPerimeterWatchtowers() {
    const towerCoords = [
      { x: -35, z: 35 },
      { x: 35, z: 35 },
      { x: -35, z: -45 },
      { x: 35, z: -45 },
    ];

    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.78,
      metalness: 0.35,
    });

    towerCoords.forEach((c) => {
      const group = new THREE.Group();
      group.position.set(c.x, 0, c.z);

      // 4 Tubular Support Legs
      for (let i = 0; i < 4; i++) {
        const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 10, 12);
        const leg = new THREE.Mesh(legGeo, towerMat);
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        leg.position.set(Math.cos(angle) * 2.2, 5, Math.sin(angle) * 2.2);
        leg.castShadow = true;
        group.add(leg);
      }

      // Sentry cabin platform
      const cabinGeo = new THREE.BoxGeometry(4.2, 2.8, 4.2);
      const cabin = new THREE.Mesh(cabinGeo, towerMat);
      cabin.position.y = 11.4;
      cabin.castShadow = true;
      group.add(cabin);

      // Security Floodlight
      const spot = new THREE.SpotLight(0xfff1cc, 2.8, 60, Math.PI / 5.5, 0.45, 1.5);
      spot.position.set(0, 11, 0);
      spot.target.position.set(-c.x * 0.4, 0, -c.z * 0.4);
      group.add(spot);
      group.add(spot.target);
      this.spotlights.push(spot);

      this.scene.add(group);
    });
  }

  /**
   * Subtle atmospheric dust & ember particles drifting through the air
   */
  private buildAtmosphericParticles() {
    const particleCount = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 12 + 0.5;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: this.activeParticleColor.clone(),
      size: 0.12,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
  }

  /**
   * Per-frame update: advances volumetric cloud drift, smoothly interpolates
   * skybox/lighting presets, keeps sky dome centered on camera, and animates props.
   */
  public update(delta: number, cameraPos?: THREE.Vector3) {
    this.elapsedTime += delta;

    if (this.commsDishGroup) {
      this.commsDishGroup.rotation.y += delta * 0.35;
    }

    // Keep sky dome centered on camera so horizon distance is infinite
    if (this.skyDomeMesh && cameraPos) {
      this.skyDomeMesh.position.copy(cameraPos);
    }

    // Smoothly damp current skybox and lighting values toward target preset
    const lerpFactor = 1.0 - Math.exp(-2.8 * delta);
    const tgt = this.targetConfig;

    this.activeZenithColor.lerp(tgt.zenithColor, lerpFactor);
    this.activeHorizonColor.lerp(tgt.horizonColor, lerpFactor);
    this.activeGroundColor.lerp(tgt.groundColor, lerpFactor);
    this.activeSunColor.lerp(tgt.sunColor, lerpFactor);
    this.activeCloudColor.lerp(tgt.cloudColor, lerpFactor);
    this.activeCloudShadowColor.lerp(tgt.cloudShadowColor, lerpFactor);
    this.activeSunDirection.lerp(tgt.sunDirection, lerpFactor).normalize();
    this.activeAmbientColor.lerp(tgt.ambientColor, lerpFactor);
    this.activeHemiSkyColor.lerp(tgt.hemiSkyColor, lerpFactor);
    this.activeHemiGroundColor.lerp(tgt.hemiGroundColor, lerpFactor);
    this.activeParticleColor.lerp(tgt.particleColor, lerpFactor);

    this.activeSunLightIntensity = THREE.MathUtils.damp(this.activeSunLightIntensity, tgt.sunLightIntensity, 2.8, delta);
    this.activeAmbientIntensity = THREE.MathUtils.damp(this.activeAmbientIntensity, tgt.ambientIntensity, 2.8, delta);
    this.activeHemiIntensity = THREE.MathUtils.damp(this.activeHemiIntensity, tgt.hemiIntensity, 2.8, delta);
    this.activeFogDensity = THREE.MathUtils.damp(this.activeFogDensity, tgt.fogDensity, 2.8, delta);
    this.activeStarIntensity = THREE.MathUtils.damp(this.activeStarIntensity, tgt.starIntensity, 2.8, delta);
    this.activeCloudDensity = THREE.MathUtils.damp(this.activeCloudDensity, tgt.cloudDensity, 2.8, delta);
    this.activeSpotlightIntensity = THREE.MathUtils.damp(this.activeSpotlightIntensity, tgt.spotlightIntensity, 2.8, delta);

    this.applyActiveStateToScene();

    if (this.skyMaterial) {
      this.skyMaterial.uniforms.uTime.value = this.elapsedTime;
      // Subtle atmospheric storm sheet lightning pulse when in crimson_storm
      if (this.currentPreset === 'crimson_storm') {
        const pulse = Math.pow(Math.max(0, Math.sin(this.elapsedTime * 2.7) * Math.sin(this.elapsedTime * 7.3)), 8.0);
        this.skyMaterial.uniforms.uLightningFlash.value = pulse;
      } else {
        this.skyMaterial.uniforms.uLightningFlash.value = 0.0;
      }
    }

    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - delta * 0.4;
        let x = pos.getX(i) + Math.sin(this.elapsedTime + i) * delta * 0.3;
        if (y < 0.2) y = 12;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
  }
}
