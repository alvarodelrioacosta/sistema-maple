// =============================================
// ITEMS DB SERVICE - Catálogo de ítems base
// =============================================

import { supabase } from '../lib/supabase';
import type { ItemDB, ItemDBInsert, ItemDBUpdate } from '../types';

export const itemsDBService = {
    async getAll(): Promise<ItemDB[]> {
        const { data, error } = await supabase
            .from('items_db')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<ItemDB | null> {
        const { data, error } = await supabase
            .from('items_db')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(item: ItemDBInsert): Promise<ItemDB> {
        const { data, error } = await supabase
            .from('items_db')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: ItemDBUpdate): Promise<ItemDB> {
        const { data, error } = await supabase
            .from('items_db')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('items_db')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

};
