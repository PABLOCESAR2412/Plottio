import React, { useState } from "react";
import { Activity, Search, Server, Clock, User, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "../store/useAppStore";

export function AuditoriaView() {
  const { currentUser } = useAppStore();
  const logs = useQuery(api.auditoria.getAuditoria, { 
    empresaId: currentUser?.empresa?.id 
  });

  const [searchTerm, setSearchTerm] = useState("");

  if (logs === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => 
    log.accion.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.tablaAfectada.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Registro de Actividades
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Auditoría del sistema y control de cambios (Fase 1).
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por acción o módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-foreground"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="text-xs uppercase bg-muted text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Módulo</th>
                <th className="px-6 py-4 font-medium">Acción</th>
                <th className="px-6 py-4 font-medium">Registro ID</th>
                <th className="px-6 py-4 font-medium">Cambios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log: any) => (
                <tr key={log._id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(log.fecha).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      <Server className="w-3 h-3" />
                      {log.tablaAfectada}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {log.accion}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {log.registroId}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary hover:underline text-xs flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No hay registros de auditoría disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
