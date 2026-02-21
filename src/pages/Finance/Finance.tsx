import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Select, Card, KPICard } from '../../components/UI';
import { transactionsService, financialAccountsService, exchangeRatesService, accountsService, sharedInventoryService, clientsService, accountsReceivableService } from '../../services';
import type { Transaction, TransactionInsert, TransactionType, FinancialAccount, ExchangeRate, Account, TransactionMeso, SharedInventory } from '../../types';
import { CURRENCIES } from '../../constants/currencies';
import { formatCurrencyValue } from '../../utils/format';
import type { Column } from '../../components/UI/Table';
import { FINANCE_CATEGORIES, CATEGORY_MAP } from '../../utils/categorization';
import { ocrUtil } from '../../utils/ocr';
import Tesseract from 'tesseract.js';
import { EditTransactionModal } from './EditTransactionModal';
import './Finance.css';

const TYPE_OPTIONS = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' }
];

const ACCOUNT_SORT_ORDER = ['Binance', 'PPFF', 'PayPal', 'Efectivo Dolares', 'Mercado Pago', 'Efectivo', 'Soles', 'BCP'];

export const Finance: React.FC = () => {
    // View state
    const [viewMode, setViewMode] = useState<'financial' | 'mesos'>('financial');

    // Data states
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mesoTransactions, setMesoTransactions] = useState<TransactionMeso[]>([]);
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [gameAccounts, setGameAccounts] = useState<Account[]>([]);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [mesoModalOpen, setMesoModalOpen] = useState(false);

    // Financial Summary State
    const [totalIncome, setTotalIncome] = useState<{ USD: number, Mesos: number }>({ USD: 0, Mesos: 0 });
    const [totalExpense, setTotalExpense] = useState<{ USD: number, Mesos: number }>({ USD: 0, Mesos: 0 });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [kpiMode, setKpiMode] = useState<'summary' | 'balances'>('summary');


    const [formData, setFormData] = useState<TransactionInsert & { target_financial_account_id?: string | null, actual_amount_received?: number }>({
        type: 'income',
        amount: undefined as any, // Cambiado a undefined para que el input muestre el placeholder
        currency: 'USD',
        description: '',
        item_id: null,
        client_id: null,
        is_credit_sale: false,
        is_paid: true,
        financial_account_id: null,
        target_financial_account_id: null,
        actual_amount_received: 0,
        category: '',
        subcategory: ''
    });
    const [scannedExpenses, setScannedExpenses] = useState<Partial<TransactionInsert>[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [trxData, mesoTrxData, accountsData, gameAccountsData, ratesData, sharedData, clientsData] = await Promise.all([
                transactionsService.getAll(),
                transactionsService.getAllMesos(),
                financialAccountsService.getAll(),
                accountsService.getAll(),
                exchangeRatesService.getAll(),
                sharedInventoryService.get().catch(() => null),
                clientsService.getAll()
            ]);
            const enrichedAccounts = accountsData.map(acc => {
                const balance = trxData
                    .filter(t => t.financial_account_id === acc.id)
                    .reduce((total, t) => {
                        if (t.type === 'income') return total + t.amount;
                        if (t.type === 'expense') return total - t.amount;
                        if (t.type === 'transfer') {
                            if (t.description?.toLowerCase().includes('transfer from')) return total + t.amount;
                            if (t.description?.toLowerCase().includes('transfer to')) return total - t.amount;
                        }
                        return total;
                    }, 0);
                return { ...acc, balance };
            });

            setTransactions(trxData);
            setMesoTransactions(mesoTrxData);
            setFinancialAccounts(enrichedAccounts);
            setGameAccounts(gameAccountsData);
            setExchangeRates(ratesData);
            setSharedChest(sharedData);
            setClients(clientsData);
            calculateTotals(trxData, mesoTrxData, ratesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (trx: Transaction[], mesoTrx: TransactionMeso[], ratesData: ExchangeRate[]) => {
        let incUSD = 0, incMesos = 0;
        let expUSD = 0, expMesos = 0;

        const getRateToUSD = (currency: string) => {
            if (currency === 'USD' || currency === '$') return 1;
            const rate = ratesData.find(r => r.base_currency === currency && r.target_currency === 'USD');
            if (rate) return rate.rate;
            const inverse = ratesData.find(r => r.base_currency === 'USD' && r.target_currency === currency);
            if (inverse && inverse.rate > 0) return 1 / inverse.rate;
            return 1;
        };

        trx.forEach(t => {
            if (t.currency === 'Mesos (b)') return;
            // Only count genuine income/expense, ignore transfers for KPIs
            if (t.type !== 'income' && t.type !== 'expense') return;

            const rate = getRateToUSD(t.currency);
            const amountUSD = Number(t.amount) * rate;

            if (t.type === 'income') incUSD += amountUSD;
            else if (t.type === 'expense') expUSD += amountUSD;
        });

        mesoTrx.forEach(t => {
            if (t.type !== 'income' && t.type !== 'expense') return;
            const amount = Number(t.amount);
            if (t.type === 'income') incMesos += amount;
            else if (t.type === 'expense') expMesos += amount;
        });

        setTotalIncome({ USD: incUSD, Mesos: incMesos });
        setTotalExpense({ USD: expUSD, Mesos: expMesos });
    };

    // Reactively compute filtered data and update totals
    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = !searchTerm ||
                t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.financial_account?.name.toLowerCase().includes(searchTerm.toLowerCase());

            const tDate = new Date(t.created_at).setHours(0, 0, 0, 0);
            const matchesStart = !dateRange.start || tDate >= new Date(dateRange.start).setHours(0, 0, 0, 0);
            const matchesEnd = !dateRange.end || tDate <= new Date(dateRange.end).setHours(0, 0, 0, 0);

            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [transactions, searchTerm, dateRange]);

    const filteredMesoTransactions = React.useMemo(() => {
        return mesoTransactions.filter(t => {
            const matchesSearch = !searchTerm ||
                t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.account as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const tDate = new Date(t.created_at).setHours(0, 0, 0, 0);
            const matchesStart = !dateRange.start || tDate >= new Date(dateRange.start).setHours(0, 0, 0, 0);
            const matchesEnd = !dateRange.end || tDate <= new Date(dateRange.end).setHours(0, 0, 0, 0);

            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [mesoTransactions, searchTerm, dateRange]);

    // Update totals when filtered data changes
    useEffect(() => {
        calculateTotals(filteredTransactions, filteredMesoTransactions, exchangeRates);
    }, [filteredTransactions, filteredMesoTransactions, exchangeRates]);


    const handleOpenModal = () => {
        setFormData({
            type: 'income',
            amount: undefined as any,
            currency: 'USD',
            description: '',
            item_id: null,
            client_id: null,
            is_credit_sale: false,
            is_paid: true,
            financial_account_id: null,
            target_financial_account_id: null,
            actual_amount_received: undefined as any,
            category: '',
            subcategory: ''
        });
        setScannedExpenses([]);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setScannedExpenses([]);
    };

    // Meso Modal Logic
    const [mesoFormData, setMesoFormData] = useState<{
        account_id: string;
        target_account_id: string;
        type: 'income' | 'expense' | 'transfer';
        amount: number;
        description: string;
        category: string;
        subcategory: string;
    }>({
        account_id: '',
        target_account_id: '',
        type: 'income',
        amount: 0,
        description: '',
        category: '',
        subcategory: ''
    });

    const handleOpenMesoModal = () => {
        setMesoFormData({
            account_id: gameAccounts[0]?.id || '',
            target_account_id: '',
            type: 'income',
            amount: 0,
            description: '',
            category: '',
            subcategory: ''
        });
        setMesoModalOpen(true);
    };

    const handleCloseMesoModal = () => setMesoModalOpen(false);

    // Exchange Modal Logic
    const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
    const [exchangeData, setExchangeData] = useState({
        type: 'buy' as 'buy' | 'sell',
        financial_account_id: '',
        game_account_id: '',
        amount_real: 0,
        amount_mesos: 0,
        is_credit_sale: false,
        client_id: ''
    });

    const handleOpenExchangeModal = () => {
        setExchangeData({
            type: 'buy',
            financial_account_id: '',
            game_account_id: '',
            amount_real: 0,
            amount_mesos: 0,
            is_credit_sale: false,
            client_id: ''
        });
        setExchangeModalOpen(true);
    };

    const handleCloseExchangeModal = () => setExchangeModalOpen(false);

    const handleExchangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (!exchangeData.is_credit_sale && !exchangeData.financial_account_id) {
                alert('Please select a Financial Account');
                return;
            }
            if (exchangeData.is_credit_sale && !exchangeData.client_id) {
                alert('Please select a Client for the credit sale');
                return;
            }
            if (!exchangeData.game_account_id) {
                alert('Please select a Game Account');
                return;
            }

            const isBuy = exchangeData.type === 'buy';
            const finAcc = financialAccounts.find(a => a.id === exchangeData.financial_account_id);
            const gameAccId = exchangeData.game_account_id === 'shared-vault' ? null : exchangeData.game_account_id;
            const isVault = exchangeData.game_account_id === 'shared-vault';

            if (isBuy) {
                // BUY MESOS: Real Money -> Mesos (with fee)
                // 1. Financial deduction
                await transactionsService.create({
                    financial_account_id: exchangeData.financial_account_id,
                    type: 'expense',
                    amount: exchangeData.amount_real,
                    currency: finAcc?.currency || 'USD',
                    description: `Buy Mesos: ${exchangeData.amount_mesos} b`,
                    is_paid: true
                } as any);
                // 2. Meso Income
                await transactionsService.createMeso({
                    account_id: gameAccId,
                    type: 'income',
                    amount: exchangeData.amount_mesos,
                    description: `Meso Purchase (${exchangeData.amount_real} ${finAcc?.currency || 'USD'})`
                });

                // 3. Trade Fee (5%)
                const fee = exchangeData.amount_mesos * 0.05;
                await transactionsService.createMeso({
                    account_id: gameAccId,
                    type: 'expense',
                    amount: fee,
                    description: `Trade Fee (5%) for Meso Purchase`
                });

                // 4. Update Game balance
                if (isVault) {
                    const current = sharedChest?.mesos_stock || 0;
                    await sharedInventoryService.updateMesos(current + exchangeData.amount_mesos - fee);
                } else if (gameAccId) {
                    const gAcc = gameAccounts.find(a => a.id === gameAccId);
                    if (gAcc) {
                        await accountsService.update(gAcc.id, { mesos_b: (gAcc.mesos_b || 0) + exchangeData.amount_mesos - fee });
                    }
                }
            } else {
                // SELL MESOS: Mesos -> Real Money (no fee for us)
                // 1. Meso Deduction
                await transactionsService.createMeso({
                    account_id: gameAccId,
                    type: 'expense',
                    amount: exchangeData.amount_mesos,
                    description: `Sell Mesos: ${exchangeData.amount_real} ${finAcc?.currency || 'USD'}${exchangeData.is_credit_sale ? ' (CREDIT)' : ''}`,
                    client_id: exchangeData.is_credit_sale ? exchangeData.client_id : null
                });

                // 2. Financial Income / Credit
                if (exchangeData.is_credit_sale) {
                    await accountsReceivableService.create({
                        client_id: exchangeData.client_id,
                        amount: exchangeData.amount_real,
                        currency: finAcc?.currency || 'USD',
                        description: `Meso Sale: ${exchangeData.amount_mesos} b`,
                        category: 'Maple',
                        subcategory: 'Mesos'
                    });
                } else {
                    await transactionsService.create({
                        financial_account_id: exchangeData.financial_account_id,
                        type: 'income',
                        amount: exchangeData.amount_real,
                        currency: finAcc?.currency || 'USD',
                        description: `Meso Sale: ${exchangeData.amount_mesos} b`,
                        is_paid: true
                    } as any);
                }

                // 3. Update Inventory (Meso stock)
                if (isVault) {
                    const current = sharedChest?.mesos_stock || 0;
                    await sharedInventoryService.updateMesos(current - exchangeData.amount_mesos);
                } else if (gameAccId) {
                    const gAcc = gameAccounts.find(a => a.id === gameAccId);
                    if (gAcc) {
                        await accountsService.update(gAcc.id, { mesos_b: (gAcc.mesos_b || 0) - exchangeData.amount_mesos });
                    }
                }
            }

            await loadData();
            handleCloseExchangeModal();
        } catch (error: any) {
            console.error('Error exchanging mesos:', error);
            alert(`Error: ${error.message || 'Failed to complete exchange. Please check if you have executed all SQL scripts in Supabase.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMesoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (mesoFormData.type === 'transfer' as any) {
                const sourceId = mesoFormData.account_id;
                const destId = mesoFormData.target_account_id;
                const amount = mesoFormData.amount;

                if (!sourceId || !destId || sourceId === destId) {
                    alert('Please select valid source and destination accounts');
                    return;
                }

                const isVaultSource = sourceId === 'shared-vault';
                const isVaultDest = destId === 'shared-vault';

                // 1. Resolve source and dest balances/names
                let sourceAccount: any = null;
                let destAccount: any = null;
                let sourceName = '';
                let destName = '';

                if (isVaultSource) {
                    sourceAccount = sharedChest;
                    sourceName = 'Shared Vault';
                } else {
                    sourceAccount = gameAccounts.find(a => a.id === sourceId);
                    sourceName = sourceAccount ? `Acc ${sourceAccount.number}` : 'Unknown';
                }

                if (isVaultDest) {
                    destAccount = sharedChest;
                    destName = 'Shared Vault';
                } else {
                    destAccount = gameAccounts.find(a => a.id === destId);
                    destName = destAccount ? `Acc ${destAccount.number}` : 'Unknown';
                }

                // 2. Create Transaction: Withdrawal from source
                await transactionsService.createMeso({
                    account_id: isVaultSource ? null : sourceId,
                    type: 'transfer',
                    amount: amount,
                    description: `Transfer to ${destName}: ${mesoFormData.description}`
                } as any);

                // 3. Create Transaction: Deposit to destination
                await transactionsService.createMeso({
                    account_id: isVaultDest ? null : (destId as string),
                    type: 'transfer',
                    amount: amount,
                    description: `Transfer from ${sourceName}: ${mesoFormData.description}`
                } as any);

                // 4. Create Transaction: Trade Fee (if applicable)
                if (!isVaultSource) {
                    const fee = amount * 0.05;
                    await transactionsService.createMeso({
                        account_id: isVaultDest ? null : (destId as string),
                        type: 'expense',
                        amount: fee,
                        description: `Trade Fee (5%) for transfer from ${sourceName} to ${destName}`
                    } as any);

                    // Update balances with fee
                    if (isVaultDest) {
                        await sharedInventoryService.updateMesos((sharedChest?.mesos_stock || 0) + amount - fee);
                    } else if (destAccount) {
                        await accountsService.update(destId as string, { mesos_b: (destAccount.mesos_b || 0) + amount - fee });
                    }
                } else {
                    // No fee if vault is source
                    if (isVaultDest) {
                        await sharedInventoryService.updateMesos((sharedChest?.mesos_stock || 0) + amount);
                    } else if (destAccount) {
                        await accountsService.update(destId as string, { mesos_b: (destAccount.mesos_b || 0) + amount });
                    }
                }

                // Update source balance
                if (isVaultSource) {
                    await sharedInventoryService.updateMesos((sharedChest?.mesos_stock || 0) - amount);
                } else if (sourceAccount) {
                    await accountsService.update(sourceId, { mesos_b: (sourceAccount.mesos_b || 0) - amount });
                }

            } else {
                // Regular income/expense
                const isVault = mesoFormData.account_id === 'shared-vault';
                await transactionsService.createMeso({
                    type: mesoFormData.type as 'income' | 'expense',
                    amount: mesoFormData.amount,
                    description: mesoFormData.description,
                    account_id: isVault ? null : mesoFormData.account_id,
                    category: mesoFormData.category || null,
                    subcategory: mesoFormData.subcategory || null
                });

                // Update balance
                if (isVault) {
                    const current = sharedChest?.mesos_stock || 0;
                    const next = mesoFormData.type === 'income' ? current + mesoFormData.amount : current - mesoFormData.amount;
                    await sharedInventoryService.updateMesos(next);
                } else {
                    const account = gameAccounts.find(a => a.id === mesoFormData.account_id);
                    if (account) {
                        const newBalance = mesoFormData.type === 'income'
                            ? (account.mesos_b || 0) + mesoFormData.amount
                            : (account.mesos_b || 0) - mesoFormData.amount;
                        await accountsService.update(account.id, { mesos_b: newBalance });
                    }
                }
            }
            await loadData();
            handleCloseMesoModal();
        } catch (error) {
            console.error('Error saving meso transaction:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAccountChange = (accountId: string) => {
        const account = financialAccounts.find(a => a.id === accountId);
        setFormData(prev => ({
            ...prev,
            financial_account_id: accountId || null,
            currency: account ? account.currency : prev.currency
        }));
    };

    const getExchangeRate = (from: string, to: string) => {
        if (from === to) return 1;
        // The matrix is now complete (all 12 permutations), so direct lookup is preferred
        const rate = exchangeRates.find(r => r.base_currency === from && r.target_currency === to);
        if (rate) return rate.rate;

        // Fallback to inverse just in case
        const inverseRate = exchangeRates.find(r => r.base_currency === to && r.target_currency === from);
        if (inverseRate && inverseRate.rate > 0) return 1 / inverseRate.rate;

        return 1;
    };

    const suggestedAmount = React.useMemo(() => {
        if (formData.type !== 'transfer' || !formData.financial_account_id || !formData.target_financial_account_id) return 0;
        const fromAccount = financialAccounts.find(a => a.id === formData.financial_account_id);
        const toAccount = financialAccounts.find(a => a.id === formData.target_financial_account_id);
        if (!fromAccount || !toAccount) return 0;

        const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
        return formData.amount * rate;
    }, [formData.type, formData.amount, formData.financial_account_id, formData.target_financial_account_id, financialAccounts, exchangeRates]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const amount = formData.amount || 0;

            if (formData.type === 'transfer') {
                const fromAccount = financialAccounts.find(a => a.id === formData.financial_account_id);
                const toAccount = financialAccounts.find(a => a.id === formData.target_financial_account_id);

                if (!fromAccount || !toAccount) {
                    alert('Please select both source and target accounts');
                    return;
                }

                const transferGroupId = crypto.randomUUID();

                // 1. Withdrawal from source
                await transactionsService.create({
                    type: 'transfer',
                    amount: amount,
                    currency: fromAccount.currency,
                    description: `Transfer to ${toAccount.name}: ${formData.description}`,
                    financial_account_id: fromAccount.id,
                    is_paid: true,
                    transfer_id: transferGroupId
                });
                await financialAccountsService.decrementBalance(fromAccount.id, amount);

                // 2. Deposit to target (using suggestedAmount)
                await transactionsService.create({
                    type: 'transfer',
                    amount: suggestedAmount,
                    currency: toAccount.currency,
                    description: `Transfer from ${fromAccount.name}: ${formData.description}`,
                    financial_account_id: toAccount.id,
                    is_paid: true,
                    transfer_id: transferGroupId
                });
                await financialAccountsService.incrementBalance(toAccount.id, suggestedAmount);

                // 3. Exchange rate adjustment
                const actualReceived = formData.actual_amount_received || 0;
                const diff = actualReceived - suggestedAmount;
                if (Math.abs(diff) > 0.001) {
                    const isGain = diff > 0;
                    await transactionsService.create({
                        type: isGain ? 'income' : 'expense',
                        amount: Math.abs(diff),
                        currency: toAccount.currency,
                        description: isGain ? 'Exchange rate gain' : 'Exchange rate loss / fee',
                        financial_account_id: toAccount.id,
                        is_paid: true,
                        transfer_id: transferGroupId
                    });
                    await financialAccountsService.incrementBalance(toAccount.id, diff);
                }

            } else {
                await transactionsService.create({
                    type: formData.type as any,
                    amount: amount,
                    currency: formData.currency,
                    description: formData.description,
                    financial_account_id: formData.financial_account_id,
                    client_id: formData.client_id,
                    item_id: formData.item_id,
                    is_credit_sale: formData.is_credit_sale,
                    is_paid: formData.is_paid,
                    category: formData.category || null,
                    subcategory: formData.subcategory || null
                });

                if (formData.financial_account_id) {
                    const balanceImpact = formData.type === 'income' ? amount : -amount;
                    await financialAccountsService.incrementBalance(formData.financial_account_id, balanceImpact);
                }
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving transaction:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSortedAccountOptions = (excludeId?: string | null) => {
        return [...financialAccounts]
            .filter(a => a.id !== excludeId)
            .sort((a, b) => {
                const indexA = ACCOUNT_SORT_ORDER.indexOf(a.name);
                const indexB = ACCOUNT_SORT_ORDER.indexOf(b.name);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.name.localeCompare(b.name);
            })
            .map(a => ({ value: a.id, label: `${a.name} (${a.currency} ${formatCurrencyValue(a.balance || 0)})` }));
    };


    const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'spa+eng');
            const result = ocrUtil.processBankScreenshot(text);

            if (result.success && result.transactions) {
                setScannedExpenses(result.transactions);
            } else {
                alert(result.error || 'No expenses detected');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            alert('Failed to process image');
        } finally {
            setIsScanning(false);
        }
    };

    const handleRemoveScannedExpense = (index: number) => {
        setScannedExpenses(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateScannedExpense = (index: number, field: string, value: any) => {
        setScannedExpenses(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const handleBulkSave = async () => {
        if (!scannedExpenses.length || !formData.financial_account_id) {
            alert('Please select an account and ensure there are scanned expenses to save.');
            return;
        }

        setIsSubmitting(true);
        try {
            for (const expense of scannedExpenses) {
                await transactionsService.create({
                    ...expense,
                    financial_account_id: formData.financial_account_id,
                    is_paid: true
                } as TransactionInsert);

                if (formData.financial_account_id) {
                    await financialAccountsService.decrementBalance(formData.financial_account_id, expense.amount || 0);
                }
            }

            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving scanned expenses:', error);
            alert('Partial failure saving expenses');
        } finally {
            setIsSubmitting(false);
        }
    };


    const columns: Column<Transaction>[] = [
        {
            key: 'created_at',
            header: 'Date',
            render: (t) => {
                const date = new Date(t.created_at);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            }
        },
        { key: 'description', header: 'Description' },
        {
            key: 'amount',
            header: 'Amount',
            render: (t) => {
                const isTransfer = t.type === 'transfer' || t.description?.toLowerCase().includes('transfer to') || t.description?.toLowerCase().includes('transfer from');
                let color = t.type === 'expense' ? '#ef4444' : t.type === 'income' ? '#22c55e' : '#a78bfa';
                let sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '';
                if (isTransfer && !sign) {
                    if (t.description?.toLowerCase().includes('transfer from')) sign = '+';
                    else if (t.description?.toLowerCase().includes('transfer to')) sign = '-';
                }

                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {sign}{formatCurrencyValue(t.amount)}
                    </span>
                );
            }
        },
        {
            key: 'currency',
            header: 'Currency',
            render: (t) => t.currency
        },
        {
            key: 'financial_account',
            header: 'Financial Account',
            render: (t) => t.financial_account ? t.financial_account.name : '-'
        },
        {
            key: 'category' as any,
            header: 'Category',
            render: (t: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>{t.category || '-'}</span>
                    <span style={{ opacity: 0.7 }}>{t.subcategory || '-'}</span>
                </div>
            )
        },
        {
            key: 'actions' as any,
            header: 'Actions',
            render: (t) => (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        setSelectedTransaction(t);
                        setEditModalOpen(true);
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                    Edit
                </Button>
            )
        }
    ];

    const mesoColumns: Column<TransactionMeso>[] = [
        {
            key: 'created_at',
            header: 'Date',
            render: (t) => {
                const date = new Date(t.created_at);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            }
        },
        {
            key: 'account',
            header: 'Game Account',
            render: (t) => {
                const acc = t.account as any;
                if (!acc && !t.account_id) return 'Shared Vault';
                if (!acc) return 'Unknown';
                return `Acc ${acc.number} - ${acc.email || acc.tag || ''}`;
            }
        },
        { key: 'description', header: 'Description' },
        {
            key: 'amount',
            header: 'Amount',
            render: (t) => {
                let color = '#a78bfa';
                let sign = '';
                if (t.type === 'expense') {
                    color = '#ef4444';
                    sign = '-';
                } else if (t.type === 'income') {
                    color = '#22c55e';
                    sign = '+';
                } else if (t.type === 'transfer') {
                    if (t.description?.toLowerCase().includes('transfer to')) sign = '-';
                    else if (t.description?.toLowerCase().includes('transfer from')) sign = '+';
                }

                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {sign}{formatCurrencyValue(t.amount)}
                    </span>
                );
            }
        },
        {
            key: 'category' as any,
            header: 'Category',
            render: (t: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>{t.category || '-'}</span>
                    <span style={{ opacity: 0.7 }}>{t.subcategory || '-'}</span>
                </div>
            )
        }
    ];

    return (
        <div className="finance-page">
            <Header
                title="Finance"
                subtitle="Income & Expense Tracking"
                actions={
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button
                            variant="secondary"
                            onClick={handleOpenExchangeModal}
                            style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', borderColor: '#a78bfa' }}
                        >
                            ⇄ Exchange Mesos
                        </Button>
                        <Button onClick={viewMode === 'financial' ? handleOpenModal : handleOpenMesoModal}>
                            + New {viewMode === 'financial' ? 'Transaction' : 'Meso Transaction'}
                        </Button>
                    </div>
                }
            />

            <div className="finance-kpis-container" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div className="kpi-view-toggle" style={{ display: 'inline-flex', background: 'rgba(30, 41, 59, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
                        <button
                            className={`toggle-btn ${kpiMode === 'summary' ? 'active' : ''}`}
                            onClick={() => setKpiMode('summary')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: kpiMode === 'summary' ? '#7c3aed' : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            General Summary
                        </button>
                        <button
                            className={`toggle-btn ${kpiMode === 'balances' ? 'active' : ''}`}
                            onClick={() => setKpiMode('balances')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: kpiMode === 'balances' ? '#7c3aed' : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            Account Balances
                        </button>
                    </div>
                </div>

                {kpiMode === 'summary' ? (
                    <div className="kpi-grid" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <KPICard
                            title={`Total Income (${viewMode === 'financial' ? 'USD' : 'Mesos'})`}
                            value={viewMode === 'financial'
                                ? `$${totalIncome.USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${totalIncome.Mesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} b`}
                            trend={{ value: 0, isPositive: true }}
                            icon="💰"
                            style={{ width: '300px' }}
                        />
                        <KPICard
                            title={`Total Expense (${viewMode === 'financial' ? 'USD' : 'Mesos'})`}
                            value={viewMode === 'financial'
                                ? `$${totalExpense.USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${totalExpense.Mesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} b`}
                            trend={{ value: 0, isPositive: false }}
                            icon="📉"
                            style={{ width: '300px' }}
                        />
                        <KPICard
                            title={`Net Balance (${viewMode === 'financial' ? 'USD' : 'Mesos'})`}
                            value={viewMode === 'financial'
                                ? `$${(totalIncome.USD - totalExpense.USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${(totalIncome.Mesos - totalExpense.Mesos).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} b`}
                            trend={{ value: 0, isPositive: (viewMode === 'financial' ? totalIncome.USD >= totalExpense.USD : totalIncome.Mesos >= totalExpense.Mesos) }}
                            icon="⚖️"
                            style={{ width: '300px' }}
                        />
                    </div>
                ) : (
                    <div className="balances-grid" style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '1rem',
                        maxWidth: '1200px',
                        margin: '0 auto'
                    }}>
                        {financialAccounts
                            .filter(acc => (acc.balance || 0) > 0)
                            .sort((a, b) => {
                                const indexA = ACCOUNT_SORT_ORDER.indexOf(a.name);
                                const indexB = ACCOUNT_SORT_ORDER.indexOf(b.name);
                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                if (indexA !== -1) return -1;
                                if (indexB !== -1) return 1;
                                return a.name.localeCompare(b.name);
                            })
                            .map(acc => (
                                <div key={acc.id} style={{
                                    background: 'rgba(30, 41, 59, 0.4)',
                                    border: '1px solid rgba(148, 163, 184, 0.1)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1.25rem', // Mas compacto
                                    minWidth: '180px',
                                    textAlign: 'center',
                                    backdropFilter: 'blur(8px)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                        {acc.name}
                                    </span>
                                    <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                                        {acc.currency === 'USD' || acc.currency === '$' ? '$' : ''}
                                        {formatCurrencyValue(acc.balance || 0)}
                                        {acc.currency === 'Mesos (b)' ? ' b' : ''}
                                    </strong>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            <div className="view-selector-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                <div className="view-filters" style={{ display: 'flex', gap: '0.5rem', width: '400px', position: 'relative' }}>
                    <Button
                        variant={viewMode === 'financial' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('financial')}
                        style={{ flex: 1 }}
                        size="sm"
                    >
                        Financial Accounts
                    </Button>
                    <Button
                        variant={viewMode === 'mesos' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('mesos')}
                        style={{ flex: 1 }}
                        size="sm"
                    >
                        Mesos (b)
                    </Button>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            position: 'absolute',
                            right: '-45px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: showFilters ? '#a78bfa' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '8px',
                            fontSize: '1.2rem',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={showFilters ? "Hide Filters" : "Show Filters"}
                    >
                        <span style={{
                            transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease',
                            display: 'inline-block'
                        }}>
                            ▼
                        </span>
                    </button>
                </div>

                {showFilters && (
                    <div className="filters-collapsible" style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        background: 'rgba(26, 32, 44, 0.5)',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid #2d3748',
                        animation: 'fadeInDown 0.3s ease-out'
                    }}>
                        <div style={{ width: '250px' }}>
                            <Input
                                placeholder="Search description or account..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span style={{ color: '#718096' }}>to</span>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                        {(searchTerm || dateRange.start || dateRange.end) && (
                            <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(''); setDateRange({ start: '', end: '' }); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="page-content">
                <Card padding="none">
                    <Table
                        data={(viewMode === 'financial' ? filteredTransactions : filteredMesoTransactions) as any}
                        columns={(viewMode === 'financial' ? columns : mesoColumns) as any}
                        keyExtractor={(t: any) => t.id}
                        loading={loading}
                        emptyMessage={viewMode === 'financial' ? "No transactions recorded." : "No meso transactions recorded."}
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title="New Transaction"
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <Select
                        label="Type"
                        value={formData.type}
                        onChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
                        options={TYPE_OPTIONS}
                    />

                    {formData.type === 'transfer' ? (
                        <>
                            <Select
                                label="Source Account"
                                value={formData.financial_account_id || ''}
                                onChange={(val) => setFormData({ ...formData, financial_account_id: val })}
                                options={[
                                    { value: '', label: 'Select Source Account' },
                                    ...getSortedAccountOptions(formData.target_financial_account_id)
                                ]}
                                required
                            />
                            <Select
                                label="Target Account"
                                value={formData.target_financial_account_id || ''}
                                onChange={(val) => setFormData({ ...formData, target_financial_account_id: val })}
                                options={[
                                    { value: '', label: 'Select Target Account' },
                                    ...getSortedAccountOptions(formData.financial_account_id)
                                ]}
                                required
                            />
                            <Input
                                label="Amount to Send"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                            <div style={{
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(124, 58, 237, 0.1)',
                                border: '1px solid rgba(124, 58, 237, 0.3)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                color: '#e2e8f0'
                            }}>
                                <strong style={{ color: '#a78bfa' }}>Suggested to Receive:</strong> {formatCurrencyValue(suggestedAmount)} {financialAccounts.find(a => a.id === formData.target_financial_account_id)?.currency || ''}
                            </div>
                            <Input
                                label="Actual Amount Received"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={formData.actual_amount_received || ''}
                                onChange={(e) => setFormData({ ...formData, actual_amount_received: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </>
                    ) : (
                        <>
                            <Select
                                label="Financial Account (Target/Source)"
                                value={formData.financial_account_id || ''}
                                onChange={handleAccountChange}
                                options={[
                                    { value: '', label: 'None / Cash' },
                                    ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency} ${formatCurrencyValue(a.balance || 0)})` }))
                                ]}
                            />

                            <div className="form-grid-2">
                                <Input
                                    label="Amount"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                                <Select
                                    label="Currency"
                                    value={formData.currency}
                                    onChange={(value) => setFormData({ ...formData, currency: value })}
                                    options={CURRENCIES}
                                    disabled={!!formData.financial_account_id}
                                />
                            </div>
                        </>
                    )}

                    {formData.type === 'expense' && (
                        <div className="ocr-upload-section" style={{ marginBottom: '1.5rem', padding: '1rem', border: '2px dashed #475569', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                                Scan Bank Screenshot (OCR)
                            </p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleScanImage}
                                style={{ display: 'none' }}
                                id="bank-ocr-input"
                                disabled={isScanning}
                            />
                            <label htmlFor="bank-ocr-input">
                                <div className={`btn btn-secondary ${isScanning ? 'loading' : ''}`} style={{ cursor: isScanning ? 'not-allowed' : 'pointer', display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}>
                                    {isScanning ? 'Scanning...' : 'Upload Bank Screenshot'}
                                </div>
                            </label>
                        </div>
                    )}

                    {scannedExpenses.length > 0 && formData.type === 'expense' && (
                        <div className="scanned-expenses-table" style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #334155', textAlign: 'left' }}>Description</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #334155', textAlign: 'right', width: '100px' }}>Amount</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #334155', textAlign: 'left', width: '150px' }}>Category</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #334155', textAlign: 'center', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scannedExpenses.map((expense, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '4px' }}>
                                                <Input
                                                    value={expense.description || ''}
                                                    onChange={(e) => handleUpdateScannedExpense(idx, 'description', e.target.value)}
                                                />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <Input
                                                    type="number"
                                                    value={expense.amount?.toString() || ''}
                                                    onChange={(e) => handleUpdateScannedExpense(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                    style={{ textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <Select
                                                    value={expense.category || ''}
                                                    onChange={(val) => handleUpdateScannedExpense(idx, 'category', val)}
                                                    options={[
                                                        { value: '', label: 'Select...' },
                                                        ...Object.values(FINANCE_CATEGORIES).map(c => ({ value: c, label: c }))
                                                    ]}
                                                />
                                            </td>
                                            <td style={{ padding: '4px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveScannedExpense(idx)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!scannedExpenses.length && (
                        <>
                            <Input
                                label="Description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />

                            <div className="form-grid-2">
                                <Select
                                    label="Category (Optional)"
                                    value={formData.category || ''}
                                    onChange={(val) => setFormData({ ...formData, category: val, subcategory: '' })}
                                    options={[
                                        { value: '', label: 'Auto-categorize' },
                                        ...Object.values(FINANCE_CATEGORIES).map(c => ({ value: c, label: c }))
                                    ]}
                                />
                                <Select
                                    label="Subcategory"
                                    value={formData.subcategory || ''}
                                    onChange={(val) => setFormData({ ...formData, subcategory: val })}
                                    options={[
                                        { value: '', label: 'Select Subcategory' },
                                        ...(formData.category && CATEGORY_MAP[formData.category]
                                            ? CATEGORY_MAP[formData.category].map(s => ({ value: s, label: s }))
                                            : [])
                                    ]}
                                    disabled={!formData.category}
                                />
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        {scannedExpenses.length > 0 ? (
                            <Button type="button" onClick={handleBulkSave} loading={isSubmitting}>
                                {isSubmitting ? 'Saving...' : `Save ${scannedExpenses.length} Transactions`}
                            </Button>
                        ) : (
                            <Button type="submit">{formData.type === 'transfer' ? 'Execute Transfer' : 'Save Transaction'}</Button>
                        )}
                    </div>
                </form>
            </Modal>

            {selectedTransaction && (
                <EditTransactionModal
                    isOpen={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setSelectedTransaction(null);
                    }}
                    transaction={selectedTransaction}
                    onSuccess={loadData}
                />
            )}

            {/* Meso Transaction Modal */}
            <Modal
                isOpen={mesoModalOpen}
                onClose={handleCloseMesoModal}
                title="New Meso Transaction"
            >
                <form onSubmit={handleMesoSubmit} className="modal-form">
                    <Select
                        label="Type"
                        value={mesoFormData.type}
                        onChange={(val) => setMesoFormData({ ...mesoFormData, type: val as any })}
                        options={[
                            { value: 'income', label: 'Income' },
                            { value: 'expense', label: 'Expense' },
                            { value: 'transfer', label: 'Transfer' }
                        ]}
                    />

                    {mesoFormData.type === 'transfer' as any ? (
                        <>
                            <Select
                                label="Source Game Account"
                                value={mesoFormData.account_id}
                                onChange={(val) => setMesoFormData({ ...mesoFormData, account_id: val })}
                                options={[
                                    { value: '', label: 'Select Source' },
                                    { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                    ...gameAccounts.filter(a => a.id !== mesoFormData.target_account_id).map(acc => ({
                                        value: acc.id,
                                        label: `Acc ${acc.number} - ${acc.email || acc.tag || ''} (${formatCurrencyValue(acc.mesos_b || 0)} b)`
                                    }))
                                ]}
                                required
                            />
                            <Select
                                label="Target Game Account"
                                value={mesoFormData.target_account_id}
                                onChange={(val) => setMesoFormData({ ...mesoFormData, target_account_id: val })}
                                options={[
                                    { value: '', label: 'Select Destination' },
                                    { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                    ...gameAccounts.filter(a => a.id !== mesoFormData.account_id).map(acc => ({
                                        value: acc.id,
                                        label: `Acc ${acc.number} - ${acc.email || acc.tag || ''} (${formatCurrencyValue(acc.mesos_b || 0)} b)`
                                    }))
                                ]}
                                required
                            />
                        </>
                    ) : (
                        <Select
                            label="Game Account"
                            value={mesoFormData.account_id}
                            onChange={(val) => setMesoFormData({ ...mesoFormData, account_id: val })}
                            options={[
                                { value: '', label: 'Select Game Account' },
                                { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                ...gameAccounts.map(acc => ({
                                    value: acc.id,
                                    label: `Acc ${acc.number} - ${acc.email || acc.tag || ''} (${formatCurrencyValue(acc.mesos_b || 0)} b)`
                                }))
                            ]}
                            required
                        />
                    )}

                    <Input
                        label={mesoFormData.type === 'transfer' as any ? "Amount to Transfer (b)" : "Amount (b)"}
                        type="number"
                        min={0}
                        step="0.01"
                        value={mesoFormData.amount === 0 ? '' : mesoFormData.amount}
                        onChange={(e) => setMesoFormData({ ...mesoFormData, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        required
                    />

                    <Input
                        label="Description"
                        value={mesoFormData.description || ''}
                        onChange={(e) => setMesoFormData({ ...mesoFormData, description: e.target.value })}
                        required
                    />

                    <div className="form-grid-2">
                        <Select
                            label="Category (Optional)"
                            value={mesoFormData.category || ''}
                            onChange={(val) => setMesoFormData({ ...mesoFormData, category: val, subcategory: '' })}
                            options={[
                                { value: '', label: 'Auto-categorize' },
                                ...Object.values(FINANCE_CATEGORIES).map(c => ({ value: c, label: c }))
                            ]}
                        />
                        <Select
                            label="Subcategory"
                            value={mesoFormData.subcategory || ''}
                            onChange={(val) => setMesoFormData({ ...mesoFormData, subcategory: val })}
                            options={[
                                { value: '', label: 'Select Subcategory' },
                                ...(mesoFormData.category && CATEGORY_MAP[mesoFormData.category]
                                    ? CATEGORY_MAP[mesoFormData.category].map(s => ({ value: s, label: s }))
                                    : [])
                            ]}
                            disabled={!mesoFormData.category}
                        />
                    </div>

                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={handleCloseMesoModal}>Cancel</Button>
                        <Button type="submit">Save Meso Transaction</Button>
                    </div>
                </form>
            </Modal>
            {/* Exchange Meso Modal */}
            <Modal
                isOpen={exchangeModalOpen}
                onClose={handleCloseExchangeModal}
                title="Meso Exchange (Buy/Sell)"
                size="md"
            >
                <form onSubmit={handleExchangeSubmit} className="modal-form">
                    <div className="exchange-type-toggle" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Button
                            type="button"
                            variant={exchangeData.type === 'buy' ? 'primary' : 'secondary'}
                            onClick={() => setExchangeData({ ...exchangeData, type: 'buy' })}
                            style={{ flex: 1 }}
                        >
                            Buy Mesos (USD → Meso)
                        </Button>
                        <Button
                            type="button"
                            variant={exchangeData.type === 'sell' ? 'primary' : 'secondary'}
                            onClick={() => setExchangeData({ ...exchangeData, type: 'sell' })}
                            style={{ flex: 1 }}
                        >
                            Sell Mesos (Meso → USD)
                        </Button>
                    </div>

                    <div className="form-grid-2" style={{ gridTemplateColumns: exchangeData.type === 'buy' ? '1fr 1fr' : '1fr 1fr' }}>
                        {exchangeData.type === 'buy' ? (
                            <>
                                <Select
                                    label="Financial Account"
                                    value={exchangeData.financial_account_id}
                                    onChange={(val) => setExchangeData({ ...exchangeData, financial_account_id: val })}
                                    options={[
                                        { value: '', label: 'Select Account' },
                                        ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency} ${formatCurrencyValue(a.balance || 0)})` }))
                                    ]}
                                    required
                                />
                                <Select
                                    label="Game Account"
                                    value={exchangeData.game_account_id}
                                    onChange={(val) => setExchangeData({ ...exchangeData, game_account_id: val })}
                                    options={[
                                        { value: '', label: 'Select Account' },
                                        { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                        ...gameAccounts.map(a => ({ value: a.id, label: `Acc ${a.number} (${formatCurrencyValue(a.mesos_b || 0)} b)` }))
                                    ]}
                                    required
                                />
                            </>
                        ) : (
                            <>
                                <Select
                                    label="Game Account"
                                    value={exchangeData.game_account_id}
                                    onChange={(val) => setExchangeData({ ...exchangeData, game_account_id: val })}
                                    options={[
                                        { value: '', label: 'Select Account' },
                                        { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                        ...gameAccounts.map(a => ({ value: a.id, label: `Acc ${a.number} (${formatCurrencyValue(a.mesos_b || 0)} b)` }))
                                    ]}
                                    required
                                />
                                {exchangeData.is_credit_sale ? (
                                    <Select
                                        label="Select Client"
                                        value={exchangeData.client_id}
                                        onChange={(val) => setExchangeData({ ...exchangeData, client_id: val })}
                                        options={[
                                            { value: '', label: 'Select Client' },
                                            ...clients.map(c => ({ value: c.id, label: c.name }))
                                        ]}
                                        required
                                    />
                                ) : (
                                    <Select
                                        label="Financial Account"
                                        value={exchangeData.financial_account_id}
                                        onChange={(val) => setExchangeData({ ...exchangeData, financial_account_id: val })}
                                        options={[
                                            { value: '', label: 'Select Account' },
                                            ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency} ${formatCurrencyValue(a.balance || 0)})` }))
                                        ]}
                                        required
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {exchangeData.type === 'sell' && (
                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exchangeData.is_credit_sale}
                                    onChange={(e) => setExchangeData({
                                        ...exchangeData,
                                        is_credit_sale: e.target.checked,
                                        financial_account_id: e.target.checked ? '' : exchangeData.financial_account_id
                                    })}
                                />
                                <span className="custom-checkmark"></span>
                                <span>Sell on Credit (Accounts Receivable)</span>
                            </label>
                        </div>
                    )}

                    <div className="form-grid-2">
                        {exchangeData.type === 'buy' ? (
                            <>
                                <Input
                                    label={`Amount in ${financialAccounts.find(a => a.id === exchangeData.financial_account_id)?.currency || 'USD'}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={exchangeData.amount_real}
                                    onChange={(e) => setExchangeData({ ...exchangeData, amount_real: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                                <Input
                                    label="Amount in Mesos (b)"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={exchangeData.amount_mesos}
                                    onChange={(e) => setExchangeData({ ...exchangeData, amount_mesos: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </>
                        ) : (
                            <>
                                <Input
                                    label="Amount in Mesos (b)"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={exchangeData.amount_mesos}
                                    onChange={(e) => setExchangeData({ ...exchangeData, amount_mesos: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                                <Input
                                    label={`Amount in ${financialAccounts.find(a => a.id === exchangeData.financial_account_id)?.currency || 'USD'}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={exchangeData.amount_real}
                                    onChange={(e) => setExchangeData({ ...exchangeData, amount_real: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </>
                        )}
                    </div>

                    {(() => {
                        const selectedAccount = financialAccounts.find(a => a.id === exchangeData.financial_account_id);
                        const currency = selectedAccount?.currency || 'USD';

                        if (exchangeData.type === 'buy' && exchangeData.amount_real > 0) {
                            const rate = getExchangeRate(currency, 'Mesos (b)');
                            const suggested = exchangeData.amount_real * rate;
                            return (
                                <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(167, 139, 250, 0.2)', marginTop: '1rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#a78bfa' }}>
                                        Suggested: <strong>{formatCurrencyValue(suggested)} b</strong>
                                    </span>
                                </div>
                            );
                        }

                        if (exchangeData.type === 'sell' && exchangeData.amount_mesos > 0) {
                            const rate = getExchangeRate('Mesos (b)', currency);
                            const suggested = exchangeData.amount_mesos * rate;
                            return (
                                <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(167, 139, 250, 0.2)', marginTop: '1rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#a78bfa' }}>
                                        Suggested: <strong>{formatCurrencyValue(suggested)} {currency}</strong>
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="modal-actions">
                        <Button type="button" variant="secondary" onClick={handleCloseExchangeModal} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Confirm Exchange'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Finance;
