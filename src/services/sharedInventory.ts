// =============================================
// SHARED INVENTORY SERVICE - Baúl Compartido
// =============================================

import supabase from '../lib/supabase';
import type { SharedInventory } from '../types';

export const sharedInventoryService = {
    // Get the singleton shared inventory
    async get(): Promise<SharedInventory> {
        // We assume ID 1 is the singleton, or just fetch the first row
        const { data, error } = await supabase
            .from('shared_inventory')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            // If fetching fails, maybe it doesn't exist yet? 
            // Better to handle gracefully or throw. 
            // For now, throw to detect schema issues early.
            throw error;
        }
        return data;
    },

    async updateMesos(amount: number): Promise<SharedInventory> {
        // Updates the singleton. We assume ID=1 from the script.
        const { data, error } = await supabase
            .from('shared_inventory')
            .update({ mesos_stock: amount })
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePerfectInnocence(amount: number): Promise<SharedInventory> {
        const { data, error } = await supabase
            .from('shared_inventory')
            .update({ perfect_innocence_stock: amount })
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

export default sharedInventoryService;
