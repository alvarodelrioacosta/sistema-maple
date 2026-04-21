import supabase from '../lib/supabase';
import type { ClientLedgerEntry, ClientLedgerEntryInsert, ClientLedgerEntryUpdate } from '../types';

export const clientLedgerService = {
    async getEntriesByClient(clientId: string): Promise<ClientLedgerEntry[]> {
        const { data, error } = await supabase
            .from('client_ledger_entries')
            .select('*, client:clients(id, name)')
            .eq('client_id', clientId)
            .order('entry_date', { ascending: true })
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async getAll(): Promise<ClientLedgerEntry[]> {
        const { data, error } = await supabase
            .from('client_ledger_entries')
            .select('*, client:clients(id, name)')
            .order('entry_date', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addEntry(entry: ClientLedgerEntryInsert): Promise<ClientLedgerEntry> {
        const { data, error } = await supabase
            .from('client_ledger_entries')
            .insert(entry)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateEntry(id: string, updates: ClientLedgerEntryUpdate): Promise<ClientLedgerEntry> {
        const { data, error } = await supabase
            .from('client_ledger_entries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteEntry(id: string): Promise<void> {
        const { error } = await supabase
            .from('client_ledger_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
