// =============================================
// CLIENTS SERVICE - CRUD para clientes
// =============================================

import supabase from '../lib/supabase';
import type { Client, ClientInsert, ClientUpdate } from '../types';

export const clientsService = {
    async getAll(): Promise<Client[]> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getAdmin(): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('is_admin', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async create(client: ClientInsert): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .insert(client)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, client: ClientUpdate): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .update(client)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

export default clientsService;
