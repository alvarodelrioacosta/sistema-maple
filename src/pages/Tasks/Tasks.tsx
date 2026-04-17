import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { Button } from '../../components/UI';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import NewUnlockModal from './NewUnlockModal';
import EditUnlocksModal from './EditUnlocksModal';
import { tasksService, accountsService, charactersService, contentUnlocksService } from '../../services';
import type { ContentUnlock, AccountUnlockProgress } from '../../services';
import type { Task, TaskProgress, Account, Character } from '../../types';
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
    // State
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'unlocks'>('active');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allProgress, setAllProgress] = useState<TaskProgress[]>([]);
    const [accounts, setAccounts] = useState<AccountWithChar[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

    // Initial load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksData, accountsData, charactersData, unlocksData, unlockProgressData] = await Promise.all([
                tasksService.getAll(),
                accountsService.getAll(),
                charactersService.getAll(),
                contentUnlocksService.getAll(),
                contentUnlocksService.getAllProgress()
            ]);

            // Load progress only for the tasks we got
            const taskIds = tasksData.map(t => t.id);
            const progressData = await tasksService.getAllProgress(taskIds);

            // Map accounts with their main characters
            const accountsWithChars: AccountWithChar[] = accountsData.map(account => {
                const chars = charactersData.filter(c => c.account_id === account.id);
                const mainChar = chars.find(c => c.main === 'Main') || chars[0];
                return { ...account, mainCharacter: mainChar };
            });

            setTasks(tasksData);
            setAccounts(accountsWithChars);
            setAllProgress(progressData);
            setUnlocks(unlocksData);
            setUnlockProgress(unlockProgressData);
        } catch (error) {
            console.error('Error loading tasks data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => t.is_completed === (activeTab === 'completed'));
    }, [tasks, activeTab]);

    const handleToggleProgress = async (taskId: string, accountId: string, currentStatus: boolean) => {
        try {
            const newProgress = await tasksService.toggleProgress(taskId, accountId, !currentStatus);
            setAllProgress(prev => {
                const existing = prev.find(p => p.task_id === taskId && p.account_id === accountId);
                if (existing) {
                    return prev.map(p => p.id === existing.id ? newProgress : p);
                }
                return [...prev, newProgress];
            });
        } catch (error) {
            console.error('Error toggling task progress:', error);
        }
    };

    const handleFinishTask = async (taskId: string) => {
        if (!window.confirm('¿Marcar esta tarea como finalizada? Se moverá a la pestaña de Completados.')) return;
        try {
            await tasksService.markAsCompleted(taskId);
            await loadData(); // Reload to see re-indexed orders
        } catch (error) {
            console.error('Error finishing task:', error);
        }
    };

    const handleReactivateTask = async (taskId: string) => {
        try {
            await tasksService.reactivate(taskId);
            await loadData(); // Reload to see new order at the end
        } catch (error) {
            console.error('Error reactivating task:', error);
        }
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setShowEditModal(true);
    };

    const getTaskStatus = (taskId: string, accountId: string): boolean => {
        const progress = allProgress.find(p => p.task_id === taskId && p.account_id === accountId);
        return progress?.completed || false;
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

    const countPendingAccounts = (taskId: string): number => {
        const completedCount = allProgress.filter(p => p.task_id === taskId && p.completed).length;
        return accounts.length - completedCount;
    };

    return (
        <>
            <Header title="Tasks" />
            <div className="tasks-page">
                <div className="tasks-header">
                    <div className="tasks-tabs">
                        <button className={`task-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
                            Active Tasks ({tasks.filter(t => !t.is_completed).length})
                        </button>
                        <button className={`task-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                            Completed Tasks ({tasks.filter(t => t.is_completed).length})
                        </button>
                        <button className={`task-tab ${activeTab === 'unlocks' ? 'active' : ''}`} onClick={() => setActiveTab('unlocks')}>
                            Content Unlocks ({unlocks.length})
                        </button>
                    </div>
                    {activeTab === 'unlocks' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" onClick={() => setShowEditUnlocksModal(true)}>Edit Unlocks</Button>
                            <Button variant="primary" onClick={() => setShowNewUnlockModal(true)}>+ New Unlock</Button>
                        </div>
                    ) : (
                        <Button variant="primary" onClick={() => setShowCreateModal(true)}>+ New Task</Button>
                    )}
                </div>

                {activeTab === 'unlocks' ? (
                    loading ? <div className="loading-state">Loading...</div> : unlocks.length === 0 ? (
                        <div className="no-tasks"><div className="no-tasks-icon">🔓</div><p>No content unlocks yet. Add one!</p></div>
                    ) : (
                        <div className="tasks-table-container">
                            <div className="table-scroll-container">
                                <table className="tasks-table">
                                    <thead>
                                        {/* Row 1: group headers */}
                                        <tr>
                                            <th rowSpan={2}>#</th>
                                            <th rowSpan={2}>Mail</th>
                                            <th rowSpan={2}>Tag</th>
                                            <th rowSpan={2}>Char</th>
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
                                        {/* Row 2: individual column details */}
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
                                                <td className="account-number">{account.number}</td>
                                                <td className="account-email">{account.email}</td>
                                                <td className="account-tag">{account.tag}</td>
                                                <td className="account-char">{account.mainCharacter?.name || '-'}</td>
                                                {unlocks.map(unlock => {
                                                    const done = getUnlockStatus(unlock.id, account.id);
                                                    return (
                                                        <td key={unlock.id} className="task-checkbox-cell">
                                                            <input
                                                                type="checkbox"
                                                                className="task-checkbox"
                                                                checked={done}
                                                                onChange={() => handleToggleUnlock(unlock.id, account.id, done)}
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
                    )
                ) : loading ? (
                    <div className="loading-state">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                    <div className="no-tasks">
                        <div className="no-tasks-icon">📋</div>
                        <p>No tasks found in this section.</p>
                    </div>
                ) : activeTab === 'active' ? (
                    <div className="tasks-table-container">
                        <div className="table-scroll-container">
                            <table className="tasks-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Mail</th>
                                        <th>Tag</th>
                                        <th>Char</th>
                                        {filteredTasks.map(task => (
                                            <th key={task.id} className="task-header-col">
                                                <div className="task-header-content">
                                                    <div className="task-name-wrapper">
                                                        {task.is_core && <span className="badge-core-global" title="Core Task">CORE</span>}
                                                        <span className="task-name">{task.name}</span>
                                                        <div className="task-header-progress">
                                                            {allProgress.filter(p => p.task_id === task.id && p.completed).length} / {accounts.length}
                                                        </div>
                                                    </div>
                                                    <div className="task-actions">
                                                        <button
                                                            className="edit-task-btn"
                                                            onClick={() => handleEditTask(task)}
                                                            title="Edit Task"
                                                        >
                                                            ✎
                                                        </button>
                                                        <button
                                                            className="finish-task-btn"
                                                            onClick={() => handleFinishTask(task.id)}
                                                            title="Mark as Finished"
                                                        >
                                                            ✓
                                                        </button>
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((account) => (
                                        <tr key={account.id}>
                                            <td className="account-number">{account.number}</td>
                                            <td className="account-email">{account.email}</td>
                                            <td className="account-tag">{account.tag}</td>
                                            <td className="account-char">{account.mainCharacter?.name || '-'}</td>
                                            {filteredTasks.map(task => {
                                                const isCompleted = getTaskStatus(task.id, account.id);
                                                return (
                                                    <td key={task.id} className="task-checkbox-cell">
                                                        <input
                                                            type="checkbox"
                                                            className="task-checkbox"
                                                            checked={isCompleted}
                                                            onChange={() => handleToggleProgress(task.id, account.id, isCompleted)}
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
                ) : (
                    <div className="completed-tasks-list">
                        {filteredTasks.map(task => {
                            const pendingCount = countPendingAccounts(task.id);
                            return (
                                <div key={task.id} className="completed-task-card">
                                    <div className="completed-task-main">
                                        <span className="completed-task-name">{task.name}</span>
                                        {task.is_core && <span className="badge-core-global">CORE</span>}
                                    </div>

                                    <div className="completed-task-info">
                                        {task.is_core && pendingCount > 0 && (
                                            <div className="pending-status-pill">
                                                <span className="warning-icon">⚠️</span>
                                                <span className="pending-text">{pendingCount} PENDING</span>
                                            </div>
                                        )}

                                        <button
                                            className="restore-task-btn"
                                            onClick={() => handleReactivateTask(task.id)}
                                            title="Restore Task"
                                        >
                                            ↺
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onTaskCreated={loadData}
            />

            <EditTaskModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedTask(null);
                }}
                onTaskUpdated={loadData}
                task={selectedTask}
            />

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
