import type { Cliente, Empresa } from "../types/data";

/**
 * Normaliza cadenas de texto para búsquedas insensibles a mayúsculas, tildes y espacios extras.
 */
export const norm = (s?: string): string =>
	(s || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

export const normalizarTexto = norm;

/**
 * Filtra una lista de clientes evaluando:
 * - Nombre
 * - Identificación (Cédula o RUC)
 * - Teléfono
 * - Correo electrónico
 * - Dirección
 * - Nombre o Razón Social de la empresa vinculada
 */
export const filtrarClientes = (
	clientes: Cliente[],
	empresas: Array<Pick<Empresa, "id" | "nombre"> & { razonSocial?: string }>,
	searchTerm: string,
): Cliente[] => {
	const term = norm(searchTerm);
	if (!term) return clientes;

	const termDigits = term.replace(/\D/g, "");

	// Mapa rápido de empresas por ID para optimizar el lookup
	const empresaMap = new Map<
		string,
		{ nombre: string; razonSocial?: string }
	>();
	for (const emp of empresas) {
		empresaMap.set(emp.id, emp);
	}

	return clientes.filter((c) => {
		const nombreNorm = norm(c.nombre);
		if (nombreNorm.includes(term)) return true;

		// Búsqueda por Cédula / RUC (normalizado o por dígitos limpios)
		if (c.identificacion) {
			const identNorm = norm(c.identificacion);
			if (identNorm.includes(term)) return true;
			if (termDigits.length > 0) {
				const identDigits = c.identificacion.replace(/\D/g, "");
				if (identDigits.includes(termDigits)) return true;
			}
		}

		// Búsqueda por Teléfono
		if (c.telefono) {
			const telNorm = norm(c.telefono);
			if (telNorm.includes(term)) return true;
			if (termDigits.length > 0) {
				const telDigits = c.telefono.replace(/\D/g, "");
				if (telDigits.includes(termDigits)) return true;
			}
		}

		// Búsqueda por Email
		if (c.email && norm(c.email).includes(term)) return true;

		// Búsqueda por Dirección
		if (c.direccion && norm(c.direccion).includes(term)) return true;

		// Búsqueda por Empresa Vinculada (nombre o razón social)
		const empresaIds = [
			(c as unknown as { empresaVinculadaId?: string }).empresaVinculadaId,
			c.empresaId,
		].filter(Boolean) as string[];

		for (const empId of empresaIds) {
			const emp = empresaMap.get(empId);
			if (emp) {
				if (norm(emp.nombre).includes(term)) return true;
				if (emp.razonSocial && norm(emp.razonSocial).includes(term))
					return true;
			}
		}

		return false;
	});
};

/**
 * Busca si ya existe un cliente en la base de datos con la misma identificación.
 * Realiza coincidencia exacta y por dígitos numéricos limpios.
 */
export const buscarClienteDuplicado = (
	clientes: Cliente[],
	identificacion: string,
): Cliente | null => {
	const clean = identificacion.replace(/\D/g, "").trim();
	if (!clean || clean.length < 10) return null;

	return (
		clientes.find((c) => {
			if (!c.identificacion) return false;
			const cTrim = c.identificacion.trim();
			if (cTrim === clean) return true;
			const cClean = cTrim.replace(/\D/g, "");
			return cClean === clean;
		}) || null
	);
};
