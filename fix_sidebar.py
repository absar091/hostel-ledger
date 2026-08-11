import re

with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()

# Fix 1: Move key prop to TooltipProvider
old_nav_loop = r'''            <TooltipProvider delayDuration=\{0\}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    key=\{item\.id\}'''

new_nav_loop = '''            <TooltipProvider key={item.id} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button'''

content = re.sub(old_nav_loop, new_nav_loop, content)

with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)
