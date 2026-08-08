import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getServicios = query({
  args: {
    empresaId: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const servicios = await ctx.db.query("catalogoServicios").collect();
    return servicios.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
});

export const createServicio = mutation({
  args: {
    empresaId: v.optional(v.any()),
    nombre: v.string(),
    categoria: v.string(),
    precioBase: v.number(),
  },
  handler: async (ctx, args) => {
    const empresa = await ctx.db.query("empresas").first();
    return await ctx.db.insert("catalogoServicios", {
      empresaId: empresa!._id,
      nombre: args.nombre,
      categoria: args.categoria,
      precioBase: args.precioBase,
      activo: true,
      fechaCreacion: new Date().toISOString()
    });
  }
});

export const toggleActivo = mutation({
  args: {
    id: v.id("catalogoServicios"),
    activo: v.boolean()
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { activo: args.activo });
  }
});
