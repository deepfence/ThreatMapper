import { expect, test } from '@playwright/test';

test('test example e2e', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // create a locator
  const locator = page.locator('text=query');
  const text = await locator.innerHTML();

  // Expects locator has text query
  await expect(text).toBe('query');
});
