import { supabase } from '../lib/supabase';
import type { FinancialAccount } from '../types';

export const financialAccountsService = {
    async getAll(): Promise<FinancialAccount[]> {
        const { data, error } = await supabase
            .from('financial_accounts')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<FinancialAccount | null> {
        const { data, error } = await supabase
            .from('financial_accounts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(account: Omit<FinancialAccount, 'id' | 'created_at'>): Promise<FinancialAccount> {
        const { data, error } = await supabase
            .from('financial_accounts')
            .insert(account)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount> {
        const { data, error } = await supabase
            .from('financial_accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
