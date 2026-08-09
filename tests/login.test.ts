import { describe, expect, it } from "vitest";
import {
	generateSecureToken,
	hashPassword,
	isBcryptHash,
	verifyPassword,
} from "../convex/lib/crypto";

// Replica los 3 casos del flujo de login (ver convex/usuarios.ts)
// usando los helpers compartidos. Los 3 casos:
//   1. stored === null  -> primer login, se hashea
//   2. stored es bcrypt -> verificación normal
//   3. stored es legacy plaintext -> migración suave
type LoginResult = "ok" | "credenciales_incorrectas";

async function verificarPassword(
	plain: string,
	stored: string | null,
): Promise<LoginResult> {
	if (stored === null) {
		await hashPassword(plain);
		return "ok";
	}
	if (isBcryptHash(stored)) {
		return (await verifyPassword(plain, stored)) ? "ok" : "credenciales_incorrectas";
	}
	return stored === plain ? "ok" : "credenciales_incorrectas";
}

describe("flujo de login", () => {
	it("caso 1: primer login sin password hasheado (stored=null)", async () => {
		expect(await verificarPassword("clave123", null)).toBe("ok");
	});

	it("caso 2: password bcrypt correcto e incorrecto", async () => {
		const hash = await hashPassword("clave123");
		expect(isBcryptHash(hash)).toBe(true);
		expect(await verificarPassword("clave123", hash)).toBe("ok");
		expect(await verificarPassword("wrong", hash)).toBe("credenciales_incorrectas");
	});

	it("caso 3: legacy plaintext migra sin error", async () => {
		expect(await verificarPassword("clave123", "clave123")).toBe("ok");
		expect(await verificarPassword("wrong", "clave123")).toBe("credenciales_incorrectas");
	});

	it("el token de invitación es único y no vacío", () => {
		const t1 = generateSecureToken();
		const t2 = generateSecureToken();
		expect(t1).toBeTruthy();
		expect(t1).not.toBe(t2);
	});
});