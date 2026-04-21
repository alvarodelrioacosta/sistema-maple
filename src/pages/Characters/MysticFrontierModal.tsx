import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '../../components/UI';
import { supabase } from '../../lib/supabase';
import { resourcesService } from '../../services/resources';
import type { CharacterWithAccount } from '../../types';
import type {
  MysticFrontierExpedition,
  MysticFrontierRewardType,
  MysticFrontierRewardEntry,
} from '../../types';
import {
  getExpeditions,
  getRewardHistory,
  REWARD_METADATA,
  CUBE_REWARDS,
  CUBE_RESOURCE_KEYS,
  RANK_COLORS,
} from '../../services/mysticFrontierService';
import { ExpeditionCard } from '../MysticFrontier/ExpeditionCard';
import './MysticFrontierModal.css';

const FAM_BADGE_IMG = 'https://static.wikia.nocookie.net/maplestory/images/3/3d/FamiliarBadge_Void_Badge.png/revision/latest?cb=20200825222246';
const USEFUL_FAMS_IMG = 'https://static.wikia.nocookie.net/maplestory/images/d/de/Use_Ascendion_Familiar.png/revision/latest?cb=20200822011947';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── HistorySection ────────────────────────────────────────────────────────────

interface HistorySectionProps {
  history: MysticFrontierRewardEntry[];
  cubeImages: Record<MysticFrontierRewardType, string>;
}

const HistorySection: React.FC<HistorySectionProps> = ({ history, cubeImages }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mf-history-section">
      <div
        className="mf-history-title"
        onClick={() => setExpanded(p => !p)}
        role="button"
        aria-expanded={expanded}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Reward History{history.length > 0 ? ` (${history.length})` : ''}
      </div>

      {expanded && history.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
          No rewards collected yet.
        </p>
      )}

      {expanded && history.length > 0 && (
        <div className="mf-history-list">
          {history.map(entry => {
            const rankColor = RANK_COLORS[entry.site_rank];
            return (
              <div key={entry.id} className="mf-history-entry">
                <span
                  className="mf-history-rank-badge"
                  style={{ background: rankColor + '22', color: rankColor, border: `1px solid ${rankColor}44` }}
                >
                  {entry.site_rank}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  #{entry.expedition_index}
                </span>
                <div className="mf-history-rewards">
                  {entry.rewards.map((r, ri) => {
                    const meta = REWARD_METADATA[r.type];
                    const imgSrc = CUBE_REWARDS.has(r.type) ? cubeImages[r.type] : meta?.image_url;
                    return (
                      <React.Fragment key={ri}>
                        {imgSrc && (
                          <img src={imgSrc} alt={meta?.label ?? r.type} className="mf-history-reward-icon" title={meta?.label ?? r.type} />
                        )}
                        {r.quantity > 1 && (
                          <span style={{ fontSize: '0.7rem', marginRight: '0.2rem' }}>×{r.quantity}</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <span className="mf-history-date">{formatDate(entry.collected_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main modal ────────────────────────────────────────────────────────────────

interface Props {
  character: CharacterWithAccount | null;
  onClose: () => void;
}

export const MysticFrontierModal: React.FC<Props> = ({ character, onClose }) => {
  const [expeditions, setExpeditions] = useState<MysticFrontierExpedition[]>([]);
  const [history, setHistory] = useState<MysticFrontierRewardEntry[]>([]);
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
    const [exps, hist] = await Promise.all([
      getExpeditions(character.id),
      getRewardHistory(character.id),
    ]);
    setExpeditions(exps);
    setHistory(hist);
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
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <p>Activate <strong>8 Badge Fams</strong> and <strong>9 Useful Fams</strong> to unlock Mystic Frontier.</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
        <>
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
          <HistorySection history={history} cubeImages={cubeImages} />
        </>
      )}
    </Modal>
  );
};

export default MysticFrontierModal;
