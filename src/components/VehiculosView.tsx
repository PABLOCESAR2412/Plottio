import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useNotificationStore } from "../store/useNotificationStore";
import { useSessionStore } from "../store/useSessionStore";
import type { Vehiculo } from "../types/data";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";
import type {
	OrdenVehiculoResumen,
	OwnerDetails,
	VehiculoFormData,
} from "./vehiculos/types";
import { useVehiculoServicios } from "./vehiculos/useVehiculoServicios";
import { useVehiculosData } from "./vehiculos/useVehiculosData";
import { VehiculoDetailPanel } from "./vehiculos/VehiculoDetailPanel";
import { VehiculoFormModal } from "./vehiculos/VehiculoFormModal";
import { VehiculoMasterList } from "./vehiculos/VehiculoMasterList";

export type { VehiculoFormData, OwnerDetails, OrdenVehiculoResumen };

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

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
	const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(
		null,
	);

	const [formModalState, setFormModalState] = useState<{
		isOpen: boolean;
		mode: "create" | "edit";
		initialData?: Partial<VehiculoFormData>;
		vehiculoToEdit?: Vehiculo;
	}>({ isOpen: false, mode: "create" });

	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete" | "error";
		onConfirm?: () => void;
	}>({ isOpen: false, title: "", message: "", type: "success" });

	const notify = useCallback(
		(
			title: string,
			message: string,
			type: "success" | "alert" | "delete" | "error",
			onConfirm?: () => void,
		) => {
			setAlertConfig({ isOpen: true, title, message, type, onConfirm });
		},
		[],
	);

	const createVehiculoMut = useMutation(api.vehiculos.createVehiculo);
	const updateVehiculoMut = useMutation(api.vehiculos.updateVehiculo);
	const deleteVehiculoMut = useMutation(api.vehiculos.deleteVehiculo);
	const createOrdenTrabajoMut = useMutation(api.ordenes.createOrdenTrabajo);

	const {
		vehiculos,
		clientes,
		empresas,
		categoriasPrecios,
		isLoading,
		ordenesVehiculo,
	} = useVehiculosData(currentUser, selectedVehiculoId);

	const { addHistoryService, editHistoryService, deleteHistoryService } =
		useVehiculoServicios({
			usuarioId: currentUser?.id,
			onNotify: notify,
		});

	const getOwnerDetails = useCallback(
		(veh: Vehiculo): OwnerDetails => {
			if (veh.propietarioTipo === "cliente") {
				const cli = clientes.find((c) => c.id === veh.propietarioId);
				return {
					nombre: cli ? cli.nombre : "Cliente Desconocido",
					telefono: cli ? cli.telefono : "",
					tipo: "Cliente Particular",
				};
			}
			const emp = empresas.find((e) => e.id === veh.propietarioId);
			return {
				nombre: emp ? emp.nombre : "Empresa Desconocida",
				telefono: emp ? emp.contactoTelefono : "",
				tipo: "Flota Comercial",
			};
		},
		[clientes, empresas],
	);

	const filteredVehiculos = useMemo(() => {
		return vehiculos.filter((v) => {
			const term = searchTerm.toLowerCase();
			const owner = getOwnerDetails(v);
			const matchesSearch =
				v.placa.toLowerCase().includes(term) ||
				v.marca.toLowerCase().includes(term) ||
				v.modelo.toLowerCase().includes(term) ||
				owner.nombre.toLowerCase().includes(term);
			return (
				matchesSearch &&
				(selectedCategory === "Todos" || v.categoria === selectedCategory)
			);
		});
	}, [vehiculos, searchTerm, selectedCategory, getOwnerDetails]);

	const activeVehiculoId = filteredVehiculos.find(
		(v) => v.id === selectedVehiculoId,
	)
		? selectedVehiculoId
		: filteredVehiculos.length > 0
			? filteredVehiculos[0].id
			: null;

	const selectedVehiculo = vehiculos.find((v) => v.id === activeVehiculoId);

	useEffect(() => {
		if (
			selectedCategory !== "Todos" &&
			!categoriasPrecios.includes(selectedCategory)
		) {
			setSelectedCategory("Todos");
		}
	}, [categoriasPrecios, selectedCategory]);

	useEffect(() => {
		if (preselectedVehicleId) {
			setSelectedVehiculoId(preselectedVehicleId);
			if (vehiculos.some((v) => v.id === preselectedVehicleId)) {
				setSelectedCategory("Todos");
			}
			clearPreselectedVehicle?.();
		}
	}, [preselectedVehicleId, vehiculos, clearPreselectedVehicle]);

	const handleOpenCreate = () => {
		setFormModalState({
			isOpen: true,
			mode: "create",
			initialData: {
				placa: "",
				categoria: categoriasPrecios[0] || "Bus Urbano",
				marca: "",
				modelo: "",
				anio: "",
				numeroSerie: "",
				propietarioTipo: "cliente",
				propietarioId: clientes[0]?.id || "",
				estado: "Activo",
			},
		});
	};

	const handleOpenEdit = (veh: Vehiculo) => {
		setFormModalState({
			isOpen: true,
			mode: "edit",
			vehiculoToEdit: veh,
			initialData: {
				placa: veh.placa,
				categoria: veh.categoria,
				marca: veh.marca,
				modelo: veh.modelo,
				anio: veh.año,
				numeroSerie: veh.numeroSerie,
				propietarioTipo: veh.propietarioTipo,
				propietarioId: veh.propietarioId,
				estado: veh.estado,
			},
		});
	};

	const handleFormSubmit = async (data: VehiculoFormData) => {
		if (!currentUser) return;
		const isEdit = formModalState.mode === "edit";
		const vehToEdit = formModalState.vehiculoToEdit;

		if (
			vehiculos.some(
				(v) =>
					v.placa.toUpperCase() === data.placa.toUpperCase() &&
					(!isEdit || v.id !== vehToEdit?.id),
			)
		) {
			notify(
				"Error de Validación",
				`La placa "${data.placa}" ya se encuentra registrada en otro vehículo.`,
				"error",
			);
			return;
		}

		try {
			if (isEdit && vehToEdit) {
				await updateVehiculoMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					vehiculoId: vehToEdit.id as Id<"vehiculos">,
					placa: data.placa,
					categoria: data.categoria,
					marca: data.marca,
					modelo: data.modelo,
					anio: data.anio,
					numeroSerie: data.numeroSerie || "",
					propietarioId: data.propietarioId,
					propietarioTipo: data.propietarioTipo,
					estado: data.estado,
				});
				setFormModalState({ isOpen: false, mode: "edit" });
				notify(
					"Vehículo Actualizado",
					`Los datos del vehículo "${data.placa}" se guardaron correctamente.`,
					"success",
				);
			} else {
				const newVeh = await createVehiculoMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					placa: data.placa,
					categoria: data.categoria,
					marca: data.marca,
					modelo: data.modelo,
					anio: data.anio,
					numeroSerie: data.numeroSerie || "",
					propietarioId: data.propietarioId,
					propietarioTipo: data.propietarioTipo,
					estado: data.estado,
				});
				setFormModalState({ isOpen: false, mode: "create" });
				if (newVeh) setSelectedVehiculoId(newVeh._id);

				useNotificationStore.getState().addNotification({
					title: "Vehículo Registrado",
					message: `El vehículo "${data.marca} ${data.modelo}" (${data.placa}) se registró exitosamente.`,
					type: "success",
					linkTab: "vehiculos",
				});

				notify(
					"Vehículo Añadido",
					`El vehículo con placa "${data.placa}" se registró exitosamente.`,
					"success",
				);
			}
		} catch (error: unknown) {
			notify(
				"Error",
				error instanceof Error
					? error.message
					: "No se pudo procesar la solicitud",
				"error",
			);
		}
	};

	const handleDeleteClick = (veh: Vehiculo) => {
		notify(
			"¿Eliminar Vehículo?",
			`¿Estás seguro de eliminar el vehículo "${veh.placa}"? Esta acción borrará también todo su historial de rotulados y servicios.`,
			"delete",
			async () => {
				if (!currentUser) return;
				await deleteVehiculoMut({
					usuarioId: currentUser.id as Id<"usuarios">,
					vehiculoId: veh.id as Id<"vehiculos">,
				});
				const remaining = vehiculos.filter((v) => v.id !== veh.id);
				setSelectedVehiculoId(remaining.length > 0 ? remaining[0].id : null);
				notify(
					"Vehículo Eliminado",
					"El vehículo ha sido eliminado satisfactoriamente.",
					"success",
				);
			},
		);
	};

	const handleSelectServiceFlow = async (flowType: "cotizacion" | "orden") => {
		if (!selectedVehiculo) return;
		const owner = getOwnerDetails(selectedVehiculo);

		if (flowType === "cotizacion") {
			sessionStorage.setItem("prefilled_placa", selectedVehiculo.placa);
			sessionStorage.setItem("prefilled_clienteNombre", owner.nombre);
			sessionStorage.setItem("prefilled_clienteTelefono", owner.telefono);
			sessionStorage.setItem(
				"prefilled_vehiculoTipo",
				selectedVehiculo.categoria,
			);
			onNavigate("cotizaciones");
		} else {
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

			useNotificationStore.getState().addNotification({
				title: "Orden de Trabajo Creada",
				message: `Se inició la orden de trabajo para "${owner.nombre}" (${selectedVehiculo.placa}).`,
				type: "success",
				linkTab: "ordenes",
			});

			if (onSelectOrder) {
				onSelectOrder(newOrd?._id as string);
			} else {
				onNavigate("ordenes");
			}
		}
	};

	if (isLoading) return <TableSkeleton />;

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
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 sm:py-2.5 text-[16px] sm:text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					Registrar Vehículo
				</button>
			</div>

			{/* Main split grid */}
			<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
				<div className="lg:col-span-1">
					<VehiculoMasterList
						vehiculos={filteredVehiculos}
						selectedVehiculoId={activeVehiculoId}
						onSelectVehiculo={(id) => setSelectedVehiculoId(id)}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						categories={categoriasPrecios}
						selectedCategory={selectedCategory}
						onSelectCategory={setSelectedCategory}
						getOwnerName={(veh) => getOwnerDetails(veh).nombre}
					/>
				</div>

				<div className="lg:col-span-2">
					<VehiculoDetailPanel
						vehiculo={selectedVehiculo ?? null}
						ownerDetails={
							selectedVehiculo
								? getOwnerDetails(selectedVehiculo)
								: { nombre: "", telefono: "", tipo: "" }
						}
						ordenesVehiculo={ordenesVehiculo}
						onOpenEdit={handleOpenEdit}
						onDeleteVehiculo={handleDeleteClick}
						onSelectServiceFlow={handleSelectServiceFlow}
						onAddHistoryService={(srv) =>
							addHistoryService(selectedVehiculo, srv)
						}
						onEditHistoryService={(srvId, srv) =>
							editHistoryService(selectedVehiculo, srvId, srv)
						}
						onDeleteHistoryService={(srvId) =>
							deleteHistoryService(selectedVehiculo, srvId)
						}
					/>
				</div>
			</div>

			<VehiculoFormModal
				isOpen={formModalState.isOpen}
				mode={formModalState.mode}
				initialData={formModalState.initialData}
				categorias={categoriasPrecios}
				clientes={clientes}
				empresas={empresas}
				onClose={() =>
					setFormModalState((prev) => ({ ...prev, isOpen: false }))
				}
				onSubmit={handleFormSubmit}
			/>

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
