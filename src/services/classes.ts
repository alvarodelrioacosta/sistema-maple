
import supabase from '../lib/supabase';
import type { ClassItem } from '../types';

export const classesService = {
    async getAll(): Promise<ClassItem[]> {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('class_name');

        if (error) throw error;
        return data as ClassItem[];
    }
};
