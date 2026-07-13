import { test, expect } from '@playwright/test'

// Self-contained test: create family, product, upload a tiny PNG asset, then
// verify the product Assets tab shows both Open and Download buttons for the asset.
test('asset card shows open and download buttons (self-contained)', async ({ page, request }) => {
  // backend base
  const API = 'http://127.0.0.1:8082/api'

  // 1) create a family
  const familyName = `e2e-family-${Date.now()}`
  const famRes = await request.post(`${API}/families`, { data: { name: familyName } })
  expect(famRes.ok()).toBeTruthy()
  const famJson = await famRes.json()
  const familyId = famJson.data.id

  // 2) create a product in that family
  const prodName = `e2e-product-${Date.now()}`
  const prodRes = await request.post(`${API}/products`, { data: { name: prodName, family_id: familyId } })
  expect(prodRes.ok()).toBeTruthy()
  const prodJson = await prodRes.json()
  const productId = prodJson.data.id

  // 3) upload a tiny PNG (1x1 transparent) as multipart/form-data
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
  const buffer = Buffer.from(tinyPngBase64, 'base64')

  const uploadRes = await request.post(`${API}/products/${productId}/assets`, {
    multipart: {
      file: {
        name: 'e2e-test.png',
        mimeType: 'image/png',
        buffer,
      },
    },
  })
  expect(uploadRes.ok()).toBeTruthy()

  // 4) navigate to the product page and open Assets tab
  // Ensure the client-side API base is set so the app talks to our backend
  await page.addInitScript(() => {
    try { localStorage.setItem('productos_api_url', 'http://127.0.0.1:8082/api') } catch (e) {}
  })
  await page.goto(`http://localhost:3000/products/${productId}`, { waitUntil: 'networkidle' })

  // click Assets tab using a stable text locator
  const assetsTab = page.locator('text=Assets').first()
  await expect(assetsTab).toBeVisible({ timeout: 15000 })
  await assetsTab.click()

  // 5) wait for grid and assert first card has both controls
  const grid = page.locator('.grid').first()
  await expect(grid).toBeVisible({ timeout: 30000 })

  const card = grid.locator('> *').first()
  await expect(card).toBeVisible({ timeout: 10000 })

  const openBtn = card.getByRole('button', { name: /open/i })
  const downloadBtn = card.getByRole('link', { name: /download/i })

  await expect(openBtn).toBeVisible({ timeout: 5000 })
  await expect(downloadBtn).toBeVisible({ timeout: 5000 })
})
