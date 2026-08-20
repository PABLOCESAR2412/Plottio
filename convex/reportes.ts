import { query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { checkPermission, getCurrentUserContext, requirePermission } from "./auth";

// 7.0 Permite gatear en cliente si el usuario puede ver reportes sin lanzar 403
export const getPuedeVerReportes = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    return await checkPermission(ctx, args.usuarioId, "ver_reportes");
  }
});

// Helper para saber si una fecha es del mes actual
const isCurrentMonth = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

// 7.1 FUNCIÓN: getDashboardMatriz()
export const getDashboardMatriz = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_reportes");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.permisos.includes("ver_todas_sucursales")) {
      throw new ConvexError("Solo Super Admin puede ver dashboard matriz");
    }

    const empresaId = userContext.empresa!.id;

    // Obtener todas las órdenes de la empresa
    const ordenes = await ctx.db
      .query("ordenesTrabajo")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", empresaId))
      .collect();

    // 1. Total ingresos del mes y ranking de sucursales
    let ingresos_mes = { total_mes: 0, ordenes_completadas: 0 };
    const sucursalesMap = new Map<Id<"sucursales">, { ingresos_total: number; ordenes_completadas: number }>();

    for (const o of ordenes) {
      if (o.estado === 'Entregado' && isCurrentMonth(o.fechaFin || o._creationTime.toString())) {
        ingresos_mes.total_mes += o.total;
        ingresos_mes.ordenes_completadas++;

        // Ranking por sucursal
        if (o.sucursalId) {
          const stats = sucursalesMap.get(o.sucursalId) || { ingresos_total: 0, ordenes_completadas: 0 };
          stats.ingresos_total += o.total;
          stats.ordenes_completadas++;
          sucursalesMap.set(o.sucursalId, stats);
        }
      }
    }

    // Formatear sucursales
    const sucursales = [];
    for (const [id, stats] of sucursalesMap.entries()) {
      const s = await ctx.db.get(id);
      sucursales.push({
        id,
        nombre: s ? s.nombre : 'Desconocida',
        ordenes_completadas: stats.ordenes_completadas,
        ingresos_total: stats.ingresos_total,
        promedio_orden: stats.ingresos_total / (stats.ordenes_completadas || 1)
      });
    }
    sucursales.sort((a, b) => b.ingresos_total - a.ingresos_total);

    // 2. Órdenes activas por sucursal
    const ordenes_activas = [];
    const activasMap = new Map<Id<"sucursales">, number>();
    for (const o of ordenes) {
      if (['Pendiente', 'En Proceso'].includes(o.estado) && o.sucursalId) {
        activasMap.set(o.sucursalId, (activasMap.get(o.sucursalId) || 0) + 1);
      }
    }
    for (const [id, activas] of activasMap.entries()) {
      const s = await ctx.db.get(id);
      if (s) ordenes_activas.push({ sucursal: s.nombre, ordenes_activas: activas });
    }

    // 3. Clientes nuevos del mes
    const clientes = await ctx.db
      .query("clientes")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", empresaId))
      .collect();
    
    // Convex _creationTime is in ms
    const clientes_nuevos = {
       total: clientes.filter(c => isCurrentMonth(new Date(c._creationTime).toISOString())).length
    };

    // 4. Stock crítico
    const inventarios = await ctx.db.query("inventarioSucursal").collect();
    // Fetch items manually to verify they belong to the company
    let items_criticos = 0;
    for (const inv of inventarios) {
      if (inv.cantidad <= inv.cantidadMinima) {
         const item = await ctx.db.get(inv.itemId);
         if (item && item.empresaId === empresaId) items_criticos++;
      }
    }

    return {
      ingresos_mes,
      sucursales,
      ordenes_activas,
      clientes_nuevos,
      stock_critico: { items_criticos }
    };
  }
});

// 7.2 FUNCIÓN: getDashboardSucursal()
export const getDashboardSucursal = query({
  args: { usuarioId: v.id("usuarios") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_reportes");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.sucursal) throw new ConvexError("No tienes sucursal asignada");

    const empresaId = userContext.empresa!.id;
    const sucursalId = userContext.sucursal.id;

    const ordenes = await ctx.db
      .query("ordenesTrabajo")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", empresaId).eq("sucursalId", sucursalId))
      .collect();

    let ingresos_mes = { total_mes: 0, ordenes_completadas: 0 };
    const activas = [];
    
    for (const o of ordenes) {
      if (o.estado === 'Entregado' && isCurrentMonth(o.fechaFin || o._creationTime.toString())) {
        ingresos_mes.total_mes += o.total;
        ingresos_mes.ordenes_completadas++;
      }
      if (['Pendiente', 'En Proceso'].includes(o.estado)) {
        activas.push(o);
      }
    }

    const ordenes_activas = await Promise.all(activas.map(async (o) => {
       const cliente = o.clienteNombre;
       return {
         id: o._id,
         placa: o.placa,
         cliente,
         estado: o.estado,
         tareas_totales: o.items.length,
         tareas_completadas: o.items.filter(i => i.completado).length
       };
    }));

    return {
      ingresos_mes,
      ordenes_activas,
      // Implementación simplificada
      clientes_frecuentes: [], 
      stock_bajo: [] 
    };
  }
});

// 7.3 FUNCIÓN: getReporteIngresos()
export const getReporteIngresos = query({
  args: { 
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      desde: v.optional(v.string()),
      hasta: v.optional(v.string()),
      estado: v.optional(v.string()),
      sucursalId: v.optional(v.id("sucursales"))
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_reportes");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.empresa) return [];

    const allOrdenes = await ctx.db
      .query("ordenesTrabajo")
      .withIndex("by_empresa_sucursal", q => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    const esSuper = userContext.permisos.includes("ver_todas_sucursales");

    const filtradas = allOrdenes.filter(o => {
      if (!esSuper && userContext.sucursal && o.sucursalId !== userContext.sucursal.id) return false;
      if (args.filtros) {
        if (args.filtros.estado && o.estado !== args.filtros.estado) return false;
        if (esSuper && args.filtros.sucursalId && o.sucursalId !== args.filtros.sucursalId) return false;
        
        if (args.filtros.desde && args.filtros.hasta) {
          const fecha = new Date(o.fechaInicio);
          if (fecha < new Date(args.filtros.desde) || fecha > new Date(args.filtros.hasta)) return false;
        }
      }
      return true;
    });

    filtradas.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

    return await Promise.all(filtradas.map(async o => {
      const s = o.sucursalId ? await ctx.db.get(o.sucursalId) : null;
      return {
        id: o._id,
        numero_orden: o._id.substring(0, 8),
        cliente: o.clienteNombre,
        clienteTelefono: o.clienteTelefono,
        placa: o.placa,
        vehiculoTipo: o.vehiculoTipo,
        total: o.total,
        estado: o.estado,
        progreso: o.progreso,
        fecha_creacion: o.fechaInicio,
        fechaInicio: o.fechaInicio,
        fechaFin: o.fechaFin,
        sucursal: s?.nombre || "N/A",
        sucursalId: o.sucursalId || null
      };
    }));
  }
});

// 7.5 FUNCIÓN: getReporteAuditoria()
export const getReporteAuditoria = query({
  args: { 
    usuarioId: v.id("usuarios"),
    filtros: v.optional(v.object({
      desde: v.optional(v.string()),
      hasta: v.optional(v.string()),
      usuario: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.usuarioId, "ver_auditoria");
    const userContext = await getCurrentUserContext(ctx, args.usuarioId);
    if (!userContext.permisos.includes("ver_todas_sucursales")) {
      throw new ConvexError("Solo Super Admin puede ver auditoría");
    }

    const records = await ctx.db
      .query("auditoria")
      .withIndex("by_empresa", q => q.eq("empresaId", userContext.empresa!.id))
      .collect();

    // Convex sort by creationTime desc natively in JS
    records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Filter y enriquecer limitando a 100
    const results = [];
    for (const r of records) {
      if (results.length >= 100) break;
      
      const s = r.sucursalId ? await ctx.db.get(r.sucursalId) : null;
      const u = r.usuarioId ? await ctx.db.get(r.usuarioId) : null;

      if (args.filtros?.usuario && u && !u.nombre.toLowerCase().includes(args.filtros.usuario.toLowerCase())) {
        continue;
      }

      results.push({
        id: r._id,
        fecha: r.fecha,
        usuario: u?.nombre || "Sistema",
        tabla_afectada: r.tablaAfectada,
        accion: r.accion,
        registro_id: r.registroId,
        sucursal: s?.nombre || "N/A",
        cambios: r.cambios
      });
    }

    return results;
  }
});
