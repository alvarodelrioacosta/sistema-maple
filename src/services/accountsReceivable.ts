import supabase from '../lib/supabase';
import type { AccountReceivable, AccountReceivableInsert } from '../types';
import { autoCategorize } from '../utils/categorization';

export const accountsReceivableService = {
    async getAll(): Promise<AccountReceivable[]> {
        const { data, error } = await supabase
            .from('accounts_receivable')
            .select('*, client:clients(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getByClient(clientId: string): Promise<AccountReceivable[]> {
        const { data, error } = await supabase
            .from('accounts_receivable')
            .select('*, client:clients(*)')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true }); // Oldest first

        if (error) throw error;
        return data || [];
    },

    async create(ar: AccountReceivableInsert): Promise<AccountReceivable> {
        // Apply auto-categorization if not provided
        if (!ar.category || !ar.subcategory) {
            const { category, subcategory } = autoCategorize(
                'income',
                ar.description || '',
                { isAR: true }
            );
            ar.category = ar.category || category;
            ar.subcategory = ar.subcategory || subcategory;
        }

        const { data, error } = await supabase
            .from('accounts_receivable')
            .insert({ ...ar, paid: 0, status: 'pending' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePayment(id: string, amountPaid: number): Promise<void> {
        // Fetch current
        const { data: current, error: fetchError } = await supabase
            .from('accounts_receivable')
            .select('amount, paid')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const newPaid = (current.paid || 0) + amountPaid;
        const status = newPaid >= current.amount ? 'paid' : 'partial';

        const { error } = await supabase
            .from('accounts_receivable')
            .update({ paid: newPaid, status })
            .eq('id', id);

        if (error) throw error;
    },

    async updateDeliveryStatus(id: string, isDelivered: boolean): Promise<void> {
        const { error } = await supabase
            .from('accounts_receivable')
            .update({
                is_delivered: isDelivered,
                delivered_at: isDelivered ? new Date().toISOString() : null
            })
            .eq('id', id);

        if (error) throw error;
    },

    async update(id: string, updates: Partial<AccountReceivable>): Promise<AccountReceivable> {
        const { data, error } = await supabase
            .from('accounts_receivable')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('accounts_receivable')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
