const { execSync } = require('child_process');

try {
  console.log("Building frontend...");
  execSync('pnpm build', { stdio: 'inherit' });
  console.log("Frontend build successful!");
} catch (error) {
  console.error("Frontend build failed");
  process.exit(1);
}
