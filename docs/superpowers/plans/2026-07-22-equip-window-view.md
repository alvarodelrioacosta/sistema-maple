# Equipment Window View for "In Use" items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "In Use" matrix (slots × characters) with a MapleStory-style equipment window rendered one character at a time, selected via a chip selector.

**Architecture:** `UseView` becomes a character selector + a single spatial equipment window laid out with CSS `grid-template-areas`. Each slot is a new leaf component `EquipSlot` (icon + rarity border + star-force badge + hover tooltip). Two new item types, `Totem` and `Medal`, are added to the type system. No changes to services or the `UseView` call site.

**Tech Stack:** React 18 + TypeScript (strict) + Vite, per-component colocated CSS, design tokens in `src/styles/tokens.css`, Supabase types in `src/types/index.ts`.

## Global Constraints

- Type-check must pass: `npx tsc --noEmit` clean before any task is "done".
- No unused imports or variables — they break Vercel deploys (`npm run lint` clean).
- CSS is per-component and colocated; every color/space/radius uses a token from `src/styles/tokens.css` (never a raw hex unless copying an existing app pattern such as `#0d0e18`).
- User-facing strings stay in **English**, matching the existing app (e.g. the current conflict banner reads `Slot conflicts`, the empty state reads `No items with status "In Use" found.`).
- The `UseView` public props interface does **not** change — `src/pages/Items/Items.tsx` keeps calling it exactly as today.
- `color-mix(in srgb, …)` is allowed (already used in `src/components/UI/ItemCard/ItemCard.css:19`).

**Before you start:** we are on the default branch `main`. Create a feature branch first:

```bash
git checkout -b feat/equip-window-view
```

## File Structure

- **Modify** `src/types/index.ts` — add `'Totem'` and `'Medal'` to the `ItemType` union (one line).
- **Modify** `src/pages/ItemsDB/ItemsDB.tsx` — extend the `ITEM_TYPES` picker with `Totem`, `Medal`, and the currently-missing `Pocket` and `Badge`.
- **Create** `src/pages/Items/EquipSlot.tsx` + `src/pages/Items/EquipSlot.css` — one equipment slot tile.
- **Rewrite** `src/pages/Items/UseView.tsx` + `src/pages/Items/UseView.css` — selector + window + conflicts.

---

### Task 1: Add `Totem` and `Medal` item types

**Files:**
- Modify: `src/types/index.ts:143`
- Modify: `src/pages/ItemsDB/ItemsDB.tsx:15-33`

**Interfaces:**
- Consumes: nothing.
- Produces: `ItemType` union now includes `'Totem' | 'Medal'`; the ItemsDB type picker (`ITEM_TYPES`) exposes `Totem`, `Medal`, `Pocket`, `Badge` in addition to the existing 17.

- [ ] **Step 1: Add the two new types to the `ItemType` union**

In `src/types/index.ts`, replace line 143:

```typescript
export type ItemType = 'Hat' | 'Top' | 'Bottom' | 'Gloves' | 'Shoes' | 'Cape' | 'Belt' | 'Shoulder' | 'Face Acc.' | 'Eye Acc.' | 'Ring' | 'Earring' | 'Pendant' | 'Weapon' | 'Secondary' | 'Emblem' | 'Heart' | 'Pocket' | 'Badge' | 'Totem' | 'Medal';
```

- [ ] **Step 2: Extend the ItemsDB type picker**

In `src/pages/ItemsDB/ItemsDB.tsx`, replace the tail of the `ITEM_TYPES` array (the `Heart` entry and the closing `];`, currently lines 32-33):

```typescript
    { value: 'Heart', label: 'Heart' },
    { value: 'Pocket', label: 'Pocket' },
    { value: 'Badge', label: 'Badge' },
    { value: 'Totem', label: 'Totem' },
    { value: 'Medal', label: 'Medal' },
];
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (exit 0).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors for `src/types/index.ts` or `src/pages/ItemsDB/ItemsDB.tsx`.

- [ ] **Step 5: Verify the DB accepts the new type values (manual hand-off)**

The Supabase MCP is unauthorized for this project, so run this yourself in the Supabase SQL editor to confirm `items_db.type` has **no** CHECK constraint restricting the values:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.items_db'::regclass and contype = 'c';
```

Expected: no row mentioning `type in (...)`. If such a constraint exists, drop/replace it to include the new values, e.g.:

```sql
alter table public.items_db drop constraint <constraint_name>;
alter table public.items_db add constraint <constraint_name>
  check (type in ('Hat','Top','Bottom','Gloves','Shoes','Cape','Belt','Shoulder',
                  'Face Acc.','Eye Acc.','Ring','Earring','Pendant','Weapon','Secondary',
                  'Emblem','Heart','Pocket','Badge','Totem','Medal'));
```

Note: creating the actual Totem/Medal catalog rows is data entry done later in the ItemsDB UI; it is not part of this plan.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/pages/ItemsDB/ItemsDB.tsx
git commit -m "feat(items): add Totem and Medal item types" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `EquipSlot` tile component

**Files:**
- Create: `src/pages/Items/EquipSlot.tsx`
- Create: `src/pages/Items/EquipSlot.css`

**Interfaces:**
- Consumes: `ItemWithCharacter`, `ItemDB` from `src/types`; `ItemTooltip` from `src/components/UI/ItemTooltip/ItemTooltip` (props `{ item, image?, baseSlots?, canStarforce?, infiniteTrades? }`).
- Produces: `export const EquipSlot` with props:
  ```typescript
  {
    gridArea: string;
    label: string;
    item?: ItemWithCharacter;
    imageUrl?: string | null;
    itemsDB: ItemDB[];
    onEdit?: () => void;
  }
  ```
  Renders a dashed placeholder (showing `label`) when `item` is undefined; otherwise an icon tile with a tier-colored border, a star-force badge when `item.star_force > 0`, a hover `ItemTooltip` (via portal), and `onEdit` on click.

- [ ] **Step 1: Create `src/pages/Items/EquipSlot.tsx`**

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
```

- [ ] **Step 2: Create `src/pages/Items/EquipSlot.css`**

```css
.equip-slot {
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-md);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

/* Empty placeholder */
.equip-slot--empty {
    border: 1.5px dashed var(--color-border-hover);
    background: rgba(148, 163, 184, 0.03);
}
.equip-slot--empty span {
    font-family: var(--font-family-mono);
    font-size: 9px;
    line-height: 1.15;
    text-align: center;
    color: var(--color-text-muted);
    padding: 2px;
}

/* Filled tile */
.equip-slot--filled {
    cursor: pointer;
    border: 2px solid var(--slot-tier, var(--color-pot-none));
    background:
        radial-gradient(120% 120% at 50% 15%, color-mix(in srgb, var(--slot-tier, #6b6b72) 24%, transparent), transparent 70%),
        linear-gradient(180deg, #23262f, #171922);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4);
    transition: transform 0.1s ease, box-shadow 0.15s ease;
}
.equip-slot--filled:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4),
                0 6px 18px rgba(0, 0, 0, 0.5),
                0 0 14px color-mix(in srgb, var(--slot-tier, #6b6b72) 45%, transparent);
    z-index: 4;
}

.equip-slot__thumb {
    width: 78%;
    height: 78%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.equip-slot__thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
}
.equip-slot__thumb-empty {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-sm);
    background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0 5px, transparent 5px 10px);
}

/* Star-force badge */
.equip-slot__sf {
    position: absolute;
    top: -6px;
    left: -6px;
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-family: var(--font-family-mono);
    font-weight: 700;
    font-size: 10px;
    color: #1c1405;
    background: linear-gradient(180deg, #f4c65a, #e2a93a);
    border: 1px solid rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    padding: 1px 5px 1px 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Hover preview */
.equip-slot__preview {
    pointer-events: none;
    animation: equip-preview-in 0.12s ease;
}
@keyframes equip-preview-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (exit 0).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors for `src/pages/Items/EquipSlot.tsx`. (Full visual verification happens in Task 3, where `UseView` mounts this component.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Items/EquipSlot.tsx src/pages/Items/EquipSlot.css
git commit -m "feat(items): add EquipSlot tile component" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Rewrite `UseView` as the equipment window

**Files:**
- Rewrite: `src/pages/Items/UseView.tsx`
- Rewrite: `src/pages/Items/UseView.css`

**Interfaces:**
- Consumes: `EquipSlot` (Task 2); `ItemWithCharacter`, `ItemDB`, `ItemType` from `src/types` (`ItemType` includes `Totem`/`Medal` from Task 1).
- Produces: `export const UseView` with the **same** props it has today:
  ```typescript
  {
    items: ItemWithCharacter[];
    itemsDB: ItemDB[];
    getImageUrl: (name: string) => string | null | undefined;
    getAccountNumber: (charId: string | null) => number | null;
    getAccountTag: (charId: string | null) => string | null;
    formatValue: (v: number) => string;
    onEdit: (item: ItemWithCharacter) => void;
  }
  ```
  (`formatValue` is still accepted so `Items.tsx` is untouched, but is no longer used by the body.)

- [ ] **Step 1: Replace the entire contents of `src/pages/Items/UseView.tsx`**

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
```

- [ ] **Step 2: Replace the entire contents of `src/pages/Items/UseView.css`**

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
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    font-family: var(--font-family);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs) var(--spacing-md);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
}
.use-chip:hover { border-color: var(--color-border-hover); }
.use-chip__name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
}
.use-chip__acct {
    font-family: var(--font-family-mono);
    font-size: 10px;
    color: var(--color-text-muted);
    letter-spacing: 0.03em;
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
    gap: 4px;
    padding: var(--spacing-sm);
    text-align: center;
}
.equip-window__char-name {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
}
.equip-window__char-acct {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    letter-spacing: 0.03em;
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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (exit 0). In particular there must be no "declared but never read" error for `formatValue` — it is intentionally not destructured.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors. Confirm no unused imports remain (the old file imported `ItemCard`; the rewrite must not).

- [ ] **Step 5: Manual verification in the running app**

Run: `npm run dev` and open `http://localhost:5173`. Log in as admin, go to **Items**, click the **In Use** status button, then check:

1. A chip selector appears; the first character (alphabetical) is selected by default and shows the equipment window.
2. Slots sit in the game layout: totem column (3 totems + Ring 5) separated by a gap on the far left, ring column, accessory column, the character name panel in the center, the right block, and Weapon/Secondary/Emblem + Heart (under Shoulder) / Badge (under Medal).
3. Filled slots show the item image with a tier-colored border and a star-force badge when applicable.
4. Empty slots show a dashed placeholder with the slot label.
5. Hovering a filled slot shows the item tooltip; it stays inside the viewport near screen edges.
6. Clicking a filled slot opens the item workspace (same as before).
7. Switching chips swaps the whole window to the other character.
8. A character with more items of a type than its capacity (e.g. 6 rings) shows the "⚠ Slot conflicts" strip below the window listing only the overflow.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Items/UseView.tsx src/pages/Items/UseView.css
git commit -m "feat(items): render In Use view as a game-style equipment window" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Character selector → Task 3 (`.use-selector` chips). ✅
- Equipment window with exact layout (side column 3 totems + Ring 5, ring column, accessory column, center-bottom Weapon/Secondary/Emblem, right block, Heart under Shoulder / Badge under Medal) → Task 3 `grid-template-areas` + `SLOT_POSITIONS`. ✅
- `EquipSlot` tile: icon + tier border + SF badge + hover tooltip + click-to-edit + empty placeholder → Task 2. ✅
- Capacities Ring 5 / Totem 3 / Pendant 2 / Medal 1 / rest 1 → `CAPACITY` map. ✅
- Add `Totem`/`Medal` types + picker (+ missing `Pocket`/`Badge`) → Task 1. ✅
- DB `items_db.type` verification / no-migration-expected → Task 1 Step 5. ✅
- Same `UseView` props / call site unchanged → Task 3 interface keeps all 7 props. ✅
- Conflicts strip for the selected character → Task 3 `overflow`. ✅
- Empty-state message unchanged → Task 3 `items-empty`. ✅

**Placeholder scan:** No TBD/TODO; every code step shows full file content. ✅

**Type consistency:** `EquipSlot` prop shape (`gridArea`, `label`, `item?`, `imageUrl?`, `itemsDB`, `onEdit?`) is identical in Task 2's definition and Task 3's usage. `capacityOf`/`slotLabel`/`SLOT_POSITIONS` are all defined and used within Task 3. `ItemType` values used in `SLOT_POSITIONS` (`'Face Acc.'`, `'Eye Acc.'`, `'Totem'`, `'Medal'`, …) all exist in the union after Task 1. ✅
