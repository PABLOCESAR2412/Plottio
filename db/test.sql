-- Insertar Empresa
INSERT INTO empresas (id, nombre, ruc, razon_social) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Plottio Corp', '1792345678001', 'Plottio S.A.');

-- Insertar Sucursales
INSERT INTO sucursales (id, empresa_id, nombre, direccion, es_matriz)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Matriz Quito', 'Av. 12 Oct', true);

INSERT INTO sucursales (id, empresa_id, nombre, direccion, es_matriz)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sucursal GYE', 'Av. 9 Oct', false);

-- Insertar Punto de Venta
INSERT INTO puntos_venta (id, sucursal_id, nombre, codigo)
VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'PV-01 Mariscal', 'PV-01');

-- Select count to verify
SELECT 'TEST 1: Sucursales de Plottio Corp (Esperado: 2)' as Test;
SELECT COUNT(*) FROM sucursales WHERE empresa_id = '11111111-1111-1111-1111-111111111111';

SELECT 'TEST 2: Puntos de Venta (Esperado: 1)' as Test;
SELECT COUNT(*) FROM puntos_venta;

SELECT 'TEST 3: Crear PV Duplicado (Debe Fallar)' as Test;
-- Intentar crear duplicado (mismo código y sucursal)
-- This should throw a unique constraint error
INSERT INTO puntos_venta (sucursal_id, nombre, codigo)
VALUES ('22222222-2222-2222-2222-222222222222', 'PV-02 Centro', 'PV-01');
