// =============================================
// CREATE EVENT MODAL - Event Creation Form
// =============================================

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../../components/UI';
import { eventsService } from '../../services';
import type { GameEvent, EventType, EventDailyRewardInsert, EventBossInsert, EventShopItemInsert } from '../../types';
import './CreateEventModal.css';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
    eventToEdit?: GameEvent | null;
}

interface RewardField {
    resource_type: string;
    quantity: number;
    days_required: number;
}

interface BossField {
    boss_name: string;
    points: number;
}

interface ShopItemField {
    resource_type: string;
    price: number;
    max_per_week: number;
}

const RESOURCE_OPTIONS = [
    { value: 'bright_cubes', label: 'Bright' },
    { value: 'bonus_bright_cubes', label: 'Bonus' },
    { value: 'solid_cubes', label: 'Solid' },
    { value: 'psok', label: 'PSOK' },
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onEventCreated, eventToEdit }) => {
    // Basic event info
    const [name, setName] = useState('');
    const [type, setType] = useState<EventType>('daily_login');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [maxPerWeek, setMaxPerWeek] = useState(5);

    // Daily Login rewards
    const [rewards, setRewards] = useState<RewardField[]>([]);

    // Bossing bosses
    const [bosses, setBosses] = useState<BossField[]>([]);

    // Bossing shop items
    const [shopItems, setShopItems] = useState<ShopItemField[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-populate if editing
    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setName(eventToEdit.name);
                setType(eventToEdit.type as EventType);
                setStartDate(eventToEdit.start_date.split('T')[0]);
                setEndDate(eventToEdit.end_date.split('T')[0]);
                setMaxPerWeek(eventToEdit.max_per_week || 5);
                loadRelatedData(eventToEdit.id, eventToEdit.type);
            } else {
                resetForm();
            }
        }
    }, [isOpen, eventToEdit]);

    const loadRelatedData = async (eventId: string, eventType: string) => {
        setLoading(true);
        try {
            if (eventType === 'daily_login') {
                const rewardsData = await eventsService.getDailyRewards(eventId);
                setRewards(rewardsData.map(r => ({
                    resource_type: r.resource_type,
                    quantity: r.quantity,
                    days_required: r.days_required
                })));
            } else if (eventType === 'bossing') {
                const [bossesData, shopItemsData] = await Promise.all([
                    eventsService.getBosses(eventId),
                    eventsService.getShopItems(eventId)
                ]);
                setBosses(bossesData.map(b => ({
                    boss_name: b.boss_name,
                    points: b.points
                })));
                setShopItems(shopItemsData.map(s => ({
                    resource_type: s.resource_type,
                    price: s.price,
                    max_per_week: s.max_per_week
                })));
            }
        } catch (err) {
            console.error('Error loading related data:', err);
            setError('Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddReward = () => {
        setRewards([...rewards, { resource_type: 'bright_cubes', quantity: 1, days_required: 1 }]);
    };

    const handleRemoveReward = (index: number) => {
        setRewards(rewards.filter((_, i) => i !== index));
    };

    const handleRewardChange = (index: number, field: keyof RewardField, value: string | number) => {
        const updated = [...rewards];
        updated[index] = { ...updated[index], [field]: value };
        setRewards(updated);
    };

    const handleAddBoss = () => {
        setBosses([...bosses, { boss_name: '', points: 0 }]);
    };

    const handleRemoveBoss = (index: number) => {
        setBosses(bosses.filter((_, i) => i !== index));
    };

    const handleBossChange = (index: number, field: keyof BossField, value: string | number) => {
        const updated = [...bosses];
        updated[index] = { ...updated[index], [field]: value };
        setBosses(updated);
    };

    const handleAddShopItem = () => {
        setShopItems([...shopItems, { resource_type: 'bright_cubes', price: 100, max_per_week: 1 }]);
    };

    const handleRemoveShopItem = (index: number) => {
        setShopItems(shopItems.filter((_, i) => i !== index));
    };

    const handleShopItemChange = (index: number, field: keyof ShopItemField, value: string | number) => {
        const updated = [...shopItems];
        updated[index] = { ...updated[index], [field]: value };
        setShopItems(updated);
    };

    const handleSubmit = async () => {
        if (!name || !startDate || !endDate) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const eventData = {
                name,
                type,
                start_date: startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`,
                end_date: endDate.includes('T') ? endDate : `${endDate}T00:00:00Z`,
                reset_hour: 21,
                week_start_day: type === 'daily_login' ? 2 : 3, // Tuesday for daily, Wednesday for bossing
                max_per_week: type === 'daily_login' ? maxPerWeek : null,
                is_active: true
            };

            if (eventToEdit) {
                // Update existing event
                await eventsService.update(eventToEdit.id, eventData);

                // Update related records
                if (type === 'daily_login') {
                    await eventsService.updateDailyRewards(eventToEdit.id, rewards as EventDailyRewardInsert[]);
                } else if (type === 'bossing') {
                    await Promise.all([
                        eventsService.updateBosses(eventToEdit.id, bosses as EventBossInsert[]),
                        eventsService.updateShopItems(eventToEdit.id, shopItems as EventShopItemInsert[])
                    ]);
                }
            } else {
                // Create new event
                const event = await eventsService.create(eventData);

                // Create related records
                if (type === 'daily_login') {
                    for (const reward of rewards) {
                        await eventsService.createDailyReward({
                            ...reward,
                            event_id: event.id
                        } as EventDailyRewardInsert);
                    }
                } else if (type === 'bossing') {
                    for (const boss of bosses) {
                        await eventsService.createBoss({
                            ...boss,
                            event_id: event.id
                        } as EventBossInsert);
                    }
                    for (const item of shopItems) {
                        await eventsService.createShopItem({
                            ...item,
                            event_id: event.id
                        } as EventShopItemInsert);
                    }
                }
            }

            // Success
            onEventCreated();
            onClose();
            if (!eventToEdit) resetForm();
        } catch (err: any) {
            console.error('Error saving event:', err);
            setError(`Failed to ${eventToEdit ? 'update' : 'create'} event: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setType('daily_login');
        setStartDate('');
        setEndDate('');
        setMaxPerWeek(5);
        setRewards([{ resource_type: 'bright_cubes', quantity: 5, days_required: 4 }]);
        setBosses([{ boss_name: 'Boss A', points: 100 }, { boss_name: 'Boss B', points: 200 }]);
        setShopItems([{ resource_type: 'bright_cubes', price: 100, max_per_week: 3 }]);
        setError('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={eventToEdit ? "Edit Event" : "Create New Event"}>
            <div className="create-event-modal">
                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="modal-grid">
                    {/* Event Information Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <span className="section-icon">📅</span>
                            <h3 className="section-title">Event Information</h3>
                        </div>

                        <div className="form-row full">
                            <div className="form-field">
                                <label>Event Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., February Daily Login"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label>Event Type</label>
                                <Select
                                    value={type}
                                    onChange={(value) => setType(value as EventType)}
                                    options={[
                                        { value: 'daily_login', label: 'Daily Login' },
                                        { value: 'bossing', label: 'Bossing' }
                                    ]}
                                />
                            </div>
                            {type === 'daily_login' && (
                                <div className="form-field">
                                    <label>Max Completes / Week</label>
                                    <Input
                                        type="number"
                                        value={maxPerWeek}
                                        onChange={(e) => setMaxPerWeek(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="date-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="form-field">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="date-input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Configuration Section */}
                    {type === 'daily_login' ? (
                        <div className="form-section">
                            <div className="section-header">
                                <span className="section-icon">🎁</span>
                                <h3 className="section-title">Reward Milestones</h3>
                                <Button size="sm" variant="secondary" onClick={handleAddReward}>+ Add Milestone</Button>
                            </div>
                            <div className="dynamic-rows-container">
                                {rewards.map((reward, index) => (
                                    <div key={index} className="dynamic-row rewards-row">
                                        <div className="form-field">
                                            <label>Resource</label>
                                            <Select
                                                value={reward.resource_type}
                                                onChange={(value) => handleRewardChange(index, 'resource_type', value)}
                                                options={RESOURCE_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-field smaller">
                                            <label>Qty</label>
                                            <Input
                                                type="number"
                                                value={reward.quantity}
                                                onChange={(e) => handleRewardChange(index, 'quantity', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="form-field smaller">
                                            <label>Days</label>
                                            <Input
                                                type="number"
                                                value={reward.days_required}
                                                onChange={(e) => handleRewardChange(index, 'days_required', Number(e.target.value))}
                                            />
                                        </div>
                                        <button
                                            className="remove-btn"
                                            onClick={() => handleRemoveReward(index)}
                                            disabled={rewards.length === 1}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="modal-grid">
                            <div className="form-section">
                                <div className="section-header">
                                    <span className="section-icon">⚔️</span>
                                    <h3 className="section-title">Bosses List</h3>
                                    <Button size="sm" variant="secondary" onClick={handleAddBoss}>+ Add Boss</Button>
                                </div>
                                <div className="dynamic-rows-container">
                                    {bosses.map((boss, index) => (
                                        <div key={index} className="dynamic-row bosses-row">
                                            <div className="form-field">
                                                <label>Boss Name</label>
                                                <Input
                                                    value={boss.boss_name}
                                                    onChange={(e) => handleBossChange(index, 'boss_name', e.target.value)}
                                                    placeholder="e.g., Chaos Papulatus"
                                                />
                                            </div>
                                            <div className="form-field small">
                                                <label>Points</label>
                                                <Input
                                                    type="number"
                                                    value={boss.points}
                                                    onChange={(e) => handleBossChange(index, 'points', Number(e.target.value))}
                                                />
                                            </div>
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleRemoveBoss(index)}
                                                disabled={bosses.length === 1}
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-header">
                                    <span className="section-icon">🛒</span>
                                    <h3 className="section-title">Event Shop Items</h3>
                                    <Button size="sm" variant="secondary" onClick={handleAddShopItem}>+ Add Item</Button>
                                </div>
                                <div className="dynamic-rows-container">
                                    {shopItems.map((item, index) => (
                                        <div key={index} className="dynamic-row shop-items-row">
                                            <div className="form-field">
                                                <label>Item</label>
                                                <Select
                                                    value={item.resource_type}
                                                    onChange={(value) => handleShopItemChange(index, 'resource_type', value)}
                                                    options={RESOURCE_OPTIONS}
                                                />
                                            </div>
                                            <div className="form-field small">
                                                <label>Price</label>
                                                <Input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleShopItemChange(index, 'price', Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="form-field small">
                                                <label>Max/Week</label>
                                                <Input
                                                    type="number"
                                                    value={item.max_per_week}
                                                    onChange={(e) => handleShopItemChange(index, 'max_per_week', Number(e.target.value))}
                                                />
                                            </div>
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleRemoveShopItem(index)}
                                                disabled={shopItems.length === 1}
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Processing...' : (eventToEdit ? 'Save Changes' : 'Create Event')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CreateEventModal;
