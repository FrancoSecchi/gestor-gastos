# Gastos Personales

App de escritorio para gestionar gastos e ingresos personales, con análisis de la regla 50/30/20, cotización del dólar en tiempo real y análisis por IA con Claude.

---

## Requisitos previos

### Node.js y Rust (ambas plataformas)

- **Node.js** >= 18: https://nodejs.org
- **Rust** (última versión estable): https://rustup.rs

```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

## Compilar en Linux

### 1. Dependencias del sistema

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

### 2. Instalar dependencias Node

```bash
cd gastos-personales
npm install
```

### 3. Compilar

```bash
npm run tauri build
```

### 4. Ejecutable generado

El instalador y el binario se generan en:
```
src-tauri/target/release/bundle/
├── appimage/    → GastosPersonales_0.1.0_amd64.AppImage  (portable, sin instalación)
├── deb/         → gastos-personales_0.1.0_amd64.deb      (Debian/Ubuntu)
└── rpm/         → gastos-personales-0.1.0-1.x86_64.rpm   (Fedora/RHEL)
```

El **AppImage** es la opción más portable: no requiere instalación, solo darle permisos de ejecución:
```bash
chmod +x GastosPersonales_*.AppImage
./GastosPersonales_*.AppImage
```

---

## Compilar en Windows

### 1. Dependencias del sistema

- Instalar **Microsoft Visual C++ Build Tools** (si no tenés Visual Studio):
  https://visualstudio.microsoft.com/visual-cpp-build-tools/

  Durante la instalación, seleccionar: **"Desarrollo para escritorio con C++"**

- Instalar **WebView2 Runtime** (ya incluido en Windows 11, en Windows 10 puede requerirse):
  https://developer.microsoft.com/microsoft-edge/webview2/

### 2. Instalar dependencias Node

```powershell
cd gastos-personales
npm install
```

### 3. Compilar

```powershell
npm run tauri build
```

### 4. Ejecutable generado

```
src-tauri/target/release/bundle/
├── msi/    → GastosPersonales_0.1.0_x64_en-US.msi    (instalador MSI)
└── nsis/   → GastosPersonales_0.1.0_x64-setup.exe    (instalador NSIS)
```

También se genera el binario directo (sin instalador):
```
src-tauri/target/release/gastos-personales.exe
```

---

## Compilar para Windows desde Linux (cross-compilation)

### Requisitos previos

Esta es la forma más directa, pero requiere configurar el toolchain de Windows:

```bash
# 1. Instalar target de Windows
rustup target add x86_64-pc-windows-gnu

# 2. Instalar MinGW (cross-compiler de Windows)
# Ubuntu / Debian
sudo apt update
sudo apt install -y mingw-w64

# Fedora / RHEL
sudo dnf install -y mingw64-gcc mingw64-gcc-c++ mingw64-binutils

# Arch
sudo pacman -S mingw-w64-gcc mingw-w64-binutils
```

### Compilar

```bash
# Opción 1: Compilar para Windows (sin instalador, solo binario)
npm run tauri build -- --target x86_64-pc-windows-gnu

# Opción 2: Con MSVC (si tienes cargo-xwin instalado)
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin
npm run tauri build -- --target x86_64-pc-windows-msvc
```

### Ubicación del ejecutable

```
src-tauri/target/x86_64-pc-windows-gnu/release/gastos-personales.exe
```

### Alternativa: Visual Studio Build Tools (recomendado)

Para mayor compatibilidad, instala **Visual Studio Build Tools 2022**:

```bash
# En Windows, descarga desde:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Una vez instalado en Windows, compilar es más directo:
npm run tauri build
```

> **Nota:** La forma más confiable es compilar nativo directamente en Windows.
> La cross-compilation desde Linux funciona pero puede tener limitaciones con ciertos plugins.


---

## Modo desarrollo (sin compilar)

Para ejecutar la app en modo dev con hot-reload:

```bash
npm run tauri dev
```

### Script rápido para compilar Windows desde Linux

Si estás en Linux y quieres compilar directamente para Windows:

```bash
./build-windows.sh
```

Este script:
- Verifica que Rust esté instalado
- Instala MinGW si es necesario (con permisos de sudo)
- Configura el toolchain de Windows
- Compila automáticamente

---

## Acceso a la base de datos

La app usa **SQLite** para almacenar transacciones y configuración. La base de datos se encuentra en:

### Ubicación del archivo

```
~/.local/share/gastos-personales/cache/gastos.db  # Linux
~/Library/Application Support/gastos-personales/cache/gastos.db  # macOS
%APPDATA%/gastos-personales/cache/gastos.db  # Windows
```

### Acceder vía CLI (SQLite)

Instalar `sqlite3` si no lo tienes:

```bash
# Ubuntu / Debian
sudo apt install sqlite3

# macOS
brew install sqlite

# Windows (con chocolatey)
choco install sqlite
```

Conectarse a la base de datos:

```bash
sqlite3 ~/.config/com.gastospersonales.app/gastos.db
```

Comandos útiles una vez conectado:

```sql
-- Ver todas las transacciones
SELECT * FROM transactions;

-- Ver configuración guardada (ej: Rule 50/30/20)
SELECT key, value FROM settings;

-- Ver logs de errores
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 20;

-- Filtrar transacciones por fecha
SELECT * FROM transactions WHERE date BETWEEN '2026-01-01' AND '2026-04-08';

-- Ver resumen de gastos por categoría
SELECT category, SUM(amount) as total FROM transactions 
WHERE type='expense' GROUP BY category ORDER BY total DESC;

-- Exportar a CSV
.mode csv
.output gastos_export.csv
SELECT * FROM transactions;
.quit
```

**Nota:** Cerciorarse de cerrar la app antes de acceder a la base de datos para evitar bloqueos de archivo.

---

## Configuración inicial

Al iniciar la app por primera vez:

1. Ir a **Configuración** (ícono de engranaje en el sidebar)
2. Ingresar la **API Key de Claude** (Anthropic) para habilitar el análisis de gastos con IA
   - Obtener en: https://console.anthropic.com
3. La cotización del dólar se actualiza automáticamente cada 30 minutos desde `dolarapi.com`

---

## Estructura del proyecto

```
gastos-personales/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Componentes UI
│   ├── hooks/              # Custom hooks (transacciones, dólar, filtros)
│   ├── lib/                # DB, Claude API, exportación
│   └── types/              # Tipos TypeScript
├── src-tauri/              # Backend Rust (Tauri)
│   ├── src/                # Comandos Rust y lógica nativa
│   └── tauri.conf.json     # Configuración de la app
└── package.json
```

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Desktop runtime | Tauri 2.x |
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS 3 |
| Gráficos | Recharts |
| Base de datos | SQLite (via tauri-plugin-sql) |
| Exportación | xlsx |
| IA | Claude API (Anthropic) |
| Cotización USD | dolarapi.com |
