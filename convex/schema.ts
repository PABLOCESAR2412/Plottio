import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  empresas: defineTable({
    nombre: v.string(),
    ruc: v.string(),
    razonSocial: v.string(),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    activa: v.boolean(),
  }).index("by_ruc", ["ruc"]),

  sucursales: defineTable({
    empresaId: v.id("empresas"),
    nombre: v.string(),
    ruc: v.optional(v.string()),
    direccion: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    gerenteTelefono: v.optional(v.string()),
    activa: v.boolean(),
    esMatriz: v.boolean(),
  }).index("by_empresa", ["empresaId"]),

  puntosVenta: defineTable({
    sucursalId: v.id("sucursales"),
    nombre: v.string(),
    codigo: v.string(),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    gerenteNombre: v.optional(v.string()),
    horarioApertura: v.optional(v.string()),
    horarioCierre: v.optional(v.string()),
    activo: v.boolean(),
  }).index("by_sucursal", ["sucursalId"]),

  usuarios: defineTable({
    nombre: v.string(),
    email: v.string(),
    rol: v.string(),
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
    pvId: v.optional(v.id("puntosVenta")),
    activo: v.boolean(),
    // Campos de Invitación / Auth
    invitationToken: v.optional(v.string()),
    invitationAccepted: v.optional(v.boolean()),
    password: v.optional(v.string())
  }).index("by_empresa", ["empresaId"]).index("by_sucursal", ["sucursalId"]).index("by_email", ["email"]),

  clientes: defineTable({
    nombre: v.string(),
    telefono: v.string(),
    email: v.string(),
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
    esClienteGlobal: v.boolean(),
    direccion: v.optional(v.string()),
    identificacion: v.optional(v.string()),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]).searchIndex("search_nombre", { searchField: "nombre", filterFields: ["empresaId", "sucursalId"] }),

  vehiculos: defineTable({
    placa: v.string(),
    categoria: v.string(),
    marca: v.string(),
    modelo: v.string(),
    anio: v.string(),
    numeroSerie: v.string(),
    propietarioId: v.string(), // Can be cliente or empresa ID
    propietarioTipo: v.string(),
    estado: v.string(),
    servicios: v.optional(v.array(v.object({
      id: v.string(),
      fecha: v.string(),
      descripcion: v.string(),
      costo: v.number(),
      estado: v.string(),
    }))),
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]).searchIndex("search_placa", { searchField: "placa", filterFields: ["empresaId", "sucursalId"] }),

  cotizaciones: defineTable({
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    vehiculoTipo: v.string(),
    items: v.array(v.object({
      servicioId: v.optional(v.id("catalogoServicios")),
      descripcion: v.string(),
      cantidad: v.number(),
      precioUnitario: v.number(),
      placa: v.optional(v.object({
        material: v.string(), // 'acrilico' | 'lona'
        ancho_cm: v.optional(v.number()),
        alto_cm: v.optional(v.number()),
        contenido_texto: v.optional(v.string()),
        ubicacion_instalacion: v.optional(v.string())
      })),
      vehiculoId: v.optional(v.id("vehiculos"))
    })),
    total: v.number(),
    estado: v.string(),
    fecha: v.string(),
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
    pvId: v.optional(v.id("puntosVenta")),
    creadoPorUsuarioId: v.optional(v.id("usuarios")),
    esGrupoFlota: v.optional(v.boolean()),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]),

  ordenesTrabajo: defineTable({
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    placa: v.string(),
    vehiculoTipo: v.string(),
    items: v.array(v.object({
      descripcion: v.string(),
      cantidad: v.number(),
      precioUnitario: v.number(),
      completado: v.boolean()
    })),
    total: v.number(),
    prioridad: v.string(),
    progreso: v.number(),
    estado: v.string(),
    fechaInicio: v.string(),
    fechaFin: v.string(),
    notas: v.array(v.string()),
    fotos: v.array(v.string()),
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
    pvOrigen: v.optional(v.string()),
    asignadoAUsuarioId: v.optional(v.id("usuarios")),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]).searchIndex("search_cliente", { searchField: "clienteNombre", filterFields: ["empresaId", "sucursalId"] }),

  auditoria: defineTable({
    empresaId: v.id("empresas"),
    usuarioId: v.optional(v.id("usuarios")),
    tablaAfectada: v.string(),
    accion: v.string(),
    registroId: v.string(),
    cambios: v.any(),
    ipAddress: v.optional(v.string()),
    fecha: v.string(),
    sucursalId: v.optional(v.id("sucursales")),
  }).index("by_empresa", ["empresaId"]),

  citas: defineTable({
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    vehiculoPlaca: v.string(),
    servicio: v.string(),
    fecha: v.string(),
    hora: v.string(),
    estado: v.string(), // "Confirmada" | "Pendiente" | "Cancelada"
    empresaId: v.optional(v.id("empresas")),
    sucursalId: v.optional(v.id("sucursales")),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]).index("by_fecha", ["fecha"]),

  // --- FASE 2: ROLES Y PERMISOS ---

  roles: defineTable({
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    empresaId: v.optional(v.id("empresas")),
    activo: v.boolean(),
    fechaCreacion: v.string(),
  }).index("by_nombre", ["nombre"]).index("by_empresa", ["empresaId"]),

  permisos: defineTable({
    nombre: v.string(),
    clave: v.optional(v.string()),
    modulo: v.string(),
    accion: v.string(),
    descripcion: v.optional(v.string()),
    fechaCreacion: v.string(),
  }).index("by_nombre", ["nombre"]).index("by_modulo", ["modulo"]).index("by_clave", ["clave"]),

  rolePermisos: defineTable({
    roleId: v.id("roles"),
    permisoId: v.id("permisos"),
    fechaAsignacion: v.string(),
  }).index("by_role", ["roleId"]).index("by_permiso", ["permisoId"]),

  usuariosRolesSucursal: defineTable({
    usuarioId: v.id("usuarios"),
    roleId: v.id("roles"),
    sucursalId: v.id("sucursales"),
    fechaAsignacion: v.string(),
    fechaExpiracion: v.optional(v.string()),
    activo: v.boolean(),
  }).index("by_usuario", ["usuarioId"]).index("by_sucursal", ["sucursalId"]).index("by_role", ["roleId"]),

  // --- FASE 6: INVENTARIO DISTRIBUIDO ---

  inventarioItems: defineTable({
    empresaId: v.id("empresas"),
    nombre: v.string(),
    tipo: v.optional(v.string()), // numero, letra, cinta, etc
    descripcion: v.optional(v.string()),
    costoUnitario: v.number(),
    unidadMedida: v.string(),
    activo: v.boolean(),
    fechaCreacion: v.string()
  }).index("by_empresa", ["empresaId"]),

  inventarioSucursal: defineTable({
    sucursalId: v.id("sucursales"),
    itemId: v.id("inventarioItems"),
    cantidad: v.number(),
    cantidadMinima: v.number(),
    ultimaActualizacion: v.string()
  }).index("by_sucursal", ["sucursalId"]).index("by_item", ["itemId"]).index("by_sucursal_item", ["sucursalId", "itemId"]),

  movimientosInventario: defineTable({
    sucursalId: v.id("sucursales"),
    itemId: v.id("inventarioItems"),
    tipoMovimiento: v.string(), // ENTRADA, SALIDA, TRANSFERENCIA_SALIDA, TRANSFERENCIA_ENTRADA
    cantidad: v.number(),
    concepto: v.string(),
    ordenId: v.optional(v.string()),
    usuarioId: v.optional(v.id("usuarios")),
    sucursalOrigen: v.optional(v.id("sucursales")),
    sucursalDestino: v.optional(v.id("sucursales")),
    fecha: v.string()
  }).index("by_sucursal", ["sucursalId"]).index("by_item", ["itemId"]).index("by_fecha", ["fecha"]),

  // --- FASE 10: LOTES DE PRODUCCIÓN (PLACAS) ---
  lotesProduccion: defineTable({
    empresaId: v.id("empresas"),
    sucursalId: v.id("sucursales"),
    clienteId: v.optional(v.id("clientes")),
    cotizacionId: v.optional(v.id("cotizaciones")),
    numero: v.string(),
    estado: v.string(), // 'En Producción' | 'Terminado' | 'Parcialmente Asignado' | 'Agotado'
    notas: v.optional(v.string()),
    creadoPorUsuarioId: v.optional(v.id("usuarios")),
    fechaCreacion: v.string(),
    fechaActualizacion: v.string(),
  }).index("by_empresa_sucursal", ["empresaId", "sucursalId"]).index("by_cliente", ["clienteId"]).index("by_estado", ["estado"]),

  placasStock: defineTable({
    loteId: v.id("lotesProduccion"),
    material: v.string(), // 'acrilico' | 'lona'
    ancho_cm: v.optional(v.number()),
    alto_cm: v.optional(v.number()),
    contenido_texto: v.optional(v.string()),
    estado: v.string(), // 'Disponible' | 'Asignada' | 'Instalada' | 'Dañada'
    ordenTrabajoId: v.optional(v.id("ordenesTrabajo")),
    vehiculoId: v.optional(v.id("vehiculos")),
    fechaAsignacion: v.optional(v.string()),
    fechaCreacion: v.string(),
  }).index("by_lote", ["loteId"]).index("by_estado", ["estado"]).index("by_vehiculo", ["vehiculoId"]),

  // --- FASE 12: KITS DE FLOTA ---
  kitsFlota: defineTable({
    empresaId: v.id("empresas"),
    clienteId: v.optional(v.id("clientes")),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    activo: v.boolean(),
    items: v.array(v.object({
      servicioId: v.id("catalogoServicios"),
      cantidad_por_unidad: v.number(),
      precio_unitario: v.optional(v.number()),
      notas: v.optional(v.string())
    })),
    fechaCreacion: v.string()
  }).index("by_empresa", ["empresaId"]).index("by_cliente", ["clienteId"]),

  // --- FASE 9: CATÁLOGO Y PLACAS ---
  catalogoServicios: defineTable({
    empresaId: v.id("empresas"),
    nombre: v.string(),
    categoria: v.string(),
    precioBase: v.number(),
    activo: v.boolean(),
    fechaCreacion: v.string(),
  }).index("by_empresa", ["empresaId"]).index("by_categoria", ["categoria"]),

  // --- REPORTES DE BUGS ---
  bugs: defineTable({
    titulo: v.string(),
    descripcion: v.string(),
    tipo: v.string(),
    importancia: v.string(),
    ruta: v.string(),
    fecha: v.string(),
    hora: v.string(),
    usuarioId: v.id("usuarios"),
    usuarioNombre: v.string(),
    sucursalId: v.optional(v.id("sucursales")),
    empresaId: v.id("empresas"),
    imagenes: v.array(v.string()),
    estado: v.string(),
    comentarios: v.array(v.object({
      id: v.string(),
      autorId: v.id("usuarios"),
      autorNombre: v.string(),
      texto: v.string(),
      fecha: v.string(),
      hora: v.string(),
    })),
  }).index("by_empresa", ["empresaId"]).index("by_estado", ["estado"]),

  // --- PLANTILLAS DE PRECIOS Y CATEGORÍAS DE VEHÍCULOS ---
  plantillasPrecios: defineTable({
    empresaId: v.id("empresas"),
    categoriaVehiculo: v.string(),
    concepto: v.string(),
    precioSugerido: v.number(),
  }).index("by_empresa", ["empresaId"]).index("by_categoria", ["categoriaVehiculo"]),

  categoriasPrecios: defineTable({
    empresaId: v.id("empresas"),
    nombre: v.string(),
  }).index("by_empresa", ["empresaId"]),

  // --- NOTIFICACIONES IN-APP ---
  notificaciones: defineTable({
    usuarioId: v.id("usuarios"),
    empresaId: v.id("empresas"),
    tipo: v.string(), // 'cita' | 'orden' | 'cotizacion' | 'sistema'
    titulo: v.string(),
    mensaje: v.string(),
    leida: v.boolean(),
    enlace: v.optional(v.string()),
    fecha: v.string(),
  }).index("by_usuario", ["usuarioId"]).index("by_empresa", ["empresaId"]).index("by_usuario_leida", ["usuarioId", "leida"]),

  // --- MIGRACIONES DE ESQUEMA (versionado) ---
  migrations: defineTable({
    nombre: v.string(),
    aplicadaEn: v.string(),
  }).index("by_nombre", ["nombre"]),

});
