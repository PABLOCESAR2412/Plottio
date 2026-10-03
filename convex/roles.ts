import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";

export const getRoles = query({
  args: {
    usuarioId: v.id("usuarios"),
    empresaId: v.optional(v.id("empresas")),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    if (isSuperAdmin) {
      if (args.empresaId) {
        return await ctx.db
          .query("roles")
          .withIndex("by_empresa", (q) => q.eq("empresaId", args.empresaId))
          .filter((q) => q.eq(q.field("activo"), true))
          .collect();
      }
      return await ctx.db
        .query("roles")
        .filter((q) => q.eq(q.field("activo"), true))
        .collect();
    }

    if (!userContext.empresa) return [];
    const allRoles = await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();

    return allRoles.filter((r) => !r.empresaId || r.empresaId === userContext.empresa!.id);
  },
});

export const createRole = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    empresaId: v.optional(v.id("empresas")),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    permisosIds: v.array(v.id("permisos")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    let targetEmpresaId = args.empresaId;
    if (!isSuperAdmin) {
      if (!userContext.empresa) {
        throw new ConvexError("El usuario debe estar asignado a una empresa para crear roles");
      }
      if (args.empresaId && args.empresaId !== userContext.empresa.id) {
        throw new ConvexError("No tiene permisos para crear roles en otra empresa");
      }
      targetEmpresaId = userContext.empresa.id;
    }

    const roleId = await ctx.db.insert("roles", {
      empresaId: targetEmpresaId,
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
    usuarioId: v.id("usuarios"),
    roleId: v.id("roles"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    permisosIds: v.array(v.id("permisos")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const role = await ctx.db.get(args.roleId);
    if (!role) throw new ConvexError("Rol no encontrado");

    if (!isSuperAdmin) {
      if (!userContext.empresa || role.empresaId !== userContext.empresa.id) {
        throw new ConvexError("No tiene permisos para modificar roles de otra empresa o roles del sistema");
      }
    }

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

    return { success: true };
  },
});

export const deleteRole = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const role = await ctx.db.get(args.roleId);
    if (!role) throw new ConvexError("Rol no encontrado");

    if (!isSuperAdmin) {
      if (!userContext.empresa || role.empresaId !== userContext.empresa.id) {
        throw new ConvexError("No tiene permisos para eliminar roles de otra empresa o roles del sistema");
      }
    }

    // Verificar que no tenga usuarios asignados activos
    const asignaciones = await ctx.db
      .query("usuariosRolesSucursal")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
    if (asignaciones.length > 0) {
      throw new ConvexError(
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
    targetUsuarioId: v.optional(v.id("usuarios")),
    roleId: v.id("roles"),
    sucursalId: v.id("sucursales"),
    fechaExpiracion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const role = await ctx.db.get(args.roleId);
    if (!role) throw new ConvexError("Rol no encontrado");

    if (!isSuperAdmin) {
      if (role.empresaId && (!userContext.empresa || role.empresaId !== userContext.empresa.id)) {
        throw new ConvexError("No tiene permisos para asignar roles de otra empresa");
      }
    }

    const targetUser = args.targetUsuarioId ?? args.usuarioId;

    return await ctx.db.insert("usuariosRolesSucursal", {
      usuarioId: targetUser,
      roleId: args.roleId,
      sucursalId: args.sucursalId,
      fechaAsignacion: new Date().toISOString(),
      fechaExpiracion: args.fechaExpiracion,
      activo: true,
    });
  },
});

export const revokeRoleFromUsuario = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    asignacionId: v.id("usuariosRolesSucursal"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    const asignacion = await ctx.db.get(args.asignacionId);
    if (!asignacion) throw new ConvexError("Asignación no encontrada");

    const role = await ctx.db.get(asignacion.roleId);
    if (!role) throw new ConvexError("Rol no encontrado");

    if (!isSuperAdmin) {
      if (role.empresaId && (!userContext.empresa || role.empresaId !== userContext.empresa.id)) {
        throw new ConvexError("No tiene permisos para revocar roles de otra empresa");
      }
    }

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
