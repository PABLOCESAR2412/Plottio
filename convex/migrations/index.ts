import { internalMutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";

import { default as mig0001 } from "./0001_normalizar_usuarios";

/**
 * Sistema de versionado de esquema basado en migraciones acumulativas.
 *
 * Cada migración vive en `convex/migrations/` con un nombre único (p.ej.
 * `0001_normalizar_usuarios`) y exporta `{ name, run }` donde `run` es una
 * función (`ctx: MutationCtx, args`) que muta la base.
 *
 * El runner:
 * 1. Lee la tabla `migrations` para saber cuáles ya se aplicaron.
 * 2. Ejecuta las pendientes en orden numérico dentro de una sola invocación.
 * 3. Registra cada migración con su fecha de aplicación.
 *
 * Para añadir una migración nueva:
 *   - Crear `convex/migrations/00XX_descripcion.ts` exportando `{ name, run }`.
 *   - Importarla y añadirla al array `MIGRACIONES` de este archivo.
 *
 * Para ejecutarlas desde la CLI:
 *   npx convex run migrations:runMigrations --prod
 */

interface MigrationDef {
  name: string;
  run: (ctx: MutationCtx, args: Record<string, unknown>) => Promise<void>;
}

// Importamos los módulos de migración aquí para registrarlos en este array.
const MIGRACIONES: MigrationDef[] = [mig0001];

/**
 * Ejecuta todas las migraciones pendientes de forma idempotente.
 * Es `internalMutation` para que solo se invoque desde la CLI o desde otras
 * funciones internas, nunca por el cliente.
 */
export const runMigrations = internalMutation({
  handler: async (ctx) => {
    const aplicadas = new Set(
      (await ctx.db.query("migrations").collect()).map((m) => m.nombre),
    );

    const pendientes = MIGRACIONES.filter((m) => !aplicadas.has(m.name)).sort(
      (a, b) => a.name.localeCompare(b.name),
    );

    if (pendientes.length === 0) {
      return { aplicadas: aplicadas.size, ejecutadas: 0 };
    }

    for (const migracion of pendientes) {
      await migracion.run(ctx, {});
      await ctx.db.insert("migrations", {
        nombre: migracion.name,
        aplicadaEn: new Date().toISOString(),
      });
    }

    return {
      aplicadas: aplicadas.size + pendientes.length,
      ejecutadas: pendientes.length,
    };
  },
});

/**
 * Lista estado de todas las migraciones registradas (para depuración).
 */
export const listMigrations = query({
  handler: async (ctx) => {
    const aplicadas = new Set(
      (await ctx.db.query("migrations").collect()).map((m) => m.nombre),
    );
    return MIGRACIONES.sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({
      nombre: m.name,
      aplicada: aplicadas.has(m.name),
    }));
  },
});