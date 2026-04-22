import React from 'react';
import { Modal, Button } from '../../components/UI';
import type { ClientLedgerEntry, CubeSessionMetadata } from '../../types';

const CURRENCY_PREFIX: Record<string, string> = {
    USD: '$',
    'Mesos (b)': '',
};

const CURRENCY_SUFFIX: Record<string, string> = {
    'Mesos (b)': ' b',
};

function formatAmount(amount: number, currency: string): string {
    const prefix = CURRENCY_PREFIX[currency] ?? '';
    const suffix = CURRENCY_SUFFIX[currency] ?? '';
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(amount);
    return `${prefix}${formatted}${suffix}`;
}

const RESOURCE_ROWS: { label: string; qtyKey: keyof CubeSessionMetadata; priceKey: keyof CubeSessionMetadata }[] = [
    { label: 'Bright Cubes',     qtyKey: 'bright_cubes_used',        priceKey: 'bright_price' },
    { label: 'Bonus Bright',     qtyKey: 'bonus_bright_cubes_used',   priceKey: 'bonus_price' },
    { label: 'Solid Cubes',      qtyKey: 'solid_cubes_used',          priceKey: 'solid_price' },
    { label: 'PSOK',             qtyKey: 'psok_used',                 priceKey: 'psok_price' },
    { label: 'Perfect Innoc.',   qtyKey: 'perfect_innoc_used',        priceKey: 'p_innoc_price' },
    { label: 'Guardian Scroll',  qtyKey: 'guardian_scroll_used',      priceKey: 'g_scroll_price' },
];

interface CubeSessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: ClientLedgerEntry | null;
}

export const CubeSessionDetailModal: React.FC<CubeSessionDetailModalProps> = ({ isOpen, onClose, entry }) => {
    if (!entry?.source_metadata) return null;
    const meta = entry.source_metadata;
    const activeRows = RESOURCE_ROWS.filter(r => (meta[r.qtyKey] as number) > 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cubing Session Detail" size="md">
            <div className="arv2-detail-header">
                <span className="arv2-detail-item">{meta.item_name}</span>
                <span className="arv2-detail-account">Account #{meta.account_number}</span>
            </div>

            {activeRows.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.9rem' }}>
                    No resources recorded for this session.
                </p>
            ) : (
                <div className="arv2-detail-table-wrap">
                    <table className="arv2-table">
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th style={{ textAlign: 'center' }}>Used</th>
                                <th style={{ textAlign: 'right' }}>Price / unit</th>
                                <th style={{ textAlign: 'right' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeRows.map(r => {
                                const qty = meta[r.qtyKey] as number;
                                const price = meta[r.priceKey] as number;
                                const subtotal = qty * price;
                                return (
                                    <tr key={r.label}>
                                        <td>{r.label}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                                        <td style={{ textAlign: 'right' }}>{formatAmount(price, entry.currency)}</td>
                                        <td style={{ textAlign: 'right' }} className="arv2-amount--charge">
                                            {formatAmount(subtotal, entry.currency)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {meta.item_cost_enabled && (meta.item_cost ?? 0) > 0 && (
                                <tr>
                                    <td style={{ color: '#a78bfa', fontWeight: 600 }}>Item Cost</td>
                                    <td style={{ textAlign: 'center', color: '#6b7280' }}>—</td>
                                    <td style={{ textAlign: 'right' }}>—</td>
                                    <td style={{ textAlign: 'right' }} className="arv2-amount--charge">
                                        {formatAmount(meta.item_cost ?? 0, entry.currency)}
                                    </td>
                                </tr>
                            )}
                            {meta.adjustment_enabled && (meta.adjustment ?? 0) !== 0 && (
                                <tr>
                                    <td style={{ color: '#fbbf24', fontWeight: 600 }}>{meta.adjustment_label || 'Adjustment'}</td>
                                    <td style={{ textAlign: 'center', color: '#6b7280' }}>—</td>
                                    <td style={{ textAlign: 'right' }}>—</td>
                                    <td style={{ textAlign: 'right', color: (meta.adjustment ?? 0) < 0 ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                                        {formatAmount(meta.adjustment ?? 0, entry.currency)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="arv2-detail-total-row">
                                <td colSpan={3} style={{ fontWeight: 700, color: '#f1f5f9' }}>Total</td>
                                <td style={{ textAlign: 'right' }} className="arv2-detail-total">
                                    {formatAmount(entry.amount, entry.currency)} {entry.currency}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            <div className="arv2-modal-actions">
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
        </Modal>
    );
};
