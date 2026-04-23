import React, { useEffect, useState } from 'react';
import { charactersService } from '../../services/characters';
import { resourcesService } from '../../services/resources';
import {
  getAllRewardHistory,
  getAllExpeditionLog,
  REWARD_METADATA,
  CUBE_REWARDS,
  POUCH_REWARDS,
  CUBE_RESOURCE_KEYS,
  RANK_COLORS,
  SITE_RANKS,
} from '../../services/mysticFrontierService';
import type {
  CharacterWithAccount,
  MysticFrontierRewardEntry,
  MysticFrontierExpeditionLog,
  MysticFrontierRewardType,
  MysticFrontierSiteRank,
} from '../../types';
import './ExpeditionHistory.css';

const ALL_REWARD_TYPES = Object.keys(REWARD_METADATA) as MysticFrontierRewardType[];
const EXPIRY_MS = 21 * 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

interface RewardStat {
  type: MysticFrontierRewardType;
  rate: number;
  avgQty: number | null;
}

interface ExpeditionHistoryProps {
  embedded?: boolean;
}

export const ExpeditionHistory: React.FC<ExpeditionHistoryProps> = ({ embedded }) => {
  const [entries, setEntries] = useState<MysticFrontierRewardEntry[]>([]);
  const [log, setLog] = useState<MysticFrontierExpeditionLog[]>([]);
  const [charMap, setCharMap] = useState<Record<string, CharacterWithAccount>>({});
  const [cubeImages, setCubeImages] = useState<Record<MysticFrontierRewardType, string>>(
    {} as Record<MysticFrontierRewardType, string>,
  );
  const [loading, setLoading] = useState(true);
  const [filterRank, setFilterRank] = useState<MysticFrontierSiteRank | 'All'>('All');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [all, history, expeditionLog, meta] = await Promise.all([
          charactersService.getAll(),
          getAllRewardHistory(),
          getAllExpeditionLog(),
          resourcesService.getResourceMetadata(),
        ]);
        const map: Record<string, CharacterWithAccount> = {};
        for (const c of all) map[c.id] = c;
        setCharMap(map);
        setEntries(history);
        setLog(expeditionLog);
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
  }, []);

  // Log is the source of truth for totals (includes expeditions with no rewards)
  const filteredLog = filterRank === 'All' ? log : log.filter(e => e.site_rank === filterRank);
  // History entries filtered for the list (only non-empty reward entries)
  const filtered = filterRank === 'All' ? entries : entries.filter(e => e.site_rank === filterRank);

  // KPI: by-rank counts from the log (all expeditions)
  const byRank = SITE_RANKS.reduce((acc, r) => {
    acc[r] = log.filter(e => e.site_rank === r).length;
    return acc;
  }, {} as Record<MysticFrontierSiteRank, number>);

  // KPI: pouch totals from the log (filtered by selected rank)
  const pouchTotals = {
    purple_pouch: filteredLog.reduce((s, e) => s + e.purple_pouch, 0),
    orange_pouch: filteredLog.reduce((s, e) => s + e.orange_pouch, 0),
    green_pouch:  filteredLog.reduce((s, e) => s + e.green_pouch, 0),
  };
  const pouchAppearance = {
    purple_pouch: filteredLog.filter(e => e.purple_pouch > 0).length,
    orange_pouch: filteredLog.filter(e => e.orange_pouch > 0).length,
    green_pouch:  filteredLog.filter(e => e.green_pouch > 0).length,
  };

  // KPI: reward frequency stats for non-pouch types (from reward_history, filtered)
  const nonPouchStats: RewardStat[] = ALL_REWARD_TYPES
    .filter(type => !POUCH_REWARDS.has(type))
    .map(type => {
      const withReward = filtered.filter(e => e.rewards.some(r => r.type === type && r.quantity > 0));
      const totalQty = filtered.reduce((s, e) => {
        const r = e.rewards.find(r => r.type === type);
        return s + (r?.quantity ?? 0);
      }, 0);
      const isNumeric = CUBE_REWARDS.has(type);
      return {
        type,
        rate: filteredLog.length > 0 ? withReward.length / filteredLog.length : 0,
        avgQty: isNumeric && withReward.length > 0 ? totalQty / withReward.length : null,
      };
    }).filter(s => s.rate > 0);

  // Pouch stats from log for the frequency table
  const pouchStats: RewardStat[] = (['purple_pouch', 'orange_pouch', 'green_pouch'] as const)
    .map(type => ({
      type,
      rate: filteredLog.length > 0 ? pouchAppearance[type] / filteredLog.length : 0,
      avgQty: pouchAppearance[type] > 0 ? pouchTotals[type] / pouchAppearance[type] : null,
    }))
    .filter(s => s.rate > 0);

  const rewardStats: RewardStat[] = [...pouchStats, ...nonPouchStats];

  const total = log.length;

  return (
    <div className={embedded ? 'exp-history-embedded' : 'exp-history-page'}>
      {!embedded && (
        <div className="exp-history-header">
          <h1 className="exp-history-title">◈ Expedition History</h1>
          <p className="exp-history-subtitle">All collected rewards across all characters</p>
        </div>
      )}

      {loading ? (
        <div className="exp-history-loading">Loading…</div>
      ) : (
        <>
          {/* ── KPI Section ─────────────────────────────────────────────── */}
          <div className="exp-kpi-section">
            {/* Rank filter + totals */}
            <div className="exp-kpi-rank-row">
              <button
                className={`exp-kpi-rank-btn${filterRank === 'All' ? ' active' : ''}`}
                onClick={() => setFilterRank('All')}
              >
                All · {total}
              </button>
              {SITE_RANKS.map(r => (
                <button
                  key={r}
                  className={`exp-kpi-rank-btn${filterRank === r ? ' active' : ''}`}
                  style={filterRank === r ? { borderColor: RANK_COLORS[r], color: RANK_COLORS[r], background: RANK_COLORS[r] + '18' } : { '--rank-color': RANK_COLORS[r] } as React.CSSProperties}
                  onClick={() => setFilterRank(r)}
                >
                  {r} · {byRank[r]}
                  {total > 0 && <span className="exp-kpi-rank-pct"> ({Math.round(byRank[r] / total * 100)}%)</span>}
                </button>
              ))}
            </div>

            {/* Reward frequency table */}
            {rewardStats.length > 0 && (
              <div className="exp-kpi-freq">
                <div className="exp-kpi-freq-title">
                  Reward Frequency — {filteredLog.length} expedition{filteredLog.length !== 1 ? 's' : ''}
                  {filterRank !== 'All' && <span style={{ color: RANK_COLORS[filterRank] }}> ({filterRank})</span>}
                </div>
                <div className="exp-kpi-freq-table">
                  <div className="exp-kpi-freq-header">
                    <span>Reward</span>
                    <span>Rate</span>
                    <span>Avg / run</span>
                  </div>
                  {rewardStats.map(stat => {
                    const meta = REWARD_METADATA[stat.type];
                    const imgSrc = CUBE_REWARDS.has(stat.type) ? cubeImages[stat.type] : meta.image_url;
                    return (
                      <div key={stat.type} className="exp-kpi-freq-row">
                        <div className="exp-kpi-freq-label">
                          {imgSrc && <img src={imgSrc} alt={meta.label} className="exp-kpi-freq-icon" />}
                          <span>{meta.label}</span>
                        </div>
                        <span className="exp-kpi-freq-rate">{Math.round(stat.rate * 100)}%</span>
                        <span className="exp-kpi-freq-avg">
                          {stat.avgQty !== null ? stat.avgQty.toFixed(1) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Entry list ──────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="exp-history-empty">No reward entries found.</div>
          ) : (
            <div className="exp-history-list">
              {filtered.map(entry => {
                const char = charMap[entry.character_id];
                const rankColor = RANK_COLORS[entry.site_rank];
                const expiresAt = new Date(entry.collected_at).getTime() + EXPIRY_MS;
                const isExpired = Date.now() > expiresAt;
                return (
                  <div key={entry.id} className="exp-history-row">
                    <div className="exp-history-char">
                      <div className="exp-history-char-top">
                        <span className="exp-history-account">N°{char?.account?.number ?? '?'}</span>
                        {char?.account?.tag && (
                          <span className="exp-history-tag">{char.account.tag}</span>
                        )}
                      </div>
                      <span className="exp-history-charname">{char?.name ?? entry.character_id}</span>
                    </div>

                    <div className="exp-history-meta">
                      <span className="exp-history-expnum">#{entry.expedition_index}</span>
                      <span
                        className="exp-history-rank"
                        style={{ background: rankColor + '22', color: rankColor, border: `1px solid ${rankColor}44` }}
                      >
                        {entry.site_rank}
                      </span>
                    </div>

                    <div className="exp-history-rewards">
                      {entry.rewards.map((r, i) => {
                        const meta = REWARD_METADATA[r.type];
                        const imgSrc = CUBE_REWARDS.has(r.type) ? cubeImages[r.type] : meta?.image_url;
                        return (
                          <React.Fragment key={i}>
                            {imgSrc && (
                              <img src={imgSrc} alt={meta?.label ?? r.type} title={meta?.label ?? r.type} className="exp-history-reward-icon" />
                            )}
                            {r.quantity > 1 && (
                              <span className="exp-history-qty">×{r.quantity}</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div className="exp-history-dates">
                      <span className="exp-history-collected">{formatDate(entry.collected_at)}</span>
                      {isExpired ? (
                        <span className="exp-history-expired-badge">EXPIRED</span>
                      ) : (
                        <span className="exp-history-expires">Exp: {formatDate(new Date(expiresAt).toISOString())}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExpeditionHistory;
