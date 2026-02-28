with open('src/components/TransactionDetailModal.tsx', 'r') as f:
    content = f.read()

import re

search = r"\{\/\* Badge Logic Fixed: Check if user is payer properly, and use resolvedParticipants \*\/\}.*?\{\/\* Payment Details \(for payments\) - iPhone Style \*\/\}"

match = re.search(search, content, re.DOTALL)
if match:
    print("Found the block")
else:
    print("Did not find the block")
