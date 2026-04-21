import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/UI';
import { appSettingsService, resourcesService } from '../../services';
import './Settings.css';

export const Settings: React.FC = () => {
    const [mesoRate, setMesoRate] = useState<number>(0);
    const [editingRate, setEditingRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editingPrices, setEditingPrices] = useState({ psok: 0, perfect_innoc: 0, guardian_scroll: 0 });
    const [savingPrices, setSavingPrices] = useState(false);

    useEffect(() => {
        Promise.all([
            appSettingsService.getMesoUsdRate(),
            resourcesService.getResourceMetadata(),
        ]).then(([rate, meta]) => {
            setMesoRate(rate);
            setEditingRate(rate);
            const prices = {
                psok: meta['psok']?.mesoCost || 0,
                perfect_innoc: meta['perfect_innoc']?.mesoCost || 0,
                guardian_scroll: meta['guardian_scroll']?.mesoCost || 0,
            };
            setEditingPrices(prices);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await appSettingsService.set('meso_usd_rate', editingRate.toString());
            setMesoRate(editingRate);
            alert('Settings saved!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrices = async () => {
        setSavingPrices(true);
        try {
            await Promise.all([
                resourcesService.updateResourceMesoCost('psok', editingPrices.psok),
                resourcesService.updateResourceMesoCost('perfect_innoc', editingPrices.perfect_innoc),
                resourcesService.updateResourceMesoCost('guardian_scroll', editingPrices.guardian_scroll),
            ]);
            alert('Resource prices saved!');
        } catch (error) {
            console.error('Error saving resource prices:', error);
            alert('Failed to save resource prices');
        } finally {
            setSavingPrices(false);
        }
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h1>Settings & Configuration</h1>
                <p>Manage application preferences.</p>
            </header>

            <div className="settings-content">
                <Card className="settings-card" style={{ maxWidth: '400px' }}>
                    <h3>Meso Rate</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Current rate: <strong>{mesoRate}</strong> USD per 1 Billion Mesos
                    </p>
                    {!loading && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <Input
                                    label="Mesos (b) → USD rate"
                                    type="number"
                                    step="0.001"
                                    min={0}
                                    value={editingRate}
                                    onChange={(e) => setEditingRate(parseFloat(e.target.value) || 0)}
                                    placeholder="e.g. 0.75"
                                />
                            </div>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    )}
                </Card>

                <Card className="settings-card" style={{ maxWidth: '400px' }}>
                    <h3>Resource Prices</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Default meso cost per unit for special resources. Used when creating Account Receivables.
                    </p>
                    {!loading && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                <Input
                                    label="PSOK (b mesos)"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={editingPrices.psok}
                                    onChange={(e) => setEditingPrices(p => ({ ...p, psok: parseFloat(e.target.value) || 0 }))}
                                />
                                <Input
                                    label="Perfect Innoc. (b mesos)"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={editingPrices.perfect_innoc}
                                    onChange={(e) => setEditingPrices(p => ({ ...p, perfect_innoc: parseFloat(e.target.value) || 0 }))}
                                />
                                <Input
                                    label="Guardian Scroll (b mesos)"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={editingPrices.guardian_scroll}
                                    onChange={(e) => setEditingPrices(p => ({ ...p, guardian_scroll: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <Button onClick={handleSavePrices} disabled={savingPrices}>
                                {savingPrices ? 'Saving...' : 'Save Prices'}
                            </Button>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};
