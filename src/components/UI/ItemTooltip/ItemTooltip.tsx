import React from 'react';
import type { Item, PotentialTier } from '../../../types';
import './ItemTooltip.css';

interface ItemTooltipProps {
    item: Item;
    image?: string | null;
    baseSlots?: number;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, image, baseSlots }) => {
    // Helper for Tier Color
    const getTierClass = (tier?: PotentialTier | null) => tier ? `tier-${tier.toLowerCase()}` : '';

    return (
        <div className="item-tooltip">
            {/* Header Section */}
            <div className="tooltip-header">
                {/* StarForce */}
                <div className="star-force">
                    {item.star_force > 0 && (
                        <>
                            <span className="star-icon">★</span>
                            <span className="star-count">{item.star_force}</span>
                        </>
                    )}
                </div>

                {/* Name */}
                <div className={`item-name ${getTierClass(item.main_potential_tier)}`}>
                    {item.name}
                </div>

                {/* Tradeability */}
                {item.tradeability && <div className="item-tradeability">{item.tradeability}</div>}

                {/* Slots */}
                {(baseSlots !== 0) && (
                    <div className="item-slots">
                        {baseSlots !== undefined ? `${baseSlots} Slots` : 'Slots Check'}
                    </div>
                )}
            </div>

            {/* Image Section */}
            <div className="tooltip-image-container">
                {image ? (
                    <img src={image} alt={item.name} />
                ) : (
                    <div className="placeholder-img" style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                )}
            </div>

            {/* Separator */}
            <hr style={{ borderColor: '#444', margin: '10px 0', opacity: 0.5 }} />

            {/* Potential Section */}
            {(item.main_potential_tier) && (
                <div className="potential-group">
                    <div className={`potential-header ${getTierClass(item.main_potential_tier)}`}>
                        <span className="pot-icon">P</span>
                        Potential : {item.main_potential_tier}
                    </div>
                    <div className={`potential-lines ${getTierClass(item.main_potential_tier)}`}>
                        {item.main_potential_1 && <div>{item.main_potential_1}</div>}
                        {item.main_potential_2 && <div>{item.main_potential_2}</div>}
                        {item.main_potential_3 && <div>{item.main_potential_3}</div>}
                    </div>
                </div>
            )}

            {/* Bonus Potential Section */}
            {(item.bonus_potential_tier) && (
                <div className="potential-group" style={{ marginTop: 15 }}>
                    <div className={`potential-header ${getTierClass(item.bonus_potential_tier)}`}>
                        <span className="pot-icon">B</span>
                        Bonus Potential : {item.bonus_potential_tier}
                    </div>
                    <div className={`potential-lines ${getTierClass(item.bonus_potential_tier)}`}>
                        {item.bonus_potential_1 && <div>{item.bonus_potential_1}</div>}
                        {item.bonus_potential_2 && <div>{item.bonus_potential_2}</div>}
                        {item.bonus_potential_3 && <div>{item.bonus_potential_3}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};
