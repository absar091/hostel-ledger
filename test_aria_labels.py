import re

file_path = "src/components/GroupChat.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Check for aria-labels on buttons
buttons = re.findall(r'<button[^>]*>', content)
aria_labels_found = 0
for button in buttons:
    if "aria-label" in button:
        aria_labels_found += 1
        print(f"Found button with aria-label: {button}")

print(f"Total buttons: {len(buttons)}")
print(f"Buttons with aria-label: {aria_labels_found}")

# My changes were to add aria-labels to:
# 1. Close hint
# 2. Close preview
# 3. Remove image
# 4. Attach image
# 5. Toggle hint
# 6. Send message
# Total 6 buttons.
