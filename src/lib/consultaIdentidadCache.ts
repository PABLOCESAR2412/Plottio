const CACHE_KEY = "plottio.consultaIdentidad.v1";
const MAX_ENTRIES = 200;

export type ResultadoConsulta = {
	encontrado: boolean;
	nombres: string;
	direccion: string;
	identificacion: string;
	fuente: string;
};

const leerCache = (): [string, ResultadoConsulta][] => {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		const parsed = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(parsed)
			? (parsed as [string, ResultadoConsulta][])
			: [];
	} catch {
		return [];
	}
};

export const consultarCacheIdentidad = (
	numero: string,
): ResultadoConsulta | null => {
	const entrada = leerCache().find(([n]) => n === numero);
	return entrada ? entrada[1] : null;
};

export const guardarCacheIdentidad = (
	numero: string,
	resultado: ResultadoConsulta,
): void => {
	try {
		const cache = leerCache().filter(([n]) => n !== numero);
		const nuevo = [[numero, resultado], ...cache] as [
			string,
			ResultadoConsulta,
		][];
		localStorage.setItem(
			CACHE_KEY,
			JSON.stringify(nuevo.slice(0, MAX_ENTRIES)),
		);
	} catch {
		// ignorar errores de almacenamiento
	}
};
