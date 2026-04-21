import React, { useState, useCallback } from 'react';
import supabase from '../../lib/supabase';
import type { Character, Account } from '../../types';

const PET_IMG = 'https://static.wikia.nocookie.net/maplestory/images/9/99/Pet_Kino.png/revision/latest?cb=20121026032552';
const BOSS_POT_IMG = 'https://maplescouter.com/doping_v2/sayram.png';
const LEGION_ARTIFACT_IMG = 'https://maplescouter.com/doping_exp/artifact.png';
const HEXA_STAT_IMG = 'https://open.api.nexon.com/static/maplestory/skill/icon/KAPCLAPBMA';

const formatDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const HEXA_LEVEL_REQS = [260, 265, 270] as const;

interface Props {
    character: Character;
    account: Account | undefined;
    isBossPotUnlocked: boolean;
    isLegionArtifactUnlocked: boolean;
    isSixthJobDone: boolean;
    onUpdate: (col: string, value: number | boolean | string | null) => void;
    onAccountUpdate: (col: string, value: number | boolean | string | null) => void;
}

export const ExtraStatsTracker: React.FC<Props> = ({
    character,
    account,
    isBossPotUnlocked,
    isLegionArtifactUnlocked,
    isSixthJobDone,
    onUpdate,
    onAccountUpdate,
}) => {
    const [editingPet, setEditingPet] = useState(false);
    const [petDateInput, setPetDateInput] = useState('');

    const save = useCallback(async (col: string, value: number | boolean | string | null) => {
        onUpdate(col, value);
        await supabase.from('characters').update({ [col]: value }).eq('id', character.id);
    }, [character.id, onUpdate]);

    const saveAccount = useCallback(async (col: string, value: number | boolean | string | null) => {
        if (!account) return;
        onAccountUpdate(col, value);
        await supabase.from('accounts').update({ [col]: value }).eq('id', account.id);
    }, [account, onAccountUpdate]);

    const savePetDate = useCallback((dateStr: string) => {
        if (!dateStr) return;
        save('pet_expiry_date', dateStr);
        setEditingPet(false);
    }, [save]);

    const handleLevelInput = useCallback((col: string, max: number, raw: string) => {
        const val = Math.min(max, Math.max(1, parseInt(raw) || 1));
        save(col, val);
    }, [save]);

    const handleArtifactLevelInput = useCallback((max: number, raw: string) => {
        const val = Math.min(max, Math.max(1, parseInt(raw) || 1));
        saveAccount('legion_artifact_level', val);
    }, [saveAccount]);

    const level = character.level ?? 0;
    const hexaStatMet = (idx: number) => isSixthJobDone && level >= HEXA_LEVEL_REQS[idx];

    const hexaEnabled = [
        character.hexa_stat_1_enabled,
        character.hexa_stat_2_enabled,
        character.hexa_stat_3_enabled,
    ];
    const hexaLevels = [
        character.hexa_stat_1_level,
        character.hexa_stat_2_level,
        character.hexa_stat_3_level,
    ];
    const hexaEnabledCols = ['hexa_stat_1_enabled', 'hexa_stat_2_enabled', 'hexa_stat_3_enabled'] as const;
    const hexaLevelCols = ['hexa_stat_1_level', 'hexa_stat_2_level', 'hexa_stat_3_level'] as const;

    const artifactLevel = account?.legion_artifact_level ?? null;

    const imgStyle = (active: boolean, color: string): React.CSSProperties => ({
        width: 40,
        height: 40,
        display: 'block',
        objectFit: 'contain',
        borderRadius: 6,
        border: `1px solid ${active ? color + '66' : 'rgba(255,255,255,0.08)'}`,
        background: 'rgba(255,255,255,0.04)',
        filter: active ? 'none' : 'grayscale(0.8) opacity(0.35)',
        transition: 'filter 0.2s',
    });

    const badgeStyle = (active: boolean, color: string): React.CSSProperties => ({
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 22,
        height: 15,
        background: active ? color : 'rgba(0,0,0,0.88)',
        border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.25)'}`,
        borderRadius: 3,
        color: active ? '#000' : '#e2e8f0',
        fontSize: '0.58rem',
        fontWeight: 700,
        textAlign: 'center',
        padding: 0,
        outline: 'none',
        lineHeight: '14px',
    });

    return (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

                {/* Pet */}
                {(() => {
                    const expiry = character.pet_expiry_date;
                    const today = new Date().toISOString().slice(0, 10);
                    const isExpired = !!expiry && expiry < today;
                    const isActive = !!expiry && !isExpired;
                    const petColor = '#ec4899';

                    return (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                                src={PET_IMG}
                                alt="Pet"
                                title={expiry ? (isExpired ? `Expired ${formatDate(expiry)}` : `Expires ${formatDate(expiry)} — click to change`) : 'Click to set pet expiry'}
                                style={{ ...imgStyle(isActive, petColor), cursor: 'pointer' }}
                                onClick={() => { setPetDateInput(expiry ?? ''); setEditingPet(true); }}
                            />
                            {editingPet ? (
                                <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, paddingTop: 4 }}>
                                    <input
                                        type="date"
                                        value={petDateInput}
                                        autoFocus
                                        onChange={e => setPetDateInput(e.target.value)}
                                        onBlur={() => { if (petDateInput) savePetDate(petDateInput); else setEditingPet(false); }}
                                        onKeyDown={e => { if (e.key === 'Enter' && petDateInput) savePetDate(petDateInput); if (e.key === 'Escape') setEditingPet(false); }}
                                        style={{
                                            width: '110px', fontSize: '0.6rem', background: 'rgba(15,20,30,0.95)',
                                            border: `1px solid ${petColor}55`, borderRadius: '4px',
                                            color: '#f1f5f9', padding: '3px 4px', outline: 'none',
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    ...badgeStyle(isActive, petColor),
                                    background: isExpired ? '#ef444488' : isActive ? petColor : 'rgba(0,0,0,0.88)',
                                    color: isActive ? '#fff' : isExpired ? '#fff' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {isExpired ? 'Exp' : isActive ? formatDate(expiry!).replace(' ', '') : '—'}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Boss Pot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                        src={BOSS_POT_IMG}
                        alt="Boss Pot"
                        title="Boss Pot"
                        style={imgStyle(isBossPotUnlocked, '#f97316')}
                    />
                    {isBossPotUnlocked && (
                        <div style={{
                            ...badgeStyle(true, '#4ade80'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✓</div>
                    )}
                </div>

                {/* Legion Artifact — per-account */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                        src={LEGION_ARTIFACT_IMG}
                        alt="Legion Artifact"
                        title="Legion Artifact (account-wide)"
                        style={imgStyle(isLegionArtifactUnlocked, '#fbbf24')}
                    />
                    {isLegionArtifactUnlocked && (
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={artifactLevel ?? ''}
                            placeholder="–"
                            onChange={e => handleArtifactLevelInput(60, e.target.value)}
                            className="char-compact-badge-input"
                            style={badgeStyle(artifactLevel === 60, '#fbbf24')}
                        />
                    )}
                </div>

                {/* Hexa Stats 1-3 */}
                {([0, 1, 2] as const).map(i => {
                    const prereqsMet = hexaStatMet(i);
                    const enabled = hexaEnabled[i];
                    const lv = hexaLevels[i];
                    const color = '#818cf8';
                    const isActive = prereqsMet && enabled;

                    return (
                        <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                                src={HEXA_STAT_IMG}
                                alt={`Hexa Stat ${i + 1}`}
                                title={prereqsMet
                                    ? (enabled ? `Hexa Stat ${i + 1}` : `Click to enable Hexa Stat ${i + 1}`)
                                    : `Requires Lv.${HEXA_LEVEL_REQS[i]} + 6th Job`}
                                style={{ ...imgStyle(isActive, color), cursor: prereqsMet && !enabled ? 'pointer' : 'default' }}
                                onClick={() => { if (prereqsMet && !enabled) save(hexaEnabledCols[i], true); }}
                            />
                            {isActive && (
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={lv ?? ''}
                                    placeholder="—"
                                    onChange={e => handleLevelInput(hexaLevelCols[i], 20, e.target.value)}
                                    className="char-compact-badge-input"
                                    style={badgeStyle(lv === 20, color)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
