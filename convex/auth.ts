import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export type UserContext = {
  usuarioId: Id<"usuarios">;
  email: string;
  nombre: string;
  empresa: { id: Id<"empresas">; nombre: string } | null;
  sucursal?: { id: Id<"sucursales">; nombre: string } | null;
  pv?: { id: Id<"puntosVenta">; nombre: string } | null;
  roles: Array<{ roleId: Id<"roles">; roleNombre: string; sucursalId?: Id<"sucursales"> }>;
  permisos: string[];
  permisosPorSucursal?: Array<{ sucursalId: Id<"sucursales">; permisos: string[] }>;
};

// 3.1 FUNCIÓN: getCurrentUserContext() (Arquitectura Single-Org)
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

  const permisosPorSucursalMap = new Map<string, Set<string>>();

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

      for (const rp of rolePerms) {
        const perm = await ctx.db.get(rp.permisoId);
        if (perm) {
          const clave = perm.clave ?? perm.nombre;
          permissionsSet.add(clave);

          if (ur.sucursalId) {
            if (!permisosPorSucursalMap.has(ur.sucursalId)) {
              permisosPorSucursalMap.set(ur.sucursalId, new Set());
            }
            permisosPorSucursalMap.get(ur.sucursalId)!.add(clave);
          }
        }
      }
    }
  }

  let empresa: UserContext["empresa"] = null;
  if (user.empresaId) {
    const emp = await ctx.db.get(user.empresaId);
    empresa = emp ? { id: emp._id, nombre: emp.nombre } : null;
  }

  // Auto-resolución Single-Org: Si el usuario no tiene empresaId o apunta a una empresa inexistente
  if (!empresa) {
    let defaultEmpresa: any = await ctx.db.query("empresas").first();
    if (!defaultEmpresa && "insert" in ctx.db) {
      const createdId = await (ctx.db as any).insert("empresas", {
        nombre: "Plottio Taller Central",
        ruc: "1790011223001",
        razonSocial: "Plottio Automotriz S.A.",
        activa: true,
      });
      defaultEmpresa = await ctx.db.get(createdId);
    }
    if (defaultEmpresa) {
      if ("patch" in ctx.db) {
        try {
          await (ctx.db as any).patch(user._id, { empresaId: defaultEmpresa._id });
        } catch (e) {
          console.error("Error auto-asociando empresaId al usuario:", e);
        }
      }
      empresa = { id: defaultEmpresa._id, nombre: defaultEmpresa.nombre };
    } else {
      empresa = { id: "empresa_default" as Id<"empresas">, nombre: "Plottio Taller Central" };
    }
  }

  let sucursal: UserContext["sucursal"] = null;
  if (user.sucursalId) {
    const suc = await ctx.db.get(user.sucursalId);
    sucursal = suc ? { id: suc._id, nombre: suc.nombre } : null;
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

  const permisosPorSucursal = Array.from(permisosPorSucursalMap.entries()).map(
    ([sucId, perms]) => ({
      sucursalId: sucId as Id<"sucursales">,
      permisos: Array.from(perms),
    })
  );

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

// 3.2 FUNCIÓN: checkPermission() (Single-Org con retrocompatibilidad de scope)
export async function checkPermission(
  ctx: QueryCtx,
  usuarioId: Id<"usuarios">,
  permisoRequerido: string,
  sucursalId?: Id<"sucursales">
) {
  const context = await getCurrentUserContext(ctx, usuarioId);
  const isSuperAdmin = context.roles.some((r) => r.roleNombre === "SuperAdmin");

  if (isSuperAdmin) return true;

  if (context.permisos.includes("ver_todas_sucursales")) {
    return context.permisos.includes(permisoRequerido);
  }

  if (sucursalId) {
    const sucPerms = (context.permisosPorSucursal || []).find(
      (p) => p.sucursalId === sucursalId
    );
    if (sucPerms) {
      return sucPerms.permisos.includes(permisoRequerido);
    }
    const hasGlobalRoles = context.roles.some((r) => !r.sucursalId);
    if (hasGlobalRoles) {
      return context.permisos.includes(permisoRequerido);
    }
    return false;
  }

  return context.permisos.includes(permisoRequerido);
}

// 3.4 MIDDLEWARE: requirePermission()
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

// 3.3 FUNCIÓN: getVisibleSucursales() (Compatibilidad Single-Org)
export async function getVisibleSucursales(ctx: QueryCtx, usuarioId: Id<"usuarios">) {
  const context = await getCurrentUserContext(ctx, usuarioId);
  if (context.empresa) {
    return await ctx.db
      .query("sucursales")
      .withIndex("by_empresa", (q) => q.eq("empresaId", context.empresa!.id))
      .filter((q) => q.eq(q.field("activa"), true))
      .collect();
  }
  return [];
}
