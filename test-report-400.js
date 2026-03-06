const types = ['user', 'group'];
const type = "user";
const targetId = "123";
const reason = "Spam";
console.log(!types.includes(type) || !targetId || !reason);
