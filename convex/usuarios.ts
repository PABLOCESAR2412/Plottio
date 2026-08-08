import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";

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
    
    // Generate a secure random token for the invite
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    if (!context.empresa) throw new Error("Empresa no encontrada");

    const newUserId = await ctx.db.insert("usuarios", {
      nombre: args.nombre,
      email: args.email,
      rol: args.rol,
      empresaId: context.empresa.id,
      sucursalId: args.sucursalId || context.sucursal?.id, // If admin sucursal, force their sucursal
      activo: false, // inactive until accepted
      invitationToken: token,
      invitationAccepted: false
    });
    
    // In a real app we would send an email via Resend / SendGrid here.
    // For now, we return the token so the frontend can mock it.
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
    
    await ctx.db.patch(user._id, {
      password: args.password,
      invitationAccepted: true,
      activo: true,
      invitationToken: undefined // clear token
    });
    
    return true;
  }
});

// Login real
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

    // Para los usuarios semilla que no tienen contraseña, la asignamos al primer login
    if (!user.password) {
      await ctx.db.patch(user._id, { password: args.password });
      const updatedUser = await ctx.db.get(user._id);
      return updatedUser;
    }

    if (user.password !== args.password) {
      throw new Error("Credenciales incorrectas");
    }

    return user;
  }
});
