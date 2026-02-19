import React, { useEffect, useState } from 'react';
import { Modal, Button, Table, Input, Card, Select } from '../../components/UI';
import { exchangeRatesService } from '../../services';
import type { ExchangeRate, ExchangeRateInsert } from '../../types';
import type { Column } from '../../components/UI/Table';
import { CURRENCIES } from '../../constants/currencies';

interface ExchangeRatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExchangeRatesModal: React.FC<ExchangeRatesModalProps> = ({ isOpen, onClose }) => {
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<ExchangeRateInsert>({
        base_currency: 'USD',
        target_currency: 'Mesos (b)',
        rate: 0
    });

    const MAIN_RELATIONS = [
        { base: 'Mesos (b)', target: 'USD' },
        { base: 'USD', target: 'Pesos Arg' },
        { base: 'USD', target: 'Soles' }
    ];

    const isMainRate = (rate: ExchangeRate | ExchangeRateInsert) => {
        return MAIN_RELATIONS.some(rel => rel.base === rate.base_currency && rel.target === rate.target_currency);
    };

    const isAutoRate = (rate: ExchangeRate | ExchangeRateInsert) => {
        return !isMainRate(rate);
    };

    useEffect(() => {
        if (isOpen) {
            loadRates();
        }
    }, [isOpen]);

    const loadRates = async () => {
        setLoading(true);
        try {
            const data = await exchangeRatesService.getAll();
            // Sort: MAIN rates first
            const sortedData = [...data].sort((a, b) => {
                const aMain = isMainRate(a);
                const bMain = isMainRate(b);
                if (aMain && !bMain) return -1;
                if (!aMain && bMain) return 1;
                return a.base_currency.localeCompare(b.base_currency);
            });
            setRates(sortedData);
        } catch (error) {
            console.error('Error loading exchange rates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rate: ExchangeRate) => {
        setEditingId(rate.id);
        setFormData({
            base_currency: rate.base_currency,
            target_currency: rate.target_currency,
            rate: rate.rate
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ base_currency: 'USD', target_currency: 'Mesos (b)', rate: 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.base_currency === formData.target_currency) {
            alert('Base and Target currencies must be different.');
            return;
        }

        try {
            let savedRate: ExchangeRate;
            if (editingId) {
                savedRate = await exchangeRatesService.update(editingId, formData);
            } else {
                savedRate = await exchangeRatesService.create(formData);
            }

            // After saving, reload to get everything (including IDs)
            let currentRates = await exchangeRatesService.getAll();

            // AUTO-GENERATION: If this is a Main rate, update everything else
            if (isMainRate(savedRate)) {
                // Get the 3 main rates to build a conversion map
                const m_usd = currentRates.find(r => r.base_currency === 'Mesos (b)' && r.target_currency === 'USD')?.rate;
                const usd_pesos = currentRates.find(r => r.base_currency === 'USD' && r.target_currency === 'Pesos Arg')?.rate;
                const usd_soles = currentRates.find(r => r.base_currency === 'USD' && r.target_currency === 'Soles')?.rate;

                if (m_usd !== undefined && usd_pesos !== undefined && usd_soles !== undefined) {
                    // Define all desired rates (inverses and cross-rates)
                    // We need rates for all permutations of: Mesos (b), USD, Pesos Arg, Soles
                    const currencies = ['Mesos (b)', 'USD', 'Pesos Arg', 'Soles'];

                    // Conversion matrix (simplified)
                    // value in USD = 
                    // Mesos (b) amount * m_usd
                    // USD amount * 1
                    // Pesos amount * (1 / usd_pesos)
                    // Soles amount * (1 / usd_soles)

                    const toUSD = (currency: string): number => {
                        if (currency === 'USD') return 1;
                        if (currency === 'Mesos (b)') return m_usd;
                        if (currency === 'Pesos Arg') return 1 / usd_pesos;
                        if (currency === 'Soles') return 1 / usd_soles;
                        return 0;
                    };

                    const getRate = (from: string, to: string): number => {
                        // Rate from A to B = (value of 1 A in USD) / (value of 1 B in USD)
                        const valA = toUSD(from);
                        const valB = toUSD(to);
                        if (valA === 0 || valB === 0) return 0;
                        return valA / valB;
                    };

                    for (const from of currencies) {
                        for (const to of currencies) {
                            if (from === to) continue;

                            // Skip if it's one of the MAIN rates (we don't want to overwrite them with calculated values that might have precision loss)
                            if (MAIN_RELATIONS.some(rel => rel.base === from && rel.target === to)) continue;

                            const targetRateValue = getRate(from, to);
                            const existing = currentRates.find(r => r.base_currency === from && r.target_currency === to);

                            if (existing) {
                                // Only update if significantly different
                                if (Math.abs(existing.rate - targetRateValue) > 0.00000001) {
                                    await exchangeRatesService.update(existing.id, { ...existing, rate: targetRateValue });
                                }
                            } else {
                                await exchangeRatesService.create({
                                    base_currency: from,
                                    target_currency: to,
                                    rate: targetRateValue
                                });
                            }
                        }
                    }
                }
            }

            await loadRates();
            handleCancelEdit();
        } catch (error) {
            console.error('Error saving rate:', error);
        }
    };


    const columns: Column<ExchangeRate>[] = [
        {
            key: 'base_currency',
            header: 'Base',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {r.base_currency}
                    {isAutoRate(r) && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', borderRadius: '4px', fontWeight: 'bold' }}>AUTO</span>}
                    {isMainRate(r) && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderRadius: '4px', fontWeight: 'bold' }}>MAIN</span>}
                </div>
            )
        },
        {
            key: 'target_currency',
            header: 'Target',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {r.target_currency}
                </div>
            )
        },
        { key: 'rate', header: 'Rate', render: (r) => r.rate.toLocaleString(undefined, { maximumFractionDigits: 8 }) },
        {
            key: 'last_update',
            header: 'Updated',
            render: (r) => isAutoRate(r) ? null : new Date(r.last_update).toLocaleDateString()
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                const main = isMainRate(r);
                if (!main) return null; // Show no actions for auto rates

                return (
                    <div className="table-actions">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(r)}
                        >
                            Edit
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Exchange Rates"
            size="lg"
        >
            <div className="exchange-rates-content">
                {editingId && (
                    <Card className="mb-4">
                        <form onSubmit={handleSubmit} className="rate-form">
                            <div className="form-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                                <div style={{ flex: '1.5', minWidth: '150px' }}>
                                    <Select
                                        label="Base"
                                        value={formData.base_currency}
                                        onChange={(value) => setFormData({ ...formData, base_currency: value })}
                                        options={CURRENCIES}
                                        disabled
                                    />
                                </div>
                                <div style={{ flex: '1.5', minWidth: '150px' }}>
                                    <Select
                                        label="Target"
                                        value={formData.target_currency}
                                        onChange={(value) => setFormData({ ...formData, target_currency: value })}
                                        options={CURRENCIES}
                                        disabled
                                    />
                                </div>
                                <div style={{ flex: '0.8', minWidth: '100px' }}>
                                    <Input
                                        label="Rate"
                                        type="number"
                                        step="any"
                                        value={formData.rate}
                                        onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '4px' }}>
                                    <Button type="submit">
                                        Update
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Card>
                )}

                <Table
                    data={rates}
                    columns={columns}
                    keyExtractor={(r) => r.id}
                    loading={loading}
                    emptyMessage="No exchange rates defined."
                />
            </div>
        </Modal>
    );
};
