import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserContext } from "./auth";

export const fetchCitas = query({
  args: {
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    let allCitas = await ctx.db
      .query("citas")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();
      
    if (!userContext.permisos.includes("ver_todas_sucursales") && userContext.sucursal) {
       allCitas = allCitas.filter(c => c.sucursalId === userContext.sucursal!.id);
    }

    return allCitas;
  }
});

export const createCita = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    vehiculoPlaca: v.string(),
    servicio: v.string(),
    fecha: v.string(),
    hora: v.string(),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa || !userContext.sucursal) {
      throw new ConvexError("Usuario no configurado correctamente (faltan datos de sucursal o empresa).");
    }

    const citaId = await ctx.db.insert("citas", {
      clienteNombre: args.clienteNombre,
      clienteTelefono: args.clienteTelefono,
      vehiculoPlaca: args.vehiculoPlaca,
      servicio: args.servicio,
      fecha: args.fecha,
      hora: args.hora,
      estado: args.estado,
      empresaId: userContext.empresa.id,
      sucursalId: userContext.sucursal.id,
    });

    // Trigger de notificación por email (Resend), no bloqueante.
    // Se omite si RESEND_API_KEY / RESEND_CITA_TO no están configuradas.
    await ctx.scheduler.runAfter(0, internal.emails.enviarEmailCita, {
      clienteNombre: args.clienteNombre,
      clienteTelefono: args.clienteTelefono,
      vehiculoPlaca: args.vehiculoPlaca,
      servicio: args.servicio,
      fecha: args.fecha,
      hora: args.hora,
      empresaNombre: userContext.empresa.nombre,
    });

    return await ctx.db.get(citaId);
  }
});

export const updateCita = mutation({
  args: {
    citaId: v.id("citas"),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    vehiculoPlaca: v.optional(v.string()),
    servicio: v.optional(v.string()),
    fecha: v.optional(v.string()),
    hora: v.optional(v.string()),
    estado: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { citaId, ...updates } = args;
    await ctx.db.patch(citaId, updates);
    return true;
  }
});

export const deleteCita = mutation({
  args: { citaId: v.id("citas") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.citaId);
    return true;
  }
});
