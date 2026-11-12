import React from 'react';
import { Skull, Target, AlertTriangle, FastForward } from 'lucide-react';
import { KillerInfo } from '../types';

interface DeathCamOverlayProps {
  killer: KillerInfo | null;
  progress: number; // 0.0 to 1.0
  onSkip: () => void;
}

export const DeathCamOverlay: React.FC<DeathCamOverlayProps> = ({
  killer,
  progress,
  onSkip,
}) => {
  const killerTitle = killer
    ? killer.type === 'drone'
      ? 'AUTONOMOUS RECON DRONE // UNIT #8'
      : 'APEX SYNDICATE SENTRY // RIFLEMAN'
    : 'HOSTILE COMBATANT';

  const killerDist = killer ? killer.distance.toFixed(1) : '18.5';

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
      {/* Heavy Death Red Vignette Overlay */}
      <div className="absolute inset-0 hit-flash-effect opacity-80" />
      <div className="absolute inset-0 bg-red-950/20 mix-blend-multiply" />

      {/* Top Letterbox Bar */}
      <div className="w-full bg-black/90 border-b border-red-900/60 py-3 px-6 md:px-12 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-red-950 border border-red-500 flex items-center justify-center">
            <Skull className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tactical font-black text-sm md:text-base text-red-500 tracking-wider">
                DEATH CAMERA // KILLER LOCATED
              </span>
              <span className="px-1.5 py-0.5 bg-red-900/60 border border-red-600 rounded text-[9px] font-mono text-red-300">
                FATAL TRAJECTORY
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              ELIMINATED BY: <span className="text-white font-bold">{killerTitle}</span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-right font-mono text-xs">
          <div>
            <div className="text-slate-400 text-[10px]">LETHAL DISTANCE</div>
            <div className="text-red-400 font-bold tabular-nums">{killerDist} METERS</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">STATUS</div>
            <div className="text-red-500 font-bold">VANGUARD KIA</div>
          </div>
        </div>
      </div>

      {/* Center Reticle Tracking Bracket on Killer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
        <div className="w-24 h-24 border-2 border-red-500/80 rounded-lg relative flex items-center justify-center animate-pulse">
          {/* Corner brackets */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-400" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-400" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-400" />
          <Target className="w-6 h-6 text-red-500" />
        </div>
        <div className="mt-2 px-2.5 py-0.5 bg-red-950/90 border border-red-600 rounded text-[10px] font-mono text-red-300 tracking-wider uppercase">
          HOSTILE LOCK // {killerDist}M
        </div>
      </div>

      {/* Bottom Letterbox Bar & Skip Button */}
      <div className="w-full bg-black/90 border-t border-red-900/60 py-3.5 px-6 md:px-12 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>REPLAYING FATAL ENGAGEMENT // REWINDING SENSORS</span>
        </div>

        {/* Progress Countdown Bar */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-44 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-red-600 transition-all duration-75"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        </div>

        {/* Skip to Debrief Button */}
        <button
          onClick={onSkip}
          className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-600 rounded text-xs font-tactical font-bold text-red-200 tracking-wider transition-colors shadow-lg shadow-red-950/40"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>SKIP TO AFTER-ACTION [SPACE]</span>
        </button>
      </div>
    </div>
  );
};
