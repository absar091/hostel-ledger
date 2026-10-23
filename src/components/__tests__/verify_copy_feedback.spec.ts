
import { test, expect } from '@playwright/test';

test('verify copy id feedback', async ({ page }) => {
  // Navigate to the verification page
  await page.goto('/verify-sheets');

  // Open the Transaction Detail Modal
  await page.getByRole('button', { name: 'Open Transaction Detail' }).click();

  // Wait for the modal to appear
  await expect(page.getByText('txn_1234567890')).toBeVisible();

  // Find the Copy ID button (using the aria-label attribute which is initially "Copy Reference")
  const copyButton = page.locator("button[aria-label='Copy Reference']");

  // Click the copy button
  await copyButton.click();

  // Wait for the feedback state (icon change and title update)
  // The button's aria-label should change to "Copied!"
  const copiedButton = page.locator("button[aria-label='Copied!']");
  await expect(copiedButton).toBeVisible();

  // Optional: Verify the icon changed (checking for the check icon SVG or class if possible,
  // but title check is robust enough for functional verification)

  // Wait for the feedback to revert
  // We can use a timeout in expect or wait explicitly, but here we wait for the original button to reappear
  await expect(copyButton).toBeVisible({ timeout: 5000 });
});
