import { test, expect } from '@playwright/test';
import { AuthPage } from './AuthPage';

const authFile = 'tests/auth/user.json';

test.describe('Authentication', () => {
  test('should be able to login a user', async ({ page, baseURL }) => {
    const authPage = new AuthPage(page);

    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    await authPage.goto(`${baseURL}/auth/login`);

    // sign in
    await expect(
      page.getByRole('button', {
        name: 'sign in',
      }),
    ).toBeVisible();
    await authPage.enterEmail(process.env.USERNAME!);
    await authPage.enterPassword(process.env.PASSWORD!);
    await authPage.submit('Sign In');
    await expect(page).toHaveURL(/.*board/);

    await page.context().storageState({ path: authFile });
  });
});
