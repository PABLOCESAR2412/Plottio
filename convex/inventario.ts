import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUserContext, requirePermission } from "./auth";

// 6.2 FUNCIÓN: createInventarioItems()
export const createInventarioItems = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    items: v.array(v.object({
      nombre: v.string(),
      tipo: v.optional(v.string()),
      descripcion: v.optional(v.string()),
      costoUnitario: v.number(),
      unidadMedida: v.string()
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    
    if (!userContext.empresa) {
      throw new ConvexError("Usuario sin empresa asignada");
    }
    const empresaIdToUse = userContext.empresa.id;

    const results = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("inventarioItems", {
        empresaId: empresaIdToUse,
        nombre: item.nombre,
        tipo: item.tipo,
        descripcion: item.descripcion,
        costoUnitario: item.costoUnitario,
        unidadMedida: item.unidadMedida,
        activo: true,
        fechaCreacion: new Date().toISOString()
      });
      results.push(await ctx.db.get(id));
    }
    return results;
  }
});

// 6.3 FUNCIÓN: addInventarioSucursal() (Single-Org)
export const addInventarioSucursal = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    sucursalId: v.optional(v.id("sucursales")),
    itemId: v.id("inventarioItems"),
    cantidad: v.number(),
    cantidadMinima: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) {
      throw new ConvexError("Usuario sin empresa asignada");
    }

    let targetSucursalId = args.sucursalId ?? userContext.sucursal?.id;
    if (!targetSucursalId) {
      // Buscar primera sucursal activa de la empresa como fallback
      const defaultSuc = await ctx.db
        .query("sucursales")
        .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
        .first();
      targetSucursalId = defaultSuc?._id;
    }
    
    // Buscar si ya existe el stock para este item
    const existente = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .first();

    let stockActualizado;
    if (existente) {
      await ctx.db.patch(existente._id, {
        cantidad: existente.cantidad + args.cantidad,
        ultimaActualizacion: new Date().toISOString()
      });
      stockActualizado = await ctx.db.get(existente._id);
    } else {
      const id = await ctx.db.insert("inventarioSucursal", {
        sucursalId: targetSucursalId,
        itemId: args.itemId,
        cantidad: args.cantidad,
        cantidadMinima: args.cantidadMinima || 10,
        ultimaActualizacion: new Date().toISOString()
      });
      stockActualizado = await ctx.db.get(id);
    }

    // Registrar movimiento
    await ctx.db.insert("movimientosInventario", {
      sucursalId: targetSucursalId,
      itemId: args.itemId,
      tipoMovimiento: "ENTRADA",
      cantidad: args.cantidad,
      concepto: "Ingreso / Reabastecimiento Central",
      usuarioId: args.usuarioId,
      fecha: new Date().toISOString()
    });

    return stockActualizado;
  }
});

// 6.4 FUNCIÓN: getInventarioSucursal()
export const getInventarioSucursal = query({
  args: {
    usuarioId: v.id("usuarios"),
    sucursalId: v.optional(v.id("sucursales"))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_inventario");
    
    let stocks: Doc<"inventarioSucursal">[] = [];
    if (args.sucursalId) {
      stocks = await ctx.db
        .query("inventarioSucursal")
        .withIndex("by_sucursal", q => q.eq("sucursalId", args.sucursalId))
        .collect();
    } else {
      stocks = await ctx.db.query("inventarioSucursal").collect();
    }

    return await Promise.all(stocks.map(async (stock) => {
      const item = await ctx.db.get(stock.itemId);
      const costoUnitario = item?.costoUnitario || 0;
      
      return {
        ...stock,
        item_nombre: item?.nombre || 'Desconocido',
        tipo: item?.tipo,
        costo_unitario: costoUnitario,
        unidad_medida: item?.unidadMedida,
        valor_total: stock.cantidad * costoUnitario,
        bajo_stock: stock.cantidad <= stock.cantidadMinima
      };
    }));
  }
});

// 6.5 FUNCIÓN: transferirInventario()
export const transferirInventario = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    desde: v.id("sucursales"),
    hacia: v.id("sucursales"),
    itemId: v.id("inventarioItems"),
    cantidad: v.number()
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");
    if (args.cantidad <= 0) throw new ConvexError("La cantidad debe ser mayor a 0");

    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const sucOrigen = await ctx.db.get(args.desde);
    const sucDestino = await ctx.db.get(args.hacia);

    if (!sucOrigen || !sucDestino) {
      throw new ConvexError("Sucursal no encontrada");
    }

    if (sucOrigen.empresaId !== sucDestino.empresaId) {
      if (isSuperAdmin) {
        throw new ConvexError("No se permiten transferencias entre diferentes empresas");
      }
      throw new ConvexError("No se permiten transferencias entre diferentes empresas o fuera de su empresa");
    }

    if (!isSuperAdmin && userContext.empresa && sucOrigen.empresaId !== userContext.empresa.id) {
      throw new ConvexError("No se permiten transferencias entre diferentes empresas o fuera de su empresa");
    }

    const stockOrigen = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_sucursal_item", q => q.eq("sucursalId", args.desde).eq("itemId", args.itemId))
      .first();

    if (!stockOrigen || stockOrigen.cantidad < args.cantidad) {
      throw new ConvexError("Stock insuficiente para transferir");
    }

    await ctx.db.patch(stockOrigen._id, {
      cantidad: stockOrigen.cantidad - args.cantidad,
      ultimaActualizacion: new Date().toISOString()
    });

    const stockDestino = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_sucursal_item", q => q.eq("sucursalId", args.hacia).eq("itemId", args.itemId))
      .first();

    if (stockDestino) {
      await ctx.db.patch(stockDestino._id, {
        cantidad: stockDestino.cantidad + args.cantidad,
        ultimaActualizacion: new Date().toISOString()
      });
    } else {
      await ctx.db.insert("inventarioSucursal", {
        sucursalId: args.hacia,
        itemId: args.itemId,
        cantidad: args.cantidad,
        cantidadMinima: 10,
        ultimaActualizacion: new Date().toISOString()
      });
    }

    await ctx.db.insert("movimientosInventario", {
      sucursalId: args.desde,
      itemId: args.itemId,
      tipoMovimiento: "SALIDA",
      cantidad: args.cantidad,
      concepto: `Transferencia a sucursal ${args.hacia}`,
      usuarioId: args.usuarioId,
      fecha: new Date().toISOString(),
    });

    await ctx.db.insert("movimientosInventario", {
      sucursalId: args.hacia,
      itemId: args.itemId,
      tipoMovimiento: "ENTRADA",
      cantidad: args.cantidad,
      concepto: `Transferencia desde sucursal ${args.desde}`,
      usuarioId: args.usuarioId,
      fecha: new Date().toISOString(),
    });

    return { success: true, mensaje: "Transferencia completada" };
  }
});

// 6.6 FUNCIÓN: registrarConsumoDeTrabajo()
export const registrarConsumoDeTrabajo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.string(),
    sucursalId: v.optional(v.id("sucursales")),
    consumos: v.array(v.object({
      itemId: v.id("inventarioItems"),
      cantidad: v.number()
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");

    for (const item of args.consumos) {
      const stock = await ctx.db
        .query("inventarioSucursal")
        .withIndex("by_item", q => q.eq("itemId", item.itemId))
        .first();

      if (!stock || stock.cantidad < item.cantidad) {
        throw new ConvexError(`Stock insuficiente para el item ${item.itemId}`);
      }

      await ctx.db.patch(stock._id, {
        cantidad: stock.cantidad - item.cantidad,
        ultimaActualizacion: new Date().toISOString()
      });

      await ctx.db.insert("movimientosInventario", {
        sucursalId: args.sucursalId,
        itemId: item.itemId,
        tipoMovimiento: "SALIDA",
        cantidad: item.cantidad,
        concepto: `Consumo en orden de trabajo ${args.ordenId}`,
        ordenId: args.ordenId,
        usuarioId: args.usuarioId,
        fecha: new Date().toISOString()
      });
    }

    return { success: true, mensaje: "Consumo registrado exitosamente" };
  }
});

// 6.7 FUNCIÓN: getAlertasStockMinimo() (Single-Org)
export const getAlertasStockMinimo = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    // Obtener todos los items del taller
    const items = await ctx.db
      .query("inventarioItems")
      .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    const itemsIds = new Set(items.map((i) => i._id));
    const allStocks = await ctx.db.query("inventarioSucursal").collect();
    const stocks = allStocks.filter((s) => itemsIds.has(s.itemId));

    // Filtrar solo los que están bajo el mínimo
    const alertas = stocks.filter(s => s.cantidad <= s.cantidadMinima);

    // Enriquecer
    return await Promise.all(alertas.map(async (a) => {
      const item = await ctx.db.get(a.itemId);
      const porcentaje = a.cantidadMinima > 0 ? Math.round((a.cantidad / a.cantidadMinima) * 100) : 0;
      const sucursal = a.sucursalId ? await ctx.db.get(a.sucursalId) : null;

      return {
        id: a._id,
        item_nombre: item?.nombre || "Desconocido",
        tipo: item?.tipo,
        cantidad: a.cantidad,
        cantidad_minima: a.cantidadMinima,
        sucursal_nombre: sucursal?.nombre || "Taller Principal",
        porcentaje_stock: porcentaje
      };
    })).then(res => res.sort((x, y) => x.cantidad - y.cantidad));
  }
});

// 6.8 FUNCIÓN: getInventarioConsolidado() (Single-Org)
export const getInventarioConsolidado = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    const hasPerm =
      isSuperAdmin ||
      userContext.permisos.includes("ver_inventario") ||
      userContext.permisos.includes("ver_todas_sucursales");

    if (!hasPerm) {
      throw new ConvexError("[403 Forbidden] No tienes permiso para ver el inventario consolidado");
    }

    if (!userContext.empresa) return [];

    const items = await ctx.db
      .query("inventarioItems")
      .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    return await Promise.all(items.map(async (item) => {
      const stocks = await ctx.db
        .query("inventarioSucursal")
        .withIndex("by_item", q => q.eq("itemId", item._id))
        .collect();

      const cantidad_total = stocks.reduce((acc, curr) => acc + curr.cantidad, 0);
      const cantidad_minima_total = stocks.reduce((acc, curr) => acc + curr.cantidadMinima, 0);
      const sucursales_con_stock = stocks.filter(s => s.cantidad > 0).length;

      return {
        item_id: item._id,
        nombre: item.nombre,
        tipo: item.tipo,
        unidadMedida: item.unidadMedida,
        cantidad_total,
        cantidad_minima_total,
        sucursales_con_stock,
        costo_unitario: item.costoUnitario,
        valor_total: cantidad_total * item.costoUnitario
      };
    })).then(res => res.sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }
});

// 6.9 FUNCIÓN: updateInventarioItem()
export const updateInventarioItem = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    itemId: v.id("inventarioItems"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    costoUnitario: v.optional(v.number()),
    unidadMedida: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Item no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && item.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este item");
    }

    const { usuarioId: _u, itemId, ...updates } = args;
    await ctx.db.patch(itemId, updates);
    return { success: true };
  }
});

// 6.10 FUNCIÓN: deleteInventarioItem()
export const deleteInventarioItem = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    itemId: v.id("inventarioItems")
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Item no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && item.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para eliminar este item");
    }
    
    const stocks = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_item", q => q.eq("itemId", args.itemId))
      .collect();
      
    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }
    
    await ctx.db.delete(args.itemId);
    return { success: true };
  }
});

// 6.11 FUNCIÓN: fetchInventario()
export const fetchInventario = query({
  args: {
    usuarioId: v.optional(v.id("usuarios")),
  },
  handler: async (ctx, args) => {
    if (args.usuarioId) {
      const userContext = await getCurrentUserContext(ctx, args.usuarioId);
      if (userContext.empresa) {
        return await ctx.db
          .query("inventarioItems")
          .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
          .collect();
      }
    }
    return await ctx.db.query("inventarioItems").collect();
  },
});

