export interface CrosshairInputState {
  baseSpread: number;
  adsSpread: number;
  horizontalSpeed: number;
  verticalSpeed?: number;
  isGrounded: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  isAiming: boolean;
  isReloading: boolean;
  recoilBloom: number; // Normalized [0..1] accumulated firing recoil bloom
}

export interface DynamicCrosshairResult {
  /** Effective physical projectile spread cone in radians */
  effectiveSpreadRad: number;
  /** Target pixel distance from center to each cardinal crosshair blade */
  targetGapPx: number;
  /** Normalized recoil bloom [0..1] */
  recoilBloom: number;
  /** Weapon accuracy / stability percentage [15..100] */
  accuracyPct: number;
  /** Crosshair opacity [0..1] (fades out when aiming down sights or reloading) */
  opacity: number;
  /** Concise tactical stability status label */
  stabilityLabel: string;
}

/**
 * Decays normalized recoil bloom [0..1] over frame delta time.
 * Crouching accelerates recoil recovery.
 */
export function decayRecoilBloom(
  currentBloom: number,
  delta: number,
  isCrouching: boolean = false
): number {
  if (currentBloom <= 0 || delta <= 0) return Math.max(0, currentBloom);
  const recoveryRate = isCrouching ? 3.2 : 2.3;
  const next = currentBloom * Math.exp(-recoveryRate * delta);
  return next < 0.002 ? 0 : next;
}

/**
 * Calculates a single shot's recoil bloom impulse based on weapon vertical recoil and stance.
 */
export function addShotRecoilBloom(
  currentBloom: number,
  recoilVertical: number,
  isCrouching: boolean = false,
  isAiming: boolean = false
): number {
  const stanceMult = isAiming ? 0.55 : isCrouching ? 0.72 : 1.0;
  const impulse = (recoilVertical * 4.2 + 0.14) * stanceMult;
  return Math.min(1.0, Math.max(0, currentBloom + impulse));
}

/**
 * Pure calculation of dynamic weapon spread (radians) and HUD crosshair expansion (pixels)
 * driven by player movement velocity, firing recoil bloom, and tactical stance.
 */
export function computeDynamicCrosshairState(
  input: CrosshairInputState
): DynamicCrosshairResult {
  const clampedBloom = Math.max(0, Math.min(1, input.recoilBloom));
  const speed = Math.max(0, input.horizontalSpeed);

  // 1. Base stance multiplier & baseline pixel gap
  let stanceMult = 1.0;
  let baseGapPx = 11;

  if (input.isAiming) {
    stanceMult = 0.22;
    baseGapPx = 3;
  } else if (input.isCrouching) {
    stanceMult = 0.62;
    baseGapPx = 6.5;
  } else if (input.isSprinting) {
    stanceMult = 1.65;
    baseGapPx = 22;
  }

  // 2. Movement velocity contribution (smoothly scales from 0 m/s up to sprint speed 8.2 m/s)
  const moveFactor = Math.min(1.5, speed / 4.8);
  const moveSpreadRad = moveFactor * 0.018 * (input.isAiming ? 0.45 : 1.0);
  const moveGapPx = moveFactor * (input.isSprinting ? 14 : 9.5) * (input.isAiming ? 0.35 : 1.0);

  // 3. Airborne / jumping instability contribution
  const airborneVert = Math.abs(input.verticalSpeed ?? 0);
  const airborneSpreadRad = !input.isGrounded ? 0.032 + Math.min(0.018, airborneVert * 0.002) : 0;
  const airborneGapPx = !input.isGrounded ? 15 + Math.min(8, airborneVert * 0.8) : 0;

  // 4. Recoil bloom contribution from recent shots
  const recoilSpreadRad = clampedBloom * 0.038 * (input.isCrouching ? 0.78 : 1.0);
  const recoilGapPx = clampedBloom * 22 * (input.isCrouching ? 0.82 : 1.0);

  // 5. Combined physical projectile spread (radians)
  const baseRad = input.isAiming ? input.adsSpread : input.baseSpread * stanceMult;
  const effectiveSpreadRad = Number(
    (baseRad + moveSpreadRad + airborneSpreadRad + recoilSpreadRad).toFixed(5)
  );

  // 6. Combined HUD crosshair blade gap (pixels), clamped to [3, 52]
  const rawGap = baseGapPx + moveGapPx + airborneGapPx + recoilGapPx;
  const targetGapPx = Number(Math.max(3, Math.min(52, rawGap)).toFixed(2));

  // 7. Accuracy / stability rating percentage [15..100]
  const normalizedInstability = Math.min(1, (targetGapPx - 3) / 45);
  const accuracyPct = Math.round(Math.max(15, Math.min(100, 100 - normalizedInstability * 82)));

  // 8. Crosshair opacity (fades out in ADS so 3D holo sight reticle is clear, dims while reloading)
  const opacity = input.isAiming ? 0 : input.isReloading ? 0.35 : 1.0;

  // 9. Readable tactical stability status label
  let stabilityLabel = 'STANDING · STEADY';
  if (input.isAiming) {
    stabilityLabel = 'ADS LOCKED · PRECISION';
  } else if (!input.isGrounded) {
    stabilityLabel = 'AIRBORNE · HIGH DISPERSION';
  } else if (clampedBloom > 0.35) {
    stabilityLabel = 'SUSTAINED FIRE · RECOIL BLOOM';
  } else if (input.isSprinting) {
    stabilityLabel = 'SPRINTING · WIDE SPREAD';
  } else if (speed > 0.6 && input.isCrouching) {
    stabilityLabel = 'CROUCH WALK · STABILIZED';
  } else if (speed > 0.6) {
    stabilityLabel = 'MOVING · MODERATE SPREAD';
  } else if (input.isCrouching) {
    stabilityLabel = 'CROUCHED · HIGH STABILITY';
  }

  return {
    effectiveSpreadRad,
    targetGapPx,
    recoilBloom: Number(clampedBloom.toFixed(4)),
    accuracyPct,
    opacity,
    stabilityLabel,
  };
}
