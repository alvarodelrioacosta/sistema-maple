// =============================================
// DASHBOARD PAGE - Vista principal con KPIs
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { KPICard, Card } from '../../components/UI';
import { itemsService, financialAccountsService, accountsService, resourcesService, sharedInventoryService, accountsReceivableService, exchangeRatesService, transactionsService } from '../../services';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { DashboardKPIs, ItemStatus } from '../../types';
import './Dashboard.css';

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899'];

const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    }
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
        totalIncome: 0,
        totalExpenses: 0,
        accountsReceivable: 0,
        totalResourceValue: 0,
        totalFinancialBalance: 0,
        totalMesos: 0,
        netBalance: 0,
        itemsByStatus: { bulk: 0, in_stock: 0, for_sale: 0, sold: 0 }
    });

    const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
    const [details, setDetails] = useState<{
        itemsByCategory: { status: string, count: number, mesos: number }[];
        financialAccounts: { name: string, balance: number, currency: string }[];
        cubesBreakdown: { type: string, count: number, valueMesos: number }[];
        mesosAccounts: { name: string, mesos: number, isVault?: boolean, isConsolidated?: boolean }[];
        receivableByCurrency: { currency: string, count: number, balance: number }[];
        totalStockMesos: number;
        totalResourceMesos: number;
        totalMesosSum: number;
        expensesByCategory: { name: string, value: number }[];
        monthlyData: { month: string, income: number, expense: number }[];
    }>({
        itemsByCategory: [],
        financialAccounts: [],
        cubesBreakdown: [],
        mesosAccounts: [],
        receivableByCurrency: [],
        totalStockMesos: 0,
        totalResourceMesos: 0,
        totalMesosSum: 0,
        expensesByCategory: [],
        monthlyData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadKPIs = async () => {
            try {
                const [
                    itemsForBreakdown,
                    financialAccounts,
                    accounts,
                    resourceMetadata,
                    sharedInventory,
                    receivables,
                    rates,
                    dashboardTransactions
                ] = await Promise.all([
                    itemsService.getItemBreakdown(),
                    financialAccountsService.getAll(),
                    accountsService.getAll(),
                    resourcesService.getResourceMetadata(),
                    sharedInventoryService.get(),
                    accountsReceivableService.getAll(),
                    exchangeRatesService.getAll(),
                    transactionsService.getDashboardData()
                ]);

                // Helper to get rate to USD
                const getToUSDRate = (currency: string) => {
                    if (!currency) return 0;
                    if (currency === 'USD' || currency === '$' || currency.toLowerCase() === 'usd') return 1;

                    const directRate = rates.find(r => r.base_currency === currency && r.target_currency === 'USD');
                    if (directRate) return directRate.rate;

                    const inverseRate = rates.find(r => r.base_currency === 'USD' && r.target_currency === currency);
                    if (inverseRate && inverseRate.rate !== 0) return 1 / inverseRate.rate;

                    const cleanCurrency = currency.replace(/\s+/g, '').toLowerCase();
                    const fuzzyRate = rates.find(r =>
                        r.base_currency.replace(/\s+/g, '').toLowerCase() === cleanCurrency &&
                        r.target_currency === 'USD'
                    );
                    if (fuzzyRate) return fuzzyRate.rate;

                    return 0;
                };

                const mesoToUSDRate = getToUSDRate('Mesos(b)');

                // 1. Financial Balance in USD
                const financialAccountsWithBalances = financialAccounts.map(acc => {
                    const accTransactions = dashboardTransactions.filter(t => t.financial_account_id === acc.id);
                    const calculatedBalance = accTransactions.reduce((accSum, t) => {
                        if (t.type === 'income') return accSum + (t.amount || 0);
                        if (t.type === 'expense') return accSum - (t.amount || 0);
                        if (t.type === 'transfer') {
                            const desc = (t.description || '').toLowerCase();
                            if (desc.includes('transfer from')) return accSum + (t.amount || 0);
                            if (desc.includes('transfer to')) return accSum - (t.amount || 0);
                        }
                        return accSum;
                    }, 0);
                    return { ...acc, balance: calculatedBalance };
                });

                const financialBalance = financialAccountsWithBalances.reduce((sum, acc) => {
                    const rate = getToUSDRate(acc.currency);
                    return sum + ((acc.balance || 0) * rate);
                }, 0);

                // 2. Resource Value (Cubes) in USD
                const brightCount = accounts.reduce((sum, acc) => sum + (acc.bright_cubes || 0), 0);
                const bonusCount = accounts.reduce((sum, acc) => sum + (acc.bonus_bright_cubes || 0), 0);
                const solidCount = accounts.reduce((sum, acc) => sum + (acc.solid_cubes || 0), 0);

                const brightMesoCost = resourceMetadata['bright_cubes']?.mesoCost || 0;
                const bonusMesoCost = resourceMetadata['bonus_bright_cubes']?.mesoCost || 0;
                const solidMesoCost = resourceMetadata['solid_cubes']?.mesoCost || 0;

                const totalCubesValueMesos = (brightCount * brightMesoCost) + (bonusCount * bonusMesoCost) + (solidCount * solidMesoCost);
                const totalCubesValueUSD = totalCubesValueMesos * mesoToUSDRate;

                // 3. Total Mesos in USD
                const totalMesosInAccounts = accounts.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0);
                const totalMesosValueUSD = (totalMesosInAccounts + (sharedInventory?.mesos_stock || 0)) * mesoToUSDRate;

                // 4. Accounts Receivable in USD
                const activeReceivables = receivables.filter(ar => ar.status !== 'paid' && (ar.amount - (ar.paid || 0)) > 0);
                const receivableTotalUSD = activeReceivables.reduce((sum, ar) => {
                    const currency = ar.currency || ar.client?.currency || 'USD';
                    const rate = getToUSDRate(currency);
                    return sum + ((ar.amount - (ar.paid || 0)) * rate);
                }, 0);

                // 5. Item Breakdown (Count and Mesos)
                const itemsByCategory = [
                    { status: 'bulk', count: 0, mesos: 0 },
                    { status: 'in_stock', count: 0, mesos: 0 },
                    { status: 'for_sale', count: 0, mesos: 0 }
                ];

                const statusCounts = { bulk: 0, in_stock: 0, for_sale: 0, sold: 0 };

                itemsForBreakdown.forEach(item => {
                    const status = item.status as ItemStatus;

                    // KPI mappings
                    if (status === 'bulk') statusCounts.bulk++;
                    else if (status === 'in_stock' || status === 'in_progress') statusCounts.in_stock++;
                    else if (status === 'for_sale') statusCounts.for_sale++;
                    else if (status === 'sold') statusCounts.sold++;

                    // Chart mappings
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
                const stockValueUSD = totalStockMesos * mesoToUSDRate;
                // 6. Mesos Account Sorting & Grouping
                const individualAccts = accounts
                    .map(acc => ({ name: `${acc.number} - ${acc.email}`, mesos: acc.mesos_b || 0 }))
                    .filter(a => a.mesos > 0);

                const threshold = 0.5;
                const highValueAccts = individualAccts.filter(a => a.mesos >= threshold);
                const lowValueAccts = individualAccts.filter(a => a.mesos < threshold);

                const mesosAccts: { name: string, mesos: number, isVault?: boolean, isConsolidated?: boolean }[] = [
                    { name: 'Vault (Shared)', mesos: sharedInventory?.mesos_stock || 0, isVault: true }
                ];

                // Add high value accounts sorted
                mesosAccts.push(...highValueAccts.sort((a, b) => {
                    const isAlvaroA = a.name.includes('alvarodelrioacosta@gmail.com');
                    const isAlvaroB = b.name.includes('alvarodelrioacosta@gmail.com');
                    if (isAlvaroA && !isAlvaroB) return -1;
                    if (!isAlvaroA && isAlvaroB) return 1;
                    return b.mesos - a.mesos;
                }));

                // Add consolidated entry for low value accounts
                if (lowValueAccts.length > 0) {
                    mesosAccts.push({
                        name: `${lowValueAccts.length} Accounts < 0.5 B`,
                        mesos: lowValueAccts.reduce((sum, a) => sum + a.mesos, 0),
                        isConsolidated: true
                    });
                }

                // 7. Receivable by Currency
                const arByCurr: Record<string, { count: number, balance: number }> = {};
                activeReceivables.forEach(ar => {
                    const curr = ar.currency || ar.client?.currency || 'USD';
                    if (!arByCurr[curr]) arByCurr[curr] = { count: 0, balance: 0 };
                    arByCurr[curr].count++;
                    arByCurr[curr].balance += (ar.amount - (ar.paid || 0));
                });

                const totalMesosSum = mesosAccts.reduce((sum, a) => sum + a.mesos, 0);

                // 8. Transactions Aggregation
                const expensesByCat: Record<string, number> = {};
                const currentYear = new Date().getFullYear();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyMap: Record<string, { income: number, expense: number }> = {};

                months.forEach(m => {
                    monthlyMap[m] = { income: 0, expense: 0 };
                });

                let calculatedTotalIncome = 0;
                let calculatedTotalExpenses = 0;

                dashboardTransactions.forEach((t: any) => {
                    const date = new Date(t.created_at);
                    const rate = getToUSDRate(t.currency || 'USD');
                    const amountUSD = (t.amount || 0) * rate;

                    if (t.type === 'income') {
                        calculatedTotalIncome += amountUSD;
                    } else if (t.type === 'expense') {
                        calculatedTotalExpenses += amountUSD;
                        const cat = t.category || 'Uncategorized';
                        expensesByCat[cat] = (expensesByCat[cat] || 0) + amountUSD;
                    }

                    if (date.getFullYear() === currentYear) {
                        const monthName = months[date.getMonth()];
                        if (monthlyMap[monthName]) {
                            if (t.type === 'income') monthlyMap[monthName].income += amountUSD;
                            if (t.type === 'expense') monthlyMap[monthName].expense += amountUSD;
                        }
                    }
                });

                const expensesByCategoryData = Object.entries(expensesByCat)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                const monthlyData = months.map(month => ({
                    month,
                    ...monthlyMap[month]
                }));

                const financialSortOrder = ['Binance', 'PPFF', 'PayPal', 'Efectivo Dolares', 'Mercado Pago', 'Efectivo', 'Soles', 'BCP'];

                setKpis({
                    totalStockValue: stockValueUSD,
                    totalIncome: calculatedTotalIncome,
                    totalExpenses: calculatedTotalExpenses,
                    totalResourceValue: totalCubesValueUSD,
                    totalFinancialBalance: financialBalance,
                    totalMesos: totalMesosValueUSD,
                    accountsReceivable: receivableTotalUSD,
                    netBalance: financialBalance + receivableTotalUSD + stockValueUSD + totalCubesValueUSD + totalMesosValueUSD,
                    itemsByStatus: statusCounts
                });

                setDetails({
                    itemsByCategory,
                    financialAccounts: financialAccountsWithBalances
                        .filter(acc => acc.name !== 'Inventario / Mesos')
                        .map(acc => ({
                            name: acc.name,
                            balance: acc.balance || 0,
                            currency: acc.currency
                        }))
                        .sort((a, b) => {
                            const indexA = financialSortOrder.indexOf(a.name);
                            const indexB = financialSortOrder.indexOf(b.name);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.name.localeCompare(b.name);
                        }),
                    cubesBreakdown: [
                        { type: 'Solid Cubes', count: solidCount, valueMesos: solidCount * solidMesoCost },
                        { type: 'Bright Cubes', count: brightCount, valueMesos: brightCount * brightMesoCost },
                        { type: 'Bonus Bright Cubes', count: bonusCount, valueMesos: bonusCount * bonusMesoCost }
                    ].filter(c => c.count > 0),
                    mesosAccounts: mesosAccts,
                    receivableByCurrency: Object.keys(arByCurr).map(curr => ({
                        currency: curr,
                        count: arByCurr[curr].count,
                        balance: arByCurr[curr].balance
                    })),
                    totalStockMesos,
                    totalResourceMesos: totalCubesValueMesos,
                    totalMesosSum,
                    expensesByCategory: expensesByCategoryData,
                    monthlyData
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
        { name: 'Cash', value: kpis.totalFinancialBalance },
        { name: 'Cubes', value: kpis.totalResourceValue },
        { name: 'Mesos', value: kpis.totalMesos },
        { name: 'AR', value: kpis.accountsReceivable },
    ].filter(item => item.value > 0);

    const handleKPIClick = (id: string) => {
        setSelectedKPI(selectedKPI === id ? null : id);
    };

    return (
        <div className="dashboard">
            <Header
                title="Welcome back! 👋 (v2)"
                subtitle="Overview of your inventory and finances"
            />

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
                    <div onClick={() => handleKPIClick('finance')} style={{ cursor: 'pointer' }}>
                        <KPICard
                            title="Financial Balance"
                            value={`$${formatCurrency(kpis.totalFinancialBalance)}`}
                            icon="🏦"
                            color="success"
                            className={selectedKPI === 'finance' ? 'kpi-card--active' : ''}
                        />
                    </div>
                </div>

                <div className="dashboard__charts">
                    <Card className="dashboard__chart-card">
                        <h3 className="dashboard__chart-title">Net Worth Distribution</h3>
                        {loading ? (
                            <div className="dashboard__loading">Loading...</div>
                        ) : netWorthData.length > 0 ? (
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
                                    <span className="dashboard__pie-total">
                                        ${formatCurrency(kpis.netBalance)}
                                    </span>
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
                                    <span className="dashboard__balance-label">
                                        {kpis.netBalance >= 0 ? 'Total Net Worth (USD)' : 'Net Loss'}
                                    </span>
                                </div>

                                <div className="dashboard__stats-list">
                                    <h4 className="dashboard__stats-subtitle">Main Categories (USD)</h4>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Stock Value</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.totalStockValue)}</span>
                                    </div>
                                    <div className="dashboard__stat-item">
                                        <span className="dashboard__stat-label">Financial Balance</span>
                                        <span className="dashboard__stat-value">${formatCurrency(kpis.totalFinancialBalance)}</span>
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
                                            <span className="dashboard__balance-value positive">
                                                {details.totalStockMesos.toLocaleString()} B
                                            </span>
                                            <span className="dashboard__balance-label">Total in Mesos</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Items by Status</h4>
                                        {details.itemsByCategory.map(cat => (
                                            <div className="dashboard__stat-item" key={cat.status}>
                                                <span className="dashboard__stat-label" style={{ textTransform: 'capitalize' }}>
                                                    {cat.count} {cat.status.replace('_', ' ')}
                                                </span>
                                                {cat.status !== 'bulk' && (
                                                    <span className="dashboard__stat-value">
                                                        {cat.mesos.toLocaleString()} B
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'finance' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">
                                                {Math.round(kpis.totalFinancialBalance).toLocaleString()}$
                                            </span>
                                            <span className="dashboard__balance-label">Total in USD</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Financial Accounts</h4>
                                        {details.financialAccounts.map((acc, i) => (
                                            <div className="dashboard__stat-item" key={acc.name + i}>
                                                <span className="dashboard__stat-label">{acc.name}</span>
                                                <span className="dashboard__stat-value">
                                                    {acc.balance.toLocaleString()} {acc.currency.includes('Mesos') ? 'B' : acc.currency}
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'resource' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">
                                                {details.totalResourceMesos.toLocaleString()} B
                                            </span>
                                            <span className="dashboard__balance-label">Total in Mesos</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">Cube Stock</h4>
                                        {details.cubesBreakdown.map(cube => (
                                            <div className="dashboard__stat-item" key={cube.type}>
                                                <span className="dashboard__stat-label">
                                                    {cube.count} {cube.type}
                                                </span>
                                                <span className="dashboard__stat-value">
                                                    {cube.valueMesos.toLocaleString()} B
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {selectedKPI === 'mesos' && (
                                    <>
                                        <div className="dashboard__balance">
                                            <span className="dashboard__balance-value positive">
                                                {details.totalMesosSum.toFixed(2)} B
                                            </span>
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
                                            <span className="dashboard__balance-value positive">
                                                {Math.round(kpis.accountsReceivable).toLocaleString()}$
                                            </span>
                                            <span className="dashboard__balance-label">Total in USD</span>
                                        </div>
                                        <h4 className="dashboard__stats-subtitle">AR by Currency</h4>
                                        {details.receivableByCurrency.map(ar => (
                                            <div className="dashboard__stat-item" key={ar.currency}>
                                                <span className="dashboard__stat-label">{ar.count} Entries ({ar.currency})</span>
                                                <span className="dashboard__stat-value">
                                                    {ar.balance.toLocaleString()} {ar.currency.includes('Mesos') ? 'B' : ar.currency}
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

                <div className="dashboard__charts" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', marginTop: 'var(--spacing-lg)' }}>
                    <Card className="dashboard__chart-card" style={{ height: 'auto' }}>
                        <h3 className="dashboard__chart-title">Monthly Income vs Expenses</h3>
                        {loading ? (
                            <div className="dashboard__loading">Loading...</div>
                        ) : details.monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={details.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                                    <YAxis hide stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        formatter={(value: number) => value.toFixed(2)}
                                    />
                                    <Legend />
                                    <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="dashboard__empty">No transaction history yet</div>
                        )}
                    </Card>

                    <Card className="dashboard__chart-card">
                        <h3 className="dashboard__chart-title">Expenses by Category</h3>
                        {loading ? (
                            <div className="dashboard__loading">Loading...</div>
                        ) : details.expensesByCategory.length > 0 ? (
                            <div className="dashboard__pie-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={details.expensesByCategory}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {details.expensesByCategory.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="dashboard__empty">No expenses categorized yet</div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
