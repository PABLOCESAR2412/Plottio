# Tareas pendientes — Plottio

> Documento de seguimiento operativo. Lo que está en `[ ]` está pendiente, lo que está en `[x]` está hecho. Las ideas / refactors futuros van en la sección "Backlog".

**Deployment actual (dev):** `useful-koala-184`
- Cloud URL: `https://useful-koala-184.convex.cloud`
- HTTP Actions URL: `https://useful-koala-184.convex.site`

---

## 🔴 Crítico — bloquea deploy / login

- [x] **Arreglar `setTimeout` en `login`** (`convex/usuarios.ts`)
  - **Causa:** `hashPassword` / `verifyPassword` de `bcryptjs` usan scheduling interno. Convex prohíbe `setTimeout` en queries/mutations.
  - **Solución aplicada (2026-08-09, v2):**
    1. ✅ `login` y `aceptarInvitacion` ahora son **actions** (no mutations): en Convex 1.42 las mutations ya no tienen `ctx.runAction`, y las actions sí pueden ejecutar bcrypt.
    2. ✅ Creados `getUserByTokenInternal`, `getUserByEmailInternal`, `getUserByIdInternal` (internalQuery) y `aceptarInvitacionInternal` (internalMutation) como puente de las actions a la BD.
    3. ✅ Eliminadas `verifyPasswordAction` y `hashPasswordAction` (obsoletas: `ctx.runAction` no existe en mutations).
    4. ✅ El cliente usa `useAction(api.usuarios.login)` y `useAction(api.usuarios.aceptarInvitacion)` en vez de `useMutation`.
    5. ✅ Fix de tipo: anotación `Promise<Doc<"usuarios"> | null>` rompe la circularidad de inferencia del módulo.

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
  - `bunx tsc --noEmit`: ✅ **0 errores** (tras la limpieza de biome/tsc de la sesión del 2026-08-09).
  - `bun run check` (biome): actualizado — ver item de limpieza de lint abajo ("Reducir errores de lint").

- [x] **Reducir errores de lint (Biome)** — 312 → **0 errores**
  - Hecho (2026-08-09): `biome.json` migrado a `$schema 2.4.5` (via `biome migrate --write`).
  - **Errores de Tipografía/Hooks (fixtures reales, resueltos):**
    - `correctness/useHookAtTopLevel` (14): hooks `useState` después de early-return en `AgendaView.tsx` (líneas 39-68) e `InventarioView.tsx` (transfer). Movidos arriba del `return <TableSkeleton />`.
  - **`suspicious/noArrayIndexKey` (14):** casos justificados (listas estáticas o formularios controlados por índice) documentados con `// biome-ignore` + razón:
    - `Skeleton.tsx` (placeholders), `LoginView.tsx` (beneficios estáticos), `BugReporter.tsx` y `ConfiguracionView.tsx` (capturas), `AgendaView.tsx` (celdas vacías de calendario), `CotizacionesView.tsx` (ítems de cotización), `KitsFlotaView.tsx` (items y vehículos), `OrdenesTrabajoView.tsx` (tareas, fotos, notas, orderItems — controlados por índice).
  - **Reglas a11y (270) bajadas de error → advertencia** en `biome.json` (no auto-fixables, deuda de accesibilidad legacy): `noLabelWithoutControl` (125), `useButtonType` (122), `noStaticElementInteractions` (19), `useKeyWithClickEvents` (18). Siguen visibles como warnings para no perder visibilidad.

- [x] **Resolver los 137 `suspicious/noExplicitAny`** (delegado a subagentes, 2026-08-09)
  - Reemplazados los `as any` / `as unknown as any` por `Id<"tabla">` de `convex/_generated/dataModel` (confirmando cada firma contra el módulo convex correspondiente).
  - Archivos (17): AgendaView, AuditoriaView, BugReporter, CatalogoView, ConfiguracionView, CotizacionesView, DashboardView, EmpresasView, GestionUsuariosView, InventarioView, KitsFlotaView, LotesProduccionView, OrdenesTrabajoView, RolesView, Sidebar, SucursalesAdmin, VehiculosView.
  - También: `catch (err: any)` → `catch (err)` + `err instanceof Error`; `useState<any>` → `Doc<...> | null`; tipos en callbacks y params.
  - Resultado: **0 `noExplicitAny`**, tsc 0 errores, 11/11 tests, biome 0 errores.
  - **Pendiente:** quedan **285 warnings de a11y** (misma deuda documentada arriba).

- [x] **Feature: Branding de empresa (logo + nombre)**
  - Hecho (2026-08-09):
    - `convex/organizacion.ts`: `updateEmpresa` ahora acepta `logoUrl`; nuevas `generateLogoUploadUrl` (storage de Convex) y `getEmpresaBranding` (resuelve storageId a URL pública).
    - `src/store/useSessionStore.ts` + `LoginView.tsx`: `SessionUser` guarda `empresaId` (ya venía en el Doc devuelto por login).
    - `EmpresasView.tsx`: el modal de edición permite subir el logo (preview + upload a storage); el detalle de la empresa activa muestra el logo resuelto.
    - `Sidebar.tsx`: muestra el logo + nombre de la empresa activa en el header; actualiza dinámicamente el `<link rel="icon">` (favicon).
    - Deploy a Convex **pendiente** (`bunx convex dev --once`) para que los cambios de backend surtan efecto.

- [x] **Tests** (vitest)
  - Hecho (2026-08-09): 4 archivos / **11 tests pasando** (`bun run test`).
  - `tests/crypto.test.ts`: helpers de `lib/crypto` (bcrypt + token).
  - `tests/auditoria.test.ts`: `registrarAccion` (inserción, no bloqueante, cambios vacíos).
  - `tests/schema.test.ts`: validación de las 24 tablas de `convex/schema.ts`.
  - `tests/login.test.ts`: flujo de login (3 casos de `verifyPasswordAction` replicados sobre helpers compartidos).
  - Nota: Convex no expone runner E2E a app en esta versión; el flujo de login se prueba a nivel de lógica de negocio.

- [x] **Resolver los 285 warnings de a11y** (delegado a subagentes, 2026-08-11)
  - `useButtonType` (122) → `type="button"`; `noLabelWithoutControl` (126) → `htmlFor`+`id` o `<span>` para texto estático; `noStaticElementInteractions` (19) → `<button>` o `role="button"`+`tabIndex`+`onKeyDown`; `useKeyWithClickEvents` (18) → `onKeyDown` Enter/espacio.
  - Archivos (18): AgendaView, AuditoriaView, BugReporter, CatalogoView, ClientesView, ConfiguracionView, CotizacionesView, DashboardView, EmpresasView, GestionUsuariosView, InventarioView, KitsFlotaView, LoginView, OrdenesTrabajoView, RolesView, Sidebar, SucursalesAdmin, VehiculosView.
  - Resultado: **biome lint 0**, tsc 0, tests 11/11. Queda solo deuda de formato CRLF → resuelta abajo.

- [x] **Mantenimiento: alinear `convex/reportes.ts` + fix RBAC (clave de permisos)**
  - Índices/campos de `reportes.ts` alineados con `schema.ts` (by_empresa_sucursal, by_empresa, campos de ordenesTrabajo/auditoria/clientes/inventarioSucursal).
  - **Bug encontrado:** el seed de `convex/permisos.ts` creaba permisos con nombres en español ("Ver Cotizaciones"...), pero los guards usan claves `ver_*` / `crear_*` / `editar_*`. Salvo SuperAdmin (atajo en `auth.ts`), **ningún rol pasaba `requirePermission`**.
  - Fix aplicado: campo `clave` en la tabla `permisos` (schema.ts + índice `by_clave`); `seedPermisos` ahora hace **upsert por `nombre` + backfill de `clave`** sobre filas existentes y crea el catálogo completo (19 permisos); `getCurrentUserContext` usa `perm.clave ?? perm.nombre`.
  - `convex/reportes.ts` sigue **sin consumidor en `src/`** (queda para el backlog de Reporte PDF/Excel).

- [x] **Mantenimiento: verificar `routeTree.gen.ts`**
  - Solo `__root` + `index` (rutas existentes). Componentes huérfanos: ninguno (AuditoriaView/GestionUsuariosView/RolesView se consumen desde ConfiguracionView; Skeleton y SuccessDialog son UI compartida).

- [x] **Mantenimiento: CI / pre-commit + CRLF**
  - `bun run check` (biome) fallaba por CRLF: git con `core.autocrlf=true` escribe CRLF en el working tree (Windows) pero biome espera LF.
  - Fix: nuevo `.gitattributes` con `* text=auto eol=lf`; 46 archivos normalizados a LF; 3 restantes formateados (`ClientesView`, `CotizacionesView`, `GestionUsuariosView`).
  - Creados `.github/workflows/ci.yml` (check + typecheck + tests + build con bun) y `.githooks/pre-commit` (check + typecheck); `core.hooksPath=.githooks`.
  - Resultado: **biome 0 errores, lint 0, tsc 0, tests 11/11, build OK**.

---

## 🟢 Backlog (ideas a futuro, en orden de ejecución)

- [x] **Permisos por sucursal refinados.** (2026-08-11)
  - `UserContext` ahora expone `permisosPorSucursal: { sucursalId, permisos[] }` además de `permisos` global.
  - `checkPermission` con `sucursalId` valida que el permiso esté concedido **en esa sucursal** (o `ver_todas_sucursales`). SuperAdmin sigue pasando todo.
  - `transferirInventario` ahora exige `editar_inventario` en sucursal origen **y destino**.
  - tsc 0, tests 11/11.
- [x] **Notificaciones reales (in-app).** (2026-08-11, híbrido: in-app + plan de email documentado)
  - Nueva tabla `notificaciones` (usuarioId, empresaId, tipo, titulo, mensaje, leida, enlace, fecha) con índices `by_usuario`, `by_empresa`, `by_usuario_leida`.
  - Nuevo módulo `convex/notificaciones.ts`: `crearNotificacion` (internalMutation), `getMisNotificaciones`, `contarNoLeidas`, `marcarLeida`, `marcarTodasLeidas`.
  - Triggers: `createOrdenTrabajo` notifica al técnico asignado; `updateCotizacion` notifica al creador cuando cambia a "Aprobada".
  - `Sidebar.tsx`: campana con contador no leído + dropdown con lista (marcar leída / marcar todas).
  - **Email (Resend) pendiente:** keys en env de Convex; triggers adicionales en crear cita / bug. Deploy a Convex pendiente (`bunx convex dev --once`) para la tabla nueva.
- [x] **Reporte PDF/Excel conectado a queries server-side.** (2026-08-11)
  - `getReporteIngresos` enriquecido: clienteTelefono, vehiculoTipo, progreso, fechaInicio/fechaFin, sucursalId (además de id/cliente/placa/total/estado/sucursal).
  - Nuevo query `getPuedeVerReportes` (usa `checkPermission` con `ver_reportes`, sin lanzar 403) para gatear en cliente.
  - `ConfiguracionView`: filtros Desde/Hasta/Estado/Sucursal (sucursal solo SuperAdmin), los exports PDF/CSV ahora usan `reporteData` server-side (respaldado en datos locales si no hay permiso o carga pendiente).
  - codegen + biome 0 + tsc 0 + tests 11/11 + build OK.
- [x] **Búsqueda global.** (2026-08-12)
  - `searchIndex` full-text en schema: clientes (`search_nombre`/nombre), vehiculos (`search_placa`/placa), ordenesTrabajo (`search_cliente`/clienteNombre); filtros `empresaId`+`sucursalId`.
  - Nuevo `convex/busqueda.ts` (`busquedaGlobal`), scoped por empresa y sucursales visibles.
  - `Sidebar.tsx`: buscador en nav con dropdown de resultados (Clientes/Vehículos/Órdenes) que navega.
  - Nota API: en Convex 1.41+ el método es `withSearchIndex`, no `withSearch`.
- [x] **Optimistic UI.** (2026-08-12)
  - `OrdenesTrabajoView`: `useMutation(...).withOptimisticUpdate` en `toggleItemCompletado` (recalcula items/total/progreso en localStore con `getQuery`/`setQuery`).
  - Descartado en creates (`createCotizacion`): el `_id` lo genera el servidor y la query devuelve doc completo enriquecido → placeholder frágil.
- [x] **Migrar `routeTree.gen.ts`.** (2026-08-12) Verificado: solo `__root` + `index`, sin rutas huérfanas. Nota: hay 3 actionRutas generadas sin uso (ver investigación 2026-08-09).
- [x] **Internacionalización.** (2026-08-12, fase inicial)
  - `i18next` + `react-i18next`; `src/i18n/` con diccionarios `es.json`/`en.json` y `setLanguage` (persiste en localStorage).
  - Strings traducidos en `Sidebar` (nav + buscar + selector de idioma en footer) y `DashboardView` (KPIs, secciones, acciones). Resto de la UI queda en español por ahora.
- [x] **Dashboard widgets configurables.** (2026-08-12)
  - `useSessionStore`: `dashboardWidgets` persistido; `DashboardView`: botón "Personalizar" con checkboxes para Tarjetas de métricas / Órdenes recientes / Citas de hoy / Acciones rápidas.
- [x] **Modo offline (PWA).** (2026-08-12)
  - `vite-plugin-pwa` (registerType autoUpdate, Workbox `generateSW`, navigateFallback `/index.html`); `public/manifest.json` con marca Plottio; SW registrado en `main.tsx`.
  - Precarga 14 entradas (1.6 MiB). Nota: mutaciones requieren red; la shell carga offline pero Convex necesita conexión.
- [x] **Versionado de esquemas.** (2026-08-12)
  - Tabla `migrations` en schema; `convex/migrations/index.ts` con `runMigrations` (internalMutation, ejecución acumulativa idempotente) y `listMigrations`.
  - Plantilla `0001_normalizar_usuarios`; ejecutada en dev (`1 aplicada`). Para añadir: crear `00XX_nombre.ts` exportando `{name, run}` y registrarlo en `MIGRACIONES`.
- [x] **Auditoría visual** (2026-08-12 + fix de seguridad)
  - `getAuditoria` ahora **fuerza tenant** desde `getCurrentUserContext` (eliminada la ruta con `empresaId: undefined` que devolvía todo sin filtrar) y acepta filtros `{desde,hasta,usuario,tabla}`.
  - `AuditoriaView.tsx` reescrito: filtros de búsqueda por usuario, módulo, fechas desde/hasta + limpiar; fila de detalle expandible con JSON de cambios.
- [x] **Multi-empresa en el mismo login.** (2026-08-12)
  - `organizacion.getMisEmpresas` (empresas vía roles/sucursales + SuperAdmin ve todas activas) y `setEmpresaContexto` (cambia empresaId/sucursalId por defecto).
  - `Sidebar.tsx`: selector de empresa en la cabecera cuando hay más de una accesible.
- [x] **Email (Resend).** (2026-08-12, triggers implementados, keys pendientes)
  - `convex/emails.ts`: `enviarEmailCita` y `enviarEmailBug` (internalActions vía fetch a Resend, no bloqueantes si no hay `RESEND_API_KEY`).
  - Triggers: `createCita` y `createBug` programan vía `ctx.scheduler.runAfter`.
  - Pendiente: `npx convex env set RESEND_API_KEY`, `RESEND_CITA_TO`, `RESEND_BUG_TO` (y `RESEND_FROM` para prod).

---

## Notas de operación

- **Stack:** React 19 + Vite 8 + TanStack Router + Convex + Zustand (sólo para sesión/UI) + Tailwind 4.
- **Package manager:** `bun` (fuente de verdad, v1.2.19). `package-lock.json` legacy **eliminado** (2026-08-09); `bun.lock` sincronizado y congelado (`bun install --frozen-lockfile` OK).
- **Variables de entorno:** `.env.local` con `VITE_CONVEX_URL`. No commitear.
- **Convex schema actual:** 21 tablas (ver `convex/schema.ts`). Todas las entidades del store legacy tienen su contraparte.
