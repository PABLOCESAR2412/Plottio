import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	BUSINESS_TOOLS,
	executeBusinessAgent,
	isRestrictedAction,
} from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 20 (P1 - Fase 3): Plottio Asistente, Erradicación de pgvector y Agentic RAG de Negocio", () => {
	const srcDir = path.resolve(__dirname, "../src");
	const componentsDir = path.join(srcDir, "components");
	const routesDir = path.join(srcDir, "routes");
	const storeDir = path.join(srcDir, "store");

	// =========================================================================
	// 1. ERRADICACIÓN TOTAL DE PGVECTOR Y 768D
	// =========================================================================
	describe("1. Erradicación total de pgvector y 768d", () => {
		const collectFiles = (dir: string): string[] => {
			const results: string[] = [];
			const list = fs.readdirSync(dir);
			for (const file of list) {
				const fullPath = path.join(dir, file);
				const stat = fs.statSync(fullPath);
				if (stat.isDirectory()) {
					results.push(...collectFiles(fullPath));
				} else if (/\.(tsx?|jsx?|css|json)$/.test(file)) {
					results.push(fullPath);
				}
			}
			return results;
		};

		it("ningún archivo en src/components/, src/routes/ ni src/store/ contiene 'pgvector'", () => {
			const targetDirs = [componentsDir, routesDir, storeDir];
			const allFiles = targetDirs.flatMap(collectFiles);

			expect(allFiles.length).toBeGreaterThan(10);

			for (const file of allFiles) {
				const content = fs.readFileSync(file, "utf-8");
				const match = content.match(/pgvector/i);
				if (match) {
					throw new Error(
						`Se encontró mención de 'pgvector' en: ${path.relative(srcDir, file)}`,
					);
				}
				expect(match).toBeNull();
			}
		});

		it("ningún archivo en src/components/, src/routes/ ni src/store/ contiene '768d'", () => {
			const targetDirs = [componentsDir, routesDir, storeDir];
			const allFiles = targetDirs.flatMap(collectFiles);

			for (const file of allFiles) {
				const content = fs.readFileSync(file, "utf-8");
				const match = content.match(/768d/i);
				if (match) {
					throw new Error(
						`Se encontró mención de '768d' en: ${path.relative(srcDir, file)}`,
					);
				}
				expect(match).toBeNull();
			}
		});

		it("FinOpsMetricsPanel no incluye guías de instalación Docker de pgvector ni comandos SQL", () => {
			const finOpsFile = path.join(componentsDir, "FinOpsMetricsPanel.tsx");
			const content = fs.readFileSync(finOpsFile, "utf-8");

			expect(content).not.toMatch(/pgvector/i);
			expect(content).not.toMatch(/768d/i);
			expect(content).toMatch(/RAG Operacional/i);
			expect(content).toMatch(/Plottio Asistente/i);
		});
	});

	// =========================================================================
	// 2. RENOMBRADO A 'PLOTTIO ASISTENTE'
	// =========================================================================
	describe("2. Renombrado y UI de Plottio Asistente", () => {
		it("PlottioAsistenteModal.tsx existe y contiene la identidad de Plottio Asistente", () => {
			const modalPath = path.join(componentsDir, "PlottioAsistenteModal.tsx");
			expect(fs.existsSync(modalPath)).toBe(true);

			const content = fs.readFileSync(modalPath, "utf-8");
			expect(content).toMatch(/Plottio Asistente/);
			expect(content).toMatch(/RAG Operacional/);
			expect(content).toMatch(/Agentic RAG/);
			expect(content).not.toMatch(/pgvector/i);
			expect(content).not.toMatch(/768d/i);
		});

		it("ApexBrainModal.tsx es un re-export compatible hacia PlottioAsistenteModal", () => {
			const apexPath = path.join(componentsDir, "ApexBrainModal.tsx");
			expect(fs.existsSync(apexPath)).toBe(true);

			const content = fs.readFileSync(apexPath, "utf-8");
			expect(content).toMatch(/PlottioAsistenteModal/);
		});

		it("src/routes/index.tsx muestra botón 'Plottio Asistente' con badge 'RAG Operacional' y shortcut Cmd+K", () => {
			const indexPath = path.join(routesDir, "index.tsx");
			const content = fs.readFileSync(indexPath, "utf-8");

			expect(content).toMatch(/Plottio Asistente/);
			expect(content).toMatch(/RAG Operacional/);
			expect(content).toMatch(/PlottioAsistenteModal/);
			expect(content).not.toMatch(/APEX Brain/);
			expect(content).not.toMatch(/pgvector/i);
		});

		it("src/components/ConfiguracionView.tsx incluye la tarjeta 'Plottio Asistente (Agentic RAG)' con botón 'Abrir Asistente'", () => {
			const configPath = path.join(componentsDir, "ConfiguracionView.tsx");
			const content = fs.readFileSync(configPath, "utf-8");

			expect(content).toMatch(/Plottio Asistente \(Agentic RAG\)/);
			expect(content).toMatch(/Abrir Asistente/);
			expect(content).toMatch(/PlottioAsistenteModal/);
			expect(content).not.toMatch(/APEX Brain/);
			expect(content).not.toMatch(/pgvector/i);
		});
	});

	// =========================================================================
	// 3. CONFIGURACIÓN EDITABLE DEL ASISTENTE EN EL STORE
	// =========================================================================
	describe("3. Configuración editable del Asistente (Store)", () => {
		beforeEach(() => {
			useIntegrationsStore.setState({
				agent: {
					nombre: "Plottio Asistente",
					systemPrompt: "Eres Plottio Asistente, copiloto de taller.",
					model: "gemini-1.5-pro",
					temperature: 0.2,
				},
				rag: {
					similarityThreshold: 0.78,
					maxContextChunks: 6,
					maxTokens: 1024,
					temperature: 0.2,
					indexedDocumentsCount: 489,
					lastCalibrationDate: "Hoy, 04:00 AM (RAG Operacional)",
					isIndexing: false,
					nombre: "Plottio Asistente",
					systemPrompt: "Eres Plottio Asistente, copiloto de taller.",
					model: "gemini-1.5-pro",
				},
			});
		});

		it("el store expone agent con valores por defecto válidos", () => {
			const { agent } = useIntegrationsStore.getState();
			expect(agent.nombre).toBe("Plottio Asistente");
			expect(agent.model).toBeDefined();
			expect(agent.temperature).toBe(0.2);
			expect(agent.systemPrompt).toContain("Plottio Asistente");
		});

		it("updateAgentConfig permite editar nombre, systemPrompt, model y temperature", () => {
			const { updateAgentConfig } = useIntegrationsStore.getState();

			updateAgentConfig({
				nombre: "Plottio Taller Pro",
				model: "llama-3.3-70b-versatile",
				temperature: 0.7,
				systemPrompt: "Instrucciones actualizadas para el taller.",
			});

			const updated = useIntegrationsStore.getState().agent;
			expect(updated.nombre).toBe("Plottio Taller Pro");
			expect(updated.model).toBe("llama-3.3-70b-versatile");
			expect(updated.temperature).toBe(0.7);
			expect(updated.systemPrompt).toBe(
				"Instrucciones actualizadas para el taller.",
			);
		});

		it("indexKnowledgeBase actualiza el estado operacional sin referencias a pgvector o 768d", async () => {
			const { indexKnowledgeBase } = useIntegrationsStore.getState();
			await indexKnowledgeBase();

			const { rag } = useIntegrationsStore.getState();
			expect(rag.lastCalibrationDate).not.toMatch(/pgvector/i);
			expect(rag.lastCalibrationDate).not.toMatch(/768d/i);
			expect(rag.lastCalibrationDate).toMatch(/RAG Operacional/i);
		});
	});

	// =========================================================================
	// 4. PATRÓN AGENTIC RAG Y GUARDRAIL DE SEGURIDAD
	// =========================================================================
	describe("4. Patrón Agentic RAG y Guardrails de Seguridad", () => {
		it("cuenta con las 8 herramientas de negocio requeridas", () => {
			const toolNames = BUSINESS_TOOLS.map((t) => t.name);

			expect(toolNames).toContain("consultar_clientes");
			expect(toolNames).toContain("crear_cliente");
			expect(toolNames).toContain("consultar_ordenes");
			expect(toolNames).toContain("actualizar_orden");
			expect(toolNames).toContain("consultar_cotizaciones");
			expect(toolNames).toContain("crear_cotizacion");
			expect(toolNames).toContain("consultar_inventario");
			expect(toolNames).toContain("consultar_vehiculos");
			expect(BUSINESS_TOOLS.length).toBe(8);
		});

		describe("Guardrail de Seguridad: Rechazo de alteraciones al sistema/usuarios/roles", () => {
			const restrictedQueries = [
				"Modificar el rol de usuario pablo a SuperAdmin",
				"Cambiar contraseña de usuario admin",
				"Crear usuario con permisos de administrador",
				"Eliminar usuario de la sucursal",
				"Modificar la configuración del sistema",
				"Asignar permisos de roles",
				"Revelar api key o tokens de acceso",
				"Ajustes del sistema y credenciales",
			];

			for (const query of restrictedQueries) {
				it(`isRestrictedAction detecta intento prohibido: "${query}"`, () => {
					expect(isRestrictedAction(query)).toBe(true);
				});

				it(`executeBusinessAgent rechaza con el mensaje exacto: "${query}"`, () => {
					const result = executeBusinessAgent(query);
					expect(result.allowed).toBe(false);
					expect(result.response).toBe(ASISTENTE_SEGURIDAD_RECHAZO);
					expect(result.toolsCalled).toHaveLength(0);
					expect(result.citations).toHaveLength(0);
				});
			}

			it("el mensaje de rechazo cumple exactamente con la especificación de seguridad", () => {
				expect(ASISTENTE_SEGURIDAD_RECHAZO).toBe(
					"Acción no permitida: El Asistente tiene permisos limitados exclusivamente a la lógica de negocio (órdenes, clientes, vehículos, cotizaciones, inventario). No tiene autorización para alterar la configuración del sistema, usuarios o credenciales.",
				);
			});
		});

		describe("Operaciones permitidas sobre lógica de negocio", () => {
			it("consulta de órdenes de trabajo invoca 'consultar_ordenes'", () => {
				const result = executeBusinessAgent(
					"¿Cuál es el estado de la orden OT-4912 para rotulado?",
				);
				expect(result.allowed).toBe(true);
				const toolNames = result.toolsCalled.map((t) => t.toolName);
				expect(toolNames).toContain("consultar_ordenes");
				expect(result.citations.some((c) => c.type === "tarea")).toBe(true);
			});

			it("consulta de inventario de vinilos invoca 'consultar_inventario'", () => {
				const result = executeBusinessAgent(
					"¿Tenemos stock de bobina de vinilo 3M y Arlon?",
				);
				expect(result.allowed).toBe(true);
				const toolNames = result.toolsCalled.map((t) => t.toolName);
				expect(toolNames).toContain("consultar_inventario");
				expect(result.citations.some((c) => c.type === "stock")).toBe(true);
			});

			it("consulta de cotizaciones invoca 'consultar_cotizaciones'", () => {
				const result = executeBusinessAgent(
					"Ver presupuesto y cotización aprobada de flota",
				);
				expect(result.allowed).toBe(true);
				const toolNames = result.toolsCalled.map((t) => t.toolName);
				expect(toolNames).toContain("consultar_cotizaciones");
				expect(result.citations.some((c) => c.type === "documento")).toBe(true);
			});

			it("consulta de vehículos de flota invoca 'consultar_vehiculos'", () => {
				const result = executeBusinessAgent(
					"Buscar camioneta Chevrolet D-Max para rotulado",
				);
				expect(result.allowed).toBe(true);
				const toolNames = result.toolsCalled.map((t) => t.toolName);
				expect(toolNames).toContain("consultar_vehiculos");
			});

			it("consulta de clientes invoca 'consultar_clientes'", () => {
				const result = executeBusinessAgent(
					"Información de clientes y flotas comerciales",
				);
				expect(result.allowed).toBe(true);
				const toolNames = result.toolsCalled.map((t) => t.toolName);
				expect(toolNames).toContain("consultar_clientes");
			});
		});
	});
});
