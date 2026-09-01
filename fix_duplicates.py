import re

with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()

# Fix duplicate import
import_stmt = """import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
"""
content = content.replace(import_stmt + import_stmt, import_stmt)

# Fix missing key on React Fragment
content = re.sub(
    r'(return \(\n\s*)<>\n\s*\{isOpen \?',
    r'\1<React.Fragment key={item.id}>\n            {isOpen ?',
    content
)
content = re.sub(
    r'(</Tooltip>\n\s*)\}\n\s*</>',
    r'\1            }\n          </React.Fragment>',
    content
)

# ensure React is imported since we use React.Fragment
if 'import React' not in content:
    content = 'import React from "react";\n' + content


with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)
