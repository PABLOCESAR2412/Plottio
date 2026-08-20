import { useAction, useMutation, useQuery } from "convex/react";
import {
	Building,
	Car,
	ChevronRight,
	Edit2,
	Info,
	Loader2,
	Mail,
	Phone,
	Plus,
	Search,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	consultarCacheIdentidad,
	guardarCacheIdentidad,
} from "../lib/consultaIdentidadCache";
import { validarIdentificacion } from "../lib/identificacion";
import { useSessionStore } from "../store/useSessionStore";
import type { Cliente, Empresa, Vehiculo } from "../types/data";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

interface ClientesViewProps {
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
	onSelectVehicle: (vId: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
	onSelectVehicle,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);

	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawEmpresas = useQuery(api.organizacion.getEmpresas);

	const createClienteMut = useMutation(api.clientes.createCliente);
	const updateClienteMut = useMutation(api.clientes.updateCliente);
	const deleteClienteMut = useMutation(api.clientes.deleteCliente);
	const consultarIdentidadAction = useAction(
		api.consultaIdentidad.consultarIdentidad,
	);

	const clientes = (rawClientes || []).map((c) => ({
		...c,
		id: c._id,
		createdAt: new Date(c._creationTime).toLocaleDateString(),
	})) as Cliente[];

	const vehiculos = (rawVehiculos || []).map((v) => ({
		...v,
		id: v._id,
		año: v.anio,
	})) as Vehiculo[];

	const empresas = (rawEmpresas || []).map((e) => ({
		...e,
		id: e._id,
	})) as unknown as Empresa[];

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

	// Modals / Dialogs states
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Alert/Success dialog state
	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete" | "error";
		onConfirm?: () => void;
	}>({
		isOpen: false,
		title: "",
		message: "",
		type: "success",
	});

	// Active sub-tab inside detail view
	const [activeSubTab, setActiveSubTab] = useState<"contacto" | "vehiculos">(
		"contacto",
	);

	// Form states
	const [nombre, setNombre] = useState("");
	const [telefono, setTelefono] = useState("");
	const [email, setEmail] = useState("");
	const [direccion, setDireccion] = useState("");
	const [identificacion, setIdentificacion] = useState("");
	const [empresaId, setEmpresaId] = useState<string>("");

	// Búsqueda de identificación (C.I. / RUC) al crear cliente
	const [buscarIdentidadCargando, setBuscarIdentidadCargando] = useState(false);
	const [resultadosBusqueda, setResultadosBusqueda] = useState<
		{ nombres: string; identificacion: string; direccion: string }[]
	>([]);
	const [errorIdentificacion, setErrorIdentificacion] = useState("");
	const [identificacionValida, setIdentificacionValida] = useState(false);
	const [buscado, setBuscado] = useState(false);
	const searchTimerRef = useRef<number | null>(null);

	// Validación de campos del formulario de creación
	const [errorNombre, setErrorNombre] = useState("");
	const [errorTelefono, setErrorTelefono] = useState("");

	// Selected client for editing
	const [editingClient, setEditingClient] = useState<Cliente | null>(null);

	// Filter clients by Role and Search Term
	const filteredClientes = clientes.filter((c) => {
		// SaaS Multi-tenant filtering
		if (
			currentUser?.sucursalId &&
			c.sucursalId &&
			c.sucursalId !== currentUser.sucursalId
		) {
			return false;
		}

		return (
			c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
			c.telefono.includes(searchTerm) ||
			c.email.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	// Ensure selected client is valid in current view
	const activeClientId = filteredClientes.find((c) => c.id === selectedClientId)
		? selectedClientId
		: filteredClientes.length > 0
			? filteredClientes[0].id
			: null;

	const selectedClient = clientes.find((c) => c.id === activeClientId);

	// Get vehicles for selected client
	const clientVehicles = selectedClient
		? vehiculos.filter(
				(v) =>
					v.propietarioTipo === "cliente" &&
					v.propietarioId === selectedClient.id,
			)
		: [];

	const handleOpenCreate = () => {
		if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
		setNombre("");
		setTelefono("");
		setEmail("");
		setDireccion("");
		setIdentificacion("");
		setEmpresaId("");
		setResultadosBusqueda([]);
		setErrorIdentificacion("");
		setErrorNombre("");
		setErrorTelefono("");
		setIdentificacionValida(false);
		setBuscado(false);
		setBuscarIdentidadCargando(false);
		setIsCreateOpen(true);
	};

	const buscarIdentidad = async (valor: string) => {
		setBuscarIdentidadCargando(true);
		setBuscado(true);
		setErrorIdentificacion("");
		setResultadosBusqueda([]);

		const cache = consultarCacheIdentidad(valor);
		if (cache) {
			if (cache.encontrado) {
				setResultadosBusqueda([
					{
						nombres: cache.nombres,
						identificacion: cache.identificacion,
						direccion: cache.direccion,
					},
				]);
			}
			setBuscarIdentidadCargando(false);
			return;
		}

		try {
			const res = await consultarIdentidadAction({ numero: valor });
			guardarCacheIdentidad(valor, res);
			if (res.encontrado) {
				setResultadosBusqueda([
					{
						nombres: res.nombres,
						identificacion: res.identificacion,
						direccion: res.direccion,
					},
				]);
			} else {
				setResultadosBusqueda([]);
			}
		} catch (err) {
			setErrorIdentificacion(
				err instanceof Error
					? err.message
					: "Error al consultar la identificación.",
			);
		} finally {
			setBuscarIdentidadCargando(false);
		}
	};

	const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const valor = e.target.value;
		setNombre(valor);
		if (valor && !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(valor)) {
			setErrorNombre("El nombre solo puede contener letras.");
		} else {
			setErrorNombre("");
		}
	};

	const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const soloNumeros = e.target.value.replace(/\D/g, "").slice(0, 10);
		setTelefono(soloNumeros);
		if (soloNumeros && soloNumeros.length !== 10) {
			setErrorTelefono(
				soloNumeros.length < 10
					? "El número tiene menos dígitos de los correctos (10)."
					: "El número tiene más dígitos de los correctos (10).",
			);
		} else {
			setErrorTelefono("");
		}
	};

	const handleIdentificacionChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const soloNumeros = e.target.value.replace(/\D/g, "").slice(0, 13);
		setIdentificacion(soloNumeros);

		const { valida, mensaje } = validarIdentificacion(soloNumeros);
		setErrorIdentificacion(soloNumeros && !valida ? mensaje : "");
		setIdentificacionValida(valida);
		setResultadosBusqueda([]);
		setBuscado(false);

		if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);

		if (!valida || soloNumeros.length === 0) return;

		searchTimerRef.current = window.setTimeout(() => {
			void buscarIdentidad(soloNumeros);
		}, 600);
	};

	const aplicarResultado = (r: {
		nombres: string;
		identificacion: string;
		direccion: string;
	}) => {
		setNombre(r.nombres);
		if (r.direccion) setDireccion(r.direccion);
		setResultadosBusqueda([]);
		setBuscado(false);
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nombre.trim() || !currentUser) return;

		if (nombre.trim() && !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(nombre.trim())) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: "El nombre solo puede contener letras.",
				type: "error",
			});
			return;
		}

		if (telefono && telefono.length !== 10) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `El teléfono debe tener 10 dígitos (ingresó ${telefono.length}).`,
				type: "error",
			});
			return;
		}

		if (!identificacion.trim() || !identificacionValida) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: "El campo C.I. / RUC es obligatorio y debe ser válido.",
				type: "error",
			});
			return;
		}

		const isDuplicate =
			identificacion.trim() !== "" &&
			clientes.some(
				(c) =>
					c.identificacion && c.identificacion.trim() === identificacion.trim(),
			);
		if (isDuplicate) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `La identificación "${identificacion.trim()}" ya está registrada.`,
				type: "error",
			});
			return;
		}
		const newCli = await createClienteMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			nombre: nombre.trim(),
			telefono: telefono.trim() || "+593 ",
			email:
				email.trim() ||
				`${nombre.trim().toLowerCase().replace(/\s+/g, ".")}@email.com`,
			direccion: direccion.trim(),
			identificacion: identificacion.trim(),
		});

		setIsCreateOpen(false);
		if (newCli) {
			setSelectedClientId(newCli._id);
		}

		setAlertConfig({
			isOpen: true,
			title: "Cliente Creado",
			message: `El cliente "${nombre.trim()}" ha sido registrado con éxito.`,
			type: "success",
		});
	};

	const handleOpenEdit = (client: Cliente) => {
		setEditingClient(client);
		setNombre(client.nombre);
		setTelefono(client.telefono);
		setEmail(client.email);
		setDireccion(client.direccion || "");
		setIdentificacion(client.identificacion || "");
		setEmpresaId(client.empresaId || "");
		setIsEditOpen(true);
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingClient || !nombre.trim() || !currentUser) return;

		const isDuplicate =
			identificacion.trim() !== "" &&
			clientes.some(
				(c) =>
					c.identificacion &&
					c.identificacion.trim() === identificacion.trim() &&
					c.id !== editingClient.id,
			);
		if (isDuplicate) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `La identificación "${identificacion.trim()}" ya está registrada en otro cliente.`,
				type: "error",
			});
			return;
		}
		await updateClienteMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			clienteId: editingClient.id as Id<"clientes">,
			nombre: nombre.trim(),
			telefono: telefono.trim(),
			email: email.trim(),
			direccion: direccion.trim(),
			identificacion: identificacion.trim(),
			empresaId: empresaId ? (empresaId as Id<"empresas">) : undefined,
		});

		setIsEditOpen(false);

		setAlertConfig({
			isOpen: true,
			title: "Cliente Actualizado",
			message: `Los datos de "${nombre}" se actualizaron correctamente.`,
			type: "success",
		});
	};

	const handleDeleteClick = (client: Cliente) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Cliente?",
			message: `¿Estás seguro de que deseas eliminar a "${client.nombre}"? Esta acción no se puede deshacer.`,
			type: "delete",
			onConfirm: async () => {
				if (!currentUser) return;
				await deleteClienteMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					clienteId: client.id as Id<"clientes">,
				});
				if (selectedClientId === client.id) {
					const remaining = clientes.filter((c) => c.id !== client.id);
					setSelectedClientId(remaining.length > 0 ? remaining[0].id : null);
				}
				setAlertConfig({
					isOpen: true,
					title: "Cliente Eliminado",
					message: "El registro del cliente ha sido borrado del sistema.",
					type: "success",
				});
			},
		});
	};

	if (
		rawClientes === undefined ||
		rawVehiculos === undefined ||
		rawEmpresas === undefined
	) {
		return <TableSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Header section */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Clientes
					</h1>
					<p className="text-muted-foreground">
						Administra la base de datos de tus clientes individuales.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Nuevo Cliente
				</button>
			</div>

			{/* Main split grid */}
			<div className="grid gap-6 md:grid-cols-3">
				{/* Left col - Clients List */}
				<div className="md:col-span-1 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
					<div className="relative">
						<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar por nombre, tlf o email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
						/>
					</div>

					<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
						{filteredClientes.map((client) => (
							<button
								type="button"
								key={client.id}
								onClick={() => {
									setSelectedClientId(client.id);
									setActiveSubTab("contacto");
								}}
								className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 ${
									selectedClientId === client.id
										? "bg-primary text-primary-foreground shadow-sm"
										: "hover:bg-secondary"
								}`}
							>
								<div className="truncate pr-2">
									<div className="font-semibold text-sm truncate">
										{client.nombre}
									</div>
									<div
										className={`text-xs truncate ${selectedClientId === client.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
									>
										{client.telefono}
									</div>
								</div>
								<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
							</button>
						))}
						{filteredClientes.length === 0 && (
							<div className="text-center py-8 text-muted-foreground text-sm">
								No se encontraron clientes.
							</div>
						)}
					</div>
				</div>

				{/* Right col - Client Details */}
				<div className="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
					{selectedClient ? (
						<div className="space-y-6">
							{/* Client Title and Header Actions */}
							<div className="flex items-start justify-between border-b border-border pb-4">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground font-semibold text-lg">
										{selectedClient.nombre
											.split(" ")
											.map((n) => n[0])
											.join("")
											.substring(0, 2)
											.toUpperCase()}
									</div>
									<div>
										<h2 className="text-xl font-bold text-foreground">
											{selectedClient.nombre}
										</h2>
										<span className="text-xs text-muted-foreground font-medium">
											Registrado el {selectedClient.createdAt}
										</span>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleOpenEdit(selectedClient)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
										title="Editar Cliente"
									>
										<Edit2 className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDeleteClick(selectedClient)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors"
										title="Eliminar Cliente"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Sub-navigation tabs (Datos de Contacto / Historial de Vehículos) */}
							<div className="flex border-b border-border">
								<button
									type="button"
									onClick={() => setActiveSubTab("contacto")}
									className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
										activeSubTab === "contacto"
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									Datos de Contacto
								</button>
								<button
									type="button"
									onClick={() => setActiveSubTab("vehiculos")}
									className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
										activeSubTab === "vehiculos"
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									Historial de Vehículos ({clientVehicles.length})
								</button>
							</div>

							{/* Tab Contents */}
							{activeSubTab === "contacto" ? (
								<div className="space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="flex items-center gap-3 rounded-lg border border-border p-3">
											<Phone className="h-5 w-5 text-muted-foreground" />
											<div>
												<div className="text-xs text-muted-foreground">
													Teléfono
												</div>
												<div className="text-sm font-semibold text-foreground">
													{selectedClient.telefono}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-3 rounded-lg border border-border p-3">
											<Mail className="h-5 w-5 text-muted-foreground" />
											<div className="overflow-hidden">
												<div className="text-xs text-muted-foreground">
													Correo Electrónico
												</div>
												<div
													className="text-sm font-semibold text-foreground truncate"
													title={selectedClient.email}
												>
													{selectedClient.email}
												</div>
											</div>
										</div>

										{selectedClient.identificacion && (
											<div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
												<div className="rounded-full bg-primary/10 p-2 text-primary">
													<Info className="h-4 w-4" />
												</div>
												<div>
													<p className="text-xs text-muted-foreground">
														C.I. / RUC
													</p>
													<p className="text-sm font-medium text-foreground">
														{selectedClient.identificacion}
													</p>
												</div>
											</div>
										)}

										<div className="flex items-center gap-3 rounded-lg border border-border p-3">
											<Building className="h-5 w-5 text-muted-foreground" />
											<div>
												<div className="text-xs text-muted-foreground">
													Dirección
												</div>
												<div className="text-sm font-semibold text-foreground">
													{selectedClient.direccion || "No especificada"}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-3 rounded-lg border border-border p-3 sm:col-span-2">
											<Building className="h-5 w-5 text-muted-foreground" />
											<div>
												<div className="text-xs text-muted-foreground">
													Empresa vinculada
												</div>
												<div className="text-sm font-semibold text-foreground">
													{selectedClient.empresaId
														? empresas.find(
																(e) => e.id === selectedClient.empresaId,
															)?.nombre || "No asignado"
														: "Cliente particular (Sin empresa/flota)"}
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{clientVehicles.map((veh) => (
										<button
											type="button"
											key={veh.id}
											onClick={() => onSelectVehicle(veh.id)}
											className="w-full flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors text-left cursor-pointer hover:border-primary/80"
											title="Ver historial y servicios del vehículo"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
													<Car className="h-5 w-5" />
												</div>
												<div>
													<div className="font-semibold text-sm text-foreground">
														{veh.marca} {veh.modelo} ({veh.año})
													</div>
													<div className="text-xs text-muted-foreground flex items-center gap-2">
														<span className="font-bold text-foreground">
															{veh.placa}
														</span>
														<span>•</span>
														<span>{veh.categoria}</span>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-3">
												<span
													className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
														veh.estado === "Activo"
															? "bg-green-500/10 text-green-500"
															: veh.estado === "En Mantenimiento"
																? "bg-yellow-500/10 text-yellow-500"
																: "bg-muted text-muted-foreground"
													}`}
												>
													{veh.estado}
												</span>
											</div>
										</button>
									))}
									{clientVehicles.length === 0 && (
										<div className="text-center py-10 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
											<Car className="h-8 w-8 opacity-40 animate-pulse" />
											<span>
												Este cliente no tiene vehículos registrados aún.
											</span>
										</div>
									)}
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2 justify-center">
							<Info className="h-10 w-10 opacity-30" />
							<span>
								Selecciona un cliente de la lista para ver su información
								detallada.
							</span>
						</div>
					)}
				</div>
			</div>

			{/* CREATE MODAL */}
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
							Registrar Nuevo Cliente
						</h3>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label
									htmlFor="cliente-identificacion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									C.I. / RUC *
								</label>
								<div className="flex gap-2">
									<input
										id="cliente-identificacion"
										type="text"
										inputMode="numeric"
										required
										maxLength={13}
										value={identificacion}
										onChange={handleIdentificacionChange}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. 1710034065"
									/>
									<button
										type="button"
										onClick={() => void buscarIdentidad(identificacion)}
										disabled={buscarIdentidadCargando || !identificacionValida}
										aria-label="Buscar por C.I. / RUC"
										className="shrink-0 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
									>
										<Search className="h-4 w-4" />
									</button>
								</div>
								{errorIdentificacion && (
									<p className="mt-1 text-xs text-destructive">
										{errorIdentificacion}
									</p>
								)}
								{buscarIdentidadCargando && (
									<div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										<span className="text-xs text-muted-foreground">
											Buscando cliente...
										</span>
									</div>
								)}
								{!buscarIdentidadCargando &&
									buscado &&
									resultadosBusqueda.length === 0 &&
									!errorIdentificacion && (
										<p className="mt-1 text-xs text-muted-foreground">
											No se encontró un cliente con esa cédula/RUC.
										</p>
									)}
								{!buscarIdentidadCargando && resultadosBusqueda.length > 0 && (
									<ul className="mt-2 max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background">
										{resultadosBusqueda.map((r) => (
											<li key={r.identificacion}>
												<button
													type="button"
													onClick={() => aplicarResultado(r)}
													className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors cursor-pointer"
												>
													<User className="h-4 w-4 shrink-0 text-primary" />
													<div className="min-w-0">
														<p className="truncate text-sm font-medium text-foreground">
															{r.nombres}
														</p>
														<p className="text-xs text-muted-foreground">
															{r.identificacion}
														</p>
													</div>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>

							<div>
								<label
									htmlFor="cliente-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre Completo *
								</label>
								<input
									id="cliente-nombre"
									type="text"
									required
									value={nombre}
									onChange={handleNombreChange}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Carlos Mendoza"
								/>
								{errorNombre && (
									<p className="mt-1 text-xs text-destructive">{errorNombre}</p>
								)}
							</div>

							<div>
								<label
									htmlFor="cliente-telefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono
								</label>
								<input
									id="cliente-telefono"
									type="text"
									inputMode="numeric"
									maxLength={10}
									value={telefono}
									onChange={handleTelefonoChange}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. 0991234567"
								/>
								{errorTelefono && (
									<p className="mt-1 text-xs text-destructive">
										{errorTelefono}
									</p>
								)}
							</div>

							<div>
								<label
									htmlFor="cliente-email"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Correo Electrónico
								</label>
								<input
									id="cliente-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. carlos@correo.com"
								/>
							</div>

							<div>
								<label
									htmlFor="cliente-direccion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Dirección (Opcional)
								</label>
								<input
									id="cliente-direccion"
									type="text"
									value={direccion}
									onChange={(e) => setDireccion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Av. Principal 123"
								/>
							</div>

							<div>
								<label
									htmlFor="cliente-empresa"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Vincular a Empresa/Flota
								</label>
								<select
									id="cliente-empresa"
									value={empresaId}
									onChange={(e) => setEmpresaId(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									<option value="">Ninguna (Particular)</option>
									{empresas.map((emp) => (
										<option key={emp.id} value={emp.id}>
											{emp.nombre}
										</option>
									))}
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
									Registrar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* EDIT MODAL */}
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
							Editar Datos de Cliente
						</h3>
						<form onSubmit={handleEdit} className="space-y-4">
							<div>
								<label
									htmlFor="editar-cliente-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre Completo *
								</label>
								<input
									id="editar-cliente-nombre"
									type="text"
									required
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="editar-cliente-telefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono
								</label>
								<input
									id="editar-cliente-telefono"
									type="text"
									value={telefono}
									onChange={(e) => setTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="editar-cliente-email"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Correo Electrónico
								</label>
								<input
									id="editar-cliente-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="editar-cliente-direccion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Dirección (Opcional)
								</label>
								<input
									id="editar-cliente-direccion"
									type="text"
									value={direccion}
									onChange={(e) => setDireccion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="editar-cliente-empresa"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Vincular a Empresa/Flota
								</label>
								<select
									id="editar-cliente-empresa"
									value={empresaId}
									onChange={(e) => setEmpresaId(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								>
									<option value="">Ninguna (Particular)</option>
									{empresas.map((emp) => (
										<option key={emp.id} value={emp.id}>
											{emp.nombre}
										</option>
									))}
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

			{/* ALERT / SUCCESS DIALOG */}
			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Eliminar" : "Entendido"}
			/>
		</div>
	);
};
