import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";
import { actualizarEstadoLoteHelper } from "./lotesProduccion";

// 11.0 FUNCIÓN: getTodasPlacasStock()
export const getTodasPlacasStock = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const placas = await ctx.db.query("placasStock").order("desc").collect();

    // Enriquecer con info del lote y filtrar por empresa
    const enriquecidas = await Promise.all(
      placas.map(async (placa) => {
        const lote = await ctx.db.get(placa.loteId);
        if (!lote) return null;
        if (lote.empresaId !== userContext.empresa!.id) return null;

        return { ...placa, lote_numero: lote.numero };
      }),
    );

    return enriquecidas.filter((p): p is NonNullable<typeof p> => p !== null);
  }
});

// 11.1 FUNCIÓN: asignarPlacaStockAOrden()
export const asignarPlacaStockAOrden = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    placaStockId: v.id("placasStock"),
    ordenTrabajoId: v.id("ordenesTrabajo"),
    vehiculoId: v.id("vehiculos"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    // Verificar que la placa esté disponible
    const placa = await ctx.db.get(args.placaStockId);
    if (!placa || placa.estado !== "Disponible") {
      throw new ConvexError("Placa no disponible o ya asignada");
    }

    const lote = await ctx.db.get(placa.loteId);
    if (!lote) throw new ConvexError("Lote no encontrado");
    if (!esSuperAdmin && lote.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para asignar placas de otra empresa");
    }

    // Verificar que la orden de trabajo existe
    const orden = await ctx.db.get(args.ordenTrabajoId);
    if (!orden || (!esSuperAdmin && userContext.empresa && orden.empresaId !== userContext.empresa.id)) {
      throw new ConvexError("Orden de trabajo no encontrada");
    }

    // Asignar placa a la orden y vehículo
    await ctx.db.patch(args.placaStockId, {
      estado: "Asignada",
      ordenTrabajoId: args.ordenTrabajoId,
      vehiculoId: args.vehiculoId,
      fechaAsignacion: new Date().toISOString()
    });

    const placaActualizada = await ctx.db.get(args.placaStockId);

    // Actualizar estado del lote
    await actualizarEstadoLoteHelper(ctx, placa.loteId);

    return placaActualizada;
  }
});

// 11.2 FUNCIÓN: marcarPlacaInstalada()
export const marcarPlacaInstalada = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    placaStockId: v.id("placasStock"),
  },
  handler: async (ctx, args) => {
    // Aquí el permiso original dice 'marcar_progreso'. Si no lo tenemos, usamos 'editar_orden'
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    
    const placa = await ctx.db.get(args.placaStockId);
    if (!placa || placa.estado !== "Asignada") {
      throw new ConvexError("Placa no está en estado Asignada");
    }

    const lote = await ctx.db.get(placa.loteId);
    if (!lote) throw new ConvexError("Lote no encontrado");
    if (!esSuperAdmin && lote.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar placas de otra empresa");
    }

    await ctx.db.patch(args.placaStockId, {
      estado: "Instalada"
    });

    return await ctx.db.get(args.placaStockId);
  }
});

// 11.3 FUNCIÓN: fetchPlacasDeOrden()
export const fetchPlacasDeOrden = query({
  args: {
    usuarioId: v.id("usuarios"),
    ordenTrabajoId: v.id("ordenesTrabajo"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_ordenes");

    const placas = await ctx.db
      .query("placasStock")
      .withIndex("by_orden", q => q.eq("ordenTrabajoId", args.ordenTrabajoId))
      .collect();

    placas.sort((a, b) => new Date(a.fechaAsignacion || "").getTime() - new Date(b.fechaAsignacion || "").getTime());

    // Enrich con info del lote
    return await Promise.all(placas.map(async (placa) => {
      let lote_numero = null;
      const lote = await ctx.db.get(placa.loteId);
      if (lote) {
        lote_numero = lote.numero;
      }
      return {
        ...placa,
        lote_numero
      };
    }));
  }
});

// 11.4 FUNCIÓN: liberarPlacaAsignada()
export const liberarPlacaAsignada = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    placaStockId: v.id("placasStock"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const placa = await ctx.db.get(args.placaStockId);
    if (!placa || placa.estado !== "Asignada") {
      throw new ConvexError("Placa no se puede liberar (no está en estado Asignada)");
    }

    const lote = await ctx.db.get(placa.loteId);
    if (!lote) throw new ConvexError("Lote no encontrado");
    if (!esSuperAdmin && lote.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para liberar placas de otra empresa");
    }

    await ctx.db.patch(args.placaStockId, {
      estado: "Disponible",
      ordenTrabajoId: null,
      vehiculoId: null,
      fechaAsignacion: null,
    });

    const placaActualizada = await ctx.db.get(args.placaStockId);
    await actualizarEstadoLoteHelper(ctx, placa.loteId);

    return placaActualizada;
  }
});
