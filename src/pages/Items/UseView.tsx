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
const DRAGGABLE_TYPES = new Set<ItemType>(['Ring', 'Pendant', 'Totem']);

const CAPACITY: Partial<Record<ItemType, number>> = {
    Ring: 5,
    Totem: 3,
    Pendant: 2,
};
const capacityOf = (type: ItemType) => CAPACITY[type] ?? 1;

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

const DISTINCT_TYPES: ItemType[] = [...new Set(SLOT_POSITIONS.map(p => p.type))];

const slotLabel = (type: ItemType, index: number) =>
    capacityOf(type) > 1 ? `${type} ${index + 1}` : type;

function derivedCompare(a: ItemWithCharacter, b: ItemWithCharacter, type: ItemType): number {
    if (type === 'Ring') {
        const aLast = RING_PINNED_LAST.has(a.name);
        const bLast = RING_PINNED_LAST.has(b.name);
        if (aLast !== bLast) return aLast ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
}

// Build a fixed-length positions array for a type, honoring persisted slot_index.
function buildPositions(items: ItemWithCharacter[], type: ItemType, cap: number) {
    const positions: (ItemWithCharacter | null)[] = Array(cap).fill(null);
    const pinned: ItemWithCharacter[] = [];
    const floating: ItemWithCharacter[] = [];
    for (const it of items) {
        if (it.slot_index != null && it.slot_index >= 0 && it.slot_index < cap) pinned.push(it);
        else floating.push(it);
    }
    pinned.sort((a, b) => (a.slot_index! - b.slot_index!));
    for (const it of pinned) {
        if (positions[it.slot_index!] == null) positions[it.slot_index!] = it;
        else floating.push(it);
    }
    floating.sort((a, b) => derivedCompare(a, b, type));
    let f = 0;
    for (let p = 0; p < cap; p++) {
        if (positions[p] == null && f < floating.length) positions[p] = floating[f++];
    }
    return { positions, overflow: floating.slice(f) };
}

interface UseViewProps {
    items: ItemWithCharacter[];
    itemsDB: ItemDB[];
    getImageUrl: (name: string) => string | null | undefined;
    onEdit: (item: ItemWithCharacter) => void;
    onReorder: (updates: { id: string; slot_index: number }[]) => void;
}

export const UseView: React.FC<UseViewProps> = ({ items, itemsDB, getImageUrl, onEdit, onReorder }) => {
    // Characters with in-use items: Main first, then alphabetical.
    const characters = useMemo(() => {
        const map = new Map<string, ItemWithCharacter['character']>();
        for (const item of items) {
            if (item.character_id && item.character && !map.has(item.character_id)) {
                map.set(item.character_id, item.character);
            }
        }
        return [...map.entries()]
            .map(([id, char]) => ({ id, char }))
            .sort((a, b) => {
                const am = a.char?.main === 'Main' ? 0 : 1;
                const bm = b.char?.main === 'Main' ? 0 : 1;
                if (am !== bm) return am - bm;
                return (a.char?.name ?? '').localeCompare(b.char?.name ?? '');
            });
    }, [items]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drag, setDrag] = useState<{ type: ItemType; fromIndex: number } | null>(null);

    const activeId = selectedId && characters.some(c => c.id === selectedId)
        ? selectedId
        : characters[0]?.id ?? null;

    const { positionsByType, overflow } = useMemo(() => {
        const posByType: Partial<Record<ItemType, (ItemWithCharacter | null)[]>> = {};
        const over: { item: ItemWithCharacter; type: ItemType; capacity: number }[] = [];
        if (!activeId) return { positionsByType: posByType, overflow: over };

        const charItems = items.filter(i => i.character_id === activeId);
        const byType: Partial<Record<ItemType, ItemWithCharacter[]>> = {};
        for (const it of charItems) {
            const type = itemsDB.find(db => db.name === it.name)?.type;
            if (!type) continue;
            if (!byType[type]) byType[type] = [];
            byType[type]!.push(it);
        }

        for (const type of DISTINCT_TYPES) {
            const cap = capacityOf(type);
            const { positions, overflow: ov } = buildPositions(byType[type] ?? [], type, cap);
            posByType[type] = positions;
            for (const it of ov) over.push({ item: it, type, capacity: cap });
        }
        return { positionsByType: posByType, overflow: over };
    }, [items, itemsDB, activeId]);

    if (characters.length === 0) {
        return <div className="items-empty">No items with status "In Use" found.</div>;
    }

    const activeChar = characters.find(c => c.id === activeId);
    const avatarUrl = activeChar?.char?.avatar_url ?? null;

    const handleDrop = (type: ItemType, toIndex: number) => {
        if (!drag || drag.type !== type || drag.fromIndex === toIndex) { setDrag(null); return; }
        const positions = [...(positionsByType[type] ?? [])];
        const moving = positions[drag.fromIndex];
        if (!moving) { setDrag(null); return; }
        const target = positions[toIndex];
        positions[toIndex] = moving;
        positions[drag.fromIndex] = target ?? null;
        const updates: { id: string; slot_index: number }[] = [];
        positions.forEach((it, p) => {
            if (it && it.slot_index !== p) updates.push({ id: it.id, slot_index: p });
        });
        setDrag(null);
        if (updates.length) onReorder(updates);
    };

    return (
        <div className="use-view">
            {/* Character selector */}
            <div className="use-selector">
                {characters.map(({ id, char }) => (
                    <button
                        key={id}
                        className={`use-chip${id === activeId ? ' active' : ''}`}
                        onClick={() => setSelectedId(id)}
                    >
                        <span className="use-chip__name">{char?.name ?? 'Unknown'}</span>
                    </button>
                ))}
            </div>

            {/* Equipment window */}
            <div className="use-window-scroll">
                <div className="equip-window">
                    <div className="equip-window__char">
                        <div className="equip-window__char-avatar">
                            {avatarUrl
                                ? <img src={avatarUrl} alt={activeChar?.char?.name ?? ''} />
                                : <div className="equip-window__char-avatar-empty" />
                            }
                        </div>
                        <div className="equip-window__char-name">{activeChar?.char?.name ?? 'Unknown'}</div>
                    </div>

                    {SLOT_POSITIONS.map(pos => {
                        const item = positionsByType[pos.type]?.[pos.index] ?? undefined;
                        const isDraggableType = DRAGGABLE_TYPES.has(pos.type);
                        const canDrop = !!drag && drag.type === pos.type;
                        return (
                            <EquipSlot
                                key={pos.area}
                                gridArea={pos.area}
                                label={slotLabel(pos.type, pos.index)}
                                item={item}
                                imageUrl={item ? getImageUrl(item.name) : undefined}
                                itemsDB={itemsDB}
                                onEdit={item ? () => onEdit(item) : undefined}
                                draggable={isDraggableType && !!item}
                                canDrop={canDrop}
                                onDragStartItem={isDraggableType && item ? () => setDrag({ type: pos.type, fromIndex: pos.index }) : undefined}
                                onDragEndItem={() => setDrag(null)}
                                onDropItem={canDrop ? () => handleDrop(pos.type, pos.index) : undefined}
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
                            <div
                                key={item.id}
                                className="use-conflict-item"
                                onClick={() => onEdit(item)}
                            >
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
