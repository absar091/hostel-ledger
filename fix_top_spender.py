import sys

with open('src/pages/GroupDetail.tsx', 'r') as f:
    lines = f.readlines()

start_idx = 619
end_idx = 632

new_content = [
    '              {topSpender ? (\n',
    '                <div className="flex items-center gap-4">\n',
    '                  <Avatar name={topSpender.name} size="lg" />\n',
    '                  <div className="flex-1 min-w-0">\n',
    '                    <div className="font-black text-gray-900 text-base mb-1 tracking-tight truncate">\n',
    '                      {topSpender.isCurrentUser ? t(\'group.you_label\') : topSpender.name}\n',
    '                    </div>\n',
    '                    <div className="text-xs text-[#4a6850] font-bold">\n',
    '                      {topSpender.totalPaid > 0\n',
    '                        ? t(\'group.paid_amount\', { amount: formatAmount(topSpender.totalPaid) })\n',
    '                        : t(\'group.no_expenses_paid\')}\n',
    '                    </div>\n',
    '                  </div>\n',
    '                </div>\n',
    '              ) : (\n',
    '                <div className="text-center py-4">\n',
    '                  <div className="text-sm text-gray-500 font-medium">No expenses recorded yet</div>\n',
    '                </div>\n',
    '              )}\n'
]

lines[start_idx:end_idx] = new_content

with open('src/pages/GroupDetail.tsx', 'w') as f:
    f.writelines(lines)
