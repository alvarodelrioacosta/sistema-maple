// =============================================
// RESOURCES PAGE - Inventario de recursos
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Card, Table, Modal, KPICard, LoadingScreen, AccountCell } from '../../components/UI';
import { resourcesService, accountsService, sharedInventoryService } from '../../services';
import type { SharedInventory, Account, ResourceBatch, ExpiringResourceType } from '../../types';
import { EXPIRING_RESOURCE_TYPES, RESOURCE_LABELS } from '../../types';
import type { Column } from '../../components/UI/Table';
import './Resources.css';

interface AccountResources {
    accountId: string;
    accountNumber: number;
    accountEmail: string | null;
    tag: string | null;
    brightCubes: number;
    bonusCubes: number;
    solid_cubes: number;
    rewardPoints: number;
    psok: number;
    guardianScroll: number;
    mesosB: number;
}

const formatExpiryDate = (expiresAt: string | null): string => {
    if (!expiresAt) return 'No expiry';
    // Add noon to avoid timezone shifts on date-only strings
    const d = new Date(expiresAt + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysUntilExpiry = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    const d = new Date(expiresAt + 'T12:00:00');
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const Resources: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [resourceImages, setResourceImages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);

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
    const [isAddingBatch, setIsAddingBatch] = useState(false);

    // Shared Chest modal state
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

    const totalBrightCubes = accounts.reduce((sum, a) => sum + (a.bright_cubes || 0), 0);
    const totalBonusCubes = accounts.reduce((sum, a) => sum + (a.bonus_bright_cubes || 0), 0);
    const totalSolidCubes = accounts.reduce((sum, a) => sum + (a.solid_cubes || 0), 0);

    const brightCubeUrl = resourceImages['bright_cubes'] || '';
    const bonusCubeUrl = resourceImages['bonus_bright_cubes'] || '';
    const solidCubeUrl = resourceImages['solid_cubes'] || '';
    const psokUrl = resourceImages['psok'] || '';
    const rewardPointsUrl = resourceImages['reward_points'] || '';
    const guardianScrollUrl = resourceImages['guardian_scroll'] || '';
    const mesosUrl = resourceImages['mesos'] || '';

    const tableData: AccountResources[] = accounts.map(account => ({
        accountId: account.id,
        accountNumber: account.number,
        accountEmail: account.email,
        tag: account.tag,
        brightCubes: account.bright_cubes || 0,
        bonusCubes: account.bonus_bright_cubes || 0,
        solid_cubes: account.solid_cubes || 0,
        rewardPoints: account.reward_points || 0,
        psok: account.psok || 0,
        guardianScroll: account.guardian_scroll || 0,
        mesosB: account.mesos_b || 0
    })).sort((a, b) => a.accountNumber - b.accountNumber);

    // ---- Handlers ----

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
            await resourcesService.addBatch(editingAccount.accountId, newResource, newQty, newExpiry || null);
            await refreshBatches(editingAccount.accountId);
            await loadData();
            setNewQty(1);
            setNewExpiry('');
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

    const handleEditSharedChest = () => {
        if (sharedChest) {
            setSharedChestValues({
                mesos_stock: sharedChest.mesos_stock || 0,
                perfect_innocence_stock: sharedChest.perfect_innocence_stock || 0
            });
        }
        setSharedChestModalOpen(true);
    };

    const handleSaveSharedChest = async (e: React.FormEvent) => {
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

    // ---- Table columns ----

    const columns: Column<AccountResources>[] = [
        {
            key: 'accountNumber',
            header: 'Account',
            width: '190px',
            render: (row) => (
                <AccountCell number={row.accountNumber} email={row.accountEmail} tag={row.tag} />
            )
        },
        {
            key: 'solid_cubes' as any,
            header: 'Solid Cubes',
            render: (row: any) => (
                <div className="resource-cell">
                    {solidCubeUrl ? <img src={solidCubeUrl} alt="SC" className="resource-icon-sm" /> : <span>SC</span>}
                    <span>{(row.solid_cubes || 0).toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'brightCubes',
            header: 'Bright Cubes',
            render: (row) => (
                <div className="resource-cell">
                    {brightCubeUrl ? <img src={brightCubeUrl} alt="BC" className="resource-icon-sm" /> : <span>BC</span>}
                    <span>{row.brightCubes.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'bonusCubes',
            header: 'Bonus Bright Cubes',
            render: (row) => (
                <div className="resource-cell">
                    {bonusCubeUrl ? <img src={bonusCubeUrl} alt="BBC" className="resource-icon-sm" /> : <span>BBC</span>}
                    <span>{row.bonusCubes.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'rewardPoints',
            header: 'Reward Points',
            render: (row) => (
                <div className="resource-cell">
                    {rewardPointsUrl ? <img src={rewardPointsUrl} alt="RP" className="resource-icon-sm" /> : <span className="resource-icon-text">🎁</span>}
                    <span>{row.rewardPoints.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'psok',
            header: 'PSOK',
            render: (row) => (
                <div className="resource-cell">
                    {psokUrl ? <img src={psokUrl} alt="PSOK" className="resource-icon-sm" /> : <span className="resource-icon-text">✂️</span>}
                    <span>{row.psok.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'guardianScroll',
            header: 'Guardian',
            render: (row) => (
                <div className="resource-cell">
                    {guardianScrollUrl ? <img src={guardianScrollUrl} alt="Guardian" className="resource-icon-sm" /> : <span className="resource-icon-text">🛡️</span>}
                    <span>{row.guardianScroll.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'mesosB',
            header: 'Mesos (B)',
            render: (row) => (
                <div className="resource-cell">
                    {mesosUrl ? <img src={mesosUrl} alt="Mesos" className="resource-icon-sm" /> : <span className="resource-icon-text">💰</span>}
                    <span>{row.mesosB.toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div className="table-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Manage</Button>
                </div>
            )
        }
    ];

    // ---- Batch modal helpers ----

    // Compute per-resource totals from loaded batches
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
                    <div className="kpi-wrapper">
                        <KPICard title="Total Solid Cubes" value={totalSolidCubes.toLocaleString()}
                            icon={<img src={solidCubeUrl} alt="SC" style={{ width: '40px', height: '40px' }} />} color="success" />
                    </div>
                    <div className="kpi-wrapper">
                        <KPICard title="Total Bright Cubes" value={totalBrightCubes.toLocaleString()}
                            icon={<img src={brightCubeUrl} alt="BC" style={{ width: '40px', height: '40px' }} />} color="primary" />
                    </div>
                    <div className="kpi-wrapper">
                        <KPICard title="Total Bonus Bright Cubes" value={totalBonusCubes.toLocaleString()}
                            icon={<img src={bonusCubeUrl} alt="BBC" style={{ width: '40px', height: '40px' }} />} color="info" />
                    </div>
                </div>

                {/* Shared Chest */}
                {sharedChest && (
                    <Card className="shared-chest-card mt-4" style={{ border: '1px solid #c084fc', background: 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: '#e9d5ff', fontWeight: 700 }}>SHARED CHEST</h4>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#d8b4fe', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mesos (B)</span>
                                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{sharedChest.mesos_stock?.toLocaleString() || 0}</strong>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#d8b4fe', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perfect Innoc.</span>
                                    <strong style={{ fontSize: '1.5rem', color: '#fff' }}>{sharedChest.perfect_innocence_stock || 0}</strong>
                                </div>
                                <Button size="sm" variant="ghost" onClick={handleEditSharedChest} style={{ color: '#e9d5ff' }}>Edit</Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Table */}
                <Card padding="none" className="mt-6">
                    <Table data={tableData} columns={columns} keyExtractor={(row) => row.accountId} emptyMessage="No accounts found." />
                </Card>
            </div>

            {/* ---- BATCH MANAGEMENT MODAL ---- */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
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

                    {/* Totals summary */}
                    <div className="batch-totals-row">
                        {EXPIRING_RESOURCE_TYPES.map(rt => (
                            <div key={rt} className="batch-total-chip">
                                <span className="batch-total-label">{RESOURCE_LABELS[rt]}</span>
                                <span className="batch-total-value">{(batchTotals[rt] || 0).toLocaleString()}</span>
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
                                                <td className="batch-resource-name">{RESOURCE_LABELS[batch.resource_type]}</td>
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

            {/* ---- SHARED CHEST MODAL ---- */}
            <Modal isOpen={sharedChestModalOpen} onClose={() => setSharedChestModalOpen(false)} title="Edit Shared Chest">
                <form onSubmit={handleSaveSharedChest} className="modal-form">
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
