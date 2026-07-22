# Equipment Window Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three things to the shipped "In Use" equipment window: (1) name-only chips ordered Main-first + a center avatar, (2) drag-and-drop rearranging of Ring/Pendant/Totem persisted via a new `slot_index` column, and (3) an editable/visible 1–6 level for Ring of Restraint and Continuous Ring.

**Architecture:** Two new nullable `items` columns (`slot_index`, `ring_level`). `UseView` gains Main-first ordering, a center avatar, position-aware slot assignment (honoring `slot_index`), and HTML5 drag-and-drop that snapshots the arrangement and persists it through a new `onReorder` prop → `Items.tsx` → `itemsService.updateSlotIndexes`. `EquipSlot` gains optional drag props and a level badge. `ItemWorkspace` gains a conditional Ring Level control; `ItemTooltip` shows the level.

**Tech Stack:** React 18 + TypeScript (strict) + Vite, Supabase, per-component colocated CSS, tokens in `src/styles/tokens.css`.

## Global Constraints

- Type-check must pass: `npx tsc --noEmit` clean before any task is "done".
- No unused imports or variables — they break Vercel deploys (`npm run lint` clean).
- User-facing strings stay in **English** (matching the app).
- CSS is per-component/colocated and uses tokens; raw hex is acceptable where component CSS already uses it (`EquipSlot.css`, `ItemCard.css`).
- New `Item` fields are **optional** (`slot_index?`, `ring_level?`) so existing insert code (`ItemInsert`) does not break.
- Drag-and-drop is desktop-only; swaps are within the same item type only.
- DB access only through `src/services/`.

**Before you start:** we are on `main`. Create a feature branch:

```bash
git checkout -b feat/equip-window-enhancements
```

## File Structure

- **Create** `supabase/migrations/20260722_items_slot_index_ring_level.sql` — the two columns.
- **Modify** `src/types/index.ts` — add optional `slot_index`, `ring_level` to `Item`.
- **Modify** `src/services/items.ts` — add `updateSlotIndexes`.
- **Rewrite** `src/pages/Items/EquipSlot.tsx` + append to `EquipSlot.css` — drag props + level badge.
- **Modify** `src/pages/Items/ItemWorkspace.tsx` — Ring Level control + save.
- **Modify** `src/components/UI/ItemTooltip/ItemTooltip.tsx` — Ring Level line.
- **Rewrite** `src/pages/Items/UseView.tsx` + `UseView.css` — chips/avatar/order + assignment + DnD.
- **Modify** `src/pages/Items/Items.tsx` — `onReorder` handler + updated `<UseView>` call.

---

### Task 1: Data layer — `slot_index` + `ring_level` columns, types, service

**Files:**
- Create: `supabase/migrations/20260722_items_slot_index_ring_level.sql`
- Modify: `src/types/index.ts:195` (inside `interface Item`)
- Modify: `src/services/items.ts` (after the `update` method, ~line 90)

**Interfaces:**
- Consumes: nothing.
- Produces: `Item.slot_index?: number | null`, `Item.ring_level?: number | null`; `itemsService.updateSlotIndexes(updates: { id: string; slot_index: number }[]): Promise<void>`.

- [ ] **Step 1: Create the migration file** `supabase/migrations/20260722_items_slot_index_ring_level.sql`:

```sql
-- Equipment-window arrangement + leveled-ring support.
alter table public.items add column if not exists slot_index integer;
alter table public.items add column if not exists ring_level integer;
```

- [ ] **Step 2: Add the two optional fields to `Item`.** In `src/types/index.ts`, replace the `is_favorite?` line (line 195):

```typescript
    is_favorite?: boolean;
    slot_index?: number | null;
    ring_level?: number | null;
```

- [ ] **Step 3: Add `updateSlotIndexes` to the items service.** In `src/services/items.ts`, immediately after the `update` method's closing `},` (the method that ends with `return data;` around line 89-90), insert:

```typescript
    async updateSlotIndexes(updates: { id: string; slot_index: number }[]): Promise<void> {
        await Promise.all(
            updates.map(u =>
                supabase.from('items').update({ slot_index: u.slot_index }).eq('id', u.id)
            )
        );
    },
```

- [ ] **Step 4: Type-check** — Run: `npx tsc --noEmit` — Expected: no output (exit 0).

- [ ] **Step 5: Lint** — Run: `npm run lint` — Expected: no new errors.

- [ ] **Step 6: Apply the migration (manual hand-off).** The Supabase MCP is unauthorized; run the SQL from Step 1 in the Supabase SQL editor before the feature is used. (Recorded for the controller — the implementer does not need DB access; the code treats the columns as optional/nullable so it type-checks and builds without them.)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260722_items_slot_index_ring_level.sql src/types/index.ts src/services/items.ts
git commit -m "feat(items): add slot_index and ring_level columns + updateSlotIndexes" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `EquipSlot` — drag props + ring-level badge

**Files:**
- Rewrite: `src/pages/Items/EquipSlot.tsx`
- Modify (append): `src/pages/Items/EquipSlot.css`

**Interfaces:**
- Consumes: `Item.ring_level` (Task 1); `ItemWithCharacter`, `ItemDB`, `ItemTooltip`.
- Produces: `EquipSlot` with the existing props plus optional drag props:
  ```typescript
  draggable?: boolean;
  canDrop?: boolean;
  onDragStartItem?: () => void;
  onDragEndItem?: () => void;
  onDropItem?: () => void;
  ```
  Renders a `Lv{n}` badge (bottom-right) when `item.ring_level != null`, and a drop-target highlight when `canDrop`.

- [ ] **Step 1: Replace the ENTIRE contents of `src/pages/Items/EquipSlot.tsx`** (Read it first). New content:

```tsx
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
    draggable?: boolean;
    canDrop?: boolean;
    onDragStartItem?: () => void;
    onDragEndItem?: () => void;
    onDropItem?: () => void;
}

export const EquipSlot: React.FC<EquipSlotProps> = ({
    gridArea,
    label,
    item,
    imageUrl,
    itemsDB,
    onEdit,
    draggable,
    canDrop,
    onDragStartItem,
    onDragEndItem,
    onDropItem,
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

    const dropProps = {
        onDragOver: canDrop ? (e: React.DragEvent) => e.preventDefault() : undefined,
        onDrop: canDrop ? (e: React.DragEvent) => { e.preventDefault(); onDropItem?.(); } : undefined,
    };
    const dropClass = canDrop ? ' equip-slot--droptarget' : '';

    if (!item) {
        return (
            <div
                className={`equip-slot equip-slot--empty${dropClass}`}
                style={{ gridArea }}
                {...dropProps}
            >
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
            className={`equip-slot equip-slot--filled${dropClass}`}
            style={{ gridArea, '--slot-tier': borderColor } as React.CSSProperties}
            draggable={draggable}
            onDragStart={draggable ? (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                onDragStartItem?.();
            } : undefined}
            onDragEnd={draggable ? () => onDragEndItem?.() : undefined}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHovered(false)}
            onClick={onEdit}
            {...dropProps}
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

            {item.ring_level != null && (
                <span className="equip-slot__lv">Lv{item.ring_level}</span>
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
```

- [ ] **Step 2: Append to `src/pages/Items/EquipSlot.css`** (add at the end, before the final trailing newline):

```css

/* Drag & drop target highlight */
.equip-slot--droptarget {
    outline: 2px dashed var(--color-accent-primary);
    outline-offset: 1px;
}

/* Ring level badge */
.equip-slot__lv {
    position: absolute;
    bottom: -6px;
    right: -6px;
    font-family: var(--font-family-mono);
    font-weight: 700;
    font-size: 9px;
    color: #f0f0f6;
    background: linear-gradient(180deg, #6d43e0, #7c3aed);
    border: 1px solid rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    padding: 1px 5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 3: Type-check** — Run: `npx tsc --noEmit` — Expected: exit 0.
- [ ] **Step 4: Lint** — Run: `npm run lint` — Expected: no errors for `EquipSlot.tsx`. (New optional props are all consumed inside the component, so no unused-var warnings.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Items/EquipSlot.tsx src/pages/Items/EquipSlot.css
git commit -m "feat(items): EquipSlot drag props and ring-level badge" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Ring level editing (ItemWorkspace) + tooltip line

**Files:**
- Modify: `src/pages/Items/ItemWorkspace.tsx`
- Modify: `src/components/UI/ItemTooltip/ItemTooltip.tsx`

**Interfaces:**
- Consumes: `Item.ring_level` (Task 1); the existing `itemsService.update`, `Select` component, and `editingField`/`editingItem` state in ItemWorkspace.
- Produces: a Ring Level control (visible only for `Ring of Restraint` / `Continuous Ring`) that persists `ring_level`; ItemTooltip shows `Ring Lv {n}` when set.

- [ ] **Step 1: Add constants to `ItemWorkspace.tsx`.** After the `TRADEABILITY_OPTIONS` array (ends at line 42, `];`), insert:

```typescript

const LEVELED_RINGS = new Set(['Ring of Restraint', 'Continuous Ring']);

const RING_LEVEL_OPTIONS = [
    { value: '', label: '—' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
];
```

- [ ] **Step 2: Persist `ring_level` on save.** In `handleSaveProperties`, in the first `itemsService.update(initialItem.id, { ... })` call, add `ring_level` after the `star_force` line. Replace:

```typescript
                remaining_trade_slots: editingItem.remaining_trade_slots,
                star_force: editingItem.star_force,
            });
```

with:

```typescript
                remaining_trade_slots: editingItem.remaining_trade_slots,
                star_force: editingItem.star_force,
                ring_level: editingItem.ring_level ?? null,
            });
```

- [ ] **Step 3: Add the Ring Level control to the stats bar.** In the item header's `maple-stats-bar`, insert the control right after the trade-slots block. Replace this exact block (the closing of the trade-slots conditional, the stats-bar `</div>`, the header `</div>`, and the Main Potential comment):

```tsx
                                )}
                            </div>
                        </div>

                        {/* Main Potential */}
```

with:

```tsx
                                )}

                                {LEVELED_RINGS.has(editingItem.name ?? '') && (
                                    editingField === 'ring_level' ? (
                                        <Select
                                            autoFocus
                                            value={editingItem.ring_level != null ? String(editingItem.ring_level) : ''}
                                            onChange={v => {
                                                setEditingItem(prev => ({ ...prev, ring_level: v ? parseInt(v) : null }));
                                                setEditingField(null);
                                            }}
                                            options={RING_LEVEL_OPTIONS}
                                        />
                                    ) : (
                                        <span className="premium-editable" onClick={() => setEditingField('ring_level')}>
                                            Ring Lv: {editingItem.ring_level ?? '—'}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Main Potential */}
```

- [ ] **Step 4: Add the tooltip line.** In `src/components/UI/ItemTooltip/ItemTooltip.tsx`, inside the `tooltip-meta` div, add a ring-level span. Replace:

```tsx
            <div className="tooltip-meta">
                {item.tradeability && <span>{item.tradeability}</span>}
                {!infiniteTrades && item.remaining_trade_slots != null && (
                    <span>Slots: {item.remaining_trade_slots}</span>
                )}
            </div>
```

with:

```tsx
            <div className="tooltip-meta">
                {item.tradeability && <span>{item.tradeability}</span>}
                {!infiniteTrades && item.remaining_trade_slots != null && (
                    <span>Slots: {item.remaining_trade_slots}</span>
                )}
                {item.ring_level != null && <span>Ring Lv {item.ring_level}</span>}
            </div>
```

- [ ] **Step 5: Type-check** — Run: `npx tsc --noEmit` — Expected: exit 0.
- [ ] **Step 6: Lint** — Run: `npm run lint` — Expected: no new errors for the two files.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Items/ItemWorkspace.tsx src/components/UI/ItemTooltip/ItemTooltip.tsx
git commit -m "feat(items): editable + visible ring level (1-6) for leveled rings" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `UseView` chips/avatar/order + drag-and-drop + `Items.tsx` wiring

**Files:**
- Rewrite: `src/pages/Items/UseView.tsx`
- Rewrite: `src/pages/Items/UseView.css`
- Modify: `src/pages/Items/Items.tsx`

**Interfaces:**
- Consumes: `EquipSlot` drag props (Task 2); `Item.slot_index` and `itemsService.updateSlotIndexes` (Task 1); `character.main`, `character.avatar_url`.
- Produces: `UseView` with props `{ items, itemsDB, getImageUrl, onEdit, onReorder }` (the account/`formatValue` props are removed). `Items.tsx` gains `handleReorderItems`.

- [ ] **Step 1: Replace the ENTIRE contents of `src/pages/Items/UseView.tsx`** (Read it first):

```tsx
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
```

- [ ] **Step 2: Replace the ENTIRE contents of `src/pages/Items/UseView.css`** (Read it first):

```css
.use-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-md) var(--spacing-xl);
}

/* ── Character selector ─────────────────────────────────── */
.use-selector {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    padding-bottom: var(--spacing-xs);
}
.use-chip {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    font-family: var(--font-family);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
}
.use-chip:hover { border-color: var(--color-border-hover); }
.use-chip__name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
}
.use-chip.active {
    border-color: var(--color-accent-primary);
    background: linear-gradient(180deg, rgba(124, 58, 237, 0.18), rgba(124, 58, 237, 0.04));
    box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.35);
}

/* ── Equipment window ───────────────────────────────────── */
.use-window-scroll {
    overflow-x: auto;
    padding-bottom: var(--spacing-sm);
}
.equip-window {
    --tile: 68px;
    display: grid;
    grid-template-columns: var(--tile) 14px repeat(7, var(--tile));
    grid-template-rows: repeat(6, var(--tile));
    grid-template-areas:
        "t1 . r1 fa ch ch ch hat cap"
        "t2 . r2 ea ch ch ch top glv"
        "t3 . r3 er ch ch ch bot sho"
        "r5 . r4 p1 ch ch ch shl med"
        ".  . be p2 wp se em he  ba"
        ".  . po .  .  .  .  .   .";
    gap: 6px;
    width: max-content;
    padding: var(--spacing-lg);
    background:
        radial-gradient(120% 90% at 50% 0%, rgba(124, 58, 237, 0.06), transparent 60%),
        #0d0e18;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), var(--shadow-lg);
}

.equip-window__char {
    grid-area: ch;
    border-radius: var(--radius-lg);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    text-align: center;
}
.equip-window__char-avatar {
    width: 96px;
    height: 96px;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.25);
}
.equip-window__char-avatar img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
}
.equip-window__char-avatar-empty {
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0 6px, transparent 6px 12px);
}
.equip-window__char-name {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
}

/* ── Slot conflicts ─────────────────────────────────────── */
.use-conflicts {
    background: var(--color-warning-bg);
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    max-width: 720px;
}
.use-conflicts-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-warning);
    margin-bottom: var(--spacing-sm);
}
.use-conflicts-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}
.use-conflict-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
    padding: 2px 4px;
    transition: background var(--transition-fast);
}
.use-conflict-item:hover {
    background: rgba(245, 158, 11, 0.10);
}
.use-conflict-name {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
}
.use-conflict-warning {
    font-family: var(--font-family-mono);
    font-size: 10px;
    color: var(--color-warning);
    background: rgba(245, 158, 11, 0.14);
    border-radius: var(--radius-sm);
    padding: 2px 8px;
    margin-left: auto;
}
```

- [ ] **Step 3: Add the `handleReorderItems` handler to `Items.tsx`.** Insert it right after the `getAccountTag` function (which ends at line 432 with `};`). Insert:

```tsx
    const handleReorderItems = async (updates: { id: string; slot_index: number }[]) => {
        setItems(prev => prev.map(i => {
            const u = updates.find(x => x.id === i.id);
            return u ? { ...i, slot_index: u.slot_index } : i;
        }));
        try {
            await itemsService.updateSlotIndexes(updates);
        } catch (error) {
            console.error('Error reordering items:', error);
        }
    };
```

- [ ] **Step 4: Update the `<UseView>` call in `Items.tsx`.** Replace:

```tsx
                    <UseView
                        items={filteredItems}
                        itemsDB={itemsDB}
                        getImageUrl={getImageUrl}
                        getAccountNumber={getAccountNumber}
                        getAccountTag={getAccountTag}
                        formatValue={formatValue}
                        onEdit={(item) => setWorkspaceItem(item)}
                    />
```

with:

```tsx
                    <UseView
                        items={filteredItems}
                        itemsDB={itemsDB}
                        getImageUrl={getImageUrl}
                        onEdit={(item) => setWorkspaceItem(item)}
                        onReorder={handleReorderItems}
                    />
```

Note: `getAccountNumber`, `getAccountTag`, and `formatValue` remain defined in `Items.tsx` — they are still used by the `ItemCard` grid below. Only their use as `UseView` props is removed.

- [ ] **Step 5: Type-check** — Run: `npx tsc --noEmit` — Expected: exit 0.
- [ ] **Step 6: Lint** — Run: `npm run lint` — Expected: no errors (no unused vars in `UseView`; `getAccountNumber`/`getAccountTag`/`formatValue` still used by ItemCard in `Items.tsx`).

- [ ] **Step 7: Manual verification** — Run `npm run dev`, open the app, go to Items → In Use:
  1. Chips show only names; **Alvaro** (Main) appears before **AllForØne**.
  2. Center panel shows the character avatar (or a placeholder) above the name; no `#0 · Main`.
  3. Drag a ring onto another ring → they swap; drag a ring onto an empty ring slot → it moves there. Same for pendants and totems. Reload the page → the arrangement persists.
  4. Dragging highlights valid same-type slots; you cannot drop a ring onto a pendant slot.
  5. Open a Ring of Restraint / Continuous Ring (click the tile) → the workspace shows a "Ring Lv" control; set it 1–6, go back → a `Lv{n}` badge shows on that ring's tile and the tooltip shows `Ring Lv {n}`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Items/UseView.tsx src/pages/Items/UseView.css src/pages/Items/Items.tsx
git commit -m "feat(items): equipment-window avatar, Main-first chips, and drag-to-rearrange" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Chips name-only + Main-first ordering → Task 4 (`characters` sort, chip render). ✅
- Center avatar + name only → Task 4 (`equip-window__char-avatar`). ✅
- `slot_index` column + type + service → Task 1. ✅
- Position-aware assignment honoring `slot_index` (backward compatible) → Task 4 `buildPositions`. ✅
- Drag/drop Ring/Pendant/Totem, swap vs move, same-type only, highlight → Task 4 (`handleDrop`, `DRAGGABLE_TYPES`, `canDrop`) + Task 2 (EquipSlot drag props + `--droptarget`). ✅
- Persist via `onReorder` → `updateSlotIndexes` (optimistic) → Task 4 (`handleReorderItems`) + Task 1. ✅
- `ring_level` column + type → Task 1. ✅
- Editable ring level (only leveled rings) → Task 3 (ItemWorkspace control + save). ✅
- Ring level display: tile badge → Task 2; tooltip line → Task 3. ✅
- Migration (both columns, manual hand-off) → Task 1. ✅
- Remove account props from UseView, keep them for ItemCard → Task 4 Step 4 note. ✅

**Placeholder scan:** No TBD/TODO; full code or exact anchored edits in every step. ✅

**Type consistency:** `EquipSlot` drag props defined in Task 2 (`draggable`, `canDrop`, `onDragStartItem`, `onDragEndItem`, `onDropItem`) match Task 4's usage exactly. `updateSlotIndexes(updates: {id,slot_index}[])` signature identical in Task 1 (definition), Task 4 (`handleReorderItems` call), and `onReorder` prop type. `buildPositions`/`derivedCompare`/`capacityOf`/`DISTINCT_TYPES` all defined and used within Task 4. `Item.slot_index?`/`ring_level?` (optional) are read with `!= null` guards everywhere, safe against `undefined`. ✅
