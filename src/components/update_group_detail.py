import re

file_path = 'src/pages/GroupDetail.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Update the payers logic
payers_block = r"""payers=\{item\.type === "expense" && item\.payers \? item\.payers\.map\(p => \(\{\s*\.\.\.p,\s*name: \(\(\) => \{\s*if \(p\.id === user\?\.uid\) return t\('group\.you_label'\);\s*if \(p\.id === group\.createdBy\) return t\('group\.owner'\);\s*const member = group\.members\.find\(\(m: \{ id: any; \}\) => m\.id === p\.id\);\s*return member\?\.name \|\| p\.name;\s*\}\)\(\)\s*\}\)\) : undefined\}"""
payers_replacement = """payers={item.type === "expense" && item.payers ? item.payers.map(p => ({
                        ...p,
                        name: (() => {
                          if (p.id === user?.uid) return t('group.you_label');
                          if (p.id === group.createdBy) return t('group.owner');
                          const member = group.members.find((m: any) => m.id === p.id);
                          return member?.name || p.name;
                        })()
                      })) : undefined}"""

content = re.sub(payers_block, payers_replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
