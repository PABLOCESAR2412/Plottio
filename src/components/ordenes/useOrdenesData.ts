import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { SessionUser } from "../../store/useSessionStore";
import type { CatalogoServicioOption } from "./OrderDetailPanel";
import type {
	ClienteOption,
	EmpresaOption,
	OrdenTrabajo,
	VehiculoOption,
} from "./types";

export function useOrdenesData(currentUser: SessionUser | null) {
	const usuarioId = currentUser?.id;

	const ordenesTrabajo = useQuery(
		api.ordenes.fetchOrdenes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Doc<"clientes">[] | undefined;
	const rawEmpresas = useQuery(api.organizacion.getEmpresas, {}) as
		| Doc<"empresas">[]
		| undefined;
	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Doc<"vehiculos">[] | undefined;
	const rawCategorias = useQuery(
		api.plantillas.getCategorias,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<{ _id: string; nombre: string }> | undefined;
	const rawCatalogo = useQuery(
		api.catalogoServicios.getServicios,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as
		| Array<{
				_id: string;
				nombre: string;
				categoria: string;
				precio?: number;
				precioBase?: number;
		  }>
		| undefined;

	const clientes: ClienteOption[] = useMemo(
		() =>
			(rawClientes ?? []).map((c) => ({
				id: c._id,
				nombre: c.nombre ?? "",
				telefono: c.telefono ?? "",
				email: c.email ?? "",
				empresaId: c.empresaId ?? null,
				direccion: c.direccion,
			})),
		[rawClientes],
	);

	const empresas: EmpresaOption[] = useMemo(
		() =>
			(rawEmpresas ?? []).map((e) => ({
				id: e._id,
				nombre: e.nombre ?? "",
				ruc: e.ruc ?? "",
				direccion: e.direccion,
			})),
		[rawEmpresas],
	);

	const vehiculos: VehiculoOption[] = useMemo(
		() =>
			(rawVehiculos ?? []).map((v) => ({
				id: v._id,
				placa: v.placa ?? "",
				categoria: v.categoria ?? "",
				marca: v.marca ?? "",
				modelo: v.modelo ?? "",
				año: v.anio ?? "",
				anio: v.anio ?? "",
				numeroSerie: v.numeroSerie ?? "",
			})),
		[rawVehiculos],
	);

	const categoriasPrecios: string[] = useMemo(
		() => (rawCategorias ?? []).map((c) => c.nombre),
		[rawCategorias],
	);

	const catalogoServicios: CatalogoServicioOption[] = useMemo(
		() =>
			(rawCatalogo ?? []).map((s) => ({
				_id: s._id,
				nombre: s.nombre,
				categoria: s.categoria,
				precio: s.precio,
				precioBase: s.precioBase,
			})),
		[rawCatalogo],
	);

	return {
		ordenesTrabajo: ordenesTrabajo as OrdenTrabajo[] | undefined,
		clientes,
		empresas,
		vehiculos,
		categoriasPrecios,
		catalogoServicios,
		isLoading: ordenesTrabajo === undefined,
	};
}
