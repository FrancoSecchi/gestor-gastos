# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run in dev mode (starts Vite + Tauri together)
npm run tauri dev

# Build for production
npm run tauri build

# Vite-only (no Tauri window, for UI-only work)
npm run dev

# Type check
npx tsc --noEmit
```

There are no tests in this project.

## Architecture

This is a **Tauri v2 desktop app** (Rust backend + React/TypeScript frontend). The UI runs as a web view; Rust exposes native capabilities via Tauri plugins.

### Data layer

All persistence goes through **SQLite** via `@tauri-apps/plugin-sql`. The database (`gastos.db`) is managed entirely from the frontend — there are no Rust commands for data access. The single entry point is `src/lib/db.ts`, which holds `getDb()` (singleton), schema init (`initializeDb`), and all CRUD helpers.

The schema has three tables:
- `transactions` — income/expense records
- `settings` — key/value store for everything else (category lists, 50/30/20 mapping, dollar rate cache, etc.)
- `error_logs` — runtime errors logged via `logError()`

### State management

No global state library. Each feature has a dedicated React hook in `src/hooks/` that owns async DB calls and local `useState`. Hooks are composed in `App.tsx` and props are drilled down. Key hooks:
- `useTransactions` — filtered transaction list + summary
- `useCustomCategories` — merges built-in + custom categories from DB
- `useRule502030Mapping` — loads/saves the 50/30/20 category grouping
- `useCategoryIcons` — per-category icon preferences
- `useFilters` — date/type/category filter state (pure local state, no DB)

### Category system

Built-in expense categories are defined in `src/types/index.ts` (`ALL_EXPENSE_CATEGORIES`, `EXPENSE_CATEGORIES`). Custom categories are stored in the `settings` table as JSON arrays under keys `custom_expense_categories` / `custom_income_categories`. The full list is assembled by `mergeCategoryLists()` in `src/types/index.ts`.

### 50/30/20 rule

The mapping of categories → groups (Necesidades / Deseos / Ahorro/Inversión) is stored in the `settings` table under key `rule502030_category_groups`. The logic lives in `src/lib/rule502030Mapping.ts`. On every load, the saved mapping is pruned to known categories and any uncovered categories are added to "Deseos" (`loadOrMergeMapping`). The view (`Rule502030View`) uses a local `assign` state and only persists on explicit "Guardar" click.

### Rust side

`src-tauri/src/` has minimal custom commands (only `commands/settings.rs` and `commands/transactions.rs` — these appear unused in favor of the plugin-sql approach). The Tauri plugins used are `plugin-sql`, `plugin-http`, and `plugin-shell`.

### UI

Tailwind CSS with a custom dark theme (CSS variables in `tailwind.config.js`). Components live in `src/components/` grouped by feature. Recharts for charts, lucide-react for icons, date-fns for date math. All UI text is in Spanish (Argentine locale).
