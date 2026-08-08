import {
	Building2,
	ChevronRight,
	Edit2,
	MapPin,
	Plus,
	Trash2,
	X,
	Network,
	Store,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "../store/useAppStore";
import { SuccessDialog } from "./SuccessDialog";

export const SucursalSelector: React.FC = () => {
	const { sucursales, currentUser, setCurrentUser } = useAppStore();

	if (!currentUser || currentUser.rol !== "SuperAdmin") return null;

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-muted-foreground">
				Filtrar vista global:
			</span>
			<select
				value={currentUser.sucursalId || "todas"}
				onChange={(e) =>
					setCurrentUser({
						...currentUser,
						sucursalId: e.target.value === "todas" ? undefined : e.target.value,
					} as any)
				}
				className="bg-background border border-border text-foreground text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
			>
				<option value="todas">Todas las Sucursales</option>
				{sucursales.map((s) => (
					<option key={s.id} value={s.id}>
						{s.nombre} {s.esMatriz ? "(Matriz)" : ""}
					</option>
				))}
			</select>
		</div>
	);
};

export const SucursalBadge: React.FC = () => {
	const { currentUser, sucursales } = useAppStore();
	if (!currentUser) return null;

	const sucursal = sucursales.find((s) => s.id === currentUser.sucursalId);
	const nombre = sucursal
		? `${sucursal.nombre} - ${sucursal.direccion}`
		: "Global (Todas las Sucursales)";

	return (
		<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold max-w-[200px] sm:max-w-xs md:max-w-md truncate">
			<MapPin className="h-3 w-3 shrink-0" />
			<span className="truncate">{nombre}</span>
		</span>
	);
};

export const BreadcrumbNavegacion: React.FC<{ tabName: string }> = ({
	tabName,
}) => {
	return (
		<nav className="flex items-center text-sm font-medium text-foreground">
			<span>{tabName}</span>
		</nav>
	);
};

interface SucursalesAdminProps {
	onNavigate: (tab: any) => void;
}

export const SucursalesAdminView: React.FC<SucursalesAdminProps> = () => {
	const { currentUser } = useAppStore();

	const empresas = useQuery(api.organizacion.getEmpresas) || [];
	const sucursales = useQuery(api.organizacion.getSucursales, {}) || [];
	const pvs = useQuery(api.organizacion.getPuntosVenta, {}) || [];

	const createEmpresa = useMutation(api.organizacion.createEmpresa);
	const updateEmpresa = useMutation(api.organizacion.updateEmpresa);
	const createSucursal = useMutation(api.organizacion.createSucursal);
	const updateSucursal = useMutation(api.organizacion.updateSucursal);
	const createPuntoVenta = useMutation(api.organizacion.createPuntoVenta);
	const updatePuntoVenta = useMutation(api.organizacion.updatePuntoVenta);

	// Modal States
	const [modalType, setModalType] = useState<"empresa" | "sucursal" | "pv" | null>(null);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [parentId, setParentId] = useState<string>("");

	// Form States
	const [nombre, setNombre] = useState("");
	const [direccion, setDireccion] = useState("");
	const [telefono, setTelefono] = useState("");
	const [codigo, setCodigo] = useState("");
	const [esMatriz, setEsMatriz] = useState(false);

	const esAdminValido = currentUser?.rol === "SuperAdmin";

	if (!esAdminValido) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-center">
				<Building2 className="h-12 w-12 text-red-500 mb-4 opacity-50" />
				<h2 className="text-2xl font-bold text-foreground">Acceso Denegado</h2>
				<p className="text-muted-foreground mt-2">
					Solo el SuperAdmin puede gestionar la red jerárquica de empresas.
				</p>
			</div>
		);
	}

	const handleOpenModal = (type: "empresa" | "sucursal" | "pv", item?: any, parent?: string) => {
		setModalType(type);
		setParentId(parent || "");
		if (item) {
			setEditingItem(item);
			setNombre(item.nombre || "");
			setDireccion(item.direccion || "");
			setTelefono(item.telefono || "");
			setCodigo(item.codigo || "");
			setEsMatriz(item.esMatriz || false);
		} else {
			setEditingItem(null);
			setNombre("");
			setDireccion("");
			setTelefono("");
			setCodigo("");
			setEsMatriz(false);
		}
	};

	const handleSave = async () => {
		if (modalType === "empresa") {
			if (editingItem) {
				await updateEmpresa({ id: editingItem._id, nombre, direccion, telefono });
			} else {
				await createEmpresa({ nombre, ruc: "000", razonSocial: nombre, direccion, telefono });
			}
		} else if (modalType === "sucursal") {
			if (editingItem) {
				await updateSucursal({ id: editingItem._id, nombre, direccion, telefono, esMatriz });
			} else {
				await createSucursal({ empresaId: parentId as any, nombre, direccion, telefono, esMatriz });
			}
		} else if (modalType === "pv") {
			if (editingItem) {
				await updatePuntoVenta({ id: editingItem._id, nombre, direccion, telefono, codigo });
			} else {
				await createPuntoVenta({ sucursalId: parentId as any, nombre, direccion, telefono, codigo: codigo || "PV01" });
			}
		}
		setModalType(null);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
						<Network className="h-8 w-8 text-primary" />
						Jerarquía Organizacional
					</h1>
					<p className="text-muted-foreground mt-1">
						Gestiona Matrices, Sucursales y Puntos de Venta.
					</p>
				</div>
				<button
					onClick={() => handleOpenModal("empresa")}
					className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					<Plus className="h-4 w-4" />
					Nueva Matriz (Empresa)
				</button>
			</div>

			<div className="space-y-4">
				{empresas.map((emp) => (
					<div key={emp._id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in">
						<div className="bg-secondary/40 p-4 border-b border-border flex justify-between items-center">
							<div className="flex items-center gap-3">
								<Building2 className="h-6 w-6 text-blue-500" />
								<div>
									<h2 className="text-lg font-bold text-foreground">{emp.nombre} <span className="text-xs text-muted-foreground font-normal ml-2">Matriz / Empresa</span></h2>
									<p className="text-xs text-muted-foreground">{emp.direccion} {emp.telefono ? `• ${emp.telefono}` : ""}</p>
								</div>
							</div>
							<div className="flex gap-2">
								<button onClick={() => handleOpenModal("empresa", emp)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
									<Edit2 className="h-4 w-4" />
								</button>
								<button onClick={() => handleOpenModal("sucursal", null, emp._id)} className="flex items-center gap-1 text-xs font-semibold bg-background border border-border px-3 py-1.5 rounded-lg hover:border-primary transition-colors">
									<Plus className="h-3 w-3" /> Sucursal
								</button>
							</div>
						</div>

						<div className="p-4 space-y-4">
							{sucursales.filter(s => s.empresaId === emp._id).map((suc) => (
								<div key={suc._id} className="ml-4 border-l-2 border-border/50 pl-4 space-y-3 relative">
									<div className="absolute -left-[1px] top-4 w-4 border-t-2 border-border/50"></div>
									<div className="bg-background border border-border rounded-lg p-3 flex justify-between items-center hover:border-primary/30 transition-colors">
										<div>
											<div className="flex items-center gap-2">
												<span className="font-semibold text-foreground text-sm">{suc.nombre}</span>
												{suc.esMatriz && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">Oficina Principal</span>}
											</div>
											<p className="text-xs text-muted-foreground">{suc.direccion}</p>
										</div>
										<div className="flex gap-2">
											<button onClick={() => handleOpenModal("sucursal", suc, emp._id)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
												<Edit2 className="h-3.5 w-3.5" />
											</button>
											<button onClick={() => handleOpenModal("pv", null, suc._id)} className="flex items-center gap-1 text-[10px] font-semibold bg-secondary px-2 py-1 rounded hover:bg-primary/20 transition-colors text-primary">
												<Plus className="h-3 w-3" /> Punto Venta
											</button>
										</div>
									</div>

									{/* Puntos de Venta */}
									<div className="ml-8 space-y-2">
										{pvs.filter(p => p.sucursalId === suc._id).map(pv => (
											<div key={pv._id} className="flex items-center justify-between text-xs bg-muted/20 border border-border/50 rounded-md p-2">
												<div className="flex items-center gap-2">
													<Store className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="font-medium text-foreground">{pv.nombre} <span className="text-muted-foreground">({pv.codigo})</span></span>
												</div>
												<button onClick={() => handleOpenModal("pv", pv, suc._id)} className="text-muted-foreground hover:text-primary">
													<Edit2 className="h-3 w-3" />
												</button>
											</div>
										))}
									</div>
								</div>
							))}
							{sucursales.filter(s => s.empresaId === emp._id).length === 0 && (
								<p className="text-sm text-muted-foreground italic ml-8">No hay sucursales registradas en esta matriz.</p>
							)}
						</div>
					</div>
				))}
				{empresas.length === 0 && (
					<div className="text-center py-12 border border-dashed border-border rounded-xl">
						<Network className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
						<p className="text-muted-foreground">No se encontraron matrices configuradas.</p>
					</div>
				)}
			</div>

			{modalType && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
							<h3 className="text-lg font-bold text-foreground capitalize">
								{editingItem ? `Editar ${modalType}` : `Nuevo ${modalType}`}
							</h3>
							<button onClick={() => setModalType(null)} className="text-muted-foreground hover:text-foreground">
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="p-5 space-y-4">
							<div>
								<label className="block text-sm font-semibold text-foreground mb-1.5">Nombre</label>
								<input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
							</div>
							<div>
								<label className="block text-sm font-semibold text-foreground mb-1.5">Dirección</label>
								<input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
							</div>
							<div>
								<label className="block text-sm font-semibold text-foreground mb-1.5">Teléfono</label>
								<input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
							</div>
							
							{modalType === "sucursal" && (
								<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer mt-4">
									<input type="checkbox" checked={esMatriz} onChange={(e) => setEsMatriz(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
									Es la sucursal principal
								</label>
							)}

							{modalType === "pv" && (
								<div>
									<label className="block text-sm font-semibold text-foreground mb-1.5">Código PV</label>
									<input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" placeholder="Ej: PV01" />
								</div>
							)}

							<div className="flex gap-3 pt-4 border-t border-border mt-4">
								<button onClick={() => setModalType(null)} className="flex-1 py-2 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-colors">Cancelar</button>
								<button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Guardar</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
