import { describe, expect, it, vi } from "vitest";
import { registrarAccion } from "../convex/lib/auditoria";

type FakeDb = {
	insert: ReturnType<typeof vi.fn>;
};

function createFakeCtx(db: FakeDb) {
	return { db } as never;
}

// IDs genéricos de Convex (Id<T>); tsc exige el marcaje.
const id = (t: string, n: string) => `${t}_${n}` as never;

describe("registrarAccion", () => {
	it("inserta un registro de auditoría con todos los campos", async () => {
		const insert = vi.fn().mockResolvedValue("aud1");
		const ctx = createFakeCtx({ insert });

		await registrarAccion(ctx, {
			empresaId: id("empresas", "123"),
			usuarioId: id("usuarios", "456"),
			sucursalId: id("sucursales", "789"),
			tablaAfectada: "clientes",
			accion: "CREATE",
			registroId: "clientes_abc",
			cambios: { nombre: "Juan" },
		});

		expect(insert).toHaveBeenCalledTimes(1);
		const [tabla, payload] = insert.mock.calls[0];
		expect(tabla).toBe("auditoria");
		expect(payload).toMatchObject({
			empresaId: "empresas_123",
			usuarioId: "usuarios_456",
			sucursalId: "sucursales_789",
			tablaAfectada: "clientes",
			accion: "CREATE",
			registroId: "clientes_abc",
			cambios: { nombre: "Juan" },
		});
		expect(payload.fecha).toBeTruthy();
	});

	it("no lanza error cuando el insert falla (auditoría no bloqueante)", async () => {
		const insert = vi.fn().mockRejectedValue(new Error("db down"));
		const ctx = createFakeCtx({ insert });
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(
			registrarAccion(ctx, {
				empresaId: id("empresas", "123"),
				tablaAfectada: "vehiculos",
				accion: "DELETE",
				registroId: "vehiculos_xyz",
			}),
		).resolves.toBeUndefined();

		spy.mockRestore();
	});

	it("incluye cambios vacíos cuando no se proveen", async () => {
		const insert = vi.fn().mockResolvedValue("aud2");
		const ctx = createFakeCtx({ insert });

		await registrarAccion(ctx, {
			empresaId: id("empresas", "1"),
			tablaAfectada: "citas",
			accion: "UPDATE",
			registroId: "citas_1",
		});

		const payload = insert.mock.calls[0][1];
		expect(payload.cambios).toEqual({});
	});
});