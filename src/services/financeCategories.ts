import supabase from '../lib/supabase';

export interface FinanceCategory {
    id: string;
    name: string;
    is_system: boolean;
    created_at: string;
    subcategories?: FinanceSubcategory[];
}

export interface FinanceSubcategory {
    id: string;
    category_id: string;
    name: string;
    is_system: boolean;
    created_at: string;
}

export const financeCategoriesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('finance_categories')
            .select('*, subcategories:finance_subcategories(*)')
            .order('name');

        if (error) throw error;
        return data as FinanceCategory[];
    },

    async createCategory(name: string) {
        const { data, error } = await supabase
            .from('finance_categories')
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return data as FinanceCategory;
    },

    async updateCategory(id: string, name: string) {
        const { data, error } = await supabase
            .from('finance_categories')
            .update({ name })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FinanceCategory;
    },

    async deleteCategory(id: string) {
        const { error } = await supabase
            .from('finance_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createSubcategory(category_id: string, name: string) {
        const { data, error } = await supabase
            .from('finance_subcategories')
            .insert({ category_id, name })
            .select()
            .single();

        if (error) throw error;
        return data as FinanceSubcategory;
    },

    async deleteSubcategory(id: string) {
        const { error } = await supabase
            .from('finance_subcategories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
