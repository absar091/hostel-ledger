const fs = require('fs');

let data = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

if (!data.includes('import { SupportSheet } from')) {
    data = "import { SupportSheet } from '../components/SupportSheet';\n" + data;
}

if (!data.includes('isSupportSheetOpen')) {
    data = data.replace('const [showUpdateAvatar, setShowUpdateAvatar] = useState(false);', 'const [showUpdateAvatar, setShowUpdateAvatar] = useState(false);\n  const [isSupportSheetOpen, setIsSupportSheetOpen] = useState(false);');
}

const targetMailto = `<a
                href="mailto:support@aarx.online"
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >`;
const buttonReplace = `<button
                onClick={() => setIsSupportSheetOpen(true)}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >`;

data = data.replace(targetMailto, buttonReplace);
data = data.replace('</ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />\n              </a>', '</ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />\n              </button>');

// Because it is `</a>` I need to be exact
data = data.replace('<ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />\n              </a>', '<ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />\n              </button>');


const endTarget = "        <MobileHeader />\n      </div>\n    </div>\n  );";
const endInject = `        <MobileHeader />\n      </div>\n      <SupportSheet isOpen={isSupportSheetOpen} onClose={() => setIsSupportSheetOpen(false)} />\n    </div>\n  );`;
data = data.replace(endTarget, endInject);

fs.writeFileSync('src/pages/Profile.tsx', data);
