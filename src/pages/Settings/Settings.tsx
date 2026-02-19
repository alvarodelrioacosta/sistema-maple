import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Table, Select } from '../../components/UI';
import { exchangeRatesService, financeCategoriesService, type FinanceCategory } from '../../services';
import type { ExchangeRate, ExchangeRateInsert } from '../../types';
import type { Column } from '../../components/UI/Table';
import { CURRENCIES } from '../../constants/currencies';
import './Settings.css';

type SettingsTab = 'general' | 'exchange-rates' | 'categories';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('exchange-rates');

    // Exchange Rates State
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [rateFormData, setRateFormData] = useState<ExchangeRateInsert>({
        base_currency: 'USD',
        target_currency: 'Mesos (b)',
        rate: 0
    });

    // Categories State
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingCatName, setEditingCatName] = useState('');
    const [newSubcatName, setNewSubcatName] = useState<{ [key: string]: string }>({});

    const MAIN_RELATIONS = [
        { base: 'Mesos (b)', target: 'USD' },
        { base: 'USD', target: 'Pesos Arg' },
        { base: 'USD', target: 'Soles' }
    ];

    useEffect(() => {
        if (activeTab === 'exchange-rates') {
            loadRates();
        } else if (activeTab === 'categories') {
            loadCategories();
        }
    }, [activeTab]);

    const loadRates = async () => {
        setLoadingRates(true);
        try {
            const data = await exchangeRatesService.getAll();
            const sortedData = [...data].sort((a, b) => {
                const aMain = MAIN_RELATIONS.some(rel => rel.base === a.base_currency && rel.target === a.target_currency);
                const bMain = MAIN_RELATIONS.some(rel => rel.base === b.base_currency && rel.target === b.target_currency);
                if (aMain && !bMain) return -1;
                if (!aMain && bMain) return 1;
                return a.base_currency.localeCompare(b.base_currency);
            });
            setRates(sortedData);
        } catch (error) {
            console.error('Error loading rates:', error);
        } finally {
            setLoadingRates(false);
        }
    };

    const loadCategories = async () => {
        setLoadingCats(true);
        try {
            const data = await financeCategoriesService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoadingCats(false);
        }
    };

    const handleEditRate = (rate: ExchangeRate) => {
        setEditingRateId(rate.id);
        setRateFormData({
            base_currency: rate.base_currency,
            target_currency: rate.target_currency,
            rate: rate.rate
        });
    };

    const handleRateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRateId) {
                await exchangeRatesService.update(editingRateId, rateFormData);
            } else {
                await exchangeRatesService.create(rateFormData);
            }
            await loadRates();
            setEditingRateId(null);
        } catch (error) {
            console.error('Error saving rate:', error);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        try {
            await financeCategoriesService.createCategory(newCatName.trim());
            setNewCatName('');
            loadCategories();
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleEditCategory = (cat: FinanceCategory) => {
        setEditingCatId(cat.id);
        setEditingCatName(cat.name);
    };

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCatId || !editingCatName.trim()) return;
        try {
            await financeCategoriesService.updateCategory(editingCatId, editingCatName.trim());
            setEditingCatId(null);
            loadCategories();
        } catch (error) {
            console.error('Error updating category:', error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category? All its subcategories will be removed.')) return;
        try {
            await financeCategoriesService.deleteCategory(id);
            loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const handleAddSubcategory = async (catId: string) => {
        const name = newSubcatName[catId];
        if (!name?.trim()) return;
        try {
            await financeCategoriesService.createSubcategory(catId, name.trim());
            setNewSubcatName({ ...newSubcatName, [catId]: '' });
            loadCategories();
        } catch (error) {
            console.error('Error adding subcategory:', error);
        }
    };

    const handleDeleteSubcategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subcategory?')) return;
        try {
            await financeCategoriesService.deleteSubcategory(id);
            loadCategories();
        } catch (error) {
            console.error('Error deleting subcategory:', error);
        }
    };

    const rateColumns: Column<ExchangeRate>[] = [
        {
            key: 'base_currency',
            header: 'Base',
            render: (r) => {
                const isMain = MAIN_RELATIONS.some(rel => rel.base === r.base_currency && rel.target === r.target_currency);
                return (
                    <div className="currency-badge">
                        {r.base_currency}
                        {isMain ? (
                            <span className="badge-status main">MAIN</span>
                        ) : (
                            <span className="badge-status auto">AUTO</span>
                        )}
                    </div>
                );
            }
        },
        { key: 'target_currency', header: 'Target' },
        {
            key: 'rate',
            header: 'Rate',
            render: (r) => r.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                const isMain = MAIN_RELATIONS.some(rel => rel.base === r.base_currency && rel.target === r.target_currency);
                if (!isMain) return null;
                return (
                    <Button size="sm" variant="ghost" onClick={() => handleEditRate(r)}>
                        Edit
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h1>Settings & Configuration</h1>
                <p>Manage application preferences, exchange rates, and financial categories.</p>
            </header>

            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`tab-btn ${activeTab === 'exchange-rates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exchange-rates')}
                >
                    Exchange Rates
                </button>
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    Finance Categories
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'general' && (
                    <Card className="settings-card">
                        <h3>General Configuration</h3>
                        <p>App-wide settings will be implemented here.</p>
                    </Card>
                )}

                {activeTab === 'exchange-rates' && (
                    <div className="exchange-rates-tab">
                        {editingRateId && (
                            <Card className="mb-4 settings-form-card">
                                <h3>Edit Exchange Rate</h3>
                                <form onSubmit={handleRateSubmit} className="settings-form">
                                    <div className="form-row">
                                        <Select
                                            label="Base"
                                            value={rateFormData.base_currency}
                                            options={CURRENCIES}
                                            disabled
                                            onChange={() => { }}
                                        />
                                        <Select
                                            label="Target"
                                            value={rateFormData.target_currency}
                                            options={CURRENCIES}
                                            disabled
                                            onChange={() => { }}
                                        />
                                        <Input
                                            label="Rate"
                                            type="number"
                                            step="any"
                                            value={rateFormData.rate}
                                            onChange={(e) => setRateFormData({ ...rateFormData, rate: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <Button type="submit">Update Rate</Button>
                                        <Button variant="ghost" onClick={() => setEditingRateId(null)}>Cancel</Button>
                                    </div>
                                </form>
                            </Card>
                        )}
                        <Card>
                            <Table
                                data={rates}
                                columns={rateColumns}
                                keyExtractor={(r) => r.id}
                                loading={loadingRates}
                            />
                        </Card>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="categories-tab">
                        <Card className="mb-4 settings-form-card">
                            <h3>Add New Category</h3>
                            <form onSubmit={handleAddCategory} className="settings-form horizontal">
                                <Input
                                    placeholder="Category name (e.g. Marketing)"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                />
                                <Button type="submit" disabled={!newCatName.trim()}>Add Category</Button>
                            </form>
                        </Card>

                        {loadingCats ? (
                            <div className="loading-container">Loading categories...</div>
                        ) : (
                            <div className="categories-grid">
                                {categories.map(cat => (
                                    <Card key={cat.id} className="category-card">
                                        <div className="category-card-header">
                                            {editingCatId === cat.id ? (
                                                <form onSubmit={handleUpdateCategory} className="edit-category-form">
                                                    <input
                                                        autoFocus
                                                        value={editingCatName}
                                                        onChange={(e) => setEditingCatName(e.target.value)}
                                                        onBlur={() => setEditingCatId(null)}
                                                    />
                                                </form>
                                            ) : (
                                                <h4>{cat.name}</h4>
                                            )}

                                            <div className="category-actions">
                                                {!cat.is_system && (
                                                    <>
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => handleEditCategory(cat)}
                                                            title="Edit category"
                                                        >
                                                            📝
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                            title="Delete category"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                                {cat.is_system && <span className="badge-system">SYSTEM</span>}
                                            </div>
                                        </div>

                                        <div className="subcategories-list">
                                            {cat.subcategories?.map(sub => (
                                                <div key={sub.id} className="subcategory-item">
                                                    <span>{sub.name}</span>
                                                    {!sub.is_system && (
                                                        <button
                                                            className="delete-sub-btn"
                                                            onClick={() => handleDeleteSubcategory(sub.id)}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <div className="add-subcategory-row">
                                                <input
                                                    type="text"
                                                    placeholder="New subcategory..."
                                                    value={newSubcatName[cat.id] || ''}
                                                    onChange={(e) => setNewSubcatName({ ...newSubcatName, [cat.id]: e.target.value })}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                                                />
                                                <button
                                                    onClick={() => handleAddSubcategory(cat.id)}
                                                    disabled={!newSubcatName[cat.id]?.trim()}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
