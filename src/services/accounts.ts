// =============================================
// ACCOUNTS SERVICE - CRUD para cuentas
// =============================================

import supabase from '../lib/supabase';
import type { Account, AccountInsert, AccountUpdate } from '../types';

export const accountsService = {
    async getAll(opts?: { includeBanned?: boolean }): Promise<Account[]> {
        let query = supabase
            .from('accounts')
            .select('*')
            .order('number', { ascending: true });

        if (!opts?.includeBanned) {
            query = query.neq('status', 'banned');
        }

        const { data, error } = await query;
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
            .select('mesos_b')
            .neq('status', 'banned');

        if (error) throw error;
        return data?.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0) || 0;
    },

    async setLegionArtifact(id: string, value: boolean): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .update({ legion_artifact: value })
            .eq('id', id);
        if (error) throw error;
    },

    async setLegionArtifactLevel(id: string, level: number): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .update({ legion_artifact_level: level })
            .eq('id', id);
        if (error) throw error;
    },

};

export default accountsService;
