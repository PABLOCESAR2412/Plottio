-- 1.1 Crear Nuevas Tablas

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  ruc VARCHAR(20) UNIQUE NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  logo_url VARCHAR(255),
  activa BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  ruc VARCHAR(20),
  direccion TEXT NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(255),
  ciudad VARCHAR(100),
  gerente_nombre VARCHAR(255),
  gerente_telefono VARCHAR(20),
  activa BOOLEAN DEFAULT true,
  es_matriz BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, nombre)
);

CREATE TABLE puntos_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(255),
  gerente_nombre VARCHAR(255),
  horario_apertura VARCHAR(5),
  horario_cierre VARCHAR(5),
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  UNIQUE(sucursal_id, codigo)
);

-- MOCK TABLAS EXISTENTES PARA QUE FUNCIONEN LOS ALTERS (Simulación de DB antigua)
CREATE TABLE usuarios (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre VARCHAR(255));
CREATE TABLE clientes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre VARCHAR(255));
CREATE TABLE vehiculos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), placa VARCHAR(255));
CREATE TABLE cotizaciones (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cliente_nombre VARCHAR(255));
CREATE TABLE ordenes_trabajo (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), placa VARCHAR(255));

-- 1.2 Modificar Tablas Existentes

ALTER TABLE usuarios 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  ADD COLUMN sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  ADD COLUMN pv_id UUID REFERENCES puntos_venta(id) ON DELETE SET NULL;

CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_sucursal ON usuarios(sucursal_id);

ALTER TABLE clientes 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN sucursal_id UUID REFERENCES sucursales(id),
  ADD COLUMN es_cliente_global BOOLEAN DEFAULT false,
  ADD COLUMN fecha_creacion TIMESTAMP DEFAULT NOW();

CREATE INDEX idx_clientes_empresa_sucursal ON clientes(empresa_id, sucursal_id);

ALTER TABLE vehiculos 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);

CREATE INDEX idx_vehiculos_empresa_sucursal ON vehiculos(empresa_id, sucursal_id);

ALTER TABLE cotizaciones 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN sucursal_id UUID REFERENCES sucursales(id),
  ADD COLUMN pv_id UUID REFERENCES puntos_venta(id),
  ADD COLUMN creado_por_usuario_id UUID REFERENCES usuarios(id);

CREATE INDEX idx_cotizaciones_empresa_sucursal ON cotizaciones(empresa_id, sucursal_id);

ALTER TABLE ordenes_trabajo 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN sucursal_id UUID REFERENCES sucursales(id),
  ADD COLUMN pv_origen VARCHAR(10),
  ADD COLUMN asignado_a_usuario_id UUID REFERENCES usuarios(id);

CREATE INDEX idx_ordenes_empresa_sucursal ON ordenes_trabajo(empresa_id, sucursal_id);

-- 1.3 Crear Nueva Tabla: Auditoría

CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  usuario_id UUID REFERENCES usuarios(id),
  tabla_afectada VARCHAR(100),
  accion VARCHAR(50),
  registro_id UUID,
  cambios JSONB,
  ip_address VARCHAR(45),
  fecha TIMESTAMP DEFAULT NOW(),
  sucursal_id UUID REFERENCES sucursales(id)
);

CREATE INDEX idx_auditoria_empresa_fecha ON auditoria(empresa_id, fecha);
