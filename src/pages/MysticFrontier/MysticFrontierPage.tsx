import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { charactersService } from '../../services/characters';
import { resourcesService } from '../../services/resources';
import {
  getExpeditions,
  CUBE_RESOURCE_KEYS,
} from '../../services/mysticFrontierService';
import { ExpeditionHistory } from '../ExpeditionHistory/ExpeditionHistory';

const FAM_BADGE_IMG = 'https://static.wikia.nocookie.net/maplestory/images/3/3d/FamiliarBadge_Void_Badge.png/revision/latest?cb=20200825222246';
const USEFUL_FAMS_IMG = 'https://static.wikia.nocookie.net/maplestory/images/d/de/Use_Ascendion_Familiar.png/revision/latest?cb=20200822011947';
import type {
  CharacterWithAccount,
  MysticFrontierExpedition,
  MysticFrontierRewardType,
} from '../../types';
import { ExpeditionCard } from './ExpeditionCard';
import './MysticFrontierPage.css';
import '../Characters/MysticFrontierModal.css';


export interface CharacterRowProps {
  character: CharacterWithAccount;
  expeditions: MysticFrontierExpedition[];
  cubeImages: Record<MysticFrontierRewardType, string>;
  onRefresh: (characterId: string) => void;
  onUnlockToggle: (characterId: string, col: 'unlock_mf_8_fams' | 'unlock_mf_9_fams', currentValue: boolean) => void;
}

export const CharacterRow: React.FC<CharacterRowProps> = ({
  character,
  expeditions,
  cubeImages,
  onRefresh,
  onUnlockToggle,
}) => {
  const isUnlocked = !!character.unlock_mf_8_fams && !!character.unlock_mf_9_fams;

  const expByNumber = (n: 1 | 2 | 3): MysticFrontierExpedition | null =>
    expeditions.find(e => e.expedition_index === n) ?? null;

  return (
    <div className="mfp-row">
      {/* Account / character info */}
      <div className="mfp-row__account">
        <div className="mfp-row__account-line">
          <span className="mfp-row__account-num">N°{character.account?.number ?? '?'}</span>
          {character.account?.tag && (
            <span className="mfp-row__account-tag">{character.account.tag}</span>
          )}
        </div>
        <span className="mfp-row__account-email">{character.account?.email ?? ''}</span>
        <span className="mfp-row__char-name">{character.name}</span>
      </div>

      {/* Content area */}
      <div className="mfp-row__content">
        {!isUnlocked ? (
          <div className="mfp-row__locked">
            <p>Activate <strong>8 Badge Fams</strong> and <strong>9 Useful Fams</strong> to unlock Mystic Frontier.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {([
                { col: 'unlock_mf_8_fams', img: FAM_BADGE_IMG, label: '8 Badge Fams', active: !!character.unlock_mf_8_fams },
                { col: 'unlock_mf_9_fams', img: USEFUL_FAMS_IMG, label: '9 Useful Fams', active: !!character.unlock_mf_9_fams },
              ] as const).map(({ col, img, label, active }) => (
                <div
                  key={col}
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => onUnlockToggle(character.id, col, active)}
                  title={`${label} — ${active ? 'click to disable' : 'click to enable'}`}
                >
                  <img
                    src={img}
                    alt={label}
                    style={{
                      width: 40, height: 40, objectFit: 'contain', display: 'block',
                      borderRadius: 8,
                      border: `2px solid ${active ? '#4ade8055' : 'rgba(255,255,255,0.05)'}`,
                      background: 'rgba(0,0,0,0.2)',
                      filter: active ? 'none' : 'grayscale(1) opacity(0.4)',
                      transition: 'all 0.2s',
                    }}
                  />
                  {active && (
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2,
                      background: '#4ade80', color: '#000', borderRadius: '50%',
                      width: 14, height: 14, fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                    }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mfp-row__expeditions">
            {([1, 2, 3] as const).map(n => (
              <ExpeditionCard
                key={n}
                expeditionNumber={n}
                expedition={expByNumber(n)}
                characterId={character.id}
                accountId={character.account_id}
                cubeImages={cubeImages}
                onRefresh={() => onRefresh(character.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

export const MysticFrontierPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expeditions' | 'history'>('expeditions');
  const [characters, setCharacters] = useState<CharacterWithAccount[]>([]);
  const [expeditions, setExpeditions] = useState<Record<string, MysticFrontierExpedition[]>>({});
  const [cubeImages, setCubeImages] = useState<Record<MysticFrontierRewardType, string>>(
    {} as Record<MysticFrontierRewardType, string>,
  );
  const [loading, setLoading] = useState(true);

  const fetchCharacterData = useCallback(async (characterId: string) => {
    const exps = await getExpeditions(characterId);
    setExpeditions(prev => ({ ...prev, [characterId]: exps }));
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const all = await charactersService.getAll();
        const mains = all.filter(c => c.main === 'Main');
        mains.sort((a, b) => (a.account?.number ?? 0) - (b.account?.number ?? 0));
        setCharacters(mains);

        await Promise.all(mains.map(c => fetchCharacterData(c.id)));

        const meta = await resourcesService.getResourceMetadata();
        const imgs = {} as Record<MysticFrontierRewardType, string>;
        for (const [resourceKey, rewardType] of Object.entries(CUBE_RESOURCE_KEYS)) {
          if (meta[resourceKey]?.image) imgs[rewardType] = meta[resourceKey].image;
        }
        setCubeImages(imgs);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchCharacterData]);

  const handleUnlockToggle = async (characterId: string, col: 'unlock_mf_8_fams' | 'unlock_mf_9_fams', currentValue: boolean) => {
    await supabase.from('characters').update({ [col]: !currentValue }).eq('id', characterId);
    setCharacters(prev => prev.map(c =>
      c.id === characterId ? { ...c, [col]: !currentValue } : c,
    ));
  };

  return (
    <div className="mfp-page">
      <div className="mfp-header">
        <h1 className="mfp-title">◈ Mystic Frontier</h1>
        <p className="mfp-subtitle">Track expedition timers and rewards across all accounts</p>
      </div>

      <div className="mfp-tabs">
        <button
          className={`mfp-tab${activeTab === 'expeditions' ? ' active' : ''}`}
          onClick={() => setActiveTab('expeditions')}
        >
          Expeditions
        </button>
        <button
          className={`mfp-tab${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'history' ? (
        <ExpeditionHistory embedded />
      ) : loading ? (
        <div className="mfp-loading">Loading expeditions…</div>
      ) : characters.length === 0 ? (
        <div className="mfp-empty">No main characters found.</div>
      ) : (
        <div className="mfp-rows">
          {characters.map(char => (
            <CharacterRow
              key={char.id}
              character={char}
              expeditions={expeditions[char.id] ?? []}
              cubeImages={cubeImages}
              onRefresh={fetchCharacterData}
              onUnlockToggle={handleUnlockToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MysticFrontierPage;
