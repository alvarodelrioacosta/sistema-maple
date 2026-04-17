import React, { useEffect, useState, useCallback } from 'react';
import { symbolProgressService } from '../../services';
import type { SymbolProgress } from '../../services';
import { SYMBOLS } from '../../constants/symbols';

interface Props {
    characterId: string;
    characterName: string;
}

export const SymbolTracker: React.FC<Props> = ({ characterId, characterName }) => {
    const [levels, setLevels] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        symbolProgressService.getByCharacter(characterId).then((data: SymbolProgress[]) => {
            const map: Record<string, number> = {};
            data.forEach(d => { map[d.symbol_name] = d.symbol_level; });
            setLevels(map);
        }).finally(() => setLoading(false));
    }, [characterId]);

    const handleChange = useCallback(async (symbolName: string, symbolType: 'arcane' | 'sacred', maxLevel: number, raw: string) => {
        const val = Math.min(maxLevel, Math.max(0, parseInt(raw) || 0));
        setLevels(prev => ({ ...prev, [symbolName]: val }));
        setSaving(symbolName);
        try {
            await symbolProgressService.upsert(characterId, symbolName, symbolType, val);
        } finally {
            setSaving(null);
        }
    }, [characterId]);

    if (loading) return <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Loading symbols...</div>;

    const arcane = SYMBOLS.filter(s => s.type === 'arcane');
    const sacred  = SYMBOLS.filter(s => s.type === 'sacred');

    const renderGroup = (group: typeof SYMBOLS, label: string) => (
        <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {group.map(sym => {
                    const level = levels[sym.name] ?? 0;
                    const pct = level / sym.maxLevel;
                    const isSaving = saving === sym.name;
                    return (
                        <div key={sym.name} style={{
                            background: `rgba(255,255,255,0.04)`,
                            border: `1px solid ${level > 0 ? sym.color + '55' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '8px',
                            padding: '8px 10px',
                            minWidth: '80px',
                            flex: '0 0 auto',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Progress bar background */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0,
                                width: `${pct * 100}%`, height: '3px',
                                background: sym.color, borderRadius: '0 0 0 8px',
                                transition: 'width 0.2s'
                            }} />
                            <div style={{ fontSize: '0.7rem', color: sym.color, fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                                {sym.shortName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                    type="number"
                                    min={0}
                                    max={sym.maxLevel}
                                    value={level}
                                    onChange={e => handleChange(sym.name, sym.type, sym.maxLevel, e.target.value)}
                                    style={{
                                        width: '36px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: level === sym.maxLevel ? sym.color : '#f1f5f9',
                                        fontWeight: level === sym.maxLevel ? 700 : 400,
                                        fontSize: '0.95rem',
                                        textAlign: 'center',
                                        outline: 'none',
                                        padding: 0
                                    }}
                                />
                                <span style={{ fontSize: '0.65rem', color: '#475569' }}>/{sym.maxLevel}</span>
                                {isSaving && <span style={{ fontSize: '0.6rem', color: '#64748b' }}>✓</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem' }}>
                Symbols — <span style={{ color: '#f1f5f9' }}>{characterName}</span>
            </div>
            {renderGroup(arcane, 'Arcane Symbols')}
            {renderGroup(sacred,  'Sacred Symbols')}
        </div>
    );
};
