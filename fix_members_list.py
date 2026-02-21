import sys

with open('src/pages/GroupDetail.tsx', 'r') as f:
    lines = f.readlines()

# Find the start of the map
start_idx = 480 # Line 481 is index 480
if "group.members.map" not in lines[start_idx]:
    print("Error: Could not find group.members.map at line 481")
    # Search for it
    for i, line in enumerate(lines):
        if "group.members.map" in line and "{activeTab === \"members\"" in "".join(lines[max(0, i-10):i]):
             start_idx = i
             print(f"Found at {i+1}")
             break

# Replace the start line
lines[start_idx] = '            {group.members.length === 0 ? (\n'                    '              <div className="text-center py-12 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">\n'                    '                <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-[#4a6850]/20">\n'                    '                  <Users className="w-7 h-7 text-[#4a6850] font-bold" />\n'                    '                </div>\n'                    '                <h3 className="text-base font-black text-gray-900 mb-1.5 tracking-tight">No members found</h3>\n'                    '              </div>\n'                    '            ) : (\n'                    '              group.members.map((member, index) => {\n'

# Find the end of the map
# It should be around line 579
end_idx = 578 # Line 579 is index 578
if "})}" not in lines[end_idx].strip():
    print(f"Error: Could not find end of map at line 579. Line content: {lines[end_idx]}")
    # Search for it
    for i in range(start_idx, len(lines)):
        if lines[i].strip() == "})}":
            end_idx = i
            print(f"Found end at {i+1}")
            break

# Replace the end line
lines[end_idx] = '            }))}\n'

with open('src/pages/GroupDetail.tsx', 'w') as f:
    f.writelines(lines)
