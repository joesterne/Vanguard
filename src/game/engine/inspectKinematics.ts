export interface InspectTriggerGuardState {
  isReloading: boolean;
  isAiming: boolean;
  isSprinting: boolean;
}

export interface InspectKinematicsResult {
  offset: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  lightIntensity: number;
  progress: number;
  phaseIndex: 1 | 2 | 3 | 4;
  phaseLabel: string;
  isComplete: boolean;
}

export const DEFAULT_INSPECT_DURATION = 4.6;

/**
 * Determines whether the player can trigger or maintain the 'inspect weapon' animation.
 * Inspection is allowed when standing, crouching, or walking, and blocked while reloading, ADS aiming, or sprinting.
 */
export function canTriggerInspect(state: InspectTriggerGuardState): boolean {
  return !state.isReloading && !state.isAiming && !state.isSprinting;
}

/**
 * Smooth cubic Hermite interpolation (smoothstep) on [0, 1]
 */
function smoothstep01(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Computes deterministic 4-phase 3D viewmodel offsets, Euler rotations, and skin rim-light intensity
 * for the weapon inspection animation triggered by `isInspecting`.
 */
export function computeInspectKinematics(
  inspectTime: number,
  inspectDuration: number = DEFAULT_INSPECT_DURATION
): InspectKinematicsResult {
  if (inspectTime <= 0) {
    return {
      offset: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      lightIntensity: 0,
      progress: 0,
      phaseIndex: 1,
      phaseLabel: 'LEFT RECEIVER · SERIAL UID & SKIN FINISH',
      isComplete: false,
    };
  }

  if (inspectTime >= inspectDuration) {
    return {
      offset: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      lightIntensity: 0,
      progress: 1,
      phaseIndex: 4,
      phaseLabel: 'RETURNING TO COMBAT STANCE',
      isComplete: true,
    };
  }

  const progress = Math.max(0, Math.min(1, inspectTime / inspectDuration));

  // Keyframe poses (relative to hipPos = (0.20, -0.18, -0.38))
  // Pose 1: Center-frame lift, tilted to showcase Left Receiver skin, serial stamps & QR UID matrix
  const pose1Pos = { x: -0.16, y: 0.125, z: 0.11 };
  const pose1Rot = { x: 0.22, y: -0.58, z: 0.52 };

  // Pose 2: Roll over across axis to showcase Right Receiver flank, Chrome Bolt Carrier & Handguard Camo
  const pose2Pos = { x: -0.11, y: 0.11, z: 0.13 };
  const pose2Rot = { x: -0.16, y: 0.62, z: -0.64 };

  // Pose 3: Tilt crown upward to inspect Top Picatinny Rail, EOTech Holo Sight & Muzzle Finish
  const pose3Pos = { x: -0.14, y: 0.095, z: 0.09 };
  const pose3Rot = { x: 0.36, y: -0.24, z: 0.18 };

  const t1End = inspectDuration * 0.32; // ~1.47s
  const t2End = inspectDuration * 0.66; // ~3.04s
  const t3End = inspectDuration * 0.85; // ~3.91s

  let offset = { x: 0, y: 0, z: 0 };
  let rotation = { x: 0, y: 0, z: 0 };
  let phaseIndex: 1 | 2 | 3 | 4 = 1;
  let phaseLabel = 'LEFT RECEIVER · SERIAL UID & SKIN FINISH';

  if (inspectTime < t1End) {
    const u = smoothstep01(inspectTime / t1End);
    // Subtle breathing float once lifted
    const holdWave = Math.sin(inspectTime * 4.0) * 0.004 * u;
    offset = {
      x: lerp(0, pose1Pos.x, u),
      y: lerp(0, pose1Pos.y, u) + holdWave,
      z: lerp(0, pose1Pos.z, u),
    };
    rotation = {
      x: lerp(0, pose1Rot.x, u),
      y: lerp(0, pose1Rot.y, u),
      z: lerp(0, pose1Rot.z, u),
    };
    phaseIndex = 1;
    phaseLabel = 'LEFT RECEIVER · SERIAL UID & SKIN FINISH';
  } else if (inspectTime < t2End) {
    const u = smoothstep01((inspectTime - t1End) / (t2End - t1End));
    const holdWave = Math.sin(inspectTime * 4.0) * 0.004;
    offset = {
      x: lerp(pose1Pos.x, pose2Pos.x, u),
      y: lerp(pose1Pos.y, pose2Pos.y, u) + holdWave,
      z: lerp(pose1Pos.z, pose2Pos.z, u),
    };
    rotation = {
      x: lerp(pose1Rot.x, pose2Rot.x, u),
      y: lerp(pose1Rot.y, pose2Rot.y, u),
      z: lerp(pose1Rot.z, pose2Rot.z, u),
    };
    phaseIndex = 2;
    phaseLabel = 'RIGHT FLANK · BOLT CARRIER & CAMO PATTERN';
  } else if (inspectTime < t3End) {
    const u = smoothstep01((inspectTime - t2End) / (t3End - t2End));
    offset = {
      x: lerp(pose2Pos.x, pose3Pos.x, u),
      y: lerp(pose2Pos.y, pose3Pos.y, u),
      z: lerp(pose2Pos.z, pose3Pos.z, u),
    };
    rotation = {
      x: lerp(pose2Rot.x, pose3Rot.x, u),
      y: lerp(pose2Rot.y, pose3Rot.y, u),
      z: lerp(pose2Rot.z, pose3Rot.z, u),
    };
    phaseIndex = 3;
    phaseLabel = 'UPPER RAIL · HOLO OPTIC & BARREL ASSEMBLY';
  } else {
    const u = smoothstep01((inspectTime - t3End) / (inspectDuration - t3End));
    offset = {
      x: lerp(pose3Pos.x, 0, u),
      y: lerp(pose3Pos.y, 0, u),
      z: lerp(pose3Pos.z, 0, u),
    };
    rotation = {
      x: lerp(pose3Rot.x, 0, u),
      y: lerp(pose3Rot.y, 0, u),
      z: lerp(pose3Rot.z, 0, u),
    };
    phaseIndex = 4;
    phaseLabel = 'LOCKING CHASSIS · READY STANCE';
  }

  // Smooth bell envelope for skin inspection rim light (peaks at 2.2 intensity during phases 1-3)
  let lightEnv = 1.0;
  if (progress < 0.15) {
    lightEnv = smoothstep01(progress / 0.15);
  } else if (progress > 0.85) {
    lightEnv = smoothstep01((1.0 - progress) / 0.15);
  }
  const lightIntensity = Number((lightEnv * 2.2).toFixed(3));

  return {
    offset,
    rotation,
    lightIntensity,
    progress,
    phaseIndex,
    phaseLabel,
    isComplete: false,
  };
}
