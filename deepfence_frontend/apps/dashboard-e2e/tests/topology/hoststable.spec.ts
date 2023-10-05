import { test as base, expect } from '@playwright/test';
import { TopologyPage } from './TopologyPage';
import { TIMEOUT } from '../../playwright.config';

const test = base.extend<{ topologyPage: TopologyPage }>({
  topologyPage: async ({ page, baseURL }, use) => {
    const topologyPage = new TopologyPage(page);
    await topologyPage.goto(`${baseURL}/topology/table/host`);
    await use(topologyPage);
  },
});

const consoleHostName = 'ui-automation-agent-setup';

test.describe('Topology', () => {
  test('should scan a host for malware', async ({ page, baseURL, topologyPage }) => {
    await page.waitForURL(`${baseURL}/topology/table/host`);
    await expect(
      page.getByRole('button', {
        name: 'Actions',
      }),
    ).toBeDisabled();

    const rowSelection = page.getByRole('row').filter({
      hasText: consoleHostName,
    });
    await expect(rowSelection).toBeVisible();
    await rowSelection.getByRole('checkbox').click();

    const actionBtn = page.getByRole('button', {
      name: 'Actions',
    });
    expect(actionBtn).toBeEnabled();

    actionBtn.click();
    await page.getByText('Start Malware Scan').click();
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await page.mouse.click(0, 0);
    const cell = rowSelection.getByRole(`cell`).nth(4);

    await expect(cell).toHaveText('In Progress', {
      timeout: TIMEOUT,
    });
    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
  test('should go to host table and scan a host for vulnerability', async ({
    page,
    baseURL,
    topologyPage,
  }) => {
    await page.waitForURL(`${baseURL}/topology/table/host`);
    await expect(
      page.getByRole('button', {
        name: 'Actions',
      }),
    ).toBeDisabled();

    const rowSelection = page.getByRole('row').filter({
      hasText: consoleHostName,
    });
    await expect(rowSelection).toBeVisible();
    await rowSelection.getByRole('checkbox').click();

    const actionBtn = page.getByRole('button', {
      name: 'Actions',
    });
    expect(actionBtn).toBeEnabled();

    actionBtn.click();
    await page.getByText('Start Vulnerability Scan').click();
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();

    await page.mouse.click(0, 0);
    const cell = rowSelection.getByRole(`cell`).nth(2);

    await expect(cell).toHaveText('In Progress', {
      timeout: TIMEOUT,
    });
    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
  test('should go to host table and scan a host for secret', async ({
    page,
    baseURL,
    topologyPage,
  }) => {
    await page.waitForURL(`${baseURL}/topology/table/host`);
    await expect(
      page.getByRole('button', {
        name: 'Actions',
      }),
    ).toBeDisabled();

    const rowSelection = page.getByRole('row').filter({
      hasText: consoleHostName,
    });
    await expect(rowSelection).toBeVisible();
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
    const cell = rowSelection.getByRole(`cell`).nth(3);
    await expect(cell).toHaveText('In Progress', {
      timeout: TIMEOUT,
    });
    await expect(cell).toHaveText('Complete', {
      timeout: TIMEOUT,
    });
  });
});
