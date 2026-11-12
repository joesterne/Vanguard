import React, { useState, useEffect } from 'react';
import { Server, Users, Shield, Play, Globe, X, Check, Loader2 } from 'lucide-react';
import { DEDICATED_SERVERS, MULTIPLAYER_MODES } from '../data/multiplayerData';
import { soundEngine } from '../audio/SoundEngine';

interface MultiplayerLobbyModalProps {
  onClose: () => void;
  onLaunchMatch: (modeId: string) => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  onClose,
  onLaunchMatch,
}) => {
  const [selectedServer, setSelectedServer] = useState(DEDICATED_SERVERS[0]);
  const [selectedMode, setSelectedMode] = useState(MULTIPLAYER_MODES[0].id);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(0);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isSearching) {
      interval = window.setInterval(() => {
        setSearchTimer((prev) => {
          if (prev >= 3) {
            setMatchFound(true);
            setIsSearching(false);
            soundEngine.playRadioPing();
            return 3;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleStartSearch = () => {
    soundEngine.playUIClick();
    setIsSearching(true);
    setSearchTimer(0);
    setMatchFound(false);
  };

  const handleConnectNow = () => {
    soundEngine.playUIClick();
    onLaunchMatch(selectedMode);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-4xl w-full p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-tactical font-black text-2xl text-white tracking-wider">
                MULTIPLAYER OPS // DEDICATED SERVERS
              </div>
              <div className="text-xs font-mono text-cyan-400">
                128-TICK ARCHITECTURE · SKILL-BASED MATCHMAKING (SBMM) · CROSS-PLAY ENABLED
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] font-mono text-slate-400">SELECTED REGION</div>
              <div className="font-tactical font-bold text-sm text-slate-100">{selectedServer.name}</div>
              <div className="text-[11px] font-mono text-emerald-400">{selectedServer.ping}ms · {selectedServer.tickRate} Tick</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] font-mono text-slate-400">SBMM RATING (MMR)</div>
              <div className="font-tactical font-bold text-sm text-slate-100">Apex Tier // 2,480 MMR</div>
              <div className="text-[11px] font-mono text-purple-400">Strict Skill Balance: ON</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] font-mono text-slate-400">CROSS-PLATFORM POOL</div>
              <div className="font-tactical font-bold text-sm text-slate-100">PC / PS5 / XBOX</div>
              <div className="text-[11px] font-mono text-slate-400">Input: Controller + KBM</div>
            </div>
          </div>
        </div>

        {/* Main Content: Mode Selection & Server Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Mode Selection */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Select Tactical Game Mode:</div>
            <div className="space-y-2.5">
              {MULTIPLAYER_MODES.map((m) => {
                const isSelected = selectedMode === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      soundEngine.playUIClick();
                      setSelectedMode(m.id);
                    }}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-tactical font-bold text-sm text-white tracking-wide">{m.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-xs text-slate-400">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Dedicated Server Regions & Match Status */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Dedicated Server Cluster:</div>
            <div className="space-y-2 mb-6">
              {DEDICATED_SERVERS.map((srv) => {
                const isCurrent = selectedServer.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      soundEngine.playUIClick();
                      setSelectedServer(srv);
                    }}
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-slate-900 border-cyan-500'
                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{srv.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{srv.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">{srv.ping}ms</div>
                      <div className="text-[10px] font-mono text-slate-400">{srv.tickRate}-Tick Dedicated</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matchmaking Queue Status Card */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
              {matchFound ? (
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500 rounded text-xs font-mono text-emerald-400 mb-2">
                    <Check className="w-3.5 h-3.5" />
                    <span>LOBBY ALLOCATED // MATCH READY</span>
                  </div>
                  <div className="font-tactical font-bold text-lg text-white mb-3">
                    TACTICAL SKIRMISH READY
                  </div>
                  <button
                    onClick={handleConnectNow}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-tactical font-black text-sm tracking-wider rounded transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ENTER SKIRMISH COMBAT NOW</span>
                  </button>
                </div>
              ) : isSearching ? (
                <div className="text-center py-3">
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mx-auto mb-2" />
                  <div className="font-tactical font-bold text-sm text-cyan-400 tracking-wider">
                    EVALUATING SKILL-BASED MATCHMAKING POOL...
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Queue Time: 0:0{searchTimer} · Dedicated Tick: 128Hz
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    Join dedicated 128-tick PvP server simulation with skill-balanced tactical operative AI.
                  </div>
                  <button
                    onClick={handleStartSearch}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-tactical font-bold text-sm tracking-wider rounded transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>FIND MATCH [SBMM QUEUE]</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>SERVER ID: {selectedServer.id.toUpperCase()}-VA-PROD-01</span>
          <span>NETCODE: CLIENT-PREDICTED 128HZ SUB-TICK</span>
        </div>
      </div>
    </div>
  );
};
