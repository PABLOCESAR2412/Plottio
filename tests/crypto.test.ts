import { describe, expect, it } from "vitest";
import {
	generateSecureToken,
	hashPassword,
	isBcryptHash,
	verifyPassword,
} from "../convex/lib/crypto";

describe("lib/crypto", () => {
	it("isBcryptHash detecta hashes bcrypt", () => {
		expect(isBcryptHash("$2a$10$abcdefghijklmnopqrstuv")).toBe(true);
		expect(isBcryptHash("$2b$10$xxxxxxxxxxxxxxxxxxxxxx")).toBe(true);
		expect(isBcryptHash("plaintext-legacy")).toBe(false);
		expect(isBcryptHash("")).toBe(false);
	});

	it("hashPassword produce un hash bcrypt verificable", async () => {
		const hash = await hashPassword("mi-clave-123");
		expect(isBcryptHash(hash)).toBe(true);
		expect(await verifyPassword("mi-clave-123", hash)).toBe(true);
		expect(await verifyPassword("otra-clave", hash)).toBe(false);
	});

	it("generateSecureToken devuelve un token no vacío y único", () => {
		const a = generateSecureToken();
		const b = generateSecureToken();
		expect(a.length).toBeGreaterThan(0);
		expect(a).not.toBe(b);
	});
});