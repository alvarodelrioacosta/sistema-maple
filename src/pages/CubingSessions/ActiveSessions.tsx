import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Table } from '../../components/UI';
import { clientsService, appSettingsService } from '../../services';
import type { CubeSession, Client, Item, ResourceUsageHistory } from '../../types';
import type { Column } from '../../components/UI/Table';
import supabase from '../../lib/supabase';

export const ActiveSessions: React.FC = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<CubeSession[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [history, setHistory] = useState<ResourceUsageHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [usdToMesosRate, setUsdToMesosRate] = useState<number>(0);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            // Fetch Ongoing sessions
            const { data: sessionData, error: sessionError } = await supabase
                .from('cube_sessions')
                .select('*')
                .eq('cubing_session_status', 'Ongoing')
                .order('created_at', { ascending: false });

            if (sessionError) throw sessionError;

            const sessions = sessionData as CubeSession[];
            setSessions(sessions);

            if (sessions.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch related data
            const sessionIds = sessions.map(s => s.id);
            const itemIds = [...new Set(sessions.map(s => s.item_id).filter(Boolean))];

            const [clientsData, itemsData, historyData, rate] = await Promise.all([
                clientsService.getAll(),
                supabase.from('items').select('*').in('id', itemIds).then(res => res.data as Item[]),
                supabase.from('resource_usage_history').select('*').in('session_id', sessionIds).then(res => res.data as ResourceUsageHistory[]),
                appSettingsService.getMesoUsdRate()
            ]);

            setClients(clientsData || []);
            setItems(itemsData || []);
            setHistory(historyData || []);
            setUsdToMesosRate(rate);

        } catch (error) {
            console.error("Error loading active sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const getSessionUsage = (sessionId: string) => {
        const sessionHistory = history.filter(h => h.session_id === sessionId);

        const totals = {
            solid_cubes: 0,
            bright_cubes: 0,
            bonus_bright_cubes: 0,
            psok: 0,
            perfect_innoc: 0,
            guardian_scroll: 0
        };

        sessionHistory.forEach(entry => {
            if (entry.resource_type === 'solid_cubes') totals.solid_cubes += entry.quantity;
            if (entry.resource_type === 'bright_cubes') totals.bright_cubes += entry.quantity;
            if (entry.resource_type === 'bonus_bright_cubes') totals.bonus_bright_cubes += entry.quantity;
            if (entry.resource_type === 'psok') totals.psok += entry.quantity;
            if (entry.resource_type === 'perfect_innocinence' || (entry.resource_type as any) === 'perfect_innoc') totals.perfect_innoc += entry.quantity;
            if (entry.resource_type === 'guardian_scroll') totals.guardian_scroll += entry.quantity;
        });

        return totals;
    };

    const handleContinue = (session: CubeSession) => {
        navigate('/upgrade-workspace-v2', { state: { itemId: session.item_id, sessionId: session.id, accountId: session.account_id } });
    };

    const columns: Column<CubeSession>[] = [
        {
            key: 'client',
            header: 'Client',
            render: (session) => {
                const client = clients.find(c => c.id === session.client_id);
                return <span style={{ fontWeight: 600 }}>{client?.name || 'Unknown Client'}</span>;
            }
        },
        {
            key: 'item',
            header: 'Item',
            render: (session) => {
                const item = items.find(i => i.id === session.item_id);
                return (
                    <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{item?.name || 'Unknown Item'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {item?.status.replace('_', ' ')}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'mainPotential',
            header: 'Main Potential',
            render: (session) => {
                const item = items.find(i => i.id === session.item_id);
                if (!item || !item.main_potential_tier) return <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>;

                const lines = [item.main_potential_1, item.main_potential_2, item.main_potential_3].filter(Boolean).join(', ');

                return (
                    <div className={`text-${item.main_potential_tier.toLowerCase()}`} style={{ fontSize: '0.85rem', fontWeight: 500, maxWidth: '150px' }}>
                        {lines || 'No lines'}
                    </div>
                );
            }
        },
        {
            key: 'bonusPotential',
            header: 'Bonus Potential',
            render: (session) => {
                const item = items.find(i => i.id === session.item_id);
                if (!item || !item.bonus_potential_tier) return <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>;

                const lines = [item.bonus_potential_1, item.bonus_potential_2, item.bonus_potential_3].filter(Boolean).join(', ');

                return (
                    <div className={`text-${item.bonus_potential_tier.toLowerCase()}`} style={{ fontSize: '0.85rem', fontWeight: 500, maxWidth: '150px', opacity: 0.9 }}>
                        {lines || 'No lines'}
                    </div>
                );
            }
        },
        {
            key: 'usage',
            header: 'Resources Used',
            render: (session) => {
                const usage = getSessionUsage(session.id);
                return (
                    <div className="resource-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                        {usage.solid_cubes > 0 && <span style={{ color: 'var(--color-potential-rare)' }}>Solid: <strong>{usage.solid_cubes}</strong></span>}
                        {usage.bright_cubes > 0 && <span style={{ color: 'var(--color-potential-epic)' }}>Bright: <strong>{usage.bright_cubes}</strong></span>}
                        {usage.bonus_bright_cubes > 0 && <span style={{ color: 'var(--color-potential-unique)' }}>Bonus: <strong>{usage.bonus_bright_cubes}</strong></span>}
                        {usage.psok > 0 && <span style={{ color: '#f87171' }}>PSOK: <strong>{usage.psok}</strong></span>}
                        {usage.perfect_innoc > 0 && <span style={{ color: '#60a5fa' }}>P.Innoc: <strong>{usage.perfect_innoc}</strong></span>}
                        {usage.guardian_scroll > 0 && <span style={{ color: '#fbbf24' }}>Guardian: <strong>{usage.guardian_scroll}</strong></span>}
                        {Object.values(usage).every(v => v === 0) && <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>}
                    </div>
                );
            }
        },
        {
            key: 'total',
            header: 'Valued Total',
            render: (session) => {
                const total = session.cubing_session_total || 0;
                const isMeso = session.currency === 'Mesos (b)';
                const rate = session.meso_rate || usdToMesosRate;

                let valUSD = 0;
                let valMesos = 0;

                if (isMeso) {
                    valMesos = total;
                    valUSD = valMesos * rate;
                } else {
                    valUSD = total;
                    valMesos = rate > 0 ? valUSD / rate : 0;
                }

                return (
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1rem' }}>
                            ${valUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 500 }}>
                            {valMesos.toFixed(2)}B Mesos
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'action',
            header: 'Action',
            render: (session) => (
                <Button size="sm" onClick={() => handleContinue(session)} style={{ minWidth: '80px' }}>
                    Continue
                </Button>
            )
        }
    ];

    return (
        <Card className="active-sessions-container" padding="none" style={{ marginTop: '1rem' }}>
            <Table
                data={sessions}
                columns={columns}
                keyExtractor={(s) => s.id}
                loading={loading}
                emptyMessage="No active sessions found. Start a new one!"
            />
        </Card>
    );
};

