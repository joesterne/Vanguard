import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAMAGE_INDICATOR_DURATION_MS,
  createDamageIndicatorEvent,
  computeDamageIndicatorArc,
  stepActiveDamageIndicators,
  buildSvgArcPath,
} from './damageIndicator';

test('computeDamageIndicatorArc: points toward front (0°), right (+90°), left (-90°), and rear (180°) based on shooter position and cameraYaw', () => {
  const playerPos = { x: 0, z: 18 };
  const now = 1000;

  // 1. Shooter directly North (0, -5) while player looks North (cameraYaw = 0) -> 0° FRONT
  const frontEvent = createDamageIndicatorEvent({ x: 0, z: -5 }, 25, now, 'NORTH SENTRY');
  const frontArc = computeDamageIndicatorArc(frontEvent, playerPos, 0, now)!;
  assert.ok(frontArc);
  assert.equal(frontArc.relativeAngleDeg, 0);
  assert.equal(frontArc.directionSector, 'FRONT');
  assert.equal(frontArc.opacity, 1);

  // 2. If player rotates camera 90° left (looking West, cameraYaw = +PI/2), that same North shooter is now on the player's RIGHT (+90°)
  const rotatedArc = computeDamageIndicatorArc(frontEvent, playerPos, Math.PI / 2, now)!;
  assert.equal(rotatedArc.relativeAngleDeg, 90);
  assert.equal(rotatedArc.directionSector, 'RIGHT');

  // 3. Shooter on the left flank (-20, 18) while looking North (cameraYaw = 0) -> -90° LEFT
  const leftEvent = createDamageIndicatorEvent({ x: -20, z: 18 }, 30, now, 'WEST FLANK');
  const leftArc = computeDamageIndicatorArc(leftEvent, playerPos, 0, now)!;
  assert.equal(leftArc.relativeAngleDeg, -90);
  assert.equal(leftArc.directionSector, 'LEFT');
});

test('computeDamageIndicatorArc & stepActiveDamageIndicators: fades opacity smoothly over time and expires after durationMs', () => {
  const playerPos = { x: 0, z: 18 };
  const startMs = 5000;
  const ev = createDamageIndicatorEvent({ x: 10, z: 0 }, 20, startMs, 'RIFLEMAN', DAMAGE_INDICATOR_DURATION_MS);

  const initial = computeDamageIndicatorArc(ev, playerPos, 0, startMs)!;
  const mid = computeDamageIndicatorArc(ev, playerPos, 0, startMs + DAMAGE_INDICATOR_DURATION_MS * 0.5)!;
  const late = computeDamageIndicatorArc(ev, playerPos, 0, startMs + DAMAGE_INDICATOR_DURATION_MS * 0.85)!;
  const expired = computeDamageIndicatorArc(ev, playerPos, 0, startMs + DAMAGE_INDICATOR_DURATION_MS + 10);

  assert.equal(initial.opacity, 1);
  assert.ok(mid.opacity < initial.opacity && mid.opacity > 0.2, 'Mid-life arc should have partially faded');
  assert.ok(late.opacity < mid.opacity && late.opacity > 0, 'Late-life arc should be nearly faded');
  assert.equal(expired, null, 'Expired event should return null');

  const steppedAfterExpiry = stepActiveDamageIndicators(
    [ev],
    playerPos,
    0,
    startMs + DAMAGE_INDICATOR_DURATION_MS + 50
  );
  assert.equal(steppedAfterExpiry.arcs.length, 0);
});

test('buildSvgArcPath: generates valid SVG arc path string', () => {
  const path = buildSvgArcPath(96, 48);
  assert.ok(path.startsWith('M -'));
  assert.ok(path.includes('A 96 96 0 0 1'));
});
