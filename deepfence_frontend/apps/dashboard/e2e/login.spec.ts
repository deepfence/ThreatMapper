import { expect, test } from '@playwright/test';

import { LoginPage } from './pages/LoginPage';

test('enter login credentials', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto('http://localhost:5173');
  await login.enterEmail('test@test.com');
  await login.enterPassword('');
  await expect(page.locator("input[name='username']")).toContainText('test@test.com'); // do not test this, this is just a check of e2e
});
