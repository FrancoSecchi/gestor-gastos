# Gastos Personales

App de escritorio para gestionar gastos e ingresos personales con análisis avanzado: regla de presupuesto personalizable, cotizaciones de divisas en tiempo real, seguimiento de ahorros, gestión de vivienda, pagos recurrentes y análisis con IA.

---

## Características

- **Dashboard**: Resumen mensual con widgets colapsables (cotizaciones, metas, pagos recurrentes, transacciones recientes, insights)
- **Regla de presupuesto**: Clasifica gastos en grupos personalizables (por defecto: Necesidades / Deseos / Ahorro)
- **Análisis con IA**: Exporta tus datos a Claude para obtener insights financieros personalizados
- **Cotizaciones**: Dólar (múltiples tipos) y otras divisas con actualización automática
- **Ahorros**: Metas de ahorro con seguimiento de depósitos
- **Vivienda**: Control de contrato de alquiler y vencimientos
- **Pagos recurrentes**: Registra y controla gastos/ingresos periódicos
- **Categorías**: Predefinidas + personalizadas con íconos configurables
- **Exportación**: Descarga tus datos en formato Excel
- **Visor de recibos**: Almacena evidencia de transacciones
- **Base de datos local**: SQLite — tus datos permanecen en tu dispositivo

---

## Instalación

### Windows

1. Descarga el instalador desde las [Releases](https://github.com/tuusuario/gastos-personales/releases)
2. Ejecuta el archivo `.exe` o `.msi` y sigue las instrucciones
3. ¡Listo! La app se abrirá automáticamente

### Linux

1. Descarga el archivo `.AppImage` desde las [Releases](https://github.com/tuusuario/gastos-personales/releases)
2. Dale permisos de ejecución:
   ```bash
   chmod +x GastosPersonales_*.AppImage
   ```
3. Ejecuta:
   ```bash
   ./GastosPersonales_*.AppImage
   ```

O instala desde tu repositorio de paquetes (Debian/Ubuntu):
```bash
sudo apt install ./gastos-personales_*.deb
```

### macOS

Próximamente...

---

## Dónde están tus datos

Tu base de datos (SQLite) se guarda automáticamente en:

- **Linux**: `~/.local/share/com.gastospersonales.app/gastos.db`
- **Windows**: `%APPDATA%/com.gastospersonales.app/gastos.db`
- **macOS**: `~/Library/Application Support/com.gastospersonales.app/gastos.db`

> **Tus datos siempre permanecen en tu dispositivo. No usamos servidores.**

---

## Para Desarrolladores

### Requisitos previos

- **Node.js** >= 18: https://nodejs.org
- **Rust** (última versión estable): https://rustup.rs

```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

### Compilar en Linux

#### 1. Dependencias del sistema

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  librsvg2-dev \
  libayatana-appindicator3-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

**Fedora / RHEL:**
```bash
sudo dnf install -y \
  gtk3-devel \
  webkit2gtk4.1-devel \
  openssl-devel \
  librsvg2-devel \
  libappindicator-gtk3-devel
```

**Arch Linux:**
```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  openssl \
  librsvg \
  libappindicator-gtk3
```

#### 2. Instalar dependencias Node

```bash
cd gastos-personales
npm install
```

#### 3. Compilar

```bash
npm run tauri build
```

#### 4. Ejecutable generado

```
src-tauri/target/release/bundle/
├── appimage/    → GastosPersonales_0.1.0_amd64.AppImage
├── deb/         → gastos-personales_0.1.0_amd64.deb
└── rpm/         → gastos-personales-0.1.0-1.x86_64.rpm
```

El **AppImage** es la opción más portable: no requiere instalación.

```bash
chmod +x GastosPersonales_*.AppImage
./GastosPersonales_*.AppImage
```

---

### Compilar en Windows

#### 1. Dependencias del sistema

- **Microsoft Visual C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
  - Seleccionar: **"Desarrollo para escritorio con C++"**
- **WebView2 Runtime** (incluido en Windows 11; puede requerirse en Windows 10): https://developer.microsoft.com/microsoft-edge/webview2/

#### 2. Instalar dependencias Node

```powershell
cd gastos-personales
npm install
```

#### 3. Compilar

```powershell
npm run tauri build
```

#### 4. Ejecutable generado

```
src-tauri/target/release/bundle/
├── msi/    → GastosPersonales_0.1.0_x64_en-US.msi
└── nsis/   → GastosPersonales_0.1.0_x64-setup.exe
```

---

### Modo desarrollo

```bash
npm run tauri dev       # App completa con hot-reload
npm run dev             # Solo UI en el navegador (sin Tauri)
npx tsc --noEmit        # Type check
```

---

### Acceso a la base de datos (SQLite)

```bash
# Ubuntu / Debian
sudo apt install sqlite3

sqlite3 ~/.local/share/com.gastospersonales.app/gastos.db
```

Comandos útiles:

```sql
SELECT * FROM transactions;
SELECT key, value FROM settings;
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 20;
SELECT * FROM recurring_payments WHERE is_active = 1;

-- Resumen de gastos por categoría
SELECT category, SUM(amount) as total FROM transactions
WHERE type='expense' GROUP BY category ORDER BY total DESC;

-- Exportar a CSV
.mode csv
.output gastos_export.csv
SELECT * FROM transactions;
.quit
```

> Cerrar la app antes de acceder a la base de datos para evitar bloqueos de archivo.

---

## Arquitectura

Esta es una **app de escritorio Tauri v2** (Rust backend + React/TypeScript frontend). La UI corre como web view; Rust expone capacidades nativas via plugins de Tauri.

### Vistas

| Vista | Descripción |
|-------|-------------|
| Inicio (dashboard) | Resumen mensual con widgets colapsables |
| Movimientos | Lista de transacciones con filtros |
| Análisis con IA | Integración con Claude para análisis financiero |
| Categorías | Gestión de categorías e íconos |
| Metas | Regla de presupuesto (50/30/20 personalizable) |
| Vivienda | Control de contrato y alquiler |
| Ahorros | Metas de ahorro y depósitos |
| Ajustes | Configuración general |
| Base de datos | Visor de datos internos |

### Capa de datos

Toda la persistencia pasa por **SQLite** via `@tauri-apps/plugin-sql`. La base de datos se maneja completamente desde el frontend — no hay comandos Rust para acceso a datos. El punto de entrada es `src/lib/db.ts` con `getDb()` (singleton), inicialización de schema (`initializeDb`) y todos los helpers CRUD.

**Tablas:**
- `transactions` — ingresos/egresos con soporte para tipo de dólar, subtipo, recibo adjunto, pago recurrente asociado y meta de ahorro asociada
- `settings` — store clave/valor para listas de categorías, mapping de regla de presupuesto, caché de cotizaciones, etc.
- `error_logs` — errores de runtime registrados via `logError()`
- `recurring_payments` — pagos/cobros periódicos con frecuencia configurable

### Estado

Sin librería de estado global. Cada feature tiene un hook dedicado en `src/hooks/` que maneja llamadas async a DB y `useState` local. Se componen en `App.tsx` y se pasan por props.

**Hooks principales:**
- `useTransactions` — lista filtrada de transacciones + resumen
- `useCustomCategories` — categorías built-in + custom desde DB
- `useBudgetRuleMapping` — carga/guarda el mapping de categorías a grupos de la regla de presupuesto
- `useCategoryIcons` — íconos por categoría
- `useFilters` — estado de filtros (fecha, tipo, categoría) — solo local, sin DB
- `useDollarRate` — cotización dólar con caché y refresco automático
- `useExchangeRates` — cotizaciones de otras divisas
- `useRecurringPayments` — pagos recurrentes
- `useSavings` — saldo de ahorros
- `useSavingsGoals` — metas de ahorro
- `useHousingContract` — datos de contrato de vivienda
- `useCurrency` — formato de moneda según preferencia del usuario

**Contextos:**
- `CategoriesContext` — lista completa de categorías disponible globalmente
- `CurrencyContext` — preferencia de moneda y función de formateo

### Sistema de categorías

Las categorías built-in de gastos están definidas en `src/types/index.ts` (`ALL_EXPENSE_CATEGORIES`, `EXPENSE_CATEGORIES`). Las custom se guardan en la tabla `settings` como JSON arrays bajo las claves `custom_expense_categories` / `custom_income_categories`. La lista completa se arma con `mergeCategoryLists()` en `src/types/index.ts`.

### Regla de presupuesto

El mapping de categorías → grupos (Necesidades / Deseos / Ahorro/Inversión) se guarda en `settings` bajo la clave `rule502030_category_groups`. La lógica vive en `src/lib/budgetRuleMapping.ts`. En cada carga, el mapping guardado se depura a categorías conocidas y las no cubiertas se agregan a "Deseos" (`loadOrMergeMapping`). La vista (`BudgetRuleView`) usa estado local `assign` y solo persiste en click explícito de "Guardar".

### Lado Rust

`src-tauri/src/` tiene comandos mínimos. Los plugins de Tauri usados son `plugin-sql`, `plugin-http` y `plugin-shell`.

---

## Estructura del proyecto

```
gastos-personales/
├── src/
│   ├── components/
│   │   ├── analysis/       # Análisis con IA (Claude)
│   │   ├── budget-rule/    # Regla de presupuesto
│   │   ├── categories/     # Gestión de categorías
│   │   ├── dashboard/      # Widgets del dashboard
│   │   ├── database/       # Visor de base de datos
│   │   ├── housing/        # Vivienda y contratos
│   │   ├── layout/         # Sidebar, Header
│   │   ├── savings/        # Ahorros y metas
│   │   ├── settings/       # Configuración
│   │   ├── transactions/   # Lista, formulario, filtros, recibos
│   │   └── ui/             # Componentes genéricos (Toast, DatePicker, etc.)
│   ├── contexts/           # CategoriesContext, CurrencyContext
│   ├── hooks/              # Custom hooks por feature
│   ├── lib/                # DB, exportación, utilidades
│   └── types/              # Tipos TypeScript y categorías built-in
├── src-tauri/              # Backend Rust (Tauri)
│   ├── src/
│   └── tauri.conf.json
└── package.json
```

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Desktop runtime | Tauri 2.x |
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS 3 (tema oscuro custom) |
| Gráficos | Recharts |
| Base de datos | SQLite (via @tauri-apps/plugin-sql) |
| Exportación | xlsx |
| Cotizaciones | dolarapi.com |
| IA | Claude API (Anthropic) |
| Íconos | lucide-react |
| Fechas | date-fns |
