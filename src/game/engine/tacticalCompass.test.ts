import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAzimuthDeg,
  formatAzimuthReadout,
  getCardinalDirection,
  computeCompassTapeTicks,
  computeCompassWaypoints,
} from './tacticalCompass';

test('normalizeAzimuthDeg & getCardinalDirection: maps Three.js camera yaw to 0-360° compass bearings', () => {
  // Looking straight North (-Z): yaw = 0 -> 0° N
  assert.equal(normalizeAzimuthDeg(0), 0);
  assert.equal(formatAzimuthReadout(0), '000°');
  assert.equal(getCardinalDirection(0).code, 'N');

  // Looking East (+X): yaw = -PI/2 -> 90° E
  const eastDeg = normalizeAzimuthDeg(-Math.PI / 2);
  assert.equal(eastDeg, 90);
  assert.equal(formatAzimuthReadout(eastDeg), '090°');
  assert.equal(getCardinalDirection(eastDeg).code, 'E');

  // Looking South (+Z): yaw = PI -> 180° S
  const southDeg = normalizeAzimuthDeg(Math.PI);
  assert.equal(southDeg, 180);
  assert.equal(getCardinalDirection(southDeg).code, 'S');

  // Looking West (-X): yaw = +PI/2 -> 270° W
  const westDeg = normalizeAzimuthDeg(Math.PI / 2);
  assert.equal(westDeg, 270);
  assert.equal(getCardinalDirection(westDeg).code, 'W');
});

test('computeCompassTapeTicks: generates sorted ticks within FOV window and centers active heading at 50%', () => {
  const ticksAtNorth = computeCompassTapeTicks(0, 120);
  const northTick = ticksAtNorth.find((t) => t.degree === 0);
  assert.ok(northTick, 'North tick (0°) must be present when looking North');
  assert.equal(northTick.percentX, 50);
  assert.equal(northTick.kind, 'cardinal');
  assert.equal(northTick.label, 'N');

  // At 0° heading with 120° span (-60° to +60°), 315° (NW, -45°) and 45° (NE, +45°) should both be visible
  const nwTick = ticksAtNorth.find((t) => t.degree === 315);
  const neTick = ticksAtNorth.find((t) => t.degree === 45);
  assert.ok(nwTick && nwTick.percentX < 50, 'NW (315°) should appear to the left of center');
  assert.ok(neTick && neTick.percentX > 50, 'NE (45°) should appear to the right of center');
});

test('computeCompassWaypoints: computes accurate objective bearings and clamps off-FOV waypoints to tape edges', () => {
  const playerPos = { x: 0, z: 18 };
  const targets = [
    { id: 'obj_bunker', label: 'BUNKER', type: 'objective' as const, x: 0, z: -32 },
    { id: 'obj_east', label: 'EAST DEPOT', type: 'objective' as const, x: 25, z: 18 },
  ];

  // Looking North (0°): Bunker at (0, -32) is dead ahead (0°, percentX = 50%), East Depot is at +90° (clamped to right edge)
  const markers = computeCompassWaypoints(0, playerPos, targets, 120);
  const bunkerMarker = markers.find((m) => m.id === 'obj_bunker')!;
  const eastMarker = markers.find((m) => m.id === 'obj_east')!;

  assert.equal(bunkerMarker.bearingDeg, 0);
  assert.equal(bunkerMarker.percentX, 50);
  assert.equal(bunkerMarker.distanceMeters, 50);
  assert.equal(bunkerMarker.isClampedEdge, null);

  assert.equal(eastMarker.bearingDeg, 90);
  assert.equal(eastMarker.isClampedEdge, 'right');
  assert.equal(eastMarker.percentX, 96);
});
