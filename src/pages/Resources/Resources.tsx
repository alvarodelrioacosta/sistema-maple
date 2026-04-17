// =============================================
// RESOURCES PAGE - Inventario de recursos
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Card, Table, Modal, KPICard, LoadingScreen, AccountCell } from '../../components/UI';
import { resourcesService, accountsService, sharedInventoryService } from '../../services';
import type { SharedInventory, Account } from '../../types';
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

export const Resources: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [resourceImages, setResourceImages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountResources | null>(null);
    const [editValues, setEditValues] = useState({
        bright_cubes: 0,
        bonus_bright_cubes: 0,
        solid_cubes: 0,
        reward_points: 0,
        psok: 0,
        guardian_scroll: 0,
        mesos_b: 0
    });

    // Shared Chest Modal State
    const [sharedChestModalOpen, setSharedChestModalOpen] = useState(false);
    const [sharedChestValues, setSharedChestValues] = useState({
        mesos_stock: 0,
        perfect_innocence_stock: 0
    });
    const [isSaving, setIsSaving] = useState(false);

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

            // Extract just the image URLs for this component
            const imagesMap: Record<string, string> = {};
            Object.keys(imagesData).forEach(key => {
                imagesMap[key] = imagesData[key].image;
            });
            setResourceImages(imagesMap);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Totals - Now from accounts
    const totalBrightCubes = accounts.reduce((sum, a) => sum + (a.bright_cubes || 0), 0);
    const totalBonusCubes = accounts.reduce((sum, a) => sum + (a.bonus_bright_cubes || 0), 0);
    const totalSolidCubes = accounts.reduce((sum, a) => sum + (a.solid_cubes || 0), 0);

    // Get Images from DB
    const brightCubeUrl = resourceImages['bright_cubes'] || '';
    const bonusCubeUrl = resourceImages['bonus_bright_cubes'] || '';
    const solidCubeUrl = resourceImages['solid_cubes'] || '';
    const psokUrl = resourceImages['psok'] || '';
    const rewardPointsUrl = resourceImages['reward_points'] || '';
    const guardianScrollUrl = resourceImages['guardian_scroll'] || '';
    const mesosUrl = resourceImages['mesos'] || '';


    // Prepare Table Data - Simplified mapping
    const tableData: AccountResources[] = accounts.map(account => {
        return {
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
        };
    }).sort((a, b) => a.accountNumber - b.accountNumber);

    const handleEdit = (row: AccountResources) => {
        setEditingAccount(row);
        setEditValues({
            bright_cubes: row.brightCubes,
            bonus_bright_cubes: row.bonusCubes,
            solid_cubes: row.solid_cubes || 0,
            reward_points: row.rewardPoints,
            psok: row.psok,
            guardian_scroll: row.guardianScroll,
            mesos_b: row.mesosB
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAccount || isSaving) return;

        try {
            setIsSaving(true);
            await accountsService.update(editingAccount.accountId, {
                bright_cubes: editValues.bright_cubes,
                bonus_bright_cubes: editValues.bonus_bright_cubes,
                solid_cubes: editValues.solid_cubes,
                reward_points: editValues.reward_points,
                psok: editValues.psok,
                guardian_scroll: editValues.guardian_scroll,
                mesos_b: editValues.mesos_b
            });
            await loadData();
            setModalOpen(false);
        } catch (error: any) {
            console.error('Error saving resources:', error);
        } finally {
            setIsSaving(false);
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
        if (isSaving) return;

        try {
            setIsSaving(true);
            await sharedInventoryService.updateMesos(sharedChestValues.mesos_stock);
            await sharedInventoryService.updatePerfectInnocence(sharedChestValues.perfect_innocence_stock);
            await loadData();
            setSharedChestModalOpen(false);
        } catch (error: any) {
            console.error('Error saving shared chest:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<AccountResources>[] = [
        {
            key: 'accountNumber',
            header: 'Account',
            width: '190px',
            render: (row) => (
                <AccountCell
                    number={row.accountNumber}
                    email={row.accountEmail}
                    tag={row.tag}
                />
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
                    {psokUrl ? (
                        <img src={psokUrl} alt="PSOK" className="resource-icon-sm" />
                    ) : (
                        <span className="resource-icon-text">✂️</span>
                    )}
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
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Edit</Button>
                </div>
            )
        }
    ];

    if (loading) {
        return <LoadingScreen message="Sincronizando Inventario..." />;
    }

    return (
        <div className="resources-page">
            <Header
                title="Resources"
                subtitle="Inventory Overview & Management"
            />

            <div className="page-content">
                {/* TOTALS SECTION */}
                <div className="resources-kpis">
                    <div className="kpi-wrapper">
                        <KPICard
                            title="Total Solid Cubes"
                            value={totalSolidCubes.toLocaleString()}
                            icon={<img src={solidCubeUrl} alt="SC" style={{ width: '40px', height: '40px' }} />}
                            color="success"
                        />
                    </div>
                    <div className="kpi-wrapper">
                        <KPICard
                            title="Total Bright Cubes"
                            value={totalBrightCubes.toLocaleString()}
                            icon={<img src={brightCubeUrl} alt="BC" style={{ width: '40px', height: '40px' }} />}
                            color="primary"
                        />
                    </div>
                    <div className="kpi-wrapper">
                        <KPICard
                            title="Total Bonus Bright Cubes"
                            value={totalBonusCubes.toLocaleString()}
                            icon={<img src={bonusCubeUrl} alt="BBC" style={{ width: '40px', height: '40px' }} />}
                            color="info"
                        />
                    </div>
                </div>

                {/* SHARED CHEST SECTION */}
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
                                <Button size="sm" variant="ghost" onClick={handleEditSharedChest} style={{ color: '#e9d5ff' }}>
                                    Edit
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* TABLE SECTION */}
                <Card padding="none" className="mt-6">
                    <Table
                        data={tableData}
                        columns={columns}
                        keyExtractor={(row) => row.accountId}
                        emptyMessage="No accounts found."
                    />
                </Card>
            </div>

            {/* EDIT MODAL */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Edit Resources:</span>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                            N° {editingAccount?.accountNumber}{editingAccount?.accountEmail ? ` - ${editingAccount.accountEmail}` : ''}
                        </span>
                    </div>
                }
            >
                <form onSubmit={handleSave} className="modal-form">
                    <div className="premium-modal-container">
                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.solid_cubes}
                                    onChange={(e) => setEditValues({ ...editValues, solid_cubes: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Solid Cubes</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.bright_cubes}
                                    onChange={(e) => setEditValues({ ...editValues, bright_cubes: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Bright Cubes</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.bonus_bright_cubes}
                                    onChange={(e) => setEditValues({ ...editValues, bonus_bright_cubes: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Bonus Bright Cubes</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.reward_points}
                                    onChange={(e) => setEditValues({ ...editValues, reward_points: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Reward Points</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.psok}
                                    onChange={(e) => setEditValues({ ...editValues, psok: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">PSOK</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={editValues.guardian_scroll}
                                    onChange={(e) => setEditValues({ ...editValues, guardian_scroll: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Guardian Scroll</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={editValues.mesos_b}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setEditValues({ ...editValues, mesos_b: Math.round(val * 100) / 100 });
                                    }}
                                />
                            </div>
                            <span className="input-label-text">Mesos (Billions)</span>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={isSaving} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* SHARED CHEST EDIT MODAL */}
            <Modal
                isOpen={sharedChestModalOpen}
                onClose={() => setSharedChestModalOpen(false)}
                title="Edit Shared Chest"
            >
                <form onSubmit={handleSaveSharedChest} className="modal-form">
                    <div className="premium-modal-container">
                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={sharedChestValues.mesos_stock}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setSharedChestValues({ ...sharedChestValues, mesos_stock: Math.round(val * 100) / 100 });
                                    }}
                                />
                            </div>
                            <span className="input-label-text">Mesos (Billions)</span>
                        </div>

                        <div className="premium-input-row">
                            <div className="input-value-box">
                                <input
                                    type="number"
                                    min={0}
                                    value={sharedChestValues.perfect_innocence_stock}
                                    onChange={(e) => setSharedChestValues({ ...sharedChestValues, perfect_innocence_stock: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="input-label-text">Perfect Innocence Stock</span>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={() => setSharedChestModalOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={isSaving} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Resources;
