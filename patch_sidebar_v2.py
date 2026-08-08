import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Add imports
imports = """import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Home"""
content = content.replace("import { Home", imports)

# Wrap inside with TooltipProvider
content = content.replace(
    '<aside className={cn(',
    '<TooltipProvider delayDuration={0}>\n    <aside className={cn('
)

content = content.replace(
    '</aside>',
    '</aside>\n    </TooltipProvider>'
)

# Nav items
nav_button_pattern = r'''(<button
              key=\{item\.id\}
              onClick=\{\(\) => navigate\(item\.path\)\}
              aria-current=\{active \? "page" : undefined\}
              className=\{cn\([\s\S]*?\}
              title=\{!isOpen \? item\.label : undefined\}
            >)'''

def nav_item_repl(m):
    return '''<Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(item.path)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                    active
                      ? "bg-[#1B4332] text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-100",
                    !isOpen && "justify-center"
                  )}
                >'''

content = re.sub(nav_button_pattern, nav_item_repl, content)

content = content.replace(
    '</button>\n          );',
    '</button>\n              </TooltipTrigger>\n              <TooltipContent side="right" className={isOpen ? "hidden" : ""}>\n                {item.label}\n              </TooltipContent>\n            </Tooltip>\n          );'
)

# Replace profile and logout button in collapsed state
search = '''        ) : (
          <>
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
              aria-label={user?.name || "Profile"}
              title={user?.name || "Profile"}
            >
              <span className="text-lg font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}'''

replace = '''        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
                  aria-label={user?.name || "Profile"}
                >
                  <span className="text-lg font-black text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user?.name || "Profile"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                  aria-label={t('sidebar.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t('sidebar.logout')}
              </TooltipContent>
            </Tooltip>
          </>
        )}'''

content = content.replace(search, replace)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
