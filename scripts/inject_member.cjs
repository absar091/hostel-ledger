const fs = require('fs');

let data = fs.readFileSync('src/components/MemberDetailSheet.tsx', 'utf8');

const targetAction = "{!member.isCurrentUser && !member.isTemporary && onMergeWithMe && (";
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
data = data.replace(targetAction, memberBtn + targetAction);

fs.writeFileSync('src/components/MemberDetailSheet.tsx', data);
