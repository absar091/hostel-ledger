import re

file_path = 'src/pages/GroupDetail.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Find the TimelineItem component usage
# It's inside {transactions.map((item, index) => ( ... <TimelineItem ... /> ... ))}

# We will inject the payers prop
# Search for: paidBy={item.type === "expense" ? (
pattern = r'paidBy=\{item\.type === "expense" \? \('
replacement = """payers={item.type === "expense" && item.payers ? item.payers.map(p => ({
                        ...p,
                        name: (() => {
                          if (p.id === user?.uid) return t('group.you_label');
                          if (p.id === group.createdBy) return t('group.owner');
                          const member = group.members.find(m => m.id === p.id);
                          return member?.name || p.name;
                        })()
                      })) : undefined}
                      paidBy={item.type === "expense" ? ("""

content = content.replace('paidBy={item.type === "expense" ? (', replacement)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated GroupDetail.tsx")
