import { describe, expect, it } from "vitest";
import {
	obtenerTipoIdentificacion,
	validarCedula,
	validarIdentificacion,
	validarRuc,
} from "../src/lib/identificacion";

describe("Validación de Cédula Ecuatoriana (Módulo 10)", () => {
	it("debe validar correctamente cédulas válidas", () => {
		expect(validarCedula("1710034065")).toBe(true); // Pichincha
		expect(validarCedula("0926620956")).toBe(true); // Guayas
		expect(validarCedula("3000000012")).toBe(true); // Ecuatoriano en el exterior (provincia 30)
	});

	it("debe rechazar cédulas con longitud distinta a 10 dígitos", () => {
		expect(validarCedula("171003406")).toBe(false); // 9 dígitos
		expect(validarCedula("17100340650")).toBe(false); // 11 dígitos
		expect(validarCedula("")).toBe(false);
	});

	it("debe rechazar cédulas que contengan caracteres no numéricos", () => {
		expect(validarCedula("171003406A")).toBe(false);
		expect(validarCedula("171003-406")).toBe(false);
		expect(validarCedula(" 1710034065")).toBe(false);
	});

	it("debe rechazar cédulas con códigos de provincia fuera de rango", () => {
		expect(validarCedula("0010034065")).toBe(false); // Provincia 00
		expect(validarCedula("2510034065")).toBe(false); // Provincia 25
		expect(validarCedula("2910034065")).toBe(false); // Provincia 29
		expect(validarCedula("3110034065")).toBe(false); // Provincia 31
		expect(validarCedula("9910034065")).toBe(false); // Provincia 99
	});

	it("debe rechazar cédulas cuyo 3er dígito no esté entre 0 y 5", () => {
		expect(validarCedula("1760034065")).toBe(false); // 3er dígito 6
		expect(validarCedula("1770034065")).toBe(false); // 3er dígito 7
		expect(validarCedula("1780034065")).toBe(false); // 3er dígito 8
		expect(validarCedula("1790034065")).toBe(false); // 3er dígito 9
	});

	it("debe rechazar cédulas con dígito verificador incorrecto", () => {
		expect(validarCedula("1710034064")).toBe(false);
		expect(validarCedula("0926620950")).toBe(false);
	});
});

describe("Validación de RUC Ecuatoriano", () => {
	describe("Persona Natural (3er dígito 0 a 5, Módulo 10)", () => {
		it("debe aceptar RUCs válidos de personas naturales terminando en 001", () => {
			expect(validarRuc("1710034065001")).toBe(true);
			expect(validarRuc("0926620956001")).toBe(true);
		});

		it("debe aceptar RUCs válidos con establecimientos mayores a 001", () => {
			expect(validarRuc("1710034065002")).toBe(true);
			expect(validarRuc("1710034065010")).toBe(true);
		});

		it("debe rechazar RUC si el establecimiento es 000", () => {
			expect(validarRuc("1710034065000")).toBe(false);
		});

		it("debe rechazar si la cédula base es inválida", () => {
			expect(validarRuc("1710034064001")).toBe(false);
			expect(validarRuc("2510034065001")).toBe(false);
		});
	});

	describe("Sociedad Privada o Extranjero sin cédula (3er dígito 9, Módulo 11)", () => {
		it("debe aceptar RUCs de sociedades privadas válidos", () => {
			expect(validarRuc("1790016919001")).toBe(true); // Caso SRI ejemplo
			expect(validarRuc("1790010937001")).toBe(true); // Banco Pichincha
		});

		it("debe aceptar RUC con residuo 0 (dígito verificador 0)", () => {
			expect(validarRuc("1790000060001")).toBe(true);
		});

		it("debe aceptar RUC con establecimiento mayor a 001", () => {
			expect(validarRuc("1790016919002")).toBe(true);
		});

		it("debe rechazar RUC privado si el establecimiento es 000", () => {
			expect(validarRuc("1790016919000")).toBe(false);
		});

		it("debe rechazar RUC privado con dígito verificador incorrecto", () => {
			expect(validarRuc("1790016918001")).toBe(false);
			expect(validarRuc("1790016910001")).toBe(false);
		});

		it("debe rechazar RUC privado con provincia inválida", () => {
			expect(validarRuc("0090016919001")).toBe(false);
			expect(validarRuc("2590016919001")).toBe(false);
		});
	});

	describe("Sociedad Pública (3er dígito 6, Módulo 11)", () => {
		it("debe aceptar RUCs de instituciones públicas válidos", () => {
			expect(validarRuc("1760001550001")).toBe(true); // Caso SRI ejemplo
			expect(validarRuc("1768153530001")).toBe(true); // EP Petroecuador
		});

		it("debe aceptar RUC público con residuo 0 (dígito verificador 0)", () => {
			expect(validarRuc("1760000900001")).toBe(true);
		});

		it("debe aceptar RUC público con establecimiento mayor a 0001", () => {
			expect(validarRuc("1760001550002")).toBe(true);
		});

		it("debe rechazar RUC público si el establecimiento es 0000", () => {
			expect(validarRuc("1760001550000")).toBe(false);
		});

		it("debe rechazar RUC público con dígito verificador incorrecto", () => {
			expect(validarRuc("1760001540001")).toBe(false);
			expect(validarRuc("1760001560001")).toBe(false);
		});

		it("debe rechazar RUC público con provincia inválida", () => {
			expect(validarRuc("0060001550001")).toBe(false);
			expect(validarRuc("2560001550001")).toBe(false);
		});
	});

	describe("RUC - Casos generales inválidos", () => {
		it("debe rechazar RUCs con 3er dígito no asignado (7 u 8)", () => {
			expect(validarRuc("1770001550001")).toBe(false);
			expect(validarRuc("1780001550001")).toBe(false);
		});

		it("debe rechazar RUCs con longitud distinta a 13 dígitos", () => {
			expect(validarRuc("179001691900")).toBe(false); // 12 dígitos
			expect(validarRuc("17900169190011")).toBe(false); // 14 dígitos
			expect(validarRuc("")).toBe(false);
		});

		it("debe rechazar RUCs con caracteres alfanuméricos o espacios", () => {
			expect(validarRuc("179001691900A")).toBe(false);
			expect(validarRuc("1790016919-01")).toBe(false);
			expect(validarRuc(" 1790016919001")).toBe(false);
		});
	});
});

describe("obtenerTipoIdentificacion", () => {
	it("debe clasificar correctamente el tipo de identificación", () => {
		expect(obtenerTipoIdentificacion("1710034065")).toBe("CEDULA");
		expect(obtenerTipoIdentificacion("1710034065001")).toBe("RUC_NATURAL");
		expect(obtenerTipoIdentificacion("1790016919001")).toBe("RUC_PRIVADA");
		expect(obtenerTipoIdentificacion("1760001550001")).toBe("RUC_PUBLICA");
		expect(obtenerTipoIdentificacion("12345")).toBeNull();
		expect(obtenerTipoIdentificacion("1790016918001")).toBeNull();
	});
});

describe("validarIdentificacion", () => {
	it("debe retornar válido para cédula válida", () => {
		const res = validarIdentificacion("1710034065");
		expect(res.valida).toBe(true);
		expect(res.mensaje).toBe("");
	});

	it("debe retornar válido para RUC natural, privado y público válidos", () => {
		expect(validarIdentificacion("1710034065001")).toEqual({
			valida: true,
			mensaje: "",
		});
		expect(validarIdentificacion("1790016919001")).toEqual({
			valida: true,
			mensaje: "",
		});
		expect(validarIdentificacion("1760001550001")).toEqual({
			valida: true,
			mensaje: "",
		});
	});

	it("debe validar string vacío", () => {
		expect(validarIdentificacion("")).toEqual({
			valida: false,
			mensaje: "",
		});
	});

	it("debe reportar error cuando contiene caracteres no numéricos", () => {
		expect(validarIdentificacion("171003406a")).toEqual({
			valida: false,
			mensaje: "Solo se permiten números.",
		});
	});

	it("debe reportar error cuando la longitud no es 10 ni 13", () => {
		expect(validarIdentificacion("171003406")).toEqual({
			valida: false,
			mensaje: "La cédula debe tener 10 dígitos y el RUC 13 dígitos.",
		});
		expect(validarIdentificacion("171003406501")).toEqual({
			valida: false,
			mensaje: "La cédula debe tener 10 dígitos y el RUC 13 dígitos.",
		});
	});

	it("debe reportar error específico de cédula incorrecta", () => {
		expect(validarIdentificacion("1710034064")).toEqual({
			valida: false,
			mensaje: "La cédula es incorrecta (dígito verificador inválido).",
		});
	});

	it("debe reportar error específico de RUC incorrecto", () => {
		expect(validarIdentificacion("1790016918001")).toEqual({
			valida: false,
			mensaje: "El RUC es incorrecto.",
		});
		expect(validarIdentificacion("1760001540001")).toEqual({
			valida: false,
			mensaje: "El RUC es incorrecto.",
		});
		expect(validarIdentificacion("1710034064001")).toEqual({
			valida: false,
			mensaje: "El RUC es incorrecto.",
		});
	});
});
