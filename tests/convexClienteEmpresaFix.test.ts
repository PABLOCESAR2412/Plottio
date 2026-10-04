import { describe, expect, it } from "vitest";
import schema from "../convex/schema";
import {
	createCliente,
	createClienteConEmpresa,
	fetchClientes,
} from "../convex/clientes";
import { registrarAccion, cambiosValidator } from "../convex/lib/auditoria";

type Doc = Record<string, any>;

function createMockCtx(initialData: Record<string, Doc[]>) {
	const store: Record<string, Doc[]> = {};
	for (const [table, docs] of Object.entries(initialData)) {
		store[table] = docs.map((d) => ({ ...d }));
	}

	let idCounter = 1000;

	const db = {
		get: async (id: string) => {
			for (const table of Object.values(store)) {
				const found = table.find((item) => item._id === id);
				if (found) return { ...found };
			}
			return null;
		},
		insert: async (table: string, doc: Doc) => {
			if (!store[table]) store[table] = [];
			const _id = `${table}_${++idCounter}`;
			const newDoc = { _id, ...doc };
			store[table].push(newDoc);
			return _id as any;
		},
		patch: async (id: string, updates: Doc) => {
			for (const table of Object.values(store)) {
				const index = table.findIndex((item) => item._id === id);
				if (index !== -1) {
					table[index] = { ...table[index], ...updates };
					return;
				}
			}
		},
		delete: async (id: string) => {
			for (const table of Object.values(store)) {
				const index = table.findIndex((item) => item._id === id);
				if (index !== -1) {
					table.splice(index, 1);
					return;
				}
			}
		},
		query: (table: string) => {
			let items = [...(store[table] || [])];
			const qb = {
				withIndex: (_name: string, fn?: (q: any) => any) => {
					if (fn) {
						const cond: Record<string, any> = {};
						const q = {
							eq: (field: string, val: any) => {
								cond[field] = val;
								return q;
							},
						};
						fn(q);
						items = items.filter((it) =>
							Object.entries(cond).every(([k, v]) => it[k] === v),
						);
					}
					return qb;
				},
				filter: (fn: (q: any) => any) => {
					items = items.filter((it) => {
						const q = {
							field: (name: string) => ({ _isField: true, name }),
							eq: (left: any, right: any) => {
								const l = left?._isField ? it[left.name] : left;
								const r = right?._isField ? it[right.name] : right;
								return l === r;
							},
						};
						return fn(q);
					});
					return qb;
				},
				order: (_dir: string) => qb,
				take: (n: number) => items.slice(0, n),
				collect: async () => items.map((i) => ({ ...i })),
				first: async () => (items.length > 0 ? { ...items[0] } : null),
			};
			return qb;
		},
	};

	const ctx = {
		db,
		storage: {
			getUrl: async (storageId: string) => `https://storage.mock/${storageId}`,
			generateUploadUrl: async () => "https://upload.mock",
		},
		scheduler: {
			runAfter: async () => {},
		},
	};

	return { ctx: ctx as any, store };
}

describe("Tarea 29 (P0 - Fase 6): Solución de Server Error en Convex (createClienteConEmpresa, Auditoría y Despliegue Cloud)", () => {
	describe("1. Esquema y validación de Auditoría", () => {
		it("auditoria.cambios en schema.ts es v.optional(v.any()) y acepta arrays de objetos y Convex IDs", () => {
			const tables = (schema as any).tables;
			const auditoriaTable = tables.auditoria;
			expect(auditoriaTable).toBeDefined();

			const cambiosField = auditoriaTable.validator.fields.cambios;
			expect(cambiosField).toBeDefined();
			expect(cambiosField.isOptional).toBe("optional");
			expect(cambiosField.kind).toBe("any");
		});

		it("cambiosValidator en convex/lib/auditoria.ts es flexible v.optional(v.any())", () => {
			expect(cambiosValidator).toBeDefined();
			expect((cambiosValidator as any).isOptional).toBe("optional");
			expect((cambiosValidator as any).kind).toBe("any");
		});

		it("registrarAccion inserta cambios complejos (arrays de objetos, IDs) serializándolos de forma segura", async () => {
			const { ctx, store } = createMockCtx({
				auditoria: [],
			});

			const payloadComplejo = {
				ordenId: "orden_123",
				empresaId: "empresa_456",
				items: [
					{ descripcion: "Lámina acrílica", cantidad: 2, subtotal: 35.5 },
					{ descripcion: "Instalación", cantidad: 1, subtotal: 15.0 },
				],
				metadata: { ip: "192.168.1.1", userAgent: "PlottioClient/1.0" },
			};

			await registrarAccion(ctx, {
				empresaId: "empresa_456" as any,
				usuarioId: "usuario_789" as any,
				tablaAfectada: "ordenesTrabajo",
				accion: "CREATE",
				registroId: "orden_123",
				cambios: payloadComplejo,
			});

			expect(store.auditoria.length).toBe(1);
			expect(store.auditoria[0].tablaAfectada).toBe("ordenesTrabajo");
			expect(store.auditoria[0].registroId).toBe("orden_123");
			expect(store.auditoria[0].cambios).toEqual(payloadComplejo);
		});
	});

	describe("2. createClienteConEmpresa: sanitización, deduplicación y vinculación", () => {
		const baseInitialData = () => ({
			empresas: [
				{
					_id: "empresa_taller",
					nombre: "Taller Matriz",
					ruc: "1790011223001",
					razonSocial: "Taller Matriz S.A.",
					activa: true,
				},
				{
					_id: "empresa_cliente_existente",
					nombre: "Flota Comercial Pichincha",
					ruc: "1792223334001",
					razonSocial: "Flota Pichincha Cía. Ltda.",
					telefono: "022345678",
					direccion: "Av. Amazonas 100",
					activa: false, // inactiva previamente
				},
			],
			usuarios: [
				{
					_id: "user_admin",
					nombre: "Admin Central",
					email: "admin@plottio.ec",
					rol: "SuperAdmin",
					empresaId: "empresa_taller",
					activo: true,
				},
			],
			roles: [
				{
					_id: "rol_superadmin",
					nombre: "SuperAdmin",
					empresaId: "empresa_taller",
					activo: true,
				},
			],
			permisos: [
				{ _id: "perm_crear", clave: "crear_cliente", nombre: "Crear Cliente" },
				{ _id: "perm_ver", clave: "ver_clientes", nombre: "Ver Clientes" },
			],
			rolePermisos: [
				{ roleId: "rol_superadmin", permisoId: "perm_crear" },
				{ roleId: "rol_superadmin", permisoId: "perm_ver" },
			],
			usuariosRolesSucursal: [
				{
					_id: "urs_admin",
					usuarioId: "user_admin",
					roleId: "rol_superadmin",
					activo: true,
				},
			],
			clientes: [
				{
					_id: "cliente_1",
					nombre: "Carlos Paredes",
					telefono: "0991234567",
					email: "carlos@gmail.com",
					identificacion: "1712345678",
					empresaId: "empresa_taller",
				},
			],
			auditoria: [],
		});

		it("crea cliente y nueva empresa vinculada sanitizando todos los strings con .trim()", async () => {
			const { ctx, store } = createMockCtx(baseInitialData());

			const handler = (createClienteConEmpresa as any)._handler;
			const res = await handler(ctx, {
				usuarioId: "user_admin",
				nombre: "  Juan Perez  ",
				telefono: "  0987654321  ",
				email: "  juan@empresa.com  ",
				direccion: "  Calle Los Álamos 456  ",
				identificacion: "  1723456789  ",
				empresaNombre: "  Transportes del Norte  ",
				empresaRuc: "  1798889990001  ",
				empresaRazonSocial: "  Transportes del Norte S.A.  ",
				empresaTelefono: "  022998877  ",
				empresaDireccion: "  Av. Galo Plaza 1000  ",
			});

			expect(res).toBeDefined();
			expect(res.cliente).toBeDefined();
			expect(res.cliente.nombre).toBe("Juan Perez");
			expect(res.cliente.telefono).toBe("0987654321");
			expect(res.cliente.email).toBe("juan@empresa.com");
			expect(res.cliente.direccion).toBe("Calle Los Álamos 456");
			expect(res.cliente.identificacion).toBe("1723456789");
			expect(res.cliente.empresaId).toBe("empresa_taller");
			expect(res.cliente.empresaVinculadaId).toBe(res.empresaId);

			// Verificar empresa creada
			const empresaCreada = store.empresas.find(
				(e) => e._id === res.empresaId,
			);
			expect(empresaCreada).toBeDefined();
			expect(empresaCreada!.nombre).toBe("Transportes del Norte");
			expect(empresaCreada!.ruc).toBe("1798889990001");
			expect(empresaCreada!.activa).toBe(true);

			// Verificar auditorías registradas para cliente y empresa
			const auditEmpresa = store.auditoria.find(
				(a) => a.tablaAfectada === "empresas" && a.registroId === res.empresaId,
			);
			expect(auditEmpresa).toBeDefined();
			expect(auditEmpresa!.accion).toBe("CREATE");
			expect(auditEmpresa!.cambios.nombre).toBe("Transportes del Norte");

			const auditCliente = store.auditoria.find(
				(a) => a.tablaAfectada === "clientes" && a.registroId === res.cliente._id,
			);
			expect(auditCliente).toBeDefined();
			expect(auditCliente!.accion).toBe("CREATE");
			expect(auditCliente!.cambios.identificacion).toBe("1723456789");
		});

		it("si la empresa vinculada ya existe por RUC, la reutiliza, actualiza sus datos y la reactiva sin duplicar", async () => {
			const { ctx, store } = createMockCtx(baseInitialData());

			const handler = (createClienteConEmpresa as any)._handler;
			const initialEmpresaCount = store.empresas.length;

			const res = await handler(ctx, {
				usuarioId: "user_admin",
				nombre: "Mario Gomez",
				telefono: "0995556666",
				email: "mario@pichincha.com",
				identificacion: "1729998881",
				empresaNombre: "Flota Comercial Pichincha Actualizada",
				empresaRuc: "1792223334001", // Mismo RUC existente
				empresaRazonSocial: "Flota Pichincha Corporación",
				empresaTelefono: "022999000",
				empresaDireccion: "Nueva Dirección 500",
			});

			expect(res.empresaId).toBe("empresa_cliente_existente");
			expect(store.empresas.length).toBe(initialEmpresaCount); // No se duplicó

			const empresaActualizada = store.empresas.find(
				(e) => e._id === "empresa_cliente_existente",
			);
			expect(empresaActualizada).toBeDefined();
			expect(empresaActualizada!.activa).toBe(true);
			expect(empresaActualizada!.nombre).toBe(
				"Flota Comercial Pichincha Actualizada",
			);
			expect(empresaActualizada!.razonSocial).toBe(
				"Flota Pichincha Corporación",
			);
			expect(empresaActualizada!.telefono).toBe("022999000");
			expect(empresaActualizada!.direccion).toBe("Nueva Dirección 500");

			// Se registró auditoría de UPDATE para la empresa vinculada
			const auditUpdate = store.auditoria.find(
				(a) =>
					a.tablaAfectada === "empresas" &&
					a.registroId === "empresa_cliente_existente",
			);
			expect(auditUpdate).toBeDefined();
			expect(auditUpdate!.accion).toBe("UPDATE");
		});

		it("bloquea duplicidad de identificación de cliente con ConvexError descriptivo", async () => {
			const { ctx } = createMockCtx(baseInitialData());
			const handler = (createClienteConEmpresa as any)._handler;

			await expect(
				handler(ctx, {
					usuarioId: "user_admin",
					nombre: "Otro Carlos",
					telefono: "0991112233",
					email: "otro@gmail.com",
					identificacion: "  1712345678  ", // Ya existente en cliente_1
					empresaNombre: "Empresa X",
					empresaRuc: "1791112223001",
				}),
			).rejects.toThrowError(
				/Ya existe un cliente con la identificación 1712345678/,
			);
		});

		it("createCliente estándar también bloquea duplicados de identificación y sanitiza inputs", async () => {
			const { ctx } = createMockCtx(baseInitialData());
			const handler = (createCliente as any)._handler;

			// Rechaza duplicado
			await expect(
				handler(ctx, {
					usuarioId: "user_admin",
					nombre: "Carlos Duplicado",
					telefono: "0991234567",
					email: "carlos.dup@gmail.com",
					identificacion: "1712345678",
				}),
			).rejects.toThrowError(
				/Ya existe un cliente con la identificación 1712345678/,
			);

			// Acepta nuevo cliente único
			const nuevo = await handler(ctx, {
				usuarioId: "user_admin",
				nombre: "  Laura Moreno  ",
				telefono: "  0998887777  ",
				email: "  laura@gmail.com  ",
				identificacion: "  1755566677  ",
			});

			expect(nuevo).toBeDefined();
			expect(nuevo.nombre).toBe("Laura Moreno");
			expect(nuevo.identificacion).toBe("1755566677");
		});
	});

	describe("3. fetchClientes: resiliencia, retrocompatibilidad y clientes huérfanos", () => {
		it("recupera clientes de la empresa e incluye huérfanos sin empresaId sin fallar ni romperse", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "empresa_central", nombre: "Plottio HQ", activa: true },
				],
				usuarios: [
					{
						_id: "user_1",
						nombre: "Técnico Taller",
						rol: "SuperAdmin",
						empresaId: "empresa_central",
						activo: true,
					},
				],
				roles: [
					{
						_id: "rol_superadmin",
						nombre: "SuperAdmin",
						empresaId: "empresa_central",
						activo: true,
					},
				],
				permisos: [
					{ _id: "perm_ver", clave: "ver_clientes", nombre: "Ver Clientes" },
				],
				rolePermisos: [{ roleId: "rol_superadmin", permisoId: "perm_ver" }],
				usuariosRolesSucursal: [
					{
						_id: "urs_u1",
						usuarioId: "user_1",
						roleId: "rol_superadmin",
						activo: true,
					},
				],
				clientes: [
					{
						_id: "cli_normal",
						nombre: "Bernardo Silva",
						telefono: "0991111111",
						email: "bernardo@gmail.com",
						empresaId: "empresa_central",
					},
					{
						_id: "cli_huerfano",
						nombre: "Ana Lucia",
						telefono: "0992222222",
						email: "ana@gmail.com",
						// sin empresaId asignado (huérfano legacy)
					},
					{
						_id: "cli_otra_empresa",
						nombre: "Cliente Ajeno",
						telefono: "0993333333",
						email: "ajeno@gmail.com",
						empresaId: "otra_empresa_distinta",
					},
				],
			});

			const queryHandler = (fetchClientes as any)._handler;
			const resultado = await queryHandler(ctx, { usuarioId: "user_1" });

			expect(resultado).toBeDefined();
			expect(Array.isArray(resultado)).toBe(true);

			// Debe incluir el cliente normal de la empresa y el cliente huérfano (retrocompatibilidad)
			const ids = resultado.map((c: any) => c._id);
			expect(ids).toContain("cli_normal");
			expect(ids).toContain("cli_huerfano");
			// NO debe incluir clientes de otra empresa
			expect(ids).not.toContain("cli_otra_empresa");

			// Debe estar ordenado alfabéticamente
			expect(resultado[0].nombre).toBe("Ana Lucia");
			expect(resultado[1].nombre).toBe("Bernardo Silva");
		});

		it("maneja nombres con caracteres especiales o vacíos en el ordenamiento", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "empresa_central", nombre: "Plottio HQ", activa: true },
				],
				usuarios: [
					{
						_id: "user_1",
						nombre: "Admin",
						rol: "SuperAdmin",
						empresaId: "empresa_central",
						activo: true,
					},
				],
				roles: [
					{
						_id: "rol_superadmin",
						nombre: "SuperAdmin",
						empresaId: "empresa_central",
						activo: true,
					},
				],
				permisos: [
					{ _id: "perm_ver", clave: "ver_clientes", nombre: "Ver Clientes" },
				],
				rolePermisos: [{ roleId: "rol_superadmin", permisoId: "perm_ver" }],
				usuariosRolesSucursal: [
					{
						_id: "urs_u2",
						usuarioId: "user_1",
						roleId: "rol_superadmin",
						activo: true,
					},
				],
				clientes: [
					{
						_id: "cli_1",
						nombre: "Zoila",
						telefono: "0991",
						email: "z@g.com",
						empresaId: "empresa_central",
					},
					{
						_id: "cli_2",
						nombre: "",
						telefono: "0992",
						email: "v@g.com",
						empresaId: "empresa_central",
					},
					{
						_id: "cli_3",
						nombre: "Álvaro",
						telefono: "0993",
						email: "a@g.com",
						empresaId: "empresa_central",
					},
				],
			});

			const queryHandler = (fetchClientes as any)._handler;
			const resultado = await queryHandler(ctx, { usuarioId: "user_1" });
			expect(resultado).toBeDefined();
			expect(resultado.length).toBe(3);
		});
	});
});
