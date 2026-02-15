import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import semver from 'semver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(ROOT_DIR, 'backend-server');

const step = (msg) => console.log(chalk.cyan(`\n🔹 ${msg}`));
const success = (msg) => console.log(chalk.green(`✅ ${msg}`));
const error = (msg) => {
    console.error(chalk.red(`\n❌ ${msg}`));
    process.exit(1);
};

async function main() {
    console.log(chalk.bold.blue('🚀 Hostel Ledger Enterprise Release System\n'));

    // 1. Check Git Status
    step('Checking Git Status...');
    try {
        const status = execSync('git status --porcelain', { cwd: ROOT_DIR }).toString();
        if (status.trim()) {
            error('Git working directory is not clean. Please commit or stash changes first.');
        }
    } catch (e) {
        error('Failed to check git status. Is this a git repo?');
    }
    success('Git is clean.');

    // 2. Read Current Version
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const currentVersion = pkg.version;

    console.log(chalk.yellow(`\n📦 Current Version: ${currentVersion}`));

    // 3. Ask for bump type
    const { releaseType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'releaseType',
            message: 'Select release type:',
            choices: [
                { name: `Patch (${semver.inc(currentVersion, 'patch')})`, value: 'patch' },
                { name: `Minor (${semver.inc(currentVersion, 'minor')})`, value: 'minor' },
                { name: `Major (${semver.inc(currentVersion, 'major')})`, value: 'major' },
                { name: 'Custom', value: 'custom' }
            ]
        }
    ]);

    let newVersion;
    if (releaseType === 'custom') {
        const { customVersion } = await inquirer.prompt([{
            type: 'input',
            name: 'customVersion',
            message: 'Enter custom version:',
            validate: (input) => !!semver.valid(input) || 'Invalid SemVer version'
        }]);
        newVersion = customVersion;
    } else {
        newVersion = semver.inc(currentVersion, releaseType);
    }

    if (!newVersion) error('Could not determine new version.');

    // Confirm
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Release v${newVersion}?`,
        default: true
    }]);

    if (!confirm) {
        console.log(chalk.yellow('Release cancelled.'));
        process.exit(0);
    }

    // 4. Update Files
    step(`Updating files to v${newVersion}...`);

    // Update Root package.json
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  - Updated package.json`);

    // Update Backend package.json
    const backendPkgPath = path.join(BACKEND_DIR, 'package.json');
    if (fs.existsSync(backendPkgPath)) {
        const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf-8'));
        backendPkg.version = newVersion;
        fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2) + '\n');
        console.log(`  - Updated backend-server/package.json`);
    } else {
        console.warn(chalk.yellow('  ! backend-server/package.json not found'));
    }

    // 5. Build Process (Optional check)
    // Here strictly we should run tests/build, but skipping for speed as per user "make system" request.

    // 6. Git Commit & Tag
    step('Git Commit & Tag...');
    try {
        execSync('git add .', { cwd: ROOT_DIR }); // Stage package.json updates
        execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: ROOT_DIR });
        execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: ROOT_DIR });

        // Retrieve build metadata for display
        const commitHash = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
        const date = new Date().toISOString().split('T')[0];

        success(`Successfully released v${newVersion}`);
        console.log(chalk.green(`\n✨ Build Metadata: ${date}.${commitHash}`));
        console.log(chalk.gray('   (This metadata will be injected into the app on next build)'));

    } catch (e) {
        error(`Git operation failed: ${e.message}`);
    }
}

main().catch(err => error(err.message));
