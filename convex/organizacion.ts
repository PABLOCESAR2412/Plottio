import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserContext } from "./auth";

/**
 * Módulo de Organización de Plottio (Arquitectura Single-Org).
 * 
 * - La aplicación opera sobre una organización / taller central único.
 * - La tabla `empresas` se utiliza exclusivamente para clientes corporativos / flotas B2B.
 * - Toda la lógica multi-sucursal y puntos de venta está deprecada y desactivada.
 */

// --- EMPRESAS CLIENTES & FLOTAS B2B ---
export const getEmpresas = query({
  handler: async (ctx) => {
    const empresas = await ctx.db
      .query("empresas")
      .filter((q) => q.eq(q.field("activa"), true))
      .collect();

    return await Promise.all(empresas.map(async (emp) => {
      let url = emp.logoUrl;
      if (url && !/^https?:\/\//i.test(url)) {
        url = (await ctx.storage.getUrl(url as Id<"_storage">)) || url;
      }
      return { ...emp, logoUrl: url };
    }));
  }
});

export const createEmpresa = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    nombre: v.string(),
    ruc: v.string(),
    razonSocial: v.string(),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    const canCreateCliente = userContext.permisos.includes("crear_cliente");
    if (!isSuperAdmin && !canCreateCliente) {
      throw new ConvexError("Solo SuperAdmin o usuarios con permiso 'crear_cliente' pueden crear empresas clientes");
    }

    const { usuarioId: _u, ...empresaData } = args;

    const existing = await ctx.db
      .query("empresas")
      .filter((q) => q.eq(q.field("ruc"), args.ruc))
      .first();
    if (existing) {
      if (existing.activa) {
        throw new ConvexError(`Ya existe una empresa activa con el RUC ${args.ruc}`);
      }
      // Si la empresa existía pero estaba desactivada (archivada), la reactivamos
      await ctx.db.patch(existing._id, {
        ...empresaData,
        activa: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("empresas", {
      ...empresaData,
      activa: true,
    });
  }
});

export const updateEmpresa = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("empresas"),
    nombre: v.optional(v.string()),
    ruc: v.optional(v.string()),
    razonSocial: v.optional(v.string()),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    activa: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    const isOwnEmpresa = Boolean(userContext.empresa && userContext.empresa.id === args.id);

    if (isOwnEmpresa) {
      if (!isSuperAdmin) {
        throw new ConvexError("Solo SuperAdmin puede actualizar la empresa del taller");
      }
    } else {
      const canCreateCliente = userContext.permisos.includes("crear_cliente");
      if (!isSuperAdmin && !canCreateCliente) {
        throw new ConvexError("Solo SuperAdmin o usuarios con permiso 'crear_cliente' pueden actualizar empresas clientes");
      }
    }

    if (args.ruc && args.ruc.trim() !== "") {
      const existing = await ctx.db
        .query("empresas")
        .filter((q) => q.eq(q.field("ruc"), args.ruc))
        .first();
      if (existing && existing._id !== args.id && existing.activa) {
        throw new ConvexError(`Ya existe una empresa activa con el RUC ${args.ruc}`);
      }
    }

    const { usuarioId: _u, id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});

export const deleteEmpresa = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("empresas"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    const isOwnEmpresa = Boolean(userContext.empresa && userContext.empresa.id === args.id);

    if (isOwnEmpresa) {
      if (!isSuperAdmin) {
        throw new ConvexError("Solo SuperAdmin puede desactivar la empresa del taller");
      }
    } else {
      const canCreateCliente = userContext.permisos.includes("crear_cliente");
      if (!isSuperAdmin && !canCreateCliente) {
        throw new ConvexError("Solo SuperAdmin o usuarios con permiso 'crear_cliente' pueden desactivar empresas clientes");
      }
    }

    const empresa = await ctx.db.get(args.id);
    if (!empresa) throw new ConvexError("Empresa no encontrada");

    await ctx.db.patch(args.id, { activa: false });
    return { success: true, archived: true };
  }
});

// --- LOGO / BRANDING ---

export const generateLogoUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  }
});

export const getEmpresaBranding = query({
  args: { empresaId: v.id("empresas") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.empresaId);
    if (!emp) return { nombre: null, logoUrl: null };
    let logoUrl: string | null = null;
    if (emp.logoUrl) {
      logoUrl = /^https?:\/\//i.test(emp.logoUrl)
        ? emp.logoUrl
        : await ctx.storage.getUrl(emp.logoUrl as Id<"_storage">);
    }
    return { nombre: emp.nombre, logoUrl };
  }
});

// --- SUCURSALES & PUNTOS DE VENTA (STUBS DEPRECATED PARA SINGLE-ORG) ---

export const getSucursales = query({
  args: { empresaId: v.optional(v.id("empresas")) },
  handler: async (ctx, args) => {
    const empresaId = args.empresaId;
    if (!empresaId) {
      return await ctx.db.query("sucursales").collect();
    }
    return await ctx.db
      .query("sucursales")
      .withIndex("by_empresa", (q) => q.eq("empresaId", empresaId))
      .collect();
  }
});

export const createSucursal = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    empresaId: v.id("empresas"),
    nombre: v.string(),
    ruc: v.optional(v.string()),
    direccion: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    gerenteTelefono: v.optional(v.string()),
    esMatriz: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      if (!userContext.empresa || userContext.empresa.id !== args.empresaId) {
        throw new ConvexError("No tiene permisos para crear sucursales en otra empresa");
      }
    }

    const { usuarioId: _u, ...sucursalData } = args;
    return await ctx.db.insert("sucursales", {
      ...sucursalData,
      esMatriz: args.esMatriz ?? false,
      activa: true,
    });
  }
});

export const updateSucursal = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("sucursales"),
    nombre: v.optional(v.string()),
    ruc: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    gerenteTelefono: v.optional(v.string()),
    esMatriz: v.optional(v.boolean()),
    activa: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      const sucursal = await ctx.db.get(args.id);
      if (!sucursal || (userContext.empresa && sucursal.empresaId !== userContext.empresa.id)) {
        throw new ConvexError("No tiene permisos para modificar sucursales de otra empresa");
      }
    }
    const { usuarioId: _u, id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});

export const deleteSucursal = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("sucursales"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      const sucursal = await ctx.db.get(args.id);
      if (!sucursal || (userContext.empresa && sucursal.empresaId !== userContext.empresa.id)) {
        throw new ConvexError("No tiene permisos para eliminar sucursales de otra empresa");
      }
    }
    await ctx.db.delete(args.id);
    return { success: true };
  }
});

export const getPuntosVenta = query({
  args: { sucursalId: v.optional(v.id("sucursales")) },
  handler: async (ctx, args) => {
    const sucursalId = args.sucursalId;
    if (!sucursalId) {
      return await ctx.db.query("puntosVenta").collect();
    }
    return await ctx.db
      .query("puntosVenta")
      .withIndex("by_sucursal", (q) => q.eq("sucursalId", sucursalId))
      .collect();
  }
});

export const createPuntoVenta = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    sucursalId: v.id("sucursales"),
    nombre: v.string(),
    codigo: v.string(),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    horarioApertura: v.optional(v.string()),
    horarioCierre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      const sucursal = await ctx.db.get(args.sucursalId);
      if (!sucursal || (userContext.empresa && sucursal.empresaId !== userContext.empresa.id)) {
        throw new ConvexError("No tiene permisos para crear puntos de venta en otra empresa");
      }
    }
    const { usuarioId: _u, ...pvData } = args;
    return await ctx.db.insert("puntosVenta", {
      ...pvData,
      activo: true,
    });
  }
});

export const updatePuntoVenta = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("puntosVenta"),
    nombre: v.optional(v.string()),
    codigo: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    horarioApertura: v.optional(v.string()),
    horarioCierre: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      const pv = await ctx.db.get(args.id);
      if (pv) {
        const sucursal = await ctx.db.get(pv.sucursalId);
        if (!sucursal || (userContext.empresa && sucursal.empresaId !== userContext.empresa.id)) {
          throw new ConvexError("No tiene permisos para modificar puntos de venta de otra empresa");
        }
      }
    }
    const { usuarioId: _u, id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  }
});

export const deletePuntoVenta = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("puntosVenta"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const isSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!isSuperAdmin) {
      const pv = await ctx.db.get(args.id);
      if (pv) {
        const sucursal = await ctx.db.get(pv.sucursalId);
        if (!sucursal || (userContext.empresa && sucursal.empresaId !== userContext.empresa.id)) {
          throw new ConvexError("No tiene permisos para eliminar puntos de venta de otra empresa");
        }
      }
    }
    await ctx.db.delete(args.id);
    return { success: true };
  }
});
