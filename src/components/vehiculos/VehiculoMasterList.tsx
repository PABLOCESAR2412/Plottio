import { ChevronRight, Search } from "lucide-react";
import type React from "react";
import type { Vehiculo } from "./types";

export interface VehiculoMasterListProps {
	vehiculos: Vehiculo[];
	selectedVehiculoId: string | null;
	onSelectVehiculo: (id: string) => void;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	categories: string[];
	selectedCategory: string;
	onSelectCategory: (category: string) => void;
	getOwnerName: (vehiculo: Vehiculo) => string;
}

export const VehiculoMasterList: React.FC<VehiculoMasterListProps> = ({
	vehiculos,
	selectedVehiculoId,
	onSelectVehiculo,
	searchTerm,
	onSearchChange,
	categories,
	selectedCategory,
	onSelectCategory,
	getOwnerName,
}) => {
	const allCategories = ["Todos", ...categories];

	return (
		<div className="flex flex-col gap-4">
			{/* Categories filter selector */}
			<div className="flex flex-wrap gap-2">
				{allCategories.map((cat) => (
					<button
						type="button"
						key={cat}
						onClick={() => onSelectCategory(cat)}
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
							selectedCategory === cat
								? "bg-primary text-primary-foreground shadow-sm"
								: "bg-secondary text-foreground hover:bg-secondary/80"
						}`}
					>
						{cat}
					</button>
				))}
			</div>

			{/* Left col - Grid list */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
				<div className="relative">
					<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Buscar placa o propietario..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
					/>
				</div>

				<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
					{vehiculos.map((veh) => {
						const ownerName = getOwnerName(veh);
						const isSelected = selectedVehiculoId === veh.id;
						return (
							<button
								type="button"
								key={veh.id}
								onClick={() => onSelectVehiculo(veh.id)}
								className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 cursor-pointer ${
									isSelected
										? "bg-primary text-primary-foreground shadow-sm"
										: "hover:bg-secondary"
								}`}
							>
								<div className="truncate pr-2">
									<div className="flex items-center gap-1.5 font-bold text-sm">
										<span
											className={`px-1 py-0.5 rounded text-xs border border-border/30 ${
												isSelected
													? "bg-primary-foreground/15 text-primary-foreground"
													: "bg-secondary/60 text-foreground"
											}`}
										>
											{veh.placa}
										</span>
										<span className="truncate">
											{veh.marca} {veh.modelo}
										</span>
									</div>
									<div
										className={`text-xs truncate mt-0.5 ${
											isSelected
												? "text-primary-foreground/80"
												: "text-muted-foreground"
										}`}
									>
										Prop: {ownerName}
									</div>
								</div>
								<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
							</button>
						);
					})}
					{vehiculos.length === 0 && (
						<div className="text-center py-8 text-muted-foreground text-sm">
							No se encontraron vehículos.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
