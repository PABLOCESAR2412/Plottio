import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionUser } from "../../store/useSessionStore";
import type { Cliente, Empresa, Vehiculo } from "../../types/data";
import type { OrdenVehiculoResumen } from "./types";

export function useVehiculosData(
	currentUser: SessionUser | null,
	selectedVehiculoId: string | null,
) {
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

	const vehiculos = useMemo(
		() =>
			(rawVehiculos || []).map((v) => ({
				...v,
				id: v._id,
				año: v.anio,
				servicios: v.servicios || [],
			})) as Vehiculo[],
		[rawVehiculos],
	);

	const clientes = useMemo(
		() =>
			(rawClientes || []).map((c) => ({
				...c,
				id: c._id,
				createdAt: new Date(c._creationTime).toLocaleDateString(),
			})) as Cliente[],
		[rawClientes],
	);

	const empresas = useMemo(
		() =>
			(rawEmpresas || []).map((e) => ({
				...e,
				id: e._id,
				contactoTelefono: e.telefono || "",
			})) as Array<
				Pick<Empresa, "id" | "nombre"> & { contactoTelefono: string }
			>,
		[rawEmpresas],
	);

	const todasOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		currentUser && selectedVehiculoId
			? { usuarioId: currentUser.id as Id<"usuarios"> }
			: "skip",
	);

	const ordenesVehiculo: OrdenVehiculoResumen[] = useMemo(() => {
		const placaActiva = vehiculos.find(
			(v) => v.id === selectedVehiculoId,
		)?.placa;
		return (todasOrdenes || [])
			.filter(
				(o) =>
					o.placa &&
					placaActiva &&
					o.placa.toUpperCase() === placaActiva.toUpperCase(),
			)
			.map((o) => ({
				_id: o._id,
				fechaInicio: o.fechaInicio,
				estado: o.estado,
				items: (o.items || []).map((it) => ({
					descripcion: it.descripcion,
					cantidad: it.cantidad,
				})),
			}));
	}, [todasOrdenes, vehiculos, selectedVehiculoId]);

	return {
		vehiculos,
		clientes,
		empresas,
		categoriasPrecios,
		ordenesVehiculo,
		isLoading:
			rawVehiculos === undefined ||
			rawClientes === undefined ||
			rawEmpresas === undefined,
	};
}
