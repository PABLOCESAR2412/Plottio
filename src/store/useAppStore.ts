import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
	propietarioId: string; // Cliente ID or Empresa ID
	propietarioTipo: "cliente" | "empresa";
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	año: string;
	numeroSerie: string; // Required for fleet vehicles
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
	fecha: string; // YYYY-MM-DD
	hora: string; // HH:MM
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

interface AppStore {
	sucursales: Sucursal[];
	puntosVenta: PuntoVenta[];
	usuarios: Usuario[];
	currentUser: Usuario | null;
	setCurrentUser: (userOrId: string | any) => void;

	clientes: Cliente[];
	empresas: Empresa[];
	vehiculos: Vehiculo[];
	cotizaciones: Cotizacion[];
	ordenesTrabajo: OrdenTrabajo[];
	citas: Cita[];
	plantillasPrecios: PlantillaPrecio[];
	categoriasPrecios: string[];
	bugs: Bug[];

	// Notification States
	notificationsEnabled: boolean;
	notificationTypes: {
		citas: boolean;
		ordenes: boolean;
		cotizaciones: boolean;
	};
	setNotificationsEnabled: (enabled: boolean) => void;
	setNotificationTypes: (
		types: Partial<{ citas: boolean; ordenes: boolean; cotizaciones: boolean }>,
	) => void;

	// Actions
	addSucursal: (sucursal: Omit<Sucursal, "id">) => Sucursal;
	updateSucursal: (id: string, updates: Partial<Sucursal>) => void;

	addCliente: (cliente: Omit<Cliente, "id" | "createdAt">) => Cliente;
	updateCliente: (id: string, updates: Partial<Cliente>) => void;
	deleteCliente: (id: string) => void;

	addEmpresa: (empresa: Omit<Empresa, "id" | "vehiculosIds">) => Empresa;
	updateEmpresa: (id: string, updates: Partial<Empresa>) => void;
	deleteEmpresa: (id: string) => void;

	addVehiculo: (vehiculo: Omit<Vehiculo, "id" | "servicios">) => Vehiculo;
	updateVehiculo: (id: string, updates: Partial<Vehiculo>) => void;
	deleteVehiculo: (id: string) => void;
	addServicioVehiculo: (
		vehiculoId: string,
		servicio: Omit<ServicioVehiculo, "id">,
	) => void;
	updateServicioVehiculo: (
		vehiculoId: string,
		servicioId: string,
		updates: Partial<ServicioVehiculo>,
	) => void;
	deleteServicioVehiculo: (vehiculoId: string, servicioId: string) => void;

	addCotizacion: (cotizacion: Omit<Cotizacion, "id" | "total">) => Cotizacion;
	updateCotizacion: (id: string, updates: Partial<Cotizacion>) => void;
	deleteCotizacion: (id: string) => void;

	addOrdenTrabajo: (
		orden: Omit<OrdenTrabajo, "id" | "progreso">,
	) => OrdenTrabajo;
	updateOrdenTrabajo: (id: string, updates: Partial<OrdenTrabajo>) => void;
	deleteOrdenTrabajo: (id: string) => void;

	addCita: (cita: Omit<Cita, "id">) => Cita;
	updateCita: (id: string, updates: Partial<Cita>) => void;
	deleteCita: (id: string) => void;

	addCategoriaPrecio: (categoria: string) => void;
	updateCategoriaPrecio: (oldName: string, newName: string) => void;
	deleteCategoriaPrecio: (categoria: string) => void;

	addPlantillaPrecio: (plantilla: Omit<PlantillaPrecio, "id">) => void;
	updatePlantillaPrecio: (
		id: string,
		updates: Partial<PlantillaPrecio>,
	) => void;
	deletePlantillaPrecio: (id: string) => void;

	addBug: (
		bug: Omit<Bug, "id" | "estado" | "fecha" | "hora" | "comentarios">,
	) => void;
	updateBug: (id: string, updates: Partial<Bug>) => void;
	addBugComment: (
		bugId: string,
		comentario: Omit<ComentarioBug, "id" | "fecha" | "hora">,
	) => void;

	addUsuario: (usuario: Omit<Usuario, "id">) => {
		userId: string;
		token: string;
	};
	updateUsuario: (id: string, updates: Partial<Usuario>) => void;
	archiveUsuario: (id: string) => void;

	// Intelligent auto-completion helper
	getOrCreateClienteByName: (nombre: string, telefono?: string) => Cliente;

	// Theme support
	theme: "light" | "dark";
	toggleTheme: () => void;
}

// Initial Mock Data
const mockSucursales: Sucursal[] = [
	{
		id: "suc-1",
		nombre: "Matriz Quito",
		direccion: "Av. Maldonado Km 11.5",
		telefono: "+593 2 2123456",
		ruc: "1792345678001",
		gerenteId: "usr-2",
	},
	{
		id: "suc-2",
		nombre: "Guayaquil",
		direccion: "Av. Las Américas",
		telefono: "+593 4 2123456",
		gerenteId: "usr-3",
	},
];

const mockPuntosVenta: PuntoVenta[] = [
	{
		id: "pv-1",
		sucursalId: "suc-1",
		nombre: "PV-01 Mariscal",
		ubicacion: "Sector La Mariscal",
		telefono: "+593 99 000 1111",
		gerenteId: "usr-4",
	},
];

const mockUsuarios: Usuario[] = [
	{
		id: "usr-1",
		nombre: "Súper Admin",
		email: "admin@plottio.com",
		rol: "SuperAdmin",
		sucursalId: null,
		pvId: null,
		activo: true,
	},
	{
		id: "usr-2",
		nombre: "Admin Quito",
		email: "quito@plottio.com",
		rol: "AdminSucursal",
		sucursalId: "suc-1",
		pvId: null,
		activo: true,
	},
	{
		id: "usr-3",
		nombre: "Admin GYE",
		email: "gye@plottio.com",
		rol: "AdminSucursal",
		sucursalId: "suc-2",
		pvId: null,
		activo: true,
	},
	{
		id: "usr-4",
		nombre: "Gerente PV-01",
		email: "pv1@plottio.com",
		rol: "GerentePV",
		sucursalId: "suc-1",
		pvId: "pv-1",
		activo: true,
	},
	{
		id: "usr-5",
		nombre: "Cotizador PV-01",
		email: "ventas@plottio.com",
		rol: "Cotizador",
		sucursalId: "suc-1",
		pvId: "pv-1",
		activo: true,
	},
	{
		id: "usr-6",
		nombre: "Carlos Instalador",
		email: "instalador@plottio.com",
		rol: "Instalador",
		sucursalId: "suc-1",
		pvId: "pv-1",
		activo: true,
	},
	{
		id: "usr-7",
		nombre: "Contador General",
		email: "contador@plottio.com",
		rol: "Contador",
		sucursalId: null,
		pvId: null,
		activo: true,
	},
];

const mockClientes: Cliente[] = [
	{
		id: "cli-1",
		nombre: "Carlos Mendoza",
		telefono: "+593 98 765 4321",
		email: "carlos.mendoza@email.com",
		empresaId: null,
		createdAt: "2026-05-01",
		direccion: "Sector La Mariscal, Lizardo García E10-44",
		sucursalId: "suc-1",
	},
	{
		id: "cli-2",
		nombre: "Ana Gómez",
		telefono: "+593 99 123 4567",
		email: "ana.gomez@email.com",
		empresaId: "emp-1",
		createdAt: "2026-05-03",
		direccion: "Av. Maldonado Km 11.5 y Calvas, Quito",
		sucursalId: "suc-1",
	},
	{
		id: "cli-3",
		nombre: "Marcos Paredes",
		telefono: "+593 97 890 1234",
		email: "marcos.p@email.com",
		empresaId: null,
		createdAt: "2026-05-05",
		direccion: "Sector Cumbayá, Av. Interoceánica",
		sucursalId: "suc-1",
	},
	{
		id: "cli-4",
		nombre: "Sofía Ramos",
		telefono: "+593 96 345 6789",
		email: "sofia.ramos@email.com",
		empresaId: "emp-2",
		createdAt: "2026-05-08",
		direccion: "Calle 10 de Agosto N24-82, Quito",
		sucursalId: "suc-1",
	},
];

const mockEmpresas: Empresa[] = [
	{
		id: "emp-1",
		nombre: "Transportes TransLuz S.A.",
		ruc: "1792345678001",
		contactoNombre: "Ana Gómez",
		contactoTelefono: "+593 99 123 4567",
		vehiculosIds: ["veh-2"],
		direccion: "Av. Maldonado Km 11.5 y Calvas, Quito",
	},
	{
		id: "emp-2",
		nombre: "Cooperativa Quito Express",
		ruc: "1798765432001",
		contactoNombre: "Sofía Ramos",
		contactoTelefono: "+593 96 345 6789",
		vehiculosIds: ["veh-3"],
		direccion: "Calle 10 de Agosto N24-82, Quito",
	},
];

const mockVehiculos: Vehiculo[] = [
	{
		id: "veh-1",
		propietarioId: "cli-1",
		propietarioTipo: "cliente",
		placa: "PBA-3421",
		categoria: "Bus Urbano",
		marca: "Hino",
		modelo: "AK8J",
		año: "2020",
		numeroSerie: "HN8J129384",
		estado: "Activo",
		servicios: [
			{
				id: "srv-1",
				fecha: "2026-05-10",
				descripcion: "Rotulado completo lateral derecho",
				costo: 450,
				estado: "Entregado",
			},
		],
	},
	{
		id: "veh-2",
		propietarioId: "emp-1",
		propietarioTipo: "empresa",
		placa: "PCG-8874",
		categoria: "Taxi",
		marca: "Chevrolet",
		modelo: "Sail",
		año: "2019",
		numeroSerie: "CHVS778213",
		estado: "Activo",
		servicios: [
			{
				id: "srv-2",
				fecha: "2026-05-20",
				descripcion: "Stickers reglamentarios de cooperativa",
				costo: 80,
				estado: "Entregado",
			},
		],
	},
	{
		id: "veh-3",
		propietarioId: "emp-2",
		propietarioTipo: "empresa",
		placa: "PBY-9012",
		categoria: "Bus Urbano",
		marca: "Mercedes-Benz",
		modelo: "OF-1721",
		año: "2022",
		numeroSerie: "MB1721-99823",
		estado: "En Mantenimiento",
		servicios: [],
	},
	{
		id: "veh-4",
		propietarioId: "cli-3",
		propietarioTipo: "cliente",
		placa: "ABC-1234",
		categoria: "Camión",
		marca: "Isuzu",
		modelo: "FVR",
		año: "2021",
		numeroSerie: "ISZ-FVR-7721",
		estado: "Activo",
		servicios: [],
	},
];

const mockCotizaciones: Cotizacion[] = [
	{
		id: "COT-001",
		clienteNombre: "Carlos Mendoza",
		clienteTelefono: "+593 98 765 4321",
		vehiculoTipo: "Bus Urbano",
		items: [
			{
				descripcion: "Rotulado de parabrisas frontal",
				cantidad: 1,
				precioUnitario: 45,
			},
			{
				descripcion: "Stickers reflectivos de seguridad lateral",
				cantidad: 4,
				precioUnitario: 15,
			},
		],
		total: 105,
		estado: "Pendiente",
		fecha: "2026-06-02",
	},
	{
		id: "COT-002",
		clienteNombre: "Transportes TransLuz S.A.",
		clienteTelefono: "+593 99 123 4567",
		vehiculoTipo: "Taxi",
		items: [
			{
				descripcion: "Franjas reflectivas amarillas/negras reglamentarias",
				cantidad: 2,
				precioUnitario: 35,
			},
			{
				descripcion: "Logotipo de Flota institucional en puertas",
				cantidad: 2,
				precioUnitario: 25,
			},
		],
		total: 120,
		estado: "Aceptada",
		fecha: "2026-06-03",
	},
];

const mockOrdenesTrabajo: OrdenTrabajo[] = [
	{
		id: "OT-1001",
		clienteNombre: "Marcos Paredes",
		clienteTelefono: "+593 97 890 1234",
		placa: "ABC-1234",
		vehiculoTipo: "Camión",
		items: [
			{
				descripcion: "Diseño y vinilo publicitario en caja trasera",
				cantidad: 1,
				precioUnitario: 850,
				completado: true,
			},
			{
				descripcion: "Detalles refractivos de seguridad en paragolpes",
				cantidad: 1,
				precioUnitario: 120,
				completado: false,
			},
		],
		total: 970,
		prioridad: "Alta",
		progreso: 50,
		estado: "En Proceso",
		fechaInicio: "2026-06-02",
		fechaFin: "2026-06-05",
		notas: [
			"El cliente quiere fondo azul mate con acabado brillante.",
			"Diseño pre-aprobado por el cliente por WhatsApp.",
		],
		fotos: [],
	},
	{
		id: "OT-1002",
		clienteNombre: "Ana Gómez",
		clienteTelefono: "+593 99 123 4567",
		placa: "PCG-8874",
		vehiculoTipo: "Taxi",
		items: [
			{
				descripcion: "Cambio de número de disco lateral en puertas",
				cantidad: 2,
				precioUnitario: 20,
				completado: true,
			},
		],
		total: 40,
		prioridad: "Baja",
		progreso: 100,
		estado: "Listo",
		fechaInicio: "2026-06-03",
		fechaFin: "2026-06-03",
		notas: [],
		fotos: [],
		sucursalId: "suc-2",
	} as unknown as OrdenTrabajo,
];

const mockCitas: Cita[] = [
	{
		id: "cit-1",
		clienteNombre: "Carlos Mendoza",
		clienteTelefono: "+593 98 765 4321",
		vehiculoPlaca: "PBA-3421",
		servicio: "Instalación de stickers parabrisas",
		fecha: "2026-06-03",
		hora: "14:30",
		estado: "Confirmada",
	},
	{
		id: "cit-2",
		clienteNombre: "Cooperativa Quito Express",
		clienteTelefono: "+593 96 345 6789",
		vehiculoPlaca: "PBY-9012",
		servicio: "Rotulado de logotipo institucional",
		fecha: "2026-06-03",
		hora: "10:00",
		estado: "Pendiente",
	},
	{
		id: "cit-3",
		clienteNombre: "Marcos Paredes",
		clienteTelefono: "+593 97 890 1234",
		vehiculoPlaca: "ABC-1234",
		servicio: "Inspección de vinilo trasero",
		fecha: "2026-06-04",
		hora: "09:00",
		estado: "Confirmada",
	},
];

const mockPlantillasPrecios: PlantillaPrecio[] = [
	{
		id: "p-1",
		categoriaVehiculo: "Bus Urbano",
		concepto: "Rotulado Completo de Laterales",
		precioSugerido: 450,
	},
	{
		id: "p-2",
		categoriaVehiculo: "Bus Urbano",
		concepto: "Visera Parabrisas Publicitaria",
		precioSugerido: 45,
	},
	{
		id: "p-3",
		categoriaVehiculo: "Taxi",
		concepto: "Kit Franjas Amarillas y Distintivos",
		precioSugerido: 80,
	},
	{
		id: "p-4",
		categoriaVehiculo: "Taxi",
		concepto: "Números de Disco (Par)",
		precioSugerido: 40,
	},
	{
		id: "p-5",
		categoriaVehiculo: "Camión",
		concepto: "Rotulado Caja Trasera (Vinilo Grande)",
		precioSugerido: 850,
	},
	{
		id: "p-6",
		categoriaVehiculo: "Camión",
		concepto: "Líneas Reflectivas Homologadas (3M)",
		precioSugerido: 120,
	},
];

export const useAppStore = create<AppStore>()(persist((set, get) => ({
	sucursales: mockSucursales,
	puntosVenta: mockPuntosVenta,
	usuarios: mockUsuarios,
	currentUser: null,
	setCurrentUser: (userOrId) => {
		if (typeof userOrId === "string") {
			const user = get().usuarios.find((u) => u.id === userOrId) || null;
			set({ currentUser: user });
		} else {
			// Direct object from Convex
			set({ 
				currentUser: { 
					id: userOrId._id || userOrId.id,
					nombre: userOrId.nombre,
					email: userOrId.email,
					rol: userOrId.rol,
					sucursalId: userOrId.sucursalId || null,
					pvId: userOrId.pvId || null,
					activo: userOrId.activo
				} 
			});
		}
	},

	clientes: mockClientes,
	empresas: mockEmpresas,
	vehiculos: mockVehiculos,
	cotizaciones: mockCotizaciones,
	ordenesTrabajo: mockOrdenesTrabajo,
	citas: [],
	plantillasPrecios: mockPlantillasPrecios,
	categoriasPrecios: ["Bus Urbano", "Taxi", "Camión"],
	bugs: [],

	// Notifications State & Setters
	notificationsEnabled: true,
	notificationTypes: {
		citas: true,
		ordenes: true,
		cotizaciones: true,
	},
	setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
	setNotificationTypes: (types) =>
		set((state) => ({
			notificationTypes: { ...state.notificationTypes, ...types },
		})),

	// Clientes
	addCliente: (cli) => {
		const newCli: Cliente = {
			...cli,
			id: `cli-${Date.now()}`,
			createdAt: new Date().toISOString().split("T")[0],
		};
		set((state) => ({ clientes: [newCli, ...state.clientes] }));
		return newCli;
	},
	updateCliente: (id, updates) => {
		set((state) => ({
			clientes: state.clientes.map((c) =>
				c.id === id ? { ...c, ...updates } : c,
			),
		}));
	},
	deleteCliente: (id) => {
		set((state) => ({
			clientes: state.clientes.filter((c) => c.id !== id),
		}));
	},

	// Empresas
	addEmpresa: (emp) => {
		const newEmp: Empresa = {
			...emp,
			id: `emp-${Date.now()}`,
			vehiculosIds: [],
		};
		set((state) => ({ empresas: [newEmp, ...state.empresas] }));
		return newEmp;
	},
	updateEmpresa: (id, updates) => {
		set((state) => ({
			empresas: state.empresas.map((e) =>
				e.id === id ? { ...e, ...updates } : e,
			),
		}));
	},
	deleteEmpresa: (id) => {
		set((state) => ({
			empresas: state.empresas.filter((e) => e.id !== id),
			clientes: state.clientes.map((c) =>
				c.empresaId === id ? { ...c, empresaId: null } : c,
			),
		}));
	},

	// Vehiculos
	addVehiculo: (veh) => {
		const newVeh: Vehiculo = {
			...veh,
			id: `veh-${Date.now()}`,
			servicios: [],
		};
		set((state) => {
			// If it belongs to an enterprise, update the enterprise's vehicle list
			const updatedEmpresas = state.empresas.map((emp) => {
				if (veh.propietarioTipo === "empresa" && emp.id === veh.propietarioId) {
					return { ...emp, vehiculosIds: [...emp.vehiculosIds, newVeh.id] };
				}
				return emp;
			});
			return {
				vehiculos: [newVeh, ...state.vehiculos],
				empresas: updatedEmpresas,
			};
		});
		return newVeh;
	},
	updateVehiculo: (id, updates) => {
		set((state) => ({
			vehiculos: state.vehiculos.map((v) =>
				v.id === id ? { ...v, ...updates } : v,
			),
		}));
	},
	deleteVehiculo: (id) => {
		set((state) => ({
			vehiculos: state.vehiculos.filter((v) => v.id !== id),
			empresas: state.empresas.map((emp) => ({
				...emp,
				vehiculosIds: emp.vehiculosIds.filter((vId) => vId !== id),
			})),
		}));
	},
	addServicioVehiculo: (vehId, srv) => {
		const newSrv: ServicioVehiculo = {
			...srv,
			id: `srv-${Date.now()}`,
		};
		set((state) => ({
			vehiculos: state.vehiculos.map((v) =>
				v.id === vehId ? { ...v, servicios: [newSrv, ...v.servicios] } : v,
			),
		}));
	},
	updateServicioVehiculo: (vehId, srvId, updates) => {
		set((state) => ({
			vehiculos: state.vehiculos.map((v) => {
				if (v.id !== vehId) return v;
				return {
					...v,
					servicios: v.servicios.map((s) =>
						s.id === srvId ? { ...s, ...updates } : s,
					),
				};
			}),
		}));
	},
	deleteServicioVehiculo: (vehId, srvId) => {
		set((state) => ({
			vehiculos: state.vehiculos.map((v) => {
				if (v.id !== vehId) return v;
				return {
					...v,
					servicios: v.servicios.filter((s) => s.id !== srvId),
				};
			}),
		}));
	},

	// Cotizaciones
	addCotizacion: (cot) => {
		const total = cot.items.reduce(
			(acc, it) => acc + it.cantidad * it.precioUnitario,
			0,
		);
		const newCotId = `COT-${Math.floor(100 + Math.random() * 900)}`;
		const newCot: Cotizacion = {
			...cot,
			id: newCotId,
			total,
		};
		// Make sure we resolve the smart client creation pattern
		get().getOrCreateClienteByName(cot.clienteNombre, cot.clienteTelefono);

		set((state) => ({ cotizaciones: [newCot, ...state.cotizaciones] }));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.cotizaciones
		) {
			toast.success(`Nueva Cotización Creada`, {
				description: `Se registró la cotización ${newCotId} para ${newCot.clienteNombre} por $${total.toLocaleString("en-US")} USD.`,
				duration: 4000,
			});
		}

		return newCot;
	},
	updateCotizacion: (id, updates) => {
		set((state) => ({
			cotizaciones: state.cotizaciones.map((c) => {
				if (c.id !== id) return c;
				const merged = { ...c, ...updates };
				if (updates.items) {
					merged.total = updates.items.reduce(
						(acc, it) => acc + it.cantidad * it.precioUnitario,
						0,
					);
				}
				return merged;
			}),
		}));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.cotizaciones
		) {
			const updatedCot = get().cotizaciones.find((c) => c.id === id);
			if (updatedCot) {
				toast.info(`Cotización Actualizada`, {
					description: `La cotización ${id} está ahora en estado: ${updatedCot.estado}.`,
					duration: 4000,
				});
			}
		}
	},
	deleteCotizacion: (id) => {
		set((state) => ({
			cotizaciones: state.cotizaciones.filter((c) => c.id !== id),
		}));
	},

	// Sucursales
	addSucursal: (suc) => {
		const newId = `suc-${Date.now()}`;
		const newSuc: Sucursal = { ...suc, id: newId };
		set((state) => ({ sucursales: [...state.sucursales, newSuc] }));
		return newSuc;
	},
	updateSucursal: (id, updates) => {
		set((state) => ({
			sucursales: state.sucursales.map((s) =>
				s.id === id ? { ...s, ...updates } : s,
			),
		}));
	},

	// Ordenes de Trabajo
	addOrdenTrabajo: (ord) => {
		const total = ord.items.reduce(
			(acc, it) => acc + it.cantidad * it.precioUnitario,
			0,
		);
		const completedItems = ord.items.filter((it) => it.completado).length;
		const progreso =
			ord.items.length > 0
				? Math.round((completedItems / ord.items.length) * 100)
				: 0;
		const newOrdId = `OT-${Math.floor(1000 + Math.random() * 9000)}`;
		const newOrd: OrdenTrabajo = {
			...ord,
			id: newOrdId,
			progreso,
			total,
		};
		// Resolve smart client creation
		get().getOrCreateClienteByName(ord.clienteNombre, ord.clienteTelefono);

		set((state) => ({ ordenesTrabajo: [newOrd, ...state.ordenesTrabajo] }));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.ordenes
		) {
			toast.success(`Nueva Orden de Trabajo`, {
				description: `Se inició la orden ${newOrdId} para ${newOrd.clienteNombre} (${newOrd.placa}).`,
				duration: 4000,
			});
		}

		return newOrd;
	},
	updateOrdenTrabajo: (id, updates) => {
		set((state) => ({
			ordenesTrabajo: state.ordenesTrabajo.map((o) => {
				if (o.id !== id) return o;
				const merged = { ...o, ...updates };
				if (updates.items) {
					const completedItems = merged.items.filter(
						(it) => it.completado,
					).length;
					merged.progreso =
						merged.items.length > 0
							? Math.round((completedItems / merged.items.length) * 100)
							: 0;
					merged.total = merged.items.reduce(
						(acc, it) => acc + it.cantidad * it.precioUnitario,
						0,
					);
				}
				return merged;
			}),
		}));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.ordenes
		) {
			const updatedOrd = get().ordenesTrabajo.find((o) => o.id === id);
			if (updatedOrd) {
				toast.info(`Orden ${id} Actualizada`, {
					description: `Estado: ${updatedOrd.estado}. Progreso: ${updatedOrd.progreso}%.`,
					duration: 4000,
				});
			}
		}
	},
	deleteOrdenTrabajo: (id) => {
		set((state) => ({
			ordenesTrabajo: state.ordenesTrabajo.filter((o) => o.id !== id),
		}));
	},

	// Citas
	addCita: (cita) => {
		const newCita: Cita = {
			...cita,
			id: `cit-${Date.now()}`,
		};
		set((state) => ({ citas: [newCita, ...state.citas] }));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.citas
		) {
			toast.success(`Cita Agendada`, {
				description: `${newCita.clienteNombre} - ${newCita.servicio} el ${newCita.fecha} a las ${newCita.hora}.`,
				duration: 4000,
			});
		}

		return newCita;
	},
	updateCita: (id, updates) => {
		set((state) => ({
			citas: state.citas.map((c) => (c.id === id ? { ...c, ...updates } : c)),
		}));

		// Trigger Notification
		if (
			typeof window !== "undefined" &&
			get().notificationsEnabled &&
			get().notificationTypes.citas
		) {
			const updatedCita = get().citas.find((c) => c.id === id);
			if (updatedCita) {
				toast.info(`Cita Modificada`, {
					description: `La cita de ${updatedCita.clienteNombre} está ahora: ${updatedCita.estado}.`,
					duration: 4000,
				});
			}
		}
	},
	deleteCita: (id) => {
		set((state) => ({
			citas: state.citas.filter((c) => c.id !== id),
		}));
	},

	// Configuración
	addCategoriaPrecio: (categoria) => {
		const cleanCat = categoria.trim();
		if (!cleanCat) return;
		set((state) => {
			if (state.categoriasPrecios.includes(cleanCat)) return state;
			return { categoriasPrecios: [...state.categoriasPrecios, cleanCat] };
		});
	},
	updateCategoriaPrecio: (oldName, newName) => {
		const cleanNewName = newName.trim();
		if (!cleanNewName || oldName === cleanNewName) return;
		set((state) => {
			const updatedCategories = state.categoriasPrecios.map((c) =>
				c === oldName ? cleanNewName : c,
			);
			const updatedPlantillas = state.plantillasPrecios.map((p) =>
				p.categoriaVehiculo === oldName
					? { ...p, categoriaVehiculo: cleanNewName }
					: p,
			);
			const updatedVehiculos = state.vehiculos.map((v) =>
				v.categoria === oldName ? { ...v, categoria: cleanNewName } : v,
			);
			const updatedCotizaciones = state.cotizaciones.map((c) =>
				c.vehiculoTipo === oldName ? { ...c, vehiculoTipo: cleanNewName } : c,
			);
			const updatedOrdenes = state.ordenesTrabajo.map((o) =>
				o.vehiculoTipo === oldName ? { ...o, vehiculoTipo: cleanNewName } : o,
			);
			return {
				categoriasPrecios: updatedCategories,
				plantillasPrecios: updatedPlantillas,
				vehiculos: updatedVehiculos,
				cotizaciones: updatedCotizaciones,
				ordenesTrabajo: updatedOrdenes,
			};
		});
	},
	deleteCategoriaPrecio: (categoria) => {
		set((state) => {
			const updatedCategories = state.categoriasPrecios.filter(
				(c) => c !== categoria,
			);
			const updatedPlantillas = state.plantillasPrecios.filter(
				(p) => p.categoriaVehiculo !== categoria,
			);
			const updatedVehiculos = state.vehiculos.map((v) =>
				v.categoria === categoria
					? { ...v, categoria: updatedCategories[0] || "General" }
					: v,
			);
			const updatedCotizaciones = state.cotizaciones.map((c) =>
				c.vehiculoTipo === categoria
					? { ...c, vehiculoTipo: updatedCategories[0] || "General" }
					: c,
			);
			const updatedOrdenes = state.ordenesTrabajo.map((o) =>
				o.vehiculoTipo === categoria
					? { ...o, vehiculoTipo: updatedCategories[0] || "General" }
					: o,
			);
			return {
				categoriasPrecios: updatedCategories,
				plantillasPrecios: updatedPlantillas,
				vehiculos: updatedVehiculos,
				cotizaciones: updatedCotizaciones,
				ordenesTrabajo: updatedOrdenes,
			};
		});
	},
	addPlantillaPrecio: (plantilla) => {
		const newTpl: PlantillaPrecio = {
			...plantilla,
			id: `p-${Date.now()}`,
		};
		set((state) => ({
			plantillasPrecios: [newTpl, ...state.plantillasPrecios],
		}));
	},
	updatePlantillaPrecio: (id, updates) => {
		set((state) => ({
			plantillasPrecios: state.plantillasPrecios.map((p) =>
				p.id === id ? { ...p, ...updates } : p,
			),
		}));
	},
	deletePlantillaPrecio: (id) => {
		set((state) => ({
			plantillasPrecios: state.plantillasPrecios.filter((p) => p.id !== id),
		}));
	},

	// Bugs
	addBug: (bug) => {
		const now = new Date();
		const newBug: Bug = {
			...bug,
			id: `bug-${Date.now()}`,
			estado: "Abierto",
			fecha: now.toISOString().split("T")[0],
			hora: now.toLocaleTimeString(),
			comentarios: [],
		};
		set((state) => ({ bugs: [newBug, ...state.bugs] }));

		if (typeof window !== "undefined") {
			toast.success("Reporte de error enviado", {
				description:
					"Gracias por ayudarnos a mejorar el sistema. Nuestro equipo de soporte lo revisará pronto.",
			});
		}
	},
	updateBug: (id, updates) => {
		set((state) => ({
			bugs: state.bugs.map((b) => (b.id === id ? { ...b, ...updates } : b)),
		}));
	},
	addBugComment: (bugId, comentario) => {
		const now = new Date();
		const newComment: ComentarioBug = {
			...comentario,
			id: `cmnt-${Date.now()}`,
			fecha: now.toISOString().split("T")[0],
			hora: now.toLocaleTimeString(),
		};
		set((state) => ({
			bugs: state.bugs.map((b) => {
				if (b.id !== bugId) return b;
				return {
					...b,
					comentarios: [...b.comentarios, newComment],
				};
			}),
		}));
	},

	addUsuario: (usuario) => {
		const newUserId = `usr-${Date.now()}`;
		const token =
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15);
		const newUsuario: Usuario = {
			...usuario,
			id: newUserId,
		};

		set((state) => ({ usuarios: [...state.usuarios, newUsuario] }));
		return { userId: newUserId, token };
	},
	updateUsuario: (id, updates) => {
		set((state) => ({
			usuarios: state.usuarios.map((u) =>
				u.id === id ? { ...u, ...updates } : u,
			),
		}));
	},
	archiveUsuario: (id) => {
		set((state) => ({
			usuarios: state.usuarios.map((u) =>
				u.id === id ? { ...u, activo: false } : u,
			),
		}));
	},

	// Intelligent auto-completion helper
	getOrCreateClienteByName: (nombre, telefono = "") => {
		const cleanNombre = nombre.trim();
		if (!cleanNombre) {
			return {
				id: "temp",
				nombre: "",
				telefono: "",
				email: "",
				empresaId: null,
				createdAt: "",
			};
		}
		const existing = get().clientes.find(
			(c) => c.nombre.toLowerCase() === cleanNombre.toLowerCase(),
		);
		if (existing) {
			return existing;
		}
		// If it doesn't exist, create it automatically!
		const newCli: Cliente = {
			id: `cli-${Date.now()}`,
			nombre: cleanNombre,
			telefono: telefono || "+593 ",
			email: `${cleanNombre.toLowerCase().replace(/\s+/g, ".")}@email.com`,
			empresaId: null,
			createdAt: new Date().toISOString().split("T")[0],
		};
		set((state) => ({ clientes: [newCli, ...state.clientes] }));
		return newCli;
	},

	theme: "light",
	toggleTheme: () => {
		set((state) => {
			const nextTheme = state.theme === "light" ? "dark" : "light";
			if (typeof window !== "undefined") {
				const root = window.document.documentElement;
				if (nextTheme === "dark") {
					root.classList.add("dark");
				} else {
					root.classList.remove("dark");
				}
				localStorage.setItem("theme", nextTheme);
			}
			return { theme: nextTheme };
		});
	},
}), { 
	name: "plottio-auth-storage", 
	partialize: (state) => ({ currentUser: state.currentUser }) 
}));
