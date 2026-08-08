import {
	AlertTriangle,
	Archive,
	CheckCircle2,
	Edit2,
	Mail,
	MapPin,
	Plus,
	Shield,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { RolUsuario, Usuario } from "../store/useAppStore";
import { useAppStore } from "../store/useAppStore";
import { SuccessDialog } from "./SuccessDialog";

export const GestionUsuariosView: React.FC = () => {
	const {
		usuarios,
		sucursales,
		puntosVenta,
		currentUser,
		updateUsuario,
		archiveUsuario,
		addUsuario,
	} = useAppStore();

	// Modals state
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

	// Invite state
	const [inviteNombre, setInviteNombre] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRol, setInviteRol] = useState<RolUsuario>("Cotizador");
	const [inviteSucursalId, setInviteSucursalId] = useState<string>("");

	// Edit state
	const [editingUser, setEditingUser] = useState<Usuario | null>(null);
	const [editRol, setEditRol] = useState<RolUsuario>("Cotizador");
	const [editSucursalId, setEditSucursalId] = useState<string>("");
	const [editPvId, setEditPvId] = useState<string>("");

	// Success dialog
	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete";
		onConfirm?: () => void;
	}>({
		isOpen: false,
		title: "",
		message: "",
		type: "success",
	});

	if (
		!currentUser ||
		(currentUser.rol !== "SuperAdmin" && currentUser.rol !== "AdminSucursal")
	) {
		return (
			<div className="flex items-center justify-center h-full p-8 text-muted-foreground text-sm font-medium">
				No tienes permisos para ver esta sección.
			</div>
		);
	}

	// Filter users based on role
	const visibleUsers =
		currentUser.rol === "SuperAdmin"
			? usuarios
			: usuarios.filter((u) => u.sucursalId === currentUser.sucursalId);

	const getSucursalName = (sId: string | null) => {
		if (!sId) return "Todas (Global)";
		return sucursales.find((s) => s.id === sId)?.nombre || sId;
	};

	const getPvName = (pId: string | null) => {
		if (!pId) return "N/A";
		return puntosVenta.find((p) => p.id === pId)?.nombre || pId;
	};

	const handleEditClick = (u: Usuario) => {
		setEditingUser(u);
		setEditRol(u.rol);
		setEditSucursalId(u.sucursalId || "");
		setEditPvId(u.pvId || "");
		setIsEditModalOpen(true);
	};

	const handleSaveEdit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser) return;

		updateUsuario(editingUser.id, {
			rol: editRol,
			sucursalId: editSucursalId || null,
			pvId: editPvId || null,
		});

		setIsEditModalOpen(false);
		setAlertConfig({
			isOpen: true,
			title: "Usuario Actualizado",
			message: `Los permisos de ${editingUser.nombre} han sido guardados.`,
			type: "success",
		});
	};

	const handleArchiveClick = (u: Usuario) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Archivar Usuario?",
			message: `¿Estás seguro de quitarle el acceso al sistema a ${u.nombre}? Su historial se mantendrá.`,
			type: "delete",
			onConfirm: () => {
				archiveUsuario(u.id);
				setAlertConfig({
					isOpen: true,
					title: "Usuario Archivado",
					message: `${u.nombre} ya no tiene acceso al sistema.`,
					type: "success",
				});
			},
		});
	};

	// Handles user invite form submission
	const handleInviteUser = (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteNombre.trim() || !inviteEmail.trim()) return;

		// Check if user already exists
		if (usuarios.some((u) => u.email === inviteEmail)) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: "El correo ya está registrado.",
				type: "alert",
			});
			return;
		}

		const result = addUsuario({
			nombre: inviteNombre,
			email: inviteEmail,
			rol: inviteRol,
			sucursalId:
				currentUser?.rol === "AdminSucursal"
					? currentUser.sucursalId
					: inviteSucursalId || null,
			pvId: null,
			activo: false, // pending accept
		});

		setIsInviteModalOpen(false);
		setInviteNombre("");
		setInviteEmail("");
		setInviteRol("Cotizador");
		setInviteSucursalId("");

		// Simulate sending email by showing toast with magic link
		const magicLink = `${window.location.origin}/?token=${result.token}`;
		toast.success("Invitación generada", {
			description: (
				<div className="flex flex-col gap-2 mt-1">
					<span className="text-xs">Enlace mágico para {inviteNombre}:</span>
					<input
						readOnly
						value={magicLink}
						className="w-full text-[10px] bg-background border border-border p-1 rounded font-mono"
						onClick={(e) => {
							(e.target as HTMLInputElement).select();
							navigator.clipboard.writeText(magicLink);
							toast.success("Enlace copiado al portapapeles");
						}}
					/>
				</div>
			),
			duration: 10000,
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<Users className="h-7 w-7 text-primary" />
						Gestión de Accesos
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Administra los roles, sucursales y puntos de venta de tu equipo.
					</p>
				</div>
				<button
					onClick={() => setIsInviteModalOpen(true)}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
				>
					<Plus className="h-4 w-4" />
					Invitar Usuario
				</button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="bg-card border border-border p-4 rounded-xl shadow-sm">
					<div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
						Total Usuarios
					</div>
					<div className="text-2xl font-black text-foreground">
						{visibleUsers.length}
					</div>
				</div>
				<div className="bg-card border border-border p-4 rounded-xl shadow-sm">
					<div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
						Activos
					</div>
					<div className="text-2xl font-black text-green-500">
						{visibleUsers.filter((u) => u.activo).length}
					</div>
				</div>
				<div className="bg-card border border-border p-4 rounded-xl shadow-sm">
					<div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
						Admins
					</div>
					<div className="text-2xl font-black text-blue-500">
						{
							visibleUsers.filter(
								(u) => u.rol === "AdminSucursal" || u.rol === "SuperAdmin",
							).length
						}
					</div>
				</div>
			</div>

			{/* Users Table */}
			<div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm whitespace-nowrap">
						<thead className="bg-secondary/40 text-muted-foreground border-b border-border">
							<tr>
								<th className="px-4 py-3 font-semibold">Usuario / Correo</th>
								<th className="px-4 py-3 font-semibold">Rol</th>
								<th className="px-4 py-3 font-semibold">Asignación</th>
								<th className="px-4 py-3 font-semibold">Estado</th>
								<th className="px-4 py-3 font-semibold text-right">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{visibleUsers.map((u) => (
								<tr
									key={u.id}
									className="hover:bg-secondary/20 transition-colors"
								>
									<td className="px-4 py-3">
										<div className="font-bold text-foreground">{u.nombre}</div>
										<div className="text-[11px] text-muted-foreground">
											{u.email}
										</div>
									</td>
									<td className="px-4 py-3">
										<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
											<Shield className="h-3 w-3" />
											{u.rol}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
											<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
											{getSucursalName(u.sucursalId)}
										</div>
										{u.pvId && (
											<div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
												PV: {getPvName(u.pvId)}
											</div>
										)}
									</td>
									<td className="px-4 py-3">
										{u.activo ? (
											<span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-500">
												<CheckCircle2 className="h-3.5 w-3.5" /> Activo
											</span>
										) : (
											<span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-500">
												<AlertTriangle className="h-3.5 w-3.5" /> Inactivo /
												Pendiente
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												onClick={() => handleEditClick(u)}
												className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
												title="Editar Permisos"
											>
												<Edit2 className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleArchiveClick(u)}
												disabled={!u.activo || u.id === currentUser.id}
												className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30"
												title={
													u.id === currentUser.id
														? "No puedes archivarte a ti mismo"
														: "Archivar Usuario"
												}
											>
												<Archive className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
							{visibleUsers.length === 0 && (
								<tr>
									<td
										colSpan={5}
										className="px-4 py-8 text-center text-muted-foreground"
									>
										No se encontraron usuarios.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Edit User Modal */}
			{isEditModalOpen && editingUser && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<Edit2 className="h-4 w-4 text-blue-500" />
								Editar Permisos
							</h3>
							<button
								onClick={() => setIsEditModalOpen(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="px-5 pt-4 pb-2">
							<div className="text-sm font-bold">{editingUser.nombre}</div>
							<div className="text-xs text-muted-foreground">
								{editingUser.email}
							</div>
						</div>

						<form onSubmit={handleSaveEdit} className="p-5 pt-2 space-y-4">
							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Rol de Sistema
								</label>
								<select
									value={editRol}
									onChange={(e) => setEditRol(e.target.value as RolUsuario)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
								>
									<option value="Cotizador">Cotizador</option>
									<option value="Instalador">Instalador</option>
									<option value="GerentePV">Gerente de Punto de Venta</option>
									<option value="Contador">Contador</option>
									<option value="AdminSucursal">
										Administrador de Sucursal
									</option>
									{currentUser.rol === "SuperAdmin" && (
										<option value="SuperAdmin">Super Admin</option>
									)}
								</select>
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Sucursal Asignada
								</label>
								<select
									value={editSucursalId}
									onChange={(e) => {
										setEditSucursalId(e.target.value);
										setEditPvId(""); // Reset PV when sucursal changes
									}}
									disabled={currentUser.rol !== "SuperAdmin"}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
								>
									{currentUser.rol === "SuperAdmin" && (
										<option value="">Todas (Matriz Global)</option>
									)}
									{sucursales.map((s) => (
										<option key={s.id} value={s.id}>
											{s.nombre}
										</option>
									))}
								</select>
							</div>

							{editSucursalId && (
								<div>
									<label className="block text-xs font-semibold text-foreground mb-1.5">
										Punto de Venta Específico (Opcional)
									</label>
									<select
										value={editPvId}
										onChange={(e) => setEditPvId(e.target.value)}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="">
											Ninguno (Aplica a toda la sucursal)
										</option>
										{puntosVenta
											.filter((p) => p.sucursalId === editSucursalId)
											.map((p) => (
												<option key={p.id} value={p.id}>
													{p.nombre}
												</option>
											))}
									</select>
								</div>
							)}

							<div className="pt-2 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsEditModalOpen(false)}
									className="px-4 py-2.5 rounded-lg border border-border text-foreground font-bold text-sm hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
								>
									Guardar Cambios
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Invite User Modal */}
			{isInviteModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<Mail className="h-4 w-4 text-blue-500" />
								Invitar Nuevo Usuario
							</h3>
							<button
								onClick={() => setIsInviteModalOpen(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleInviteUser} className="p-5 space-y-4">
							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Nombre Completo
								</label>
								<input
									type="text"
									required
									value={inviteNombre}
									onChange={(e) => setInviteNombre(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									placeholder="Ej. Juan Pérez"
								/>
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Correo Electrónico
								</label>
								<input
									type="email"
									required
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									placeholder="juan@empresa.com"
								/>
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Rol de Sistema
								</label>
								<select
									value={inviteRol}
									onChange={(e) => setInviteRol(e.target.value as RolUsuario)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
								>
									<option value="Cotizador">Cotizador</option>
									<option value="Instalador">Instalador</option>
									<option value="GerentePV">Gerente de Punto de Venta</option>
									<option value="Contador">Contador</option>
									<option value="AdminSucursal">
										Administrador de Sucursal
									</option>
									{currentUser.rol === "SuperAdmin" && (
										<option value="SuperAdmin">Super Admin</option>
									)}
								</select>
							</div>

							{currentUser.rol === "SuperAdmin" &&
								inviteRol !== "SuperAdmin" && (
									<div>
										<label className="block text-xs font-semibold text-foreground mb-1.5">
											Sucursal Asignada
										</label>
										<select
											value={inviteSucursalId}
											onChange={(e) => setInviteSucursalId(e.target.value)}
											className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
										>
											<option value="">Todas (Matriz Global)</option>
											{sucursales.map((s) => (
												<option key={s.id} value={s.id}>
													{s.nombre}
												</option>
											))}
										</select>
									</div>
								)}

							<div className="pt-2 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsInviteModalOpen(false)}
									className="px-4 py-2.5 rounded-lg border border-border text-foreground font-bold text-sm hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
								>
									Generar Invitación
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Aceptar" : "Entendido"}
			/>
		</div>
	);
};
