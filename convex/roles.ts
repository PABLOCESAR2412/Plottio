import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getRoles = query({
  args: { empresaId: v.optional(v.id("empresas")) },
  handler: async (ctx, args) => {
    if (!args.empresaId) {
      return await ctx.db
        .query("roles")
        .filter((q) => q.eq(q.field("activo"), true))
        .collect();
    }
    return await ctx.db
      .query("roles")
      .withIndex("by_empresa", (q) => q.eq("empresaId", args.empresaId))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const createRole = mutation({
  args: {
    empresaId: v.optional(v.id("empresas")),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    permisosIds: v.array(v.id("permisos")),
  },
  handler: async (ctx, args) => {
    const roleId = await ctx.db.insert("roles", {
      empresaId: args.empresaId,
      nombre: args.nombre,
      descripcion: args.descripcion,
      activo: true,
      fechaCreacion: new Date().toISOString(),
    });

    // Asignar permisos al rol
    for (const permisoId of args.permisosIds) {
      await ctx.db.insert("rolePermisos", {
        roleId,
        permisoId,
        fechaAsignacion: new Date().toISOString(),
      });
    }

    return roleId;
  },
});

export const getRolePermisos = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const asignaciones = await ctx.db
      .query("rolePermisos")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
    return asignaciones.map((a) => a.permisoId);
  },
});

export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    permisosIds: v.array(v.id("permisos")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roleId, {
      nombre: args.nombre,
      descripcion: args.descripcion,
    });

    // Eliminar permisos actuales
    const asignaciones = await ctx.db
      .query("rolePermisos")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
    
    for (const a of asignaciones) {
      await ctx.db.delete(a._id);
    }

    // Insertar nuevos
    for (const permisoId of args.permisosIds) {
      await ctx.db.insert("rolePermisos", {
        roleId: args.roleId,
        permisoId,
        fechaAsignacion: new Date().toISOString(),
      });
    }
  },
});
