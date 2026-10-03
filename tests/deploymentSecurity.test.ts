import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Tarea 14: Remoción de vulnerabilidad XSS en TanStack Start y dependencias SSR zombi", () => {
	const packageJsonPath = path.resolve(__dirname, "../package.json");
	const packageLockPath = path.resolve(__dirname, "../package-lock.json");
	const bunLockPath = path.resolve(__dirname, "../bun.lock");

	it("package.json no contiene @tanstack/react-start, @tanstack/react-router-ssr-query ni nitro", () => {
		expect(fs.existsSync(packageJsonPath)).toBe(true);
		const rawContent = fs.readFileSync(packageJsonPath, "utf-8");
		const pkg = JSON.parse(rawContent);

		const allDeps = {
			...pkg.dependencies,
			...pkg.devDependencies,
		};

		expect(allDeps).not.toHaveProperty("@tanstack/react-start");
		expect(allDeps).not.toHaveProperty("@tanstack/react-router-ssr-query");
		expect(allDeps).not.toHaveProperty("nitro");

		expect(rawContent).not.toContain("@tanstack/react-start");
		expect(rawContent).not.toContain("@tanstack/react-router-ssr-query");
		expect(rawContent).not.toMatch(/"nitro"\s*:/);
	});

	it("package-lock.json no contiene @tanstack/react-start ni paquetes Start asociados", () => {
		expect(fs.existsSync(packageLockPath)).toBe(true);
		const rawLock = fs.readFileSync(packageLockPath, "utf-8");
		const lock = JSON.parse(rawLock);

		const rootDeps = lock.packages?.[""]?.dependencies || {};
		expect(rootDeps).not.toHaveProperty("@tanstack/react-start");
		expect(rootDeps).not.toHaveProperty("@tanstack/react-router-ssr-query");
		expect(rootDeps).not.toHaveProperty("nitro");

		expect(lock.packages).not.toHaveProperty("node_modules/@tanstack/react-start");
		expect(lock.packages).not.toHaveProperty("node_modules/@tanstack/react-start-client");
		expect(lock.packages).not.toHaveProperty("node_modules/@tanstack/react-start-server");

		expect(rawLock).not.toContain("@tanstack/react-start");
	});

	it("bun.lock no contiene @tanstack/react-start", () => {
		if (fs.existsSync(bunLockPath)) {
			const rawBunLock = fs.readFileSync(bunLockPath, "utf-8");
			expect(rawBunLock).not.toContain("@tanstack/react-start");
			expect(rawBunLock).not.toContain("@tanstack/react-router-ssr-query");
		}
	});

	it("mantiene las dependencias SPA oficiales de TanStack Router cliente", () => {
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
		expect(pkg.dependencies).toHaveProperty("@tanstack/react-router");
		expect(pkg.dependencies).toHaveProperty("@tanstack/router-plugin");
		expect(pkg.dependencies).toHaveProperty("@tanstack/react-query");
	});
});
