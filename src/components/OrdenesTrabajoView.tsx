import { Plus } from "lucide-react";
import type React from "react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import {
	type OrderCreateFormData,
	OrderCreateModal,
} from "./ordenes/OrderCreateModal";
import { OrderDetailPanel } from "./ordenes/OrderDetailPanel";
import { OrderMasterList } from "./ordenes/OrderMasterList";
import type {
	ClienteOption,
	EmpresaOption,
	ItemOrdenTrabajo,
	OrdenTrabajo,
	OrderStatusTab,
	VehiculoOption,
} from "./ordenes/types";
import { useOrdenesActions } from "./ordenes/useOrdenesActions";
import { useOrdenesData } from "./ordenes/useOrdenesData";
import { useOrderPhotoUpload } from "./ordenes/useOrderPhotoUpload";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

export type {
	ClienteOption,
	EmpresaOption,
	VehiculoOption,
	ItemOrdenTrabajo,
	OrdenTrabajo,
	OrderStatusTab,
};

interface OrdenesTrabajoViewProps {
	preselectedOrderId?: string | null;
	clearPreselectedOrder?: () => void;
}

export const OrdenesTrabajoView: React.FC<OrdenesTrabajoViewProps> = ({
	preselectedOrderId,
	clearPreselectedOrder,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const usuarioId = currentUser?.id;

	const {
		ordenesTrabajo,
		clientes,
		empresas,
		vehiculos,
		categoriasPrecios,
		catalogoServicios,
		isLoading,
	} = useOrdenesData(currentUser);

	const [searchTerm, setSearchTerm] = useState("");
	const deferredSearchTerm = useDeferredValue(searchTerm);
	const [selectedStatusTab, setSelectedStatusTab] =
		useState<OrderStatusTab>("Todos");
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
		ordenesTrabajo && ordenesTrabajo.length > 0 ? ordenesTrabajo[0]._id : null,
	);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [createInitialData, setCreateInitialData] = useState<
		Partial<OrderCreateFormData>
	>({});

	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete";
		onConfirm?: () => void;
	}>({ isOpen: false, title: "", message: "", type: "success" });

	const notify = useCallback(
		(
			title: string,
			message: string,
			type: "success" | "alert" | "delete" = "success",
			onConfirm?: () => void,
		) => setAlertConfig({ isOpen: true, title, message, type, onConfirm }),
		[],
	);

	const filteredOrders = useMemo(() => {
		return (ordenesTrabajo ?? []).filter((o) => {
			const term = deferredSearchTerm.toLowerCase();
			const matchesSearch =
				o._id.toLowerCase().includes(term) ||
				o.clienteNombre.toLowerCase().includes(term) ||
				o.placa.toLowerCase().includes(term);
			return (
				matchesSearch &&
				(selectedStatusTab === "Todos" || o.estado === selectedStatusTab)
			);
		});
	}, [ordenesTrabajo, deferredSearchTerm, selectedStatusTab]);

	const activeOrderId = filteredOrders.find((o) => o._id === selectedOrderId)
		? selectedOrderId
		: filteredOrders.length > 0
			? filteredOrders[0]._id
			: null;

	const selectedOrder = (ordenesTrabajo ?? []).find(
		(o) => o._id === activeOrderId,
	) as OrdenTrabajo | undefined;

	const { isUploading, uploadPhoto } = useOrderPhotoUpload({
		usuarioId,
		onSuccess: (msg) => notify("Imagen Registrada", msg, "success"),
		onError: (msg) => notify("Error al subir foto", msg, "alert"),
	});

	const {
		updateOrdenMut,
		handleCreateOrder,
		handleToggleTask,
		handleStatusChange,
		handleDeleteOrderClick,
		handleSaveSpecifications,
		handleAddNote,
	} = useOrdenesActions({
		currentUser,
		ordenesTrabajo,
		selectedOrder,
		onOrderCreated: (newId) => {
			setIsCreateOpen(false);
			setSelectedOrderId(newId);
		},
		onOrderDeleted: (remainingId) => setSelectedOrderId(remainingId),
		notify,
	});

	useEffect(() => {
		if (preselectedOrderId) {
			setSelectedOrderId(preselectedOrderId);
			setSelectedStatusTab("Todos");
			clearPreselectedOrder?.();
		}
	}, [preselectedOrderId, clearPreselectedOrder]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const pPlaca = sessionStorage.getItem("prefilled_placa");
		const pCliente = sessionStorage.getItem("prefilled_clienteNombre");
		const pTelefono = sessionStorage.getItem("prefilled_clienteTelefono");
		const pVehTipo = sessionStorage.getItem("prefilled_vehiculoTipo");

		if (pPlaca || pCliente || pTelefono || pVehTipo) {
			setCreateInitialData({
				placa: pPlaca || "",
				clienteNombre: pCliente || "",
				clienteTelefono: pTelefono || "",
				vehiculoTipo: pVehTipo || categoriasPrecios[0] || "Bus Urbano",
			});
			for (const k of [
				"prefilled_placa",
				"prefilled_clienteNombre",
				"prefilled_clienteTelefono",
				"prefilled_vehiculoTipo",
			]) {
				sessionStorage.removeItem(k);
			}
			setIsCreateOpen(true);
			notify(
				"Orden Pre-cargada",
				"Se autocompletaron los datos del vehículo para la orden de trabajo.",
				"success",
			);
		}
	}, [categoriasPrecios, notify]);

	const handleOpenCreate = () => {
		setCreateInitialData({
			clienteNombre: "",
			clienteTelefono: "",
			placa: "",
			vehiculoTipo: categoriasPrecios[0] || "Bus Urbano",
			prioridad: "Media",
			fechaFin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			items: [],
		});
		setIsCreateOpen(true);
	};

	const handleAddTask = async (
		task: { descripcion: string; cantidad: number; precioUnitario: number },
		form?: HTMLFormElement,
	) => {
		if (!selectedOrder || !usuarioId) return;
		const updatedItems = [
			...selectedOrder.items,
			{
				descripcion: task.descripcion,
				cantidad: task.cantidad,
				precioUnitario: task.precioUnitario,
				completado: false,
			},
		];
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				items: updatedItems,
			});
			if (form) form.reset();
		} catch (err) {
			toast.error("Error al actualizar la orden", {
				description: (err as Error).message,
			});
		}
	};

	const handleRemoveTask = async (idx: number) => {
		if (!selectedOrder || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				items: selectedOrder.items.filter((_, i) => i !== idx),
			});
		} catch (err) {
			toast.error("Error al actualizar la orden", {
				description: (err as Error).message,
			});
		}
	};

	if (isLoading) return <TableSkeleton />;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Órdenes de Trabajo
					</h1>
					<p className="text-muted-foreground">
						Monitorea el progreso de stickers y rotulado de vehículos en el
						taller.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 sm:py-2.5 text-[16px] sm:text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					Nueva Orden de Trabajo
				</button>
			</div>

			<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
				<div className="lg:col-span-1">
					<OrderMasterList
						orders={filteredOrders as OrdenTrabajo[]}
						selectedOrderId={activeOrderId}
						onSelectOrder={(id) => setSelectedOrderId(id)}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						selectedStatusTab={selectedStatusTab}
						onStatusTabChange={setSelectedStatusTab}
					/>
				</div>

				<div className="lg:col-span-2">
					<OrderDetailPanel
						order={selectedOrder ?? null}
						vehiculos={vehiculos}
						clientes={clientes}
						empresas={empresas}
						catalogoServicios={catalogoServicios}
						onToggleTask={handleToggleTask}
						onAddTask={handleAddTask}
						onRemoveTask={handleRemoveTask}
						onStatusChange={handleStatusChange}
						onDeleteOrder={handleDeleteOrderClick}
						onSaveSpecifications={handleSaveSpecifications}
						onAddNote={handleAddNote}
						onAddPhoto={(file) =>
							selectedOrder && uploadPhoto(selectedOrder._id, file)
						}
						isUploadingPhoto={isUploading}
					/>
				</div>
			</div>

			<OrderCreateModal
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				onSubmit={handleCreateOrder}
				clientes={clientes}
				categoriasPrecios={categoriasPrecios}
				initialData={createInitialData}
			/>

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
