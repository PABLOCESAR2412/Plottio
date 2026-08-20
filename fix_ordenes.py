import re

with open('src/components/OrdenesTrabajoView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix LocalCliente, LocalEmpresa, LocalVehiculo missing _id by just providing it.
content = content.replace('id: (c as { _id?: string })._id ?? c.id,', '_id: (c as { _id?: string })._id ?? c.id,\n\t\t\t\t\t\tid: (c as { _id?: string })._id ?? c.id,')
content = content.replace('id: (e as { _id?: string })._id ?? e.id,', '_id: (e as { _id?: string })._id ?? e.id,\n\t\t\t\t\t\tid: (e as { _id?: string })._id ?? e.id,')
content = content.replace('id: (v as { _id?: string })._id ?? v.id,', '_id: (v as { _id?: string })._id ?? v.id,\n\t\t\t\t\t\tid: (v as { _id?: string })._id ?? v.id,')

content = content.replace('type: LocalOrden["estado"]', 'type: "Pendiente" | "En Progreso" | "Cancelado" | "Completado"')
content = content.replace('LocalOrden[]', 'Array<LocalOrden & { _id: string }>')
content = content.replace('LocalEmpresa[]', 'Array<LocalEmpresa & { _id: string }>')
content = content.replace('LocalCliente[]', 'Array<LocalCliente & { _id: string }>')

# Fix find by id
content = content.replace('c.id === formData.clienteId', '(c as any)._id === formData.clienteId')
content = content.replace('e.id === formData.empresaId', '(e as any)._id === formData.empresaId')

# Fix prioridades
content = content.replace('setPrioridad(e.target.value)', 'setPrioridad(e.target.value as "Baja" | "Media" | "Alta")')

# Fix status mismatch
content = content.replace('setEstadoFiltro(e.target.value)', 'setEstadoFiltro(e.target.value as any)')

with open('src/components/OrdenesTrabajoView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
