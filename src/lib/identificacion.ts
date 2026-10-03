const COEFICIENTES_CEDULA = [2, 1, 2, 1, 2, 1, 2, 1, 2];
const COEFICIENTES_SOCIEDAD_PRIVADA = [4, 3, 2, 7, 6, 5, 4, 3, 2];
const COEFICIENTES_SOCIEDAD_PUBLICA = [3, 2, 7, 6, 5, 4, 3, 2];

export type TipoIdentificacion =
	| "CEDULA"
	| "RUC_NATURAL"
	| "RUC_PRIVADA"
	| "RUC_PUBLICA";

const soloDigitos = (valor: string): boolean => /^\d+$/.test(valor);

const validarProvincia = (codigo: string): boolean => {
	const provincia = Number(codigo.slice(0, 2));
	return (provincia >= 1 && provincia <= 24) || provincia === 30;
};

export const validarCedula = (cedula: string): boolean => {
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

export const validarRuc = (ruc: string): boolean => {
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

export const obtenerTipoIdentificacion = (
	valor: string,
): TipoIdentificacion | null => {
	if (validarCedula(valor)) return "CEDULA";
	if (validarRuc(valor)) {
		const d3 = Number(valor[2]);
		if (d3 <= 5) return "RUC_NATURAL";
		if (d3 === 6) return "RUC_PUBLICA";
		if (d3 === 9) return "RUC_PRIVADA";
	}
	return null;
};

export const validarIdentificacion = (
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
