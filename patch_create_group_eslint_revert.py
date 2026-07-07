with open('src/components/CreateGroupSheet.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '  const handleSubmit = () => {\n    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */\n    const groupData: any = {\n',
    '  const handleSubmit = () => {\n    const groupData: any = {\n'
)

with open('src/components/CreateGroupSheet.tsx', 'w') as f:
    f.write(content)

with open('src/components/Sidebar.tsx', 'r') as f:
    content_sidebar = f.read()

content_sidebar = content_sidebar.replace(
    '  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */\n  const navItems: { path: string; label: string; icon: any }[] = [\n',
    '  const navItems: { path: string; label: string; icon: any }[] = [\n'
)
content_sidebar = content_sidebar.replace(
    '        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}\n        {navItems.map((item: any) => {\n',
    '        {navItems.map((item: any) => {\n'
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content_sidebar)
