import re

files = [
    'src/contexts/DataContext.tsx',
    'src/contexts/FirebaseAuthContext.tsx',
    'src/contexts/FirebaseDataContext.tsx',
    'src/pages/GroupDetail.tsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Check for useCallback
    if 'useCallback' in content and 'useCallback' not in content[:500]:
        content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react[\'"];',
                         lambda m: f"import {{{m.group(1)}{', useCallback' if 'useCallback' not in m.group(1) else ''}}} from 'react';",
                         content)

    # Check for useMemo
    if 'useMemo' in content and 'useMemo' not in content[:500]:
         content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react[\'"];',
                         lambda m: f"import {{{m.group(1)}{', useMemo' if 'useMemo' not in m.group(1) else ''}}} from 'react';",
                         content)

    # Also add the comments explaining the optimization
    if file == 'src/pages/GroupDetail.tsx':
        content = content.replace(
            "const transactions = useMemo(() => id ? getTransactionsByGroup(id) : [], [id, getTransactionsByGroup]);",
            "// ⚡ Bolt Optimization: Memoize the derived arrays from context to maintain stable references across renders,\n  // preventing O(N) unnecessary re-renders of all TimelineItem components when unrelated state in GroupDetail changes.\n  const transactions = useMemo(() => id ? getTransactionsByGroup(id) : [], [id, getTransactionsByGroup]);"
        )
        content = content.replace(
            "const settlements = useMemo(() => id ? getSettlements(id) : {}, [id, getSettlements]);",
            "// ⚡ Bolt Optimization: Memoize the derived settlements object for stable references across renders.\n  const settlements = useMemo(() => id ? getSettlements(id) : {}, [id, getSettlements]);"
        )
    elif file == 'src/contexts/FirebaseDataContext.tsx':
        content = content.replace(
            "const getTransactionsByGroup = useCallback((groupId: string): Transaction[] => {",
            "// ⚡ Bolt Optimization: Wrap context derivation functions in useCallback to provide stable references\n  // to consuming components, enabling effective use of useMemo downstream.\n  const getTransactionsByGroup = useCallback((groupId: string): Transaction[] => {"
        )
    elif file == 'src/contexts/DataContext.tsx':
         content = content.replace(
            "const getTransactionsByGroup = useCallback((groupId: string): Transaction[] => {",
            "// ⚡ Bolt Optimization: Wrap context derivation functions in useCallback to provide stable references\n  // to consuming components, enabling effective use of useMemo downstream.\n  const getTransactionsByGroup = useCallback((groupId: string): Transaction[] => {"
        )
    elif file == 'src/contexts/FirebaseAuthContext.tsx':
         content = content.replace(
            "const getSettlements = useCallback((groupId?: string): { [personId: string]: { toReceive: number; toPay: number } } => {",
            "// ⚡ Bolt Optimization: Wrap context derivation functions in useCallback to provide stable references\n  // to consuming components, enabling effective use of useMemo downstream.\n  const getSettlements = useCallback((groupId?: string): { [personId: string]: { toReceive: number; toPay: number } } => {"
        )


    with open(file, 'w') as f:
        f.write(content)

print("Applied fixes")
