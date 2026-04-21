import React from 'react';
import { SymbolTracker } from '../Characters/SymbolTracker';
import { SixthJobTracker } from '../Characters/SixthJobTracker';
import { ExtraStatsTracker } from '../Characters/ExtraStatsTracker';
import { ContentUnlocksPanel } from '../Characters/ContentUnlocksPanel';
import { UNLOCK_DEFINITIONS } from '../../constants/unlocks';
import type { CharacterWithAccount, ClassItem } from '../../types';

interface Props {
    character: CharacterWithAccount;
    classes: ClassItem[];
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const CharDetailsPanel: React.FC<Props> = ({ character: characterProp, classes, onCharacterUpdate }) => {
    const [localCharacter, setLocalCharacter] = React.useState<CharacterWithAccount>(characterProp);
    const [showContentUnlocks, setShowContentUnlocks] = React.useState(false);

    React.useEffect(() => { setLocalCharacter(characterProp); }, [characterProp]);
    React.useEffect(() => { setShowContentUnlocks(false); }, [characterProp.id]);

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

    const completedUnlocks = UNLOCK_DEFINITIONS.filter(def => {
        if (def.level === 'account') return !!(character.account as any)?.[def.key];
        return !!(character as any)[def.key];
    }).length;

    return (
        <div className="char-panel-compact">
            {/* Compact character header */}
            <div className="char-panel-compact__header">
                {character.avatar_url && (
                    <img src={character.avatar_url} alt={character.name} className="char-panel-compact__avatar" />
                )}
                <span className="char-panel-compact__name">{character.name}</span>
                <span className="char-panel-compact__level">Lv {character.level}</span>
                {jobIcon && <img src={jobIcon} alt={character.job || ''} title={character.job || ''} className="char-panel-compact__job-icon" />}
                {character.class && <span className="char-panel-compact__class">{character.class}</span>}
            </div>

            <SymbolTracker character={character} characterLevel={character.level} onUpdate={handleUpdate} compact />
            <SixthJobTracker
                character={character}
                classItem={classItem}
                unlocked={isSixthJobUnlocked}
                loadingUnlocks={false}
                onUpdate={handleUpdate}
                compact
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

            <button
                onClick={() => setShowContentUnlocks(v => !v)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                    Content Unlocks
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700 }}>
                        {completedUnlocks} / {UNLOCK_DEFINITIONS.length}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>{showContentUnlocks ? '▲' : '▼'}</span>
                </div>
            </button>

            {showContentUnlocks && (
                <ContentUnlocksPanel
                    key={character.id}
                    character={character}
                    account={character.account}
                    onUpdate={handleUpdate}
                    onAccountUpdate={handleAccountUpdate}
                />
            )}
        </div>
    );
};
