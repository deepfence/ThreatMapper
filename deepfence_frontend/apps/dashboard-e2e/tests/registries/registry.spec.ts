import { test, expect, Locator, Page } from '@playwright/test';
import { TIMEOUT } from '../../playwright.config';

const registryType = 'docker_private_registry';
const formTitle = 'Docker Private';
const dockerName = 'Private Docker Registry';

const credentials = {
  name: dockerName,
  registry_url: process.env.DOCKER_REGISTRY_PRIVATE_URL,
  username: process.env.DOCKER_USERNAME,
  password: process.env.DOCKER_PASSWORD,
};
const imageToScan = 'deepfence_agent';
const registryName = 'Private Docker Registry';

test.describe('Registry', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await page.goto(`${baseURL}/registries/${registryType}`);
  });
  test('should add docker private registry', async ({ page, baseURL }) => {
    await expect(page.getByText('Total Registries')).toBeVisible();
    let selectorContainingText = page.getByText('Total Registries').locator('..');
    const noImage = await selectorContainingText.textContent();

    if (noImage && noImage.includes('0')) {
      await expect(selectorContainingText).toContainText('0');

      const addRegistryBtn = page.getByRole('button', {
        name: 'ADD NEW REGISTRY',
      });

      await addRegistryBtn.click();
      expect(page.getByText(`Add Registry: ${formTitle}`)).toBeVisible();

      await page.getByLabel('Registry Name').fill(credentials.name);
      await page.getByLabel('Registry URL').fill(credentials.registry_url!);
      await page.getByLabel('Username').fill(credentials.username!);
      await page.fill("input[type='password']", credentials.password!);

      const addBtn = page.getByRole('button', {
        name: 'Add registry',
      });
      await addBtn.click();

      await expect(page.getByText('Added successfully')).toBeVisible();
      await page.getByTestId('sliding-modal-close-button').click();
      await page.getByRole('dialog').waitFor({
        state: 'detached',
      });

      async function testUntil() {
        const refreshBtn = page.locator(`button[title="Refresh now"]`);
        if (refreshBtn) {
          await refreshBtn.click();
          const delayInSeconds = 5;
          await page.waitForTimeout(delayInSeconds * 1000);
        }

        await expect(page.getByText('Total Registries')).toBeVisible();
        selectorContainingText = page.getByText('Total Registries').locator('..');
        await expect(selectorContainingText)
          .toContainText('1')
          .catch(() => {
            testUntil();
          })
          .then(() => true);

        const rowSelection = page.getByRole('row').filter({
          hasText: 'Ready to scan',
        });
        await expect(rowSelection)
          .toBeVisible()
          .catch(() => {
            testUntil();
          })
          .then(() => true);
        return true;
      }
      await testUntil();
    }
  });
  test(`should start Vulnerability scan on imagetag of ${imageToScan} image`, async ({
    page,
    baseURL,
  }) => {
    await expect
      .poll(
        async () => {
          const refreshBtn = page.locator(`button[title="Refresh now"]`);
          if (refreshBtn) {
            refreshBtn.click();
          }
          return page.getByRole('row').filter({
            hasText: 'Ready to scan',
          });
        },
        {
          message: 'Error, registry not added',
          timeout: 30 * 1000,
        },
      )
      .toBeDefined();

    const registry = page.getByText(registryName);
    await expect(registry).toBeVisible({
      timeout: TIMEOUT,
    });
    await registry.click();

    await expect(page).toHaveURL(/.*registries\/images/);

    const totalImages = page.getByTestId('totalRegistryImagesId');
    await expect(totalImages).toBeVisible();
    expect(Number(await totalImages.textContent())).toBeGreaterThan(0);

    const imageCloudScanner = page.getByText(imageToScan);
    await expect(imageCloudScanner).toBeVisible();

    // select image
    const rowSelectionTag = page.getByRole('row').filter({
      hasText: imageToScan,
    });

    // got to tag page
    await rowSelectionTag.getByText(imageToScan).click();
    await expect(page).toHaveURL(/.*registries\/imagetags/);
    const tbodyElement = page.locator('tbody');

    if (tbodyElement) {
      // select tag
      const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
      await rowSelectionTag.getByRole('checkbox').click();

      // click on action button to choose scan type
      const actionBtn = page.getByRole('button', {
        name: 'Start scan',
      });
      expect(actionBtn).toBeEnabled();
      actionBtn.click();

      // start vulnerabillity scan
      await page.getByText('Start Vulnerability Scan').click();

      const scanForm = page.locator('form');
      await scanForm.waitFor();
      await scanForm.getByRole('button', { name: 'Start Scan' }).click();

      await expect(page.getByText('Scan started successfully')).toBeVisible();

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const tbodyElement = page.locator('tbody');
            const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
            const cell = rowSelectionTag.getByRole(`cell`).nth(5);
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
    } else {
      console.error('tbody element not found.');
    }
  });
  test(`should start Secret scan on imagetag of ${imageToScan} image`, async ({
    page,
    baseURL,
  }) => {
    async function refreshAndCheckImagePresence() {
      let loop = false;
      const rowSelection = page.getByRole('row').filter({
        hasText: 'Ready to scan',
      });
      await rowSelection
        .waitFor({
          timeout: 10 * 1000,
        })
        .catch(async () => {
          const refreshBtn = page.locator(`button[title="Refresh now"]`);
          if (refreshBtn) {
            refreshBtn.click();
          }
          await refreshAndCheckImagePresence();
        })
        .then(() => {
          loop = true;
          return true;
        });

      return loop;
    }
    await refreshAndCheckImagePresence();

    const registry = page.getByText(registryName);
    await expect(registry).toBeVisible({
      timeout: TIMEOUT,
    });
    await registry.click();

    await expect(page).toHaveURL(/.*registries\/images/);

    const totalImages = page.getByTestId('totalRegistryImagesId');
    await expect(totalImages).toBeVisible();
    expect(Number(await totalImages.textContent())).toBeGreaterThan(0);

    const imageCloudScanner = page.getByText(imageToScan);
    await expect(imageCloudScanner).toBeVisible();

    // select image
    const rowSelectionTag = page.getByRole('row').filter({
      hasText: imageToScan,
    });

    // got to tag page
    await rowSelectionTag.getByText(imageToScan).click();
    await expect(page).toHaveURL(/.*registries\/imagetags/);
    const tbodyElement = page.locator('tbody');

    if (tbodyElement) {
      // select tag
      const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
      await rowSelectionTag.getByRole('checkbox').click();

      // click on action button to choose scan type
      const actionBtn = page.getByRole('button', {
        name: 'Start scan',
      });
      expect(actionBtn).toBeEnabled();
      actionBtn.click();

      // start vulnerabillity scan
      await page.getByText('Start Secret Scan').click();

      const scanForm = page.locator('form');
      await scanForm.waitFor();
      await scanForm.getByRole('button', { name: 'Start Scan' }).click();
      await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();
      await page.mouse.click(0, 0);

      await expect(page.getByText('Scan started successfully')).toBeVisible();

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const tbodyElement = page.locator('tbody');
            const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
            const cell = rowSelectionTag.getByRole(`cell`).nth(6);
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
    } else {
      console.error('tbody element not found.');
    }
  });
  test(`should start Malware scan on imagetag of ${imageToScan} image`, async ({
    page,
    baseURL,
  }) => {
    async function refreshAndCheckImagePresence() {
      let loop = false;
      const rowSelection = page.getByRole('row').filter({
        hasText: 'Ready to scan',
      });
      await rowSelection
        .waitFor({
          timeout: 10 * 1000,
        })
        .catch(async () => {
          const refreshBtn = page.locator(`button[title="Refresh now"]`);
          if (refreshBtn) {
            refreshBtn.click();
          }
          await refreshAndCheckImagePresence();
        })
        .then(() => {
          loop = true;
          return true;
        });

      return loop;
    }
    await refreshAndCheckImagePresence();

    const registry = page.getByText(registryName);
    await expect(registry).toBeVisible({
      timeout: TIMEOUT,
    });
    await registry.click();

    await expect(page).toHaveURL(/.*registries\/images/);

    const totalImages = page.getByTestId('totalRegistryImagesId');
    await expect(totalImages).toBeVisible();
    expect(Number(await totalImages.textContent())).toBeGreaterThan(0);

    const imageCloudScanner = page.getByText(imageToScan);
    await expect(imageCloudScanner).toBeVisible();

    // select image
    const rowSelectionTag = page.getByRole('row').filter({
      hasText: imageToScan,
    });

    // got to tag page
    await rowSelectionTag.getByText(imageToScan).click();
    await expect(page).toHaveURL(/.*registries\/imagetags/);
    const tbodyElement = page.locator('tbody');

    if (tbodyElement) {
      // select tag
      const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
      await rowSelectionTag.getByRole('checkbox').click();

      // click on action button to choose scan type
      const actionBtn = page.getByRole('button', {
        name: 'Start scan',
      });
      expect(actionBtn).toBeEnabled();
      actionBtn.click();

      // start vulnerabillity scan
      await page.getByText('Start Malware Scan').click();

      const scanForm = page.locator('form');
      await scanForm.waitFor();
      await scanForm.getByRole('button', { name: 'Start Scan' }).click();
      await expect(page.getByTestId('sliding-modal-close-button')).not.toBeAttached();
      await page.mouse.click(0, 0);

      await expect(page.getByText('Scan started successfully')).toBeVisible();

      await expect
        .poll(
          async () => {
            await page.waitForTimeout(5000);
            const tbodyElement = page.locator('tbody');
            const rowSelectionTag = tbodyElement.getByRole('row').nth(0);
            const cell = rowSelectionTag.getByRole(`cell`).nth(7);
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
    } else {
      console.error('tbody element not found.');
    }
  });
});
