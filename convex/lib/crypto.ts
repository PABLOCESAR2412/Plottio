import bcrypt from "bcryptjs";

/**
 * Hashea una contraseña en texto plano usando bcrypt.
 * Costo: 10 rounds (suficiente para 2026; ajustar si los servidores mejoran).
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * Verifica que la contraseña coincida con el hash almacenado.
 * Usa comparación constante en tiempo.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Detecta si una cadena parece un hash bcrypt (empieza con $2a$, $2b$, etc.)
 * Sirve para migración suave desde el esquema legacy de texto plano.
 */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

/**
 * Genera un token criptográficamente seguro para invitaciones.
 * Usa crypto.randomUUID() del runtime (disponible en Node 19+ y Convex).
 */
export function generateSecureToken(): string {
  // UUID v4 es lo suficientemente aleatorio para tokens de un solo uso.
  return crypto.randomUUID();
}