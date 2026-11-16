export const TACTICAL_RELOAD_SPEED_MULTIPLIER = 0.68;

export interface ReloadInitiationResult {
  canReload: boolean;
  isTacticalReload: boolean;
  reloadType: 'tactical' | 'empty' | 'none';
  effectiveReloadTime: number;
  baseReloadTime: number;
  speedBonusPct: number;
  hudLabel: string;
}

export interface ReloadKinematicsResult {
  offset: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  stageLabel: string;
}

/**
 * Determines whether a reload can be initiated and whether it qualifies as a
 * faster 'Tactical Reload' (round still chambered, currentMag > 0) or a full
 * 'Empty-Mag Reload' (bolt locked back, currentMag === 0).
 */
export function initiateReloadState(
  currentMag: number,
  magazineSize: number,
  reserveAmmo: number,
  baseReloadTime: number
): ReloadInitiationResult {
  if (currentMag >= magazineSize || reserveAmmo <= 0 || baseReloadTime <= 0) {
    return {
      canReload: false,
      isTacticalReload: false,
      reloadType: 'none',
      effectiveReloadTime: baseReloadTime,
      baseReloadTime,
      speedBonusPct: 0,
      hudLabel: '',
    };
  }

  const isTacticalReload = currentMag > 0;
  const effectiveReloadTime = isTacticalReload
    ? Number((baseReloadTime * TACTICAL_RELOAD_SPEED_MULTIPLIER).toFixed(3))
    : Number(baseReloadTime.toFixed(3));
  const speedBonusPct = isTacticalReload
    ? Math.round((1 - TACTICAL_RELOAD_SPEED_MULTIPLIER) * 100)
    : 0;

  return {
    canReload: true,
    isTacticalReload,
    reloadType: isTacticalReload ? 'tactical' : 'empty',
    effectiveReloadTime,
    baseReloadTime,
    speedBonusPct,
    hudLabel: isTacticalReload
      ? 'FAST RELOAD · CHAMBERED'
      : 'FULL RELOAD · BOLT LOCK',
  };
}

function smoothstep01(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Computes 3D weapon rig position offsets and Euler rotations for both
 * Tactical Reloads (fast closed-bolt mag swap) and Empty-Mag Reloads (full mag swap + bolt rack).
 */
export function computeReloadKinematics(
  reloadProgress: number,
  isTacticalReload: boolean
): ReloadKinematicsResult {
  if (reloadProgress <= 0 || reloadProgress >= 1) {
    return {
      offset: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      stageLabel: 'READY',
    };
  }

  const p = Math.max(0, Math.min(1, reloadProgress));

  if (isTacticalReload) {
    // Tactical Reload (Round in chamber: skip charging handle / bolt release)
    const dropPosePos = { x: -0.045, y: -0.065, z: -0.015 };
    const dropPoseRot = { x: -0.22, y: -0.24, z: -0.36 };

    const seatPosePos = { x: -0.025, y: -0.01, z: -0.01 };
    const seatPoseRot = { x: -0.08, y: -0.12, z: -0.16 };

    if (p < 0.45) {
      const u = smoothstep01(p / 0.45);
      return {
        offset: {
          x: lerp(0, dropPosePos.x, u),
          y: lerp(0, dropPosePos.y, u),
          z: lerp(0, dropPosePos.z, u),
        },
        rotation: {
          x: lerp(0, dropPoseRot.x, u),
          y: lerp(0, dropPoseRot.y, u),
          z: lerp(0, dropPoseRot.z, u),
        },
        stageLabel: 'TACTICAL MAG SWAP',
      };
    } else if (p < 0.78) {
      const u = smoothstep01((p - 0.45) / 0.33);
      return {
        offset: {
          x: lerp(dropPosePos.x, seatPosePos.x, u),
          y: lerp(dropPosePos.y, seatPosePos.y, u),
          z: lerp(dropPosePos.z, seatPosePos.z, u),
        },
        rotation: {
          x: lerp(dropPoseRot.x, seatPoseRot.x, u),
          y: lerp(dropPoseRot.y, seatPoseRot.y, u),
          z: lerp(dropPoseRot.z, seatPoseRot.z, u),
        },
        stageLabel: 'LOCKING FRESH MAG',
      };
    } else {
      const u = smoothstep01((p - 0.78) / 0.22);
      return {
        offset: {
          x: lerp(seatPosePos.x, 0, u),
          y: lerp(seatPosePos.y, 0, u),
          z: lerp(seatPosePos.z, 0, u),
        },
        rotation: {
          x: lerp(seatPoseRot.x, 0, u),
          y: lerp(seatPoseRot.y, 0, u),
          z: lerp(seatPoseRot.z, 0, u),
        },
        stageLabel: 'CHAMBER READY',
      };
    }
  } else {
    // Full Empty-Mag Reload (includes bolt catch / charging handle rack phase)
    const dropPosePos = { x: -0.06, y: -0.105, z: -0.025 };
    const dropPoseRot = { x: -0.32, y: -0.28, z: -0.44 };

    const seatPosePos = { x: -0.035, y: -0.035, z: -0.015 };
    const seatPoseRot = { x: -0.14, y: -0.16, z: -0.22 };

    const rackPosePos = { x: -0.02, y: -0.03, z: 0.042 };
    const rackPoseRot = { x: 0.14, y: 0.18, z: 0.38 };

    if (p < 0.36) {
      const u = smoothstep01(p / 0.36);
      return {
        offset: {
          x: lerp(0, dropPosePos.x, u),
          y: lerp(0, dropPosePos.y, u),
          z: lerp(0, dropPosePos.z, u),
        },
        rotation: {
          x: lerp(0, dropPoseRot.x, u),
          y: lerp(0, dropPoseRot.y, u),
          z: lerp(0, dropPoseRot.z, u),
        },
        stageLabel: 'EJECTING EMPTY MAG',
      };
    } else if (p < 0.66) {
      const u = smoothstep01((p - 0.36) / 0.3);
      return {
        offset: {
          x: lerp(dropPosePos.x, seatPosePos.x, u),
          y: lerp(dropPosePos.y, seatPosePos.y, u),
          z: lerp(dropPosePos.z, seatPosePos.z, u),
        },
        rotation: {
          x: lerp(dropPoseRot.x, seatPoseRot.x, u),
          y: lerp(dropPoseRot.y, seatPoseRot.y, u),
          z: lerp(dropPoseRot.z, seatPoseRot.z, u),
        },
        stageLabel: 'INSERTING MAGAZINE',
      };
    } else if (p < 0.88) {
      const u = smoothstep01((p - 0.66) / 0.22);
      return {
        offset: {
          x: lerp(seatPosePos.x, rackPosePos.x, u),
          y: lerp(seatPosePos.y, rackPosePos.y, u),
          z: lerp(seatPosePos.z, rackPosePos.z, u),
        },
        rotation: {
          x: lerp(seatPoseRot.x, rackPoseRot.x, u),
          y: lerp(seatPoseRot.y, rackPoseRot.y, u),
          z: lerp(seatPoseRot.z, rackPoseRot.z, u),
        },
        stageLabel: 'CHAMBERING FIRST ROUND',
      };
    } else {
      const u = smoothstep01((p - 0.88) / 0.12);
      return {
        offset: {
          x: lerp(rackPosePos.x, 0, u),
          y: lerp(rackPosePos.y, 0, u),
          z: lerp(rackPosePos.z, 0, u),
        },
        rotation: {
          x: lerp(rackPoseRot.x, 0, u),
          y: lerp(rackPoseRot.y, 0, u),
          z: lerp(rackPoseRot.z, 0, u),
        },
        stageLabel: 'BOLT LOCKED',
      };
    }
  }
}
