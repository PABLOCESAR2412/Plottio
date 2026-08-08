import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const populate = mutation({
  args: {},
  handler: async (ctx) => {
    const usersCount = await ctx.db.query("usuarios").collect();
    if (usersCount.length > 0) {
      return "Ya hay datos en la base de datos.";
    }

    // Insertar Empresas
    const emp1 = await ctx.db.insert("empresas", {
      nombre: "Transportes TransLuz S.A.",
      ruc: "1792345678001",
      razonSocial: "Transportes TransLuz S.A.",
      telefono: "+593 99 123 4567",
      direccion: "Av. Maldonado Km 11.5 y Calvas, Quito",
      activa: true,
    });

    // Insertar Sucursal
    const suc1 = await ctx.db.insert("sucursales", {
      empresaId: emp1,
      nombre: "Matriz Quito",
      direccion: "Av. Maldonado Km 11.5",
      telefono: "+593 2 2123456",
      esMatriz: true,
      activa: true,
    });

    const suc2 = await ctx.db.insert("sucursales", {
      empresaId: emp1,
      nombre: "Guayaquil",
      direccion: "Av. Las Américas",
      telefono: "+593 4 2123456",
      esMatriz: false,
      activa: true,
    });

    // Insertar Punto Venta
    const pv1 = await ctx.db.insert("puntosVenta", {
      sucursalId: suc1,
      nombre: "PV-01 Mariscal",
      codigo: "PV01",
      activo: true,
    });

    // Roles (Mock)
    const rolAdmin = await ctx.db.insert("roles", {
      nombre: "SuperAdmin",
      activo: true,
      fechaCreacion: new Date().toISOString(),
    });

    const rolSucursal = await ctx.db.insert("roles", {
      nombre: "AdminSucursal",
      activo: true,
      fechaCreacion: new Date().toISOString(),
    });

    // Insertar Usuarios
    const usr1 = await ctx.db.insert("usuarios", {
      nombre: "Súper Admin",
      email: "admin@plottio.com",
      rol: "SuperAdmin",
      activo: true,
    });

    const usr2 = await ctx.db.insert("usuarios", {
      nombre: "Admin Quito",
      email: "quito@plottio.com",
      rol: "AdminSucursal",
      sucursalId: suc1,
      activo: true,
    });

    // Asignar roles
    await ctx.db.insert("usuariosRolesSucursal", {
      usuarioId: usr1,
      roleId: rolAdmin,
      sucursalId: suc1,
      activo: true,
      fechaAsignacion: new Date().toISOString()
    });

    await ctx.db.insert("usuariosRolesSucursal", {
      usuarioId: usr2,
      roleId: rolSucursal,
      sucursalId: suc1,
      activo: true,
      fechaAsignacion: new Date().toISOString()
    });
    // --- FASE 9: CATÁLOGO DE SERVICIOS (Placas) ---
    const servicios = await ctx.db.query("catalogoServicios").collect();
    if (servicios.length === 0) {
      const placa1 = await ctx.db.insert("catalogoServicios", {
        empresaId: emp1,
        nombre: "Placa Acrílico - Ruta",
        categoria: "placa",
        precioBase: 8.00,
        activo: true,
        fechaCreacion: new Date().toISOString()
      });
      const placa2 = await ctx.db.insert("catalogoServicios", {
        empresaId: emp1,
        nombre: "Placa Lona - Parabrisas",
        categoria: "placa",
        precioBase: 5.00,
        activo: true,
        fechaCreacion: new Date().toISOString()
      });
      const placa3 = await ctx.db.insert("catalogoServicios", {
        empresaId: emp1,
        nombre: "Placa Acrílico - Número Unidad",
        categoria: "placa",
        precioBase: 4.00,
        activo: true,
        fechaCreacion: new Date().toISOString()
      });
    }

    return "Base de datos poblada exitosamente con datos de prueba.";
  },
});

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("usuarios").collect();
    return { hasData: users.length > 0 };
  }
});
