import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
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
      return await ctx.db.query("usuarios").collect();
    } else {
      // Admin Sucursal ve solo su sucursal
      await requirePermission(ctx, args.usuarioId, "ver_usuarios");
      if (!context.sucursal) throw new Error("Contexto de sucursal no encontrado");
      
      return await ctx.db
        .query("usuarios")
        .withIndex("by_sucursal", q => q.eq("sucursalId", context.sucursal!.id))
        .collect();
    }
  }
});

// Query pública solo para el simulador de Login
export const getAllPublicUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("usuarios").filter(q => q.eq(q.field("activo"), true)).collect();
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
      throw new Error("El correo electrónico ya está registrado.");
    }

    // Token criptográficamente seguro (UUID v4)
    const token = generateSecureToken();

    if (!context.empresa) throw new Error("Empresa no encontrada");

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
    const users = await ctx.db.query("usuarios").filter(q => q.eq(q.field("invitationToken"), args.token)).collect();
    if (users.length === 0) return null;
    return {
      id: users[0]._id,
      nombre: users[0].nombre,
      email: users[0].email,
      invitationAccepted: users[0].invitationAccepted
    };
  }
});

// Accept invitation and set password
export const aceptarInvitacion = mutation({
  args: {
    token: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("usuarios").filter(q => q.eq(q.field("invitationToken"), args.token)).collect();
    if (users.length === 0) throw new Error("Token inválido o expirado.");

    const user = users[0];
    if (user.invitationAccepted) throw new Error("Esta invitación ya fue aceptada.");

    // El hashing se hace en una action porque bcrypt usa scheduling interno
    // y las mutations de Convex no permiten setTimeout.
    const hashed = await ctx.runAction(internal.usuarios.hashPasswordAction, {
      plain: args.password,
    });

    await ctx.db.patch(user._id, {
      password: hashed,
      invitationAccepted: true,
      activo: true,
      invitationToken: undefined
    });

    return true;
  }
});

// CRUD de usuarios (sólo accesible para administradores)

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
    return await ctx.db.get(usuarioId);
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
    return await ctx.db.get(args.usuarioId);
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
    if (!target) throw new Error("Usuario no encontrado");

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
        throw new Error(
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
// La verificación de password se delega a una action porque bcrypt
// internamente usa scheduling que las mutations de Convex no permiten.
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("usuarios")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("Credenciales incorrectas");
    if (!user.activo) throw new Error("Tu cuenta está inactiva");

    // Delegamos a la action. Devuelve el user con password ya migrado a hash
    // si era el caso de "primer login" o "legacy plaintext".
    const userId = await ctx.runAction(internal.usuarios.verifyPasswordAction, {
      userId: user._id,
      plain: args.password,
      stored: user.password ?? null,
    });

    return await ctx.db.get(userId);
  }
});

/**
 * Hashea una contraseña usando bcrypt.
 * SOLO se llama desde actions (no desde mutations).
 * Expuesto como internal para que `aceptarInvitacion` lo use sin
 * que el cliente pueda invocarlo directamente.
 */
export const hashPasswordAction = internalAction({
  args: { plain: v.string() },
  handler: async (_ctx, args) => {
    return await hashPassword(args.plain);
  },
});

/**
 * Verifica la contraseña de un usuario.
 * - Si `stored === null`: primer login → hashea y guarda.
 * - Si es hash bcrypt: compara.
 * - Si es texto plano legacy: compara, re-hashea y guarda.
 * Devuelve el `userId` actualizado.
 */
export const verifyPasswordAction = internalAction({
  args: {
    userId: v.id("usuarios"),
    plain: v.string(),
    stored: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    // Caso 1: usuario sin password (primer login / recién invitado)
    if (args.stored === null) {
      const hashed = await hashPassword(args.plain);
      await ctx.runMutation(internal.usuarios.setPasswordInternal, {
        userId: args.userId,
        hashed,
      });
      return args.userId;
    }

    // Caso 2: hash bcrypt
    if (isBcryptHash(args.stored)) {
      const ok = await verifyPassword(args.plain, args.stored);
      if (!ok) throw new Error("Credenciales incorrectas");
      return args.userId;
    }

    // Caso 3: texto plano legacy
    if (args.stored === args.plain) {
      const hashed = await hashPassword(args.plain);
      await ctx.runMutation(internal.usuarios.setPasswordInternal, {
        userId: args.userId,
        hashed,
      });
      return args.userId;
    }

    throw new Error("Credenciales incorrectas");
  },
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
