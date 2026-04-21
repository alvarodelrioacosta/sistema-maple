import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { AccountCell } from '../../components/UI';
import { accountsService, charactersService } from '../../services';
import type { Account, Character } from '../../types';
import { UNLOCK_DEFINITIONS, SEQUENTIAL_UNLOCK_GROUPS, type UnlockDef } from '../../constants/unlocks';
import './Tasks.css';

const BOSS_IMAGE_URL = (bossImageName: string) =>
    `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${bossImageName.replace(/ /g, '_')}.png`;

interface TaskRow {
    account: Account;
    character: Character;
}

const Tasks: React.FC = () => {
    const [rows, setRows] = useState<TaskRow[]>([]);
    const [loading, setLoading] = useState(true);

    const unlockGroups = useMemo(() => {
        const groups: { key: string; label: string; category: 'boss' | 'system'; items: UnlockDef[] }[] = [];
        const seen = new Map<string, number>();
        UNLOCK_DEFINITIONS.forEach(def => {
            if (seen.has(def.group)) {
                groups[seen.get(def.group)!].items.push(def);
            } else {
                seen.set(def.group, groups.length);
                groups.push({ key: def.group, label: def.group, category: def.category, items: [def] });
            }
        });
        return groups;
    }, []);

    // For sequential groups, each item requires the previous to be completed first
    const prereqMap = useMemo(() => {
        const map = new Map<string, string | null>();
        unlockGroups.forEach(group => {
            const isSequential = SEQUENTIAL_UNLOCK_GROUPS.has(group.label);
            group.items.forEach((item, idx) => {
                map.set(item.key, isSequential && idx > 0 ? group.items[idx - 1].key : null);
            });
        });
        return map;
    }, [unlockGroups]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accountsData, charactersData] = await Promise.all([
                accountsService.getAll(),
                charactersService.getMainCharacters()
            ]);

            const taskRows: TaskRow[] = [];
            accountsData.forEach(account => {
                if (account.number === 0) return;
                const mainChar = charactersData.find(c => c.account_id === account.id);
                if (mainChar) taskRows.push({ account, character: mainChar });
            });

            setRows(taskRows);
        } catch (error) {
            console.error('Error loading tasks data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUnlockStatus = (def: UnlockDef, row: TaskRow): boolean => {
        if (def.level === 'account') return !!(row.account as any)[def.key];
        return !!(row.character as any)[def.key];
    };

    const handleToggleUnlock = async (def: UnlockDef, row: TaskRow, current: boolean) => {
        const next = !current;

        // Optimistic update
        setRows(prev => prev.map(r => {
            if (r.character.id !== row.character.id) return r;
            if (def.level === 'account') {
                return { ...r, account: { ...r.account, [def.key]: next } };
            }
            return { ...r, character: { ...r.character, [def.key]: next } };
        }));

        try {
            if (def.level === 'account') {
                await accountsService.setLegionArtifact(row.account.id, next);
            } else {
                await charactersService.setUnlock(row.character.id, def.key, next);
            }
        } catch (error) {
            console.error('Error toggling unlock:', error);
            // Rollback on error
            setRows(prev => prev.map(r => {
                if (r.character.id !== row.character.id) return r;
                if (def.level === 'account') {
                    return { ...r, account: { ...r.account, [def.key]: current } };
                }
                return { ...r, character: { ...r.character, [def.key]: current } };
            }));
        }
    };

    return (
        <>
            <Header title="Tasks" />
            <div className="tasks-page">
                <div className="tasks-header">
                    <div className="tasks-tabs">
                        <button className="task-tab active">
                            Content Unlocks ({UNLOCK_DEFINITIONS.length})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Loading...</div>
                ) : (
                    <div className="tasks-table-container">
                        <div className="table-scroll-container">
                            <table className="tasks-table">
                                <thead>
                                    <tr>
                                        <th rowSpan={2}>Account</th>
                                        {unlockGroups.map(group => (
                                            <th
                                                key={group.key}
                                                colSpan={group.items.length}
                                                className="unlock-group-header"
                                                style={{ color: group.category === 'boss' ? '#f87171' : '#fbbf24' }}
                                            >
                                                {group.label}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {UNLOCK_DEFINITIONS.map(def => (
                                            <th key={def.key} className="task-header-col">
                                                <div className="task-header-content">
                                                    {def.category === 'boss' ? (
                                                        <img
                                                            src={BOSS_IMAGE_URL(def.bossImageName!)}
                                                            alt={def.label}
                                                            style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6 }}
                                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span className="task-name">{def.label}</span>
                                                    )}
                                                    <div className="task-header-progress">
                                                        {rows.filter(r => getUnlockStatus(def, r)).length} / {rows.length}
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.character.id}>
                                            <td className="account-cell-td">
                                                <AccountCell
                                                    number={row.account.number}
                                                    email={row.account.email}
                                                    tag={row.account.tag}
                                                    charName={row.character.name}
                                                />
                                            </td>
                                            {UNLOCK_DEFINITIONS.map(def => {
                                                const done = getUnlockStatus(def, row);
                                                const prereqKey = prereqMap.get(def.key) ?? null;
                                                const isLocked = prereqKey !== null && !getUnlockStatus(
                                                    UNLOCK_DEFINITIONS.find(d => d.key === prereqKey)!,
                                                    row
                                                );
                                                return (
                                                    <td key={def.key} className={`task-checkbox-cell${isLocked ? ' locked-cell' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            className={`task-checkbox${isLocked ? ' locked-prereq' : ''}`}
                                                            checked={done}
                                                            disabled={isLocked}
                                                            title={isLocked ? 'Complete the previous step first' : undefined}
                                                            onChange={() => !isLocked && handleToggleUnlock(def, row, done)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Tasks;
