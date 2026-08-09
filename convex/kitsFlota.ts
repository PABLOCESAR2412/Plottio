import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";

// 12.3 FUNCIÓN: crearKitFlota()
export const crearKitFlota = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteId: v.optional(v.id("clientes")),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    items: v.array(v.object({
      servicioId: v.id("catalogoServicios"),
      cantidad_por_unidad: v.number(),
      precio_unitario: v.optional(v.number()),
      notas: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const kitId = await ctx.db.insert("kitsFlota", {
      empresaId: userContext.empresa.id,
      clienteId: args.clienteId,
      nombre: args.nombre,
      descripcion: args.descripcion,
      activo: true,
      items: args.items,
      fechaCreacion: new Date().toISOString()
    });

    const kitCreado = await ctx.db.get(kitId);
    return { ...kitCreado, total_items: args.items.length };
  }
});

export const getKits = query({
  args: {
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const kits = await ctx.db
      .query("kitsFlota")
      .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();
    return kits.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
});

// 12.4 FUNCIÓN: fetchKitConItems()
export const fetchKitConItems = query({
  args: {
    usuarioId: v.id("usuarios"),
    kitId: v.id("kitsFlota")
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_cotizaciones");

    const kit = await ctx.db.get(args.kitId);
    if (!kit) throw new Error("Kit no encontrado");

    return await Promise.all(kit.items.map(async (item) => {
      const servicio = await ctx.db.get(item.servicioId);
      return {
        ...item,
        servicio_nombre: servicio?.nombre || "Servicio Desconocido",
        categoria: servicio?.categoria || "general",
        precio_aplicado: item.precio_unitario ?? (servicio?.precioBase || 0)
      };
    }));
  }
});

// 12.5 FUNCIÓN: generarCotizacionesMasivasDesdeKit()
export const generarCotizacionesMasivasDesdeKit = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    kitId: v.id("kitsFlota"),
    clienteId: v.id("clientes"),
    vehiculos: v.array(v.object({
      vehiculoId: v.id("vehiculos"),
      placa: v.string()
    })),
    modo: v.string(), // 'padre_con_subgrupos' | 'independientes'
    pvId: v.optional(v.id("puntosVenta"))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cotizacion");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa || !userContext.sucursal) throw new Error("Empresa/Sucursal no encontrada");

    const kit = await ctx.db.get(args.kitId);
    if (!kit || kit.items.length === 0) {
      throw new Error("El kit no tiene ítems configurados");
    }

    // Resolving prices and names beforehand
    const kitItems = await Promise.all(kit.items.map(async (item) => {
      const servicio = await ctx.db.get(item.servicioId);
      return {
        ...item,
        servicio_nombre: servicio?.nombre || "Servicio",
        precio_aplicado: item.precio_unitario ?? (servicio?.precioBase || 0)
      };
    }));

    if (args.modo === "independientes") {
      // ===== MODO B: N cotizaciones independientes =====
      const cotizacionesCreadas = [];

      for (const vehiculo of args.vehiculos) {
        let totalCotizacion = 0;
        const itemsCotizacion = [];

        for (const item of kitItems) {
          const subtotal = item.cantidad_por_unidad * item.precio_aplicado;
          totalCotizacion += subtotal;

          itemsCotizacion.push({
            servicioId: item.servicioId,
            descripcion: `${item.servicio_nombre}${item.notas ? ' - ' + item.notas : ''}`,
            cantidad: item.cantidad_por_unidad,
            precioUnitario: item.precio_aplicado,
            subtotal, // not officially in schema but calculated on the fly or just omitted. Wait, total is in schema.
          });
        }

        const cotizacionId = await ctx.db.insert("cotizaciones", {
          clienteNombre: "Cliente Flota", // We should ideally get this from DB
          clienteTelefono: "000000",
          vehiculoTipo: "Vehículo de Flota",
          items: itemsCotizacion,
          total: totalCotizacion,
          estado: "Pendiente",
          fecha: new Date().toISOString(),
          empresaId: userContext.empresa.id,
          sucursalId: userContext.sucursal.id,
          pvId: args.pvId,
          creadoPorUsuarioId: args.usuarioId,
          esGrupoFlota: false
        });

        // Small patch to actually set the correct cliente fields since we didn't fetch it
        const cliente = await ctx.db.get(args.clienteId);
        if (cliente) {
           await ctx.db.patch(cotizacionId, {
             clienteNombre: cliente.nombre,
             clienteTelefono: cliente.telefono
           });
        }

        const cotCreada = await ctx.db.get(cotizacionId);
        cotizacionesCreadas.push({ ...cotCreada, total: totalCotizacion, placa: vehiculo.placa });
      }

      return { modo: "independientes", cotizaciones: cotizacionesCreadas };

    } else {
      // ===== MODO A: una cotización padre con sub-grupos por bus =====
      let totalGeneral = 0;
      const itemsCotizacion = [];

      for (const vehiculo of args.vehiculos) {
        for (const item of kitItems) {
          const subtotal = item.cantidad_por_unidad * item.precio_aplicado;
          totalGeneral += subtotal;

          itemsCotizacion.push({
            servicioId: item.servicioId,
            descripcion: `[Unidad ${vehiculo.placa}] ${item.servicio_nombre}${item.notas ? ' - ' + item.notas : ''}`,
            cantidad: item.cantidad_por_unidad,
            precioUnitario: item.precio_aplicado,
            vehiculoId: vehiculo.vehiculoId
          });
        }
      }

      const cliente = await ctx.db.get(args.clienteId);

      const cotizacionPadreId = await ctx.db.insert("cotizaciones", {
        clienteNombre: cliente?.nombre || "Cliente Flota",
        clienteTelefono: cliente?.telefono || "000000",
        vehiculoTipo: "Flota de Vehículos",
        items: itemsCotizacion,
        total: totalGeneral,
        estado: "Pendiente",
        fecha: new Date().toISOString(),
        empresaId: userContext.empresa.id,
        sucursalId: userContext.sucursal.id,
        pvId: args.pvId,
        creadoPorUsuarioId: args.usuarioId,
        esGrupoFlota: true
      });

      const cotPadre = await ctx.db.get(cotizacionPadreId);
      return {
        modo: "padre_con_subgrupos",
        cotizacion: { ...cotPadre, total: totalGeneral, unidades: args.vehiculos.length }
      };
    }
  }
});

// 12.6 FUNCIÓN: fetchSubgruposPorVehiculo()
export const fetchSubgruposPorVehiculo = query({
  args: {
    usuarioId: v.id("usuarios"),
    cotizacionId: v.id("cotizaciones")
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_cotizaciones");

    const cotizacion = await ctx.db.get(args.cotizacionId);
    if (!cotizacion || !cotizacion.esGrupoFlota) {
      throw new Error("Cotización no válida o no es grupo de flota");
    }

    const subgruposMap = new Map();

    for (const item of cotizacion.items) {
      if (!item.vehiculoId) continue;

      if (!subgruposMap.has(item.vehiculoId)) {
        const vehiculo = await ctx.db.get(item.vehiculoId as import("./_generated/dataModel").Id<"vehiculos">);
        subgruposMap.set(item.vehiculoId, {
          vehiculo_id: item.vehiculoId,
          placa: vehiculo?.placa || "Desconocida",
          marca: vehiculo?.marca || "Desconocida",
          items: [],
          subtotal_unidad: 0
        });
      }

      const grupo = subgruposMap.get(item.vehiculoId);
      const subtotal = item.cantidad * item.precioUnitario;
      
      grupo.items.push({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal
      });
      grupo.subtotal_unidad += subtotal;
    }

    const resultados = Array.from(subgruposMap.values());
    resultados.sort((a, b) => a.placa.localeCompare(b.placa));

    return resultados;
  }
});
