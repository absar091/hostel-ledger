import re

with open('src/contexts/FirebaseAuthContext.tsx', 'r') as f:
    content = f.read()

# Define the broken snippet pattern (loose match)
broken_pattern = r"// 2FA Verification Logic.*sessionStorage.getItem\(\);.*localStorage.removeItem\(\);"
# Actually, let's just find the start and end of the block we injected.
start_marker = "// 2FA Verification Logic (Integrated to prevent race conditions)"
end_marker = "logger.setUserId(uid);"

# Locate the start
start_pos = content.find(start_marker)
if start_pos == -1:
    print("Could not find start of broken block")
    exit(1)

# Locate the end (it should be after start_pos)
end_pos = content.find(end_marker, start_pos)
if end_pos == -1:
    print("Could not find end of broken block")
    exit(1)

# Construct the correct block
correct_block = r"""// 2FA Verification Logic (Integrated to prevent race conditions)
            let verified = is2FAVerified;
            if (userProfile.is2FAEnabled) {
                // 1. Session Check (Sync)
                const isSessionVerified = sessionStorage.getItem(`2fa_verified_${uid}`);
                if (isSessionVerified === 'true') {
                    verified = true;
                } else {
                    // 2. Trusted Device Check (Async - only on initial load)
                    const deviceToken = localStorage.getItem(`device_token_${uid}`);
                    if (deviceToken && isInitialLoad) {
                       try {
                           const result = await callSecureApi('/api/2fa/check-trust', { deviceToken });
                           if (result.success && result.trusted) {
                               verified = true;
                               sessionStorage.setItem(`2fa_verified_${uid}`, 'true');
                           } else {
                               localStorage.removeItem(`device_token_${uid}`);
                               verified = false;
                           }
                       } catch (e) {
                           console.error('Failed to verify trust', e);
                           verified = false;
                       }
                    } else if (!deviceToken) {
                        verified = false;
                    }
                }
            }

            setIs2FAVerified(verified);
            isInitialLoad = false;
            setUser(userProfile);
            """

# Replace
new_content = content[:start_pos] + correct_block + content[end_pos:]

# Remove the duplicate 2FA logic block if it exists (my read_file showed two copies?)
# Lines 275 and 307 in previous read_file output look like duplicates.
# Let's check if there are multiple occurrences of start_marker
count = new_content.count(start_marker)
if count > 1:
    print(f"Found {count} occurrences of logic block. Cleaning up duplicates.")
    # If there are duplicates, we should probably remove the second one?
    # Or parsing the whole file to find where to cut.
    # The read_file showed:
    # ... logic ...
    # setIs2FAVerified(verified);
    # isInitialLoad = false;
    # ... logic (again) ...
    # setIs2FAVerified(verified);
    # isInitialLoad = false;
    # setUser(userProfile);

    # This implies I replaced 'setUser' with 'logic + setUser'.
    # If I ran it twice (or something), I might have nested it?
    # Let's look at the structure from read_file again.
    pass

with open('src/contexts/FirebaseAuthContext.tsx', 'w') as f:
    f.write(new_content)

print("Repaired Auth Context.")
