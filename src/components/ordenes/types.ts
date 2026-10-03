export interface ClienteOption {
	id: string;
	nombre: string;
	telefono: string;
	email: string;
	empresaId: string | null;
	direccion?: string;
}

export interface EmpresaOption {
	id: string;
	nombre: string;
	ruc: string;
	direccion?: string;
}

export interface VehiculoOption {
	id: string;
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	año: string;
	anio: string;
	numeroSerie: string;
}

export interface ItemOrdenTrabajo {
	descripcion: string;
	cantidad: number;
	precioUnitario: number;
	completado: boolean;
}

export interface OrdenTrabajo {
	_id: string;
	clienteNombre: string;
	clienteTelefono: string;
	placa: string;
	vehiculoTipo: string;
	items: ItemOrdenTrabajo[];
	total: number;
	prioridad: "Alta" | "Media" | "Baja";
	progreso: number;
	estado: "Pendiente" | "En Proceso" | "Listo" | "Entregado" | "Cancelado";
	fechaInicio: string;
	fechaFin: string;
	notas?: string[];
	fotos?: string[];
	sucursalId?: string;
	pvId?: string;
	pvOrigen?: string;
}

export type OrderStatusTab =
	| "Todos"
	| "Pendiente"
	| "En Proceso"
	| "Listo"
	| "Entregado"
	| "Cancelado";
