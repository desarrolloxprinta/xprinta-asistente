import os

with open('/home/suario/projects/xprinta-asistente/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix header padding for status bar notch and fix category chip height
text = text.replace("paddingTop: spacing.md,\n    paddingBottom: spacing.md,", "paddingTop: 36,\n    paddingBottom: spacing.md,")
text = text.replace("categoryChip: {\n    paddingHorizontal: 14,\n    paddingVertical: 6,\n    borderRadius: radius.pill,", "categoryChip: {\n    paddingHorizontal: 16,\n    paddingVertical: 8,\n    height: 36,\n    justifyContent: 'center',\n    alignItems: 'center',\n    borderRadius: radius.pill,")

with open('/home/suario/projects/xprinta-asistente/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('App.tsx styling polished')
