import re

file_path = 'src/components/AddExpenseSheet.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern to find the corrupted block
# Matches "const [paidBy: finalPaidBy," followed by newlines and spaces, "payers: finalPayers, setPaidBy] = useState("");"
pattern = r'const \[paidBy: finalPaidBy,\s*payers: finalPayers, setPaidBy\] = useState\(""\);'

replacement = 'const [paidBy, setPaidBy] = useState("");'

new_content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Successfully fixed syntax error in AddExpenseSheet.tsx")
