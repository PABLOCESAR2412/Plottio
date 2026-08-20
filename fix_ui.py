import re

# Fix AgendaView.tsx
with open('src/components/AgendaView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('const citasFiltradas = citas.filter((cita) => {', 'const citasFiltradas = (citas || []).filter((cita) => {')
with open('src/components/AgendaView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix CatalogoView.tsx
with open('src/components/CatalogoView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'const _handleEdit = \(servicio: Servicio\) => \{.*?\};', '', content, flags=re.DOTALL)
with open('src/components/CatalogoView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix CotizacionesView.tsx
with open('src/components/CotizacionesView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'const _updateCotizacionMut = useMutation\(api\.cotizaciones\.updateCotizacion\);', '', content)
content = content.replace('cotizacion._id', 'cotizacion.id')
content = content.replace('_id: cotizacion.id', 'id: cotizacion.id')
content = content.replace('_id: newCotizacionId', 'id: newCotizacionId')
with open('src/components/CotizacionesView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix InventarioView.tsx
with open('src/components/InventarioView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('handleCancelMovimiento(true)', 'handleCancelMovimiento()')
with open('src/components/InventarioView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix KitsFlotaView.tsx
with open('src/components/KitsFlotaView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('usuarioId: currentUser.id as Id<"usuarios">', 'usuarioId: currentUser!.id as Id<"usuarios">')
with open('src/components/KitsFlotaView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix LotesProduccionView.tsx
with open('src/components/LotesProduccionView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('usuarioId: currentUser.id', 'usuarioId: currentUser!.id')
with open('src/components/LotesProduccionView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
