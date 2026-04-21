import React from 'react';
import { ContentUnlocksPanel } from '../Characters/ContentUnlocksPanel';
import type { CharacterWithAccount } from '../../types';

interface Props {
    character: CharacterWithAccount;
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const ContentUnlocksCellPanel: React.FC<Props> = ({ character: characterProp, onCharacterUpdate }) => {
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
        <ContentUnlocksPanel
            key={character.id}
            character={character}
            account={character.account}
            onUpdate={handleUpdate}
            onAccountUpdate={handleAccountUpdate}
        />
    );
};
