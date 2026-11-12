import React, { useState } from 'react';
import { ShoppingBag, Crosshair, Check, X, Shield, Sparkles, Volume2 } from 'lucide-react';
import { CAMO_VARIANTS, STORE_BUNDLES } from '../data/gunsmithData';
import { soundEngine } from '../audio/SoundEngine';

interface GunsmithStoreModalProps {
  currentCamoId: string;
  onSelectCamo: (camoId: string) => void;
  onClose: () => void;
  userCredits: number;
  onSpendCredits: (amount: number) => boolean;
}

export const GunsmithStoreModal: React.FC<GunsmithStoreModalProps> = ({
  currentCamoId,
  onSelectCamo,
  onClose,
  userCredits,
  onSpendCredits,
}) => {
  const [activeTab, setActiveTab] = useState<'gunsmith' | 'store'>('gunsmith');
  const [selectedCamo, setSelectedCamo] = useState(
    CAMO_VARIANTS.find((c) => c.id === currentCamoId) || CAMO_VARIANTS[0]
  );
  const [bundles, setBundles] = useState(STORE_BUNDLES);
  const [selectedBundle, setSelectedBundle] = useState(STORE_BUNDLES[0]);
  const [activeWeaponType, setActiveWeaponType] = useState<'mk18' | 'p80'>('mk18');

  const handleApplyCamo = (camoId: string) => {
    soundEngine.playUIClick();
    const found = CAMO_VARIANTS.find((c) => c.id === camoId);
    if (found) {
      setSelectedCamo(found);
      onSelectCamo(camoId);
    }
  };

  const handleBuyBundle = (bundleId: string, price: number) => {
    if (onSpendCredits(price)) {
      soundEngine.playRadioPing();
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, owned: true } : b))
      );
    }
  };

  const handleTestFireAudio = () => {
    if (activeWeaponType === 'mk18') {
      soundEngine.playRifleFire();
    } else {
      soundEngine.playPistolFire();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-5xl w-full p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-500/60 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-tactical font-black text-2xl text-white tracking-wider">
                TACTICAL GUNSMITH & ARMORY STORE
              </div>
              <div className="text-xs font-mono text-amber-400">
                PBR CUSTOMIZATION · ATTACHMENTS · VANGUARD CREDITS: {userCredits} VC
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-1">
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('gunsmith');
                }}
                className={`px-3 py-1 text-xs font-tactical font-bold rounded ${
                  activeTab === 'gunsmith' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                GUNSMITH
              </button>
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('store');
                }}
                className={`px-3 py-1 text-xs font-tactical font-bold rounded ${
                  activeTab === 'store' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                COSMETIC STORE
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

        {activeTab === 'gunsmith' ? (
          <div>
            {/* Weapon Selector Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveWeaponType('mk18');
                }}
                className={`px-4 py-2 rounded text-xs font-tactical font-bold tracking-wider border ${
                  activeWeaponType === 'mk18'
                    ? 'bg-slate-900 border-cyan-500 text-cyan-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                PRIMARY: MK18-MOD1 CQB 5.56
              </button>
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveWeaponType('p80');
                }}
                className={`px-4 py-2 rounded text-xs font-tactical font-bold tracking-wider border ${
                  activeWeaponType === 'p80'
                    ? 'bg-slate-900 border-cyan-500 text-cyan-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                SECONDARY: P80 TACTICAL 9MM
              </button>

              <button
                onClick={handleTestFireAudio}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs font-mono"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>TEST FIRE AUDIO</span>
              </button>
            </div>

            {/* Weapon Performance Stats vs Weapon Visual Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Visual Preview Box */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-tactical font-black text-xl text-white">
                      {activeWeaponType === 'mk18' ? 'MK18-MOD1 CQB' : 'P80 COMBAT'}
                    </div>
                    <div className="text-xs font-mono text-amber-400">
                      CURRENT CAMO: {selectedCamo.name.toUpperCase()}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border border-white/40 shadow"
                    style={{ backgroundColor: selectedCamo.color }}
                  />
                </div>

                {/* Tactical SVG Weapon Silhouette */}
                <div className="my-8 flex items-center justify-center">
                  <svg viewBox="0 0 400 120" className="w-full max-w-sm h-auto drop-shadow-xl">
                    <rect x="40" y="45" width="220" height="25" rx="3" fill="#1c2027" stroke="#333b47" strokeWidth="2" />
                    <rect x="260" y="52" width="70" height="12" fill="#0f1217" />
                    <rect x="330" y="48" width="30" height="20" rx="2" fill="#2d333f" />
                    <rect x="18" y="40" width="45" height="40" rx="4" fill="#1c2027" />
                    <polygon points="120,70 145,115 125,115 105,70" fill="#0f1217" />
                    <rect x="110" y="32" width="35" height="14" rx="2" fill="#2d333f" />
                    <circle cx="127" cy="39" r="3" fill="#ef4444" />
                  </svg>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  {selectedCamo.description}
                </div>
              </div>

              {/* Weapon Stats Bar Graphs */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
                  Tactical Performance Metrics:
                </div>
                <div className="space-y-3.5">
                  {[
                    { label: 'DAMAGE', val: activeWeaponType === 'mk18' ? 74 : 65, color: 'bg-red-500' },
                    { label: 'FIRE RATE', val: activeWeaponType === 'mk18' ? 88 : 45, color: 'bg-amber-500' },
                    { label: 'ACCURACY (ADS)', val: activeWeaponType === 'mk18' ? 82 : 86, color: 'bg-cyan-500' },
                    { label: 'EFFECTIVE RANGE', val: activeWeaponType === 'mk18' ? 78 : 52, color: 'bg-blue-500' },
                    { label: 'RECOIL CONTROL', val: activeWeaponType === 'mk18' ? 72 : 80, color: 'bg-emerald-500' },
                    { label: 'MOBILITY', val: activeWeaponType === 'mk18' ? 75 : 92, color: 'bg-purple-500' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-300">{stat.label}</span>
                        <span className="text-slate-100 font-bold tabular-nums">{stat.val} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Camouflage Swatches Selector */}
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
                Select Weapon Camo Finish:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {CAMO_VARIANTS.map((camo) => {
                  const isCurrent = currentCamoId === camo.id;
                  return (
                    <button
                      key={camo.id}
                      onClick={() => handleApplyCamo(camo.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isCurrent
                          ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded mb-2 border border-white/20 flex items-center justify-center"
                        style={{ backgroundColor: camo.color }}
                      >
                        {isCurrent && <Check className="w-5 h-5 text-white drop-shadow" />}
                      </div>
                      <div className="text-xs font-tactical font-bold text-slate-200 truncate">{camo.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{camo.rarity}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Cosmetic Bundles Store */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider">
                        {bundle.rarity} · {bundle.category.toUpperCase()}
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{bundle.price} VC</span>
                    </div>

                    <div className="font-tactical font-black text-lg text-white mb-1.5">{bundle.name}</div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{bundle.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cosmetic Weapon Modification</span>
                    </div>

                    {bundle.owned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" /> UNLOCKED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBuyBundle(bundle.id, bundle.price)}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-tactical font-bold text-xs rounded tracking-wider"
                      >
                        PURCHASE ({bundle.price} VC)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
