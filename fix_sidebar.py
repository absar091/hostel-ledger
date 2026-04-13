import re

with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()

# Add Tooltip imports
imports = 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\n'
if imports not in content:
    content = re.sub(r'(import Logo from "\./Logo";\n)', r'\1' + imports, content)

# Wrap root div with TooltipProvider
if '<TooltipProvider>' not in content:
    content = content.replace(
        '<aside\n      className={cn(',
        '<TooltipProvider>\n    <aside\n      className={cn('
    )

    content = content.replace(
        '</aside>\n  );\n};',
        '</aside>\n    </TooltipProvider>\n  );\n};'
    )

# Fix Nav items
nav_search = '''          return (
            <button
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

nav_replace = '''          return (
            <Tooltip key={item.id}>
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

nav_end_search = '''              )}
            </button>
          );
        })}'''

nav_end_replace = '''              )}
                </button>
              </TooltipTrigger>
              {!isOpen && (
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}'''
content = content.replace(nav_end_search, nav_end_replace)

# Fix user profile button
profile_search = '''            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
              aria-label={user?.name || "Profile"}
              title={user?.name || "Profile"}
            >'''

profile_replace = '''            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
                  aria-label={user?.name || "Profile"}
                >'''
content = content.replace(profile_search, profile_replace)

profile_end_search = '''              <span className="text-lg font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
            </button>
            <button'''

profile_end_replace = '''              <span className="text-lg font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user?.name || "Profile"}</p>
              </TooltipContent>
            </Tooltip>
            <button'''
content = content.replace(profile_end_search, profile_end_replace)

# Fix logout button
logout_search = '''            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
            >'''

logout_replace = '''            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                  aria-label={t('sidebar.logout')}
                >'''
content = content.replace(logout_search, logout_replace)

logout_end_search = '''              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </aside>'''

logout_end_replace = '''              <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('sidebar.logout')}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </aside>'''
content = content.replace(logout_end_search, logout_end_replace)

with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)
