const fs = require('fs');

const fileContent = fs.readFileSync('backend-server/server.js', 'utf8');

const regex = /db\.ref\(`users\/\${m\.userId}`\)\.get\(\)/g;
let count = 0;
while (regex.exec(fileContent)) {
    count++;
}
console.log(`Found db.ref(\`users/\${m.userId}\`).get() ${count} times.`);
