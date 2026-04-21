import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button } from '../../components/UI';
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
  setUnlocked,
  REWARD_METADATA,
  CUBE_REWARDS,
  CUBE_RESOURCE_KEYS,
  RANK_COLORS,
} from '../../services/mysticFrontierService';
import { ExpeditionCard } from '../MysticFrontier/ExpeditionCard';
import './MysticFrontierModal.css';

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

  const handleUnlockToggle = async () => {
    if (!character) return;
    setUnlockLoading(true);
    try {
      await setUnlocked(character.id, !character.is_mystic_frontier_unlocked);
      await fetchData();
    } finally {
      setUnlockLoading(false);
    }
  };

  const expByNumber = (n: 1 | 2 | 3): MysticFrontierExpedition | null =>
    expeditions.find(e => e.expedition_index === n) ?? null;

  const isUnlocked = !!character?.is_mystic_frontier_unlocked;

  return (
    <Modal isOpen={!!character} onClose={onClose} title="Mystic Frontier" size="lg">
      <div className="mf-header">
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{character?.name}</span>
        <label className="mf-unlock-toggle">
          <input
            type="checkbox"
            checked={isUnlocked}
            onChange={handleUnlockToggle}
            disabled={unlockLoading}
            style={{ accentColor: 'var(--color-accent-primary)' }}
          />
          Unlocked
        </label>
      </div>

      {!isUnlocked ? (
        <div className="mf-locked">
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <p>Complete <strong>Mystic Frontier pt.2 — 9 Useful Fams</strong> to unlock this feature.</p>
          <Button size="sm" variant="secondary" loading={unlockLoading} onClick={handleUnlockToggle}>
            Mark as Unlocked
          </Button>
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
