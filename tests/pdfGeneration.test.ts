import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generarPdfCotizacion } from "../src/lib/pdf/cotizacionPdf";
import {
	generarPdfReporte,
	generarPdfReporteAuditoria,
} from "../src/lib/pdf/reportePdf";
import { ConfigPlantillas } from "../src/components/configuracion/ConfigPlantillas";
import { api } from "../convex/_generated/api";

describe("Tarea 8: Modularización de God Components y duplicación de PDF", () => {
	describe("1. Utilidad de PDF para Cotizaciones (generarPdfCotizacion)", () => {
		it("debe ser una función ejecutable", () => {
			expect(typeof generarPdfCotizacion).toBe("function");
		});

		it("debe generar el PDF correctamente con datos completos de cotización", () => {
			const cotMock = {
				_id: "COT-2026-999",
				fecha: "2026-10-03",
				clienteNombre: "Transportes Integrados S.A.",
				clienteTelefono: "+593991234567",
				vehiculoTipo: "Bus Interprovincial",
				placa: "PBX-1234",
				items: [
					{
						descripcion: "Rotulado Lateral Completo Vinil Arlon",
						cantidad: 2,
						precioUnitario: 350,
					},
					{
						descripcion: "Stickers Reflectivos Traseros Homologados",
						cantidad: 4,
						precioUnitario: 45,
					},
				],
				total: 880,
			};

			const doc = generarPdfCotizacion(cotMock, "Plottio Taller Central");
			expect(doc).toBeDefined();
			expect(typeof doc.save).toBe("function");
			expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
		});

		it("no debe fallar ante objeto vacío {}", () => {
			expect(() => {
				const doc = generarPdfCotizacion({});
				expect(doc).toBeDefined();
				expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
			}).not.toThrow();
		});

		it("no debe fallar ante valores null o undefined", () => {
			expect(() => {
				const docNull = generarPdfCotizacion(null);
				expect(docNull).toBeDefined();

				const docUndef = generarPdfCotizacion(undefined);
				expect(docUndef).toBeDefined();
			}).not.toThrow();
		});

		it("debe calcular el total automáticamente si cot.total no viene especificado", () => {
			const cotSinTotal = {
				_id: "COT-AUTO-01",
				clienteNombre: "Cliente Sin Total",
				items: [
					{ descripcion: "Sticker Puerta", cantidad: 3, precioUnitario: 20 },
					{ descripcion: "Sticker Capot", cantidad: 1, precioUnitario: 50 },
				],
			};

			const doc = generarPdfCotizacion(cotSinTotal);
			expect(doc).toBeDefined();
			expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
		});

		it("debe paginar adecuadamente cuando hay una lista extensa de ítems", () => {
			const muchosItems = Array.from({ length: 45 }, (_, i) => ({
				descripcion: `Ítem de rotulación especial número ${i + 1}`,
				cantidad: i + 1,
				precioUnitario: 10 + i,
			}));

			const cotLarga = {
				_id: "COT-EXTENSA",
				clienteNombre: "Flota Masiva",
				items: muchosItems,
			};

			const doc = generarPdfCotizacion(cotLarga);
			expect(doc.getNumberOfPages()).toBeGreaterThan(1);
		});
	});

	describe("2. Utilidad de PDF para Reportes y Auditoría (generarPdfReporteAuditoria)", () => {
		it("debe exportar funciones ejecutables generarPdfReporteAuditoria y generarPdfReporte", () => {
			expect(typeof generarPdfReporteAuditoria).toBe("function");
			expect(typeof generarPdfReporte).toBe("function");
		});

		it("debe generar reporte operativo con métricas, clientes top y categorías", () => {
			const ordenesMock = [
				{
					id: "ORD-001",
					clienteNombre: "Cooperativa Loja",
					clienteTelefono: "099111222",
					vehiculoTipo: "Bus Interprovincial",
					placa: "LAA-0987",
					estado: "Listo",
					total: 1200,
					progreso: 100,
					fechaInicio: "2026-10-01",
				},
				{
					id: "ORD-002",
					clienteNombre: "Flota Pichincha",
					clienteTelefono: "099333444",
					vehiculoTipo: "Camión Pesado",
					placa: "PAA-4321",
					estado: "En Proceso",
					total: 800,
					progreso: 50,
					fechaInicio: "2026-10-02",
				},
				{
					id: "ORD-003",
					clienteNombre: "Taxi Ejecutivo 15",
					clienteTelefono: "099555666",
					vehiculoTipo: "Taxi",
					placa: "PBC-1122",
					estado: "Cancelado",
					total: 150,
					progreso: 0,
					fechaInicio: "2026-10-02",
				},
			];

			const doc = generarPdfReporteAuditoria(ordenesMock, "Admin General", "Plottio Matriz");
			expect(doc).toBeDefined();
			expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
		});

		it("debe generar reporte en modo auditoría cuando los registros son logs", () => {
			const logsMock = [
				{
					fecha: "2026-10-03T10:15:00Z",
					tablaAfectada: "ordenes",
					accion: "crear_orden",
					usuarioNombre: "Carlos Supervisor",
					registroId: "ORD-501",
				},
				{
					fecha: "2026-10-03T11:30:00Z",
					tablaAfectada: "cotizaciones",
					accion: "aprobar",
					usuarioNombre: "Admin General",
					registroId: "COT-902",
				},
			];

			const doc = generarPdfReporteAuditoria(logsMock, "Carlos Supervisor");
			expect(doc).toBeDefined();
			expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
		});

		it("no debe fallar ante arreglo vacío []", () => {
			expect(() => {
				const doc = generarPdfReporteAuditoria([]);
				expect(doc).toBeDefined();
				expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
			}).not.toThrow();
		});

		it("no debe fallar ante null o undefined", () => {
			expect(() => {
				const docNull = generarPdfReporteAuditoria(null);
				expect(docNull).toBeDefined();

				const docUndef = generarPdfReporteAuditoria(undefined);
				expect(docUndef).toBeDefined();
			}).not.toThrow();
		});

		it("debe tolerar registros con campos indefinidos o tipos inconsistentes", () => {
			const inconsistentes = [
				{},
				{ id: "1", total: "500" as any },
				{ clienteNombre: undefined, total: null as any },
				{ estado: "Listo", vehiculoTipo: "" },
			];

			expect(() => {
				const doc = generarPdfReporte(inconsistentes);
				expect(doc).toBeDefined();
			}).not.toThrow();
		});

		it("debe paginar el historial detallado de órdenes cuando la lista es extensa", () => {
			const muchasOrdenes = Array.from({ length: 60 }, (_, i) => ({
				id: `ORD-MASIVA-${i + 1}`,
				clienteNombre: `Cliente Comercial ${i + 1}`,
				vehiculoTipo: i % 2 === 0 ? "Bus Urbano" : "Camioneta",
				placa: `P${i}-123`,
				estado: i % 3 === 0 ? "Listo" : "En Proceso",
				total: 100 + i * 10,
			}));

			const doc = generarPdfReporte(muchasOrdenes);
			expect(doc.getNumberOfPages()).toBeGreaterThan(2);
		});
	});

	describe("3. Modularización de componentes y eliminación de duplicación de jsPDF", () => {
		it("CotizacionesView.tsx no debe importar jsPDF directamente", () => {
			const cotizacionesPath = path.resolve(__dirname, "../src/components/CotizacionesView.tsx");
			const content = fs.readFileSync(cotizacionesPath, "utf-8");

			expect(content).not.toMatch(/from\s+["']jspdf["']/);
			expect(content).toContain("generarPdfCotizacion");
		});

		it("ConfiguracionView.tsx no debe importar jsPDF directamente", () => {
			const configPath = path.resolve(__dirname, "../src/components/ConfiguracionView.tsx");
			const content = fs.readFileSync(configPath, "utf-8");

			expect(content).not.toMatch(/from\s+["']jspdf["']/);
			expect(content).toContain("generarPdfReporte");
			expect(content).toContain("<ConfigPlantillas />");
		});

		it("ConfigPlantillas debe ser un componente React funcional modularizado", () => {
			expect(typeof ConfigPlantillas).toBe("function");
		});

		it("ConfigPlantillas debe conectar exclusivamente con los endpoints declarados api.plantillas.getPlantillas y api.plantillas.getCategoriasFull", () => {
			const plantillasPath = path.resolve(
				__dirname,
				"../src/components/configuracion/ConfigPlantillas.tsx",
			);
			const content = fs.readFileSync(plantillasPath, "utf-8");

			// Validar que se usan las queries correctas
			expect(content).toContain("api.plantillas.getPlantillas");
			expect(content).toContain("api.plantillas.getCategoriasFull");

			// Validar que no se usan endpoints inexistentes o desalineados
			expect(content).not.toContain("api.plantillas.getPlantillasPrecios");
			expect(content).not.toContain("api.plantillas.getCategoriasPrecios");

			// Validar que los endpoints existen en el esquema API de Convex
			expect(api.plantillas.getPlantillas).toBeDefined();
			expect(api.plantillas.getCategoriasFull).toBeDefined();
			expect(api.plantillas.createPlantillaPrecio).toBeDefined();
			expect(api.plantillas.updatePlantillaPrecio).toBeDefined();
			expect(api.plantillas.deletePlantillaPrecio).toBeDefined();
			expect(api.plantillas.addCategoriaPrecio).toBeDefined();
			expect(api.plantillas.updateCategoriaPrecio).toBeDefined();
			expect(api.plantillas.deleteCategoriaPrecio).toBeDefined();
		});
	});
});
