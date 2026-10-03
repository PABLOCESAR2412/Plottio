# Plan de Corrección Integral — Plottio

Estado general de tareas: `[ ]` Pendiente | `[/]` En progreso | `[x]` Completada y Aprobada

---

## Tareas

- [x] **Tarea 1 (P0): Corrección crítica de validación RUC (Ecuador Módulo 11)**
  - **Archivos:** `src/lib/identificacion.ts`, `convex/consultaIdentidad.ts`, `tests/identificacion.test.ts`
  - **Requerimiento:** Implementar validación completa según norma SRI para:
    1. Personas naturales (10 dígitos válidos + "001", módulo 10).
    2. Sociedades privadas y extranjeros sin cédula (3er dígito 9, coeficientes `[4,3,2,7,6,5,4,3,2]`, residuo módulo 11).
    3. Sociedades públicas (3er dígito 6, coeficientes `[3,2,7,6,5,4,3,2]`, residuo módulo 11).
  - **Criterios de Aceptación:** `validarRuc` debe aceptar RUCs válidos de personas naturales, privadas y públicas; rechazar longitudes distintas a 13, caracteres no numéricos y dígitos verificadores incorrectos. Pruebas unitarias completas pasando.

- [x] **Tarea 2 (P0): Eliminación de endpoints inseguros y protección de credenciales en backend**
  - **Archivos:** `convex/usuarios.ts`, `tests/login.test.ts`
  - **Requerimiento:**
    1. Eliminar query pública `getAllPublicUsers` que expone hashes y tokens a clientes no autenticados.
    2. En mutación `login`, excluir campo `password` (hash bcrypt) del objeto devuelto al cliente.
    3. Proteger `getUserByToken` asegurando que no filtre datos sensibles innecesarios.
  - **Criterios de Aceptación:** Ningún endpoint expone `password` o lista masiva de usuarios sin autenticar. Pruebas de login pasando sin devolver hash.

- [x] **Tarea 3 (P0): Limpieza de secretos en frontend (`useIntegrationsStore`) y almacenamiento seguro de fotos**
  - **Archivos:** `src/store/useIntegrationsStore.ts`, `src/components/BugReporter.tsx`
  - **Requerimiento:**
    1. Eliminar API keys reales y contraseñas quemadas en `useIntegrationsStore.ts`. Las credenciales deben venir de variables de entorno o ser ingresadas por el usuario sin valores mock inseguros por defecto.
    2. En `BugReporter.tsx`, reemplazar guardado directo de Base64 en documento Convex (que supera límite de 1MB) por subida binaria (`generateUploadUrl` / `ctx.storage`).
  - **Criterios de Aceptación:** No existen strings como `sk-proj-`, `AIzaSy`, `evo_live_`, `botToken` hardcodeados en el store. Fotos de bugs se suben vía storage Id.

- [x] **Tarea 4 (P0): Eliminación de código basura y archivos huérfanos**
  - **Archivos:** `src/components/landing/*.astro`, `src/routes/index.tsx`, `convex/clientes.ts`
  - **Requerimiento:**
    1. Eliminar los 5 archivos `.astro` huérfanos en `src/components/landing/`.
    2. Eliminar bloque de código inalcanzable de loader en `src/routes/index.tsx:208-214`.
    3. Eliminar script de migración pública con RUC hardcodeado `repararClientesHuerfanos` en `convex/clientes.ts`.
  - **Criterios de Aceptación:** Proyecto compila limpiamente sin residuos ni bloques inalcanzables.

- [x] **Tarea 5 (P1): Corrección de permisos, nombres de rol y control RBAC en Convex**
  - **Archivos:** `convex/auth.ts`, `convex/vehiculos.ts`, `convex/ordenes.ts`, `convex/roles.ts`, `convex/organizacion.ts`, `convex/citas.ts`, `convex/auditoria.ts`, `db/fase2.sql`
  - **Requerimiento:**
    1. Unificar nombre de rol canónico a `"SuperAdmin"` (eliminar `"Super Admin"` con espacio en `vehiculos.ts` y SQL).
    2. En `convex/ordenes.ts:354`, corregir permiso `"editar_ordenes"` a `"editar_orden"` (singular).
    3. Proteger mutaciones de `roles.ts`, `organizacion.ts` y `citas.ts` exigiendo `usuarioId` y validando pertenencia a `userContext.empresa.id` o rol `SuperAdmin`.
    4. Convertir `registrarAccion` en `convex/auditoria.ts` a llamada interna no expuesta como mutación pública manipulable.
  - **Criterios de Aceptación:** Validaciones de roles y permisos consistentes en backend; no se pueden forjar acciones ni alterar empresas ajenas.

- [x] **Tarea 6 (P1): Consistencia de esquema, anti-race conditions e índices en Convex**
  - **Archivos:** `convex/schema.ts`, `convex/lotesProduccion.ts`, `convex/usuarios.ts`, `convex/placasStock.ts`, `convex/plantillas.ts`
  - **Requerimiento:**
    1. En `convex/schema.ts`, añadir índices faltantes: `usuarios.by_invitation_token`, `vehiculos.by_placa`, `clientes.by_empresa_identificacion`, `placasStock.by_orden`.
    2. Reemplazar `v.any()` en `auditoria.cambios` por estructura tipada.
    3. En `lotesProduccion.ts`, reemplazar `lotes.length + 1` por generación determinista segura.
    4. En `plantillas.ts`, eliminar fallback global multitenant que fuga precios de otras empresas.
    5. Reemplazar `ctx.db.patch(id, { campo: undefined })` por `null` en `usuarios.ts` y `placasStock.ts`.
  - **Criterios de Aceptación:** Schema estricto e indexado; sin fugas cross-tenant en plantillas; mutaciones seguras.

- [x] **Tarea 7 (P1/P2): Arquitectura frontend, TanStack Router y Error Boundaries**
  - **Archivos:** `src/main.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/components/AgendaView.tsx`, `src/components/CatalogoView.tsx`
  - **Requerimiento:**
    1. Instanciar `ConvexReactClient` y `QueryClient` en `main.tsx` o como singletons externos, pasándolos al router context.
    2. Añadir `errorComponent` en `src/routes/__root.tsx`.
    3. Eliminar timeout artificial de 1500ms en `src/routes/index.tsx`.
    4. En `AgendaView.tsx`, inicializar fechas con `new Date()` dinámico en lugar de `2026-06-03`.
    5. En `CatalogoView.tsx`, reparar botón "Editar" para renderizar el modal correspondiente.
  - **Criterios de Aceptación:** Sin pantalla blanca ante fallos no controlados; arranque instantáneo sin delays ficticios; agenda en tiempo presente.

- [x] **Tarea 8 (P2): Modularización de God Components y duplicación de PDF**
  - **Archivos:** `src/components/CotizacionesView.tsx`, `src/components/ConfiguracionView.tsx`, `src/lib/pdf/`
  - **Requerimiento:**
    1. Extraer lógica duplicada de generación de PDF con `jsPDF` a módulos utilitarios en `src/lib/pdf/cotizacionPdf.ts` y `src/lib/pdf/reportePdf.ts`.
    2. Descomponer las secciones independientes de `ConfiguracionView.tsx` en componentes más pequeños.
  - **Criterios de Aceptación:** Reducción drástica de duplicación de código; componentes mantenibles con responsabilidades únicas.

---

## Fase 2: Deuda Técnica, Seguridad Profunda y Arquitectura

- [x] **Tarea 9 (P0 - Fase 2): Eliminación de fugas multi-tenant críticas y blindaje de mutaciones en backend**
  - **Archivos:** `convex/cotizaciones.ts`, `convex/catalogoServicios.ts`, `convex/inventario.ts`, `convex/vehiculos.ts`, `convex/lotesProduccion.ts`, `convex/placasStock.ts`, `convex/seed.ts`, `convex/permisos.ts`, `tests/backendSecurityFase2.test.ts`
  - **Requerimiento:**
    1. Eliminar query pública global `getCotizaciones` en `cotizaciones.ts`.
    2. Exigir `usuarioId` obligatorio en `catalogoServicios.getServicios` y filtrar por empresa (nunca devolver todos los tenants).
    3. En `inventario.getAlertasStockMinimo`, filtrar solo por las sucursales de la empresa del usuario (evitar leak de todas las empresas en `ver_todas_sucursales`).
    4. Proteger mutaciones de `vehiculos.ts` (`updateVehiculo`, `deleteVehiculo`, `servicios`) validando `empresaId` y permisos.
    5. Proteger `inventario.ts` (`updateInventarioItem`, `deleteInventarioItem`) validando `item.empresaId`.
    6. Proteger `lotesProduccion.ts` (`actualizarEstadoLote`, `cambiarEstadoLote`) y `placasStock.ts` (`marcarPlacaInstalada`, `liberarPlacaAsignada`).
    7. Convertir `seed.ts` (`populate`) y `permisos.ts` (`seedPermisos`) en `internalMutation`.
  - **Criterios de Aceptación:** Cero endpoints públicos que fuguen datos de múltiples empresas; todas las mutaciones validan pertenencia a la empresa del usuario.

- [x] **Tarea 10 (P1 - Fase 2): Corrección de bugs de render, inyección de URLs y colisiones de IDs**
  - **Archivos:** `src/components/KitsFlotaView.tsx`, `src/components/LotesProduccionView.tsx`, `src/components/VehiculosView.tsx`, `src/components/CotizacionesView.tsx`, `src/components/OrdenesTrabajoView.tsx`, `convex/vehiculos.ts`, `convex/bugs.ts`, `tests/uiBugsFase2.test.ts`
  - **Requerimiento:**
    1. Eliminar `key={crypto.randomUUID()}` en los bucles de render en `KitsFlotaView.tsx:542`, `LotesProduccionView.tsx:526`, `VehiculosView.tsx:858`, usando identificadores estables (`item.id`, `item._id` o `${fecha}-${idx}`).
    2. En `CotizacionesView.tsx:635-644`, aplicar `encodeURIComponent` sobre el texto completo del mensaje de WhatsApp para evitar inyección y rotura de URL.
    3. En `OrdenesTrabajoView.tsx:1221, 1279`, eliminar el silenciamiento ciego de errores en `catch(err)`; mostrar feedback `toast.error` y no resetear el formulario si la mutación falla.
    4. En `convex/vehiculos.ts:158` y `convex/bugs.ts:188`, sustituir `Date.now()` por `crypto.randomUUID()` para generación de IDs de sub-items.
  - **Criterios de Aceptación:** DOM no se destruye en cada re-render; enlaces de WhatsApp son seguros y robustos; errores de servidor se notifican al usuario; IDs únicos deterministas.

- [x] **Tarea 11 (P1 - Fase 2): Limpieza de código muerto, dependencias zombi y tipado estricto**
  - **Archivos:** `src/routes/index.tsx`, `src/store/useSessionStore.ts`, `src/components/AgendaView.tsx`, `src/components/OrdenesTrabajoView.tsx`, `src/components/VehiculosView.tsx`, `tests/cleanCodeFase2.test.ts`
  - **Requerimiento:**
    1. En `src/routes/index.tsx`, eliminar el bloque inalcanzable de splash screen (L159-185) y el estado muerto `loading`.
    2. En `src/store/useSessionStore.ts`, eliminar la rama muerta `typeof userOrId === "string"` y la manipulación redundante del DOM (`classList.add/remove("dark")`).
    3. Reemplazar `rawClientes as any[]` y `error: any` en `AgendaView.tsx`, `OrdenesTrabajoView.tsx`, `VehiculosView.tsx` por tipos estrictos de Convex (`Doc<"clientes">`, etc.).
  - **Criterios de Aceptación:** Cero bloques inalcanzables en router/layouts; tipado estricto sin `as any[]`.

- [x] **Tarea 12 (P2 - Fase 2): Modularización de God Components (`OrdenesTrabajoView` y `VehiculosView`)**
  - **Archivos:** `src/components/OrdenesTrabajoView.tsx`, `src/components/VehiculosView.tsx`, `src/components/ordenes/`, `src/components/vehiculos/`
  - **Requerimiento:**
    1. Descomponer `OrdenesTrabajoView.tsx` (>1800 líneas) extrayendo:
       - `src/components/ordenes/OrderMasterList.tsx`
       - `src/components/ordenes/OrderDetailPanel.tsx`
       - `src/components/ordenes/OrderCreateModal.tsx`
    2. Descomponer `VehiculosView.tsx` (>1700 líneas) extrayendo sus modales y paneles:
       - `src/components/vehiculos/VehiculoMasterList.tsx`
       - `src/components/vehiculos/VehiculoDetailPanel.tsx`
       - `src/components/vehiculos/VehiculoFormModal.tsx`
  - **Criterios de Aceptación:** Archivos principales reducidos a menos de 500 líneas con separación clara de presentación y modales.

- [x] **Tarea 13 (P2 - Fase 2): Aislamiento de lógica simulada / Mock Demo Mode**
  - **Archivos:** `src/components/ApexBrainModal.tsx`, `src/components/WhatsAppClientChatModal.tsx`, `src/components/ClientEmailThreadModal.tsx`, `src/components/TelegramConfigModal.tsx`
  - **Requerimiento:**
    1. Añadir badges y avisos visibles de "Modo Demostración / Sandbox" en `ApexBrainModal`, `WhatsAppClientChatModal`, `ClientEmailThreadModal` y `TelegramConfigModal` para que los usuarios y operadores sepan claramente que operan en modo simulado.
    2. Eliminar `Math.random()` engañoso en `WhatsAppClientChatModal` que simula respuestas de clientes ficticios.
  - **Criterios de Aceptación:** UI transparente que no induce a error sobre integraciones activas; sin respuestas ficticias no controladas.

- [x] **Tarea 14 (P0 - Deployment): Remoción de vulnerabilidad XSS en TanStack Start y dependencias SSR zombi**
  - **Archivos:** `package.json`, `bun.lock`, `package-lock.json`, `tests/deploymentSecurity.test.ts`
  - **Requerimiento:**
    1. Desinstalación de `@tanstack/react-start` (bloqueado por Vercel por vulnerabilidad XSS conocida en v1.168.26).
    2. Desinstalación de dependencias zombi de SSR no utilizadas (`@tanstack/react-router-ssr-query`, `nitro`).
    3. Actualización consistente de `bun.lock` y `package-lock.json`.
    4. Creación de prueba de regresión `tests/deploymentSecurity.test.ts`.
    5. Verificación de compilación limpia (`bun run build`) y paso del 100% de la suite de pruebas (`bun run test`).
  - **Criterios de Aceptación:** `@tanstack/react-start` ausente en árbol de dependencias; build de producción limpio; cero regresiones.

- [x] **Tarea 15 (P0 - Deployment): Configuración canónica de VITE_CONVEX_URL de producción y fallback resiliente**
  - **Archivos:** `src/routes/__root.tsx`, `.env.production`, `tests/convexDeploymentUrl.test.ts`
  - **Requerimiento:**
    1. En `src/routes/__root.tsx`, erradicar el crash fatal `Couldn't parse deployment name unconfigured` usando como fallback canónico la URL de producción real del proyecto Convex (`https://polished-ladybug-273.convex.cloud`).
    2. Crear `.env.production` con `VITE_CONVEX_URL=https://polished-ladybug-273.convex.cloud` para que los builds en Vercel tengan la URL inyectada por defecto.
    3. Crear `tests/convexDeploymentUrl.test.ts` validando que la URL de Convex siempre resuelva a un deployment válido parseable y no a un string inválido.
    4. Asegurar que `bun run test` y `bun run build` pasen al 100%.
  - **Criterios de Aceptación:** Aplicación carga sin fatal error de Convex en despliegues donde la variable de entorno no esté configurada manualmente en el dashboard de Vercel.

