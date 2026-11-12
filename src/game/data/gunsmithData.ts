import { StoreItem } from '../types';

export interface WeaponAttachment {
  id: string;
  name: string;
  slot: 'optic' | 'muzzle' | 'barrel' | 'magazine';
  statModifiers: {
    damage?: number;
    accuracy?: number;
    range?: number;
    mobility?: number;
    control?: number;
  };
  description: string;
}

export const CAMO_VARIANTS = [
  { id: 'default', name: 'Tactical Matte Black', rarity: 'Standard', color: '#1a1d24', description: 'Standard issue military anodized anti-glare finish.' },
  { id: 'obsidian', name: 'Obsidian Specter', rarity: 'Legendary', color: '#4c1d95', description: 'Ultra-rare forged carbon-fiber with iridescent dark violet facets.' },
  { id: 'damascus', name: 'Damascus Steel Wave', rarity: 'Legendary', color: '#0284c7', description: 'Hand-folded high-carbon layered steel with rippling topographic patterns.' },
  { id: 'desert', name: 'Desert Hex Digital', rarity: 'Epic', color: '#d97706', description: 'Arid climate pixelated digital camouflage for low optical detection.' },
  { id: 'neon', name: 'Cyber Neon Circuit', rarity: 'Epic', color: '#06b6d4', description: 'High-tech illuminated cybernetic grid with active luminescent traces.' },
  { id: 'gold', name: 'Royal Gold Inlay', rarity: 'Mastercraft', color: '#eab308', description: '24K brushed royal gold plating with handcrafted tactical engravings.' },
];

export const STORE_BUNDLES: StoreItem[] = [
  {
    id: 'bundle_specter',
    name: 'Specter Elite Mastercraft Bundle',
    category: 'bundle',
    rarity: 'Legendary',
    price: 1800,
    description: 'Includes Obsidian Specter Mk18 Blueprint, Holographic Red Dot, Silenced Flash Suppressor, and "Night Ghost" Operator Skin.',
    previewColor: '#4c1d95',
    featured: true,
    owned: false,
  },
  {
    id: 'bundle_damascus',
    name: 'Damascus Pro Gunsmith Pack',
    category: 'camo',
    rarity: 'Legendary',
    price: 1400,
    description: 'Forged high-carbon Damascus steel finish applicable across all Primary and Secondary firearms with custom inspect animation.',
    previewColor: '#0284c7',
    featured: true,
    owned: false,
  },
  {
    id: 'bundle_cyber_ops',
    name: 'Cyberpunk Zero Ops',
    category: 'weapon',
    rarity: 'Epic',
    price: 1100,
    description: 'Cyber Neon illuminated weapon chassis with cyan reactive kill counters and glowing tactical reticle.',
    previewColor: '#06b6d4',
    owned: false,
  },
  {
    id: 'bundle_desert_sniper',
    name: 'Arid Strike Force Operator',
    category: 'operator',
    rarity: 'Rare',
    price: 800,
    description: 'Desert digital ghillie tactical harness, dust goggles, and specialized sandstorm gloves.',
    previewColor: '#d97706',
    owned: false,
  },
];
