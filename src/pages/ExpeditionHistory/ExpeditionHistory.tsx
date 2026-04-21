import React, { useEffect, useState } from 'react';
import { charactersService } from '../../services/characters';
import { resourcesService } from '../../services/resources';
import {
  getAllRewardHistory,
  REWARD_METADATA,
  CUBE_REWARDS,
  CUBE_RESOURCE_KEYS,
  RANK_COLORS,
} from '../../services/mysticFrontierService';
import type { CharacterWithAccount, MysticFrontierRewardEntry, MysticFrontierRewardType } from '../../types';
import './ExpeditionHistory.css';

const EXPIRY_MS = 21 * 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export const ExpeditionHistory: React.FC = () => {
  const [entries, setEntries] = useState<MysticFrontierRewardEntry[]>([]);
  const [charMap, setCharMap] = useState<Record<string, CharacterWithAccount>>({});
  const [cubeImages, setCubeImages] = useState<Record<MysticFrontierRewardType, string>>(
    {} as Record<MysticFrontierRewardType, string>,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [all, history, meta] = await Promise.all([
          charactersService.getAll(),
          getAllRewardHistory(),
          resourcesService.getResourceMetadata(),
        ]);
        const map: Record<string, CharacterWithAccount> = {};
        for (const c of all) map[c.id] = c;
        setCharMap(map);
        setEntries(history.filter(e => e.rewards.length > 0));
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

  return (
    <div className="exp-history-page">
      <div className="exp-history-header">
        <h1 className="exp-history-title">◈ Expedition History</h1>
        <p className="exp-history-subtitle">All collected rewards across all characters</p>
      </div>

      {loading ? (
        <div className="exp-history-loading">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="exp-history-empty">No reward entries found.</div>
      ) : (
        <div className="exp-history-list">
          {entries.map(entry => {
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
    </div>
  );
};

export default ExpeditionHistory;
