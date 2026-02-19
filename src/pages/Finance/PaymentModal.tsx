import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Select } from '../../components/UI';
import { CURRENCIES } from '../../constants/currencies';
import { transactionsService, accountsReceivableService, exchangeRatesService, financialAccountsService, accountsService, charactersService, itemsService } from '../../services';
import type { AccountReceivable, FinancialAccount, Account, Character } from '../../types';
import { NewItemModal } from '../../components/Modals/NewItemModal';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    ar: AccountReceivable | null;
    onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, ar, onPaymentSuccess }) => {
    const [method, setMethod] = useState<'cash' | 'item' | 'mesos'>('cash');
    const [amount, setAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>('USD');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Financial Accounts (for Cash payments)
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);

    // Game Accounts & Characters (for Item payments)
    const [gameAccounts, setGameAccounts] = useState<Account[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedGameAccountId, setSelectedGameAccountId] = useState<string>('');
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [selectedMesoAccountId, setSelectedMesoAccountId] = useState<string>('');

    // Exchange Rates
    const [rates, setRates] = useState<any[]>([]);

    // Item Barter State
    const [selectedItemName, setSelectedItemName] = useState<string>('');
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [pendingItemData, setPendingItemData] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && ar) {
            setLoading(false);
            setMethod('cash');
            setCurrency(ar.currency || 'USD');
            setAmount(0);
            setNotes('');
            setSelectedItemName('');
            setPendingItemData(null);
            setDestinationAccountId(null);

            // Reset Game Account selections
            setSelectedGameAccountId('');
            setSelectedCharacterId('');
            setSelectedMesoAccountId('');

            fetchInitialData();
        }
    }, [isOpen, ar]);

    const fetchInitialData = async () => {
        try {
            const [ratesData, accountsData, gameAccountsData, charactersData] = await Promise.all([
                exchangeRatesService.getAll(),
                financialAccountsService.getAll(),
                accountsService.getAll(),
                charactersService.getAll()
            ]);
            setRates(ratesData);
            setFinancialAccounts(accountsData);
            setGameAccounts(gameAccountsData);
            setCharacters(charactersData);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const handleMethodChange = (newMethod: 'cash' | 'item' | 'mesos') => {
        setMethod(newMethod);
        if (newMethod === 'item') {
            setCurrency('Mesos (b)');
            setDestinationAccountId(null);
        } else if (newMethod === 'mesos') {
            setCurrency('Mesos (b)');
            setDestinationAccountId(null);
        } else {
            // Revert validity if needed, though usually user resets or we default
            if (ar) setCurrency(ar.currency || 'USD');
        }
    };

    const handleDestinationChange = (accountId: string) => {
        const account = financialAccounts.find(a => a.id === accountId);
        setDestinationAccountId(accountId || null);
        if (account) {
            setCurrency(account.currency);
        }
    };

    const handleItemCreated = (data: any) => {
        setPendingItemData(data);
        setSelectedItemName(data.name);
    };

    // Helper: Standardized rate lookup
    const getExchangeRate = (from: string, to: string): number => {
        if (from === to) return 1;
        // Search direct rate in the complete matrix
        const direct = rates.find(r => r.base_currency === from && r.target_currency === to);
        if (direct) return direct.rate;

        // Fallback to inverse
        const inverse = rates.find(r => r.base_currency === to && r.target_currency === from);
        if (inverse && inverse.rate > 0) return 1 / inverse.rate;

        return 0; // Rate unavailable
    };

    const getPendingBalanceValue = (): number | null => {
        if (!ar) return 0;
        const pending = ar.amount - ar.paid;

        if (currency === ar.currency) return pending;

        const rate = getExchangeRate(ar.currency, currency);
        if (rate === 0) return null; // Rate Unavailable

        return pending * rate;
    };

    const getPendingBalanceInSelectedCurrency = () => {
        const val = getPendingBalanceValue();
        if (val === null) return 'Rate Unavailable';
        return val.toFixed(2);
    };

    const handleMaxClick = () => {
        const val = getPendingBalanceValue();
        if (val !== null) {
            setAmount(Number(val.toFixed(2))); // Round to 2 decimals to match input step
        }
    };

    const handleSubmit = async () => {
        if (!ar) return;

        const pendingBalance = getPendingBalanceValue();
        if (pendingBalance !== null) {
            const pendingFixed = Number(pendingBalance.toFixed(2));
            const amountFixed = Number(amount.toFixed(2));

            if (amountFixed > pendingFixed) {
                alert(`The amount entered (${amountFixed}) exceeds the pending balance (${pendingFixed}).`);
                return;
            }

            if (amountFixed === pendingFixed) {
                alert("This payment fully settles the balance. The record will be marked as paid and removed from Accounts Receivable.");
            }
        }

        setLoading(true);
        try {
            // 1. Create Income Transaction
            const isMesoSale = ar.description.toLowerCase().includes('meso sale');
            const fixedCategory = isMesoSale ? "Maple" : "Mesos";
            const fixedSubcategory = isMesoSale ? "Mesos" : "Items / Cubes";

            let description = '';
            if (method === 'cash') {
                description = `Partial Payment for ${ar.description}`;
            } else if (method === 'mesos') {
                description = `Mesos Payment for ${ar.description}`;
            } else {
                description = `Payment via Item: ${selectedItemName || 'Unknown Item'}`;
            }

            // Append notes if provided
            if (notes.trim() && (method === 'cash' || method === 'mesos')) {
                description += ` (${notes.trim()})`;
            }

            if (method === 'mesos') {
                await transactionsService.createMeso({
                    account_id: selectedMesoAccountId,
                    type: 'income',
                    amount: amount,
                    description: description,
                    client_id: ar.client_id,
                    item_id: ar.item_id,
                    account_receivable_id: ar.id,
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });
            } else if (method === 'item') {
                // --- DEFERRED ITEM CREATION ---
                if (!pendingItemData) throw new Error("No item data found for barter");

                // Sync amount with item costs
                const itemDataWithCosts = {
                    ...pendingItemData,
                    costo_item: amount,
                    costo_total: amount,
                    estimated_value: amount
                };

                const createdItem = await itemsService.create(itemDataWithCosts);
                const itemId = createdItem.id;

                // ITEM METHOD: Dual transactions in transactions_mesos
                // 1. Income (linked to AR)
                await transactionsService.createMeso({
                    account_id: selectedGameAccountId,
                    type: 'income',
                    amount: amount,
                    description: description,
                    client_id: ar.client_id,
                    item_id: itemId,
                    account_receivable_id: ar.id,
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });

                // 2. Expense (NOT linked to AR)
                await transactionsService.createMeso({
                    account_id: selectedGameAccountId,
                    type: 'expense',
                    amount: amount,
                    description: `Purchase: - ${selectedItemName || 'Unknown Item'}`,
                    client_id: ar.client_id,
                    item_id: itemId,
                    account_receivable_id: null, // Critical: Not linked to AR
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });

            } else {
                // CASH METHOD
                await transactionsService.create({
                    type: 'income',
                    amount: amount,
                    currency: currency,
                    description: description,
                    client_id: ar.client_id,
                    item_id: ar.item_id,
                    is_credit_sale: false,
                    is_paid: true,
                    financial_account_id: destinationAccountId,
                    account_receivable_id: ar.id, // Link to AR record
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });
            }

            // 2. If Mesos payment, update the game account's mesos_b balance
            // Note: For Item method, the income and expense cancel each other out, 
            // so we only update for the 'mesos' method where it's a net gain.
            if (method === 'mesos' && selectedMesoAccountId) {
                const mesoAccount = gameAccounts.find(a => a.id === selectedMesoAccountId);
                if (mesoAccount) {
                    const newMesosBalance = (mesoAccount.mesos_b || 0) + amount;
                    await accountsService.update(selectedMesoAccountId, { mesos_b: newMesosBalance });
                }
            }

            // Calculate Payment Value in AR Currency
            let paidAmountInArCurrency = amount;

            if (currency !== ar.currency) {
                const rate = getExchangeRate(currency, ar.currency);
                if (rate > 0) {
                    paidAmountInArCurrency = amount * rate;
                } else {
                    console.warn('Rate unavailable for conversion, using 1:1 fallback (risky)');
                }
            }

            await accountsReceivableService.updatePayment(ar.id, paidAmountInArCurrency);

            onPaymentSuccess();
            onClose();

        } catch (error) {
            console.error('Payment Error:', error);
            alert('Failed to register payment');
        } finally {
            setLoading(false);
        }
    };

    if (!ar) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Register Payment"
                size="sm"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* Dynamic Balance Display */}
                    <div style={{ background: '#1e1b4b', padding: '10px', borderRadius: '6px', border: '1px solid #312e81' }}>
                        <span style={{ fontSize: '0.9em', color: '#a5b4fc' }}>Balance Pending: </span>
                        <strong style={{ fontSize: '1.1em', color: 'white' }}>
                            {getPendingBalanceInSelectedCurrency()} {currency}
                        </strong>
                    </div>

                    {/* Method Selector */}
                    <div>
                        <label className="input-label">Payment Method</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button
                                variant={method === 'cash' ? 'primary' : 'secondary'}
                                onClick={() => handleMethodChange('cash')}
                                fullWidth
                            >
                                Cash
                            </Button>
                            <Button
                                variant={method === 'mesos' ? 'primary' : 'secondary'}
                                onClick={() => handleMethodChange('mesos')}
                                fullWidth
                            >
                                Mesos (b)
                            </Button>
                            <Button
                                variant={method === 'item' ? 'primary' : 'secondary'}
                                onClick={() => handleMethodChange('item')}
                                fullWidth
                            >
                                Item
                            </Button>
                        </div>
                    </div>

                    {/* Destination Account Logic */}
                    {method === 'cash' && (
                        /* FINANCIAL ACCOUNT (Cash) */
                        <Select
                            label="Destination Account"
                            value={destinationAccountId || ''}
                            onChange={handleDestinationChange}
                            required
                            options={[
                                { value: '', label: 'Select Account' },
                                ...financialAccounts
                                    .filter(a => a.currency !== 'Mesos (b)') // Exclude Mesos accounts from Cash
                                    .map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))
                            ]}
                        />
                    )}

                    {method === 'mesos' && (
                        /* GAME ACCOUNT (Mesos) */
                        <Select
                            label="Destination Game Account"
                            value={selectedMesoAccountId}
                            onChange={(val) => setSelectedMesoAccountId(val)}
                            required
                            options={[
                                { value: '', label: 'Select Account' },
                                ...gameAccounts.map(a => ({ value: a.id, label: `#${a.number} - ${a.email || 'No Email'}` }))
                            ]}
                        />
                    )}

                    {method === 'item' && (
                        /* GAME ACCOUNT (Item) */
                        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <Select
                                label="Account"
                                value={selectedGameAccountId}
                                onChange={(val) => {
                                    setSelectedGameAccountId(val);
                                    setSelectedCharacterId(''); // Reset char
                                }}
                                options={[
                                    { value: '', label: 'Select Account' },
                                    ...gameAccounts.map(a => ({ value: a.id, label: a.email || 'No Email' }))
                                ]}
                            />
                            <Select
                                label="Character (Required)"
                                value={selectedCharacterId}
                                onChange={(val) => {
                                    setSelectedCharacterId(val);
                                    // Auto-select account if char selected first (optional but good UX)
                                    if (val && !selectedGameAccountId) {
                                        const char = characters.find(c => c.id === val);
                                        if (char) setSelectedGameAccountId(char.account_id);
                                    }
                                }}
                                options={[
                                    { value: '', label: 'Select...' },
                                    ...characters
                                        .filter(c => !selectedGameAccountId || c.account_id === selectedGameAccountId)
                                        .map(c => ({ value: c.id, label: c.name }))
                                ]}
                                disabled={!selectedGameAccountId && gameAccounts.length > 0}
                            />
                        </div>
                    )}

                    {/* Amount & Currency */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Amount"
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setAmount(isNaN(val) ? 0 : val);
                                }}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={handleMaxClick}
                            style={{ height: '42px', marginBottom: '1px' }} // Align with input
                        >
                            MAX
                        </Button>
                    </div>


                    <Select
                        label="Currency"
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={CURRENCIES}
                        disabled={method === 'item' || method === 'mesos' || !!destinationAccountId} // Lock if Item, Mesos, OR Cash Account selected
                    />

                    {(method === 'cash' || method === 'mesos') && (
                        <Input
                            label="Notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. TC"
                        />
                    )}

                    {method === 'item' && (
                        <div style={{ marginTop: '5px' }}>
                            <label className="input-label">Item Details</label>
                            {pendingItemData ? (
                                <div style={{
                                    padding: '10px',
                                    border: '1px solid #4ade80',
                                    borderRadius: '6px',
                                    background: 'rgba(74, 222, 128, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{pendingItemData.name} ({pendingItemData.status})</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <Button size="sm" variant="ghost" onClick={() => setIsNewItemModalOpen(true)}>Edit</Button>
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            setPendingItemData(null);
                                            setSelectedItemName('');
                                        }}>Remove</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setIsNewItemModalOpen(true)}
                                    fullWidth
                                    variant="secondary"
                                    style={{ border: '2px dashed #4b5563' }}
                                    disabled={!selectedCharacterId}
                                >
                                    {selectedCharacterId ? '+ Add Item' : 'Select Character First'}
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                loading ||
                                (method === 'cash' && !destinationAccountId) ||
                                (method === 'mesos' && !selectedMesoAccountId) ||
                                (method === 'item' && (!selectedCharacterId || !pendingItemData))
                            }
                        >
                            {loading ? 'Processing...' : 'Register Payment'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* New Item Modal Logic */}
            <NewItemModal
                isOpen={isNewItemModalOpen}
                onClose={() => setIsNewItemModalOpen(false)}
                onSuccess={(data) => {
                    handleItemCreated(data);
                }}
                isBarterMode={true}
                initialData={pendingItemData}
                hideCostInput={true}
                defaultAccountId={selectedGameAccountId}
                defaultCharacterId={selectedCharacterId}
            />
        </>
    );
};
