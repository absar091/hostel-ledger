import re

file_path = 'src/components/TimelineItem.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Imports
if 'Users' not in content:
    content = content.replace(
        'import { UtensilsCrossed, HandCoins, ShoppingBag, Coffee, Car, Wallet, Plus } from "lucide-react";',
        'import { UtensilsCrossed, HandCoins, ShoppingBag, Coffee, Car, Wallet, Plus, Users } from "lucide-react";'
    )

# 2. Update Interface
if 'payers?:' not in content:
    content = content.replace(
        'paidBy?: string;',
        'paidBy?: string;\n  payers?: { name: string; amount: number }[];'
    )

# 3. Update Props Destructuring
content = content.replace(
    'paidBy,',
    'paidBy,\n  payers,'
)

# 4. Update Display Logic (Avatar)
# Search for: {paidBy ? (
avatar_block = r'{paidBy \? \(\s*<div className="relative">\s*<Avatar name={paidBy} size="md" />'
avatar_replacement = """{payers && payers.length > 1 ? (
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
               +{payers.length}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
               <Users className="w-3 h-3 text-[#4a6850]" />
            </div>
          </div>
        ) : paidBy ? (
          <div className="relative">
            <Avatar name={paidBy} size="md" />"""

content = re.sub(avatar_block, avatar_replacement, content)

# 5. Update Display Logic (Text)
# Search for: Paid by {paidBy}
text_block = r'Paid by \{paidBy\}'
text_replacement = """{payers && payers.length > 1 ? `Paid by ${payers.length} people` : `Paid by ${paidBy}`}"""

content = re.sub(text_block, text_replacement, content)

# 6. Update prop comparison
comparison_block = r'prevProps.paidBy !== nextProps.paidBy \|\|'
comparison_replacement = """prevProps.paidBy !== nextProps.paidBy ||
    (prevProps.payers?.length !== nextProps.payers?.length) ||"""

content = re.sub(comparison_block, comparison_replacement, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated TimelineItem.tsx")
