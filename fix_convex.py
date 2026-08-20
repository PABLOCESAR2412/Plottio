import re

files_to_fix = {
    'convex/auditoria.ts': r'import \{ v, ConvexError \} from \"convex/values\";',
    'convex/emails.ts': r'import \{ v, ConvexError \} from \"convex/values\";',
    'convex/notificaciones.ts': r'import \{ v, ConvexError \} from \"convex/values\";',
    'convex/schema.ts': r'import \{ defineSchema, defineTable \} from \"convex/server\";\nimport \{ v, ConvexError \} from \"convex/values\";'
}

for file, replace_with in files_to_fix.items():
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('import { v, ConvexError } from "convex/values";', 'import { v } from "convex/values";')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
