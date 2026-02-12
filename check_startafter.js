const admin = require('firebase-admin');

console.log('Checking startAfter...');
try {
  // We don't need to initialize app to check prototype or just creating a dummy query if possible
  // Actually, we can just check if the symbol exists on the Query prototype if we can access it
  // Or just try to construct a query.

  // We need to initialize to get a ref
  // We can use a dummy service account or just check the exports

  // Let's try to see if we can find the definition in node_modules
  const fs = require('fs');
  const path = require('path');
  const queryPath = path.resolve('backend-server/node_modules/@firebase/database/dist/index.node.cjs.js'); // guessing path
  // simpler: check if admin.database.Query.prototype.startAfter exists

  // We need to require the module from backend-server context
  const database = require(path.resolve('backend-server/node_modules/@firebase/database-compat'));
  // It's likely wrapped.

} catch (e) {
  console.log(e);
}
