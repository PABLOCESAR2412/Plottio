import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserContext } from "./auth";

export const busquedaGlobal = query({
  args: {
    usuarioId: v.id("usuarios"),
    termino: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const context = await getCurrentUserContext(ctx, args.usuarioId);
    const empresaId = context.empresa?.id;
    const esSuper = context.permisos.includes("ver_todas_sucursales");
    const termino = args.termino.trim();
    if (!empresaId || termino.length < 2) {
      return { clientes: [], vehiculos: [], ordenes: [] };
    }

    const limit = Math.min(args.limit ?? 5, 10);

    // Search indexes are scoped by filterFields: empresaId + sucursalId.
    // `filterFields` are required in the query builder when using withSearchIndex.
    const sucursalesVisibles: string[] = context.roles.map((r) => r.sucursalId);

    const clientes = await ctx.db
      .query("clientes")
      .withSearchIndex("search_nombre", (q) =>
        q.search("nombre", termino).eq("empresaId", empresaId),
      )
      .take(limit);

    const vehiculos = await ctx.db
      .query("vehiculos")
      .withSearchIndex("search_placa", (q) =>
        q.search("placa", termino).eq("empresaId", empresaId),
      )
      .take(limit);

    const ordenes = await ctx.db
      .query("ordenesTrabajo")
      .withSearchIndex("search_cliente", (q) =>
        q.search("clienteNombre", termino).eq("empresaId", empresaId),
      )
      .take(limit);

    // Filtrar por sucursales visibles cuando no es SuperAdmin
    const scopeFilter = (sucursalId: string | null | undefined) => {
      if (esSuper) return true;
      return sucursalId ? sucursalesVisibles.includes(sucursalId) : true;
    };

    return {
      clientes: clientes
        .filter((c) => scopeFilter(c.sucursalId))
        .map((c) => ({
          id: c._id,
          nombre: c.nombre,
          telefono: c.telefono,
        })),
      vehiculos: vehiculos
        .filter((v) => scopeFilter(v.sucursalId))
        .map((v) => ({
          id: v._id,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
        })),
      ordenes: ordenes
        .filter((o) => scopeFilter(o.sucursalId))
        .map((o) => ({ id: o._id, cliente: o.clienteNombre, placa: o.placa })),
    };
  },
});