import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMagazineTelemetry } from './magazineTelemetry';

test('initial full MK18 loadout reports 100% active mag and 6 full reserve magazines', () => {
  const state = computeMagazineTelemetry(30, 30, 180, 180);
  assert.equal(state.activeMagFillRatio, 1);
  assert.equal(state.activeMagStatus, 'full');
  assert.equal(state.fullReserveMags, 6);
  assert.equal(state.partialReserveRounds, 0);
  assert.equal(state.totalReserveMags, 6);
  assert.equal(state.reserveMagSlots.length, 6);
  assert.ok(state.reserveMagSlots.every((s) => s.status === 'full' && s.rounds === 30));
});

test('firing rounds updates active mag fill ratio and status tier in real time', () => {
  const afterBurst = computeMagazineTelemetry(20, 30, 180, 180);
  assert.equal(afterBurst.activeMagFillRatio, 0.6667);
  assert.equal(afterBurst.activeMagStatus, 'nominal');
  assert.equal(afterBurst.fullReserveMags, 6);

  const lowMag = computeMagazineTelemetry(9, 30, 180, 180);
  assert.equal(lowMag.activeMagStatus, 'low');

  const criticalMag = computeMagazineTelemetry(5, 30, 180, 180);
  assert.equal(criticalMag.activeMagStatus, 'critical');

  const emptyMag = computeMagazineTelemetry(0, 30, 180, 180);
  assert.equal(emptyMag.activeMagStatus, 'empty');
  assert.equal(emptyMag.activeMagFillRatio, 0);
});

test('reloading a partially spent or empty magazine updates reserve magazine slots accurately', () => {
  // Reloaded 10 rounds -> currentMag = 30, reserveAmmo = 170 (5 full mags of 30 + 1 partial mag of 20)
  const partialReload = computeMagazineTelemetry(30, 30, 170, 180);
  assert.equal(partialReload.activeMagFillRatio, 1);
  assert.equal(partialReload.fullReserveMags, 5);
  assert.equal(partialReload.partialReserveRounds, 20);
  assert.equal(partialReload.totalReserveMags, 6);
  assert.equal(partialReload.reserveMagSlots[4].status, 'full');
  assert.equal(partialReload.reserveMagSlots[5].status, 'partial');
  assert.equal(partialReload.reserveMagSlots[5].rounds, 20);
  assert.equal(partialReload.reserveMagSlots[5].fillRatio, 0.6667);

  // Reloaded a full 30-round empty mag -> currentMag = 30, reserveAmmo = 150 (5 full mags + 1 depleted slot)
  const fullReload = computeMagazineTelemetry(30, 30, 150, 180);
  assert.equal(fullReload.fullReserveMags, 5);
  assert.equal(fullReload.partialReserveRounds, 0);
  assert.equal(fullReload.totalReserveMags, 5);
  assert.equal(fullReload.reserveMagSlots[4].status, 'full');
  assert.equal(fullReload.reserveMagSlots[5].status, 'depleted');
  assert.equal(fullReload.reserveMagSlots[5].rounds, 0);
});
