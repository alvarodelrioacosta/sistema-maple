import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/UI';
import type {
  MysticFrontierExpedition,
  MysticFrontierSiteRank,
  MysticFrontierRewardItem,
  MysticFrontierRewardType,
} from '../../types';
import {
  startExpedition,
  collectRewards,
  completeRest,
  computeLiveStatus,
  getTimeRemainingMs,
  formatDuration,
  REWARD_METADATA,
  CUBE_REWARDS,
  POUCH_REWARDS,
  SITE_RANKS,
  RANK_COLORS,
  shiftStartTime,
} from '../../services/mysticFrontierService';

const ALL_REWARD_TYPES = Object.keys(REWARD_METADATA) as MysticFrontierRewardType[];

export interface ExpeditionCardProps {
  expeditionNumber: 1 | 2 | 3;
  expedition: MysticFrontierExpedition | null;
  characterId: string;
  accountId: string;
  cubeImages: Record<MysticFrontierRewardType, string>;
  onRefresh: () => void;
}

export const ExpeditionCard: React.FC<ExpeditionCardProps> = ({
  expeditionNumber,
  expedition,
  characterId,
  accountId,
  cubeImages,
  onRefresh,
}) => {
  const [selectedRank, setSelectedRank] = useState<MysticFrontierSiteRank>('Common');
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<'available' | 'exploring' | 'resting'>('available');
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [prePickerOpen, setPrePickerOpen] = useState(false);
  const [cubeQtys, setCubeQtys] = useState<Partial<Record<MysticFrontierRewardType, number>>>({});
  const [nonCubeChecked, setNonCubeChecked] = useState<Partial<Record<MysticFrontierRewardType, boolean>>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `mf_rewards_${characterId}_${expeditionNumber}`;

  // Restore pre-selected rewards from localStorage (survives page refresh)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { cq, nc } = JSON.parse(saved) as {
          cq?: Partial<Record<MysticFrontierRewardType, number>>;
          nc?: Partial<Record<MysticFrontierRewardType, boolean>>;
        };
        if (cq) setCubeQtys(cq);
        if (nc) setNonCubeChecked(nc);
      }
    } catch { /* ignore corrupt storage */ }
  }, [storageKey]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!expedition) { setLiveStatus('available'); setMsLeft(null); return; }
    const tick = () => {
      setLiveStatus(computeLiveStatus(expedition));
      setMsLeft(getTimeRemainingMs(expedition));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expedition]);

  const timerDone = msLeft !== null && msLeft <= 0;
  const activeRank = expedition?.site_rank ?? selectedRank;
  const rankColor = RANK_COLORS[activeRank];

  // Start mode: no expedition running yet (or after completeRest returns status=available)
  const isPreStartMode = liveStatus === 'available' && expedition?.status !== 'resting';
  // Rest-done mode: rest period elapsed, waiting for user to confirm
  const isRestDoneMode = liveStatus === 'available' && expedition?.status === 'resting';

  const handleStart = async () => {
    // Persist pre-selected rewards so they survive page refresh
    localStorage.setItem(storageKey, JSON.stringify({ cq: cubeQtys, nc: nonCubeChecked }));
    setActionLoading(true);
    try { await startExpedition(characterId, expeditionNumber, selectedRank); onRefresh(); }
    finally { setActionLoading(false); }
  };

  const handleCollectRewards = async () => {
    if (!expedition) return;
    setActionLoading(true);
    try {
      const rewards: MysticFrontierRewardItem[] = [];
      for (const type of ALL_REWARD_TYPES) {
        if (CUBE_REWARDS.has(type) || POUCH_REWARDS.has(type)) {
          const qty = cubeQtys[type] ?? 0;
          if (qty > 0) rewards.push({ type, quantity: qty });
        } else {
          if (nonCubeChecked[type]) rewards.push({ type, quantity: 1 });
        }
      }
      await collectRewards(characterId, expeditionNumber, rewards, expedition.site_rank, accountId, expedition.exploration_started_at ?? new Date().toISOString());
      localStorage.removeItem(storageKey);
      setCubeQtys({});
      setNonCubeChecked({});
    } catch (err) {
      console.error('collectRewards error:', err);
    } finally {
      setActionLoading(false);
      setShowRewardPicker(false);
      onRefresh();
    }
  };

  const handleCompleteRest = async () => {
    setActionLoading(true);
    try {
      await completeRest(characterId, expeditionNumber);
      onRefresh();
    } catch (err) {
      console.error('completeRest error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReduceTime = async () => {
    if (!expedition) return;
    const isExploring = expedition.status === 'exploring';
    const field = isExploring ? 'exploration_started_at' as const : 'rest_started_at' as const;
    const currentIso = isExploring ? expedition.exploration_started_at : expedition.rest_started_at;
    if (!currentIso) return;
    setActionLoading(true);
    try {
      await shiftStartTime(characterId, expeditionNumber, field, currentIso, 30 * 60 * 1000);
      onRefresh();
    } finally { setActionLoading(false); }
  };

  const rankBadgeStyle: React.CSSProperties = {
    padding: '0.15rem 0.6rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    background: rankColor + '22',
    color: rankColor,
    border: `1px solid ${rankColor}55`,
    display: 'inline-block',
    alignSelf: 'flex-start',
  };

  const renderRewardPicker = (isCollection: boolean) => {
    const visibleTypes = ALL_REWARD_TYPES.filter(type => {
      if (!isCollection && CUBE_REWARDS.has(type)) return false;
      if (isCollection && POUCH_REWARDS.has(type)) return false;
      return true;
    });
    return (
    <div className="mf-reward-picker">
      <div className="mf-reward-list">
        {visibleTypes.map(type => {
          const meta = REWARD_METADATA[type];
          const isCube = CUBE_REWARDS.has(type);
          const isPouch = POUCH_REWARDS.has(type);
          const isNumeric = isCube || isPouch;
          const imgSrc = isCube ? cubeImages[type] : meta.image_url;
          return (
            <div key={type} className="mf-reward-row">
              {imgSrc
                ? <img
                    src={imgSrc} alt={meta.label}
                    title={isPouch ? `${meta.label} — click to add 1` : meta.label}
                    className="mf-reward-img"
                    onClick={isPouch ? () => setCubeQtys(prev => ({
                      ...prev,
                      [type]: Math.min(10, (prev[type] ?? 0) + 1),
                    })) : undefined}
                    style={isPouch ? { cursor: 'pointer' } : undefined}
                  />
                : <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 4, flexShrink: 0 }} />
              }
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                {isNumeric ? (
                  <input
                    type="number" min={0} max={10}
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
                    id={`mf-chk-${expeditionNumber}-${characterId.slice(0, 6)}-${type}-${isCollection ? 'c' : 'p'}`}
                    checked={!!nonCubeChecked[type]}
                    onChange={e => setNonCubeChecked(prev => ({ ...prev, [type]: e.target.checked }))}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isCollection && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Button size="sm" variant="ghost" style={{ flex: 1 }} onClick={() => setShowRewardPicker(false)}>Cancel</Button>
          <Button size="sm" variant="primary" loading={actionLoading} style={{ flex: 2 }} onClick={handleCollectRewards}>Confirm</Button>
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="mf-expedition-card">
      {/* Title + status badge */}
      <div className="mf-expedition-header">
        <span className="mf-expedition-title">Exp. {expeditionNumber}</span>
        <span className={`mf-status-badge ${liveStatus}`}>
          {liveStatus === 'available' && '● Available'}
          {liveStatus === 'exploring' && '◎ Exploring'}
          {liveStatus === 'resting'   && '◑ Resting'}
        </span>
      </div>

      {/* ── Start mode ──────────────────────────────────────────────────── */}
      {isPreStartMode && (
        <>
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

          <button className="mf-prereward-toggle" onClick={() => setPrePickerOpen(p => !p)}>
            {prePickerOpen ? '▾' : '▸'} Rewards
          </button>
          {prePickerOpen && renderRewardPicker(false)}

          <Button className="mf-action-btn" size="sm" variant="primary" loading={actionLoading} onClick={handleStart}>
            Start
          </Button>
        </>
      )}

      {/* ── Active exploration or rest timer ────────────────────────────── */}
      {liveStatus !== 'available' && (
        <>
          <span style={rankBadgeStyle}>{activeRank}</span>
          {(() => {
            const selected = ALL_REWARD_TYPES.filter(type =>
              (CUBE_REWARDS.has(type) || POUCH_REWARDS.has(type)) ? (cubeQtys[type] ?? 0) > 0 : !!nonCubeChecked[type]
            );
            if (selected.length === 0) return null;
            return (
              <div className="mf-active-rewards">
                {selected.map(type => {
                  const meta = REWARD_METADATA[type];
                  const imgSrc = CUBE_REWARDS.has(type) ? cubeImages[type] : meta.image_url;
                  const qty = (CUBE_REWARDS.has(type) || POUCH_REWARDS.has(type)) ? (cubeQtys[type] ?? 0) : 1;
                  return (
                    <React.Fragment key={type}>
                      {imgSrc && <img src={imgSrc} alt={meta.label} title={meta.label} className="mf-reward-img" style={{ width: 22, height: 22 }} />}
                      {qty > 1 && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>×{qty}</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div className="mf-timer" style={{ flex: 1 }}>
              {timerDone
                ? <span style={{ color: '#48bb78' }}>Ready!</span>
                : msLeft !== null ? formatDuration(msLeft) : '--:--:--'
              }
            </div>
            {!timerDone && (
              <button
                className="mf-reduce-btn"
                onClick={handleReduceTime}
                disabled={actionLoading}
                title="Reduce time by 30 minutes"
              >
                -30m
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Collect Rewards (exploration done, rewards not yet logged) ───── */}
      {liveStatus === 'resting' && expedition?.status === 'exploring' && !showRewardPicker && (
        <Button className="mf-action-btn" size="sm" variant="secondary" onClick={() => setShowRewardPicker(true)}>
          Collect Rewards
        </Button>
      )}
      {showRewardPicker && renderRewardPicker(true)}

      {/* ── Rest done: confirm completion ───────────────────────────────── */}
      {isRestDoneMode && (
        <>
          <span style={rankBadgeStyle}>{activeRank}</span>
          <div className="mf-timer"><span style={{ color: '#48bb78' }}>Ready!</span></div>
          <Button className="mf-action-btn" size="sm" variant="ghost" loading={actionLoading} onClick={handleCompleteRest}>
            Complete Rest
          </Button>
        </>
      )}
    </div>
  );
};
