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
const COEFICIENTES_SOCIEDAD_PRIVADA = [4, 3, 2, 7, 6, 5, 4, 3, 2];
const COEFICIENTES_SOCIEDAD_PUBLICA = [3, 2, 7, 6, 5, 4, 3, 2];

const soloDigitos = (valor: string): boolean => /^\d+$/.test(valor);

const validarProvincia = (codigo: string): boolean => {
	const provincia = Number(codigo.slice(0, 2));
	return (provincia >= 1 && provincia <= 24) || provincia === 30;
};

const validarCedula = (cedula: string): boolean => {
	if (!soloDigitos(cedula) || cedula.length !== 10) return false;
	if (!validarProvincia(cedula)) return false;

	const tercerDigito = Number(cedula[2]);
	if (tercerDigito < 0 || tercerDigito > 5) return false;

	const digitos = cedula.split("").map(Number);
	let suma = 0;
	for (let i = 0; i < 9; i++) {
		let producto = digitos[i] * COEFICIENTES_CEDULA[i];
		if (producto >= 10) producto -= 9;
		suma += producto;
	}

	const digitoVerificador = (10 - (suma % 10)) % 10;
	return digitos[9] === digitoVerificador;
};

const validarRuc = (ruc: string): boolean => {
	if (!soloDigitos(ruc) || ruc.length !== 13) return false;
	if (!validarProvincia(ruc)) return false;

	const tercerDigito = Number(ruc[2]);
	const digitos = ruc.split("").map(Number);

	// 1. Persona Natural (3er dígito 0 a 5)
	if (tercerDigito >= 0 && tercerDigito <= 5) {
		const establecimiento = ruc.slice(10);
		if (Number(establecimiento) < 1) return false;
		return validarCedula(ruc.slice(0, 10));
	}

	// 2. Sociedad Pública (3er dígito 6)
	if (tercerDigito === 6) {
		const establecimiento = ruc.slice(9);
		if (Number(establecimiento) < 1) return false;

		let suma = 0;
		for (let i = 0; i < 8; i++) {
			suma += digitos[i] * COEFICIENTES_SOCIEDAD_PUBLICA[i];
		}

		const residuo = suma % 11;
		const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
		if (digitoVerificador === 10) return false;

		return digitos[8] === digitoVerificador;
	}

	// 3. Sociedad Privada o Extranjero sin cédula (3er dígito 9)
	if (tercerDigito === 9) {
		const establecimiento = ruc.slice(10);
		if (Number(establecimiento) < 1) return false;

		let suma = 0;
		for (let i = 0; i < 9; i++) {
			suma += digitos[i] * COEFICIENTES_SOCIEDAD_PRIVADA[i];
		}

		const residuo = suma % 11;
		const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
		if (digitoVerificador === 10) return false;

		return digitos[9] === digitoVerificador;
	}

	return false;
};

const validarIdentificacion = (
	valor: string,
): { valida: boolean; mensaje: string } => {
	if (!valor) return { valida: false, mensaje: "" };
	if (!soloDigitos(valor))
		return {
			valida: false,
			mensaje: "Solo se permiten números.",
		};
	if (valor.length !== 10 && valor.length !== 13)
		return {
			valida: false,
			mensaje: "La cédula debe tener 10 dígitos y el RUC 13 dígitos.",
		};
	if (valor.length === 10 && !validarCedula(valor))
		return {
			valida: false,
			mensaje: "La cédula es incorrecta (dígito verificador inválido).",
		};
	if (valor.length === 13 && !validarRuc(valor))
		return {
			valida: false,
			mensaje: "El RUC es incorrecto.",
		};
	return { valida: true, mensaje: "" };
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
		nombreFantasiaComercial: string;
		fuente: string;
	}> => {
		const numero = args.numero.trim();

		const validacion = validarIdentificacion(numero);
		if (!validacion.valida) {
			throw new Error(validacion.mensaje || "La cédula o el RUC es incorrecto.");
		}

		const esCedula = numero.length === 10;
		const tercerDigito = Number(numero[2]);
		const esRucNatural =
			numero.length === 13 && tercerDigito >= 0 && tercerDigito <= 5;
		const cedula = esCedula ? numero : esRucNatural ? numero.slice(0, 10) : "";
		const ruc = esCedula ? `${numero}001` : numero;

		// 1) SRI (solo RUC): establecimientos (dirección matriz) + consolidado (razón social)
		const [establecimientos, consolidados] = await Promise.all([
			fetchJson(`${SRI_ESTABLECIMIENTO}${ruc}`),
			fetchJson(`${SRI_CONSOLIDADO}${ruc}`),
		]);

		let nombres = "";
		let direccion = "";
		let nombreFantasiaComercial = "";

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
			nombreFantasiaComercial = texto(escogido.nombreFantasiaComercial);
		}

		if (nombres) {
			return {
				encontrado: true,
				nombres,
				direccion,
				identificacion: numero,
				nombreFantasiaComercial,
				fuente: "SRI",
			};
		}

		// 2) tducargo: primero con el RUC (13) y luego con la cédula (10 si aplica)
		const candidatos = cedula ? [ruc, cedula] : [ruc];
		for (const valor of candidatos) {
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
						nombreFantasiaComercial: "",
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
			nombreFantasiaComercial: "",
			fuente: "",
		};
	},
});