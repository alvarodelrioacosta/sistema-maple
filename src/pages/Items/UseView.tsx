import React, { useMemo } from 'react';
import type { ItemWithCharacter, ItemDB, ItemType } from '../../types';
import { ItemCard } from '../../components/UI';
import './UseView.css';

interface SlotDef {
    type: ItemType;
    label: string;
    capacity: number;
}

const EQUIPMENT_SLOTS: SlotDef[] = [
    { type: 'Ring',       label: 'Ring',       capacity: 4 },
    { type: 'Pendant',    label: 'Pendant',    capacity: 2 },
    { type: 'Earring',    label: 'Earring',    capacity: 1 },
    { type: 'Belt',       label: 'Belt',       capacity: 1 },
    { type: 'Pocket',     label: 'Pocket',     capacity: 1 },
    { type: 'Eye Acc.',   label: 'Eye Acc.',   capacity: 1 },
    { type: 'Face Acc.',  label: 'Face Acc.',  capacity: 1 },
    { type: 'Weapon',     label: 'Weapon',     capacity: 1 },
    { type: 'Secondary',  label: 'Secondary',  capacity: 1 },
    { type: 'Emblem',     label: 'Emblem',     capacity: 1 },
    { type: 'Hat',        label: 'Hat',        capacity: 1 },
    { type: 'Top',        label: 'Top',        capacity: 1 },
    { type: 'Bottom',     label: 'Bottom',     capacity: 1 },
    { type: 'Shoulder',   label: 'Shoulder',   capacity: 1 },
    { type: 'Cape',       label: 'Cape',       capacity: 1 },
    { type: 'Gloves',     label: 'Gloves',     capacity: 1 },
    { type: 'Shoes',      label: 'Shoes',      capacity: 1 },
    { type: 'Heart',      label: 'Heart',      capacity: 1 },
    { type: 'Badge',      label: 'Badge',      capacity: 1 },
];

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
    formatValue,
    onEdit,
}) => {
    const columns = useMemo(() => {
        // Deduplicate characters present in items, sorted by name
        const charMap = new Map<string, ItemWithCharacter['character']>();
        for (const item of items) {
            if (item.character_id && item.character && !charMap.has(item.character_id)) {
                charMap.set(item.character_id, item.character);
            }
        }
        const sortedChars = [...charMap.entries()].sort((a, b) =>
            (a[1]?.name ?? '').localeCompare(b[1]?.name ?? '')
        );

        return sortedChars.map(([charId, char]) => {
            const charItems = items.filter(i => i.character_id === charId);

            // Group by ItemDB type
            const byType: Partial<Record<ItemType, ItemWithCharacter[]>> = {};
            for (const item of charItems) {
                const type = itemsDB.find(db => db.name === item.name)?.type;
                if (!type) continue;
                if (!byType[type]) byType[type] = [];
                byType[type]!.push(item);
            }

            // Sort each group by name, then split into assigned vs overflow
            const assignedByType: Partial<Record<ItemType, ItemWithCharacter[]>> = {};
            const overflowItems: { item: ItemWithCharacter; type: ItemType; capacity: number }[] = [];

            for (const slot of EQUIPMENT_SLOTS) {
                const group = [...(byType[slot.type] ?? [])].sort((a, b) => a.name.localeCompare(b.name));
                assignedByType[slot.type] = group.slice(0, slot.capacity);
                for (const item of group.slice(slot.capacity)) {
                    overflowItems.push({ item, type: slot.type, capacity: slot.capacity });
                }
            }

            return { charId, char, assignedByType, overflowItems };
        });
    }, [items, itemsDB]);

    if (columns.length === 0) {
        return <div className="items-empty">No items with status "In Use" found.</div>;
    }

    return (
        <div className="use-view">
            {columns.map(({ charId, char, assignedByType, overflowItems }) => (
                <div key={charId} className="use-column">
                    <div className="use-column-header">{char?.name ?? 'Unknown'}</div>

                    {overflowItems.length > 0 && (
                        <div className="overflow-section">
                            <div className="overflow-section-title">⚠ Slot conflicts</div>
                            {overflowItems.map(({ item, type, capacity }) => (
                                <div key={item.id} className="overflow-item">
                                    <div className="overflow-warning">
                                        Only {capacity} {type} slot{capacity > 1 ? 's' : ''} allowed
                                    </div>
                                    <ItemCard
                                        item={item}
                                        imageUrl={getImageUrl(item.name)}
                                        accountNumber={getAccountNumber(item.character_id)}
                                        accountTag={getAccountTag(item.character_id)}
                                        charName={item.character?.name}
                                        itemsDB={itemsDB}
                                        filterStatus="in_use"
                                        formatValue={formatValue}
                                        onEdit={() => onEdit(item)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="slot-list">
                        {EQUIPMENT_SLOTS.flatMap(slot =>
                            Array.from({ length: slot.capacity }, (_, i) => {
                                const assignedItem = assignedByType[slot.type]?.[i];
                                const slotLabel = slot.capacity > 1
                                    ? `${slot.label} ${i + 1}`
                                    : slot.label;
                                return (
                                    <div className="slot-row" key={`${slot.type}-${i}`}>
                                        <div className="slot-label">{slotLabel}</div>
                                        {assignedItem ? (
                                            <div className="slot-card">
                                                <ItemCard
                                                    item={assignedItem}
                                                    imageUrl={getImageUrl(assignedItem.name)}
                                                    accountNumber={getAccountNumber(assignedItem.character_id)}
                                                    accountTag={getAccountTag(assignedItem.character_id)}
                                                    charName={assignedItem.character?.name}
                                                    itemsDB={itemsDB}
                                                    filterStatus="in_use"
                                                    formatValue={formatValue}
                                                    onEdit={() => onEdit(assignedItem)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="slot-placeholder">
                                                <span>{slotLabel}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
