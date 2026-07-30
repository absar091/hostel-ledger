import re

def apply_patch(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if search in content:
        content = content.replace(search, replace)

        if 'import { Tooltip' not in content:
            if 'useTranslation' in content:
                content = content.replace('import { useTranslation } from "react-i18next";', 'import { useTranslation } from "react-i18next";\nimport { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";')
            else:
                content = content.replace('import { useCurrency } from "@/contexts/CurrencyContext";', 'import { useCurrency } from "@/contexts/CurrencyContext";\nimport { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"Could not find search string in {filepath}")

# ToReceive.tsx
search4 = '''                    <button
                      onClick={(e) => handleRemindClick(e, person)}
                      disabled={remindingId === `${person.id}-${person.groupId}`}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#4a6850]/5 flex items-center justify-center text-[#4a6850] hover:bg-[#4a6850] hover:text-white active:scale-90 transition-all duration-300 shadow-sm disabled:opacity-50 group/remind"
                      title="Send Reminder"
                    >
                      {remindingId === `${person.id}-${person.groupId}` ? (
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                      ) : (
                        <Bell className="w-5 h-5 md:w-6 md:h-6 group-hover/remind:animate-bounce" />
                      )}
                    </button>'''

replace4 = '''                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => handleRemindClick(e, person)}
                          disabled={remindingId === `${person.id}-${person.groupId}`}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#4a6850]/5 flex items-center justify-center text-[#4a6850] hover:bg-[#4a6850] hover:text-white active:scale-90 transition-all duration-300 shadow-sm disabled:opacity-50 group/remind focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {remindingId === `${person.id}-${person.groupId}` ? (
                            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                          ) : (
                            <Bell className="w-5 h-5 md:w-6 md:h-6 group-hover/remind:animate-bounce" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send Reminder</p>
                      </TooltipContent>
                    </Tooltip>'''

apply_patch('src/pages/ToReceive.tsx', search4, replace4)
