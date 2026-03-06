const member = { name: "Bob" };
const targetId = member?.userId || member?.id || "unknown";
console.log(targetId);
