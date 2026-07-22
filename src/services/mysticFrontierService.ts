import { supabase } from '../lib/supabase';
import type {
  MysticFrontierSiteRank,
  MysticFrontierStatus,
  MysticFrontierRewardType,
  MysticFrontierExpedition,
  MysticFrontierRewardItem,
  MysticFrontierRewardEntry,
  MysticFrontierExpeditionLog,
  ExpiringResourceType,
} from '../types';
import { resourcesService } from './resources';

export const SITE_RANKS: MysticFrontierSiteRank[] = ['Common', 'Rare', 'Epic', 'Unique', 'Legendary'];

export const RANK_COLORS: Record<MysticFrontierSiteRank, string> = {
  Common:    '#718096',
  Rare:      '#4299e1',
  Epic:      '#9f7aea',
  Unique:    '#ed8936',
  Legendary: '#2dbf9b',
};

// Maps resourcesService metadata keys → MysticFrontierRewardType for cube images
export const CUBE_RESOURCE_KEYS: Record<string, MysticFrontierRewardType> = {
  solid_cubes:        'karma_solid_cubes',
  bright_cubes:       'karma_bright_cubes',
  bonus_bright_cubes: 'karma_bonus_bright_cubes',
};

export const EXPLORATION_HOURS: Record<MysticFrontierSiteRank, number> = {
  Common: 6, Rare: 8, Epic: 12, Unique: 18, Legendary: 24,
};

export const REST_HOURS: Record<MysticFrontierSiteRank, number> = {
  Common: 1, Rare: 1, Epic: 2, Unique: 3, Legendary: 3,
};

// Maps each MysticFrontierRewardType to its ExpiringResourceType for resource batch creation
export const REWARD_TO_RESOURCE: Partial<Record<MysticFrontierRewardType, ExpiringResourceType>> = {
  karma_solid_cubes:          'solid_cubes',
  karma_bright_cubes:         'bright_cubes',
  karma_bonus_bright_cubes:   'bonus_bright_cubes',
  familiar_ring_box:          'familiar_ring_box',
  black_heart:                'black_heart',
  dawn_accessory_box:         'dawn_accessory_box',
  pitched_boss_accessory_box: 'pitched_boss_accessory_box',
  pitched_star_core:          'pitched_star_core',
};

// Rewards that never expire — addBatch receives null for expires_at
export const NO_EXPIRY_REWARDS = new Set<MysticFrontierRewardType>([
  'pitched_star_core',
]);

// Non-cube rewards use checkbox (quantity always 1).
// Cube rewards (karma_*_cubes) use number input 0-10.
export const CUBE_REWARDS = new Set<MysticFrontierRewardType>([
  'karma_solid_cubes',
  'karma_bright_cubes',
  'karma_bonus_bright_cubes',
]);

// Pouch rewards — shown only in pre-start picker, not in collect picker, not tracked as resources.
export const POUCH_REWARDS = new Set<MysticFrontierRewardType>([
  'purple_pouch',
  'orange_pouch',
  'green_pouch',
]);

// Images for non-cube rewards. Cube images are fetched at runtime from resourcesService.
export const REWARD_METADATA: Record<MysticFrontierRewardType, { label: string; image_url: string }> = {
  familiar_ring_box:           { label: 'Familiar Ring Box',            image_url: 'https://g.nexonstatic.com/media/ocifg5cz/bright-familiar-ring-box.png' },
  pitched_boss_accessory_box:  { label: 'Pitched Boss Accessory Box',   image_url: 'https://g.nexonstatic.com/media/lizna4vx/chaos-pitched-accessory-box.png' },
  pitched_star_core:           { label: 'Pitched Star Core',            image_url: 'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/Pitched%20Star%20Core.png' },
  black_heart:                 { label: 'Black Heart',                  image_url: 'https://g.nexonstatic.com/media/nqjlkgtg/damaged-black-heart-coupon.png' },
  dawn_accessory_box:          { label: 'Dawn Accessory Box',           image_url: 'https://g.nexonstatic.com/media/raagpngb/resonant-dawn-accessory-box.png' },
  purple_pouch:                { label: 'Purple Pouch',                 image_url: 'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/Purple%20Pouch.png' },
  orange_pouch:                { label: 'Orange Pouch',                 image_url: 'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/Orange%20Pouch.png' },
  green_pouch:                 { label: 'Green Pouch',                  image_url: 'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/Green%20Pouch.png' },
  karma_solid_cubes:           { label: 'Karma Solid Cubes',            image_url: '' }, // loaded from resourcesService key: solid_cubes
  karma_bright_cubes:          { label: 'Karma Bright Cubes',           image_url: '' }, // loaded from resourcesService key: bright_cubes
  karma_bonus_bright_cubes:    { label: 'Karma Bonus Bright Cubes',     image_url: '' }, // loaded from resourcesService key: bonus_bright_cubes
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function getExplorationMs(rank: MysticFrontierSiteRank): number {
  return EXPLORATION_HOURS[rank] * 3_600_000;
}

export function getRestMs(rank: MysticFrontierSiteRank): number {
  return REST_HOURS[rank] * 3_600_000;
}

/** Returns what the expedition status SHOULD be right now (resolves timed-out states). */
export function computeLiveStatus(expedition: MysticFrontierExpedition): MysticFrontierStatus {
  const now = Date.now();
  if (expedition.status === 'exploring' && expedition.exploration_started_at) {
    const elapsed = now - new Date(expedition.exploration_started_at).getTime();
    if (elapsed >= getExplorationMs(expedition.site_rank)) return 'resting';
  }
  if (expedition.status === 'resting' && expedition.rest_started_at) {
    const elapsed = now - new Date(expedition.rest_started_at).getTime();
    if (elapsed >= getRestMs(expedition.site_rank)) return 'available';
  }
  return expedition.status;
}

/** Returns ms until next state transition, or null if currently available. */
export function getTimeRemainingMs(expedition: MysticFrontierExpedition): number | null {
  const now = Date.now();
  if (expedition.status === 'exploring' && expedition.exploration_started_at) {
    const elapsed = now - new Date(expedition.exploration_started_at).getTime();
    const remaining = getExplorationMs(expedition.site_rank) - elapsed;
    return remaining > 0 ? remaining : 0;
  }
  if (expedition.status === 'resting' && expedition.rest_started_at) {
    const elapsed = now - new Date(expedition.rest_started_at).getTime();
    const remaining = getRestMs(expedition.site_rank) - elapsed;
    return remaining > 0 ? remaining : 0;
  }
  return null;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── DB functions ─────────────────────────────────────────────────────────────

export async function getExpeditions(characterId: string): Promise<MysticFrontierExpedition[]> {
  const { data, error } = await supabase
    .from('character_mystic_frontier_expeditions')
    .select('*')
    .eq('character_id', characterId)
    .order('expedition_index');
  if (error) throw error;
  return (data ?? []) as MysticFrontierExpedition[];
}

export async function startExpedition(
  characterId: string,
  expeditionIndex: 1 | 2 | 3,
  rank: MysticFrontierSiteRank,
): Promise<MysticFrontierExpedition> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('character_mystic_frontier_expeditions')
    .upsert({
      character_id: characterId,
      expedition_index: expeditionIndex,
      site_rank: rank,
      status: 'exploring',
      exploration_started_at: now,
      rest_started_at: null,
      updated_at: now,
    }, { onConflict: 'character_id,expedition_index' })
    .select()
    .single();
  if (error) throw error;
  return data as MysticFrontierExpedition;
}

export async function collectRewards(
  characterId: string,
  expeditionIndex: 1 | 2 | 3,
  rewards: MysticFrontierRewardItem[],
  rank: MysticFrontierSiteRank,
  accountId: string,
  explorationStartedAt: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('character_mystic_frontier_expeditions')
    .update({ status: 'resting', rest_started_at: now, updated_at: now })
    .eq('character_id', characterId)
    .eq('expedition_index', expeditionIndex);
  if (updateError) throw updateError;

  // Upsert log entry — uses exploration_started_at as unique key so pre-inserted
  // entries (e.g. manually created before the collect flow) are updated, not duplicated.
  const pouchQty = (type: MysticFrontierRewardType) =>
    rewards.find(r => r.type === type)?.quantity ?? 0;
  const { error: logError } = await supabase
    .from('mystic_frontier_expedition_log')
    .upsert({
      character_id: characterId,
      expedition_index: expeditionIndex,
      site_rank: rank,
      purple_pouch: pouchQty('purple_pouch'),
      orange_pouch: pouchQty('orange_pouch'),
      green_pouch: pouchQty('green_pouch'),
      exploration_started_at: explorationStartedAt,
      completed_at: now,
    }, { onConflict: 'character_id,expedition_index,exploration_started_at', ignoreDuplicates: true });
  if (logError) throw logError;

  // Only write to reward history if there are non-pouch rewards to record
  const nonPouchRewards = rewards.filter(r => !POUCH_REWARDS.has(r.type) && r.quantity > 0);
  if (nonPouchRewards.length > 0) {
    const { error: historyError } = await supabase
      .from('mystic_frontier_reward_history')
      .insert({
        character_id: characterId,
        expedition_index: expeditionIndex,
        site_rank: rank,
        rewards: nonPouchRewards,
        collected_at: now,
      });
    if (historyError) throw historyError;
  }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 21);
  const defaultExpiresAt = expiry.toISOString().split('T')[0];

  await Promise.all(
    nonPouchRewards
      .map(r => resourcesService.addBatch(
        accountId,
        REWARD_TO_RESOURCE[r.type]!,
        r.quantity,
        NO_EXPIRY_REWARDS.has(r.type) ? null : defaultExpiresAt,
        CUBE_REWARDS.has(r.type),
      )),
  );
}

export async function completeRest(
  characterId: string,
  expeditionIndex: 1 | 2 | 3,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('character_mystic_frontier_expeditions')
    .update({
      status: 'available',
      exploration_started_at: null,
      rest_started_at: null,
      updated_at: now,
    })
    .eq('character_id', characterId)
    .eq('expedition_index', expeditionIndex);
  if (error) throw error;
}

/** Shifts exploration_started_at or rest_started_at backwards by shiftMs to reduce remaining time. */
export async function shiftStartTime(
  characterId: string,
  expeditionIndex: 1 | 2 | 3,
  field: 'exploration_started_at' | 'rest_started_at',
  currentIso: string,
  shiftMs: number,
): Promise<void> {
  const newIso = new Date(new Date(currentIso).getTime() - shiftMs).toISOString();
  const { error } = await supabase
    .from('character_mystic_frontier_expeditions')
    .update({ [field]: newIso, updated_at: new Date().toISOString() })
    .eq('character_id', characterId)
    .eq('expedition_index', expeditionIndex);
  if (error) throw error;
}

export async function getRewardHistory(characterId: string): Promise<MysticFrontierRewardEntry[]> {
  const { data, error } = await supabase
    .from('mystic_frontier_reward_history')
    .select('*')
    .eq('character_id', characterId)
    .order('collected_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MysticFrontierRewardEntry[];
}

export async function getAllRewardHistory(): Promise<MysticFrontierRewardEntry[]> {
  const { data, error } = await supabase
    .from('mystic_frontier_reward_history')
    .select('*, character:characters!inner(account:accounts!inner(status))')
    .neq('character.account.status', 'banned')
    .order('collected_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MysticFrontierRewardEntry[];
}

export async function getAllExpeditionLog(): Promise<MysticFrontierExpeditionLog[]> {
  const { data, error } = await supabase
    .from('mystic_frontier_expedition_log')
    .select('*, character:characters!inner(account:accounts!inner(status))')
    .neq('character.account.status', 'banned')
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MysticFrontierExpeditionLog[];
}

export async function setUnlocked(characterId: string, unlocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('characters')
    .update({ is_mystic_frontier_unlocked: unlocked })
    .eq('id', characterId);
  if (error) throw error;
}
