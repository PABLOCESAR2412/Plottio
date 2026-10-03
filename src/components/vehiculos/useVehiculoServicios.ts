import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Vehiculo } from "./types";

interface UseVehiculoServiciosProps {
	usuarioId?: string;
	onNotify: (
		title: string,
		message: string,
		type: "success" | "alert" | "delete" | "error",
		onConfirm?: () => void,
	) => void;
}

export function useVehiculoServicios({
	usuarioId,
	onNotify,
}: UseVehiculoServiciosProps) {
	const addServicioVehiculoMut = useMutation(api.vehiculos.addServicioVehiculo);
	const updateServicioVehiculoMut = useMutation(
		api.vehiculos.updateServicioVehiculo,
	);
	const deleteServicioVehiculoMut = useMutation(
		api.vehiculos.deleteServicioVehiculo,
	);

	const addHistoryService = async (
		vehiculo: Vehiculo | null | undefined,
		srv: { descripcion: string; costo: number; fecha: string; estado: string },
	) => {
		if (!vehiculo || !usuarioId) return;
		await addServicioVehiculoMut({
			usuarioId: usuarioId as Id<"usuarios">,
			vehiculoId: vehiculo.id as Id<"vehiculos">,
			descripcion: srv.descripcion,
			costo: srv.costo,
			fecha: srv.fecha,
			estado: srv.estado,
		});

		onNotify(
			"Servicio Guardado",
			"El servicio histórico ha sido registrado en la cronología del vehículo.",
			"success",
		);
	};

	const editHistoryService = async (
		vehiculo: Vehiculo | null | undefined,
		srvId: string,
		srv: { descripcion: string; costo: number; fecha: string; estado: string },
	) => {
		if (!vehiculo || !usuarioId) return;
		await updateServicioVehiculoMut({
			usuarioId: usuarioId as Id<"usuarios">,
			vehiculoId: vehiculo.id as Id<"vehiculos">,
			servicioId: srvId,
			descripcion: srv.descripcion,
			costo: srv.costo,
			fecha: srv.fecha,
			estado: srv.estado,
		});

		onNotify(
			"Servicio Modificado",
			"Se actualizaron los datos del servicio histórico.",
			"success",
		);
	};

	const deleteHistoryService = (
		vehiculo: Vehiculo | null | undefined,
		srvId: string,
	) => {
		if (!vehiculo) return;
		onNotify(
			"¿Eliminar Historial de Servicio?",
			"¿Deseas remover este registro de servicio histórico? Esta acción afectará la inversión acumulada del vehículo.",
			"delete",
			async () => {
				if (!usuarioId) return;
				await deleteServicioVehiculoMut({
					usuarioId: usuarioId as Id<"usuarios">,
					vehiculoId: vehiculo.id as Id<"vehiculos">,
					servicioId: srvId,
				});
				onNotify(
					"Servicio Removido",
					"Se ha eliminado la entrada del historial.",
					"success",
				);
			},
		);
	};

	return {
		addHistoryService,
		editHistoryService,
		deleteHistoryService,
	};
}
