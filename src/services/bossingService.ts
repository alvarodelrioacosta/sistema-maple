// =============================================
// BOSSING SERVICE - Weekly boss sessions
// =============================================
// Tracks which accounts have done bossing each week and
// how much RP was earned. One session per account per week.
//
// RP expiry rule: RP obtained in month M expires the last
// day of month M+1 (e.g., April bossing → expires May 31).
//
// Week start = Monday of the current ISO week.
// =============================================

import supabase from '../lib/supabase';
import type { BossingSession } from '../types';

export const bossingService = {

    // ---- Date helpers ----

    // Returns the ISO date string (YYYY-MM-DD) of the Thursday 00:00 UTC
    // that opened the current MapleStory weekly reset window.
    // Weekly bosses reset Thursday 00:00 UTC → week window is Thu–Wed.
    getWeekStart(date: Date = new Date()): string {
        const d = new Date(date);
        // Work fully in UTC
        const utcDay = d.getUTCDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
        // Days since the last Thursday
        const daysSinceThu = utcDay >= 4 ? utcDay - 4 : utcDay + 3;
        d.setUTCDate(d.getUTCDate() - daysSinceThu);
        d.setUTCHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
    },

    // Returns the last day of the month after the month of `date`.
    // e.g., any date in April → "2026-05-31"
    //       any date in December → "2027-01-31"
    getRPExpiry(date: Date = new Date()): string {
        // new Date(year, month+2, 0) → day 0 of month+2 = last day of month+1
        const d = new Date(date.getFullYear(), date.getMonth() + 2, 0);
        return d.toISOString().split('T')[0];
    },

    // ---- Session queries ----

    async getWeekSessions(weekStart: string): Promise<BossingSession[]> {
        const { data, error } = await supabase
            .from('bossing_sessions')
            .select('*')
            .eq('week_start', weekStart);
        if (error) throw error;
        return (data || []) as BossingSession[];
    },

    // ---- Session registration ----

    // Upserts a bossing session for the current week.
    // Returns the saved session (with rp_expires_at).
    async registerSession(
        accountId: string,
        bossIds: string[],
        rpEarned: number
    ): Promise<BossingSession> {
        const weekStart = this.getWeekStart();
        const rpExpiresAt = this.getRPExpiry();

        const { data, error } = await supabase
            .from('bossing_sessions')
            .upsert(
                {
                    account_id: accountId,
                    week_start: weekStart,
                    bosses_cleared: bossIds,
                    rp_earned: rpEarned,
                    rp_expires_at: rpExpiresAt,
                    registered_at: new Date().toISOString()
                },
                { onConflict: 'account_id,week_start' }
            )
            .select()
            .single();
        if (error) throw error;
        return data as BossingSession;
    },

    // ---- Prequest management ----

    async getAllPrequests(): Promise<{ account_id: string; boss_id: string }[]> {
        const { data, error } = await supabase
            .from('account_boss_prequests')
            .select('account_id, boss_id');
        if (error) throw error;
        return data || [];
    },

    async getAccountPrequests(accountId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('account_boss_prequests')
            .select('boss_id')
            .eq('account_id', accountId);
        if (error) throw error;
        return (data || []).map(row => row.boss_id);
    },

    async setPrequest(accountId: string, bossId: string, done: boolean): Promise<void> {
        if (done) {
            const { error } = await supabase
                .from('account_boss_prequests')
                .insert({ account_id: accountId, boss_id: bossId });
            // Ignore duplicate-key errors (already done)
            if (error && error.code !== '23505') throw error;
        } else {
            const { error } = await supabase
                .from('account_boss_prequests')
                .delete()
                .eq('account_id', accountId)
                .eq('boss_id', bossId);
            if (error) throw error;
        }
    },
};

export default bossingService;
