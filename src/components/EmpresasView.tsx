import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	Building2,
	Car,
	ChevronRight,
	Edit2,
	Phone,
	Plus,
	Search,
	Trash2,
	TrendingUp,
	User,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

interface EmpresasViewProps {
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

type LocalEmpresa = {
	id: string;
	nombre: string;
	ruc: string;
	razonSocial?: string;
	contactoNombre?: string;
	contactoTelefono?: string;
	direccion?: string;
	email?: string;
	telefono?: string;
	sucursalId?: string;
	logoUrl?: string;
};

type LocalVehiculo = {
	id: string;
	propietarioId: string;
	propietarioTipo: "cliente" | "empresa";
	placa: string;
	marca?: string;
	modelo?: string;
	anio?: string | number;
	categoria?: string;
	numeroSerie?: string;
	estado?: string;
	servicios?: Array<{ subtotal?: number }>;
};

export const EmpresasView: React.FC<EmpresasViewProps> = ({
	onSelectVehicle,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);

	// ── QUERIES ──────────────────────────────────────────────────────────────
	const rawEmpresas = useQuery(api.organizacion.getEmpresas, {}) as
		| Array<LocalEmpresa & { _id: string }>
		| undefined;
	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		currentUser?.id ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	) as Array<LocalVehiculo & { _id: string }> | undefined;

	// ── MUTATIONS ────────────────────────────────────────────────────────────
	const createEmpresaMut = useMutation(api.organizacion.createEmpresa);
	const updateEmpresaMut = useMutation(api.organizacion.updateEmpresa);
	const deleteEmpresaMut = useMutation(api.organizacion.deleteEmpresa);
	const generateLogoUploadUrl = useMutation(
		api.organizacion.generateLogoUploadUrl,
	);

	const empresas: LocalEmpresa[] = useMemo(
		() =>
			(rawEmpresas ?? []).map((e) => ({
				id: e._id,
				nombre: e.nombre ?? "",
				ruc: e.ruc ?? "",
				razonSocial: e.razonSocial,
				contactoNombre:
					e.razonSocial && e.razonSocial !== e.nombre
						? e.razonSocial
						: undefined,
				contactoTelefono: e.telefono || undefined,
				direccion: e.direccion,
				email: e.email,
				telefono: e.telefono,
				sucursalId: (e as { sucursalId?: string }).sucursalId,
				logoUrl: (e as { logoUrl?: string }).logoUrl,
			})),
		[rawEmpresas],
	);

	const vehiculos: LocalVehiculo[] = useMemo(
		() =>
			(rawVehiculos ?? []).map((v) => ({
				id: v._id,
				propietarioId: v.propietarioId ?? "",
				propietarioTipo:
					(v.propietarioTipo as "cliente" | "empresa") ?? "cliente",
				placa: v.placa ?? "",
				marca: v.marca,
				modelo: v.modelo,
				anio: v.anio,
				categoria: v.categoria,
				numeroSerie: v.numeroSerie,
				estado: v.estado,
				servicios: v.servicios as Array<{ subtotal?: number }> | undefined,
			})),
		[rawVehiculos],
	);

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(
		empresas.length > 0 ? empresas[0].id : null,
	);

	// Modal / Dialog states
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Success dialog state
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

	// Form states
	const [nombre, setNombre] = useState("");
	const [ruc, setRuc] = useState("");
	const [contactoNombre, setContactoNombre] = useState("");
	const [contactoTelefono, setContactoTelefono] = useState("");
	const [direccion, setDireccion] = useState("");
	const [logoPreview, setLogoPreview] = useState<string>("");
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);

	// Selected company for editing
	const [editingEmpresa, setEditingEmpresa] = useState<LocalEmpresa | null>(
		null,
	);

	// Reset selectedEmpresaId si la empresa desaparece
	useEffect(() => {
		if (
			selectedEmpresaId &&
			!empresas.some((e) => e.id === selectedEmpresaId) &&
			empresas.length > 0
		) {
			setSelectedEmpresaId(empresas[0].id);
		}
	}, [empresas, selectedEmpresaId]);

	// Filter companies
	const filteredEmpresas = empresas.filter((e) => {
		// SaaS Multi-tenant filtering
		if (
			e.sucursalId &&
			currentUser?.sucursalId &&
			e.sucursalId !== currentUser.sucursalId
		) {
			return false;
		}

		return (
			e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
			e.ruc.includes(searchTerm) ||
			e.contactoNombre?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	const activeEmpresaId = filteredEmpresas.find(
		(e) => e.id === selectedEmpresaId,
	)
		? selectedEmpresaId
		: filteredEmpresas.length > 0
			? filteredEmpresas[0].id
			: null;

	const selectedEmpresa = empresas.find((e) => e.id === activeEmpresaId);

	const branding = useQuery(
		api.organizacion.getEmpresaBranding,
		activeEmpresaId ? { empresaId: activeEmpresaId as Id<"empresas"> } : "skip",
	);

	// Calculate metrics for selected company
	const empresaVehiculos = selectedEmpresa
		? vehiculos.filter(
				(v) =>
					v.propietarioTipo === "empresa" &&
					v.propietarioId === selectedEmpresa.id,
			)
		: [];

	const activeVehiclesCount = empresaVehiculos.filter(
		(v) => v.estado === "Activo",
	).length;
	const maintenanceVehiclesCount = empresaVehiculos.filter(
		(v) => v.estado === "En Mantenimiento",
	).length;

	const totalInvestment = empresaVehiculos.reduce((sum, v) => {
		const servicesTotal = (v.servicios ?? []).reduce(
			(sSum, s) => sSum + ((s as { costo?: number }).costo ?? s.subtotal ?? 0),
			0,
		);
		return sum + servicesTotal;
	}, 0);

	const handleOpenCreate = () => {
		setNombre("");
		setRuc("");
		setContactoNombre("");
		setContactoTelefono("");
		setDireccion("");
		setIsCreateOpen(true);
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nombre.trim() || !ruc.trim()) return;

		const isDuplicate =
			ruc.trim() !== "" &&
			empresas.some((e) => e.ruc && e.ruc.trim() === ruc.trim());
		if (isDuplicate) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `El RUC "${ruc.trim()}" ya está registrado en otra empresa.`,
				type: "error",
			});
			return;
		}

		try {
			const newEmp = (await createEmpresaMut({
				nombre: nombre.trim(),
				ruc: ruc.trim(),
				razonSocial: contactoNombre.trim() || nombre.trim(),
				email: "",
				telefono: contactoTelefono.trim() || "",
				direccion: direccion.trim() || "",
			})) as unknown as LocalEmpresa & { _id: string };

			setIsCreateOpen(false);
			setSelectedEmpresaId(newEmp._id);

			setAlertConfig({
				isOpen: true,
				title: "Empresa Registrada",
				message: `La empresa/flota "${newEmp.nombre}" ha sido creada correctamente.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al registrar empresa",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	const handleOpenEdit = (emp: LocalEmpresa) => {
		setEditingEmpresa(emp);
		setNombre(emp.nombre);
		setRuc(emp.ruc);
		setContactoNombre(emp.contactoNombre || emp.razonSocial || "");
		setContactoTelefono(emp.contactoTelefono || emp.telefono || "");
		setDireccion(emp.direccion || "");
		setLogoPreview(
			emp.id === activeEmpresaId && branding?.logoUrl
				? branding.logoUrl
				: emp.logoUrl || "",
		);
		setLogoFile(null);
		setIsEditOpen(true);
	};

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setLogoFile(file);
		const reader = new FileReader();
		reader.onload = () => setLogoPreview(reader.result as string);
		reader.readAsDataURL(file);
	};

	const uploadLogo = async (): Promise<string> => {
		if (!logoFile) return logoPreview;
		setIsUploadingLogo(true);

		const isDuplicate =
			ruc.trim() !== "" &&
			empresas.some(
				(e) =>
					e.ruc &&
					e.ruc.trim() === ruc.trim() &&
					(!editingEmpresa || e.id !== editingEmpresa.id),
			);
		if (isDuplicate) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `El RUC "${ruc.trim()}" ya está registrado en otra empresa.`,
				type: "error",
			});
			return "";
		}

		try {
			const uploadUrl = await generateLogoUploadUrl();
			const res = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": logoFile.type },
				body: logoFile,
			});
			if (!res.ok) throw new Error("Error al subir el logo");
			const { storageId } = (await res.json()) as { storageId: string };
			return storageId;
		} finally {
			setIsUploadingLogo(false);
		}
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingEmpresa || !nombre.trim() || !ruc.trim()) return;

		const isDuplicate =
			ruc.trim() !== "" &&
			empresas.some(
				(e) =>
					e.ruc && e.ruc.trim() === ruc.trim() && e.id !== editingEmpresa.id,
			);
		if (isDuplicate) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Validación",
				message: `El RUC "${ruc.trim()}" ya está registrado en otra empresa.`,
				type: "error",
			});
			return;
		}
		try {
			const logoUrl = await uploadLogo();
			await updateEmpresaMut({
				id: editingEmpresa.id as Id<"empresas">,
				nombre: nombre.trim(),
				ruc: ruc.trim(),
				razonSocial: contactoNombre.trim() || nombre.trim(),
				telefono: contactoTelefono.trim() || "",
				direccion: direccion.trim() || "",
				logoUrl: logoUrl || undefined,
			});
			setIsEditOpen(false);
			setAlertConfig({
				isOpen: true,
				title: "Empresa Actualizada",
				message: `Los datos de "${nombre}" se actualizaron correctamente.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al actualizar",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	const handleDeleteClick = (emp: LocalEmpresa) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Desactivar Empresa?",
			message: `¿Quieres desactivar a "${emp.nombre}"? Dejará de aparecer en las listas operativas, pero se conservarán sus sucursales, vehículos e historial.`,
			type: "delete",
			onConfirm: async () => {
				try {
					await deleteEmpresaMut({ id: emp.id as Id<"empresas"> });
					if (selectedEmpresaId === emp.id) {
						const remaining = empresas.filter((e) => e.id !== emp.id);
						setSelectedEmpresaId(remaining.length > 0 ? remaining[0].id : null);
					}
					setAlertConfig({
						isOpen: true,
						title: "Empresa Desactivada",
						message:
							"La empresa fue retirada de las listas operativas. Su historial se conserva.",
						type: "success",
					});
				} catch (err) {
					setAlertConfig({
						isOpen: true,
						title: "Error al eliminar",
						message: err instanceof Error ? err.message : "Error desconocido",
						type: "alert",
					});
				}
			},
		});
	};

	if (rawEmpresas === undefined || rawVehiculos === undefined) {
		return <TableSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Empresas (Flotas)
					</h1>
					<p className="text-muted-foreground">
						Gestiona flotas de transporte público, cooperativas y corporaciones.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 sm:py-2.5 text-[16px] sm:text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Nueva Empresa
				</button>
			</div>

			{/* Layout Grid */}
			<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
				{/* Left col - List */}
				<div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
					<div className="relative">
						<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar por RUC o nombre..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
						/>
					</div>

					<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
						{filteredEmpresas.map((emp) => (
							<button
								type="button"
								key={emp.id}
								onClick={() => setSelectedEmpresaId(emp.id)}
								className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 ${
									selectedEmpresaId === emp.id
										? "bg-primary text-primary-foreground shadow-sm"
										: "hover:bg-secondary"
								}`}
							>
								<div className="truncate pr-2">
									<div className="font-semibold text-sm truncate">
										{emp.nombre}
									</div>
									<div
										className={`text-xs truncate ${selectedEmpresaId === emp.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
									>
										RUC: {emp.ruc}
									</div>
								</div>
								<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
							</button>
						))}
						{filteredEmpresas.length === 0 && (
							<div className="text-center py-8 text-muted-foreground text-sm">
								No se encontraron empresas.
							</div>
						)}
					</div>
				</div>

				{/* Right col - Details & Fleet Stats */}
				<div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
					{selectedEmpresa ? (
						<div className="space-y-6">
							{/* Header and actions */}
							<div className="flex items-start justify-between border-b border-border pb-4">
								<div className="flex items-center gap-3">
									{branding?.logoUrl ? (
										<img
											src={branding.logoUrl}
											alt={`Logo de ${selectedEmpresa.nombre}`}
											className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary object-cover"
										/>
									) : (
										<div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground font-semibold text-lg">
											<Building2 className="h-6 w-6" />
										</div>
									)}
									<div>
										<h2 className="text-xl font-bold text-foreground">
											{selectedEmpresa.nombre}
										</h2>
										<span className="text-xs text-muted-foreground font-medium">
											RUC: {selectedEmpresa.ruc}
										</span>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleOpenEdit(selectedEmpresa)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
										title="Editar Empresa"
									>
										<Edit2 className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDeleteClick(selectedEmpresa)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors"
										title="Desactivar Empresa"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Stats Cards Row */}
							<div className="grid gap-4 grid-cols-3">
								<div className="rounded-lg border border-border p-4 bg-secondary/15">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
										<Car className="h-3.5 w-3.5 text-green-500" />
										Vehículos Activos
									</div>
									<div className="text-2xl font-bold text-foreground">
										{activeVehiclesCount}
									</div>
								</div>

								<div className="rounded-lg border border-border p-4 bg-secondary/15">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
										<Wrench className="h-3.5 w-3.5 text-yellow-500" />
										En Mantenimiento
									</div>
									<div className="text-2xl font-bold text-foreground">
										{maintenanceVehiclesCount}
									</div>
								</div>

								<div className="rounded-lg border border-border p-4 bg-secondary/15">
									<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
										<TrendingUp className="h-3.5 w-3.5 text-purple-500" />
										Inversión Total
									</div>
									<div className="text-2xl font-bold text-foreground">
										${totalInvestment.toLocaleString()}
									</div>
								</div>
							</div>

							{/* Contact Information */}
							<div className="space-y-3">
								<h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
									Contacto de la Empresa
								</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="flex items-center gap-3 rounded-lg border border-border p-3">
										<User className="h-5 w-5 text-muted-foreground" />
										<div>
											<div className="text-xs text-muted-foreground">
												Representante
											</div>
											<div className="text-sm font-semibold text-foreground">
												{selectedEmpresa.contactoNombre || "No especificado"}
											</div>
										</div>
									</div>

									<div className="flex items-center gap-3 rounded-lg border border-border p-3">
										<Phone className="h-5 w-5 text-muted-foreground" />
										<div>
											<div className="text-xs text-muted-foreground">
												Teléfono de Contacto
											</div>
											<div className="text-sm font-semibold text-foreground">
												{selectedEmpresa.contactoTelefono || "No especificado"}
											</div>
										</div>
									</div>
								</div>

								{selectedEmpresa.direccion && (
									<div className="flex items-center gap-3 rounded-lg border border-border p-3 mt-3 bg-secondary/10">
										<Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
										<div>
											<div className="text-xs text-muted-foreground">
												Dirección de la Empresa
											</div>
											<div className="text-sm font-semibold text-foreground">
												{selectedEmpresa.direccion}
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Fleet Vehicles list with Required "Número de Serie" */}
							<div className="space-y-3 pt-2">
								<h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
									Vehículos de la Flota ({empresaVehiculos.length})
								</h3>
								<div className="divide-y divide-border">
									{empresaVehiculos.map((veh) => (
										<button
											type="button"
											key={veh.id}
											onClick={() => onSelectVehicle(veh.id)}
											className="w-full flex flex-col sm:flex-row sm:items-center justify-between py-3.5 hover:bg-secondary/40 px-2 rounded-lg transition-colors gap-2 text-left cursor-pointer border border-transparent hover:border-primary/80"
											title="Ver historial y servicios del vehículo de la flota"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground shrink-0">
													<Car className="h-5 w-5" />
												</div>
												<div>
													<div className="font-semibold text-sm text-foreground">
														{veh.marca} {veh.modelo} ({veh.anio})
													</div>
													<div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
														<span className="font-bold text-foreground bg-secondary/80 px-1.5 py-0.5 rounded">
															{veh.placa}
														</span>
														<span>•</span>
														<span>{veh.categoria}</span>
													</div>
												</div>
											</div>

											<div className="flex flex-col sm:items-end justify-center">
												<div className="text-xs text-muted-foreground flex items-center gap-1.5">
													<span className="font-semibold text-foreground">
														N° de Serie:
													</span>
													<code className="bg-secondary px-1 py-0.5 rounded text-[11px] font-semibold text-foreground">
														{veh.numeroSerie}
													</code>
												</div>
												<div className="mt-1">
													<span
														className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
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
											</div>
										</button>
									))}
									{empresaVehiculos.length === 0 && (
										<div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground text-sm flex flex-col items-center gap-2">
											<AlertCircle className="h-8 w-8 opacity-40 animate-pulse" />
											<span>
												No hay vehículos de flota vinculados a esta empresa.
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2 justify-center">
							<AlertCircle className="h-10 w-10 opacity-30" />
							<span>
								Selecciona una empresa de la lista para ver el estado de su
								flota.
							</span>
						</div>
					)}
				</div>
			</div>

			{/* CREATE MODAL */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsCreateOpen(false)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Registrar Nueva Empresa / Flota
						</h3>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label
									htmlFor="empresa-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre Comercial de la Flota *
								</label>
								<input
									id="empresa-nombre"
									type="text"
									required
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Cooperativa Quito Express"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-ruc"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									RUC *
								</label>
								<input
									id="empresa-ruc"
									type="text"
									required
									value={ruc}
									onChange={(e) => setRuc(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. 1798765432001"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-contacto-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre del Contacto (Opcional)
								</label>
								<input
									id="empresa-contacto-nombre"
									type="text"
									value={contactoNombre}
									onChange={(e) => setContactoNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Sofía Ramos"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-contacto-telefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono del Contacto (Opcional)
								</label>
								<input
									id="empresa-contacto-telefono"
									type="text"
									value={contactoTelefono}
									onChange={(e) => setContactoTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. +593 96 345 6789"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-direccion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Dirección (Opcional)
								</label>
								<input
									id="empresa-direccion"
									type="text"
									value={direccion}
									onChange={(e) => setDireccion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Av. Amazonas N32-125 y La Niña"
								/>
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
									Registrar Empresa
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* EDIT MODAL */}
			{isEditOpen && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsEditOpen(false)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Editar Datos de la Empresa
						</h3>
						<form onSubmit={handleEdit} className="space-y-4">
							<div className="flex items-center gap-4">
								{logoPreview ? (
									<img
										src={logoPreview}
										alt="Vista previa del logo"
										className="h-16 w-16 rounded-lg border border-border object-cover bg-secondary"
									/>
								) : (
									<div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-secondary text-muted-foreground text-xs text-center px-1">
										Sin logo
									</div>
								)}
								<div className="flex-1">
									<label
										htmlFor="empresa-logo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Logo de la Empresa
									</label>
									<input
										id="empresa-logo"
										type="file"
										accept="image/*"
										onChange={handleLogoChange}
										className="w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-secondary/70"
									/>
									<p className="text-[10px] text-muted-foreground mt-1">
										Se reemplazará en la barra lateral y en el favicon. Sube una
										imagen cuadrada de preferencia.
									</p>
								</div>
							</div>

							<div>
								<label
									htmlFor="empresa-edit-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre Comercial *
								</label>
								<input
									id="empresa-edit-nombre"
									type="text"
									required
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-edit-ruc"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									RUC *
								</label>
								<input
									id="empresa-edit-ruc"
									type="text"
									required
									value={ruc}
									onChange={(e) => setRuc(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-edit-contacto-nombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre del Contacto (Opcional)
								</label>
								<input
									id="empresa-edit-contacto-nombre"
									type="text"
									value={contactoNombre}
									onChange={(e) => setContactoNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-edit-contacto-telefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono del Contacto (Opcional)
								</label>
								<input
									id="empresa-edit-contacto-telefono"
									type="text"
									value={contactoTelefono}
									onChange={(e) => setContactoTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="empresa-edit-direccion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Dirección (Opcional)
								</label>
								<input
									id="empresa-edit-direccion"
									type="text"
									value={direccion}
									onChange={(e) => setDireccion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Av. Amazonas N32-125 y La Niña"
								/>
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
									disabled={isUploadingLogo}
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-60"
								>
									{isUploadingLogo ? "Subiendo logo..." : "Guardar Cambios"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* DELETION CONFIRMATION AND SUCCESS OVERLAY */}
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
