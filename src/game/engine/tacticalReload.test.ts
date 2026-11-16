import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TACTICAL_RELOAD_SPEED_MULTIPLIER,
  initiateReloadState,
  computeReloadKinematics,
} from './tacticalReload';

test('initiateReloadState: triggers faster Tactical Reload when a round is still in the chamber (0 < currentMag < magazineSize)', () => {
  const baseReloadTime = 1.6;
  const state = initiateReloadState(18, 30, 90, baseReloadTime);

  assert.equal(state.canReload, true);
  assert.equal(state.isTacticalReload, true);
  assert.equal(state.reloadType, 'tactical');
  assert.equal(state.effectiveReloadTime, Number((baseReloadTime * TACTICAL_RELOAD_SPEED_MULTIPLIER).toFixed(3)));
  assert.ok(state.effectiveReloadTime < baseReloadTime, 'Tactical reload must be faster than full empty reload');
  assert.equal(state.speedBonusPct, 32);
  assert.equal(state.hudLabel, 'FAST RELOAD · CHAMBERED');
});

test('initiateReloadState: triggers Full Empty-Mag Reload when magazine is completely empty (currentMag === 0)', () => {
  const baseReloadTime = 1.6;
  const state = initiateReloadState(0, 30, 90, baseReloadTime);

  assert.equal(state.canReload, true);
  assert.equal(state.isTacticalReload, false);
  assert.equal(state.reloadType, 'empty');
  assert.equal(state.effectiveReloadTime, baseReloadTime);
  assert.equal(state.speedBonusPct, 0);
  assert.equal(state.hudLabel, 'FULL RELOAD · BOLT LOCK');
});

test('initiateReloadState: blocks reload when magazine is already full or reserve ammo is depleted', () => {
  const fullMagState = initiateReloadState(30, 30, 90, 1.6);
  assert.equal(fullMagState.canReload, false);

  const noReserveState = initiateReloadState(12, 30, 0, 1.6);
  assert.equal(noReserveState.canReload, false);
});

test('computeReloadKinematics: returns zero offsets at boundaries and distinct profiles for tactical vs empty reload', () => {
  const startKin = computeReloadKinematics(0, true);
  assert.equal(startKin.offset.x, 0);
  assert.equal(startKin.offset.y, 0);
  assert.equal(startKin.offset.z, 0);

  const endKin = computeReloadKinematics(1, false);
  assert.equal(endKin.offset.x, 0);
  assert.equal(endKin.offset.y, 0);
  assert.equal(endKin.offset.z, 0);

  const midTactical = computeReloadKinematics(0.45, true);
  const midEmpty = computeReloadKinematics(0.45, false);
  assert.notEqual(midTactical.offset.y, 0);
  assert.notEqual(midEmpty.offset.y, 0);
  assert.notEqual(midTactical.rotation.z, midEmpty.rotation.z);

  const boltPhaseEmpty = computeReloadKinematics(0.78, false);
  assert.equal(boltPhaseEmpty.stageLabel, 'CHAMBERING FIRST ROUND');
  assert.ok(boltPhaseEmpty.rotation.z > 0.05, 'Empty reload should tilt weapon during charging handle rack');
});
