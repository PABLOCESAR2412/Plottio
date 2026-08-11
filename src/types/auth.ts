import type { Cliente, Empresa, Vehiculo } from "./data";

// Tipos de auth/sesión. Se re-exportan desde un lugar compartido para evitar
// drift entre cliente y backend (ver TODO: "Unificar RolUsuario").

export type RolUsuario =
	| "SuperAdmin"
	| "AdminSucursal"
	| "GerentePV"
	| "Cotizador"
	| "Instalador"
	| "Contador";

export interface Usuario {
	id: string;
	nombre: string;
	email: string;
	rol: RolUsuario;
	sucursalId: string | null;
	pvId: string | null;
	activo: boolean;
	empresaId?: string;
}

export type { Cliente, Empresa, Vehiculo };
