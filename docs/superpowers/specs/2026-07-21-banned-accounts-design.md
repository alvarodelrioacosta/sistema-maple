# Diseño — Estado "Baneada" para cuentas

**Fecha:** 2026-07-21
**Autor:** Alvaro (+ Claude)
**Estado:** Aprobado, pendiente de plan de implementación

## Problema

Algunas cuentas (`accounts`) son baneadas por el juego. Una cuenta baneada y **todo
lo asociado a ella** (characters, items, resources, bossing, cube sessions, eventos,
mystic frontier) ya no puede usarse ni recuperarse, así que **no debe aparecer en
ninguna parte del app** ni sumar en ningún total. Hoy no existe forma de marcar esto.

## Decisiones tomadas (cerradas con el usuario)

1. **Estado único (enum).** El "Estado" de una cuenta pasa de ser el booleano `owned`
   (Propia/Vendida) a un campo `status` con tres valores mutuamente excluyentes:
   `'owned' | 'sold' | 'banned'`.
2. **Soft-hide reversible.** Banear NO borra datos: las filas quedan en la DB y se
   **filtran** en todo el app. Se puede des-banear ante un error y todo vuelve intacto.
3. **Conservar historial financiero.** Se ocultan los datos operativos/vivos y se
   excluyen los activos de la cuenta de los totales, PERO:
   - `transactions_mesos` (historial de mesos ya registrado) **se conserva** sin filtrar.
   - AR / `client_ledger_entries` **se conserva** (está atado al cliente, no a la cuenta).
   - Una cuenta baneada puede seguir apareciendo **como etiqueta** en una transacción
     histórica — es correcto, es contabilidad.
4. **Enfoque de filtrado: capa de servicios vía join a `accounts.status`** (ver §3).
   Descartados: RLS/vistas (RLS sobre `accounts` rompe la propia pantalla de gestión que
   necesita ver las baneadas para des-banear) y denormalizar un flag con triggers (churn
   de schema + igual hay que filtrar en cada query).
5. **`sold` no cambia.** Las cuentas Vendidas siguen visibles en todo el app como hoy.
   Solo `banned` oculta.

## Puntos abiertos resueltos por default (revisar en este spec)

- **(a)** Se **dropea** la columna `owned` (redundante; el backfill preserva la info en
  `status`). Alternativa si se prefiere conservarla: columna generada
  `owned GENERATED ALWAYS AS (status = 'owned') STORED`.
- **(b)** La acción **Ban / Des-banear** va en el **modal de edición** de la cuenta.

## 1. Modelo de datos

Migración `supabase/migrations/20260721_accounts_status.sql`:

```sql
ALTER TABLE accounts
  ADD COLUMN status text NOT NULL DEFAULT 'owned'
  CHECK (status IN ('owned','sold','banned'));

UPDATE accounts SET status = CASE WHEN owned THEN 'owned' ELSE 'sold' END;

ALTER TABLE accounts DROP COLUMN owned;
```

> ⚠️ El `DROP COLUMN owned` borra una columna con datos. El backfill previo copia toda
> la información a `status`, así que no hay pérdida. Aplicar la migración vía Supabase MCP
> (fuente de verdad) y verificar el project ref con `list_tables` antes de tocar la DB.

Tipos (`src/types/index.ts`):

```ts
export type AccountStatus = 'owned' | 'sold' | 'banned';

export interface Account {
  // ...
  status: AccountStatus;   // reemplaza owned: boolean
}
```

Ajustar `AccountInsert` / `AccountUpdate` (hoy hacen `Omit`/opcional sobre `owned`).

## 2. Regla de visibilidad

**Una fila es visible ⟺ su cuenta NO está baneada.** El default de todo fetch derivado
de cuentas excluye baneadas; la única excepción es la pantalla de gestión de cuentas.

## 3. Mecanismo de filtrado (capa de servicios)

Patrón unificado según la nulabilidad de la FK a la cuenta:

### 3.1 Tablas con `account_id` NOT NULL → inner join + `.neq`
Filtro DB-side, robusto, de una línea:
```ts
.select('*, account:accounts!inner(status)')
.neq('account.status', 'banned')
```
Aplica a:
- `charactersService.getAll()` — `src/services/characters.ts:11`
- `charactersService.getMainCharacters()` — `characters.ts:24`
- `bossingService.getWeekSessions()` — `src/services/bossingService.ts:45`
- `cubeSessionsService.getAll()` — `src/services/cubeSessions.ts:6`
- `resourcesService` batches por cuenta — se cubre porque los `accountIds` salen de
  `accountsService.getAll()` ya filtrado (`getBulkBatchesForAccounts`,
  `src/services/resources.ts:102`; los loops sobre la lista de cuentas en Dashboard,
  DailyCheckUp, Overview, ItemWorkspace heredan el filtro).
- Events: `getAccountProgress`, `getDailyProgress`, `getBossingProgress`,
  `getShopPurchases`, `getEventTotalProgress` — `src/services/events.ts:499,157,272,333,568`.

### 3.2 Mystic Frontier (`character_id` NOT NULL) → inner join anidado
```ts
.select('*, character:characters!inner(account:accounts!inner(status))')
.neq('character.account.status', 'banned')
```
Aplica a:
- `getAllRewardHistory()` — `src/services/mysticFrontierService.ts:280`
- `getAllExpeditionLog()` — `mysticFrontierService.ts:289`

### 3.3 Items (`character_id` NULLABLE) → left join + filtro null-safe
Los items flotantes (sin personaje) **se conservan**: no están atados a ninguna cuenta.
Traer el `status` de la cuenta del personaje y excluir en JS solo los items cuyo
personaje pertenece a cuenta baneada. Aplica a listas **y** agregaciones:
- `getAll()` — `src/services/items.ts:9`
- `getByStatus()` — `items.ts:23`
- `getStatusCounts()` — `items.ts:122`
- `getTotalStockValue()` — `items.ts:152`
- `getItemBreakdown()` — `items.ts:169`
- `getTopForSale()` — `items.ts:180`

### 3.4 Resource usage history (`account_id` NULLABLE) → left join + null-safe
Las filas de transfer sin cuenta se conservan; se ocultan las que apuntan a cuenta baneada.
- `resourceHistoryService.getAll()` — `src/services/resourceHistory.ts:40`

### 3.5 Accounts service
- `accountsService.getAll()` → excluye baneadas por default. Firma nueva
  `getAll(opts?: { includeBanned?: boolean })`; solo la página Accounts llama con
  `{ includeBanned: true }`. Todas las demás pantallas (~13 llamadores, incl. dropdowns de creación de
  items/characters, Dashboard, Resources, Events, Tasks, DailyCheckUp, Overview,
  CubingHistory, NewItemModal, ResourceHistoryPanel) heredan el filtro.
- `getTotalMesos()` — `src/services/accounts.ts:62` → filtra baneadas.

## 4. Qué se oculta vs qué se conserva

| Dato | Baneada |
|---|---|
| characters, items, resources/batches, bossing, cube sessions, events, mystic frontier | **Oculto** en vistas y totales |
| `mesos_b` / stock / resources de la cuenta en net worth (Dashboard, Overview, Resources) | **Excluido** |
| dropdowns de selección de cuenta (crear item/char, asignar) | Cuenta **no seleccionable** |
| `transactions_mesos` (historial) | **Se conserva** (sin filtrar) |
| AR / `client_ledger_entries` | **Se conserva** (atado al cliente) |
| cuentas `sold` (Vendida) | **Sin cambios**, siguen visibles |

Totales afectados (deben excluir baneadas): Dashboard KPIs
(`src/pages/Dashboard/Dashboard.tsx:60-191`, en particular `totalMesosInAccounts`:97,
resource/stock sums), `Overview.tsx:252/386`, `Resources.tsx:261`,
`DailyCheckUp.tsx:199`. Casi todos ya parten de `accountsService.getAll()` → se corrigen
al filtrar ese punto; los que parten de agregaciones de items (§3.3) se corrigen ahí.

## 5. UI / UX — página Accounts (`src/pages/Accounts/Accounts.tsx`)

- Columna **"Estado"**: tercera etiqueta **"Baneada"** (roja) además de Propia/Vendida;
  fila con clase `row--banned` (nuevo estilo en `Accounts.css`).
- **Modal de edición**: control para setear `status`. Acción **Ban** con `window.confirm`
  explícito (oculta mucho), y **Des-banear** para revertir a `owned`/`sold`.
- La página usa la variante `includeBanned` para listar y poder gestionar las baneadas.
- Banned se **excluye del renumerado** automático (`handleReorder`,
  `handleOwnershipToggle`) y de los dropdowns de creación.
- Migrar toda la lógica que hoy lee/escribe `owned` (numeración, etiquetas, toggle) a
  `status` — hoy `owned` solo se usa en este archivo y en `src/types/index.ts`.

## 6. Bordes

- **Workers / DailyCheckUp** heredan el filtro (cargan `accountsService.getAll()`) → no
  ven baneadas.
- **Items flotantes** (`character_id = null`) no pertenecen a ninguna cuenta → nunca se
  ocultan por ban.
- **`characters.create`** lee `accounts.number` solo de la cuenta elegida (no baneada) → ok.
- **Des-banear** restaura todo porque nada se borró (soft-hide).

## 7. Verificación

- `npx tsc --noEmit` sin errores.
- `npm run build` OK (imports/vars sin usar rompen el deploy en Vercel).
- Repaso manual con una cuenta de prueba baneada: recorrer cada superficie del mapa
  (§3–§4) confirmando que no aparece ni suma; luego des-banear y confirmar que todo vuelve.

## 8. Fuera de alcance

- No se toca el comportamiento de cuentas `sold`.
- No se borran datos físicamente.
- No se filtra `transactions_mesos` ni el client ledger.
- No se agrega RLS ni vistas.
