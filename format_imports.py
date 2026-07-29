import re

def clean_imports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Handle duplicate commas and spaces
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r'\{\s*,', '{ ', content)

    with open(filepath, 'w') as f:
        f.write(content)

for f in ['src/contexts/DataContext.tsx', 'src/contexts/FirebaseAuthContext.tsx']:
    clean_imports(f)

print("Imports cleaned")
