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

- [x] **Tarea 16 (P0 - Auth & Resilience): Validación de sesión activa en frontend, auto-recuperación de sesiones corruptas y botón de reseteo en ErrorBoundary**
  - **Archivos:** `convex/usuarios.ts`, `src/routes/index.tsx`, `src/routes/__root.tsx`, `tests/sessionResilience.test.ts`
  - **Requerimiento:**
    1. En `convex/usuarios.ts`, crear query segura `validarSesion` con argumento `usuarioId: v.string()` que no lance `ArgumentValidationError` si el ID pertenece a otra tabla o es corrupto; debe devolver `{ valida: false }` si el ID no corresponde a un documento de la tabla `usuarios` activo.
    2. En `src/routes/index.tsx`, utilizar `validarSesion` cuando `currentUser` exista en el store local. Si `valida === false`, limpiar la sesión con `setCurrentUser(null)` para devolver al usuario de forma segura a `LoginView`.
    3. En `src/routes/__root.tsx`, añadir a `RootErrorFallback` el botón de acción "Limpiar sesión y reiniciar" que purga `localStorage` (`plottio-auth-storage`) y recarga la página, permitiendo salir de cualquier estado de sesión corrupto persistido en el cliente.
    4. Crear pruebas unitarias en `tests/sessionResilience.test.ts`.
    5. Asegurar paso del 100% de los tests (`bun run test`) y compilación limpia (`bun run build`).
  - **Criterios de Aceptación:** Sesiones corruptas o IDs huérfanos se auto-purgan limpiamente hacia `LoginView` sin romper con errores fatales de Convex ni bloquear al usuario.

---

## Fase 3: Integraciones, Plottio Asistente RAG, Limpieza de Dominio y Bug de Clientes/Empresas

- [x] **Tarea 17 (P0): Corrección del bug de creación simultánea de Cliente y Empresa en `ClientesView.tsx`**
  - **Archivos:** `src/components/ClientesView.tsx`, `convex/clientes.ts`, `convex/organizacion.ts`, `tests/clienteEmpresaCreation.test.ts`
  - **Requerimiento:**
    1. En `ClientesView.tsx`, al seleccionar "Crear cliente y empresa" tras la consulta de identidad, asegurar que se creen y guarden AMBOS registros: el cliente y la empresa.
    2. Evitar que `empresaId` del cliente sobrescriba el ID del tenant de la organización (el taller); vincular la empresa cliente a través de `empresaVinculadaId` conservando `cliente.empresaId` del tenant actual.
    3. Asegurar que `createEmpresa` o una mutación dedicada de Empresa Cliente no bloquee a usuarios no-SuperAdmin al registrar clientes corporativos del taller.
    4. Ambos registros deben quedar visibles inmediatamente en la lista de clientes y empresas del taller.
  - **Criterios de Aceptación:** Al crear cliente con empresa asociada, ambos se crean en la BD de Convex y aparecen de inmediato en sus vistas correspondientes sin perderse el cliente.

- [x] **Tarea 18 (P1): Refactorización de Integraciones — Webhooks limpios y Configuración de WhatsApp (Acadia / Cloudflare Worker)**
  - **Archivos:** `src/components/ConfiguracionView.tsx`, `src/store/useIntegrationsStore.ts`, `src/components/WhatsAppClientChatModal.tsx`, `tests/integracionesClean.test.ts`
  - **Requerimiento:**
    1. En la pestaña de Webhooks de Integraciones: eliminar completamente el simulador de Lead CRM, los logs falsos/registro en vivo (`inboundLogs`) y la guía paso a paso ficticia. Dejar únicamente la gestión real de Webhooks salientes/entrantes.
    2. Configurar la ruta canónica del webhook de Plottio.
    3. En WhatsApp: erradicar cualquier referencia a "Evolution API" (nombrarlo únicamente "WhatsApp").
    4. Integrar protocolo Cloudflare Worker Acadia (`https://acadia.simcodec.workers.dev/api/webhook/wha`) y agregar campos configurables en la UI:
       - Nombre de la instancia (`instanceName`)
       - URL del servidor / Webhook (`serverUrl`)
       - API Key / Secret (`apiKey`)
  - **Criterios de Aceptación:** UI de webhooks sin simuladores de juguete; WhatsApp configurable con los 3 campos exactos y sin mención a Evolution API.

- [x] **Tarea 19 (P1): Eliminación total de la Integración de Correo Electrónico**
  - **Archivos:** `src/components/EmailIntegrationModal.tsx`, `src/components/ClientEmailThreadModal.tsx`, `src/routes/index.tsx`, `src/components/ClientesView.tsx`, `src/store/useIntegrationsStore.ts`, `tests/emailRemoval.test.ts`
  - **Requerimiento:**
    1. Eliminar los modales y accesos de correo: `EmailIntegrationModal.tsx`, `ClientEmailThreadModal.tsx`.
    2. Eliminar el botón y shortcut de correo del header global en `src/routes/index.tsx`.
    3. Eliminar botones de enviar correo en `ClientesView.tsx` y referencias en `useIntegrationsStore.ts`.
  - **Criterios de Aceptación:** Cero componentes, botones o código huérfano de integración de correo en la aplicación.

- [x] **Tarea 20 (P1): Transformación de APEX Brain a "Plottio Asistente", Erradicación de pgvector y Agentic RAG de Negocio**
  - **Archivos:** `src/components/ApexBrainModal.tsx` (renombrar o refactorizar a `PlottioAsistenteModal.tsx`), `src/routes/index.tsx`, `src/store/useIntegrationsStore.ts`, `tests/plottioAsistente.test.ts`
  - **Requerimiento:**
    1. Renombrar en toda la aplicación "APEX Brain" por "Plottio Asistente".
    2. Erradicar toda mención y etiqueta de `pgvector` y `768d`.
    3. Implementar patrón Agentic RAG operacional: el asistente debe tener herramientas/acciones para interactuar exclusivamente con la lógica de negocio (consultar, crear, modificar órdenes, clientes, vehículos, cotizaciones, inventario), bloqueando cualquier acceso a la configuración del sistema, usuarios o roles.
    4. Agregar opción en la UI para modificar la configuración del asistente (nombre, prompt del sistema/instrucciones, modelo y temperatura).
  - **Criterios de Aceptación:** UI consistente bajo "Plottio Asistente", sin menciones a pgvector, con configuración editable y límites estrictos a lógica de negocio.

- [x] **Tarea 21 (P1): Panel IA / FinOps Multi-Proveedor (Google, Groq, Opencode Zen, Nvidia) con Métricas y Filtros Temporales**
  - **Archivos:** `src/components/FinOpsMetricsPanel.tsx`, `src/store/useIntegrationsStore.ts`, `tests/finopsMultiProvider.test.ts`, `tests/integrationsStore.test.ts`
  - **Requerimiento:**
    1. En el panel de IA / FinOps, soportar exactamente 4 proveedores: Google, Groq, Opencode Zen y Nvidia.
    2. Reconocer y permitir selección de los modelos correspondientes a cada proveedor.
    3. Mostrar métricas de consumo: usos/solicitudes, tokens usados, tokens por segundo, rendimiento/latencia y costo/inversión estimado.
    4. Implementar filtros temporales: Día (Hoy), Semana (7 días), 15 días, 1 mes (30 días) e Intervalos.
  - **Criterios de Aceptación:** Panel FinOps operacional con los 4 proveedores, selector dinámico de modelos, métricas y los 5 filtros temporales requeridos.

- [x] **Tarea 22 (P2): Clarificación de Dominio Multi-Tenant (Organización del Taller vs Empresas Clientes B2B)**
  - **Archivos:** `convex/schema.ts`, `convex/organizacion.ts`, `convex/clientes.ts`, `src/components/EmpresasView.tsx`, `src/components/SucursalesAdmin.tsx`
  - **Requerimiento:**
    1. Clarificar la separación de dominio:
       - Estructura Multi-tenant del Taller: Empresa Matriz, Sucursales y Puntos de Venta (gestión de sedes físicas y empleados).
       - Empresas Clientes / Flotas: Cooperativas de transporte y clientes B2B (entidad comercial del negocio que posee vehículos y clientes).
    2. Garantizar que la gestión de Empresas Clientes no requiera rol SuperAdmin del tenant y no altere la configuración de sedes/sucursales del taller.
  - **Criterios de Aceptación:** Separación limpia de conceptos en UI y backend; usuarios autorizados del taller pueden gestionar flotas y empresas clientes sin conflicto con la estructura multi-sucursal interna.

---

## Fase 4: Single-Org Simplificado, Analíticas Reales, WhatsApp QR y Chat Impecable

- [x] **Tarea 23 (P0): Eliminación Radical de Multi-Tenant, Sucursales y Puntos de Venta (Arquitectura Single-Org)**
  - **Archivos:** `convex/schema.ts`, `convex/organizacion.ts`, `convex/auth.ts`, `convex/usuarios.ts`, `convex/clientes.ts`, `convex/ordenes.ts`, `convex/cotizaciones.ts`, `convex/inventario.ts`, `convex/vehiculos.ts`, `convex/lotesProduccion.ts`, `convex/citas.ts`, `src/components/SucursalesAdmin.tsx` (eliminar/desactivar), `src/components/ConfiguracionView.tsx`, `src/components/Sidebar.tsx`, `src/routes/index.tsx`, `src/store/useSessionStore.ts`, `tests/singleOrg.test.ts`
  - **Requerimiento:**
    1. Erradicar en el modelo de datos y backend toda dependencia de `sucursales` y `puntosVenta` (`sucursalId`, `pvId`, `esMatriz`, filtros por sucursal).
    2. Convertir el sistema a Single-Org: una sola organización/taller central donde todas las operaciones pertenecen a la empresa única.
    3. Eliminar la pestaña y vista de Sucursales en Configuración (`SucursalesAdmin.tsx`), selectores de sucursal en el header/sidebar y filtros de sucursal en todas las consultas y mutaciones.
    4. Conservar `empresas` únicamente para las cuentas de clientes corporativos / flotas B2B.
  - **Criterios de Aceptación:** Cero menciones de sucursales o puntos de venta en la UI; backend opera limpiamente como organización única sin filtros multi-sucursal; compilación y tests al 100%.

- [x] **Tarea 24 (P1): Analíticas y Configuración — Datos Reales y Detección Dinámica de Modelos por API Key**
  - **Archivos:** `src/components/ConfiguracionView.tsx`, `src/components/FinOpsMetricsPanel.tsx`, `src/store/useIntegrationsStore.ts`, `src/services/aiModelsDiscovery.ts`, `tests/analiticasConfig.test.ts`
  - **Requerimiento:**
    1. Renombrar pestaña en Configuración: "IA / FinOps" -> "Analíticas y Configuración".
    2. Erradicar métricas simuladas o hardcodeadas: calcular usos, tokens, tiempos y costos en base a interacciones reales registradas en auditoría/asistente/órdenes.
    3. Al ingresar o validar la API Key de cada proveedor (Google, Groq, Opencode Zen, Nvidia), ejecutar auto-reconocimiento dinámico de modelos disponibles consultando el endpoint del proveedor (con fallback canónico en caso de error o sin conexión).
  - **Criterios de Aceptación:** Pestaña "Analíticas y Configuración" operativa con datos reales y auto-detección reactiva de modelos al ingresar credenciales.

- [x] **Tarea 25 (P1): WhatsApp — Ocultación de Credenciales y Visualización de Código QR**
  - **Archivos:** `src/components/WhatsAppConfigModal.tsx`, `src/store/useIntegrationsStore.ts`, `src/components/WhatsAppQrCode.tsx`, `tests/whatsappQrFlow.test.ts`
  - **Requerimiento:**
    1. En el modal/panel de WhatsApp: una vez guardada la configuración o realizada la conexión (`instanceName`, `serverUrl`, `apiKey`), ocultar los campos de texto de credenciales.
    2. Mostrar en su lugar el Código QR interactivo de vinculación con instrucciones claras para escanear desde la app de WhatsApp.
    3. Incluir botón "Modificar Configuración" / "Editar Credenciales" para volver a mostrar los inputs si el usuario necesita cambiar URLs o llaves.
  - **Criterios de Aceptación:** Credenciales se ocultan tras guardar; QR de vinculación se despliega como vista principal de conexión con opción para re-editar configuración.

- [x] **Tarea 26 (P1): Rediseño Impeccable del Chat de Plottio Asistente**
  - **Archivos:** `src/components/PlottioAsistenteModal.tsx`, `tests/impeccableChat.test.ts`
  - **Requerimiento:**
    1. Aplicar estándares de diseño /impeccable en `PlottioAsistenteModal.tsx`:
       - Layout ultra-pulido, tipografía impecable con spacing armónico.
       - Burbujas de mensaje modernas con microinteracciones y timestamps elegantes.
       - Visualización clara y compacta de las herramientas de negocio invocadas (chips de acción de negocio ejecutada).
       - Citas contextuales de RAG desplegables de manera sobria y profesional.
       - Input de mensaje con auto-resize, botones de acción rápida y atajos visuales accesibles.
  - **Criterios de Aceptación:** Chat de Plottio Asistente con estética premium, responsive, accesible y sin clutter visual.

---

## Fase 5: Correcciones de Producción — Webhooks Plottio, Sanitización WhatsApp y Asistente Real

- [x] **Tarea 27 (P1): Webhooks de Dominio Plottio, Sanitización de URLs de WhatsApp y Activación Real de Plottio Asistente**
  - **Archivos:** `src/store/useIntegrationsStore.ts`, `src/components/WhatsAppConfigModal.tsx`, `src/components/WebhookManagerModal.tsx`, `src/components/PlottioAsistenteModal.tsx`, `src/services/plottioAgent.ts`, `tests/produccionCorrections.test.ts`
  - **Requerimiento:**
    1. **Sanitización de URL de WhatsApp & Fix error 404:**
       - Purgar y auto-sanitizar cualquier residuo de `evolution-api-0q39.onrender.com` o URLs obsoletas en localStorage y estado inicial.
       - Establecer URL oficial por defecto bajo el dominio canónico: `https://plottio.vercel.app/api/webhook/wha`.
       - En `handleTestConnection`, si el servidor responde 404, no silenciar ni romper, sino desplegar advertencia clara sobre endpoint no encontrado.
    2. **Dominio Oficial para Webhooks:**
       - En `useIntegrationsStore.ts` y `WebhookManagerModal.tsx`, usar el dominio de producción actual `https://plottio.vercel.app/` (`https://plottio.vercel.app/api/webhooks`).
    3. **Plottio Asistente en Modo Real con API Key:**
       - Detectar reactivamente si existe API key (`googleApiKey`, `groqApiKey`, `nvidiaApiKey`, `opencodeZenApiKey`, `geminiApiKey`).
       - Si tiene API key, remover banner y badge de "Modo Demostración / Sandbox", mostrando estado "IA Conectada / Operacional".
       - Conectar llamada a la API del proveedor configurado cuando la API key esté presente, integrando la respuesta con las herramientas y guardrails de negocio.
    4. **Limpieza de Configuración del Asistente:**
       - En la pestaña de Configuración de `PlottioAsistenteModal.tsx`, eliminar el selector `Modelo LLM Asignado:`, preservando `Nombre del Asistente` y `Prompt del Sistema / Instrucciones`.
  - **Criterios de Aceptación:** Cero llamadas fallidas a onrender; webhooks con dominio `plottio.vercel.app`; asistente en modo operacional real cuando hay API key; configuración sin selector de modelo.

- [x] **Tarea 28 (P0): Corrección de Modelos Gemini (gemini-flash-latest / gemini-3.8-flash) y Eliminación de Error 404 en API de Google**
  - **Archivos:** `src/services/plottioAgent.ts`, `src/store/useIntegrationsStore.ts`, `src/services/aiModelsDiscovery.ts`, `src/routes/__root.tsx`, `tests/geminiLiveModelFix.test.ts`
  - **Requerimiento:**
    1. **Reemplazo de modelo Gemini deprecado:**
       - En `src/services/plottioAgent.ts`, erradicar la URL fija con `gemini-1.5-flash` (modelo descontinuado para nuevas keys `AQ.` que arroja HTTP 404).
       - Utilizar como endpoint canónico `gemini-flash-latest` (o `gemini-3.8-flash`), resolviendo automáticamente a las versiones activas de Google AI Studio.
       - Si la petición con el modelo seleccionado arroja 404, ejecutar retry automático inmediato hacia `gemini-flash-latest`.
    2. **Actualización del catálogo de modelos Google:**
       - En `src/store/useIntegrationsStore.ts` y `src/services/aiModelsDiscovery.ts`, actualizar el catálogo canónico de Google a: `["Gemini Flash Latest", "Gemini 3.8 Flash", "Gemini 2.5 Flash", "Gemini 2.5 Pro"]`.
    3. **Purga activa de red onrender en inicio de aplicación:**
       - En `src/routes/__root.tsx`, limpiar en el arranque cualquier residual de `evolution-api-0q39.onrender.com` de `localStorage` para garantizar que ningún cliente conserve URLs descontinuadas.
  - **Criterios de Aceptación:** Llamadas a Google Gemini API exitosas (HTTP 200) sin error 404; respuesta del asistente generada en vivo con el modelo activo; cero rastros de onrender.
---

## FASE 6: ESTABILIZACIÓN OPERATIVA, BACKEND CONVEX Y PERFECCIONAMIENTO DE PLOTTIO ASISTENTE

- [x] **Tarea 29 (P0): Solución de Server Error en Convex (createClienteConEmpresa, Auditoría y Despliegue Cloud)**
  - **Archivos:** `convex/schema.ts`, `convex/clientes.ts`, `tests/convexClienteEmpresaFix.test.ts`
  - **Requerimiento:**
    1. Flexibilizar validador de `auditoria.cambios` a `v.optional(v.any())` para admitir arrays de objetos (ítems de orden) e Ids de Convex sin violar el esquema.
    2. Asegurar en `convex/clientes.ts` que `createClienteConEmpresa` maneje empresas existentes o nuevas, valide duplicados con mensajes limpios de `ConvexError` y registre auditoría de forma segura.
    3. Garantizar que `fetchClientes` recupere todos los clientes de la organización sin pérdidas.
    4. Desplegar backend en la nube con `bunx convex deploy --yes`.
  - **Criterios de Aceptación:** `bunx convex dev --once` y `bunx convex deploy --yes` finalizan con código 0; `createClienteConEmpresa` ejecuta transacciones atómicas sin Server Error.

- [x] **Tarea 30 (P0): Búsqueda Avanzada de Clientes y Verificación Preventiva de Duplicados en BD**
  - **Archivos:** `src/components/ClientesView.tsx`, `tests/clienteBusquedaDuplicados.test.ts`
  - **Requerimiento:**
    1. En `ClientesView.tsx`, expandir el filtro de búsqueda (`searchTerm`) para coincidir por `nombre`, `identificacion` (cédula o RUC), `telefono`, `email`, `direccion` y empresa vinculada.
    2. En el modal de creación de cliente, al ingresar o cambiar la identificación, buscar PRIMERO en la base de datos local/Convex si el cliente ya existe.
    3. Si ya existe, mostrar tarjeta de advertencia amigable: "Cliente ya registrado en la base de datos: [Nombre] ([Identificación])" con botón para ver o editar dicho cliente, evitando re-creaciones duplicadas y consultas SRI innecesarias.
  - **Criterios de Aceptación:** Búsqueda por cédula/RUC encuentra clientes inmediatamente; intento de registrar identificación existente avisa preventivamente con opción de ver el cliente existente.

- [x] **Tarea 31 (P0): Endpoint Webhook WhatsApp en Vercel y Bloqueo Activo de Onrender**
  - **Archivos:** `api/webhook/wha.ts`, `api/webhooks.ts`, `convex/http.ts`, `src/components/WhatsAppConfigModal.tsx`, `tests/whatsappEndpointFix.test.ts`
  - **Requerimiento:**
    1. Crear Serverless Functions en `api/webhook/wha.ts` y `api/webhooks.ts` en la raíz para que Vercel responda `HTTP 200 OK` con JSON `{ status: "ok", gateway: "Plottio Gateway" }` ante peticiones POST y GET.
    2. En `WhatsAppConfigModal.tsx`:
       - En `handleTestConnection`: validar que si la URL ingresada contiene `onrender.com`, bloquearla inmediatamente y mostrar mensaje explicativo sin disparar la petición fetch que genera el error 404 en consola.
       - Procesar la prueba de conexión contra el endpoint oficial de Vercel recibiendo 200 OK.
  - **Criterios de Aceptación:** Cero errores 404 en consola al probar conexión de WhatsApp; endpoint oficial de Vercel responde HTTP 200.

- [x] **Tarea 32 (P1): Impeccable Audit de Plottio Asistente — Respuestas con Datos Reales y Telemetría Técnica**
  - **Archivos:** `src/services/plottioAgent.ts`, `src/components/PlottioAsistenteModal.tsx`, `tests/asistenteImpeccableTelemetria.test.ts`
  - **Requerimiento:**
    1. **Eliminación de Mocks y Contexto Ficticio:**
       - Erradicar textos inventados de acuerdos comerciales ("SLA 48h", "Cláusula 4.2...") en `plottioAgent.ts`.
       - Inyectar datos reales del taller (empresas, clientes, órdenes, inventario, vehículos) desde las consultas activas de Convex en `PlottioAsistenteModal.tsx` hacia `executeLiveBusinessAgent`.
       - Cuando el usuario pregunta "dame las empresas registradas", el agente responde con los nombres y datos reales de las empresas de la base de datos (o informa que no hay si la lista está vacía).
    2. **Eliminación de 'Herramientas Invocadas' en Mensajes:**
       - Remover el encabezado y chips de "Herramientas Invocadas: consultar_clientes() · Operacional" de la vista de mensajes del chat.
    3. **Telemetría Técnica en lugar de Fuentes Falsas:**
       - Reemplazar las citas ficticias por una tarjeta/desplegable de métricas técnicas reales de inferencia:
         - Tokens usados (Prompt, Completion, Total)
         - Tokens por segundo (TPS)
         - Latencia de respuesta (ms)
         - Modelo LLM utilizado
         - Proveedor activo
    4. **Auditoría /impeccable:**
       - Pulir tipografía, contraste, badges, bordes, estados de carga y fluidez en móvil y desktop.
  - **Criterios de Aceptación:** Respuestas del asistente basadas en la BD real sin alucinaciones de SLA falsos; sin clutter visual de herramientas en burbujas; telemetría técnica clara; diseño impeccable.

- [x] **Tarea 33 (P0): Resiliencia ante HTTP 503 / 429 en Google AI Studio (Fallback Inteligente a Gemini 3.8 Flash y Degeneración Transparente)**
  - **Archivos:** `src/services/plottioAgent.ts`, `src/store/useIntegrationsStore.ts`, `src/services/aiModelsDiscovery.ts`, `tests/gemini503Resilience.test.ts`
  - **Requerimiento:**
    1. En `executeLiveBusinessAgent`, fijar modelo canónico predeterminado a `gemini-3.8-flash` (3x más rápido y con menor congestión que `gemini-flash-latest`) y ampliar timeout a 10s.
    2. Si Google retorna HTTP 503 (Service Unavailable) o 429 (Rate Limit), reintentar automáticamente conmutando entre `gemini-3.8-flash`, `gemini-3.7-flash` y `gemini-flash-lite-latest`.
    3. Si Google AI Studio está completamente no disponible (503 persistente), degradar de forma transparente a la respuesta determinista basada en la base de datos real del taller sin romper la UI y reflejar en telemetría el estado de respaldo.
    4. Actualizar catálogo oficial de Google en el store con `["Gemini 3.8 Flash", "Gemini 3.7 Flash", "Gemini Flash Latest", "Gemini Pro Latest"]`.
  - **Criterios de Aceptación:** Cero interrupciones ante HTTP 503 de Google; conmutación automática de modelos; respuesta garantizada siempre al operador; tests al 100%.

---

## FASE 7: ESTABILIZACIÓN DEFINITIVA DE PRODUCCIÓN, ASISTENTE VISTA COMPLETA, WHATSAPP QR Y MULTI-PROVEEDOR CON RESPALDO

- [x] **Tarea 34 (P0): Auto-resolución Single-Org en Convex Auth, Fix de createClienteConEmpresa y Purga de Clientes/Empresas**
  - **Archivos:** `convex/auth.ts`, `convex/clientes.ts`, `tests/convexClienteEmpresaFix.test.ts`
  - **Requerimiento:**
    1. En `convex/auth.ts:getCurrentUserContext`: Si `user.empresaId` es nulo o apunta a una empresa inexistente, auto-resolver a la organización matriz del taller (`ctx.db.query("empresas").first()`) o crear `"Plottio Taller Central"` de forma determinista, y auto-parchear al usuario (`ctx.db.patch`). `userContext.empresa` NUNCA debe ser `null`.
    2. En `convex/clientes.ts:createClienteConEmpresa` y `createCliente`: Si `userContext.empresa` fuera nulo por cualquier motivo, aplicar fallback seguro de auto-resolución hacia la empresa matriz sin lanzar Server Error.
    3. Crear mutación interna/pública `purgarClientesYEmpresas` que elimine todos los documentos de `clientes` y las empresas secundarias de clientes/flotas (preservando únicamente la empresa matriz del taller).
    4. Desplegar con `bunx convex deploy --yes` y ejecutar la purga de datos en producción.
  - **Criterios de Aceptación:** Cero Server Error en `createClienteConEmpresa`; contexto de empresa garantizado siempre; clientes y empresas de prueba purgados en producción.

- [x] **Tarea 35 (P0): Plottio Asistente como Vista Principal (`activeTab === "asistente"`) con Historial Persistente de Conversaciones**
  - **Archivos:** `src/components/PlottioAsistenteView.tsx`, `src/routes/index.tsx`, `src/components/Sidebar.tsx`, `src/store/useIntegrationsStore.ts`, `tests/plottioAsistenteView.test.ts`
  - **Requerimiento:**
    1. Convertir Plottio Asistente en una VISTA de navegación completa (`activeTab === "asistente"`) en lugar de un modal emergente.
    2. El botón "Plottio Asistente" en la barra superior (y atajo ⌘K) debe activar `setActiveTab("asistente")`.
    3. Añadir en `Sidebar.tsx` la opción de navegación a "Plottio Asistente" con icono Bot.
    4. Implementar Historial de Conversaciones (threads) persistido en `useIntegrationsStore` (`conversations: Array<{ id, title, createdAt, updatedAt, messages: ChatMessage[] }>`, `activeConversationId`):
       - Barra lateral de hilos con botón "+ Nueva Conversación".
       - Selector de conversaciones anteriores con títulos automáticos y timestamps.
       - Botón para eliminar conversación.
       - Los mensajes se guardan en el hilo activo y no se borran al cambiar de pestaña ni al recargar.
  - **Criterios de Aceptación:** Plottio Asistente opera como vista completa integrada; historial de conversaciones persistente con múltiples hilos; cero pérdidas de mensajes.

- [x] **Tarea 36 (P1): WhatsApp — Visualización Condicional de QR post-configuración y Desacoplamiento de Test de Conexión**
  - **Archivos:** `src/components/WhatsAppConfigModal.tsx`, `src/components/WhatsAppQrCode.tsx`, `tests/whatsappQrFlow.test.ts`
  - **Requerimiento:**
    1. El Código QR debe mostrarse ÚNICAMENTE cuando la configuración está guardada (`hasSavedCredentials && !isEditingCredentials`), nunca antes.
    2. En `handleTestConnection`: la prueba de conexión debe evaluar la disponibilidad de la pasarela HTTP (HTTP 200 OK) y reportar "Pasarela verificada con éxito", pero NO cambiar `whatsapp.status` a `"connected"`, ya que la vinculación del teléfono solo se realiza al escanear el QR.
    3. Permitir vincular y re-vincular dispositivos: si el estado es `connected` o `disconnected`, mostrar siempre botón accesible "Vincular nuevo dispositivo / Re-escanear QR" que libere el visor para un nuevo escaneo sin bloquear al operador.
  - **Criterios de Aceptación:** QR visible solo tras guardar credenciales; prueba de conexión no bloquea el escaneo; re-escaneo accesible en todo momento.

- [x] **Tarea 37 (P1): Respaldo Multi-Proveedor (Fallback Chaining) y Catálogo de Modelos Recomendados por Costo/Velocidad**
  - **Archivos:** `src/store/useIntegrationsStore.ts`, `src/services/plottioAgent.ts`, `src/components/FinOpsMetricsPanel.tsx`, `src/services/aiModelsDiscovery.ts`, `tests/multiProviderFallback.test.ts`
  - **Requerimiento:**
    1. En `useIntegrationsStore.ts`: Añadir campos en `ai`: `backupProvider: AiProvider | null`, `backupModel: string | null`.
    2. En `FinOpsMetricsPanel.tsx`: Añadir selector "Proveedor de Respaldo (Fallback)" que liste ÚNICAMENTE los proveedores que tienen API Key configurada (Google, Groq, Opencode Zen, Nvidia).
    3. En `plottioAgent.ts:executeLiveBusinessAgent`:
       - Si el proveedor principal falla (timeout, 503, 429, error de red), intentar inmediatamente con el `backupProvider` configurado antes de degradar a local.
       - Reflejar en la telemetría del mensaje si se usó el proveedor principal o el de respaldo (`provider: "${backupProvider} (Respaldo por timeout en ${primaryProvider})"`).
    4. Curar catálogo de modelos para destacar modelos funcionales con etiquetas de recomendación por costo y velocidad:
       - Google: `Gemini 3.8 Flash (Recomendado · Rápido y Económico)`, `Gemini 3.7 Flash`, `Gemini Flash Lite`.
       - Groq: `Llama 3.3 70B Versatile (Recomendado)`, `Llama 3.1 8B Instant (Ultra Rápido)`.
       - Opencode Zen: `DeepSeek V3 (Recomendado)`, `Qwen 2.5 Coder`.
       - Nvidia: `Llama 3.1 Nemotron 70B (Recomendado)`.
  - **Criterios de Aceptación:** Respaldo automático a proveedor secundario ante fallos del primario; selector de respaldo limitado a proveedores con keys; catálogo curado con modelos recomendados.

---

## FASE 8: CORRECCIÓN OPENCODE ZEN, MULTI-RESPALDO EN CADENA, VISTA ASISTENTE FULLSCREEN Y OPTIMIZACIÓN DE RESPUESTA

- [x] **Tarea 38 (P0): Corrección de Endpoints OpenCode Zen y Erradicación de ERR_NAME_NOT_RESOLVED**
  - **Archivos:** `src/services/aiModelsDiscovery.ts`, `src/services/plottioAgent.ts`, `tests/analiticasConfig.test.ts`
  - **Requerimiento:**
    1. Reemplazar la URL errónea `https://api.opencodezen.com/v1/models` por el endpoint canónico oficial `https://opencode.ai/zen/v1/models`.
    2. Reemplazar `https://api.opencodezen.com/v1/chat/completions` por `https://opencode.ai/zen/v1/chat/completions`.
    3. En `fetchAvailableModels`, envolver la llamada en try/catch preventivo con timeout ágil (3s); si la resolución falla o hay bloqueo de CORS en el navegador, retornar de inmediato el catálogo oficial sin bucles ni errores no controlados.
  - **Criterios de Aceptación:** Cero errores `ERR_NAME_NOT_RESOLVED` en consola al seleccionar Opencode Zen; llamadas dirigidas al endpoint oficial con fallback canónico seguro.

- [x] **Tarea 39 (P0): Selección Múltiple de Respaldos (Multi-Backup Fallback Chaining)**
  - **Archivos:** `src/store/useIntegrationsStore.ts`, `src/components/FinOpsMetricsPanel.tsx`, `src/services/plottioAgent.ts`, `src/components/PlottioAsistenteView.tsx`, `src/components/PlottioAsistenteModal.tsx`, `tests/multiProviderFallback.test.ts`
  - **Requerimiento:**
    1. En `useIntegrationsStore.ts`: Añadir en `ai`: `backupTargets: Array<{ provider: AiProvider; model: string }>` (manteniendo `backupProvider`/`backupModel` sincronizados al primero para retrocompatibilidad).
    2. En `FinOpsMetricsPanel.tsx`: Permitir seleccionar y configurar MÚLTIPLES proveedores y modelos de respaldo en orden de prioridad (solo de entre los proveedores con API Key activa que no sean el principal), visualizando la cadena activa con flechas y controles para reordenar/eliminar.
    3. En `plottioAgent.ts:executeLiveBusinessAgent`:
       - Si el proveedor principal falla o se demora, iterar a través de la lista de `backupTargets` en orden de prioridad (ej. intentar Groq, si falla intentar Nvidia, etc.).
       - Si cualquiera responde, retornar su respuesta con telemetría técnica clara indicando qué proveedor de respaldo atendió la consulta.
       - Si todos los respaldos fallan, degradar de forma segura a datos locales de la base de datos sin crashear.
  - **Criterios de Aceptación:** Posibilidad de configurar más de un respaldo; conmutación encadenada secuencial ante fallos; respuesta garantizada siempre.

- [x] **Tarea 40 (P0): Layout Fullscreen para Plottio Asistente, Unificación de Historial y Optimización de Latencia/Respuestas**
  - **Archivos:** `src/routes/index.tsx`, `src/components/PlottioAsistenteView.tsx`, `src/components/PlottioAsistenteModal.tsx`, `src/components/ConfiguracionView.tsx`, `src/services/plottioAgent.ts`, `tests/plottioAsistenteView.test.ts`
  - **Requerimiento:**
    1. En `src/routes/index.tsx`: cuando `activeTab === "asistente"`, desacoplar del layout común con padding y `max-w-7xl`; renderizar `PlottioAsistenteView` ocupando el 100% de la altura y anchura del viewport (`h-full w-full p-0 flex-1 overflow-hidden`), garantizando que la barra lateral de historial de conversaciones sea permanente, nítida y nunca se corte.
    2. En `ConfiguracionView.tsx`: reconfigurar botón "Probar Asistente" para que navegue directamente a la vista del asistente (`onNavigate?.("asistente")`).
    3. En `PlottioAsistenteModal.tsx`: sincronizar `messages` con `useIntegrationsStore` (`conversations`, `activeConversationId`) para compartir el mismo historial sin pérdidas.
    4. Reducir timeout del proveedor principal a 4.5s para no demorar al usuario si Google o un proveedor está congestionado; conmutar de inmediato a los respaldos de alta velocidad (Groq <500ms).
    5. Erradicar disclaimers ruidosos ("Aviso de disponibilidad: El servicio de Google AI Studio se encuentra temporalmente saturado [HTTP 503]...") del texto visible, respondiendo con un tono natural, directo, pulido y profesional basado en los datos del taller.
  - **Criterios de Aceptación:** Vista de asistente en pantalla completa con historial lateral accesible; cero demoras iniciales; respuestas naturales, fluidas y directas sin disclaimers molestos.




