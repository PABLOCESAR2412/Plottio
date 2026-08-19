import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserContext } from "./auth";

// 5.2 MODIFICAR FUNCIÓN: fetchVehiculos()
export const fetchVehiculos = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];
    
    const esSuper = userContext.roles.some(r => r.roleNombre === 'Super Admin');
    
    const allVehiculos = await ctx.db
      .query("vehiculos")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    let filtrados = allVehiculos;

    if (!esSuper && userContext.sucursal) {
      filtrados = allVehiculos.filter(v => v.sucursalId === userContext.sucursal!.id);
    }

    // Ordenar por placa
    filtrados.sort((a, b) => a.placa.localeCompare(b.placa));

    // Enriquecer con nombres de cliente y sucursal
    return await Promise.all(filtrados.map(async (v) => {
      let cliente_nombre = "Desconocido";
      if (v.propietarioTipo === "cliente" && v.propietarioId) {
         const cliente = await ctx.db.get(v.propietarioId as import("./_generated/dataModel").Id<"clientes">);
         if (cliente) cliente_nombre = cliente.nombre;
      }

      let sucursal_nombre = "Desconocida";
      if (v.sucursalId) {
         const suc = await ctx.db.get(v.sucursalId);
         if (suc) sucursal_nombre = suc.nombre;
      }

      return {
        ...v,
        cliente_nombre,
        sucursal_nombre,
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
    if (!userContext.empresa) throw new Error("Sin permisos");

    let empId = userContext.empresa.id;

    const existing = await ctx.db
      .query("vehiculos")
      .filter((q) => q.eq(q.field("placa"), args.placa))
      .first();
    if (existing) {
      throw new Error(`Ya existe un vehículo con la placa ${args.placa}`);
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
      sucursalId: args.sucursalId || userContext.sucursal?.id,
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
    const existing = await ctx.db
      .query("vehiculos")
      .filter((q) => q.eq(q.field("placa"), args.placa))
      .first();
    if (existing && existing._id !== args.vehiculoId) {
      throw new Error(`Ya existe un vehículo con la placa ${args.placa}`);
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
    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new Error("Vehiculo no encontrado");
    const newServicio = {
      id: "srv-" + Date.now().toString(),
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
    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new Error("Vehiculo no encontrado");
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
    const veh = await ctx.db.get(args.vehiculoId);
    if (!veh) throw new Error("Vehiculo no encontrado");
    const servicios = (veh.servicios || []).filter(s => s.id !== args.servicioId);
    await ctx.db.patch(args.vehiculoId, { servicios });
  }
});
