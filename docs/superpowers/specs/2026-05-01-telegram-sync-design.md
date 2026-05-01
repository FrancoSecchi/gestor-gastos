# Sincronización mobile vía Telegram Bot

**Fecha:** 2026-05-01  
**Estado:** Aprobado

## Objetivo

Permitir registrar transacciones desde el celular mediante un bot de Telegram con flujo guiado por botones. Los movimientos se almacenan temporalmente en Supabase y se sincronizan al SQLite local la próxima vez que se abre la app de escritorio.

## Fuera de scope (v1)

- "Ver resumen del mes" desde el bot (requiere migrar SQLite completo a Supabase)

---

## Arquitectura general

```
[Telegram] ──webhook──► [Bot Server (Railway)]
                               │
                          valida JWT
                               │
                               ▼
                  [Supabase Edge Function]
                               │
                          escribe con
                          service_role key
                               │
                               ▼
                  [Supabase DB] pending_transactions
                               │
                               ▲
                  lee con anon key + RLS
                               │
                  [App Desktop (Tauri)]
                        al arrancar:
                        importa a SQLite local
                        y marca como synced
```

---

## Componentes

### 1. Bot de Telegram (Node.js en Railway)

- Desplegado en Railway free tier
- Maneja la máquina de estados de conversación por `telegram_chat_id` (en memoria)
- Antes de mostrar categorías, fetch de `user_settings` del usuario para incluir sus categorías custom
- Autentica al usuario una única vez via pairing code (ver Seguridad)
- Guarda la relación `telegram_user_id → supabase_user_id` en Supabase tras la vinculación

### 2. Supabase Edge Function

- Único punto de inserción en `pending_transactions`
- Usa `service_role` key (nunca expuesta al cliente)
- Recibe el movimiento validado del bot junto con el JWT del usuario
- Valida el JWT antes de escribir

### 3. Supabase Auth

- Email + contraseña
- La cuenta se crea **solo desde la app de escritorio** (onboarding o Ajustes)
- El bot nunca recibe credenciales — solo el pairing code de vinculación

### 4. App Desktop (Tauri)

- Paso de login/registro agregado al onboarding (opcional, salteable — la app sigue funcionando 100% local si no se configura)
- Pantalla "Vincular Telegram" en Ajustes: genera pairing code y lo muestra
- Al arrancar: consulta `pending_transactions` con `synced_at IS NULL`, importa al SQLite local, marca como synced

---

## Modelo de datos (Supabase)

### `pending_transactions`

```sql
CREATE TABLE pending_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  subtype     TEXT,           -- 'transfer_to_savings' | 'transfer_from_savings' | NULL
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL CHECK (currency IN ('ARS', 'USD', 'EUR', 'BRL')),
  category    TEXT NOT NULL,
  description TEXT,
  date        TEXT NOT NULL,  -- ISO date (YYYY-MM-DD)
  created_at  TIMESTAMPTZ DEFAULT now(),
  synced_at   TIMESTAMPTZ     -- NULL = pendiente, fecha = ya importado
);
```

**RLS policies:**
- `SELECT`: `user_id = auth.uid() AND synced_at IS NULL`
- `UPDATE` (marcar synced): solo filas propias
- `INSERT`: bloqueado para el cliente — solo Edge Function con `service_role`

### `user_settings`

```sql
CREATE TABLE user_settings (
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,  -- JSON, mismo formato que settings local
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
```

**Claves sincronizadas (desktop → Supabase):**
- `custom_expense_categories`
- `custom_income_categories`

**RLS policies:**
- `SELECT` / `UPDATE`: solo filas propias (`user_id = auth.uid()`)
- `INSERT`: solo filas propias

**Cuándo se sincroniza:** cada vez que el usuario guarda una categoría custom en la app, hace un upsert silencioso en background a `user_settings`.

---

## Seguridad

### Vinculación Telegram (pairing code)

Ninguna credencial viaja por Telegram. El flujo es:

1. En Ajustes → "Vincular Telegram": la app genera un código de 6 caracteres alfanuméricos, lo sube a Supabase con TTL de 5 minutos y lo muestra en pantalla.
2. El usuario escribe `/vincular CÓDIGO` en el bot.
3. El bot consulta Supabase: si el código existe y no expiró, asocia el `telegram_user_id` con el `user_id` correspondiente y destruye el código.
4. El código es de un solo uso.

### Protección de la DB

- El cliente (app desktop) solo tiene el `anon key` con RLS
- La Edge Function tiene el `service_role key` como variable de entorno server-side
- El bot no tiene acceso directo a la DB — solo llama a la Edge Function con el JWT del usuario

---

## Flujo del bot de Telegram

```
/start o mensaje inicial
  │
  ▼
"¿Qué querés hacer?"
  [Registrar gasto] [Registrar ingreso] [Registrar ahorro]

  (Ahorro → type: 'expense', subtype: 'transfer_to_savings', categoría fija: "Ahorro")
  │
  ▼
"¿A qué categoría corresponde?"
  (botones: built-in + custom del usuario desde user_settings)
  │
  ▼
"¿En qué moneda?"
  [ARS] [USD] [EUR] [BRL]
  │
  ▼
"¿Cuánto?" (usuario escribe el número)
  │
  ▼
"Registrado ✓ — $500 ARS en Comida"
  │
  ▼
"¿Querés registrar algo más?"
  [Sí] → vuelve al inicio
  [No] → "¡Hasta luego!"
```

**Manejo de errores en el bot:**
- Si el usuario escribe texto libre fuera del paso de monto: "No entendí, usá los botones" y repite la pregunta actual.
- Si el monto ingresado no es un número válido: "Ingresá solo el número, por ejemplo: 1500"
- Si falla la Edge Function al guardar: "Hubo un error al guardar, intentá de nuevo."

---

## Sync al arrancar (app desktop)

Durante el loader de inicio (ya existente):

1. Verificar si hay sesión de Supabase activa (JWT guardado en `settings` local)
2. Si hay sesión: fetch de `pending_transactions` donde `synced_at IS NULL`
3. Para cada pending: insertar en SQLite local con el mismo esquema de `transactions`
4. Batch `UPDATE` en Supabase para setear `synced_at = now()`
5. Mostrar toast: "Se importaron N movimientos desde el celular" (si N > 0)
6. Si no hay sesión o falla la red: continuar normalmente, sin bloquear el arranque

---

## Feature futura (post v1)

**"Ver resumen del mes" desde el bot:** requiere que las transacciones confirmadas también vivan en Supabase, no solo en SQLite local. Implica una migración de la capa de persistencia que queda fuera de esta iteración.
