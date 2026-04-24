// =============================================
// TYPES - Interfaces para el modelo de datos
// Mapean las tablas de Supabase
// =============================================

// ===== ACCOUNTS =====
export interface Account {
    id: string;
    number: number;
    email: string | null;
    tag: string | null;
    mesos_b: number;
    created_at: string;
    legion_artifact: boolean;
    legion_artifact_level: number | null;
    owned: boolean;
}

export interface SharedInventory {
    id: number;
    mesos_stock: number;
    perfect_innocence_stock: number;
}

export type AccountInsert = Omit<Account, 'id' | 'created_at' | 'legion_artifact' | 'legion_artifact_level' | 'owned'> & {
    legion_artifact?: boolean;
    legion_artifact_level?: number | null;
    owned?: boolean;
};
export type AccountUpdate = Partial<AccountInsert>;

// ===== CHARACTERS =====
export type JobType = 'Warrior' | 'Bowman' | 'Thief' | 'Pirate' | 'Magician';

export interface Character {
    id: string;
    account_id: string;
    name: string;
    level: number;
    class: string | null;
    job: JobType | null;
    main: 'Main' | 'Mule' | null;
    created_at: string;
    exp: number | null;
    avatar_url: string | null;
    last_synced_at: string | null;
    exp_percent: number | null;
    // Symbol levels
    sym_vj: number | null;
    sym_chuchu: number | null;
    sym_lach: number | null;
    sym_arc: number | null;
    sym_mor: number | null;
    sym_esf: number | null;
    sym_cer: number | null;
    sym_harc: number | null;
    sym_odi: number | null;
    sym_sha: number | null;
    sym_art: number | null;
    sym_car: number | null;
    sym_tal: number | null;
    sym_gea: number | null;
    // 6th job skill levels (0-30)
    origin: number | null;
    ascent: number | null;
    mastery1: number | null;
    mastery2: number | null;
    mastery3: number | null;
    mastery4: number | null;
    mastery5: number | null;
    boost1: number | null;
    boost2: number | null;
    boost3: number | null;
    boost4: number | null;
    janus: number | null;
    hecate: number | null;
    // Extra Stats
    pet_expiry_date: string | null;
    hexa_stat_1_level: number | null;
    hexa_stat_1_enabled: boolean;
    hexa_stat_2_level: number | null;
    hexa_stat_2_enabled: boolean;
    hexa_stat_3_level: number | null;
    hexa_stat_3_enabled: boolean;
    // Content unlock booleans
    unlock_cygnus: boolean;
    unlock_pink_bean: boolean;
    unlock_magnus: boolean;
    unlock_slime: boolean;
    unlock_papulatus: boolean;
    unlock_6th_job: boolean;
    unlock_boss_pots: boolean;
    unlock_mf_8_fams: boolean;
    unlock_mf_9_fams: boolean;
}

export type CharacterInsert = Omit<Character, 'id' | 'created_at' | 'exp' | 'avatar_url' | 'last_synced_at' | 'exp_percent' | 'sym_vj' | 'sym_chuchu' | 'sym_lach' | 'sym_arc' | 'sym_mor' | 'sym_esf' | 'sym_cer' | 'sym_harc' | 'sym_odi' | 'sym_sha' | 'sym_art' | 'sym_car' | 'sym_tal' | 'sym_gea' | 'origin' | 'ascent' | 'mastery1' | 'mastery2' | 'mastery3' | 'mastery4' | 'mastery5' | 'boost1' | 'boost2' | 'boost3' | 'boost4' | 'janus' | 'hecate' | 'pet_expiry_date' | 'hexa_stat_1_level' | 'hexa_stat_1_enabled' | 'hexa_stat_2_level' | 'hexa_stat_2_enabled' | 'hexa_stat_3_level' | 'hexa_stat_3_enabled' | 'unlock_cygnus' | 'unlock_pink_bean' | 'unlock_magnus' | 'unlock_slime' | 'unlock_papulatus' | 'unlock_6th_job' | 'unlock_boss_pots' | 'unlock_mf_8_fams' | 'unlock_mf_9_fams'> & {
    exp?: number | null;
    avatar_url?: string | null;
    last_synced_at?: string | null;
    exp_percent?: number | null;
    sym_vj?: number | null;
    sym_chuchu?: number | null;
    sym_lach?: number | null;
    sym_arc?: number | null;
    sym_mor?: number | null;
    sym_esf?: number | null;
    sym_cer?: number | null;
    sym_harc?: number | null;
    sym_odi?: number | null;
    sym_sha?: number | null;
    sym_art?: number | null;
    sym_car?: number | null;
    sym_tal?: number | null;
    sym_gea?: number | null;
    origin?: number | null;
    ascent?: number | null;
    mastery1?: number | null;
    mastery2?: number | null;
    mastery3?: number | null;
    mastery4?: number | null;
    mastery5?: number | null;
    boost1?: number | null;
    boost2?: number | null;
    boost3?: number | null;
    boost4?: number | null;
    janus?: number | null;
    hecate?: number | null;
    pet_expiry_date?: string | null;
    hexa_stat_1_level?: number | null;
    hexa_stat_1_enabled?: boolean;
    hexa_stat_2_level?: number | null;
    hexa_stat_2_enabled?: boolean;
    hexa_stat_3_level?: number | null;
    hexa_stat_3_enabled?: boolean;
};
export type CharacterUpdate = Partial<CharacterInsert>;

// ===== ITEMS DB (Catálogo de ítems) =====
// ===== ITEMS DB (Catálogo de ítems) =====
export type ItemType = 'Hat' | 'Top' | 'Bottom' | 'Gloves' | 'Shoes' | 'Cape' | 'Belt' | 'Shoulder' | 'Face Acc.' | 'Eye Acc.' | 'Ring' | 'Earring' | 'Pendant' | 'Weapon' | 'Secondary' | 'Emblem' | 'Heart' | 'Pocket' | 'Badge';

export interface ItemDB {
    id: string;
    name: string;
    type: ItemType | null;
    item_lv: number;
    slots: number;
    can_starforce: boolean;
    infinite_trades: boolean;
    always_tradeable: boolean;
    image_url: string | null;
    set: string | null;
    created_at: string;
}

export type ItemDBInsert = Omit<ItemDB, 'id' | 'created_at'>;
export type ItemDBUpdate = Partial<ItemDBInsert>;

// ===== ITEMS =====
export type ItemStatus = 'bulk' | 'in_progress' | 'in_stock' | 'for_sale' | 'sold' | 'Service' | 'in_use';
export type PotentialTier = 'Rare' | 'Epic' | 'Unique' | 'Legendary';

export type TradeabilityType = 'Tradeable' | 'Tradeable Once' | 'Untradeable';

export interface Item {
    id: string;
    character_id: string | null;
    name: string;
    star_force: number;
    tradeability: TradeabilityType;
    remaining_trade_slots: number | null;
    estimated_value: number;
    main_potential_tier: PotentialTier | null;
    main_potential_1: string | null;
    main_potential_2: string | null;
    main_potential_3: string | null;
    bonus_potential_tier: PotentialTier | null;
    bonus_potential_1: string | null;
    bonus_potential_2: string | null;
    bonus_potential_3: string | null;
    costo_item: number;
    costo_cubos: number;
    costo_psok: number;
    costo_sf: number;
    costo_perfect_innoc: number;
    costo_guardian_scroll: number;
    costo_replacement: number;
    costo_total: number;
    status: ItemStatus;
    delivered: boolean;
    ah_listed_at: string | null;
    is_favorite?: boolean;
    created_at: string;
}

export type ItemInsert = Omit<Item, 'id' | 'created_at'>;
export type ItemUpdate = Partial<ItemInsert>;

// ===== RESOURCES =====
export type ResourceType = 'bright_cubes' | 'bonus_bright_cubes' | 'reward_points' | 'psok' | 'guardian_scroll' | 'solid_cubes' | 'perfect_innoc' | 'familiar_ring_box' | 'black_heart' | 'dawn_accessory_box' | 'pitched_boss_accessory_box' | 'pitched_star_core';

// Resources tracked with per-batch expiry dates (excludes mesos_b and perfect_innoc)
export type ExpiringResourceType = 'bright_cubes' | 'bonus_bright_cubes' | 'reward_points' | 'psok' | 'guardian_scroll' | 'solid_cubes' | 'familiar_ring_box' | 'black_heart' | 'dawn_accessory_box' | 'pitched_boss_accessory_box' | 'pitched_star_core';

export const EXPIRING_RESOURCE_TYPES: ExpiringResourceType[] = [
    'solid_cubes', 'bright_cubes', 'bonus_bright_cubes', 'reward_points', 'psok', 'guardian_scroll',
    'familiar_ring_box', 'black_heart', 'dawn_accessory_box', 'pitched_boss_accessory_box', 'pitched_star_core'
];

export const RESOURCE_LABELS: Record<ExpiringResourceType, string> = {
    solid_cubes: 'Solid Cubes',
    bright_cubes: 'Bright Cubes',
    bonus_bright_cubes: 'Bonus Bright Cubes',
    reward_points: 'Reward Points',
    psok: 'PSOK',
    guardian_scroll: 'Guardian Scroll',
    familiar_ring_box: 'Familiar Box',
    black_heart: 'Black Heart',
    dawn_accessory_box: 'Dawn Accessory Box',
    pitched_boss_accessory_box: 'Pitched Boss Acc. Box',
    pitched_star_core: 'Pitched Star Core',
};

export interface ResourceBatch {
    id: string;
    account_id: string;
    resource_type: ExpiringResourceType;
    quantity: number;
    expires_at: string | null; // ISO date YYYY-MM-DD, null = never expires
    is_karma: boolean;
    created_at: string;
}

export type ResourceBatchInsert = Omit<ResourceBatch, 'id' | 'created_at'>;

// ===== BOSSING =====
export interface BossingSession {
    id: string;
    account_id: string;
    week_start: string;        // ISO date — Monday of the bossing week
    bosses_cleared: string[];  // array of boss UUIDs
    rp_earned: number;
    rp_expires_at: string;     // ISO date — last day of next month
    registered_at: string;
}

// ===== CLIENTS =====
export interface Client {
    id: string;
    name: string;
    contact_info: string | null;
    is_admin: boolean;
    next_payment_date: string | null;
    payment_agreement: string | null;
    created_at: string;
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'next_payment_date' | 'payment_agreement'> & {
    next_payment_date?: string | null;
    payment_agreement?: string | null;
};
export type ClientUpdate = Partial<ClientInsert>;

// ===== TRANSACTIONS =====
export interface TransactionMeso {
    id: string;
    account_id: string | null;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string | null;
    item_id: string | null;
    client_id: string | null;
    account_receivable_id: string | null;
    session_id: string | null;
    category?: string | null;
    subcategory?: string | null;
    created_at: string;
    account?: { id: string, name: string }; // Joined from accounts
    item?: any;
    client?: any;
}

export interface TransactionMesoInsert {
    account_id: string | null;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    description?: string | null;
    item_id?: string | null;
    client_id?: string | null;
    account_receivable_id?: string | null;
    session_id?: string | null;
    category?: string | null;
    subcategory?: string | null;
    transfer_id?: string | null;
}

// ===== CUBE SESSIONS =====
export type CubingSessionStatus = 'Ongoing' | 'Finished';

export interface CubeSession {
    id: string;
    item_id: string;
    client_id: string | null;
    account_id: string;

    // Usage counts only — pricing lives in the AR created from Cubing History
    psok_used: number;
    bright_cubes_used: number;
    bonus_bright_cubes_used: number;
    perfect_innoc_used: number;
    gaurdian_scroll_used: number;
    solid_cubes_used: number;

    cubing_session_status: CubingSessionStatus;
    account_receivable_id?: string | null;
    created_at: string;
}

export type CubeSessionInsert = Omit<CubeSession, 'id' | 'created_at'>;
export type CubeSessionUpdate = Partial<CubeSessionInsert>;

// ===== EXTENDED TYPES (con relaciones) =====
export interface CharacterWithAccount extends Character {
    account?: Account;
}

export interface ItemWithCharacter extends Item {
    character?: Character;
}

// ===== KPI TYPES =====
export interface DashboardKPIs {
    totalStockValue: number;
    accountsReceivable: number;
    totalResourceValue: number;
    totalMesos: number;
    netBalance: number;
    itemsByStatus: {
        bulk: number;
        in_stock: number;
        for_sale: number;
        sold: number;
    };
}
// ===== CLASSES =====
export interface ClassItem {
    id: string;
    class_name: string;
    job_1: JobType;
    job_2: JobType | null;
    image_1: string;
    image_2: string | null;
    // 6th job skill image URLs
    origin: string | null;
    ascent: string | null;
    mastery1: string | null;
    mastery2: string | null;
    mastery3: string | null;
    mastery4: string | null;
    mastery5: string | null;
    boost1: string | null;
    boost2: string | null;
    boost3: string | null;
    boost4: string | null;
    janus: string | null;
    hecate: string | null;
    // 6th job skill names
    origin_name: string | null;
    ascent_name: string | null;
    mastery1_name: string | null;
    mastery2_name: string | null;
    mastery3_name: string | null;
    mastery4_name: string | null;
    mastery5_name: string | null;
    boost1_name: string | null;
    boost2_name: string | null;
    boost3_name: string | null;
    boost4_name: string | null;
    janus_name: string | null;
    hecate_name: string | null;
}


// ===== RESOURCE USAGE HISTORY =====
export type ResourceActionType = 'use' | 'deduct' | 'transfer';
export type PaymentMethodType = 'stock' | 'mesos' | 'rp' | 'gift';

export interface ResourceUsageHistory {
    id: string;
    session_id: string | null;
    account_id: string | null;
    item_id: string | null;
    resource_type: string;
    action_type: ResourceActionType;
    quantity: number;
    payment_method: PaymentMethodType | null;
    meso_cost: number;
    rp_cost: number;
    covered_by_me: boolean;
    target_account_id: string | null;
    notes: string | null;
    created_at: string;
}

export type ResourceUsageHistoryInsert = Omit<ResourceUsageHistory, 'id' | 'created_at'>;

// ===== EVENTS =====
export type EventType = 'daily_login' | 'bossing';

export interface GameEvent {
    id: string;
    name: string;
    type: EventType;
    start_date: string;
    end_date: string;
    reset_hour: number;
    week_start_day: number | null;
    max_per_week: number | null;
    max_per_event: number | null;
    is_active: boolean;
    is_favorite: boolean;
    is_finished: boolean;
    created_at: string;
}

export type GameEventInsert = Omit<GameEvent, 'id' | 'created_at' | 'is_active' | 'is_favorite' | 'is_finished'>;

export interface EventDailyReward {
    id: string;
    event_id: string;
    resource_type: string;
    quantity: number;
    days_required: number;
}

export type EventDailyRewardInsert = Omit<EventDailyReward, 'id'>;

export interface EventDailyProgress {
    id: string;
    event_id: string;
    account_id: string;
    date: string;
    completed: boolean;
    created_at: string;
}

export type EventDailyProgressInsert = Omit<EventDailyProgress, 'id' | 'created_at'>;

export interface EventAccountProgress {
    id: string;
    event_id: string;
    account_id: string;
    last_completed_date: string | null;
    current_week_number: number;
    current_week_count: number;
    total_count: number;
    updated_at: string;
}

export interface EventDailyClaim {
    id: string;
    event_id: string;
    account_id: string;
    reward_id: string;
    claimed_at: string;
}

export type EventDailyClaimInsert = Omit<EventDailyClaim, 'id' | 'claimed_at'>;

export interface EventBoss {
    id: string;
    event_id: string;
    boss_name: string;
    points: number;
}

export type EventBossInsert = Omit<EventBoss, 'id'>;

export interface EventShopItem {
    id: string;
    event_id: string;
    resource_type: string;
    price: number;
    max_per_week: number;
}

export type EventShopItemInsert = Omit<EventShopItem, 'id'>;

export interface EventBossingProgress {
    id: string;
    event_id: string;
    account_id: string;
    week_number: number;
    highest_boss_id: string | null;
    points_earned: number;
    created_at: string;
}

export type EventBossingProgressInsert = Omit<EventBossingProgress, 'id' | 'created_at'>;

export interface EventShopPurchase {
    id: string;
    event_id: string;
    account_id: string;
    shop_item_id: string;
    week_number: number;
    quantity: number;
    purchased_at: string;
}

export type EventShopPurchaseInsert = Omit<EventShopPurchase, 'id' | 'purchased_at'>;

// ─── Mystic Frontier ─────────────────────────────────────────────────────────

export type MysticFrontierSiteRank = 'Common' | 'Rare' | 'Epic' | 'Unique' | 'Legendary';
export type MysticFrontierStatus = 'available' | 'exploring' | 'resting';
export type MysticFrontierRewardType =
  | 'familiar_ring_box'
  | 'pitched_boss_accessory_box'
  | 'pitched_star_core'
  | 'black_heart'
  | 'dawn_accessory_box'
  | 'purple_pouch'
  | 'orange_pouch'
  | 'green_pouch'
  | 'karma_solid_cubes'
  | 'karma_bright_cubes'
  | 'karma_bonus_bright_cubes';

export interface MysticFrontierExpedition {
  id: string;
  character_id: string;
  expedition_index: 1 | 2 | 3;
  site_rank: MysticFrontierSiteRank;
  status: MysticFrontierStatus;
  exploration_started_at: string | null;
  rest_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MysticFrontierRewardItem {
  type: MysticFrontierRewardType;
  quantity: number;
}

export interface MysticFrontierRewardEntry {
  id: string;
  character_id: string;
  expedition_index: 1 | 2 | 3;
  site_rank: MysticFrontierSiteRank;
  rewards: MysticFrontierRewardItem[];
  collected_at: string;
}

export interface MysticFrontierExpeditionLog {
  id: string;
  character_id: string;
  expedition_index: 1 | 2 | 3;
  site_rank: MysticFrontierSiteRank;
  purple_pouch: number;
  orange_pouch: number;
  green_pouch: number;
  completed_at: string;
}

// ===== CLIENT LEDGER (AR v2) =====
export type LedgerEntryType = 'charge' | 'payment';

export interface CubeSessionMetadata {
    item_name: string;
    account_number: number;
    bright_cubes_used: number;
    bonus_bright_cubes_used: number;
    solid_cubes_used: number;
    psok_used: number;
    perfect_innoc_used: number;
    guardian_scroll_used: number;
    bright_price: number;
    bonus_price: number;
    solid_price: number;
    psok_price: number;
    p_innoc_price: number;
    g_scroll_price: number;
    item_cost_enabled?: boolean;
    item_cost?: number;
    adjustment_enabled?: boolean;
    adjustment?: number;
    adjustment_label?: string;
}

export interface ClientLedgerEntry {
    id: string;
    client_id: string;
    entry_type: LedgerEntryType;
    description: string;
    amount: number;
    currency: string;
    entry_date: string;  // 'YYYY-MM-DD'
    notes: string | null;
    cube_session_id: string | null;
    source_metadata: CubeSessionMetadata | null;
    created_at: string;
    updated_at: string;
    client?: { id: string; name: string };
}

export interface ClientLedgerEntryInsert {
    client_id: string;
    entry_type: LedgerEntryType;
    description: string;
    amount: number;
    currency: string;
    entry_date: string;
    notes?: string | null;
    cube_session_id?: string | null;
    source_metadata?: CubeSessionMetadata | null;
}

export type ClientLedgerEntryUpdate = Partial<ClientLedgerEntryInsert>;

export interface CurrencyBalance {
    currency: string;
    totalCharges: number;
    totalPayments: number;
    balance: number;
}

