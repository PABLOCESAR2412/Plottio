# Plottio

**Plottio** es un sistema integral de gestión y planificación (ERP) especializado para talleres de diseño, rotulado profesional de vehículos y branding automotriz.

## Características Principales

*   **Gestión de Clientes y Empresas**: Administración de la cartera de clientes, así como gestión de flotas de vehículos asociados a empresas, controlando sucursales y puntos de contacto.
*   **Control de Inventario Vehicular**: Registro detallado de cada vehículo ingresado (placa, modelo, categoría) y su historial de servicios.
*   **Cotizaciones y Órdenes de Trabajo**: 
    *   Creación rápida de cotizaciones detalladas basadas en plantillas de precios predefinidas.
    *   Transición fluida de cotización aprobada a Orden de Trabajo.
    *   Seguimiento del progreso de la instalación y entrega.
*   **Agenda y Programación**: Calendario integrado para gestionar citas, fechas de ingreso, e instalaciones programadas.
*   **Gestión Multi-Sucursal**: Soporte nativo para operar en múltiples ubicaciones con controles de acceso basados en roles (SuperAdmin, AdminSucursal, Instalador, Vendedor).
*   **Kits de Flota y Lotes de Producción**: Control de producción en serie para flotas empresariales que requieren el mismo diseño repetitivo.
*   **Reportes y Auditoría**: Generación de reportes PDF/Excel sobre rendimientos operativos, ganancias, y un log detallado de actividad del sistema (Auditoría).

## Stack Tecnológico

*   **Frontend**: React (Vite) + TypeScript
*   **Estilos**: Tailwind CSS + Componentes UI modernos (Lucide React)
*   **Estado Global**: Zustand
*   **Backend / Base de Datos**: Convex (Serverless Backend)

## Configuración y Despliegue

1. Instalar dependencias:
   ```bash
   bun install
   ```

2. Configurar entorno de Convex:
   Asegúrate de tener tus variables de entorno configuradas (`.env.local`) con tu respectivo `VITE_CONVEX_URL`.
   ```bash
   npx convex dev
   ```

3. Iniciar entorno de desarrollo:
   ```bash
   bun run dev
   ```

## Notificaciones Email (Resend)

Plottio envía emails transaccionales (citas agendadas y reportes de bugs) mediante
[Resend](https://resend.com) ejecutado desde Convex como *internal action* con
`scheduler`. El envío es no bloqueante: si las variables no existen, se omite.

Activar (variables de entorno de Convex):

```bash
npx convex env set RESEND_API_KEY   re_xxxxxxxxxxxx
npx convex env set RESEND_CITA_TO  correo@tu-empresa.com
npx convex env set RESEND_BUG_TO   soporte@plottio.com
# Opcional: remitente verificado en Resend
npx convex env set RESEND_FROM      "Plottio <no-reply@tu-dominio>"
```

> Nota: el remitente por defecto `onboarding@resend.dev` solo funciona en modo
> prueba de Resend; para producción verifica un dominio.

## Migraciones de Esquema

Las migraciones acumulativas viven en `convex/migrations/` y se registran en la
tabla `migrations`. Para aplicar las pendientes:

```bash
npx convex run migrations/index:runMigrations --deployment dev
npx convex run migrations/index:listMigrations --deployment dev
```

Ver `convex/migrations/index.ts` para añadir una nueva.

## Roles del Sistema

*   **SuperAdmin**: Acceso global a todas las sucursales, configuración del sistema, gestión de roles y tarifas.
*   **AdminSucursal**: Gestión administrativa total limitada a su sucursal asignada.
*   **Vendedor**: Permisos para crear cotizaciones, gestionar clientes y agendar citas.
*   **Instalador**: Visualización de órdenes de trabajo, progreso de las mismas y agenda técnica.
