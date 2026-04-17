import supabase from '../lib/supabase';

export interface Boss {
    id: string;
    name: string;
    crystal_mesos: number | null;
    needs_prequest: boolean;
    image_url: string | null;
    order_index: number | null;
    created_at: string;
}

export type BossUpdate = Pick<Boss, 'crystal_mesos'>;

export const bossesService = {
    async getAll(): Promise<Boss[]> {
        const { data, error } = await supabase
            .from('bosses')
            .select('*')
            .order('order_index', { nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    async update(id: string, updates: BossUpdate): Promise<Boss> {
        const { data, error } = await supabase
            .from('bosses')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
};
