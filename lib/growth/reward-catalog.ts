/**
 * Gharpayy Reward Catalog Configuration
 * Centralized definition of all redeemable rewards.
 */

export type RewardCategory = 'flexibility' | 'food' | 'recognition' | 'perks' | 'learning';
export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  rarity: RewardRarity;
  coinCost: number;
  approvalRequired: boolean;
  cooldownDays: number;
  stockLimit?: number;
  active: boolean;
  image?: string;
}

export const REWARD_CATALOG: RewardDefinition[] = [
  // --- Flexibility ---
  {
    id: 'rew-early-exit',
    title: 'Early Exit Pass',
    description: 'Leave 2 hours early on any Friday. Subject to team coverage.',
    category: 'flexibility',
    rarity: 'rare',
    coinCost: 500,
    approvalRequired: true,
    cooldownDays: 14,
    active: true
  },
  {
    id: 'rew-wfh-day',
    title: 'Work From Home Day',
    description: 'One day of remote work. Must be requested 48h in advance.',
    category: 'flexibility',
    rarity: 'epic',
    coinCost: 1200,
    approvalRequired: true,
    cooldownDays: 30,
    active: true
  },

  // --- Food ---
  {
    id: 'rew-coffee-treat',
    title: 'Gharpayy Coffee Treat',
    description: 'A premium coffee delivered to your desk.',
    category: 'food',
    rarity: 'common',
    coinCost: 150,
    approvalRequired: false,
    cooldownDays: 1,
    active: true
  },
  {
    id: 'rew-team-lunch',
    title: 'Team Pizza Party',
    description: 'Pizza lunch for your immediate team (up to 5 people).',
    category: 'food',
    rarity: 'legendary',
    coinCost: 5000,
    approvalRequired: true,
    cooldownDays: 90,
    active: true
  },

  // --- Recognition ---
  {
    id: 'rew-linkedin-kudo',
    title: 'LinkedIn Recommendation',
    description: 'A professional recommendation from a senior manager.',
    category: 'recognition',
    rarity: 'epic',
    coinCost: 2000,
    approvalRequired: true,
    cooldownDays: 365,
    active: true
  },
  {
    id: 'rew-wall-of-fame',
    title: 'Wall of Fame Feature',
    description: 'Featured on the office display for a full week.',
    category: 'recognition',
    rarity: 'rare',
    coinCost: 800,
    approvalRequired: false,
    cooldownDays: 30,
    active: true
  },

  // --- Perks ---
  {
    id: 'rew-swag-hoodie',
    title: 'Gharpayy Elite Hoodie',
    description: 'Limited edition Arena-branded high-quality hoodie.',
    category: 'perks',
    rarity: 'epic',
    coinCost: 3500,
    approvalRequired: true,
    cooldownDays: 0,
    stockLimit: 50,
    active: true
  },

  // --- Learning ---
  {
    id: 'rew-skillshare',
    title: 'Skillshare Annual Sub',
    description: 'Full year of access to premium online courses.',
    category: 'learning',
    rarity: 'legendary',
    coinCost: 10000,
    approvalRequired: true,
    cooldownDays: 365,
    active: true
  }
];

export function getRewardById(id: string) {
  return REWARD_CATALOG.find(r => r.id === id);
}

export function getActiveRewards() {
  return REWARD_CATALOG.filter(r => r.active);
}
