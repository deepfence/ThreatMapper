import { test, expect } from '@playwright/test';
import { TIMEOUT } from '../../playwright.config';

test.describe('Integrations', () => {
  test('should create new report', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/integrations`);

    const reportSection = page.locator('div:below(:text("Download reports"))');
    await expect(reportSection.getByText('Reports generated')).toBeVisible();
    await reportSection
      .getByRole('button', {
        name: 'create new report',
      })
      .click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('create new report')).toBeVisible();

    await modal.getByLabel('select resource').click();
    await modal
      .getByRole('listbox')
      .getByRole('option')
      .filter({
        hasText: 'Vulnerability',
      })
      .click();

    await modal.getByLabel('select node type').click();
    await modal
      .getByRole('listbox')
      .getByRole('option')
      .filter({
        hasText: 'Host',
      })
      .click();

    await modal.getByLabel('select download type').click();
    await modal
      .getByRole('listbox')
      .getByRole('option')
      .filter({
        hasText: 'PDF',
      })
      .click();

    await modal
      .getByRole('button', {
        name: 'create',
      })
      .click();

    await expect(page.getByText('Created successfully')).toBeVisible();

    await page.mouse.click(0, 0);
    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await expect
      .poll(
        async () => {
          await page.waitForTimeout(5000);
          const tbody = page.getByRole('table').locator('tbody');
          const row = tbody.getByRole('row').nth(0);

          const cell = row.getByRole(`cell`).nth(4);
          const complete = cell.locator('div:text-is("Complete")');
          const visible = await complete.isVisible();
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
