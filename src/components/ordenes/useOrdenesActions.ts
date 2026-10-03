import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionUser } from "../../store/useSessionStore";
import type { OrderCreateFormData } from "./OrderCreateModal";
import type { OrdenTrabajo } from "./types";

interface UseOrdenesActionsProps {
	currentUser: SessionUser | null;
	ordenesTrabajo?: OrdenTrabajo[];
	selectedOrder?: OrdenTrabajo;
	onOrderCreated?: (newOrderId: string) => void;
	onOrderDeleted?: (remainingOrderId: string | null) => void;
	notify: (
		title: string,
		message: string,
		type?: "success" | "alert" | "delete",
		onConfirm?: () => void,
	) => void;
}

export function useOrdenesActions({
	currentUser,
	ordenesTrabajo,
	selectedOrder,
	onOrderCreated,
	onOrderDeleted,
	notify,
}: UseOrdenesActionsProps) {
	const usuarioId = currentUser?.id;

	const createOrdenMut = useMutation(api.ordenes.createOrdenTrabajo);
	const updateOrdenMut = useMutation(api.ordenes.updateOrdenTrabajo);
	const deleteOrdenMut = useMutation(api.ordenes.deleteOrdenTrabajo);
	const toggleItemMut = useMutation(
		api.ordenes.toggleItemCompletado,
	).withOptimisticUpdate((localStore, args) => {
		const current = localStore.getQuery(api.ordenes.fetchOrdenes, {
			usuarioId: args.usuarioId,
		});
		if (current === undefined) return;
		const updated = current.map((orden) => {
			if (orden._id !== args.ordenId) return orden;
			const items = orden.items.map((item, idx) =>
				idx === args.itemIndex
					? { ...item, completado: args.completado }
					: item,
			);
			const total = items.reduce(
				(acc, item) => acc + item.cantidad * item.precioUnitario,
				0,
			);
			const progreso =
				items.length > 0
					? Math.round(
							(items.filter((i) => i.completado).length / items.length) * 100,
						)
					: 0;
			return { ...orden, items, total, progreso };
		});
		localStore.setQuery(
			api.ordenes.fetchOrdenes,
			{ usuarioId: args.usuarioId },
			updated,
		);
	});

	const handleCreateOrder = async (data: OrderCreateFormData) => {
		if (!usuarioId) return;
		try {
			const newOrd = (await createOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				clienteNombre: data.clienteNombre,
				clienteTelefono: data.clienteTelefono,
				placa: data.placa,
				vehiculoTipo: data.vehiculoTipo,
				items: data.items,
				prioridad: data.prioridad,
				estado: "Pendiente",
				fechaInicio: new Date().toISOString().split("T")[0],
				fechaFin: data.fechaFin,
				notas: ["Orden de trabajo iniciada."],
				fotos: [],
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as Id<"sucursales">)
					: undefined,
				pvOrigen: currentUser?.pvId ?? undefined,
			})) as unknown as { _id: string };

			onOrderCreated?.(newOrd._id);
			notify(
				"Orden Iniciada",
				`La orden de trabajo "${newOrd._id}" ha sido creada exitosamente.`,
				"success",
			);
		} catch (err) {
			notify(
				"Error al iniciar la orden",
				err instanceof Error ? err.message : "Error desconocido",
				"alert",
			);
		}
	};

	const handleToggleTask = async (itemIdx: number) => {
		if (!selectedOrder || !usuarioId) return;
		const item = selectedOrder.items[itemIdx];
		if (!item) return;
		try {
			await toggleItemMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				itemIndex: itemIdx,
				completado: !item.completado,
			});
		} catch (err) {
			notify(
				"Error al actualizar",
				err instanceof Error ? err.message : "Error desconocido",
				"alert",
			);
		}
	};

	const handleStatusChange = async (newStatus: OrdenTrabajo["estado"]) => {
		if (!selectedOrder || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				estado: newStatus,
				notas: [
					...(selectedOrder.notas || []),
					`Estado cambiado a: ${newStatus}.`,
				],
			});
		} catch (err) {
			notify(
				"Error al cambiar estado",
				err instanceof Error ? err.message : "Error desconocido",
				"alert",
			);
		}
	};

	const handleDeleteOrderClick = (ord: OrdenTrabajo) => {
		notify(
			"¿Eliminar Orden de Trabajo?",
			`¿Estás seguro de que deseas eliminar la orden "${ord._id}"? Esta acción removerá el registro del panel de control permanentemente.`,
			"delete",
			async () => {
				if (!usuarioId) return;
				try {
					await deleteOrdenMut({
						usuarioId: usuarioId as Id<"usuarios">,
						ordenId: ord._id as Id<"ordenesTrabajo">,
					});
					const remaining = (ordenesTrabajo ?? []).filter(
						(o) => o._id !== ord._id,
					);
					onOrderDeleted?.(remaining.length > 0 ? remaining[0]._id : null);
					notify(
						"Orden Eliminada",
						"La orden fue removida del historial.",
						"success",
					);
				} catch (err) {
					notify(
						"Error al eliminar",
						err instanceof Error ? err.message : "Error desconocido",
						"alert",
					);
				}
			},
		);
	};

	const handleSaveSpecifications = async (specs: {
		placa: string;
		prioridad: OrdenTrabajo["prioridad"];
		fechaFin: string;
	}) => {
		if (!selectedOrder || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				placa: specs.placa,
				prioridad: specs.prioridad,
				fechaFin: specs.fechaFin,
				notas: [
					...(selectedOrder.notas || []),
					"Se actualizaron los datos principales de la orden.",
				],
			});
			notify(
				"Cambios Guardados",
				"Los cambios a las especificaciones se guardaron correctamente.",
				"success",
			);
		} catch (err) {
			notify(
				"Error al guardar",
				err instanceof Error ? err.message : "Error desconocido",
				"alert",
			);
		}
	};

	const handleAddNote = async (note: string) => {
		if (!selectedOrder || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				notas: [...(selectedOrder.notas || []), note],
			});
		} catch (err) {
			notify(
				"Error al añadir nota",
				err instanceof Error ? err.message : "Error desconocido",
				"alert",
			);
		}
	};

	return {
		updateOrdenMut,
		handleCreateOrder,
		handleToggleTask,
		handleStatusChange,
		handleDeleteOrderClick,
		handleSaveSpecifications,
		handleAddNote,
	};
}
