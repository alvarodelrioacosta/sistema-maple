import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, Button } from '../../components/UI';
import { resourcesService } from '../../services/resources';
import type { CharacterWithAccount } from '../../types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — service file exists after backend branch is merged
import * as mfService from '../../services/mysticFrontierService';
import './MysticFrontierModal.css';

// ---------------------------------------------------------------------------
// Local type stubs — replaced with imports from src/types/index.ts after merge
// ---------------------------------------------------------------------------

type MFExpeditionRank = 'E' | 'D' | 'C' | 'B' | 'A';

type MFExpeditionStatus = 'available' | 'exploring' | 'resting';

interface MysticFrontierExpedition {
  id: string;
  character_id: string;
  expedition_index: 0 | 1 | 2;
  rank: MFExpeditionRank;
  status: MFExpeditionStatus;
  /** ISO timestamp when the current period ends */
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MFRewardEntry {
  reward_key: string;
  /** For cube-type rewards; null for non-cube */
  quantity: number | null;
  /** Whether this reward was collected (for non-cube items) */
  collected: boolean;
}

interface MFHistoryEntry {
  id: string;
  character_id: string;
  expedition_index: 0 | 1 | 2;
  rank: MFExpeditionRank;
  rewards: MFRewardEntry[];
  completed_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANKS: MFExpeditionRank[] = ['E', 'D', 'C', 'B', 'A'];

const RANK_COLORS: Record<MFExpeditionRank, string> = {
  E: '#718096',
  D: '#4299e1',
  C: '#9f7aea',
  B: '#ed8936',
  A: '#48bb78',
};

const CUBE_REWARD_KEYS = ['solid_cubes', 'bright_cubes', 'bonus_bright_cubes'];

// Non-cube reward definitions (key → display label)
const NON_CUBE_REWARDS: { key: string; label: string }[] = [
  { key: 'mf_token', label: 'MF Token' },
  { key: 'mf_fragment', label: 'MF Fragment' },
];

const EXPEDITION_LABELS = ['Expedition I', 'Expedition II', 'Expedition III'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeLiveStatus(exp: MysticFrontierExpedition): {
  status: MFExpeditionStatus;
  secondsLeft: number;
} {
  if (exp.status === 'available' || !exp.ends_at) {
    return { status: exp.status, secondsLeft: 0 };
  }
  const diff = Math.floor((new Date(exp.ends_at).getTime() - Date.now()) / 1000);
  return { status: exp.status, secondsLeft: Math.max(0, diff) };
}

function formatSeconds(s: number): string {
  if (s <= 0) return '00:00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ---------------------------------------------------------------------------
// Sub-component: single expedition card
// ---------------------------------------------------------------------------

interface ExpeditionCardProps {
  index: 0 | 1 | 2;
  expedition: MysticFrontierExpedition | null;
  cubeImages: Record<string, string>;
  onRefresh: () => void;
}

const ExpeditionCard: React.FC<ExpeditionCardProps> = ({ index, expedition, cubeImages, onRefresh }) => {
  const [selectedRank, setSelectedRank] = useState<MFExpeditionRank>('E');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [liveStatus, setLiveStatus] = useState<MFExpeditionStatus>('available');
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [cubeQtys, setCubeQtys] = useState<Record<string, number>>({});
  const [nonCubeChecked, setNonCubeChecked] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expedition) {
      setLiveStatus('available');
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const { status, secondsLeft: sl } = computeLiveStatus(expedition);
      setLiveStatus(status);
      setSecondsLeft(sl);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expedition]);

  const timerDone = secondsLeft === 0;

  const handleStartExpedition = async () => {
    setActionLoading(true);
    try {
      await mfService.startExpedition(index, selectedRank);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRest = async () => {
    if (!expedition) return;
    setActionLoading(true);
    try {
      await mfService.completeRest(expedition.id);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRewards = async () => {
    if (!expedition) return;
    setActionLoading(true);
    try {
      const rewards: MFRewardEntry[] = [];
      CUBE_REWARD_KEYS.forEach(key => {
        const qty = cubeQtys[key] ?? 0;
        if (qty > 0) rewards.push({ reward_key: key, quantity: qty, collected: true });
      });
      NON_CUBE_REWARDS.forEach(({ key }) => {
        if (nonCubeChecked[key]) rewards.push({ reward_key: key, quantity: null, collected: true });
      });
      await mfService.collectRewards(expedition.id, rewards);
      setShowRewardPicker(false);
      setCubeQtys({});
      setNonCubeChecked({});
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const rank = expedition?.rank ?? selectedRank;
  const rankColor = RANK_COLORS[rank];

  return (
    <div className="mf-expedition-card">
      {/* Title */}
      <div className="mf-expedition-title">{EXPEDITION_LABELS[index]}</div>

      {/* Status badge */}
      <div>
        <span className={`mf-status-badge ${liveStatus}`}>
          {liveStatus === 'available' && '● Available'}
          {liveStatus === 'exploring' && '◎ Exploring'}
          {liveStatus === 'resting' && '◑ Resting'}
        </span>
      </div>

      {/* Rank badge (when active) or rank selector (when available) */}
      {liveStatus === 'available' ? (
        <select
          className="mf-rank-select"
          value={selectedRank}
          onChange={e => setSelectedRank(e.target.value as MFExpeditionRank)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-sm, 4px)',
            color: 'var(--color-text-primary, #f8fafc)',
            padding: '0.3rem 0.5rem',
            fontSize: '0.85rem',
          }}
        >
          {RANKS.map(r => (
            <option key={r} value={r} style={{ background: '#1a1a2e' }}>
              Rank {r}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              padding: '0.15rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: rankColor + '22',
              color: rankColor,
              border: `1px solid ${rankColor}55`,
            }}
          >
            Rank {rank}
          </span>
        </div>
      )}

      {/* Timer */}
      {liveStatus !== 'available' && (
        <div className="mf-timer">
          {timerDone ? (
            <span style={{ color: '#48bb78' }}>Ready!</span>
          ) : (
            formatSeconds(secondsLeft)
          )}
        </div>
      )}

      {/* Action buttons */}
      {liveStatus === 'available' && (
        <Button
          className="mf-action-btn"
          size="sm"
          variant="primary"
          loading={actionLoading}
          onClick={handleStartExpedition}
        >
          Start Expedition
        </Button>
      )}

      {liveStatus === 'exploring' && timerDone && !showRewardPicker && (
        <Button
          className="mf-action-btn"
          size="sm"
          variant="secondary"
          loading={actionLoading}
          onClick={() => setShowRewardPicker(true)}
        >
          Collect Rewards
        </Button>
      )}

      {liveStatus === 'resting' && timerDone && (
        <Button
          className="mf-action-btn"
          size="sm"
          variant="ghost"
          loading={actionLoading}
          onClick={handleCompleteRest}
        >
          Complete Rest
        </Button>
      )}

      {/* Reward picker — shown inline when collecting */}
      {showRewardPicker && (
        <div className="mf-reward-picker">
          <div className="mf-reward-picker-title">Select Rewards</div>
          <div className="mf-reward-list">
            {/* Cube rewards: number inputs */}
            {CUBE_REWARD_KEYS.map(key => (
              <div key={key} className="mf-reward-row">
                {cubeImages[key] ? (
                  <img
                    src={cubeImages[key]}
                    alt={key}
                    className="mf-reward-img"
                  />
                ) : (
                  <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                )}
                <span style={{ flex: 1 }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="mf-reward-qty-input"
                  value={cubeQtys[key] ?? 0}
                  onChange={e =>
                    setCubeQtys(prev => ({
                      ...prev,
                      [key]: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
            ))}
            {/* Non-cube rewards: checkboxes */}
            {NON_CUBE_REWARDS.map(({ key, label }) => (
              <div key={key} className="mf-reward-row">
                <input
                  type="checkbox"
                  id={`mf-reward-${key}-${index}`}
                  checked={!!nonCubeChecked[key]}
                  onChange={e =>
                    setNonCubeChecked(prev => ({ ...prev, [key]: e.target.checked }))
                  }
                  style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
                />
                <label
                  htmlFor={`mf-reward-${key}-${index}`}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRewardPicker(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={actionLoading}
              onClick={handleConfirmRewards}
              className="mf-picker-confirm"
              style={{ flex: 2 }}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// History section
// ---------------------------------------------------------------------------

interface HistorySectionProps {
  history: MFHistoryEntry[];
  cubeImages: Record<string, string>;
}

const HistorySection: React.FC<HistorySectionProps> = ({ history, cubeImages }) => {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="mf-history-section">
      <div
        className="mf-history-title"
        onClick={() => setExpanded(prev => !prev)}
        role="button"
        aria-expanded={expanded}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Reward History ({history.length})
      </div>

      {expanded && (
        <div className="mf-history-list">
          {history.map(entry => {
            const rankColor = RANK_COLORS[entry.rank];
            return (
              <div key={entry.id} className="mf-history-entry">
                <span
                  className="mf-history-rank-badge"
                  style={{
                    background: rankColor + '22',
                    color: rankColor,
                    border: `1px solid ${rankColor}44`,
                  }}
                >
                  Rank {entry.rank}
                </span>

                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  #{entry.expedition_index + 1}
                </span>

                <div className="mf-history-rewards">
                  {entry.rewards.map((r, ri) => (
                    <React.Fragment key={ri}>
                      {r.quantity != null && cubeImages[r.reward_key] ? (
                        <>
                          <img
                            src={cubeImages[r.reward_key]}
                            alt={r.reward_key}
                            className="mf-history-reward-icon"
                            title={r.reward_key.replace(/_/g, ' ')}
                          />
                          <span style={{ fontSize: '0.72rem', marginRight: '0.2rem' }}>x{r.quantity}</span>
                        </>
                      ) : r.collected ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: 4,
                          }}
                        >
                          {r.reward_key.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>

                <span className="mf-history-date">{formatDate(entry.completed_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

interface Props {
  character: CharacterWithAccount | null;
  onClose: () => void;
}

export const MysticFrontierModal: React.FC<Props> = ({ character, onClose }) => {
  const [expeditions, setExpeditions] = useState<MysticFrontierExpedition[]>([]);
  const [history, setHistory] = useState<MFHistoryEntry[]>([]);
  const [cubeImages, setCubeImages] = useState<Record<string, string>>({});
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Fetch data whenever the character changes
  const fetchData = useCallback(async () => {
    if (!character) return;
    try {
      const [exps, hist] = await Promise.all([
        mfService.getExpeditions(character.id),
        mfService.getHistory(character.id),
      ]);
      setExpeditions(exps);
      setHistory(hist);
    } catch {
      // silently ignore — service file exists after merge
    }
  }, [character]);

  useEffect(() => {
    if (!character) return;
    fetchData();

    // Fetch cube image URLs once
    resourcesService.getResourceMetadata().then(meta => {
      const imgs: Record<string, string> = {};
      CUBE_REWARD_KEYS.forEach(key => {
        if (meta[key]?.image) imgs[key] = meta[key].image;
      });
      setCubeImages(imgs);
    }).catch(() => {/* ignore */});
  }, [character, fetchData]);

  const handleUnlockToggle = async () => {
    if (!character) return;
    setUnlockLoading(true);
    try {
      await mfService.setUnlocked(character.id, !character.is_mystic_frontier_unlocked);
    } finally {
      setUnlockLoading(false);
    }
  };

  // Build a lookup from expedition_index → expedition row
  const expByIndex = (idx: 0 | 1 | 2): MysticFrontierExpedition | null =>
    expeditions.find(e => e.expedition_index === idx) ?? null;

  const isUnlocked = !!(character as (CharacterWithAccount & { is_mystic_frontier_unlocked?: boolean }) | null)
    ?.is_mystic_frontier_unlocked;

  return (
    <Modal isOpen={!!character} onClose={onClose} title="Mystic Frontier" size="lg">
      <div className="mf-header">
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {character?.name}
        </span>
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
          <p>Mystic Frontier is not unlocked for this character.</p>
          <Button
            size="sm"
            variant="secondary"
            loading={unlockLoading}
            onClick={handleUnlockToggle}
          >
            Mark as Unlocked
          </Button>
        </div>
      ) : (
        <>
          <div className="mf-expedition-grid">
            {([0, 1, 2] as const).map(i => (
              <ExpeditionCard
                key={i}
                index={i}
                expedition={expByIndex(i)}
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
