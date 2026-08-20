const COEFICIENTES_CEDULA = [2, 1, 2, 1, 2, 1, 2, 1, 2];

const soloDigitos = (valor: string): boolean => /^\d+$/.test(valor);

export const validarCedula = (cedula: string): boolean => {
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

export const validarRuc = (ruc: string): boolean => {
	if (!soloDigitos(ruc) || ruc.length !== 13) return false;
	if (ruc.slice(-3) !== "001") return false;
	return validarCedula(ruc.slice(0, 10));
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
