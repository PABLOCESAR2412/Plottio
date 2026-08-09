import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";
import { registrarAccion } from "./lib/auditoria";

/**
 * Módulo de plantillas de precios y categorías de vehículos.
 *
 * Para evitar migrar la UI completa de golpe, este módulo expone tanto
 * queries tipadas (plantillas/categorías) como fallbacks por empresa.
 */

// ============== PLANTILLAS DE PRECIOS ==============

export const getPlantillas = query({
  args: {
    usuarioId: v.id("usuarios"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    // Si no hay plantillas para la empresa, devolver las plantillas de
    // cualquier empresa del sistema como fallback (modo dev).
    const propias = await ctx.db
      .query("plantillasPrecios")
      .filter((q) => q.eq(q.field("empresaId"), userContext.empresa!.id))
      .collect();

    if (propias.length > 0) return propias;

    return await ctx.db.query("plantillasPrecios").collect();
  },
});

export const createPlantillaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    categoriaVehiculo: v.string(),
    concepto: v.string(),
    precioSugerido: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const id = await ctx.db.insert("plantillasPrecios", {
      empresaId: userContext.empresa.id,
      categoriaVehiculo: args.categoriaVehiculo,
      concepto: args.concepto,
      precioSugerido: args.precioSugerido,
    });

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "plantillasPrecios",
      accion: "CREATE",
      registroId: id,
      cambios: { concepto: args.concepto, precioSugerido: args.precioSugerido },
    });

    return await ctx.db.get(id);
  },
});

export const updatePlantillaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    plantillaId: v.id("plantillasPrecios"),
    categoriaVehiculo: v.optional(v.string()),
    concepto: v.optional(v.string()),
    precioSugerido: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const { usuarioId: _u, plantillaId, ...updates } = args;
    await ctx.db.patch(plantillaId, updates);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "plantillasPrecios",
        accion: "UPDATE",
        registroId: plantillaId,
        cambios: updates,
      });
    }

    return await ctx.db.get(plantillaId);
  },
});

export const deletePlantillaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    plantillaId: v.id("plantillasPrecios"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    await ctx.db.delete(args.plantillaId);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "plantillasPrecios",
        accion: "DELETE",
        registroId: args.plantillaId,
      });
    }

    return { success: true };
  },
});

// ============== CATEGORÍAS DE VEHÍCULOS ==============

export const getCategorias = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const propias = await ctx.db
      .query("categoriasPrecios")
      .filter((q) => q.eq(q.field("empresaId"), userContext.empresa!.id))
      .collect();

    if (propias.length > 0) return propias.map((c) => c.nombre);

    return await ctx.db.query("categoriasPrecios").collect().then((cs) => cs.map((c) => c.nombre));
  },
});

/**
 * Devuelve categorías con su _id (necesario para updateCategoriaPrecio /
 * deleteCategoriaPrecio que requieren el id, no el nombre).
 */
export const getCategoriasFull = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const propias = await ctx.db
      .query("categoriasPrecios")
      .filter((q) => q.eq(q.field("empresaId"), userContext.empresa!.id))
      .collect();

    if (propias.length > 0) return propias;

    return await ctx.db.query("categoriasPrecios").collect();
  },
});

export const addCategoriaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    nombre: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const limpia = args.nombre.trim();
    if (!limpia) throw new Error("Nombre de categoría vacío");

    const existente = await ctx.db
      .query("categoriasPrecios")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("nombre"), limpia),
        ),
      )
      .first();
    if (existente) return existente;

    const id = await ctx.db.insert("categoriasPrecios", {
      empresaId: userContext.empresa.id,
      nombre: limpia,
    });
    return await ctx.db.get(id);
  },
});

/**
 * Renombrar una categoría propaga el cambio a:
 * - plantillasPrecios.categoriaVehiculo
 * - vehiculos.categoria
 * - cotizaciones.vehiculoTipo
 * - ordenesTrabajo.vehiculoTipo
 */
export const updateCategoriaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    categoriaId: v.id("categoriasPrecios"),
    nuevoNombre: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const cat = await ctx.db.get(args.categoriaId);
    if (!cat) throw new Error("Categoría no encontrada");
    if (cat.empresaId !== userContext.empresa.id) {
      throw new Error("No pertenece a su empresa");
    }

    const limpia = args.nuevoNombre.trim();
    if (!limpia) throw new Error("Nombre vacío");

    const oldName = cat.nombre;

    // Plantillas
    const plantillas = await ctx.db
      .query("plantillasPrecios")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("categoriaVehiculo"), oldName),
        ),
      )
      .collect();
    for (const p of plantillas) {
      await ctx.db.patch(p._id, { categoriaVehiculo: limpia });
    }

    // Vehículos
    const vehiculos = await ctx.db
      .query("vehiculos")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("categoria"), oldName),
        ),
      )
      .collect();
    for (const v of vehiculos) {
      await ctx.db.patch(v._id, { categoria: limpia });
    }

    // Cotizaciones
    const cots = await ctx.db
      .query("cotizaciones")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("vehiculoTipo"), oldName),
        ),
      )
      .collect();
    for (const c of cots) {
      await ctx.db.patch(c._id, { vehiculoTipo: limpia });
    }

    // Órdenes
    const ordenes = await ctx.db
      .query("ordenesTrabajo")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("vehiculoTipo"), oldName),
        ),
      )
      .collect();
    for (const o of ordenes) {
      await ctx.db.patch(o._id, { vehiculoTipo: limpia });
    }

    await ctx.db.patch(args.categoriaId, { nombre: limpia });

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "categoriasPrecios",
      accion: "UPDATE",
      registroId: args.categoriaId,
      cambios: { oldName, nuevoNombre: limpia },
    });

    return await ctx.db.get(args.categoriaId);
  },
});

export const deleteCategoriaPrecio = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    categoriaId: v.id("categoriasPrecios"),
    fallback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "editar_catalogo");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const cat = await ctx.db.get(args.categoriaId);
    if (!cat) throw new Error("Categoría no encontrada");

    const oldName = cat.nombre;
    const fallback = args.fallback?.trim() || "General";

    // Reasignar plantillas a la categoría fallback
    const plantillas = await ctx.db
      .query("plantillasPrecios")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("categoriaVehiculo"), oldName),
        ),
      )
      .collect();
    for (const p of plantillas) {
      await ctx.db.patch(p._id, { categoriaVehiculo: fallback });
    }

    // Reasignar vehículos
    const vehiculos = await ctx.db
      .query("vehiculos")
      .filter((q) =>
        q.and(
          q.eq(q.field("empresaId"), userContext.empresa!.id),
          q.eq(q.field("categoria"), oldName),
        ),
      )
      .collect();
    for (const v of vehiculos) {
      await ctx.db.patch(v._id, { categoria: fallback });
    }

    await ctx.db.delete(args.categoriaId);

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "categoriasPrecios",
      accion: "DELETE",
      registroId: args.categoriaId,
      cambios: { nombre: oldName, fallback },
    });

    return { success: true };
  },
});
