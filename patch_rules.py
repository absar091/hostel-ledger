import json

with open('database.rules.json', 'r') as f:
    rules = json.load(f)

# The users object contains a role field that determines if a user is an admin.
# A user could theoretically escalate their privileges by setting their own role to 'admin' or 'superadmin'.
# We need to explicitly deny modifying the `role` field unless it's already matching, or validate it.
if "role" not in rules["rules"]["users"]["$uid"]:
    rules["rules"]["users"]["$uid"]["role"] = {}

rules["rules"]["users"]["$uid"]["role"][".validate"] = "(!data.exists() && newData.val() === 'user') || (data.exists() && newData.val() === data.val()) || (auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin'))"

if "accountStatus" not in rules["rules"]["users"]["$uid"]:
    rules["rules"]["users"]["$uid"]["accountStatus"] = {}

rules["rules"]["users"]["$uid"]["accountStatus"][".validate"] = "(!data.exists() && newData.val() === 'active') || (data.exists() && newData.val() === data.val()) || (auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin'))"

with open('database.rules.json', 'w') as f:
    json.dump(rules, f, indent=2)

print("Rules patched")
