# Banned Account Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `banned` account status that hides a banned account and all its derived data (characters, items, resources, bossing, cube sessions, events, mystic frontier) from every view and every total, while keeping the data in the DB (reversible) and preserving financial history.

**Architecture:** Migrate the account state from the `owned` boolean to a `status` enum (`owned | sold | banned`). Enforce visibility at the **service layer**: every query that returns account-derived data filters out rows whose account is banned. Tables with a non-null FK to the account use a DB-side inner-join filter (`accounts!inner(status)` + `.neq('account.status','banned')`); the two nullable-FK cases (floating items, transfer history) use a left embed + JS filter so unrelated rows are preserved. The Accounts management page is the single place that still sees banned accounts (to un-ban them).

**Tech Stack:** React 18 + TypeScript (strict), Vite, Supabase (`@supabase/supabase-js`), per-component CSS. No unit-test runner in this repo — verification is `npx tsc --noEmit` + `npm run build` + manual checks.

## Global Constraints

- TypeScript strict. **Unused imports/variables break the Vercel build** — remove them after every edit.
- Every task ends green: `npx tsc --noEmit` (no errors) **and** `npm run build` (succeeds).
- JSX components: single root element (or Fragment).
- **Supabase MCP is the source of truth for the DB.** Before applying the migration, verify the project ref with `mcp__supabase__list_tables`. Keep the repo migration file and the live DB in sync (never desynced).
- Schema changes go in `supabase/migrations/` as a dated file, applied via `mcp__supabase__apply_migration`.
- UI copy visible to the user: **Spanish**. Code, comments, commits: **English**.
- Filter value is the string literal `'banned'` everywhere. Status literals: `'owned' | 'sold' | 'banned'`.
- Soft-hide only: **never** delete rows when banning. Do **not** filter `transactions_mesos` or `client_ledger_entries`.

---

### Task 1: DB migration — add `accounts.status` (keep `owned` for now)

**Files:**
- Create: `supabase/migrations/20260721_accounts_status.sql`

**Interfaces:**
- Produces: `accounts.status text NOT NULL CHECK (status IN ('owned','sold','banned'))`, backfilled from `owned`. `owned` is **kept** until Task 9 (expand/contract: no broken window while code still reads `owned`).

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260721_accounts_status.sql`:

```sql
-- Add a three-value status enum alongside the existing owned boolean.
-- owned=true  -> 'owned' (Propia)
-- owned=false -> 'sold'  (Vendida)
-- New value   -> 'banned' (Baneada): account + all derived data hidden app-wide.
-- `owned` is dropped in a later migration once no code references it.

ALTER TABLE accounts
  ADD COLUMN status text NOT NULL DEFAULT 'owned'
  CHECK (status IN ('owned','sold','banned'));

UPDATE accounts SET status = CASE WHEN owned THEN 'owned' ELSE 'sold' END;
```

- [ ] **Step 2: Verify the project ref**

Call `mcp__supabase__list_tables` (schema `public`). Confirm the tables match this project (you should see `accounts`, `characters`, `items`, `cube_sessions`, `bossing_sessions`, `event_*`, `mystic_frontier_*`). If the ref is wrong or the MCP lacks access, STOP and hand the SQL off for manual execution.

- [ ] **Step 3: Apply the migration**

Call `mcp__supabase__apply_migration` with `name: 'accounts_status'` and `query` = the SQL from Step 1.

- [ ] **Step 4: Verify the schema**

Run via `mcp__supabase__execute_sql`:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name IN ('owned','status');
SELECT status, count(*) FROM accounts GROUP BY status;
```

Expected: **both** `owned | boolean` and `status | text` rows. The counts show accounts distributed across `owned`/`sold` (none `banned` yet).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260721_accounts_status.sql
git commit -m "feat(accounts): add status column backfilled from owned"
```

---

### Task 2: Types + Accounts page migrate to `status`, add Ban/Unban UI

**Files:**
- Modify: `src/types/index.ts:7-30`
- Modify: `src/pages/Accounts/Accounts.tsx`
- Modify: `src/pages/Accounts/Accounts.css`

**Interfaces:**
- Consumes: `accounts.status` from Task 1.
- Produces: `AccountStatus` type; `Account.status` replaces `Account.owned`. `accountsService.getAll()` is still called with no args here (the `includeBanned` param arrives in Task 3).

- [ ] **Step 1: Update types**

In `src/types/index.ts`, replace the `Account` block and insert types (lines 7-30):

```ts
export type AccountStatus = 'owned' | 'sold' | 'banned';

export interface Account {
    id: string;
    number: number;
    email: string | null;
    tag: string | null;
    mesos_b: number;
    created_at: string;
    legion_artifact: boolean;
    legion_artifact_level: number | null;
    status: AccountStatus;
}

export interface SharedInventory {
    id: number;
    mesos_stock: number;
    perfect_innocence_stock: number;
}

export type AccountInsert = Omit<Account, 'id' | 'created_at' | 'legion_artifact' | 'legion_artifact_level' | 'status'> & {
    legion_artifact?: boolean;
    legion_artifact_level?: number | null;
    status?: AccountStatus;
};
export type AccountUpdate = Partial<AccountInsert>;
```

(Keep the existing `SharedInventory` interface if it was between them — the block above already includes it.)

- [ ] **Step 2: Update the Accounts page import**

In `src/pages/Accounts/Accounts.tsx:12`:

```ts
import type { Account, AccountInsert, AccountStatus } from '../../types';
```

- [ ] **Step 3: Replace every `owned` usage with `status`**

Apply these exact replacements in `src/pages/Accounts/Accounts.tsx`:

`formData` initial state (was `owned: true`):
```ts
    const [formData, setFormData] = useState<AccountInsert>({
        number: 0,
        email: '',
        tag: '',
        mesos_b: 0,
        status: 'owned'
    });
```

`handleOpenModal` (replace the whole function body from line 44):
```ts
    const handleOpenModal = (account?: Account) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                number: account.number,
                email: account.email || '',
                tag: account.tag || '',
                mesos_b: account.mesos_b || 0,
                status: account.status
            });
        } else {
            setEditingAccount(null);
            const ownedAccounts = accounts.filter(a => a.status === 'owned');
            const maxNumber = ownedAccounts.length > 0 ? Math.max(...ownedAccounts.map(a => a.number)) : 0;
            setFormData({
                number: maxNumber + 1,
                email: '',
                tag: '',
                mesos_b: 0,
                status: 'owned'
            });
        }
        setModalOpen(true);
    };
```

`handleCloseModal` reset (was `owned: true`):
```ts
        setFormData({ number: 0, email: '', tag: '', mesos_b: 0, status: 'owned' });
```

Replace `handleOwnershipToggle` (lines 75-88) with `handleStatusChange`:
```ts
    const handleStatusChange = (status: AccountStatus) => {
        if (status === 'sold') {
            // Sold: assign a 999+ number
            const soldNumbers = accounts.filter(a => a.status === 'sold').map(a => a.number);
            const nextSoldNumber = soldNumbers.length > 0 ? Math.max(...soldNumbers) + 1 : 999;
            setFormData(prev => ({ ...prev, status, number: nextSoldNumber }));
        } else if (status === 'owned') {
            // Owned: assign next owned number
            const ownedAccounts = accounts.filter(a => a.status === 'owned' && a.id !== editingAccount?.id);
            const maxNumber = ownedAccounts.length > 0 ? Math.max(...ownedAccounts.map(a => a.number)) : 0;
            setFormData(prev => ({ ...prev, status, number: maxNumber + 1 }));
        } else {
            // Banned: keep the current number, just hide it everywhere
            setFormData(prev => ({ ...prev, status }));
        }
    };
```

`handleReorder` filter (line 125):
```ts
            const toReorder = accounts
                .filter(a => a.status === 'owned' && a.email !== MAIN_ACCOUNT_EMAIL)
                .sort((a, b) => a.number - b.number);
```

Estado column (replace the `key: 'owned'` column object, lines 140-146):
```ts
        {
            key: 'status',
            header: 'Estado',
            render: (a) => {
                if (a.status === 'owned') return <span className="tag tag--owned">Propia</span>;
                if (a.status === 'sold') return <span className="tag tag--sold">Vendida</span>;
                return <span className="tag tag--banned">Baneada</span>;
            }
        },
```

Table `rowClassName` (line 184):
```ts
                        rowClassName={(a) => a.status === 'banned' ? 'row--banned' : a.status === 'sold' ? 'row--sold' : ''}
```

Replace the `ownership-toggle` block in the modal form (lines 215-229) with a status select:
```tsx
                    <div className="ownership-toggle">
                        <label className="ownership-toggle__label">
                            <span>Estado</span>
                            <select
                                value={formData.status ?? 'owned'}
                                onChange={(e) => handleStatusChange(e.target.value as AccountStatus)}
                            >
                                <option value="owned">Propia</option>
                                <option value="sold">Vendida</option>
                                <option value="banned">Baneada</option>
                            </select>
                        </label>
                        {formData.status === 'sold' && (
                            <p className="ownership-toggle__hint">
                                Cuenta vendida. Se le asignó el número {formData.number}.
                            </p>
                        )}
                        {formData.status === 'banned' && (
                            <p className="ownership-toggle__hint ownership-toggle__hint--danger">
                                Baneada: se oculta de todo el app (personajes, items, recursos, sesiones)
                                y de todos los totales. No se borra nada — es reversible.
                            </p>
                        )}
                    </div>
```

- [ ] **Step 4: Add CSS for the banned state**

Append to `src/pages/Accounts/Accounts.css`:
```css
.tag--banned {
    background: var(--color-danger, #ef4444);
}

.row--banned td {
    opacity: 0.4;
    text-decoration: line-through;
}

.ownership-toggle__hint--danger {
    color: var(--color-danger, #ef4444);
}

.ownership-toggle__label select {
    padding: 4px 8px;
    border-radius: var(--radius-md, 6px);
    border: 1px solid var(--color-border, #33333a);
    background: var(--color-bg-secondary, #1a1a1f);
    color: var(--color-text, #eaeaea);
}
```

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors (in particular, no remaining reference to `.owned`).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open the Accounts page. Confirm: the Estado column renders Propia/Vendida as before; editing an account shows the new Estado dropdown with three options; selecting "Baneada" shows the red hint. Save an account as Baneada, reopen it — it persists and shows the red "Baneada" tag with the struck-through row. (Nothing else is hidden yet — that comes next.) Leave one throwaway/low-value account **banned** for the verification in the following tasks.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/pages/Accounts/Accounts.tsx src/pages/Accounts/Accounts.css
git commit -m "feat(accounts): three-state status UI (Propia/Vendida/Baneada)"
```

---

### Task 3: Accounts service — hide banned by default

**Files:**
- Modify: `src/services/accounts.ts:9-17` (`getAll`), `:62-69` (`getTotalMesos`)
- Modify: `src/pages/Accounts/Accounts.tsx:35` (`loadAccounts`)

**Interfaces:**
- Produces: `accountsService.getAll(opts?: { includeBanned?: boolean }): Promise<Account[]>` — excludes banned unless `includeBanned` is true. All ~13 existing callers keep working (default arg).

- [ ] **Step 1: Filter `getAll` and `getTotalMesos`**

In `src/services/accounts.ts`, replace `getAll`:
```ts
    async getAll(opts?: { includeBanned?: boolean }): Promise<Account[]> {
        let query = supabase
            .from('accounts')
            .select('*')
            .order('number', { ascending: true });

        if (!opts?.includeBanned) {
            query = query.neq('status', 'banned');
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },
```

Replace `getTotalMesos`:
```ts
    async getTotalMesos(): Promise<number> {
        const { data, error } = await supabase
            .from('accounts')
            .select('mesos_b')
            .neq('status', 'banned');

        if (error) throw error;
        return data?.reduce((sum, acc) => sum + (acc.mesos_b || 0), 0) || 0;
    },
```

- [ ] **Step 2: Let the Accounts management page still see banned**

In `src/pages/Accounts/Accounts.tsx`, `loadAccounts` (line 35):
```ts
            const data = await accountsService.getAll({ includeBanned: true });
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 4: Manual verification**

With the test account still banned: the Accounts page **still lists it** (management view). Everywhere else the account itself is gone — check the account dropdowns when creating an item (`Items` page "+ New Item") and a character (`Characters` page), and the per-account rows/totals in `Dashboard`, `Resources`, `Overview`, `DailyCheckUp`: the banned account no longer appears and its `mesos_b` is out of the net-worth total. (Its characters/items may still show — filtered in the next tasks.)

- [ ] **Step 5: Commit**

```bash
git add src/services/accounts.ts src/pages/Accounts/Accounts.tsx
git commit -m "feat(accounts): hide banned accounts from getAll and mesos totals"
```

---

### Task 4: Characters service — hide characters of banned accounts

**Files:**
- Modify: `src/services/characters.ts:11-22` (`getAll`), `:24-32` (`getMainCharacters`)

**Interfaces:**
- Consumes: `accounts.status`.
- Produces: `charactersService.getAll()` / `getMainCharacters()` return only characters whose account is not banned (feeds Characters, Items pickers, Overview, DailyCheckUp, Events, MysticFrontier, ExpeditionHistory, NewItemModal).

- [ ] **Step 1: Add the inner-join filter**

In `src/services/characters.ts`, replace `getAll`:
```ts
    async getAll(): Promise<CharacterWithAccount[]> {
        const { data, error } = await supabase
            .from('characters')
            .select(`
        *,
        account:accounts!inner(*)
      `)
            .neq('account.status', 'banned')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },
```

Replace `getMainCharacters`:
```ts
    async getMainCharacters(): Promise<Character[]> {
        const { data, error } = await supabase
            .from('characters')
            .select('*, account:accounts!inner(status)')
            .eq('main', 'Main')
            .neq('account.status', 'banned');

        if (error) throw error;
        return data || [];
    },
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 3: Manual verification**

With the test account banned: open `Characters` — its characters are gone. Open `Overview` and `DailyCheckUp` — no rows/cards for those characters. Open the `Items` page char picker — the banned account's characters are not selectable. Confirm a **non-banned** account still shows all its characters (nothing over-filtered).

- [ ] **Step 4: Commit**

```bash
git add src/services/characters.ts
git commit -m "feat(characters): exclude characters of banned accounts"
```

---

### Task 5: Items service — hide items of banned accounts (keep floating items)

**Files:**
- Modify: `src/services/items.ts` — `getAll` (:9), `getByStatus` (:23), `getStatusCounts` (:122), `getTotalStockValue` (:152), `getItemBreakdown` (:169), `getTopForSale` (:180)

**Interfaces:**
- Consumes: `accounts.status` via `items -> characters -> accounts`.
- Produces: all item reads/aggregations exclude items whose character belongs to a banned account; **items with `character_id = null` (floating) are always kept**.

- [ ] **Step 1: Filter the two list methods**

In `src/services/items.ts`, replace `getAll`:
```ts
    async getAll(): Promise<ItemWithCharacter[]> {
        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                character:characters(*, account:accounts(status))
            `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        return ((data as any[]) || []).filter(
            (i) => !i.character || i.character.account?.status !== 'banned'
        );
    },
```

Replace `getByStatus`:
```ts
    async getByStatus(status: ItemStatus): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select('*, character:characters(account:accounts(status))')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ((data as any[]) || []).filter(
            (i) => !i.character || i.character.account?.status !== 'banned'
        );
    },
```

- [ ] **Step 2: Filter the four aggregations**

Replace `getStatusCounts`:
```ts
    async getStatusCounts(): Promise<Record<ItemStatus, number>> {
        const { data, error } = await supabase
            .from('items')
            .select('status, character:characters(account:accounts(status))');

        if (error) throw error;

        const counts: Record<ItemStatus, number> = {
            bulk: 0,
            in_stock: 0,
            for_sale: 0,
            sold: 0,
            in_progress: 0,
            Service: 0,
            in_use: 0
        };

        (data as any[])?.forEach(item => {
            if (item.character && item.character.account?.status === 'banned') return;
            if (counts[item.status as ItemStatus] !== undefined) {
                counts[item.status as ItemStatus]++;
            }
        });

        return counts;
    },
```

Replace `getTotalStockValue`:
```ts
    async getTotalStockValue(): Promise<number> {
        const { data, error } = await supabase
            .from('items')
            .select('status, costo_item, estimated_value, character:characters(account:accounts(status))')
            .neq('status', 'sold')
            .neq('status', 'Service');

        if (error) throw error;

        return (data as any[])?.reduce((sum, item) => {
            if (item.character && item.character.account?.status === 'banned') return sum;
            if (item.status === 'in_stock' || item.status === 'in_progress') return sum + (item.costo_item || 0);
            if (item.status === 'for_sale') return sum + (item.estimated_value || 0);
            return sum;
        }, 0) || 0;
    },
```

Replace `getItemBreakdown`:
```ts
    async getItemBreakdown(): Promise<Array<{ status: string; costo_item: number; estimated_value: number }>> {
        const { data, error } = await supabase
            .from('items')
            .select('status, costo_item, estimated_value, character:characters(account:accounts(status))')
            .neq('status', 'sold')
            .neq('status', 'Service');

        if (error) throw error;
        return ((data as any[]) || [])
            .filter(item => !item.character || item.character.account?.status !== 'banned')
            .map(({ status, costo_item, estimated_value }) => ({ status, costo_item, estimated_value }));
    },
```

Replace `getTopForSale` (drop the DB `limit`, slice after filtering so banned items don't eat the top slots):
```ts
    async getTopForSale(limit = 6): Promise<Array<{ name: string; estimated_value: number }>> {
        const { data, error } = await supabase
            .from('items')
            .select('name, estimated_value, character:characters(account:accounts(status))')
            .eq('status', 'for_sale')
            .order('estimated_value', { ascending: false });
        if (error) throw error;
        return ((data as any[]) || [])
            .filter(item => !item.character || item.character.account?.status !== 'banned')
            .slice(0, limit)
            .map(({ name, estimated_value }) => ({ name, estimated_value }));
    },
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 4: Manual verification**

With the test account banned: `Items` page no longer lists items belonging to its characters; `Dashboard` stock value / top-for-sale and `Overview` no longer count them; `DailyCheckUp` for_sale/in_stock/bulk lists exclude them. Confirm a **floating** item (one with no character, if any exists) still shows. Confirm items of non-banned accounts are unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/services/items.ts
git commit -m "feat(items): exclude items of banned accounts, keep floating items"
```

---

### Task 6: Bossing + cube sessions — hide banned accounts

**Files:**
- Modify: `src/services/bossingService.ts:45-52` (`getWeekSessions`)
- Modify: `src/services/cubeSessions.ts:6-14` (`getAll`)

**Interfaces:**
- Produces: `getWeekSessions` and cube `getAll` exclude banned accounts (feeds DailyCheckUp/Overview bossing, and the CubingHistory page).

- [ ] **Step 1: Filter bossing sessions**

In `src/services/bossingService.ts`, replace `getWeekSessions`:
```ts
    async getWeekSessions(weekStart: string): Promise<BossingSession[]> {
        const { data, error } = await supabase
            .from('bossing_sessions')
            .select('*, account:accounts!inner(status)')
            .eq('week_start', weekStart)
            .neq('account.status', 'banned');
        if (error) throw error;
        return (data || []) as BossingSession[];
    },
```

- [ ] **Step 2: Filter cube sessions**

In `src/services/cubeSessions.ts`, replace `getAll`:
```ts
    async getAll(): Promise<CubeSession[]> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .select('*, account:accounts!inner(status)')
            .neq('account.status', 'banned')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 4: Manual verification**

With the test account banned: `CubingHistory` no longer shows cube sessions for that account; `DailyCheckUp`/`Overview` bossing state excludes it. (The client's AR/ledger debt generated from any of its past cube sessions stays intact on the Clients / AR pages — verify it is still there.)

- [ ] **Step 5: Commit**

```bash
git add src/services/bossingService.ts src/services/cubeSessions.ts
git commit -m "feat(bossing,cube): exclude banned accounts from sessions"
```

---

### Task 7: Mystic Frontier + resource usage history — hide banned accounts

**Files:**
- Modify: `src/services/mysticFrontierService.ts:280-287` (`getAllRewardHistory`), `:289-296` (`getAllExpeditionLog`)
- Modify: `src/services/resourceHistory.ts:40-48` (`getAll`)

**Interfaces:**
- Produces: MF global history excludes banned (via `character -> account`); resource usage history excludes rows whose account is banned, **keeps rows with null account** (transfers).

- [ ] **Step 1: Filter Mystic Frontier history (character → account, both FKs non-null → nested inner join)**

In `src/services/mysticFrontierService.ts`, replace `getAllRewardHistory`:
```ts
export async function getAllRewardHistory(): Promise<MysticFrontierRewardEntry[]> {
  const { data, error } = await supabase
    .from('mystic_frontier_reward_history')
    .select('*, character:characters!inner(account:accounts!inner(status))')
    .neq('character.account.status', 'banned')
    .order('collected_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MysticFrontierRewardEntry[];
}
```

Replace `getAllExpeditionLog`:
```ts
export async function getAllExpeditionLog(): Promise<MysticFrontierExpeditionLog[]> {
  const { data, error } = await supabase
    .from('mystic_frontier_expedition_log')
    .select('*, character:characters!inner(account:accounts!inner(status))')
    .neq('character.account.status', 'banned')
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MysticFrontierExpeditionLog[];
}
```

> If the nested filter path `character.account.status` does not filter as expected at runtime (empty or unfiltered result), fall back to a left embed + JS filter: `.select('*, character:characters(account:accounts(status))')` then `(data ?? []).filter(r => r.character?.account?.status !== 'banned')`. Verify in Step 3's manual check.

- [ ] **Step 2: Filter resource usage history (nullable account_id → left embed + JS filter)**

In `src/services/resourceHistory.ts`, replace `getAll`:
```ts
    async getAll(): Promise<ResourceUsageHistory[]> {
        const { data, error } = await supabase
            .from('resource_usage_history')
            .select('*, account:accounts(status)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ((data as any[]) || []).filter(
            (row) => !row.account || row.account.status !== 'banned'
        );
    },
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 4: Manual verification**

With the test account banned: `ExpeditionHistory` shows no MF reward/expedition rows for the banned account's characters; the resource-history panel (opened from a resource cell) no longer lists usage rows tied to that account, but transfer/global rows (no account) still appear.

- [ ] **Step 5: Commit**

```bash
git add src/services/mysticFrontierService.ts src/services/resourceHistory.ts
git commit -m "feat(mystic-frontier,resource-history): exclude banned accounts"
```

---

### Task 8: Event progress — hide banned accounts

**Files:**
- Modify: `src/services/events.ts` — `getDailyProgress` (:157), `getDailyClaims` (:204), `getBossingProgress` (:272), `getShopPurchases` (:333), `getAccountProgress` (:499)

**Interfaces:**
- Produces: the five list/aggregation reads of per-account event progress exclude banned accounts. `getEventTotalProgress` (RPC, :568) is left unchanged — its result is keyed by `account_id` and consumers render it against the already-filtered accounts list, so banned entries never surface.

- [ ] **Step 1: Add `accounts!inner(status)` + `.neq` to the five reads**

In `src/services/events.ts`, `getDailyProgress` — change the base query builder:
```ts
    async getDailyProgress(eventId: string, date?: string, startDate?: string, endDate?: string): Promise<EventDailyProgress[]> {
        let query = supabase
            .from('event_daily_progress')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned');

        if (date) {
            query = query.eq('date', date);
        } else if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.limit(5000);
        if (error) throw error;
        return data || [];
    },
```

`getDailyClaims`:
```ts
    async getDailyClaims(eventId: string): Promise<EventDailyClaim[]> {
        const { data, error } = await supabase
            .from('event_daily_claims')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);
```
(Leave the rest of that method — the `if (error) throw error; return data || [];` — unchanged.)

`getBossingProgress`:
```ts
    async getBossingProgress(eventId: string): Promise<EventBossingProgress[]> {
        const { data, error } = await supabase
            .from('event_bossing_progress')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);

        if (error) throw error;
        return data || [];
    },
```

`getShopPurchases`:
```ts
    async getShopPurchases(eventId: string): Promise<EventShopPurchase[]> {
        const { data, error } = await supabase
            .from('event_shop_purchases')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);

        if (error) throw error;
        return data || [];
    },
```

`getAccountProgress`:
```ts
    async getAccountProgress(eventIds: string[]): Promise<EventAccountProgress[]> {
        if (eventIds.length === 0) return [];
        const { data, error } = await supabase
            .from('event_account_progress')
            .select('*, account:accounts!inner(status)')
            .in('event_id', eventIds)
            .neq('account.status', 'banned');
        if (error) throw error;
        return data || [];
    },
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 3: Manual verification**

With the test account banned: on the `Events` page (and the events section of `DailyCheckUp`/`Overview`), the banned account has no progress row/cell and does not contribute to any per-account progress counts.

- [ ] **Step 4: Commit**

```bash
git add src/services/events.ts
git commit -m "feat(events): exclude banned accounts from progress reads"
```

---

### Task 9: Drop `owned`, full-app verification sweep + restore

**Files:**
- Create: `supabase/migrations/20260721_drop_accounts_owned.sql`

**Interfaces:**
- Consumes: all code now reads `status`, nothing reads `owned` (Tasks 2-8 complete).

- [ ] **Step 1: Confirm no code references `owned`**

Run: `git grep -n "\.owned" -- "src/*.ts" "src/*.tsx"` (or Grep for `\.owned\b` under `src/`).
Expected: **no matches**. If any remain, fix them before dropping the column.

- [ ] **Step 2: Write the drop migration**

Create `supabase/migrations/20260721_drop_accounts_owned.sql`:

```sql
-- owned is now fully replaced by status; drop it (expand/contract contract phase).
ALTER TABLE accounts DROP COLUMN owned;
```

- [ ] **Step 3: Check nothing in the DB depends on `owned`**

Run via `mcp__supabase__execute_sql`:

```sql
-- Views / rules referencing accounts.owned
SELECT dependent.relname AS dependent_object
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class dependent ON dependent.oid = r.ev_class
JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
JOIN pg_class c ON c.oid = d.refobjid
WHERE c.relname = 'accounts' AND a.attname = 'owned';

-- RLS policies whose expression mentions owned
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'accounts'
  AND (COALESCE(qual,'') LIKE '%owned%' OR COALESCE(with_check,'') LIKE '%owned%');
```

Expected: **0 rows from both**. If either returns rows, STOP — update that view/policy to use `status` before dropping.

- [ ] **Step 4: Apply the drop migration**

Call `mcp__supabase__apply_migration` with `name: 'drop_accounts_owned'` and `query` = the SQL from Step 2.

- [ ] **Step 5: Verify `owned` is gone**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name = 'owned';
```
Expected: **0 rows**.

- [ ] **Step 6: Type-check and build one more time**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run build` — Expected: succeeds.
Run: `npm run lint` — Expected: no new errors (watch for unused `account` embeds or imports).

- [ ] **Step 7: Banned sweep**

With the test account still banned, walk every surface and confirm it (and its data) is absent and out of every total:
`Dashboard` (KPIs, net worth, mesos-by-account, top-for-sale) · `Accounts` (still visible here only) · `Characters` · `Items` (list + account/char pickers + `NewItemModal` + `ItemWorkspace` account pool) · `Resources` · `Overview` · `DailyCheckUp` · `Events` · `Tasks` (legion artifact per account) · `CubingHistory` · `ExpeditionHistory` · `MysticFrontier`.

- [ ] **Step 8: Preserved-history check**

Confirm the banned account's past **transactions_mesos** still appear in the transactions view, and any **client AR / ledger** debt tied to its past cube sessions is intact on `Clients` / `AccountsReceivableV2`.

- [ ] **Step 9: Un-ban round-trip**

On the `Accounts` page, edit the test account, set Estado back to Propia (or Vendida), save. Re-check a couple of surfaces (`Characters`, `Items`, `Dashboard`) and confirm **everything is restored** — proving the soft-hide is fully reversible.

- [ ] **Step 10: Commit the drop migration**

```bash
git add supabase/migrations/20260721_drop_accounts_owned.sql
git commit -m "feat(accounts): drop owned column, superseded by status"
```

---

## Notes / accepted limitations

- **`getEventTotalProgress` RPC** (`events.ts:568`) is not filtered in SQL; its output is keyed by `account_id` and only ever rendered against the visibility-filtered accounts list, so banned accounts do not surface. If a future view sums this map without keying by visible accounts, filter the returned record against `accountsService.getAll()` there.
- **`getStatusCounts` / `getAll` item caps:** `getAll` keeps its `limit(200)` (a display cap that predates this feature). Filtering happens after the fetch, so a page showing near 200 items could show slightly fewer; acceptable and unchanged in spirit.
- **PostgREST nested filter** (`character.account.status` in Task 7): if it does not behave, use the documented JS-filter fallback in that task.
