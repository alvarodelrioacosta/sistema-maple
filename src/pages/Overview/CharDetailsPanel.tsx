import React from 'react';
import supabase from '../../lib/supabase';
import { SymbolTracker } from '../Characters/SymbolTracker';
import { SixthJobTracker } from '../Characters/SixthJobTracker';
import type { CharacterWithAccount, ClassItem } from '../../types';

const SIXTH_JOB_IMG = 'https://i.namu.wiki/i/iIBti_fMumlIhMZ46-nblejwOxKqKItmyM7NqV7C8NfuODUQpbvhKHJdzMLK_v4vda9ivQoLepMPw7pNZiSyow.webp';

interface Props {
    character: CharacterWithAccount;
    classes: ClassItem[];
    onCharacterUpdate: (charId: string, col: string, value: number | boolean | string | null) => void;
}

export const CharDetailsPanel: React.FC<Props> = ({ character: characterProp, classes, onCharacterUpdate }) => {
    const [localCharacter, setLocalCharacter] = React.useState<CharacterWithAccount>(characterProp);
    const [confirmSixthJob, setConfirmSixthJob] = React.useState(false);

    React.useEffect(() => { setLocalCharacter(characterProp); }, [characterProp]);

    const character = localCharacter;

    const handleUpdate = (col: string, value: number | boolean | string | null) => {
        setLocalCharacter(prev => ({ ...prev, [col]: value }));
        onCharacterUpdate(character.id, col, value);
    };

    const handleUnlock6thJob = async () => {
        handleUpdate('unlock_6th_job', true);
        await supabase.from('characters').update({ unlock_6th_job: true }).eq('id', character.id);
        setConfirmSixthJob(false);
    };

    const isSixthJobUnlocked = character.unlock_6th_job;
    const isAccount0 = character.account?.number === 0;

    const classItem = classes.find(cls => cls.class_name === character.class) ?? null;

    const confirmBar = confirmSixthJob ? (
        <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '6px 10px',
            margin: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            <span style={{ color: '#fca5a5', flex: 1, fontSize: '0.7rem' }}>Unlock 6th Job?</span>
            <button onClick={handleUnlock6thJob} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
            <button onClick={() => setConfirmSixthJob(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer' }}>Cancel</button>
        </div>
    ) : null;

    const sixthJobLockIcon = (
        <img
            src={SIXTH_JOB_IMG}
            alt="Unlock 6th Job"
            title="Click to unlock 6th Job"
            onClick={() => setConfirmSixthJob(true)}
            style={{
                width: 40, height: 40, borderRadius: 8, objectFit: 'cover',
                cursor: 'pointer', flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: 0.75,
                transition: 'opacity 0.2s',
            }}
        />
    );

    if (!isAccount0) {
        return (
            <div className="char-panel-compact">
                {confirmBar}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                    <SymbolTracker character={character} characterLevel={character.level} onUpdate={handleUpdate} noWrapper />
                    <div style={{ width: 40, flexShrink: 0 }} />
                    {isSixthJobUnlocked ? (
                        <SixthJobTracker
                            character={character}
                            classItem={classItem}
                            unlocked={isSixthJobUnlocked}
                            loadingUnlocks={false}
                            onUpdate={handleUpdate}
                            noWrapper
                            originAndAscentOnly
                        />
                    ) : sixthJobLockIcon}
                </div>
            </div>
        );
    }

    return (
        <div className="char-panel-compact">
            {confirmBar}
            <SymbolTracker character={character} characterLevel={character.level} onUpdate={handleUpdate} compact />
            {isSixthJobUnlocked ? (
                <SixthJobTracker
                    character={character}
                    classItem={classItem}
                    unlocked={isSixthJobUnlocked}
                    loadingUnlocks={false}
                    onUpdate={handleUpdate}
                    compact
                />
            ) : (
                <div style={{ padding: '6px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
                    {sixthJobLockIcon}
                </div>
            )}
        </div>
    );
};
