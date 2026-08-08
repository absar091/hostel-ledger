import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Revert the item mapping type
content = content.replace('{navItems.map((item) => {', '{navItems.map((item: any) => {')

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
