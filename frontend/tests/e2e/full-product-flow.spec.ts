import { test, expect } from '@playwright/test';

// Full product flow: create family + product via API, then navigate to product
// detail page and assert UI renders without runtime errors (health score guard).

test('full product flow: create family + product and view details', async ({ page }) => {
  // Create family
  const famRes = await page.request.post('http://127.0.0.1:8082/api/families', {
    data: { name: 'e2e-family' },
  });
  expect(famRes.ok()).toBeTruthy();
  const famJson = await famRes.json();
  const familyId = famJson.data.id;

  // Create product (via API for speed/stability) with no health_score to exercise guard
  const prodRes = await page.request.post('http://127.0.0.1:8082/api/products', {
    data: {
      family_id: familyId,
      name: 'e2e-product',
      description: 'Playwright E2E product',
      lifecycle: 'IDEA',
      status: 'ACTIVE'
    }
  });
  expect(prodRes.ok()).toBeTruthy();
  const prodJson = await prodRes.json();
  const productId = prodJson.data.id;

  // Navigate to product detail page
  await page.goto(`/products/${productId}`);

  // Check header renders and health displays (either a number or fallback '—')
  await expect(page.getByRole('heading', { name: 'e2e-product' })).toBeVisible();

  // Assert health line exists and doesn't crash (looks for 'Health:' text)
  await expect(page.locator('text=Health:')).toBeVisible();

  // Also ensure we can see Stage and Status
  await expect(page.locator('text=Stage: IDEA')).toBeVisible();
  await expect(page.locator('text=Status: ACTIVE')).toBeVisible();
});
