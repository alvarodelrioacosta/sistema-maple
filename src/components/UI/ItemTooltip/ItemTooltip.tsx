import React from 'react';
import type { Item, PotentialTier } from '../../../types';
import './ItemTooltip.css';

interface ItemTooltipProps {
    item: Item;
    image?: string | null;
    baseSlots?: number;
    canStarforce?: boolean;
    infiniteTrades?: boolean;
}

const TIER_LETTER: Record<string, string> = {
    Legendary: 'L',
    Unique: 'U',
    Epic: 'E',
    Rare: 'R',
};

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, image, canStarforce, infiniteTrades }) => {
    const getTierClass = (tier?: PotentialTier | null) => tier ? `tier-${tier.toLowerCase()}` : '';

    return (
        <div className="item-tooltip">
            <div className="tooltip-header">
                <div className="tooltip-item-name">
                    {item.name}
                    {(canStarforce !== false) && item.star_force > 0 && (
                        <span className="tooltip-sf-inline">
                            <span className="tooltip-sf-star">★</span>
                            {item.star_force}
                        </span>
                    )}
                </div>
            </div>

            <div className="tooltip-image-container">
                {image
                    ? <img src={image} alt={item.name} />
                    : <div className="tooltip-img-placeholder" />
                }
            </div>

            <div className="tooltip-meta">
                {item.tradeability && <span>{item.tradeability}</span>}
                {!infiniteTrades && item.remaining_trade_slots != null && (
                    <span>Slots: {item.remaining_trade_slots}</span>
                )}
            </div>

            <hr className="tooltip-divider" />

            {item.main_potential_tier && (
                <div className="tooltip-pot-group">
                    <div className={`tooltip-pot-header ${getTierClass(item.main_potential_tier)}`}>
                        <span className="tooltip-pot-badge">
                            {TIER_LETTER[item.main_potential_tier] ?? 'P'}
                        </span>
                        <span>Main Potential</span>
                    </div>
                    <div className={`tooltip-pot-lines ${getTierClass(item.main_potential_tier)}`}>
                        {item.main_potential_1 && <div>{item.main_potential_1}</div>}
                        {item.main_potential_2 && <div>{item.main_potential_2}</div>}
                        {item.main_potential_3 && <div>{item.main_potential_3}</div>}
                    </div>
                </div>
            )}

            {item.bonus_potential_tier && (
                <div className="tooltip-pot-group">
                    <div className={`tooltip-pot-header ${getTierClass(item.bonus_potential_tier)}`}>
                        <span className="tooltip-pot-badge">
                            {TIER_LETTER[item.bonus_potential_tier] ?? 'B'}
                        </span>
                        <span>Bonus Potential</span>
                    </div>
                    <div className={`tooltip-pot-lines ${getTierClass(item.bonus_potential_tier)}`}>
                        {item.bonus_potential_1 && <div>{item.bonus_potential_1}</div>}
                        {item.bonus_potential_2 && <div>{item.bonus_potential_2}</div>}
                        {item.bonus_potential_3 && <div>{item.bonus_potential_3}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};
