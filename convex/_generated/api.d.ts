/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditoria from "../auditoria.js";
import type * as auth from "../auth.js";
import type * as bugs from "../bugs.js";
import type * as catalogoServicios from "../catalogoServicios.js";
import type * as citas from "../citas.js";
import type * as clientes from "../clientes.js";
import type * as cotizaciones from "../cotizaciones.js";
import type * as emails from "../emails.js";
import type * as inventario from "../inventario.js";
import type * as kitsFlota from "../kitsFlota.js";
import type * as lib_auditoria from "../lib/auditoria.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lotesProduccion from "../lotesProduccion.js";
import type * as migrations_0001_normalizar_usuarios from "../migrations/0001_normalizar_usuarios.js";
import type * as migrations_index from "../migrations/index.js";
import type * as notificaciones from "../notificaciones.js";
import type * as ordenes from "../ordenes.js";
import type * as organizacion from "../organizacion.js";
import type * as permisos from "../permisos.js";
import type * as placasStock from "../placasStock.js";
import type * as plantillas from "../plantillas.js";
import type * as reportes from "../reportes.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as usuarios from "../usuarios.js";
import type * as vehiculos from "../vehiculos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditoria: typeof auditoria;
  auth: typeof auth;
  bugs: typeof bugs;
  catalogoServicios: typeof catalogoServicios;
  citas: typeof citas;
  clientes: typeof clientes;
  cotizaciones: typeof cotizaciones;
  emails: typeof emails;
  inventario: typeof inventario;
  kitsFlota: typeof kitsFlota;
  "lib/auditoria": typeof lib_auditoria;
  "lib/crypto": typeof lib_crypto;
  lotesProduccion: typeof lotesProduccion;
  "migrations/0001_normalizar_usuarios": typeof migrations_0001_normalizar_usuarios;
  "migrations/index": typeof migrations_index;
  notificaciones: typeof notificaciones;
  ordenes: typeof ordenes;
  organizacion: typeof organizacion;
  permisos: typeof permisos;
  placasStock: typeof placasStock;
  plantillas: typeof plantillas;
  reportes: typeof reportes;
  roles: typeof roles;
  seed: typeof seed;
  usuarios: typeof usuarios;
  vehiculos: typeof vehiculos;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
