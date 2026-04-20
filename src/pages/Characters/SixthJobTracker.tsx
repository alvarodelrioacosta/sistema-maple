import React, { useState, useCallback } from 'react';
import supabase from '../../lib/supabase';
import type { Character, ClassItem } from '../../types';

type SkillCol = 'origin' | 'ascent' | 'mastery1' | 'mastery2' | 'mastery3' | 'mastery4' | 'mastery5' | 'boost1' | 'boost2' | 'boost3' | 'boost4' | 'janus' | 'hecate';

const ROW1: SkillCol[] = ['origin', 'ascent', 'mastery1', 'mastery2', 'mastery3', 'mastery4', 'mastery5'];
const ROW2: SkillCol[] = ['janus', 'hecate', 'boost1', 'boost2', 'boost3', 'boost4'];

const MAX_LEVEL: Record<SkillCol, number> = {
    origin: 30, ascent: 30,
    mastery1: 30, mastery2: 30, mastery3: 30, mastery4: 30, mastery5: 30,
    boost1: 30, boost2: 30, boost3: 30, boost4: 30,
    janus: 30, hecate: 30,
};

const LABEL: Record<SkillCol, string> = {
    origin: 'Origin', ascent: 'Ascent',
    mastery1: 'M1', mastery2: 'M2', mastery3: 'M3', mastery4: 'M4', mastery5: 'M5',
    boost1: 'B1', boost2: 'B2', boost3: 'B3', boost4: 'B4',
    janus: 'Janus', hecate: 'Hecate',
};

const COLOR: Record<string, string> = {
    Origin: '#fbbf24',
    Ascent: '#34d399',
    M1: '#818cf8', M2: '#818cf8', M3: '#818cf8', M4: '#818cf8', M5: '#818cf8',
    B1: '#f472b6', B2: '#f472b6', B3: '#f472b6', B4: '#f472b6',
    Janus: '#60a5fa',
    Hecate: '#a78bfa',
};

interface Props {
    character: Character;
    classItem?: ClassItem | null;
    unlocked?: boolean;
    loadingUnlocks?: boolean;
    onUpdate: (col: string, value: number) => void;
}

export const SixthJobTracker: React.FC<Props> = ({ character, classItem, unlocked, loadingUnlocks, onUpdate }) => {
    const [saving, setSaving] = useState<string | null>(null);

    const handleChange = useCallback(async (col: SkillCol, maxLevel: number, raw: string) => {
        const val = Math.min(maxLevel, Math.max(0, parseInt(raw) || 0));
        onUpdate(col, val);
        setSaving(col);
        try {
            await supabase.from('characters').update({ [col]: val }).eq('id', character.id);
        } finally {
            setSaving(null);
        }
    }, [character.id, onUpdate]);

    if (loadingUnlocks) return <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Loading skills...</div>;

    if (unlocked === false) {
        return (
            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '8px', margin: '10px 0' }}>
                <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔒</span> 6th Job Skills Locked — Complete Prequest to Unlock
                </div>
            </div>
        );
    }

    const renderSkill = (col: SkillCol) => {
        const level = (character as unknown as Record<string, number | null>)[col] ?? 0;
        const maxLevel = MAX_LEVEL[col];
        const label = LABEL[col];
        const color = COLOR[label] ?? '#818cf8';
        const pct = level / maxLevel;
        const imgUrl = classItem ? (classItem[col as keyof ClassItem] as string | null) : null;
        const skillName = classItem ? (classItem[`${col}_name` as keyof ClassItem] as string | null) : null;

        return (
            <div key={col} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${level > 0 ? color + '55' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                padding: '6px 4px',
                flex: '1 1 0',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
            }}>
                <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    width: `${pct * 100}%`, height: '3px',
                    background: color, transition: 'width 0.2s'
                }} />
                <div style={{ fontSize: '0.58rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </div>
                {imgUrl ? (
                    <img src={imgUrl} alt={skillName || label} title={skillName || label} style={{ width: '38px', height: '38px', objectFit: 'contain', filter: level === 0 ? 'grayscale(1) opacity(0.35)' : 'none', transition: 'filter 0.2s' }} />
                ) : (
                    <div style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <input
                        type="number"
                        min={0}
                        max={maxLevel}
                        value={level === 0 ? '' : level}
                        placeholder="–"
                        onChange={e => handleChange(col, maxLevel, e.target.value)}
                        style={{
                            width: '28px',
                            background: 'transparent',
                            border: 'none',
                            color: level === maxLevel ? color : '#f1f5f9',
                            fontWeight: level === maxLevel ? 700 : 400,
                            fontSize: '0.88rem',
                            textAlign: 'center',
                            outline: 'none',
                            padding: 0
                        }}
                    />
                    <span style={{ fontSize: '0.6rem', color: '#475569' }}>/{maxLevel}</span>
                    {saving === col && <span style={{ fontSize: '0.55rem', color: '#64748b' }}>✓</span>}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                6th Job Skills
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {ROW1.map(renderSkill)}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {ROW2.map(renderSkill)}
                </div>
            </div>
        </div>
    );
};
