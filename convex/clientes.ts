import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserContext, requirePermission } from "./auth";

// 3.5 A) Función fetchClientes() DESPUÉS (con filtro Automático)
export const fetchClientes = query({
  args: { 
    usuarioId: v.id("usuarios"),
    incluirGlobales: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // 1. Validar Permisos
    await requirePermission(ctx, args.usuarioId, "ver_clientes");
    
    // 2. Obtener Contexto del Usuario Logueado
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    // 3. Consultar la base filtrando directamente por la Empresa
    const allClientes = await ctx.db
      .query("clientes")
      .withIndex("by_empresa_sucursal", (q) => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    // Si tiene permiso de ver todas las sucursales o es SuperAdmin, también incluir clientes sin empresaId asignado
    if (userContext.permisos.includes("ver_todas_sucursales")) {
      const huerfanos = await ctx.db.query("clientes").collect();
      const idsExistentes = new Set(allClientes.map((c) => c._id));
      for (const h of huerfanos) {
        if (!idsExistentes.has(h._id) && (!h.empresaId || h.empresaId === userContext.empresa!.id)) {
          allClientes.push(h);
        }
      }
    }

    // 4. Filtrar granularmente dependiendo del nivel de acceso y enriquecer
    const clientesFiltrados = [];
    
    for (const c of allClientes) {
      const tipoCliente = c.sucursalId === userContext.sucursal?.id ? 'Local' : 'Global';
      const clienteEnriquecido = {
        ...c,
        tipo_cliente: tipoCliente,
        empresaId: c.empresaVinculadaId || c.empresaId, // retrocompatibilidad para mostrar empresa vinculada en UI
      };

      // Super Admin ve todo
      if (userContext.permisos.includes("ver_todas_sucursales")) {
        clientesFiltrados.push(clienteEnriquecido);
        continue;
      }

      // Si pide incluir clientes globales de la empresa, y lo es
      if (!args.incluirGlobales && c.esClienteGlobal) {
        clientesFiltrados.push(clienteEnriquecido);
        continue;
      }

      // Restringir a su sucursal estricta
      if (userContext.sucursal && c.sucursalId === userContext.sucursal.id) {
        clientesFiltrados.push(clienteEnriquecido);
        continue;
      }
    }

    // Ordenar alfabéticamente
    return clientesFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },
});

export const createCliente = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    nombre: v.string(),
    telefono: v.string(),
    email: v.string(),
    direccion: v.optional(v.string()),
    identificacion: v.optional(v.string()),
    empresaVinculadaId: v.optional(v.id("empresas")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "crear_cliente");
    
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa || !userContext.sucursal) {
      throw new ConvexError("El usuario necesita estar asignado a una Empresa y Sucursal");
    }

    if (args.identificacion && args.identificacion.trim() !== "") {
      const identificacionLimpia = args.identificacion.trim();
      const existing = await ctx.db
        .query("clientes")
        .withIndex("by_empresa_identificacion", (q) =>
          q.eq("empresaId", userContext.empresa!.id).eq("identificacion", identificacionLimpia),
        )
        .first();
      if (existing) {
        throw new ConvexError(`Ya existe un cliente con la identificación ${args.identificacion}`);
      }
    }

    const newClienteId = await ctx.db.insert("clientes", {
      nombre: args.nombre,
      telefono: args.telefono,
      email: args.email,
      direccion: args.direccion,
      identificacion: args.identificacion,
      empresaId: userContext.empresa.id,
      empresaVinculadaId: args.empresaVinculadaId,
      sucursalId: userContext.sucursal.id,
      esClienteGlobal: false
    });

    // 5.6 Registrar Auditoría
    await ctx.db.insert("auditoria", {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "clientes",
      accion: "CREATE",
      registroId: newClienteId,
      sucursalId: userContext.sucursal.id,
      cambios: args,
      fecha: new Date().toISOString()
    });

    return await ctx.db.get(newClienteId);
  }
});

export const createClienteConEmpresa = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    // Datos del cliente
    nombre: v.string(),
    telefono: v.string(),
    email: v.string(),
    direccion: v.optional(v.string()),
    identificacion: v.optional(v.string()),
    // Datos de la empresa vinculada
    empresaNombre: v.string(),
    empresaRuc: v.string(),
    empresaRazonSocial: v.optional(v.string()),
    empresaTelefono: v.optional(v.string()),
    empresaDireccion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validar permiso crear_cliente
    await requirePermission(ctx, args.usuarioId, "crear_cliente");

    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa || !userContext.sucursal) {
      throw new ConvexError("El usuario necesita estar asignado a una Empresa y Sucursal");
    }

    // 2. Validar duplicidad de identificación del cliente dentro del tenant
    if (args.identificacion && args.identificacion.trim() !== "") {
      const identificacionLimpia = args.identificacion.trim();
      const existingCli = await ctx.db
        .query("clientes")
        .withIndex("by_empresa_identificacion", (q) =>
          q.eq("empresaId", userContext.empresa!.id).eq("identificacion", identificacionLimpia),
        )
        .first();
      if (existingCli) {
        throw new ConvexError(`Ya existe un cliente con la identificación ${args.identificacion}`);
      }
    }

    // 3. Gestionar Empresa Vinculada (cliente B2B / flota)
    const rucLimpio = args.empresaRuc.trim();
    let empresaIdResultante: Id<"empresas">;

    // Buscar si ya existe por RUC
    const existingEmpresa = await ctx.db
      .query("empresas")
      .withIndex("by_ruc", (q) => q.eq("ruc", rucLimpio))
      .first();

    if (existingEmpresa) {
      empresaIdResultante = existingEmpresa._id;
      // Si la empresa existía pero estaba archivada/inactiva, la reactivamos
      if (!existingEmpresa.activa) {
        await ctx.db.patch(existingEmpresa._id, {
          activa: true,
          nombre: args.empresaNombre.trim(),
          razonSocial: args.empresaRazonSocial?.trim() || args.empresaNombre.trim(),
          telefono: args.empresaTelefono?.trim() || existingEmpresa.telefono,
          direccion: args.empresaDireccion?.trim() || existingEmpresa.direccion,
        });
      }
    } else {
      empresaIdResultante = await ctx.db.insert("empresas", {
        nombre: args.empresaNombre.trim(),
        ruc: rucLimpio,
        razonSocial: args.empresaRazonSocial?.trim() || args.empresaNombre.trim(),
        telefono: args.empresaTelefono?.trim() || undefined,
        direccion: args.empresaDireccion?.trim() || undefined,
        activa: true,
      });

      // Auditoría para creación de empresa vinculada
      await ctx.db.insert("auditoria", {
        empresaId: userContext.empresa.id,
        usuarioId: args.usuarioId,
        tablaAfectada: "empresas",
        accion: "CREATE",
        registroId: empresaIdResultante,
        sucursalId: userContext.sucursal.id,
        cambios: {
          nombre: args.empresaNombre.trim(),
          ruc: rucLimpio,
          razonSocial: args.empresaRazonSocial?.trim() || args.empresaNombre.trim(),
          telefono: args.empresaTelefono?.trim() || null,
          direccion: args.empresaDireccion?.trim() || null,
        },
        fecha: new Date().toISOString(),
      });
    }

    // 4. Crear cliente vinculado al workspace y a la empresa B2B
    const newClienteId = await ctx.db.insert("clientes", {
      nombre: args.nombre.trim(),
      telefono: args.telefono.trim(),
      email: args.email.trim(),
      direccion: args.direccion?.trim(),
      identificacion: args.identificacion?.trim(),
      empresaId: userContext.empresa.id, // tenant workspace del taller
      empresaVinculadaId: empresaIdResultante, // empresa cliente / flota vinculada
      sucursalId: userContext.sucursal.id,
      esClienteGlobal: false,
    });

    // Auditoría para creación de cliente
    await ctx.db.insert("auditoria", {
      empresaId: userContext.empresa.id,
      usuarioId: args.usuarioId,
      tablaAfectada: "clientes",
      accion: "CREATE",
      registroId: newClienteId,
      sucursalId: userContext.sucursal.id,
      cambios: {
        nombre: args.nombre.trim(),
        telefono: args.telefono.trim(),
        email: args.email.trim(),
        direccion: args.direccion?.trim() || null,
        identificacion: args.identificacion?.trim() || null,
        empresaId: userContext.empresa.id,
        empresaVinculadaId: empresaIdResultante,
      },
      fecha: new Date().toISOString(),
    });

    const newCliente = await ctx.db.get(newClienteId);
    return {
      cliente: newCliente,
      empresaId: empresaIdResultante,
    };
  },
});

// 5.5 CREAR FUNCIÓN: fetchClienteGlobal()
export const fetchClienteGlobal = query({
  args: {
    usuarioId: v.id("usuarios"),
    nombreOEmail: v.string()
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const queryTerm = args.nombreOEmail.toLowerCase();
    
    // Obtenemos todos los clientes de la empresa
    const allClientes = await ctx.db
      .query("clientes")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    // Filtramos manualmente (Convex no tiene ILIKE nativo, se hace en memoria)
    const matches = allClientes.filter(c => 
      c.nombre.toLowerCase().includes(queryTerm) || 
      c.email.toLowerCase().includes(queryTerm)
    ).slice(0, 10);

    // Enriquecemos con la sucursal y vehículos (simulando JOIN)
    const enriquecidos = await Promise.all(matches.map(async (c) => {
      let sucursalNombre = "Desconocida";
      if (c.sucursalId) {
        const suc = await ctx.db.get(c.sucursalId);
        if (suc) sucursalNombre = suc.nombre;
      }

      const vehiculos = await ctx.db
        .query("vehiculos")
        .withIndex("by_empresa_sucursal", q => q.eq("empresaId", userContext.empresa!.id))
        .filter(q => q.eq(q.field("propietarioId"), c._id))
        .collect();

      return {
        ...c,
        sucursal_nombre: sucursalNombre,
        vehiculos: vehiculos.map(v => ({ id: v._id, placa: v.placa, marca: v.marca }))
      };
    }));

    return enriquecidos;
  }
});

export const updateCliente = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteId: v.id("clientes"),
    nombre: v.string(),
    telefono: v.string(),
    email: v.string(),
    direccion: v.optional(v.string()),
    identificacion: v.optional(v.string()),
    empresaId: v.optional(v.string()), // Or v.id("empresas") if strict
    empresaVinculadaId: v.optional(v.union(v.id("empresas"), v.string())),
  },
  handler: async (ctx, args) => {
    // Validate permission or context if needed, but for simplicity:
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Sin permisos");

    if (args.identificacion && args.identificacion.trim() !== "") {
      const identificacionLimpia = args.identificacion.trim();
      const existing = await ctx.db
        .query("clientes")
        .withIndex("by_empresa_identificacion", (q) =>
          q.eq("empresaId", userContext.empresa!.id).eq("identificacion", identificacionLimpia),
        )
        .first();
      if (existing && existing._id !== args.clienteId) {
        throw new ConvexError(`Ya existe un cliente con la identificación ${args.identificacion} en esta empresa`);
      }
    }

    const rawEmpresaVinculada = args.empresaVinculadaId || args.empresaId;
    const empId = rawEmpresaVinculada
      ? (rawEmpresaVinculada as import("./_generated/dataModel").Id<"empresas">)
      : undefined;
    
    await ctx.db.patch(args.clienteId, {
      nombre: args.nombre,
      telefono: args.telefono,
      email: args.email,
      direccion: args.direccion,
      identificacion: args.identificacion,
      empresaVinculadaId: empId,
      // Conservar empresaId original (tenant workspace) para que nunca se desvincule ni desaparezca
      ...(userContext.empresa ? { empresaId: userContext.empresa.id } : {}),
    });

    return await ctx.db.get(args.clienteId);
  }
});

export const deleteCliente = mutation({
  args: {
    usuarioId: v.id("usuarios"),
    clienteId: v.id("clientes"),
  },
  handler: async (ctx, args) => {
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) throw new ConvexError("Sin permisos");

    await ctx.db.delete(args.clienteId);
  }
});


