import React, { useEffect, useState } from 'react';
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

const PRESET_1_NAMES = ['Zakum', 'Hilla', 'Papulatus', 'Crimson Queen', 'Pierre', 'Von Bon', 'Vellum', 'Princess No', 'Akechi Mitsuhide'];
const PRESET_2_NAMES = [...PRESET_1_NAMES, 'Cygnus', 'Lotus', 'Damien'];

const BossThumb: React.FC<{ boss: Boss; isActive?: boolean; onClick?: () => void; isCalculator?: boolean }> = ({ boss, isActive = true, onClick, isCalculator }) => (
    <div 
        className={`boss-thumb ${isActive ? 'is-active' : 'is-inactive'} ${isCalculator ? 'is-clickable' : ''}`}
        onClick={onClick}
        title={boss.name}
    >
        {boss.image_url ? (
            <img src={boss.image_url} alt={boss.name} />
        ) : (
            <div className="boss-thumb-placeholder">?</div>
        )}
    </div>
);

const BossCard: React.FC<{ boss: Boss }> = ({ boss }) => {
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
                    <span className={`boss-card__mesos-value ${boss.crystal_mesos == null ? 'boss-card__mesos-value--empty' : ''}`}>
                        {boss.crystal_mesos != null ? formatMesos(boss.crystal_mesos) : '—'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Bosses: React.FC = () => {
    const [bosses, setBosses] = useState<Boss[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        bossesService.getAll().then(data => {
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

    const toggleBossSelection = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (prev.length >= 14) return prev; // Limit to 14
            return [...prev, id];
        });
    };

    const calculateTotal = (namesOrIds: string[], isById = false) => {
        return bosses
            .filter(b => isById ? namesOrIds.includes(b.id) : namesOrIds.includes(b.name))
            .reduce((sum, b) => sum + (b.crystal_mesos || 0), 0);
    };

    const preset1Total = calculateTotal(PRESET_1_NAMES);
    const preset2Total = calculateTotal(PRESET_2_NAMES);
    const calculatorTotal = calculateTotal(selectedIds, true);

    return (
        <div className="bosses-page">
            <Header title="Bosses" subtitle={`${bosses.length} bosses`} />
            
            <div className="bosses-content">
                {!loading && (
                    <div className="bosses-summary">
                        {/* PRESET 1 */}
                        <div className="summary-row">
                            <div className="summary-row__label">Basic Preset</div>
                            <div className="summary-row__thumbs">
                                {bosses.filter(b => PRESET_1_NAMES.includes(b.name)).map(b => (
                                    <BossThumb key={b.id} boss={b} />
                                ))}
                            </div>
                            <div className="summary-row__total">
                                <span className="label">Total:</span>
                                <span className="value">{formatMesos(preset1Total)}</span>
                            </div>
                        </div>

                        {/* PRESET 2 */}
                        <div className="summary-row">
                            <div className="summary-row__label">Extended Preset</div>
                            <div className="summary-row__thumbs">
                                {bosses.filter(b => PRESET_2_NAMES.includes(b.name)).map(b => (
                                    <BossThumb key={b.id} boss={b} />
                                ))}
                            </div>
                            <div className="summary-row__total">
                                <span className="label">Total:</span>
                                <span className="value">{formatMesos(preset2Total)}</span>
                            </div>
                        </div>

                        {/* CALCULATOR */}
                        <div className="summary-row calculator">
                            <div className="summary-row__label">
                                Custom Selector
                                <span className="counter">{selectedIds.length} / 14</span>
                            </div>
                            <div className="summary-row__thumbs">
                                {bosses.map(b => (
                                    <BossThumb 
                                        key={b.id} 
                                        boss={b} 
                                        isActive={selectedIds.includes(b.id)} 
                                        isCalculator 
                                        onClick={() => toggleBossSelection(b.id)} 
                                    />
                                ))}
                            </div>
                            <div className="summary-row__total">
                                <span className="label">Selection:</span>
                                <span className="value highlight">{formatMesos(calculatorTotal)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="bosses-page__loading">Cargando...</div>
                ) : (
                    <div className="bosses-grid">
                        {bosses.map(boss => (
                            <BossCard key={boss.id} boss={boss} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bosses;
