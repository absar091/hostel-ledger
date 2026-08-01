import re

with open("src/components/GroupSettingsSheet.tsx", "r") as f:
    content = f.read()

# Add Tooltip imports
if "TooltipProvider" not in content:
    content = re.sub(
        r"import \{ Button \} from \"@/components/ui/button\";",
        "import { Button } from \"@/components/ui/button\";\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from \"@/components/ui/tooltip\";",
        content,
        count=1
    )

# Find the specific block to replace for handleCopyGroupInvite button
search_block = """                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyGroupInvite}
                    className="w-10 h-10 text-[#4a6850] bg-[#4a6850]/5 hover:bg-[#4a6850]/10 rounded-2xl transition-all active:scale-90"
                  >
                    <Link className="w-4 h-4" />
                  </Button>"""

replace_block = """                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyGroupInvite}
                          className="w-10 h-10 text-[#4a6850] bg-[#4a6850]/5 hover:bg-[#4a6850]/10 rounded-2xl transition-all active:scale-90"
                          aria-label="Copy group invite link"
                        >
                          <Link className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy group invite link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>"""

content = content.replace(search_block, replace_block)

with open("src/components/GroupSettingsSheet.tsx", "w") as f:
    f.write(content)

print("Updated GroupSettingsSheet.tsx")
