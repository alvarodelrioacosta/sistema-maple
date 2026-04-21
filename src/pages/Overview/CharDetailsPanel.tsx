import React from 'react';
import { SymbolTracker } from '../Characters/SymbolTracker';
import { SixthJobTracker } from '../Characters/SixthJobTracker';
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

    const isSixthJobUnlocked = character.unlock_6th_job;
    const isAccount0 = character.account?.number === 0;

    const classItem = classes.find(cls => cls.class_name === character.class) ?? null;

    return (
        <div className="char-panel-compact">
            <SymbolTracker character={character} characterLevel={character.level} onUpdate={handleUpdate} compact />
            <SixthJobTracker
                character={character}
                classItem={classItem}
                unlocked={isSixthJobUnlocked}
                loadingUnlocks={false}
                onUpdate={handleUpdate}
                compact
                originAndAscentOnly={!isAccount0}
            />
        </div>
    );
};
