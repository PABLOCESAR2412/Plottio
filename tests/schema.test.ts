import { describe, expect, it } from "vitest";
import schema from "../convex/schema";

const EXPECTED_TABLES = [
	"empresas",
	"sucursales",
	"puntosVenta",
	"usuarios",
	"clientes",
	"vehiculos",
	"cotizaciones",
	"ordenesTrabajo",
	"auditoria",
	"citas",
	"roles",
	"permisos",
	"rolePermisos",
	"usuariosRolesSucursal",
	"inventarioItems",
	"inventarioSucursal",
	"movimientosInventario",
	"lotesProduccion",
	"placasStock",
	"kitsFlota",
	"catalogoServicios",
	"bugs",
	"plantillasPrecios",
	"categoriasPrecios",
];

describe("convex/schema", () => {
	it("define todas las tablas esperadas", () => {
		const tables = (
			schema as { tables?: Record<string, unknown> }
		).tables ?? schema;
		expect(Object.keys(tables)).toEqual(expect.arrayContaining(EXPECTED_TABLES));
	});
});