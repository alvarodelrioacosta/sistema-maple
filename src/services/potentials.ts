// =============================================
// POTENTIALS SERVICE - Obtención de potenciales
// =============================================

import supabase from '../lib/supabase';
import type { Potential } from '../types';

export const potentialsService = {
    async getMainPotentials(): Promise<Potential[]> {
        const { data, error } = await supabase
            .from('main_potential')
            .select('*')
            .order('potential_name');

        if (error) throw error;
        return data || [];
    },

    async getBonusPotentials(): Promise<Potential[]> {
        const { data, error } = await supabase
            .from('bonus_potential')
            .select('*')
            .order('potential_name');

        if (error) throw error;
        return data || [];
    }
};

export default potentialsService;
