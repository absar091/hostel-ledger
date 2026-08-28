import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Fix the typescript error by adding nullish coalescing
content = content.replace('{item.badge > 0 && (', '{(item.badge ?? 0) > 0 && (')

# Based on previous review we don't necessarily need a TooltipProvider if there's one globally, but the reviewer specifically called it out. Let's look if we can add it around the mapped Tooltips. Wait, memory says: "Do not wrap components in a <TooltipProvider> as a global provider is already established in App.tsx; doing so causes unnecessary unmounting and breaks accessibility/transitions."
# Let's check the memory rules. Ah! The memory specifically says: "Do not wrap components in a <TooltipProvider> as a global provider is already established in App.tsx; doing so causes unnecessary unmounting and breaks accessibility/transitions."
# I will only fix the typescript issue. The reviewer might have been misled by an old journal entry.

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
