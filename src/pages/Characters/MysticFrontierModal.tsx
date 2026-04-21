import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '../../components/UI';
import { supabase } from '../../lib/supabase';
import { resourcesService } from '../../services/resources';
import type { CharacterWithAccount } from '../../types';
import type {
  MysticFrontierExpedition,
  MysticFrontierRewardType,
} from '../../types';
import {
  getExpeditions,
  CUBE_RESOURCE_KEYS,
} from '../../services/mysticFrontierService';
import { ExpeditionCard } from '../MysticFrontier/ExpeditionCard';
import './MysticFrontierModal.css';

const FAM_BADGE_IMG = 'https://static.wikia.nocookie.net/maplestory/images/3/3d/FamiliarBadge_Void_Badge.png/revision/latest?cb=20200825222246';
const USEFUL_FAMS_IMG = 'https://static.wikia.nocookie.net/maplestory/images/d/de/Use_Ascendion_Familiar.png/revision/latest?cb=20200822011947';

// ─── Main modal ────────────────────────────────────────────────────────────────

interface Props {
  character: CharacterWithAccount | null;
  onClose: () => void;
}

export const MysticFrontierModal: React.FC<Props> = ({ character, onClose }) => {
  const [expeditions, setExpeditions] = useState<MysticFrontierExpedition[]>([]);
  const [cubeImages, setCubeImages] = useState<Record<MysticFrontierRewardType, string>>(
    {} as Record<MysticFrontierRewardType, string>,
  );
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [is8Fams, setIs8Fams] = useState(!!character?.unlock_mf_8_fams);
  const [is9Fams, setIs9Fams] = useState(!!character?.unlock_mf_9_fams);

  useEffect(() => {
    setIs8Fams(!!character?.unlock_mf_8_fams);
    setIs9Fams(!!character?.unlock_mf_9_fams);
  }, [character]);

  const fetchData = useCallback(async () => {
    if (!character) return;
    const exps = await getExpeditions(character.id);
    setExpeditions(exps);
  }, [character]);

  useEffect(() => {
    if (!character) return;
    fetchData();
    resourcesService.getResourceMetadata().then(meta => {
      const imgs = {} as Record<MysticFrontierRewardType, string>;
      for (const [resourceKey, rewardType] of Object.entries(CUBE_RESOURCE_KEYS)) {
        if (meta[resourceKey]?.image) imgs[rewardType] = meta[resourceKey].image;
      }
      setCubeImages(imgs);
    }).catch(() => {});
  }, [character, fetchData]);

  const handleToggleFamUnlock = async (col: 'unlock_mf_8_fams' | 'unlock_mf_9_fams', currentValue: boolean) => {
    if (!character) return;
    setUnlockLoading(true);
    try {
      await supabase.from('characters').update({ [col]: !currentValue }).eq('id', character.id);
      if (col === 'unlock_mf_8_fams') setIs8Fams(!currentValue);
      else setIs9Fams(!currentValue);
    } finally {
      setUnlockLoading(false);
    }
  };

  const expByNumber = (n: 1 | 2 | 3): MysticFrontierExpedition | null =>
    expeditions.find(e => e.expedition_index === n) ?? null;

  const isUnlocked = is8Fams && is9Fams;

  return (
    <Modal isOpen={!!character} onClose={onClose} title="Mystic Frontier" size="lg">
      <div className="mf-header">
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{character?.name}</span>
      </div>

      {!isUnlocked ? (
        <div className="mf-locked">
          <p>Activate <strong>8 Badge Fams</strong> and <strong>9 Useful Fams</strong> to unlock Mystic Frontier.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([
              { col: 'unlock_mf_8_fams', img: FAM_BADGE_IMG, label: '8 Badge Fams', active: is8Fams },
              { col: 'unlock_mf_9_fams', img: USEFUL_FAMS_IMG, label: '9 Useful Fams', active: is9Fams },
            ] as const).map(({ col, img, label, active }) => (
              <div
                key={col}
                style={{ position: 'relative', cursor: unlockLoading ? 'wait' : 'pointer' }}
                onClick={() => !unlockLoading && handleToggleFamUnlock(col, active)}
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
        <div className="mf-expedition-grid">
          {([1, 2, 3] as const).map(n => (
            <ExpeditionCard
              key={n}
              expeditionNumber={n}
              expedition={expByNumber(n)}
              characterId={character!.id}
              cubeImages={cubeImages}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};

export default MysticFrontierModal;
