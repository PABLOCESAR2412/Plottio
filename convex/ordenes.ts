import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserContext, requirePermission } from "./auth";
import { registrarAccion } from "./lib/auditoria";

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
       let hasAccess = false;
       if (userContext.permisos.includes("ver_todas_sucursales")) {
         hasAccess = true;
       } else if (esInstalador) {
         hasAccess = orden.asignadoAUsuarioId === args.usuarioId;
       } else if (userContext.sucursal) {
         hasAccess = orden.sucursalId === userContext.sucursal.id;
       }

       if (!hasAccess) return false;

       if (args.filtros) {
         if (args.filtros.estado && orden.estado !== args.filtros.estado) return false;
         if (args.filtros.tecnicoId && !esInstalador) {
           if (orden.asignadoAUsuarioId !== args.filtros.tecnicoId) return false;
         }
       }

       return true;
    });

    filtradas.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

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

/**
 * Calcula el total y el progreso de una orden a partir de sus items.
 * Se usa en create/update para mantener estos campos sincronizados con
 * la fuente de verdad (items[]).
 */
function calcularProgresoYTotal(items: Array<{ cantidad: number; precioUnitario: number; completado: boolean }>) {
  const total = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const progreso = items.length > 0
    ? Math.round((items.filter(i => i.completado).length / items.length) * 100)
    : 0;
  return { total, progreso };
}

const ordenItemValidator = v.object({
  descripcion: v.string(),
  cantidad: v.number(),
  precioUnitario: v.number(),
  completado: v.boolean(),
});

const prioridadValidator = v.union(
  v.literal("Alta"),
  v.literal("Media"),
  v.literal("Baja"),
);

const estadoValidator = v.union(
  v.literal("Pendiente"),
  v.literal("En Proceso"),
  v.literal("Listo"),
  v.literal("Entregado"),
  v.literal("Cancelado"),
);

export const createOrdenTrabajo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    placa: v.string(),
    vehiculoTipo: v.string(),
    items: v.array(ordenItemValidator),
    prioridad: prioridadValidator,
    estado: v.optional(estadoValidator),
    fechaInicio: v.string(),
    fechaFin: v.string(),
    notas: v.optional(v.array(v.string())),
    fotos: v.optional(v.array(v.string())),
    sucursalId: v.optional(v.id("sucursales")),
    pvOrigen: v.optional(v.string()),
    asignadoAUsuarioId: v.optional(v.id("usuarios")),
    vehiculoId: v.optional(v.id("vehiculos")),
    cotizacionId: v.optional(v.id("cotizaciones")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const { total, progreso } = calcularProgresoYTotal(args.items);

    const ordenId = await ctx.db.insert("ordenesTrabajo", {
      clienteNombre: args.clienteNombre,
      clienteTelefono: args.clienteTelefono,
      placa: args.placa,
      vehiculoTipo: args.vehiculoTipo,
      items: args.items,
      total,
      prioridad: args.prioridad,
      progreso,
      estado: args.estado ?? "Pendiente",
      fechaInicio: args.fechaInicio,
      fechaFin: args.fechaFin,
      notas: args.notas ?? [],
      fotos: args.fotos ?? [],
      empresaId: userContext.empresa.id,
      sucursalId: args.sucursalId ?? userContext.sucursal?.id,
      pvOrigen: args.pvOrigen,
      asignadoAUsuarioId: args.asignadoAUsuarioId,
    });

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      sucursalId: args.sucursalId ?? userContext.sucursal?.id,
      tablaAfectada: "ordenesTrabajo",
      accion: "CREATE",
      registroId: ordenId,
      cambios: { clienteNombre: args.clienteNombre, total },
    });

    if (args.asignadoAUsuarioId && args.asignadoAUsuarioId !== args.usuarioId) {
      await ctx.runMutation(internal.notificaciones.crearNotificacion, {
        usuarioId: args.asignadoAUsuarioId,
        empresaId: userContext.empresa.id,
        tipo: "orden",
        titulo: "Nueva orden asignada",
        mensaje: `Orden para ${args.clienteNombre} (placa ${args.placa}) - total ${total}`,
        enlace: "/ordenes",
      });
    }

    return await ctx.db.get(ordenId);
  }
});

export const updateOrdenTrabajo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.id("ordenesTrabajo"),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    placa: v.optional(v.string()),
    vehiculoTipo: v.optional(v.string()),
    items: v.optional(v.array(ordenItemValidator)),
    prioridad: v.optional(prioridadValidator),
    estado: v.optional(estadoValidator),
    fechaInicio: v.optional(v.string()),
    fechaFin: v.optional(v.string()),
    notas: v.optional(v.array(v.string())),
    fotos: v.optional(v.array(v.string())),
    asignadoAUsuarioId: v.optional(v.id("usuarios")),
    pvOrigen: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const actual = await ctx.db.get(args.ordenId);
    if (!actual) throw new Error("Orden de trabajo no encontrada");

    if (
      userContext.empresa &&
      actual.empresaId &&
      actual.empresaId !== userContext.empresa.id
    ) {
      throw new Error("No tiene permisos para modificar esta orden");
    }

    const { ordenId, usuarioId: _u, items, ...resto } = args;
    const updates: Record<string, unknown> = { ...resto };

    if (items) {
      const { total, progreso } = calcularProgresoYTotal(items);
      updates.items = items;
      updates.total = total;
      updates.progreso = progreso;
    }

    await ctx.db.patch(ordenId, updates);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: actual.sucursalId,
        tablaAfectada: "ordenesTrabajo",
        accion: "UPDATE",
        registroId: ordenId,
        cambios: updates,
      });
    }

    return await ctx.db.get(ordenId);
  }
});

/**
 * Permite a un instalador marcar un item individual como completado/incompleto
 * sin necesidad de permisos de "editar_orden" completos (usa "marcar_progreso").
 */
export const toggleItemCompletado = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.id("ordenesTrabajo"),
    itemIndex: v.number(),
    completado: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Permiso más granular; si no existe, cae al de editar_orden
    try {
      await requirePermission(ctx, args.usuarioId, "marcar_progreso");
    } catch {
      await requirePermission(ctx, args.usuarioId, "editar_orden");
    }

    const actual = await ctx.db.get(args.ordenId);
    if (!actual) throw new Error("Orden no encontrada");
    if (args.itemIndex < 0 || args.itemIndex >= actual.items.length) {
      throw new Error("Índice de ítem inválido");
    }

    const nuevosItems = actual.items.map((item, idx) =>
      idx === args.itemIndex ? { ...item, completado: args.completado } : item
    );
    const { total, progreso } = calcularProgresoYTotal(nuevosItems);

    await ctx.db.patch(args.ordenId, {
      items: nuevosItems,
      total,
      progreso,
    });

    return await ctx.db.get(args.ordenId);
  }
});

export const deleteOrdenTrabajo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.id("ordenesTrabajo"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const actual = await ctx.db.get(args.ordenId);
    if (!actual) throw new Error("Orden no encontrada");

    if (
      userContext.empresa &&
      actual.empresaId &&
      actual.empresaId !== userContext.empresa.id
    ) {
      throw new Error("No tiene permisos para eliminar esta orden");
    }

    // Liberar placas asignadas a esta orden
    const placas = await ctx.db
      .query("placasStock")
      .withIndex("by_estado", (q) => q.eq("estado", "Asignada"))
      .collect();
    const placasAOrden = placas.filter(p => p.ordenTrabajoId === args.ordenId);
    for (const placa of placasAOrden) {
      await ctx.db.patch(placa._id, {
        estado: "Disponible",
        ordenTrabajoId: undefined,
        vehiculoId: undefined,
        fechaAsignacion: undefined,
      });
    }

    await ctx.db.delete(args.ordenId);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: actual.sucursalId,
        tablaAfectada: "ordenesTrabajo",
        accion: "DELETE",
        registroId: args.ordenId,
        cambios: { clienteNombre: actual.clienteNombre, total: actual.total },
      });
    }

    return { success: true, placasLiberadas: placasAOrden.length };
  }
});

export const addFoto = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.id("ordenesTrabajo"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_ordenes");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const actual = await ctx.db.get(args.ordenId);
    if (!actual) throw new Error("Orden de trabajo no encontrada");

    if (
      userContext.empresa &&
      actual.empresaId &&
      actual.empresaId !== userContext.empresa.id
    ) {
      throw new Error("No tiene permisos para modificar esta orden");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Error obteniendo URL de la foto");

    const nuevasFotos = [...(actual.fotos || []), url];
    const nuevasNotas = [...(actual.notas || []), "Se añadió una nueva foto del proceso de instalación."];

    await ctx.db.patch(args.ordenId, { fotos: nuevasFotos, notas: nuevasNotas });

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: actual.sucursalId,
        tablaAfectada: "ordenesTrabajo",
        accion: "UPDATE",
        registroId: args.ordenId,
        cambios: { fotoAñadida: true },
      });
    }
  }
});
