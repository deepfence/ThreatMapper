import { test, expect } from '@playwright/test';
import { TIMEOUT } from '../../playwright.config';

test.describe('Containers', () => {
  test('should scan a container for vulnerability', async ({ page, baseURL }) => {
    page.goto(`${baseURL}/topology/table/container`);
    const containerName = 'deepfence-redis';

    const container = page.getByText(containerName, {
      exact: false,
    });
    await container.waitFor({
      timeout: TIMEOUT,
    });
    const rowSelection = page.getByRole('row').filter({
      hasText: containerName,
    });

    await rowSelection.getByRole('checkbox').click();
    const actionBtn = page.getByRole('button', {
      name: 'Actions',
    });
    expect(actionBtn).toBeEnabled();
    await actionBtn.click();

    await page.getByText('Start Vulnerability Scan').click();
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await page.mouse.click(0, 0);

    // refresh until it finished
    const interval = setInterval(async () => {
      const refreshBtn = page.locator(`button[title="Refresh now"]`);
      if (refreshBtn) {
        refreshBtn.click();
      }
    }, 30 * 1000);

    const cell = rowSelection.getByRole(`cell`).nth(3);

    const complete = cell.locator('tr > td:nth-child(3), td:has-text("Complete")');
    const completed = await complete.isVisible();
    if (completed) {
      clearInterval(interval);
    }

    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
  test('should scan a container for secret', async ({ page, baseURL }) => {
    page.goto(`${baseURL}/topology/table/container`);
    const containerName = 'deepfence-redis';

    const container = page.getByText(containerName, {
      exact: false,
    });
    await container.waitFor({
      timeout: TIMEOUT,
    });
    const rowSelection = page.getByRole('row').filter({
      hasText: containerName,
    });

    await rowSelection.getByRole('checkbox').click();
    const actionBtn = page.getByRole('button', {
      name: 'Actions',
    });
    expect(actionBtn).toBeEnabled();
    await actionBtn.click();

    await page.getByText('Start Secret Scan').click();
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await page.mouse.click(0, 0);

    // refresh until it finished
    const interval = setInterval(async () => {
      const refreshBtn = page.locator(`button[title="Refresh now"]`);
      if (refreshBtn) {
        refreshBtn.click();
      }
    }, 30 * 1000);

    const cell = rowSelection.getByRole(`cell`).nth(4);

    const complete = cell.locator('tr > td:nth-child(4), td:has-text("Complete")');
    const completed = await complete.isVisible();
    if (completed) {
      clearInterval(interval);
    }

    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
  test('should scan a container for malware', async ({ page, baseURL }) => {
    page.goto(`${baseURL}/topology/table/container`);
    const containerName = 'deepfence-redis';

    const container = page.getByText(containerName, {
      exact: false,
    });
    await container.waitFor({
      timeout: TIMEOUT,
    });
    const rowSelection = page.getByRole('row').filter({
      hasText: containerName,
    });

    await rowSelection.getByRole('checkbox').click();
    const actionBtn = page.getByRole('button', {
      name: 'Actions',
    });
    expect(actionBtn).toBeEnabled();
    await actionBtn.click();

    await page.getByText('Start Malware Scan').click();
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await page.mouse.click(0, 0);

    // refresh until it finished
    const interval = setInterval(async () => {
      const refreshBtn = page.locator(`button[title="Refresh now"]`);
      if (refreshBtn) {
        refreshBtn.click();
      }
    }, 30 * 1000);

    const cell = rowSelection.getByRole(`cell`).nth(5);

    const complete = cell.locator('tr > td:nth-child(5), td:has-text("Complete")');
    const completed = await complete.isVisible();
    if (completed) {
      clearInterval(interval);
    }

    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
});
