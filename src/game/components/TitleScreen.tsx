import React from 'react';
import { Volume2, VolumeX, Shield, Play, Users, ShoppingBag, Award, Crosshair } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface TitleScreenProps {
  onStartCampaign: () => void;
  onOpenMultiplayer: () => void;
  onOpenGunsmith: () => void;
  onOpenBattlePass: () => void;
  onOpenSocial: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  skyboxLabel?: string;
  onCycleSkybox?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartCampaign,
  onOpenMultiplayer,
  onOpenGunsmith,
  onOpenBattlePass,
  onOpenSocial,
  isMuted,
  onToggleMute,
  skyboxLabel,
  onCycleSkybox,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-12 pointer-events-none select-none">
      {/* Top Header: Tactical Status & Audio Toggle */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>UNREAL ENGINE 5 SHADER PIPELINE // 128-TICK ONLINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded text-xs font-mono text-slate-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>CROSS-PLAY: ACTIVE</span>
          </div>
          {onCycleSkybox && (
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onCycleSkybox();
              }}
              className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 text-amber-400 rounded text-xs font-mono transition-colors"
            >
              <span>SKYBOX: {skyboxLabel || 'GOLDEN DUSK'} [V]</span>
            </button>
          )}
        </div>

        <button
          onClick={onToggleMute}
          className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 rounded text-xs font-mono transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span>{isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE'}</span>
        </button>
      </div>

      {/* Center Left: Bespoke Inline SVG Title Lockup over 35% negative space */}
      <div className="max-w-2xl my-auto">
        <div className="mb-3 flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-widest uppercase">
          <Crosshair className="w-4 h-4" />
          <span>TACTICAL FIRST-PERSON WARFARE // MODERN OPERATIONAL THEATER</span>
        </div>

        {/* Bespoke SVG Title Lockup */}
        <div className="relative mb-6">
          <svg viewBox="0 0 760 130" className="w-full max-w-xl h-auto drop-shadow-2xl">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="68"
              fill="url(#titleGrad)"
              className="font-tactical font-black tracking-wider"
              style={{ fontSize: '64px', fontWeight: 900, letterSpacing: '4px' }}
            >
              PROJECT VANGUARD
            </text>
            <text
              x="2"
              y="112"
              fill="url(#accentGrad)"
              className="font-tactical font-extrabold tracking-widest"
              style={{ fontSize: '32px', letterSpacing: '10px' }}
            >
              ZERO HOUR
            </text>
            <line x1="280" y1="104" x2="740" y2="104" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.4" />
          </svg>
        </div>

        <p className="text-sm md:text-base text-slate-300 font-sans leading-relaxed max-w-lg mb-8 drop-shadow">
          Deploy into modern combat operations featuring realistic rigid-body physics, destructible cover, and multi-stage tactical missions across hostile sectors.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3.5 pointer-events-auto">
          {/* Primary Start CTA */}
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onStartCampaign();
            }}
            className="flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-tactical font-bold text-base tracking-wider rounded transition-transform active:scale-95 shadow-lg shadow-cyan-500/25"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DEPLOY CAMPAIGN [SPACE]</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenMultiplayer();
            }}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>MULTIPLAYER DEDICATED</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenGunsmith();
            }}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>GUNSMITH & STORE</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenBattlePass();
            }}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <Award className="w-4 h-4 text-purple-400" />
            <span>BATTLE PASS S1</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenSocial();
            }}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>SQUADS & RANKINGS</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer: Single Flat Control-Hint Line */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs font-mono text-slate-400">
        <div>
          <span>WASD Move · Click Fire · Right-Click ADS · I Inspect · Shift Sprint · C Crouch · R Reload · Esc Pause</span>
        </div>
        <div className="hidden sm:block text-slate-500">
          <span>PROJECT VANGUARD // BUILD v1.0.4-TACTICAL</span>
        </div>
      </div>
    </div>
  );
};
