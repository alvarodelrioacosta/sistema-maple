// =============================================
// TRANSACTIONS SERVICE - Finanzas
// =============================================

import supabase from '../lib/supabase';
import type {
    Transaction,
    TransactionInsert,
    TransactionUpdate,
    TransactionWithRelations,
    TransactionType,
    TransactionMeso,
    TransactionMesoInsert
} from '../types';
import { autoCategorize } from '../utils/categorization';

export const transactionsService = {
    // ===== USD/FINANCIAL TRANSACTIONS =====
    async getAll(): Promise<TransactionWithRelations[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                client:clients(id, name),
                financial_account:financial_accounts(id, name, currency)
            `)
            .order('created_at', { ascending: false })
            .limit(100); // Default limit for performance

        if (error) throw error;
        return data || [];
    },

    // Optimized for Dashboard charts
    async getDashboardData(): Promise<
        Array<{ type: string; amount: number; category: string; currency: string; created_at: string; financial_account_id?: string | null; description?: string | null }>
    > {
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01T00:00:00`;

        const { data, error } = await supabase
            .from('transactions')
            .select('type, amount, category, currency, created_at, financial_account_id, description')
            .gte('created_at', startOfYear)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // For general list views
    async getRecentTransactions(limit = 100): Promise<TransactionWithRelations[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                client:clients(id, name),
                financial_account:financial_accounts(id, name, currency)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    async getByClient(clientId: string): Promise<TransactionWithRelations[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                client:clients(id, name),
                financial_account:financial_accounts(id, name, currency)
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true }); // Oldest first as requested

        if (error) throw error;
        return data || [];
    },

    async getByType(type: TransactionType): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                financial_account:financial_accounts(*)
            `)
            .eq('type', type)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getAccountsReceivable(): Promise<TransactionWithRelations[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        item:items(*),
        client:clients(*),
        session:cube_sessions(*),
        financial_account:financial_accounts(*)
      `)
            .eq('is_credit_sale', true)
            .eq('is_paid', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<TransactionWithRelations | null> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        item:items(*),
        client:clients(*),
        financial_account:financial_accounts(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(transaction: TransactionInsert): Promise<Transaction> {
        // Apply auto-categorization if not provided
        if (!transaction.category || !transaction.subcategory) {
            const { category, subcategory } = autoCategorize(
                transaction.type,
                transaction.description || '',
                { isAR: !!transaction.account_receivable_id, isSession: !!transaction.session_id }
            );
            transaction.category = transaction.category || category;
            transaction.subcategory = transaction.subcategory || subcategory;
        }

        const { data, error } = await supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, transaction: TransactionUpdate): Promise<Transaction> {
        const { data, error } = await supabase
            .from('transactions')
            .update(transaction)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markAsPaid(id: string): Promise<Transaction> {
        const { data, error } = await supabase
            .from('transactions')
            .update({ is_paid: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Calcular totales por tipo
    async getTotals(): Promise<{ income: number; expense: number }> {
        const { data, error } = await supabase
            .from('transactions')
            .select('type, amount');

        if (error) throw error;

        const totals = { income: 0, expense: 0 };

        data?.forEach(t => {
            if (t.type === 'income') totals.income += t.amount;
            else if (t.type === 'expense') totals.expense += t.amount;
            // sale is now income
        });

        return totals;
    },

    // Calcular cuentas por cobrar
    async getReceivableTotal(): Promise<number> {
        const { data, error } = await supabase
            .from('transactions')
            .select('amount')
            .eq('is_credit_sale', true)
            .eq('is_paid', false);

        if (error) throw error;

        return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    },


    // ===== MESO TRANSACTIONS (New Table) =====

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
        // Apply auto-categorization if not provided
        if (!transaction.category || !transaction.subcategory) {
            const desc = (transaction.description || '').toLowerCase();
            const isExchange = desc.includes('exchange') || desc.includes('purchase') || desc.includes('sale');

            const { category, subcategory } = autoCategorize(
                transaction.type as any,
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
