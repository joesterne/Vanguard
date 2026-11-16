import React from 'react';
import { PlayerStats, CampaignMission, HitMarkerEvent } from '../types';
import { Shield, Crosshair, Bomb, CheckCircle2, Zap, Eye, Sparkles, RotateCw, Activity, Swords, ArrowUp, Compass, Navigation } from 'lucide-react';
import { AcousticState } from '../audio/SoundEngine';
import { CAMO_VARIANTS } from '../data/gunsmithData';
import { computeMagazineTelemetry } from '../engine/magazineTelemetry';
import { classifyExhaustionLevel } from '../engine/staminaExhaustion';
import {
  normalizeAzimuthDeg,
  formatAzimuthReadout,
  getCardinalDirection,
  computeCompassTapeTicks,
  computeCompassWaypoints,
  CompassTargetInput,
} from '../engine/tacticalCompass';
import { ComputedDamageArc, buildSvgArcPath } from '../engine/damageIndicator';

interface GameHUDProps {
  stats: PlayerStats;
  currentMission?: CampaignMission;
  hitmarkers: HitMarkerEvent[];
  lastDamagedTime: number;
  cameraYaw: number;
  activeWeaponName: string;
  activeCamoId?: string;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
  enemyCount: number;
  skyboxLabel?: string;
  acousticState?: AcousticState;
  flashbangWhiteout?: number;
  blindedEnemiesCount?: number;
  onThrowFlashbang?: () => void;
  onThrowFrag?: () => void;
  onInspectWeapon?: () => void;
  onSelectCamo?: (camoId: string) => void;
  onToggleCrouch?: () => void;
  onTriggerShot?: () => void;
  onReloadWeapon?: () => void;
  onMeleeStrike?: () => void;
  onJump?: () => void;
  onRotateYaw?: (deltaDeg: number) => void;
  damageArcs?: ComputedDamageArc[];
  onSimulateIncomingHit?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  currentMission,
  hitmarkers,
  lastDamagedTime,
  cameraYaw,
  activeWeaponName,
  activeCamoId = 'default',
  isPointerLocked,
  onRequestPointerLock,
  enemyCount,
  skyboxLabel,
  acousticState,
  flashbangWhiteout = 0,
  blindedEnemiesCount = 0,
  onThrowFlashbang,
  onThrowFrag,
  onInspectWeapon,
  onSelectCamo,
  onToggleCrouch,
  onTriggerShot,
  onReloadWeapon,
  onMeleeStrike,
  onJump,
  onRotateYaw,
  damageArcs = [],
  onSimulateIncomingHit,
}) => {
  const activeCamo = CAMO_VARIANTS.find((c) => c.id === activeCamoId) || CAMO_VARIANTS[0];
  // Hit flash intensity based on recent damage
  const timeSinceHit = performance.now() - lastDamagedTime;
  const isHitActive = timeSinceHit < 400;

  // Tactical Orientation Compass telemetry synced with player cameraYaw
  const headingDeg = normalizeAzimuthDeg(cameraYaw);
  const compassDeg = Math.round(headingDeg) % 360;
  const formattedAzimuth = formatAzimuthReadout(headingDeg);
  const cardinalInfo = getCardinalDirection(headingDeg);
  const compassTicks = computeCompassTapeTicks(headingDeg, 120);

  // Build active mission objective waypoints for the compass ribbon
  const playerPos = { x: stats.posX ?? 0, z: stats.posZ ?? 18 };
  const compassTargets: CompassTargetInput[] = React.useMemo(() => {
    const list: CompassTargetInput[] = [];
    if (currentMission) {
      currentMission.objectives.forEach((obj, idx) => {
        if (!obj.completed) {
          const focus = obj.cameraFocus ||
            (idx === 0
              ? { x: 0, y: 1.5, z: -14 }
              : idx === 1
              ? { x: -7, y: 1.5, z: 2 }
              : { x: 0, y: 4, z: -32 });
          list.push({
            id: obj.id,
            label: obj.sectorName ? obj.sectorName.split(' ')[0].toUpperCase() : `OBJ ${idx + 1}`,
            type: obj.optional ? 'extraction' : 'objective',
            x: focus.x,
            z: focus.z,
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        id: 'obj_default_north',
        label: 'COMMS HUB',
        type: 'objective',
        x: 0,
        z: -32,
      });
    }
    return list;
  }, [currentMission]);

  const compassWaypoints = computeCompassWaypoints(headingDeg, playerPos, compassTargets, 120);
  const primaryWaypoint = compassWaypoints[0] || null;

  // Dynamic Crosshair spread & recoil bloom telemetry driven by FPSController
  const crosshairGap = Math.round(
    stats.crosshairSpread ?? (stats.isSprinting ? 28 : stats.isCrouching ? 7 : 11)
  );
  const recoilBloom = stats.recoilBloom ?? 0;
  const accuracyPct =
    stats.accuracyPct ?? (stats.isCrouching ? 92 : stats.isSprinting ? 48 : 85);
  const stabilityLabel =
    stats.stabilityLabel ??
    (stats.isCrouching ? 'CROUCHED · HIGH STABILITY' : 'STANDING · STEADY');

  // Dynamic blade length & reactive color based on recoil bloom and stance
  const bladeLength = stats.isCrouching ? 10 : recoilBloom > 0.35 ? 15 : 12;
  const isHighBloom = recoilBloom >= 0.4 || stats.isGrounded === false;
  const isHighPrecision = !isHighBloom && (stats.isCrouching || accuracyPct >= 88);
  const bladeColorClass = isHighBloom
    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.85)]'
    : isHighPrecision
    ? 'bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
    : 'bg-white/95 shadow-[0_0_4px_rgba(0,0,0,0.9)]';
  const strokeHex = isHighBloom ? '#fbbf24' : isHighPrecision ? '#67e8f9' : '#f8fafc';

  // Real-time Active Magazine & Reserve Magazine Pouches Telemetry
  const defaultMagSize = stats.currentWeaponIndex === 0 ? 30 : 15;
  const defaultMaxReserve = stats.currentWeaponIndex === 0 ? 180 : 90;
  const magTelemetry = computeMagazineTelemetry(
    stats.currentMag,
    stats.magazineSize ?? defaultMagSize,
    stats.reserveAmmo,
    stats.maxReserveAmmo ?? defaultMaxReserve
  );
  const activeMagVisualRatio = stats.isReloading
    ? stats.reloadProgress ?? 0.5
    : magTelemetry.activeMagFillRatio;
  const activeMagColorHex = stats.isReloading
    ? stats.isTacticalReload
      ? '#10b981'
      : '#38bdf8'
    : magTelemetry.activeMagStatus === 'critical' || magTelemetry.activeMagStatus === 'empty'
    ? '#ef4444'
    : magTelemetry.activeMagStatus === 'low'
    ? '#f59e0b'
    : '#22d3ee';

  // Tactical Reload ("Fast Reload") state & post-reload confirmation window
  const canFastReloadNow =
    !stats.isReloading &&
    stats.currentMag > 0 &&
    stats.currentMag < magTelemetry.magazineSize &&
    stats.reserveAmmo > 0;
  const timeSinceLastReload = performance.now() - (stats.lastReloadTimestamp ?? 0);
  const showPostFastReloadBadge =
    !stats.isReloading &&
    stats.lastReloadType === 'tactical' &&
    (stats.lastReloadTimestamp ?? 0) > 0 &&
    timeSinceLastReload < 1800;

  // Circular Stamina Gauge & Physical Exhaustion Telemetry
  const staminaPct = Math.max(0, Math.min(100, Math.round((stats.stamina / (stats.maxStamina || 100)) * 100)));
  const fallbackExhaustion = classifyExhaustionLevel(staminaPct, stats.staminaAction ?? 'NONE');
  const exhaustionLevel = stats.exhaustionLevel ?? fallbackExhaustion.exhaustionLevel;
  const exhaustionLabel = stats.exhaustionLabel ?? fallbackExhaustion.exhaustionLabel;
  const heartRateBpm = stats.heartRateBpm ?? fallbackExhaustion.heartRateBpm;
  const staminaAction = stats.staminaAction ?? (stats.isSprinting ? 'SPRINTING' : 'NONE');
  const staminaActionLabel =
    stats.staminaActionLabel ??
    (staminaAction === 'SPRINTING'
      ? 'SPRINTING // -22/S'
      : staminaAction === 'JUMP_EXERTION'
      ? 'JUMP EXERTION // -18 STM'
      : staminaAction === 'MELEE_STRIKE'
      ? 'MELEE STRIKE // -24 STM'
      : staminaAction === 'RECOVERING'
      ? 'RECOVERING // +18/S'
      : 'STANDBY // STEADY RESPIRATION');

  // SVG Circular Gauge Arc Math (Radius = 34, Circumference = 213.63)
  const staminaRadius = 34;
  const staminaCircumference = 2 * Math.PI * staminaRadius;
  const staminaDashOffset = staminaCircumference * (1 - staminaPct / 100);
  const staminaStrokeHex =
    exhaustionLevel === 'EXHAUSTED'
      ? '#ef4444'
      : exhaustionLevel === 'FATIGUED'
      ? '#f59e0b'
      : exhaustionLevel === 'ELEVATED'
      ? '#38bdf8'
      : '#22d3ee';
  const isExertingImpulse =
    staminaAction === 'SPRINTING' ||
    staminaAction === 'JUMP_EXERTION' ||
    staminaAction === 'MELEE_STRIKE' ||
    Boolean(stats.isMeleeing);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Damage Screen Flash Overlay */}
      {isHitActive && (
        <div
          className="absolute inset-0 hit-flash-effect transition-opacity duration-300"
          style={{ opacity: Math.max(0, 1 - timeSinceHit / 400) }}
        />
      )}

      {/* Tactical Flashbang Screen-Whiteout & Optical Overload Overlay */}
      {flashbangWhiteout > 0.01 && (
        <div
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
          style={{
            backgroundColor: `rgba(248, 252, 255, ${Math.min(1, flashbangWhiteout * 1.15)})`,
          }}
        >
          {flashbangWhiteout > 0.15 && (
            <div
              className="px-5 py-2.5 rounded border border-cyan-600/40 bg-slate-950/20 font-mono text-xs font-bold tracking-widest text-slate-900 uppercase"
              style={{ opacity: Math.min(1, flashbangWhiteout) }}
            >
              OPTICAL OVERLOAD · M84 FLASHBANG CONCUSSION
            </div>
          )}
        </div>
      )}

      {/* Screen Vignette */}
      <div className="absolute inset-0 vignette-effect" />

      {/* Physical Exhaustion Peripheral Pulse Vignette when Fatigued or Exhausted */}
      {(exhaustionLevel === 'FATIGUED' || exhaustionLevel === 'EXHAUSTED') && (
        <div
          data-testid="exhaustion-vignette"
          data-exhaustion-level={exhaustionLevel}
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            exhaustionLevel === 'EXHAUSTED' ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow:
              exhaustionLevel === 'EXHAUSTED'
                ? 'inset 0 0 110px rgba(239, 68, 68, 0.38)'
                : 'inset 0 0 85px rgba(245, 158, 11, 0.22)',
          }}
        />
      )}

      {/* Click-to-Play pointer lock banner positioned above center so the dynamic crosshair is always unobstructed */}
      {!isPointerLocked && !stats.isInspecting && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <button
            onClick={onRequestPointerLock}
            className="flex items-center gap-3 px-5 py-2 bg-slate-950/90 border border-cyan-500/80 rounded-lg shadow-2xl hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Crosshair className="w-5 h-5 text-cyan-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
            <div className="text-left">
              <div className="font-tactical font-bold text-sm text-white tracking-wider">
                CLICK TO ENGAGE AIM LOCK
              </div>
              <div className="text-[10px] font-mono text-cyan-400">
                WASD/Shift Sprint · Space Jump · E Melee · [/] or Q Turn · J Fire
              </div>
            </div>
          </button>
        </div>
      )}

      {/* TOP BAR: Mission Objectives (Left), Tactical Orientation Compass (Center), Radar (Right) */}
      <div className="w-full flex items-start justify-between relative z-10">
        {/* Top-Left: Mission Objective Tracker */}
        {currentMission && (
          <div className="max-w-xs md:max-w-sm bg-slate-950/80 border-l-2 border-cyan-500 px-3.5 py-2.5 rounded-r">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1 tracking-wider uppercase">
              <span>OBJ // {currentMission.codename}</span>
              <span className="text-slate-400 tabular-nums">HOSTILES: {enemyCount}</span>
            </div>
            <div className="space-y-1.5">
              {currentMission.objectives.map((obj) => (
                <div key={obj.id} className="flex items-start gap-2 text-xs">
                  {obj.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-sm border border-slate-600 shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-cyan-400" />
                    </div>
                  )}
                  <span className={`${obj.completed ? 'text-slate-400 line-through' : 'text-slate-100 font-medium'}`}>
                    {obj.text}
                    {obj.targetProgress && !obj.completed && (
                      <span className="ml-1 text-cyan-400 tabular-nums">
                        [{obj.currentProgress ?? 0}/{obj.targetProgress}]
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top-Center: Tactical Orientation Compass Ribbon & Azimuth Navigation Unit */}
        <div
          data-testid="tactical-orientation-compass"
          data-heading-deg={compassDeg}
          data-cardinal={cardinalInfo.code}
          data-sector={cardinalInfo.sectorLabel}
          className="flex flex-col items-center bg-slate-950/88 border border-slate-800/90 px-3.5 py-2 rounded-lg shadow-2xl w-80 md:w-[430px]"
        >
          {/* Upper Row: Digital Azimuth Bearing, Cardinal Direction, Sector Callout & Yaw Controls */}
          <div className="w-full flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              {onRotateYaw && (
                <button
                  onClick={() => onRotateYaw(-45)}
                  className="pointer-events-auto px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[9px] font-mono text-cyan-300 cursor-pointer transition-colors"
                  title="Turn Camera Left 45° ([)"
                >
                  ◄ 45°
                </button>
              )}
              <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span
                data-testid="compass-sector-label"
                className="text-[9px] font-mono text-slate-400 tracking-wider uppercase truncate max-w-[140px] md:max-w-[175px]"
              >
                {cardinalInfo.sectorLabel}
              </span>
            </div>

            {/* Center Digital Azimuth Readout Pill */}
            <div
              data-testid="compass-azimuth-readout"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/60 font-mono text-xs font-bold text-cyan-300 tabular-nums tracking-widest"
            >
              <span>{formattedAzimuth}</span>
              <span className="text-white font-tactical font-black">{cardinalInfo.code}</span>
            </div>

            {/* Right: Primary Objective Bearing & Distance + Yaw Right Button */}
            <div className="flex items-center gap-1.5">
              {primaryWaypoint && (
                <div
                  data-testid="compass-objective-bearing"
                  className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 tabular-nums uppercase"
                  title={`Primary Objective Bearing: ${Math.round(primaryWaypoint.bearingDeg)}° (${primaryWaypoint.distanceMeters}m)`}
                >
                  <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{primaryWaypoint.distanceMeters}M</span>
                </div>
              )}
              {onRotateYaw && (
                <button
                  onClick={() => onRotateYaw(45)}
                  className="pointer-events-auto px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[9px] font-mono text-cyan-300 cursor-pointer transition-colors"
                  title="Turn Camera Right 45° (] / Q)"
                >
                  45° ►
                </button>
              )}
            </div>
          </div>

          {/* Middle Row: Scrolling Horizontal Azimuth Compass Tape (-60° to +60° window) */}
          <div
            data-testid="compass-scrolling-tape"
            className="relative w-full h-9 bg-slate-900/90 border-x border-b border-slate-800/90 rounded-b overflow-hidden mt-0.5"
          >
            {/* Fixed Center Lubber Line & Top Caret Pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20 flex flex-col items-center pointer-events-none">
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-cyan-400" />
              <div className="w-[1.5px] h-7 bg-cyan-400/80" />
            </div>

            {/* Scrolling Azimuth Ticks & Cardinal Markers */}
            {compassTicks.map((tick) => {
              const isCardinal = tick.kind === 'cardinal';
              const isIntercardinal = tick.kind === 'intercardinal';
              const isMajor = tick.kind === 'major';
              const isNorth = tick.degree === 0;

              return (
                <div
                  key={tick.degree}
                  style={{ left: `${tick.percentX}%` }}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                >
                  {/* Tick Line */}
                  <div
                    className={`${
                      isCardinal
                        ? isNorth
                          ? 'h-3 w-[2px] bg-amber-400'
                          : 'h-3 w-[1.5px] bg-cyan-300'
                        : isIntercardinal
                        ? 'h-2.5 w-[1.5px] bg-cyan-500/80'
                        : isMajor
                        ? 'h-2 w-[1px] bg-slate-400'
                        : 'h-1.5 w-[1px] bg-slate-600/80'
                    }`}
                  />
                  {/* Tick Label (N/NE/E/SE/S/SW/W/NW or 3-digit degrees) */}
                  {tick.label && (
                    <span
                      className={`mt-0.5 font-mono leading-none tabular-nums ${
                        isCardinal
                          ? isNorth
                            ? 'text-[11px] font-black text-amber-300'
                            : 'text-[11px] font-bold text-white'
                          : isIntercardinal
                          ? 'text-[9px] font-bold text-cyan-300'
                          : 'text-[8px] text-slate-400'
                      }`}
                    >
                      {tick.label}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Live Objective Waypoint Diamond Pips on the Compass Tape */}
            {compassWaypoints.slice(0, 2).map((wp, idx) => (
              <div
                key={wp.id}
                data-testid={`compass-waypoint-${idx}`}
                data-bearing={Math.round(wp.bearingDeg)}
                data-clamped={wp.isClampedEdge || 'in-fov'}
                style={{ left: `${wp.percentX}%` }}
                className="absolute bottom-0.5 -translate-x-1/2 z-10 flex items-center gap-0.5 pointer-events-none"
              >
                <span
                  className={`px-1 py-[1px] rounded text-[7px] font-mono font-bold tracking-wider uppercase border ${
                     idx === 0
                      ? 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300'
                      : 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300'
                  }`}
                >
                  {wp.isClampedEdge === 'left'
                    ? `◄ ${wp.label}`
                    : wp.isClampedEdge === 'right'
                    ? `${wp.label} ►`
                    : `◆ ${wp.label} ${wp.distanceMeters}m`}
                </span>
              </div>
            ))}
          </div>

          {/* Lower Sub-Row: Atmosphere Skybox, Geometric Acoustics & Flashbang Stun Telemetry */}
          <div className="w-full flex items-center justify-between gap-2 mt-1 text-[9px] font-mono uppercase tracking-wider">
            {skyboxLabel && (
              <div className="text-slate-400 truncate">
                ENV: <span className="text-amber-400">{skyboxLabel}</span> [V]
              </div>
            )}
            {acousticState && (
              <div className="flex items-center gap-1 text-cyan-300 shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    acousticState.zone === 'CONCRETE_BUNKER' ? 'bg-amber-400' : 'bg-emerald-400'
                  } animate-pulse`}
                />
                <span>
                  {acousticState.zone.replace('_', ' ')} [{acousticState.reverbDecayTime}S]
                </span>
              </div>
            )}
          </div>

          {blindedEnemiesCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 mt-1 tracking-wider uppercase">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>
                {blindedEnemiesCount} HOSTILE{blindedEnemiesCount > 1 ? 'S' : ''} BLINDED / STUNNED
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Tactical Radar Minimap */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border border-slate-700 bg-slate-950/85 overflow-hidden shadow-lg flex items-center justify-center">
          {/* Radar range rings */}
          <div className="absolute inset-2 rounded-full border border-slate-800/80" />
          <div className="absolute inset-6 rounded-full border border-slate-800/60" />
          <div className="absolute w-full h-[1px] bg-slate-800/80" />
          <div className="absolute h-full w-[1px] bg-slate-800/80" />

          {/* Player Center Icon */}
          <div
            className="w-3 h-3 border-2 border-cyan-400 bg-cyan-500 rounded-full z-10"
            style={{ transform: `rotate(${compassDeg}deg)` }}
          />

          {/* Tactical Radar Sweep Scan Line */}
          <div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-cyan-400/20 origin-center animate-spin"
            style={{ animationDuration: '3s' }}
          />
        </div>
      </div>

      {/* WEAPON SKIN & CHASSIS INSPECTION TELEMETRY OVERLAY (Triggered by 'I' key / isInspecting state) */}
      {stats.isInspecting && (
        <div
          data-testid="weapon-inspect-overlay"
          className="absolute top-36 left-1/2 -translate-x-1/2 w-full max-w-md px-5 py-3.5 bg-slate-950/92 border border-cyan-500/80 rounded-lg z-30 shadow-2xl pointer-events-auto"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>WEAPON SKIN INSPECTION ACTIVE [I]</span>
            </div>
            <span className="tabular-nums text-slate-300">
              {Math.round((stats.inspectProgress ?? 0) * 100)}%
            </span>
          </div>

          {/* Inspection Phase Progress Bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden my-1.5">
            <div
              className="h-full bg-cyan-400 transition-all duration-75"
              style={{ width: `${Math.round((stats.inspectProgress ?? 0) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <div>
              <div className="font-tactical font-black text-base text-white tracking-wider">
                {activeWeaponName}
              </div>
              <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>SKIN: {activeCamo.name.toUpperCase()}</span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/50 rounded text-[9px] text-amber-300">
                  {activeCamo.rarity.toUpperCase()}
                </span>
              </div>
            </div>
            <div
              className="w-7 h-7 rounded-md border border-white/40 shadow-inner shrink-0"
              style={{ backgroundColor: activeCamo.color }}
              title={activeCamo.name}
            />
          </div>

          <div className="text-[10px] font-mono text-slate-300 mt-1.5 leading-snug">
            {activeCamo.description}
          </div>

          <div className="text-[9px] font-mono text-cyan-300/90 mt-1.5 uppercase tracking-wider">
            STAGE // {stats.inspectPhaseLabel || 'LEFT RECEIVER · SERIAL UID & SKIN FINISH'}
          </div>

          {/* Live In-Game Weapon Skin Finish Swatches */}
          {onSelectCamo && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/90 flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                FINISH [N]:
              </span>
              <div className="flex items-center gap-1.5">
                {CAMO_VARIANTS.map((camo) => {
                  const isSelected = camo.id === activeCamo.id;
                  return (
                    <button
                      key={camo.id}
                      onClick={() => onSelectCamo(camo.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                      }`}
                      title={`Apply ${camo.name} (${camo.rarity})`}
                    >
                      {camo.id === 'default' ? 'STD' : camo.id.slice(0, 4).toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CENTER: Dynamic Ballistic Crosshair (expands with movement, recoil bloom, and stance) */}
      {!stats.isAiming && !stats.isInspecting && (
        <div
          data-testid="dynamic-crosshair"
          data-gap={crosshairGap}
          data-accuracy={accuracyPct}
          data-stance={stats.isCrouching ? 'crouch' : stats.isSprinting ? 'sprint' : 'stand'}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ opacity: stats.isReloading ? 0.35 : 1 }}
        >
          {/* SVG Dispersion Ring & Crouched Stability Corner Brackets */}
          <svg
            width="140"
            height="140"
            viewBox="-70 -70 140 140"
            className="absolute -left-[70px] -top-[70px] overflow-visible pointer-events-none"
          >
            {/* Dynamic ballistic dispersion cone circle */}
            <circle
              cx="0"
              cy="0"
              r={crosshairGap + 2}
              fill="none"
              stroke={strokeHex}
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeOpacity={recoilBloom > 0.1 || (stats.movementSpeed ?? 0) > 0.5 ? 0.55 : 0.28}
            />
            {/* Crouched stance stabilization corner brackets */}
            {stats.isCrouching && (
              <g stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.85">
                <path d={`M ${-crosshairGap - 4} ${-crosshairGap + 2} L ${-crosshairGap - 4} ${-crosshairGap - 4} L ${-crosshairGap + 2} ${-crosshairGap - 4}`} />
                <path d={`M ${crosshairGap - 2} ${-crosshairGap - 4} L ${crosshairGap + 4} ${-crosshairGap - 4} L ${crosshairGap + 4} ${-crosshairGap + 2}`} />
                <path d={`M ${-crosshairGap - 4} ${crosshairGap - 2} L ${-crosshairGap - 4} ${crosshairGap + 4} L ${-crosshairGap + 2} ${crosshairGap + 4}`} />
                <path d={`M ${crosshairGap - 2} ${crosshairGap + 4} L ${crosshairGap + 4} ${crosshairGap + 4} L ${crosshairGap + 4} ${crosshairGap - 2}`} />
              </g>
            )}
          </svg>

          {/* Top Blade */}
          <div
            className={`absolute w-0.5 -translate-x-1/2 rounded-full ${bladeColorClass}`}
            style={{
              bottom: `${crosshairGap}px`,
              height: `${bladeLength}px`,
            }}
          />
          {/* Bottom Blade */}
          <div
            className={`absolute w-0.5 -translate-x-1/2 rounded-full ${bladeColorClass}`}
            style={{
              top: `${crosshairGap}px`,
              height: `${bladeLength}px`,
            }}
          />
          {/* Left Blade */}
          <div
            className={`absolute h-0.5 -translate-y-1/2 rounded-full ${bladeColorClass}`}
            style={{
              right: `${crosshairGap}px`,
              width: `${bladeLength}px`,
            }}
          />
          {/* Right Blade */}
          <div
            className={`absolute h-0.5 -translate-y-1/2 rounded-full ${bladeColorClass}`}
            style={{
              left: `${crosshairGap}px`,
              width: `${bladeLength}px`,
            }}
          />
          {/* Center 1-MOA Precision Dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-black/70 ${
              isHighBloom ? 'bg-amber-400' : 'bg-cyan-400'
            }`}
          />
        </div>
      )}

      {/* DYNAMIC DIRECTIONAL DAMAGE INDICATOR WIDGET (Red Arc Pointing Toward Incoming Fire, Fading Over Time) */}
      {damageArcs.length > 0 && (
        <div
          data-testid="damage-indicator-widget"
          data-active-count={damageArcs.length}
          data-latest-sector={damageArcs[damageArcs.length - 1].directionSector}
          data-latest-angle={damageArcs[damageArcs.length - 1].relativeAngleDeg}
          data-latest-opacity={damageArcs[damageArcs.length - 1].opacity}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] pointer-events-none z-30 flex items-center justify-center"
        >
          <svg
            width="240"
            height="240"
            viewBox="-120 -120 240 240"
            className="w-[240px] h-[240px] shrink-0 overflow-visible pointer-events-none"
          >
            {/* Subtle Radial Threat Reference Ring */}
            <circle
              cx="0"
              cy="0"
              r="78"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeOpacity={Math.min(0.45, damageArcs[damageArcs.length - 1].opacity * 0.5)}
            />

            {damageArcs.map((arc, idx) => {
              const outerArcPath = buildSvgArcPath(78, arc.sweepAngleDeg);
              const innerArcPath = buildSvgArcPath(71, Math.max(24, arc.sweepAngleDeg - 10));

              return (
                <g
                  key={arc.id}
                  data-testid={`damage-indicator-arc-${idx}`}
                  data-angle-deg={arc.relativeAngleDeg}
                  data-world-bearing={arc.worldBearingDeg}
                  data-sector={arc.directionSector}
                  data-opacity={arc.opacity}
                  transform={`rotate(${arc.relativeAngleDeg})`}
                  style={{ opacity: arc.opacity }}
                >
                  {/* Outer Crimson Glow Halo Arc */}
                  <path
                    d={outerArcPath}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={12 * arc.intensityScale}
                    strokeLinecap="round"
                    strokeOpacity="0.45"
                  />
                  {/* Primary Tactical Red Directional Arc */}
                  <path
                    d={outerArcPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={6 * arc.intensityScale}
                    strokeLinecap="round"
                  />
                  {/* Inner High-Contrast Segmented Core Arc */}
                  <path
                    d={innerArcPath}
                    fill="none"
                    stroke="#fecaca"
                    strokeWidth="2.2"
                    strokeDasharray="10 4"
                    strokeLinecap="round"
                  />
                  {/* Directional Threat Chevron Pointer at 12 o'clock (rotated by relativeAngleDeg) */}
                  <polygon
                    points="0,-98 -8,-84 0,-88 8,-84"
                    fill="#ef4444"
                    stroke="#fecaca"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}
          </svg>

          {/* Tactical Incoming-Fire Sector & Bearing Callout Badge */}
          {(() => {
            const latestArc = damageArcs[damageArcs.length - 1];
            return (
              <div
                data-testid="damage-indicator-readout"
                style={{ opacity: Math.min(1, latestArc.opacity * 1.15) }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded bg-red-950/95 border border-red-500/90 text-[10px] font-mono font-bold text-red-100 tracking-widest uppercase flex items-center gap-1.5 shadow-lg"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span>
                  {latestArc.attackerLabel} // {latestArc.directionSector} (
                  {Math.round(latestArc.worldBearingDeg)}° · {latestArc.distanceMeters}M)
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Subtle Center-Bottom Tactical 'Fast Reload' Indicator */}
      {(stats.isReloading || showPostFastReloadBadge || canFastReloadNow) && !stats.isInspecting && (
        <div
          data-testid="fast-reload-indicator"
          data-reload-mode={
            stats.isReloading
              ? stats.isTacticalReload
                ? 'tactical-active'
                : 'empty-active'
              : showPostFastReloadBadge
              ? 'tactical-complete'
              : 'tactical-ready'
          }
          className="absolute top-[57%] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-20"
        >
          {stats.isReloading ? (
            <div
              className={`px-3 py-1 rounded border bg-slate-950/88 shadow-lg flex flex-col items-center gap-1 min-w-[180px] ${
                stats.isTacticalReload
                  ? 'border-emerald-500/75 text-emerald-300'
                  : 'border-amber-500/75 text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-3 text-[10px] font-mono font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1">
                  <Zap
                    className={`w-3 h-3 ${
                      stats.isTacticalReload ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  />
                  {stats.isTacticalReload ? 'FAST RELOAD' : 'FULL RELOAD'}
                </span>
                <span className="tabular-nums">
                  {stats.isTacticalReload ? '-32% TIME' : 'BOLT LOCK'} ·{' '}
                  {Math.round((stats.reloadProgress ?? 0) * 100)}%
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    stats.isTacticalReload ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.round((stats.reloadProgress ?? 0) * 100)}%` }}
                />
              </div>
              <div className="text-[8px] font-mono text-slate-400 tracking-wider uppercase">
                {stats.reloadStageLabel ||
                  (stats.isTacticalReload
                    ? 'ROUND IN CHAMBER // CLOSED BOLT'
                    : 'EMPTY CHAMBER // RACKING BOLT')}
              </div>
            </div>
          ) : showPostFastReloadBadge ? (
            <div className="px-2.5 py-0.5 rounded border border-emerald-500/60 bg-slate-950/80 text-[9px] font-mono font-bold text-emerald-300 tracking-widest uppercase flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>FAST RELOAD COMPLETE · CHAMBERED</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded border border-cyan-500/35 bg-slate-950/65 text-[9px] font-mono text-cyan-300/90 tracking-widest uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>[R] FAST RELOAD READY · CHAMBERED</span>
            </div>
          )}
        </div>
      )}

      {/* Hitmarker Display in Screen Center */}
      {hitmarkers.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {hitmarkers.map((hm) => (
            <div key={hm.id} className="relative flex items-center justify-center animate-ping">
              <svg viewBox="0 0 40 40" className="w-10 h-10">
                <line x1="10" y1="10" x2="16" y2="16" stroke={hm.isKill ? '#ef4444' : '#ffffff'} strokeWidth="2.5" />
                <line x1="30" y1="10" x2="24" y2="16" stroke={hm.isKill ? '#ef4444' : '#ffffff'} strokeWidth="2.5" />
                <line x1="10" y1="30" x2="16" y2="24" stroke={hm.isKill ? '#ef4444' : '#ffffff'} strokeWidth="2.5" />
                <line x1="30" y1="30" x2="24" y2="24" stroke={hm.isKill ? '#ef4444' : '#ffffff'} strokeWidth="2.5" />
              </svg>
              {hm.isHeadshot && (
                <span className="absolute -top-5 font-tactical font-black text-xs text-red-500 tracking-wider">
                  HEADSHOT
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BOTTOM CLUSTERS: Health/Armor & Circular Stamina Gauge (Left) + Ammo/Weapon (Right) */}
      <div className="w-full flex items-end justify-between relative z-10">
        {/* Bottom-Left: Vital Gauges & Circular Stamina / Physical Exhaustion Biometrics */}
        <div className="bg-slate-950/88 border border-slate-800/90 p-3.5 rounded-lg shadow-xl flex items-center gap-4">
          {/* Left Column: Health & Segmented Armor Plates */}
          <div className="w-44">
            {/* Health Gauge */}
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 font-semibold">VITALS</span>
              <span className={`font-bold tabular-nums text-sm ${stats.health <= 30 ? 'text-red-500' : 'text-slate-100'}`}>
                {Math.round(stats.health)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2.5">
              <div
                className={`h-full transition-all duration-150 ${
                  stats.health <= 30 ? 'bg-red-500' : stats.health <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${stats.health}%` }}
              />
            </div>

            {/* Armor Shield Plates (3 segmented plates) */}
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Shield className="w-3.5 h-3.5" />
                <span>ARMOR PLATES</span>
              </div>
              <span className="font-bold tabular-nums text-slate-200">{Math.round(stats.armor)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-full h-1.5 mb-2.5">
              <div className={`rounded-full ${stats.armor > 0 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              <div className={`rounded-full ${stats.armor > 33 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              <div className={`rounded-full ${stats.armor > 66 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            </div>

            {/* Physical Exhaustion & Biometric Action Readout */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono tracking-wider uppercase">
                <span
                  data-testid="exhaustion-level-label"
                  className={`font-bold ${
                    exhaustionLevel === 'EXHAUSTED'
                      ? 'text-red-400 animate-pulse'
                      : exhaustionLevel === 'FATIGUED'
                      ? 'text-amber-400'
                      : exhaustionLevel === 'ELEVATED'
                      ? 'text-sky-300'
                      : 'text-cyan-300'
                  }`}
                >
                  {exhaustionLabel}
                </span>
              </div>
              <div
                data-testid="stamina-action-readout"
                className="text-[9px] font-mono text-slate-400 uppercase tracking-wider truncate"
              >
                {staminaActionLabel}
              </div>
            </div>
          </div>

          {/* Right Column: Circular Stamina & Physical Exhaustion Gauge */}
          <div
            data-testid="circular-stamina-gauge"
            data-stamina={staminaPct}
            data-exhaustion={exhaustionLevel}
            data-action={staminaAction}
            data-bpm={heartRateBpm}
            className="relative flex flex-col items-center justify-center pl-3 border-l border-slate-800/80"
            title={`Stamina: ${staminaPct}% (${exhaustionLabel}) · ${heartRateBpm} BPM`}
          >
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg viewBox="0 0 84 84" className="w-20 h-20 -rotate-90 overflow-visible">
                {/* Outer tactical degree ticks ring */}
                <circle
                  cx="42"
                  cy="42"
                  r="39"
                  fill="none"
                  stroke={isExertingImpulse ? staminaStrokeHex : '#1e293b'}
                  strokeWidth="1"
                  strokeDasharray="2 4"
                  opacity={isExertingImpulse ? 0.85 : 0.6}
                />
                {/* Background track ring */}
                <circle
                  cx="42"
                  cy="42"
                  r={staminaRadius}
                  fill="#090d16"
                  stroke="#1e293b"
                  strokeWidth="5.5"
                />
                {/* Exhaustion critical threshold marker arc (0-18%) */}
                <circle
                  cx="42"
                  cy="42"
                  r="27"
                  fill="none"
                  stroke={exhaustionLevel === 'EXHAUSTED' ? '#ef4444' : '#334155'}
                  strokeWidth="1.2"
                  strokeDasharray="3 5"
                  opacity={exhaustionLevel === 'EXHAUSTED' || exhaustionLevel === 'FATIGUED' ? 0.9 : 0.4}
                />
                {/* Active Circular Stamina Fill Arc */}
                <circle
                  cx="42"
                  cy="42"
                  r={staminaRadius}
                  fill="none"
                  stroke={staminaStrokeHex}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={staminaCircumference}
                  strokeDashoffset={staminaDashOffset}
                  className="transition-all duration-100"
                />
              </svg>

              {/* Center Biometric Readout Inside Circular Gauge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[8px] font-mono text-slate-400 tracking-widest uppercase leading-none">
                  STM
                </span>
                <span
                  className={`font-tactical font-black text-lg tabular-nums leading-tight ${
                    exhaustionLevel === 'EXHAUSTED'
                      ? 'text-red-400 animate-pulse'
                      : exhaustionLevel === 'FATIGUED'
                      ? 'text-amber-300'
                      : 'text-slate-100'
                  }`}
                >
                  {staminaPct}%
                </span>
                <span className="flex items-center gap-0.5 text-[8px] font-mono text-cyan-300/90 tabular-nums leading-none mt-0.5">
                  <Activity
                    className={`w-2.5 h-2.5 ${
                      exhaustionLevel === 'EXHAUSTED'
                        ? 'text-red-400 animate-ping'
                        : exhaustionLevel === 'FATIGUED'
                        ? 'text-amber-400 animate-pulse'
                        : 'text-cyan-400'
                    }`}
                  />
                  {heartRateBpm}
                </span>
              </div>
            </div>

            {/* Action Impulse Badge directly under Circular Stamina Gauge */}
            <div
              className={`mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-widest uppercase border ${
                staminaAction === 'MELEE_STRIKE'
                  ? 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                  : staminaAction === 'JUMP_EXERTION'
                  ? 'bg-sky-500/20 border-sky-400/70 text-sky-300'
                  : staminaAction === 'SPRINTING'
                  ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-300'
                  : exhaustionLevel === 'EXHAUSTED'
                  ? 'bg-red-500/20 border-red-500/70 text-red-300'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-400'
              }`}
            >
              {staminaAction === 'MELEE_STRIKE'
                ? 'MELEE -24'
                : staminaAction === 'JUMP_EXERTION'
                ? 'JUMP -18'
                : staminaAction === 'SPRINTING'
                ? 'SPRINT -22/S'
                : exhaustionLevel === 'EXHAUSTED'
                ? 'EXHAUSTED'
                : exhaustionLevel === 'FATIGUED'
                ? 'FATIGUED'
                : 'READY'}
            </div>
          </div>
        </div>

        {/* Bottom-Right: Active Weapon Rig, Ammo & Grenade Readout */}
        <div className="bg-slate-950/85 border border-slate-800/90 p-4 rounded-lg shadow-xl text-right">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-0.5">
            {activeWeaponName}
          </div>
          <div className="text-[10px] font-mono text-amber-400/90 mb-0.5 uppercase">
            SKIN: {activeCamo.name} ({activeCamo.rarity})
          </div>
          <div className="text-[10px] font-mono text-slate-500 mb-1">
            {stats.currentWeaponIndex === 0 ? '5.56x45MM NATO // AUTO' : '9x19MM PARABELLUM // SEMI'}
          </div>

          {/* Live Ballistic Stability & Crosshair Spread Telemetry */}
          <div className="my-2 pt-1.5 border-t border-slate-800/70">
            <div className="flex items-center justify-between text-[10px] font-mono gap-4 mb-1">
              <span className="text-slate-400 uppercase">{stabilityLabel}</span>
              <span
                className={`font-bold tabular-nums ${
                  accuracyPct >= 88
                    ? 'text-cyan-300'
                    : accuracyPct >= 65
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                ACC {accuracyPct}% · {crosshairGap}PX
              </span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  accuracyPct >= 88
                    ? 'bg-cyan-400'
                    : accuracyPct >= 65
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${accuracyPct}%` }}
              />
            </div>
          </div>

          {/* ACTIVE MAGAZINE CUTAWAY, NUMERICAL COUNTER & RESERVE MAGAZINE RACK */}
          <div
            data-testid="magazine-telemetry"
            data-current-mag={magTelemetry.currentMag}
            data-reserve-mags={magTelemetry.totalReserveMags}
            data-full-mags={magTelemetry.fullReserveMags}
            data-partial-rounds={magTelemetry.partialReserveRounds}
            className="mt-2 pt-2 border-t border-slate-800/80"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Visual Reserve Magazine Pouch Rack (6 Discrete Magazine Slots) */}
              <div className="flex flex-col items-start">
                <div className="text-[9px] font-mono text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
                  <span>
                    MAGS // {magTelemetry.fullReserveMags} FULL
                    {magTelemetry.partialReserveRounds > 0
                      ? ` + 1 PARTIAL (${magTelemetry.partialReserveRounds})`
                      : ''}
                  </span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    [{magTelemetry.totalReserveMags}/{magTelemetry.maxReserveSlots}]
                  </span>
                </div>

                <div className="flex items-end gap-1.5" role="list" aria-label="Remaining reserve magazines">
                  {magTelemetry.reserveMagSlots.map((slot) => {
                    const fillHeight = Math.round(slot.fillRatio * 18);
                    const fillY = 23 - fillHeight;
                    const slotFillHex =
                      slot.status === 'full'
                        ? '#06b6d4'
                        : slot.status === 'partial'
                        ? '#f59e0b'
                        : '#1e293b';
                    const slotStrokeHex =
                      slot.status === 'full'
                        ? '#22d3ee'
                        : slot.status === 'partial'
                        ? '#fbbf24'
                        : '#334155';

                    return (
                      <div
                        key={slot.index}
                        role="listitem"
                        data-testid={`reserve-mag-slot-${slot.index}`}
                        data-status={slot.status}
                        data-rounds={slot.rounds}
                        className={`flex flex-col items-center transition-all duration-150 ${
                          slot.status === 'depleted' ? 'opacity-35' : 'opacity-100'
                        }`}
                        title={`Reserve Mag #${slot.index + 1}: ${slot.rounds}/${slot.capacity} rounds (${slot.status.toUpperCase()})`}
                      >
                        <svg viewBox="0 0 18 28" className="w-4 h-6 overflow-visible">
                          {/* Magazine feed lips */}
                          <rect
                            x="4"
                            y="1"
                            width="10"
                            height="3"
                            rx="0.5"
                            fill="#0f172a"
                            stroke={slotStrokeHex}
                            strokeWidth="1"
                          />
                          {/* Outer polymer magazine housing */}
                          <rect
                            x="2.5"
                            y="4"
                            width="13"
                            height="20"
                            rx="1.5"
                            fill="#090d16"
                            stroke={slotStrokeHex}
                            strokeWidth="1.2"
                          />
                          {/* Dynamic internal round fill level */}
                          {slot.rounds > 0 && (
                            <rect
                              x="4.2"
                              y={fillY}
                              width="9.6"
                              height={fillHeight}
                              rx="0.8"
                              fill={slotFillHex}
                            />
                          )}
                          {/* Cartridge window rib lines */}
                          <line x1="4.5" y1="9" x2="13.5" y2="9" stroke="#090d16" strokeWidth="0.8" opacity="0.65" />
                          <line x1="4.5" y1="14" x2="13.5" y2="14" stroke="#090d16" strokeWidth="0.8" opacity="0.65" />
                          <line x1="4.5" y1="19" x2="13.5" y2="19" stroke="#090d16" strokeWidth="0.8" opacity="0.65" />
                          {/* Baseplate bumper */}
                          <rect x="1.5" y="24" width="15" height="2.5" rx="0.8" fill={slotStrokeHex} />
                        </svg>
                        <span
                          className={`text-[9px] font-mono tabular-nums mt-0.5 leading-none ${
                            slot.status === 'full'
                              ? 'text-cyan-300 font-semibold'
                              : slot.status === 'partial'
                              ? 'text-amber-300 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          {slot.rounds}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Active Inserted Magazine Cutaway SVG + Main Numerical Counter */}
              <div className="flex items-center gap-2.5">
                {/* Active Inserted Magazine Cutaway SVG */}
                <div
                  className="relative flex flex-col items-center"
                  title={`Active Magazine: ${magTelemetry.currentMag}/${magTelemetry.magazineSize} rounds`}
                >
                  <svg viewBox="0 0 26 44" className="w-6 h-10 overflow-visible">
                    {/* Feed lips */}
                    <rect
                      x="5"
                      y="1"
                      width="16"
                      height="4"
                      rx="1"
                      fill="#0f172a"
                      stroke={activeMagColorHex}
                      strokeWidth="1.2"
                    />
                    {/* Magazine body */}
                    <rect
                      x="3"
                      y="5"
                      width="20"
                      height="33"
                      rx="2"
                      fill="#090d16"
                      stroke={activeMagColorHex}
                      strokeWidth="1.5"
                    />
                    {/* Real-time vertical cartridge fill bar */}
                    {activeMagVisualRatio > 0 && (
                      <rect
                        x="5.5"
                        y={36 - Math.round(activeMagVisualRatio * 29)}
                        width="15"
                        height={Math.round(activeMagVisualRatio * 29)}
                        rx="1"
                        fill={activeMagColorHex}
                      />
                    )}
                    {/* Brass cartridge window ribs */}
                    {[11, 16, 21, 26, 31].map((y) => (
                      <line
                        key={y}
                        x1="5.5"
                        y1={y}
                        x2="20.5"
                        y2={y}
                        stroke="#090d16"
                        strokeWidth="1.1"
                        opacity="0.7"
                      />
                    ))}
                    {/* Flared PMAG baseplate */}
                    <rect x="1.5" y="38" width="23" height="4" rx="1" fill={activeMagColorHex} />
                  </svg>
                </div>

                {/* Numerical Active Mag & Reserve Counter */}
                <div className="text-right">
                  {stats.isReloading ? (
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-tactical text-lg font-bold tracking-wider animate-pulse ${
                          stats.isTacticalReload ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {stats.isTacticalReload ? 'FAST RELOAD' : 'FULL RELOAD'}{' '}
                        {Math.round((stats.reloadProgress ?? 0) * 100)}%
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300/90 tabular-nums uppercase">
                        {stats.isTacticalReload
                          ? `CHAMBERED · ${(stats.reloadDuration ?? 1.09).toFixed(2)}S (-32%)`
                          : `EMPTY MAG · ${(stats.reloadDuration ?? 1.6).toFixed(2)}S`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-end gap-1.5 font-mono">
                      <span
                        className={`font-tactical font-black text-4xl tabular-nums leading-none ${
                          stats.currentMag <= 5
                            ? 'text-red-500'
                            : stats.currentMag <= 10
                            ? 'text-amber-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {stats.currentMag}
                      </span>
                      <span className="text-lg text-slate-400 font-bold tabular-nums">
                        / {stats.reserveAmmo}
                      </span>
                    </div>
                  )}
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5 flex items-center justify-end gap-1.5">
                    <span>ACTIVE MAG: {Math.round(magTelemetry.activeMagFillRatio * 100)}%</span>
                    {stats.currentMag > 0 && (
                      <span className="text-emerald-400 font-semibold">· CHAMBERED</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Round-by-Round Cartridge Pips Strip for Active Magazine */}
            <div
              className="flex items-center gap-[2px] w-full mt-2"
              aria-label={`Active magazine rounds: ${magTelemetry.currentMag} of ${magTelemetry.magazineSize}`}
            >
              {Array.from({ length: magTelemetry.magazineSize }).map((_, idx) => {
                const isLoaded = idx < magTelemetry.currentMag;
                return (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-[1px] transition-colors duration-75 ${
                      !isLoaded
                        ? 'bg-slate-800/80'
                        : magTelemetry.activeMagStatus === 'critical'
                        ? 'bg-red-500'
                        : magTelemetry.activeMagStatus === 'low'
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tactical Equipment (Flashbangs, Frag Grenades, Reload, Stance, Fire & Inspect) */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-slate-800/80 text-xs font-mono pointer-events-auto">
            <button
              onClick={onThrowFlashbang}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                stats.flashbangs > 0 ? 'text-cyan-300 hover:text-white' : 'text-slate-600'
              }`}
              title="Throw M84 Tactical Flashbang [F]"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>[F] FLASH x{stats.flashbangs}</span>
            </button>
            <button
              onClick={onThrowFrag}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                stats.grenades > 0 ? 'text-slate-300 hover:text-white' : 'text-slate-600'
              }`}
              title="Throw M67 Frag Grenade [G]"
            >
              <Bomb className="w-3.5 h-3.5 text-amber-400" />
              <span>[G] FRAG x{stats.grenades}</span>
            </button>
            <button
              onClick={onReloadWeapon}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                stats.isReloading
                  ? stats.isTacticalReload
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-400 font-bold'
                  : stats.currentMag < magTelemetry.magazineSize && stats.reserveAmmo > 0
                  ? 'text-emerald-300 hover:text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Reload Active Magazine [R] (Fast Tactical Reload when chambered)"
            >
              <RotateCw className={`w-3 h-3 ${stats.isReloading ? 'animate-spin' : ''}`} />
              <span>
                {stats.isReloading && stats.isTacticalReload
                  ? '[R] FAST RELOAD'
                  : canFastReloadNow
                  ? '[R] FAST RELOAD'
                  : '[R] RELOAD'}
              </span>
            </button>
            <button
              onClick={onToggleCrouch}
              className={`transition-colors cursor-pointer ${
                stats.isCrouching ? 'text-cyan-300 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Toggle Crouch Stance [C]"
            >
              <span>[C] {stats.isCrouching ? 'CROUCH' : 'STAND'}</span>
            </button>
            {onJump && (
              <button
                onClick={onJump}
                className={`flex items-center gap-0.5 transition-colors cursor-pointer ${
                  staminaAction === 'JUMP_EXERTION'
                    ? 'text-sky-300 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Jump Impulse (-18 Stamina) [SPACE]"
              >
                <ArrowUp className="w-3 h-3 text-sky-400" />
                <span>[SPC] JUMP</span>
              </button>
            )}
            {onMeleeStrike && (
              <button
                onClick={onMeleeStrike}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${
                  stats.isMeleeing || staminaAction === 'MELEE_STRIKE'
                    ? 'text-amber-300 font-bold'
                    : 'text-rose-300 hover:text-white'
                }`}
                title="CQB Buttstock Melee Strike (-24 Stamina) [E]"
              >
                <Swords className="w-3 h-3 text-rose-400" />
                <span>[E] MELEE</span>
              </button>
            )}
            {onTriggerShot && (
              <button
                onClick={onTriggerShot}
                className="text-amber-300 hover:text-white transition-colors cursor-pointer"
                title="Fire Weapon Burst [J / Click]"
              >
                <span>[J] FIRE</span>
              </button>
            )}
            {onSimulateIncomingHit && (
              <button
                onClick={onSimulateIncomingHit}
                className="text-red-400 hover:text-white transition-colors cursor-pointer"
                title="Simulate Directional Incoming Enemy Fire [H]"
              >
                <span>[H] HIT</span>
              </button>
            )}
            <button
              onClick={onInspectWeapon}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                stats.isInspecting
                  ? 'text-amber-300 font-bold'
                  : 'text-cyan-400 hover:text-white'
              }`}
              title="Inspect Equipped Weapon Skin Detail [I]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{stats.isInspecting ? '[I] INSPECTING' : '[I] INSPECT'}</span>
            </button>
            <div className="text-slate-400">
              <span>[1/2] SWAP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
