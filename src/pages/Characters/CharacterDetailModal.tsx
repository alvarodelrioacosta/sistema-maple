import React from 'react';
import { Modal } from '../../components/UI';
import { SymbolTracker } from './SymbolTracker';
import { SixthJobTracker } from './SixthJobTracker';
import { ContentUnlocksPanel } from './ContentUnlocksPanel';
import type { CharacterWithAccount, ClassItem } from '../../types';

interface Props {
    character: CharacterWithAccount | null;
    classes: ClassItem[];
    onClose: () => void;
}

export const CharacterDetailModal: React.FC<Props> = ({ character, classes, onClose }) => {
    if (!character) return null;

    const jobClass = classes.find(cls => cls.job_1 === character.job || cls.job_2 === character.job);
    const jobIcon = character.class === 'Xenon'
        ? '/xenon.png'
        : jobClass ? (jobClass.job_1 === character.job ? jobClass.image_1 : jobClass.image_2) : null;

    return (
        <Modal isOpen={!!character} onClose={onClose} title="" size="lg" hideHeader>
            {/* Character header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '4px 0 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '4px' }}>
                {character.avatar_url ? (
                    <img
                        src={character.avatar_url}
                        alt={character.name}
                        style={{ width: '72px', height: '72px', objectFit: 'contain', flexShrink: 0 }}
                    />
                ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>?</div>
                )}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
                        {character.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', color: '#94a3b8' }}>
                            Level <strong style={{ color: '#f1f5f9' }}>{character.level}</strong>
                            {character.exp_percent != null && (
                                <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '6px' }}>
                                    ({Number(character.exp_percent).toFixed(1)}%)
                                </span>
                            )}
                        </span>
                        {jobIcon && (
                            <img src={jobIcon} alt={character.job || ''} title={character.job || ''} style={{ width: '24px', height: '24px' }} />
                        )}
                        {character.class && (
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{character.class}</span>
                        )}
                        {character.main && (
                            <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                background: character.main === 'Main' ? 'rgba(255,215,0,0.15)' : 'rgba(128,128,128,0.1)',
                                color: character.main === 'Main' ? '#ffd700' : '#888',
                                border: character.main === 'Main' ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(128,128,128,0.2)'
                            }}>
                                {character.main}
                            </span>
                        )}
                    </div>
                    {character.account && (
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                            Account #{character.account.number} — {character.account.email}
                        </div>
                    )}
                </div>
            </div>

            {/* Tracker sections */}
            <SymbolTracker characterId={character.id} characterLevel={character.level} />
            <SixthJobTracker characterId={character.id} characterClass={character.class} />
            <ContentUnlocksPanel accountId={character.account_id} />
        </Modal>
    );
};
