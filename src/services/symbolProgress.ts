import supabase from '../lib/supabase';

export interface SymbolProgress {
    id: string;
    character_id: string;
    symbol_name: string;
    symbol_type: 'arcane' | 'sacred';
    symbol_level: number;
    updated_at: string;
}

export const symbolProgressService = {
    async getAll(): Promise<SymbolProgress[]> {
        const { data, error } = await supabase
            .from('symbol_progress')
            .select('*');
        if (error) throw error;
        return data || [];
    },

    async getByCharacter(characterId: string): Promise<SymbolProgress[]> {
        const { data, error } = await supabase
            .from('symbol_progress')
            .select('*')
            .eq('character_id', characterId);
        if (error) throw error;
        return data || [];
    },

    async upsert(characterId: string, symbolName: string, symbolType: 'arcane' | 'sacred', level: number): Promise<void> {
        const { error } = await supabase
            .from('symbol_progress')
            .upsert({
                character_id: characterId,
                symbol_name: symbolName,
                symbol_type: symbolType,
                symbol_level: level,
                updated_at: new Date().toISOString()
            }, { onConflict: 'character_id,symbol_name' });
        if (error) throw error;
    },

    async bulkUpsert(characterId: string, entries: { symbol_name: string; symbol_type: 'arcane' | 'sacred'; symbol_level: number }[]): Promise<void> {
        const rows = entries.map(e => ({
            character_id: characterId,
            symbol_name: e.symbol_name,
            symbol_type: e.symbol_type,
            symbol_level: e.symbol_level,
            updated_at: new Date().toISOString()
        }));
        const { error } = await supabase
            .from('symbol_progress')
            .upsert(rows, { onConflict: 'character_id,symbol_name' });
        if (error) throw error;
    }
};
