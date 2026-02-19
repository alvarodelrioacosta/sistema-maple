// =============================================
// ACCOUNTS SERVICE - CRUD para cuentas
// =============================================

import supabase from '../lib/supabase';
import type { Account, AccountInsert, AccountUpdate } from '../types';

export const accountsService = {
    async getAll(): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('number', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<Account | null> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(account: AccountInsert): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .insert(account)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, account: AccountUpdate): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .update(account)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getTotalMesos(): Promise<number> {
        const { data, error } = await supabase
            .from('accounts')
            .select('mesos_b');

        if (error) throw error;
        return data?.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0) || 0;
    },

    async getTotalCubes(): Promise<{ bright: number, bonus: number, solid: number }> {
        const { data, error } = await supabase
            .from('accounts')
            .select('bright_cubes, bonus_bright_cubes, solid_cubes');

        if (error) throw error;

        return data?.reduce((acc, curr) => ({
            bright: acc.bright + (curr.bright_cubes || 0),
            bonus: acc.bonus + (curr.bonus_bright_cubes || 0),
            solid: acc.solid + (curr.solid_cubes || 0)
        }), { bright: 0, bonus: 0, solid: 0 }) || { bright: 0, bonus: 0, solid: 0 };
    }
};

export default accountsService;
