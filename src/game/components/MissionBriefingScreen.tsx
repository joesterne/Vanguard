import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  ShieldAlert,
  Radar,
  Navigation,
  Cpu,
  Target,
  ChevronRight,
  ArrowLeft,
  Play,
  Compass,
  Eye,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CampaignMission,
  MissionObjective,
  EnemyIntelProfile,
  InsertionPoint,
} from '../types';
import { soundEngine } from '../audio/SoundEngine';

interface MissionBriefingScreenProps {
  missions: CampaignMission[];
  selectedMissionIndex: number;
  onSelectMission: (index: number) => void;
  onConfirmDeploy: (spawnPos: { x: number; y: number; z: number }) => void;
  onBackToMenu: () => void;
  onFocusCameraTarget: (target: { x: number; y: number; z: number } | null) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MissionBriefingScreen: React.FC<MissionBriefingScreenProps> = ({
  missions,
  selectedMissionIndex,
  onSelectMission,
  onConfirmDeploy,
  onBackToMenu,
  onFocusCameraTarget,
  isMuted,
  onToggleMute,
}) => {
  const mission = missions[selectedMissionIndex] || missions[0];

  const [selectedObjectiveIdx, setSelectedObjectiveIdx] = useState<number>(0);
  const [selectedIntelIdx, setSelectedIntelIdx] = useState<number>(0);
  const [selectedInsertionIdx, setSelectedInsertionIdx] = useState<number>(0);
  const [activeHoloTab, setActiveHoloTab] = useState<'map' | 'schematic'>('map');

  // Reset indices when switching missions
  useEffect(() => {
    setSelectedObjectiveIdx(0);
    setSelectedIntelIdx(0);
    setSelectedInsertionIdx(0);
    const firstObj = mission.objectives[0];
    if (firstObj?.cameraFocus) {
      onFocusCameraTarget(firstObj.cameraFocus);
    } else {
      onFocusCameraTarget(null);
    }
  }, [selectedMissionIndex, mission]);

  const activeObjective: MissionObjective =
    mission.objectives[selectedObjectiveIdx] || mission.objectives[0];
  const activeIntel: EnemyIntelProfile =
    mission.enemyIntel[selectedIntelIdx] || mission.enemyIntel[0];
  const activeInsertion: InsertionPoint =
    mission.insertionPoints[selectedInsertionIdx] || mission.insertionPoints[0];

  const handleSelectObjective = (idx: number) => {
    soundEngine.playHoloScan();
    setSelectedObjectiveIdx(idx);
    const obj = mission.objectives[idx];
    if (obj?.cameraFocus) {
      onFocusCameraTarget(obj.cameraFocus);
    }
  };

  const handleSelectIntel = (idx: number) => {
    soundEngine.playHoloScan();
    setSelectedIntelIdx(idx);
    setActiveHoloTab('schematic');
  };

  const handleSelectInsertion = (idx: number) => {
    soundEngine.playHoloScan();
    setSelectedInsertionIdx(idx);
    const ins = mission.insertionPoints[idx];
    if (ins) {
      onFocusCameraTarget(ins.spawnPos);
    }
  };

  const totalHostiles = mission.enemyIntel.reduce((acc, item) => acc + item.countInSector, 0);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none holo-scanlines">
      {/* Subtle Dark Radial Backdrop that preserves live 3D Satellite Camera Feed */}
      <div className="absolute inset-0 bg-slate-950/65 pointer-events-none" />
      <div className="absolute inset-0 holo-grid-bg pointer-events-none opacity-60" />

      {/* TOP COMMAND HEADER */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 holo-panel rounded-lg px-5 py-3.5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onBackToMenu();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>COMMAND MENU [ESC]</span>
          </button>

          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 tracking-widest uppercase">
              <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>TACTICAL HOLOGRAPHIC BRIEFING TERMINAL</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{mission.coordinates}</span>
            </div>
            <div className="flex items-baseline gap-3 mt-0.5">
              <h1 className="font-tactical font-black text-xl md:text-2xl text-white tracking-wider uppercase holo-text-glow">
                {mission.title}
              </h1>
              <span className="text-xs font-mono text-cyan-300">
                CODENAME: {mission.codename}
              </span>
            </div>
          </div>
        </div>

        {/* Operation Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950/90 border border-cyan-500/30 rounded-lg">
            {missions.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => {
                  soundEngine.playHoloScan();
                  onSelectMission(idx);
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  idx === selectedMissionIndex
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-cyan-300/80 hover:text-white hover:bg-cyan-950/50'
                }`}
              >
                0{idx + 1}. {m.codename}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN HOLOGRAPHIC WORKSPACE */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-3 my-2.5 flex-1 min-h-0 overflow-y-auto">
        {/* LEFT COLUMN (4 cols): MISSION OBJECTIVES & INSERTION VECTOR */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* Operational Synopsis */}
          <div className="holo-panel rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
              <span className="uppercase tracking-wider font-semibold">Operational Sitrep</span>
              <span className="text-slate-400">
                {mission.difficulty} · {mission.estimatedTime}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-snug mb-2">
              {mission.briefing}
            </p>
            <div className="text-[11px] font-mono text-cyan-200/90 border-l-2 border-cyan-400 pl-2.5 py-0.5 leading-snug">
              {mission.commandDirective}
            </div>
          </div>

          {/* Interactive Objectives List */}
          <div className="holo-panel rounded-lg p-3.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2">
                <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                  <Target className="w-3.5 h-3.5" />
                  <span>Tactical Objectives ({mission.objectives.length})</span>
                </div>
                <span className="text-[10px] text-slate-400">Select for Recon</span>
              </div>

              <div className="space-y-1.5">
                {mission.objectives.map((obj, idx) => {
                  const isSelected = idx === selectedObjectiveIdx;
                  return (
                    <button
                      key={obj.id}
                      onClick={() => handleSelectObjective(idx)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? 'holo-panel-active'
                          : 'bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-cyan-400 tabular-nums shrink-0">
                            0{idx + 1}.
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {obj.text}
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                        <span className="text-cyan-300/90">{obj.sectorName || 'Primary Sector'}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {obj.optional
                            ? 'Optional Directive'
                            : `Target Count: ${obj.targetProgress ?? 1}`}
                        </span>
                      </div>

                      {isSelected && obj.tacticalNote && (
                        <div className="mt-1.5 pt-1.5 border-t border-cyan-500/25 text-[11px] text-cyan-100/90 leading-snug">
                          {obj.tacticalNote}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Tactical Insertion Selector */}
          <div className="holo-panel rounded-lg p-3">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1.5">
              <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Navigation className="w-3.5 h-3.5" />
                <span>Insertion Vector Selection</span>
              </div>
              <span className="text-emerald-400 font-bold">{activeInsertion.sectorCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              {mission.insertionPoints.map((ins, idx) => (
                <button
                  key={ins.id}
                  onClick={() => handleSelectInsertion(idx)}
                  className={`py-1.5 px-2.5 rounded text-left font-mono transition-all cursor-pointer border ${
                    idx === selectedInsertionIdx
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900/75 border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold">{ins.sectorCode}</div>
                  <div className="text-[11px] truncate text-white">{ins.name}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-300 leading-snug">
              {activeInsertion.description}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (4 cols): INTERACTIVE HOLOGRAPHIC TACTICAL TOPOGRAPHY & LIVE 3D SATELLITE VIEWPORT */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="holo-panel rounded-lg p-4 flex-1 flex flex-col justify-between min-h-[320px]">
            {/* Top Mode Switcher */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    Holographic Sector Recon
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {mission.location}
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-950/90 border border-cyan-500/30 rounded">
                  <button
                    onClick={() => {
                      soundEngine.playHoloScan();
                      setActiveHoloTab('map');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                      activeHoloTab === 'map'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-cyan-300 hover:text-white'
                    }`}
                  >
                    SECTOR GRID
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playHoloScan();
                      setActiveHoloTab('schematic');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                      activeHoloTab === 'schematic'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-cyan-300 hover:text-white'
                    }`}
                  >
                    THREAT MODEL
                  </button>
                </div>
              </div>

              {/* INTERACTIVE HOLOGRAPHIC DISPLAY */}
              {activeHoloTab === 'map' ? (
                <div className="relative w-full aspect-square max-h-[310px] mx-auto rounded-lg border border-cyan-500/40 bg-slate-950/75 overflow-hidden">
                  {/* SVG Wireframe Tactical Map */}
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    aria-label="Holographic Sector Tactical Map"
                  >
                    {/* Radar Range Rings */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.14)"
                      strokeWidth="0.4"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="26"
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.18)"
                      strokeWidth="0.4"
                    />
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="100"
                      stroke="rgba(34, 211, 238, 0.12)"
                      strokeWidth="0.3"
                    />
                    <line
                      x1="0"
                      y1="50"
                      x2="100"
                      y2="50"
                      stroke="rgba(34, 211, 238, 0.12)"
                      strokeWidth="0.3"
                    />

                    {/* North Command Bunker Blueprint Wireframe */}
                    <rect
                      x="30"
                      y="12"
                      width="40"
                      height="16"
                      fill="rgba(6, 182, 212, 0.12)"
                      stroke="rgba(34, 211, 238, 0.65)"
                      strokeWidth="0.7"
                    />
                    <text
                      x="50"
                      y="19"
                      textAnchor="middle"
                      fill="rgba(165, 243, 252, 0.85)"
                      fontSize="3.2"
                      fontFamily="monospace"
                    >
                      COMMAND BUNKER
                    </text>

                    {/* West Shipping Container Stack */}
                    <rect
                      x="14"
                      y="38"
                      width="14"
                      height="22"
                      fill="rgba(6, 182, 212, 0.08)"
                      stroke="rgba(34, 211, 238, 0.45)"
                      strokeWidth="0.5"
                    />
                    <text
                      x="21"
                      y="50"
                      textAnchor="middle"
                      fill="rgba(165, 243, 252, 0.6)"
                      fontSize="2.6"
                      fontFamily="monospace"
                    >
                      WEST CARGO
                    </text>

                    {/* East Shipping Container & MATV Stack */}
                    <rect
                      x="70"
                      y="40"
                      width="16"
                      height="20"
                      fill="rgba(6, 182, 212, 0.08)"
                      stroke="rgba(34, 211, 238, 0.45)"
                      strokeWidth="0.5"
                    />
                    <text
                      x="78"
                      y="51"
                      textAnchor="middle"
                      fill="rgba(165, 243, 252, 0.6)"
                      fontSize="2.6"
                      fontFamily="monospace"
                    >
                      EAST DEPOT
                    </text>

                    {/* Central Jersey Barrier Line */}
                    <line
                      x1="34"
                      y1="58"
                      x2="46"
                      y2="58"
                      stroke="rgba(251, 191, 36, 0.7)"
                      strokeWidth="1.2"
                    />
                    <line
                      x1="54"
                      y1="58"
                      x2="66"
                      y2="58"
                      stroke="rgba(251, 191, 36, 0.7)"
                      strokeWidth="1.2"
                    />

                    {/* Line connecting Selected Insertion LZ to Selected Objective */}
                    {activeInsertion?.mapCoords && activeObjective?.mapCoords && (
                      <line
                        x1={activeInsertion.mapCoords.x}
                        y1={activeInsertion.mapCoords.y}
                        x2={activeObjective.mapCoords.x}
                        y2={activeObjective.mapCoords.y}
                        stroke="rgba(52, 211, 153, 0.75)"
                        strokeWidth="0.7"
                        strokeDasharray="1.8 1.4"
                      />
                    )}
                  </svg>

                  {/* Interactive Objective Nodes Overlaid on Map */}
                  {mission.objectives.map((obj, idx) => {
                    const coords = obj.mapCoords || { x: 50, y: 50 };
                    const isSelected = idx === selectedObjectiveIdx;
                    return (
                      <button
                        key={obj.id}
                        onClick={() => handleSelectObjective(idx)}
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                        className={`-translate-x-1/2 -translate-y-1/2 absolute flex items-center justify-center w-7 h-7 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/35 scale-110 z-20'
                            : 'bg-slate-900/90 text-cyan-300 border border-cyan-400/70 hover:scale-110 z-10'
                        }`}
                        title={obj.text}
                      >
                        0{idx + 1}
                      </button>
                    );
                  })}

                  {/* Interactive Insertion Point Markers */}
                  {mission.insertionPoints.map((ins, idx) => {
                    const isSelected = idx === selectedInsertionIdx;
                    return (
                      <button
                        key={ins.id}
                        onClick={() => handleSelectInsertion(idx)}
                        style={{ left: `${ins.mapCoords.x}%`, top: `${ins.mapCoords.y}%` }}
                        className={`-translate-x-1/2 -translate-y-1/2 absolute px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/30 z-20'
                            : 'bg-slate-900/90 text-emerald-400 border border-emerald-500/60 hover:bg-emerald-950 z-10'
                        }`}
                        title={ins.name}
                      >
                        {ins.sectorCode}
                      </button>
                    );
                  })}

                  {/* Bottom Map Legend Bar */}
                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2.5 py-1 rounded bg-slate-950/85 border border-cyan-500/20 text-[10px] font-mono text-slate-300">
                    <span>CLICK WAYPOINTS TO PAN 3D SATELLITE CAM</span>
                    <span className="text-cyan-400">GRID 100M</span>
                  </div>
                </div>
              ) : (
                /* HOLOGRAPHIC 3D WIREFRAME THREAT SCHEMATIC */
                <div className="relative w-full aspect-square max-h-[310px] mx-auto rounded-lg border border-cyan-500/40 bg-slate-950/80 flex flex-col items-center justify-center p-4 overflow-hidden">
                  <svg
                    viewBox="0 0 120 120"
                    className="w-48 h-48"
                    aria-label="Hostile Unit Holographic Wireframe"
                  >
                    {/* Outer Target Reticle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.2)"
                      strokeWidth="0.6"
                      strokeDasharray="4 2"
                    />
                    {activeIntel.type === 'drone' ? (
                      <g stroke="rgba(34, 211, 238, 0.85)" fill="none" strokeWidth="1.2">
                        {/* Quad-Rotor Autonomous Drone Wireframe */}
                        <circle cx="60" cy="60" r="14" fill="rgba(6, 182, 212, 0.15)" />
                        <line x1="28" y1="28" x2="92" y2="92" />
                        <line x1="92" y1="28" x2="28" y2="92" />
                        <circle cx="28" cy="28" r="11" strokeDasharray="2 1" />
                        <circle cx="92" cy="28" r="11" strokeDasharray="2 1" />
                        <circle cx="28" cy="92" r="11" strokeDasharray="2 1" />
                        <circle cx="92" cy="92" r="11" strokeDasharray="2 1" />
                        {/* Weakpoint Optical Core */}
                        <circle
                          cx="60"
                          cy="60"
                          r="5"
                          fill="rgba(239, 68, 68, 0.45)"
                          stroke="#f87171"
                          strokeWidth="1.4"
                        />
                      </g>
                    ) : activeIntel.type === 'breacher' ? (
                      <g stroke="rgba(34, 211, 238, 0.85)" fill="none" strokeWidth="1.2">
                        {/* Heavy Armored Breacher Silhouette */}
                        <rect
                          x="40"
                          y="38"
                          width="40"
                          height="46"
                          rx="4"
                          fill="rgba(6, 182, 212, 0.15)"
                        />
                        <path d="M32 42 L40 38 L40 72 L32 68 Z" fill="rgba(6, 182, 212, 0.25)" />
                        <path d="M88 42 L80 38 L80 72 L88 68 Z" fill="rgba(6, 182, 212, 0.25)" />
                        <circle
                          cx="60"
                          cy="24"
                          r="10"
                          fill="rgba(239, 68, 68, 0.35)"
                          stroke="#f87171"
                        />
                        <line x1="48" y1="84" x2="46" y2="110" strokeWidth="3" />
                        <line x1="72" y1="84" x2="74" y2="110" strokeWidth="3" />
                      </g>
                    ) : (
                      <g stroke="rgba(34, 211, 238, 0.85)" fill="none" strokeWidth="1.2">
                        {/* Standard Tactical Rifleman Wireframe */}
                        <rect
                          x="45"
                          y="40"
                          width="30"
                          height="42"
                          rx="3"
                          fill="rgba(6, 182, 212, 0.12)"
                        />
                        <circle
                          cx="60"
                          cy="24"
                          r="9"
                          fill="rgba(239, 68, 68, 0.35)"
                          stroke="#f87171"
                        />
                        <line x1="36" y1="44" x2="45" y2="40" />
                        <line x1="84" y1="44" x2="75" y2="40" />
                        <line x1="50" y1="82" x2="48" y2="110" strokeWidth="2" />
                        <line x1="70" y1="82" x2="72" y2="110" strokeWidth="2" />
                      </g>
                    )}
                  </svg>

                  <div className="text-center mt-1">
                    <div className="text-xs font-mono font-bold text-cyan-300 uppercase">
                      {activeIntel.designation}
                    </div>
                    <div className="text-[11px] font-mono text-red-400">
                      CRITICAL WEAKPOINT: {activeIntel.weakpoint}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Recon Telemetry Footer */}
            <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">ACTIVE RECON FOCUS</span>
                <span className="text-cyan-300 font-bold">
                  {activeObjective?.sectorName || 'Compound Center'}
                </span>
              </div>
              <button
                onClick={() => {
                  soundEngine.playHoloScan();
                  onFocusCameraTarget(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-[11px] text-cyan-300 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ORBIT OVERVIEW</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): ENEMY INTELLIGENCE DOSSIER */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pl-0.5">
          <div className="holo-panel rounded-lg p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2.5">
                <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hostile Intelligence Dossier</span>
                </div>
                <span className="text-amber-300 font-bold tabular-nums">
                  {totalHostiles} Hostiles Confirmed
                </span>
              </div>

              {/* Hostile Archetype Selector Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {mission.enemyIntel.map((intel, idx) => {
                  const isSelected = idx === selectedIntelIdx;
                  return (
                    <button
                      key={intel.designation}
                      onClick={() => handleSelectIntel(idx)}
                      className={`p-2.5 rounded text-left font-mono transition-all cursor-pointer border ${
                        isSelected
                          ? 'holo-panel-active text-white'
                          : 'bg-slate-900/70 border-cyan-500/20 text-slate-400 hover:border-cyan-400/50 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-0.5">
                        <span className="uppercase">{intel.type}</span>
                        <span className="font-bold">x{intel.countInSector}</span>
                      </div>
                      <div className="text-[11px] font-bold truncate text-slate-100">
                        {intel.designation}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Hostile Detailed Breakdown */}
              <div className="bg-slate-950/75 border border-cyan-500/30 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-baseline justify-between border-b border-cyan-500/20 pb-2">
                  <div>
                    <h2 className="font-tactical font-bold text-base text-white tracking-wide uppercase">
                      {activeIntel.designation}
                    </h2>
                    <div className="text-[11px] font-mono text-cyan-300">
                      {activeIntel.role} · Threat Level: {activeIntel.threatLevel}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                    {activeIntel.countInSector} UNITS
                  </span>
                </div>

                {/* Combat Specifications */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-slate-400">Primary Armament:</span>
                    <span className="font-mono text-slate-200 text-right">
                      {activeIntel.primaryWeapon}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-slate-400">Ballistic Protection:</span>
                    <span className="font-mono text-slate-200 text-right">
                      {activeIntel.armorProfile}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-slate-400">Target Weakpoint:</span>
                    <span className="font-mono text-red-400 font-semibold text-right">
                      {activeIntel.weakpoint}
                    </span>
                  </div>
                </div>

                {/* Telemetry Bars */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                      <span>LETHALITY INDEX</span>
                      <span className="text-cyan-300 tabular-nums">{activeIntel.stats.lethality}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${activeIntel.stats.lethality}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                      <span>ARMOR RATING</span>
                      <span className="text-cyan-300 tabular-nums">{activeIntel.stats.armor}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${activeIntel.stats.armor}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                      <span>MOBILITY & SPEED</span>
                      <span className="text-cyan-300 tabular-nums">{activeIntel.stats.mobility}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{ width: `${activeIntel.stats.mobility}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tactical Counter-Measure Advisory */}
                <div className="pt-2 border-t border-cyan-500/20">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase mb-0.5">
                    Counter-Tactical Advisory
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeIntel.tacticalAdvisory}
                  </p>
                </div>
              </div>
            </div>

            {/* Environmental Conditions Readout */}
            <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>{mission.weather}</span>
              </div>
              <span className="text-cyan-400">ACOUSTIC SIM READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM DEPLOYMENT BAR */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 holo-panel rounded-lg px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400">INSERTION LZ: </span>
            <span className="text-emerald-400 font-bold">
              {activeInsertion.sectorCode} ({activeInsertion.name})
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>
            <span className="text-slate-400">PRIMARY KIT: </span>
            <span className="text-cyan-300 font-semibold">MK18-MOD1 CQB + M9A3 TACTICAL</span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>
            <span className="text-slate-400">ORDNANCE: </span>
            <span className="text-amber-300">2x M67 FRAG GRENADES</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEngine.playRadioPing();
              onConfirmDeploy(activeInsertion.spawnPos);
            }}
            className="flex items-center gap-3 px-7 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tactical font-black text-base tracking-wider uppercase shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>CONFIRM & DEPLOY TO SECTOR [SPACE]</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
