// =============================================
// DASHBOARD PAGE - Vista principal con KPIs
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { LoadingScreen } from '../../components/UI';
import { itemsService, accountsService, resourcesService, sharedInventoryService, clientLedgerService, appSettingsService, clientsService } from '../../services';
import type { ItemStatus } from '../../types';
import './Dashboard.css';

interface ClientSummary {
    name: string;
    chargesUSD: number;
    paymentsUSD: number;
    outstandingUSD: number;
    paidPct: number;
}

interface AccountRow {
    name: string;
    subtitle: string;
    mesos: number;
    isVault?: boolean;
}

interface TopItem {
    name: string;
    valueMesos: number;
}

interface DashboardData {
    netWorthUSD: number;
    stockValueUSD: number;
    totalStockMesos: number;
    totalMesosValueUSD: number;
    totalMesosSum: number;
    outstandingReceivablesUSD: number;
    pendingCount: number;
    mesoUsdRate: number;
    clientSummaries: ClientSummary[];
    accountRows: AccountRow[];
    topForSaleItems: TopItem[];
    totalForSaleMesos: number;
}

const formatUSD = (v: number) => `$${Math.round(v).toLocaleString()}`;
const formatB = (v: number) => v % 1 === 0 ? `${v} B` : `${v.toFixed(1)} B`;

export const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showMesos, setShowMesos] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [
                    itemsForBreakdown,
                    topForSaleRaw,
                    accounts,
                    resourceMetadata,
                    sharedInventory,
                    ledgerEntries,
                    clients,
                    mesoUsdRate,
                ] = await Promise.all([
                    itemsService.getItemBreakdown(),
                    itemsService.getTopForSale(6),
                    accountsService.getAll(),
                    resourcesService.getResourceMetadata(),
                    sharedInventoryService.get(),
                    clientLedgerService.getAll(),
                    clientsService.getAll(),
                    appSettingsService.getMesoUsdRate(),
                ]);

                const balancesArr = await Promise.all(accounts.map(acc => resourcesService.getAllBalances(acc.id)));
                const accountBalances: Record<string, Record<string, number>> = {};
                accounts.forEach((acc, i) => { accountBalances[acc.id] = balancesArr[i]; });

                // Resource value (Cubes) in USD
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

                // Mesos
                const totalMesosInAccounts = accounts.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0);
                const totalMesosSum = totalMesosInAccounts + (sharedInventory?.mesos_stock || 0);
                const totalMesosValueUSD = totalMesosSum * mesoUsdRate;

                // Stock
                const totalStockMesos = itemsForBreakdown.reduce((sum, item) => {
                    const status = item.status as ItemStatus;
                    if (status === 'in_stock' || status === 'in_progress') return sum + (item.costo_item || 0);
                    if (status === 'for_sale') return sum + (item.estimated_value || 0);
                    return sum;
                }, 0);
                const stockValueUSD = totalStockMesos * mesoUsdRate;

                // Top for-sale items
                const topForSaleItems: TopItem[] = topForSaleRaw.map(i => ({ name: i.name, valueMesos: i.estimated_value || 0 }));
                const totalForSaleMesos = topForSaleRaw.reduce((sum, i) => sum + (i.estimated_value || 0), 0);

                // AR v2: per-client summaries (convert all to USD)
                const clientMap = new Map(clients.map(c => [c.id, c.name]));
                const clientData = new Map<string, { charges: number; payments: number }>();

                for (const entry of ledgerEntries) {
                    const amountUSD = entry.currency === 'Mesos (b)'
                        ? entry.amount * mesoUsdRate
                        : entry.amount;

                    if (!clientData.has(entry.client_id)) {
                        clientData.set(entry.client_id, { charges: 0, payments: 0 });
                    }
                    const cd = clientData.get(entry.client_id)!;
                    if (entry.entry_type === 'charge') {
                        cd.charges += amountUSD;
                    } else {
                        cd.payments += amountUSD;
                    }
                }

                const clientSummaries: ClientSummary[] = [];
                let outstandingReceivablesUSD = 0;

                for (const [clientId, cd] of clientData.entries()) {
                    const outstanding = Math.max(0, cd.charges - cd.payments);
                    const paidPct = cd.charges > 0 ? Math.min(100, (cd.payments / cd.charges) * 100) : 100;
                    outstandingReceivablesUSD += outstanding;
                    if (outstanding > 0.01) {
                        clientSummaries.push({
                            name: clientMap.get(clientId) || 'Unknown',
                            chargesUSD: cd.charges,
                            paymentsUSD: cd.payments,
                            outstandingUSD: outstanding,
                            paidPct,
                        });
                    }
                }

                clientSummaries.sort((a, b) => b.outstandingUSD - a.outstandingUSD);

                // Mesos distribution (include all, filter display > 0.5B in render)
                const accountRows: AccountRow[] = [
                    { name: 'Vault', subtitle: 'Shared', mesos: sharedInventory?.mesos_stock || 0, isVault: true },
                ];
                accounts
                    .filter(acc => (acc.mesos_b || 0) > 0)
                    .sort((a, b) => {
                        const aIsMain = a.email?.includes('alvarodelrioacosta@gmail.com');
                        const bIsMain = b.email?.includes('alvarodelrioacosta@gmail.com');
                        if (aIsMain && !bIsMain) return -1;
                        if (!aIsMain && bIsMain) return 1;
                        return (b.mesos_b || 0) - (a.mesos_b || 0);
                    })
                    .forEach(acc => {
                        const displayName = acc.tag || (acc.email?.split('@')[0] || `Account ${acc.number}`);
                        accountRows.push({
                            name: displayName,
                            subtitle: `Acc ${String(acc.number).padStart(2, '0')}`,
                            mesos: acc.mesos_b || 0,
                        });
                    });

                const netWorthUSD = stockValueUSD + totalResourceValueUSD + totalMesosValueUSD + outstandingReceivablesUSD;

                setData({
                    netWorthUSD,
                    stockValueUSD,
                    totalStockMesos,
                    totalMesosValueUSD,
                    totalMesosSum,
                    outstandingReceivablesUSD,
                    pendingCount: clientSummaries.length,
                    mesoUsdRate,
                    clientSummaries,
                    accountRows,
                    topForSaleItems,
                    totalForSaleMesos,
                });
            } catch (error) {
                console.error('Error loading KPIs:', error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) return <LoadingScreen message="Preparando tu Dashboard..." />;
    if (!data) return null;

    const toggle = () => setShowMesos(m => !m);

    const stockDisplay = showMesos
        ? formatB(parseFloat(data.totalStockMesos.toFixed(1)))
        : formatUSD(data.stockValueUSD);
    const receivablesDisplay = showMesos
        ? formatB(parseFloat((data.outstandingReceivablesUSD / (data.mesoUsdRate || 1)).toFixed(1)))
        : formatUSD(data.outstandingReceivablesUSD);
    const cashDisplay = showMesos
        ? formatB(parseFloat(data.totalMesosSum.toFixed(1)))
        : formatUSD(data.totalMesosValueUSD);

    const visibleAccountRows = data.accountRows.filter(r => r.isVault || r.mesos > 0.5);

    return (
        <div className="dashboard">
            <Header title="Dashboard" subtitle="Overview of your game inventory" />

            <div className="dashboard__content">
                {/* KPI Cards */}
                <div className="dash-kpis">
                    <div className="dash-kpi" onClick={toggle} style={{ cursor: 'pointer' }}>
                        <span className="dash-kpi__label">NET WORTH</span>
                        <span className="dash-kpi__value">{formatUSD(data.netWorthUSD)}</span>
                    </div>
                    <div className="dash-kpi" onClick={toggle} style={{ cursor: 'pointer' }}>
                        <span className="dash-kpi__label">STOCK (B MESOS)</span>
                        <span className="dash-kpi__value">{stockDisplay}</span>
                    </div>
                    <div className="dash-kpi" onClick={toggle} style={{ cursor: 'pointer' }}>
                        <span className="dash-kpi__label">RECEIVABLES</span>
                        <span className="dash-kpi__value">{receivablesDisplay}</span>
                    </div>
                    <div className="dash-kpi" onClick={toggle} style={{ cursor: 'pointer' }}>
                        <span className="dash-kpi__label">CASH MESOS</span>
                        <span className="dash-kpi__value">{cashDisplay}</span>
                    </div>
                </div>

                {/* Bottom sections */}
                <div className="dash-bottom">
                    {/* Receivables Pending */}
                    <div className="dash-section">
                        <div className="dash-section__header">
                            <span className="dash-section__title">RECEIVABLES (PENDING)</span>
                            <span className="dash-section__badge">{data.pendingCount} pending</span>
                        </div>
                        {data.clientSummaries.length === 0 ? (
                            <p className="dash-empty">No pending receivables</p>
                        ) : (
                            data.clientSummaries.map(client => (
                                <div className="dash-client-row" key={client.name}>
                                    <div className="dash-client-row__meta">
                                        <span className="dash-client-row__name">{client.name}</span>
                                    </div>
                                    <div className="dash-progress-wrap">
                                        <div className="dash-progress">
                                            <div
                                                className="dash-progress__fill"
                                                style={{ width: `${client.paidPct}%` }}
                                            />
                                        </div>
                                        <span className="dash-progress__label">{Math.round(client.paidPct)}% paid</span>
                                    </div>
                                    <span className="dash-client-row__amount">
                                        {formatUSD(client.outstandingUSD)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Mesos Distribution */}
                    <div className="dash-section">
                        <div className="dash-section__header">
                            <span className="dash-section__title">MESOS DISTRIBUTION</span>
                            <span className="dash-section__total">{formatB(parseFloat(data.totalMesosSum.toFixed(1)))}</span>
                        </div>
                        {visibleAccountRows.map((acc, i) => (
                            <div className="dash-account-row" key={acc.name + i}>
                                <div className="dash-account-row__meta">
                                    <span className="dash-account-row__name">{acc.name}</span>
                                    <span className="dash-account-row__sub">{acc.subtitle}</span>
                                </div>
                                <span className="dash-account-row__amount">{formatB(parseFloat(acc.mesos.toFixed(2)))}</span>
                            </div>
                        ))}
                    </div>

                    {/* Top Items for Sale */}
                    <div className="dash-section">
                        <div className="dash-section__header">
                            <span className="dash-section__title">TOP ITEMS FOR SALE</span>
                            <span className="dash-section__total">{formatB(parseFloat(data.totalForSaleMesos.toFixed(1)))}</span>
                        </div>
                        {data.topForSaleItems.length === 0 ? (
                            <p className="dash-empty">No items for sale</p>
                        ) : (
                            data.topForSaleItems.map((item, i) => (
                                <div className="dash-item-row" key={item.name + i}>
                                    <span className="dash-item-row__name">{item.name}</span>
                                    <span className="dash-item-row__amount">{formatB(parseFloat(item.valueMesos.toFixed(1)))}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
