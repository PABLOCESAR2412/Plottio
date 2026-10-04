// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buscarClienteDuplicado,
	filtrarClientes,
	norm,
	normalizarTexto,
} from "../src/lib/clienteBusqueda";
import { ClientesView } from "../src/components/ClientesView";
import { useSessionStore } from "../src/store/useSessionStore";
import type { Cliente, Empresa } from "../src/types/data";

// Mock de Convex
const mockClientesData = [
	{
		_id: "c1",
		_creationTime: 1700000000000,
		nombre: "Carlos Pérez",
		identificacion: "1710034065",
		telefono: "0991234567",
		email: "carlos.perez@correo.com",
		direccion: "Av. Shyris y Naciones Unidas",
		empresaId: "emp_1",
		empresaVinculadaId: "emp_1",
	},
	{
		_id: "c2",
		_creationTime: 1700000001000,
		nombre: "María Álvarez",
		identificacion: "0912345678",
		telefono: "0987654321",
		email: "maria.alvarez@correo.com",
		direccion: "Calle 10 de Agosto",
		empresaId: null,
	},
	{
		_id: "c3",
		_creationTime: 1700000002000,
		nombre: "Flotas Andinas S.A.",
		identificacion: "1790016919001",
		telefono: "022334455",
		email: "flotas@andinas.ec",
		direccion: "Panamericana Norte Km 5",
		empresaId: "emp_2",
		empresaVinculadaId: "emp_2",
	},
];

const mockVehiculosData = [
	{
		_id: "veh_1",
		propietarioId: "c1",
		propietarioTipo: "cliente",
		placa: "PBX-1234",
		categoria: "Camioneta",
		marca: "Chevrolet",
		modelo: "D-Max",
		anio: "2022",
		numeroSerie: "123456",
		estado: "Activo",
	},
];

const mockEmpresasData = [
	{
		_id: "emp_1",
		nombre: "Logística Veloz",
		ruc: "1791234567001",
		razonSocial: "Logística Veloz Cía. Ltda.",
		contactoNombre: "Juan Veloz",
		contactoTelefono: "0990001111",
		direccion: "Parque Industrial Norte",
		vehiculosIds: [],
	},
	{
		_id: "emp_2",
		nombre: "Transportes Andinos",
		ruc: "1790016919001",
		razonSocial: "Transportes y Carga Andinos S.A.",
		contactoNombre: "Rodrigo Andino",
		contactoTelefono: "022998877",
		direccion: "Av. Eloy Alfaro",
		vehiculosIds: [],
	},
];

import { getFunctionName } from "convex/server";

const mockConsultarIdentidadAction = vi.fn().mockResolvedValue({
	encontrado: false,
});
const mockCreateClienteMut = vi.fn();
const mockUpdateClienteMut = vi.fn();
const mockDeleteClienteMut = vi.fn();
const mockCreateClienteConEmpresaMut = vi.fn();
const mockCreateEmpresaMut = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (queryName: any, args: any) => {
		if (args === "skip") return [];
		const name = getFunctionName(queryName);
		if (name === "clientes:fetchClientes") return mockClientesData;
		if (name === "vehiculos:fetchVehiculos") return mockVehiculosData;
		if (name === "organizacion:getEmpresas") return mockEmpresasData;
		return [];
	},
	useMutation: (mutationName: any) => {
		const name = getFunctionName(mutationName);
		if (name === "clientes:createClienteConEmpresa")
			return mockCreateClienteConEmpresaMut;
		if (name === "clientes:createCliente")
			return mockCreateClienteMut;
		if (name === "clientes:updateCliente")
			return mockUpdateClienteMut;
		if (name === "clientes:deleteCliente")
			return mockDeleteClienteMut;
		if (name === "organizacion:createEmpresa")
			return mockCreateEmpresaMut;
		return vi.fn();
	},
	useAction: () => mockConsultarIdentidadAction,
}));

describe("Tarea 30 (P0 - Fase 6): Búsqueda Avanzada de Clientes y Verificación Preventiva de Duplicados en BD", () => {
	const clientesSample: Cliente[] = mockClientesData.map((c) => ({
		...c,
		id: c._id,
		createdAt: "01/01/2026",
	}));

	const empresasSample: Empresa[] = mockEmpresasData.map((e) => ({
		...e,
		id: e._id,
	}));

	beforeEach(() => {
		vi.clearAllMocks();
		useSessionStore.setState({
			currentUser: {
				id: "usr_admin",
				nombre: "Admin Taller",
				email: "admin@taller.com",
				rol: "SuperAdmin",
				activo: true,
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// =========================================================================
	// 1. BÚSQUEDA AVANZADA Y NORMALIZADA (LÓGICA PURA)
	// =========================================================================
	describe("1. Búsqueda Avanzada y Normalización de Cadenas", () => {
		it("normaliza cadenas eliminando tildes, pasando a minúsculas y eliminando espacios extremos", () => {
			expect(norm("  PÉREZ  ")).toBe("perez");
			expect(norm("Álvarez")).toBe("alvarez");
			expect(norm("Logística Cía. Ltda.")).toBe("logistica cia. ltda.");
			expect(normalizarTexto("  Ñandú  ")).toBe("nandu");
		});

		it("a) Encuentra clientes por Cédula / RUC (identificacion)", () => {
			// Cédula exacta
			const resCedula = filtrarClientes(clientesSample, empresasSample, "1710034065");
			expect(resCedula).toHaveLength(1);
			expect(resCedula[0].nombre).toBe("Carlos Pérez");

			// Cédula parcial
			const resParcial = filtrarClientes(clientesSample, empresasSample, "171003");
			expect(resParcial).toHaveLength(1);
			expect(resParcial[0].id).toBe("c1");

			// RUC de 13 dígitos
			const resRuc = filtrarClientes(clientesSample, empresasSample, "1790016919001");
			expect(resRuc).toHaveLength(1);
			expect(resRuc[0].nombre).toBe("Flotas Andinas S.A.");

			// Búsqueda con guiones o espacios en el término
			const resGuiones = filtrarClientes(clientesSample, empresasSample, "1710-034-065");
			expect(resGuiones).toHaveLength(1);
			expect(resGuiones[0].id).toBe("c1");
		});

		it("b) Encuentra clientes por Nombre con o sin acentos/tildes e insensible a mayúsculas", () => {
			// Búsqueda sin tilde sobre nombre con tilde en BD
			const resSinTilde = filtrarClientes(clientesSample, empresasSample, "perez");
			expect(resSinTilde).toHaveLength(1);
			expect(resSinTilde[0].nombre).toBe("Carlos Pérez");

			// Búsqueda con tilde sobre nombre sin tilde o con tilde
			const resConTilde = filtrarClientes(clientesSample, empresasSample, "PÉREZ");
			expect(resConTilde).toHaveLength(1);
			expect(resConTilde[0].nombre).toBe("Carlos Pérez");

			// Caso María Álvarez
			const resAlvarez = filtrarClientes(clientesSample, empresasSample, "alvarez");
			expect(resAlvarez).toHaveLength(1);
			expect(resAlvarez[0].nombre).toBe("María Álvarez");

			const resMaria = filtrarClientes(clientesSample, empresasSample, "maria");
			expect(resMaria).toHaveLength(1);
			expect(resMaria[0].nombre).toBe("María Álvarez");
		});

		it("c) Encuentra clientes por Dirección y Teléfono", () => {
			// Por dirección
			const resDireccion = filtrarClientes(clientesSample, empresasSample, "shyris");
			expect(resDireccion).toHaveLength(1);
			expect(resDireccion[0].nombre).toBe("Carlos Pérez");

			const resDireccion2 = filtrarClientes(clientesSample, empresasSample, "panamericana");
			expect(resDireccion2).toHaveLength(1);
			expect(resDireccion2[0].nombre).toBe("Flotas Andinas S.A.");

			// Por teléfono exacto y parcial
			const resTel = filtrarClientes(clientesSample, empresasSample, "0991234567");
			expect(resTel).toHaveLength(1);
			expect(resTel[0].nombre).toBe("Carlos Pérez");

			const resTelParcial = filtrarClientes(clientesSample, empresasSample, "0987");
			expect(resTelParcial).toHaveLength(1);
			expect(resTelParcial[0].nombre).toBe("María Álvarez");

			// Por email
			const resEmail = filtrarClientes(clientesSample, empresasSample, "flotas@andinas");
			expect(resEmail).toHaveLength(1);
			expect(resEmail[0].nombre).toBe("Flotas Andinas S.A.");
		});

		it("d) Encuentra clientes por Empresa vinculada (nombre y razón social)", () => {
			// Por nombre de empresa vinculada
			const resEmpresaNombre = filtrarClientes(clientesSample, empresasSample, "Logística Veloz");
			expect(resEmpresaNombre).toHaveLength(1);
			expect(resEmpresaNombre[0].nombre).toBe("Carlos Pérez");

			// Sin tilde en empresa
			const resEmpresaSinTilde = filtrarClientes(clientesSample, empresasSample, "logistica");
			expect(resEmpresaSinTilde).toHaveLength(1);
			expect(resEmpresaSinTilde[0].nombre).toBe("Carlos Pérez");

			// Por razón social de empresa vinculada
			const resRazonSocial = filtrarClientes(clientesSample, empresasSample, "Cía. Ltda.");
			expect(resRazonSocial).toHaveLength(1);
			expect(resRazonSocial[0].nombre).toBe("Carlos Pérez");

			const resTransportes = filtrarClientes(clientesSample, empresasSample, "Transportes Andinos");
			expect(resTransportes).toHaveLength(1);
			expect(resTransportes[0].nombre).toBe("Flotas Andinas S.A.");
		});

		it("devuelve todos los clientes si el término está vacío y lista vacía si no hay coincidencias", () => {
			expect(filtrarClientes(clientesSample, empresasSample, "")).toHaveLength(3);
			expect(filtrarClientes(clientesSample, empresasSample, "   ")).toHaveLength(3);
			expect(filtrarClientes(clientesSample, empresasSample, "inexistente_xyz_999")).toHaveLength(0);
		});
	});

	// =========================================================================
	// 2. VERIFICACIÓN PREVENTIVA DE DUPLICADOS EN BD (LÓGICA PURA)
	// =========================================================================
	describe("2. Detección Preventiva de Duplicados en BD Local", () => {
		it("detecta cliente existente por cédula exacta de 10 dígitos", () => {
			const dup = buscarClienteDuplicado(clientesSample, "1710034065");
			expect(dup).not.toBeNull();
			expect(dup?.nombre).toBe("Carlos Pérez");
			expect(dup?.id).toBe("c1");
		});

		it("detecta cliente existente por RUC de 13 dígitos", () => {
			const dup = buscarClienteDuplicado(clientesSample, "1790016919001");
			expect(dup).not.toBeNull();
			expect(dup?.nombre).toBe("Flotas Andinas S.A.");
		});

		it("detecta duplicado ignorando espacios o caracteres no numéricos", () => {
			const dup = buscarClienteDuplicado(clientesSample, " 1710-034-065 ");
			expect(dup).not.toBeNull();
			expect(dup?.id).toBe("c1");
		});

		it("retorna null si la identificación no existe en la base de datos", () => {
			const dup = buscarClienteDuplicado(clientesSample, "1710034057");
			expect(dup).toBeNull();
		});

		it("retorna null si la identificación tiene menos de 10 dígitos (aún en tipeo)", () => {
			const dup = buscarClienteDuplicado(clientesSample, "171003");
			expect(dup).toBeNull();
		});
	});

	// =========================================================================
	// 3. PRUEBAS DEL COMPONENTE ClientesView (UI + FLUJO REACTIVO)
	// =========================================================================
	describe("3. Comportamiento en la Interfaz (ClientesView)", () => {
		it("filtra reactivamente la lista de clientes al escribir Cédula o RUC en el buscador", () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			// Al inicio se renderizan los 3 clientes
			expect(screen.getAllByText("Carlos Pérez").length).toBeGreaterThan(0);
			expect(screen.getAllByText("María Álvarez").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Flotas Andinas S.A.").length).toBeGreaterThan(0);

			const searchInput = screen.getByPlaceholderText(/Buscar por nombre, C\.I\.\/RUC, empresa, tlf/i);

			// Buscar por cédula de Carlos Pérez
			fireEvent.change(searchInput, { target: { value: "1710034065" } });

			expect(screen.getAllByText("Carlos Pérez").length).toBeGreaterThan(0);
			expect(screen.queryByText("María Álvarez")).toBeNull();
			expect(screen.queryByText("Flotas Andinas S.A.")).toBeNull();
		});

		it("filtra clientes buscando por nombre de empresa vinculada en la UI", () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			const searchInput = screen.getByPlaceholderText(/Buscar por nombre, C\.I\.\/RUC, empresa, tlf/i);

			// Buscar por empresa "Logística Veloz"
			fireEvent.change(searchInput, { target: { value: "Logística" } });

			expect(screen.getAllByText("Carlos Pérez").length).toBeGreaterThan(0);
			expect(screen.queryByText("María Álvarez")).toBeNull();
		});

		it("al ingresar una cédula existente en el modal de creación, muestra la tarjeta de advertencia preventiva", async () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			// Abrir modal de creación
			const nuevoBtn = screen.getByRole("button", { name: /Nuevo Cliente/i });
			fireEvent.click(nuevoBtn);

			expect(screen.getByText("Registrar Nuevo Cliente")).toBeDefined();

			const idInput = screen.getByLabelText(/C\.I\. \/ RUC \*/i);

			// Ingresar cédula existente de Carlos Pérez
			fireEvent.change(idInput, { target: { value: "1710034065" } });

			// La tarjeta visual preventiva debe aparecer
			await waitFor(() => {
				expect(screen.getByTestId("tarjeta-cliente-existente")).toBeDefined();
			});

			// Verifica contenido de la tarjeta
			expect(
				screen.getByText("Cliente ya registrado en la base de datos"),
			).toBeDefined();
			expect(screen.getAllByText("Carlos Pérez").length).toBeGreaterThan(0);
			expect(screen.getAllByText("1710034065").length).toBeGreaterThan(0);
			const tarjeta = screen.getByTestId("tarjeta-cliente-existente");
			expect(tarjeta.textContent).toContain("Logística Veloz");

			// Verifica que el botón de submit 'Registrar Cliente' esté deshabilitado
			const submitBtn = screen.getByRole("button", { name: /Registrar Cliente/i });
			expect(submitBtn.hasAttribute("disabled")).toBe(true);

			// Verifica que la acción externa al SRI no haya sido invocada
			expect(mockConsultarIdentidadAction).not.toHaveBeenCalled();
		});

		it("el botón 'Ver Cliente en Lista' en la tarjeta de duplicado cierra el modal y selecciona al cliente", async () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			// Abrir modal
			fireEvent.click(screen.getByRole("button", { name: /Nuevo Cliente/i }));

			const idInput = screen.getByLabelText(/C\.I\. \/ RUC \*/i);
			fireEvent.change(idInput, { target: { value: "1710034065" } });

			await waitFor(() => {
				expect(screen.getByTestId("tarjeta-cliente-existente")).toBeDefined();
			});

			const verEnListaBtn = screen.getByRole("button", { name: /Ver Cliente en Lista/i });
			fireEvent.click(verEnListaBtn);

			// El modal de creación debe haberse cerrado
			expect(screen.queryByText("Registrar Nuevo Cliente")).toBeNull();

			// El detalle de Carlos Pérez debe estar activo en la vista
			expect(screen.getByRole("heading", { level: 2, name: "Carlos Pérez" })).toBeDefined();
		});

		it("el botón 'Editar este Cliente' en la tarjeta de duplicado cierra el modal de creación y abre el modal de edición", async () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			// Abrir modal
			fireEvent.click(screen.getByRole("button", { name: /Nuevo Cliente/i }));

			const idInput = screen.getByLabelText(/C\.I\. \/ RUC \*/i);
			fireEvent.change(idInput, { target: { value: "1710034065" } });

			await waitFor(() => {
				expect(screen.getByTestId("tarjeta-cliente-existente")).toBeDefined();
			});

			const editarClienteBtn = screen.getByRole("button", { name: /Editar este Cliente/i });
			fireEvent.click(editarClienteBtn);

			// El modal de creación se cierra
			expect(screen.queryByText("Registrar Nuevo Cliente")).toBeNull();

			// El modal de edición debe estar abierto con los datos del cliente
			expect(screen.getByText("Editar Datos de Cliente")).toBeDefined();
			const nombreInput = screen.getByDisplayValue("Carlos Pérez");
			expect(nombreInput).toBeDefined();
		});

		it("al ingresar una cédula NO existente en el modal de creación, no muestra tarjeta de duplicado", async () => {
			render(
				React.createElement(ClientesView, {
					onNavigate: vi.fn(),
					onSelectVehicle: vi.fn(),
				}),
			);

			// Abrir modal
			fireEvent.click(screen.getByRole("button", { name: /Nuevo Cliente/i }));

			const idInput = screen.getByLabelText(/C\.I\. \/ RUC \*/i);
			// Cédula válida ecuatoriana que no existe en el mock
			fireEvent.change(idInput, { target: { value: "1710034057" } });

			// No debe mostrar la tarjeta de duplicado
			expect(screen.queryByTestId("tarjeta-cliente-existente")).toBeNull();

			// El botón de submit no está deshabilitado por duplicado
			const submitBtn = screen.getByRole("button", { name: /Registrar Cliente/i });
			expect(submitBtn.hasAttribute("disabled")).toBe(false);
		});
	});
});
