import { query, mutation } from "./_generated/server";

export const getPermisos = query({
  handler: async (ctx) => {
    return await ctx.db.query("permisos").collect();
  },
});

export const seedPermisos = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("permisos").collect();
    if (existing.length > 0) return "Ya existen permisos";

    const defaultPermisos = [
      { nombre: "Ver Cotizaciones", modulo: "Cotizaciones", accion: "read", descripcion: "Puede ver la lista de cotizaciones" },
      { nombre: "Crear Cotizaciones", modulo: "Cotizaciones", accion: "create", descripcion: "Puede crear nuevas cotizaciones" },
      { nombre: "Aprobar Cotizaciones", modulo: "Cotizaciones", accion: "approve", descripcion: "Puede aprobar cotizaciones y convertirlas en órdenes" },
      { nombre: "Ver Órdenes", modulo: "Órdenes", accion: "read", descripcion: "Puede ver las órdenes de trabajo" },
      { nombre: "Completar Tareas", modulo: "Órdenes", accion: "update", descripcion: "Puede marcar ítems como completados" },
      { nombre: "Ver Catálogo", modulo: "Catálogo", accion: "read", descripcion: "Puede ver el catálogo de servicios" },
      { nombre: "Editar Catálogo", modulo: "Catálogo", accion: "update", descripcion: "Puede modificar precios y servicios" },
      { nombre: "Ver Producción", modulo: "Lotes", accion: "read", descripcion: "Puede ver los lotes de producción" },
      { nombre: "Producir Lotes", modulo: "Lotes", accion: "create", descripcion: "Puede iniciar producción de placas" },
    ];

    for (const p of defaultPermisos) {
      await ctx.db.insert("permisos", {
        ...p,
        fechaCreacion: new Date().toISOString()
      });
    }

    return "Permisos inicializados";
  }
});
