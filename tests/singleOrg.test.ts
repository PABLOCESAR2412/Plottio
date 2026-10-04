import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkPermission, getCurrentUserContext } from "../convex/auth";
import { createCliente, fetchClientes } from "../convex/clientes";
import { createCotizacion, fetchCotizaciones } from "../convex/cotizaciones";
import { fetchOrdenes } from "../convex/ordenes";
import { createVehiculo, fetchVehiculos } from "../convex/vehiculos";
import { createCita, fetchCitas } from "../convex/citas";
import { getAlertasStockMinimo, getInventarioConsolidado } from "../convex/inventario";
import { getUsuarios } from "../convex/usuarios";
import { generarCotizacionesMasivasDesdeKit } from "../convex/kitsFlota";
import { getDashboardSucursal, getReporteIngresos } from "../convex/reportes";

type Doc = Record<string, any>;

function createMockCtx(initialData: Record<string, Doc[]>) {
	const store: Record<string, Doc[]> = {};
	for (const [table, docs] of Object.entries(initialData)) {
		store[table] = docs.map((d) => ({ ...d }));
	}

	let idCounter = 5000;

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

describe("Tarea 23: Eliminación Radical de Multi-Tenant, Sucursales y Puntos de Venta (Arquitectura Single-Org)", () => {
	function setupSingleOrgFixture() {
		return createMockCtx({
			empresas: [
				{
					_id: "emp_taller_unico",
					nombre: "Taller Plottio Central",
					ruc: "1790011111001",
					razonSocial: "Plottio Taller Central Cía. Ltda.",
					activa: true,
				},
			],
			usuarios: [
				{
					_id: "u_admin",
					nombre: "Admin Central",
					email: "admin@plottio.com",
					empresaId: "emp_taller_unico",
					// Sin sucursalId ni pvId
					activo: true,
				},
				{
					_id: "u_mecanico",
					nombre: "Mecánico Operativo",
					email: "mecanico@plottio.com",
					empresaId: "emp_taller_unico",
					// Sin sucursalId ni pvId
					activo: true,
				},
			],
			roles: [
				{ _id: "rol_admin", nombre: "SuperAdmin", activo: true },
				{ _id: "rol_mecanico", nombre: "Mecánico", activo: true },
			],
			permisos: [
				{ _id: "p_orden", clave: "ver_ordenes", nombre: "ver_ordenes" },
				{ _id: "p_edit_orden", clave: "editar_orden", nombre: "editar_orden" },
				{ _id: "p_cliente", clave: "ver_clientes", nombre: "ver_clientes" },
				{ _id: "p_crear_cli", clave: "crear_cliente", nombre: "crear_cliente" },
				{ _id: "p_inv", clave: "ver_inventario", nombre: "ver_inventario" },
				{ _id: "p_usuarios", clave: "ver_usuarios", nombre: "ver_usuarios" },
				{ _id: "p_crear_usuarios", clave: "crear_usuarios", nombre: "crear_usuarios" },
				{ _id: "p_reportes", clave: "ver_reportes", nombre: "ver_reportes" },
				{ _id: "p_cotizacion", clave: "crear_cotizacion", nombre: "crear_cotizacion" },
				{ _id: "p_ver_cot", clave: "ver_cotizaciones", nombre: "ver_cotizaciones" },
			],
			rolePermisos: [
				{ _id: "rp_1", roleId: "rol_mecanico", permisoId: "p_orden" },
				{ _id: "rp_2", roleId: "rol_mecanico", permisoId: "p_edit_orden" },
				{ _id: "rp_3", roleId: "rol_mecanico", permisoId: "p_cliente" },
				{ _id: "rp_4", roleId: "rol_mecanico", permisoId: "p_crear_cli" },
				{ _id: "rp_5", roleId: "rol_mecanico", permisoId: "p_inv" },
				{ _id: "rp_6", roleId: "rol_mecanico", permisoId: "p_usuarios" },
				{ _id: "rp_7", roleId: "rol_mecanico", permisoId: "p_reportes" },
				{ _id: "rp_8", roleId: "rol_mecanico", permisoId: "p_cotizacion" },
				{ _id: "rp_9", roleId: "rol_mecanico", permisoId: "p_ver_cot" },
			],
			usuariosRolesSucursal: [
				{ _id: "urs_1", usuarioId: "u_admin", roleId: "rol_admin", activo: true },
				{ _id: "urs_2", usuarioId: "u_mecanico", roleId: "rol_mecanico", activo: true },
			],
			clientes: [
				{
					_id: "cli_1",
					empresaId: "emp_taller_unico",
					nombre: "Consumidor Final",
					telefono: "0990000000",
					email: "cf@email.com",
					identificacion: "9999999999",
					esClienteGlobal: true,
				},
			],
			vehiculos: [
				{
					_id: "veh_1",
					empresaId: "emp_taller_unico",
					placa: "ABC-1234",
					marca: "Toyota",
					modelo: "Hilux",
					propietarioId: "cli_1",
					propietarioTipo: "cliente",
				},
			],
			ordenesTrabajo: [
				{
					_id: "ot_1",
					empresaId: "emp_taller_unico",
					numeroOrden: "OT-0001",
					clienteNombre: "Consumidor Final",
					clienteTelefono: "0990000000",
					clienteId: "cli_1",
					vehiculoId: "veh_1",
					placa: "ABC-1234",
					vehiculoTipo: "Camioneta",
					estado: "Entregado",
					fechaInicio: new Date().toISOString(),
					fechaFin: new Date().toISOString(),
					total: 150,
					items: [],
				},
			],
			cotizaciones: [
				{
					_id: "cot_1",
					empresaId: "emp_taller_unico",
					numeroCotizacion: "COT-0001",
					clienteId: "cli_1",
					estado: "APROBADA",
					total: 150,
				},
			],
			citas: [
				{
					_id: "cita_1",
					empresaId: "emp_taller_unico",
					clienteId: "cli_1",
					fechaHora: "2026-10-10T10:00:00Z",
					estado: "CONFIRMADA",
				},
			],
			catalogoServicios: [
				{
					_id: "srv_mock",
					empresaId: "emp_taller_unico",
					nombre: "Instalación PPF",
					precioBase: 100,
					activo: true,
				},
			],
			kitsFlota: [
				{
					_id: "kit_1",
					empresaId: "emp_taller_unico",
					nombre: "Kit Flota 1",
					activo: true,
					items: [
						{
							servicioId: "srv_mock",
							cantidad_por_unidad: 1,
							precio_unitario: 100,
						},
					],
				},
			],
			inventarioItems: [
				{
					_id: "item_1",
					empresaId: "emp_taller_unico",
					nombre: "Lámina Wrap Mate",
					tipo: "vinil",
					costoUnitario: 35,
					unidadMedida: "m",
					activo: true,
				},
			],
			inventarioSucursal: [
				{
					_id: "st_1",
					itemId: "item_1",
					cantidad: 5,
					cantidadMinima: 10,
				},
			],
			auditoria: [],
		});
	}

	describe("1. Backend: Contexto y funciones operativas en Organización Única", () => {
		it("getCurrentUserContext opera fluidamente sin requerir sucursal ni punto de venta", async () => {
			const { ctx } = setupSingleOrgFixture();

			const userCtx = await getCurrentUserContext(ctx as any, "u_mecanico" as any);
			expect(userCtx.usuarioId).toBe("u_mecanico");
			expect(userCtx.empresa?.id).toBe("emp_taller_unico");
			expect(userCtx.sucursal).toBeNull();
			expect(userCtx.pv).toBeNull();
			expect(userCtx.permisos).toContain("ver_ordenes");
			expect(userCtx.permisos).toContain("crear_cliente");
		});

		it("checkPermission valida permisos directos sin dependencia de sucursal", async () => {
			const { ctx } = setupSingleOrgFixture();

			const puedeVer = await checkPermission(ctx as any, "u_mecanico" as any, "ver_ordenes");
			expect(puedeVer).toBe(true);

			const puedeInventario = await checkPermission(ctx as any, "u_mecanico" as any, "ver_inventario");
			expect(puedeInventario).toBe(true);

			const tienePermisoInexistente = await checkPermission(ctx as any, "u_mecanico" as any, "permiso_fantasma");
			expect(tienePermisoInexistente).toBe(false);
		});

		it("fetchClientes y createCliente no exigen sucursalId", async () => {
			const { ctx, store } = setupSingleOrgFixture();

			const clientesList = await (fetchClientes as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(clientesList).toHaveLength(1);
			expect(clientesList[0].nombre).toBe("Consumidor Final");

			const nuevoCliente = await (createCliente as any)._handler(ctx, {
				usuarioId: "u_mecanico",
				nombre: "Empresa Transportes B2B",
				telefono: "0987654321",
				email: "flota@transportes.com",
				identificacion: "1799999999001",
			});

			expect(nuevoCliente).toBeDefined();
			expect(nuevoCliente.empresaId).toBe("emp_taller_unico");
			expect(store.clientes).toHaveLength(2);
		});

		it("fetchOrdenes retorna todas las órdenes del taller sin filtrar por sucursales", async () => {
			const { ctx } = setupSingleOrgFixture();

			const ordenes = await (fetchOrdenes as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(ordenes).toHaveLength(1);
			expect(ordenes[0].numeroOrden).toBe("OT-0001");
			expect(ordenes[0].sucursalId).toBeUndefined();
		});

		it("fetchCotizaciones y createCotizacion operan sin sucursal ni punto de venta", async () => {
			const { ctx } = setupSingleOrgFixture();

			const cotizaciones = await (fetchCotizaciones as any)._handler(ctx, { usuarioId: "u_admin" });
			expect(cotizaciones).toHaveLength(1);

			const nuevaCot = await (createCotizacion as any)._handler(ctx, {
				usuarioId: "u_admin",
				clienteId: "cli_1",
				subtotal: 100,
				descuento: 0,
				total: 115,
				items: [],
			});

			expect(nuevaCot).toBeDefined();
			expect(nuevaCot.empresaId).toBe("emp_taller_unico");
		});

		it("fetchVehiculos y createVehiculo operan a nivel central sin sucursalId", async () => {
			const { ctx } = setupSingleOrgFixture();

			const vehiculos = await (fetchVehiculos as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(vehiculos).toHaveLength(1);

			const nuevoVeh = await (createVehiculo as any)._handler(ctx, {
				usuarioId: "u_mecanico",
				placa: "XYZ-9999",
				marca: "Ford",
				modelo: "F-150",
				propietarioId: "cli_1",
				propietarioTipo: "cliente",
			});

			expect(nuevoVeh).toBeDefined();
			expect(nuevoVeh.placa).toBe("XYZ-9999");
			expect(nuevoVeh.empresaId).toBe("emp_taller_unico");
		});

		it("fetchCitas y createCita operan sin requerir sucursal", async () => {
			const { ctx } = setupSingleOrgFixture();

			const citas = await (fetchCitas as any)._handler(ctx, { usuarioId: "u_admin" });
			expect(citas).toHaveLength(1);

			const nuevaCita = await (createCita as any)._handler(ctx, {
				usuarioId: "u_admin",
				clienteId: "cli_1",
				fechaHora: "2026-10-15T09:00:00Z",
				servicioId: "srv_mock" as any,
			});

			expect(nuevaCita).toBeDefined();
			expect(nuevaCita.empresaId).toBe("emp_taller_unico");
		});

		it("inventario centralizado: getAlertasStockMinimo y getInventarioConsolidado operan para el taller central", async () => {
			const { ctx } = setupSingleOrgFixture();

			const alertas = await (getAlertasStockMinimo as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(alertas).toHaveLength(1);
			expect(alertas[0].sucursal_nombre).toBe("Taller Principal");

			const consolidado = await (getInventarioConsolidado as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(consolidado).toHaveLength(1);
			expect(consolidado[0].nombre).toBe("Lámina Wrap Mate");
			expect(consolidado[0].cantidad_total).toBe(5);
		});

		it("getUsuarios no falla cuando el usuario no tiene sucursal asignada", async () => {
			const { ctx } = setupSingleOrgFixture();

			const usuariosList = await (getUsuarios as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(usuariosList).toBeDefined();
			expect(usuariosList.length).toBeGreaterThanOrEqual(2);
			expect(usuariosList.some((u: any) => u.email === "mecanico@plottio.com")).toBe(true);
		});

		it("kitsFlota.ts y reportes.ts funcionan sin sucursal", async () => {
			const { ctx } = setupSingleOrgFixture();

			// kitsFlota: generarCotizacionesMasivasDesdeKit sin sucursal
			const resKit = await (generarCotizacionesMasivasDesdeKit as any)._handler(ctx, {
				usuarioId: "u_mecanico",
				kitId: "kit_1",
				clienteId: "cli_1",
				vehiculos: [{ vehiculoId: "veh_1", placa: "ABC-1234" }],
				modo: "independientes",
			});
			expect(resKit.cotizaciones).toHaveLength(1);
			expect(resKit.cotizaciones[0].empresaId).toBe("emp_taller_unico");
			expect(resKit.cotizaciones[0].sucursalId).toBeUndefined();

			// reportes: getDashboardSucursal y getReporteIngresos a nivel de empresa
			const dashSuc = await (getDashboardSucursal as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(dashSuc).toBeDefined();
			expect(dashSuc.ingresos_mes.total_mes).toBe(150);

			const reporteIngresos = await (getReporteIngresos as any)._handler(ctx, { usuarioId: "u_mecanico" });
			expect(reporteIngresos).toBeDefined();
			expect(reporteIngresos.length).toBeGreaterThanOrEqual(1);
			expect(reporteIngresos[0].cliente).toBe("Consumidor Final");
		});
	});

	describe("2. Frontend: Eliminación de selectores, badges y pestañas de sucursales", () => {
		const routesIndexPath = resolve(__dirname, "../src/routes/index.tsx");
		const configuracionPath = resolve(__dirname, "../src/components/ConfiguracionView.tsx");
		const clientesPath = resolve(__dirname, "../src/components/ClientesView.tsx");
		const ordenesPath = resolve(__dirname, "../src/components/OrdenesTrabajoView.tsx");
		const vehiculosPath = resolve(__dirname, "../src/components/VehiculosView.tsx");
		const cotizacionesPath = resolve(__dirname, "../src/components/CotizacionesView.tsx");
		const gestionUsuariosPath = resolve(__dirname, "../src/components/GestionUsuariosView.tsx");
		const inventarioPath = resolve(__dirname, "../src/components/InventarioView.tsx");

		const routesIndexCode = readFileSync(routesIndexPath, "utf-8");
		const configuracionCode = readFileSync(configuracionPath, "utf-8");
		const clientesCode = readFileSync(clientesPath, "utf-8");
		const ordenesCode = readFileSync(ordenesPath, "utf-8");
		const vehiculosCode = readFileSync(vehiculosPath, "utf-8");
		const cotizacionesCode = readFileSync(cotizacionesPath, "utf-8");
		const gestionUsuariosCode = readFileSync(gestionUsuariosPath, "utf-8");
		const inventarioCode = readFileSync(inventarioPath, "utf-8");

		it("routes/index.tsx no contiene selectores ni badges de sucursal en el header principal", () => {
			expect(routesIndexCode).not.toContain("<SucursalSelector");
			expect(routesIndexCode).not.toContain("<SucursalBadge");
			expect(routesIndexCode).not.toContain("SucursalSelector");
		});

		it("ConfiguracionView.tsx eliminó la pestaña de sucursales y no importa SucursalesAdminView", () => {
			expect(configuracionCode).not.toContain("SucursalesAdminView");
			expect(configuracionCode).not.toContain("tab === 'sucursales'");
			expect(configuracionCode).not.toContain('id: "sucursales"');
		});

		it("ClientesView.tsx no condiciona la visibilidad ni creación de clientes a currentUser.sucursalId", () => {
			expect(clientesCode).not.toContain("c.sucursalId === currentUser.sucursalId");
			expect(clientesCode).not.toContain("!c.sucursalId || c.sucursalId === currentUser.sucursalId");
		});

		it("OrdenesTrabajoView.tsx no filtra órdenes por sucursalId ni pvOrigen", () => {
			expect(ordenesCode).not.toContain("orden.sucursalId === currentUser.sucursalId");
			expect(ordenesCode).not.toContain("sucursalFiltro");
		});

		it("VehiculosView.tsx no filtra vehículos por sucursal ni condiciona creación a sucursalId", () => {
			expect(vehiculosCode).not.toContain("v.sucursalId === currentUser.sucursalId");
		});

		it("CotizacionesView.tsx no filtra ni asigna sucursalId ni pvId obligatorios", () => {
			expect(cotizacionesCode).not.toContain("cot.sucursalId === currentUser.sucursalId");
		});

		it("GestionUsuariosView.tsx e InventarioView.tsx no contienen textos ni selectores de Sucursal Asignada ni Punto de Venta ni modal de transferencias", () => {
			expect(gestionUsuariosCode).not.toContain("Sucursal Asignada");
			expect(gestionUsuariosCode).not.toContain("Punto de Venta Específico");
			expect(gestionUsuariosCode).not.toContain("u.sucursalId === currentUser.sucursalId");
			expect(gestionUsuariosCode).not.toContain("Administra los roles, sucursales y puntos de venta");

			expect(inventarioCode).not.toContain('title="Transferir"');
			expect(inventarioCode).not.toContain("showTransferModal");
			expect(inventarioCode).not.toContain("Transferir Inventario");
			expect(inventarioCode).not.toContain("Ubicación / Depósito (Opcional)");
		});
	});
});
