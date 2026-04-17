import React, { useEffect, useState, useRef } from 'react';
import { Header } from '../../components/Layout';
import { bossesService } from '../../services';
import type { Boss } from '../../services';
import './Bosses.css';

const formatMesos = (value: number) =>
    new Intl.NumberFormat('en-US').format(value);

const BOSS_ORDER = [
    'Zakum', 'Hilla', 'Papulatus', 'Cygnus', 'Pink Bean', 'Magnus',
    'Crimson Queen', 'Pierre', 'Von Bon', 'Vellum', 'Princess No', 'Akechi Mitsuhide',
    'Lotus', 'Damien', 'Guardian Angel Slime', 'Lucid'
];

const BossCard: React.FC<{ boss: Boss; onSaveMesos: (id: string, value: number | null) => void }> = ({ boss, onSaveMesos }) => {
    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState(boss.crystal_mesos?.toString() ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const handleSave = () => {
        setEditing(false);
        const parsed = inputValue.trim() === '' ? null : parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
        if (parsed !== boss.crystal_mesos) {
            onSaveMesos(boss.id, isNaN(parsed as number) ? null : parsed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') { setEditing(false); setInputValue(boss.crystal_mesos?.toString() ?? ''); }
    };

    return (
        <div className="boss-card">
            <div className="boss-card__image-wrap">
                {boss.image_url
                    ? <img src={boss.image_url} alt={boss.name} className="boss-card__image" />
                    : <div className="boss-card__image-placeholder">?</div>
                }
            </div>
            <div className="boss-card__body">
                <div className="boss-card__name">{boss.name}</div>
                <div className="boss-card__badges">
                    {boss.needs_prequest && (
                        <span className="boss-card__badge boss-card__badge--prequest">Pre-Quest</span>
                    )}
                </div>
                <div className="boss-card__mesos-row">
                    <span className="boss-card__mesos-label">Crystal</span>
                    {editing ? (
                        <input
                            ref={inputRef}
                            className="boss-card__mesos-input"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            placeholder="0"
                        />
                    ) : (
                        <span
                            className={`boss-card__mesos-value ${boss.crystal_mesos == null ? 'boss-card__mesos-value--empty' : ''}`}
                            onClick={() => setEditing(true)}
                            title="Click to edit"
                        >
                            {boss.crystal_mesos != null ? `${formatMesos(boss.crystal_mesos)}` : '—'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const Bosses: React.FC = () => {
    const [bosses, setBosses] = useState<Boss[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        bossesService.getAll().then(data => {
            // Sort bosses according to the requested order
            const sorted = [...data].sort((a, b) => {
                const indexA = BOSS_ORDER.indexOf(a.name);
                const indexB = BOSS_ORDER.indexOf(b.name);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
            setBosses(sorted);
        }).finally(() => setLoading(false));
    }, []);

    const handleSaveMesos = async (id: string, value: number | null) => {
        try {
            const updated = await bossesService.update(id, { crystal_mesos: value });
            setBosses(prev => prev.map(b => b.id === id ? updated : b));
        } catch (err) {
            console.error('Error updating boss mesos:', err);
        }
    };

    return (
        <div className="bosses-page">
            <Header title="Bosses" subtitle={`${bosses.length} bosses`} />
            {loading ? (
                <div className="bosses-page__loading">Cargando...</div>
            ) : (
                <div className="bosses-grid">
                    {bosses.map(boss => (
                        <BossCard key={boss.id} boss={boss} onSaveMesos={handleSaveMesos} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Bosses;
