import { supabase } from '../lib/supabase';
import type { ExchangeRate, ExchangeRateInsert, ExchangeRateUpdate } from '../types';

export const exchangeRatesService = {
    async getAll(): Promise<ExchangeRate[]> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*')
            .order('base_currency', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<ExchangeRate | null> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(rate: ExchangeRateInsert): Promise<ExchangeRate> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .insert(rate)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: ExchangeRateUpdate): Promise<ExchangeRate> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .update({ ...updates, last_update: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('exchange_rates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
