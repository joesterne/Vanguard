import * as THREE from 'three';

export type GameMode = 'title' | 'campaign' | 'multiplayer_bot' | 'inspect';

export type GameStateStatus = 'menu' | 'briefing' | 'playing' | 'paused' | 'victory' | 'game_over' | 'death_cam';

export interface KillerInfo {
  enemyId: string;
  name: string;
  type: 'rifleman' | 'breacher' | 'drone';
  position: THREE.Vector3;
  distance: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  type: 'assault_rifle' | 'pistol' | 'shotgun';
  damage: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  reserveAmmo: number;
  reloadTime: number; // in seconds
  spread: number;
  adsSpread: number;
  recoilVertical: number;
  recoilHorizontal: number;
  range: number;
  camoId: string;
  attachmentId?: string;
  unlocked: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  maxStamina: number;
  currentWeaponIndex: number;
  currentMag: number;
  magazineSize?: number;
  reserveAmmo: number;
  maxReserveAmmo?: number;
  reloadProgress?: number;
  grenades: number;
  flashbangs: number;
  score: number;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  timeElapsed: number;
  isReloading: boolean;
  isTacticalReload?: boolean;
  reloadDuration?: number;
  reloadStageLabel?: string;
  lastReloadType?: 'tactical' | 'empty' | null;
  lastReloadTimestamp?: number;
  isAiming: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isInspecting: boolean;
  inspectProgress?: number;
  inspectPhaseLabel?: string;
  crosshairSpread?: number;
  recoilBloom?: number;
  movementSpeed?: number;
  isGrounded?: boolean;
  accuracyPct?: number;
  stabilityLabel?: string;
  exhaustionLevel?: 'OPTIMAL' | 'ELEVATED' | 'FATIGUED' | 'EXHAUSTED';
  exhaustionLabel?: string;
  heartRateBpm?: number;
  staminaAction?: 'NONE' | 'SPRINTING' | 'JUMP_EXERTION' | 'MELEE_STRIKE' | 'RECOVERING';
  staminaActionLabel?: string;
  staminaDeltaRate?: number;
  isMeleeing?: boolean;
  meleeProgress?: number;
  meleeStageLabel?: string;
  posX?: number;
  posZ?: number;
}

export interface DestructibleObject {
  id: string;
  type: 'crate' | 'barrel' | 'barrier' | 'gate';
  mesh: THREE.Group | THREE.Mesh;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  isExplosive?: boolean;
  position: { x: number; y: number; z: number };
  boundingRadius: number;
}

export interface EnemyActor {
  id: string;
  type: 'rifleman' | 'breacher' | 'drone';
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotationY: number;
  state: 'patrol' | 'alert' | 'aim' | 'attack' | 'blinded' | 'dead';
  patrolTarget: { x: number; z: number };
  shootCooldown: number;
  aimTime: number;
  isAlerted: boolean;
  blindedTimer?: number;
  stunHalo?: THREE.Group;
  telegraphGlow?: THREE.PointLight | THREE.Mesh;
}

export interface MissionObjective {
  id: string;
  text: string;
  completed: boolean;
  optional?: boolean;
  currentProgress?: number;
  targetProgress?: number;
  sectorName?: string;
  tacticalNote?: string;
  mapCoords?: { x: number; y: number }; // Percentage 0-100 on tactical holo map
  cameraFocus?: { x: number; y: number; z: number }; // 3D world focus point
}

export interface EnemyIntelProfile {
  type: 'rifleman' | 'breacher' | 'drone';
  designation: string;
  role: string;
  threatLevel: 'Moderate' | 'High' | 'Extreme';
  countInSector: number;
  primaryWeapon: string;
  armorProfile: string;
  weakpoint: string;
  tacticalAdvisory: string;
  stats: {
    lethality: number; // 0-100
    armor: number; // 0-100
    mobility: number; // 0-100
  };
}

export interface InsertionPoint {
  id: string;
  name: string;
  sectorCode: string;
  description: string;
  spawnPos: { x: number; y: number; z: number };
  mapCoords: { x: number; y: number };
}

export type SkyboxEnvironmentPreset = 'golden_dusk' | 'moonlit_night' | 'crimson_storm' | 'arctic_dawn';

export interface CampaignMission {
  id: string;
  title: string;
  codename: string;
  location: string;
  coordinates: string;
  weather: string;
  difficulty: 'Recruit' | 'Regular' | 'Hardened' | 'Veteran';
  briefing: string;
  commandDirective: string;
  objectives: MissionObjective[];
  enemyIntel: EnemyIntelProfile[];
  insertionPoints: InsertionPoint[];
  estimatedTime: string;
  environmentPreset?: SkyboxEnvironmentPreset;
}

export interface BattlePassTier {
  tier: number;
  name: string;
  type: 'blueprint' | 'camo' | 'operator' | 'currency' | 'charm';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  isPremium: boolean;
  iconName: string;
  rewardValue: string;
  unlocked: boolean;
  claimed: boolean;
}

export interface StoreItem {
  id: string;
  name: string;
  category: 'camo' | 'weapon' | 'bundle' | 'operator';
  rarity: 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  previewColor: string;
  featured?: boolean;
  owned: boolean;
}

export interface ServerRegion {
  id: string;
  name: string;
  location: string;
  ping: number;
  tickRate: number;
  status: 'Optimal' | 'Good' | 'Heavy';
}

export interface LeaderboardEntry {
  rank: number;
  playerTag: string;
  platform: 'PC' | 'PS5' | 'XBOX';
  score: number;
  kills: number;
  kdRatio: number;
  winRate: string;
  rankBadge: string;
}

export interface SquadMember {
  id: string;
  name: string;
  platform: 'PC' | 'PS5' | 'XBOX';
  status: 'In Lobby' | 'In Match' | 'Ready' | 'Searching';
  isLeader?: boolean;
  rank: string;
  micActive: boolean;
}

export interface HitMarkerEvent {
  id: number;
  isHeadshot: boolean;
  isKill: boolean;
  x: number;
  y: number;
}
