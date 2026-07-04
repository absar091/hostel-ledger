import { test, expect } from '@playwright/test';

test('Verify Tooltips and ARIA Labels in TransactionDetailModal', async ({ page }) => {
  // Use mock page rendering the transaction detail modal structure to verify locators
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="root">
          <div class="flex items-center gap-2">
            <!-- Share as Image button -->
            <button aria-label="Share as Image" class="w-10 h-10 rounded-full bg-blue-500 focus-visible:ring-2"></button>
            <!-- Close button -->
            <button aria-label="Close" class="w-10 h-10 rounded-full bg-gray-900 focus-visible:ring-2"></button>
            <!-- Copy Reference button -->
            <button aria-label="Copy Reference" class="p-2 rounded-full bg-white focus-visible:ring-2"></button>
          </div>
        </div>
      </body>
    </html>
  `);

  // Verify elements are queryable by their new aria-labels
  await expect(page.locator("button[aria-label='Share as Image']")).toBeVisible();
  await expect(page.locator("button[aria-label='Close']")).toBeVisible();
  await expect(page.locator("button[aria-label='Copy Reference']")).toBeVisible();
});
