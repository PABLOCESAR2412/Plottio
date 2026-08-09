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

export const deleteRole = mutation({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) throw new Error("Rol no encontrado");

    // Verificar que no tenga usuarios asignados activos
    const asignaciones = await ctx.db
      .query("usuariosRolesSucursal")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
    if (asignaciones.length > 0) {
      throw new Error(
        `No se puede eliminar: el rol tiene ${asignaciones.length} usuario(s) asignado(s).`,
      );
    }

    // Limpiar permisos del rol
    const permisosAsignados = await ctx.db
      .query("rolePermisos")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
    for (const rp of permisosAsignados) {
      await ctx.db.delete(rp._id);
    }

    await ctx.db.delete(args.roleId);
    return { success: true };
  },
});

export const assignRoleToUsuario = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    roleId: v.id("roles"),
    sucursalId: v.id("sucursales"),
    fechaExpiracion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usuariosRolesSucursal", {
      usuarioId: args.usuarioId,
      roleId: args.roleId,
      sucursalId: args.sucursalId,
      fechaAsignacion: new Date().toISOString(),
      fechaExpiracion: args.fechaExpiracion,
      activo: true,
    });
  },
});

export const revokeRoleFromUsuario = mutation({
  args: { asignacionId: v.id("usuariosRolesSucursal") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.asignacionId, { activo: false });
    return { success: true };
  },
});

export const getAsignacionesUsuario = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("usuariosRolesSucursal")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", args.usuarioId))
      .collect();
  },
});
