import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { Button, AccountCell } from '../../components/UI';
import NewUnlockModal from './NewUnlockModal';
import EditUnlocksModal from './EditUnlocksModal';
import { accountsService, charactersService, contentUnlocksService } from '../../services';
import type { ContentUnlock, AccountUnlockProgress } from '../../services';
import type { Account, Character } from '../../types';
import './Tasks.css';

const BOSS_IMAGE_ALIAS: Record<string, string> = {
    'Slime': 'Guardian Angel Slime',
};
const BOSS_IMAGE_URL = (bossName: string) => {
    const imgName = BOSS_IMAGE_ALIAS[bossName] ?? bossName;
    return `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${imgName.replace(/ /g, '_')}.png`;
};

const simplifySystemName = (name: string) => {
    const idx = name.indexOf(' — ');
    return idx !== -1 ? name.slice(idx + 3) : name;
};

interface AccountWithChar extends Account {
    mainCharacter?: Character;
}

const Tasks: React.FC = () => {
    const [accounts, setAccounts] = useState<AccountWithChar[]>([]);
    const [loading, setLoading] = useState(true);
    const [unlocks, setUnlocks] = useState<ContentUnlock[]>([]);
    const [unlockProgress, setUnlockProgress] = useState<AccountUnlockProgress[]>([]);
    const [showNewUnlockModal, setShowNewUnlockModal] = useState(false);
    const [showEditUnlocksModal, setShowEditUnlocksModal] = useState(false);

    const unlockGroups = useMemo(() => {
        const groups: { key: string; label: string; category: string; items: ContentUnlock[] }[] = [];
        const seen = new Map<string, number>();
        unlocks.forEach(u => {
            const groupKey = u.category === 'boss' ? u.id : `sys_${u.unlocks}`;
            if (seen.has(groupKey)) {
                groups[seen.get(groupKey)!].items.push(u);
            } else {
                seen.set(groupKey, groups.length);
                groups.push({ key: groupKey, label: u.unlocks.toUpperCase(), category: u.category, items: [u] });
            }
        });
        return groups;
    }, [unlocks]);

    // For each system-category unlock, map its ID to its prerequisite unlock ID (null if first)
    const prereqMap = useMemo(() => {
        const map = new Map<string, string | null>();
        unlockGroups.forEach(group => {
            group.items.forEach((item, idx) => {
                if (group.category === 'system' && idx > 0) {
                    map.set(item.id, group.items[idx - 1].id);
                } else {
                    map.set(item.id, null);
                }
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
            const [accountsData, charactersData, unlocksData, unlockProgressData] = await Promise.all([
                accountsService.getAll(),
                charactersService.getAll(),
                contentUnlocksService.getAll(),
                contentUnlocksService.getAllProgress()
            ]);

            const accountsWithChars: AccountWithChar[] = accountsData.map(account => {
                const chars = charactersData.filter(c => c.account_id === account.id);
                const mainChar = chars.find(c => c.main === 'Main') || chars[0];
                return { ...account, mainCharacter: mainChar };
            });

            setAccounts(accountsWithChars);
            setUnlocks(unlocksData);
            setUnlockProgress(unlockProgressData);
        } catch (error) {
            console.error('Error loading tasks data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUnlockStatus = (unlockId: string, accountId: string): boolean => {
        return unlockProgress.find(p => p.unlock_id === unlockId && p.account_id === accountId)?.completed || false;
    };

    const handleToggleUnlock = async (unlockId: string, accountId: string, current: boolean) => {
        const next = !current;
        setUnlockProgress(prev => {
            const existing = prev.find(p => p.unlock_id === unlockId && p.account_id === accountId);
            if (existing) return prev.map(p => p.unlock_id === unlockId && p.account_id === accountId ? { ...p, completed: next } : p);
            return [...prev, { id: '', unlock_id: unlockId, account_id: accountId, completed: next, completed_at: null }];
        });
        await contentUnlocksService.toggleProgress(unlockId, accountId, next);
    };

    return (
        <>
            <Header title="Tasks" />
            <div className="tasks-page">
                <div className="tasks-header">
                    <div className="tasks-tabs">
                        <button className="task-tab active">
                            Content Unlocks ({unlocks.length})
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={() => setShowEditUnlocksModal(true)}>Edit Unlocks</Button>
                        <Button variant="primary" onClick={() => setShowNewUnlockModal(true)}>+ New Unlock</Button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Loading...</div>
                ) : unlocks.length === 0 ? (
                    <div className="no-tasks"><div className="no-tasks-icon">🔓</div><p>No content unlocks yet. Add one!</p></div>
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
                                        {unlocks.map(unlock => (
                                            <th key={unlock.id} className="task-header-col">
                                                <div className="task-header-content">
                                                    {unlock.category === 'boss' ? (
                                                        <img
                                                            src={BOSS_IMAGE_URL(unlock.unlocks)}
                                                            alt={unlock.unlocks}
                                                            style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6 }}
                                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span className="task-name">{simplifySystemName(unlock.name)}</span>
                                                    )}
                                                    <div className="task-header-progress">
                                                        {unlockProgress.filter(p => p.unlock_id === unlock.id && p.completed).length} / {accounts.length}
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(account => (
                                        <tr key={account.id}>
                                            <td className="account-cell-td">
                                                <AccountCell
                                                    number={account.number}
                                                    email={account.email}
                                                    tag={account.tag}
                                                    charName={account.mainCharacter?.name}
                                                />
                                            </td>
                                            {unlocks.map(unlock => {
                                                const done = getUnlockStatus(unlock.id, account.id);
                                                const prereqId = prereqMap.get(unlock.id) ?? null;
                                                const isLocked = prereqId !== null && !getUnlockStatus(prereqId, account.id);
                                                return (
                                                    <td key={unlock.id} className={`task-checkbox-cell${isLocked ? ' locked-cell' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            className={`task-checkbox${isLocked ? ' locked-prereq' : ''}`}
                                                            checked={done}
                                                            disabled={isLocked}
                                                            title={isLocked ? 'Complete the previous step first' : undefined}
                                                            onChange={() => !isLocked && handleToggleUnlock(unlock.id, account.id, done)}
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

            <NewUnlockModal
                isOpen={showNewUnlockModal}
                onClose={() => setShowNewUnlockModal(false)}
                onCreated={loadData}
            />

            <EditUnlocksModal
                isOpen={showEditUnlocksModal}
                onClose={() => setShowEditUnlocksModal(false)}
                unlocks={unlocks}
                onDeleted={id => { setUnlocks(prev => prev.filter(u => u.id !== id)); }}
            />
        </>
    );
};

export default Tasks;
