import { test, expect } from '@playwright/test';
import { AuthPage } from './AuthPage';

const authFile = 'tests/auth/user.json';

test.describe('Authentication', () => {
  test('authenticate', async ({ page, baseURL }) => {
    const login = new AuthPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.enterEmail(process.env.USERNAME!);
    await login.enterPassword(process.env.PASSWORD!);
    await login.submit('Sign In');
    await expect(page).toHaveURL(/.*board/);

    await page.context().storageState({ path: authFile });
  });
});
