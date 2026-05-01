# Widget: Patrimonio Neto

**Fecha:** 2026-04-30
**Estado:** Aprobado

## Objetivo

Agregar un widget al dashboard que muestre el patrimonio neto del usuario: el valor total de sus activos (ahorros + inversiones) menos sus pasivos (deudas). Es el número más importante en finanzas personales y hoy no existe en la app.

## Alcance

- Widget colapsable en el dashboard, siguiendo el mismo patrón que los widgets existentes.
- Solo lectura — no tiene acciones propias; es puramente informativo.
- No requiere cambios en la base de datos ni nuevos hooks: compone datos ya existentes.

## Cálculo

```
Patrimonio Neto = Ahorros + Inversiones − Deudas
```

| Componente    | Fuente de datos                                      |
|---------------|------------------------------------------------------|
| Ahorros       | Suma del saldo actual de todas las metas de ahorro   |
| Inversiones   | Suma del valor actual de todas las inversiones       |
| Deudas        | Suma del monto pendiente de todas las deudas         |

**Decisión de diseño:** no se incluye el flujo neto de transacciones para evitar doble conteo. El dinero ya depositado en metas de ahorro o invertido aparecería dos veces si también se sumara el ingreso neto de transacciones. Si el usuario quiere que su efectivo cuente, puede crear una meta de ahorro llamada "Cuenta corriente" o "Efectivo".

## Diseño visual

```
┌─────────────────────────────────┐
│ 💰 Patrimonio Neto        [−]   │
├─────────────────────────────────┤
│         $1.240.500              │  ← total grande y centrado
│                                 │
│  🏦 Ahorros        $800.000     │
│  📈 Inversiones    $600.000     │
│  💳 Deudas        −$159.500     │
└─────────────────────────────────┘
```

- El **total** usa el color primario del tema cuando es positivo; rojo cuando es negativo.
- **Deudas** se muestra siempre en rojo con signo negativo explícito.
- El formato de moneda respeta `useCurrency` (igual que el resto de la app).
- El widget es colapsable con el mismo mecanismo que los otros widgets del dashboard.

## Implementación

### Componente nuevo
`src/components/dashboard/NetWorthWidget.tsx`

- Recibe como props los totales de ahorros, inversiones y deudas (ya calculados por hooks existentes).
- No hace llamadas a DB propias.

### Integración en el dashboard
- Agregar `NetWorthWidget` en `src/components/dashboard/` y montarlo en la vista del dashboard (`Dashboard.tsx` o equivalente).
- Pasar los datos desde los hooks existentes: `useSavingsGoals`, `useInvestments`, `useDebts`.

### Hooks existentes a reutilizar
- `useSavingsGoals` → calcular saldo total de metas
- `useInvestments` → calcular valor total de inversiones
- `useDebts` → calcular monto pendiente total de deudas

## Fuera de alcance

- Evolución histórica del patrimonio (requeriría snapshots en DB — complejidad desproporcionada para un widget).
- Acciones desde el widget (navegar a secciones, editar valores).
- Configuración de qué componentes incluir/excluir.
