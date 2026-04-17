import supabase from '../lib/supabase';

export const expTnlService = {
    async getByLevel(level: number): Promise<number | null> {
        const { data, error } = await supabase
            .from('exp_tnl')
            .select('exp_to_next_level')
            .eq('level', level)
            .single();
        if (error || !data) return null;
        return Number(data.exp_to_next_level);
    }
};
