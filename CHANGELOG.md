# Changelog

Todos los cambios notables de este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.3.0] - 2026-04-30

### Added
- **Widget Patrimonio Neto** en el dashboard: muestra el balance consolidado de activos y pasivos con tooltip explicativo
- **Sección de Inversiones**: registro y seguimiento de inversiones personales
- **Sección de Deudas**: gestión de deudas con posibilidad de asociar movimientos existentes
- **Onboarding**: wizard de bienvenida para nuevos usuarios en el primer arranque
- Botón "Ver tutorial" en Ajustes para relanzar el onboarding en cualquier momento

### Changed
- La app ahora se llama **Contás**

### Removed
- Integración con IA (análisis via Claude API)

---

## [0.2.0] - 2026-04-22

### Added
- Vista de Tendencias: evolución mes a mes de ingresos, gastos, balance, grupos presupuestarios y categorías (últimos 6 o 12 meses)

---

## [0.1.0] - 2026-04-22

### Added
- Soporte para indicar si se tiene contrato de alquiler activo o no
- Campo de comentarios en transacciones
- Cotizaciones de monedas locales adicionales (además del dólar)
- Sección de **Metas** con metas de ahorro personalizadas (monto objetivo, moneda, fecha límite)
- Opción para activar/desactivar la regla de presupuesto 50/30/20
- Posibilidad de marcar una transacción existente como recurrente
- Filtros adicionales en la vista de movimientos (por subcategoría y tipo)
- Widget de **Ritmo del mes** en el dashboard: proyecta el balance de cierre según el gasto actual
- Adjuntar documentos y recibos a transacciones individuales
- Sección de **Ahorros** con registro de movimientos y saldo acumulado
- Sección de **Vivienda** con gestión de contrato de alquiler y seguimiento de vencimiento
- Sección de **Pagos recurrentes** con frecuencia configurable
- Visor de base de datos interno para inspección de datos
- Tooltips informativos en widgets del dashboard
- Estados de carga (loaders) en vistas pesadas
- Lazy loading de componentes para mejorar el tiempo de inicio
- Exportación de datos a formato Excel
- Análisis con IA via integración con Claude (exportación estructurada para análisis)
- Índices de inflación configurables para ajuste de valores históricos

### Changed
- Rediseño visual completo del dashboard con widgets colapsables
- Sidebar reorganizado por agrupaciones temáticas
- Regla 50/30/20 renombrada a "Metas" con porcentajes personalizables por grupo
- Gráficos de gastos mejorados con mejor legibilidad
- Animaciones y transiciones pulidas en toda la UI
- Optimizaciones de rendimiento con `React.memo` y `useMemo` en componentes críticos

### Fixed
- Cálculo incorrecto de gastos de vivienda
- Varios fixes de estabilidad en vistas de ahorros y metas

---

## [0.0.1] - 2026-04-08

### Added
- Estructura inicial del proyecto (Tauri v2 + React + TypeScript + Vite)
- Base de datos SQLite local con tablas `transactions`, `settings` y `error_logs`
- Registro de transacciones de ingresos y egresos con categorías
- Categorías predefinidas de gastos e ingresos
- Categorías personalizadas almacenadas en base de datos
- Íconos configurables por categoría
- Regla de presupuesto 50/30/20 con mapping de categorías a grupos
- Dashboard con resumen mensual (ingresos, egresos, balance)
- Gráfico de distribución de gastos por categoría
- Filtros por fecha, tipo y categoría
- Cotización del dólar en tiempo real (múltiples tipos de cambio) con caché de 30 minutos
- Tema oscuro con sistema de design tokens via Tailwind CSS
- Soporte de locale argentino (formato de fechas y moneda)
- CI/CD workflow inicial

[Unreleased]: https://github.com/FrancoSecchi/gastos-personales/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/FrancoSecchi/gastos-personales/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/FrancoSecchi/gastos-personales/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FrancoSecchi/gastos-personales/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/FrancoSecchi/gastos-personales/releases/tag/v0.0.1
