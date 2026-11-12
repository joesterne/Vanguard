/**
 * Tactical Web Audio Procedural Sound Synthesizer & Dynamic Acoustic DSP Engine
 * Zero external audio files, zero 404s, real-time geometric occlusion & acoustic reflections.
 */

export type AcousticEnvironmentType = 'OPEN_FIELD' | 'CONTAINER_CANYON' | 'CONCRETE_BUNKER' | 'MOUNTAIN_BASIN';

export interface AcousticState {
  zone: AcousticEnvironmentType;
  zoneLabel: string;
  enclosureFactor: number; // 0.0 (open air) to 1.0 (enclosed bunker)
  reverbDecayTime: number; // in seconds
  wetMix: number; // 0.0 to 1.0
  activeOcclusion: number; // current listener-to-environment occlusion
  description: string;
}

export interface AcousticObstacle {
  id: string;
  type: 'bunker' | 'container' | 'barrier' | 'vehicle' | 'rock';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  density: number; // 0.3 to 1.0 (mass/attenuation factor)
}

export interface SoundPlayOptions {
  isPlayer?: boolean;
  origin?: { x: number; y: number; z: number };
  volumeMultiplier?: number;
}

// Ray-AABB intersection slab algorithm
function rayBoxIntersection(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  b: AcousticObstacle
): { hit: boolean; tMin: number; tMax: number } {
  const invDx = Math.abs(dx) > 1e-6 ? 1.0 / dx : 1e6;
  const invDy = Math.abs(dy) > 1e-6 ? 1.0 / dy : 1e6;
  const invDz = Math.abs(dz) > 1e-6 ? 1.0 / dz : 1e6;

  let t1 = (b.minX - ox) * invDx;
  let t2 = (b.maxX - ox) * invDx;
  let tmin = Math.min(t1, t2);
  let tmax = Math.max(t1, t2);

  t1 = (b.minY - oy) * invDy;
  t2 = (b.maxY - oy) * invDy;
  tmin = Math.max(tmin, Math.min(t1, t2));
  tmax = Math.min(tmax, Math.max(t1, t2));

  t1 = (b.minZ - oz) * invDz;
  t2 = (b.maxZ - oz) * invDz;
  tmin = Math.max(tmin, Math.min(t1, t2));
  tmax = Math.min(tmax, Math.max(t1, t2));

  return {
    hit: tmax >= Math.max(0, tmin),
    tMin: Math.max(0, tmin),
    tMax: tmax,
  };
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private heartbeatInterval: number | null = null;

  // Acoustic DSP Reverb & Reflection Bus
  private reverbConvolver: ConvolverNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private reverbFilter: BiquadFilterNode | null = null;
  private reverbReturnGain: GainNode | null = null;

  // Cached Procedural Impulse Response Buffers
  private irBuffers: Record<AcousticEnvironmentType, AudioBuffer | null> = {
    OPEN_FIELD: null,
    CONTAINER_CANYON: null,
    CONCRETE_BUNKER: null,
    MOUNTAIN_BASIN: null,
  };

  // Continuous Procedural Ambient Generators
  private ambientWindGain: GainNode | null = null;
  private ambientWindFilter: BiquadFilterNode | null = null;
  private ambientBunkerGain: GainNode | null = null;
  private ambientBunkerFilter: BiquadFilterNode | null = null;
  private ambientContainerWhistleGain: GainNode | null = null;
  private ambientLFO: OscillatorNode | null = null;
  private isAmbientStarted: boolean = false;

  // Dynamic Acoustic State & Tracking
  private currentZone: AcousticEnvironmentType = 'OPEN_FIELD';
  private enclosureFactor: number = 0.0;
  private listenerPos: { x: number; y: number; z: number } = { x: 0, y: 1.7, z: 0 };
  private listenerDir: { x: number; y: number; z: number } = { x: 0, y: 0, z: -1 };

  // Tactical Environment Obstacles (Bunker, Shipping Containers, Barriers, MATV Vehicle)
  private obstacles: AcousticObstacle[] = [
    // 1. Reinforced Concrete Bunker (centered around z = -32)
    {
      id: 'bunker_main_hull',
      type: 'bunker',
      minX: -12.5, maxX: 12.5,
      minY: 0, maxY: 7.2,
      minZ: -40.0, maxZ: -24.5,
      density: 0.95,
    },
    // Bunker Left Buttress
    {
      id: 'bunker_buttress_left',
      type: 'bunker',
      minX: -14.8, maxX: -11.2,
      minY: 0, maxY: 5.5,
      minZ: -37.5, maxZ: -26.5,
      density: 0.9,
    },
    // Bunker Right Buttress
    {
      id: 'bunker_buttress_right',
      type: 'bunker',
      minX: 11.2, maxX: 14.8,
      minY: 0, maxY: 5.5,
      minZ: -37.5, maxZ: -26.5,
      density: 0.9,
    },
    // 2. Shipping Containers (West Corridor Cluster)
    {
      id: 'container_west_1',
      type: 'container',
      minX: -15.8, maxX: -12.2,
      minY: 0, maxY: 2.8,
      minZ: -13.5, maxZ: -6.5,
      density: 0.8,
    },
    {
      id: 'container_west_2',
      type: 'container',
      minX: -15.8, maxX: -12.2,
      minY: 0, maxY: 2.8,
      minZ: -20.5, maxZ: -13.5,
      density: 0.8,
    },
    {
      id: 'container_west_3',
      type: 'container',
      minX: -13.5, maxX: -6.5,
      minY: 0, maxY: 2.8,
      minZ: -15.2, maxZ: -11.8,
      density: 0.8,
    },
    // 3. Shipping Containers (East Logistics Cluster)
    {
      id: 'container_east_1',
      type: 'container',
      minX: 13.5, maxX: 16.8,
      minY: 0, maxY: 2.8,
      minZ: 4.5, maxZ: 11.5,
      density: 0.8,
    },
    {
      id: 'container_east_2',
      type: 'container',
      minX: 13.5, maxX: 16.8,
      minY: 0, maxY: 2.8,
      minZ: 11.5, maxZ: 18.5,
      density: 0.8,
    },
    {
      id: 'container_east_3',
      type: 'container',
      minX: 15.5, maxX: 22.5,
      minY: 0, maxY: 2.8,
      minZ: 9.8, maxZ: 13.2,
      density: 0.8,
    },
    // 4. Armored MATV Tactical Vehicle
    {
      id: 'matv_armored_vehicle',
      type: 'vehicle',
      minX: 11.8, maxX: 16.2,
      minY: 0, maxY: 2.9,
      minZ: -21.2, maxZ: -14.8,
      density: 0.75,
    },
    // 5. Concrete Jersey Barriers (Perimeter Compound Line)
    {
      id: 'barrier_north_left',
      type: 'barrier',
      minX: -8.0, maxX: -1.0,
      minY: 0, maxY: 1.2,
      minZ: -12.0, maxZ: -11.0,
      density: 0.6,
    },
    {
      id: 'barrier_north_right',
      type: 'barrier',
      minX: 1.0, maxX: 8.0,
      minY: 0, maxY: 1.2,
      minZ: -12.0, maxZ: -11.0,
      density: 0.6,
    },
  ];

  constructor() {
    // Lazily initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambient Environmental Soundscape Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // Setup Acoustic Reverb & Reflection Bus
      this.setupAcousticDSP();

      // Setup Continuous Procedural Ambient Audio
      this.setupProceduralAmbience();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Builds the real-time acoustic convolution and reflection DSP bus.
   * Generates procedural impulse responses for all 4 tactical environment profiles.
   */
  private setupAcousticDSP() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Generate Procedural Impulse Responses
    this.irBuffers.OPEN_FIELD = this.generateImpulseResponse(0.32, 12.0, {
      earlyTaps: [{ delay: 0.014, gain: 0.2 }],
      lowpassCutoff: 10000,
    });

    this.irBuffers.CONTAINER_CANYON = this.generateImpulseResponse(0.85, 5.5, {
      earlyTaps: [
        { delay: 0.026, gain: 0.5 },
        { delay: 0.046, gain: 0.4 },
        { delay: 0.068, gain: 0.28 },
      ],
      lowpassCutoff: 7500,
    });

    this.irBuffers.CONCRETE_BUNKER = this.generateImpulseResponse(2.35, 2.1, {
      earlyTaps: [
        { delay: 0.016, gain: 0.65 },
        { delay: 0.034, gain: 0.52 },
        { delay: 0.062, gain: 0.45 },
        { delay: 0.098, gain: 0.38 },
      ],
      lowpassCutoff: 4600,
    });

    this.irBuffers.MOUNTAIN_BASIN = this.generateImpulseResponse(1.85, 3.4, {
      earlyTaps: [
        { delay: 0.21, gain: 0.45 },
        { delay: 0.33, gain: 0.26 },
      ],
      lowpassCutoff: 3800,
    });

    // 2. Build DSP Node Graph
    this.reverbSendGain = this.ctx.createGain();
    this.reverbSendGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.irBuffers.OPEN_FIELD;

    this.reverbFilter = this.ctx.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.setValueAtTime(8000, this.ctx.currentTime);
    this.reverbFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.reverbReturnGain = this.ctx.createGain();
    this.reverbReturnGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

    // Route: Send -> Convolver -> Filter -> Return -> Master
    this.reverbSendGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbReturnGain);
    this.reverbReturnGain.connect(this.masterGain);
  }

  /**
   * Synthesizes a physically-modeled stereo impulse response without any external audio files.
   * Incorporates early reflection taps, exponential air absorption, and stereo diffusion.
   */
  private generateImpulseResponse(
    duration: number,
    decayRate: number,
    options: {
      earlyTaps?: { delay: number; gain: number }[];
      lowpassCutoff?: number;
    } = {}
  ): AudioBuffer {
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx
      ? this.ctx.createBuffer(2, length, sampleRate)
      : ({
          getChannelData: () => new Float32Array(length),
        } as unknown as AudioBuffer);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // 1. Exponentially decaying Gaussian white/pink noise envelope
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-decayRate * t);
      const nL = (Math.random() * 2 - 1) * 0.7;
      const nR = (Math.random() * 2 - 1) * 0.7;
      left[i] = nL * env;
      right[i] = nR * env;
    }

    // 2. Discrete early reflection taps with slight stereo pan offset
    if (options.earlyTaps) {
      for (const tap of options.earlyTaps) {
        const sampleIdx = Math.floor(tap.delay * sampleRate);
        if (sampleIdx < length) {
          left[sampleIdx] += tap.gain * 0.95;
          right[sampleIdx] += tap.gain * 0.75;
          // Sub-echo tap
          const subIdx = sampleIdx + Math.floor(0.003 * sampleRate);
          if (subIdx < length) {
            left[subIdx] += tap.gain * 0.35;
            right[subIdx] += tap.gain * 0.42;
          }
        }
      }
    }

    // 3. Low-pass air absorption filter (one-pole IIR)
    if (options.lowpassCutoff) {
      const dt = 1 / sampleRate;
      const rc = 1 / (2 * Math.PI * options.lowpassCutoff);
      const alpha = dt / (rc + dt);
      let prevL = 0;
      let prevR = 0;
      for (let i = 0; i < length; i++) {
        prevL += alpha * (left[i] - prevL);
        prevR += alpha * (right[i] - prevR);
        left[i] = prevL;
        right[i] = prevR;
      }
    }

    return buffer;
  }

  /**
   * Initializes the continuous procedural ambient environmental soundscape:
   * - Outdoor wind turbulence with organic LFO gusting
   * - Concrete bunker ventilation sub-drone (60Hz / 120Hz hum + muffled air movement)
   * - Metallic container corridor air draft resonance
   */
  private setupProceduralAmbience() {
    if (!this.ctx || !this.ambientGain || this.isAmbientStarted) return;
    this.isAmbientStarted = true;
    const now = this.ctx.currentTime;

    // 1. Procedural Pink Noise Buffer for Wind & Airflow
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    // Outdoor Wind Source
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.ambientWindFilter = this.ctx.createBiquadFilter();
    this.ambientWindFilter.type = 'bandpass';
    this.ambientWindFilter.frequency.setValueAtTime(360, now);
    this.ambientWindFilter.Q.setValueAtTime(0.8, now);

    this.ambientWindGain = this.ctx.createGain();
    this.ambientWindGain.gain.setValueAtTime(0.08, now);

    windSource.connect(this.ambientWindFilter);
    this.ambientWindFilter.connect(this.ambientWindGain);
    this.ambientWindGain.connect(this.ambientGain);
    windSource.start(now);

    // LFO for slow atmospheric wind gusting
    this.ambientLFO = this.ctx.createOscillator();
    this.ambientLFO.frequency.setValueAtTime(0.16, now); // ~6.2s gust cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, now);
    this.ambientLFO.connect(lfoGain);
    lfoGain.connect(this.ambientWindFilter.frequency);
    this.ambientLFO.start(now);

    // 2. Concrete Bunker Sub-Ventilation Drone (58Hz + 116Hz)
    const bunkerOsc1 = this.ctx.createOscillator();
    bunkerOsc1.type = 'sawtooth';
    bunkerOsc1.frequency.setValueAtTime(58, now);

    const bunkerOsc2 = this.ctx.createOscillator();
    bunkerOsc2.type = 'sine';
    bunkerOsc2.frequency.setValueAtTime(116, now);

    this.ambientBunkerFilter = this.ctx.createBiquadFilter();
    this.ambientBunkerFilter.type = 'lowpass';
    this.ambientBunkerFilter.frequency.setValueAtTime(120, now);

    this.ambientBunkerGain = this.ctx.createGain();
    this.ambientBunkerGain.gain.setValueAtTime(0.01, now); // starts quiet until near bunker

    bunkerOsc1.connect(this.ambientBunkerFilter);
    bunkerOsc2.connect(this.ambientBunkerFilter);
    this.ambientBunkerFilter.connect(this.ambientBunkerGain);
    this.ambientBunkerGain.connect(this.ambientGain);
    bunkerOsc1.start(now);
    bunkerOsc2.start(now);

    // 3. Container Corridor Whistle Draft
    const containerWhistleSource = this.ctx.createBufferSource();
    containerWhistleSource.buffer = noiseBuffer;
    containerWhistleSource.loop = true;

    const whistleFilter = this.ctx.createBiquadFilter();
    whistleFilter.type = 'bandpass';
    whistleFilter.frequency.setValueAtTime(1480, now);
    whistleFilter.Q.setValueAtTime(4.5, now);

    this.ambientContainerWhistleGain = this.ctx.createGain();
    this.ambientContainerWhistleGain.gain.setValueAtTime(0.0, now);

    containerWhistleSource.connect(whistleFilter);
    whistleFilter.connect(this.ambientContainerWhistleGain);
    this.ambientContainerWhistleGain.connect(this.ambientGain);
    containerWhistleSource.start(now);
  }

  // --- REAL-TIME ACOUSTIC ENVIRONMENT & OCCLUSION LOGIC ---

  /**
   * Registers additional physical occluders (e.g. dynamic barriers or vehicles)
   */
  public registerObstacle(obstacle: AcousticObstacle) {
    this.obstacles.push(obstacle);
  }

  public setObstacles(obstacles: AcousticObstacle[]) {
    this.obstacles = obstacles;
  }

  /**
   * Computes acoustic occlusion factor between sound source and listener
   * Returns a normalized occlusion value: 0.0 (open line of sight) to 0.95 (heavy concrete obstruction).
   */
  public calculateOcclusion(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number } = this.listenerPos
  ): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.1) return 0.0;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const dirZ = dz / dist;

    let accumulatedOcclusion = 0.0;

    for (const obstacle of this.obstacles) {
      const isect = rayBoxIntersection(from.x, from.y, from.z, dirX, dirY, dirZ, obstacle);
      if (isect.hit && isect.tMin < dist && isect.tMax > 0.05) {
        const penetrationDist = Math.min(isect.tMax, dist) - Math.max(isect.tMin, 0);
        if (penetrationDist > 0.05) {
          // Attenuation based on obstacle material mass and penetration depth
          const massContribution = 1.0 - Math.exp(-penetrationDist * obstacle.density * 0.7);
          accumulatedOcclusion = 1.0 - (1.0 - accumulatedOcclusion) * (1.0 - massContribution);
        }
      }
    }

    return Math.max(0.0, Math.min(0.95, accumulatedOcclusion));
  }

  /**
   * Updates real-time acoustic environment analysis based on player position and direction.
   * Modulates ambient soundscapes, crossfades reverb impulse responses, and dynamically tunes DSP filters.
   */
  public updateAcoustics(
    listenerPos: { x: number; y: number; z: number },
    listenerDir: { x: number; y: number; z: number }
  ) {
    this.listenerPos = { ...listenerPos };
    this.listenerDir = { ...listenerDir };

    // 1. Determine Acoustic Zone based on geometry
    let newZone: AcousticEnvironmentType = 'OPEN_FIELD';
    const bunkerCenterDist = Math.sqrt(
      listenerPos.x * listenerPos.x + (listenerPos.z + 32) * (listenerPos.z + 32)
    );
    const isInsideBunker =
      Math.abs(listenerPos.x) <= 10.5 &&
      listenerPos.z >= -39.0 &&
      listenerPos.z <= -25.0 &&
      listenerPos.y <= 7.0;

    const isNearContainers =
      (listenerPos.x >= -19 && listenerPos.x <= -7 && listenerPos.z >= -22 && listenerPos.z <= -6) ||
      (listenerPos.x >= 11 && listenerPos.x <= 24 && listenerPos.z >= 5 && listenerPos.z <= 20);

    const perimeterRadius = Math.sqrt(
      listenerPos.x * listenerPos.x + listenerPos.z * listenerPos.z
    );

    if (isInsideBunker) {
      newZone = 'CONCRETE_BUNKER';
      this.enclosureFactor = 0.95;
    } else if (bunkerCenterDist < 16.0 && listenerPos.z < -24.0) {
      newZone = 'CONCRETE_BUNKER';
      this.enclosureFactor = Math.max(0.2, (16.0 - bunkerCenterDist) / 16.0 * 0.7);
    } else if (isNearContainers) {
      newZone = 'CONTAINER_CANYON';
      this.enclosureFactor = 0.45;
    } else if (perimeterRadius > 34.0) {
      newZone = 'MOUNTAIN_BASIN';
      this.enclosureFactor = 0.1;
    } else {
      newZone = 'OPEN_FIELD';
      this.enclosureFactor = 0.05;
    }

    // 2. Crossfade Impulse Response if Zone Changed
    if (newZone !== this.currentZone) {
      this.currentZone = newZone;
      if (this.reverbConvolver && this.irBuffers[newZone]) {
        this.reverbConvolver.buffer = this.irBuffers[newZone];
      }
    }

    // 3. Real-time DSP parameter updates
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const smoothTime = 0.08;

      // Adjust Reverb parameters based on zone
      if (this.reverbReturnGain && this.reverbFilter) {
        let targetWet = 0.22;
        let targetDampCutoff = 9000;

        switch (this.currentZone) {
          case 'CONCRETE_BUNKER':
            targetWet = 0.65;
            targetDampCutoff = 3800; // heavy low-end bunker resonance
            break;
          case 'CONTAINER_CANYON':
            targetWet = 0.42;
            targetDampCutoff = 7200; // crisp metallic early flutter
            break;
          case 'MOUNTAIN_BASIN':
            targetWet = 0.38;
            targetDampCutoff = 4500; // distant canyon air absorption
            break;
          case 'OPEN_FIELD':
          default:
            targetWet = 0.18;
            targetDampCutoff = 11000;
            break;
        }

        this.reverbReturnGain.gain.setTargetAtTime(targetWet, now, smoothTime);
        this.reverbFilter.frequency.setTargetAtTime(targetDampCutoff, now, smoothTime);
      }

      // Adjust Ambient Environmental Soundscape
      if (this.ambientWindGain && this.ambientWindFilter) {
        // In bunker: outdoor wind is heavily muffled
        const windTarget = this.currentZone === 'CONCRETE_BUNKER' ? 0.015 : 0.085;
        const windCutoff = this.currentZone === 'CONCRETE_BUNKER' ? 220 : 380;
        this.ambientWindGain.gain.setTargetAtTime(windTarget, now, smoothTime);
        this.ambientWindFilter.frequency.setTargetAtTime(windCutoff, now, smoothTime);
      }

      if (this.ambientBunkerGain) {
        // Bunker ventilation rumble increases with enclosure
        const bunkerRumbleTarget = isInsideBunker
          ? 0.28
          : bunkerCenterDist < 20.0
          ? Math.max(0.01, (20.0 - bunkerCenterDist) / 20.0 * 0.15)
          : 0.005;
        this.ambientBunkerGain.gain.setTargetAtTime(bunkerRumbleTarget, now, smoothTime);
      }

      if (this.ambientContainerWhistleGain) {
        const whistleTarget = this.currentZone === 'CONTAINER_CANYON' ? 0.08 : 0.0;
        this.ambientContainerWhistleGain.gain.setTargetAtTime(whistleTarget, now, smoothTime);
      }
    }
  }

  /**
   * Returns current active acoustic state for tactical HUD telemetry and debug display
   */
  public getAcousticState(): AcousticState {
    const labels: Record<AcousticEnvironmentType, string> = {
      OPEN_FIELD: 'OPEN AIRFIELD // HIGH DISPERSION',
      CONTAINER_CANYON: 'CONTAINER CANYON // SLAPBACK ECHO',
      CONCRETE_BUNKER: 'CONCRETE BUNKER // HEAVY RESONANCE',
      MOUNTAIN_BASIN: 'MOUNTAIN BASIN // CANYON RETURN',
    };

    const decays: Record<AcousticEnvironmentType, number> = {
      OPEN_FIELD: 0.32,
      CONTAINER_CANYON: 0.85,
      CONCRETE_BUNKER: 2.35,
      MOUNTAIN_BASIN: 1.85,
    };

    const descs: Record<AcousticEnvironmentType, string> = {
      OPEN_FIELD: 'Low reflection, crisp ballistic snap, rapid air dissipation.',
      CONTAINER_CANYON: 'Corrugated metal flutter echo (35ms delay), sharp metallic timbre.',
      CONCRETE_BUNKER: 'High enclosure factor, dense multi-reflection tail, heavy sub gain.',
      MOUNTAIN_BASIN: 'Delayed canyon wall slap (210ms delay), high-frequency air damping.',
    };

    return {
      zone: this.currentZone,
      zoneLabel: labels[this.currentZone],
      enclosureFactor: this.enclosureFactor,
      reverbDecayTime: decays[this.currentZone],
      wetMix: this.currentZone === 'CONCRETE_BUNKER' ? 0.65 : this.currentZone === 'CONTAINER_CANYON' ? 0.42 : 0.22,
      activeOcclusion: this.enclosureFactor > 0.6 ? 0.85 : 0.0,
      description: descs[this.currentZone],
    };
  }

  // --- HELPER TO ROUTE SPATIALIZED & OCCLUDED AUDIO ---

  /**
   * Creates an occlusion and spatialization sub-chain for a sound event.
   * Direct path: Source -> Occlusion Lowpass -> Distance Gain -> Stereo Panner -> SFX Bus
   * Reflection path: Source -> Reverb Send -> Master Reverb Convolver
   */
  private createSpatialAcousticChain(options?: SoundPlayOptions): {
    inputNode: AudioNode;
    directGain: GainNode;
  } | null {
    if (!this.ctx || !this.sfxGain || this.isMuted) return null;
    const now = this.ctx.currentTime;

    const isPlayer = options?.isPlayer ?? true;
    const origin = options?.origin ?? this.listenerPos;
    const volMultiplier = options?.volumeMultiplier ?? 1.0;

    // Direct input node
    const inputNode = this.ctx.createGain();
    inputNode.gain.setValueAtTime(1.0, now);

    // Calculate Occlusion
    let occlusion = 0.0;
    let dist = 0.0;
    let pan = 0.0;

    if (!isPlayer && options?.origin) {
      occlusion = this.calculateOcclusion(origin, this.listenerPos);

      // Distance attenuation
      const dx = origin.x - this.listenerPos.x;
      const dy = origin.y - this.listenerPos.y;
      const dz = origin.z - this.listenerPos.z;
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Horizontal Stereo Panning based on listener forward/right vectors
      const fwdX = this.listenerDir.x;
      const fwdZ = this.listenerDir.z;
      const fwdLen = Math.sqrt(fwdX * fwdX + fwdZ * fwdZ) || 1;
      const rightX = -fwdZ / fwdLen;
      const rightZ = fwdX / fwdLen;

      if (dist > 0.1) {
        const toSourceX = dx / dist;
        const toSourceZ = dz / dist;
        pan = Math.max(-1.0, Math.min(1.0, toSourceX * rightX + toSourceZ * rightZ));
      }
    }

    // 1. Direct Path Occlusion Filter (Muffles high frequencies through concrete/steel)
    const occlusionFilter = this.ctx.createBiquadFilter();
    occlusionFilter.type = 'lowpass';

    // When occluded, cutoff drops from 18kHz down to 850Hz based on obstacle mass
    const cutoffFreq = 18000 * Math.pow(0.045, occlusion);
    occlusionFilter.frequency.setValueAtTime(cutoffFreq, now);
    occlusionFilter.Q.setValueAtTime(isPlayer ? 1.0 : 1.4, now);

    // 2. Direct Path Gain (Distance + Occlusion attenuation)
    const directGain = this.ctx.createGain();
    const distAtten = dist > 0 ? 1.0 / (1.0 + dist * 0.038) : 1.0;
    const occlusionVolumeDamp = 1.0 - occlusion * 0.72; // -11dB max direct reduction
    directGain.gain.setValueAtTime(volMultiplier * distAtten * occlusionVolumeDamp, now);

    // 3. Stereo Panner
    let panner: StereoPannerNode | null = null;
    if (this.ctx.createStereoPanner && !isPlayer) {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
    }

    // Connect Direct Chain
    inputNode.connect(occlusionFilter);
    occlusionFilter.connect(directGain);
    if (panner) {
      directGain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      directGain.connect(this.sfxGain);
    }

    // 4. Acoustic Reflection / Reverb Send
    if (this.reverbSendGain) {
      const reverbSend = this.ctx.createGain();
      // Even when direct path is occluded, sound bounces around corners into room!
      const reverbMix = isPlayer
        ? (this.currentZone === 'CONCRETE_BUNKER' ? 0.75 : 0.35)
        : Math.max(0.2, (1.0 - dist * 0.015) * (0.35 + occlusion * 0.5));
      reverbSend.gain.setValueAtTime(reverbMix * volMultiplier, now);

      inputNode.connect(reverbSend);
      reverbSend.connect(this.reverbSendGain);
    }

    return { inputNode, directGain };
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- WEAPONS WITH REAL-TIME GEOMETRIC ACOUSTICS ---

  /** Primary Assault Rifle (Mk18 CQB) Fire with spatial occlusion & room reflections */
  public playRifleFire(options?: SoundPlayOptions) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chain = this.createSpatialAcousticChain(options);
    const dest = chain ? chain.inputNode : this.sfxGain;

    // 1. Noise transient ballistic crack
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.022));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.72, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);

    // 2. Heavy sub punch (oscillator dropping from 185Hz to 35Hz)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.13);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.92, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.16);

    // 3. Mechanical bolt report
    const click = this.ctx.createOscillator();
    click.type = 'sawtooth';
    click.frequency.setValueAtTime(820, now);
    click.frequency.exponentialRampToValueAtTime(200, now + 0.045);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    click.connect(clickGain);
    clickGain.connect(dest);
    click.start(now);
    click.stop(now + 0.05);
  }

  /** Secondary Pistol Fire with acoustic processing */
  public playPistolFire(options?: SoundPlayOptions) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chain = this.createSpatialAcousticChain(options);
    const dest = chain ? chain.inputNode : this.sfxGain;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.095);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.62, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Empty Magazine Dry Fire Click */
  public playDryFire() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Tactical Reload Sequence */
  public playReload() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    // Mag out
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }, 150);

    // Mag in
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(500, t + 0.07);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    }, 750);

    // Bolt slide rack
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }, 1250);
  }

  /** Aim Down Sights (ADS) snap */
  public playADS(aimIn: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = aimIn ? 300 : 500;
    const endFreq = aimIn ? 500 : 300;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Weapon Inspect Sound */
  public playInspectWeapon() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);

    setTimeout(() => {
      if (!this.ctx || !this.sfxGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(320, t);
      osc2.frequency.exponentialRampToValueAtTime(140, t + 0.06);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.2, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t);
      osc2.stop(t + 0.08);
    }, 180);
  }

  // --- FEEDBACK & HITMARKERS ---

  /** Crisp Hitmarker Tick */
  public playHitmarker(isHeadshot: boolean = false, isKill: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const baseFreq = isKill ? 1800 : isHeadshot ? 1500 : 1100;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.05);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isKill ? 0.45 : isHeadshot ? 0.35 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isKill ? 0.12 : 0.05));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (isKill ? 0.13 : 0.06));

    if (isKill) {
      const killChime = this.ctx.createOscillator();
      killChime.type = 'triangle';
      killChime.frequency.setValueAtTime(280, now + 0.04);
      killChime.frequency.exponentialRampToValueAtTime(450, now + 0.18);

      const chimeGain = this.ctx.createGain();
      chimeGain.gain.setValueAtTime(0.3, now + 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      killChime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      killChime.start(now + 0.04);
      killChime.stop(now + 0.22);
    }
  }

  /** Player Damage Taken Impact */
  public playPlayerHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Enemy Neutralized / Ragdoll Thud */
  public playEnemyDeath() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.16);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** Dramatic Death Camera Sub-Bass Drop */
  public playDeathCamBassDrop() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  // --- PHYSICS & DESTRUCTION WITH SPATIAL ACOUSTICS ---

  /** Massive Explosion with 3D Occlusion & Reverb Tail */
  public playExplosion(origin?: { x: number; y: number; z: number }) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chain = this.createSpatialAcousticChain({
      origin,
      isPlayer: false,
      volumeMultiplier: 1.25,
    });
    const dest = chain ? chain.inputNode : this.sfxGain;

    // Sub bass shockwave
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.65);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.8);

    // Crumbling noise blast
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.16));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.55);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);
  }

  /** Destructible Barrier Shatter with Spatial Routing */
  public playDebrisShatter(origin?: { x: number; y: number; z: number }) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chain = this.createSpatialAcousticChain({
      origin,
      isPlayer: false,
      volumeMultiplier: 0.9,
    });
    const dest = chain ? chain.inputNode : this.sfxGain;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Bullet Ricochet / Metal Impact Ding with Spatial Routing */
  public playRicochet(origin?: { x: number; y: number; z: number }) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chain = this.createSpatialAcousticChain({
      origin,
      isPlayer: false,
      volumeMultiplier: 0.85,
    });
    const dest = chain ? chain.inputNode : this.sfxGain;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600 + Math.random() * 800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  // --- TACTICAL COMMS & UI ---

  public playRadioPing() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1175, now + 0.05);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.13);
  }

  /** Footstep sound modulated by surface material */
  public playFootstep(surface?: 'concrete' | 'gravel' | 'metal') {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Detect surface from environment if not specified
    const activeSurface = surface || (this.currentZone === 'CONCRETE_BUNKER' ? 'concrete' : this.currentZone === 'CONTAINER_CANYON' ? 'metal' : 'gravel');

    const osc = this.ctx.createOscillator();
    let startFreq = 95;
    let endFreq = 40;
    let gainVal = 0.14;

    if (activeSurface === 'metal') {
      osc.type = 'triangle';
      startFreq = 260;
      endFreq = 90;
      gainVal = 0.16;
    } else if (activeSurface === 'concrete') {
      osc.type = 'triangle';
      startFreq = 120;
      endFreq = 45;
      gainVal = 0.15;
    } else {
      osc.type = 'sine';
      startFreq = 85;
      endFreq = 35;
      gainVal = 0.12;
    }

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.055);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public setHeartbeatActive(active: boolean) {
    if (active) {
      if (this.heartbeatInterval !== null) return;
      this.heartbeatInterval = window.setInterval(() => {
        this.playHeartbeatThump();
      }, 750);
    } else {
      if (this.heartbeatInterval !== null) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  }

  private playHeartbeatThump() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playUIClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Holographic Table Telemetry Scan & Data Chirp */
  public playHoloScan() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1320, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.045);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(660, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(990, now + 0.09);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc1.stop(now + 0.05);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.1);
  }
}

export const soundEngine = new SoundEngine();
