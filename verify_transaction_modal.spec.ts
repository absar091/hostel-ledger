import { test, expect } from '@playwright/test';

test('Verify Transaction Detail Modal logic', async ({ page }) => {
  // Go to the verification page
  await page.goto('http://localhost:5173/verify-transaction-modal');

  // Wait for modal to appear
  await expect(page.getByText('Dinner')).toBeVisible();

  // Check Payer Name
  // It should say "Paid by Invited Member" or similar
  await expect(page.getByText('Paid by Invited Member')).toBeVisible();

  // Check that current user is recognized as participant
  // The "Not a participant" badge should NOT be present
  await expect(page.getByText('Not a participant')).not.toBeVisible();

  // Check that "Invited Member" is in the list
  await expect(page.getByText('Invited Member')).toBeVisible();

  // Check that "Test User" (You) is in the list
  // The logic usually appends "(You)"
  await expect(page.getByText('Test User (You)')).toBeVisible();
});
