export type ExhaustionLevel = 'OPTIMAL' | 'ELEVATED' | 'FATIGUED' | 'EXHAUSTED';

export type StaminaActionType =
  | 'NONE'
  | 'SPRINTING'
  | 'JUMP_EXERTION'
  | 'MELEE_STRIKE'
  | 'RECOVERING';

export const SPRINT_STAMINA_DRAIN_PER_SEC = 22;
export const JUMP_STAMINA_COST = 18;
export const MELEE_STAMINA_COST = 24;
export const STAMINA_RECOVERY_IDLE_PER_SEC = 18;
export const STAMINA_RECOVERY_CROUCH_PER_SEC = 23;
export const STAMINA_RECOVERY_EXHAUSTED_PER_SEC = 12;
export const EXHAUSTION_THRESHOLD = 18;
export const FATIGUE_THRESHOLD = 40;
export const ELEVATED_THRESHOLD = 70;
export const ACTION_IMPULSE_HOLD_SEC = 0.65;
export const DEFAULT_MELEE_DURATION_SEC = 0.46;

export interface StaminaStepInput {
  currentStamina: number;
  maxStamina: number;
  delta: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isGrounded: boolean;
  isMeleeing: boolean;
  timeSinceLastImpulse: number;
  lastImpulseType: 'JUMP_EXERTION' | 'MELEE_STRIKE' | null;
}

export interface StaminaTelemetryState {
  stamina: number;
  staminaPct: number;
  exhaustionLevel: ExhaustionLevel;
  exhaustionLabel: string;
  heartRateBpm: number;
  staminaAction: StaminaActionType;
  staminaActionLabel: string;
  staminaDeltaRate: number;
  moveSpeedMultiplier: number;
  canSprint: boolean;
  canJump: boolean;
  canMelee: boolean;
}

export interface ImpulseAttemptResult {
  allowed: boolean;
  nextStamina: number;
  costApplied: number;
  actionType: 'JUMP_EXERTION' | 'MELEE_STRIKE';
  actionLabel: string;
}

export interface MeleeKinematicsResult {
  offset: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  stageLabel: string;
}

/**
 * classifies the operator's physical exhaustion tier from stamina percentage (0-100)
 */
export function classifyExhaustionLevel(
  staminaPct: number,
  activeAction: StaminaActionType = 'NONE'
): {
  exhaustionLevel: ExhaustionLevel;
  exhaustionLabel: string;
  heartRateBpm: number;
  moveSpeedMultiplier: number;
} {
  const clamped = Math.max(0, Math.min(100, staminaPct));
  const actionHrBoost =
    activeAction === 'MELEE_STRIKE'
      ? 14
      : activeAction === 'JUMP_EXERTION'
      ? 11
      : activeAction === 'SPRINTING'
      ? 9
      : 0;

  const baseHr = Math.round(68 + ((100 - clamped) / 100) * 108 + actionHrBoost);
  const heartRateBpm = Math.max(68, Math.min(188, baseHr));

  if (clamped < EXHAUSTION_THRESHOLD) {
    return {
      exhaustionLevel: 'EXHAUSTED',
      exhaustionLabel: 'EXHAUSTED // LACTIC OVERLOAD',
      heartRateBpm,
      moveSpeedMultiplier: 0.72,
    };
  }
  if (clamped < FATIGUE_THRESHOLD) {
    return {
      exhaustionLevel: 'FATIGUED',
      exhaustionLabel: 'FATIGUED // HEAVY BREATHING',
      heartRateBpm,
      moveSpeedMultiplier: 0.88,
    };
  }
  if (clamped < ELEVATED_THRESHOLD) {
    return {
      exhaustionLevel: 'ELEVATED',
      exhaustionLabel: 'EXERTION // ELEVATED HR',
      heartRateBpm,
      moveSpeedMultiplier: 1.0,
    };
  }
  return {
    exhaustionLevel: 'OPTIMAL',
    exhaustionLabel: 'OPTIMAL // PEAK OUTPUT',
    heartRateBpm,
    moveSpeedMultiplier: 1.0,
  };
}

/**
 * Attempts a discrete stamina-draining action (Jump or Melee Strike).
 */
export function attemptStaminaImpulse(
  currentStamina: number,
  impulseType: 'JUMP_EXERTION' | 'MELEE_STRIKE'
): ImpulseAttemptResult {
  const cost = impulseType === 'JUMP_EXERTION' ? JUMP_STAMINA_COST : MELEE_STAMINA_COST;
  const minRequired = impulseType === 'JUMP_EXERTION' ? 10 : 12;

  if (currentStamina < minRequired) {
    return {
      allowed: false,
      nextStamina: currentStamina,
      costApplied: 0,
      actionType: impulseType,
      actionLabel: 'EXHAUSTED // INSUFFICIENT STAMINA',
    };
  }

  const nextStamina = Number(Math.max(0, currentStamina - cost).toFixed(2));
  return {
    allowed: true,
    nextStamina,
    costApplied: cost,
    actionType: impulseType,
    actionLabel:
      impulseType === 'JUMP_EXERTION'
        ? `JUMP EXERTION -${JUMP_STAMINA_COST} STM`
        : `MELEE STRIKE -${MELEE_STAMINA_COST} STM`,
  };
}

/**
 * Steps continuous stamina drain/regeneration and computes full HUD telemetry.
 */
export function stepStaminaAndExhaustion(input: StaminaStepInput): StaminaTelemetryState {
  const maxStamina = Math.max(1, input.maxStamina);
  let nextStamina = Math.max(0, Math.min(maxStamina, input.currentStamina));
  let staminaAction: StaminaActionType = 'NONE';
  let staminaActionLabel = 'STANDBY // STEADY RESPIRATION';
  let staminaDeltaRate = 0;

  const isRecentImpulse =
    input.lastImpulseType !== null && input.timeSinceLastImpulse < ACTION_IMPULSE_HOLD_SEC;

  if (input.isMeleeing || (isRecentImpulse && input.lastImpulseType === 'MELEE_STRIKE')) {
    staminaAction = 'MELEE_STRIKE';
    staminaActionLabel = `MELEE STRIKE // -${MELEE_STAMINA_COST} STM`;
    staminaDeltaRate = -MELEE_STAMINA_COST;
  } else if (
    !input.isGrounded ||
    (isRecentImpulse && input.lastImpulseType === 'JUMP_EXERTION')
  ) {
    staminaAction = 'JUMP_EXERTION';
    staminaActionLabel = `JUMP EXERTION // -${JUMP_STAMINA_COST} STM`;
    staminaDeltaRate = -JUMP_STAMINA_COST;
    if (input.isSprinting && input.delta > 0) {
      nextStamina = Math.max(0, nextStamina - SPRINT_STAMINA_DRAIN_PER_SEC * 0.5 * input.delta);
    }
  } else if (input.isSprinting) {
    staminaAction = 'SPRINTING';
    staminaActionLabel = `SPRINTING // -${SPRINT_STAMINA_DRAIN_PER_SEC}/S`;
    staminaDeltaRate = -SPRINT_STAMINA_DRAIN_PER_SEC;
    nextStamina = Math.max(0, nextStamina - SPRINT_STAMINA_DRAIN_PER_SEC * input.delta);
  } else {
    // Recover stamina when not sprinting or mid-impulse
    if (nextStamina < maxStamina) {
      const recoveryRate =
        nextStamina < EXHAUSTION_THRESHOLD
          ? STAMINA_RECOVERY_EXHAUSTED_PER_SEC
          : input.isCrouching
          ? STAMINA_RECOVERY_CROUCH_PER_SEC
          : STAMINA_RECOVERY_IDLE_PER_SEC;
      nextStamina = Math.min(maxStamina, nextStamina + recoveryRate * input.delta);
      staminaAction = 'RECOVERING';
      staminaActionLabel = `RECOVERING // +${recoveryRate}/S`;
      staminaDeltaRate = recoveryRate;
    }
  }

  const staminaPct = Number(((nextStamina / maxStamina) * 100).toFixed(1));
  const exhaustion = classifyExhaustionLevel(staminaPct, staminaAction);

  return {
    stamina: Number(nextStamina.toFixed(2)),
    staminaPct,
    exhaustionLevel: exhaustion.exhaustionLevel,
    exhaustionLabel: exhaustion.exhaustionLabel,
    heartRateBpm: exhaustion.heartRateBpm,
    staminaAction,
    staminaActionLabel,
    staminaDeltaRate,
    moveSpeedMultiplier: exhaustion.moveSpeedMultiplier,
    canSprint: nextStamina > 10,
    canJump: nextStamina >= 10,
    canMelee: nextStamina >= 12,
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
 * Computes 3D weapon viewmodel buttstock/CQB strike animation kinematics.
 */
export function computeMeleeKinematics(meleeProgress: number): MeleeKinematicsResult {
  if (meleeProgress <= 0 || meleeProgress >= 1) {
    return {
      offset: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      stageLabel: 'READY',
    };
  }

  const p = Math.max(0, Math.min(1, meleeProgress));
  // 1. Wind-up (0.0 -> 0.25): pull back and cock weapon diagonally
  const windupPos = { x: 0.08, y: 0.05, z: 0.09 };
  const windupRot = { x: 0.28, y: -0.35, z: -0.42 };

  // 2. Strike Lunge Impact (0.25 -> 0.55): thrust forward & sweep across center
  const strikePos = { x: -0.14, y: -0.02, z: -0.22 };
  const strikeRot = { x: -0.38, y: 0.52, z: 0.48 };

  if (p < 0.25) {
    const u = smoothstep01(p / 0.25);
    return {
      offset: {
        x: lerp(0, windupPos.x, u),
        y: lerp(0, windupPos.y, u),
        z: lerp(0, windupPos.z, u),
      },
      rotation: {
        x: lerp(0, windupRot.x, u),
        y: lerp(0, windupRot.y, u),
        z: lerp(0, windupRot.z, u),
      },
      stageLabel: 'MELEE WINDUP',
    };
  } else if (p < 0.55) {
    const u = smoothstep01((p - 0.25) / 0.3);
    return {
      offset: {
        x: lerp(windupPos.x, strikePos.x, u),
        y: lerp(windupPos.y, strikePos.y, u),
        z: lerp(windupPos.z, strikePos.z, u),
      },
      rotation: {
        x: lerp(windupRot.x, strikeRot.x, u),
        y: lerp(windupRot.y, strikeRot.y, u),
        z: lerp(windupRot.z, strikeRot.z, u),
      },
      stageLabel: 'CQB BUTTSTOCK IMPACT',
    };
  } else {
    const u = smoothstep01((p - 0.55) / 0.45);
    return {
      offset: {
        x: lerp(strikePos.x, 0, u),
        y: lerp(strikePos.y, 0, u),
        z: lerp(strikePos.z, 0, u),
      },
      rotation: {
        x: lerp(strikeRot.x, 0, u),
        y: lerp(strikeRot.y, 0, u),
        z: lerp(strikeRot.z, 0, u),
      },
      stageLabel: 'RECOVERING GUARD',
    };
  }
}
