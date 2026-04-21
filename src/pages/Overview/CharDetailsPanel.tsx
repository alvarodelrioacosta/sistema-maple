import React from 'react';
import { SymbolTracker } from '../Characters/SymbolTracker';
import { SixthJobTracker } from '../Characters/SixthJobTracker';
import { ExtraStatsTracker } from '../Characters/ExtraStatsTracker';
import { ContentUnlocksPanel } from '../Characters/ContentUnlocksPanel';
import type { CharacterWithAccount, ClassItem } from '../../types';

interface Props {
    character: CharacterWithAccount;
    classes: ClassItem[];
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const CharDetailsPanel: React.FC<Props> = ({ character: characterProp, classes, onCharacterUpdate }) => {
    const [localCharacter, setLocalCharacter] = React.useState<CharacterWithAccount>(characterProp);

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
            <ContentUnlocksPanel character={character} account={character.account} />
        </div>
    );
};
