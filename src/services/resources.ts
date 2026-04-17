// =============================================
// RESOURCES SERVICE - Batch-based inventory with FIFO expiry
// =============================================
// Resources (solid_cubes, bright_cubes, bonus_bright_cubes,
// reward_points, psok, guardian_scroll) are stored as discrete
// batches with optional expiration dates.
//
// Consumption order (FIFO): earliest-expiring batches first,
// non-expiring batches (expires_at IS NULL) last.
//
// The accounts table resource columns are kept as synced
// aggregates so existing reads (DailyCheckUp, UpgradeWorkspace)
// continue to work without changes.
// =============================================

import supabase from '../lib/supabase';
import type { ResourceType, ExpiringResourceType, ResourceBatch } from '../types';
import { EXPIRING_RESOURCE_TYPES } from '../types';

const today = () => new Date().toISOString().split('T')[0];

// Filter expression for non-expired batches
const notExpiredFilter = () => `expires_at.is.null,expires_at.gte.${today()}`;

export const resourcesService = {

    // ---- Metadata (image / cost lookup) ----

    async getResourceMetadata(): Promise<Record<string, { image: string, rpCost: number, mesoCost: number }>> {
        const { data, error } = await supabase
            .from('resource_images')
            .select('resource_type, image_url, reward_point_cost, meso_cost');
        if (error) throw error;

        const map: Record<string, { image: string, rpCost: number, mesoCost: number }> = {};
        data?.forEach(item => {
            map[item.resource_type] = {
                image: item.image_url,
                rpCost: item.reward_point_cost || 0,
                mesoCost: item.meso_cost || 0
            };
        });
        return map;
    },

    // ---- Batch reads ----

    // Returns all active (non-expired, quantity > 0) batches for an account,
    // ordered so earliest-expiring comes first (nulls last).
    // Helper to quickly correct an absolute balance without knowing the current one.
    // Useful for UI inputs that represent the total available amount (like RP).
    async setAbsoluteBalance(accountId: string, resourceType: ExpiringResourceType, newAbsoluteBalance: number): Promise<void> {
        const balances = await this.getAllBalances(accountId);
        const currentBalance = balances[resourceType] || 0;
        const diff = newAbsoluteBalance - currentBalance;
        
        if (diff !== 0) {
            await this.addBatch(accountId, resourceType, diff, null);
        }
    },

    async getBatches(accountId: string, resourceType?: ExpiringResourceType): Promise<ResourceBatch[]> {
        let query = supabase
            .from('account_resource_batches')
            .select('*')
            .eq('account_id', accountId)
            .gt('quantity', 0)
            .or(notExpiredFilter())
            .order('expires_at', { ascending: true, nullsFirst: false });

        if (resourceType) {
            query = query.eq('resource_type', resourceType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as ResourceBatch[];
    },

    // Current usable balance for one resource type (sum of non-expired batches)
    async getBalance(accountId: string, resourceType: ExpiringResourceType): Promise<number> {
        const { data, error } = await supabase
            .from('account_resource_batches')
            .select('quantity')
            .eq('account_id', accountId)
            .eq('resource_type', resourceType)
            .gt('quantity', 0)
            .or(notExpiredFilter());
        if (error) throw error;
        return (data || []).reduce((sum, row) => sum + row.quantity, 0);
    },

    // Balances for all expiring resource types at once
    async getAllBalances(accountId: string): Promise<Record<ExpiringResourceType, number>> {
        const { data, error } = await supabase
            .from('account_resource_batches')
            .select('resource_type, quantity')
            .eq('account_id', accountId)
            .gt('quantity', 0)
            .or(notExpiredFilter());
        if (error) throw error;

        const result: Record<string, number> = {};
        EXPIRING_RESOURCE_TYPES.forEach(t => { result[t] = 0; });
        (data || []).forEach(row => {
            result[row.resource_type] = (result[row.resource_type] || 0) + row.quantity;
        });
        return result as Record<ExpiringResourceType, number>;
    },

    // ---- Batch writes ----

    // Add a new batch (e.g. just bought 5 solid cubes expiring on 18/04)
    async addBatch(
        accountId: string,
        resourceType: ExpiringResourceType,
        quantity: number,
        expiresAt?: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('account_resource_batches')
            .insert({
                account_id: accountId,
                resource_type: resourceType,
                quantity,
                expires_at: expiresAt || null
            });
        if (error) throw error;
    },

    async deleteBatch(batchId: string): Promise<void> {
        const { error } = await supabase
            .from('account_resource_batches')
            .delete()
            .eq('id', batchId);
        if (error) throw error;
    },

    // ---- Expiry cleanup ----

    // Deletes all batches whose expiration date has passed and syncs aggregates.
    // Call on app load or via a scheduled check.
    async expireOldBatches(accountId?: string): Promise<number> {
        const t = today();
        let query = supabase
            .from('account_resource_batches')
            .select('id, account_id, resource_type, quantity')
            .lt('expires_at', t)
            .gt('quantity', 0);

        if (accountId) query = query.eq('account_id', accountId);

        const { data: expired, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        if (!expired || expired.length === 0) return 0;

        const ids = expired.map(b => b.id);
        const { error: delErr } = await supabase
            .from('account_resource_batches')
            .delete()
            .in('id', ids);
        if (delErr) throw delErr;

        // We no longer sync aggregates back to the accounts table.
        return expired.length;
    },

    // ---- Consumption (FIFO) ----

    // Deducts `amount` from the account's batches using FIFO order
    // (earliest-expiring first, non-expiring last).
    // Also kept backward-compatible: still called from UpgradeWorkspace.
    async deductCubes(accountId: string, resourceType: ResourceType, amount: number): Promise<void> {
        if (resourceType === 'perfect_innoc') {
            throw new Error('perfect_innoc is managed via shared_inventory, not resource batches');
        }

        const t = today();
        const { data: batches, error } = await supabase
            .from('account_resource_batches')
            .select('id, quantity')
            .eq('account_id', accountId)
            .eq('resource_type', resourceType)
            .gt('quantity', 0)
            .or(`expires_at.is.null,expires_at.gte.${t}`)
            .order('expires_at', { ascending: true, nullsFirst: false });
        if (error) throw error;

        const available = (batches || []).reduce((sum, b) => sum + b.quantity, 0);
        if (available < amount) {
            throw new Error(`Insufficient ${resourceType}. Available: ${available}, Required: ${amount}`);
        }

        let remaining = amount;
        for (const batch of batches || []) {
            if (remaining <= 0) break;
            const deduct = Math.min(batch.quantity, remaining);
            const { error: updateErr } = await supabase
                .from('account_resource_batches')
                .update({ quantity: batch.quantity - deduct })
                .eq('id', batch.id);
            if (updateErr) throw updateErr;
            remaining -= deduct;
        }
    },

    // Legacy addCubes kept for any callers outside the Resources page.
    // Adds a non-expiring batch.
    async addCubes(accountId: string, cubeType: ResourceType, amount: number): Promise<void> {
        if (cubeType === 'perfect_innoc') return;
        await this.addBatch(accountId, cubeType as ExpiringResourceType, amount, null);
    },

// Removed _syncAggregate function as fields are dropped from accounts.

    // Kept only for mesos_b (non-batch field) or emergency overrides.
    async updateQuantity(accountId: string, resourceType: ResourceType, quantity: number): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .update({ [resourceType]: quantity })
            .eq('id', accountId);
        if (error) throw error;
    },
};

export default resourcesService;
