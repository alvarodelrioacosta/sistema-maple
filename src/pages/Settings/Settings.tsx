import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/UI';
import { appSettingsService } from '../../services';
import './Settings.css';

export const Settings: React.FC = () => {
    const [mesoRate, setMesoRate] = useState<number>(0);
    const [editingRate, setEditingRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        appSettingsService.getMesoUsdRate().then(rate => {
            setMesoRate(rate);
            setEditingRate(rate);
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
            </div>
        </div>
    );
};
