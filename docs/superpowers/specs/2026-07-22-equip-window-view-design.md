# Equipment Window View for "In Use" items — Design

**Date:** 2026-07-22
**Area:** `src/pages/Items/` — the "In Use" tab of the Items page.

## Problem

The "In Use" tab (`src/pages/Items/UseView.tsx`) currently renders a **matrix**:
rows = equipment slot types, columns = characters. It reads like a spreadsheet. The
user wants it to mirror the **in-game MapleStory equipment window** — a spatial layout
of equipment slots around the character — so a single glance matches the real game.

## Goals

- Replace the matrix with a **game-style equipment window**, one character at a time.
- A **character selector** to switch which character's window is shown.
- Each slot shows the **item icon** with a rarity border + star force badge, a hover
  tooltip, and click-to-edit (opens the existing item workspace).
- Add **Totem** and **Medal** as new item types.

## Non-goals (YAGNI)

- Character silhouette / background art in the window.
- Save / Reset of slot positions (positions are derived from item `type`, not stored).
- Creating the actual Totem/Medal catalog entries — that is data entry done later in the
  ItemsDB UI. The new slots stay empty until such items exist.
- Android and any other slot the data model does not track.

## Layout

**Character selector:** a horizontal row of chips (character names), horizontally
scrollable when there are many. First character (alphabetical, as today) selected by
default; selected chip is highlighted. Selection lives in local component state.

**Equipment window** (single, for the selected character), built with CSS
`grid-template-areas`:

```
 LATERAL  gap  RINGS   ACCESORIOS       (character)     RIGHT BLOCK
 ┌────┐        ┌────┐  ┌─────────┐                      ┌─────┐ ┌──────┐
 │ T1 │        │ R1 │  │ FaceAcc │                      │Hat  │ │ Cape │
 │ T2 │        │ R2 │  │ EyeAcc  │                      │Top  │ │Gloves│
 │ T3 │        │ R3 │  │ Earring │                      │Bottm│ │Shoes │
 │ R5 │        │ R4 │  │ Pend 1  │                      │Shld │ │Medal │
               │Belt│  │ Pend 2  │  ┌──────┐┌────┐┌────┐│Heart│ │Badge │
               │Pockt│           │  │Weapon││Sec ││Emb │└─────┘ └──────┘
               └────┘  └─────────┘  └──────┘└────┘└────┘
```

Slot positions:

- **Side column** (far left, separated from the rest by a visible gap): Totem 1, Totem 2,
  Totem 3, Ring 5.
- **Ring column:** Ring 1, Ring 2, Ring 3, Ring 4, Belt, Pocket.
- **Accessory column:** Face Acc., Eye Acc., Earring, Pendant 1, Pendant 2.
- **Center-bottom strip** (under the character): Weapon, Secondary, Emblem.
- **Right block (2 cols):** Hat / Cape · Top / Gloves · Bottom / Shoes · Shoulder / Medal ·
  **Heart / Badge** (Heart directly under Shoulder, Badge directly under Medal).

**Capacities:** Ring ×5 (Ring 1–4 in the ring column + Ring 5 in the side column),
Totem ×3, Pendant ×2, Medal ×1, everything else ×1.

## Components

### `EquipSlot` (new) — `src/pages/Items/EquipSlot.tsx` + `EquipSlot.css`

A compact square tile (~64–72px) that renders one slot.

- **Filled:** the item icon (`getImageUrl`); a **border colored by
  `main_potential_tier`** (Legendary → green, Unique → gold/orange, Epic → purple,
  Rare → blue, none → neutral gray), matching the game's rarity borders; a **star force
  badge** in a corner when `star_force > 0`; **hover → `ItemTooltip`** rendered via
  portal, positioned with the same logic `ItemCard` uses today; **click → `onEdit`**.
- **Empty:** a dashed placeholder showing the slot label.
- Reuses the `itemsDB` lookup (`baseSlots`, `canStarforce`, `infiniteTrades`) that
  `ItemTooltip` needs, same as `ItemCard`.

### `UseView` (rewrite) — `src/pages/Items/UseView.tsx` + `UseView.css`

- **Keeps the exact same props** it receives from `Items.tsx` — the call site does not
  change.
- Reuses the existing per-character assignment logic (`byType` → sort → slice by
  capacity → overflow), extended with the new `Totem`/`Medal` slots and Ring capacity 5.
- Renders: the character selector + the selected character's equipment window (a grid of
  `EquipSlot` tiles placed by `grid-area`) + a **conflicts strip** below the window
  listing items that exceed a slot's capacity **for the selected character**.
- The `EQUIPMENT_SLOTS` definition gains a `gridArea` name per slot position so the
  window can be laid out with `grid-template-areas`.

## Data / Types

- `src/types/index.ts`: add `'Totem'` and `'Medal'` to the `ItemType` union.
- `src/pages/ItemsDB/ItemsDB.tsx`: add `Totem` and `Medal` to `ITEM_TYPES`, and also add
  the currently-missing `Pocket` and `Badge` (a pre-existing gap — those types exist in
  the union but are absent from the picker, so they cannot be created today).
- **DB:** `items_db.type` appears to be free `TEXT` — no `CHECK` constraint on it exists
  in any repo migration (unlike `status`, `resource_type`, etc.). Verify against the live
  DB during implementation. If a constraint does exist, hand off an `ALTER` to allow
  `'Totem'`/`'Medal'` for manual execution (Supabase MCP is unauthorized in this
  project). No migration is expected otherwise; Totem/Medal items are ordinary `items_db`
  rows created from the UI.

## Slot assignment logic

`EQUIPMENT_SLOTS` is a list of `{ type, label, capacity, gridArea }`. For multi-capacity
slots (Ring 5, Totem 3, Pendant 2), items of that type are sorted (preserving the
existing `RING_PINNED_LAST` rule) and assigned by index to the named positions; anything
past `capacity` goes to the conflicts strip.

## Edge cases

- Slot with no matching item → empty dashed placeholder.
- More items of a type than capacity → conflicts strip below the window.
- No characters have in-use items → existing empty-state message.
- Totem/Medal slots render empty until such items exist in the catalog.

## Verification

- `npx tsc --noEmit` clean; no unused imports/vars (they break Vercel deploys).
- Manual: switch between characters; hover shows the tooltip; click opens the workspace;
  conflicts strip appears when a character over-fills a slot; empty slots render for
  missing pieces.
