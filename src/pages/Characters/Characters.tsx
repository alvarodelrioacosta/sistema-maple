// =============================================
// CHARACTERS PAGE - Gestión de personajes
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Select, Card } from '../../components/UI';
import { charactersService, accountsService, classesService, symbolProgressService } from '../../services';
import type { SymbolProgress } from '../../services';
import type { CharacterWithAccount, CharacterInsert, Account, JobType, ClassItem } from '../../types';
import type { Column } from '../../components/UI/Table';

import { CharacterDetailModal } from './CharacterDetailModal';
import { ARCANE_MAX, SACRED_MAX } from '../../constants/symbols';
import '../Accounts/Accounts.css';
import './Characters.css';

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
    const [isSaving, setIsSaving] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncingAll, setSyncingAll] = useState(false);
    const [selectedChar, setSelectedChar] = useState<CharacterWithAccount | null>(null);
    const [allSymbols, setAllSymbols] = useState<SymbolProgress[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [charsData, accountsData, classesData, symbolsData] = await Promise.all([
                charactersService.getAll(),
                accountsService.getAll(),
                classesService.getAll(),
                symbolProgressService.getAll()
            ]);

            // Sort characters by Account Number
            const charsWithAccount = charsData.map(char => {
                const account = accountsData.find(a => a.id === char.account_id);
                return { ...char, account };
            }).sort((a, b) => (a.account?.number || 0) - (b.account?.number || 0));

            setCharacters(charsWithAccount);
            setAccounts(accountsData);
            setClasses(classesData);
            setAllSymbols(symbolsData);
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
            const lastAccountId = formData.account_id || accounts[0]?.id || '';
            setFormData({ name: '', level: 1, class: '', job: null, main: null, account_id: lastAccountId });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingCharacter(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        try {
            setIsSaving(true);
            if (editingCharacter) {
                await charactersService.update(editingCharacter.id, formData);
                await loadData();
                setEditingCharacter(null);
                setFormData(prev => ({ ...prev, name: '', level: 1, class: '', job: null, main: null }));
            } else {
                // Create with defaults — Nexon sync will fill in level/class/job/exp
                const newChar = await charactersService.create({
                    name: formData.name,
                    account_id: formData.account_id,
                    level: 1,
                    class: null,
                    job: null,
                    main: null
                });
                // Auto-sync silently; character is saved regardless of outcome
                try {
                    await charactersService.syncFromNexon(newChar.id);
                } catch {
                    // Sync failure is non-fatal
                }
                await loadData();
                setFormData(prev => ({ ...prev, name: '', level: 1, class: '', job: null, main: null }));
            }
        } catch (error) {
            console.error('Error saving character:', error);
        } finally {
            setIsSaving(false);
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

    const handleSync = async (id: string) => {
        setSyncingId(id);
        try {
            const ok = await charactersService.syncFromNexon(id);
            if (!ok) alert('Character not found in Nexon rankings. Make sure the name is spelled exactly as in-game (case-sensitive).');
            else await loadData();
        } catch (error: any) {
            console.error('Error syncing character:', error);
            alert(`Sync failed: ${error?.message || error}`);
        } finally {
            setSyncingId(null);
        }
    };

    const handleSyncAll = async () => {
        setSyncingAll(true);
        try {
            const { synced, failed } = await charactersService.syncAllFromNexon();
            alert(`Sync complete: ${synced} updated, ${failed} failed.`);
            await loadData();
        } catch (error) {
            console.error('Error syncing all:', error);
        } finally {
            setSyncingAll(false);
        }
    };

    const columns: Column<CharacterWithAccount>[] = [
        { key: 'account', header: 'Acc.', render: (c) => c.account?.number !== undefined ? `N° ${c.account.number}` : '-' },
        {
            key: 'avatar',
            header: '',
            render: (c) => c.avatar_url ? (
                <img src={c.avatar_url} alt={c.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>?</div>
            )
        },
        {
            key: 'name',
            header: 'Name',
            render: (c) => (
                <span
                    style={{ cursor: 'pointer', fontWeight: 600, color: '#818cf8' }}
                    onClick={() => setSelectedChar(c)}
                >
                    {c.name}
                </span>
            )
        },
        {
            key: 'level',
            header: 'Level',
            render: (c) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{c.level}</div>
                    {c.exp_percent !== null && c.exp_percent !== undefined && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Number(c.exp_percent).toFixed(1)}%</div>
                    )}
                </div>
            )
        },
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
            key: 'last_synced',
            header: 'Synced',
            render: (c) => c.last_synced_at ? (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(c.last_synced_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                </span>
            ) : <span style={{ color: '#475569', fontSize: '0.75rem' }}>Never</span>
        },
        {
            key: 'arcane',
            header: 'Arcane',
            render: (c) => {
                const total = allSymbols
                    .filter(s => s.character_id === c.id && s.symbol_type === 'arcane')
                    .reduce((sum, s) => sum + s.symbol_level, 0);
                const pct = total / ARCANE_MAX;
                return (
                    <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: total === ARCANE_MAX ? '#4ade80' : '#f1f5f9', fontWeight: 600 }}>{total}</span>
                        <span style={{ color: '#475569' }}>/{ARCANE_MAX}</span>
                        {total > 0 && (
                            <div style={{ marginTop: '3px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', width: '48px' }}>
                                <div style={{ width: `${pct * 100}%`, height: '100%', background: total === ARCANE_MAX ? '#4ade80' : '#818cf8', borderRadius: '2px', transition: 'width 0.2s' }} />
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'sacred',
            header: 'Sacred',
            render: (c) => {
                const total = allSymbols
                    .filter(s => s.character_id === c.id && s.symbol_type === 'sacred')
                    .reduce((sum, s) => sum + s.symbol_level, 0);
                const pct = total / SACRED_MAX;
                return (
                    <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: total === SACRED_MAX ? '#4ade80' : '#f1f5f9', fontWeight: 600 }}>{total}</span>
                        <span style={{ color: '#475569' }}>/{SACRED_MAX}</span>
                        {total > 0 && (
                            <div style={{ marginTop: '3px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', width: '48px' }}>
                                <div style={{ width: `${pct * 100}%`, height: '100%', background: total === SACRED_MAX ? '#4ade80' : '#fbbf24', borderRadius: '2px', transition: 'width 0.2s' }} />
                            </div>
                        )}
                    </div>
                );
            }
        },
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
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSync(c.id)}
                        disabled={syncingId === c.id}
                    >
                        {syncingId === c.id ? '...' : 'Sync'}
                    </Button>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={handleSyncAll} disabled={syncingAll}>
                            {syncingAll ? 'Syncing...' : 'Sync All'}
                        </Button>
                        <Button onClick={() => handleOpenModal()}>+ New Character</Button>
                    </div>
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

                <CharacterDetailModal
                    character={selectedChar}
                    classes={classes}
                    onClose={() => setSelectedChar(null)}
                />
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingCharacter ? 'Edit Character' : 'New Character'}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-form-grid">
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
                            placeholder="Exact in-game name"
                            required
                        />
                        {editingCharacter && (
                            <>
                                <Input
                                    label="Level"
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={formData.level}
                                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                                />
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
                                    options={[{ value: '', label: 'Select Class' }, ...classOptions]}
                                    disabled={!formData.job}
                                />
                            </>
                        )}
                    </div>

                    {/* COMPACT CHARACTER LIST (Option B) */}
                    <div className="modal-characters-list">
                        <h4>Characters in this account</h4>
                        <div className="character-compact-grid">
                            {characters
                                .filter(c => c.account_id === formData.account_id)
                                .sort((a, b) => {
                                    const isAMain = a.main === 'Main' || a.account?.number === 0;
                                    const isBMain = b.main === 'Main' || b.account?.number === 0;

                                    // Sort by Main status first (Mains first)
                                    if (isAMain && !isBMain) return -1;
                                    if (!isAMain && isBMain) return 1;

                                    // Then sort by Level descending
                                    return (b.level || 0) - (a.level || 0);
                                })
                                .map(c => {
                                    const jobClass = classes.find(cls => cls.class_name === c.class);
                                    const jobIcon = jobClass?.image_1 || jobClass?.image_2;
                                    const isEditing = editingCharacter?.id === c.id;

                                    return (
                                        <div
                                            key={c.id}
                                            className={`character-compact-card ${isEditing ? 'is-editing' : ''}`}
                                            onClick={() => handleOpenModal(c)}
                                        >
                                            <div className="character-compact-icon">
                                                {c.class === 'Xenon' ? (
                                                    <img src="/xenon.png" alt="Xenon" />
                                                ) : jobIcon ? (
                                                    <img src={jobIcon} alt={c.job || ''} />
                                                ) : (
                                                    <span style={{ fontSize: '12px' }}>?</span>
                                                )}
                                            </div>
                                            <div className="character-compact-info">
                                                <span className="character-compact-name">{c.name}</span>
                                                <div className="character-compact-meta">
                                                    <span className="character-compact-level">Lvl {c.level}</span>
                                                    <span className="character-compact-class">{c.class}</span>
                                                </div>
                                            </div>
                                            {(c.main === 'Main' || c.account?.number === 0) && (
                                                <span className="character-compact-type">Main</span>
                                            )}
                                        </div>
                                    );
                                })}
                            {characters.filter(c => c.account_id === formData.account_id).length === 0 && (
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                                    No characters found in this account yet.
                                </p>
                            )}
                        </div>
                    </div>

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
                            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
                                {editingCharacter ? 'Close' : 'Cancel'}
                            </Button>
                            <Button type="submit" loading={isSaving} disabled={isSaving}>
                                {isSaving ? 'Processing...' : (editingCharacter ? 'Save Changes' : 'Create Character')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default Characters;
