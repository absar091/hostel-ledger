// Normalize group.members from Firebase: may be object or array.
// Preserves Firebase key as member.id (matching frontend normalizeMembers logic).
function normalizeMembers(members) {
  if (!members) return [];
  if (Array.isArray(members)) return members;
  return Object.entries(members).map(([key, value]) => ({
    ...value,
    id: value.id || key // Use stored id if present, otherwise the Firebase key
  }));
}

module.exports = { normalizeMembers };
