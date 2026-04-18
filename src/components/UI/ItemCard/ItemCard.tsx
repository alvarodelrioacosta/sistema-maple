import React, { useState, useRef, useCallback } from 'react';
import type { ItemWithCharacter, ItemStatus, ItemDB } from '../../../types';
import { ItemTooltip } from '../ItemTooltip/ItemTooltip';
import './ItemCard.css';

interface ItemCardProps {
    item: ItemWithCharacter;
    imageUrl?: string | null;
    accountNumber?: number | null;
    accountTag?: string | null;
    charName?: string;
    itemsDB: ItemDB[];
    filterStatus: ItemStatus | 'all';
    onEdit: () => void;
    onSell?: () => void;
    onListAH?: () => Promise<void>;
    onToggleFavorite?: () => void;
    onCopy?: () => void;
    onReturnToService?: () => void;
    onPriceUpdate?: (id: string, value: number) => Promise<void>;
    formatValue: (value: number) => string;
}

const TIER_LETTER: Record<string, string> = {
    Legendary: 'L',
    Unique: 'U',
    Epic: 'E',
    Rare: 'R',
};

const STATUS_COLORS: Record<string, string> = {
    in_stock:    '#2dbf7a',
    sold:        '#d64545',
    for_sale:    '#3d8fd6',
    in_use:      '#c48a2e',
    bulk:        '#a259d6',
    Service:     '#2dd4bf',
    in_progress: '#38bdf8',
};

export const ItemCard: React.FC<ItemCardProps> = ({
    item,
    imageUrl,
    accountNumber,
    charName,
    itemsDB,
    filterStatus,
    onEdit,
    onSell,
    onListAH,
    onToggleFavorite,
    onCopy,
    onReturnToService,
    formatValue,
}) => {
    const [hovered, setHovered] = useState(false);
    const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});
    const [isListingAH, setIsListingAH] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const TOOLTIP_W = 278;
    const TOOLTIP_H = 360; // generous estimate — covers items with both potentials
    const GAP = 10;

    const handleMouseEnter = useCallback(() => {
        if (!cardRef.current) { setHovered(true); return; }
        const r = cardRef.current.getBoundingClientRect();

        // Horizontal: prefer right, fallback left
        const left = (window.innerWidth - r.right >= TOOLTIP_W + GAP)
            ? r.right + GAP
            : r.left - TOOLTIP_W - GAP;

        // Vertical: align to card top, clamp so tooltip stays inside viewport
        const rawTop = r.top;
        const top = Math.min(rawTop, window.innerHeight - TOOLTIP_H - 8);

        setPreviewStyle({ position: 'fixed', top: Math.max(8, top), left, zIndex: 600, width: TOOLTIP_W });
        setHovered(true);
    }, []);

    const statusColor = STATUS_COLORS[item.status] ?? '#6b6b72';
    const mainTier = item.main_potential_tier as string | null;
    const bonusTier = item.bonus_potential_tier as string | null;
    const isTradeable = item.tradeability === 'Tradeable' || item.tradeability === 'Tradeable Once';
    const itemDBEntry = itemsDB.find(db => db.name === item.name);
    const baseSlots = itemDBEntry?.slots;

    const ahTimer = (() => {
        if (!item.ah_listed_at) return null;
        const diffMs = Date.now() - new Date(item.ah_listed_at).getTime();
        if (diffMs >= 48 * 3600 * 1000) return { expired: true, hours: 0, minutes: 0 };
        const rem = 48 * 3600 * 1000 - diffMs;
        return {
            expired: false,
            hours: Math.floor(rem / 3600000),
            minutes: Math.floor((rem % 3600000) / 60000),
        };
    })();

    return (
        <div
            ref={cardRef}
            className="item-card"
            style={{ '--item-status-color': statusColor } as React.CSSProperties}
            data-status={item.status}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHovered(false)}
        >
            {item.status === 'sold' && <div className="item-card__sold-stamp">SOLD</div>}

            {/* Thumbnail */}
            <div className="item-card__thumb" onClick={onEdit}>
                {imageUrl
                    ? <img src={imageUrl} alt={item.name} />
                    : <div className="item-card__thumb-empty" />
                }
            </div>

            {/* Center info */}
            <div className="item-card__info" onClick={onEdit}>
                <div className="item-card__row1">
                    {item.star_force > 0 && (
                        <span className="item-card__sf">
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor">
                                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
                            </svg>
                            {item.star_force}
                        </span>
                    )}
                    <span className="item-card__pots">
                        {mainTier ? (
                            <span className={`item-card__pot item-card__pot--${mainTier.toLowerCase()}`}>
                                {TIER_LETTER[mainTier] ?? 'P'}
                            </span>
                        ) : null}
                        {bonusTier ? (
                            <span className={`item-card__pot item-card__pot--${bonusTier.toLowerCase()}`}>
                                {TIER_LETTER[bonusTier] ?? 'B'}
                            </span>
                        ) : null}
                        {!mainTier && !bonusTier && (
                            <span className="item-card__pot item-card__pot--none">—</span>
                        )}
                    </span>
                </div>
                <div className="item-card__name">{item.name}</div>
                {accountNumber != null && (
                    <div className="item-card__account">
                        #{accountNumber}
                        {charName ? ` · ${charName}` : ''}
                    </div>
                )}
            </div>

            {/* Right: price + timer + fav */}
            <div className="item-card__right">
                {(item.status === 'for_sale' || item.status === 'sold' || item.status === 'in_use') && (
                    <span className="item-card__price">{formatValue(item.estimated_value || 0)}</span>
                )}
                {item.status === 'for_sale' && ahTimer && (
                    <span className={`item-card__timer${ahTimer.expired ? ' expired' : ahTimer.hours < 6 ? ' low' : ''}`}>
                        {ahTimer.expired ? 'EXP' : `${ahTimer.hours}h${ahTimer.minutes}m`}
                    </span>
                )}
                {filterStatus === 'for_sale' && onToggleFavorite && (
                    <button
                        className={`item-card__fav${item.is_favorite ? ' active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                        title={item.is_favorite ? 'Remove favorite' : 'Add to favorites'}
                    >
                        {item.is_favorite ? '★' : '☆'}
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="item-card__actions" onClick={(e) => e.stopPropagation()}>
                {item.status === 'for_sale' && isTradeable && (
                    <>
                        {onListAH && (
                            <button
                                className="item-card__btn"
                                disabled={isListingAH}
                                onClick={async () => {
                                    setIsListingAH(true);
                                    await onListAH();
                                    setIsListingAH(false);
                                }}
                            >
                                AH
                            </button>
                        )}
                        {onSell && (
                            <button className="item-card__btn item-card__btn--primary" onClick={onSell}>
                                Sold
                            </button>
                        )}
                    </>
                )}

                {item.status === 'for_sale' && !isTradeable && (
                    <span className="item-card__psok-note">Use PSOK</span>
                )}

                {item.status === 'bulk' && filterStatus === 'bulk' && onCopy && (
                    <button className="item-card__btn" onClick={onCopy}>Copy</button>
                )}

                {item.delivered && onReturnToService && (
                    <button
                        className="item-card__btn item-card__btn--return"
                        onClick={onReturnToService}
                    >
                        Return
                    </button>
                )}
            </div>

            {/* Hover preview */}
            {hovered && (
                <div className="item-card__preview" style={previewStyle}>
                    <ItemTooltip item={item} image={imageUrl} baseSlots={baseSlots} />
                </div>
            )}
        </div>
    );
};
