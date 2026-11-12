import { ServerRegion, LeaderboardEntry, SquadMember } from '../types';

export const DEDICATED_SERVERS: ServerRegion[] = [
  { id: 'us_east', name: 'US East (N. Virginia)', location: 'Ashburn, VA', ping: 18, tickRate: 128, status: 'Optimal' },
  { id: 'us_west', name: 'US West (California)', location: 'Silicon Valley, CA', ping: 24, tickRate: 128, status: 'Optimal' },
  { id: 'eu_central', name: 'Europe Central', location: 'Frankfurt, Germany', ping: 32, tickRate: 128, status: 'Optimal' },
  { id: 'asia_east', name: 'Asia East', location: 'Tokyo, Japan', ping: 68, tickRate: 128, status: 'Good' },
];

export const SQUAD_MEMBERS: SquadMember[] = [
  { id: 'sq_1', name: 'Specter_Actual (You)', platform: 'PC', status: 'In Lobby', isLeader: true, rank: 'Apex Predator #14', micActive: true },
  { id: 'sq_2', name: 'Valkyrie_99', platform: 'PS5', status: 'Ready', isLeader: false, rank: 'Diamond II', micActive: true },
  { id: 'sq_3', name: 'Bravo_Six_Going_Dark', platform: 'XBOX', status: 'Ready', isLeader: false, rank: 'Diamond I', micActive: false },
  { id: 'sq_4', name: 'Kestrel_Tac', platform: 'PC', status: 'In Lobby', isLeader: false, rank: 'Platinum III', micActive: true },
];

export const GLOBAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, playerTag: 'Ghost_Vanguard', platform: 'PC', score: 984500, kills: 14200, kdRatio: 4.85, winRate: '78.4%', rankBadge: 'Apex Predator' },
  { rank: 2, playerTag: 'ShadowStrike_X', platform: 'PS5', score: 912200, kills: 13180, kdRatio: 4.42, winRate: '74.1%', rankBadge: 'Apex Predator' },
  { rank: 3, playerTag: 'Reaper_One', platform: 'XBOX', score: 865400, kills: 12450, kdRatio: 4.15, winRate: '71.8%', rankBadge: 'Apex Predator' },
  { rank: 4, playerTag: 'Aegis_Sniper', platform: 'PC', score: 820100, kills: 11920, kdRatio: 3.94, winRate: '69.5%', rankBadge: 'Apex Predator' },
  { rank: 5, playerTag: 'Valkyrie_Queen', platform: 'PS5', score: 794300, kills: 11400, kdRatio: 3.82, winRate: '68.0%', rankBadge: 'Grandmaster' },
  { rank: 6, playerTag: 'IronClad_99', platform: 'XBOX', score: 752000, kills: 10850, kdRatio: 3.65, winRate: '66.2%', rankBadge: 'Grandmaster' },
  { rank: 7, playerTag: 'Specter_Actual (You)', platform: 'PC', score: 710400, kills: 10120, kdRatio: 3.51, winRate: '65.0%', rankBadge: 'Grandmaster' },
  { rank: 8, playerTag: 'CyberWraith', platform: 'PC', score: 685300, kills: 9780, kdRatio: 3.38, winRate: '63.9%', rankBadge: 'Master' },
];

export const MULTIPLAYER_MODES = [
  { id: 'tdm', name: 'Team Deathmatch', desc: 'Tactical 6v6 squad skirmish. First team to 75 eliminations wins.', icon: 'Users' },
  { id: 'snd', name: 'Search & Destroy', desc: 'No respawns. Attack or defend the tactical ordnance detonation sites.', icon: 'Bomb' },
  { id: 'dom', name: 'Domination', desc: 'Capture and hold three strategic flags (Alpha, Bravo, Charlie) across the warzone.', icon: 'Flag' },
  { id: 'ffa', name: 'Free-For-All', desc: 'Solo combat. Every operative for themselves. 30 kills to victory.', icon: 'Target' },
];
