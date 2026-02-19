// =============================================
// CHARACTERS PAGE - Gestión de personajes
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Select, Card } from '../../components/UI';
import { charactersService, accountsService, classesService } from '../../services';
import type { CharacterWithAccount, CharacterInsert, Account, JobType, ClassItem } from '../../types';
import type { Column } from '../../components/UI/Table';
import '../Accounts/Accounts.css';

const JOB_OPTIONS: { value: JobType; label: string; color: string }[] = [
    { value: 'Warrior', label: 'Warrior', color: '#ff4d4f' }, // Red
    { value: 'Bowman', label: 'Bowman', color: '#4ade80' },   // Green
    { value: 'Thief', label: 'Thief', color: '#fbbf24' },     // Gold
    { value: 'Pirate', label: 'Pirate', color: '#c084fc' },   // Purple
    { value: 'Magician', label: 'Magician', color: '#38bdf8' } // Light Blue
];

export const Characters: React.FC = () => {
    const [characters, setCharacters] = useState<CharacterWithAccount[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<CharacterWithAccount | null>(null);
    const [formData, setFormData] = useState<CharacterInsert>({
        name: '',
        level: 1,
        class: '',
        job: null,
        main: null,
        account_id: ''
    });

    const [activeFilter, setActiveFilter] = useState<JobType | null>(null);
    const [showMainsOnly, setShowMainsOnly] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [charsData, accountsData, classesData] = await Promise.all([
                charactersService.getAll(),
                accountsService.getAll(),
                classesService.getAll()
            ]);

            // Sort characters by Account Number
            const charsWithAccount = charsData.map(char => {
                const account = accountsData.find(a => a.id === char.account_id);
                return { ...char, account };
            }).sort((a, b) => (a.account?.number || 0) - (b.account?.number || 0));

            setCharacters(charsWithAccount);
            setAccounts(accountsData);
            setClasses(classesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (character?: CharacterWithAccount) => {
        if (character) {
            setEditingCharacter(character);
            setFormData({
                name: character.name,
                level: character.level,
                class: character.class || '',
                job: character.job || null,
                main: character.main || null,
                account_id: character.account_id
            });
        } else {
            setEditingCharacter(null);
            setFormData({ name: '', level: 1, class: '', job: null, main: null, account_id: accounts[0]?.id || '' });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingCharacter(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCharacter) {
                await charactersService.update(editingCharacter.id, formData);
            } else {
                await charactersService.create(formData);
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving character:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este personaje?')) {
            try {
                await charactersService.delete(id);
                await loadData();
            } catch (error) {
                console.error('Error deleting character:', error);
            }
        }
    };

    const columns: Column<CharacterWithAccount>[] = [
        { key: 'account', header: 'Account N°', render: (c) => c.account?.number !== undefined ? `N° ${c.account.number}` : '-' },
        { key: 'account_email', header: 'Email', render: (c) => c.account?.email || '-' },
        { key: 'name', header: 'Name' },
        { key: 'level', header: 'Level' },
        {
            key: 'job',
            header: 'Job',
            render: (c) => {
                // Special case for Xenon
                if (c.class === 'Xenon') {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                                src="/xenon.png"
                                alt="Xenon"
                                title="Xenon"
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                    );
                }

                const jobClass = classes.find(cls => cls.job_1 === c.job || cls.job_2 === c.job);
                const jobIcon = jobClass ? (jobClass.job_1 === c.job ? jobClass.image_1 : jobClass.image_2) : null;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {jobIcon ? (
                            <img
                                src={jobIcon}
                                alt={c.job || ''}
                                title={c.job || ''}
                                style={{ width: '24px', height: '24px' }}
                            />
                        ) : (
                            c.job || '-'
                        )}
                    </div>
                );
            }
        },
        { key: 'class', header: 'Class', render: (c) => c.class || '-' },
        {
            key: 'main',
            header: 'Type',
            render: (c) => {
                const isMain = c.main === 'Main' || c.account?.number === 0;
                return (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: isMain ? 'rgba(255, 215, 0, 0.15)' : 'rgba(128, 128, 128, 0.1)',
                        color: isMain ? '#ffd700' : '#888',
                        border: isMain ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(128, 128, 128, 0.2)'
                    }}>
                        {isMain ? 'Main' : 'Mule'}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (c) => (
                <div className="table-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(c)}>Edit</Button>
                </div>
            )
        }
    ];

    // Derived state for Class options based on selected Job
    const classOptions = classes
        .filter(c => formData.job && (c.job_1 === formData.job || c.job_2 === formData.job))
        .map(c => ({
            value: c.class_name,
            label: c.class_name
        }));

    // Filter Logic
    const filteredCharacters = characters.filter(char => {
        // Main Filter Logic: If showMainsOnly is true, only show Mains (including exception for Account 0)
        if (showMainsOnly) {
            const isMain = char.main === 'Main' || char.account?.number === 0;
            if (!isMain) return false;
        }

        if (!activeFilter) return true;

        // Xenon Special Case: Shows in Thief and Pirate
        if (char.class === 'Xenon') {
            return activeFilter === 'Thief' || activeFilter === 'Pirate';
        }

        // Generic Case: Check class definition for dual jobs
        const charClass = classes.find(c => c.class_name === char.class);
        if (charClass) {
            return charClass.job_1 === activeFilter || charClass.job_2 === activeFilter;
        }

        // Fallback: Check simple Job field
        return char.job === activeFilter;
    });

    return (
        <div className="accounts-page">
            <Header
                title="Characters"
                subtitle="Manage your game characters"
                actions={
                    <Button onClick={() => handleOpenModal()}>+ New Character</Button>
                }

            />

            <div className="page-content">
                {/* Filters Container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {/* Job Filters */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button
                            variant={activeFilter === null ? 'primary' : 'secondary'}
                            onClick={() => setActiveFilter(null)}
                        >
                            All
                        </Button>
                        {JOB_OPTIONS.map(job => (
                            <Button
                                key={job.value}
                                variant={activeFilter === job.value ? 'primary' : 'secondary'}
                                onClick={() => setActiveFilter(job.value)}
                                style={activeFilter === job.value ? { background: job.color, borderColor: job.color } : {}}
                            >
                                {job.label}
                            </Button>
                        ))}
                    </div>

                    {/* Mains Filter */}
                    <Button
                        variant={showMainsOnly ? 'primary' : 'secondary'}
                        onClick={() => setShowMainsOnly(!showMainsOnly)}
                    >
                        {showMainsOnly ? 'Show All' : 'Show Mains Only'}
                    </Button>
                </div>

                <Card padding="none">
                    <Table
                        data={filteredCharacters}
                        columns={columns}
                        keyExtractor={(c) => c.id}
                        loading={loading}
                        emptyMessage="No characters found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingCharacter ? 'Edit Character' : 'New Character'}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <Select
                        label="Account"
                        value={formData.account_id}
                        onChange={(value) => setFormData({ ...formData, account_id: value })}
                        options={accounts
                            .sort((a, b) => (a.number || 0) - (b.number || 0))
                            .map(a => ({
                                value: a.id,
                                label: `N° ${a.number} - ${a.email || 'No email'}`
                            }))}
                    />
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Level"
                        type="number"
                        min={1}
                        max={300}
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                    />

                    {/* CUSTOM JOB SELECT WITH ICONS */}
                    <Select
                        label="Job"
                        value={formData.job || ''}
                        onChange={(value) => setFormData({ ...formData, job: value as JobType, class: '' })}
                        options={[{ value: '', label: 'Select Job' }, ...JOB_OPTIONS]}
                    />

                    <Select
                        label="Class"
                        value={formData.class || ''}
                        onChange={(value) => setFormData({ ...formData, class: value })}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...classOptions
                        ]}
                        disabled={!formData.job}
                    />

                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                        {editingCharacter && (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => {
                                    handleDelete(editingCharacter.id);
                                    handleCloseModal();
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingCharacter ? 'Save Changes' : 'Create Character'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default Characters;
