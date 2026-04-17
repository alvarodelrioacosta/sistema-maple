import React, { useEffect, useState, useCallback } from 'react';
import { symbolProgressService } from '../../services';
import type { SymbolProgress } from '../../services';
import { SYMBOLS } from '../../constants/symbols';

interface Props {
    characterId: string;
    characterLevel: number;
}

const SymbolCard: React.FC<{
    sym: typeof SYMBOLS[0];
    level: number;
    isSaving: boolean;
    onChange: (raw: string) => void;
}> = ({ sym, level, isSaving, onChange }) => {
    const pct = level / sym.maxLevel;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${level > 0 ? sym.color + '55' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '8px',
            padding: '8px 6px 6px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
        }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: `${pct * 100}%`, height: '3px',
                background: sym.color,
                transition: 'width 0.2s'
            }} />
            <img
                src={sym.imageUrl}
                alt={sym.shortName}
                title={sym.name}
                style={{ width: '30px', height: '30px', objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    type="number"
                    min={0}
                    max={sym.maxLevel}
                    value={level === 0 ? '' : level}
                    placeholder="–"
                    onChange={e => onChange(e.target.value)}
                    style={{
                        width: '32px',
                        background: 'transparent',
                        border: 'none',
                        color: level === sym.maxLevel ? sym.color : '#f1f5f9',
                        fontWeight: level === sym.maxLevel ? 700 : 400,
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        outline: 'none',
                        padding: 0
                    }}
                />
                {isSaving && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: '2px' }}>✓</span>}
            </div>
        </div>
    );
};

export const SymbolTracker: React.FC<Props> = ({ characterId, characterLevel }) => {
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

    const arcane = SYMBOLS.filter(s => s.type === 'arcane' && characterLevel >= s.unlockLevel);
    const sacred  = SYMBOLS.filter(s => s.type === 'sacred' && characterLevel >= s.unlockLevel);

    if (arcane.length === 0 && sacred.length === 0) {
        return (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: '0.8rem' }}>
                Symbols unlock at level 200
            </div>
        );
    }

    return (
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
                {/* Arcane — left half, 2 rows × 3 cols */}
                {arcane.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                            Arcane
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {arcane.map(sym => (
                                <SymbolCard
                                    key={sym.name}
                                    sym={sym}
                                    level={levels[sym.name] ?? 0}
                                    isSaving={saving === sym.name}
                                    onChange={raw => handleChange(sym.name, sym.type, sym.maxLevel, raw)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Sacred — right half, 2 rows × 4 cols */}
                {sacred.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                            Sacred
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {sacred.map(sym => (
                                <SymbolCard
                                    key={sym.name}
                                    sym={sym}
                                    level={levels[sym.name] ?? 0}
                                    isSaving={saving === sym.name}
                                    onChange={raw => handleChange(sym.name, sym.type, sym.maxLevel, raw)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
