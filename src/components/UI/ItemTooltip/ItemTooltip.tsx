import React from 'react';
import type { Item, PotentialTier } from '../../../types';
import './ItemTooltip.css';

interface ItemTooltipProps {
    item: Item;
    image?: string | null;
    baseSlots?: number;
}

const MAX_STARS = 25;

const StarTrack: React.FC<{ starForce: number }> = ({ starForce }) => {
    const stars = Array.from({ length: MAX_STARS }, (_, i) => i < starForce);
    const groups: boolean[][] = [];
    for (let i = 0; i < MAX_STARS; i += 5) groups.push(stars.slice(i, i + 5));

    return (
        <div className="tooltip-star-track">
            {groups.map((group, gi) => (
                <span key={gi} className="tooltip-star-group">
                    {group.map((filled, si) => (
                        <span key={si} className={`tooltip-star ${filled ? 'filled' : 'empty'}`}>★</span>
                    ))}
                </span>
            ))}
        </div>
    );
};

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, image, baseSlots }) => {
    const getTierClass = (tier?: PotentialTier | null) => tier ? `tier-${tier.toLowerCase()}` : '';

    return (
        <div className="item-tooltip">
            <StarTrack starForce={item.star_force || 0} />

            <div className="tooltip-header">
                <div className={`tooltip-item-name ${getTierClass(item.main_potential_tier)}`}>
                    {item.name}
                    {(item.star_force > 0) && (
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
                {baseSlots !== undefined && baseSlots !== 0 && (
                    <span>Slots: {baseSlots}</span>
                )}
            </div>

            <hr className="tooltip-divider" />

            {item.main_potential_tier && (
                <div className="tooltip-pot-group">
                    <div className={`tooltip-pot-header ${getTierClass(item.main_potential_tier)}`}>
                        <span className="tooltip-pot-badge">P</span>
                        <span>Main Potential</span>
                        <span className="tooltip-pot-tier">[{item.main_potential_tier}]</span>
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
                        <span className="tooltip-pot-badge">A</span>
                        <span>Bonus Potential</span>
                        <span className="tooltip-pot-tier">[{item.bonus_potential_tier}]</span>
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
