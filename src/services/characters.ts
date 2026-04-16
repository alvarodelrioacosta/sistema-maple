// =============================================
// CHARACTERS SERVICE - CRUD para personajes
// =============================================

import supabase from '../lib/supabase';
import type { Character, CharacterInsert, CharacterUpdate, CharacterWithAccount } from '../types';
import { nexonApi } from './nexonApi';

export const charactersService = {
    async getAll(): Promise<CharacterWithAccount[]> {
        const { data, error } = await supabase
            .from('characters')
            .select(`
        *,
        account:accounts(*)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getMainCharacters(): Promise<Character[]> {
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('main', 'Main');

        if (error) throw error;
        return data || [];
    },

    async getByAccountId(accountId: string): Promise<Character[]> {
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('account_id', accountId)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<CharacterWithAccount | null> {
        const { data, error } = await supabase
            .from('characters')
            .select(`
        *,
        account:accounts(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(character: CharacterInsert): Promise<Character> {
        console.log('--- STARTING CHARACTER CREATION ---');
        // 1. Get Account info to check for Account 0
        const { data: account } = await supabase
            .from('accounts')
            .select('number')
            .eq('id', character.account_id)
            .single();

        const isAccountZero = account?.number === 0;

        // 2. Check if it's the first character for this account
        const { count } = await supabase
            .from('characters')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', character.account_id);

        const isFirst = (count || 0) === 0;

        // 3. Insert character with appropriate default status
        const { data, error } = await supabase
            .from('characters')
            .insert({
                ...character,
                main: (isFirst || isAccountZero) ? 'Main' : (character.main || 'Mule')
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Recalculate categorization to ensure consistency across account
        await charactersService.recalculateCategorization(data.account_id);

        // Return refreshed data
        const updated = await charactersService.getById(data.id);
        console.log('--- CREATION COMPLETED ---');
        return updated as Character;
    },

    async update(id: string, character: CharacterUpdate): Promise<Character> {
        console.log(`--- STARTING UPDATE FOR CHARACTER: ${id} ---`);
        const { data: oldChar } = await supabase
            .from('characters')
            .select('account_id, level')
            .eq('id', id)
            .single();

        // Avoid overwriting 'main' with null if the frontend doesn't provide it
        const updateData = { ...character };
        if (updateData.main === null) {
            delete updateData.main;
        }

        const { data, error } = await supabase
            .from('characters')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Always recalculate on update to ensure categorization is always correct
        await charactersService.recalculateCategorization(data.account_id);

        // If account changed, also recalculate the old one
        if (oldChar && oldChar.account_id !== data.account_id) {
            await charactersService.recalculateCategorization(oldChar.account_id);
        }

        // Return updated character
        const updated = await charactersService.getById(id);
        console.log('--- UPDATE COMPLETED ---');
        return updated as Character;
    },

    async delete(id: string): Promise<void> {
        console.log(`--- STARTING DELETE FOR CHARACTER: ${id} ---`);
        // Get account_id before deleting
        const { data: char } = await supabase
            .from('characters')
            .select('account_id')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (char) {
            await charactersService.recalculateCategorization(char.account_id);
        }
        console.log('--- DELETE COMPLETED ---');
    },

    async syncFromNexon(characterId: string): Promise<boolean> {
        const char = await charactersService.getById(characterId);
        if (!char) return false;

        const searchName = char.nexon_name || char.name;
        const nexonData = await nexonApi.fetchCharacter(searchName);
        if (!nexonData) return false;

        const { error } = await supabase
            .from('characters')
            .update({
                level: nexonData.level,
                exp: nexonData.exp,
                avatar_url: nexonData.avatarUrl,
                world: nexonData.world,
                rank_position: nexonData.rankPosition,
                last_synced_at: new Date().toISOString()
            })
            .eq('id', characterId);

        if (error) throw error;

        await charactersService.recalculateCategorization(char.account_id);
        return true;
    },

    async syncAllFromNexon(accountId?: string): Promise<{ synced: number; failed: number }> {
        let query = supabase.from('characters').select('id, name, nexon_name, account_id');
        if (accountId) query = query.eq('account_id', accountId);

        const { data: chars, error } = await query;
        if (error) throw error;
        if (!chars) return { synced: 0, failed: 0 };

        let synced = 0;
        let failed = 0;

        for (const char of chars) {
            try {
                const ok = await charactersService.syncFromNexon(char.id);
                if (ok) synced++; else failed++;
            } catch {
                failed++;
            }
        }

        return { synced, failed };
    },

    async recalculateCategorization(accountId: string): Promise<void> {
        try {
            console.log(`%c[Categorization] --- RECALCULATING ACCOUNT: ${accountId} ---`, 'background: #222; color: #bada55');

            // 1. Get Account info
            const { data: account, error: accError } = await supabase
                .from('accounts')
                .select('number')
                .eq('id', accountId)
                .single();

            if (accError) {
                console.error(`[Categorization] Critical Error: Account not found`, accError);
                return;
            }

            // 2. Get all characters for this account
            const { data: rawChars, error: charsError } = await supabase
                .from('characters')
                .select('*')
                .eq('account_id', accountId);

            if (charsError) {
                console.error(`[Categorization] Critical Error: Failed to fetch characters`, charsError);
                return;
            }

            if (!rawChars || rawChars.length === 0) {
                console.log(`[Categorization] No characters found for this account.`);
                return;
            }

            console.log(`[Categorization] Found ${rawChars.length} characters. Processing rules...`);

            if (account.number === 0) {
                // RULE: Account 0 entries are always Mains
                if (rawChars.some(c => c.main !== 'Main')) {
                    console.log(`[Categorization] Account 0: Forcing 'Main' on characters`);
                    await supabase.from('characters').update({ main: 'Main' }).in('id', rawChars.filter(c => c.main !== 'Main').map(c => c.id));
                }
                return;
            }

            // RULE: Highest level is Main, others are Mules
            // Sort by level DESC, then created_at DESC (tie-breaker: newest is better)
            const sorted = [...rawChars].sort((a, b) => {
                const levelA = Number(a.level) || 0;
                const levelB = Number(b.level) || 0;
                if (levelB !== levelA) return levelB - levelA;

                // If same level, prefer the one that is already Main
                if (a.main === 'Main' && b.main !== 'Main') return -1;
                if (b.main === 'Main' && a.main !== 'Main') return 1;

                // Finally by creation date (newest first)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            const mainCharacter = sorted[0];
            // sorted.slice(1).map(c => c.id); // muleIds unused

            console.log(`%c[Categorization] Result: '${mainCharacter.name}' (Lv ${mainCharacter.level}) is MAIN.`, 'font-weight: bold; font-size: 14px; color: #4ade80');

            // Perform updates
            // 1. Mark the Main
            if (mainCharacter.main !== 'Main') {
                console.log(`[Categorization] Updating ${mainCharacter.name} to Main...`);
                const { error: e1 } = await supabase.from('characters').update({ main: 'Main' }).eq('id', mainCharacter.id);
                if (e1) console.error(`[Categorization] Error updating Main:`, e1);
            }

            // 2. Mark the Mules (only those that aren't already Mules)
            const mulesToFix = sorted.slice(1).filter(c => c.main !== 'Mule').map(c => c.id);
            if (mulesToFix.length > 0) {
                console.log(`[Categorization] Updating ${mulesToFix.length} characters to Mule...`);
                const { error: e2 } = await supabase.from('characters').update({ main: 'Mule' }).in('id', mulesToFix);
                if (e2) console.error(`[Categorization] Error updating Mules:`, e2);
            }

            console.log(`[Categorization] --- RECALCULATION FINISHED ---`);
        } catch (err) {
            console.error('[Categorization] Unexpected crash during recalculation:', err);
        }
    }
};

export default charactersService;
