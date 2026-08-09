import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionStore } from "../store/useSessionStore";
import { Shield, PlusCircle, Settings2, Check, X, Server } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "./Skeleton";
import type { Id } from "../../convex/_generated/dataModel";

export function RolesView() {
  const currentUser = useSessionStore((s) => s.currentUser);
  
  const roles = useQuery(api.roles.getRoles, {});
  
  const permisos = useQuery(api.permisos.getPermisos);
  
  const seedPermisos = useMutation(api.permisos.seedPermisos);
  const createRole = useMutation(api.roles.createRole);
  const updateRole = useMutation(api.roles.updateRole);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    permisosIds: [] as Id<"permisos">[],
  });

  const loadRolePermissions = useQuery(api.roles.getRolePermisos, 
    editingRole ? { roleId: editingRole._id } : "skip"
  );

  useEffect(() => {
    // Si la DB de permisos está vacía, sembrarlos automáticamente
    if (permisos && permisos.length === 0) {
      seedPermisos().then(() => toast.info("Permisos base inicializados"));
    }
  }, [permisos]);

  useEffect(() => {
    if (editingRole && loadRolePermissions) {
      setFormData({
        nombre: editingRole.nombre,
        descripcion: editingRole.descripcion || "",
        permisosIds: loadRolePermissions,
      });
    }
  }, [editingRole, loadRolePermissions]);

  if (roles === undefined || permisos === undefined) {
    return <TableSkeleton />;
  }

  const handleOpenModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
    } else {
      setEditingRole(null);
      setFormData({ nombre: "", descripcion: "", permisosIds: [] });
    }
    setShowModal(true);
  };

  const handleTogglePermiso = (id: Id<"permisos">) => {
    setFormData(prev => ({
      ...prev,
      permisosIds: prev.permisosIds.includes(id)
        ? prev.permisosIds.filter(pId => pId !== id)
        : [...prev.permisosIds, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRole) {
        await updateRole({
          roleId: editingRole._id,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          permisosIds: formData.permisosIds,
        });
        toast.success("Rol actualizado con éxito");
      } else {
        await createRole({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          permisosIds: formData.permisosIds,
        });
        toast.success("Rol creado con éxito");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el rol");
    }
  };

  // Agrupar permisos por módulo para UI
  const permisosPorModulo = permisos.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Roles y Permisos
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Control de acceso basado en roles (RBAC).
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="font-medium">Nuevo Rol</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((rol) => (
          <div key={rol._id} className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${rol.activo ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                {rol.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{rol.nombre}</h3>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10">
              {rol.descripcion || "Sin descripción"}
            </p>
            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Creado: {new Date(rol.fechaCreacion).toLocaleDateString()}
              </span>
              <button 
                onClick={() => handleOpenModal(rol)}
                className="text-primary hover:opacity-80 font-medium text-sm flex items-center gap-1"
              >
                <Settings2 className="w-4 h-4" /> Configurar
              </button>
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            No has creado roles personalizados. Los usuarios usarán roles genéricos por defecto.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="text-xl font-bold text-foreground">
                {editingRole ? 'Editar Rol' : 'Diseñar Nuevo Rol'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              <form id="roleForm" onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre del Rol</label>
                    <input
                      required
                      type="text"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej. Técnico Especialista"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
                    <input
                      type="text"
                      value={formData.descripcion}
                      onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      placeholder="Breve explicación de las responsabilidades"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" /> Permisos del Sistema
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(permisosPorModulo).map(([modulo, perms]) => (
                      <div key={modulo} className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
                        <h5 className="font-semibold text-foreground text-sm uppercase tracking-wider">{modulo}</h5>
                        <div className="space-y-2">
                          {perms.map((p) => {
                            const isChecked = formData.permisosIds.includes(p._id);
                            return (
                              <label key={p._id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                                <div className={`mt-0.5 flex shrink-0 items-center justify-center w-5 h-5 rounded border ${isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                                  {isChecked && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermiso(p._id)}
                                />
                                <div>
                                  <div className="text-sm font-medium text-foreground">{p.nombre}</div>
                                  <div className="text-xs text-muted-foreground">{p.descripcion}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex gap-3 mt-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="roleForm"
                className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors font-medium shadow-sm"
              >
                Guardar Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
