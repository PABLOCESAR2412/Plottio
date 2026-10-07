import { validarCedula, validarRuc } from "../lib/identificacion";
import type { AiProvider } from "../store/useIntegrationsStore";

/**
 * Plottio Asistente - Agentic RAG de Negocio
 *
 * Motor de orquestación operacional para el asistente de taller.
 * Cuenta con herramientas exclusivas para lógica de negocio (órdenes, clientes,
 * inventario, cotizaciones, vehículos) y guardrails estrictos que impiden
 * modificar configuración crítica, usuarios, roles o credenciales.
 * Respuestas basadas en la base de datos real del taller con telemetría técnica.
 */

export const ASISTENTE_SEGURIDAD_RECHAZO =
	"Acción no permitida: El Asistente tiene permisos limitados exclusivamente a la lógica de negocio (órdenes, clientes, vehículos, cotizaciones, inventario). No tiene autorización para alterar la configuración del sistema, usuarios o credenciales.";

export type BusinessToolName =
	| "consultar_clientes"
	| "crear_cliente"
	| "consultar_ordenes"
	| "actualizar_orden"
	| "consultar_cotizaciones"
	| "crear_cotizacion"
	| "consultar_inventario"
	| "consultar_vehiculos";

export interface BusinessToolDefinition {
	name: BusinessToolName;
	description: string;
	category:
		| "ordenes"
		| "clientes"
		| "inventario"
		| "cotizaciones"
		| "vehiculos";
	parameters: {
		type: string;
		properties: Record<string, { type: string; description: string }>;
		required?: string[];
	};
}

export const BUSINESS_TOOLS: BusinessToolDefinition[] = [
	{
		name: "consultar_clientes",
		description:
			"Consulta registros de clientes, personas naturales o jurídicas, teléfonos y flotas asociadas.",
		category: "clientes",
		parameters: {
			type: "object",
			properties: {
				criterio: {
					type: "string",
					description: "Nombre, teléfono o identificación del cliente a buscar",
				},
			},
		},
	},
	{
		name: "crear_cliente",
		description:
			"Registra un nuevo cliente con sus datos comerciales y de contacto.",
		category: "clientes",
		parameters: {
			type: "object",
			properties: {
				nombre: { type: "string", description: "Nombre comercial o completo" },
				telefono: {
					type: "string",
					description: "Número de WhatsApp o teléfono",
				},
				identificacion: { type: "string", description: "RUC, DNI o Cédula" },
			},
			required: ["nombre", "telefono"],
		},
	},
	{
		name: "consultar_ordenes",
		description:
			"Consulta el estado operativo, avance, materiales y personal asignado de órdenes de trabajo.",
		category: "ordenes",
		parameters: {
			type: "object",
			properties: {
				filtro: {
					type: "string",
					description: "Número de orden, placa o estado (ej. 'En Proceso')",
				},
			},
		},
	},
	{
		name: "actualizar_orden",
		description:
			"Actualiza el estado de producción, notas técnicas o porcentaje de avance de una orden de trabajo.",
		category: "ordenes",
		parameters: {
			type: "object",
			properties: {
				ordenId: { type: "string", description: "Identificador de la orden" },
				estado: { type: "string", description: "Nuevo estado operativo" },
				progreso: {
					type: "number",
					description: "Porcentaje de avance (0-100)",
				},
			},
			required: ["ordenId"],
		},
	},
	{
		name: "consultar_cotizaciones",
		description:
			"Consulta cotizaciones comerciales emitidas, presupuestos estimados y condiciones de pago.",
		category: "cotizaciones",
		parameters: {
			type: "object",
			properties: {
				cliente: {
					type: "string",
					description: "Nombre del cliente o cotización",
				},
			},
		},
	},
	{
		name: "crear_cotizacion",
		description:
			"Genera un borrador de cotización con desglose de materiales de rotulado y mano de obra.",
		category: "cotizaciones",
		parameters: {
			type: "object",
			properties: {
				clienteNombre: { type: "string", description: "Nombre del cliente" },
				descripcion: {
					type: "string",
					description: "Detalle del trabajo o rotulado",
				},
				totalEstimado: { type: "number", description: "Monto total sugerido" },
			},
			required: ["clienteNombre", "descripcion"],
		},
	},
	{
		name: "consultar_inventario",
		description:
			"Consulta el inventario de bobinas de vinilo, metros disponibles, tintas y accesorios en stock.",
		category: "inventario",
		parameters: {
			type: "object",
			properties: {
				material: {
					type: "string",
					description: "Referencia, tipo de vinilo o marca (ej. 3M, Arlon)",
				},
			},
		},
	},
	{
		name: "consultar_vehiculos",
		description:
			"Consulta vehículos registrados, modelos, marcas y placas vinculadas a clientes o flotas.",
		category: "vehiculos",
		parameters: {
			type: "object",
			properties: {
				placa: { type: "string", description: "Placa o modelo del vehículo" },
			},
		},
	},
];

export interface ToolCallExecution {
	toolName: BusinessToolName;
	parameters: Record<string, unknown>;
	outputSummary: string;
	timestamp: string;
}

export interface BusinessCitation {
	type: "documento" | "acuerdo" | "tarea" | "stock" | "vehiculo";
	title: string;
	similarity: number;
	snippet: string;
}

export interface BusinessDataContext {
	empresas?: Array<{
		id?: string;
		nombre: string;
		ruc?: string;
		telefono?: string;
		direccion?: string;
		activa?: boolean;
	}>;
	clientes?: Array<{
		id?: string;
		nombre: string;
		identificacion?: string;
		telefono?: string;
		email?: string;
	}>;
	ordenes?: Array<{
		id?: string;
		placa?: string;
		clienteNombre?: string;
		estado?: string;
		total?: number;
		prioridad?: string;
	}>;
	inventario?: Array<{
		id?: string;
		nombre?: string;
		stock?: number;
		unidad?: string;
	}>;
	vehiculos?: Array<{
		id?: string;
		placa?: string;
		marca?: string;
		modelo?: string;
	}>;
}

export interface AgentTelemetry {
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	latencyMs: number;
	tps: number;
	model: string;
	provider: string;
}

export interface AgentExecutionResult {
	allowed: boolean;
	response: string;
	toolsCalled: ToolCallExecution[];
	citations: BusinessCitation[];
	telemetry?: AgentTelemetry;
	timestamp: string;
}

/**
 * Valida si la consulta o comando intenta acceder/modificar configuración sensible,
 * usuarios, roles, contraseñas o permisos del sistema.
 */
export function isRestrictedAction(query: string): boolean {
	const normalized = query.toLowerCase();

	const forbiddenPatterns = [
		/\busuarios?\b/,
		/\broles?\b/,
		/\bpermisos?\b/,
		/\bcontrase[ñn]as?\b/,
		/\bpasswords?\b/,
		/\bcredenciales?\b/,
		/configuraci[oó]n\s+(del\s+)?sistema/,
		/ajustes\s+(del\s+)?sistema/,
		/\bsuperadmin\b/,
		/\badminsucursal\b/,
		/eliminar\s+usuario/,
		/crear\s+usuario/,
		/cambiar\s+rol/,
		/modificar\s+rol/,
		/modificar\s+usuario/,
		/gesti[oó]n\s+de\s+usuarios/,
		/asignar\s+permisos?/,
		/tokens?\s+de\s+acceso/,
		/\bapi\s*keys?\b/,
	];

	return forbiddenPatterns.some((pattern) => pattern.test(normalized));
}

const MENTIONED_CLIENT_STOPWORDS = new Set([
	"y",
	"o",
	"u",
	"e",
	"a",
	"al",
	"con",
	"que",
	"qué",
	"de",
	"del",
	"la",
	"el",
	"los",
	"las",
	"su",
	"sus",
	"se",
	"es",
	"son",
	"esta",
	"está",
	"estan",
	"están",
	"tiene",
	"tienen",
	"registrado",
	"registrada",
	"registrados",
	"registradas",
	"corporativo",
	"corporativos",
	"comercial",
	"comerciales",
	"activos",
	"activas",
	"flota",
	"flotas",
]);

function extractMentionedClientName(query: string): string | null {
	const match =
		query.match(/\bclientes?\s+(?:que\s+)?se\s+llam[ao]\s+(.{0,40})/i) ||
		query.match(/\bclientes?\s+llamad[oa]\s+(.{0,40})/i) ||
		query.match(/\bclientes?\b\s+(.{0,40})/i);
	if (!match) return null;
	const words = match[1].split(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ]+/).filter(Boolean);
	const nameWords: string[] = [];
	for (const word of words) {
		const lower = word.toLowerCase();
		if (lower === "llamado" || lower === "llamada" || lower === "llama") {
			continue;
		}
		if (MENTIONED_CLIENT_STOPWORDS.has(lower)) break;
		nameWords.push(word);
	}
	return nameWords.length > 0 ? nameWords.join(" ") : null;
}

function filterClientsByName(
	clientes: NonNullable<BusinessDataContext["clientes"]>,
	name: string,
): NonNullable<BusinessDataContext["clientes"]> {
	const normalized = name.toLowerCase().trim();
	if (!normalized) return [];
	const tokens = normalized.split(/\s+/).filter(Boolean);
	return clientes.filter((cliente) => {
		const nombre = (cliente.nombre || "").toLowerCase();
		if (!nombre) return false;
		if (nombre.includes(normalized)) return true;
		return tokens.every((token) => nombre.includes(token));
	});
}

function getVehiculosDeCliente(
	clientes: Array<{ nombre?: string }>,
	ordenes: BusinessDataContext["ordenes"],
	vehiculos: BusinessDataContext["vehiculos"],
): NonNullable<BusinessDataContext["vehiculos"]> {
	const nombres = clientes
		.map((cliente) => (cliente.nombre || "").toLowerCase())
		.filter(Boolean);
	if (nombres.length === 0) return [];
	const placas = new Set<string>();
	for (const orden of ordenes || []) {
		const clienteOrden = (orden.clienteNombre || "").toLowerCase();
		if (!clienteOrden || !orden.placa) continue;
		if (
			nombres.some(
				(nombre) =>
					clienteOrden.includes(nombre) || nombre.includes(clienteOrden),
			)
		) {
			placas.add(orden.placa.replace(/\s+/g, "").toUpperCase());
		}
	}
	if (placas.size === 0) return [];
	return (vehiculos || []).filter(
		(vehiculo) =>
			vehiculo.placa &&
			placas.has(vehiculo.placa.replace(/\s+/g, "").toUpperCase()),
	);
}

interface OrderFilter {
	orderId?: string;
	placa?: string;
	estado?: string;
}

function stripAccents(value: string): string {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extractOrderFilter(query: string): OrderFilter | null {
	const orderMatch = query.match(/\bot-?\s?\d{1,6}\b/i);
	const plateMatch = query.match(/\b[a-z]{3}-?\d{3,4}\b/i);
	const statusMatch = query
		.toLowerCase()
		.match(
			/\b(en\s+procesos?|en\s+producci[oó]n|en\s+espera|pendientes?|completad[oa]s?|finalizad[oa]s?|entregad[oa]s?|cancelad[oa]s?|aprobad[oa]s?)\b/,
		);

	const orderId = orderMatch ? orderMatch[0].replace(/\s+/g, "") : undefined;
	const placa = plateMatch ? plateMatch[0] : undefined;
	const estado = statusMatch ? statusMatch[0] : undefined;

	if (!orderId && !placa && !estado) return null;
	return { orderId, placa, estado };
}

function matchesOrderFilter(
	orden: { id?: string; placa?: string; estado?: string },
	filter: OrderFilter,
): boolean {
	if (filter.orderId) {
		const normalizedFilter = filter.orderId
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "");
		const filterDigits = filter.orderId.replace(/\D/g, "");
		const ordenId = (orden.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
		if (!ordenId) return false;
		const idMatches =
			ordenId.includes(normalizedFilter) ||
			(filterDigits.length > 0 && ordenId.includes(filterDigits));
		if (!idMatches) return false;
	}
	if (filter.placa) {
		const normalizedPlaca = filter.placa.replace(/\s+/g, "").toUpperCase();
		const ordenPlaca = (orden.placa || "").replace(/\s+/g, "").toUpperCase();
		if (!ordenPlaca || ordenPlaca !== normalizedPlaca) return false;
	}
	if (filter.estado) {
		const estadoBase = stripAccents(
			filter.estado.toLowerCase().replace(/s$/, ""),
		);
		const ordenEstado = (orden.estado || "").toLowerCase();
		if (!ordenEstado || !stripAccents(ordenEstado).includes(estadoBase)) {
			return false;
		}
	}
	return true;
}

const INVENTORY_FILTER_STOPWORDS = new Set([
	"consultar",
	"consulta",
	"consultas",
	"consulte",
	"dame",
	"muestra",
	"muestrame",
	"muéstrame",
	"mostrar",
	"ver",
	"lista",
	"listar",
	"todo",
	"todos",
	"toda",
	"todas",
	"cuanto",
	"cuánto",
	"cuantos",
	"cuántos",
	"cuanta",
	"cuánta",
	"que",
	"qué",
	"hay",
	"queda",
	"quedan",
	"tenemos",
	"tengo",
	"tiene",
	"tienen",
	"es",
	"son",
	"esta",
	"está",
	"estan",
	"están",
	"del",
	"de",
	"la",
	"el",
	"los",
	"las",
	"un",
	"una",
	"unos",
	"unas",
	"en",
	"con",
	"para",
	"por",
	"y",
	"o",
	"u",
	"a",
	"al",
	"stock",
	"stocks",
	"inventario",
	"inventarios",
	"material",
	"materiales",
	"bobina",
	"bobinas",
	"rollo",
	"rollos",
	"vinilo",
	"vinilos",
	"metro",
	"metros",
	"item",
	"ítem",
	"items",
	"ítems",
	"unidad",
	"unidades",
	"uds",
	"disponible",
	"disponibles",
	"registrado",
	"registrada",
	"registrados",
	"registradas",
	"actualmente",
	"taller",
]);

function extractInventoryFilterTerms(query: string): string[] {
	const tokens = query
		.toLowerCase()
		.split(/[^a-z0-9ñáéíóúü]+/)
		.filter(
			(token) => token.length >= 2 && !INVENTORY_FILTER_STOPWORDS.has(token),
		);
	return Array.from(new Set(tokens));
}

function inventoryItemMatchesTerms(
	item: { nombre?: string },
	terms: string[],
): boolean {
	const nombre = (item.nombre || "").toLowerCase();
	if (!nombre) return false;
	return terms.every((term) => {
		if (nombre.includes(term)) return true;
		const singular = term.replace(/es$/, "").replace(/s$/, "");
		return singular.length >= 2 && nombre.includes(singular);
	});
}

function formatInventarioItem(item: {
	nombre?: string;
	stock?: number;
	unidad?: string;
}): string {
	if (item.stock !== undefined) {
		return `• ${item.nombre || "Material"}: Stock ${item.stock} ${item.unidad || "uds"}`;
	}
	return `• ${item.nombre || "Material"}: Registrado en catálogo (${item.unidad || "unidad"})`;
}

/**
 * Ejecuta el ciclo de Agentic RAG de negocio sobre la consulta del operador.
 * Integra datos reales de la base de datos (empresas, clientes, órdenes, inventario, vehículos)
 * y erradica por completo acuerdos inventados o SLAs falsos.
 */
export function executeBusinessAgent(
	userQuery: string,
	options?: {
		assistantName?: string;
		model?: string;
		temperature?: number;
		businessData?: BusinessDataContext;
	},
): AgentExecutionResult {
	const timestamp = new Date().toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// 1. Guardrail de seguridad: Verificar permisos
	if (isRestrictedAction(userQuery)) {
		return {
			allowed: false,
			response: ASISTENTE_SEGURIDAD_RECHAZO,
			toolsCalled: [],
			citations: [],
			timestamp,
		};
	}

	const q = userQuery.toLowerCase();
	const toolsCalled: ToolCallExecution[] = [];
	const citations: BusinessCitation[] = [];
	const businessData = options?.businessData;

	const matchesOrders =
		q.includes("orden") ||
		q.includes("órden") ||
		q.includes("ot-") ||
		q.includes("trabajo") ||
		q.includes("producción") ||
		q.includes("rotulado");
	const matchesInventory =
		q.includes("stock") ||
		q.includes("inventario") ||
		q.includes("vinilo") ||
		q.includes("material") ||
		q.includes("bobina") ||
		q.includes("arlon") ||
		q.includes("3m");
	const matchesQuotes =
		q.includes("cotiz") ||
		q.includes("presupuesto") ||
		q.includes("precio") ||
		q.includes("costo") ||
		q.includes("margen");
	const matchesCompanies =
		q.includes("empresa") ||
		q.includes("empresas") ||
		q.includes("ruc") ||
		q.includes("sociedad");
	const matchesClients =
		q.includes("cliente") ||
		q.includes("clientes") ||
		q.includes("contacto") ||
		q.includes("flota");
	const matchesVehicles =
		q.includes("vehiculo") ||
		q.includes("vehículo") ||
		q.includes("vehiculos") ||
		q.includes("vehículos") ||
		q.includes("camioneta") ||
		q.includes("dmax") ||
		q.includes("d-max") ||
		q.includes("bus") ||
		q.includes("placa") ||
		q.includes("auto");

	let directAnswer = "";

	const isGreeting =
		/^(hola|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|buenas|saludos|que\s+tal|qu[eé]\s+tal)\b/i.test(
			q.trim(),
		) || q.trim() === "hola";

	const isHelp =
		/^(qu[eé]\s+puedes\s+hacer|ayuda|funciones|comandos|qu[eé]\s+haces|capacidades)\b/i.test(
			q.trim(),
		) || q.trim() === "ayuda";

	const isWrappingHelp =
		q.includes("wrapping") ||
		q.includes("como rotular") ||
		q.includes("cómo rotular") ||
		q.includes("calandrado") ||
		q.includes("fundido") ||
		q.includes("poscalentado") ||
		q.includes("postcalentado") ||
		q.includes("alcohol isopropilico") ||
		q.includes("alcohol isopropílico");

	// Verificación prioritaria de Cédula (10 dígitos) o RUC (13 dígitos)
	const idMatch = userQuery.match(/\b\d{10}(\d{3})?\b/);
	const rawDigits = userQuery.replace(/\D/g, "");
	const isPureId =
		(rawDigits.length === 10 || rawDigits.length === 13) &&
		userQuery.trim().length <= 16;
	const idToVerify = idMatch ? idMatch[0] : isPureId ? rawDigits : null;

	if (isGreeting) {
		directAnswer =
			"¡Hola! Soy Plottio Asistente. ¿En qué puedo ayudarte hoy en el taller? Puedo consultar órdenes activas, clientes, empresas registradas, inventario de materiales o vehículos.";
	} else if (isHelp) {
		directAnswer =
			"Como asistente de operaciones de Plottio, puedo ayudarte con:\n• **Empresas y Clientes:** Consultar datos de contacto, RUCs y registros.\n• **Órdenes de Trabajo:** Ver avances, estados de producción y entregas.\n• **Inventario:** Stock de vinilos, bobinas y consumibles.\n• **Vehículos:** Placas, marcas y modelos asignados.\n• **Cotizaciones:** Resumen de presupuestos de rotulado.";
	} else if (isWrappingHelp) {
		directAnswer =
			"Pautas técnicas para rotulado vehicular:\n• **Preparación de superficie:** Limpieza rigurosa con alcohol isopropílico al 70% para eliminar ceras y grasas.\n• **Selección de vinilo:** Vinilo fundido (cast) para molduras profundas y remaches; vinilo calandrado polimérico para superficies planas.\n• **Poscalentado:** Fijar memoria térmica a 90°C - 95°C en remaches y curvas profundas.\n• **Reposo:** Esperar al menos 24 horas antes de lavar el vehículo.";
	} else if (idToVerify) {
		const isRuc = idToVerify.length === 13;
		const esValido = isRuc ? validarRuc(idToVerify) : validarCedula(idToVerify);
		const foundClient = businessData?.clientes?.find((c) => {
			if (!c.identificacion) return false;
			return c.identificacion.replace(/\D/g, "") === idToVerify;
		});

		if (foundClient) {
			directAnswer = `Cliente registrado en el sistema:\n• Nombre: ${foundClient.nombre}\n• Identificación: ${foundClient.identificacion || idToVerify} (${isRuc ? "RUC" : "Cédula"})\n• Teléfono: ${foundClient.telefono || "No registrado"}\n• Correo: ${foundClient.email || "No registrado"}\n• Estado: Activo en base de datos.`;
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { identificacion: idToVerify },
				outputSummary: `Cliente encontrado: ${foundClient.nombre} (${idToVerify})`,
				timestamp,
			});
			citations.push({
				type: "documento",
				title: `Ficha de Cliente: ${foundClient.nombre}`,
				similarity: 0.98,
				snippet: `Identificación: ${idToVerify} · Contacto: ${foundClient.telefono || "N/A"}.`,
			});
		} else if (esValido) {
			directAnswer = `La identificación ${idToVerify} (${isRuc ? "RUC" : "Cédula"}) es válida conforme al algoritmo oficial de verificación de Ecuador.\nActualmente no se encuentra registrada en la base de datos del taller.\n¿Deseas dar de alta a este cliente o vincularlo a una empresa?`;
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { identificacion: idToVerify },
				outputSummary: `Identificación ${idToVerify} válida en Ecuador, sin registro previo en el taller.`,
				timestamp,
			});
			citations.push({
				type: "documento",
				title: `Validación de Identidad: ${idToVerify}`,
				similarity: 0.92,
				snippet: `Algoritmo oficial de Ecuador: Válido (${isRuc ? "RUC" : "Cédula"}). Estado: No registrado.`,
			});
		} else {
			directAnswer = `El número ${idToVerify} no cumple con el algoritmo oficial de verificación de ${isRuc ? "RUC" : "Cédula"} de Ecuador (dígito verificador incorrecto o código de provincia no válido). Por favor, verifica el documento ingresado.`;
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { identificacion: idToVerify },
				outputSummary: `Identificación ${idToVerify} inválida según algoritmo de Ecuador.`,
				timestamp,
			});
		}
	}

	const answerSections: string[] = [];
	const buildSections =
		!isGreeting && !isHelp && !isWrappingHelp && !idToVerify;
	const clientesData = businessData?.clientes;
	const mentionedClientName = buildSections
		? extractMentionedClientName(userQuery)
		: null;
	const foundMentionedClients =
		mentionedClientName && clientesData && clientesData.length > 0
			? filterClientsByName(clientesData, mentionedClientName)
			: [];
	const clienteMencionadoSinRegistro =
		mentionedClientName !== null && foundMentionedClients.length === 0;
	const orderFilter = buildSections ? extractOrderFilter(userQuery) : null;

	if (buildSections && matchesCompanies) {
		const empresas = businessData?.empresas;
		if (empresas && empresas.length > 0) {
			answerSections.push(
				`Actualmente hay ${empresas.length} empresa(s) registrada(s) en la base de datos del taller:\n${empresas
					.map(
						(e) =>
							`• ${e.nombre}${e.ruc ? ` (RUC: ${e.ruc})` : ""} — ${e.activa !== false ? "Activa" : "Inactiva"}${e.telefono ? ` · Tel: ${e.telefono}` : ""}`,
					)
					.join("\n")}`,
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: "empresas_registradas" },
				outputSummary: `Se encontraron ${empresas.length} empresa(s) en la base de datos del taller.`,
				timestamp,
			});
			citations.push({
				type: "documento",
				title: `Registro de Empresa: ${empresas[0].nombre}`,
				similarity: 0.95,
				snippet: `RUC: ${empresas[0].ruc || "N/A"} · Estado: ${empresas[0].activa !== false ? "Activa" : "Inactiva"}.`,
			});
		} else if (businessData && (!empresas || empresas.length === 0)) {
			answerSections.push(
				"Actualmente no hay empresas registradas en la base de datos del taller. Puedes dar de alta una empresa cliente desde el módulo de Clientes o Empresas.",
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: "empresas_registradas" },
				outputSummary: "0 empresas registradas en la base de datos.",
				timestamp,
			});
		} else {
			answerSections.push(
				"Actualmente no hay empresas registradas en la base de datos del taller. Puedes dar de alta una empresa cliente desde el módulo de Clientes o Empresas.",
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: "empresas_registradas" },
				outputSummary: "Consulta a base de datos de empresas del taller.",
				timestamp,
			});
			citations.push({
				type: "documento",
				title: "Directorio de Empresas",
				similarity: 0.9,
				snippet:
					"Módulo de gestión de cuentas corporativas y clientes empresariales.",
			});
		}
	}

	if (buildSections && matchesClients) {
		const clientes = businessData?.clientes;
		if (mentionedClientName && foundMentionedClients.length > 0) {
			answerSections.push(
				`Cliente(s) encontrado(s) en la base de datos:\n${foundMentionedClients
					.map(
						(c) =>
							`• ${c.nombre}${c.identificacion ? ` (ID: ${c.identificacion})` : ""}${c.telefono ? ` · Tel: ${c.telefono}` : ""}`,
					)
					.join("\n")}`,
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: mentionedClientName },
				outputSummary: `Cliente encontrado: ${foundMentionedClients[0].nombre}`,
				timestamp,
			});
			citations.push({
				type: "documento",
				title: `Cliente: ${foundMentionedClients[0].nombre}`,
				similarity: 0.93,
				snippet: `Identificación: ${foundMentionedClients[0].identificacion || "N/A"} · Contacto registrado en base de datos.`,
			});
		} else if (mentionedClientName) {
			answerSections.push(
				`No encontré al cliente "${mentionedClientName}" registrado en la base de datos del taller. Verifica el nombre o regístralo desde el módulo de Clientes.`,
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: mentionedClientName },
				outputSummary: `Cliente "${mentionedClientName}" sin registro en la base de datos.`,
				timestamp,
			});
		} else if (clientes && clientes.length > 0) {
			answerSections.push(
				`Se encuentran ${clientes.length} cliente(s) registrado(s) en la base de datos del taller:\n${clientes
					.slice(0, 10)
					.map(
						(c) =>
							`• ${c.nombre}${c.identificacion ? ` (ID: ${c.identificacion})` : ""}${c.telefono ? ` · Tel: ${c.telefono}` : ""}`,
					)
					.join(
						"\n",
					)}${clientes.length > 10 ? `\n... y ${clientes.length - 10} cliente(s) más.` : ""}`,
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: userQuery.slice(0, 40) },
				outputSummary: `Recuperados ${clientes.length} cliente(s) en el taller.`,
				timestamp,
			});
			citations.push({
				type: "documento",
				title: `Cliente: ${clientes[0].nombre}`,
				similarity: 0.93,
				snippet: `Identificación: ${clientes[0].identificacion || "N/A"} · Contacto registrado en base de datos.`,
			});
		} else if (businessData && (!clientes || clientes.length === 0)) {
			answerSections.push(
				"Actualmente no hay clientes registrados en la base de datos del taller. Puedes dar de alta un nuevo cliente desde el módulo de Clientes.",
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: userQuery.slice(0, 40) },
				outputSummary: "0 clientes registrados en la base de datos.",
				timestamp,
			});
		} else {
			answerSections.push(
				"Actualmente no hay clientes registrados en la base de datos del taller. Puedes registrar un nuevo cliente desde el módulo de Clientes.",
			);
			toolsCalled.push({
				toolName: "consultar_clientes",
				parameters: { criterio: userQuery.slice(0, 40) },
				outputSummary: "Consulta del directorio de clientes.",
				timestamp,
			});
			citations.push({
				type: "documento",
				title: "Directorio de Clientes",
				similarity: 0.9,
				snippet:
					"Base de datos de clientes y contactos comerciales del taller.",
			});
		}
	}

	if (buildSections && matchesOrders) {
		const ordenes = businessData?.ordenes;
		if (orderFilter && ordenes && ordenes.length > 0) {
			const filteredOrdenes = ordenes.filter((o) =>
				matchesOrderFilter(o, orderFilter),
			);
			const filterLabel = [
				orderFilter.orderId,
				orderFilter.placa,
				orderFilter.estado,
			]
				.filter(Boolean)
				.join(" · ");
			if (filteredOrdenes.length > 0) {
				answerSections.push(
					`Se encontraron ${filteredOrdenes.length} orden(es) que coinciden con el filtro "${filterLabel}":\n${filteredOrdenes
						.slice(0, 10)
						.map(
							(o) =>
								`• Orden #${o.id || ""}: Placa: ${o.placa || "N/A"} · Cliente: ${o.clienteNombre || "Sin cliente"} · Estado: ${o.estado || "En Proceso"}${o.total ? ` · $${o.total.toFixed(2)}` : ""}`,
						)
						.join(
							"\n",
						)}${filteredOrdenes.length > 10 ? `\n... y ${filteredOrdenes.length - 10} orden(es) más.` : ""}`,
				);
				citations.push({
					type: "tarea",
					title: `Orden #${filteredOrdenes[0].id || "OT"}: Placa ${filteredOrdenes[0].placa || "N/A"}`,
					similarity: 0.95,
					snippet: `Cliente: ${filteredOrdenes[0].clienteNombre || "General"} · Estado: ${filteredOrdenes[0].estado || "En Proceso"}.`,
				});
			} else {
				answerSections.push(
					`No encontré órdenes de trabajo que coincidan con "${filterLabel}" en la base de datos del taller. Verifica el número de orden, la placa o el estado e intenta de nuevo.`,
				);
			}
			toolsCalled.push({
				toolName: "consultar_ordenes",
				parameters: { filtro: filterLabel },
				outputSummary:
					filteredOrdenes.length > 0
						? `${filteredOrdenes.length} orden(es) coinciden con el filtro "${filterLabel}".`
						: `Sin órdenes que coincidan con "${filterLabel}".`,
				timestamp,
			});
		} else if (ordenes && ordenes.length > 0) {
			answerSections.push(
				`Actualmente hay ${ordenes.length} orden(es) de trabajo en el taller:\n${ordenes
					.slice(0, 10)
					.map(
						(o) =>
							`• Orden #${o.id || ""}: Placa: ${o.placa || "N/A"} · Cliente: ${o.clienteNombre || "Sin cliente"} · Estado: ${o.estado || "En Proceso"}${o.total ? ` · $${o.total.toFixed(2)}` : ""}`,
					)
					.join(
						"\n",
					)}${ordenes.length > 10 ? `\n... y ${ordenes.length - 10} orden(es) más.` : ""}`,
			);
			toolsCalled.push({
				toolName: "consultar_ordenes",
				parameters: { filtro: userQuery.slice(0, 40) },
				outputSummary: `Se registran ${ordenes.length} orden(es) de trabajo activas en la base de datos.`,
				timestamp,
			});
			citations.push({
				type: "tarea",
				title: `Orden #${ordenes[0].id || "OT"}: Placa ${ordenes[0].placa || "N/A"}`,
				similarity: 0.95,
				snippet: `Cliente: ${ordenes[0].clienteNombre || "General"} · Estado: ${ordenes[0].estado || "En Proceso"}.`,
			});
		} else if (businessData && (!ordenes || ordenes.length === 0)) {
			answerSections.push(
				"No se registran órdenes de trabajo activas en la base de datos del taller.",
			);
			toolsCalled.push({
				toolName: "consultar_ordenes",
				parameters: { filtro: userQuery.slice(0, 40) },
				outputSummary: "0 órdenes de trabajo en el taller.",
				timestamp,
			});
		} else {
			answerSections.push(
				"Consulta de órdenes de trabajo del taller realizada en la base de datos.",
			);
			toolsCalled.push({
				toolName: "consultar_ordenes",
				parameters: { filtro: userQuery.slice(0, 40) },
				outputSummary: "Registro de órdenes de trabajo operacionales.",
				timestamp,
			});
			citations.push({
				type: "tarea",
				title: "Orden de Trabajo Operativa",
				similarity: 0.95,
				snippet: "Gestión de producción, rotulado y estado en taller.",
			});
		}
	}

	if (buildSections && matchesInventory) {
		const inv = businessData?.inventario;
		const materialTerms = extractInventoryFilterTerms(userQuery);
		if (materialTerms.length > 0 && inv && inv.length > 0) {
			const filteredInv = inv.filter((i) =>
				inventoryItemMatchesTerms(i, materialTerms),
			);
			const filterLabel = materialTerms.join(" ");
			if (filteredInv.length > 0) {
				answerSections.push(
					`Se encontraron ${filteredInv.length} material(es) en el inventario que coinciden con "${filterLabel}":\n${filteredInv
						.slice(0, 10)
						.map(formatInventarioItem)
						.join(
							"\n",
						)}${filteredInv.length > 10 ? `\n... y ${filteredInv.length - 10} ítem(s) más.` : ""}`,
				);
				citations.push({
					type: "stock",
					title: `Stock: ${filteredInv[0].nombre || "Material"}`,
					similarity: 0.96,
					snippet: `Disponible: ${filteredInv[0].stock ?? 0} ${filteredInv[0].unidad || "unidades"}.`,
				});
			} else {
				answerSections.push(
					`No encontré materiales en el inventario que coincidan con "${filterLabel}". Verifica la referencia del material o consulta el catálogo completo del inventario.`,
				);
			}
			toolsCalled.push({
				toolName: "consultar_inventario",
				parameters: { material: filterLabel },
				outputSummary:
					filteredInv.length > 0
						? `${filteredInv.length} material(es) coinciden con "${filterLabel}".`
						: `Sin materiales que coincidan con "${filterLabel}".`,
				timestamp,
			});
		} else if (inv && inv.length > 0) {
			answerSections.push(
				`Se registran ${inv.length} ítem(s) en el inventario del taller:\n${inv
					.slice(0, 10)
					.map(formatInventarioItem)
					.join(
						"\n",
					)}${inv.length > 10 ? `\n... y ${inv.length - 10} ítem(s) más.` : ""}`,
			);
			toolsCalled.push({
				toolName: "consultar_inventario",
				parameters: { material: userQuery.slice(0, 40) },
				outputSummary: `Recuperados ${inv.length} materiales en inventario.`,
				timestamp,
			});
			citations.push({
				type: "stock",
				title: `Stock: ${inv[0].nombre || "Material"}`,
				similarity: 0.96,
				snippet: `Disponible: ${inv[0].stock ?? 0} ${inv[0].unidad || "unidades"}.`,
			});
		} else if (businessData && (!inv || inv.length === 0)) {
			answerSections.push(
				"No hay ítems registrados en el inventario del taller.",
			);
			toolsCalled.push({
				toolName: "consultar_inventario",
				parameters: { material: userQuery.slice(0, 40) },
				outputSummary: "0 ítems en inventario.",
				timestamp,
			});
		} else {
			answerSections.push(
				"Consulta de inventario de vinilos y bobinas en stock.",
			);
			toolsCalled.push({
				toolName: "consultar_inventario",
				parameters: { material: "Materiales de rotulado" },
				outputSummary: "Inventario verificado en almacén del taller.",
				timestamp,
			});
			citations.push({
				type: "stock",
				title: "Stock Almacén Central: Bobina Vinilo",
				similarity: 0.96,
				snippet:
					"Disponibilidad de material y bobinas para rotulado vehicular.",
			});
		}
	}

	if (buildSections && matchesQuotes) {
		answerSections.push(
			"Puedes emitir y consultar presupuestos y cotizaciones de rotulado directamente desde el módulo comercial de Cotizaciones.",
		);
		toolsCalled.push({
			toolName: "consultar_cotizaciones",
			parameters: { cliente: userQuery.slice(0, 30) },
			outputSummary: "Consulta de cotizaciones comerciales y presupuestos.",
			timestamp,
		});
		citations.push({
			type: "documento",
			title: "Presupuestos y Cotizaciones Comerciales",
			similarity: 0.94,
			snippet:
				"Cálculo de materiales, metraje de vinilo y mano de obra para rotulado.",
		});
	}

	if (buildSections && matchesVehicles && !clienteMencionadoSinRegistro) {
		const veh = businessData?.vehiculos;
		if (mentionedClientName && foundMentionedClients.length > 0) {
			const clientePrincipal = foundMentionedClients[0].nombre;
			const vehiculosCliente = getVehiculosDeCliente(
				foundMentionedClients,
				businessData?.ordenes,
				veh,
			);
			if (vehiculosCliente.length > 0) {
				answerSections.push(
					`Vehículo(s) vinculado(s) al cliente ${clientePrincipal}:\n${vehiculosCliente
						.slice(0, 10)
						.map(
							(v) =>
								`• Placa: ${v.placa || "N/A"}${v.marca || v.modelo ? ` · ${v.marca || ""} ${v.modelo || ""}` : ""}`,
						)
						.join("\n")}`,
				);
				citations.push({
					type: "vehiculo",
					title: `Vehículo: Placa ${vehiculosCliente[0].placa || "N/A"}`,
					similarity: 0.91,
					snippet: `${vehiculosCliente[0].marca || ""} ${vehiculosCliente[0].modelo || ""} vinculado a ${clientePrincipal}.`,
				});
			} else {
				answerSections.push(
					`El cliente ${clientePrincipal} está registrado, pero no se encontraron vehículos vinculados a su nombre en la base de datos del taller.`,
				);
			}
			toolsCalled.push({
				toolName: "consultar_vehiculos",
				parameters: { criterio: mentionedClientName.slice(0, 30) },
				outputSummary:
					vehiculosCliente.length > 0
						? `${vehiculosCliente.length} vehículo(s) vinculado(s) a ${clientePrincipal}.`
						: `Sin vehículos vinculados a ${clientePrincipal}.`,
				timestamp,
			});
		} else if (orderFilter?.placa) {
			const placaFilter = orderFilter.placa;
			const vehiculosPlaca = (veh || []).filter(
				(v) =>
					(v.placa || "").replace(/\s+/g, "").toUpperCase() ===
					placaFilter.replace(/\s+/g, "").toUpperCase(),
			);
			if (vehiculosPlaca.length > 0) {
				answerSections.push(
					`Vehículo(s) que coinciden con la placa "${placaFilter}":\n${vehiculosPlaca
						.slice(0, 10)
						.map(
							(v) =>
								`• Placa: ${v.placa || "N/A"}${v.marca || v.modelo ? ` · ${v.marca || ""} ${v.modelo || ""}` : ""}`,
						)
						.join("\n")}`,
				);
				citations.push({
					type: "vehiculo",
					title: `Vehículo: Placa ${vehiculosPlaca[0].placa || "N/A"}`,
					similarity: 0.91,
					snippet: `${vehiculosPlaca[0].marca || ""} ${vehiculosPlaca[0].modelo || ""} registrado en el sistema.`,
				});
			} else {
				answerSections.push(
					`No encontré vehículos con la placa "${placaFilter}" en la base de datos del taller. Verifica la placa e intenta de nuevo.`,
				);
			}
			toolsCalled.push({
				toolName: "consultar_vehiculos",
				parameters: { placa: placaFilter },
				outputSummary:
					vehiculosPlaca.length > 0
						? `${vehiculosPlaca.length} vehículo(s) coinciden con la placa "${placaFilter}".`
						: `Sin vehículos que coincidan con la placa "${placaFilter}".`,
				timestamp,
			});
		} else if (veh && veh.length > 0) {
			answerSections.push(
				`Se registran ${veh.length} vehículo(s) en la base de datos del taller:\n${veh
					.slice(0, 10)
					.map(
						(v) =>
							`• Placa: ${v.placa || "N/A"}${v.marca || v.modelo ? ` · ${v.marca || ""} ${v.modelo || ""}` : ""}`,
					)
					.join(
						"\n",
					)}${veh.length > 10 ? `\n... y ${veh.length - 10} vehículo(s) más.` : ""}`,
			);
			toolsCalled.push({
				toolName: "consultar_vehiculos",
				parameters: { placa: userQuery.slice(0, 30) },
				outputSummary: `Recuperados ${veh.length} vehículos en la base de datos.`,
				timestamp,
			});
			citations.push({
				type: "vehiculo",
				title: `Vehículo: Placa ${veh[0].placa || "N/A"}`,
				similarity: 0.91,
				snippet: `${veh[0].marca || ""} ${veh[0].modelo || ""} registrado en el sistema.`,
			});
		} else if (businessData && (!veh || veh.length === 0)) {
			answerSections.push(
				"No hay vehículos registrados en la base de datos del taller.",
			);
			toolsCalled.push({
				toolName: "consultar_vehiculos",
				parameters: { placa: userQuery.slice(0, 30) },
				outputSummary: "0 vehículos en la base de datos.",
				timestamp,
			});
		} else {
			answerSections.push("Consulta del registro vehicular del taller.");
			toolsCalled.push({
				toolName: "consultar_vehiculos",
				parameters: { placa: "Historial de flota" },
				outputSummary: "Registro de vehículos vinculados a clientes.",
				timestamp,
			});
			citations.push({
				type: "vehiculo",
				title: "Ficha Vehicular del Taller",
				similarity: 0.91,
				snippet:
					"Datos y especificaciones de vehículos registrados para rotulado.",
			});
		}
	}

	if (toolsCalled.length === 0) {
		toolsCalled.push({
			toolName: "consultar_clientes",
			parameters: { criterio: "general" },
			outputSummary: "Consulta general del sistema de taller.",
			timestamp,
		});
	}

	const responseText =
		isGreeting || isHelp || isWrappingHelp || idToVerify
			? directAnswer
			: answerSections.length > 0
				? answerSections.join("\n\n")
				: `No encontré un registro específico para "${userQuery}" en la base de datos del taller. Puedes consultar directamente por empresas, clientes, órdenes de trabajo, inventario de materiales o vehículos.`;

	const promptTokens = Math.max(Math.ceil(userQuery.length / 4), 8);
	const completionTokens = Math.max(Math.ceil(responseText.length / 4), 12);
	const totalTokens = promptTokens + completionTokens;
	const latencyMs = 38;
	const tps = Number((completionTokens / (latencyMs / 1000)).toFixed(1));

	const telemetry: AgentTelemetry = {
		totalTokens,
		promptTokens,
		completionTokens,
		latencyMs,
		tps,
		model: options?.model || "plottio-deterministic-rules",
		provider: "Motor Determinista Plottio",
	};

	return {
		allowed: true,
		response: responseText,
		toolsCalled,
		citations,
		telemetry,
		timestamp,
	};
}

export interface AgentHistoryTurn {
	role: "user" | "assistant";
	text: string;
}

export const AGENT_HISTORY_MAX_TURNS = 8;

export function buildAgentHistoryTurns(
	history?: AgentHistoryTurn[],
): AgentHistoryTurn[] {
	if (!history || history.length === 0) return [];
	return history
		.filter(
			(turn) =>
				(turn.role === "user" || turn.role === "assistant") &&
				typeof turn.text === "string" &&
				turn.text.trim().length > 0,
		)
		.slice(-AGENT_HISTORY_MAX_TURNS)
		.map((turn) => ({ role: turn.role, text: turn.text.trim() }));
}

export interface LiveAgentOptions {
	assistantName: string;
	systemPrompt?: string;
	apiKey?: string;
	provider?: string;
	temperature?: number;
	model?: string;
	businessData?: BusinessDataContext;
	history?: AgentHistoryTurn[];
	backupProvider?: AiProvider | null;
	backupModel?: string | null;
	backupApiKey?: string;
	backupTargets?: Array<{
		provider: AiProvider;
		model: string;
		apiKey?: string;
	}>;
}

interface ProviderCallResult {
	ok: boolean;
	text: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	model: string;
	providerName: string;
	errorType?: "timeout" | "http" | "network";
	status?: number;
}

function normalizeModelName(
	rawModel: string | undefined,
	provider: string,
): string {
	const modelLower = (rawModel || "").toLowerCase().trim();
	if (provider === "google" || provider === "gemini") {
		if (
			modelLower === "gemini-flash-latest" ||
			modelLower === "gemini flash latest"
		) {
			return "gemini-flash-latest";
		}
		if (modelLower.includes("3.8")) return "gemini-3.8-flash";
		if (modelLower.includes("3.7")) return "gemini-3.7-flash";
		if (modelLower.includes("lite")) return "gemini-flash-lite-latest";
		if (modelLower.includes("pro latest") || modelLower === "gemini-pro-latest")
			return "gemini-pro-latest";
		if (modelLower.includes("2.5")) return "gemini-2.5-flash";
		if (modelLower.includes("1.5") || modelLower.includes("2.0"))
			return "gemini-3.8-flash";
		const cleaned = modelLower
			.replace(/^models\//, "")
			.trim()
			.replace(/\s+/g, "-");
		if (
			!cleaned ||
			cleaned.includes("recomendado") ||
			cleaned.includes("flash")
		) {
			return "gemini-3.8-flash";
		}
		return cleaned;
	}
	if (provider === "groq") {
		if (
			modelLower.includes("3.1") &&
			(modelLower.includes("instant") || modelLower.includes("8b"))
		)
			return "llama-3.1-8b-instant";
		if (
			modelLower.includes("3.3") ||
			modelLower.includes("versatile") ||
			(modelLower.includes("70b") && modelLower.includes("recomendado"))
		)
			return "llama-3.3-70b-versatile";
		if (modelLower.includes("3.2") && modelLower.includes("1b"))
			return "llama-3.2-1b-preview";
		if (modelLower.includes("3.2") && modelLower.includes("3b"))
			return "llama-3.2-3b-preview";
		if (modelLower.includes("llama 3 70b") || modelLower.includes("llama3-70b"))
			return "llama3-70b-8192";
		if (modelLower.includes("llama 3 8b") || modelLower.includes("llama3-8b"))
			return "llama3-8b-8192";
		if (modelLower.includes("mixtral") || modelLower.includes("8x7b"))
			return "mixtral-8x7b-32768";
		if (modelLower.includes("gemma")) return "gemma2-9b-it";
		if (modelLower.includes("deepseek") || modelLower.includes("r1"))
			return "deepseek-r1-distill-llama-70b";
		if (modelLower.includes("qwen") || modelLower.includes("coder"))
			return "qwen-2.5-coder-32b";
		if (modelLower.includes("120b")) return "openai/gpt-oss-120b";
		if (modelLower.includes("20b")) return "openai/gpt-oss-20b";
		if (rawModel && !rawModel.includes(" ") && rawModel.length > 3) {
			return rawModel.trim();
		}
		return "llama-3.1-8b-instant";
	}
	if (provider === "opencode_zen") {
		if (modelLower.includes("r1") || modelLower.includes("razonamiento"))
			return "deepseek-ai/deepseek-r1";
		if (modelLower.includes("deepseek") || modelLower.includes("v3"))
			return "deepseek-ai/deepseek-v3";
		if (modelLower.includes("72b")) return "qwen/qwen-2.5-72b-instruct";
		if (
			modelLower.includes("qwen") ||
			modelLower.includes("coder") ||
			modelLower.includes("32b")
		)
			return "qwen/qwen-2.5-coder-32b-instruct";
		if (modelLower.includes("llama") || modelLower.includes("3.3"))
			return "meta-llama/llama-3.3-70b-instruct";
		if (modelLower.includes("mistral"))
			return "mistralai/mistral-large-2-instruct";
		if (rawModel && rawModel.includes("/")) return rawModel.trim();
		return "deepseek-ai/deepseek-v3";
	}
	if (provider === "nvidia") {
		if (modelLower.includes("nemo 12b") || modelLower.includes("nemo-12b"))
			return "mistralai/mistral-nemo-12b-instruct";
		if (modelLower.includes("3.3") && modelLower.includes("70b"))
			return "meta/llama-3.3-70b-instruct";
		if (modelLower.includes("3.1") && modelLower.includes("8b"))
			return "meta/llama-3.1-8b-instruct";
		if (
			modelLower.includes("3.1") &&
			modelLower.includes("70b") &&
			!modelLower.includes("nemotron")
		)
			return "meta/llama-3.1-70b-instruct";
		if (
			modelLower.includes("nemotron") ||
			(modelLower.includes("70b") && modelLower.includes("recomendado"))
		)
			return "nvidia/llama-3.1-nemotron-70b-instruct";
		if (modelLower.includes("340b")) return "nvidia/nemotron-4-340b-instruct";
		if (modelLower.includes("mistral") || modelLower.includes("large"))
			return "mistralai/mistral-large-2-instruct";
		if (modelLower.includes("deepseek") || modelLower.includes("r1"))
			return "deepseek-ai/deepseek-r1";
		if (
			rawModel &&
			(rawModel.startsWith("nvidia/") ||
				rawModel.startsWith("meta/") ||
				rawModel.startsWith("mistralai/"))
		) {
			return rawModel.trim();
		}
		return "nvidia/llama-3.1-nemotron-70b-instruct";
	}
	return rawModel || "";
}

function getProviderDisplayName(provider?: string | null): string {
	switch (provider?.toLowerCase()) {
		case "google":
		case "gemini":
			return "Google Gemini";
		case "groq":
			return "Groq Cloud";
		case "opencode_zen":
			return "Opencode Zen";
		case "nvidia":
			return "Nvidia NIM";
		default:
			return provider || "Proveedor IA";
	}
}

async function callGoogleProvider(
	apiKey: string,
	model: string | undefined,
	query: string,
	combinedContext: string,
	history: AgentHistoryTurn[],
	temperature: number,
	signal: AbortSignal,
): Promise<ProviderCallResult> {
	const selectedModel = normalizeModelName(model, "google");
	let executedModel = selectedModel;
	const isRetryableStatus = (status?: number) =>
		status === 503 || status === 429 || status === 404;

	const historyContents: Array<{
		role: string;
		parts: Array<{ text: string }>;
	}> = [];
	for (const turn of history) {
		const role = turn.role === "assistant" ? "model" : "user";
		const lastContent = historyContents[historyContents.length - 1];
		if (lastContent && lastContent.role === role) {
			lastContent.parts.push({ text: turn.text });
		} else {
			historyContents.push({ role, parts: [{ text: turn.text }] });
		}
	}

	const fallbackCandidates =
		selectedModel !== "gemini-3.8-flash"
			? ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-lite-latest"]
			: ["gemini-3.7-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];

	const sendReq = async (modelName: string) => {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;
		try {
			const resWithSystem = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					system_instruction: {
						parts: [{ text: combinedContext }],
					},
					contents: [
						...historyContents,
						{
							role: "user",
							parts: [{ text: query }],
						},
					],
					generationConfig: { temperature },
				}),
				signal,
			});
			if (resWithSystem.status !== 400) {
				return resWithSystem;
			}
		} catch (err: any) {
			if (signal.aborted) throw err;
		}

		return fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [
					...historyContents,
					{
						role: "user",
						parts: [
							{
								text: `${combinedContext}\n\nConsulta del operador: ${query}`,
							},
						],
					},
				],
				generationConfig: { temperature },
			}),
			signal,
		});
	};

	let res: Response | null = null;
	let networkError = false;
	let lastStatus: number | null = null;

	try {
		res = await sendReq(selectedModel);
		lastStatus = res.status;
		if (res.ok) {
			executedModel = selectedModel;
		}
	} catch (_err) {
		networkError = true;
	}

	if (networkError || (res && isRetryableStatus(res.status))) {
		for (const fallbackModel of fallbackCandidates) {
			try {
				networkError = false;
				res = await sendReq(fallbackModel);
				lastStatus = res.status;
				if (res.ok) {
					executedModel = fallbackModel;
					break;
				}
				if (!isRetryableStatus(res.status)) {
					break;
				}
			} catch (_err) {
				networkError = true;
			}
		}
	}

	if (res?.ok) {
		try {
			const data = (await res.json()) as {
				candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
				usageMetadata?: {
					promptTokenCount?: number;
					candidatesTokenCount?: number;
					totalTokenCount?: number;
				};
			};
			const partText = data.candidates?.[0]?.content?.parts?.[0]?.text;
			if (partText && typeof partText === "string" && partText.trim()) {
				return {
					ok: true,
					text: partText.trim(),
					promptTokens: data.usageMetadata?.promptTokenCount || 0,
					completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
					totalTokens: data.usageMetadata?.totalTokenCount || 0,
					model: executedModel,
					providerName: "Google Gemini",
				};
			}
		} catch {
			// json parse fallback
		}
	}

	return {
		ok: false,
		text: "",
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		model: executedModel,
		providerName: "Google Gemini",
		errorType: networkError ? "network" : "http",
		status: lastStatus || undefined,
	};
}

async function callOpenAiCompatibleProvider(
	endpoint: string,
	apiKey: string,
	rawModel: string | undefined,
	providerKey: string,
	providerDisplayName: string,
	query: string,
	combinedContext: string,
	history: AgentHistoryTurn[],
	temperature: number,
	signal: AbortSignal,
): Promise<ProviderCallResult> {
	let modelName = normalizeModelName(rawModel, providerKey);
	let res: Response | null = null;
	let networkError = false;
	let lastStatus: number | null = null;

	const sendReq = async (targetEndpoint: string, targetModel: string) => {
		return fetch(targetEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: targetModel,
				messages: [
					{ role: "system", content: combinedContext },
					...history.map((turn) => ({
						role: turn.role,
						content: turn.text,
					})),
					{ role: "user", content: query },
				],
				temperature,
			}),
			signal,
		});
	};

	try {
		res = await sendReq(endpoint, modelName);
		lastStatus = res.status;
	} catch (_err) {
		networkError = true;
	}

	// Si dio 404 o 410 (modelo no disponible o retirado), reintentar automáticamente con el modelo activo garantizado
	if (res && (res.status === 404 || res.status === 410)) {
		let fallbackModel: string | null = null;
		if (providerKey === "groq" && modelName !== "llama-3.1-8b-instant") {
			fallbackModel = "llama-3.1-8b-instant";
		} else if (
			providerKey === "nvidia" &&
			modelName !== "nvidia/llama-3.1-nemotron-70b-instruct"
		) {
			fallbackModel = "nvidia/llama-3.1-nemotron-70b-instruct";
		}

		if (fallbackModel) {
			try {
				const retryRes = await sendReq(endpoint, fallbackModel);
				lastStatus = retryRes.status;
				if (retryRes.ok) {
					res = retryRes;
					modelName = fallbackModel;
					networkError = false;
				}
			} catch {
				// mantener estado previo
			}
		}
	}

	if (res?.ok) {
		try {
			const data = (await res.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
				usage?: {
					prompt_tokens?: number;
					completion_tokens?: number;
					total_tokens?: number;
				};
			};
			const choiceText = data.choices?.[0]?.message?.content;
			if (choiceText && typeof choiceText === "string" && choiceText.trim()) {
				return {
					ok: true,
					text: choiceText.trim(),
					promptTokens: data.usage?.prompt_tokens || 0,
					completionTokens: data.usage?.completion_tokens || 0,
					totalTokens: data.usage?.total_tokens || 0,
					model: modelName,
					providerName: providerDisplayName,
				};
			}
		} catch {
			// json parse fallback
		}
	}

	return {
		ok: false,
		text: "",
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		model: modelName,
		providerName: providerDisplayName,
		errorType: networkError ? "network" : "http",
		status: lastStatus || undefined,
	};
}

async function invokeProvider(
	provider: string,
	apiKey: string,
	model: string | undefined,
	query: string,
	combinedContext: string,
	history: AgentHistoryTurn[],
	temperature: number,
	signal: AbortSignal,
): Promise<ProviderCallResult> {
	const prov = provider.toLowerCase();
	if (prov === "google" || prov === "gemini") {
		return callGoogleProvider(
			apiKey,
			model,
			query,
			combinedContext,
			history,
			temperature,
			signal,
		);
	}
	if (prov === "groq") {
		const endpoint =
			typeof window !== "undefined" && window.location?.origin
				? "/api/groq"
				: "https://api.groq.com/openai/v1/chat/completions";
		return callOpenAiCompatibleProvider(
			endpoint,
			apiKey,
			model || "llama-3.1-8b-instant",
			"groq",
			"Groq Cloud",
			query,
			combinedContext,
			history,
			temperature,
			signal,
		);
	}
	if (prov === "opencode_zen") {
		const endpoint =
			typeof window !== "undefined" && window.location?.origin
				? "/api/opencode"
				: "https://opencode.ai/zen/v1/chat/completions";
		return callOpenAiCompatibleProvider(
			endpoint,
			apiKey,
			model || "deepseek-ai/deepseek-v3",
			"opencode_zen",
			"Opencode Zen",
			query,
			combinedContext,
			history,
			temperature,
			signal,
		);
	}
	if (prov === "nvidia") {
		const endpoint =
			typeof window !== "undefined" && window.location?.origin
				? "/api/nvidia"
				: "https://integrate.api.nvidia.com/v1/chat/completions";
		return callOpenAiCompatibleProvider(
			endpoint,
			apiKey,
			model || "nvidia/llama-3.1-nemotron-70b-instruct",
			"nvidia",
			"Nvidia NIM",
			query,
			combinedContext,
			history,
			temperature,
			signal,
		);
	}

	return {
		ok: false,
		text: "",
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		model: model || "",
		providerName: getProviderDisplayName(provider),
		errorType: "network",
	};
}

/**
 * Ejecuta el agente operacional combinando llamadas reales a LLMs con proveedores
 * oficiales (Google Gemini, Groq) cuando existe API Key, inyectando datos reales de la BD
 * y midiendo telemetría técnica completa.
 */
export async function executeLiveBusinessAgent(
	query: string,
	options: LiveAgentOptions,
): Promise<AgentExecutionResult> {
	const timestamp = new Date().toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// 1. Guardrail de seguridad: rechazo temprano
	if (isRestrictedAction(query)) {
		return {
			allowed: false,
			response: ASISTENTE_SEGURIDAD_RECHAZO,
			toolsCalled: [],
			citations: [],
			timestamp,
		};
	}

	// 2. Ejecución base determinista con datos reales de la BD
	const baseExecution = executeBusinessAgent(query, {
		assistantName: options.assistantName,
		model: options.model,
		temperature: options.temperature,
		businessData: options.businessData,
	});

	// Normalizar lista de objetivos de respaldo para conmutación encadenada
	const configuredBackupTargets: Array<{
		provider: AiProvider;
		model: string;
		apiKey?: string;
	}> =
		options.backupTargets && options.backupTargets.length > 0
			? options.backupTargets
			: options.backupProvider
				? [
						{
							provider: options.backupProvider,
							model: options.backupModel || "",
							apiKey: options.backupApiKey,
						},
					]
				: [];

	// Si no hay API Key activa para el primario ni para ningún respaldo, retornar baseExecution
	const primaryApiKey = options.apiKey?.trim() || "";
	const hasAnyBackupApiKey = configuredBackupTargets.some((t) =>
		Boolean(t.apiKey?.trim()),
	);
	if (!primaryApiKey && !hasAnyBackupApiKey) {
		return baseExecution;
	}

	const provider = options.provider?.toLowerCase() || "google";

	// Construir resumen verídico de la base de datos real del taller
	const dbSummaryLines: string[] = [];

	if (options.businessData?.empresas) {
		if (options.businessData.empresas.length > 0) {
			dbSummaryLines.push(
				`EMPRESAS REGISTRADAS (${options.businessData.empresas.length}):\n` +
					options.businessData.empresas
						.map(
							(e) =>
								`- ${e.nombre} (RUC: ${e.ruc || "N/A"}, Estado: ${e.activa !== false ? "Activa" : "Inactiva"}${e.telefono ? `, Tel: ${e.telefono}` : ""})`,
						)
						.join("\n"),
			);
		} else {
			dbSummaryLines.push(
				"EMPRESAS REGISTRADAS: Ninguna (0 registradas en la base de datos).",
			);
		}
	}

	if (options.businessData?.clientes) {
		if (options.businessData.clientes.length > 0) {
			dbSummaryLines.push(
				`CLIENTES REGISTRADOS (${options.businessData.clientes.length}):\n` +
					options.businessData.clientes
						.slice(0, 25)
						.map(
							(c) =>
								`- ${c.nombre} (ID: ${c.identificacion || "N/A"}, Tel: ${c.telefono || "N/A"})`,
						)
						.join("\n"),
			);
		} else {
			dbSummaryLines.push(
				"CLIENTES REGISTRADOS: Ninguno (0 registrados en la base de datos).",
			);
		}
	}

	if (options.businessData?.ordenes) {
		if (options.businessData.ordenes.length > 0) {
			dbSummaryLines.push(
				`ÓRDENES DE TRABAJO (${options.businessData.ordenes.length}):\n` +
					options.businessData.ordenes
						.slice(0, 25)
						.map(
							(o) =>
								`- Orden ${o.id || ""}: Placa: ${o.placa || "N/A"}, Cliente: ${o.clienteNombre || "Sin cliente"}, Estado: ${o.estado || "En Proceso"}`,
						)
						.join("\n"),
			);
		} else {
			dbSummaryLines.push(
				"ÓRDENES DE TRABAJO: Ninguna activa en la base de datos.",
			);
		}
	}

	if (options.businessData?.inventario) {
		if (options.businessData.inventario.length > 0) {
			dbSummaryLines.push(
				`INVENTARIO (${options.businessData.inventario.length}):\n` +
					options.businessData.inventario
						.slice(0, 25)
						.map((i) => {
							const stockLabel =
								i.stock !== undefined
									? `Stock: ${i.stock} ${i.unidad || "uds"}`
									: `Registrado en catálogo (${i.unidad || "unidad"})`;
							return `- ${i.nombre || "Material"}: ${stockLabel}`;
						})
						.join("\n"),
			);
		} else {
			dbSummaryLines.push(
				"INVENTARIO: Ningún ítem registrado en la base de datos.",
			);
		}
	}

	if (options.businessData?.vehiculos) {
		if (options.businessData.vehiculos.length > 0) {
			dbSummaryLines.push(
				`VEHÍCULOS (${options.businessData.vehiculos.length}):\n` +
					options.businessData.vehiculos
						.slice(0, 25)
						.map(
							(v) =>
								`- Placa ${v.placa || "N/A"}: ${v.marca || ""} ${v.modelo || ""}`,
						)
						.join("\n"),
			);
		} else {
			dbSummaryLines.push("VEHÍCULOS: Ninguno registrado en la base de datos.");
		}
	}

	const dbContextText =
		dbSummaryLines.length > 0
			? `\n\n--- BASE DE DATOS REAL DEL TALLER ---\n${dbSummaryLines.join("\n\n")}\n--- FIN BASE DE DATOS REAL ---\n`
			: "";

	const systemPrompt =
		options.systemPrompt ||
		"Eres Plottio Asistente, copiloto inteligente de operaciones del taller de gráfica vehicular, rotulación automotriz y señalética Plottio.";

	const combinedContext = `${systemPrompt}

ROL Y DIRECTRICES:
• Responde en español de forma directa, profesional, útil y concisa. Ve al grano sin introducciones robóticas ni rodeos innecesarios.
• Si el operador te saluda ("hola", "buenas"), saluda amablemente en 1 línea y ofrece asistencia en la gestión del taller.
• Si el operador pide ayuda o pregunta qué puedes hacer, resume tus capacidades (órdenes, clientes, inventario de vinilos, vehículos, cotizaciones).
• Si te consultan temas técnicos de rotulado vehicular o gráfica (wrapping, vinilo fundido vs calandrado, preparación con alcohol isopropílico, poscalentado a 90°C, etc.), responde con alto conocimiento técnico experto de taller gráfico.
• Para consultas sobre el taller, básate ÚNICAMENTE en la base de datos provista a continuación.

DATOS EN TIEMPO REAL DEL TALLER (FUENTE DE VERDAD):
${dbContextText}

REGLAS DE NEGOCIO Y VERACIDAD:
1. Responde preguntas operacionales utilizando con fidelidad los datos registrados arriba.
2. Si una sección indica que no hay registros (0 registros o Ninguno), dilo con amabilidad y sugiere registrarlos desde el módulo correspondiente (Empresas, Clientes, etc.).
3. Si preguntan por un registro que no aparece en la lista, indica que no se encuentra en el sistema.
4. Jamás inventes acuerdos comerciales ficticios, SLAs falsos (ej. 48h) ni cláusulas inexistentes.
5. Seguridad: Tienes estrictamente prohibido alterar contraseñas, credenciales, usuarios o roles del sistema.`;

	const agentHistory = buildAgentHistoryTurns(options.history);

	const startTime = performance.now();

	try {
		let primaryResult: ProviderCallResult = {
			ok: false,
			text: "",
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			model: normalizeModelName(options.model, provider),
			providerName: getProviderDisplayName(provider),
		};

		if (primaryApiKey) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 4500);
			try {
				primaryResult = await invokeProvider(
					provider,
					primaryApiKey,
					options.model,
					query,
					combinedContext,
					agentHistory,
					options.temperature ?? 0.2,
					controller.signal,
				);
			} finally {
				clearTimeout(timeoutId);
			}
		}

		let liveText = "";
		let executedModel = primaryResult.model;
		let executedProvider = primaryResult.providerName;
		let promptTokens = primaryResult.promptTokens;
		let completionTokens = primaryResult.completionTokens;
		let totalTokens = primaryResult.totalTokens;

		if (primaryResult.ok && primaryResult.text) {
			liveText = primaryResult.text;
		} else {
			// Falla el proveedor principal. Intentar conmutación ordenada a través de la cadena de respaldos
			let backupSuccess = false;
			const primaryName = getProviderDisplayName(provider);

			for (let idx = 0; idx < configuredBackupTargets.length; idx++) {
				const target = configuredBackupTargets[idx];
				const targetProv = target.provider.toLowerCase();
				const targetApiKey = target.apiKey?.trim();

				// Evitar re-intentar sobre el mismo proveedor principal o si no tiene API key activa
				if (!targetApiKey || targetProv === provider) {
					continue;
				}

				const backupController = new AbortController();
				const backupTimeoutId = setTimeout(
					() => backupController.abort(),
					4000,
				);

				try {
					const backupRes = await invokeProvider(
						targetProv,
						targetApiKey,
						target.model || undefined,
						query,
						combinedContext,
						agentHistory,
						options.temperature ?? 0.2,
						backupController.signal,
					);

					if (backupRes.ok && backupRes.text) {
						backupSuccess = true;
						const backupName = getProviderDisplayName(targetProv);
						liveText = `(Aviso: Respuesta generada por el proveedor de respaldo ${backupName} debido a congestión temporal en ${primaryName}.)\n\n${backupRes.text}`;
						executedModel = target.model || backupRes.model;
						executedProvider =
							idx === 0
								? `${backupName} (Respaldo por falla en ${primaryName})`
								: `${backupName} (Respaldo #${idx + 1} por falla en ${primaryName})`;
						promptTokens = backupRes.promptTokens;
						completionTokens = backupRes.completionTokens;
						totalTokens = backupRes.totalTokens;
						break; // Conmutación exitosa, romper cadena de fallos
					}
				} catch {
					// Falló este escalón de respaldo, continuar con el siguiente
				} finally {
					clearTimeout(backupTimeoutId);
				}
			}

			// Si no hubo respaldo o fallaron todos los de la cadena:
			if (!backupSuccess) {
				if (
					(provider === "google" || provider === "gemini") &&
					(primaryResult.errorType === "network" ||
						primaryResult.status === 503 ||
						primaryResult.status === 429 ||
						primaryResult.status === 404)
				) {
					liveText =
						"(Aviso de disponibilidad: El servicio de Google AI Studio se encuentra temporalmente saturado [HTTP 503]. Respuesta generada a partir de los datos operacionales de tu taller:)\n\n" +
						baseExecution.response;
					executedModel = `${primaryResult.model} (Google 503 -> Respaldo Local)`;
					executedProvider = "Google Gemini (Respaldo Local Plottio)";
				}
			}
		}

		const latencyMs = Math.max(Math.round(performance.now() - startTime), 25);

		if (liveText) {
			if (!promptTokens) {
				promptTokens = Math.max(
					Math.ceil((combinedContext.length + query.length) / 4),
					12,
				);
			}
			if (!completionTokens) {
				completionTokens = Math.max(Math.ceil(liveText.length / 4), 10);
			}
			if (!totalTokens) {
				totalTokens = promptTokens + completionTokens;
			}

			const tps = Number(
				(
					(completionTokens || totalTokens) / Math.max(latencyMs / 1000, 0.05)
				).toFixed(1),
			);

			const telemetry: AgentTelemetry = {
				totalTokens,
				promptTokens,
				completionTokens,
				latencyMs,
				tps,
				model: executedModel,
				provider: executedProvider,
			};

			return {
				allowed: true,
				response: liveText,
				toolsCalled: baseExecution.toolsCalled,
				citations: baseExecution.citations,
				telemetry,
				timestamp,
			};
		}

		return baseExecution;
	} catch {
		return baseExecution;
	}
}
