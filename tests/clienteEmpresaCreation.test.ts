import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	createCliente,
	createClienteConEmpresa,
	fetchClientes,
	updateCliente,
} from "../convex/clientes";
import { createEmpresa } from "../convex/organizacion";

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

	return { ctx, store };
}

function setupTestFixture() {
	return createMockCtx({
		usuarios: [
			{
				_id: "u_super",
				nombre: "Super Admin",
				empresaId: "emp_taller",
				sucursalId: "suc_matriz",
				activo: true,
			},
			{
				_id: "u_operador_con_permiso",
				nombre: "Operador con Permiso Crear Cliente",
				empresaId: "emp_taller",
				sucursalId: "suc_matriz",
				activo: true,
			},
			{
				_id: "u_sin_permiso",
				nombre: "Operador Sin Permisos",
				empresaId: "emp_taller",
				sucursalId: "suc_matriz",
				activo: true,
			},
		],
		empresas: [
			{
				_id: "emp_taller",
				nombre: "Taller Mecánico Matriz",
				ruc: "1790000000001",
				razonSocial: "Taller Mecánico Matriz S.A.",
				activa: true,
			},
		],
		sucursales: [
			{
				_id: "suc_matriz",
				nombre: "Sucursal Central",
				empresaId: "emp_taller",
				activa: true,
				esMatriz: true,
				direccion: "Av. Principal 100",
			},
		],
		roles: [
			{ _id: "r_super", nombre: "SuperAdmin", activo: true },
			{ _id: "r_operador", nombre: "Operador Taller", empresaId: "emp_taller", activo: true },
			{ _id: "r_basico", nombre: "Usuario Básico", empresaId: "emp_taller", activo: true },
		],
		permisos: [
			{ _id: "p_ver_cli", clave: "ver_clientes", nombre: "Ver Clientes" },
			{ _id: "p_crear_cli", clave: "crear_cliente", nombre: "Crear Cliente" },
			{ _id: "p_editar_cli", clave: "editar_cliente", nombre: "Editar Cliente" },
		],
		rolePermisos: [
			{ _id: "rp_1", roleId: "r_operador", permisoId: "p_ver_cli" },
			{ _id: "rp_2", roleId: "r_operador", permisoId: "p_crear_cli" },
			{ _id: "rp_3", roleId: "r_operador", permisoId: "p_editar_cli" },
		],
		usuariosRolesSucursal: [
			{
				_id: "urs_1",
				usuarioId: "u_super",
				roleId: "r_super",
				sucursalId: "suc_matriz",
				activo: true,
			},
			{
				_id: "urs_2",
				usuarioId: "u_operador_con_permiso",
				roleId: "r_operador",
				sucursalId: "suc_matriz",
				activo: true,
			},
			{
				_id: "urs_3",
				usuarioId: "u_sin_permiso",
				roleId: "r_basico",
				sucursalId: "suc_matriz",
				activo: true,
			},
		],
		clientes: [],
		auditoria: [],
	});
}

describe("Tarea 17: Corrección de creación simultánea de Cliente y Empresa", () => {
	describe("1. convex/organizacion.ts -> createEmpresa", () => {
		it("rechaza usuarios sin rol SuperAdmin y sin permiso 'crear_cliente'", async () => {
			const { ctx } = setupTestFixture();
			await expect(
				(createEmpresa as any)._handler(ctx, {
					usuarioId: "u_sin_permiso",
					nombre: "Flota Sur S.A.",
					ruc: "1791112223001",
					razonSocial: "Flota Sur Transportes S.A.",
				}),
			).rejects.toThrow(/Solo SuperAdmin o usuarios con permiso 'crear_cliente'/);
		});

		it("permite a SuperAdmin crear empresas", async () => {
			const { ctx, store } = setupTestFixture();
			const empId = await (createEmpresa as any)._handler(ctx, {
				usuarioId: "u_super",
				nombre: "Flota Norte S.A.",
				ruc: "1792223334001",
				razonSocial: "Flota Norte Transportes S.A.",
			});

			expect(typeof empId).toBe("string");
			const creada = store.empresas.find((e) => e._id === empId);
			expect(creada).toBeDefined();
			expect(creada!.nombre).toBe("Flota Norte S.A.");
			expect(creada!.activa).toBe(true);
		});

		it("permite a usuarios con rol no-SuperAdmin pero con permiso 'crear_cliente' crear empresas B2B", async () => {
			const { ctx, store } = setupTestFixture();
			const empId = await (createEmpresa as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Cooperativa Express",
				ruc: "1793334445001",
				razonSocial: "Cooperativa de Transporte Express",
				telefono: "0991234567",
				direccion: "Terminal Terrestre Local 5",
			});

			expect(typeof empId).toBe("string");
			const creada = store.empresas.find((e) => e._id === empId);
			expect(creada).toBeDefined();
			expect(creada!.nombre).toBe("Cooperativa Express");
			expect(creada!.ruc).toBe("1793334445001");
			expect(creada!.activa).toBe(true);
		});

		it("reactiva una empresa existente archivada (inactiva) al crear con el mismo RUC", async () => {
			const { ctx, store } = setupTestFixture();
			store.empresas.push({
				_id: "emp_inactiva",
				nombre: "Antigua Flota",
				ruc: "1799998887001",
				razonSocial: "Antigua Flota Cía",
				activa: false,
			});

			const returnedId = await (createEmpresa as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Flota Reactivada",
				ruc: "1799998887001",
				razonSocial: "Flota Reactivada S.A.",
			});

			expect(returnedId).toBe("emp_inactiva");
			const reactivada = store.empresas.find((e) => e._id === "emp_inactiva");
			expect(reactivada).toBeDefined();
			expect(reactivada!.activa).toBe(true);
			expect(reactivada!.nombre).toBe("Flota Reactivada");
		});
	});

	describe("2. convex/clientes.ts -> createClienteConEmpresa", () => {
		it("rechaza usuarios sin permiso 'crear_cliente'", async () => {
			const { ctx } = setupTestFixture();
			await expect(
				(createClienteConEmpresa as any)._handler(ctx, {
					usuarioId: "u_sin_permiso",
					nombre: "Juan Pérez",
					telefono: "0998887777",
					email: "juan@perez.com",
					empresaNombre: "Empresa Transportes",
					empresaRuc: "1790055443001",
				}),
			).rejects.toThrow(/crear_cliente/);
		});

		it("crea atómicamente el cliente y la nueva empresa B2B vinculada", async () => {
			const { ctx, store } = setupTestFixture();

			const result = await (createClienteConEmpresa as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Carlos Gómez",
				telefono: "0991112233",
				email: "carlos@transporte.com",
				direccion: "Calle 10 y Av. 2",
				identificacion: "1710034065",
				empresaNombre: "Transportes Gómez Hermanos",
				empresaRuc: "1790012345001",
				empresaRazonSocial: "Transportes Gómez Hermanos Cía. Ltda.",
				empresaTelefono: "022345678",
				empresaDireccion: "Av. Interoceánica Km 5",
			});

			expect(result).toBeDefined();
			expect(result.cliente).toBeDefined();
			expect(result.empresaId).toBeDefined();

			const cliente = result.cliente;
			const empresaId = result.empresaId;

			// Verificar que cliente.empresaId es el tenant workspace del taller
			expect(cliente.empresaId).toBe("emp_taller");
			// Verificar que cliente.empresaVinculadaId es la empresa B2B creada
			expect(cliente.empresaVinculadaId).toBe(empresaId);
			expect(cliente.sucursalId).toBe("suc_matriz");
			expect(cliente.identificacion).toBe("1710034065");

			// Verificar que la empresa B2B existe en la tabla empresas
			const empresaDoc = store.empresas.find((e) => e._id === empresaId);
			expect(empresaDoc).toBeDefined();
			expect(empresaDoc!.nombre).toBe("Transportes Gómez Hermanos");
			expect(empresaDoc!.ruc).toBe("1790012345001");
			expect(empresaDoc!.activa).toBe(true);

			// Verificar que se insertaron los registros de auditoría
			const auditoriaCli = store.auditoria.find(
				(a) => a.tablaAfectada === "clientes" && a.registroId === cliente._id,
			);
			const auditoriaEmp = store.auditoria.find(
				(a) => a.tablaAfectada === "empresas" && a.registroId === empresaId,
			);
			expect(auditoriaCli).toBeDefined();
			expect(auditoriaCli!.empresaId).toBe("emp_taller");
			expect(auditoriaEmp).toBeDefined();
			expect(auditoriaEmp!.empresaId).toBe("emp_taller");
		});

		it("reutiliza una empresa existente si el RUC ya estaba registrado", async () => {
			const { ctx, store } = setupTestFixture();

			// Empresa B2B preexistente
			store.empresas.push({
				_id: "emp_b2b_existente",
				nombre: "Flota Interprovincial",
				ruc: "1798881112001",
				razonSocial: "Flota Interprovincial S.A.",
				activa: true,
			});

			const result = await (createClienteConEmpresa as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Segundo Chofer",
				telefono: "0987654321",
				email: "chofer2@interprovincial.com",
				identificacion: "1720098765",
				empresaNombre: "Flota Interprovincial",
				empresaRuc: "1798881112001",
			});

			// No debe duplicar la empresa, debe reutilizar 'emp_b2b_existente'
			expect(result.empresaId).toBe("emp_b2b_existente");
			expect(result.cliente.empresaVinculadaId).toBe("emp_b2b_existente");
			expect(result.cliente.empresaId).toBe("emp_taller");

			const empresasConEseRuc = store.empresas.filter(
				(e) => e.ruc === "1798881112001",
			);
			expect(empresasConEseRuc.length).toBe(1);
		});

		it("rechaza la creación si el cliente ya existe por identificación en el tenant", async () => {
			const { ctx, store } = setupTestFixture();
			store.clientes.push({
				_id: "cli_existente",
				nombre: "Cliente Ya Registrado",
				identificacion: "1710034065",
				empresaId: "emp_taller",
				sucursalId: "suc_matriz",
				telefono: "0999999999",
				email: "cliente@antiguo.com",
			});

			await expect(
				(createClienteConEmpresa as any)._handler(ctx, {
					usuarioId: "u_operador_con_permiso",
					nombre: "Nuevo Intento",
					telefono: "0991112233",
					email: "nuevo@correo.com",
					identificacion: "1710034065",
					empresaNombre: "Empresa X",
					empresaRuc: "1797776665001",
				}),
			).rejects.toThrow(/Ya existe un cliente con la identificación 1710034065/);
		});
	});

	describe("3. Visibilidad y no-orfandad en fetchClientes", () => {
		it("los clientes creados con empresa vinculada son visibles inmediatamente y conservan su tenant", async () => {
			const { ctx } = setupTestFixture();

			await (createClienteConEmpresa as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Ana Lucía Mora",
				telefono: "0981234567",
				email: "ana@transporte.com",
				identificacion: "1712345678",
				empresaNombre: "Cooperativa Pichincha",
				empresaRuc: "1794445556001",
			});

			const listaClientes = await (fetchClientes as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
			});

			expect(listaClientes.length).toBe(1);
			const cli = listaClientes[0];
			expect(cli.nombre).toBe("Ana Lucía Mora");
			// Enriquecido con empresaVinculadaId para mostrar en UI
			expect(cli.empresaVinculadaId).toBeDefined();
			expect(cli.empresaId).toBe(cli.empresaVinculadaId);
		});

		it("updateCliente actualiza empresaVinculadaId sin sobreescribir el tenant empresaId", async () => {
			const { ctx, store } = setupTestFixture();

			const cliId = await (createCliente as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				nombre: "Marcos Ríos",
				telefono: "0990001111",
				email: "marcos@test.com",
				identificacion: "1719998887",
			});

			// Asignar empresa B2B posteriormente
			const updated = await (updateCliente as any)._handler(ctx, {
				usuarioId: "u_operador_con_permiso",
				clienteId: cliId._id,
				nombre: "Marcos Ríos Editado",
				telefono: "0990001111",
				email: "marcos@test.com",
				empresaVinculadaId: "emp_flota_nueva",
			});

			expect(updated.empresaVinculadaId).toBe("emp_flota_nueva");
			expect(updated.empresaId).toBe("emp_taller");

			const inStore = store.clientes.find((c) => c._id === cliId._id);
			expect(inStore).toBeDefined();
			expect(inStore!.empresaVinculadaId).toBe("emp_flota_nueva");
			expect(inStore!.empresaId).toBe("emp_taller");
		});
	});

	describe("4. Corrección en frontend ClientesView.tsx", () => {
		it("ClientesView.tsx no hace 'newEmp._id' (que causaba empresaId undefined)", () => {
			const filePath = resolve(__dirname, "../src/components/ClientesView.tsx");
			const content = readFileSync(filePath, "utf-8");

			// Validar que no exista el patrón erróneo newEmp._id
			expect(content).not.toContain("newEmp._id");

			// Validar que usa createClienteConEmpresa
			expect(content).toContain("createClienteConEmpresa");
			expect(content).toContain("createClienteConEmpresaMut");
		});

		it("ClientesView.tsx pasa tanto empresaId como empresaVinculadaId a updateClienteMut", () => {
			const filePath = resolve(__dirname, "../src/components/ClientesView.tsx");
			const content = readFileSync(filePath, "utf-8");

			// En el flujo de vinculación posterior con lastCreatedClienteId
			expect(content).toContain("empresaVinculadaId: newEmpId");
		});
	});
});
