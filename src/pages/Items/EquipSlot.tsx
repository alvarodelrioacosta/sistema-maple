import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import type { ItemWithCharacter, ItemDB } from '../../types';
import { ItemTooltip } from '../../components/UI/ItemTooltip/ItemTooltip';
import './EquipSlot.css';

const TIER_BORDER: Record<string, string> = {
    Legendary: 'var(--color-pot-legend)',
    Unique:    'var(--color-pot-unique)',
    Epic:      'var(--color-pot-epic)',
    Rare:      'var(--color-pot-rare)',
};

const TOOLTIP_W = 278;
const TOOLTIP_H = 360;
const GAP = 10;

interface EquipSlotProps {
    gridArea: string;
    label: string;
    item?: ItemWithCharacter;
    imageUrl?: string | null;
    itemsDB: ItemDB[];
    onEdit?: () => void;
}

export const EquipSlot: React.FC<EquipSlotProps> = ({
    gridArea,
    label,
    item,
    imageUrl,
    itemsDB,
    onEdit,
}) => {
    const [hovered, setHovered] = useState(false);
    const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!ref.current) { setHovered(true); return; }
        const r = ref.current.getBoundingClientRect();
        const left = (window.innerWidth - r.right >= TOOLTIP_W + GAP)
            ? r.right + GAP
            : r.left - TOOLTIP_W - GAP;
        const top = Math.min(r.top, window.innerHeight - TOOLTIP_H - 8);
        setPreviewStyle({
            position: 'fixed',
            top: Math.max(8, top),
            left: Math.max(8, left),
            zIndex: 600,
            width: TOOLTIP_W,
        });
        setHovered(true);
    }, []);

    if (!item) {
        return (
            <div className="equip-slot equip-slot--empty" style={{ gridArea }}>
                <span>{label}</span>
            </div>
        );
    }

    const tier = item.main_potential_tier;
    const borderColor = tier ? (TIER_BORDER[tier] ?? 'var(--color-pot-none)') : 'var(--color-pot-none)';
    const dbEntry = itemsDB.find(db => db.name === item.name);

    return (
        <div
            ref={ref}
            className="equip-slot equip-slot--filled"
            style={{ gridArea, '--slot-tier': borderColor } as React.CSSProperties}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHovered(false)}
            onClick={onEdit}
        >
            <div className="equip-slot__thumb">
                {imageUrl
                    ? <img src={imageUrl} alt={item.name} />
                    : <div className="equip-slot__thumb-empty" />
                }
            </div>

            {item.star_force > 0 && (
                <span className="equip-slot__sf">
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor">
                        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
                    </svg>
                    {item.star_force}
                </span>
            )}

            {hovered && ReactDOM.createPortal(
                <div className="equip-slot__preview" style={previewStyle}>
                    <ItemTooltip
                        item={item}
                        image={imageUrl}
                        baseSlots={dbEntry?.slots}
                        canStarforce={dbEntry?.can_starforce ?? true}
                        infiniteTrades={dbEntry?.infinite_trades ?? false}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};
