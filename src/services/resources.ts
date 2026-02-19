// =============================================
// RESOURCES SERVICE - Inventario de recursos (Refactored to Accounts)
// =============================================

import supabase from '../lib/supabase';
import type { ResourceType } from '../types';
import accountsService from './accounts';

export const resourcesService = {
    // Deprecated: Resources are now part of Account. Use accountsService.getAll()
    // Keeping this for image fetching
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

    async updateQuantity(accountId: string, resourceType: ResourceType, quantity: number): Promise<void> {
        // Map resourceType to account column name (they match exactly in our new schema)
        const updatePayload = {
            [resourceType]: quantity
        };

        const { error } = await supabase
            .from('accounts')
            .update(updatePayload)
            .eq('id', accountId);

        if (error) throw error;
    },

    // Descontar cubos (para Upgrade Workspace)
    async deductCubes(accountId: string, cubeType: ResourceType, amount: number): Promise<void> {
        const account = await accountsService.getById(accountId);

        if (!account) {
            throw new Error(`Account not found`);
        }

        // Dynamic access to resource field
        const currentQuantity = (account as any)[cubeType] as number || 0;

        if (currentQuantity < amount) {
            throw new Error(`Insufficient ${cubeType}. Available: ${currentQuantity}, Required: ${amount}`);
        }

        await this.updateQuantity(accountId, cubeType, currentQuantity - amount);
    },

    // Agregar cubos
    async addCubes(accountId: string, cubeType: ResourceType, amount: number): Promise<void> {
        const account = await accountsService.getById(accountId);

        if (!account) {
            throw new Error(`Account not found`);
        }

        const currentQuantity = (account as any)[cubeType] as number || 0;
        await this.updateQuantity(accountId, cubeType, currentQuantity + amount);
    }
};

export default resourcesService;
