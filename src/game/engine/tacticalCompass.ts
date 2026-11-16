export interface CompassTick {
  degree: number;
  offsetDeg: number;
  percentX: number;
  kind: 'cardinal' | 'intercardinal' | 'major' | 'minor';
  label?: string;
}

export interface CompassTargetInput {
  id: string;
  label: string;
  type: 'objective' | 'hostile' | 'extraction';
  x: number;
  z: number;
}

export interface CompassWaypointMarker {
  id: string;
  label: string;
  type: 'objective' | 'hostile' | 'extraction';
  bearingDeg: number;
  relativeDeg: number;
  distanceMeters: number;
  percentX: number;
  isClampedEdge: 'left' | 'right' | null;
}

export interface CardinalInfo {
  code: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  name: string;
  sectorLabel: string;
}

const CARDINAL_MAP: Record<number, string> = {
  0: 'N',
  45: 'NE',
  90: 'E',
  135: 'SE',
  180: 'S',
  225: 'SW',
  270: 'W',
  315: 'NW',
};

/**
 * Converts Three.js camera yaw (radians, where 0 = -Z North, -PI/2 = +X East)
 * into a normalized compass heading in [0, 360) degrees.
 */
export function normalizeAzimuthDeg(cameraYawRad: number): number {
  const rawDeg = (-cameraYawRad * 180) / Math.PI;
  const wrapped = ((rawDeg % 360) + 360) % 360;
  return wrapped === 360 ? 0 : Number(wrapped.toFixed(1));
}

/**
 * Formats a compass heading as a 3-digit zero-padded string (e.g., 000°, 045°, 270°).
 */
export function formatAzimuthReadout(headingDeg: number): string {
  const rounded = Math.round(((headingDeg % 360) + 360) % 360) % 360;
  return `${String(rounded).padStart(3, '0')}°`;
}

/**
 * Computes shortest signed angular delta in [-180, +180] from currentHeadingDeg to targetBearingDeg.
 */
export function shortestAngleDeltaDeg(currentHeadingDeg: number, targetBearingDeg: number): number {
  const diff = ((targetBearingDeg - currentHeadingDeg + 540) % 360) - 180;
  return Number(diff.toFixed(2));
}

/**
 * Resolves the cardinal/intercardinal octant code, full name, and tactical sector designation.
 */
export function getCardinalDirection(headingDeg: number): CardinalInfo {
  const deg = ((headingDeg % 360) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) {
    return { code: 'N', name: 'NORTH', sectorLabel: 'SECTOR ALPHA // NORTH BUNKER' };
  }
  if (deg < 67.5) {
    return { code: 'NE', name: 'NORTHEAST', sectorLabel: 'SECTOR BRAVO // NE RIDGE' };
  }
  if (deg < 112.5) {
    return { code: 'E', name: 'EAST', sectorLabel: 'SECTOR CHARLIE // EAST LOGISTICS' };
  }
  if (deg < 157.5) {
    return { code: 'SE', name: 'SOUTHEAST', sectorLabel: 'SECTOR DELTA // SE PERIMETER' };
  }
  if (deg < 202.5) {
    return { code: 'S', name: 'SOUTH', sectorLabel: 'SECTOR ECHO // SOUTH INSERTION' };
  }
  if (deg < 247.5) {
    return { code: 'SW', name: 'SOUTHWEST', sectorLabel: 'SECTOR FOXTROT // SW APPROACH' };
  }
  if (deg < 292.5) {
    return { code: 'W', name: 'WEST', sectorLabel: 'SECTOR GOLF // WEST CONTAINERS' };
  }
  return { code: 'NW', name: 'NORTHWEST', sectorLabel: 'SECTOR HOTEL // NW COMMS TOWER' };
}

/**
 * Generates scrolling azimuth tape ticks within [-fovSpanDeg/2, +fovSpanDeg/2] of the current heading.
 */
export function computeCompassTapeTicks(
  headingDeg: number,
  fovSpanDeg: number = 120
): CompassTick[] {
  const halfSpan = fovSpanDeg / 2;
  const normHeading = ((headingDeg % 360) + 360) % 360;
  const ticks: CompassTick[] = [];

  for (let deg = 0; deg < 360; deg += 5) {
    const delta = shortestAngleDeltaDeg(normHeading, deg);
    if (delta >= -halfSpan && delta <= halfSpan) {
      const percentX = Number((((delta + halfSpan) / fovSpanDeg) * 100).toFixed(2));
      const cardinalLabel = CARDINAL_MAP[deg];

      let kind: CompassTick['kind'] = 'minor';
      let label: string | undefined;

      if (deg % 90 === 0) {
        kind = 'cardinal';
        label = cardinalLabel;
      } else if (deg % 45 === 0) {
        kind = 'intercardinal';
        label = cardinalLabel;
      } else if (deg % 15 === 0) {
        kind = 'major';
        label = String(deg).padStart(3, '0');
      }

      ticks.push({
        degree: deg,
        offsetDeg: delta,
        percentX,
        kind,
        label,
      });
    }
  }

  return ticks.sort((a, b) => a.offsetDeg - b.offsetDeg);
}

/**
 * Computes relative bearing markers on the top-center compass ribbon for mission objectives and hostiles.
 */
export function computeCompassWaypoints(
  headingDeg: number,
  playerPos: { x: number; z: number },
  targets: CompassTargetInput[],
  fovSpanDeg: number = 120
): CompassWaypointMarker[] {
  const halfSpan = fovSpanDeg / 2;
  const normHeading = ((headingDeg % 360) + 360) % 360;

  return targets.map((t) => {
    const dx = t.x - playerPos.x;
    const dz = t.z - playerPos.z;
    const distanceMeters = Math.round(Math.hypot(dx, dz));

    // In Three.js world space: -Z is North (0°), +X is East (90°), +Z is South (180°), -X is West (270°)
    const rawBearing = (Math.atan2(dx, -dz) * 180) / Math.PI;
    const bearingDeg = Number((((rawBearing % 360) + 360) % 360).toFixed(1));
    const relativeDeg = shortestAngleDeltaDeg(normHeading, bearingDeg);

    let isClampedEdge: 'left' | 'right' | null = null;
    let clampedOffset = relativeDeg;
    if (relativeDeg < -halfSpan) {
      isClampedEdge = 'left';
      clampedOffset = -halfSpan;
    } else if (relativeDeg > halfSpan) {
      isClampedEdge = 'right';
      clampedOffset = halfSpan;
    }

    const rawPercent = ((clampedOffset + halfSpan) / fovSpanDeg) * 100;
    const percentX = Number(Math.max(4, Math.min(96, rawPercent)).toFixed(2));

    return {
      id: t.id,
      label: t.label,
      type: t.type,
      bearingDeg,
      relativeDeg,
      distanceMeters,
      percentX,
      isClampedEdge,
    };
  });
}
