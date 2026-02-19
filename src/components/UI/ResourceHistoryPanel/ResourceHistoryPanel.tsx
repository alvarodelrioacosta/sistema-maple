import React, { useEffect, useState } from 'react';
import { resourceHistoryService, accountsService } from '../../../services';
import type { ResourceUsageHistory, Account } from '../../../types';
import './ResourceHistoryPanel.css';

interface ResourceHistoryPanelProps {
    sessionId?: string | null;
    isOpen: boolean;
    onToggle: () => void;
}

const ACTION_LABELS: Record<string, string> = {
    use: 'Used',
    deduct: 'Deducted',
    transfer: 'Transferred'
};

const RESOURCE_LABELS: Record<string, string> = {
    bright_cubes: 'Bright Cubes',
    bonus_bright_cubes: 'Bonus Bright Cubes',
    psok: 'PSOK',
    perfect_innoc: 'Perfect Innocence',
    guardian_scroll: 'Guardian Scroll',
    reward_points: 'Reward Points',
    item_transfer: 'Item Transfer'
};

const PAYMENT_LABELS: Record<string, string> = {
    stock: 'Stock',
    mesos: 'Mesos',
    rp: 'RP',
    gift: 'Gift'
};

export const ResourceHistoryPanel: React.FC<ResourceHistoryPanelProps> = ({
    sessionId,
    isOpen,
    onToggle
}) => {
    const [history, setHistory] = useState<ResourceUsageHistory[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && sessionId) {
            loadHistory();
        }
    }, [isOpen, sessionId]);

    const loadHistory = async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const [historyData, accountsData] = await Promise.all([
                resourceHistoryService.getBySession(sessionId),
                accountsService.getAll()
            ]);
            setHistory(historyData);
            setAccounts(accountsData);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAccountName = (accountId: string | null) => {
        if (!accountId) return 'Unknown';
        const account = accounts.find(a => a.id === accountId);
        return account ? `#${account.number}` : 'Unknown';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'use': return '#4ade80'; // green
            case 'deduct': return '#f59e0b'; // amber
            case 'transfer': return '#60a5fa'; // blue
            default: return '#888';
        }
    };

    return (
        <div className="resource-history-panel">
            <button
                className="history-toggle-btn"
                onClick={onToggle}
                type="button"
            >
                <span>📜 Resource History</span>
                <span className="toggle-icon">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="history-content">
                    {loading ? (
                        <div className="history-loading">Loading...</div>
                    ) : history.length === 0 ? (
                        <div className="history-empty">No resource usage recorded yet</div>
                    ) : (
                        <div className="history-list">
                            {history.map((entry) => (
                                <div key={entry.id} className="history-entry">
                                    <div className="entry-time">{formatDate(entry.created_at)}</div>
                                    <div className="entry-details">
                                        <span
                                            className="entry-action"
                                            style={{ color: getActionColor(entry.action_type) }}
                                        >
                                            {ACTION_LABELS[entry.action_type] || entry.action_type}
                                        </span>
                                        <span className="entry-qty">x{entry.quantity}</span>
                                        <span className="entry-resource">
                                            {RESOURCE_LABELS[entry.resource_type] || entry.resource_type}
                                        </span>
                                        {/* Show transfer account info */}
                                        {entry.action_type === 'transfer' && (
                                            <span className="entry-transfer-info">
                                                {getAccountName(entry.account_id)} → {getAccountName(entry.target_account_id)}
                                            </span>
                                        )}
                                        {entry.payment_method && (
                                            <span className="entry-payment">
                                                via {PAYMENT_LABELS[entry.payment_method] || entry.payment_method}
                                            </span>
                                        )}
                                        {entry.meso_cost > 0 && (
                                            <span className="entry-cost meso">
                                                ({entry.meso_cost}B Mesos)
                                            </span>
                                        )}
                                        {entry.rp_cost > 0 && (
                                            <span className="entry-cost rp">
                                                ({entry.rp_cost} RP)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResourceHistoryPanel;
