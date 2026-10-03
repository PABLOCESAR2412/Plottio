import { ChevronRight, Search } from "lucide-react";
import type React from "react";
import type { OrdenTrabajo, OrderStatusTab } from "./types";

export interface OrderMasterListProps {
	orders: OrdenTrabajo[];
	selectedOrderId: string | null;
	onSelectOrder: (orderId: string) => void;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	selectedStatusTab: OrderStatusTab;
	onStatusTabChange: (status: OrderStatusTab) => void;
}

const STATUS_TABS: OrderStatusTab[] = [
	"Todos",
	"Pendiente",
	"En Proceso",
	"Listo",
	"Entregado",
	"Cancelado",
];

export const OrderMasterList: React.FC<OrderMasterListProps> = ({
	orders,
	selectedOrderId,
	onSelectOrder,
	searchTerm,
	onSearchChange,
	selectedStatusTab,
	onStatusTabChange,
}) => {
	return (
		<div className="flex flex-col gap-4">
			{/* Filter status tabs */}
			<div className="flex flex-wrap gap-1.5 border-b border-border pb-1">
				{STATUS_TABS.map((st) => (
					<button
						type="button"
						key={st}
						onClick={() => onStatusTabChange(st)}
						className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
							selectedStatusTab === st
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						{st}
					</button>
				))}
			</div>

			{/* Left Col container: search and orders list */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
				<div className="relative">
					<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Buscar por ID, placa o cliente..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
					/>
				</div>

				<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
					{orders.map((ord) => {
						const isSelected = selectedOrderId === ord._id;
						return (
							<button
								type="button"
								key={ord._id}
								onClick={() => onSelectOrder(ord._id)}
								className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 cursor-pointer ${
									isSelected
										? "bg-primary text-primary-foreground shadow-sm"
										: "hover:bg-secondary"
								}`}
							>
								<div className="truncate pr-2">
									<div className="font-bold text-sm flex items-center gap-1.5">
										<span>{`${ord._id.substring(0, 4)}...`}</span>
										<span
											className={`text-[10px] px-1 py-0.2 rounded font-mono ${
												isSelected
													? "bg-primary-foreground/15 text-primary-foreground"
													: "bg-secondary/60 text-foreground"
											}`}
										>
											{ord.placa}
										</span>
									</div>
									<div
										className={`text-xs truncate ${
											isSelected
												? "text-primary-foreground/80"
												: "text-muted-foreground"
										}`}
									>
										Prop: {ord.clienteNombre}
									</div>
									<div className="mt-1.5 flex items-center gap-2">
										<span
											className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
												ord.prioridad === "Alta"
													? "bg-destructive/10 text-destructive"
													: isSelected
														? "bg-primary-foreground/15 text-primary-foreground"
														: "bg-secondary text-foreground"
											}`}
										>
											{ord.prioridad}
										</span>
										<span className="text-[10px] font-medium opacity-80">
											{ord.progreso}%
										</span>
									</div>
								</div>
								<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
							</button>
						);
					})}
					{orders.length === 0 && (
						<div className="text-center py-8 text-muted-foreground text-sm">
							No se encontraron órdenes.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
