import { BattlePassTier } from '../types';

export interface BattlePassChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  current: number;
  target: number;
  completed: boolean;
}

export const INITIAL_BATTLE_PASS_TIERS: BattlePassTier[] = [
  { tier: 1, name: 'Obsidian Specter Mk18', type: 'blueprint', rarity: 'Legendary', isPremium: false, iconName: 'Crosshair', rewardValue: 'obsidian', unlocked: true, claimed: true },
  { tier: 2, name: '300 Vanguard Credits', type: 'currency', rarity: 'Rare', isPremium: false, iconName: 'Coins', rewardValue: '300 VC', unlocked: true, claimed: false },
  { tier: 3, name: 'Ghost Recon Operator Patch', type: 'charm', rarity: 'Rare', isPremium: true, iconName: 'Shield', rewardValue: 'Charm', unlocked: true, claimed: false },
  { tier: 4, name: 'Desert Hex Digital Camo', type: 'camo', rarity: 'Epic', isPremium: false, iconName: 'Palette', rewardValue: 'desert', unlocked: true, claimed: false },
  { tier: 5, name: 'Damascus Steel Flow Blueprint', type: 'blueprint', rarity: 'Legendary', isPremium: true, iconName: 'Sparkles', rewardValue: 'damascus', unlocked: false, claimed: false },
  { tier: 6, name: 'Double Weapon XP Token (1h)', type: 'currency', rarity: 'Common', isPremium: false, iconName: 'Zap', rewardValue: '2x XP', unlocked: false, claimed: false },
  { tier: 7, name: 'Apex Predator Calling Card', type: 'operator', rarity: 'Rare', isPremium: true, iconName: 'Award', rewardValue: 'Badge', unlocked: false, claimed: false },
  { tier: 8, name: '500 Vanguard Credits', type: 'currency', rarity: 'Rare', isPremium: false, iconName: 'Coins', rewardValue: '500 VC', unlocked: false, claimed: false },
  { tier: 9, name: 'Cyber Neon Grid Finish', type: 'camo', rarity: 'Epic', isPremium: true, iconName: 'Cpu', rewardValue: 'neon', unlocked: false, claimed: false },
  { tier: 10, name: 'Royal Gold Inlay Mastercraft', type: 'blueprint', rarity: 'Legendary', isPremium: true, iconName: 'Crown', rewardValue: 'gold', unlocked: false, claimed: false },
];

export const DAILY_CHALLENGES: BattlePassChallenge[] = [
  { id: 'c1', title: 'Perimeter Cleanse', description: 'Eliminate 10 hostile combatants in Campaign or Multiplayer', xpReward: 1500, current: 4, target: 10, completed: false },
  { id: 'c2', title: 'Demolition Specialist', description: 'Detonate 3 explosive fuel drums with gunfire', xpReward: 2000, current: 1, target: 3, completed: false },
  { id: 'c3', title: 'Precision Marksman', description: 'Land 5 headshot eliminations using Aim Down Sights (ADS)', xpReward: 2500, current: 2, target: 5, completed: false },
];
