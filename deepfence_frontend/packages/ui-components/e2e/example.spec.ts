import { expect, test } from '@playwright/test';

test('test example e2e', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}`);

  // create a locator
  const locator = page.locator('text=UserId: 1');
  const text = await locator.innerText();

  // Expects locator has text query
  await expect(text).toBe('UserId: 1');
});
