import type React from "react";

/**
 * @deprecated En desuso tras la migración a Single-Org (Organización Única Central).
 */
export const SucursalSelector: React.FC = () => null;

/**
 * @deprecated En desuso tras la migración a Single-Org.
 */
export const SucursalBadge: React.FC = () => null;

/**
 * Barra de migajas de pan para navegación de secciones.
 */
export const BreadcrumbNavegacion: React.FC<{ tabName: string }> = ({
	tabName,
}) => {
	return (
		<nav className="flex items-center text-sm font-medium text-foreground">
			<span>{tabName}</span>
		</nav>
	);
};

/**
 * @deprecated En desuso tras la migración a Single-Org.
 */
export const SucursalesAdminView: React.FC<{
	onNavigate?: (tab: string) => void;
}> = () => null;
