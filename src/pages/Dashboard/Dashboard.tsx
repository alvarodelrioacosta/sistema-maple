// =============================================
// DASHBOARD PAGE - Vista principal con KPIs
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { KPICard, Card, LoadingScreen } from '../../components/UI';
import { itemsService, accountsService, resourcesService, sharedInventoryService, accountsReceivableService, appSettingsService } from '../../services';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { DashboardKPIs, ItemStatus } from '../../types';
import './Dashboard.css';

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899'];

const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                backdropFilter: 'blur(4px)'
            }}>
                <p style={{ margin: 0, color: '#f8fafc', fontWeight: 600 }}>
                    {payload[0].name}: ${formatCurrency(payload[0].value)}
                </p>
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC = () => {
    const [kpis, setKpis] = useState<DashboardKPIs>({
        totalStockValue: 0,
        accountsReceivable: 0,
        totalResourceValue: 0,
        totalMesos: 0,
        netBalance: 0,
        itemsByStatus: { bulk: 0, in_stock: 0, for_sale: 0, sold: 0 }
    });

    const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
    const [details, setDetails] = useState<{
        itemsByCategory: { status: string, count: number, mesos: number }[];
        resourceStock: { type: string, count: number, valueMesos: number }[];
        mesosAccounts: { name: string, mesos: number, isVault?: boolean, isConsolidated?: boolean }[];
        receivableByClient: { name: string, balanceUSD: number, count: number, isConsolidated?: boolean }[];
        totalStockMesos: number;
        totalResourceMesos: number;
        totalMesosSum: number;
    }>({
        itemsByCategory: [],
        resourceStock: [],
        mesosAccounts: [],
        receivableByClient: [],
        totalStockMesos: 0,
        totalResourceMesos: 0,
        totalMesosSum: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadKPIs = async () => {
            try {
                const [
                    itemsForBreakdown,
                    accounts,
                    resourceMetadata,
                    sharedInventory,
                    receivables,
                    mesoUsdRate,
                ] = await Promise.all([
                    itemsService.getItemBreakdown(),
                    accountsService.getAll(),
                    resourcesService.getResourceMetadata(),
                    sharedInventoryService.get(),
                    accountsReceivableService.getAll(),
                    appSettingsService.getMesoUsdRate(),
                ]);

                const balancesArr = await Promise.all(accounts.map(acc => resourcesService.getAllBalances(acc.id)));
                const accountBalances: Record<string, Record<string, number>> = {};
                accounts.forEach((acc, i) => { accountBalances[acc.id] = balancesArr[i]; });

                // Resource Value (Cubes) in USD
                const brightCount = accounts.reduce((sum, acc) => sum + (accountBalances[acc.id]?.bright_cubes || 0), 0);
                const bonusCount = accounts.reduce((sum, acc) => sum + (accountBalances[acc.id]?.bonus_bright_cubes || 0), 0);
                const solidCount = accounts.reduce((sum, acc) => sum + (accountBalances[acc.id]?.solid_cubes || 0), 0);

                const brightMesoCost = resourceMetadata['bright_cubes']?.mesoCost || 0;
                const bonusMesoCost = resourceMetadata['bonus_bright_cubes']?.mesoCost || 0;
                const solidMesoCost = resourceMetadata['solid_cubes']?.mesoCost || 0;
                const perfectInnocMesoCost = resourceMetadata['perfect_innoc']?.mesoCost || 0;

                const totalPerfectInnocValueMesos = (sharedInventory?.perfect_innocence_stock || 0) * perfectInnocMesoCost;
                const totalResourceMesosValue = (brightCount * brightMesoCost) + (bonusCount * bonusMesoCost) + (solidCount * solidMesoCost) + totalPerfectInnocValueMesos;
                const totalResourceValueUSD = totalResourceMesosValue * mesoUsdRate;

                // Total Mesos in USD
                const totalMesosInAccounts = accounts.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0);
                const totalMesosSum = totalMesosInAccounts + (sharedInventory?.mesos_stock || 0);
                const totalMesosValueUSD = totalMesosSum * mesoUsdRate;

                // Accounts Receivable in USD (confirmed ARs only)
                const activeReceivables = receivables.filter(ar => ar.status !== 'paid' && (ar.amount - (ar.paid || 0)) > 0);

                const receivableTotalUSD = activeReceivables.reduce((sum, ar) => {
                    return sum + (ar.amount - (ar.paid || 0));
                }, 0);

                // Item Breakdown
                const itemsByCategory = [
                    { status: 'bulk', count: 0, mesos: 0 },
                    { status: 'in_stock', count: 0, mesos: 0 },
                    { status: 'for_sale', count: 0, mesos: 0 }
                ];
                const statusCounts = { bulk: 0, in_stock: 0, for_sale: 0, sold: 0 };

                itemsForBreakdown.forEach(item => {
                    const status = item.status as ItemStatus;
                    if (status === 'bulk') statusCounts.bulk++;
                    else if (status === 'in_stock' || status === 'in_progress') statusCounts.in_stock++;
                    else if (status === 'for_sale') statusCounts.for_sale++;
                    else if (status === 'sold') statusCounts.sold++;

                    const isStockPart = status === 'in_stock' || status === 'in_progress';
                    const targetStatus = isStockPart ? 'in_stock' : status;
                    const cat = itemsByCategory.find(c => c.status === targetStatus);
                    if (cat) {
                        cat.count++;
                        if (isStockPart) cat.mesos += (item.costo_item || 0);
                        if (status === 'for_sale') cat.mesos += (item.estimated_value || 0);
                    }
                });

                const totalStockMesos = itemsByCategory.reduce((sum, cat) => sum + cat.mesos, 0);
                const stockValueUSD = totalStockMesos * mesoUsdRate;

                // Mesos Accounts
                const individualAccts = accounts
                    .map(acc => ({ name: `${acc.number} - ${acc.email}`, mesos: acc.mesos_b || 0 }))
                    .filter(a => a.mesos > 0);

                const threshold = 0.5;
                const highValueAccts = individualAccts.filter(a => a.mesos >= threshold);
                const lowValueAccts = individualAccts.filter(a => a.mesos < threshold);

                const mesosAccts: { name: string, mesos: number, isVault?: boolean, isConsolidated?: boolean }[] = [
                    { name: 'Vault (Shared)', mesos: sharedInventory?.mesos_stock || 0, isVault: true }
                ];
                mesosAccts.push(...highValueAccts.sort((a, b) => {
                    const isAlvaroA = a.name.includes('alvarodelrioacosta@gmail.com');
                    const isAlvaroB = b.name.includes('alvarodelrioacosta@gmail.com');
                    if (isAlvaroA && !isAlvaroB) return -1;
                    if (!isAlvaroA && isAlvaroB) return 1;
                    return b.mesos - a.mesos;
                }));
                if (lowValueAccts.length > 0) {
                    mesosAccts.push({
                        name: `${lowValueAccts.length} Accounts < 0.5 B`,
                        mesos: lowValueAccts.reduce((sum, a) => sum + a.mesos, 0),
                        isConsolidated: true
                    });
                }

                // Receivable by Client
                const arByClient: Record<string, { count: number, balanceUSD: number }> = {};
                activeReceivables.forEach(ar => {
                    const clientName = ar.client?.name || 'Unknown Client';
                    const pending = ar.amount - (ar.paid || 0);
                    if (!arByClient[clientName]) arByClient[clientName] = { count: 0, balanceUSD: 0 };
                    arByClient[clientName].count++;
                    arByClient[clientName].balanceUSD += pending;
                });

                const sortedClients = Object.entries(arByClient)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.balanceUSD - a.balanceUSD);
                const top5Clients = sortedClients.slice(0, 5);
                const remainingClients = sortedClients.slice(5);
                const receivableByClient = [...top5Clients] as { name: string, balanceUSD: number, count: number, isConsolidated?: boolean }[];
                if (remainingClients.length > 0) {
                    receivableByClient.push({
                        name: `${remainingClients.length} Clients`,
                        balanceUSD: remainingClients.reduce((sum, c) => sum + c.balanceUSD, 0),
                        count: remainingClients.reduce((sum, c) => sum + c.count, 0),
                        isConsolidated: true
                    });
                }

                setKpis({
                    totalStockValue: stockValueUSD,
                    totalResourceValue: totalResourceValueUSD,
                    totalMesos: totalMesosValueUSD,
                    accountsReceivable: receivableTotalUSD,
                    netBalance: stockValueUSD + totalResourceValueUSD + totalMesosValueUSD + receivableTotalUSD,
                    itemsByStatus: statusCounts
                });

                setDetails({
                    itemsByCategory,
                    resourceStock: [
                        { type: 'Solid Cubes', count: solidCount, valueMesos: solidCount * solidMesoCost },
                        { type: 'Bright Cubes', count: brightCount, valueMesos: brightCount * brightMesoCost },
                        { type: 'Bonus Bright Cubes', count: bonusCount, valueMesos: bonusCount * bonusMesoCost },
                        { type: 'Perfect Innocence', count: sharedInventory?.perfect_innocence_stock || 0, valueMesos: totalPerfectInnocValueMesos }
                    ].filter(c => c.count > 0),
                    mesosAccounts: mesosAccts,
                    receivableByClient,
                    totalStockMesos,
                    totalResourceMesos: totalResourceMesosValue,
                    totalMesosSum,
                });
            } catch (error) {
                console.error('Error loading KPIs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadKPIs();
    }, []);

    const netWorthData = [
        { name: 'Stock', value: kpis.totalStockValue },
        { name: 'Cubes', value: kpis.totalResourceValue },
        { name: 'Mesos', value: kpis.totalMesos },
        { name: 'AR', value: kpis.accountsReceivable },
    ].filter(item => item.value > 0);

    const handleKPIClick = (id: string) => {
        setSelectedKPI(selectedKPI === id ? null : id);
    };

    if (loading) return <LoadingScreen message="Preparando tu Dashboard..." />;

    return (
        <div className="dashboard">
            <Header title="Welcome back! 👋" subtitle="Overview of your game inventory" />

            <div className="dashboard__content">
                <div className="dashboard__kpis">
                    <div onClick={() => handleKPIClick('stock')} style={{ cursor: 'pointer' }}>
                        <KPICard
                            title="Total Stock Value"
                            value={`$${formatCurrency(kpis.totalStockValue)}`}
                            icon="💎"
                            color="primary"
                            className={selectedKPI === 'stock' ? 'kpi-card--active' : ''}
                        />
                    </div>
                    <div onClick={() => handleKPIClick('resource')} style={{ cursor: 'pointer' }}>
                        <KPICard
                            title="Resource Value"
                            value={`$${formatCurrency(kpis.totalResourceValue)}`}
                            icon="📦"
                            color="warning"
                            className={selectedKPI === 'resource' ? 'kpi-card--active' : ''}
                        />
                    </div>
                    <div onClick={() => handleKPIClick('mesos')} style={{ cursor: 'pointer' }}>
                        <KPICard
                            title="Total Mesos"
                            value={`$${formatCurrency(kpis.totalMesos)}`}
                            icon="💰"
                            color="info"
                            className={selectedKPI === 'mesos' ? 'kpi-card--active' : ''}
                        />
                    </div>
                    <div onClick={() => handleKPIClick('receivable')} style={{ cursor: 'pointer' }}>
                        <KPICard
                            title="Accounts Receivable"
                            value={`$${formatCurrency(kpis.accountsReceivable)}`}
                            icon="📋"
                            color="danger"
                            className={selectedKPI === 'receivable' ? 'kpi-card--active' : ''}
                        />
                    </div>
                </div>

                <div className="dashboard__charts">
                    <Card className="dashboard__chart-card">
                        <h3 className="dashboard__chart-title">Net Worth Distribution</h3>
                        {netWorthData.length > 0 ? (
                            <div className="dashboard__pie-container">
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={netWorthData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={110}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {netWorthData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="dashboard__pie-center">
                                    <span className="dashboard__pie-total">${formatCurrency(kpis.netBalance)}</span>
                                    <span className="dashboard__pie-label">Total USD</span>
                                </div>
                            </div>
                        ) : (
                            <div className="dashboard__empty">No data yet</div>
                        )}
                    </Card>

                    <Card className="dashboard__stats-card">
                        <h3 className="dashboard__chart-title">{selectedKPI ? 'Breakdown' : 'Net Balance & Breakdown'}</h3>

                        {!selectedKPI ? (
                            <>
                                <div className="dashboard__balance">
                                    <span className={`dashboard__balance-value ${kpis.netBalance >= 0 ? 'positive' : 'negative'}`}>
                                        ${Math.round(Math.abs(kpis.netBalance)).toLocaleString()}
                                    </span>
                                    <span className="dashboard__balance-label">Total Net Worth (USD)</span>
                                </div>
                                <div className="dashboard__stats-list">
                                    <h4 className="dashboard__stats-subtitle">Main Categories (USD)</h4>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Stock Value</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.totalStockValue)}</span>
                                    </div>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Resource Value</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.totalResourceValue)}</span>
                                    </div>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Total Mesos</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.totalMesos)}</span>
                                    </div>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Accounts Receivable</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.accountsReceivable)}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="dashboard__stats-list">
                                {selectedKPI === 'stock' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">{details.totalStockMesos.toLocaleString()} B</span>
                                            <span className="dashboard__balance-label">Total in Mesos</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Items by Status</h4>
                                        {details.itemsByCategory.map(cat => (
                                            <div className="dashboard__stat-item" key={cat.status}>
                                                <span className="dashboard__stat-label" style={{ textTransform: 'capitalize' }}>
                                                    {cat.count} {cat.status.replace('_', ' ')}
                                                </span>
                                                {cat.status !== 'bulk' && (
                                                    <span className="dashboard__stat-value">{cat.mesos.toLocaleString()} B</span>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'resource' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">{details.totalResourceMesos.toLocaleString()} B</span>
                                            <span className="dashboard__balance-label">Total in Mesos</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Stock</h4>
                                        {details.resourceStock.map(res => (
                                            <div className="dashboard__stat-item" key={res.type}>
                                                <span className="dashboard__stat-label">{res.count} {res.type}</span>
                                                <span className="dashboard__stat-value">{res.valueMesos.toLocaleString()} B</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'mesos' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">{details.totalMesosSum.toFixed(2)} B</span>
                                            <span className="dashboard__balance-label">Total in Mesos</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Meso Distribution</h4>
                                        {details.mesosAccounts.map((acc, i) => (
                                            <div className="dashboard__stat-item" key={acc.name + i}>
                                                <span className="dashboard__stat-label" style={{ fontWeight: (acc.isVault || acc.isConsolidated) ? 'bold' : 'normal' }}>
                                                    {acc.name}
                                                </span>
                                                <span className="dashboard__stat-value" style={{ color: '#fbbf24' }}>
                                                    {acc.mesos.toFixed(2)} B
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'receivable' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">{Math.round(kpis.accountsReceivable).toLocaleString()}$</span>
                                            <span className="dashboard__balance-label">Total in USD</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">AR by Client (USD)</h4>
                                        {details.receivableByClient.map((client, i) => (
                                            <div className="dashboard__stat-item" key={client.name + i}>
                                                <span className="dashboard__stat-label" style={{ fontWeight: client.isConsolidated ? 'bold' : 'normal' }}>
                                                    {client.count} Entries ({client.name})
                                                </span>
                                                <span className="dashboard__stat-value" style={{ color: client.isConsolidated ? '#a78bfa' : 'inherit' }}>
                                                    ${client.balanceUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                <button
                                    className="dashboard__back-btn"
                                    onClick={() => setSelectedKPI(null)}
                                    style={{
                                        marginTop: 'var(--spacing-md)',
                                        background: 'var(--color-bg-tertiary)',
                                        border: 'none',
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        width: '100%',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                >
                                    ← Back to Net Worth
                                </button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
