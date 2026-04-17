import React, { useEffect, useState } from 'react';
import { contentUnlocksService } from '../../services';
import type { ContentUnlock, AccountUnlockProgress, UnlockCategory } from '../../services';

interface Props {
    accountId: string;
}

const CATEGORY_COLORS: Record<UnlockCategory, string> = {
    boss_access:      '#f87171',
    area_unlock:      '#60a5fa',
    system_unlock:    '#fbbf24',
    character_unlock: '#a78bfa',
};

export const ContentUnlocksPanel: React.FC<Props> = ({ accountId }) => {
    const [unlocks, setUnlocks] = useState<ContentUnlock[]>([]);
    const [progress, setProgress] = useState<AccountUnlockProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            contentUnlocksService.getAll(),
            contentUnlocksService.getAllProgress()
        ]).then(([u, p]) => {
            setUnlocks(u);
            setProgress(p.filter(pr => pr.account_id === accountId));
        }).finally(() => setLoading(false));
    }, [accountId]);

    if (loading || unlocks.length === 0) return null;

    const done = unlocks.filter(u => progress.find(p => p.unlock_id === u.id && p.completed));
    const pending = unlocks.filter(u => !progress.find(p => p.unlock_id === u.id && p.completed));

    return (
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Content Unlocks — {done.length} / {unlocks.length}
            </div>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {done.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600, marginBottom: '6px' }}>
                            ✓ Unlocked ({done.length})
                        </div>
                        {done.map(u => (
                            <div key={u.id} style={{ fontSize: '0.75rem', color: '#64748b', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: CATEGORY_COLORS[u.category], fontSize: '0.6rem' }}>●</span>
                                <span style={{ color: '#94a3b8' }}>{u.name}</span>
                                <span style={{ color: '#475569' }}>→ {u.unlocks}</span>
                            </div>
                        ))}
                    </div>
                )}
                {pending.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, marginBottom: '6px' }}>
                            ✗ Pending ({pending.length})
                        </div>
                        {pending.map(u => (
                            <div key={u.id} style={{ fontSize: '0.75rem', color: '#64748b', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: CATEGORY_COLORS[u.category], fontSize: '0.6rem' }}>●</span>
                                <span style={{ color: '#64748b' }}>{u.name}</span>
                                <span style={{ color: '#475569' }}>→ {u.unlocks}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
