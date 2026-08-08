import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// 3.1 CREAR FUNCIÓN: getCurrentUserContext()
export async function getCurrentUserContext(ctx: QueryCtx, usuarioId: Id<"usuarios">) {
  const user = await ctx.db.get(usuarioId);
  if (!user) throw new Error("Usuario no encontrado");

  // Obtenemos los roles asignados al usuario
  const userRoles = await ctx.db
    .query("usuariosRolesSucursal")
    .withIndex("by_usuario", (q) => q.eq("usuarioId", user._id))
    .filter((q) => q.eq(q.field("activo"), true))
    .collect();

  const roles = [];
  const permissionsSet = new Set<string>();

  for (const ur of userRoles) {
    const role = await ctx.db.get(ur.roleId);
    if (role && role.activo) {
      roles.push({
        roleId: role._id,
        roleNombre: role.nombre,
        sucursalId: ur.sucursalId,
      });

      // Obtenemos permisos del rol
      const rolePerms = await ctx.db
        .query("rolePermisos")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();

      for (const rp of rolePerms) {
        const perm = await ctx.db.get(rp.permisoId);
        if (perm) permissionsSet.add(perm.nombre);
      }
    }
  }

  let empresa = null;
  if (user.empresaId) {
    const emp = await ctx.db.get(user.empresaId);
    empresa = emp ? { id: emp._id, nombre: emp.nombre } : null;
  }

  let sucursal = null;
  if (user.sucursalId) {
    const suc = await ctx.db.get(user.sucursalId);
    sucursal = suc ? { id: suc._id, nombre: suc.nombre } : null;
  }

  let pv = null;
  if (user.pvId) {
    const pvd = await ctx.db.get(user.pvId);
    pv = pvd ? { id: pvd._id, nombre: pvd.nombre } : null;
  }

  return {
    usuarioId: user._id,
    email: user.email,
    nombre: user.nombre,
    empresa,
    sucursal,
    pv,
    roles,
    permisos: roles.some(r => r.roleNombre === "SuperAdmin") 
        ? ["ver_todas_sucursales", "ver_inventario", ...Array.from(permissionsSet)] 
        : Array.from(permissionsSet),
  };
}

// 3.2 CREAR FUNCIÓN: checkPermission()
export async function checkPermission(
  ctx: QueryCtx,
  usuarioId: Id<"usuarios">,
  permisoRequerido: string,
  sucursalId?: Id<"sucursales">
) {
  const context = await getCurrentUserContext(ctx, usuarioId);
  
  const isSuperAdmin = context.roles.some(r => r.roleNombre === "SuperAdmin");

  if (!isSuperAdmin && !context.permisos.includes(permisoRequerido)) {
    return false;
  }

  if (sucursalId) {
     const hasRoleInSucursal = context.roles.some(r => r.sucursalId === sucursalId);
     if (!hasRoleInSucursal && !context.permisos.includes("ver_todas_sucursales")) {
         return false;
     }
  }

  return true;
}

// 3.4 CREAR MIDDLEWARE: requirePermission()
// En Convex actuamos como un helper guard dentro del handler
export async function requirePermission(
  ctx: QueryCtx,
  usuarioId: Id<"usuarios">,
  permisoRequerido: string,
  sucursalId?: Id<"sucursales">
) {
  const hasPerm = await checkPermission(ctx, usuarioId, permisoRequerido, sucursalId);
  if (!hasPerm) {
    throw new Error(`[403 Forbidden] No tienes permiso para realizar esta acción: ${permisoRequerido}`);
  }
}

// 3.3 CREAR FUNCIÓN: getVisibleSucursales()
export async function getVisibleSucursales(ctx: QueryCtx, usuarioId: Id<"usuarios">) {
    const context = await getCurrentUserContext(ctx, usuarioId);
    if (context.permisos.includes("ver_todas_sucursales") && context.empresa) {
        return await ctx.db
            .query("sucursales")
            .withIndex("by_empresa", q => q.eq("empresaId", context.empresa!.id))
            .filter(q => q.eq(q.field("activa"), true))
            .collect();
    }

    const sucursalIds = new Set(context.roles.map(r => r.sucursalId));
    const sucursales = [];
    for (const id of sucursalIds) {
        const s = await ctx.db.get(id);
        if (s && s.activa) sucursales.push(s);
    }
    return sucursales;
}
