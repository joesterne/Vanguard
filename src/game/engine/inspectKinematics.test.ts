import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTriggerInspect,
  computeInspectKinematics,
  DEFAULT_INSPECT_DURATION,
} from './inspectKinematics';

test('canTriggerInspect allows inspect when idle or crouching and blocks when reloading, aiming, or sprinting', () => {
  assert.equal(
    canTriggerInspect({ isReloading: false, isAiming: false, isSprinting: false }),
    true
  );
  assert.equal(
    canTriggerInspect({ isReloading: true, isAiming: false, isSprinting: false }),
    false
  );
  assert.equal(
    canTriggerInspect({ isReloading: false, isAiming: true, isSprinting: false }),
    false
  );
  assert.equal(
    canTriggerInspect({ isReloading: false, isAiming: false, isSprinting: true }),
    false
  );
});

test('computeInspectKinematics starts at origin at t=0 and completes cleanly at t>=duration', () => {
  const start = computeInspectKinematics(0, DEFAULT_INSPECT_DURATION);
  assert.equal(start.offset.x, 0);
  assert.equal(start.offset.y, 0);
  assert.equal(start.offset.z, 0);
  assert.equal(start.lightIntensity, 0);
  assert.equal(start.isComplete, false);
  assert.equal(start.phaseIndex, 1);

  const done = computeInspectKinematics(DEFAULT_INSPECT_DURATION, DEFAULT_INSPECT_DURATION);
  assert.equal(done.offset.x, 0);
  assert.equal(done.offset.y, 0);
  assert.equal(done.offset.z, 0);
  assert.equal(done.lightIntensity, 0);
  assert.equal(done.isComplete, true);
  assert.equal(done.progress, 1);
});

test('computeInspectKinematics progresses through phases 1, 2, 3, and 4 with active skin rim light', () => {
  const p1 = computeInspectKinematics(1.0, DEFAULT_INSPECT_DURATION);
  assert.equal(p1.phaseIndex, 1);
  assert.ok(p1.offset.x < -0.05, 'Weapon shifts left toward screen center in Phase 1');
  assert.ok(p1.offset.y > 0.05, 'Weapon lifts up toward camera eye line in Phase 1');
  assert.ok(p1.rotation.y < -0.2, 'Weapon rolls to showcase left receiver skin');
  assert.ok(p1.lightIntensity > 1.5, 'Inspection spotlight illuminates skin finish');

  const p2 = computeInspectKinematics(2.5, DEFAULT_INSPECT_DURATION);
  assert.equal(p2.phaseIndex, 2);
  assert.ok(p2.rotation.y > 0.2, 'Weapon rolls opposite way to showcase right flank skin & bolt');
  assert.equal(p2.lightIntensity, 2.2);

  const p3 = computeInspectKinematics(3.75, DEFAULT_INSPECT_DURATION);
  assert.equal(p3.phaseIndex, 3);
  assert.ok(p3.rotation.x > 0.15, 'Weapon tilts to showcase top rail & holo optic');

  const p4 = computeInspectKinematics(4.2, DEFAULT_INSPECT_DURATION);
  assert.equal(p4.phaseIndex, 4);
  assert.equal(p4.isComplete, false);
});
