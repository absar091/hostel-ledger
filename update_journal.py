import re
import datetime

learning = f"""
## {datetime.date.today().strftime('%Y-%m-%d')} - Replacing Native Title Attributes with Radix Tooltips
**Learning:** Native `title` attributes on interactive elements provide a delayed, inconsistently styled, and poorly accessible tooltip experience. When integrating Radix UI tooltips, it's critical to explicitly remove the native `title` attribute to prevent a "double-tooltip" effect where both the custom and native tooltips appear simultaneously, confusing users and screen readers.
**Action:** Always replace native `title` attributes on icon-only buttons with Radix `<Tooltip>` components, ensuring the native attribute is removed. Use `<TooltipTrigger asChild>` to prevent invalid HTML nesting.
"""

with open('.jules/palette.md', 'r') as f:
    content = f.read()

if "Replacing Native Title Attributes with Radix Tooltips" not in content:
    with open('.jules/palette.md', 'a') as f:
        f.write(learning)
