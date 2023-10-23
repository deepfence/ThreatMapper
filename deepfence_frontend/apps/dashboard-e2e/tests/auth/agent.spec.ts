import { test, expect } from '@playwright/test';
import { TIMEOUT } from '../../playwright.config';

const HOST_AGENT = 'manan-e2e-agent';
test.describe('Agent Host', () => {
  test('should show host agent in host table', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/topology/table/host`);
    await expect
      .poll(
        async () => {
          await page.waitForTimeout(5000);
          const tbodyElement = page.locator('tbody');
          const host = tbodyElement.getByRole('cell', { name: HOST_AGENT });
          const visible = await host.isVisible();
          if (!visible) {
            const refreshBtn = page.locator(`button[title="Refresh now"]`);
            if (refreshBtn) {
              refreshBtn.click();
            }
          } else {
            return true;
          }
        },
        {
          timeout: TIMEOUT,
          intervals: [30_000],
        },
      )
      .toBeTruthy();
  });
});
