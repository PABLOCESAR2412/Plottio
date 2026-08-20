import { useMutation, useQuery } from "convex/react";
import {
	Activity,
	AlertCircle,
	Car,
	ChevronRight,
	ClipboardCheck,
	Clock,
	Edit2,
	FileText,
	Hash,
	Plus,
	Search,
	Trash2,
	User,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import type {
	Cliente,
	Empresa,
	ServicioVehiculo,
	Vehiculo,
} from "../types/data";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

interface VehiculosViewProps {
	onNavigate: (
		tab:
			| "dashboard"
			| "clientes"
			| "empresas"
			| "vehiculos"
			| "cotizaciones"
			| "ordenes"
			| "agenda"
			| "configuracion",
	) => void;
	preselectedVehicleId?: string | null;
	clearPreselectedVehicle?: () => void;
	onSelectOrder?: (oId: string) => void;
}

export const VehiculosView: React.FC<VehiculosViewProps> = ({
	onNavigate,
	preselectedVehicleId,
	clearPreselectedVehicle,
	onSelectOrder,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);

	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawEmpresas = useQuery(api.organizacion.getEmpresas);

	const rawCategorias = useQuery(
		api.plantillas.getCategorias,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	) as string[] | undefined;
	const categoriasPrecios: string[] = rawCategorias ?? [];

	const createVehiculoMut = useMutation(api.vehiculos.createVehiculo);
	const updateVehiculoMut = useMutation(api.vehiculos.updateVehiculo);
	const deleteVehiculoMut = useMutation(api.vehiculos.deleteVehiculo);
	const addServicioVehiculoMut = useMutation(api.vehiculos.addServicioVehiculo);
	const updateServicioVehiculoMut = useMutation(
		api.vehiculos.updateServicioVehiculo,
	);
	const deleteServicioVehiculoMut = useMutation(
		api.vehiculos.deleteServicioVehiculo,
	);
	const createOrdenTrabajoMut = useMutation(api.ordenes.createOrdenTrabajo);

	const vehiculos = (rawVehiculos || []).map((v) => ({
		...v,
		id: v._id,
		año: v.anio,
		servicios: v.servicios || [],
	})) as Vehiculo[];

	const clientes = (rawClientes || []).map((c) => ({
		...c,
		id: c._id,
		createdAt: new Date(c._creationTime).toLocaleDateString(),
	})) as Cliente[];

	const empresas = (rawEmpresas || []).map((e) => ({
		...e,
		id: e._id,
	})) as unknown as Empresa[];

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
	const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(
		null,
	);
	const todasOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		currentUser && selectedVehiculoId
			? { usuarioId: currentUser.id as any }
			: "skip",
	);
	const ordenesVehiculo = (todasOrdenes || []).filter(o => o.vehiculoId === selectedVehiculoId);

	// Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isNewServiceFlowOpen, setIsNewServiceFlowOpen] = useState(false);
	const [isAddHistoryServiceOpen, setIsAddHistoryServiceOpen] = useState(false);
	const [isEditHistoryServiceOpen, setIsEditHistoryServiceOpen] =
		useState(false);
	const [selectedDetailService, setSelectedDetailService] =
		useState<ServicioVehiculo | null>(null);

	// Notification configuration
	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete";
		onConfirm?: () => void;
	}>({
		isOpen: false,
		title: "",
		message: "",
		type: "success",
	});

	// Form: Vehicle
	const [placa, setPlaca] = useState("");
	const [categoria, setCategoria] = useState<string>(
		categoriasPrecios[0] || "Bus Urbano",
	);
	const [marca, setMarca] = useState("");
	const [modelo, setModelo] = useState("");
	const [año, setAño] = useState("");
	const [numeroSerie, setNumeroSerie] = useState("");
	const [propietarioId, setPropietarioId] = useState("");
	const [propietarioTipo, setPropietarioTipo] = useState<"cliente" | "empresa">(
		"cliente",
	);
	const [estado, setEstado] = useState<
		"Activo" | "En Mantenimiento" | "Inactivo"
	>("Activo");

	// Form: Service Item
	const [srvDescripcion, setSrvDescripcion] = useState("");
	const [srvCosto, setSrvCosto] = useState(0);
	const [srvFecha, setSrvFecha] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [srvEstado, setSrvEstado] = useState("Entregado");
	const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
		null,
	);

	// Helper: Find owner name
	const getOwnerDetails = (veh: Vehiculo) => {
		if (veh.propietarioTipo === "cliente") {
			const cli = clientes.find((c) => c.id === veh.propietarioId);
			return {
				nombre: cli ? cli.nombre : "Cliente Desconocido",
				telefono: cli ? cli.telefono : "",
				tipo: "Cliente Particular",
			};
		} else {
			const emp = empresas.find((e) => e.id === veh.propietarioId);
			return {
				nombre: emp ? emp.nombre : "Empresa Desconocida",
				telefono: emp ? emp.contactoTelefono : "",
				tipo: "Flota Comercial",
			};
		}
	};

	// Filter vehicles
	const filteredVehiculos = vehiculos.filter((v) => {
		// SaaS Multi-tenant filtering
		if (
			v.sucursalId &&
			currentUser?.sucursalId &&
			v.sucursalId !== currentUser.sucursalId
		) {
			return false;
		}

		const owner = getOwnerDetails(v);
		const matchesSearch =
			v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
			v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
			v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
			owner.nombre.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesCategory =
			selectedCategory === "Todos" || v.categoria === selectedCategory;

		return matchesSearch && matchesCategory;
	});

	const activeVehiculoId = filteredVehiculos.find(
		(v) => v.id === selectedVehiculoId,
	)
		? selectedVehiculoId
		: filteredVehiculos.length > 0
			? filteredVehiculos[0].id
			: null;

	const selectedVehiculo = vehiculos.find((v) => v.id === activeVehiculoId);

	// Sync category state when categoriesPrecios changes
	useEffect(() => {
		if (
			categoriasPrecios.length > 0 &&
			!categoriasPrecios.includes(categoria)
		) {
			setCategoria(categoriasPrecios[0]);
		}
		if (
			selectedCategory !== "Todos" &&
			!categoriasPrecios.includes(selectedCategory)
		) {
			setSelectedCategory("Todos");
		}
	}, [categoriasPrecios, categoria, selectedCategory]);

	// Handle external vehicle selection navigation from Clients tab
	useEffect(() => {
		if (preselectedVehicleId) {
			setSelectedVehiculoId(preselectedVehicleId);
			// Clear category filter so the selected vehicle is visible
			const selectedVeh = vehiculos.find((v) => v.id === preselectedVehicleId);
			if (selectedVeh) {
				setSelectedCategory("Todos");
			}
			if (clearPreselectedVehicle) {
				clearPreselectedVehicle();
			}
		}
	}, [preselectedVehicleId, vehiculos, clearPreselectedVehicle]);

	const handleOpenCreate = () => {
		setPlaca("");
		setCategoria(categoriasPrecios[0] || "Bus Urbano");
		setMarca("");
		setModelo("");
		setAño("");
		setNumeroSerie("");
		setPropietarioTipo("cliente");
		setEstado("Activo");
		// Set default owner to first client or company
		setPropietarioId(clientes.length > 0 ? clientes[0].id : "");
		setIsCreateOpen(true);
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!placa.trim() || !currentUser) return;

				try {
			const newVeh = await createVehiculoMut({
				usuarioId: currentUser.id as any,
				placa: placa.trim().toUpperCase(),
				categoria,
				marca: marca.trim(),
				modelo: modelo.trim(),
				anio: año.trim() || "2025",
				numeroSerie:
					numeroSerie.trim() || `S/N-${Date.now().toString().slice(-6)}`,
				propietarioId,
				propietarioTipo,
				estado,
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as any)
					: undefined,
			});

			setIsCreateOpen(false);
			if (newVeh) {
				setSelectedVehiculoId(newVeh._id);
			}

			setAlertConfig({
				isOpen: true,
				title: "Vehículo Añadido",
				message: `El vehículo con placa "${placa.trim().toUpperCase()}" se registró exitosamente.`,
				type: "success",
			});
		} catch (error: any) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: error.data || error.message || "No se pudo crear el vehículo",
				type: "error",
			});
		}
	};

	const handleOpenEdit = (veh: Vehiculo) => {
		setPlaca(veh.placa);
		setCategoria(veh.categoria);
		setMarca(veh.marca);
		setModelo(veh.modelo);
		setAño(veh.año);
		setNumeroSerie(veh.numeroSerie);
		setPropietarioId(veh.propietarioId);
		setPropietarioTipo(veh.propietarioTipo);
		setEstado(veh.estado);
		setIsEditOpen(true);
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedVehiculo || !placa.trim() || !currentUser) return;

		await updateVehiculoMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			vehiculoId: selectedVehiculo.id as Id<"vehiculos">,
			placa: placa.trim().toUpperCase(),
			categoria,
			marca: marca.trim(),
			modelo: modelo.trim(),
			anio: año.trim(),
			numeroSerie: numeroSerie.trim(),
			propietarioId,
			propietarioTipo,
			estado,
		});

		setIsEditOpen(false);

		setAlertConfig({
			isOpen: true,
			title: "Vehículo Actualizado",
			message: `Los datos del vehículo "${placa.trim().toUpperCase()}" se guardaron correctamente.`,
			type: "success",
		});
	};

	const handleDeleteClick = (veh: Vehiculo) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Vehículo?",
			message: `¿Estás seguro de eliminar el vehículo "${veh.placa}"? Esta acción borrará también todo su historial de rotulados y servicios.`,
			type: "delete",
			onConfirm: async () => {
				if (!currentUser) return;
				await deleteVehiculoMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					vehiculoId: veh.id as Id<"vehiculos">,
				});
				const remaining = vehiculos.filter((v) => v.id !== veh.id);
				setSelectedVehiculoId(remaining.length > 0 ? remaining[0].id : null);
				setAlertConfig({
					isOpen: true,
					title: "Vehículo Eliminado",
					message: "El vehículo ha sido eliminado satisfactoriamente.",
					type: "success",
				});
			},
		});
	};

	// FLOW FOR "NUEVO SERVICIO": TRANSFERS STATE VIA SESSIONSTORAGE
	const handleOpenNewServiceFlow = () => {
		setIsNewServiceFlowOpen(true);
	};

	const handleSelectServiceFlow = async (flowType: "cotizacion" | "orden") => {
		if (!selectedVehiculo) return;
		const owner = getOwnerDetails(selectedVehiculo);

		setIsNewServiceFlowOpen(false);

		if (flowType === "cotizacion") {
			// Store in sessionStorage to share info with quotes
			sessionStorage.setItem("prefilled_placa", selectedVehiculo.placa);
			sessionStorage.setItem("prefilled_clienteNombre", owner.nombre);
			sessionStorage.setItem("prefilled_clienteTelefono", owner.telefono);
			sessionStorage.setItem(
				"prefilled_vehiculoTipo",
				selectedVehiculo.categoria,
			);
			onNavigate("cotizaciones");
		} else {
			// Create work order automatically
			if (!currentUser) return;
			const newOrd = await createOrdenTrabajoMut({
				usuarioId: currentUser.id as Id<"usuarios">,
				clienteNombre: owner.nombre,
				clienteTelefono: owner.telefono,
				placa: selectedVehiculo.placa,
				vehiculoTipo: selectedVehiculo.categoria,
				items: [],
				prioridad: "Media",
				estado: "Pendiente",
				fechaInicio: new Date().toISOString().split("T")[0],
				fechaFin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
				notas: [
					`Orden de trabajo iniciada automáticamente para el vehículo con placa ${selectedVehiculo.placa}.`,
				],
				fotos: [],
			});

			if (onSelectOrder) {
				onSelectOrder(newOrd?._id as string);
			} else {
				onNavigate("ordenes");
			}
		}
	};

	// SERVICES CRUD (HISTORIAL DE SERVICIOS)

	const handleAddHistoryService = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedVehiculo || !srvDescripcion.trim() || !currentUser) return;

		await addServicioVehiculoMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			vehiculoId: selectedVehiculo.id as Id<"vehiculos">,
			descripcion: srvDescripcion.trim(),
			costo: Number(srvCosto),
			fecha: srvFecha,
			estado: srvEstado,
		});

		setIsAddHistoryServiceOpen(false);

		setAlertConfig({
			isOpen: true,
			title: "Servicio Guardado",
			message:
				"El servicio histórico ha sido registrado en la cronología del vehículo.",
			type: "success",
		});
	};

	const handleOpenEditHistoryService = (srv: ServicioVehiculo) => {
		setSelectedServiceId(srv.id);
		setSrvDescripcion(srv.descripcion);
		setSrvCosto(srv.costo);
		setSrvFecha(srv.fecha);
		setSrvEstado(srv.estado);
		setIsEditHistoryServiceOpen(true);
	};

	const handleEditHistoryService = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!selectedVehiculo ||
			!selectedServiceId ||
			!srvDescripcion.trim() ||
			!currentUser
		)
			return;

		await updateServicioVehiculoMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			vehiculoId: selectedVehiculo.id as Id<"vehiculos">,
			servicioId: selectedServiceId,
			descripcion: srvDescripcion.trim(),
			costo: Number(srvCosto),
			fecha: srvFecha,
			estado: srvEstado,
		});

		setIsEditHistoryServiceOpen(false);

		setAlertConfig({
			isOpen: true,
			title: "Servicio Modificado",
			message: "Se actualizaron los datos del servicio histórico.",
			type: "success",
		});
	};

	const handleDeleteHistoryServiceClick = (srvId: string) => {
		if (!selectedVehiculo) return;
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Historial de Servicio?",
			message:
				"¿Deseas remover este registro de servicio histórico? Esta acción afectará la inversión acumulada del vehículo.",
			type: "delete",
			onConfirm: async () => {
				if (!currentUser) return;
				await deleteServicioVehiculoMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					vehiculoId: selectedVehiculo.id as Id<"vehiculos">,
					servicioId: srvId,
				});
				setAlertConfig({
					isOpen: true,
					title: "Servicio Removido",
					message: "Se ha eliminado la entrada del historial.",
					type: "success",
				});
			},
		});
	};

	if (
		rawVehiculos === undefined ||
		rawClientes === undefined ||
		rawEmpresas === undefined
	) {
		return <TableSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Vehículos
					</h1>
					<p className="text-muted-foreground">
						Administra el inventario de vehículos particulares y flotas
						corporativas.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Registrar Vehículo
				</button>
			</div>

			{/* Categories filter selector */}
			<div className="flex flex-wrap gap-2">
				{["Todos", ...categoriasPrecios].map((cat) => (
					<button
						type="button"
						key={cat}
						onClick={() => setSelectedCategory(cat)}
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
							selectedCategory === cat
								? "bg-primary text-primary-foreground"
								: "bg-secondary text-foreground hover:bg-secondary/80"
						}`}
					>
						{cat}
					</button>
				))}
			</div>

			{/* Main split grid */}
			<div className="grid gap-6 md:grid-cols-3">
				{/* Left col - Grid list */}
				<div className="md:col-span-1 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
					<div className="relative">
						<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar placa o propietario..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
						/>
					</div>

					<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
						{filteredVehiculos.map((veh) => {
							const owner = getOwnerDetails(veh);
							return (
								<button
									type="button"
									key={veh.id}
									onClick={() => setSelectedVehiculoId(veh.id)}
									className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 ${
										selectedVehiculoId === veh.id
											? "bg-primary text-primary-foreground shadow-sm"
											: "hover:bg-secondary"
									}`}
								>
									<div className="truncate pr-2">
										<div className="flex items-center gap-1.5 font-bold text-sm">
											<span
												className={`px-1 py-0.5 rounded text-xs border border-border/30 ${
													selectedVehiculoId === veh.id
														? "bg-primary-foreground/15 text-primary-foreground"
														: "bg-secondary/60 text-foreground"
												}`}
											>
												{veh.placa}
											</span>
											<span className="truncate">
												{veh.marca} {veh.modelo}
											</span>
										</div>
										<div
											className={`text-xs truncate mt-0.5 ${selectedVehiculoId === veh.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
										>
											Prop: {owner.nombre}
										</div>
									</div>
									<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
								</button>
							);
						})}
						{filteredVehiculos.length === 0 && (
							<div className="text-center py-8 text-muted-foreground text-sm">
								No se encontraron vehículos.
							</div>
						)}
					</div>
				</div>

				{/* Right col - Vehicle Details and History */}
				<div className="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
					{selectedVehiculo ? (
						<div className="space-y-6">
							{/* Card header */}
							<div className="flex items-start justify-between border-b border-border pb-4">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
										<Car className="h-6 w-6" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h2 className="text-xl font-extrabold text-foreground">
												{selectedVehiculo.marca} {selectedVehiculo.modelo}
											</h2>
											<span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-bold">
												{selectedVehiculo.año}
											</span>
										</div>
										<p className="text-sm text-muted-foreground">
											Placa:{" "}
											<strong className="text-foreground">
												{selectedVehiculo.placa}
											</strong>{" "}
											• {selectedVehiculo.categoria}
										</p>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleOpenNewServiceFlow}
										className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors"
									>
										<Plus className="h-3.5 w-3.5" />
										Nuevo Servicio
									</button>
									<button
										type="button"
										onClick={() => handleOpenEdit(selectedVehiculo)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
										title="Editar Vehículo"
									>
										<Edit2 className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDeleteClick(selectedVehiculo)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors"
										title="Eliminar Vehículo"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Technical Specifications Grid */}
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-lg border border-border p-3">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
										<User className="h-3 w-3" /> Propietario
									</div>
									<div className="text-sm font-bold text-foreground truncate mt-1">
										{getOwnerDetails(selectedVehiculo).nombre}
									</div>
									<div className="text-[10px] text-muted-foreground font-medium">
										{getOwnerDetails(selectedVehiculo).tipo}
									</div>
								</div>

								<div className="rounded-lg border border-border p-3">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
										<Hash className="h-3 w-3" /> Número de Serie
									</div>
									<div
										className="text-sm font-mono font-semibold text-foreground truncate mt-1"
										title={selectedVehiculo.numeroSerie}
									>
										{selectedVehiculo.numeroSerie}
									</div>
								</div>

								<div className="rounded-lg border border-border p-3">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
										<Activity className="h-3 w-3" /> Estado
									</div>
									<div className="mt-1">
										<span
											className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
												selectedVehiculo.estado === "Activo"
													? "bg-green-500/10 text-green-500"
													: selectedVehiculo.estado === "En Mantenimiento"
														? "bg-yellow-500/10 text-yellow-500"
														: "bg-muted text-muted-foreground"
											}`}
										>
											{selectedVehiculo.estado}
										</span>
									</div>
								</div>

								<div className="rounded-lg border border-border p-3">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
										<Wrench className="h-3 w-3" /> Inversión Acumulada
									</div>
									<div className="text-sm font-bold text-foreground mt-1">
										$
										{selectedVehiculo.servicios
											.reduce((sum, s) => sum + s.costo, 0)
											.toLocaleString("en-US")}
									</div>
								</div>
							</div>

							{/* Services History (Cronológico) */}
							<div className="space-y-4 pt-2">
								<div className="flex items-center justify-between border-b border-border pb-2">
									<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
										<Clock className="h-4 w-4" />
										Historial de Servicios
									</h3>
								</div>

								<div className="relative border-l border-border pl-6 ml-3 space-y-6">
									{selectedVehiculo.servicios.map((srv) => (
										<div key={srv.id} className="relative">
											{/* Timeline dot */}
											<span className="absolute -left-9 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary border border-border text-[10px] text-foreground font-bold">
												•
											</span>

											<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/20 transition-all cursor-pointer group">
												<button
													type="button"
													onClick={() => setSelectedDetailService(srv)}
													className="flex-1 min-w-0 text-left"
												>
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded text-foreground">
															{srv.fecha}
														</span>
														<span className="text-xs font-bold text-foreground">
															${srv.costo}
														</span>
													</div>
													<p className="text-sm text-foreground mt-1 font-medium group-hover:text-primary transition-colors truncate">
														{srv.descripcion}
													</p>
													<span className="text-[10px] text-green-500 font-semibold bg-green-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
														{srv.estado}
													</span>
												</button>

												<div className="flex items-center gap-2 justify-end">
													<button
														type="button"
														onClick={() => handleOpenEditHistoryService(srv)}
														className="p-1.5 rounded text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
														title="Editar entrada"
													>
														<Edit2 className="h-3.5 w-3.5" />
													</button>
													<button
														type="button"
														onClick={() =>
															handleDeleteHistoryServiceClick(srv.id)
														}
														className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors"
														title="Eliminar entrada"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
											</div>
										</div>
									))}
									{/* ORDENES DE TRABAJO (CONVEX) */}
									{(ordenesVehiculo ?? []).map((orden) => (
										<div key={orden._id} className="relative">
											<span className="absolute -left-9 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold">
												<Wrench className="h-3 w-3" />
											</span>
											<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/20 transition-all group">
												<div className="flex-1 min-w-0 text-left">
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded">
															{orden.fechaInicio}
														</span>
														<span className="text-xs font-bold px-2 py-0.5 rounded border border-border/50 text-foreground">
															{orden.estado}
														</span>
													</div>
													<div className="mt-2 text-sm text-foreground space-y-1">
														{orden.items.map((item, _i) => (
															<div
																key={crypto.randomUUID()}
																className="flex items-center gap-1.5"
															>
																<div className={"h-1.5 w-1.5 rounded-full "} />
																<span>
																	{item.descripcion} (x{item.cantidad})
																</span>
															</div>
														))}
													</div>
												</div>
												<div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start">
													<span className="font-bold text-foreground"></span>
												</div>
											</div>
										</div>
									))}
									{selectedVehiculo.servicios.length === 0 &&
										(ordenesVehiculo ?? []).length === 0 && (
											<div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg ml-[-12px]">
												Aún no hay registros en la cronología de este vehículo.
											</div>
										)}
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2 justify-center">
							<AlertCircle className="h-10 w-10 opacity-30 animate-pulse" />
							<span>
								Selecciona un vehículo de la lista para ver su cronología de
								rotulado.
							</span>
						</div>
					)}
				</div>
			</div>

			{/* CREATE VEHICLE MODAL */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsCreateOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Registrar Nuevo Vehículo
						</h3>
						<form onSubmit={handleCreate} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="create-placa"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Placa *
									</label>
									<input
										id="create-placa"
										type="text"
										required
										value={placa}
										onChange={(e) => setPlaca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. PBA-3421"
									/>
								</div>
								<div>
									<label
										htmlFor="create-categoria"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Categoría *
									</label>
									<select
										id="create-categoria"
										value={categoria}
										onChange={(e) => setCategoria(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									>
										{categoriasPrecios.length === 0 && (
											<option value="Bus Urbano">Bus Urbano</option>
										)}
										{categoriasPrecios.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="create-marca"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Marca
									</label>
									<input
										id="create-marca"
										type="text"
										value={marca}
										onChange={(e) => setMarca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. Hino"
									/>
								</div>
								<div>
									<label
										htmlFor="create-modelo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Modelo
									</label>
									<input
										id="create-modelo"
										type="text"
										value={modelo}
										onChange={(e) => setModelo(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. AK8J"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="create-anio"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Año
									</label>
									<input
										id="create-anio"
										type="text"
										value={año}
										onChange={(e) => setAño(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. 2020"
									/>
								</div>
							</div>

							<div className="border-t border-border pt-3">
								<div className="flex gap-4 mb-3">
									<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
										<input
											type="radio"
											checked={propietarioTipo === "cliente"}
											onChange={() => {
												setPropietarioTipo("cliente");
												setPropietarioId(
													clientes.length > 0 ? clientes[0].id : "",
												);
											}}
											className="cursor-pointer"
										/>
										Cliente Particular
									</label>
									<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
										<input
											type="radio"
											checked={propietarioTipo === "empresa"}
											onChange={() => {
												setPropietarioTipo("empresa");
												setPropietarioId(
													empresas.length > 0 ? empresas[0].id : "",
												);
											}}
											className="cursor-pointer"
										/>
										Empresa / Flota
									</label>
								</div>

								<label
									htmlFor="create-propietario"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Asignar Propietario *
								</label>
								<select
									id="create-propietario"
									required
									value={propietarioId}
									onChange={(e) => setPropietarioId(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									<option value="" disabled>
										Seleccionar propietario...
									</option>
									{propietarioTipo === "cliente"
										? clientes.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nombre}
												</option>
											))
										: empresas.map((e) => (
												<option key={e.id} value={e.id}>
													{e.nombre}
												</option>
											))}
								</select>
							</div>

							<div>
								<label
									htmlFor="create-estado"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Estado de Operación
								</label>
								<select
									id="create-estado"
									value={estado}
									onChange={(e) =>
										setEstado(
											e.target.value as
												| "Activo"
												| "En Mantenimiento"
												| "Inactivo",
										)
									}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									<option value="Activo">Activo</option>
									<option value="En Mantenimiento">En Mantenimiento</option>
									<option value="Inactivo">Inactivo</option>
								</select>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors"
								>
									Guardar Vehículo
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* EDIT VEHICLE MODAL */}
			{isEditOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsEditOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Editar Datos de Vehículo
						</h3>
						<form onSubmit={handleEdit} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="edit-placa"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Placa *
									</label>
									<input
										id="edit-placa"
										type="text"
										required
										value={placa}
										onChange={(e) => setPlaca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="edit-categoria"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Categoría *
									</label>
									<select
										id="edit-categoria"
										value={categoria}
										onChange={(e) => setCategoria(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									>
										{categoriasPrecios.length === 0 && (
											<option value={categoria}>
												{categoria || "Bus Urbano"}
											</option>
										)}
										{categoriasPrecios.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="edit-marca"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Marca
									</label>
									<input
										id="edit-marca"
										type="text"
										value={marca}
										onChange={(e) => setMarca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="edit-modelo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Modelo
									</label>
									<input
										id="edit-modelo"
										type="text"
										value={modelo}
										onChange={(e) => setModelo(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="edit-anio"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Año
									</label>
									<input
										id="edit-anio"
										type="text"
										value={año}
										onChange={(e) => setAño(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div className="border-t border-border pt-3">
								<div className="flex gap-4 mb-3">
									<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
										<input
											type="radio"
											checked={propietarioTipo === "cliente"}
											onChange={() => {
												setPropietarioTipo("cliente");
												setPropietarioId(
													clientes.length > 0 ? clientes[0].id : "",
												);
											}}
											className="cursor-pointer"
										/>
										Cliente Particular
									</label>
									<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
										<input
											type="radio"
											checked={propietarioTipo === "empresa"}
											onChange={() => {
												setPropietarioTipo("empresa");
												setPropietarioId(
													empresas.length > 0 ? empresas[0].id : "",
												);
											}}
											className="cursor-pointer"
										/>
										Empresa / Flota
									</label>
								</div>

								<label
									htmlFor="edit-propietario"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Cambiar Propietario *
								</label>
								<select
									id="edit-propietario"
									required
									value={propietarioId}
									onChange={(e) => setPropietarioId(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									{propietarioTipo === "cliente"
										? clientes.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nombre}
												</option>
											))
										: empresas.map((e) => (
												<option key={e.id} value={e.id}>
													{e.nombre}
												</option>
											))}
								</select>
							</div>

							<div>
								<label
									htmlFor="edit-estado"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Estado de Operación
								</label>
								<select
									id="edit-estado"
									value={estado}
									onChange={(e) =>
										setEstado(
											e.target.value as
												| "Activo"
												| "En Mantenimiento"
												| "Inactivo",
										)
									}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									<option value="Activo">Activo</option>
									<option value="En Mantenimiento">En Mantenimiento</option>
									<option value="Inactivo">Inactivo</option>
								</select>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsEditOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors"
								>
									Guardar Cambios
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* NEW SERVICE FLOW OVERLAY DIALOG */}
			{isNewServiceFlowOpen && selectedVehiculo && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsNewServiceFlowOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl text-center animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-2">
							Nuevo Servicio para {selectedVehiculo.placa}
						</h3>
						<p className="text-sm text-muted-foreground mb-6">
							Elige si deseas estructurar una cotización o registrar
							directamente una orden de trabajo activa. Los datos se
							transferirán automáticamente.
						</p>
						<div className="grid gap-3 grid-cols-2">
							<button
								type="button"
								onClick={() => handleSelectServiceFlow("cotizacion")}
								className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary hover:border-ring/30 transition-all text-center group cursor-pointer"
							>
								<div className="p-3 bg-secondary rounded-full group-hover:bg-card border border-border transition-colors">
									<FileText className="h-6 w-6 text-foreground" />
								</div>
								<div className="text-sm font-bold text-foreground">
									Crear Cotización
								</div>
								<div className="text-[10px] text-muted-foreground">
									Estructurar plantilla y precios sugeridos
								</div>
							</button>

							<button
								type="button"
								onClick={() => handleSelectServiceFlow("orden")}
								className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary hover:border-ring/30 transition-all text-center group cursor-pointer"
							>
								<div className="p-3 bg-secondary rounded-full group-hover:bg-card border border-border transition-colors">
									<ClipboardCheck className="h-6 w-6 text-foreground" />
								</div>
								<div className="text-sm font-bold text-foreground">
									Orden de Trabajo
								</div>
								<div className="text-[10px] text-muted-foreground">
									Iniciar producción e instalación inmediata
								</div>
							</button>
						</div>

						<button
							type="button"
							onClick={() => setIsNewServiceFlowOpen(false)}
							className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
						>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{/* HISTORIC SERVICE: ADD MODAL */}
			{isAddHistoryServiceOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsAddHistoryServiceOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Agregar Servicio Histórico
						</h3>
						<form onSubmit={handleAddHistoryService} className="space-y-4">
							<div>
								<label
									htmlFor="add-srv-descripcion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Descripción del Trabajo Realizado *
								</label>
								<input
									id="add-srv-descripcion"
									type="text"
									required
									value={srvDescripcion}
									onChange={(e) => setSrvDescripcion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Rotulado de franja de seguridad lateral"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="add-srv-costo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Costo Total ($ USD) *
									</label>
									<input
										id="add-srv-costo"
										type="number"
										required
										min="0"
										value={srvCosto}
										onChange={(e) => setSrvCosto(Number(e.target.value))}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="add-srv-fecha"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha de Entrega *
									</label>
									<input
										id="add-srv-fecha"
										type="date"
										required
										value={srvFecha}
										onChange={(e) => setSrvFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="add-srv-estado"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Estado de Entrega
								</label>
								<input
									id="add-srv-estado"
									type="text"
									disabled
									value={srvEstado}
									className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
								/>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsAddHistoryServiceOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors"
								>
									Agregar Registro
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* HISTORIC SERVICE: EDIT MODAL */}
			{isEditHistoryServiceOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsEditHistoryServiceOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Editar Entrada Histórica
						</h3>
						<form onSubmit={handleEditHistoryService} className="space-y-4">
							<div>
								<label
									htmlFor="edit-srv-descripcion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Descripción del Trabajo *
								</label>
								<input
									id="edit-srv-descripcion"
									type="text"
									required
									value={srvDescripcion}
									onChange={(e) => setSrvDescripcion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="edit-srv-costo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Costo ($ USD) *
									</label>
									<input
										id="edit-srv-costo"
										type="number"
										required
										min="0"
										value={srvCosto}
										onChange={(e) => setSrvCosto(Number(e.target.value))}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="edit-srv-fecha"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha *
									</label>
									<input
										id="edit-srv-fecha"
										type="date"
										required
										value={srvFecha}
										onChange={(e) => setSrvFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsEditHistoryServiceOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors"
								>
									Guardar Registro
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* DETALLE DE SERVICIO MODAL */}
			{selectedDetailService && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setSelectedDetailService(null)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<div className="flex items-center justify-between pb-3 border-b border-border mb-4">
							<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
								<Wrench className="h-5 w-5 text-primary" />
								Detalle del Servicio
							</h3>
							<button
								type="button"
								onClick={() => setSelectedDetailService(null)}
								className="text-muted-foreground hover:text-foreground text-sm font-bold"
							>
								Cerrar
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
									Trabajo Realizado
								</span>
								<p className="text-sm font-semibold text-foreground mt-1">
									{selectedDetailService.descripcion}
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Costo
									</span>
									<p className="text-base font-black text-foreground mt-1">
										${selectedDetailService.costo} USD
									</p>
								</div>
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Fecha de Entrega
									</span>
									<p className="text-sm font-semibold text-foreground mt-1">
										{selectedDetailService.fecha}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Estado
									</span>
									<div className="mt-1">
										<span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
											{selectedDetailService.estado}
										</span>
									</div>
								</div>
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Vehículo
									</span>
									<p className="text-sm font-semibold text-foreground mt-1">
										{selectedVehiculo?.marca} {selectedVehiculo?.modelo}
									</p>
									<p className="text-xs text-muted-foreground">
										Placa: {selectedVehiculo?.placa}
									</p>
								</div>
							</div>

							<div className="border-t border-border pt-3">
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
									Propietario
								</span>
								<p className="text-sm font-semibold text-foreground mt-1">
									{selectedVehiculo
										? getOwnerDetails(selectedVehiculo).nombre
										: ""}
								</p>
								<p className="text-xs text-muted-foreground">
									{selectedVehiculo
										? getOwnerDetails(selectedVehiculo).tipo
										: ""}
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setSelectedDetailService(null)}
							className="mt-6 w-full rounded-lg bg-secondary hover:bg-secondary/80 py-2.5 text-sm font-semibold text-foreground transition-colors"
						>
							Cerrar
						</button>
					</div>
				</div>
			)}

			{/* CONFIRMATIONS & FEEDBACKS */}
			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Remover" : "Entendido"}
			/>
		</div>
	);
};


