import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUserContext, requirePermission } from "./auth";
import { registrarAccion } from "./lib/auditoria";

export const getServicios = query({
  args: {
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");

    let servicios;
    if (esSuperAdmin) {
      servicios = await ctx.db.query("catalogoServicios").collect();
    } else {
      if (!userContext.empresa) return [];
      servicios = await ctx.db
        .query("catalogoServicios")
        .withIndex("by_empresa", (q) => q.eq("empresaId", userContext.empresa!.id))
        .collect();
    }

    return servicios.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
});

export const createServicio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    nombre: v.string(),
    categoria: v.string(),
    precioBase: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Usuario sin empresa asignada");

    const id = await ctx.db.insert("catalogoServicios", {
      empresaId: userContext.empresa.id,
      nombre: args.nombre,
      categoria: args.categoria,
      precioBase: args.precioBase,
      activo: true,
      fechaCreacion: new Date().toISOString()
    });

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "catalogoServicios",
      accion: "CREATE",
      registroId: id,
      cambios: { nombre: args.nombre, precioBase: args.precioBase },
    });

    return await ctx.db.get(id);
  }
});

export const toggleActivo = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("catalogoServicios"),
    activo: v.boolean()
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const servicio = await ctx.db.get(args.id);
    if (!servicio) throw new ConvexError("Servicio no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && servicio.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este servicio");
    }

    await ctx.db.patch(args.id, { activo: args.activo });

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "catalogoServicios",
        accion: "UPDATE",
        registroId: args.id,
        cambios: { activo: args.activo },
      });
    }

    return await ctx.db.get(args.id);
  }
});

export const updateServicio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("catalogoServicios"),
    nombre: v.optional(v.string()),
    categoria: v.optional(v.string()),
    precioBase: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const servicio = await ctx.db.get(args.id);
    if (!servicio) throw new ConvexError("Servicio no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && servicio.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para modificar este servicio");
    }

    const { usuarioId: _u, id, ...updates } = args;
    await ctx.db.patch(id, updates);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "catalogoServicios",
        accion: "UPDATE",
        registroId: id,
        cambios: updates,
      });
    }

    return await ctx.db.get(id);
  }
});

export const deleteServicio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    id: v.id("catalogoServicios"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const servicio = await ctx.db.get(args.id);
    if (!servicio) throw new ConvexError("Servicio no encontrado");

    const esSuperAdmin = userContext.roles.some((r) => r.roleNombre === "SuperAdmin");
    if (!esSuperAdmin && servicio.empresaId !== userContext.empresa?.id) {
      throw new ConvexError("No autorizado para eliminar este servicio");
    }

    await ctx.db.delete(args.id);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "catalogoServicios",
        accion: "DELETE",
        registroId: args.id,
      });
    }

    return { success: true };
  }
});
