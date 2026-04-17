import supabase from '../lib/supabase';

export interface SixthJobSkillProgress {
    id: string;
    character_id: string;
    skill_name: string;
    skill_level: number;
    updated_at: string;
}

export const sixthJobSkillsService = {
    async getByCharacter(characterId: string): Promise<SixthJobSkillProgress[]> {
        const { data, error } = await supabase
            .from('sixth_job_skills')
            .select('*')
            .eq('character_id', characterId);
        if (error) throw error;
        return data || [];
    },

    async upsert(characterId: string, skillName: string, level: number): Promise<void> {
        const { error } = await supabase
            .from('sixth_job_skills')
            .upsert({
                character_id: characterId,
                skill_name: skillName,
                skill_level: level,
                updated_at: new Date().toISOString()
            }, { onConflict: 'character_id,skill_name' });
        if (error) throw error;
    }
};
