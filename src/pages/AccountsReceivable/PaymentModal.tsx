import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Select } from '../../components/UI';
import { CURRENCIES } from '../../constants/currencies';
import { transactionsService, accountsReceivableService, accountsService, charactersService, itemsService } from '../../services';
import type { AccountReceivable, Account, Character } from '../../types';
import { NewItemModal } from '../../components/Modals/NewItemModal';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    ar: AccountReceivable | null;
    onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, ar, onPaymentSuccess }) => {
    const [method, setMethod] = useState<'mesos' | 'item'>('mesos');
    const [amount, setAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>('USD');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const [gameAccounts, setGameAccounts] = useState<Account[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedGameAccountId, setSelectedGameAccountId] = useState<string>('');
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [selectedMesoAccountId, setSelectedMesoAccountId] = useState<string>('');

    const [selectedItemName, setSelectedItemName] = useState<string>('');
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [pendingItemData, setPendingItemData] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && ar) {
            setLoading(false);
            setMethod('mesos');
            setCurrency(ar.currency || 'USD');
            setAmount(0);
            setNotes('');
            setSelectedItemName('');
            setPendingItemData(null);
            setSelectedGameAccountId('');
            setSelectedCharacterId('');
            setSelectedMesoAccountId('');
            fetchInitialData();
        }
    }, [isOpen, ar]);

    const fetchInitialData = async () => {
        try {
            const [gameAccountsData, charactersData] = await Promise.all([
                accountsService.getAll(),
                charactersService.getAll()
            ]);
            setGameAccounts(gameAccountsData);
            setCharacters(charactersData);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const getPendingBalance = (): number => {
        if (!ar) return 0;
        return ar.amount - ar.paid;
    };

    const handleMaxClick = () => {
        setAmount(Number(getPendingBalance().toFixed(2)));
    };

    const handleItemCreated = (data: any) => {
        setPendingItemData(data);
        setSelectedItemName(data.name);
    };

    const handleSubmit = async () => {
        if (!ar) return;

        const pending = Number(getPendingBalance().toFixed(2));
        const amountFixed = Number(amount.toFixed(2));

        if (amountFixed > pending) {
            alert(`The amount entered (${amountFixed}) exceeds the pending balance (${pending}).`);
            return;
        }

        setLoading(true);
        try {
            const isMesoSale = ar.description.toLowerCase().includes('meso sale');
            const fixedCategory = isMesoSale ? 'Maple' : 'Maple';
            const fixedSubcategory = isMesoSale ? 'Mesos' : 'Items / Cubes';

            if (method === 'mesos') {
                let description = `Payment for ${ar.description}`;
                if (notes.trim()) description += ` (${notes.trim()})`;

                await transactionsService.createMeso({
                    account_id: selectedMesoAccountId,
                    type: 'income',
                    amount: amount,
                    description,
                    client_id: ar.client_id,
                    item_id: ar.item_id,
                    account_receivable_id: ar.id,
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });

                if (selectedMesoAccountId) {
                    const mesoAccount = gameAccounts.find(a => a.id === selectedMesoAccountId);
                    if (mesoAccount) {
                        await accountsService.update(selectedMesoAccountId, {
                            mesos_b: (mesoAccount.mesos_b || 0) + amount
                        });
                    }
                }
            } else {
                // Item payment
                if (!pendingItemData) throw new Error('No item data found for barter');

                const itemDataWithCosts = {
                    ...pendingItemData,
                    costo_item: amount,
                    costo_total: amount,
                    estimated_value: amount
                };

                const createdItem = await itemsService.create(itemDataWithCosts);
                const description = `Payment via Item: ${selectedItemName || 'Unknown Item'}`;

                await transactionsService.createMeso({
                    account_id: selectedGameAccountId,
                    type: 'income',
                    amount: amount,
                    description,
                    client_id: ar.client_id,
                    item_id: createdItem.id,
                    account_receivable_id: ar.id,
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });

                await transactionsService.createMeso({
                    account_id: selectedGameAccountId,
                    type: 'expense',
                    amount: amount,
                    description: `Purchase: ${selectedItemName || 'Unknown Item'}`,
                    client_id: ar.client_id,
                    item_id: createdItem.id,
                    account_receivable_id: null,
                    category: fixedCategory,
                    subcategory: fixedSubcategory
                });
            }

            await accountsReceivableService.updatePayment(ar.id, amountFixed);

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
            <Modal isOpen={isOpen} onClose={onClose} title="Register Payment" size="sm">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    <div style={{ background: '#1e1b4b', padding: '10px', borderRadius: '6px', border: '1px solid #312e81' }}>
                        <span style={{ fontSize: '0.9em', color: '#a5b4fc' }}>Balance Pending: </span>
                        <strong style={{ fontSize: '1.1em', color: 'white' }}>
                            {getPendingBalance().toFixed(2)} {ar.currency}
                        </strong>
                    </div>

                    <div>
                        <label className="input-label">Payment Method</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button variant={method === 'mesos' ? 'primary' : 'secondary'} onClick={() => setMethod('mesos')} fullWidth>
                                Mesos (b)
                            </Button>
                            <Button variant={method === 'item' ? 'primary' : 'secondary'} onClick={() => setMethod('item')} fullWidth>
                                Item
                            </Button>
                        </div>
                    </div>

                    {method === 'mesos' && (
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <Select
                                label="Account"
                                value={selectedGameAccountId}
                                onChange={(val) => {
                                    setSelectedGameAccountId(val);
                                    setSelectedCharacterId('');
                                }}
                                options={[
                                    { value: '', label: 'Select Account' },
                                    ...gameAccounts.map(a => ({ value: a.id, label: a.email || 'No Email' }))
                                ]}
                            />
                            <Select
                                label="Character (Required)"
                                value={selectedCharacterId}
                                onChange={(val) => setSelectedCharacterId(val)}
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

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Amount"
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount === 0 ? '' : amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                        </div>
                        <Button variant="secondary" onClick={handleMaxClick} style={{ height: '42px', marginBottom: '1px' }}>
                            MAX
                        </Button>
                    </div>

                    <Select
                        label="Currency"
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={CURRENCIES}
                        disabled={method === 'item' || method === 'mesos'}
                    />

                    {method === 'mesos' && (
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
                                        <Button size="sm" variant="ghost" onClick={() => { setPendingItemData(null); setSelectedItemName(''); }}>Remove</Button>
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
                                amount <= 0 ||
                                (method === 'mesos' && !selectedMesoAccountId) ||
                                (method === 'item' && (!selectedCharacterId || !pendingItemData))
                            }
                        >
                            {loading ? 'Processing...' : 'Register Payment'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <NewItemModal
                isOpen={isNewItemModalOpen}
                onClose={() => setIsNewItemModalOpen(false)}
                onSuccess={(data) => { handleItemCreated(data); }}
                isBarterMode={true}
                initialData={pendingItemData}
                hideCostInput={true}
                defaultAccountId={selectedGameAccountId}
                defaultCharacterId={selectedCharacterId}
            />
        </>
    );
};
