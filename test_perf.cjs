const fs = require('fs');

const fileContent = fs.readFileSync('backend-server/server.js', 'utf8');

const matches = fileContent.match(/db\.ref\([^)]+\)\.get\(\)/g);
if (matches) {
    console.log(`Found ${matches.length} database get calls.`);
} else {
    console.log('No matches found.');
}
