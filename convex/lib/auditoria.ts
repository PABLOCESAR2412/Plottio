import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Helper reutilizable para registrar acciones en la tabla `auditoria`.
 *
 * Uso:
 *   await registrarAccion(ctx, {
 *     empresaId, usuarioId, sucursalId,
 *     tablaAfectada: "clientes",
 *     accion: "CREATE",
 *     registroId: nuevoId,
 *     cambios: args,
 *   });
 *
 * No lanza errores: si falla el registro de auditoría, el flujo principal
 * sigue funcionando (la auditoría es trazabilidad, no bloqueante).
 */
export type RegistrarAccionArgs = {
  empresaId: Id<"empresas">;
  usuarioId?: Id<"usuarios">;
  sucursalId?: Id<"sucursales">;
  tablaAfectada: string;
  accion: "CREATE" | "UPDATE" | "DELETE";
  registroId: string;
  cambios?: unknown;
};

export async function registrarAccion(
  ctx: MutationCtx,
  args: RegistrarAccionArgs,
): Promise<void> {
  try {
    await ctx.db.insert("auditoria", {
      empresaId: args.empresaId,
      usuarioId: args.usuarioId,
      sucursalId: args.sucursalId,
      tablaAfectada: args.tablaAfectada,
      accion: args.accion,
      registroId: args.registroId,
      cambios: (args.cambios ?? {}) as Record<string, string | number | boolean | string[] | null>,
      fecha: new Date().toISOString(),
    });
  } catch (err) {
    // La auditoría es trazabilidad, no debe romper el flujo principal.
    console.error("[auditoria] No se pudo registrar la acción:", err);
  }
}

/**
 * Validador tipado para el campo `cambios` en la tabla de auditoría.
 */
export const cambiosValidator = v.optional(
  v.record(
    v.string(),
    v.union(
      v.string(),
      v.number(),
      v.boolean(),
      v.null(),
      v.array(v.string())
    )
  )
);
