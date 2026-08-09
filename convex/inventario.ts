import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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
    
    let empresaIdToUse = userContext.empresa?.id;
    if (!empresaIdToUse) {
        const fallbackEmpresa = await ctx.db.query("empresas").first();
        if (!fallbackEmpresa) throw new Error("No hay empresas registradas en el sistema");
        empresaIdToUse = fallbackEmpresa._id;
    }

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

// 6.3 FUNCIÓN: addInventarioSucursal()
export const addInventarioSucursal = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    sucursalId: v.id("sucursales"),
    itemId: v.id("inventarioItems"),
    cantidad: v.number(),
    cantidadMinima: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario", args.sucursalId);
    
    // Buscar si ya existe el stock en la sucursal para este item
    const existente = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_sucursal_item", q => q.eq("sucursalId", args.sucursalId).eq("itemId", args.itemId))
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
        sucursalId: args.sucursalId,
        itemId: args.itemId,
        cantidad: args.cantidad,
        cantidadMinima: args.cantidadMinima || 10,
        ultimaActualizacion: new Date().toISOString()
      });
      stockActualizado = await ctx.db.get(id);
    }

    // Registrar movimiento
    await ctx.db.insert("movimientosInventario", {
      sucursalId: args.sucursalId,
      itemId: args.itemId,
      tipoMovimiento: "ENTRADA",
      cantidad: args.cantidad,
      concepto: "Compra a proveedor / Ingreso Manual",
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
    sucursalId: v.id("sucursales")
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_inventario", args.sucursalId);
    
    const stocks = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_sucursal", q => q.eq("sucursalId", args.sucursalId))
      .collect();

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
    // Debe tener permiso de editar inventario en la sucursal de origen
    await requirePermission(ctx, args.usuarioId, "editar_inventario", args.desde);

    if (args.cantidad <= 0) throw new Error("La cantidad debe ser mayor a 0");

    const stockOrigen = await ctx.db
      .query("inventarioSucursal")
      .withIndex("by_sucursal_item", q => q.eq("sucursalId", args.desde).eq("itemId", args.itemId))
      .first();

    if (!stockOrigen || stockOrigen.cantidad < args.cantidad) {
      throw new Error("Stock insuficiente en sucursal origen");
    }

    // Restar de origen
    await ctx.db.patch(stockOrigen._id, {
      cantidad: stockOrigen.cantidad - args.cantidad,
      ultimaActualizacion: new Date().toISOString()
    });

    // Sumar a destino
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

    // Registrar en origen
    await ctx.db.insert("movimientosInventario", {
      sucursalId: args.desde,
      itemId: args.itemId,
      tipoMovimiento: "TRANSFERENCIA_SALIDA",
      cantidad: args.cantidad,
      concepto: `Transferencia a sucursal ${args.hacia}`,
      usuarioId: args.usuarioId,
      sucursalOrigen: args.desde,
      sucursalDestino: args.hacia,
      fecha: new Date().toISOString()
    });

    // Registrar en destino
    await ctx.db.insert("movimientosInventario", {
      sucursalId: args.hacia,
      itemId: args.itemId,
      tipoMovimiento: "TRANSFERENCIA_ENTRADA",
      cantidad: args.cantidad,
      concepto: `Transferencia desde sucursal ${args.desde}`,
      usuarioId: args.usuarioId,
      sucursalOrigen: args.desde,
      sucursalDestino: args.hacia,
      fecha: new Date().toISOString()
    });

    return { success: true, mensaje: "Transferencia completada" };
  }
});

// 6.6 FUNCIÓN: registrarConsumoDeTrabajo()
export const registrarConsumoDeTrabajo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    ordenId: v.string(), // ID de la orden o correlativo
    sucursalId: v.id("sucursales"), // La sucursal donde se ejecutó la orden
    consumos: v.array(v.object({
      itemId: v.id("inventarioItems"),
      cantidad: v.number()
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_inventario", args.sucursalId);

    for (const item of args.consumos) {
      const stock = await ctx.db
        .query("inventarioSucursal")
        .withIndex("by_sucursal_item", q => q.eq("sucursalId", args.sucursalId).eq("itemId", item.itemId))
        .first();

      if (!stock || stock.cantidad < item.cantidad) {
        throw new Error(`Stock insuficiente para el item ${item.itemId}`);
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

// 6.7 FUNCIÓN: getAlertasStockMinimo()
export const getAlertasStockMinimo = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_inventario");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    
    // Obtener todo el stock de las sucursales a las que tiene acceso
    let stocks: Array<{ _id: any; cantidad: number; cantidadMinima: number; itemId: any; sucursalId: any }> = [];
    if (userContext.permisos.includes("ver_todas_sucursales")) {
      stocks = await ctx.db.query("inventarioSucursal").collect();
    } else if (userContext.sucursal) {
      stocks = await ctx.db
        .query("inventarioSucursal")
        .withIndex("by_sucursal", q => q.eq("sucursalId", userContext.sucursal!.id))
        .collect();
    }

    // Filtrar solo los que están bajo el mínimo
    const alertas = stocks.filter(s => s.cantidad <= s.cantidadMinima);

    // Enriquecer
    return await Promise.all(alertas.map(async (a) => {
      const item = await ctx.db.get(a.itemId);
      const sucursal = await ctx.db.get(a.sucursalId);
      const porcentaje = a.cantidadMinima > 0 ? Math.round((a.cantidad / a.cantidadMinima) * 100) : 0;

      return {
        id: a._id,
        item_nombre: item?.nombre || "Desconocido",
        tipo: item?.tipo,
        cantidad: a.cantidad,
        cantidad_minima: a.cantidadMinima,
        sucursal_nombre: sucursal?.nombre || "Desconocida",
        porcentaje_stock: porcentaje
      };
    })).then(res => res.sort((x, y) => x.cantidad - y.cantidad));
  }
});

// 6.8 FUNCIÓN: getInventarioConsolidado()
export const getInventarioConsolidado = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    // Exigimos el permiso maestro
    await requirePermission(ctx, args.usuarioId, "ver_todas_sucursales");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    
    let empresaIdToUse = userContext.empresa?.id;
    if (!empresaIdToUse) {
        const fallbackEmpresa = await ctx.db.query("empresas").first();
        if (fallbackEmpresa) {
            empresaIdToUse = fallbackEmpresa._id;
        }
    }

    let items;
    if (empresaIdToUse) {
      items = await ctx.db
        .query("inventarioItems")
        .withIndex("by_empresa", q => q.eq("empresaId", empresaIdToUse))
        .collect();
    } else {
      items = await ctx.db.query("inventarioItems").collect();
    }

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
