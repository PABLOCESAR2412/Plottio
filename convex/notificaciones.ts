import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";

// Crea una notificación para un usuario (llamado internamente desde otras mutaciones)
export const crearNotificacion = internalMutation({
  args: {
    usuarioId: v.id("usuarios"),
    empresaId: v.id("empresas"),
    tipo: v.string(),
    titulo: v.string(),
    mensaje: v.string(),
    enlace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificaciones", {
      usuarioId: args.usuarioId,
      empresaId: args.empresaId,
      tipo: args.tipo,
      titulo: args.titulo,
      mensaje: args.mensaje,
      enlace: args.enlace,
      leida: false,
      fecha: new Date().toISOString(),
    });
  },
});

export const getMisNotificaciones = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.usuarioId);
    if (!context.empresa) return [];

    const notifs = await ctx.db
      .query("notificaciones")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", args.usuarioId))
      .collect();

    return notifs
      .filter((n) => n.empresaId === context.empresa!.id)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 50);
  },
});

export const contarNoLeidas = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.usuarioId);
    if (!context.empresa) return 0;

    const notifs = await ctx.db
      .query("notificaciones")
      .withIndex("by_usuario_leida", (q) =>
        q.eq("usuarioId", args.usuarioId).eq("leida", false),
      )
      .collect();

    return notifs.filter((n) => n.empresaId === context.empresa!.id).length;
  },
});

export const marcarLeida = mutation({
  args: { usuarioId: v.id("usuarios"), notificacionId: v.id("notificaciones") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_ordenes");
    const actual = await ctx.db.get(args.notificacionId);
    if (actual && actual.usuarioId === args.usuarioId) {
      await ctx.db.patch(args.notificacionId, { leida: true });
    }
    return true;
  },
});

export const marcarTodasLeidas = mutation({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.usuarioId);
    if (!context.empresa) return false;

    const notifs = await ctx.db
      .query("notificaciones")
      .withIndex("by_usuario_leida", (q) =>
        q.eq("usuarioId", args.usuarioId).eq("leida", false),
      )
      .collect();

    for (const n of notifs) {
      if (n.empresaId === context.empresa!.id) {
        await ctx.db.patch(n._id, { leida: true });
      }
    }
    return true;
  },
});
