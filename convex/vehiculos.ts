import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";

// 5.2 FUNCIÓN: fetchVehiculos() (Single-Org)
export const fetchVehiculos = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];
    
    const allVehiculos = await ctx.db
      .query("vehiculos")
      .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    // Ordenar por placa
    const filtrados = [...allVehiculos].sort((a, b) => a.placa.localeCompare(b.placa));

    // Enriquecer con nombres de cliente
    return await Promise.all(filtrados.map(async (v) => {
      let cliente_nombre = "Desconocido";
      if (v.propietarioTipo === "cliente" && v.propietarioId) {
         const cliente = await ctx.db.get(v.propietarioId as import("./_generated/dataModel").Id<"clientes">);
         if (cliente) cliente_nombre = cliente.nombre;
      }

      return {
        ...v,
        cliente_nombre,
        sucursal_nombre: "Taller Principal",
        servicios: v.servicios || []
      };
    }));
  }
});

export const createVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    placa: v.string(),
    categoria: v.string(),
    marca: v.string(),
    modelo: v.string(),
    anio: v.string(),
    numeroSerie: v.string(),
    propietarioId: v.string(),
    propietarioTipo: v.string(),
    estado: v.string(),
    sucursalId: v.optional(v.id("sucursales")),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Sin permisos");

    const empId = userContext.empresa.id;

    const existing = await ctx.db
      .query("vehiculos")
      .withIndex("by_placa", (q) => q.eq("placa", args.placa))
      .first();
    if (existing) {
      throw new ConvexError(`Ya existe un vehículo con la placa ${args.placa}`);
    }

    const newId = await ctx.db.insert("vehiculos", {
      placa: args.placa,
      categoria: args.categoria,
      marca: args.marca,
      modelo: args.modelo,
      anio: args.anio,
      numeroSerie: args.numeroSerie,
      propietarioId: args.propietarioId,
      propietarioTipo: args.propietarioTipo,
      estado: args.estado,
      empresaId: empId,
      sucursalId: args.sucursalId ?? userContext.sucursal?.id,
      servicios: [],
    });
    return await ctx.db.get(newId);
  }
});

export const updateVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    vehiculoId: v.id("vehiculos"),
    placa: v.string(),
    categoria: v.string(),
    marca: v.string(),
    modelo: v.string(),
    anio: v.string(),
    numeroSerie: v.string(),
    propietarioId: v.string(),
    propietarioTipo: v.string(),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new ConvexError("Vehículo no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && veh.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este vehículo");
    }

    const existing = await ctx.db
      .query("vehiculos")
      .withIndex("by_placa", (q) => q.eq("placa", args.placa))
      .first();
    if (existing && existing._id !== args.vehiculoId) {
      throw new ConvexError(`Ya existe un vehículo con la placa ${args.placa}`);
    }

    await ctx.db.patch(args.vehiculoId, {
      placa: args.placa,
      categoria: args.categoria,
      marca: args.marca,
      modelo: args.modelo,
      anio: args.anio,
      numeroSerie: args.numeroSerie,
      propietarioId: args.propietarioId,
      propietarioTipo: args.propietarioTipo,
      estado: args.estado,
    });
  }
});

export const deleteVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    vehiculoId: v.id("vehiculos"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new ConvexError("Vehículo no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && veh.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para eliminar este vehículo");
    }

    await ctx.db.delete(args.vehiculoId);
  }
});

export const addServicioVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    vehiculoId: v.id("vehiculos"),
    descripcion: v.string(),
    costo: v.number(),
    fecha: v.string(),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new ConvexError("Vehículo no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && veh.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este vehículo");
    }

    const newServicio = {
      id: "srv-" + crypto.randomUUID(),
      fecha: args.fecha,
      descripcion: args.descripcion,
      costo: args.costo,
      estado: args.estado
    };
    const servicios = veh.servicios || [];
    servicios.push(newServicio);
    await ctx.db.patch(args.vehiculoId, { servicios });
  }
});

export const updateServicioVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    vehiculoId: v.id("vehiculos"),
    servicioId: v.string(),
    descripcion: v.string(),
    costo: v.number(),
    fecha: v.string(),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new ConvexError("Vehículo no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && veh.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este vehículo");
    }

    const servicios = veh.servicios || [];
    const index = servicios.findIndex(s => s.id === args.servicioId);
    if (index > -1) {
      servicios[index] = {
        ...servicios[index],
        descripcion: args.descripcion,
        costo: args.costo,
        fecha: args.fecha,
        estado: args.estado
      };
      await ctx.db.patch(args.vehiculoId, { servicios });
    }
  }
});

export const deleteServicioVehiculo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    vehiculoId: v.id("vehiculos"),
    servicioId: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_orden");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new ConvexError("Vehículo no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && veh.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este vehículo");
    }

    const servicios = (veh.servicios || []).filter(s => s.id !== args.servicioId);
    await ctx.db.patch(args.vehiculoId, { servicios });
  }
});
