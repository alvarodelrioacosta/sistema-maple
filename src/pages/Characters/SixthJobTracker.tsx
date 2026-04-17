import React, { useEffect, useState, useCallback } from 'react';
import { sixthJobSkillsService } from '../../services';
import type { SixthJobSkillProgress } from '../../services';
import { getSkillsForClass } from '../../constants/sixthJobSkills';

interface Props {
    characterId: string;
    characterClass: string | null;
    unlocked?: boolean;
    loadingUnlocks?: boolean;
}

export const SixthJobTracker: React.FC<Props> = ({ characterId, characterClass, unlocked, loadingUnlocks }) => {
    const [levels, setLevels] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const skills = getSkillsForClass(characterClass);

    useEffect(() => {
        if (unlocked === false) {
            setLoading(false);
            return;
        }
        setLoading(true);
        sixthJobSkillsService.getByCharacter(characterId).then((data: SixthJobSkillProgress[]) => {
            const map: Record<string, number> = {};
            data.forEach(d => { map[d.skill_name] = d.skill_level; });
            setLevels(map);
        }).finally(() => setLoading(false));
    }, [characterId]);

    const handleChange = useCallback(async (skillName: string, maxLevel: number, raw: string) => {
        const val = Math.min(maxLevel, Math.max(0, parseInt(raw) || 0));
        setLevels(prev => ({ ...prev, [skillName]: val }));
        setSaving(skillName);
        try {
            await sixthJobSkillsService.upsert(characterId, skillName, val);
        } finally {
            setSaving(null);
        }
    }, [characterId]);

    if (loading || loadingUnlocks) return <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Loading skills...</div>;
    
    if (unlocked === false) {
        return (
            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '8px', margin: '10px 0' }}>
                <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔒</span> 6th Job Skills Locked — Complete Prequest to Unlock
                </div>
            </div>
        );
    }
    return (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                6th Job Skills
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map(skill => {
                    const level = levels[skill.name] ?? 0;
                    const pct = level / skill.maxLevel;
                    const color = skill.isOrigin ? '#fbbf24' : '#818cf8';

                    return (
                        <div key={skill.name} style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${level > 0 ? color + '55' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '8px',
                            padding: '8px 10px',
                            minWidth: '110px',
                            flex: '0 0 auto',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0,
                                width: `${pct * 100}%`, height: '3px',
                                background: color, transition: 'width 0.2s'
                            }} />
                            {skill.isOrigin && (
                                <div style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Origin
                                </div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 500, marginBottom: '4px', lineHeight: 1.2 }}>
                                {skill.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                    type="number"
                                    min={0}
                                    max={skill.maxLevel}
                                    value={level}
                                    onChange={e => handleChange(skill.name, skill.maxLevel, e.target.value)}
                                    style={{
                                        width: '36px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: level === skill.maxLevel ? color : '#f1f5f9',
                                        fontWeight: level === skill.maxLevel ? 700 : 400,
                                        fontSize: '0.95rem',
                                        textAlign: 'center',
                                        outline: 'none',
                                        padding: 0
                                    }}
                                />
                                <span style={{ fontSize: '0.65rem', color: '#475569' }}>/{skill.maxLevel}</span>
                                {saving === skill.name && <span style={{ fontSize: '0.6rem', color: '#64748b' }}>✓</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
