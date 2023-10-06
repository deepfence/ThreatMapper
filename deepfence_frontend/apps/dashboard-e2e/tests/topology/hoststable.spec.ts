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
const consoleAgentImageName = /deepfenceio\/deepfence_agent_ce.*/;

test.describe('Topology', () => {
  test.describe('Hosts', () => {
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

      await expect(cell).toHaveText('Complete', {
        timeout: TIMEOUT,
      });
    });
  });
  test.describe('Container Images', () => {
    test('should scan a host for malware', async ({ page, baseURL, topologyPage }) => {
      await page.waitForURL(`${baseURL}/topology/table/host`);
      const rowSelection = page.getByRole('row').filter({
        hasText: consoleHostName,
      });
      await expect(rowSelection).toBeVisible();
      await rowSelection.getByText(consoleHostName).click();

      // side panel opens
      await expect(page.getByTestId('sliding-modal-title')).toBeVisible();

      // click image tab
      await page
        .getByRole('tab')
        .filter({
          hasText: 'Containers & Images',
        })
        .click();

      const imageTableParent = page.getByText('Container images').locator('..');
      const tbody = imageTableParent.getByRole('table').locator('tbody');
      const agentImage = tbody.getByText(consoleAgentImageName);
      await expect(agentImage).toBeVisible({
        timeout: TIMEOUT,
      });
      await expect(agentImage).toBeEnabled();

      // click agentimage
      await agentImage.click();

      await expect(
        page.getByTestId('sliding-modal-title').filter({
          hasText: consoleAgentImageName,
        }),
      ).toBeVisible();

      // start scan
      const actionBtn = page.getByRole('button', {
        name: 'Actions',
      });
      expect(actionBtn).toBeEnabled();

      actionBtn.click();
      await page.getByText('Start Malware Scan').click();
      await page.getByRole('button', { name: 'Start Scan' }).click();

      await expect(page.getByText('Scan started sucessfully')).toBeVisible();

      // go to malware scan and check for complete state
      await page.goto(`${baseURL}/malware/scans?nodeType=container_image`);
      const malwarescantbody = page.getByRole('table').locator('tbody');

      const waitingRow = malwarescantbody.getByRole('row').filter({
        hasText: consoleAgentImageName,
      });

      const interval = setInterval(async () => {
        const refreshBtn = page.locator(`button[title="Refresh now"]`);
        if (refreshBtn) {
          refreshBtn.click();
        }
      }, 30 * 1000);

      const cell = waitingRow.getByRole(`cell`).nth(5);
      const complete = cell.locator('tr > td:nth-child(5), td:has-text("Complete")');
      const completed = await complete.isVisible();
      if (completed) {
        clearInterval(interval);
      }

      await expect(cell).toHaveText('Complete', {
        timeout: TIMEOUT,
      });
    });
    test('should scan a host for vulnerability', async ({
      page,
      baseURL,
      topologyPage,
    }) => {
      await page.waitForURL(`${baseURL}/topology/table/host`);
      const rowSelection = page.getByRole('row').filter({
        hasText: consoleHostName,
      });
      await expect(rowSelection).toBeVisible();
      await rowSelection.getByText(consoleHostName).click();

      // side panel opens
      await expect(page.getByTestId('sliding-modal-title')).toBeVisible();

      // click image tab
      await page
        .getByRole('tab')
        .filter({
          hasText: 'Containers & Images',
        })
        .click();

      const imageTableParent = page.getByText('Container images').locator('..');
      const tbody = imageTableParent.getByRole('table').locator('tbody');
      const agentImage = tbody.getByText(consoleAgentImageName);
      await expect(agentImage).toBeVisible({
        timeout: TIMEOUT,
      });
      await expect(agentImage).toBeEnabled();

      // click agentimage
      await agentImage.click();

      await expect(
        page.getByTestId('sliding-modal-title').filter({
          hasText: consoleAgentImageName,
        }),
      ).toBeVisible();

      // start scan
      const actionBtn = page.getByRole('button', {
        name: 'Actions',
      });
      expect(actionBtn).toBeEnabled();

      actionBtn.click();
      await page.getByText('Start Vulnerability Scan').click();
      await page.getByRole('button', { name: 'Start Scan' }).click();

      await expect(page.getByText('Scan started sucessfully')).toBeVisible();

      // go to vulnerability scan and check for complete state
      await page.goto(`${baseURL}/vulnerability/scans?nodeType=container_image`);
      const malwarescantbody = page.getByRole('table').locator('tbody');

      const waitingRow = malwarescantbody.getByRole('row').filter({
        hasText: consoleAgentImageName,
      });

      const interval = setInterval(async () => {
        const refreshBtn = page.locator(`button[title="Refresh now"]`);
        if (refreshBtn) {
          refreshBtn.click();
        }
      }, 30 * 1000);

      const cell = waitingRow.getByRole(`cell`).nth(5);
      const complete = cell.locator('tr > td:nth-child(5), td:has-text("Complete")');
      const completed = await complete.isVisible();
      if (completed) {
        clearInterval(interval);
      }

      await expect(cell).toHaveText('Complete', {
        timeout: TIMEOUT,
      });
    });
    test('should scan a host for secret', async ({ page, baseURL, topologyPage }) => {
      await page.waitForURL(`${baseURL}/topology/table/host`);
      const rowSelection = page.getByRole('row').filter({
        hasText: consoleHostName,
      });
      await expect(rowSelection).toBeVisible();
      await rowSelection.getByText(consoleHostName).click();

      // side panel opens
      await expect(page.getByTestId('sliding-modal-title')).toBeVisible();

      // click image tab
      await page
        .getByRole('tab')
        .filter({
          hasText: 'Containers & Images',
        })
        .click();

      const imageTableParent = page.getByText('Container images').locator('..');
      const tbody = imageTableParent.getByRole('table').locator('tbody');
      const agentImage = tbody.getByText(consoleAgentImageName);
      await expect(agentImage).toBeVisible({
        timeout: TIMEOUT,
      });
      await expect(agentImage).toBeEnabled();

      // click agentimage
      await agentImage.click();

      await expect(
        page.getByTestId('sliding-modal-title').filter({
          hasText: consoleAgentImageName,
        }),
      ).toBeVisible();

      // start scan
      const actionBtn = page.getByRole('button', {
        name: 'Actions',
      });
      expect(actionBtn).toBeEnabled();

      actionBtn.click();
      await page.getByText('Start Secret Scan').click();
      await page.getByRole('button', { name: 'Start Scan' }).click();

      await expect(page.getByText('Scan started sucessfully')).toBeVisible();

      // go to secret scan and check for complete state
      await page.goto(`${baseURL}/vulnerability/scans?nodeType=container_image`);
      const malwarescantbody = page.getByRole('table').locator('tbody');

      const waitingRow = malwarescantbody.getByRole('row').filter({
        hasText: consoleAgentImageName,
      });

      const interval = setInterval(async () => {
        const refreshBtn = page.locator(`button[title="Refresh now"]`);
        if (refreshBtn) {
          refreshBtn.click();
        }
      }, 30 * 1000);

      const cell = waitingRow.getByRole(`cell`).nth(5);
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
});
