import re

with open('src/components/GroupSettingsSheet.tsx', 'r') as f:
    content = f.read()

# Check for copy invite link button
assert "aria-label={t('group.copy_invite', 'Copy Group Invite Link')}" in content, "Missing copy invite link aria-label"
assert "<TooltipContent>\n                      <p>{t('group.copy_invite', 'Copy Group Invite Link')}</p>\n                    </TooltipContent>" in content, "Missing copy invite tooltip"

# Check for search members button
assert "aria-label={t('group.search_member', 'Search member')}" in content, "Missing search member aria-label"
assert "<TooltipContent>\n                          <p>{t('group.search_member', 'Search member')}</p>\n                        </TooltipContent>" in content, "Missing search member tooltip"

# Check for close add member button
assert "aria-label={t('group.close_add_member', 'Close add member')}" in content, "Missing close add member aria-label"
assert "<TooltipContent>\n                        <p>{t('group.close_add_member', 'Close add member')}</p>\n                      </TooltipContent>" in content, "Missing close add member tooltip"

print("All programmatic frontend verifications passed.")
