import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUserContext, requirePermission } from "./auth";
import {
  generateSecureToken,
  hashPassword,
  isBcryptHash,
  verifyPassword,
} from "./lib/crypto";

// Fetch users depending on role
export const getUsuarios = query({
  args: {
    usuarioId: v.id("usuarios")
  },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.usuarioId);
    const esSuperAdmin = context.roles.some(r => r.roleNombre === 'SuperAdmin');
    
    if (esSuperAdmin) {
      // Super Admin ve todos
      const usuarios = await ctx.db.query("usuarios").collect();
      return usuarios.map(({ password: _, ...u }) => u);
    } else {
      // Admin Sucursal ve solo su sucursal
      await requirePermission(ctx, args.usuarioId, "ver_usuarios");
      if (!context.sucursal) throw new ConvexError("Contexto de sucursal no encontrado");
      
      const usuarios = await ctx.db
        .query("usuarios")
        .withIndex("by_sucursal", q => q.eq("sucursalId", context.sucursal!.id))
        .collect();
      return usuarios.map(({ password: _, ...u }) => u);
    }
  }
});

// Invite a new user
export const invitarUsuario = mutation({
  args: {
    adminId: v.id("usuarios"),
    nombre: v.string(),
    email: v.string(),
    rol: v.string(),
    sucursalId: v.optional(v.id("sucursales"))
  },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.adminId);
    await requirePermission(ctx, args.adminId, "crear_usuarios");

    // Check if email exists
    const existente = await ctx.db
      .query("usuarios")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (existente) {
      throw new ConvexError("El correo electrónico ya está registrado.");
    }

    // Token criptográficamente seguro (UUID v4)
    const token = generateSecureToken();

    if (!context.empresa) throw new ConvexError("Empresa no encontrada");

    const newUserId = await ctx.db.insert("usuarios", {
      nombre: args.nombre,
      email: args.email,
      rol: args.rol,
      empresaId: context.empresa.id,
      sucursalId: args.sucursalId || context.sucursal?.id,
      activo: false,
      invitationToken: token,
      invitationAccepted: false
    });

    return {
      userId: newUserId,
      token,
      message: "Usuario invitado correctamente."
    };
  }
});

// Query to get user by invitation token
export const getUserByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("usuarios")
      .withIndex("by_invitation_token", (q) => q.eq("invitationToken", args.token))
      .collect();
    if (users.length === 0) return null;
    const { password: _, ...usuarioSeguro } = users[0];
    return {
      id: usuarioSeguro._id,
      nombre: usuarioSeguro.nombre,
      email: usuarioSeguro.email,
      invitationAccepted: usuarioSeguro.invitationAccepted
    };
  }
});

// Internal query: usuario por token de invitación (usado por la action)
export const getUserByTokenInternal = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<Doc<"usuarios"> | null> => {
    return await ctx.db
      .query("usuarios")
      .withIndex("by_invitation_token", (q) => q.eq("invitationToken", args.token))
      .first();
  },
});

// Internal query: usuario por email (usado por la action de login)
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<Doc<"usuarios"> | null> => {
    return await ctx.db
      .query("usuarios")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Internal query: usuario por id (usado por la action de login)
export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("usuarios") },
  handler: async (ctx, args): Promise<Doc<"usuarios"> | null> => {
    return await ctx.db.get(args.userId);
  },
});

// Internal mutation: aceptar invitación y fijar password (usado por la action)
export const aceptarInvitacionInternal = internalMutation({
  args: {
    userId: v.id("usuarios"),
    hashed: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      password: args.hashed,
      invitationAccepted: true,
      activo: true,
      invitationToken: null,
    });
  },
});

// Accept invitation and set password
export const aceptarInvitacion = action({
  args: {
    token: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.usuarios.getUserByTokenInternal, {
      token: args.token,
    });
    if (!user) throw new ConvexError("Token inválido o expirado.");

    if (user.invitationAccepted) throw new ConvexError("Esta invitación ya fue aceptada.");

    // bcrypt requiere ejecutarse en una action (usa scheduling interno).
    const hashed = await hashPassword(args.password);

    await ctx.runMutation(internal.usuarios.aceptarInvitacionInternal, {
      userId: user._id,
      hashed,
    });

    return true;
  }
});

// CRUD de usuarios (sólo accesible para administradores)

/**
 * Remueve campos sensibles como `password` antes de enviar el usuario al cliente.
 */
export function sanitizarUsuario<T extends { password?: string }>(usuario: T): Omit<T, "password"> {
  const { password: _, ...usuarioSeguro } = usuario;
  return usuarioSeguro;
}

export const updateUsuario = mutation({
  args: {
    adminId: v.id("usuarios"),
    usuarioId: v.id("usuarios"),
    nombre: v.optional(v.string()),
    rol: v.optional(v.string()),
    sucursalId: v.optional(v.id("sucursales")),
    pvId: v.optional(v.id("puntosVenta")),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.adminId, "crear_usuarios");
    const { adminId: _a, usuarioId, ...updates } = args;
    await ctx.db.patch(usuarioId, updates);
    const updated = await ctx.db.get(usuarioId);
    if (!updated) return null;
    const { password: _, ...usuarioSeguro } = updated;
    return usuarioSeguro;
  }
});

export const archiveUsuario = mutation({
  args: {
    adminId: v.id("usuarios"),
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.adminId, "crear_usuarios");
    await ctx.db.patch(args.usuarioId, { activo: false });
    const updated = await ctx.db.get(args.usuarioId);
    if (!updated) return null;
    const { password: _, ...usuarioSeguro } = updated;
    return usuarioSeguro;
  }
});

export const deleteUsuario = mutation({
  args: {
    adminId: v.id("usuarios"),
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.adminId, "crear_usuarios");

    const target = await ctx.db.get(args.usuarioId);
    if (!target) throw new ConvexError("Usuario no encontrado");

    // Evitar borrar al último SuperAdmin activo
    if (target.rol === "SuperAdmin") {
      const otrosSuperAdmins = await ctx.db
        .query("usuarios")
        .filter((q) =>
          q.and(
            q.eq(q.field("rol"), "SuperAdmin"),
            q.eq(q.field("activo"), true),
          ),
        )
        .collect();
      const vivos = otrosSuperAdmins.filter(u => u._id !== args.usuarioId);
      if (vivos.length === 0) {
        throw new ConvexError(
          "No se puede eliminar al único SuperAdmin activo del sistema.",
        );
      }
    }

    // Limpiar asignaciones de rol
    const asignaciones = await ctx.db
      .query("usuariosRolesSucursal")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", args.usuarioId))
      .collect();
    for (const a of asignaciones) {
      await ctx.db.delete(a._id);
    }

    await ctx.db.delete(args.usuarioId);
    return { success: true };
  }
});

// Login real — con verificación bcrypt y migración suave desde texto plano.
// Es una action porque bcrypt internamente usa scheduling que las mutations
// de Convex no permiten. Como action, puede hacer runQuery/runMutation.
export const login = action({
  args: {
    email: v.string(),
    password: v.string()
  },
  handler: async (ctx, args): Promise<Omit<Doc<"usuarios">, "password"> | null> => {
    const user = await ctx.runQuery(internal.usuarios.getUserByEmailInternal, {
      email: args.email,
    });

    if (!user) throw new ConvexError("Credenciales incorrectas");
    if (!user.activo) throw new ConvexError("Tu cuenta está inactiva");

    const stored = user.password ?? null;

    let usuarioAutenticado: Doc<"usuarios"> | null = null;

    // Caso 1: usuario sin password (primer login / recién invitado)
    if (stored === null) {
      const hashed = await hashPassword(args.password);
      await ctx.runMutation(internal.usuarios.setPasswordInternal, {
        userId: user._id,
        hashed,
      });
      usuarioAutenticado = await ctx.runQuery(internal.usuarios.getUserByIdInternal, {
        userId: user._id,
      });
    } else if (isBcryptHash(stored)) {
      // Caso 2: hash bcrypt
      const ok = await verifyPassword(args.password, stored);
      if (!ok) throw new ConvexError("Credenciales incorrectas");
      usuarioAutenticado = await ctx.runQuery(internal.usuarios.getUserByIdInternal, {
        userId: user._id,
      });
    } else if (args.password === stored) {
      // Caso 3: texto plano legacy → verificar, re-hashear y guardar
      const hashed = await hashPassword(args.password);
      await ctx.runMutation(internal.usuarios.setPasswordInternal, {
        userId: user._id,
        hashed,
      });
      usuarioAutenticado = await ctx.runQuery(internal.usuarios.getUserByIdInternal, {
        userId: user._id,
      });
    } else {
      throw new ConvexError("Credenciales incorrectas");
    }

    if (!usuarioAutenticado) return null;

    const { password: _, ...usuarioSeguro } = usuarioAutenticado;
    return usuarioSeguro;
  }
});

/**
 * Mutación interna para actualizar el password de un usuario.
 * NO está expuesta al cliente (es internal).
 */
export const setPasswordInternal = internalMutation({
  args: {
    userId: v.id("usuarios"),
    hashed: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { password: args.hashed });
  },
});
