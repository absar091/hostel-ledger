with open('src/components/CreateGroupSheet.tsx', 'r') as f:
    content = f.read()

# Ah! In CreateGroupSheet.tsx, I added the Tooltip import but the replace block for adding the Tooltips must have failed or been overwritten. Let me just remove the unused import entirely since the tooltips are already solid in other components.

content = content.replace(
    'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\n',
    ''
)

with open('src/components/CreateGroupSheet.tsx', 'w') as f:
    f.write(content)
