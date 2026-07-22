# Equipment Window — Enhancements (iteration 2) — Design

**Date:** 2026-07-22
**Builds on:** `2026-07-22-equip-window-view-design.md` (the equipment window is already shipped).
**Area:** `src/pages/Items/` (UseView, EquipSlot, ItemWorkspace), `src/pages/Items/Items.tsx`, `src/services/items.ts`, `src/types/index.ts`, ItemTooltip, plus one DB migration.

## Goals

Three additions to the shipped "In Use" equipment window:

1. **Character header cleanup + avatar.** Chips show only the character name (no account number), ordered Main-character-first. The center panel shows the character's avatar image above the name (name only — no account number/tag).
2. **Drag & drop to rearrange Ring / Pendant / Totem**, persisted so it survives reload.
3. **Ring level (1–6) for Ring of Restraint and Continuous Ring** — editable and shown in the window.

## Non-goals (YAGNI)

- Touch/mobile drag support (desktop admin tool).
- Dragging items between different types (a ring can only occupy a ring slot).
- Reordering single-capacity slots (Weapon, Hat, …) — there is only one.
- Manual/drag reordering of the character chips (order is automatic: Main first).

## Block 1 — Chips, ordering, and center avatar

**File:** `src/pages/Items/UseView.tsx` (+ `UseView.css`), `src/pages/Items/Items.tsx`.

- **Chip label:** render only `char.name`. Remove the `#{accountNumber}` line.
- **Ordering:** sort the character list by `main === 'Main'` first (Main before non-Main), then `name.localeCompare`. `main` is `character.main: 'Main' | 'Mule' | null` and is already present on the embedded `item.character` (the service selects `characters(*)`). With Alvaro tagged `Main`, this yields **Alvaro before AllForØne**.
- **Center panel:** above the name, render the character avatar:
  - `char.avatar_url` present → `<img class="equip-window__char-avatar" src={avatar_url} alt={name}>`.
  - `null` → a neutral placeholder box (same footprint), so the layout is stable.
  - Below it, only `char.name`. Remove the `#{accountNumber} · {accountTag}` subline.
- **Prop cleanup:** `getAccountNumber`, `getAccountTag`, and the already-unused `formatValue` are no longer used by `UseView`. Remove them from `UseViewProps` and from the `<UseView …/>` call site in `Items.tsx`. Keep `getImageUrl`. Add the new `onReorder` prop (Block 2).

## Block 2 — Drag & drop with `slot_index`

**Files:** DB migration; `src/types/index.ts`; `src/services/items.ts`; `src/pages/Items/Items.tsx`; `src/pages/Items/EquipSlot.tsx` (+css); `src/pages/Items/UseView.tsx`.

### Data
- New column `items.slot_index integer` (nullable). Migration file + manual hand-off SQL (Supabase MCP unauthorized).
- `Item.slot_index: number | null`.

### Position-aware assignment (generalises the current logic)
For a type with capacity `C` (Ring 5, Totem 3, Pendant 2, others 1) and its items for the active character, build a `positions` array of length `C`:
1. **Pinned** = items with `slot_index != null` and `0 <= slot_index < C`. Place each at `positions[slot_index]` in ascending `slot_index` order; on a collision or out-of-range, treat as floating.
2. **Floating** = the rest, sorted by the existing derived rule (Ring: `RING_PINNED_LAST` last, then name; else name).
3. Fill the still-empty positions with floating items in order.
4. **Overflow** = floating items left over beyond `C` → the conflicts strip (unchanged behaviour).

Rendering maps each `SLOT_POSITIONS` entry to `positions[type][index]` (may be `null` → empty placeholder). Fully backward-compatible: with every `slot_index` null, the result equals today's derived order.

### Drag behaviour
- **Draggable types:** `Ring`, `Pendant`, `Totem` only (`DRAGGABLE_TYPES`). A filled tile of these types is `draggable`; other tiles are not.
- Drag carries `{ type, fromIndex }`. A slot is a **valid drop target** when a drag is active and its `type === draggedType` (same type). Invalid targets do not accept the drop.
- On drop at `(type, toIndex)` with `fromIndex !== toIndex`:
  - `toIndex` occupied → **swap** the items at `fromIndex` and `toIndex`.
  - `toIndex` empty → **move**: the dragged item goes to `toIndex`, `fromIndex` becomes empty.
- Then **snapshot**: for every position `p` holding an item, set that item's `slot_index = p`; collect `updates = [{ id, slot_index }]` for items whose value changed. Call `onReorder(updates)`.
- **Visual feedback:** while dragging, valid-target slots of that type get a highlight; the slot currently under the pointer gets a stronger highlight.

### Persistence & state
- `Items.tsx` gains `onReorder(updates)`: optimistic `setItems(prev => prev.map(i => match ? { ...i, slot_index } : i))`, then `itemsService.updateSlotIndexes(updates)`. Mirrors the existing optimistic-update pattern (favorite/delivered).
- `itemsService.updateSlotIndexes(updates: { id: string; slot_index: number }[])`: `Promise.all` of per-row `update({ slot_index }).eq('id', id)`.

## Block 3 — Ring level (1–6)

**Files:** DB migration; `src/types/index.ts`; `src/pages/Items/ItemWorkspace.tsx`; `src/pages/Items/EquipSlot.tsx` (+css); `src/components/UI/ItemTooltip/ItemTooltip.tsx`.

### Data
- New column `items.ring_level integer` (nullable, valid 1–6). Same migration as `slot_index`.
- `Item.ring_level: number | null`.
- `LEVELED_RINGS = new Set(['Ring of Restraint', 'Continuous Ring'])` (shared constant; matches the existing `RING_PINNED_LAST` names).

### Editing (ItemWorkspace)
- In the properties section (near the star-force field), add a **Ring Level** control shown only when `editingItem.name` is in `LEVELED_RINGS`.
- A `<select>` with options: empty (`—`, clears to `null`) and `1`–`6`, bound to `editingItem.ring_level`.
- `handleSaveProperties` includes `ring_level: editingItem.ring_level ?? null` in its `itemsService.update` payload. On workspace close, `Items.tsx` already calls `loadData()`, so the window reflects the new level.

### Display
- **EquipSlot tile:** when `item.ring_level != null`, render a small **`Lv{n}`** badge in the bottom-right corner (star force stays top-left, so they don't overlap).
- **ItemTooltip:** when `item.ring_level != null`, add a line `Ring Level: {n}`. Harmless for other views since only these rings carry a value.

## Migration (single, manual hand-off)

```sql
alter table public.items add column if not exists slot_index integer;
alter table public.items add column if not exists ring_level integer;
```

Committed as `supabase/migrations/<timestamp>_items_slot_index_ring_level.sql`. No constraint on `ring_level` beyond nullable int (the UI restricts to 1–6).

## Edge cases

- `avatar_url` null → placeholder box in the center (stable layout).
- All `slot_index` null → identical to today's order (backward compatible).
- Drop onto a different type / same slot → no-op.
- `ring_level` badge/line hidden when null (i.e. every non-leveled item).
- Persist failure in `updateSlotIndexes` → log; the next `loadData()` reconciles from the DB.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
- Manual: chips name-only and Main-first; center avatar + name; drag a ring/pendant/totem onto an occupied slot (swap) and an empty slot (move), reload → order persists; set a ring level in the workspace → badge appears on the tile and line in the tooltip.
