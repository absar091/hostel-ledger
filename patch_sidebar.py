import re

file_path = 'src/components/Sidebar.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Add import
import_stmt = 'import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";\n'
content = re.sub(r'(import Logo from "./Logo";)', r'\1\n' + import_stmt, content)


# Patch navItems.map
nav_map_search = r'''          return \(
            <button
              key={item\.id}
              onClick=\{\(\) => navigate\(item\.path\)\}
              aria-current=\{active \? "page" : undefined\}
              className=\{cn\(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                active
                  \? "bg-\[#1B4332\] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100",
                !isOpen && "justify-center"
              \)\}
              title=\{!isOpen \? item\.label : undefined\}
            >
              \{\/\* Active indicator bar \*\/\}
              \{active && \(
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full"><\/div>
              \)\}
              <Icon className=\{cn\("w-5 h-5 flex-shrink-0", active && "font-bold"\)\} \/>
              \{isOpen && <span className=\{cn\("font-bold truncate", active && "font-black"\)\}>\{item\.label\}<\/span>\}

              \{\/\* Badge \*\/\}
              \{item\.badge > 0 && \(
                <div className=\{cn\(
                  "bg-red-500 text-white text-\[10px\] font-bold rounded-full flex items-center justify-center border-2 border-white",
                  isOpen \? "ml-auto px-1\.5 h-5 min-w-\[20px\]" : "absolute -top-1 -right-1 w-4 h-4"
                \)\}>
                  \{item\.badge\}
                <\/div>
              \)\}
            <\/button>
          \);'''

nav_map_replace = r'''          const btn = (
            <button
              {...(isOpen ? { key: item.id } : {})}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                active
                  ? "bg-[#1B4332] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100",
                !isOpen && "justify-center"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full"></div>
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "font-bold")} />
              {isOpen && <span className={cn("font-bold truncate", active && "font-black")}>{item.label}</span>}

              {/* Badge */}
              {item.badge > 0 && (
                <div className={cn(
                  "bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white",
                  isOpen ? "ml-auto px-1.5 h-5 min-w-[20px]" : "absolute -top-1 -right-1 w-4 h-4"
                )}>
                  {item.badge}
                </div>
              )}
            </button>
          );

          if (!isOpen) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  {btn}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return btn;'''

content = re.sub(nav_map_search, nav_map_replace, content)

# Patch bottom profile/logout section
bottom_search = r'''        \) : \(
          <>
            <button
              onClick=\{\(\) => navigate\("/profile"\)\}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-\[#4a6850\] to-\[#3d5643\] flex items-center justify-center mx-auto mb-3"
              aria-label=\{user\?\.name \|\| "Profile"\}
              title=\{user\?\.name \|\| "Profile"\}
            >
              <span className="text-lg font-black text-white">
                \{user\?\.name \? user\.name\.charAt\(0\)\.toUpperCase\(\) : "U"\}
              <\/span>
            <\/button>
            <button
              onClick=\{handleLogout\}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
              aria-label=\{t\('sidebar\.logout'\)\}
              title=\{t\('sidebar\.logout'\)\}
            >
              <LogOut className="w-5 h-5" \/>
            <\/button>
          <\/>
        \)'''

bottom_replace = r'''        ) : (
          <div className="flex flex-col gap-3 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto"
                  aria-label={user?.name || "Profile"}
                >
                  <span className="text-lg font-black text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user?.name || "Profile"}</p>
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
                <p>{t('sidebar.logout')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )'''

content = re.sub(bottom_search, bottom_replace, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Patched Sidebar.tsx")
