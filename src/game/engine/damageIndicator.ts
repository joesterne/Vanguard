import { normalizeAzimuthDeg, shortestAngleDeltaDeg } from './tacticalCompass';

export const DAMAGE_INDICATOR_DURATION_MS = 2600;
export const MAX_ACTIVE_DAMAGE_INDICATORS = 6;

export type DamageDirectionSector =
  | 'FRONT'
  | 'FRONT-RIGHT'
  | 'RIGHT'
  | 'REAR-RIGHT'
  | 'REAR'
  | 'REAR-LEFT'
  | 'LEFT'
  | 'FRONT-LEFT';

export interface IncomingDamageEvent {
  id: string;
  sourceX: number;
  sourceZ: number;
  damage: number;
  timestamp: number;
  durationMs: number;
  attackerLabel: string;
}

export interface ComputedDamageArc {
  id: string;
  relativeAngleDeg: number; // -180 to +180 (0 = front/top, +90 = right, 180/-180 = rear/bottom, -90 = left)
  worldBearingDeg: number;  // 0 to 360 world azimuth from player to shooter
  distanceMeters: number;
  opacity: number;          // 0.0 to 1.0 (fades over time)
  progress: number;         // 0.0 (just hit) to 1.0 (expired)
  intensityScale: number;   // 0.85 to 1.35 based on damage severity
  sweepAngleDeg: number;    // Angular width of the red arc in degrees
  directionSector: DamageDirectionSector;
  attackerLabel: string;
}

/**
 * Classifies a relative incoming-fire angle (-180..+180) into an 8-way tactical sector label.
 */
export function classifyDamageSector(relativeAngleDeg: number): DamageDirectionSector {
  const norm = ((relativeAngleDeg % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return 'FRONT';
  if (norm < 67.5) return 'FRONT-RIGHT';
  if (norm < 112.5) return 'RIGHT';
  if (norm < 157.5) return 'REAR-RIGHT';
  if (norm < 202.5) return 'REAR';
  if (norm < 247.5) return 'REAR-LEFT';
  if (norm < 292.5) return 'LEFT';
  return 'FRONT-LEFT';
}

/**
 * Creates a new IncomingDamageEvent from a world-space origin and damage value.
 */
export function createDamageIndicatorEvent(
  sourcePos: { x: number; z: number },
  damage: number,
  nowMs: number,
  attackerLabel: string = 'HOSTILE FIRE',
  durationMs: number = DAMAGE_INDICATOR_DURATION_MS
): IncomingDamageEvent {
  return {
    id: `dmg_${Math.round(nowMs)}_${Math.random().toString(36).slice(2, 7)}`,
    sourceX: Number(sourcePos.x.toFixed(2)),
    sourceZ: Number(sourcePos.z.toFixed(2)),
    damage: Math.max(1, Number(damage.toFixed(1))),
    timestamp: nowMs,
    durationMs: Math.max(200, durationMs),
    attackerLabel,
  };
}

/**
 * Computes the live relative angle, fade opacity, and arc geometry for a single IncomingDamageEvent.
 * Returns null if the indicator has completely faded out (elapsed >= durationMs).
 */
export function computeDamageIndicatorArc(
  event: IncomingDamageEvent,
  playerPos: { x: number; z: number },
  cameraYawRad: number,
  nowMs: number
): ComputedDamageArc | null {
  const elapsed = Math.max(0, nowMs - event.timestamp);
  if (elapsed >= event.durationMs) {
    return null;
  }

  const progress = Math.max(0, Math.min(1, elapsed / event.durationMs));
  // Smooth ease-out fade curve: bright initial flash that decays gracefully to 0
  const rawFade = Math.pow(1 - progress, 1.35);
  const opacity = Number(Math.max(0, Math.min(1, rawFade)).toFixed(3));

  const dx = event.sourceX - playerPos.x;
  const dz = event.sourceZ - playerPos.z;
  const distanceMeters = Math.round(Math.hypot(dx, dz));

  // World bearing from player to source in [0, 360) degrees (-Z = 0° North, +X = 90° East)
  const rawBearing = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const worldBearingDeg = Number((((rawBearing % 360) + 360) % 360).toFixed(1));

  // Player's current camera heading in [0, 360) degrees
  const playerHeadingDeg = normalizeAzimuthDeg(cameraYawRad);

  // Relative angle in [-180, +180]: 0° = straight ahead, +90° = right flank, -90° = left flank, ±180° = behind
  const relativeAngleDeg = shortestAngleDeltaDeg(playerHeadingDeg, worldBearingDeg);

  const clampedDmg = Math.max(5, Math.min(60, event.damage));
  const intensityScale = Number((0.85 + (clampedDmg / 60) * 0.5).toFixed(2));
  const sweepAngleDeg = Math.round(42 * intensityScale);

  return {
    id: event.id,
    relativeAngleDeg,
    worldBearingDeg,
    distanceMeters,
    opacity,
    progress: Number(progress.toFixed(3)),
    intensityScale,
    sweepAngleDeg,
    directionSector: classifyDamageSector(relativeAngleDeg),
    attackerLabel: event.attackerLabel,
  };
}

/**
 * Filters expired events and computes all currently active directional damage arcs.
 */
export function stepActiveDamageIndicators(
  events: IncomingDamageEvent[],
  playerPos: { x: number; z: number },
  cameraYawRad: number,
  nowMs: number
): {
  activeEvents: IncomingDamageEvent[];
  arcs: ComputedDamageArc[];
} {
  const activeEvents: IncomingDamageEvent[] = [];
  const arcs: ComputedDamageArc[] = [];

  const recentSlice = events.slice(-MAX_ACTIVE_DAMAGE_INDICATORS);
  for (const ev of recentSlice) {
    const arc = computeDamageIndicatorArc(ev, playerPos, cameraYawRad, nowMs);
    if (arc && arc.opacity > 0.01) {
      activeEvents.push(ev);
      arcs.push(arc);
    }
  }

  return { activeEvents, arcs };
}

/**
 * Generates an SVG circular arc path centered around 12 o'clock (0, -radius)
 * spanning [-sweepAngleDeg/2, +sweepAngleDeg/2]. Rotating the parent <g> by relativeAngleDeg
 * points the arc directly toward the incoming fire source.
 */
export function buildSvgArcPath(radius: number, sweepAngleDeg: number): string {
  const halfSweepRad = ((Math.max(10, Math.min(160, sweepAngleDeg)) / 2) * Math.PI) / 180;
  const startX = Number((-Math.sin(halfSweepRad) * radius).toFixed(2));
  const startY = Number((-Math.cos(halfSweepRad) * radius).toFixed(2));
  const endX = Number((Math.sin(halfSweepRad) * radius).toFixed(2));
  const endY = Number((-Math.cos(halfSweepRad) * radius).toFixed(2));
  return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
}
