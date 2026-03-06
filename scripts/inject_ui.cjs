const fs = require('fs');

// --- 1. SETTINGS PAGE ---
let settingsData = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// The support import is at the bottom, move it to top
settingsData = settingsData.replace(/\/\/ Added Support Sheet Import\nimport { SupportSheet } from '\.\.\/components\/SupportSheet';/g, '');
if (!settingsData.includes('SupportSheet')) {
    settingsData = "import { SupportSheet } from '../components/SupportSheet';\n" + settingsData;
}

const targetSettingsBtn = "<span>Privacy Policy</span>\n                                </button>";
const supportBtn = `
                                <button onClick={() => setIsSupportSheetOpen(true)} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Contact Support</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </button>`;
if (!settingsData.includes('Contact Support')) {
    settingsData = settingsData.replace(targetSettingsBtn, targetSettingsBtn + supportBtn);
}

const targetSettingsSheet = "</LanguageSelectionSheet>";
const sheetCode = `\n                    <SupportSheet isOpen={isSupportSheetOpen} onClose={() => setIsSupportSheetOpen(false)} />`;
if (!settingsData.includes('<SupportSheet')) {
    settingsData = settingsData.replace(targetSettingsSheet, targetSettingsSheet + sheetCode);
}
fs.writeFileSync('src/pages/Settings.tsx', settingsData);


// --- 2. GROUP SETTINGS SHEET ---
let groupData = fs.readFileSync('src/components/GroupSettingsSheet.tsx', 'utf8');

if (!groupData.includes('ReportSheet')) {
    groupData = groupData.replace('import { UserPlus, Trash2, AlertTriangle, X } from "lucide-react";', 'import { UserPlus, Trash2, AlertTriangle, X, ShieldAlert } from "lucide-react";\nimport { ReportSheet } from "./ReportSheet";');
}

if (!groupData.includes('setIsReportOpen')) {
    groupData = groupData.replace('const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);', 'const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);\n  const [isReportOpen, setIsReportOpen] = useState(false);');
}

const targetGroupBtn = "{isOwner && (";
const groupBtn = `
            {/* Report Group Button */}
            <div className="pt-6 border-t border-[#4a6850]/10 mb-4">
              <Button
                  variant="outline"
                  className="w-full h-14 rounded-3xl text-red-600 border-red-200 bg-red-50 hover:bg-red-100 font-bold transition-all"
                  onClick={() => setIsReportOpen(true)}
                >
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  Report Group
              </Button>
            </div>
`;
if (!groupData.includes('Report Group')) {
    groupData = groupData.replace(targetGroupBtn, groupBtn + targetGroupBtn);
}

const targetGroupEnd = "</AlertDialogContent>\n      </AlertDialog>\n    </>";
const groupEndCode = `
      <ReportSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={group.id}
        targetType="group"
      />
    </>`;
if (!groupData.includes('targetType="group"')) {
    groupData = groupData.replace(targetGroupEnd, "</AlertDialogContent>\n      </AlertDialog>" + groupEndCode);
}
fs.writeFileSync('src/components/GroupSettingsSheet.tsx', groupData);

console.log("Done");
