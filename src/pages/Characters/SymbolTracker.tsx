import React, { useState, useCallback } from 'react';
import supabase from '../../lib/supabase';
import { SYMBOLS } from '../../constants/symbols';
import type { Character } from '../../types';

interface Props {
    character: Character;
    characterLevel: number;
    onUpdate: (col: string, value: number) => void;
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

export const SymbolTracker: React.FC<Props> = ({ character, characterLevel, onUpdate }) => {
    const [saving, setSaving] = useState<string | null>(null);

    const handleChange = useCallback(async (sym: typeof SYMBOLS[0], raw: string) => {
        const val = Math.min(sym.maxLevel, Math.max(0, parseInt(raw) || 0));
        onUpdate(sym.column, val);
        setSaving(sym.column);
        try {
            await supabase.from('characters').update({ [sym.column]: val }).eq('id', character.id);
        } finally {
            setSaving(null);
        }
    }, [character.id, onUpdate]);

    const arcane = SYMBOLS.filter(s => s.type === 'arcane' && characterLevel >= s.unlockLevel);
    const sacred  = SYMBOLS.filter(s => s.type === 'sacred'  && characterLevel >= s.unlockLevel);

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
                {arcane.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                            Arcane
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {arcane.map(sym => (
                                <SymbolCard
                                    key={sym.column}
                                    sym={sym}
                                    level={(character as unknown as Record<string, number | null>)[sym.column] ?? 0}
                                    isSaving={saving === sym.column}
                                    onChange={raw => handleChange(sym, raw)}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {sacred.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                            Sacred
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {sacred.map(sym => (
                                <SymbolCard
                                    key={sym.column}
                                    sym={sym}
                                    level={(character as unknown as Record<string, number | null>)[sym.column] ?? 0}
                                    isSaving={saving === sym.column}
                                    onChange={raw => handleChange(sym, raw)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
