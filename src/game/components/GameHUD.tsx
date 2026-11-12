import React from 'react';
import { PlayerStats, CampaignMission, HitMarkerEvent } from '../types';
import { Shield, Crosshair, Bomb, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { AcousticState } from '../audio/SoundEngine';

interface GameHUDProps {
  stats: PlayerStats;
  currentMission?: CampaignMission;
  hitmarkers: HitMarkerEvent[];
  lastDamagedTime: number;
  cameraYaw: number;
  activeWeaponName: string;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
  enemyCount: number;
  skyboxLabel?: string;
  acousticState?: AcousticState;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  currentMission,
  hitmarkers,
  lastDamagedTime,
  cameraYaw,
  activeWeaponName,
  isPointerLocked,
  onRequestPointerLock,
  enemyCount,
  skyboxLabel,
  acousticState,
}) => {
  // Hit flash intensity based on recent damage
  const timeSinceHit = performance.now() - lastDamagedTime;
  const isHitActive = timeSinceHit < 400;

  // Compass degrees
  const compassDeg = Math.round(((-cameraYaw * 180) / Math.PI) % 360 + 360) % 360;

  // Crosshair spread calculation based on stance
  let crosshairGap = 12;
  if (stats.isSprinting) crosshairGap = 26;
  else if (stats.isCrouching) crosshairGap = 8;
  else if (stats.isAiming) crosshairGap = 0; // Fades out in ADS so holo reticle is visible

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Damage Screen Flash Overlay */}
      {isHitActive && (
        <div
          className="absolute inset-0 hit-flash-effect transition-opacity duration-300"
          style={{ opacity: Math.max(0, 1 - timeSinceHit / 400) }}
        />
      )}

      {/* Screen Vignette */}
      <div className="absolute inset-0 vignette-effect" />

      {/* Click-to-Play pointer lock banner if pointer lock dropped */}
      {!isPointerLocked && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center pointer-events-auto">
          <button
            onClick={onRequestPointerLock}
            className="flex flex-col items-center gap-3 px-8 py-5 bg-slate-900 border-2 border-cyan-500 rounded-lg shadow-2xl hover:bg-slate-800 transition-colors"
          >
            <Crosshair className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-center">
              <div className="font-tactical font-bold text-lg text-white tracking-wider">CLICK TO ENGAGE / LOCK AIM</div>
              <div className="text-xs font-mono text-cyan-400 mt-1">Press ESC anytime to open tactical pause menu</div>
            </div>
          </button>
        </div>
      )}

      {/* TOP BAR: Compass Tape & Objective Tracker */}
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

        {/* Top-Center: Compass Azimuth Heading & Atmosphere Readout */}
        <div className="flex flex-col items-center bg-slate-950/80 border border-slate-800 px-4 py-1.5 rounded">
          <div className="font-mono text-sm font-bold text-cyan-400 tabular-nums tracking-widest">
            {compassDeg}° {compassDeg >= 337 || compassDeg < 23 ? 'N' : compassDeg < 67 ? 'NE' : compassDeg < 112 ? 'E' : compassDeg < 157 ? 'SE' : compassDeg < 202 ? 'S' : compassDeg < 247 ? 'SW' : compassDeg < 292 ? 'W' : 'NW'}
          </div>
          <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all duration-75" style={{ width: `${(compassDeg / 360) * 100}%` }} />
          </div>
          {skyboxLabel && (
            <div className="text-[10px] font-mono text-slate-400 mt-1 tracking-wider uppercase">
              ENV: <span className="text-amber-400">{skyboxLabel}</span> [V]
            </div>
          )}
          {acousticState && (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-300 mt-0.5 tracking-wider uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${acousticState.zone === 'CONCRETE_BUNKER' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <span>
                ACOUSTICS: {acousticState.zone.replace('_', ' ')} [RT60: {acousticState.reverbDecayTime}s]
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

      {/* WEAPON INSPECT OVERLAY BADGE */}
      {stats.isInspecting && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-950/90 border border-cyan-500/80 rounded-lg text-center z-30 shadow-2xl pointer-events-none">
          <div className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>INSPECTING WEAPON CHASSIS</span>
          </div>
          <div className="font-tactical font-black text-sm text-white tracking-wider mt-0.5">{activeWeaponName}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            {stats.currentWeaponIndex === 0 ? 'CALIBER: 5.56x45MM NATO · MODULAR AR PLATFORM' : 'CALIBER: 9x19MM · TACTICAL SIDEARM'}
          </div>
        </div>
      )}

      {/* CENTER: Dynamic Tactical Crosshair & Hitmarkers */}
      {!stats.isAiming && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Top Line */}
          <div
            className="absolute w-0.5 h-3 bg-white/90 -translate-x-1/2 rounded-full transition-all duration-75"
            style={{ bottom: `${crosshairGap}px` }}
          />
          {/* Bottom Line */}
          <div
            className="absolute w-0.5 h-3 bg-white/90 -translate-x-1/2 rounded-full transition-all duration-75"
            style={{ top: `${crosshairGap}px` }}
          />
          {/* Left Line */}
          <div
            className="absolute h-0.5 w-3 bg-white/90 -translate-y-1/2 rounded-full transition-all duration-75"
            style={{ right: `${crosshairGap}px` }}
          />
          {/* Right Line */}
          <div
            className="absolute h-0.5 w-3 bg-white/90 -translate-y-1/2 rounded-full transition-all duration-75"
            style={{ left: `${crosshairGap}px` }}
          />
          {/* Center Precision Dot */}
          <div className="w-1 h-1 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
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

      {/* BOTTOM CLUSTERS: Health/Armor (Left) & Ammo/Weapon (Right) */}
      <div className="w-full flex items-end justify-between relative z-10">
        {/* Bottom-Left: Vital Gauges (Health, Armor Plates, Stamina) */}
        <div className="bg-slate-950/85 border border-slate-800/90 p-3.5 rounded-lg max-w-xs shadow-xl">
          {/* Health Gauge */}
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-slate-400 font-semibold">VITALS</span>
            <span className={`font-bold tabular-nums text-sm ${stats.health <= 30 ? 'text-red-500' : 'text-slate-100'}`}>
              {Math.round(stats.health)}%
            </span>
          </div>
          <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden mb-2.5">
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
          <div className="grid grid-cols-3 gap-1.5 w-48 h-1.5 mb-2.5">
            <div className={`rounded-full ${stats.armor > 0 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            <div className={`rounded-full ${stats.armor > 33 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            <div className={`rounded-full ${stats.armor > 66 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
          </div>

          {/* Stamina Meter */}
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400 transition-all duration-75" style={{ width: `${stats.stamina}%` }} />
          </div>
        </div>

        {/* Bottom-Right: Active Weapon Rig, Ammo & Grenade Readout */}
        <div className="bg-slate-950/85 border border-slate-800/90 p-4 rounded-lg shadow-xl text-right">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-0.5">
            {activeWeaponName}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mb-1">
            {stats.currentWeaponIndex === 0 ? '5.56x45MM NATO // AUTO' : '9x19MM PARABELLUM // SEMI'}
          </div>

          {/* Main Ammo Counter with tabular-nums */}
          <div className="flex items-baseline justify-end gap-2 font-mono">
            {stats.isReloading ? (
              <span className="font-tactical text-2xl font-bold text-amber-400 tracking-wider">RELOADING...</span>
            ) : (
              <>
                <span
                  className={`font-tactical font-black text-4xl tabular-nums ${
                    stats.currentMag <= 5 ? 'text-red-500' : 'text-slate-100'
                  }`}
                >
                  {stats.currentMag}
                </span>
                <span className="text-xl text-slate-400 font-bold tabular-nums">/ {stats.reserveAmmo}</span>
              </>
            )}
          </div>

          {/* Tactical Equipment (Grenades & Stance) */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <Bomb className="w-3.5 h-3.5 text-amber-400" />
              <span>[G] x{stats.grenades}</span>
            </div>
            <div className="text-slate-400">
              <span>[C] {stats.isCrouching ? 'CROUCH' : 'STAND'}</span>
            </div>
            <div className="text-cyan-400/90">
              <span>[I] INSPECT</span>
            </div>
            <div className="text-slate-400">
              <span>[1/2] SWAP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
