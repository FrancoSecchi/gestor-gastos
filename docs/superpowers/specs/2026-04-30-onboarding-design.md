# Onboarding — Design Spec

**Fecha:** 2026-04-30
**Estado:** Aprobado

## Objetivo

Reducir la fricción para nuevos usuarios mostrando un wizard de 3 pasos la primera vez que abren la app. También accesible desde Ajustes para quienes quieran revisarlo.

## Flujo

### Paso 1 — Bienvenida
- Título: "Bienvenido a Gastos Personales"
- Lista de secciones principales con ícono y descripción breve:
  - 📊 Movimientos — Registrá ingresos y gastos
  - 🎯 Presupuesto — Controlá tus límites
  - 🏦 Ahorros — Seguí tus metas
  - 📈 Inversiones — Gestioná tu cartera
  - 💳 Deudas — Controlá lo que debés
  - 🏠 Vivienda — Seguí tu alquiler
- Botón "Siguiente →"

### Paso 2 — Moneda
- Título: "¿Con qué moneda trabajás?"
- Grid 2×2 con las 4 monedas de `SUPPORTED_CURRENCIES` (ARS, USD, EUR, MAD)
- Cada opción muestra símbolo y nombre de la moneda
- La moneda actualmente seleccionada aparece resaltada
- Al seleccionar llama a `setCurrency(code)` inmediatamente
- Renderizado dinámico desde `SUPPORTED_CURRENCIES` — si se agrega una moneda, aparece sola
- Botones "← Atrás" y "Siguiente →"

### Paso 3 — ¡Listo!
- Título: "🎉 ¡Todo listo!"
- Subtítulo: "Ya podés empezar a usar la app."
- Botón primario: "+ Cargar primera transacción" → marca onboarding completo, navega al dashboard y abre el formulario de nueva transacción
- Botón secundario: "Ir al dashboard" → marca onboarding completo y navega al dashboard

## Indicador de progreso

Barra de 3 puntos en el header de cada paso:
- Paso completado: ✓ (relleno)
- Paso actual: ● (relleno primario)
- Paso pendiente: ○ (vacío)

## Persistencia

- Al completar el wizard (cualquier botón del paso 3) guardar `onboarding_completed = 'true'` en la tabla `settings` via la función `setSetting` existente en `src/lib/db.ts`
- Al iniciar la app: leer `onboarding_completed` antes de determinar la vista inicial. Si no existe o es falsy → `activeView = 'onboarding'`. Si existe → `activeView = 'dashboard'`
- Desde Ajustes: botón "Ver tutorial" que llama `setActiveView('onboarding')`

## Arquitectura

- Nueva vista `'onboarding'` agregada al tipo `ActiveView` en `App.tsx`
- Componente: `src/components/onboarding/OnboardingView.tsx`
  - Maneja el estado de paso actual (`step: 1 | 2 | 3`) internamente
  - Recibe props: `onComplete: (openForm?: boolean) => void`, `currency: CurrencyInfo`, `setCurrency: (code: CurrencyCode) => Promise<void>`
- En `App.tsx`:
  - Leer `onboarding_completed` en el `useEffect` inicial y setear `activeView` antes de renderizar
  - Agregar case `'onboarding'` en el render condicional
  - En Ajustes: agregar botón que llame `setActiveView('onboarding')`

## Fuera de alcance

- Animaciones entre pasos
- Onboarding multi-página con scroll
- Validación de formularios (el paso 2 tiene selección, no input libre)
- Skip individual de pasos (el usuario puede ir al dashboard directo desde paso 3)
