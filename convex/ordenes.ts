import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";

// 3.5 C) Función fetchOrdenes() DESPUÉS (con filtro Automático)
export const fetchOrdenes = query({
  args: { 
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      estado: v.optional(v.string()),
      tecnicoId: v.optional(v.id("usuarios"))
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_ordenes");

    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const allOrdenes = await ctx.db
      .query("ordenesTrabajo")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    const esInstalador = userContext.roles.some(r => r.roleNombre === 'Instalador');

    const filtradas = allOrdenes.filter(orden => {
       // 1. Filtro base
       let hasAccess = false;
       if (userContext.permisos.includes("ver_todas_sucursales")) {
         hasAccess = true;
       } else if (esInstalador) {
         hasAccess = orden.asignadoAUsuarioId === args.usuarioId;
       } else if (userContext.sucursal) {
         hasAccess = orden.sucursalId === userContext.sucursal.id;
       }

       if (!hasAccess) return false;

       // 2. Filtros dinámicos
       if (args.filtros) {
         if (args.filtros.estado && orden.estado !== args.filtros.estado) return false;
         if (args.filtros.tecnicoId && !esInstalador) {
           if (orden.asignadoAUsuarioId !== args.filtros.tecnicoId) return false;
         }
       }

       return true;
    });

    filtradas.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

    // 3. Enriquecer
    return await Promise.all(filtradas.map(async (o) => {
      let sucursal_nombre = "Desconocida";
      let pv_nombre = o.pvOrigen || "Sin asignar";
      let asignado_a_nombre = "No asignado";

      if (o.sucursalId) {
        const s = await ctx.db.get(o.sucursalId);
        if (s) sucursal_nombre = s.nombre;
      }

      if (o.asignadoAUsuarioId) {
        const u = await ctx.db.get(o.asignadoAUsuarioId);
        if (u) asignado_a_nombre = u.nombre;
      }

      const tareas_totales = o.items.length;
      const tareas_completadas = o.items.filter(i => i.completado).length;

      return {
        ...o,
        sucursal_nombre,
        pv_nombre,
        asignado_a_nombre,
        tareas_totales,
        tareas_completadas
      };
    }));
  }
});
