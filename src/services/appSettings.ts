import supabase from '../lib/supabase';

export const appSettingsService = {
    async get(key: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) return null;
        return data?.value ?? null;
    },

    async getMesoUsdRate(): Promise<number> {
        const value = await appSettingsService.get('meso_usd_rate');
        return value ? parseFloat(value) : 0;
    },

    async set(key: string, value: string): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() });

        if (error) throw error;
    }
};
