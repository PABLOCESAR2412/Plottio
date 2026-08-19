import { useQuery } from "convex/react";
import {
	Activity,
	CalendarDays,
	Clock,
	FileText,
	Filter,
	Search,
	Server,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";

type AuditLog = {
	_id: string;
	fecha: string;
	tablaAfectada: string;
	accion: string;
	registroId: string;
	cambios?: unknown;
	sucursalId?: string | null;
	usuarioNombre: string;
};

export function AuditoriaView() {
	const currentUser = useSessionStore((s) => s.currentUser);

	const [desde, setDesde] = useState("");
	const [hasta, setHasta] = useState("");
	const [tabla, setTabla] = useState("");
	const [usuario, setUsuario] = useState("");
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const filtros = useMemo(
		() => ({
			desde: desde || undefined,
			hasta: hasta || undefined,
			tabla: tabla || undefined,
			usuario: usuario || undefined,
		}),
		[desde, hasta, tabla, usuario],
	);

	const logs = useQuery(
		api.auditoria.getAuditoria,
		currentUser
			? {
					usuarioId: currentUser.id as Id<"usuarios">,
					filtros: filtros.usuario ? filtros : undefined,
				}
			: "skip",
	) as AuditLog[] | undefined;

	const tablasDisponibles = useMemo(
		() => Array.from(new Set((logs ?? []).map((l) => l.tablaAfectada))).sort(),
		[logs],
	);


	const tieneFiltros = Boolean(desde || hasta || tabla || usuario);

	const limpiarFiltros = () => {
		setDesde("");
		setHasta("");
		setTabla("");
		setUsuario("");
	if (logs === undefined) {
		return <TableSkeleton />;
	}

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<Activity className="w-6 h-6 text-primary" />
						Registro de Actividades
					</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Auditoría del sistema y control de cambios (Fase 1).
					</p>
				</div>
			</div>

			<div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
				<div className="p-4 border-b border-border flex flex-col gap-3">
					<div className="flex flex-col sm:flex-row gap-2">
						<div className="relative flex-1">
							<Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								placeholder="Buscar por usuario..."
								value={usuario}
								onChange={(e) => setUsuario(e.target.value)}
								className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-foreground text-sm"
							/>
						</div>
						<div className="flex-1">
							<select
								value={tabla}
								onChange={(e) => setTabla(e.target.value)}
								className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-foreground text-sm"
							>
								<option value="">Todos los módulos</option>
								{tablasDisponibles.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row items-end gap-2">
						<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground flex-1">
							<span className="flex items-center gap-1">
								<CalendarDays className="h-3 w-3" /> Desde
							</span>
							<input
								type="date"
								value={desde}
								onChange={(e) => setDesde(e.target.value)}
								className="w-full px-3 py-1.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground text-sm"
							/>
						</label>
						<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground flex-1">
							<span className="flex items-center gap-1">
								<CalendarDays className="h-3 w-3" /> Hasta
							</span>
							<input
								type="date"
								value={hasta}
								onChange={(e) => setHasta(e.target.value)}
								className="w-full px-3 py-1.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground text-sm"
							/>
						</label>
						{tieneFiltros && (
							<button
								type="button"
								onClick={limpiarFiltros}
								className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium"
							>
								<Filter className="h-4 w-4" /> Limpiar
							</button>
						)}
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-foreground">
						<thead className="text-xs uppercase bg-muted text-muted-foreground">
							<tr>
								<th className="px-6 py-4 font-medium">Fecha</th>
								<th className="px-6 py-4 font-medium">Módulo</th>
								<th className="px-6 py-4 font-medium">Acción</th>
								<th className="px-6 py-4 font-medium">Usuario</th>
								<th className="px-6 py-4 font-medium">Registro ID</th>
								<th className="px-6 py-4 font-medium">Cambios</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{logs.map((log) => (
								<>
									<tr
										key={log._id}
										className="hover:bg-muted/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Clock className="w-4 h-4" />
												{new Date(log.fecha).toLocaleString()}
											</div>
										</td>
										<td className="px-6 py-4">
											<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
												<Server className="w-3 h-3" />
												{log.tablaAfectada}
											</span>
										</td>
										<td className="px-6 py-4 font-medium">{log.accion}</td>
										<td className="px-6 py-4">
											<span className="inline-flex items-center gap-1.5 text-muted-foreground">
												<User className="w-3.5 h-3.5" />
												{log.usuarioNombre}
											</span>
										</td>
										<td className="px-6 py-4 font-mono text-xs text-muted-foreground">
											{log.registroId}
										</td>
										<td className="px-6 py-4">
											<button
												type="button"
												onClick={() =>
													setExpandedId(expandedId === log._id ? null : log._id)
												}
												className="text-primary hover:underline text-xs flex items-center gap-1 cursor-pointer"
											>
												<FileText className="w-3 h-3" /> Ver Detalle
											</button>
										</td>
									</tr>
									{expandedId === log._id && (
										<tr key={`${log._id}-detail`}>
											<td colSpan={6} className="px-6 py-3 bg-secondary/20">
												<pre className="whitespace-pre-wrap text-xs text-foreground break-words font-mono max-h-48 overflow-y-auto">
													{JSON.stringify(log.cambios ?? {}, null, 2)}
												</pre>
											</td>
										</tr>
									)}
								</>
							))}
							{logs.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-8 text-center text-muted-foreground"
									>
										No hay registros de auditoría disponibles.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
