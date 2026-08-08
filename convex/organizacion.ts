import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- EMPRESAS ---
export const getEmpresas = query({
  handler: async (ctx) => {
    return await ctx.db.query("empresas").collect();
  }
});

export const createEmpresa = mutation({
  args: {
    nombre: v.string(),
    ruc: v.string(),
    razonSocial: v.string(),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("empresas", {
      ...args,
      activa: true,
    });
  }
});

export const updateEmpresa = mutation({
  args: {
    id: v.id("empresas"),
    nombre: v.optional(v.string()),
    ruc: v.optional(v.string()),
    razonSocial: v.optional(v.string()),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    activa: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});

// --- SUCURSALES ---
export const getSucursales = query({
  args: { empresaId: v.optional(v.id("empresas")) },
  handler: async (ctx, args) => {
    if (args.empresaId) {
      return await ctx.db.query("sucursales").withIndex("by_empresa", q => q.eq("empresaId", args.empresaId)).collect();
    }
    return await ctx.db.query("sucursales").collect();
  }
});

export const createSucursal = mutation({
  args: {
    empresaId: v.id("empresas"),
    nombre: v.string(),
    ruc: v.optional(v.string()),
    direccion: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    gerenteTelefono: v.optional(v.string()),
    esMatriz: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sucursales", {
      ...args,
      activa: true,
    });
  }
});

export const updateSucursal = mutation({
  args: {
    id: v.id("sucursales"),
    nombre: v.optional(v.string()),
    ruc: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    gerenteTelefono: v.optional(v.string()),
    esMatriz: v.optional(v.boolean()),
    activa: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});

// --- PUNTOS DE VENTA ---
export const getPuntosVenta = query({
  args: { sucursalId: v.optional(v.id("sucursales")) },
  handler: async (ctx, args) => {
    if (args.sucursalId) {
      return await ctx.db.query("puntosVenta").withIndex("by_sucursal", q => q.eq("sucursalId", args.sucursalId)).collect();
    }
    return await ctx.db.query("puntosVenta").collect();
  }
});

export const createPuntoVenta = mutation({
  args: {
    sucursalId: v.id("sucursales"),
    nombre: v.string(),
    codigo: v.string(),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    horarioApertura: v.optional(v.string()),
    horarioCierre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("puntosVenta", {
      ...args,
      activo: true,
    });
  }
});

export const updatePuntoVenta = mutation({
  args: {
    id: v.id("puntosVenta"),
    nombre: v.optional(v.string()),
    codigo: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    horarioApertura: v.optional(v.string()),
    horarioCierre: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});
