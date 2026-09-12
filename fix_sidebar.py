import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# 1. Add Tooltip imports
if 'Tooltip' not in content:
    content = content.replace(
        'import { cn } from "@/lib/utils";',
        'import { cn } from "@/lib/utils";\nimport { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";'
    )

# Replace navigation item button
nav_search = r'''            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                active
                  ? "bg-[#1B4332] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? item.label : undefined}
            >'''

nav_replace = r'''            <Tooltip delayDuration={0} key={item.id}>
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

content = content.replace(nav_search, nav_replace)

# Replace end of navigation button to add Tooltip closure
nav_end_search = r'''              {/* Badge */}
              {item.badge > 0 && (
                <div className={cn(
                  "bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white",
                  isOpen ? "ml-auto px-1.5 h-5 min-w-[20px]" : "absolute -top-1 -right-1 w-4 h-4"
                )}>
                  {item.badge}
                </div>
              )}
            </button>'''

nav_end_replace = r'''              {/* Badge */}
              {item.badge > 0 && (
                <div className={cn(
                  "bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white",
                  isOpen ? "ml-auto px-1.5 h-5 min-w-[20px]" : "absolute -top-1 -right-1 w-4 h-4"
                )}>
                  {item.badge}
                </div>
              )}
                </button>
              </TooltipTrigger>
              {!isOpen && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>'''

content = content.replace(nav_end_search, nav_end_replace)

# Replace profile button
profile_search = r'''            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
              aria-label={user?.name || "Profile"}
              title={user?.name || "Profile"}
            >
              <span className="text-lg font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
            </button>'''

profile_replace = r'''            <Tooltip delayDuration={0}>
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
              <TooltipContent side="right">{user?.name || "Profile"}</TooltipContent>
            </Tooltip>'''

content = content.replace(profile_search, profile_replace)

# Replace logout button
logout_search = r'''            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>'''

logout_replace = r'''            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                  aria-label={t('sidebar.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('sidebar.logout')}</TooltipContent>
            </Tooltip>'''

content = content.replace(logout_search, logout_replace)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
