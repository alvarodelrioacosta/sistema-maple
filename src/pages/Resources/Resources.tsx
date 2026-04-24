// =============================================
// RESOURCES PAGE - Inventario de recursos
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Card, Modal, KPICard, LoadingScreen, AccountCell } from '../../components/UI';
import { resourcesService, accountsService, sharedInventoryService } from '../../services';
import type { SharedInventory, Account, ResourceBatch, ExpiringResourceType } from '../../types';
import { EXPIRING_RESOURCE_TYPES, RESOURCE_LABELS } from '../../types';
import './Resources.css';

// ---- Group configuration ----

type GroupResourceKey = ExpiringResourceType | 'mesos_b';

interface ResourceGroupDef {
    key: string;
    label: string;
    color: string;
    resources: GroupResourceKey[];
}

const RESOURCE_GROUPS: ResourceGroupDef[] = [
    { key: 'cubes',    label: 'Cubes',           color: '#4ade80', resources: ['solid_cubes', 'bright_cubes', 'bonus_bright_cubes'] },
    { key: 'currency', label: 'Currency',         color: '#fbbf24', resources: ['reward_points', 'mesos_b'] },
    { key: 'nx',       label: 'NX',               color: '#60a5fa', resources: ['psok', 'guardian_scroll'] },
    { key: 'mystic',   label: 'Mystic Frontier',  color: '#c084fc', resources: ['familiar_ring_box', 'black_heart', 'dawn_accessory_box', 'pitched_boss_accessory_box', 'pitched_star_core'] },
];

const SHORT_LABELS: Record<GroupResourceKey, string> = {
    solid_cubes:                 'Solid',
    bright_cubes:                'Bright',
    bonus_bright_cubes:          'Bonus',
    reward_points:               'nRP',
    mesos_b:                     'Mesos',
    psok:                        'PSOK',
    guardian_scroll:             'Guardian',
    familiar_ring_box:           'Familiar',
    black_heart:                 'B. Heart',
    dawn_accessory_box:          'Dawn Box',
    pitched_boss_accessory_box:  'PB Box',
    pitched_star_core:           'Star Core',
};

// ---- Data types ----

interface AccountResources {
    accountId: string;
    accountNumber: number;
    accountEmail: string | null;
    tag: string | null;
    mesosB: number;
}

interface ExpiryDetailRow {
    accountNumber: number;
    accountTag: string | null;
    resourceLabel: string;
    quantity: number;
    daysRemaining: number;
    expiresAt: string;
}

// ---- Helper functions ----

const formatExpiryDate = (expiresAt: string | null): string => {
    if (!expiresAt) return 'No expiry';
    const d = new Date(expiresAt + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysUntilExpiry = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    const d = new Date(expiresAt + 'T12:00:00');
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// ---- Sub-components ----

const ExpiryBadge: React.FC<{ expiresAt: string | null }> = ({ expiresAt }) => {
    if (!expiresAt) return null;
    const days = daysUntilExpiry(expiresAt);
    if (days === null || days > 30) return null;
    if (days < 0) return <span className="expiry-badge expiry-badge--expired">Exp</span>;
    const cls = days <= 7 ? 'expiry-badge expiry-badge--urgent' : 'expiry-badge expiry-badge--warning';
    return <span className={cls}>{days}d</span>;
};

interface GroupItem {
    key: string;
    label: string;
    qty: number;
    expiresAt: string | null;
    icon: string;
    isMesos?: boolean;
}

const ResourceGroupCell: React.FC<{ items: GroupItem[] }> = ({ items }) => (
    <div className="resource-group-cell">
        {items.map(item => (
            <div key={item.key} className={`resource-item-row${item.qty === 0 ? ' resource-item-row--zero' : ''}`}>
                <span className="resource-item-left">
                    {item.icon
                        ? <img src={item.icon} alt={item.label} className="resource-icon-xs" />
                        : <span className="resource-icon-dot" />
                    }
                    <span className="resource-item-label">{item.label}</span>
                    <span className="resource-item-qty">
                        {item.qty.toLocaleString()}{item.isMesos ? 'B' : ''}
                    </span>
                </span>
                <ExpiryBadge expiresAt={item.expiresAt} />
            </div>
        ))}
    </div>
);

// ---- Main Component ----

export const Resources: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [resourceImages, setResourceImages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);
    const [accountBalances, setAccountBalances] = useState<Record<string, Record<string, number>>>({});
    const [accountEarliestExpiry, setAccountEarliestExpiry] = useState<Record<string, Record<string, string | null>>>({});
    const [allBatches, setAllBatches] = useState<ResourceBatch[]>([]);

    // Active expiry filter: null = no filter, 7 or 30 = show only accounts with resources expiring within N days
    const [activeExpiryFilter, setActiveExpiryFilter] = useState<null | 7 | 30>(null);

    // Batch modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountResources | null>(null);
    const [batches, setBatches] = useState<ResourceBatch[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [mesosValue, setMesosValue] = useState(0);
    const [isSavingMesos, setIsSavingMesos] = useState(false);
    const [isExpiringOld, setIsExpiringOld] = useState(false);

    // Add-batch form state
    const [newResource, setNewResource] = useState<ExpiringResourceType>('solid_cubes');
    const [newQty, setNewQty] = useState(1);
    const [newExpiry, setNewExpiry] = useState('');
    const [newIsKarma, setNewIsKarma] = useState(false);
    const [isAddingBatch, setIsAddingBatch] = useState(false);

    // Guild Chest modal state
    const [sharedChestModalOpen, setSharedChestModalOpen] = useState(false);
    const [sharedChestValues, setSharedChestValues] = useState({ mesos_stock: 0, perfect_innocence_stock: 0 });
    const [isSavingChest, setIsSavingChest] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [accountsData, imagesData, sharedData] = await Promise.all([
                accountsService.getAll(),
                resourcesService.getResourceMetadata(),
                sharedInventoryService.get().catch(() => null)
            ]);
            setAccounts(accountsData);
            setSharedChest(sharedData);

            const imagesMap: Record<string, string> = {};
            Object.keys(imagesData).forEach(key => { imagesMap[key] = imagesData[key].image; });
            setResourceImages(imagesMap);

            if (accountsData.length > 0) {
                const accountIds = accountsData.map(a => a.id);
                const fetchedBatches = await resourcesService.getBulkBatchesForAccounts(accountIds);
                setAllBatches(fetchedBatches);

                const newBalances: Record<string, Record<string, number>> = {};
                const newExpiry: Record<string, Record<string, string | null>> = {};

                accountsData.forEach(acc => {
                    newBalances[acc.id] = {};
                    newExpiry[acc.id] = {};
                    EXPIRING_RESOURCE_TYPES.forEach(t => {
                        newBalances[acc.id][t] = 0;
                        newExpiry[acc.id][t] = null;
                    });
                });

                fetchedBatches.forEach(batch => {
                    const { account_id, resource_type, quantity, expires_at } = batch;
                    if (!newBalances[account_id]) return;
                    newBalances[account_id][resource_type] = (newBalances[account_id][resource_type] || 0) + quantity;
                    if (expires_at) {
                        const current = newExpiry[account_id][resource_type];
                        if (!current || expires_at < current) {
                            newExpiry[account_id][resource_type] = expires_at;
                        }
                    }
                });

                setAccountBalances(newBalances);
                setAccountEarliestExpiry(newExpiry);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshBatches = async (accountId: string) => {
        const updated = await resourcesService.getBatches(accountId);
        setBatches(updated);
    };

    // ---- KPI computed values ----

    const totalBrightCubes = accounts.reduce((sum, a) => sum + (accountBalances[a.id]?.bright_cubes || 0), 0);
    const totalBonusCubes  = accounts.reduce((sum, a) => sum + (accountBalances[a.id]?.bonus_bright_cubes || 0), 0);

    const urgentExpiryCount = Object.values(accountEarliestExpiry).reduce((total, accountExpiry) =>
        total + Object.values(accountExpiry).filter(date => {
            const d = daysUntilExpiry(date);
            return d !== null && d >= 0 && d <= 7;
        }).length, 0);

    const warningExpiryCount = Object.values(accountEarliestExpiry).reduce((total, accountExpiry) =>
        total + Object.values(accountExpiry).filter(date => {
            const d = daysUntilExpiry(date);
            return d !== null && d >= 0 && d <= 30;
        }).length, 0);

    // ---- Expiry panel rows (flat list of all expiring batches within active threshold) ----

    const expiryPanelRows: ExpiryDetailRow[] = activeExpiryFilter === null ? [] :
        allBatches
            .filter(batch => {
                if (!batch.expires_at) return false;
                const d = daysUntilExpiry(batch.expires_at);
                return d !== null && d >= 0 && d <= activeExpiryFilter;
            })
            .map(batch => {
                const account = accounts.find(a => a.id === batch.account_id);
                return {
                    accountNumber: account?.number ?? 0,
                    accountTag:    account?.tag ?? null,
                    resourceLabel: RESOURCE_LABELS[batch.resource_type],
                    quantity:      batch.quantity,
                    daysRemaining: daysUntilExpiry(batch.expires_at)!,
                    expiresAt:     batch.expires_at!,
                };
            })
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const brightCubeUrl = resourceImages['bright_cubes'] || '';
    const bonusCubeUrl  = resourceImages['bonus_bright_cubes'] || '';

    // ---- Table data ----

    const tableData: AccountResources[] = accounts.map(account => ({
        accountId:     account.id,
        accountNumber: account.number,
        accountEmail:  account.email,
        tag:           account.tag,
        mesosB:        account.mesos_b || 0,
    })).sort((a, b) => a.accountNumber - b.accountNumber);

    // Filtered to only accounts with an expiring resource within the active threshold
    const filteredTableData = activeExpiryFilter === null
        ? tableData
        : tableData.filter(row =>
            EXPIRING_RESOURCE_TYPES.some(rt => {
                const d = daysUntilExpiry(accountEarliestExpiry[row.accountId]?.[rt] ?? null);
                return d !== null && d >= 0 && d <= activeExpiryFilter;
            })
        );

    // ---- Handlers ----

    const handleExpiryKPIClick = (days: 7 | 30) =>
        setActiveExpiryFilter(prev => prev === days ? null : days);

    const handleEdit = async (row: AccountResources) => {
        setEditingAccount(row);
        setMesosValue(row.mesosB);
        setModalOpen(true);
        setBatchLoading(true);
        try {
            await refreshBatches(row.accountId);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleAddBatch = async () => {
        if (!editingAccount || isAddingBatch || newQty <= 0) return;
        setIsAddingBatch(true);
        try {
            await resourcesService.addBatch(editingAccount.accountId, newResource, newQty, newExpiry || null, newIsKarma);
            await refreshBatches(editingAccount.accountId);
            await loadData();
            setNewQty(1);
            setNewExpiry('');
            setNewIsKarma(false);
        } catch (err) {
            console.error('Error adding batch:', err);
        } finally {
            setIsAddingBatch(false);
        }
    };

    const handleDeleteBatch = async (batchId: string) => {
        if (!editingAccount) return;
        try {
            await resourcesService.deleteBatch(batchId);
            await refreshBatches(editingAccount.accountId);
            await loadData();
        } catch (err) {
            console.error('Error deleting batch:', err);
        }
    };

    const handleExpireOld = async () => {
        if (!editingAccount || isExpiringOld) return;
        setIsExpiringOld(true);
        try {
            await resourcesService.expireOldBatches(editingAccount.accountId);
            await refreshBatches(editingAccount.accountId);
            await loadData();
        } finally {
            setIsExpiringOld(false);
        }
    };

    const handleSaveMesos = async () => {
        if (!editingAccount || isSavingMesos) return;
        setIsSavingMesos(true);
        try {
            await accountsService.update(editingAccount.accountId, { mesos_b: mesosValue });
            await loadData();
        } finally {
            setIsSavingMesos(false);
        }
    };

    const handleEditGuildChest = () => {
        if (sharedChest) {
            setSharedChestValues({
                mesos_stock: sharedChest.mesos_stock || 0,
                perfect_innocence_stock: sharedChest.perfect_innocence_stock || 0
            });
        }
        setSharedChestModalOpen(true);
    };

    const handleSaveGuildChest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingChest) return;
        setIsSavingChest(true);
        try {
            await sharedInventoryService.updateMesos(sharedChestValues.mesos_stock);
            await sharedInventoryService.updatePerfectInnocence(sharedChestValues.perfect_innocence_stock);
            await loadData();
            setSharedChestModalOpen(false);
        } finally {
            setIsSavingChest(false);
        }
    };

    // ---- Batch modal helpers ----

    const batchTotals: Record<ExpiringResourceType, number> = (() => {
        const totals: Record<string, number> = {};
        EXPIRING_RESOURCE_TYPES.forEach(t => { totals[t] = 0; });
        batches.forEach(b => { totals[b.resource_type] = (totals[b.resource_type] || 0) + b.quantity; });
        return totals as Record<ExpiringResourceType, number>;
    })();

    if (loading) return <LoadingScreen message="Sincronizando Inventario..." />;

    return (
        <div className="resources-page">
            <Header title="Resources" subtitle="Inventory Overview & Management" />

            <div className="page-content">
                {/* KPIs */}
                <div className="resources-kpis">
                    <KPICard
                        title="Total Bright Cubes"
                        value={totalBrightCubes.toLocaleString()}
                        icon={brightCubeUrl ? <img src={brightCubeUrl} alt="BC" style={{ width: '40px', height: '40px' }} /> : undefined}
                        color="primary"
                    />
                    <KPICard
                        title="Total Bonus Bright"
                        value={totalBonusCubes.toLocaleString()}
                        icon={bonusCubeUrl ? <img src={bonusCubeUrl} alt="BBC" style={{ width: '40px', height: '40px' }} /> : undefined}
                        color="info"
                    />
                    <KPICard
                        title="Expiring ≤ 7 Days"
                        value={urgentExpiryCount.toLocaleString()}
                        icon={<span style={{ fontSize: '1.75rem', lineHeight: 1 }}>⚠</span>}
                        color={urgentExpiryCount > 0 ? 'danger' : 'success'}
                        onClick={() => handleExpiryKPIClick(7)}
                        isActive={activeExpiryFilter === 7}
                    />
                    <KPICard
                        title="Expiring ≤ 30 Days"
                        value={warningExpiryCount.toLocaleString()}
                        icon={<span style={{ fontSize: '1.75rem', lineHeight: 1 }}>📅</span>}
                        color={warningExpiryCount > 0 ? 'warning' : 'success'}
                        onClick={() => handleExpiryKPIClick(30)}
                        isActive={activeExpiryFilter === 30}
                    />
                </div>

                {/* Expiry detail panel — visible when a filter KPI is active */}
                {activeExpiryFilter !== null && (
                    <div className="expiry-panel">
                        <div className="expiry-panel__header">
                            <span className="expiry-panel__title">
                                {expiryPanelRows.length > 0
                                    ? `${expiryPanelRows.length} batch${expiryPanelRows.length !== 1 ? 'es' : ''} expiring within ${activeExpiryFilter} days`
                                    : `No batches expiring within ${activeExpiryFilter} days`
                                }
                            </span>
                            <button className="expiry-panel__dismiss" onClick={() => setActiveExpiryFilter(null)}>
                                Clear filter ✕
                            </button>
                        </div>
                        {expiryPanelRows.length > 0 && (
                            <div className="expiry-panel__list">
                                {expiryPanelRows.map((row, i) => (
                                    <div
                                        key={i}
                                        className={`expiry-panel__row expiry-panel__row--${row.daysRemaining <= 7 ? 'urgent' : 'warning'}`}
                                    >
                                        <span className="expiry-panel__account">
                                            #{row.accountNumber}{row.accountTag ? ` · ${row.accountTag}` : ''}
                                        </span>
                                        <span className="expiry-panel__resource">{row.resourceLabel}</span>
                                        <span className="expiry-panel__qty">{row.quantity.toLocaleString()}</span>
                                        <span className="expiry-panel__days">{row.daysRemaining}d</span>
                                        <span className="expiry-panel__date">{formatExpiryDate(row.expiresAt)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Guild Chest */}
                {sharedChest && (
                    <Card className="shared-chest-card mt-4" style={{ border: '1px solid #c084fc', background: 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: '#e9d5ff', fontWeight: 700 }}>🗄 GUILD CHEST</h4>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#d8b4fe', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mesos (B)</span>
                                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{sharedChest.mesos_stock?.toLocaleString() || 0}</strong>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#d8b4fe', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perfect Innoc.</span>
                                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{sharedChest.perfect_innocence_stock || 0}</strong>
                                </div>
                                <Button size="sm" variant="ghost" onClick={handleEditGuildChest} style={{ color: '#e9d5ff' }}>Edit</Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Grouped Resource Table */}
                <Card padding="none" className="mt-6">
                    <div className="resources-table-wrapper">
                        <table className="resources-table">
                            <thead>
                                <tr>
                                    <th className="res-th res-th-account">Account</th>
                                    {RESOURCE_GROUPS.map(g => (
                                        <th key={g.key} className="res-th res-th-group">
                                            <span className="res-group-label" style={{ color: g.color }}>{g.label}</span>
                                        </th>
                                    ))}
                                    <th className="res-th res-th-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={RESOURCE_GROUPS.length + 2} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            {activeExpiryFilter !== null
                                                ? `No accounts have resources expiring within ${activeExpiryFilter} days.`
                                                : 'No accounts found.'
                                            }
                                        </td>
                                    </tr>
                                ) : filteredTableData.map(row => (
                                    <tr key={row.accountId} className="res-tr">
                                        <td className="res-td res-td-account">
                                            <AccountCell number={row.accountNumber} email={row.accountEmail} tag={row.tag} />
                                        </td>
                                        {RESOURCE_GROUPS.map(group => {
                                            const items: GroupItem[] = group.resources.map(rk => ({
                                                key:       rk,
                                                label:     SHORT_LABELS[rk],
                                                qty:       rk === 'mesos_b' ? row.mesosB : (accountBalances[row.accountId]?.[rk] || 0),
                                                expiresAt: rk === 'mesos_b' ? null : (accountEarliestExpiry[row.accountId]?.[rk] || null),
                                                icon:      resourceImages[rk] || '',
                                                isMesos:   rk === 'mesos_b',
                                            }));
                                            return (
                                                <td key={group.key} className="res-td">
                                                    <ResourceGroupCell items={items} />
                                                </td>
                                            );
                                        })}
                                        <td className="res-td res-td-actions">
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Manage</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* ---- BATCH MANAGEMENT MODAL ---- */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                size="lg"
                title={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Manage Resources</span>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                            Account N° {editingAccount?.accountNumber}{editingAccount?.accountEmail ? ` — ${editingAccount.accountEmail}` : ''}
                        </span>
                    </div>
                }
            >
                <div className="batch-modal-body">

                    {/* Totals summary — grouped by category */}
                    <div className="batch-totals-groups">
                        {RESOURCE_GROUPS.map(group => (
                            <div key={group.key} className="batch-totals-group">
                                <span className="batch-totals-group-label" style={{ color: group.color }}>{group.label}</span>
                                <div className="batch-totals-chips">
                                    {(group.resources.filter(rk => rk !== 'mesos_b') as ExpiringResourceType[]).map(rt => (
                                        <div key={rt} className="batch-total-chip">
                                            <span className="batch-total-label">{RESOURCE_LABELS[rt]}</span>
                                            <span className="batch-total-value">{(batchTotals[rt] || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Batch list */}
                    <div className="batch-section">
                        <h4 className="batch-section-title">Current Batches</h4>
                        {batchLoading ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Loading batches…</p>
                        ) : batches.length === 0 ? (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No active batches. Add one below.</p>
                        ) : (
                            <table className="batch-table">
                                <thead>
                                    <tr>
                                        <th>Resource</th>
                                        <th>Qty</th>
                                        <th>Expires</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(batch => {
                                        const days = daysUntilExpiry(batch.expires_at);
                                        const expiringSoon = days !== null && days <= 7;
                                        const expired = days !== null && days < 0;
                                        return (
                                            <tr key={batch.id} className={expired ? 'batch-row--expired' : expiringSoon ? 'batch-row--warning' : ''}>
                                                <td className="batch-resource-name">
                                                    {RESOURCE_LABELS[batch.resource_type]}
                                                    {batch.is_karma && (
                                                        <span className="badge-karma" title="Karma — obtained from Mystic Frontier">Karma</span>
                                                    )}
                                                </td>
                                                <td className="batch-qty">{batch.quantity.toLocaleString()}</td>
                                                <td className="batch-expiry">
                                                    <span>{formatExpiryDate(batch.expires_at)}</span>
                                                    {expiringSoon && !expired && (
                                                        <span className="badge-warning" title={`Expires in ${days} day${days === 1 ? '' : 's'}`}>
                                                            ⚠ {days}d
                                                        </span>
                                                    )}
                                                    {expired && <span className="badge-expired">Expired</span>}
                                                </td>
                                                <td>
                                                    <button
                                                        className="batch-delete-btn"
                                                        onClick={() => handleDeleteBatch(batch.id)}
                                                        title="Delete batch"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Add new batch */}
                    <div className="batch-section">
                        <h4 className="batch-section-title">Add Batch</h4>
                        <div className="batch-add-form">
                            <select
                                className="batch-select"
                                value={newResource}
                                onChange={e => setNewResource(e.target.value as ExpiringResourceType)}
                            >
                                {EXPIRING_RESOURCE_TYPES.map(rt => (
                                    <option key={rt} value={rt}>{RESOURCE_LABELS[rt]}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                className="batch-qty-input"
                                min={1}
                                value={newQty}
                                onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                                placeholder="Qty"
                            />
                            <input
                                type="date"
                                className="batch-date-input"
                                value={newExpiry}
                                onChange={e => setNewExpiry(e.target.value)}
                                title="Expiry date (leave empty for no expiry)"
                            />
                            <label className="batch-karma-label" title="Mark as Karma (obtained from Mystic Frontier)">
                                <input
                                    type="checkbox"
                                    checked={newIsKarma}
                                    onChange={e => setNewIsKarma(e.target.checked)}
                                    style={{ accentColor: 'var(--color-accent-primary)' }}
                                />
                                Karma
                            </label>
                            <Button size="sm" onClick={handleAddBatch} loading={isAddingBatch} disabled={isAddingBatch || newQty <= 0}>
                                Add
                            </Button>
                        </div>
                        <p className="batch-add-hint">Leave the date empty for resources that never expire.</p>
                    </div>

                    {/* Mesos (non-expiring, direct field) */}
                    <div className="batch-section batch-mesos-section">
                        <h4 className="batch-section-title">Mesos (B)</h4>
                        <div className="batch-add-form">
                            <input
                                type="number"
                                className="batch-qty-input"
                                min={0}
                                step={0.01}
                                value={mesosValue}
                                onChange={e => setMesosValue(Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
                                style={{ width: '120px' }}
                            />
                            <Button size="sm" onClick={handleSaveMesos} loading={isSavingMesos} disabled={isSavingMesos}>
                                Save
                            </Button>
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="batch-modal-footer">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleExpireOld}
                            loading={isExpiringOld}
                            disabled={isExpiringOld}
                            title="Remove all batches whose expiry date has already passed"
                        >
                            Expire Old Batches
                        </Button>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ---- GUILD CHEST MODAL ---- */}
            <Modal isOpen={sharedChestModalOpen} onClose={() => setSharedChestModalOpen(false)} title="Edit Guild Chest">
                <form onSubmit={handleSaveGuildChest} className="modal-form">
                    <div className="premium-modal-container">
                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number" min={0} step={0.01}
                                    value={sharedChestValues.mesos_stock}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setSharedChestValues(prev => ({ ...prev, mesos_stock: Math.round(val * 100) / 100 }));
                                    }}
                                />
                            </div>
                            <span className="input-label-text">Mesos (Billions)</span>
                        </div>
                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number" min={0}
                                    value={sharedChestValues.perfect_innocence_stock}
                                    onChange={e => setSharedChestValues(prev => ({ ...prev, perfect_innocence_stock: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <span className="input-label-text">Perfect Innocence Stock</span>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={() => setSharedChestModalOpen(false)} disabled={isSavingChest}>Cancel</Button>
                        <Button type="submit" loading={isSavingChest} disabled={isSavingChest}>
                            {isSavingChest ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Resources;
