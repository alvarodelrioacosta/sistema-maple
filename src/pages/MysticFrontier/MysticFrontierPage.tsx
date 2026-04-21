import React, { useCallback, useEffect, useState } from 'react';
import { charactersService } from '../../services/characters';
import { resourcesService } from '../../services/resources';
import {
  getExpeditions,
  getRewardHistory,
  setUnlocked,
  REWARD_METADATA,
  CUBE_REWARDS,
  CUBE_RESOURCE_KEYS,
  RANK_COLORS,
} from '../../services/mysticFrontierService';
import type {
  CharacterWithAccount,
  MysticFrontierExpedition,
  MysticFrontierRewardEntry,
  MysticFrontierRewardType,
} from '../../types';
import { Button } from '../../components/UI';
import { ExpeditionCard } from './ExpeditionCard';
import './MysticFrontierPage.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export interface CharacterRowProps {
  character: CharacterWithAccount;
  expeditions: MysticFrontierExpedition[];
  history: MysticFrontierRewardEntry[];
  cubeImages: Record<MysticFrontierRewardType, string>;
  onRefresh: (characterId: string) => void;
  onUnlockToggle: (characterId: string, current: boolean) => void;
  unlockLoading: boolean;
}

export const CharacterRow: React.FC<CharacterRowProps> = ({
  character,
  expeditions,
  history,
  cubeImages,
  onRefresh,
  onUnlockToggle,
  unlockLoading,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const isUnlocked = !!character.unlock_mf_8_fams;

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
            <span className="mfp-row__lock-icon">🔒</span>
            <p>Complete <strong>Mystic Frontier pt.2 — 9 Useful Fams</strong> to unlock this feature.</p>
            <Button
              size="sm"
              variant="secondary"
              loading={unlockLoading}
              onClick={() => onUnlockToggle(character.id, false)}
            >
              Mark as Unlocked
            </Button>
          </div>
        ) : (
          <>
            <div className="mfp-row__expeditions">
              {([1, 2, 3] as const).map(n => (
                <ExpeditionCard
                  key={n}
                  expeditionNumber={n}
                  expedition={expByNumber(n)}
                  characterId={character.id}
                  cubeImages={cubeImages}
                  onRefresh={() => onRefresh(character.id)}
                />
              ))}
            </div>

            <button
              className={`mfp-row__history-toggle ${historyOpen ? 'open' : ''}`}
              onClick={() => setHistoryOpen(p => !p)}
            >
              {historyOpen ? '▾' : '▸'} REWARD HISTORY
              {history.length > 0 && <span className="mfp-row__history-count">{history.length}</span>}
            </button>

            {historyOpen && (
              <div className="mfp-row__history">
                {history.length === 0 ? (
                  <p className="mfp-row__history-empty">No rewards collected yet.</p>
                ) : (
                  history.map(entry => {
                    const rankColor = RANK_COLORS[entry.site_rank];
                    return (
                      <div key={entry.id} className="mfp-history-entry">
                        <span
                          className="mfp-history-rank"
                          style={{ background: rankColor + '22', color: rankColor, border: `1px solid ${rankColor}44` }}
                        >
                          {entry.site_rank}
                        </span>
                        <span className="mfp-history-exp">#{entry.expedition_index}</span>
                        <div className="mfp-history-rewards">
                          {entry.rewards.map((r, i) => {
                            const meta = REWARD_METADATA[r.type];
                            const imgSrc = CUBE_REWARDS.has(r.type) ? cubeImages[r.type] : meta?.image_url;
                            return (
                              <React.Fragment key={i}>
                                {imgSrc && <img src={imgSrc} alt={meta?.label ?? r.type} className="mfp-history-icon" title={meta?.label} />}
                                {r.quantity > 1 && <span className="mfp-history-qty">×{r.quantity}</span>}
                              </React.Fragment>
                            );
                          })}
                        </div>
                        <span className="mfp-history-date">{formatDate(entry.collected_at)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

export const MysticFrontierPage: React.FC = () => {
  const [characters, setCharacters] = useState<CharacterWithAccount[]>([]);
  const [expeditions, setExpeditions] = useState<Record<string, MysticFrontierExpedition[]>>({});
  const [history, setHistory] = useState<Record<string, MysticFrontierRewardEntry[]>>({});
  const [cubeImages, setCubeImages] = useState<Record<MysticFrontierRewardType, string>>(
    {} as Record<MysticFrontierRewardType, string>,
  );
  const [loading, setLoading] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState<Record<string, boolean>>({});

  const fetchCharacterData = useCallback(async (characterId: string) => {
    const [exps, hist] = await Promise.all([
      getExpeditions(characterId),
      getRewardHistory(characterId),
    ]);
    setExpeditions(prev => ({ ...prev, [characterId]: exps }));
    setHistory(prev => ({ ...prev, [characterId]: hist }));
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const all = await charactersService.getAll();
        const mains = all.filter(c => c.main === 'Main');
        // Sort by account number
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

  const handleUnlockToggle = async (characterId: string, currentlyUnlocked: boolean) => {
    setUnlockLoading(prev => ({ ...prev, [characterId]: true }));
    try {
      await setUnlocked(characterId, !currentlyUnlocked);
      // Update local character state
      setCharacters(prev => prev.map(c =>
        c.id === characterId ? { ...c, is_mystic_frontier_unlocked: !currentlyUnlocked } : c,
      ));
    } finally {
      setUnlockLoading(prev => ({ ...prev, [characterId]: false }));
    }
  };

  return (
    <div className="mfp-page">
      <div className="mfp-header">
        <h1 className="mfp-title">◈ Mystic Frontier</h1>
        <p className="mfp-subtitle">Track expedition timers and rewards across all accounts</p>
      </div>

      {loading ? (
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
              history={history[char.id] ?? []}
              cubeImages={cubeImages}
              onRefresh={fetchCharacterData}
              onUnlockToggle={handleUnlockToggle}
              unlockLoading={!!unlockLoading[char.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MysticFrontierPage;
