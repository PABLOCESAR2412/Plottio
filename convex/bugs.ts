import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserContext, requirePermission } from "./auth";
import { registrarAccion } from "./lib/auditoria";

const tipoValidator = v.union(
  v.literal("Visual"),
  v.literal("Logica"),
  v.literal("Otro"),
);

const importanciaValidator = v.union(
  v.literal("Baja"),
  v.literal("Media"),
  v.literal("Alta"),
  v.literal("Critica"),
);

const estadoValidator = v.union(
  v.literal("Abierto"),
  v.literal("En Progreso"),
  v.literal("Resuelto"),
);

export const createBug = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    titulo: v.string(),
    descripcion: v.string(),
    tipo: tipoValidator,
    importancia: importanciaValidator,
    ruta: v.string(),
    imagenes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new Error("Usuario sin empresa asignada");

    const bugId = await ctx.db.insert("bugs", {
      titulo: args.titulo,
      descripcion: args.descripcion,
      tipo: args.tipo,
      importancia: args.importancia,
      ruta: args.ruta,
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString(),
      usuarioId: args.usuarioId,
      usuarioNombre: userContext.nombre,
      sucursalId: userContext.sucursal?.id,
      empresaId: userContext.empresa.id,
      imagenes: args.imagenes ?? [],
      estado: "Abierto",
      comentarios: [],
    });

    await registrarAccion(ctx, {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      sucursalId: userContext.sucursal?.id,
      tablaAfectada: "bugs",
      accion: "CREATE",
      registroId: bugId,
      cambios: { titulo: args.titulo, importancia: args.importancia },
    });

    return await ctx.db.get(bugId);
  },
});

export const fetchBugs = query({
  args: {
    usuarioId: v.id("usuarios"),
    estado: v.optional(estadoValidator),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const allBugs = await ctx.db
      .query("bugs")
      .filter((q) => q.eq(q.field("empresaId"), userContext.empresa!.id))
      .collect();

    const filtrados = args.estado
      ? allBugs.filter((b) => b.estado === args.estado)
      : allBugs;

    return filtrados.sort((a, b) => a.importancia.localeCompare(b.importancia));
  },
});

export const updateBug = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    bugId: v.id("bugs"),
    estado: v.optional(estadoValidator),
    importancia: v.optional(importanciaValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_usuarios");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const { usuarioId: _u, bugId, ...updates } = args;
    await ctx.db.patch(bugId, updates);

    if (userContext.empresa) {
      await registrarAccion(ctx, {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "bugs",
        accion: "UPDATE",
        registroId: bugId,
        cambios: updates,
      });
    }

    return await ctx.db.get(bugId);
  },
});

export const addBugComment = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    bugId: v.id("bugs"),
    texto: v.string(),
  },
  handler: async (ctx, args) => {
    const bug = await ctx.db.get(args.bugId);
    if (!bug) throw new Error("Bug no encontrado");

    const userContext = await getCurrentUserContext(ctx, args.usuarioId);

    const nuevoComentario = {
      id: `cmnt-${Date.now()}`,
      autorId: args.usuarioId,
      autorNombre: userContext.nombre,
      texto: args.texto,
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString(),
    };

    const comentarios = [...(bug.comentarios ?? []), nuevoComentario];
    await ctx.db.patch(args.bugId, { comentarios });

    return await ctx.db.get(args.bugId);
  },
});
