import React, { useState, useCallback } from 'react';
import supabase from '../../lib/supabase';
import type { Character } from '../../types';

const BOSS_POT_IMG = 'https://maplescouter.com/doping_v2/sayram.png';
const LEGION_ARTIFACT_IMG = 'https://maplescouter.com/doping_exp/artifact.png';
const HEXA_STAT_IMG = 'https://open.api.nexon.com/static/maplestory/skill/icon/KAPCLAPBMA';

const HEXA_LEVEL_REQS = [260, 265, 270] as const;

interface Props {
    character: Character;
    isBossPotUnlocked: boolean;
    isLegionArtifactUnlocked: boolean;
    isSixthJobDone: boolean;
    loadingUnlocks: boolean;
    onUpdate: (col: string, value: number | boolean) => void;
}

export const ExtraStatsTracker: React.FC<Props> = ({
    character,
    isBossPotUnlocked,
    isLegionArtifactUnlocked,
    isSixthJobDone,
    loadingUnlocks,
    onUpdate,
}) => {
    const [saving, setSaving] = useState<string | null>(null);

    const save = useCallback(async (col: string, value: number | boolean) => {
        onUpdate(col, value);
        setSaving(col);
        try {
            await supabase.from('characters').update({ [col]: value }).eq('id', character.id);
        } finally {
            setSaving(null);
        }
    }, [character.id, onUpdate]);

    const handleLevelInput = useCallback((col: string, max: number, raw: string) => {
        const val = Math.min(max, Math.max(1, parseInt(raw) || 1));
        save(col, val);
    }, [save]);

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

    const imgStyle = (unlocked: boolean): React.CSSProperties => ({
        width: '38px',
        height: '38px',
        objectFit: 'contain',
        filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)',
        transition: 'filter 0.2s',
    });

    const cardStyle = (active: boolean, color: string): React.CSSProperties => ({
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '8px',
        padding: '6px 4px',
        flex: '1 1 0',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
    });

    if (loadingUnlocks) return null;

    return (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Extra Stats
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>

                {/* Boss Pot */}
                <div style={cardStyle(isBossPotUnlocked, '#f97316')}>
                    <div style={{ fontSize: '0.58rem', color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boss Pot</div>
                    <img src={BOSS_POT_IMG} alt="Boss Pot" title="Boss Pot" style={imgStyle(isBossPotUnlocked)} />
                    <div style={{ fontSize: '0.6rem', color: isBossPotUnlocked ? '#4ade80' : '#475569', fontWeight: 600 }}>
                        {isBossPotUnlocked ? '✓' : '✗'}
                    </div>
                </div>

                {/* Legion Artifact */}
                <div style={cardStyle(isLegionArtifactUnlocked, '#fbbf24')}>
                    <div style={{ fontSize: '0.58rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artifact</div>
                    <img src={LEGION_ARTIFACT_IMG} alt="Legion Artifact" title="Legion Artifact" style={imgStyle(isLegionArtifactUnlocked)} />
                    {isLegionArtifactUnlocked ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input
                                type="number"
                                min={1}
                                max={60}
                                value={character.legion_artifact_level ?? ''}
                                placeholder="–"
                                onChange={e => handleLevelInput('legion_artifact_level', 60, e.target.value)}
                                style={{
                                    width: '28px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: character.legion_artifact_level === 60 ? '#fbbf24' : '#f1f5f9',
                                    fontWeight: character.legion_artifact_level === 60 ? 700 : 400,
                                    fontSize: '0.88rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    padding: 0,
                                }}
                            />
                            <span style={{ fontSize: '0.6rem', color: '#475569' }}>/60</span>
                            {saving === 'legion_artifact_level' && <span style={{ fontSize: '0.55rem', color: '#64748b' }}>✓</span>}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600 }}>✗</div>
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
                        <div key={i} style={cardStyle(isActive, color)}>
                            {isActive && (
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0,
                                    width: `${((lv ?? 0) / 20) * 100}%`, height: '3px',
                                    background: color, transition: 'width 0.2s'
                                }} />
                            )}
                            <div style={{ fontSize: '0.58rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                HS {i + 1}
                            </div>
                            <img
                                src={HEXA_STAT_IMG}
                                alt={`Hexa Stat ${i + 1}`}
                                title={prereqsMet
                                    ? (enabled ? `Hexa Stat ${i + 1}` : `Click to enable Hexa Stat ${i + 1}`)
                                    : `Requires Lv.${HEXA_LEVEL_REQS[i]} + 6th Job`}
                                style={{
                                    ...imgStyle(isActive),
                                    cursor: prereqsMet && !enabled ? 'pointer' : 'default',
                                }}
                                onClick={() => {
                                    if (prereqsMet && !enabled) save(hexaEnabledCols[i], true);
                                }}
                            />
                            {isActive ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={lv ?? ''}
                                        placeholder="—"
                                        onChange={e => handleLevelInput(hexaLevelCols[i], 20, e.target.value)}
                                        style={{
                                            width: '28px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: lv === 20 ? color : '#f1f5f9',
                                            fontWeight: lv === 20 ? 700 : 400,
                                            fontSize: '0.88rem',
                                            textAlign: 'center',
                                            outline: 'none',
                                            padding: 0,
                                        }}
                                    />
                                    <span style={{ fontSize: '0.6rem', color: '#475569' }}>/20</span>
                                    {saving === hexaLevelCols[i] && <span style={{ fontSize: '0.55rem', color: '#64748b' }}>✓</span>}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.6rem', color: prereqsMet ? '#94a3b8' : '#334155', fontWeight: 600 }}>
                                    {prereqsMet ? 'Click' : `Lv.${HEXA_LEVEL_REQS[i]}`}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
