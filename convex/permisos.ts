import { query, mutation } from "./_generated/server";

export const getPermisos = query({
  handler: async (ctx) => {
    return await ctx.db.query("permisos").collect();
  },
});

export const seedPermisos = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("permisos").collect();
    const byNombre = new Map(existing.map((p) => [p.nombre, p]));

    const defaultPermisos = [
      { clave: "ver_cotizaciones", nombre: "Ver Cotizaciones", modulo: "Cotizaciones", accion: "read", descripcion: "Puede ver la lista de cotizaciones" },
      { clave: "crear_cotizacion", nombre: "Crear Cotizaciones", modulo: "Cotizaciones", accion: "create", descripcion: "Puede crear nuevas cotizaciones" },
      { clave: "aprobar_cotizaciones", nombre: "Aprobar Cotizaciones", modulo: "Cotizaciones", accion: "approve", descripcion: "Puede aprobar cotizaciones y convertirlas en órdenes" },
      { clave: "ver_ordenes", nombre: "Ver Órdenes", modulo: "Órdenes", accion: "read", descripcion: "Puede ver las órdenes de trabajo" },
      { clave: "editar_orden", nombre: "Editar Órdenes", modulo: "Órdenes", accion: "update", descripcion: "Puede crear, modificar y eliminar órdenes de trabajo" },
      { clave: "marcar_progreso", nombre: "Completar Tareas", modulo: "Órdenes", accion: "update", descripcion: "Puede marcar ítems como completados" },
      { clave: "ver_catalogo", nombre: "Ver Catálogo", modulo: "Catálogo", accion: "read", descripcion: "Puede ver el catálogo de servicios" },
      { clave: "editar_catalogo", nombre: "Editar Catálogo", modulo: "Catálogo", accion: "update", descripcion: "Puede modificar precios y servicios" },
      { clave: "ver_produccion", nombre: "Ver Producción", modulo: "Lotes", accion: "read", descripcion: "Puede ver los lotes de producción" },
      { clave: "producir_lotes", nombre: "Producir Lotes", modulo: "Lotes", accion: "create", descripcion: "Puede iniciar producción de placas" },
      { clave: "ver_clientes", nombre: "Ver Clientes", modulo: "Clientes", accion: "read", descripcion: "Puede ver la lista de clientes" },
      { clave: "crear_cliente", nombre: "Crear Clientes", modulo: "Clientes", accion: "create", descripcion: "Puede crear y editar clientes" },
      { clave: "ver_inventario", nombre: "Ver Inventario", modulo: "Inventario", accion: "read", descripcion: "Puede ver el inventario de las sucursales" },
      { clave: "editar_inventario", nombre: "Editar Inventario", modulo: "Inventario", accion: "update", descripcion: "Puede registrar movimientos y ajustes de stock" },
      { clave: "ver_usuarios", nombre: "Ver Usuarios", modulo: "Usuarios", accion: "read", descripcion: "Puede ver la lista de usuarios" },
      { clave: "crear_usuarios", nombre: "Crear Usuarios", modulo: "Usuarios", accion: "create", descripcion: "Puede invitar y gestionar usuarios" },
      { clave: "ver_auditoria", nombre: "Ver Auditoría", modulo: "Auditoría", accion: "read", descripcion: "Puede ver el registro de auditoría" },
      { clave: "ver_reportes", nombre: "Ver Reportes", modulo: "Reportes", accion: "read", descripcion: "Puede ver reportes y dashboards" },
      { clave: "ver_todas_sucursales", nombre: "Ver Todas las Sucursales", modulo: "Sucursales", accion: "read", descripcion: "Puede ver y operar sobre todas las sucursales" },
    ];

    let creados = 0;
    let actualizados = 0;

    for (const p of defaultPermisos) {
      const row = byNombre.get(p.nombre);
      if (row) {
        // Backfill: las filas existentes (seed viejo con nombres en español) no tienen clave
        if (row.clave !== p.clave || row.accion !== p.accion) {
          await ctx.db.patch(row._id, { clave: p.clave, accion: p.accion });
          actualizados++;
        }
      } else {
        await ctx.db.insert("permisos", {
          ...p,
          fechaCreacion: new Date().toISOString(),
        });
        creados++;
      }
    }

    return `Permisos sincronizados: ${creados} creados, ${actualizados} actualizados`;
  }
});
