import type { MutationCtx } from "../_generated/server";

/**
 * Migración base: plantilla canónica de una migración de esquema.
 *
 * En este caso solo es una no-operación que documenta el patrón:
 * exactamente esta migración quedó registrada el día que se activó el sistema
 * de versionado, de modo que posteriormente no vuelva a ejecutarse.
 *
 * Para una migración real: mutar documentos aquí (p.ej. ctx.db.patch(...)) y
 * subir el índice/columna correspondiente en `convex/schema.ts`.
 */
interface Migration {
  name: string;
  run: (
    ctx: MutationCtx,
    args: Record<string, unknown>,
  ) => Promise<void>;
}

const migration: Migration = {
  name: "0001_normalizar_usuarios",
  run: async (ctx) => {
    const usuarios = await ctx.db.query("usuarios").collect();
    await Promise.all(
      usuarios.map((usuario) =>
        ctx.db.patch(usuario._id, {
          invitationToken: usuario.invitationToken ?? undefined,
          invitationAccepted: usuario.invitationAccepted ?? undefined,
          password: usuario.password ?? undefined,
        }),
      ),
    );
  },
};

export default migration;