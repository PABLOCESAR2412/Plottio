with open('src/components/OrdenesTrabajoView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('id: (c as { _id?: string })._id ?? c.id,', '_id: (c as { _id?: string })._id ?? c.id,\n\t\t\t\t\t\tid: (c as { _id?: string })._id ?? c.id,')
content = content.replace('id: (e as { _id?: string })._id ?? e.id,', '_id: (e as { _id?: string })._id ?? e.id,\n\t\t\t\t\t\tid: (e as { _id?: string })._id ?? e.id,')
content = content.replace('id: (v as { _id?: string })._id ?? v.id,', '_id: (v as { _id?: string })._id ?? v.id,\n\t\t\t\t\t\tid: (v as { _id?: string })._id ?? v.id,')

content = content.replace('_id: (c as { _id?: string })._id ?? c.id,
					id: (c as { _id?: string })._id ?? c.id,', '_id: (c as { _id?: string })._id ?? c.id,\n\t\t\t\t\t\tid: (c as { _id?: string })._id ?? c.id,')

with open('src/components/OrdenesTrabajoView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
