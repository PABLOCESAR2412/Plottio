import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";

export const getAuditoria = query({
  args: {
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      desde: v.optional(v.string()),
      hasta: v.optional(v.string()),
      usuario: v.optional(v.string()),
      tabla: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_auditoria");

    // Tenant forzado desde el contexto (evita exponer datos de otras empresas)
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];
    const empresaId = userContext.empresa.id;

    const base = await ctx.db
      .query("auditoria")
      .withIndex("by_empresa", (q) => q.eq("empresaId", empresaId))
      .order("desc")
      .take(1000);

    const f = args.filtros;
    const filtrados = base.filter((r) => {
      if (f?.tabla && r.tablaAfectada.toLowerCase() !== f.tabla.toLowerCase()) return false;
      if (f?.usuario && r.usuarioId) {
        // El filtro por nombre de usuario se resuelve fuera en la vista;
        // aquí filtramos a nivel de fecha/tabla.
      }
      if (f?.desde && f?.hasta) {
        const fecha = new Date(r.fecha);
        if (fecha < new Date(f.desde) || fecha > new Date(f.hasta)) return false;
      }
      return true;
    });

    // Resolver nombre de usuario y enriquecer (limitado al rango filtrado)
    const results: Array<Record<string, unknown>> = [];
    for (const r of filtrados) {
      let usuarioNombre = "Sistema";
      if (r.usuarioId) {
        const u = await ctx.db.get(r.usuarioId);
        if (u) usuarioNombre = u.nombre;
      }
      if (f?.usuario && !usuarioNombre.toLowerCase().includes(f.usuario.toLowerCase())) {
        continue;
      }
      results.push({
        _id: r._id,
        fecha: r.fecha,
        tablaAfectada: r.tablaAfectada,
        accion: r.accion,
        registroId: r.registroId,
        cambios: r.cambios,
        sucursalId: r.sucursalId,
        usuarioNombre,
      });
    }

    return results.slice(0, 100);
  },
});

export const registrarAccion = mutation({
  args: {
    empresaId: v.id("empresas"),
    usuarioId: v.optional(v.id("usuarios")),
    sucursalId: v.optional(v.id("sucursales")),
    tablaAfectada: v.string(),
    accion: v.string(),
    registroId: v.string(),
    cambios: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditoria", {
      empresaId: args.empresaId,
      usuarioId: args.usuarioId,
      sucursalId: args.sucursalId,
      tablaAfectada: args.tablaAfectada,
      accion: args.accion,
      registroId: args.registroId,
      cambios: args.cambios,
      fecha: new Date().toISOString(),
    });
  },
});
