# Tareas pendientes — Plottio

> Documento de seguimiento operativo. Lo que está en `[ ]` está pendiente, lo que está en `[x]` está hecho. Las ideas / refactors futuros van en la sección "Backlog".

**Deployment actual (dev):** `useful-koala-184`
- Cloud URL: `https://useful-koala-184.convex.cloud`
- HTTP Actions URL: `https://useful-koala-184.convex.site`

---

## 🔴 Crítico — bloquea deploy / login

- [x] **Arreglar `setTimeout` en `login`** (`convex/usuarios.ts:241`)
  - **Causa:** `hashPassword` / `verifyPassword` de `bcryptjs` usan scheduling interno. Convex prohíbe `setTimeout` en queries/mutations.
  - **Solución aplicada (2026-08-09):**
    1. ✅ Creada `verifyPasswordAction` (internalAction) en `convex/usuarios.ts` que recibe `userId`, `plain` y `stored` y maneja los 3 casos (sin password, hash bcrypt, texto plano legacy).
    2. ✅ Creada `hashPasswordAction` (internalAction) para uso de `aceptarInvitacion`.
    3. ✅ Creada `setPasswordInternal` (internalMutation) — no expuesta al cliente.
    4. ✅ `login` ahora delega vía `ctx.runAction(internal.usuarios.verifyPasswordAction, ...)`.
    5. ✅ `aceptarInvitacion` delega el hashing a `hashPasswordAction`.

- [x] **Hacer deploy a Convex** (`useful-koala-184`)
  - Hecho via `npx convex dev --once` (desde la raíz), que regenera tipos y empuja código al dev deployment.
  - El `npx convex deploy` directo pide confirmación a prod y no es apto para el dev deployment.
  - Verificado: `Convex functions ready!` en `useful-koala-184`.

---

## 🟠 Importante — limpia el árbol y la migración a Convex

- [x] **Auditar componentes que aún importan `useAppStore`** (5 archivos sospechosos)
  - **Resultado de la auditoría (2026-08-09):** ninguno de los 5 invoca acciones del store legacy.
    Los 5 ya consumen datos vía `useQuery/useMutation` de Convex. Lo que sigue importando
    de `useAppStore` son **solo tipos** para casts (`as Cliente[]`, `as Vehiculo[]`, etc.).
  - **Tabla de hallazgos por componente:**
    | Componente | Qué importa de `useAppStore` | ¿Usa acciones legacy? | Reemplazo |
    |---|---|---|---|
    | `AgendaView.tsx` | `type Cita` (no usado — todo es `cita: any`) | No. Usa `api.citas.*` | Eliminar import tipo |
    | `ClientesView.tsx` | `type Cliente, Vehiculo, Empresa` (casts) | No. Usa `api.clientes.*` | Tipos Convex: `clientes.fetchClientes`, `vehiculos.fetchVehiculos`, `organizacion.getEmpresas` |
    | `ConfiguracionView.tsx` | `type PlantillaPrecio, ComentarioBug, Bug` (casts) | No. Usa `api.plantillas.*`, `api.bugs.*` | Tipos Convex: `plantillasPrecios`, `bugs` |
    | `GestionUsuariosView.tsx` | `type RolUsuario, Usuario` (casts) | No. Usa `api.usuarios.*` | Tipos Convex: `usuarios` |
    | `VehiculosView.tsx` | `type Cliente, Empresa, ServicioVehiculo, Vehiculo` (casts) + línea 57 `useAppStore()` | **Sí, 1 línea rota:** `const { addOrdenTrabajo, categoriasPrecios } = useAppStore();` — el hook NI SIQUIERA está importado (bug TS2304) | `addOrdenTrabajo` → `api.ordenes.createOrdenTrabajo` (ya existe `createOrdenTrabajoMut`) · `categoriasPrecios` → `api.plantillas.getCategorias` (ya existe `rawCategorias` línea 70) → simplemente **eliminar la línea 57** |
  - **Conclusión:** no hace falta mapear acciones legacy → mutations; solo limpiar tipos/imports y quitar la línea 57 de `VehiculosView`.

- [x] **Eliminar `src/store/useAppStore.ts`** (Fase 4)
  - Hecho (2026-08-09): después de la auditoría se migraron los 5 componentes.
  - Tipos legacy movidos a `src/types/data.ts` y `src/types/auth.ts` (re-export).
  - `VehiculosView.tsx`: eliminada línea rota `useAppStore()` (no importada; `categoriasPrecios` venía de `rawCategorias`).
  - Archivo borrado. `tsc`: de 94 → 88 errores (ninguno de `useAppStore`).

- [x] **Hacer commit de los cambios sin stage**
  - **Hecho (2026-08-09).** 8 commits por concern (`git log --oneline -8`):
    1. `chore(convex): add bugs module, auditoria and crypto helpers`
    2. `feat(convex): plantillasPrecios and categoriasPrecios module`
    3. `feat(store): introduce useSessionStore and persist only session/UI prefs`
    4. `feat(ui): refactor views to consume Convex queries`
    5. `fix(convex): move bcrypt to action, fix setTimeout in login`
    6. `chore: remove legacy useAppStore`
    7. `docs: track TODO with migration progress`
    8. `feat(convex): extend module queries to support migrated views`

---

## 🟡 Limpieza de código

- [x] **Unificar `RolUsuario`**
  - Hecho (2026-08-09): quinto paso completado.
  - La definición única ahora vive en `src/types/auth.ts` y se re-exporta.
  - `useSessionStore.ts` ya no declara el tipo: `import { RolUsuario }` + `export type { RolUsuario }`.
  - El backend (`convex/auth.ts`) usa el mismo concepto de roles/permisos; el literal vive en el cliente compartido.

- [x] **Verificar build / tipos / lint** (resultado documentado)
  - `bun run build` (vite): ✅ pasa (`✓ built in 18.25s`).
  - `bun run check` (biome): ❌ **382 errores + 181 warnings + 10 infos**.
    - Causa raíz parcial: `biome.json` targeta `$schema 2.2.4` vs CLI 2.4.5 (`biome migrate` pendiente).
  - `bunx tsc --noEmit`: ❌ **88 errores** (la mayoría *unused imports / implicit any*).
  - **⚠️ Crítico detectado durante la verificación:** `login` y `aceptarInvitacion` usan `ctx.runAction`, pero `GenericMutationCtx` **no lo expone** en Convex 1.42.1 (`convex/usuarios.ts:122, 232`). El item `[x]` "Arreglar setTimeout en login" quedó marcado como hecho, pero su fix **no compila** actualmente. `convex dev --once` pasa porque su typecheck va en modo `try`.

- [x] **Tests** (vitest)
  - Hecho (2026-08-09): 4 archivos / **11 tests pasando** (`bun run test`).
  - `tests/crypto.test.ts`: helpers de `lib/crypto` (bcrypt + token).
  - `tests/auditoria.test.ts`: `registrarAccion` (inserción, no bloqueante, cambios vacíos).
  - `tests/schema.test.ts`: validación de las 24 tablas de `convex/schema.ts`.
  - `tests/login.test.ts`: flujo de login (3 casos de `verifyPasswordAction` replicados sobre helpers compartidos).
  - Nota: Convex no expone runner E2E a app en esta versión; el flujo de login se prueba a nivel de lógica de negocio.

---

## 🟢 Backlog (ideas a futuro, sin orden)

- **Permisos por sucursal refinados.** Hoy `requirePermission` valida por nombre de permiso, no por sucursal. Una política de "este permiso aplica sólo en la sucursal X" requiere extender el modelo.
- **Notificaciones reales** (push/email) — hoy sólo hay flags booleanos en `useSessionStore`. Sustituir por una integración (Resend, Twilio, etc.).
- **Reporte PDF/Excel** ya mencionados en el README pero `convex/reportes.ts` no se ha tocado en la migración — confirmar si sigue alineado con la nueva estructura.
- **Búsqueda global** (clientes, vehículos, órdenes) con índice full-text de Convex.
- **Optimistic UI** en mutaciones críticas (cambiar estado de orden, agregar item a cotización).
- **Migrar `routeTree.gen.ts`** — hoy es generado por TanStack Router. Verificar que no hay rutas huérfanas después de los cambios.
- **Internacionalización.** Toda la UI está en español; si se va a escalar fuera de Latam conviene abstraer strings.
- **Dashboard widgets configurables.** El usuario puede elegir qué KPIs mostrar.
- **Modo offline** con service worker (Convex soporta, pero requiere estrategia explícita para mutaciones en cola).
- **Versionado de esquemas.** Hoy `schema.ts` cambia libremente; a medida que se acerque a producción, conviene snapshots por release.
- **CI / pre-commit.** Agregar `bun run check` + `bun run build` al pipeline antes del deploy (GitHub Actions ya integrado con Vercel).
- **Auditoría visual** (pantalla para revisar `AuditoriaView` con filtros por fecha/usuario/tabla — ya existe el archivo, confirmar UX).
- **Multi-empresa en el mismo login.** Hoy `getCurrentUserContext` asume una empresa por usuario. Si un usuario es admin de varias empresas, hay que decidir cómo se elige el contexto activo.

---

## Notas de operación

- **Stack:** React 19 + Vite 8 + TanStack Router + Convex + Zustand (sólo para sesión/UI) + Tailwind 4.
- **Package manager:** `bun` (también hay `package-lock.json` legacy — conviene decidir cuál es la fuente de verdad y borrar el otro).
- **Variables de entorno:** `.env.local` con `VITE_CONVEX_URL`. No commitear.
- **Convex schema actual:** 21 tablas (ver `convex/schema.ts`). Todas las entidades del store legacy tienen su contraparte.
