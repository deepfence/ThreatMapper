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
const agentHostName = 'ip-172-31-60-127';
const consoleAgentImageName = /deepfenceio\/deepfence_agent_ce.*/;

test.describe('Topology', () => {
  test.describe('Hosts console', () => {
    test('should go to host table and scan a host for malware', async ({ page, baseURL, topologyPage }) => {
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: consoleHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(4);
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: consoleHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(2);
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: consoleHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(3);
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
  test.describe('Hosts Agent', () => {
    test('should go to host table and scan a host for malware', async ({ page, baseURL, topologyPage }) => {
      await page.waitForURL(`${baseURL}/topology/table/host`);
      await expect(
        page.getByRole('button', {
          name: 'Actions',
        }),
      ).toBeDisabled();

      const rowSelection = page.getByRole('row').filter({
        hasText: agentHostName,
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: agentHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(4);
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
        hasText: agentHostName,
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: agentHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(2);
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
        hasText: agentHostName,
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

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const rowSelection = page.getByRole('row').filter({
              hasText: agentHostName,
            });
            const cell = rowSelection.getByRole(`cell`).nth(3);
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
  test.describe('Container Images', () => {
    test('should scan a container image for malware', async ({ page, baseURL, topologyPage }) => {
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

      await expect
      .poll(
        async () => {
          await page.waitForTimeout(5000);
          const malwarescantbody = page.getByRole('table').locator('tbody');

          const waitingRow = malwarescantbody.getByRole('row').filter({
            hasText: consoleAgentImageName,
          });

          const cell = waitingRow.getByRole(`cell`).nth(5);
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
    test('should scan a container image for vulnerability', async ({
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

      await expect
      .poll(
        async () => {
          await page.waitForTimeout(5000);
          const vulnscantbody = page.getByRole('table').locator('tbody');

          const waitingRow = vulnscantbody.getByRole('row').filter({
            hasText: consoleAgentImageName,
          });

          const cell = waitingRow.getByRole(`cell`).nth(5);
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
    test('should scan a container image for secret', async ({ page, baseURL, topologyPage }) => {
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
      await page.goto(`${baseURL}/secret/scans?nodeType=container_image`);

      await expect
      .poll(
        async () => {
          await page.waitForTimeout(5000);
          const secretscantbody = page.getByRole('table').locator('tbody');

          const waitingRow = secretscantbody.getByRole('row').filter({
            hasText: consoleAgentImageName,
          });

          const cell = waitingRow.getByRole(`cell`).nth(5);
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
});
