const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!content.includes('import { Tooltip')) {
  content = content.replace(
    'import Logo from "./Logo";',
    'import Logo from "./Logo";\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";'
  );
}

if (!content.includes('<TooltipProvider>')) {
  content = content.replace(
    '  return (\n    <aside',
    '  return (\n    <TooltipProvider>\n    <aside'
  );

  content = content.replace(
    '    </aside>\n  );\n};',
    '    </aside>\n    </TooltipProvider>\n  );\n};'
  );
}

content = content.replace(
  /<button\n\s*key=\{item\.id\}([\s\S]*?)title=\{!isOpen \? item\.label : undefined\}\n\s*>([\s\S]*?)<\/button>/g,
  `<Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button$1>
$2</button>
              </TooltipTrigger>
              {!isOpen && (
                <TooltipContent side="right" sideOffset={10}>
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>`
);

content = content.replace(
  /<button\n\s*onClick=\{\(\) => navigate\("\/profile"\)\}([\s\S]*?)title=\{user\?\.name \|\| "Profile"\}\n\s*>([\s\S]*?)<\/button>/g,
  `<Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/profile")}$1>
$2</button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p>{user?.name || "Profile"}</p>
              </TooltipContent>
            </Tooltip>`
);

// We made a mistake capturing the exact logout button. The problem was that the expanded logout button was being matched or modified incorrectly.
// Let's explicitly match ONLY the collapsed logout button which HAS a title attribute.
content = content.replace(
  /<button\n\s*onClick=\{handleLogout\}\n\s*className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"\n\s*aria-label=\{t\('sidebar\.logout'\)\}\n\s*title=\{t\('sidebar\.logout'\)\}\n\s*>([\s\S]*?)<\/button>/g,
  `<Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                  aria-label={t('sidebar.logout')}
                >
$1</button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p>{t('sidebar.logout')}</p>
              </TooltipContent>
            </Tooltip>`
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
