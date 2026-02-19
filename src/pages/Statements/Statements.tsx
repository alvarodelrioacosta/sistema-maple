import React, { useState, useEffect } from 'react';
import { Header } from '../../components/Layout';
import { Table, Select, Card, KPICard, Button } from '../../components/UI';
import { clientsService, transactionsService, accountsReceivableService, exchangeRatesService } from '../../services';
import { Client, TransactionWithRelations, AccountReceivable, ExchangeRate, TransactionMeso } from '../../types';
import { AgreementModal } from './AgreementModal';
import '../Finance/Finance.css'; // Reuse finance styles

// Union type for the combined list
type StatementItem =
    | (TransactionWithRelations & { recordType: 'transaction' })
    | (TransactionMeso & { recordType: 'meso_transaction' })
    | (AccountReceivable & { recordType: 'receivable' });

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${currency}`;
};

const formatDateLocal = (dateStr: string | null) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        // Return DD/MM
        return `${parts[2]}/${parts[1]}`;
    }
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getDateColor = (dateStr: string | null) => {
    if (!dateStr) return '#94a3b8';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '#94a3b8';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#ef4444'; // Red if passed
    if (diffDays <= 3) return '#f59e0b'; // Yellow if within 3 days
    return '#8b5cf6'; // Default Purple
};

export const Statements: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [statementData, setStatementData] = useState<StatementItem[]>([]);
    const [allReceivables, setAllReceivables] = useState<AccountReceivable[]>([]);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'Mesos (b)'>('USD');
    const [loading, setLoading] = useState(false);

    // Agreement Modal State
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
    const [selectedClientForAgreement, setSelectedClientForAgreement] = useState<Client | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedClientId) {
            loadStatementData(selectedClientId);
        } else {
            setStatementData([]);
        }
    }, [selectedClientId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [clientsData, ratesData, receivablesData] = await Promise.all([
                clientsService.getAll(),
                exchangeRatesService.getAll(),
                accountsReceivableService.getAll()
            ]);
            setClients(clientsData);
            setExchangeRates(ratesData);
            setAllReceivables(receivablesData);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getExchangeRate = (from: string, to: string): number => {
        if (!from || !to || from === to) return 1;
        const f = from === '$' ? 'USD' : from;
        const t = to === '$' ? 'USD' : to;
        if (f === t) return 1;

        const direct = exchangeRates.find(r => r.base_currency === f && r.target_currency === t);
        if (direct) return direct.rate;

        const inverse = exchangeRates.find(r => r.base_currency === t && r.target_currency === f);
        if (inverse && inverse.rate > 0) return 1 / inverse.rate;

        // Bridge through USD if neither found
        if (f !== 'USD' && t !== 'USD') {
            const fToUSD = getExchangeRate(f, 'USD');
            const USDtoT = getExchangeRate('USD', t);
            return fToUSD * USDtoT;
        }

        return 1;
    };

    const getRateToUSD = (currency: string) => {
        return getExchangeRate(currency, 'USD');
    };

    const loadStatementData = async (clientId: string) => {
        setLoading(true);
        try {
            const [transactions, mesoTransactions, receivables] = await Promise.all([
                transactionsService.getByClient(clientId),
                transactionsService.getMesosByClient(clientId),
                accountsReceivableService.getByClient(clientId)
            ]);

            // Filter transactions: only show those linked to an AR
            const filteredTransactions = transactions.filter(t => t.account_receivable_id);
            const filteredMesoTransactions = mesoTransactions.filter(t => t.account_receivable_id);

            // Transform and combine
            const combined: StatementItem[] = [
                ...filteredTransactions.map(t => ({ ...t, recordType: 'transaction' as const })),
                ...filteredMesoTransactions.map(t => ({ ...t, recordType: 'meso_transaction' as const })),
                ...receivables.map(ar => ({ ...ar, recordType: 'receivable' as const }))
            ];

            // Sort by date ascending (Oldest to Newest)
            combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            setStatementData(combined);
        } catch (error) {
            console.error('Error loading statement data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate outstanding balances per client when no client is selected
    const clientBalances = clients.map(client => {
        const clientARs = allReceivables.filter(ar => ar.client_id === client.id && ar.status !== 'paid');
        const balanceUSD = clientARs.reduce((sum, ar) => {
            const balance = ar.amount - (ar.paid || 0);
            if (balance <= 0) return sum;
            const rate = getRateToUSD(ar.currency || client.currency || 'USD');
            return sum + (balance * rate);
        }, 0);
        return { client, balanceUSD };
    }).filter(item => item.balanceUSD > 0.01)
        .sort((a, b) => b.balanceUSD - a.balanceUSD);

    // Clients with upcoming payments (those with balance > 0 and next_payment_date)
    const upcomingPayments = clientBalances
        .filter(item => item.client.next_payment_date)
        .sort((a, b) => {
            if (!a.client.next_payment_date) return 1;
            if (!b.client.next_payment_date) return -1;
            return new Date(a.client.next_payment_date).getTime() - new Date(b.client.next_payment_date).getTime();
        });

    const handleEditAgreement = (client: Client, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedClientForAgreement(client);
        setIsAgreementModalOpen(true);
    };

    const columns = [
        {
            key: 'created_at',
            header: 'Date',
            render: (item: StatementItem) => {
                const d = new Date(item.created_at);
                return d.toLocaleDateString(); // Date only as requested
            }
        },
        {
            key: 'recordType',
            header: 'Record Type',
            render: (item: StatementItem) => (
                <span className={`badge ${item.recordType === 'transaction' ? 'badge-info' : (item.recordType === 'meso_transaction' ? 'badge-indigo' : 'badge-warning')}`}>
                    {item.recordType === 'transaction' ? 'Transaction' : (item.recordType === 'meso_transaction' ? 'Meso Transaction' : 'Receivable')}
                </span>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: (item: StatementItem) => {
                return (
                    <div>
                        <strong>{item.description}</strong>
                    </div>
                );
            }
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (item: StatementItem) => {
                const isTransaction = item.recordType === 'transaction' || item.recordType === 'meso_transaction';
                let value = isTransaction ? -item.amount : item.amount;

                // Convert receivables to displayCurrency if it's Mesos (b)
                if (item.recordType === 'receivable' && displayCurrency === 'Mesos (b)') {
                    const currentCurrency = (item as AccountReceivable).currency || 'USD';
                    value *= getExchangeRate(currentCurrency, 'Mesos (b)');
                }

                const color = value < 0 ? '#ef4444' : '#22c55e';
                const prefix = value < 0 ? '' : '+';
                const formattedNum = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {prefix}{value < 0 ? '-' : ''}{formattedNum}
                    </span>
                );
            }
        },
        {
            key: 'currency',
            header: 'Currency',
            render: (item: StatementItem) => {
                if (item.recordType === 'meso_transaction') return 'Mesos (b)';
                if (item.recordType === 'receivable') return displayCurrency;
                const currency = (item as any).currency || (item as any).financial_account?.currency || 'USD';
                return currency;
            }
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: StatementItem) => {
                if (item.recordType === 'receivable') {
                    const ar = item as AccountReceivable;
                    let balance = ar.amount - (ar.paid || 0);
                    let currency = ar.currency;

                    if (displayCurrency === 'Mesos (b)') {
                        balance *= getExchangeRate(currency, 'Mesos (b)');
                        currency = 'Mesos (b)';
                    }

                    return balance <= 0.01
                        ? <span className="badge badge-success">Paid</span>
                        : <span className="badge badge-danger">Pending: {formatCurrency(balance, currency)}</span>;
                }
                return null;
            }
        }
    ];

    const upcomingColumns = [
        {
            key: 'next_payment_date',
            header: 'Tentative Date',
            render: (item: any) => {
                const dateStr = item.client.next_payment_date;
                if (!dateStr) return <span style={{ color: '#64748b' }}>Not set</span>;
                const statusColor = getDateColor(dateStr);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: statusColor }}>📅</span>
                        <strong style={{ color: statusColor }}>{formatDateLocal(dateStr)}</strong>
                    </div>
                );
            }
        },
        {
            key: 'client',
            header: 'Client',
            render: (item: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        {item.client.name.substring(0, 1).toUpperCase()}
                    </div>
                    <strong>{item.client.name}</strong>
                </div>
            )
        },
        {
            key: 'balance',
            header: 'Total Debt (USD)',
            render: (item: any) => (
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                    ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.balanceUSD)}
                </span>
            )
        },
        {
            key: 'agreement',
            header: 'Agreement / Note',
            render: (item: any) => (
                <div style={{
                    maxWidth: '400px',
                    fontSize: '0.9rem',
                    color: item.client.payment_agreement ? '#e2e8f0' : '#64748b',
                    fontStyle: item.client.payment_agreement ? 'normal' : 'italic'
                }}>
                    {item.client.payment_agreement || 'No agreement registered'}
                </div>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (item: any) => (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleEditAgreement(item.client, e)}
                    style={{ padding: '4px 12px' }}
                >
                    Edit
                </Button>
            )
        }
    ];

    return (
        <div className="finance-page">
            <Header
                title="Client Statements"
                subtitle="View transaction history per client"
            />

            <div style={{ padding: '0 2rem', marginBottom: '1rem', maxWidth: '400px' }}>
                <Select
                    label="Select Client"
                    value={selectedClientId}
                    onChange={setSelectedClientId}
                    options={[
                        { value: '', label: 'Select a client...' },
                        ...clients.map(c => ({ value: c.id, label: c.name }))
                    ]}
                />
            </div>

            {/* Outstanding Balance KPIs when no client is selected */}
            {!selectedClientId && clientBalances.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '12px',
                    padding: '0 2rem',
                    marginBottom: '2rem'
                }}>
                    {clientBalances.map(({ client, balanceUSD }) => (
                        <div key={client.id} onClick={() => setSelectedClientId(client.id)} style={{ cursor: 'pointer' }}>
                            <KPICard
                                title={client.name}
                                value={`$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceUSD)}`}
                                icon="💎"
                                color="primary"
                                style={{
                                    padding: '12px',
                                    '--kpi-value-size': '1.1rem',
                                    '--kpi-icon-container-size': '30px',
                                    '--kpi-icon-size': '1rem',
                                    '--kpi-header-gap': '8px'
                                } as any}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Balance and Agreement Header Container */}
            {selectedClientId && (
                <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '1.5rem',
                    margin: '0 2rem 1.5rem 2rem',
                }}>
                    {/* Balance Summary Card */}
                    {(() => {
                        const totalBalance = statementData.reduce((acc, item) => {
                            const isTransaction = item.recordType === 'transaction' || item.recordType === 'meso_transaction';
                            let currency = 'USD';
                            if (item.recordType === 'meso_transaction') {
                                currency = 'Mesos (b)';
                            } else if (item.recordType === 'transaction') {
                                currency = (item as any).currency || (item as any).financial_account?.currency || 'USD';
                            } else if (item.recordType === 'receivable') {
                                currency = (item as any).currency || 'USD';
                            }

                            const rate = getExchangeRate(currency, displayCurrency);
                            const amountInDisplay = item.amount * rate;

                            return isTransaction ? acc - amountInDisplay : acc + amountInDisplay;
                        }, 0);

                        return (
                            <div
                                onClick={() => setDisplayCurrency(prev => prev === 'USD' ? 'Mesos (b)' : 'USD')}
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    background: totalBalance <= 0.01 ? '#065f46' : '#0f172a',
                                    borderRadius: '12px',
                                    borderLeft: totalBalance <= 0.01 ? '4px solid #4ade80' : '4px solid #8b5cf6',
                                    minWidth: '280px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'transform 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {totalBalance <= 0.01 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.5em' }}>🎉</span>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#4ade80' }}>No Outstanding Balance!</div>
                                            <div style={{ fontSize: '0.9em', color: '#a7f3d0' }}>This client is all paid up</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.2em' }}>💎</span>
                                            <span style={{ fontSize: '0.9em', color: '#94a3b8' }}>Outstanding Balance ({displayCurrency})</span>
                                        </div>
                                        <div style={{ fontSize: '1.75em', fontWeight: 'bold', color: '#f1f5f9' }}>
                                            {displayCurrency === 'USD' ? '$' : ''}
                                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
                                            {displayCurrency === 'Mesos (b)' ? ' b' : ''}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Agreement Summary Card - Now on the right */}
                    {(() => {
                        const client = clients.find(c => c.id === selectedClientId);
                        if (!client) return null;

                        return (
                            <div style={{
                                flex: 1,
                                padding: '1rem 1.5rem',
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '20px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '1.1em' }}>📝</span>
                                        <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Payment Agreement
                                        </span>
                                    </div>
                                    <div style={{ color: '#f1f5f9', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                        {client.payment_agreement ? (
                                            <>
                                                {client.next_payment_date && (
                                                    <span style={{ color: getDateColor(client.next_payment_date), fontWeight: 'bold', marginRight: '8px' }}>
                                                        [{formatDateLocal(client.next_payment_date)}]
                                                    </span>
                                                )}
                                                {client.payment_agreement}
                                            </>
                                        ) : (
                                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>No agreement registered yet.</span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleEditAgreement(client)}
                                    style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                                >
                                    Update Agreement
                                </Button>
                            </div>
                        );
                    })()}
                </div>
            )}

            <div className="page-content">
                {!selectedClientId && upcomingPayments.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9' }}>Upcoming Collections</h2>
                            <span className="badge badge-info">{upcomingPayments.length} Pending Agreements</span>
                        </div>
                        <Card padding="none">
                            <Table
                                data={upcomingPayments}
                                columns={upcomingColumns}
                                keyExtractor={(item) => item.client.id}
                                onRowClick={(item) => setSelectedClientId(item.client.id)}
                            />
                        </Card>
                    </div>
                )}

                {selectedClientId && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9' }}>
                                Individual Movement History
                            </h2>
                        </div>
                        <Card padding="none">
                            <Table
                                data={statementData}
                                columns={columns}
                                keyExtractor={(item) => item.id}
                                loading={loading}
                                emptyMessage="No records found for this client."
                            />
                        </Card>
                    </>
                )}
            </div>

            <AgreementModal
                isOpen={isAgreementModalOpen}
                onClose={() => setIsAgreementModalOpen(false)}
                onSuccess={loadInitialData}
                client={selectedClientForAgreement}
            />
        </div>
    );
};

export default Statements;
