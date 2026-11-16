import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JUMP_STAMINA_COST,
  MELEE_STAMINA_COST,
  classifyExhaustionLevel,
  attemptStaminaImpulse,
  stepStaminaAndExhaustion,
  computeMeleeKinematics,
} from './staminaExhaustion';

test('attemptStaminaImpulse: deducts stamina for jumping and melee actions and blocks when exhausted', () => {
  const jumpRes = attemptStaminaImpulse(100, 'JUMP_EXERTION');
  assert.equal(jumpRes.allowed, true);
  assert.equal(jumpRes.nextStamina, 100 - JUMP_STAMINA_COST);
  assert.equal(jumpRes.actionType, 'JUMP_EXERTION');

  const meleeRes = attemptStaminaImpulse(jumpRes.nextStamina, 'MELEE_STRIKE');
  assert.equal(meleeRes.allowed, true);
  assert.equal(meleeRes.nextStamina, 100 - JUMP_STAMINA_COST - MELEE_STAMINA_COST);
  assert.equal(meleeRes.actionType, 'MELEE_STRIKE');

  const blockedMelee = attemptStaminaImpulse(8, 'MELEE_STRIKE');
  assert.equal(blockedMelee.allowed, false);
  assert.equal(blockedMelee.nextStamina, 8);
});

test('stepStaminaAndExhaustion: sprinting drains stamina continuously and updates exhaustion tier & heart rate', () => {
  const sprintingState = stepStaminaAndExhaustion({
    currentStamina: 60,
    maxStamina: 100,
    delta: 1.0,
    isSprinting: true,
    isCrouching: false,
    isGrounded: true,
    isMeleeing: false,
    timeSinceLastImpulse: 5.0,
    lastImpulseType: null,
  });

  assert.equal(sprintingState.stamina, 38);
  assert.equal(sprintingState.staminaAction, 'SPRINTING');
  assert.equal(sprintingState.exhaustionLevel, 'FATIGUED');
  assert.ok(sprintingState.heartRateBpm > 120);
});

test('classifyExhaustionLevel: transitions accurately across OPTIMAL, ELEVATED, FATIGUED, and EXHAUSTED', () => {
  assert.equal(classifyExhaustionLevel(92).exhaustionLevel, 'OPTIMAL');
  assert.equal(classifyExhaustionLevel(55).exhaustionLevel, 'ELEVATED');
  assert.equal(classifyExhaustionLevel(28).exhaustionLevel, 'FATIGUED');
  const exhausted = classifyExhaustionLevel(10);
  assert.equal(exhausted.exhaustionLevel, 'EXHAUSTED');
  assert.ok(exhausted.moveSpeedMultiplier < 0.8);
});

test('computeMeleeKinematics: returns zero at boundaries and forward lunge during strike phase', () => {
  assert.equal(computeMeleeKinematics(0).offset.z, 0);
  assert.equal(computeMeleeKinematics(1).offset.z, 0);

  const impactPose = computeMeleeKinematics(0.5);
  assert.equal(impactPose.stageLabel, 'CQB BUTTSTOCK IMPACT');
  assert.ok(impactPose.offset.z < -0.1, 'Weapon should lunge forward during CQB melee impact');
});
