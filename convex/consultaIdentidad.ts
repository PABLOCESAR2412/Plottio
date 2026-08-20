import { v } from "convex/values";
import { action } from "./_generated/server";

const SRI_ESTABLECIMIENTO =
	"https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Establecimiento/consultarPorNumeroRuc?numeroRuc=";
const SRI_CONSOLIDADO =
	"https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?ruc=";
const TDUCARGO = "https://tducargo.info/ajax/consultar_cedula.php";

const BROWSER_HEADERS = {
	Accept: "application/json",
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

const COEFICIENTES_CEDULA = [2, 1, 2, 1, 2, 1, 2, 1, 2];

const soloDigitos = (valor: string): boolean => /^\d+$/.test(valor);

const validarCedula = (cedula: string): boolean => {
	if (!soloDigitos(cedula) || cedula.length !== 10) return false;

	const digitos = cedula.split("").map(Number);
	let suma = 0;
	for (let i = 0; i < 9; i++) {
		let producto = digitos[i] * COEFICIENTES_CEDULA[i];
		if (producto >= 10) producto = Math.floor(producto / 10) + (producto % 10);
		suma += producto;
	}

	const digitoVerificador = (10 - (suma % 10)) % 10;
	return digitos[9] === digitoVerificador;
};

const validarRuc = (ruc: string): boolean => {
	if (!soloDigitos(ruc) || ruc.length !== 13) return false;
	if (ruc.slice(-3) !== "001") return false;
	return validarCedula(ruc.slice(0, 10));
};

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15000);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: BROWSER_HEADERS,
			...init,
		});
		if (!res.ok) return null;
		const text = await res.text();
		if (!text) return null;
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

const texto = (valor: unknown): string =>
	typeof valor === "string" ? valor.trim() : "";

export const consultarIdentidad = action({
	args: { numero: v.string() },
	handler: async (_ctx, args): Promise<{
		encontrado: boolean;
		nombres: string;
		direccion: string;
		identificacion: string;
		fuente: string;
	}> => {
		const numero = args.numero.trim();

		if (!soloDigitos(numero))
			throw new Error("Solo se permiten números.");
		if (numero.length !== 10 && numero.length !== 13)
			throw new Error("La cédula debe tener 10 dígitos y el RUC 13 dígitos.");

		const cedula = numero.length === 10 ? numero : numero.slice(0, 10);
		const ruc = numero.length === 13 ? numero : `${numero}001`;

		if (!validarCedula(cedula) || !validarRuc(ruc))
			throw new Error("La cédula o el RUC es incorrecto.");

		// 1) SRI (solo RUC): establecimientos (dirección matriz) + consolidado (razón social)
		const [establecimientos, consolidados] = await Promise.all([
			fetchJson(`${SRI_ESTABLECIMIENTO}${ruc}`),
			fetchJson(`${SRI_CONSOLIDADO}${ruc}`),
		]);

		let nombres = "";
		let direccion = "";

		if (Array.isArray(consolidados) && consolidados.length > 0) {
			const data = consolidados[0] as Record<string, unknown>;
			nombres = texto(data.razonSocial);
			if (texto(data.tipoContribuyente) === "PERSONA NATURAL") {
				const partes = nombres.split(/\s+/);
				if (partes.length === 4) {
					nombres = `${partes[2]} ${partes[3]} ${partes[0]} ${partes[1]}`;
				}
			}
		}

		if (Array.isArray(establecimientos) && establecimientos.length > 0) {
			const esMatriz = (e: Record<string, unknown>) =>
				e.matriz === true || e.matriz === "SI";
			const matriz = establecimientos.find(
				(e) => esMatriz(e as Record<string, unknown>),
			) as Record<string, unknown> | undefined;
			const escogido = matriz ?? (establecimientos[0] as Record<string, unknown>);
			direccion = texto(escogido.direccionCompleta);
		}

		if (nombres) {
			return {
				encontrado: true,
				nombres,
				direccion,
				identificacion: numero,
				fuente: "SRI",
			};
		}

		// 2) tducargo: primero con el RUC (13) y luego con la cédula (10)
		for (const valor of [ruc, cedula]) {
			const body = new URLSearchParams({ cedula: valor });
			const data = await fetchJson(TDUCARGO, {
				method: "POST",
				headers: {
					...BROWSER_HEADERS,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: body.toString(),
			});

			if (data && typeof data === "object") {
				const obj = data as Record<string, unknown>;
				const nombreCompleto =
					`${texto(obj.apellido)} ${texto(obj.nombre)}`.trim();
				if (nombreCompleto) {
					return {
						encontrado: true,
						nombres: nombreCompleto,
						direccion: "",
						identificacion: numero,
						fuente: "tducargo",
					};
				}
			}
		}

		return {
			encontrado: false,
			nombres: "",
			direccion: "",
			identificacion: numero,
			fuente: "",
		};
	},
});