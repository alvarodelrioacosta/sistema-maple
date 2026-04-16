// =============================================
// TRANSACTIONS SERVICE - Meso Transactions
// =============================================

import supabase from '../lib/supabase';
import type { TransactionMeso, TransactionMesoInsert } from '../types';
import { autoCategorize } from '../utils/categorization';

export const transactionsService = {
    async getAllMesos(): Promise<TransactionMeso[]> {
        const { data, error } = await supabase
            .from('transactions_mesos')
            .select(`
                *,
                account:accounts(id, number, email, tag),
                item:items(id, name),
                client:clients(id, name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getMesosByClient(clientId: string): Promise<TransactionMeso[]> {
        const { data, error } = await supabase
            .from('transactions_mesos')
            .select(`
                *,
                account:accounts(id, number, email, tag),
                item:items(id, name),
                client:clients(id, name)
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createMeso(transaction: TransactionMesoInsert): Promise<TransactionMeso> {
        if (!transaction.category || !transaction.subcategory) {
            const desc = (transaction.description || '').toLowerCase();
            const isExchange = desc.includes('exchange') || desc.includes('purchase') || desc.includes('sale');

            const { category, subcategory } = autoCategorize(
                transaction.type,
                transaction.description || '',
                {
                    isMeso: true,
                    isAR: !!transaction.account_receivable_id,
                    isSession: !!transaction.session_id,
                    isExchange: isExchange
                }
            );
            transaction.category = transaction.category || category;
            transaction.subcategory = transaction.subcategory || subcategory;
        }

        const { data, error } = await supabase
            .from('transactions_mesos')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateMeso(id: string, transaction: Partial<TransactionMeso>): Promise<TransactionMeso> {
        const { data, error } = await supabase
            .from('transactions_mesos')
            .update(transaction)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteMeso(id: string): Promise<void> {
        const { error } = await supabase
            .from('transactions_mesos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getMesoTotals(): Promise<{ income: number; expense: number }> {
        const { data, error } = await supabase
            .from('transactions_mesos')
            .select('type, amount');

        if (error) throw error;

        const totals = { income: 0, expense: 0 };
        data?.forEach(t => {
            if (t.type === 'income') totals.income += t.amount;
            else if (t.type === 'expense') totals.expense += t.amount;
        });

        return totals;
    }
};

export default transactionsService;
