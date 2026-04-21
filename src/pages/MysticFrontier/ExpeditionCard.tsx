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
  SITE_RANKS,
  RANK_COLORS,
} from '../../services/mysticFrontierService';

const ALL_REWARD_TYPES = Object.keys(REWARD_METADATA) as MysticFrontierRewardType[];

export interface ExpeditionCardProps {
  expeditionNumber: 1 | 2 | 3;
  expedition: MysticFrontierExpedition | null;
  characterId: string;
  cubeImages: Record<MysticFrontierRewardType, string>;
  onRefresh: () => void;
}

export const ExpeditionCard: React.FC<ExpeditionCardProps> = ({
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

  const handleStart = async () => {
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
    } finally { setActionLoading(false); }
  };

  const handleCompleteRest = async () => {
    setActionLoading(true);
    try { await completeRest(characterId, expeditionNumber); onRefresh(); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="mf-expedition-card">
      <div className="mf-expedition-title">Expedition {['I', 'II', 'III'][expeditionNumber - 1]}</div>

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
        <span style={{
          padding: '0.15rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: rankColor + '22',
          color: rankColor,
          border: `1px solid ${rankColor}55`,
          display: 'inline-block',
        }}>
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
                  {imgSrc
                    ? <img src={imgSrc} alt={meta.label} className="mf-reward-img" />
                    : <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 4, flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  {isCube ? (
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
                      id={`mf-chk-${expeditionNumber}-${characterId.slice(0, 6)}-${type}`}
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
