import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDynamicCrosshairState,
  addShotRecoilBloom,
  decayRecoilBloom,
} from './crosshairSpread';

test('crouching stance tightens crosshair gap and increases accuracy compared to standing', () => {
  const standing = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 0,
    isGrounded: true,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  const crouching = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 0,
    isGrounded: true,
    isCrouching: true,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  assert.ok(crouching.targetGapPx < standing.targetGapPx, 'Crouched crosshair gap is smaller than standing');
  assert.ok(crouching.effectiveSpreadRad < standing.effectiveSpreadRad, 'Crouched ballistic spread is tighter');
  assert.ok(crouching.accuracyPct > standing.accuracyPct, 'Crouched accuracy rating is higher');
  assert.equal(crouching.stabilityLabel, 'CROUCHED · HIGH STABILITY');
});

test('player movement, sprinting, and airborne states progressively expand crosshair gap', () => {
  const idle = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 0,
    isGrounded: true,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  const walking = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 4.8,
    isGrounded: true,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  const sprinting = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 8.2,
    isGrounded: true,
    isCrouching: false,
    isSprinting: true,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  const airborne = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 4.8,
    verticalSpeed: 5.0,
    isGrounded: false,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  assert.ok(walking.targetGapPx > idle.targetGapPx, 'Walking expands crosshair beyond idle');
  assert.ok(sprinting.targetGapPx > walking.targetGapPx, 'Sprinting expands crosshair beyond walking');
  assert.ok(airborne.targetGapPx > walking.targetGapPx, 'Airborne expands crosshair beyond grounded walking');
  assert.equal(airborne.stabilityLabel, 'AIRBORNE · HIGH DISPERSION');
});

test('firing recoil bloom expands crosshair and decays smoothly over time', () => {
  let bloom = 0;
  bloom = addShotRecoilBloom(bloom, 0.038, false, false);
  assert.ok(bloom > 0.25, 'Single rifle shot adds measurable recoil bloom');

  const withRecoil = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 0,
    isGrounded: true,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: bloom,
  });

  const withoutRecoil = computeDynamicCrosshairState({
    baseSpread: 0.024,
    adsSpread: 0.003,
    horizontalSpeed: 0,
    isGrounded: true,
    isCrouching: false,
    isSprinting: false,
    isAiming: false,
    isReloading: false,
    recoilBloom: 0,
  });

  assert.ok(withRecoil.targetGapPx > withoutRecoil.targetGapPx + 4, 'Recoil bloom visibly expands crosshair gap');
  assert.ok(withRecoil.effectiveSpreadRad > withoutRecoil.effectiveSpreadRad, 'Recoil bloom increases physical bullet spread');

  const decayed = decayRecoilBloom(bloom, 0.5, false);
  assert.ok(decayed < bloom && decayed > 0, 'Recoil bloom decays exponentially over time');
});
