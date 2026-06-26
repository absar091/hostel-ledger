import json

with open('database.rules.json', 'r') as f:
    rules = json.load(f)

users_rules = rules['rules']['users']['$uid']

# Remove ineffective .write rules on child fields
if 'walletBalance' in users_rules and '.write' in users_rules['walletBalance']:
    del users_rules['walletBalance']['.write']
if 'settlements' in users_rules and '.write' in users_rules['settlements']:
    del users_rules['settlements']['.write']

# Secure sensitive fields with .validate rules
users_rules.setdefault('walletBalance', {})['.validate'] = "newData.val() === data.val()"
users_rules.setdefault('settlements', {})['.validate'] = "newData.val() === data.val()"
users_rules.setdefault('role', {})['.validate'] = "newData.val() === data.val()"
users_rules.setdefault('accountStatus', {})['.validate'] = "newData.val() === data.val()"

with open('database.rules.json', 'w') as f:
    json.dump(rules, f, indent=2)

print("Updated database.rules.json")
