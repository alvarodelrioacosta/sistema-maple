import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button } from '../../components/UI';
import { clientLedgerService, clientsService, appSettingsService } from '../../services';
import type { Client, ClientLedgerEntry, CurrencyBalance, LedgerEntryType } from '../../types';
import { AddEntryModal } from './AddEntryModal';
import { EditEntryModal } from './EditEntryModal';
import { CubeSessionDetailModal } from './CubeSessionDetailModal';
import './AccountsReceivableV2.css';

// ---- Formatters ----

const CURRENCY_PREFIX: Record<string, string> = {
    USD: '$',
    'Mesos (b)': '',
};

const CURRENCY_SUFFIX: Record<string, string> = {
    'Mesos (b)': ' b',
};

function formatAmount(amount: number, currency: string): string {
    const prefix = CURRENCY_PREFIX[currency] ?? '';
    const suffix = CURRENCY_SUFFIX[currency] ?? '';
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(amount);
    return `${prefix}${formatted}${suffix}`;
}

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

// ---- Component ----

export const AccountsReceivableV2: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [allEntries, setAllEntries] = useState<ClientLedgerEntry[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mesoUsdRate, setMesoUsdRate] = useState(1);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addModalDefaultType, setAddModalDefaultType] = useState<LedgerEntryType>('charge');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ClientLedgerEntry | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailEntry, setDetailEntry] = useState<ClientLedgerEntry | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [clientsData, entriesData, rate] = await Promise.all([
                clientsService.getAll(),
                clientLedgerService.getAll(),
                appSettingsService.getMesoUsdRate(),
            ]);
            setClients(clientsData);
            setAllEntries(entriesData);
            setMesoUsdRate(rate ?? 1);
            setSelectedClientId(prev => prev ?? (clientsData[0]?.id ?? null));
        } catch (err) {
            console.error('Error loading ledger data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Per-client balance summary (used in sidebar)
    const clientBalanceSummary = useMemo(() => {
        const map = new Map<string, Map<string, CurrencyBalance>>();
        for (const entry of allEntries) {
            if (!map.has(entry.client_id)) map.set(entry.client_id, new Map());
            const currMap = map.get(entry.client_id)!;
            if (!currMap.has(entry.currency)) {
                currMap.set(entry.currency, { currency: entry.currency, totalCharges: 0, totalPayments: 0, balance: 0 });
            }
            const bal = currMap.get(entry.currency)!;
            if (entry.entry_type === 'charge') bal.totalCharges += entry.amount;
            else bal.totalPayments += entry.amount;
            bal.balance = bal.totalCharges - bal.totalPayments;
        }
        const result = new Map<string, CurrencyBalance[]>();
        for (const [cid, currMap] of map.entries()) {
            result.set(cid, [...currMap.values()]);
        }
        return result;
    }, [allEntries]);

    const sortedClients = useMemo(() => {
        const toUSD = (bals: CurrencyBalance[]) => {
            let total = 0;
            for (const bal of bals) {
                if (bal.balance <= 0) continue;
                if (bal.currency === 'USD') total += bal.balance;
                else if (bal.currency === 'Mesos (b)') total += bal.balance * mesoUsdRate;
                else total += 0.0001; // unknown currency: positive sentinel to keep in debt tier
            }
            return total;
        };
        return [...clients].sort((a, b) => {
            const equivA = toUSD(clientBalanceSummary.get(a.id) ?? []);
            const equivB = toUSD(clientBalanceSummary.get(b.id) ?? []);
            if (equivA > 0 && equivB > 0) return equivB - equivA;
            if (equivA > 0) return -1;
            if (equivB > 0) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [clients, clientBalanceSummary, mesoUsdRate]);

    const selectedClientEntries = useMemo(() => {
        if (!selectedClientId) return [];
        return allEntries
            .filter(e => e.client_id === selectedClientId)
            .slice()
            .sort((a, b) => {
                const dc = a.entry_date.localeCompare(b.entry_date);
                return dc !== 0 ? dc : a.created_at.localeCompare(b.created_at);
            });
    }, [allEntries, selectedClientId]);

    const selectedClientBalances = useMemo(
        () => (selectedClientId ? clientBalanceSummary.get(selectedClientId) ?? [] : []),
        [clientBalanceSummary, selectedClientId]
    );

    const selectedClient = useMemo(
        () => clients.find(c => c.id === selectedClientId) ?? null,
        [clients, selectedClientId]
    );

    // ---- Handlers ----

    const openAddModal = (type: LedgerEntryType) => {
        setAddModalDefaultType(type);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this entry? This cannot be undone.')) return;
        try {
            await clientLedgerService.deleteEntry(id);
            setAllEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete entry.');
        }
    };

    const handleEntryAdded = (entry: ClientLedgerEntry) => {
        setAllEntries(prev => [...prev, entry]);
        setIsAddModalOpen(false);
    };

    const handleEntryUpdated = (updated: ClientLedgerEntry) => {
        setAllEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        setIsEditModalOpen(false);
        setEditingEntry(null);
    };

    // ---- Render ----

    if (loading) {
        return (
            <div className="arv2-page">
                <Header title="AR v2" subtitle="Client ledger" />
                <div className="arv2-empty">Loading...</div>
            </div>
        );
    }

    return (
        <div className="arv2-page">
            <Header title="AR v2" subtitle="Client-centric ledger view" />

            <div className="arv2-layout">
                {/* Left: client list */}
                <aside className="arv2-sidebar">
                    <div className="arv2-sidebar__title">Clients</div>
                    {sortedClients.map(client => {
                        const balances = clientBalanceSummary.get(client.id) ?? [];
                        const hasBalance = balances.some(b => b.balance !== 0);
                        return (
                            <div
                                key={client.id}
                                className={`arv2-client-card${selectedClientId === client.id ? ' arv2-client-card--active' : ''}`}
                                onClick={() => setSelectedClientId(client.id)}
                            >
                                <span className="arv2-client-name">{client.name}</span>
                                {balances.length > 0 && (
                                    <div className="arv2-balance-chips">
                                        {balances.map(bal => (
                                            <span
                                                key={bal.currency}
                                                className={`arv2-balance-chip${bal.balance > 0.001 ? ' arv2-balance-chip--owed' : ' arv2-balance-chip--zero'}`}
                                            >
                                                {formatAmount(bal.balance, bal.currency)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {!hasBalance && balances.length === 0 && (
                                    <span className="arv2-balance-chip arv2-balance-chip--zero">No entries</span>
                                )}
                            </div>
                        );
                    })}
                </aside>

                {/* Right: ledger detail */}
                <main className="arv2-main">
                    {!selectedClient ? (
                        <div className="arv2-empty">Select a client to view their ledger.</div>
                    ) : (
                        <>
                            <div className="arv2-main__header">
                                <h2>{selectedClient.name}</h2>
                                <div className="arv2-main__actions">
                                    <Button onClick={() => openAddModal('charge')}>+ Add Charge</Button>
                                    <Button variant="secondary" onClick={() => openAddModal('payment')}>Record Payment</Button>
                                </div>
                            </div>

                            {selectedClientEntries.length === 0 ? (
                                <div className="arv2-empty">No entries yet. Add a charge or record a payment.</div>
                            ) : (
                                <div className="arv2-table-wrap">
                                    <table className="arv2-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Currency</th>
                                                <th>Type</th>
                                                <th>Notes</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedClientEntries.map(entry => (
                                                <tr key={entry.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(entry.entry_date)}</td>
                                                    <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{entry.description}</td>
                                                    <td className={`arv2-amount--${entry.entry_type}`}>
                                                        {entry.entry_type === 'payment' ? '−' : ''}
                                                        {formatAmount(entry.amount, entry.currency)}
                                                    </td>
                                                    <td>{entry.currency}</td>
                                                    <td>
                                                        <span className={`arv2-badge arv2-badge--${entry.entry_type}`}>
                                                            {entry.entry_type === 'charge' ? 'Charge' : 'Payment'}
                                                        </span>
                                                    </td>
                                                    <td className="arv2-notes">{entry.notes || '—'}</td>
                                                    <td>
                                                        <div className="arv2-actions">
                                                            {entry.cube_session_id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => { setDetailEntry(entry); setIsDetailOpen(true); }}
                                                                >
                                                                    Detail
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setEditingEntry(entry);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => handleDelete(entry.id)}
                                                            >
                                                                Del
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {selectedClientBalances.length > 0 && (
                                <div className="arv2-balance-footer">
                                    <div className="arv2-balance-footer__title">Balance Summary</div>
                                    {selectedClientBalances.map(bal => (
                                        <div key={bal.currency} className="arv2-balance-row">
                                            <span>
                                                <span className="arv2-balance-row__label">Charges:</span>
                                                {formatAmount(bal.totalCharges, bal.currency)}
                                            </span>
                                            <span>
                                                <span className="arv2-balance-row__label">Payments:</span>
                                                {formatAmount(bal.totalPayments, bal.currency)}
                                            </span>
                                            <span className={bal.balance > 0.001 ? 'arv2-balance--owed' : 'arv2-balance--settled'}>
                                                <span className="arv2-balance-row__label">Balance:</span>
                                                {formatAmount(bal.balance, bal.currency)} {bal.currency}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            <AddEntryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleEntryAdded}
                defaultClientId={selectedClientId}
                defaultType={addModalDefaultType}
                clients={clients}
            />

            <EditEntryModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingEntry(null); }}
                entry={editingEntry}
                onSuccess={handleEntryUpdated}
            />

            <CubeSessionDetailModal
                isOpen={isDetailOpen}
                onClose={() => { setIsDetailOpen(false); setDetailEntry(null); }}
                entry={detailEntry}
            />
        </div>
    );
};

export default AccountsReceivableV2;
