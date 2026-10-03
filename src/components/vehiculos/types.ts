import type {
	Cliente,
	Empresa,
	ServicioVehiculo,
	Vehiculo,
} from "../../types/data";

export type { Cliente, Empresa, ServicioVehiculo, Vehiculo };

export interface VehiculoFormData {
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	anio: string;
	numeroSerie?: string;
	propietarioId: string;
	propietarioTipo: "cliente" | "empresa";
	estado: "Activo" | "En Mantenimiento" | "Inactivo";
}

export interface OwnerDetails {
	nombre: string;
	telefono: string;
	tipo: string;
}

export interface OrdenVehiculoResumen {
	_id: string;
	fechaInicio: string;
	estado: string;
	items: Array<{ descripcion: string; cantidad: number }>;
}
