// =============================================
// ITEMS SERVICE - CRUD para objetos
// =============================================

import supabase from '../lib/supabase';
import type { Item, ItemInsert, ItemUpdate, ItemWithCharacter, ItemStatus } from '../types';

export const itemsService = {
    async getAll(): Promise<ItemWithCharacter[]> {
        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                character:characters(*)
            `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        return (data as any) || [];
    },

    async getByStatus(status: ItemStatus): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any) || [];
    },

    async getByCharacterId(characterId: string): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('character_id', characterId)
            .order('name');

        if (error) throw error;
        return (data as any) || [];
    },

    async getById(id: string): Promise<ItemWithCharacter | null> {
        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                character:characters(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(item: ItemInsert): Promise<Item> {
        const { data, error } = await supabase
            .from('items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, item: ItemUpdate): Promise<Item> {
        // Clear favorite if status is changing
        const updates = { ...item };
        if (updates.status) {
            updates.is_favorite = false;
        }

        const { data, error } = await supabase
            .from('items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async transferToCharacter(itemId: string, characterId: string | null): Promise<Item> {
        const { data, error } = await supabase
            .from('items')
            .update({ character_id: characterId })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateStatus(itemId: string, status: ItemStatus): Promise<Item> {
        const { data, error } = await supabase
            .from('items')
            .update({ status, is_favorite: false })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Obtener estadísticas de items por status
    async getStatusCounts(): Promise<Record<ItemStatus, number>> {
        const { data, error } = await supabase
            .from('items')
            .select('status'); // Optimized: only fetch status column

        if (error) throw error;

        const counts: Record<ItemStatus, number> = {
            bulk: 0,
            in_stock: 0,
            for_sale: 0,
            sold: 0,
            in_progress: 0,
            Service: 0,
            in_use: 0
        };

        data?.forEach(item => {
            if (counts[item.status as ItemStatus] !== undefined) {
                counts[item.status as ItemStatus]++;
            }
        });

        return counts;
    },

    // Calcular valor total del stock (items no vendidos) siguiendo reglas de estado:
    // bulk: 0
    // in_stock: costo_item
    // for_sale: estimated_value
    async getTotalStockValue(): Promise<number> {
        const { data, error } = await supabase
            .from('items')
            .select('status, costo_item, estimated_value') // Optimized: only fetch needed columns
            .neq('status', 'sold')
            .neq('status', 'Service');

        if (error) throw error;

        return data?.reduce((sum, item) => {
            if (item.status === 'in_stock' || item.status === 'in_progress') return sum + (item.costo_item || 0);
            if (item.status === 'for_sale') return sum + (item.estimated_value || 0);
            return sum; // bulk or other unknown
        }, 0) || 0;
    },

    // Optimized for breakdown calculations
    async getItemBreakdown(): Promise<Array<{ status: string; costo_item: number; estimated_value: number }>> {
        const { data, error } = await supabase
            .from('items')
            .select('status, costo_item, estimated_value')
            .neq('status', 'sold')
            .neq('status', 'Service');

        if (error) throw error;
        return (data as any) || [];
    },

    async getTopForSale(limit = 6): Promise<Array<{ name: string; estimated_value: number }>> {
        const { data, error } = await supabase
            .from('items')
            .select('name, estimated_value')
            .eq('status', 'for_sale')
            .order('estimated_value', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data as any) || [];
    },

    // Update Auction House listing timestamp
    async updateAHListing(itemId: string, timestamp: string | null): Promise<Item> {
        const { data, error } = await supabase
            .from('items')
            .update({ ah_listed_at: timestamp })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Quick update for estimated value (price)
    async updateEstimatedValue(itemId: string, value: number): Promise<Item> {
        const { data, error } = await supabase
            .from('items')
            .update({ estimated_value: value })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateDeliveryStatus(id: string, delivered: boolean): Promise<void> {
        const { error } = await supabase
            .from('items')
            .update({ delivered })
            .eq('id', id);

        if (error) throw error;
    },

    async updateNameBulk(oldName: string, newName: string): Promise<void> {
        const { error } = await supabase
            .from('items')
            .update({ name: newName })
            .eq('name', oldName);

        if (error) throw error;
    },
};

export default itemsService;
