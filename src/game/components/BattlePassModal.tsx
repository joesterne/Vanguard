import React, { useState } from 'react';
import { Award, Shield, Check, Lock, X, Gift, Zap, Crosshair } from 'lucide-react';
import { INITIAL_BATTLE_PASS_TIERS, DAILY_CHALLENGES } from '../data/battlePassData';
import { soundEngine } from '../audio/SoundEngine';

interface BattlePassModalProps {
  onClose: () => void;
  onUnlockCamo: (camoId: string) => void;
}

export const BattlePassModal: React.FC<BattlePassModalProps> = ({
  onClose,
  onUnlockCamo,
}) => {
  const [tiers, setTiers] = useState(INITIAL_BATTLE_PASS_TIERS);
  const [challenges, setChallenges] = useState(DAILY_CHALLENGES);
  const [selectedTier, setSelectedTier] = useState(tiers[0]);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  const handleClaim = (tierNum: number) => {
    soundEngine.playUIClick();
    setTiers((prev) =>
      prev.map((t) => {
        if (t.tier === tierNum) {
          if (t.type === 'camo' || t.type === 'blueprint') {
            onUnlockCamo(t.rewardValue);
          }
          return { ...t, claimed: true };
        }
        return t;
      })
    );
  };

  const handleBuyPremium = () => {
    soundEngine.playRadioPing();
    setIsPremiumUnlocked(true);
    setTiers((prev) => prev.map((t) => ({ ...t, unlocked: true })));
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-5xl w-full p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-500/60 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-tactical font-black text-2xl text-white tracking-wider">
                SEASON 1: GLOBAL RECKONING
              </div>
              <div className="text-xs font-mono text-purple-400">
                50 TIERS OF TACTICAL REWARDS · BLUEPRINTS · OPERATOR HARNESSES · 42 DAYS REMAINING
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

        {/* Top Banner: Season Pass Status */}
        <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border border-purple-800/60 p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-900/60 border border-purple-600 rounded text-[10px] font-mono text-purple-300 mb-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>TIER 4 OF 50 · XP: 6,400 / 10,000</span>
            </div>
            <div className="font-tactical font-black text-xl text-white">
              {isPremiumUnlocked ? 'PREMIUM BATTLE PASS ACTIVE' : 'FREE TIER TRACK'}
            </div>
            <div className="text-xs text-slate-400">
              {isPremiumUnlocked ? 'Instant access to all 50 premium blueprint tiers unlocked!' : 'Upgrade to Premium to instantly unlock the Damascus Steel & Mastercraft tiers.'}
            </div>
          </div>

          {!isPremiumUnlocked && (
            <button
              onClick={handleBuyPremium}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-tactical font-bold text-sm tracking-wider rounded transition-transform active:scale-95 shadow-lg shadow-purple-600/30"
            >
              <Gift className="w-4 h-4" />
              <span>UNLOCK PREMIUM PASS (1,000 VC)</span>
            </button>
          )}
        </div>

        {/* Reward Track Horizontal Carousel */}
        <div className="mb-6">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Reward Progression Track:</div>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {tiers.map((t) => {
              const isSelected = selectedTier.tier === t.tier;
              return (
                <div
                  key={t.tier}
                  onClick={() => {
                    soundEngine.playUIClick();
                    setSelectedTier(t);
                  }}
                  className={`shrink-0 w-36 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                    <span className="font-bold text-white">TIER {t.tier}</span>
                    {t.isPremium && <span className="text-purple-400 text-[10px]">PREMIUM</span>}
                  </div>

                  <div className="w-full h-20 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-center mb-2">
                    <Crosshair className="w-8 h-8 text-cyan-400" />
                  </div>

                  <div className="text-xs font-tactical font-bold text-slate-200 truncate mb-1">{t.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{t.rarity}</div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    {t.claimed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                        <Check className="w-3 h-3" /> CLAIMED
                      </span>
                    ) : t.unlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(t.tier);
                        }}
                        className="w-full py-1 bg-purple-600 hover:bg-purple-500 text-white font-tactical text-[11px] font-bold rounded"
                      >
                        CLAIM
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                        <Lock className="w-3 h-3" /> LOCKED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Tier Detail & Daily Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selected Item Preview */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
            <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-2">Inspecting Reward:</div>
            <div className="font-tactical font-black text-xl text-white mb-1">{selectedTier.name}</div>
            <div className="text-xs font-mono text-slate-400 mb-3">{selectedTier.rarity} · {selectedTier.type.toUpperCase()}</div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Equip this high-grade blueprint in the Gunsmith. Features bespoke procedural finish textures, optimized recoil harmonics, and custom holographic reticles.
            </p>
            {selectedTier.unlocked && !selectedTier.claimed && (
              <button
                onClick={() => handleClaim(selectedTier.tier)}
                className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-tactical font-bold text-xs rounded tracking-wider"
              >
                CLAIM TIER REWARD NOW
              </button>
            )}
          </div>

          {/* Daily Tactical Challenges */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Tactical Challenges:</span>
              <span className="text-[11px] font-mono text-cyan-400">Refreshes in 14h 22m</span>
            </div>
            <div className="space-y-2.5">
              {challenges.map((c) => (
                <div key={c.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-tactical font-bold text-slate-200">{c.title}</span>
                    <span className="font-mono text-emerald-400 font-bold">+{c.xpReward} XP</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-1.5">{c.description}</div>
                  <div className="flex items-center gap-2">
                    <div className="grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${(c.current / c.target) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{c.current}/{c.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
