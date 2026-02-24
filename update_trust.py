import sys

new_code = """    const userId = req.user.uid;
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ success: false, error: 'Device token is required' });
    }

    const deviceRef = admin.database().ref(`users/${userId}/trustedDevices/${deviceToken}`);
    const snapshot = await deviceRef.get();

    if (snapshot.exists()) {
      const deviceData = snapshot.val();
      const currentUA = req.headers['user-agent'] || 'Unknown';

      // Enhanced Security: Check User Agent Mismatch
      if (deviceData.userAgent && deviceData.userAgent !== currentUA) {
        console.warn(`⚠️ Trusted device UA mismatch for user ${userId}. Stored: ${deviceData.userAgent}, Current: ${currentUA}`);
        return res.json({ success: true, trusted: false, reason: 'device_mismatch' });
      }

      // Update last used timestamp
      await deviceRef.update({ lastUsed: new Date().toISOString() });
      return res.json({ success: true, trusted: true });
    } else {
      return res.json({ success: true, trusted: false });
    }"""

with open('backend-server/server.js', 'r') as f:
    lines = f.readlines()

# Verify context
start_idx = 523 # Line 524 (0-indexed 523)
end_idx = 540   # Line 541 (0-indexed 540, exclusive) - wait, line 540 in grep is the closing brace for else block?
# Grep output: 540-    }
# So lines[539] is "    }\n"
# We want to replace lines[523] to lines[539] inclusive.

# Let's find the exact lines
start_marker = "const userId = req.user.uid;"
end_marker = "} else {"

found_start = -1
for i, line in enumerate(lines):
    if "app.post('/api/2fa/check-trust'" in line:
        found_start = i
        break

if found_start == -1:
    print("Could not find endpoint definition")
    sys.exit(1)

# The block inside try { starts at found_start + 2
block_start = found_start + 2

# Find the end of the block (before catch)
block_end = -1
for i in range(block_start, len(lines)):
    if "} catch (error) {" in lines[i]:
        block_end = i - 1 # The line before catch is usually blank or closing brace
        break

# refine block_end to be the closing brace of the else/if logic
# The original code ends with:
# 540:    }
# 541:
# 542:  } catch (error) {

# So we want to replace up to 540.
# block_end found above would be 541 (blank line).
# So lines[block_start:block_end] covers 524 to 541.

lines[block_start:block_end] = [new_code + "\n"]

with open('backend-server/server.js', 'w') as f:
    f.writelines(lines)

print("Successfully updated server.js")
