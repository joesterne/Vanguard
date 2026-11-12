import React from 'react';
import { Volume2, VolumeX, RotateCcw, Play, Home, Settings, Sun, Waves } from 'lucide-react';
import { CampaignMission, SkyboxEnvironmentPreset } from '../types';
import { AcousticState } from '../audio/SoundEngine';

interface PauseMenuProps {
  mission?: CampaignMission;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
  mouseSens: number;
  onSetMouseSens: (val: number) => void;
  fov: number;
  onSetFov: (val: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  skyboxPreset?: SkyboxEnvironmentPreset;
  onSelectSkyboxPreset?: (preset: SkyboxEnvironmentPreset) => void;
  acousticState?: AcousticState;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  mission,
  onResume,
  onRestart,
  onExitToMenu,
  mouseSens,
  onSetMouseSens,
  fov,
  onSetFov,
  isMuted,
  onToggleMute,
  skyboxPreset,
  onSelectSkyboxPreset,
  acousticState,
}) => {
  const skyPresets: { id: SkyboxEnvironmentPreset; label: string }[] = [
    { id: 'golden_dusk', label: 'GOLDEN DUSK' },
    { id: 'moonlit_night', label: 'MOONLIT NIGHT' },
    { id: 'crimson_storm', label: 'CRIMSON STORM' },
    { id: 'arctic_dawn', label: 'ARCTIC DAWN' },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/75 flex items-center justify-center p-6 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div>
            <div className="font-tactical font-black text-2xl text-white tracking-wider">TACTICAL PAUSE</div>
            <div className="text-xs font-mono text-cyan-400 mt-0.5">
              {mission ? `ACTIVE MISSION: ${mission.codename} // ${mission.title}` : 'SKIRMISH MODE'}
            </div>
          </div>
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 hover:bg-slate-800"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
          </button>
        </div>

        {/* Mission Objectives Status */}
        {mission && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded p-4 mb-5">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Objectives Breakdown:</div>
            <div className="space-y-1.5 text-sm">
              {mission.objectives.map((obj) => (
                <div key={obj.id} className="flex items-center justify-between text-xs">
                  <span className={obj.completed ? 'text-slate-500 line-through' : 'text-slate-200'}>
                    • {obj.text}
                  </span>
                  <span className="font-mono text-cyan-400">
                    {obj.completed ? 'COMPLETED' : `${obj.currentProgress ?? 0}/${obj.targetProgress ?? 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tactical Controls & Sliders */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span>Combat Settings & Atmosphere</span>
          </div>

          {onSelectSkyboxPreset && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 mb-2">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Dynamic Skybox & Mission Atmosphere [V]</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {skyPresets.map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => onSelectSkyboxPreset(sp.id)}
                    className={`py-2 px-2 rounded text-[11px] font-mono border transition-colors ${
                      skyboxPreset === sp.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Mouse Look Sensitivity</span>
              <span className="text-cyan-400 tabular-nums">{(mouseSens * 1000).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.005"
              step="0.0002"
              value={mouseSens}
              onChange={(e) => onSetMouseSens(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Field of View (FOV)</span>
              <span className="text-cyan-400 tabular-nums">{Math.round(fov)}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="95"
              step="1"
              value={fov}
              onChange={(e) => onSetFov(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Real-Time Acoustic & Occlusion Telemetry */}
          {acousticState && (
            <div className="bg-slate-900/70 border border-slate-800 rounded p-3 text-xs font-mono">
              <div className="flex items-center justify-between text-cyan-400 font-semibold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ACOUSTIC DSP & OCCLUSION ENGINE</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                  LIVE 3D
                </span>
              </div>
              <div className="text-slate-300 font-bold mb-1">
                {acousticState.zoneLabel}
              </div>
              <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                {acousticState.description}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">RT60 DECAY</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{acousticState.reverbDecayTime}s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ENCLOSURE</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{Math.round(acousticState.enclosureFactor * 100)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">REVERB WET</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{Math.round(acousticState.wetMix * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-tactical font-bold text-sm tracking-wider rounded transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART</span>
          </button>

          <button
            onClick={onExitToMenu}
            className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-tactical font-semibold text-sm tracking-wider rounded transition-colors"
          >
            <Home className="w-4 h-4 text-red-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
