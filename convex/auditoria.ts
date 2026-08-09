import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./auth";

export const getAuditoria = query({
  args: {
    usuarioId: v.id("usuarios"),
    empresaId: v.optional(v.id("empresas")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_auditoria");

    // Si no mandan empresaId, se trae todo (útil para dev)
    if (!args.empresaId) {
      return await ctx.db.query("auditoria").order("desc").take(100);
    }

    return await ctx.db
      .query("auditoria")
      .withIndex("by_empresa", (q) => q.eq("empresaId", args.empresaId!))
      .order("desc")
      .take(100);
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
