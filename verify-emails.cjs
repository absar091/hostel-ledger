const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const PORT = 3000;
const templatesDir = path.join(__dirname, 'backend-server', 'email-templates');

const server = http.createServer((req, res) => {
    const filename = req.url.substring(1);
    if (!filename) {
        fs.readdir(templatesDir, (err, files) => {
            if (err) {
                res.statusCode = 500;
                res.end('Error listing files');
                return;
            }
            const list = files.map(f => `<li><a href="/${f}">${f}</a></li>`).join('');
            res.setHeader('Content-Type', 'text/html');
            res.end(`<ul>${list}</ul>`);
        });
        return;
    }

    const filepath = path.join(templatesDir, filename);
    fs.readFile(filepath, 'utf8', (err, content) => {
        if (err) {
            res.statusCode = 404;
            res.end('Not found');
            return;
        }
        // Replace variables with dummy data
        const replaced = content
            .replace(/{{USER_NAME}}/g, 'John Doe')
            .replace(/{{INVITEE_NAME}}/g, 'Jane Doe')
            .replace(/{{SENDER_NAME}}/g, 'Alice Smith')
            .replace(/{{GROUP_NAME}}/g, 'Summer Trip')
            .replace(/{{CODE}}/g, '123456')
            .replace(/{{TRANSACTION_TYPE}}/g, 'Expense')
            .replace(/{{AMOUNT}}/g, '$50.00')
            .replace(/{{DATE}}/g, '2023-10-27')
            .replace(/{{DESCRIPTION}}/g, 'Dinner at Restaurant')
            .replace(/{{DEVICE_NAME}}/g, 'Chrome on Windows')
            .replace(/{{LOCATION}}/g, 'New York, USA')
            .replace(/{{IP_ADDRESS}}/g, '192.168.1.1')
            .replace(/{{TIMESTAMP}}/g, 'Oct 27, 2023, 10:00 AM')
            .replace(/{{RESET_LINK}}/g, 'https://example.com/reset');

        res.setHeader('Content-Type', 'text/html');
        res.end(replaced);
    });
});

server.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);

    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

        for (const file of files) {
            console.log(` capturing ${file}...`);
            await page.goto(`http://localhost:${PORT}/${file}`);
            await page.screenshot({ path: `${file}.png`, fullPage: true });
        }

        await browser.close();
        server.close();
        console.log('Done.');
    } catch (e) {
        console.error(e);
        server.close();
        process.exit(1);
    }
});
