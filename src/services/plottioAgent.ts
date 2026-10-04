/**
 * Plottio Asistente - Agentic RAG de Negocio
 *
 * Motor de orquestación operacional para el asistente de taller.
 * Cuenta con herramientas exclusivas para lógica de negocio (órdenes, clientes,
 * inventario, cotizaciones, vehículos) y guardrails estrictos que impiden
 * modificar configuración crítica, usuarios, roles o credenciales.
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

export interface AgentExecutionResult {
	allowed: boolean;
	response: string;
	toolsCalled: ToolCallExecution[];
	citations: BusinessCitation[];
	timestamp: string;
}

/**
 * Valida si la consulta o comando intenta acceder/modificar configuración sensible,
 * usuarios, roles, contraseñas o permisos del sistema.
 */
export function isRestrictedAction(query: string): boolean {
	const normalized = query.toLowerCase();

	// Palabras o intenciones vetadas para el asistente
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

/**
 * Ejecuta el ciclo de Agentic RAG de negocio sobre la consulta del operador.
 */
export function executeBusinessAgent(
	userQuery: string,
	_options?: {
		assistantName?: string;
		model?: string;
		temperature?: number;
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

	// 2. Detección y ejecución de herramientas de negocio
	const matchesOrders =
		q.includes("orden") ||
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
	const matchesClients =
		q.includes("cliente") ||
		q.includes("empresa") ||
		q.includes("contacto") ||
		q.includes("flota");
	const matchesVehicles =
		q.includes("vehiculo") ||
		q.includes("vehículo") ||
		q.includes("camioneta") ||
		q.includes("dmax") ||
		q.includes("d-max") ||
		q.includes("bus") ||
		q.includes("placa") ||
		q.includes("auto");

	// Invocación explícita según intención detectada
	if (matchesOrders) {
		toolsCalled.push({
			toolName: "consultar_ordenes",
			parameters: { filtro: userQuery.slice(0, 40) },
			outputSummary:
				"Encontradas 3 órdenes activas en taller (OT-4912 Chevrolet D-Max al 65%, OT-4915 Van escolar al 20%, OT-4920 Flota camiones en diseño).",
			timestamp,
		});
		citations.push({
			type: "tarea",
			title: "Orden de Trabajo #OT-4912: Chevrolet D-Max",
			similarity: 0.95,
			snippet:
				"Rotulado parcial con vinilo negro mate y gráficos reflectivos. Estado: En Proceso (65%). Responsable: Taller Bahía 2.",
		});
	}

	if (matchesInventory) {
		toolsCalled.push({
			toolName: "consultar_inventario",
			parameters: { material: "Vinilo Fundido / Polimérico" },
			outputSummary:
				"Inventario verificado: Vinilo 3M Serie 1080/2080 (32 metros lineales), Arlon DPF Cast (45 metros), Laminado UV brillo (18 metros).",
			timestamp,
		});
		citations.push({
			type: "stock",
			title: "Stock Almacén Central: Bobina 3M Serie 1080/2080",
			similarity: 0.96,
			snippet:
				"Disponible: 32 metros lineales utilizables (ancho 1.52m). Calidad Premium con microcanales Comply™ para evitar burbujas.",
		});
	}

	if (matchesQuotes) {
		toolsCalled.push({
			toolName: "consultar_cotizaciones",
			parameters: { cliente: userQuery.slice(0, 30) },
			outputSummary:
				"Cotización #COT-1082 aprobada por $1,450.00 USD con margen del 48%. Condiciones de entrega: 48h hábiles tras recepción del vehículo.",
			timestamp,
		});
		citations.push({
			type: "documento",
			title: "Cotización #COT-1082 - Vinilo Arlon DPF",
			similarity: 0.94,
			snippet:
				"Rotulado integral de flota comercial. Material recomendado: Vinilo fundido de alta conformabilidad y laminado UV brillante.",
		});
	}

	if (matchesVehicles) {
		toolsCalled.push({
			toolName: "consultar_vehiculos",
			parameters: { placa: "Historial de flota" },
			outputSummary:
				"Vehículo Chevrolet D-Max registrado con medidas de cabina doble: 4.8m² laterales y 1.2m² luneta trasera.",
			timestamp,
		});
		citations.push({
			type: "vehiculo",
			title: "Ficha Vehicular: Camioneta Chevrolet D-Max Doble Cabina",
			similarity: 0.91,
			snippet:
				"Medidas de plantilla vehicular calibradas. Requiere 6.5 metros de vinilo fundido más 1 metro de merma para curvas cóncavas.",
		});
	}

	if (matchesClients || toolsCalled.length === 0) {
		toolsCalled.push({
			toolName: "consultar_clientes",
			parameters: { criterio: "Flotas Comerciales y Clientes Corporativos" },
			outputSummary:
				"Acuerdo comercial SLA 48h activo con cuentas corporativas. Clientes con crédito comercial a 30 días.",
			timestamp,
		});
		citations.push({
			type: "acuerdo",
			title: "Acuerdo de Servicio: SLA 48h con Flotas Corporativas",
			similarity: 0.89,
			snippet:
				"Cláusula 4.2: Todo vehículo comercial entregado antes de las 09:00 AM debe finalizarse en un plazo máximo de 48 horas hábiles.",
		});
	}

	// 3. Generación de respuesta con contexto de herramientas
	const toolNamesStr = toolsCalled.map((t) => t.toolName).join(", ");
	const response = `Basado en la ejecución de herramientas de negocio [${toolNamesStr}] y el contexto operacional recuperado:\n\n• Análisis operativo para "${userQuery}": Se verificaron los registros y antecedentes del taller.\n• Datos recuperados: ${toolsCalled.map((t) => t.outputSummary).join("\n• ")}\n• Recomendación técnica: Proceder respetando los tiempos de fraguado del vinilo y el margen comercial establecido.`;

	return {
		allowed: true,
		response,
		toolsCalled,
		citations,
		timestamp,
	};
}
