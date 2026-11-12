import React, { useState } from 'react';
import { Users, Trophy, Shield, Mic, MicOff, UserPlus, X, Check, Monitor, Gamepad2 } from 'lucide-react';
import { SQUAD_MEMBERS, GLOBAL_LEADERBOARD } from '../data/multiplayerData';
import { soundEngine } from '../audio/SoundEngine';

interface SocialHubModalProps {
  onClose: () => void;
}

export const SocialHubModal: React.FC<SocialHubModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'squad' | 'leaderboards'>('squad');
  const [squad, setSquad] = useState(SQUAD_MEMBERS);
  const [inviteSent, setInviteSent] = useState(false);

  const handleToggleMic = (id: string) => {
    soundEngine.playUIClick();
    setSquad((prev) =>
      prev.map((m) => (m.id === id ? { ...m, micActive: !m.micActive } : m))
    );
  };

  const handleInviteFriend = () => {
    soundEngine.playRadioPing();
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-4xl w-full p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-tactical font-black text-2xl text-white tracking-wider">
                TACTICAL SOCIAL HUB & RANKINGS
              </div>
              <div className="text-xs font-mono text-emerald-400">
                CROSS-PLATFORM SQUAD FORMATION · GLOBAL APEX LEADERBOARDS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-1">
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('squad');
                }}
                className={`px-3 py-1 text-xs font-tactical font-bold rounded ${
                  activeTab === 'squad' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                FIRETEAM SQUAD
              </button>
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('leaderboards');
                }}
                className={`px-3 py-1 text-xs font-tactical font-bold rounded ${
                  activeTab === 'leaderboards' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                GLOBAL RANKINGS
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'squad' ? (
          <div>
            {/* Squad Controls Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Fireteam Roster [4/4 Operatives]:
              </div>
              <button
                onClick={handleInviteFriend}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-mono"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{inviteSent ? 'TACTICAL INVITE BROADCASTED' : 'INVITE OPERATIVE'}</span>
              </button>
            </div>

            {/* Squad Members Cards */}
            <div className="space-y-3 mb-6">
              {squad.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      {member.platform === 'PC' ? (
                        <Monitor className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Gamepad2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-tactical font-bold text-sm text-white">{member.name}</span>
                        {member.isLeader && (
                          <span className="px-1.5 py-0.5 bg-amber-950/80 border border-amber-600 rounded text-[9px] font-mono text-amber-400">
                            SQUAD LEADER
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        {member.platform} · {member.rank}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded border ${
                        member.status === 'Ready'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {member.status.toUpperCase()}
                    </span>

                    <button
                      onClick={() => handleToggleMic(member.id)}
                      className={`p-2 rounded border ${
                        member.micActive
                          ? 'bg-slate-800 border-slate-600 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                    >
                      {member.micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fireteam Dossier Summary */}
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">Fireteam Combat Readiness: 100%</div>
                  <div className="text-[11px] text-slate-400">Voice Comms Low-Latency Opus 24kHz Active</div>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">ALL OPERATIVES DEPLOYABLE</span>
            </div>
          </div>
        ) : (
          /* Leaderboards Tab */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Operative</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Division</th>
                    <th className="py-2.5 px-3 text-right">K/D Ratio</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Career Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {GLOBAL_LEADERBOARD.map((p) => {
                    const isYou = p.playerTag.includes('You');
                    return (
                      <tr
                        key={p.rank}
                        className={`hover:bg-slate-900/50 ${isYou ? 'bg-cyan-950/20 text-cyan-300 font-bold' : 'text-slate-300'}`}
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold ${
                              p.rank === 1
                                ? 'bg-amber-500 text-black'
                                : p.rank === 2
                                ? 'bg-slate-300 text-black'
                                : p.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'text-slate-400'
                            }`}
                          >
                            #{p.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-tactical text-sm text-white">{p.playerTag}</td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px]">
                            {p.platform}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-purple-400">{p.rankBadge}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-emerald-400 font-bold">{p.kdRatio}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{p.winRate}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-white">{p.score.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
