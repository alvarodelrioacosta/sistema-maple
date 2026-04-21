import React from 'react';
import { ExtraStatsTracker } from '../Characters/ExtraStatsTracker';
import type { CharacterWithAccount } from '../../types';

interface Props {
    character: CharacterWithAccount;
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const ExtraStatsCellPanel: React.FC<Props> = ({ character: characterProp, onCharacterUpdate }) => {
    const [localCharacter, setLocalCharacter] = React.useState(characterProp);

    React.useEffect(() => { setLocalCharacter(characterProp); }, [characterProp]);

    const character = localCharacter;

    const handleUpdate = (col: string, value: number | boolean | string | null) => {
        setLocalCharacter(prev => ({ ...prev, [col]: value }));
        onCharacterUpdate(character.id, col, value);
    };

    const handleAccountUpdate = (col: string, value: number | boolean | string | null) => {
        setLocalCharacter(prev => ({
            ...prev,
            account: prev.account ? { ...prev.account, [col]: value } : prev.account,
        }));
    };

    return (
        <ExtraStatsTracker
            character={character}
            account={character.account}
            isBossPotUnlocked={character.unlock_boss_pots}
            isLegionArtifactUnlocked={character.account?.legion_artifact ?? false}
            isSixthJobDone={character.unlock_6th_job}
            onUpdate={handleUpdate}
            onAccountUpdate={handleAccountUpdate}
        />
    );
};
