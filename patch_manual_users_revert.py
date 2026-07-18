import re

with open('src/components/CreateGroupSheet.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to revert my previous bad patch on MANUAL MEMBERS. Let's see the current state
