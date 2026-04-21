import React, { useState } from 'react';
import supabase from '../../lib/supabase';
import type { Character, Account } from '../../types';
import { UNLOCK_DEFINITIONS } from '../../constants/unlocks';
import type { UnlockDef } from '../../constants/unlocks';

interface Props {
    character: Character;
    account: Account | undefined;
    onUpdate: (col: string, value: number | boolean | string | null) => void;
    onAccountUpdate: (col: string, value: number | boolean | string | null) => void;
}

const BOSS_IMAGE_URL = (bossImageName: string) =>
    `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${bossImageName.replace(/ /g, '_')}.png`;

export const ContentUnlocksPanel: React.FC<Props> = ({ character, account, onUpdate, onAccountUpdate }) => {
    const [confirmKey, setConfirmKey] = useState<string | null>(null);

    const bossUnlocks = UNLOCK_DEFINITIONS.filter(d => d.category === 'boss');
    const systemUnlocks = UNLOCK_DEFINITIONS.filter(d => d.category === 'system');

    const isDone = (def: UnlockDef): boolean => {
        if (def.level === 'account') return !!(account as any)?.[def.key];
        return !!(character as any)[def.key];
    };

    const completedCount = UNLOCK_DEFINITIONS.filter(isDone).length;

    const saveUnlock = async (def: UnlockDef, value: boolean) => {
        if (def.level === 'account') {
            if (!account) return;
            onAccountUpdate(def.key, value);
            await supabase.from('accounts').update({ [def.key]: value }).eq('id', account.id);
        } else {
            onUpdate(def.key, value);
            await supabase.from('characters').update({ [def.key]: value }).eq('id', character.id);
        }
    };

    const handleItemClick = (def: UnlockDef) => {
        if (isDone(def)) {
            setConfirmKey(def.key);
        } else {
            saveUnlock(def, true);
        }
    };

    const confirmUncheck = () => {
        if (!confirmKey) return;
        const def = UNLOCK_DEFINITIONS.find(d => d.key === confirmKey);
        if (def) saveUnlock(def, false);
        setConfirmKey(null);
    };

    const confirmDef = confirmKey ? UNLOCK_DEFINITIONS.find(d => d.key === confirmKey) : null;

    return (
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                <span>Content Unlocks</span>
                <span style={{ color: '#4ade80' }}>{completedCount} / {UNLOCK_DEFINITIONS.length}</span>
            </div>

            {confirmDef && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span style={{ color: '#fca5a5', flex: 1, fontSize: '0.7rem' }}>
                        Unmark "{confirmDef.label}"?
                    </span>
                    <button
                        onClick={confirmUncheck}
                        style={{
                            background: '#ef4444', color: '#fff',
                            border: 'none', borderRadius: '4px',
                            padding: '2px 8px', fontSize: '0.65rem',
                            cursor: 'pointer', fontWeight: 600,
                        }}
                    >Confirm</button>
                    <button
                        onClick={() => setConfirmKey(null)}
                        style={{
                            background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                            border: 'none', borderRadius: '4px',
                            padding: '2px 8px', fontSize: '0.65rem',
                            cursor: 'pointer',
                        }}
                    >Cancel</button>
                </div>
            )}

            {/* Boss Prequests */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>BOSS PREQUESTS</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {bossUnlocks.map(def => {
                        const done = isDone(def);
                        return (
                            <div
                                key={def.key}
                                onClick={() => handleItemClick(def)}
                                title={`${def.label} — ${done ? 'Click to unmark' : 'Click to mark as done'}`}
                                style={{
                                    position: 'relative',
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    border: `2px solid ${done ? '#4ade8055' : 'rgba(255,255,255,0.05)'}`,
                                    background: 'rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s',
                                    filter: done ? 'none' : 'grayscale(1) opacity(0.4)',
                                    cursor: 'pointer',
                                }}
                            >
                                <img
                                    src={BOSS_IMAGE_URL(def.bossImageName!)}
                                    alt={def.label}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {done && (
                                    <div style={{
                                        position: 'absolute', bottom: '2px', right: '2px',
                                        background: '#4ade80', color: '#000', borderRadius: '50%',
                                        width: '14px', height: '14px', fontSize: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                                    }}>✓</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* World Systems */}
            <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>WORLD SYSTEMS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                    {systemUnlocks.map(def => {
                        const done = isDone(def);
                        return (
                            <div
                                key={def.key}
                                onClick={() => handleItemClick(def)}
                                title={`${def.label} — ${done ? 'Click to unmark' : 'Click to mark as done'}`}
                                style={{
                                    background: done ? 'rgba(74, 222, 128, 0.05)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${done ? '#4ade8044' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: done ? '#4ade80' : '#334155',
                                    boxShadow: done ? '0 0 8px #4ade8055' : 'none',
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#f1f5f9' : '#64748b' }}>
                                        {def.label}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: done ? '#4ade80aa' : '#475569' }}>
                                        {def.group}
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
