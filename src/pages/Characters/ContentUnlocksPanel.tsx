import React from 'react';
import type { ContentUnlock, AccountUnlockProgress } from '../../services';

interface Props {
    accountId: string;
    unlocks: ContentUnlock[];
    progress: AccountUnlockProgress[];
    loading: boolean;
}

const BOSS_IMAGE_ALIAS: Record<string, string> = {
    'Slime': 'Guardian Angel Slime',
};

const BOSS_IMAGE_URL = (bossName: string) => {
    const imgName = BOSS_IMAGE_ALIAS[bossName] ?? bossName;
    return `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${imgName.replace(/ /g, '_')}.png`;
};

export const ContentUnlocksPanel: React.FC<Props> = ({ unlocks, progress, loading }) => {
    if (loading || unlocks.length === 0) return null;

    const bossUnlocks = unlocks.filter(u => u.category === 'boss');
    const systemUnlocks = unlocks.filter(u => u.category === 'system');

    const isDone = (id: string) => progress.some(p => p.unlock_id === id && p.completed);

    return (
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                <span>Content Unlocks</span>
                <span style={{ color: '#4ade80' }}>{unlocks.filter(u => isDone(u.id)).length} / {unlocks.length}</span>
            </div>

            {/* Bosses Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>BOSS PREQUESTS</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {bossUnlocks.map(u => {
                        const done = isDone(u.id);
                        return (
                            <div key={u.id} style={{
                                position: 'relative',
                                width: '56px',
                                height: '56px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: `2px solid ${done ? '#4ade8055' : 'rgba(255,255,255,0.05)'}`,
                                background: 'rgba(0,0,0,0.2)',
                                transition: 'all 0.2s',
                                filter: done ? 'none' : 'grayscale(1) opacity(0.4)'
                            }}>
                                <img
                                    src={BOSS_IMAGE_URL(u.unlocks)}
                                    alt={u.unlocks}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    title={`${u.unlocks} ${done ? '✓' : '✗'}`}
                                />
                                {done && (
                                    <div style={{
                                        position: 'absolute', bottom: '2px', right: '2px',
                                        background: '#4ade80', color: '#000', borderRadius: '50%',
                                        width: '14px', height: '14px', fontSize: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900
                                    }}>✓</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Systems Section */}
            <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>WORLD SYSTEMS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                    {systemUnlocks.map(u => {
                        const done = isDone(u.id);
                        return (
                            <div key={u.id} style={{
                                background: done ? 'rgba(74, 222, 128, 0.05)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${done ? '#4ade8044' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '8px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: done ? '#4ade80' : '#334155',
                                    boxShadow: done ? '0 0 8px #4ade8055' : 'none'
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#f1f5f9' : '#64748b' }}>
                                        {u.name.includes(' — ') ? u.name.split(' — ')[1] : u.name}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: done ? '#4ade80aa' : '#475569' }}>
                                        {u.unlocks}
                                    </div>
                                </div>
                                {done && <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>✓</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
