-- 2.1 CREAR TABLAS DE ROLES Y PERMISOS

-- A) Tabla roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_nombre ON roles(nombre);
CREATE INDEX idx_roles_empresa ON roles(empresa_id);

-- B) Tabla permisos
CREATE TABLE permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  modulo VARCHAR(50),
  accion VARCHAR(50),
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permisos_nombre ON permisos(nombre);
CREATE INDEX idx_permisos_modulo ON permisos(modulo);

-- C) Tabla role_permisos (relación M:M)
CREATE TABLE role_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_role_permiso UNIQUE(role_id, permiso_id)
);

CREATE INDEX idx_role_permisos_role ON role_permisos(role_id);
CREATE INDEX idx_role_permisos_permiso ON role_permisos(permiso_id);

-- D) Tabla usuarios_roles_sucursal
CREATE TABLE usuarios_roles_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP,
  activo BOOLEAN DEFAULT true,
  CONSTRAINT unique_usuario_rol_sucursal UNIQUE(usuario_id, role_id, sucursal_id)
);

CREATE INDEX idx_usuarios_roles_sucursal_usuario ON usuarios_roles_sucursal(usuario_id);
CREATE INDEX idx_usuarios_roles_sucursal_sucursal ON usuarios_roles_sucursal(sucursal_id);
CREATE INDEX idx_usuarios_roles_sucursal_role ON usuarios_roles_sucursal(role_id);

-- 2.2 INSERTAR ROLES BASE
INSERT INTO roles (nombre, descripcion, empresa_id) 
VALUES 
  ('Super Admin', 'Acceso total a todas las sucursales y funcionalidades', NULL),
  ('Admin Sucursal', 'Administra una sucursal específica', NULL),
  ('Gerente PV', 'Gestiona un punto de venta', NULL),
  ('Cotizador', 'Crea cotizaciones y clientes', NULL),
  ('Instalador', 'Ejecuta órdenes de trabajo', NULL),
  ('Contador', 'Acceso a reportes financieros', NULL);

-- 2.3 INSERTAR PERMISOS BASE
INSERT INTO permisos (nombre, modulo, accion, descripcion) 
VALUES 
  ('ver_todas_sucursales', 'sucursales', 'read', 'Ver todas las sucursales de la empresa'),
  ('crear_sucursal', 'sucursales', 'create', 'Crear nueva sucursal'),
  ('editar_sucursal', 'sucursales', 'update', 'Editar sucursal'),
  ('eliminar_sucursal', 'sucursales', 'delete', 'Eliminar sucursal'),
  ('ver_clientes', 'clientes', 'read', 'Ver clientes'),
  ('crear_cliente', 'clientes', 'create', 'Crear cliente'),
  ('editar_cliente', 'clientes', 'update', 'Editar cliente'),
  ('eliminar_cliente', 'clientes', 'delete', 'Eliminar cliente'),
  ('crear_cotizacion', 'cotizaciones', 'create', 'Crear cotización'),
  ('ver_cotizaciones', 'cotizaciones', 'read', 'Ver cotizaciones'),
  ('editar_cotizacion', 'cotizaciones', 'update', 'Editar cotización'),
  ('aprobar_cotizacion', 'cotizaciones', 'update', 'Aprobar cotización'),
  ('ver_ordenes', 'ordenes', 'read', 'Ver órdenes de trabajo'),
  ('crear_orden', 'ordenes', 'create', 'Crear orden de trabajo'),
  ('editar_orden', 'ordenes', 'update', 'Editar orden de trabajo'),
  ('marcar_progreso', 'ordenes', 'update', 'Marcar progreso de orden'),
  ('completar_orden', 'ordenes', 'update', 'Completar orden'),
  ('ver_reportes', 'reportes', 'read', 'Ver reportes'),
  ('exportar_reportes', 'reportes', 'read', 'Exportar reportes a CSV/Excel'),
  ('ver_inventario', 'inventario', 'read', 'Ver inventario'),
  ('editar_inventario', 'inventario', 'update', 'Editar stock'),
  ('ver_usuarios', 'usuarios', 'read', 'Ver usuarios'),
  ('crear_usuario', 'usuarios', 'create', 'Crear usuario'),
  ('editar_usuario', 'usuarios', 'update', 'Editar usuario'),
  ('eliminar_usuario', 'usuarios', 'delete', 'Eliminar usuario'),
  ('ver_auditoria', 'auditoria', 'read', 'Ver log de auditoría'),
  ('facturar', 'facturacion', 'create', 'Generar facturas');

-- NOTA: La validación asume que los inserts de role_permisos y usuarios de prueba fueron ejecutados.
