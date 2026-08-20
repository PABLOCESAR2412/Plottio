import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserContext, requirePermission } from "./auth";
import { registrarAccion } from "./lib/auditoria";

// 3.5 B) Función fetchCotizaciones() DESPUÉS (con filtro automático)
export const fetchCotizaciones = query({
  args: { 
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      pvId: v.optional(v.string()),
      estado: v.optional(v.string()),
      desde: v.optional(v.string()),
      hasta: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_cotizaciones");

    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const allCotizaciones = await ctx.db
      .query("cotizaciones")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    const filtradas = allCotizaciones.filter(cot => {
       // 1. Filtro base de roles
       let hasAccess = false;
       if (userContext.permisos.includes("ver_todas_sucursales")) {
         hasAccess = true;
       } else if (userContext.pv && cot.pvId === userContext.pv.id) {
         hasAccess = true;
       } else if (userContext.sucursal && cot.sucursalId === userContext.sucursal.id) {
         hasAccess = true;
       }

       if (!hasAccess) return false;

       // 2. Filtros dinámicos
       if (args.filtros) {
         if (args.filtros.pvId && cot.pvId !== args.filtros.pvId) return false;
         if (args.filtros.estado && cot.estado !== args.filtros.estado) return false;
         if (args.filtros.desde && args.filtros.hasta) {
            const fechaCot = new Date(cot.fecha);
            const desde = new Date(args.filtros.desde);
            const hasta = new Date(args.filtros.hasta);
            if (fechaCot < desde || fechaCot > hasta) return false;
         }
       }

       return true;
    });

    filtradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // 3. Enriquecer datos (Joins)
    return await Promise.all(filtradas.map(async (cot) => {
      let cliente_nombre = cot.clienteNombre;
      let sucursal_nombre = "Desconocida";
      let pv_nombre = "Sin asignar";
      let pv_codigo = "N/A";
      let creado_por_nombre = "Sistema";

      if (cot.sucursalId) {
        const s = await ctx.db.get(cot.sucursalId);
        if (s) sucursal_nombre = s.nombre;
      }

      if (cot.pvId) {
        const p = await ctx.db.get(cot.pvId);
        if (p) {
          pv_nombre = p.nombre;
          pv_codigo = p.codigo;
        }
      }

      if (cot.creadoPorUsuarioId) {
        const u = await ctx.db.get(cot.creadoPorUsuarioId);
        if (u) creado_por_nombre = u.nombre;
      }

      return {
        ...cot,
        cliente_nombre,
        sucursal_nombre,
        pv_nombre,
        pv_codigo,
        creado_por_nombre
      };
    }));
  }
});

// --- FASE 9: PLACAS COMO ÍTEM DENTRO DE COTIZACIONES ---

export const crearItemCotizacionConPlaca = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    cotizacionId: v.id("cotizaciones"),
    servicioId: v.optional(v.id("catalogoServicios")),
    descripcion: v.optional(v.string()),
    cantidad: v.number(),
    precioUnitario: v.number(),
    placa: v.optional(v.object({
      material: v.string(), // 'acrilico' | 'lona'
      ancho_cm: v.optional(v.number()),
      alto_cm: v.optional(v.number()),
      contenido_texto: v.optional(v.string()),
      ubicacion_instalacion: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");

    const cotizacion = await ctx.db.get(args.cotizacionId);
    if (!cotizacion) throw new ConvexError("Cotización no encontrada");

    const nuevoItem = {
      servicioId: args.servicioId,
      descripcion: args.descripcion || "Placa",
      cantidad: args.cantidad,
      precioUnitario: args.precioUnitario,
      placa: args.placa
    };

    const nuevosItems = [...cotizacion.items, nuevoItem];
    const nuevoTotal = nuevosItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);

    await ctx.db.patch(args.cotizacionId, {
      items: nuevosItems,
      total: nuevoTotal
    });

    return nuevoItem;
  }
});

export const fetchItemsCotizacionConPlacas = query({
  args: {
    usuarioId: v.id("usuarios"),
    cotizacionId: v.id("cotizaciones")
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_cotizaciones");

    const cotizacion = await ctx.db.get(args.cotizacionId);
    if (!cotizacion) throw new ConvexError("Cotización no encontrada");

    // Enriquecer items con la categoría del catálogo si existe
    return await Promise.all(cotizacion.items.map(async (item) => {
      let categoria = "general";
      if (item.servicioId) {
        const servicio = await ctx.db.get(item.servicioId);
        if (servicio) {
          categoria = servicio.categoria;
        }
      }
      return {
        ...item,
        categoria
      };
    }));
  }
});

export const getCotizaciones = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cotizaciones").collect();
  }
});

export const createCotizacion = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    // Se mantiene opcional para aceptar clientes que aún tengan el frontend
    // anterior cacheado. La tabla siempre recibe un string más abajo.
    vehiculoTipo: v.optional(v.string()),
    vehiculoId: v.optional(v.id("vehiculos")),
    items: v.array(v.object({
      servicioId: v.optional(v.id("catalogoServicios")),
      descripcion: v.string(),
      cantidad: v.number(),
      precioUnitario: v.number(),
      placa: v.optional(v.object({
        material: v.string(),
        ancho_cm: v.optional(v.number()),
        alto_cm: v.optional(v.number()),
        contenido_texto: v.optional(v.string()),
        ubicacion_instalacion: v.optional(v.string())
      })),
      vehiculoId: v.optional(v.id("vehiculos"))
    })),
    total: v.optional(v.number()),
    estado: v.optional(v.string()),
    fecha: v.optional(v.string()),
    sucursalId: v.optional(v.id("sucursales")),
    pvId: v.optional(v.id("puntosVenta")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Usuario sin empresa asignada");

    // Recalcular total desde los items (la fuente de verdad son los items)
    const totalCalculado = args.items.reduce(
      (acc, item) => acc + item.cantidad * item.precioUnitario,
      0,
    );

    const cotizacionId = await ctx.db.insert("cotizaciones", {
      clienteNombre: args.clienteNombre,
      clienteTelefono: args.clienteTelefono,
      vehiculoTipo: args.vehiculoTipo?.trim() || "Vehículo sin especificar",
      vehiculoId: args.vehiculoId,
      items: args.items,
      total: args.total ?? totalCalculado,
      estado: args.estado ?? "Pendiente",
      fecha: args.fecha ?? new Date().toISOString().split("T")[0],
      empresaId: userContext.empresa.id,
      sucursalId: args.sucursalId ?? userContext.sucursal?.id,
      pvId: args.pvId ?? userContext.pv?.id,
      creadoPorUsuarioId: args.usuarioId,
    });

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: args.sucursalId ?? userContext.sucursal?.id,
        tablaAfectada: "cotizaciones",
        accion: "CREATE",
        registroId: cotizacionId,
        cambios: { clienteNombre: args.clienteNombre, total: totalCalculado },
      });
    }

    return await ctx.db.get(cotizacionId);
  }
});

export const updateCotizacion = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    cotizacionId: v.id("cotizaciones"),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    vehiculoTipo: v.optional(v.string()),
    vehiculoId: v.optional(v.id("vehiculos")),
    items: v.optional(v.array(v.object({
      servicioId: v.optional(v.id("catalogoServicios")),
      descripcion: v.string(),
      cantidad: v.number(),
      precioUnitario: v.number(),
      placa: v.optional(v.object({
        material: v.string(),
        ancho_cm: v.optional(v.number()),
        alto_cm: v.optional(v.number()),
        contenido_texto: v.optional(v.string()),
        ubicacion_instalacion: v.optional(v.string())
      })),
      vehiculoId: v.optional(v.id("vehiculos"))
    }))),
    estado: v.optional(v.string()),
    fecha: v.optional(v.string()),
    pvId: v.optional(v.id("puntosVenta")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const actual = await ctx.db.get(args.cotizacionId);
    if (!actual) throw new ConvexError("Cotización no encontrada");

    // Validación multi-tenant
    if (
      userContext.empresa &&
      actual.empresaId &&
      actual.empresaId !== userContext.empresa.id
    ) {
      throw new ConvexError("No tiene permisos para modificar esta cotización");
    }

    const { cotizacionId, usuarioId: _u, items, ...updates } = args;

    // Si cambian los items, recalcular el total
    if (items) {
      const nuevoTotal = items.reduce(
        (acc, item) => acc + item.cantidad * item.precioUnitario,
        0,
      );
      (updates as Record<string, unknown>).items = items;
      (updates as Record<string, unknown>).total = nuevoTotal;
    }

    await ctx.db.patch(cotizacionId, updates);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: actual.sucursalId,
        tablaAfectada: "cotizaciones",
        accion: "UPDATE",
        registroId: cotizacionId,
        cambios: updates,
      });
    }

    // Notificar al creador cuando la cotización cambia a aprobada
    if (
      args.estado === "Aprobada" &&
      userContext.empresa &&
      actual.creadoPorUsuarioId &&
      actual.creadoPorUsuarioId !== args.usuarioId
    ) {
      await ctx.runMutation(internal.notificaciones.crearNotificacion, {
        usuarioId: actual.creadoPorUsuarioId,
        empresaId: userContext.empresa.id,
        tipo: "cotizacion",
        titulo: "Cotización aprobada",
        mensaje: `La cotización de ${actual.clienteNombre} fue aprobada (total ${actual.total}).`,
        enlace: "/cotizaciones",
      });
    }

    return await ctx.db.get(cotizacionId);
  }
});

export const deleteCotizacion = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("cotizaciones"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const actual = await ctx.db.get(args.id);
    if (!actual) throw new ConvexError("Cotización no encontrada");

    if (
      userContext.empresa &&
      actual.empresaId &&
      actual.empresaId !== userContext.empresa.id
    ) {
      throw new ConvexError("No tiene permisos para eliminar esta cotización");
    }

    await ctx.db.delete(args.id);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        sucursalId: actual.sucursalId,
        tablaAfectada: "cotizaciones",
        accion: "DELETE",
        registroId: args.id,
        cambios: { clienteNombre: actual.clienteNombre },
      });
    }

    return { success: true };
  }
});



