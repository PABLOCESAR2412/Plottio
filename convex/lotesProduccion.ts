import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";

// 10.3 FUNCIÓN: crearLoteProduccion()
export const crearLoteProduccion = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteId: v.optional(v.id("clientes")),
    cotizacionId: v.optional(v.id("cotizaciones")),
    notas: v.optional(v.string()),
    sucursalId: v.optional(v.id("sucursales")),
    placas: v.array(v.object({
      material: v.string(), // 'acrilico' | 'lona'
      ancho_cm: v.optional(v.number()),
      alto_cm: v.optional(v.number()),
      contenido_texto: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "producir_lotes");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Usuario sin empresa asignada");

    const sucursalId = args.sucursalId ?? userContext.sucursal?.id;
    if (!sucursalId) throw new ConvexError("Usuario sin sucursal asignada");

    // Generar número de lote LOTE-XXXX
    const lotesEmpresa = await ctx.db
      .query("lotesProduccion")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id).eq("sucursalId", sucursalId))
      .collect();

    const numeroStr = String(lotesEmpresa.length + 1).padStart(4, '0');
    const numeroLote = `LOTE-${numeroStr}`;

    const loteId = await ctx.db.insert("lotesProduccion", {
      empresaId: userContext.empresa.id,
      sucursalId,
      clienteId: args.clienteId,
      cotizacionId: args.cotizacionId,
      numero: numeroLote,
      estado: "En Producción",
      notas: args.notas,
      creadoPorUsuarioId: args.usuarioId,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    });

    const loteCreado = await ctx.db.get(loteId);

    // Crear placas stock
    for (const placa of args.placas) {
      await ctx.db.insert("placasStock", {
        loteId,
        material: placa.material,
        ancho_cm: placa.ancho_cm,
        alto_cm: placa.alto_cm,
        contenido_texto: placa.contenido_texto,
        estado: "Disponible",
        fechaCreacion: new Date().toISOString()
      });
    }

    return { ...loteCreado, total_placas: args.placas.length };
  }
});

export const getLotes = query({
  args: {
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const lotes = await ctx.db
      .query("lotesProduccion")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();
    return lotes.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }
});

// 10.4 FUNCIÓN: fetchStockPlacasDisponibles()
export const fetchStockPlacasDisponibles = query({
  args: {
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      clienteId: v.optional(v.id("clientes")),
      material: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const esSuper = userContext.roles.some(r => r.roleNombre === 'SuperAdmin');

    const lotes = await ctx.db
      .query("lotesProduccion")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    const lotesFiltrados = lotes.filter(lote => {
      if (!esSuper && userContext.sucursal && lote.sucursalId !== userContext.sucursal.id) return false;
      if (args.filtros?.clienteId && lote.clienteId !== args.filtros.clienteId) return false;
      return true;
    });

    const lotesValidosIds = new Set(lotesFiltrados.map(l => l._id));

    const stockDisponible = await ctx.db
      .query("placasStock")
      .withIndex("by_estado", q => q.eq("estado", "Disponible"))
      .collect();

    const stockFiltrado = stockDisponible.filter(placa => {
      if (!lotesValidosIds.has(placa.loteId)) return false;
      if (args.filtros?.material && placa.material !== args.filtros.material) return false;
      return true;
    });

    // Sort by fechaCreacion ASC
    stockFiltrado.sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());

    // Enrich with Lote and Cliente details
    return await Promise.all(stockFiltrado.map(async (placa) => {
      const lote = lotesFiltrados.find(l => l._id === placa.loteId);
      let cliente_nombre = null;
      if (lote?.clienteId) {
        const cliente = await ctx.db.get(lote.clienteId);
        if (cliente) cliente_nombre = cliente.nombre;
      }
      return {
        ...placa,
        lote_numero: lote?.numero,
        cliente_id: lote?.clienteId,
        cliente_nombre
      };
    }));
  }
});

export async function actualizarEstadoLoteHelper(ctx: any, loteId: import("./_generated/dataModel").Id<"lotesProduccion">) {
  const placas = await ctx.db
    .query("placasStock")
    .withIndex("by_lote", (q: any) => q.eq("loteId", loteId))
    .collect();

  const total = placas.length;
  const disponibles = placas.filter((p: any) => p.estado === "Disponible").length;

  let nuevoEstado = "En Producción";

  if (total > 0) {
    if (disponibles === total) {
      nuevoEstado = "Terminado";
    } else if (disponibles === 0) {
      nuevoEstado = "Agotado";
    } else {
      nuevoEstado = "Parcialmente Asignado";
    }
  }

  await ctx.db.patch(loteId, {
    estado: nuevoEstado,
    fechaActualizacion: new Date().toISOString()
  });

  return nuevoEstado;
}

export const actualizarEstadoLote = mutation({
  args: {
    loteId: v.id("lotesProduccion")
  },
  handler: async (ctx, args) => {
    return await actualizarEstadoLoteHelper(ctx, args.loteId);
  }
});

export const cambiarEstadoLote = mutation({
  args: {
    loteId: v.id("lotesProduccion"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.loteId, { estado: args.estado });
  }
});

export const agregarComentarioLote = mutation({
  args: {
    loteId: v.id("lotesProduccion"),
    usuarioId: v.id("usuarios"),
    texto: v.string(),
  },
  handler: async (ctx, args) => {
    const usuario = await ctx.db.get(args.usuarioId);
    if (!usuario) throw new ConvexError("Usuario no encontrado");

    const lote = await ctx.db.get(args.loteId);
    if (!lote) throw new ConvexError("Lote no encontrado");

    const comentarios = lote.comentarios || [];
    comentarios.push({
      autorId: usuario._id,
      autorNombre: usuario.nombre,
      texto: args.texto,
      fecha: new Date().toISOString()
    });

    await ctx.db.patch(args.loteId, { comentarios });
  }
});
