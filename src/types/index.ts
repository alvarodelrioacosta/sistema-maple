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
    mesos_b: number; // Billions of mesos usually, or just raw? User said "mesos_b". implied billion? Or just a key.
    // Assuming big integer mapping to number (might need care with JS Number safety > 2^53, but mesos usually < 9 quadrillion?)
    // Maplestory mesos cap is ~100b or 1000b? JS safe integer is 9 quadrillion.
    created_at: string;
}

export interface SharedInventory {
    id: number;
    mesos_stock: number;
    perfect_innocence_stock: number;
}

export type AccountInsert = Omit<Account, 'id' | 'created_at'>;
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
}

export type CharacterInsert = Omit<Character, 'id' | 'created_at' | 'exp' | 'avatar_url' | 'last_synced_at' | 'exp_percent'> & {
    exp?: number | null;
    avatar_url?: string | null;
    last_synced_at?: string | null;
    exp_percent?: number | null;
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
    remaining_trade_slots: number;
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
export type ResourceType = 'bright_cubes' | 'bonus_bright_cubes' | 'reward_points' | 'psok' | 'guardian_scroll' | 'solid_cubes' | 'perfect_innoc';

// Resources tracked with per-batch expiry dates (excludes mesos_b and perfect_innoc)
export type ExpiringResourceType = 'bright_cubes' | 'bonus_bright_cubes' | 'reward_points' | 'psok' | 'guardian_scroll' | 'solid_cubes';

export const EXPIRING_RESOURCE_TYPES: ExpiringResourceType[] = [
    'solid_cubes', 'bright_cubes', 'bonus_bright_cubes', 'reward_points', 'psok', 'guardian_scroll'
];

export const RESOURCE_LABELS: Record<ExpiringResourceType, string> = {
    solid_cubes: 'Solid Cubes',
    bright_cubes: 'Bright Cubes',
    bonus_bright_cubes: 'Bonus Bright Cubes',
    reward_points: 'Reward Points',
    psok: 'PSOK',
    guardian_scroll: 'Guardian Scroll'
};

export interface ResourceBatch {
    id: string;
    account_id: string;
    resource_type: ExpiringResourceType;
    quantity: number;
    expires_at: string | null; // ISO date YYYY-MM-DD, null = never expires
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

    // Pricing configurations
    bright_cube_price: number;
    bonus_bright_cube_price: number;
    solid_cubes_price: number;

    // Coverage settings
    covers_psok: boolean;
    covers_guardian_scroll: boolean;
    covers_perfect_innoc: boolean;

    currency: string;
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

    // Usage fields
    psok_used: number;
    bright_cubes_used: number;
    bonus_bright_cubes_used: number;
    perfect_innoc_used: number;
    gaurdian_scroll_used: number;
    solid_cubes_used: number;

    // Price fields
    psok_price: number;
    bright_cubes_price: number;
    bonus_bright_cubes_price: number;
    perfect_innoc_price: number;
    gaurdian_scroll_price: number;
    solid_cubes_price: number;

    // Totals and Status
    cubing_session_total: number;
    cubing_session_status: CubingSessionStatus;

    currency: string;
    meso_rate?: number; // Optional as older sessions might not have it
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
}

// ===== ACCOUNTS RECEIVABLE =====
export interface AccountReceivable {
    id: string;
    client_id: string;
    session_id: string | null;
    item_id: string | null;
    description: string;
    amount: number;
    paid: number;
    currency: string;
    status: 'pending' | 'partial' | 'paid';
    is_delivered: boolean;
    delivered_at: string | null;
    category?: string | null;
    subcategory?: string | null;
    created_at: string;
    updated_at: string;
    // Relationships
    client?: { id: string; name: string, currency?: string };
}

export type AccountReceivableInsert = Omit<AccountReceivable, 'id' | 'created_at' | 'updated_at' | 'paid' | 'status' | 'session_id' | 'item_id' | 'is_delivered' | 'delivered_at'> & {
    session_id?: string | null;
    item_id?: string | null;
    is_delivered?: boolean;
    delivered_at?: string | null;
    category?: string | null;
    subcategory?: string | null;
};

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

// =============================================
// TASKS MODULE
// =============================================

export interface Task {
    id: string;
    name: string;
    is_core: boolean;
    is_completed: boolean;
    show_in_daily?: boolean; // New field for Daily Check Up module
    order_index?: number | null;
    created_at: string;
}

export interface TaskProgress {
    id: string;
    task_id: string;
    account_id: string;
    completed: boolean;
    updated_at: string;
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'is_completed'>;

