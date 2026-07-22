import React, { useMemo, useState } from 'react';
import type { ItemWithCharacter, ItemDB, ItemType } from '../../types';
import { EquipSlot } from './EquipSlot';
import './UseView.css';

interface SlotPos {
    area: string;
    type: ItemType;
    index: number;
}

const RING_PINNED_LAST = new Set(['Ring of Restraint', 'Continuous Ring']);

// Capacity = how many positions a type occupies in the window.
const CAPACITY: Partial<Record<ItemType, number>> = {
    Ring: 5,
    Totem: 3,
    Pendant: 2,
};
const capacityOf = (type: ItemType) => CAPACITY[type] ?? 1;

// Grid positions, in the MapleStory equipment-window layout.
// `area` matches the grid-template-areas names in UseView.css.
const SLOT_POSITIONS: SlotPos[] = [
    { area: 't1',  type: 'Totem',     index: 0 },
    { area: 't2',  type: 'Totem',     index: 1 },
    { area: 't3',  type: 'Totem',     index: 2 },
    { area: 'r5',  type: 'Ring',      index: 4 },
    { area: 'r1',  type: 'Ring',      index: 0 },
    { area: 'r2',  type: 'Ring',      index: 1 },
    { area: 'r3',  type: 'Ring',      index: 2 },
    { area: 'r4',  type: 'Ring',      index: 3 },
    { area: 'be',  type: 'Belt',      index: 0 },
    { area: 'po',  type: 'Pocket',    index: 0 },
    { area: 'fa',  type: 'Face Acc.', index: 0 },
    { area: 'ea',  type: 'Eye Acc.',  index: 0 },
    { area: 'er',  type: 'Earring',   index: 0 },
    { area: 'p1',  type: 'Pendant',   index: 0 },
    { area: 'p2',  type: 'Pendant',   index: 1 },
    { area: 'hat', type: 'Hat',       index: 0 },
    { area: 'cap', type: 'Cape',      index: 0 },
    { area: 'top', type: 'Top',       index: 0 },
    { area: 'glv', type: 'Gloves',    index: 0 },
    { area: 'bot', type: 'Bottom',    index: 0 },
    { area: 'sho', type: 'Shoes',     index: 0 },
    { area: 'shl', type: 'Shoulder',  index: 0 },
    { area: 'med', type: 'Medal',     index: 0 },
    { area: 'wp',  type: 'Weapon',    index: 0 },
    { area: 'se',  type: 'Secondary', index: 0 },
    { area: 'em',  type: 'Emblem',    index: 0 },
    { area: 'he',  type: 'Heart',     index: 0 },
    { area: 'ba',  type: 'Badge',     index: 0 },
];

const slotLabel = (type: ItemType, index: number) =>
    capacityOf(type) > 1 ? `${type} ${index + 1}` : type;

interface UseViewProps {
    items: ItemWithCharacter[];
    itemsDB: ItemDB[];
    getImageUrl: (name: string) => string | null | undefined;
    getAccountNumber: (charId: string | null) => number | null;
    getAccountTag: (charId: string | null) => string | null;
    formatValue: (v: number) => string;
    onEdit: (item: ItemWithCharacter) => void;
}

export const UseView: React.FC<UseViewProps> = ({
    items,
    itemsDB,
    getImageUrl,
    getAccountNumber,
    getAccountTag,
    onEdit,
}) => {
    // Characters that have at least one in-use item, sorted by name.
    const characters = useMemo(() => {
        const map = new Map<string, ItemWithCharacter['character']>();
        for (const item of items) {
            if (item.character_id && item.character && !map.has(item.character_id)) {
                map.set(item.character_id, item.character);
            }
        }
        return [...map.entries()]
            .map(([id, char]) => ({ id, char }))
            .sort((a, b) => (a.char?.name ?? '').localeCompare(b.char?.name ?? ''));
    }, [items]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Resolve the active character, falling back to the first when the stored id is gone.
    const activeId = selectedId && characters.some(c => c.id === selectedId)
        ? selectedId
        : characters[0]?.id ?? null;

    const { assigned, overflow } = useMemo(() => {
        const result: Partial<Record<ItemType, ItemWithCharacter[]>> = {};
        const over: { item: ItemWithCharacter; type: ItemType; capacity: number }[] = [];
        if (!activeId) return { assigned: result, overflow: over };

        const charItems = items.filter(i => i.character_id === activeId);
        const byType: Partial<Record<ItemType, ItemWithCharacter[]>> = {};
        for (const item of charItems) {
            const type = itemsDB.find(db => db.name === item.name)?.type;
            if (!type) continue;
            if (!byType[type]) byType[type] = [];
            byType[type]!.push(item);
        }

        for (const type of Object.keys(byType) as ItemType[]) {
            const group = [...byType[type]!].sort((a, b) => {
                if (type === 'Ring') {
                    const aLast = RING_PINNED_LAST.has(a.name);
                    const bLast = RING_PINNED_LAST.has(b.name);
                    if (aLast !== bLast) return aLast ? 1 : -1;
                }
                return a.name.localeCompare(b.name);
            });
            const cap = capacityOf(type);
            result[type] = group.slice(0, cap);
            for (const item of group.slice(cap)) {
                over.push({ item, type, capacity: cap });
            }
        }
        return { assigned: result, overflow: over };
    }, [items, itemsDB, activeId]);

    if (characters.length === 0) {
        return <div className="items-empty">No items with status "In Use" found.</div>;
    }

    const activeChar = characters.find(c => c.id === activeId);
    const accountNumber = getAccountNumber(activeId);
    const accountTag = getAccountTag(activeId);

    return (
        <div className="use-view">
            {/* Character selector */}
            <div className="use-selector">
                {characters.map(({ id, char }) => {
                    const acct = getAccountNumber(id);
                    return (
                        <button
                            key={id}
                            className={`use-chip${id === activeId ? ' active' : ''}`}
                            onClick={() => setSelectedId(id)}
                        >
                            <span className="use-chip__name">{char?.name ?? 'Unknown'}</span>
                            {acct != null && <span className="use-chip__acct">#{acct}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Equipment window */}
            <div className="use-window-scroll">
                <div className="equip-window">
                    <div className="equip-window__char">
                        <div className="equip-window__char-name">{activeChar?.char?.name ?? 'Unknown'}</div>
                        {accountNumber != null && (
                            <div className="equip-window__char-acct">
                                #{accountNumber}{accountTag ? ` · ${accountTag}` : ''}
                            </div>
                        )}
                    </div>

                    {SLOT_POSITIONS.map(pos => {
                        const item = assigned[pos.type]?.[pos.index];
                        return (
                            <EquipSlot
                                key={pos.area}
                                gridArea={pos.area}
                                label={slotLabel(pos.type, pos.index)}
                                item={item}
                                imageUrl={item ? getImageUrl(item.name) : undefined}
                                itemsDB={itemsDB}
                                onEdit={item ? () => onEdit(item) : undefined}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Slot conflicts (items beyond a type's capacity, for the active character) */}
            {overflow.length > 0 && (
                <div className="use-conflicts">
                    <div className="use-conflicts-title">⚠ Slot conflicts</div>
                    <div className="use-conflicts-list">
                        {overflow.map(({ item, type, capacity }) => (
                            <div key={item.id} className="use-conflict-item">
                                <span className="use-conflict-name">{item.name}</span>
                                <span className="use-conflict-warning">
                                    Only {capacity} {type} slot{capacity > 1 ? 's' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
