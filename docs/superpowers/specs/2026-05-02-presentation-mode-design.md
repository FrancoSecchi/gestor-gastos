# Modo Presentación — Spec

## Objetivo

Permitir activar un "modo presentación" dentro de la app que reemplaza todos los datos reales con datos de demo verosímiles en ARS. Útil para capturas de pantalla, demos y landing page externa.

## Archivos nuevos

### `src/lib/presentationMode.ts`

Dos funciones puras sobre `localStorage`:

```ts
const KEY = 'presentation_mode';
export function isPresentationMode(): boolean
export function setPresentationMode(enabled: boolean): void
```

No depende de Tauri ni de la DB. Sin efectos secundarios.

### `src/lib/mockData.ts`

Datos hardcodeados en ARS que cubren los últimos 3 meses. Exporta constantes que las funciones de `db.ts` devuelven directamente cuando el modo está activo:

- `MOCK_TRANSACTIONS: Transaction[]` — ~40 transacciones distribuidas en 3 meses:
  - Gastos: Comida, Transporte, Servicios, Salidas, Suscripciones, Vivienda
  - Ingresos: Salario, Freelance
- `MOCK_SUMMARY: Summary` — ingresos ~$800.000, gastos ~$620.000, balance ~$180.000, `by_category` coherente con las transacciones
- `MOCK_RECURRING_PAYMENTS: RecurringPayment[]` — 3 pagos (Netflix mensual, Alquiler mensual, Gimnasio mensual)
- `MOCK_SAVINGS_GOALS: SavingsGoal[]` — 2 metas (Viaje, Fondo de emergencia)
- `MOCK_DEBTS: Debt[]` — 1 deuda de ejemplo
- Ahorros: se derivan automáticamente de `MOCK_TRANSACTIONS` (que incluye algunas transacciones con `subtype: 'transfer_to_savings'`), ya que `useSavings` llama `getAllTransactions()` internamente. No necesita mock propio.

## Modificaciones a archivos existentes

### `src/lib/db.ts`

Cada función de **lectura** agrega al inicio:

```ts
if (isPresentationMode()) return MOCK_X;
```

Funciones afectadas:
- `getTransactions` → `MOCK_TRANSACTIONS` (filtrado por dateRange para que los filtros de fecha funcionen)
- `getAllTransactions` → `MOCK_TRANSACTIONS`
- `getSummary` → `MOCK_SUMMARY`
- `getRecurringPayments` (si existe como función standalone) → `MOCK_RECURRING_PAYMENTS`
- Funciones que alimentan `useSavings`, `useSavingsGoals`, `useDebts`

Las funciones de **escritura** (`createTransaction`, `updateTransaction`, etc.) no se interceptan — en modo demo son no-ops silenciosos (devuelven el dato mock sin tocar la DB).

### `src/components/settings/Settings.tsx`

Nueva sección "Modo presentación" con:
- Toggle switch con label "Usar datos de demo"
- Subtexto: "Reemplaza tus datos reales con datos de ejemplo para capturas o demos."
- Al cambiar el estado: llama a `setPresentationMode(enabled)` y luego `window.location.reload()` para que todos los hooks re-fetchen

## Lo que NO cambia

- Hooks (`useTransactions`, `useSavings`, etc.) — sin modificaciones
- Componentes de dashboard — sin modificaciones
- Sin indicador visual de modo activo
- El flag se guarda en `localStorage`, no en la DB (sobrevive a "limpiar base de datos")

## Criterio de éxito

Activar el toggle en Settings → recargar → el dashboard muestra datos demo ricos (gráfico de torta con varias categorías, barras mensuales con variación, balance positivo). Desactivar → recargar → vuelven los datos reales.
