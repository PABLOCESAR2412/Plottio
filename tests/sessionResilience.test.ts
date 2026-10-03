import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validarSesion } from "../convex/usuarios";
import { RootErrorFallback } from "../src/routes/__root";

describe("Tarea 16 (P0 - Auth & Resilience): Validación de sesión, auto-recuperación y botón de reseteo", () => {
	describe("1. Query convex/usuarios:validarSesion", () => {
		const mockUsers = [
			{
				_id: "usr_valido_123",
				nombre: "Usuario Activo",
				email: "activo@plottio.com",
				rol: "Admin",
				activo: true,
				password: "hashed_secret_password",
			},
			{
				_id: "usr_inactivo_456",
				nombre: "Usuario Desactivado",
				email: "inactivo@plottio.com",
				rol: "Operador",
				activo: false,
				password: "hashed_secret_password",
			},
		];

		const createMockCtx = (opts?: { throwOnGet?: boolean; throwOnNormalize?: boolean }) => {
			return {
				db: {
					normalizeId: (table: string, id: string) => {
						if (opts?.throwOnNormalize) {
							throw new Error("Simulated normalization error");
						}
						// Si no es un id de usuario (por ejemplo un id de empresas k176rw... o un string corrupto), retorna null
						if (table === "usuarios") {
							if (id.startsWith("usr_valido_") || id.startsWith("usr_inactivo_")) {
								return id;
							}
						}
						return null;
					},
					get: async (id: string) => {
						if (opts?.throwOnGet) {
							throw new Error("Simulated db read error");
						}
						const user = mockUsers.find((u) => u._id === id);
						return user ? { ...user } : null;
					},
				},
			} as any;
		};

		it("retorna { valida: false } si usuarioId es undefined, null o vacío", async () => {
			const ctx = createMockCtx();
			const handler = (validarSesion as any)._handler;

			const resUndef = await handler(ctx, { usuarioId: undefined });
			expect(resUndef).toEqual({ valida: false });

			const resEmpty = await handler(ctx, { usuarioId: "" });
			expect(resEmpty).toEqual({ valida: false });
		});

		it("retorna { valida: false } cuando el ID pertenece a otra tabla (ej. empresas k176rw...)", async () => {
			const ctx = createMockCtx();
			const handler = (validarSesion as any)._handler;

			// ID corrupto real reportado en producción en plottio.vercel.app
			const idEmpresa = "k176rw23z4dhbkxkjw7kjjxe0988tsz2";
			const res = await handler(ctx, { usuarioId: idEmpresa });
			expect(res).toEqual({ valida: false });
		});

		it("retorna { valida: false } si el string del ID es malformado o basura", async () => {
			const ctx = createMockCtx();
			const handler = (validarSesion as any)._handler;

			const res = await handler(ctx, { usuarioId: "invalid-uuid-or-corrupted-token" });
			expect(res).toEqual({ valida: false });
		});

		it("retorna { valida: false } si el usuario no existe en la base de datos", async () => {
			const ctx = {
				db: {
					normalizeId: (_table: string, id: string) => id,
					get: async () => null,
				},
			} as any;
			const handler = (validarSesion as any)._handler;

			const res = await handler(ctx, { usuarioId: "usr_no_existe" });
			expect(res).toEqual({ valida: false });
		});

		it("retorna { valida: false } si el usuario existe pero está inactivo (activo: false)", async () => {
			const ctx = createMockCtx();
			const handler = (validarSesion as any)._handler;

			const res = await handler(ctx, { usuarioId: "usr_inactivo_456" });
			expect(res).toEqual({ valida: false });
		});

		it("captura excepciones en normalizeId o ctx.db.get retornando { valida: false } en vez de arrojar error", async () => {
			const ctxErrorGet = createMockCtx({ throwOnGet: true });
			const handler = (validarSesion as any)._handler;

			const res1 = await handler(ctxErrorGet, { usuarioId: "usr_valido_123" });
			expect(res1).toEqual({ valida: false });

			const ctxErrorNorm = createMockCtx({ throwOnNormalize: true });
			const res2 = await handler(ctxErrorNorm, { usuarioId: "usr_valido_123" });
			expect(res2).toEqual({ valida: false });
		});

		it("retorna { valida: true, usuario } para usuario activo y NO expone el password", async () => {
			const ctx = createMockCtx();
			const handler = (validarSesion as any)._handler;

			const res = await handler(ctx, { usuarioId: "usr_valido_123" });
			expect(res.valida).toBe(true);
			expect(res.usuario).toBeDefined();
			expect(res.usuario.id).toBe("usr_valido_123");
			expect(res.usuario.nombre).toBe("Usuario Activo");
			expect(res.usuario.email).toBe("activo@plottio.com");
			expect(res.usuario.rol).toBe("Admin");
			// Seguridad: jamás debe incluir el hash de password
			expect(res.usuario.password).toBeUndefined();
		});

		it("la definición de validarSesion usa v.optional(v.string()) para evitar ArgumentValidationError", () => {
			const usuariosSource = fs.readFileSync(
				path.resolve(__dirname, "../convex/usuarios.ts"),
				"utf-8",
			);
			expect(usuariosSource).toContain("export const validarSesion = query({");
			expect(usuariosSource).toMatch(/usuarioId:\s*v\.optional\(\s*v\.string\(\)\s*\)/);
			expect(usuariosSource).toContain('ctx.db.normalizeId("usuarios", args.usuarioId)');
		});
	});

	describe("2. Botón de auto-recuperación en RootErrorFallback (src/routes/__root.tsx)", () => {
		it("el archivo src/routes/__root.tsx contiene el botón 'Limpiar sesión y reiniciar'", () => {
			const rootSource = fs.readFileSync(
				path.resolve(__dirname, "../src/routes/__root.tsx"),
				"utf-8",
			);
			expect(rootSource).toContain("Limpiar sesión y reiniciar");
			expect(rootSource).toContain('localStorage.removeItem("plottio-auth-storage")');
			expect(rootSource).toContain("sessionStorage.clear()");
			expect(rootSource).toContain('window.location.href = "/"');
		});

		it("RootErrorFallback renderiza el botón de reseteo con sus handlers correspondientes", () => {
			const mockLocalStorageRemove = vi.fn();
			const mockSessionStorageClear = vi.fn();

			const originalWindow = (globalThis as any).window;
			const originalLocalStorage = (globalThis as any).localStorage;
			const originalSessionStorage = (globalThis as any).sessionStorage;

			try {
				const mockWindow = {
					localStorage: {
						removeItem: mockLocalStorageRemove,
						getItem: vi.fn(),
						setItem: vi.fn(),
						clear: vi.fn(),
					},
					sessionStorage: {
						clear: mockSessionStorageClear,
						getItem: vi.fn(),
						setItem: vi.fn(),
						removeItem: vi.fn(),
					},
					location: { href: "/current-error-page" },
				};

				(globalThis as any).window = mockWindow;
				(globalThis as any).localStorage = mockWindow.localStorage;
				(globalThis as any).sessionStorage = mockWindow.sessionStorage;

				const errorComponent = RootErrorFallback({
					error: new Error('ArgumentValidationError: Found ID "k176rw23z4dhbkxkjw7kjjxe0988tsz2" from table empresas'),
					reset: vi.fn(),
				} as any);

				expect(errorComponent).toBeDefined();

				// Inspeccionamos los elementos renderizados en el árbol React
				const stringified = JSON.stringify(errorComponent);
				expect(stringified).toContain("Limpiar sesión y reiniciar");
				expect(stringified).toContain("Reintentar");
				expect(stringified).toContain("Recargar aplicación");

				// Buscar recursivamente el botón "Limpiar sesión y reiniciar" y ejecutar su onClick
				const findButtonByText = (node: any, text: string): any => {
					if (!node) return null;
					if (node.props?.children === text) return node;
					if (Array.isArray(node.props?.children)) {
						for (const child of node.props.children) {
							const found = findButtonByText(child, text);
							if (found) return found;
						}
					} else if (typeof node.props?.children === "object") {
						return findButtonByText(node.props.children, text);
					}
					return null;
				};

				const resetButton = findButtonByText(errorComponent, "Limpiar sesión y reiniciar");
				expect(resetButton).toBeDefined();
				expect(typeof resetButton?.props?.onClick).toBe("function");

				// Ejecutamos el handler del botón
				resetButton.props.onClick();

				expect(mockLocalStorageRemove).toHaveBeenCalledWith("plottio-auth-storage");
				expect(mockSessionStorageClear).toHaveBeenCalledTimes(1);
				expect(mockWindow.location.href).toBe("/");
			} finally {
				if (originalWindow !== undefined) {
					(globalThis as any).window = originalWindow;
				} else {
					delete (globalThis as any).window;
				}
				if (originalLocalStorage !== undefined) {
					(globalThis as any).localStorage = originalLocalStorage;
				} else {
					delete (globalThis as any).localStorage;
				}
				if (originalSessionStorage !== undefined) {
					(globalThis as any).sessionStorage = originalSessionStorage;
				} else {
					delete (globalThis as any).sessionStorage;
				}
			}
		});
	});

	describe("3. Invocación de validarSesion en src/routes/index.tsx", () => {
		it("src/routes/index.tsx importa api.usuarios.validarSesion y verifica la sesión", () => {
			const indexSource = fs.readFileSync(
				path.resolve(__dirname, "../src/routes/index.tsx"),
				"utf-8",
			);

			expect(indexSource).toContain("api.usuarios.validarSesion");
			expect(indexSource).toMatch(/useQuery\(\s*api\.usuarios\.validarSesion/);
			expect(indexSource).toMatch(/currentUser\?\.id\s*\?\s*\{\s*usuarioId:\s*currentUser\.id\s*\}\s*:\s*["']skip["']/);
		});

		it("src/routes/index.tsx purga currentUser y notifica con toast cuando la sesión no es válida", () => {
			const indexSource = fs.readFileSync(
				path.resolve(__dirname, "../src/routes/index.tsx"),
				"utf-8",
			);

			expect(indexSource).toContain("setCurrentUser(null)");
			expect(indexSource).toMatch(/toast\.error\(\s*["']Sesión no válida o expirada/);
			expect(indexSource).toMatch(/if\s*\(\s*sesion\s*&&\s*!sesion\.valida\s*\)/);
		});
	});
});
