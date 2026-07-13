import { test, expect } from '@playwright/test';

test('create product flow (smoke)', async ({ page }) => {
  // Create a family via the backend API so the UI has an existing family to select.
  const apiRes = await page.request.post('http://127.0.0.1:8082/api/families', {
    data: { name: 'playwright-family' },
  });
  expect(apiRes.ok()).toBeTruthy();
  const apiJson = await apiRes.json();
  const familyName = apiJson.data.name;

  // Go to create product page and let the client initialize
  await page.goto('/products/create');

  // Wait for the family to appear in the UI. The app initializes workspace and
  // fetches families; allow longer timeout for dev machines.
  const familyButton = page.getByRole('button', { name: new RegExp(`^${familyName}`) }).first();
  await expect(familyButton).toBeVisible({ timeout: 60000 });

  // Select the family and proceed
  await familyButton.click();
  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.locator('text=Step 2')).toBeVisible({ timeout: 10000 });
});
