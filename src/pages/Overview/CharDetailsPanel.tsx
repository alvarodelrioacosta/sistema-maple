import React, { useState } from 'react';
import { SymbolTracker } from '../Characters/SymbolTracker';
import { SixthJobTracker } from '../Characters/SixthJobTracker';
import { ExtraStatsTracker } from '../Characters/ExtraStatsTracker';
import { ContentUnlocksPanel } from '../Characters/ContentUnlocksPanel';
import { MysticFrontierModal } from '../Characters/MysticFrontierModal';
import type { CharacterWithAccount, ClassItem } from '../../types';

interface Props {
    character: CharacterWithAccount;
    classes: ClassItem[];
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const CharDetailsPanel: React.FC<Props> = ({ character: characterProp, classes, onCharacterUpdate }) => {
    const [localCharacter, setLocalCharacter] = useState<CharacterWithAccount>(characterProp);
    const [mfOpen, setMfOpen] = useState(false);

    React.useEffect(() => { setLocalCharacter(characterProp); }, [characterProp]);

    const character = localCharacter;

    const handleUpdate = (col: string, value: number | boolean | string | null) => {
        setLocalCharacter(prev => ({ ...prev, [col]: value }));
        onCharacterUpdate(character.id, col, value);
    };

    const handleAccountUpdate = (col: string, value: number | boolean | string | null) => {
        setLocalCharacter(prev => ({
            ...prev,
            account: prev.account ? { ...prev.account, [col]: value } : prev.account
        }));
    };

    const isSixthJobUnlocked = character.unlock_6th_job;
    const isBossPotUnlocked = character.unlock_boss_pots;
    const isLegionArtifactUnlocked = character.account?.legion_artifact ?? false;

    const classItem = classes.find(cls => cls.class_name === character.class) ?? null;
    const jobClass = classes.find(cls => cls.job_1 === character.job || cls.job_2 === character.job);
    const jobIcon = character.class === 'Xenon'
        ? '/xenon.png'
        : jobClass ? (jobClass.job_1 === character.job ? jobClass.image_1 : jobClass.image_2) : null;

    return (
        <div style={{ padding: '1.25rem 1.5rem' }}>
            {/* Character header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {character.avatar_url ? (
                    <img
                        src={character.avatar_url}
                        alt={character.name}
                        style={{ width: '56px', height: '56px', objectFit: 'contain', flexShrink: 0 }}
                    />
                ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>?</div>
                )}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '3px' }}>
                        {character.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                            Lv <strong style={{ color: '#f1f5f9' }}>{character.level}</strong>
                            {character.exp_percent != null && (
                                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '4px' }}>
                                    ({Number(character.exp_percent).toFixed(1)}%)
                                </span>
                            )}
                        </span>
                        {jobIcon && (
                            <img src={jobIcon} alt={character.job || ''} title={character.job || ''} style={{ width: '20px', height: '20px' }} />
                        )}
                        {character.class && (
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{character.class}</span>
                        )}
                        {character.main && (
                            <span style={{
                                padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                                background: character.main === 'Main' ? 'rgba(255,215,0,0.15)' : 'rgba(128,128,128,0.1)',
                                color: character.main === 'Main' ? '#ffd700' : '#888',
                                border: character.main === 'Main' ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(128,128,128,0.2)'
                            }}>
                                {character.main}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setMfOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                        borderRadius: '6px', padding: '0.35rem 0.8rem',
                        color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'background 150ms ease',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.1)'; }}
                >
                    ◈ Mystic Frontier
                </button>
            </div>

            <SymbolTracker character={character} characterLevel={character.level} onUpdate={handleUpdate} />
            <SixthJobTracker
                character={character}
                classItem={classItem}
                unlocked={isSixthJobUnlocked}
                loadingUnlocks={false}
                onUpdate={handleUpdate}
            />
            <ExtraStatsTracker
                character={character}
                account={character.account}
                isBossPotUnlocked={isBossPotUnlocked}
                isLegionArtifactUnlocked={isLegionArtifactUnlocked}
                isSixthJobDone={isSixthJobUnlocked}
                onUpdate={handleUpdate}
                onAccountUpdate={handleAccountUpdate}
            />
            <ContentUnlocksPanel character={character} account={character.account} />

            <MysticFrontierModal
                character={mfOpen ? character : null}
                onClose={() => setMfOpen(false)}
            />
        </div>
    );
};
