const fs = require('fs');

// --- 3. MEMBER DETAIL SHEET ---
let memberData = fs.readFileSync('src/components/MemberDetailSheet.tsx', 'utf8');

if (!memberData.includes('ReportSheet')) {
    memberData = memberData.replace('import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote, ArrowRight, Wallet } from "lucide-react";', 'import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote, ArrowRight, Wallet, ShieldAlert } from "lucide-react";\nimport { ReportSheet } from "./ReportSheet";\nimport { useState } from "react";');
}

if (!memberData.includes('setIsReportOpen')) {
    memberData = memberData.replace("  if (!member) return null;", "  const [isReportOpen, setIsReportOpen] = useState(false);\n  if (!member) return null;");
}

const targetMemberBtn = "{!member.isCurrentUser && (";
const memberBtn = `
          {/* Report Member Option */}
          {!member.isCurrentUser && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 bg-red-50 hover:bg-red-100 font-bold mb-3"
              onClick={() => setIsReportOpen(true)}
            >
              <ShieldAlert className="w-5 h-5 mr-2" />
              Report Member
            </Button>
          )}
`;
if (!memberData.includes('Report Member')) {
    memberData = memberData.replace(targetMemberBtn, memberBtn + targetMemberBtn);
}

if (!memberData.includes('targetType="user"')) {
    const targetMemberReturn = "  return (\n    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>";
    memberData = memberData.replace(targetMemberReturn, "  return (\n    <>\n    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>");

    const targetMemberEnd = "        </div>\n      </SheetContent>\n    </Sheet>\n  );\n};";
    const memberEndCode = `        </div>
      </SheetContent>
    </Sheet>
    <ReportSheet
      isOpen={isReportOpen}
      onClose={() => setIsReportOpen(false)}
      targetId={member?.userId || member?.id}
      targetType="user"
    />
    </>
  );
};`;
    memberData = memberData.replace(targetMemberEnd, memberEndCode);
}

fs.writeFileSync('src/components/MemberDetailSheet.tsx', memberData);
console.log("Done Member Detail");
