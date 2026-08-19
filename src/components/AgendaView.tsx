import { useMutation, useQuery } from "convex/react";
import {
	CalendarDays,
	Car,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Edit2,
	Info,
	Plus,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

export const AgendaView: React.FC = () => {
	const currentUser = useSessionStore((s) => s.currentUser);

	const citasData = useQuery(
		api.citas.fetchCitas,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const createCitaMutation = useMutation(api.citas.createCita);
	const updateCitaMutation = useMutation(api.citas.updateCita);
	const deleteCitaMutation = useMutation(api.citas.deleteCita);

	// Selected date on calendar. Today is June 3, 2026 according to system local time
	const [currentYear, setCurrentYear] = useState(2026);
	const [currentMonth, setCurrentMonth] = useState(5); // 0-indexed: 5 is June
	const [selectedDate, setSelectedDate] = useState<string>("2026-06-03");

	// Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [detailsCita, setDetailsCita] = useState<Doc<"citas"> | null>(null);

	// Form states
	const [clienteNombre, setClienteNombre] = useState("");
	const [clienteTelefono, setClienteTelefono] = useState("");
	const [vehiculoPlaca, setVehiculoPlaca] = useState("");
	const [servicio, setServicio] = useState("");
	const [fecha, setFecha] = useState("2026-06-03");
	const [hora, setHora] = useState("10:00");
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);

	// Notification overlays
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

	if (citasData === undefined) {
		return <TableSkeleton />;
	}

	const citas = citasData;

	const monthNames = [
		"Enero",
		"Febrero",
		"Marzo",
		"Abril",
		"Mayo",
		"Junio",
		"Julio",
		"Agosto",
		"Septiembre",
		"Octubre",
		"Noviembre",
		"Diciembre",
	];

	// Calendar calculations: June 2026 (1st is Monday, 30 days)
	const getDaysInMonth = (year: number, month: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (year: number, month: number) => {
		// 0 is Sunday, 1 is Monday... Let's shift so 0 is Monday, 6 is Sunday
		const day = new Date(year, month, 1).getDay();
		return day === 0 ? 6 : day - 1;
	};

	const daysInMonth = getDaysInMonth(currentYear, currentMonth);
	const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

	// Generate calendar cells (blanks then days)
	const calendarCells: (number | null)[] = [];
	for (let i = 0; i < firstDayIndex; i++) {
		calendarCells.push(null);
	}
	for (let i = 1; i <= daysInMonth; i++) {
		calendarCells.push(i);
	}

	// Next and Prev month handlers
	const handlePrevMonth = () => {
		if (currentMonth === 0) {
			setCurrentMonth(11);
			setCurrentYear((prev) => prev - 1);
		} else {
			setCurrentMonth((prev) => prev - 1);
		}
	};

	const handleNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentMonth(0);
			setCurrentYear((prev) => prev + 1);
		} else {
			setCurrentMonth((prev) => prev + 1);
		}
	};

	// Helper formatting to YYYY-MM-DD
	const formatDateString = (year: number, month: number, day: number) => {
		const mm = String(month + 1).padStart(2, "0");
		const dd = String(day).padStart(2, "0");
		return `${year}-${mm}-${dd}`;
	};

	// List of appointments for selected date
	const appointmentsForSelectedDate = citas.filter(
		(c) => c.fecha === selectedDate,
	);

	// Confirm appointment (confirmar)
	const handleConfirmAppointment = async (cita: Doc<"citas">) => {
		if (!currentUser) return;
		await updateCitaMutation({
			citaId: cita._id,
			estado: "Confirmada",
		});
		setAlertConfig({
			isOpen: true,
			title: "Cita Confirmada",
			message: `Se ha confirmado la cita de "${cita.clienteNombre}" para instalación de stickers.`,
			type: "success",
		});
	};

	// Delete appointment
	const handleDeleteAppointmentClick = (cita: Doc<"citas">) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Cita?",
			message: `¿Estás seguro de que deseas cancelar y eliminar la cita de "${cita.clienteNombre}"?`,
			type: "delete",
			onConfirm: async () => {
				if (currentUser) {
					await deleteCitaMutation({ citaId: cita._id });
				}
				setAlertConfig({
					isOpen: true,
					title: "Cita Eliminada",
					message: "La cita ha sido retirada de la agenda.",
					type: "success",
				});
			},
		});
	};

	// Open Create Appointment Form (past dates blocked check)
	const handleOpenCreate = (day?: number) => {
		let targetDate = selectedDate;
		if (day) {
			targetDate = formatDateString(currentYear, currentMonth, day);
		}

		// Past dates verification (Today is 2026-06-03)
		const todayLimit = "2026-06-03";
		if (targetDate < todayLimit) {
			setAlertConfig({
				isOpen: true,
				title: "Fecha No Permitida",
				message:
					"No puedes programar citas en fechas pasadas. Selecciona hoy o un día futuro.",
				type: "alert",
			});
			return;
		}

		setClienteNombre("");
		setClienteTelefono("");
		setVehiculoPlaca("");
		setServicio("");
		setFecha(targetDate);
		setHora("10:00");
		setIsCreateOpen(true);
	};

	const handleCreateAppointment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!clienteNombre.trim() || !servicio.trim() || !fecha) return;

		// Past dates verification
		const todayLimit = "2026-06-03";
		if (fecha < todayLimit) {
			setAlertConfig({
				isOpen: true,
				title: "Fecha Inválida",
				message:
					"No está permitido agendar en el pasado. Registra una fecha válida.",
				type: "alert",
			});
			return;
		}

		if (!currentUser) return;

		await createCitaMutation({
			usuarioId: currentUser.id as Id<"usuarios">,
			clienteNombre: clienteNombre.trim(),
			clienteTelefono: clienteTelefono.trim() || "+593 ",
			vehiculoPlaca: vehiculoPlaca.trim().toUpperCase() || "S/P",
			servicio: servicio.trim(),
			fecha,
			hora,
			estado: "Pendiente",
		});

		setIsCreateOpen(false);
		setSelectedDate(fecha);

		setAlertConfig({
			isOpen: true,
			title: "Cita Programada",
			message: `Se reservó el turno para "${clienteNombre.trim()}" el día ${fecha} a las ${hora}.`,
			type: "success",
		});
	};

	// Open Edit Appointment Form
	const handleOpenEdit = (cita: Doc<"citas">) => {
		setSelectedCitaId(cita._id);
		setClienteNombre(cita.clienteNombre);
		setClienteTelefono(cita.clienteTelefono);
		setVehiculoPlaca(cita.vehiculoPlaca);
		setServicio(cita.servicio);
		setFecha(cita.fecha);
		setHora(cita.hora);
		setIsEditOpen(true);
	};

	const handleEditAppointment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCitaId || !clienteNombre.trim() || !servicio.trim()) return;

		// Past dates verification
		const todayLimit = "2026-06-03";
		if (fecha < todayLimit) {
			setAlertConfig({
				isOpen: true,
				title: "Fecha Inválida",
				message: "No puedes mover la cita a una fecha del pasado.",
				type: "alert",
			});
			return;
		}

		await updateCitaMutation({
			citaId: selectedCitaId as Id<"citas">,
			clienteNombre: clienteNombre.trim(),
			clienteTelefono: clienteTelefono.trim(),
			vehiculoPlaca: vehiculoPlaca.trim().toUpperCase(),
			servicio: servicio.trim(),
			fecha,
			hora,
		});

		setIsEditOpen(false);
		setSelectedDate(fecha);

		setAlertConfig({
			isOpen: true,
			title: "Cita Actualizada",
			message: `La cita fue modificada satisfactoriamente para el ${fecha}.`,
			type: "success",
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Agenda e Instalaciones
					</h1>
					<p className="text-muted-foreground">
						Administra turnos y reservas de instalación para rotulación de
						stickers.
					</p>
				</div>
				<button
					type="button"
					onClick={() => handleOpenCreate()}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Agendar una Cita
				</button>
			</div>

			{/* Main split grid */}
			<div className="grid gap-6 md:grid-cols-3">
				{/* Visual Calendar Grid (2 Cols Wide in desktop) */}
				<div className="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-bold text-foreground flex items-center gap-2">
							<CalendarDays className="h-5 w-5 text-muted-foreground" />
							{monthNames[currentMonth]} {currentYear}
						</h2>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={handlePrevMonth}
								className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
							<button
								type="button"
								onClick={handleNextMonth}
								className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>
					</div>

					{/* Calendar Grid Header */}
					<div className="grid grid-cols-7 text-center text-xs font-bold text-muted-foreground border-b border-border pb-2 gap-1">
						<span>Lun</span>
						<span>Mar</span>
						<span>Mié</span>
						<span>Jue</span>
						<span>Vie</span>
						<span>Sáb</span>
						<span>Dom</span>
					</div>

					{/* Calendar Grid Cells */}
					<div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium">
						{calendarCells.map((day, idx) => {
							if (day === null) {
								return (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: celda vacía del calendario, lista estática
										key={`empty-${idx}`}
										className="p-3"
									/>
								);
							}

							const cellDateStr = formatDateString(
								currentYear,
								currentMonth,
								day,
							);
							const isSelected = selectedDate === cellDateStr;
							const hasAppointments = citas.some(
								(c) => c.fecha === cellDateStr,
							);
							const isToday = cellDateStr === "2026-06-03";

							// Count appointments for this cell
							const dayAppts = citas.filter((c) => c.fecha === cellDateStr);

							return (
								<button
									type="button"
									key={`day-${day}`}
									onClick={() => setSelectedDate(cellDateStr)}
									onDoubleClick={() => handleOpenCreate(day)}
									className={`p-2.5 rounded-lg flex flex-col items-center justify-between aspect-square border transition-all hover:border-ring/50 relative cursor-pointer ${
										isSelected
											? "bg-primary text-primary-foreground border-primary shadow-sm"
											: isToday
												? "border-ring text-foreground font-black"
												: "border-border/40 hover:bg-secondary/40 text-foreground"
									}`}
								>
									<span className="text-xs font-semibold">{day}</span>

									{/* Indicator for appointments */}
									{hasAppointments && (
										<div className="flex gap-0.5 mt-1 justify-center max-w-full overflow-hidden">
											{dayAppts.slice(0, 3).map((appt) => (
												<span
													key={appt._id}
													className={`h-1.5 w-1.5 rounded-full shrink-0 ${
														isSelected
															? "bg-primary-foreground"
															: appt.estado === "Confirmada"
																? "bg-green-500"
																: "bg-yellow-500"
													}`}
												/>
											))}
										</div>
									)}
								</button>
							);
						})}
					</div>

					<div className="mt-2 text-xs text-muted-foreground flex gap-4 flex-wrap justify-center border-t border-border pt-3">
						<span className="flex items-center gap-1.5 font-semibold">
							<span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{" "}
							Citas Confirmadas
						</span>
						<span className="flex items-center gap-1.5 font-semibold">
							<span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />{" "}
							Citas Pendientes
						</span>
						<span className="flex items-center gap-1.5 font-semibold">
							<span className="h-2 w-2 rounded-full border border-ring inline-block" />{" "}
							Día Actual (Hoy)
						</span>
					</div>
				</div>

				{/* Lateral Sidebar Appointments List */}
				<div className="md:col-span-1 rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
					<div className="space-y-4">
						<div className="pb-3 border-b border-border">
							<h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
								Citas del {selectedDate}
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">
								Reservas registradas para esta fecha.
							</p>
						</div>

						<div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
							{appointmentsForSelectedDate.map((cita) => (
								<div
									key={cita._id}
									className="rounded-lg border border-border p-3.5 bg-secondary/5 hover:bg-secondary/20 transition-all flex flex-col gap-2"
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded text-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{cita.hora}
										</span>
										<span
											className={`text-[10px] font-bold px-2 py-0.5 rounded ${
												cita.estado === "Confirmada"
													? "bg-green-500/10 text-green-500"
													: "bg-yellow-500/10 text-yellow-500"
											}`}
										>
											{cita.estado}
										</span>
									</div>

									<div>
										<h4 className="text-sm font-bold text-foreground">
											{cita.clienteNombre}
										</h4>
										<p className="text-xs text-muted-foreground font-medium">
											{cita.servicio}
										</p>
										<div className="mt-1 text-[11px] text-foreground font-semibold flex items-center gap-1">
											<Car className="h-3 w-3 opacity-60" /> Placa:{" "}
											{cita.vehiculoPlaca}
										</div>
									</div>

									<div className="flex justify-end gap-1.5 pt-2 border-t border-border/55 mt-1">
										{cita.estado === "Pendiente" && (
											<button
												type="button"
												onClick={() => handleConfirmAppointment(cita)}
												className="flex items-center gap-1 rounded bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-bold hover:opacity-90 transition-colors"
												title="Confirmar Cita"
											>
												<Check className="h-3 w-3" /> Confirmar
											</button>
										)}
										
										<button
											type="button"
											onClick={() => {
												setDetailsCita(cita);
												setIsDetailsOpen(true);
											}}
											className="p-1 text-muted-foreground hover:bg-card hover:text-foreground rounded transition-colors"
											title="Ver detalles"
										>
											<Info className="h-3 w-3" />
										</button>
										<button
											type="button"
											onClick={() => handleOpenEdit(cita)}

											className="p-1 text-muted-foreground hover:bg-card hover:text-foreground rounded transition-colors"
											title="Editar cita"
										>
											<Edit2 className="h-3 w-3" />
										</button>
										<button
											type="button"
											onClick={() => handleDeleteAppointmentClick(cita)}
											className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
											title="Eliminar cita"
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</div>
								</div>
							))}
							{appointmentsForSelectedDate.length === 0 && (
								<div className="text-center py-16 text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
									<Info className="h-8 w-8 opacity-35" />
									<span>No hay citas programadas para este día.</span>
									<button
										type="button"
										onClick={() => handleOpenCreate()}
										className="mt-2 text-xs font-bold text-foreground hover:underline"
									>
										+ Programar Cita
									</button>
								</div>
							)}
						</div>
					</div>

					<div className="pt-3 border-t border-border mt-3 text-center text-xs text-muted-foreground font-medium">
						Mostrando {appointmentsForSelectedDate.length} citas programadas.
					</div>
				</div>
			</div>

			{/* CREATE APPOINTMENT MODAL */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsCreateOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Programar Nueva Cita
						</h3>
						<form onSubmit={handleCreateAppointment} className="space-y-4">
							<div>
								<label
									htmlFor="clienteNombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre del Cliente *
								</label>
								<input
									id="clienteNombre"
									type="text"
									required
									value={clienteNombre}
									onChange={(e) => setClienteNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Carlos Mendoza"
								/>
							</div>

							<div>
								<label
									htmlFor="clienteTelefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono
								</label>
								<input
									id="clienteTelefono"
									type="text"
									value={clienteTelefono}
									onChange={(e) => setClienteTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="+593 "
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="vehiculoPlaca"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Placa del Vehículo
									</label>
									<input
										id="vehiculoPlaca"
										type="text"
										value={vehiculoPlaca}
										onChange={(e) => setVehiculoPlaca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="PBA-3421"
									/>
								</div>
								<div>
									<label
										htmlFor="servicio"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Servicio / Rotulado *
									</label>
									<input
										id="servicio"
										type="text"
										required
										value={servicio}
										onChange={(e) => setServicio(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
										placeholder="Ej. Visera de parabrisas"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="fechaTurno"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha de Turno *
									</label>
									<input
										id="fechaTurno"
										type="date"
										required
										value={fecha}
										onChange={(e) => setFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="horaTurno"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Hora de Turno *
									</label>
									<input
										id="horaTurno"
										type="time"
										required
										value={hora}
										onChange={(e) => setHora(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
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
									Agendar Turno
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			
			{/* DETAILS APPOINTMENT MODAL */}
			{isDetailsOpen && detailsCita && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsDetailsOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
							<Info className="h-5 w-5 text-primary" /> Detalles de la Cita
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Cliente</p>
									<p className="text-sm font-medium text-foreground">{detailsCita.clienteNombre}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Teléfono</p>
									<p className="text-sm font-medium text-foreground">{detailsCita.clienteTelefono || "N/A"}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Placa / Vehículo</p>
									<p className="text-sm font-medium text-foreground">{detailsCita.vehiculoPlaca || "N/A"}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Servicio</p>
									<p className="text-sm font-medium text-foreground">{detailsCita.servicio}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Fecha y Hora</p>
									<p className="text-sm font-medium text-foreground">{detailsCita.fecha} - {detailsCita.hora}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Estado</p>
									<span
										className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${
											detailsCita.estado === "Confirmada"
												? "bg-green-500/10 text-green-500"
												: "bg-yellow-500/10 text-yellow-500"
										}`}
									>
										{detailsCita.estado}
									</span>
								</div>
							</div>
						</div>
						<div className="flex gap-3 justify-end pt-6">
							<button
								type="button"
								onClick={() => setIsDetailsOpen(false)}
								className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
							>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}


			{/* EDIT APPOINTMENT MODAL */}
			{isEditOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsEditOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Editar Cita Reservada
						</h3>
						<form onSubmit={handleEditAppointment} className="space-y-4">
							<div>
								<label
									htmlFor="editClienteNombre"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre del Cliente *
								</label>
								<input
									id="editClienteNombre"
									type="text"
									required
									value={clienteNombre}
									onChange={(e) => setClienteNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div>
								<label
									htmlFor="editClienteTelefono"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono
								</label>
								<input
									id="editClienteTelefono"
									type="text"
									value={clienteTelefono}
									onChange={(e) => setClienteTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="editVehiculoPlaca"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Placa del Vehículo
									</label>
									<input
										id="editVehiculoPlaca"
										type="text"
										value={vehiculoPlaca}
										onChange={(e) => setVehiculoPlaca(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="editServicio"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Servicio *
									</label>
									<input
										id="editServicio"
										type="text"
										required
										value={servicio}
										onChange={(e) => setServicio(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="editFechaTurno"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha de Turno *
									</label>
									<input
										id="editFechaTurno"
										type="date"
										required
										value={fecha}
										onChange={(e) => setFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="editHoraTurno"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Hora de Turno *
									</label>
									<input
										id="editHoraTurno"
										type="time"
										required
										value={hora}
										onChange={(e) => setHora(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
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
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors"
								>
									Guardar Cambios
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* CONFIRMATIONS AND ALERTS */}
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
