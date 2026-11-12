import React from 'react';
import { RotateCcw, Home, Skull, Target, Clock, ShieldAlert } from 'lucide-react';
import { PlayerStats } from '../types';

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onExitToMenu,
}) => {
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const timeFormatted = `${Math.floor(stats.timeElapsed / 60)}m ${Math.floor(stats.timeElapsed % 60)}s`;

  return (
    <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
      <div className="bg-slate-950 border border-red-900/60 rounded-lg max-w-lg w-full p-6 shadow-2xl text-center">
        {/* Header */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center">
            <Skull className="w-7 h-7 text-red-500" />
          </div>
        </div>

        <div className="font-tactical font-black text-3xl text-red-500 tracking-wider mb-1">
          KILLED IN ACTION
        </div>
        <div className="text-xs font-mono text-slate-400 mb-6 uppercase tracking-widest">
          OPERATION TERMINATED // SQUAD WIPED
        </div>

        {/* Combat Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/70 border border-slate-800 p-3 rounded text-left">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-0.5">
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span>ELIMINATIONS</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{stats.kills}</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-3 rounded text-left">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-0.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>HEADSHOTS</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{stats.headshots}</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-3 rounded text-left">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>WEAPON ACCURACY</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{accuracy}%</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-3 rounded text-left">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>TIME SURVIVED</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{timeFormatted}</div>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white font-tactical font-bold text-sm tracking-wider rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REDEPLOY [SPACE]</span>
          </button>

          <button
            onClick={onExitToMenu}
            className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
