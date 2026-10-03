import { describe, expect, it } from "vitest";
import {
	generateSecureToken,
	hashPassword,
	isBcryptHash,
	verifyPassword,
} from "../convex/lib/crypto";
import { sanitizarUsuario } from "../convex/usuarios";

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

interface MockUsuario {
	_id: string;
	nombre: string;
	email: string;
	rol: string;
	password?: string;
	activo: boolean;
	empresaId?: string;
}

/**
 * Simulación del flujo de autenticación y retorno de usuario
 * de la action `login` (convex/usuarios.ts), asegurando que
 * excluye explícitamente el campo password.
 */
async function ejecutarLogin(
	plain: string,
	user: MockUsuario | null,
): Promise<Omit<MockUsuario, "password">> {
	if (!user) throw new Error("Credenciales incorrectas");
	if (!user.activo) throw new Error("Tu cuenta está inactiva");

	const stored = user.password ?? null;
	const res = await verificarPassword(plain, stored);
	if (res !== "ok") {
		throw new Error("Credenciales incorrectas");
	}

	const { password: _, ...usuarioSeguro } = user;
	return usuarioSeguro;
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

	it("sanitizarUsuario excluye el campo password del objeto retornado", () => {
		const mockConPassword = {
			_id: "user_123",
			nombre: "Carlos Operador",
			email: "carlos@taller.com",
			password: "$2a$10$hashed_password_sample",
			rol: "Operador",
			activo: true,
		};

		const resultado = sanitizarUsuario(mockConPassword);
		expect(resultado).toBeDefined();
		expect(resultado.nombre).toBe("Carlos Operador");
		expect(resultado.email).toBe("carlos@taller.com");
		expect("password" in resultado).toBe(false);
		expect((resultado as { password?: string }).password).toBeUndefined();
	});

	it("ejecutarLogin devuelve datos del usuario SIN el campo password", async () => {
		const hash = await hashPassword("miClaveSegura123");
		const mockUsuario: MockUsuario = {
			_id: "user_admin_1",
			nombre: "Super Admin",
			email: "admin@plottio.com",
			rol: "SuperAdmin",
			password: hash,
			activo: true,
			empresaId: "empresa_1",
		};

		const usuarioDevuelto = await ejecutarLogin("miClaveSegura123", mockUsuario);

		expect(usuarioDevuelto).toBeDefined();
		expect(usuarioDevuelto._id).toBe("user_admin_1");
		expect(usuarioDevuelto.email).toBe("admin@plottio.com");
		expect(usuarioDevuelto.nombre).toBe("Super Admin");
		// Garantizar que la propiedad 'password' no existe en el objeto devuelto
		expect("password" in usuarioDevuelto).toBe(false);
		expect((usuarioDevuelto as Record<string, unknown>).password).toBeUndefined();
		expect(Object.keys(usuarioDevuelto)).not.toContain("password");
	});

	it("login con contraseña incorrecta arroja error y no devuelve credenciales", async () => {
		const hash = await hashPassword("miClaveSegura123");
		const mockUsuario: MockUsuario = {
			_id: "user_admin_1",
			nombre: "Super Admin",
			email: "admin@plottio.com",
			rol: "SuperAdmin",
			password: hash,
			activo: true,
		};

		await expect(ejecutarLogin("claveIncorrecta", mockUsuario)).rejects.toThrow(
			"Credenciales incorrectas",
		);
	});
});