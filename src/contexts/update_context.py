import re

file_path = 'src/contexts/FirebaseDataContext.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Transaction Interface
# Add payers field
if 'payers?:' not in content:
    content = content.replace(
        'paidByName: string;',
        'paidByName: string;\n  payers?: { id: string; name: string; amount: number; userId?: string | null }[];'
    )

# 2. Update addExpense signature in FirebaseDataContextType
# Search for: addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string; clientTxnId?: string })
# Replace with one including payers
pattern_sig = r"addExpense: \(data: \{ groupId: string; amount: number; paidBy: string; participants: string\[\]; note: string; place: string; clientTxnId\?: string \}\) =>"
replacement_sig = "addExpense: (data: { groupId: string; amount: number; paidBy: string; payers?: { id: string; amount: number }[]; participants: string[]; note: string; place: string; clientTxnId?: string }) =>"

content = re.sub(pattern_sig, replacement_sig, content)

# 3. Update addExpense implementation
# Search for: const addExpense = async (data: {
# Replace with updated signature
pattern_impl = r"const addExpense = async \(data: \{[^\}]+\}\): Promise"
replacement_impl = "const addExpense = async (data: { groupId: string; amount: number; paidBy: string; payers?: { id: string; amount: number }[]; participants: string[]; note: string; place: string; clientTxnId?: string }): Promise"

content = re.sub(pattern_impl, replacement_impl, content)

# 4. Update the callSecureApi payload
# Search for: const result = await callSecureApi('/api/add-expense', {
# Add payers to the object
pattern_call = r"const result = await callSecureApi\('/api/add-expense', \{"
replacement_call = "const result = await callSecureApi('/api/add-expense', {\n        payers: data.payers,"

content = re.sub(pattern_call, replacement_call, content)

# 5. Update offline save
# Search for: const offlineId = await saveOfflineExpense({
# Add payers
pattern_offline = r"const offlineId = await saveOfflineExpense\(\{"
replacement_offline = "const offlineId = await saveOfflineExpense({\n          payers: data.payers,"

# Note: There are two occurrences of saveOfflineExpense (offline check & network error fallback)
# re.sub replaces all by default
content = re.sub(pattern_offline, replacement_offline, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated FirebaseDataContext.tsx")
