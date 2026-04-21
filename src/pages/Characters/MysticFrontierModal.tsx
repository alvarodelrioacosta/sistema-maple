import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, Button } from '../../components/UI';
import { resourcesService } from '../../services/resources';
import type { CharacterWithAccount } from '../../types';
import type {
  MysticFrontierExpedition,
  MysticFrontierSiteRank,
  MysticFrontierRewardType,
  MysticFrontierRewardItem,
  MysticFrontierRewardEntry,
} from '../../types';
import {
  getExpeditions,
  startExpedition,
  collectRewards,
  completeRest,
  getRewardHistory,
  setUnlocked,
  computeLiveStatus,
  getTimeRemainingMs,
  formatDuration,
  REWARD_METADATA,
  CUBE_REWARDS,
} from '../../services/mysticFrontierService';
import './MysticFrontierModal.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_RANKS: MysticFrontierSiteRank[] = ['Common', 'Rare', 'Epic', 'Unique', 'Legendary'];

const RANK_COLORS: Record<MysticFrontierSiteRank, string> = {
  Common:    '#718096',
  Rare:      '#4299e1',
  Epic:      '#9f7aea',
  Unique:    '#ed8936',
  Legendary: '#d69e2e',
};

const EXPEDITION_LABELS = ['Expedition I', 'Expedition II', 'Expedition III'] as const;

const ALL_REWARD_TYPES = Object.keys(REWARD_METADATA) as MysticFrontierRewardType[];

// Maps resource service keys to MysticFrontierRewardType for cube images
const CUBE_RESOURCE_KEYS: Record<string, MysticFrontierRewardType> = {
  solid_cubes:        'karma_solid_cubes',
  bright_cubes:       'karma_bright_cubes',
  bonus_bright_cubes: 'karma_bonus_bright_cubes',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── ExpeditionCard ───────────────────────────────────────────────────────────

interface ExpeditionCardProps {
  expeditionNumber: 1 | 2 | 3;
  expedition: MysticFrontierExpedition | null;
  characterId: string;
  cubeImages: Record<MysticFrontierRewardType, string>;
  onRefresh: () => void;
}

const ExpeditionCard: React.FC<ExpeditionCardProps> = ({
  expeditionNumber,
  expedition,
  characterId,
  cubeImages,
  onRefresh,
}) => {
  const [selectedRank, setSelectedRank] = useState<MysticFrontierSiteRank>('Common');
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<'available' | 'exploring' | 'resting'>('available');
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [cubeQtys, setCubeQtys] = useState<Partial<Record<MysticFrontierRewardType, number>>>({});
  const [nonCubeChecked, setNonCubeChecked] = useState<Partial<Record<MysticFrontierRewardType, boolean>>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!expedition) {
      setLiveStatus('available');
      setMsLeft(null);
      return;
    }

    const tick = () => {
      setLiveStatus(computeLiveStatus(expedition));
      setMsLeft(getTimeRemainingMs(expedition));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expedition]);

  const timerDone = msLeft !== null && msLeft <= 0;

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startExpedition(characterId, expeditionNumber, selectedRank);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectRewards = async () => {
    if (!expedition) return;
    setActionLoading(true);
    try {
      const rewards: MysticFrontierRewardItem[] = [];
      for (const type of ALL_REWARD_TYPES) {
        if (CUBE_REWARDS.has(type)) {
          const qty = cubeQtys[type] ?? 0;
          if (qty > 0) rewards.push({ type, quantity: qty });
        } else {
          if (nonCubeChecked[type]) rewards.push({ type, quantity: 1 });
        }
      }
      await collectRewards(characterId, expeditionNumber, rewards, expedition.site_rank);
      setShowRewardPicker(false);
      setCubeQtys({});
      setNonCubeChecked({});
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRest = async () => {
    setActionLoading(true);
    try {
      await completeRest(characterId, expeditionNumber);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const activeRank = expedition?.site_rank ?? selectedRank;
  const rankColor = RANK_COLORS[activeRank];

  return (
    <div className="mf-expedition-card">
      <div className="mf-expedition-title">{EXPEDITION_LABELS[expeditionNumber - 1]}</div>

      <div>
        <span className={`mf-status-badge ${liveStatus}`}>
          {liveStatus === 'available' && '● Available'}
          {liveStatus === 'exploring' && '◎ Exploring'}
          {liveStatus === 'resting'   && '◑ Resting'}
        </span>
      </div>

      {liveStatus === 'available' ? (
        <select
          className="mf-rank-select"
          value={selectedRank}
          onChange={e => setSelectedRank(e.target.value as MysticFrontierSiteRank)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-sm, 4px)',
            color: 'var(--color-text-primary, #f8fafc)',
            padding: '0.3rem 0.5rem',
            fontSize: '0.85rem',
            width: '100%',
          }}
        >
          {SITE_RANKS.map(r => (
            <option key={r} value={r} style={{ background: '#1a1a2e' }}>{r}</option>
          ))}
        </select>
      ) : (
        <span
          className="mf-rank-badge"
          style={{
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: rankColor + '22',
            color: rankColor,
            border: `1px solid ${rankColor}55`,
            display: 'inline-block',
          }}
        >
          {activeRank}
        </span>
      )}

      {liveStatus !== 'available' && (
        <div className="mf-timer">
          {timerDone
            ? <span style={{ color: '#48bb78' }}>Ready!</span>
            : msLeft !== null ? formatDuration(msLeft) : '--:--:--'
          }
        </div>
      )}

      {liveStatus === 'available' && (
        <Button className="mf-action-btn" size="sm" variant="primary" loading={actionLoading} onClick={handleStart}>
          Start Expedition
        </Button>
      )}

      {liveStatus === 'exploring' && timerDone && !showRewardPicker && (
        <Button className="mf-action-btn" size="sm" variant="secondary" onClick={() => setShowRewardPicker(true)}>
          Collect Rewards
        </Button>
      )}

      {liveStatus === 'resting' && timerDone && (
        <Button className="mf-action-btn" size="sm" variant="ghost" loading={actionLoading} onClick={handleCompleteRest}>
          Complete Rest
        </Button>
      )}

      {showRewardPicker && (
        <div className="mf-reward-picker">
          <div className="mf-reward-picker-title">Select Rewards Received</div>
          <div className="mf-reward-list">
            {ALL_REWARD_TYPES.map(type => {
              const meta = REWARD_METADATA[type];
              const isCube = CUBE_REWARDS.has(type);
              const imgSrc = isCube ? cubeImages[type] : meta.image_url;

              return (
                <div key={type} className="mf-reward-row">
                  {imgSrc ? (
                    <img src={imgSrc} alt={meta.label} className="mf-reward-img" />
                  ) : (
                    <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  {isCube ? (
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="mf-reward-qty-input"
                      value={cubeQtys[type] ?? 0}
                      onChange={e => setCubeQtys(prev => ({
                        ...prev,
                        [type]: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                      }))}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      id={`mf-chk-${expeditionNumber}-${type}`}
                      checked={!!nonCubeChecked[type]}
                      onChange={e => setNonCubeChecked(prev => ({ ...prev, [type]: e.target.checked }))}
                      style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <Button size="sm" variant="ghost" style={{ flex: 1 }} onClick={() => setShowRewardPicker(false)}>Cancel</Button>
            <Button size="sm" variant="primary" loading={actionLoading} style={{ flex: 2 }} onClick={handleCollectRewards}>Confirm</Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>No rewards collected yet.</p>
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
                        {imgSrc && <img src={imgSrc} alt={meta?.label ?? r.type} className="mf-history-reward-icon" title={meta?.label ?? r.type} />}
                        {r.quantity > 1 && <span style={{ fontSize: '0.7rem', marginRight: '0.2rem' }}>×{r.quantity}</span>}
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
