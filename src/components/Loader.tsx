import { Loader2 } from "lucide-react";
import type React from "react";

export const Loader: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] w-full bg-background text-foreground animate-fade-in">
			<Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
			<h2 className="text-xl font-semibold tracking-tight animate-pulse">
				Cargando...
			</h2>
			<p className="text-sm text-muted-foreground mt-2">
				Preparando la información
			</p>
		</div>
	);
};
