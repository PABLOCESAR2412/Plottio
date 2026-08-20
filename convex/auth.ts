import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export type UserContext = {
  usuarioId: Id<"usuarios">;
  email: string;
  nombre: string;
  empresa: { id: Id<"empresas">; nombre: string } | null;
  sucursal: { id: Id<"sucursales">; nombre: string } | null;
  pv: { id: Id<"puntosVenta">; nombre: string } | null;
  roles: Array<{ roleId: Id<"roles">; roleNombre: string; sucursalId: Id<"sucursales"> }>;
  permisos: string[];
  permisosPorSucursal: Array<{ sucursalId: Id<"sucursales">; permisos: string[] }>;
};

// 3.1 CREAR FUNCIÓN: getCurrentUserContext()
export async function getCurrentUserContext(
  ctx: QueryCtx,
  usuarioId: Id<"usuarios">,
): Promise<UserContext> {
  const user = await ctx.db.get(usuarioId);
  if (!user) throw new ConvexError("Usuario no encontrado");

  const userRoles = await ctx.db
    .query("usuariosRolesSucursal")
    .withIndex("by_usuario", (q) => q.eq("usuarioId", user._id))
    .filter((q) => q.eq(q.field("activo"), true))
    .collect();

  const roles: UserContext["roles"] = [];
  const permissionsSet = new Set<string>();
  const permisosPorSucursalMap = new Map<Id<"sucursales">, Set<string>>();

  for (const ur of userRoles) {
    const role = await ctx.db.get(ur.roleId);
    if (role && role.activo) {
      roles.push({
        roleId: role._id,
        roleNombre: role.nombre,
        sucursalId: ur.sucursalId,
      });

      const rolePerms = await ctx.db
        .query("rolePermisos")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();

      const sucursalSet = permisosPorSucursalMap.get(ur.sucursalId) ?? new Set<string>();
      for (const rp of rolePerms) {
        const perm = await ctx.db.get(rp.permisoId);
        if (perm) {
          const clave = perm.clave ?? perm.nombre;
          permissionsSet.add(clave);
          sucursalSet.add(clave);
        }
      }
      permisosPorSucursalMap.set(ur.sucursalId, sucursalSet);
    }
  }

  const permisosPorSucursal: UserContext["permisosPorSucursal"] = [];
  for (const [sucursalId, permisos] of permisosPorSucursalMap.entries()) {
    permisosPorSucursal.push({ sucursalId, permisos: Array.from(permisos) });
  }

  let empresa: UserContext["empresa"] = null;
  if (user.empresaId) {
    const emp = await ctx.db.get(user.empresaId);
    empresa = emp ? { id: emp._id, nombre: emp.nombre } : null;
  }

  let sucursal: UserContext["sucursal"] = null;
  if (user.sucursalId) {
    const suc = await ctx.db.get(user.sucursalId);
    sucursal = suc ? { id: suc._id, nombre: suc.nombre } : null;
  }

  // Fallback: si el usuario no tiene empresa/sucursal asignadas en su documento,
  // derivarlas de sus roles (usuariosRolesSucursal) o de la primera empresa/sucursal
  // activa en caso de SuperAdmin. Evita errores tipo "usuario necesita estar
  // asignado a una Empresa y Sucursal" y consultas vacías para admins sin contexto.
  if (!empresa || !sucursal) {
    for (const r of roles) {
      const suc = await ctx.db.get(r.sucursalId);
      if (!suc) continue;
      if (!sucursal) sucursal = { id: suc._id, nombre: suc.nombre };
      if (!empresa) {
        const emp = suc.empresaId ? await ctx.db.get(suc.empresaId) : null;
        if (emp) empresa = { id: emp._id, nombre: emp.nombre };
      }
    }
  }

  if (!empresa || !sucursal) {
    const esSuperAdmin = roles.some((r) => r.roleNombre === "SuperAdmin");
    if (esSuperAdmin) {
      if (!empresa) {
        const emp = await ctx.db
          .query("empresas")
          .filter((q) => q.eq(q.field("activa"), true))
          .first();
        if (emp) empresa = { id: emp._id, nombre: emp.nombre };
      }
      if (!sucursal && empresa) {
        const empresaId = empresa.id;
        const suc = await ctx.db
          .query("sucursales")
          .withIndex("by_empresa", (q) => q.eq("empresaId", empresaId))
          .filter((q) => q.eq(q.field("activa"), true))
          .first();
        if (suc) sucursal = { id: suc._id, nombre: suc.nombre };
      }
    }
  }

  let pv: UserContext["pv"] = null;
  if (user.pvId) {
    const pvd = await ctx.db.get(user.pvId);
    pv = pvd ? { id: pvd._id, nombre: pvd.nombre } : null;
  }

  const esSuperAdmin = roles.some((r) => r.roleNombre === "SuperAdmin");
  const permisos = esSuperAdmin
    ? ["ver_todas_sucursales", ...Array.from(permissionsSet)]
    : Array.from(permissionsSet);

  return {
    usuarioId: user._id,
    email: user.email,
    nombre: user.nombre,
    empresa,
    sucursal,
    pv,
    roles,
    permisos,
    permisosPorSucursal,
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

  // SuperAdmin tiene todos los permisos en todas las sucursales
  if (isSuperAdmin) return true;

  if (!context.permisos.includes(permisoRequerido)) {
    return false;
  }

  // Si se especifica sucursal, el permiso debe estar concedido EN esa sucursal
  if (sucursalId) {
    const scoped = context.permisosPorSucursal.find(s => s.sucursalId === sucursalId);
    if (scoped && scoped.permisos.includes(permisoRequerido)) return true;
    // ver_todas_sucursales permite operar en cualquier sucursal
    if (context.permisos.includes("ver_todas_sucursales")) return true;
    return false;
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
    throw new ConvexError(`[403 Forbidden] No tienes permiso para realizar esta acción: ${permisoRequerido}`);
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
