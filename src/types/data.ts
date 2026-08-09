// Tipos compartidos de datos de negocio.
// Antes vivían en `src/store/useAppStore.ts` junto al store legacy eliminado.
// Se usan principalmente como cast de resultados Convex (UI) — ver auditoría Fase 4.

export interface Sucursal {
	id: string;
	nombre: string;
	direccion: string;
	telefono: string;
	ruc?: string;
	gerenteId: string | null;
}

export interface PuntoVenta {
	id: string;
	sucursalId: string;
	nombre: string;
	ubicacion: string;
	telefono: string;
	gerenteId: string | null;
}

export interface Cliente {
	id: string;
	nombre: string;
	telefono: string;
	email: string;
	empresaId: string | null;
	createdAt: string;
	direccion?: string;
	sucursalId?: string;
	identificacion?: string;
}

export interface Empresa {
	id: string;
	nombre: string;
	ruc: string;
	contactoNombre: string;
	contactoTelefono: string;
	vehiculosIds: string[];
	direccion?: string;
	sucursalId?: string;
}

export interface ServicioVehiculo {
	id: string;
	fecha: string;
	descripcion: string;
	costo: number;
	estado: string;
}

export interface Vehiculo {
	id: string;
	propietarioId: string;
	propietarioTipo: "cliente" | "empresa";
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	año: string;
	numeroSerie: string;
	estado: "Activo" | "En Mantenimiento" | "Inactivo";
	servicios: ServicioVehiculo[];
	sucursalId?: string;
}

export interface ItemCotizacion {
	descripcion: string;
	cantidad: number;
	precioUnitario: number;
}

export interface Cotizacion {
	id: string;
	clienteNombre: string;
	clienteTelefono: string;
	vehiculoTipo: string;
	items: ItemCotizacion[];
	total: number;
	estado: "Pendiente" | "Aceptada" | "Rechazada";
	fecha: string;
	sucursalId?: string;
	pvId?: string;
	creadoPor?: string;
}

export interface ItemOrdenTrabajo {
	descripcion: string;
	cantidad: number;
	precioUnitario: number;
	completado: boolean;
}

export interface OrdenTrabajo {
	id: string;
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
	notas: string[];
	fotos: string[];
	sucursalId?: string;
	pvId?: string;
}

export interface Cita {
	id: string;
	clienteNombre: string;
	clienteTelefono: string;
	vehiculoPlaca: string;
	servicio: string;
	fecha: string;
	hora: string;
	estado: "Confirmada" | "Pendiente" | "Cancelada";
}

export interface PlantillaPrecio {
	id: string;
	categoriaVehiculo: string;
	concepto: string;
	precioSugerido: number;
}

export interface ComentarioBug {
	id: string;
	autorId: string;
	autorNombre: string;
	texto: string;
	fecha: string;
	hora: string;
}

export interface Bug {
	id: string;
	titulo: string;
	descripcion: string;
	tipo: "Visual" | "Logica" | "Otro";
	importancia: "Baja" | "Media" | "Alta" | "Critica";
	ruta: string;
	fecha: string;
	hora: string;
	usuarioId: string;
	usuarioNombre: string;
	sucursalId?: string | null;
	imagenes: string[];
	estado: "Abierto" | "En Progreso" | "Resuelto";
	comentarios: ComentarioBug[];
}