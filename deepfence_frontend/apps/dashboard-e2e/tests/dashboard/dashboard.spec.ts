import { test as base, expect } from '@playwright/test';
import { DashboardPage } from './DashboardPage';

const test = base.extend<{ dashboardPage: DashboardPage }>({
  dashboardPage: async ({ page, baseURL }, use) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto(`${baseURL}/dashboard`);
    await use(dashboardPage);
  },
});

test.describe('Dashboard', () => {
  test('should go to host table and scan a host for vulnerability', async ({
    page,
    baseURL,
    dashboardPage,
  }) => {
    const hostProviders = page.getByRole('link', {
      name: 'Hosts',
    });
    await hostProviders.click();
    await page.waitForURL(`${baseURL}/topology/graph/host`);
    const tableViewButton = page.getByTestId('tableViewId');

    await tableViewButton.click();

    expect(
      page.getByRole('button', {
        name: 'Actions',
      }),
    ).toBeDisabled();
  });
});
