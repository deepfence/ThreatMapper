import { test, expect } from '@playwright/test';
import { AuthPage } from './AuthPage';

const authFile = 'tests/auth/user.json';

test.describe('Authentication register user set-up', () => {
  test('should authenticate with registration', async ({ page, baseURL }) => {
    const authPage = new AuthPage(page);
    // register first user
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    await authPage.goto(`${baseURL}/auth/register`);

    await authPage.enterField('firstName', 'test');
    await authPage.enterField('lastName', 'test');
    await authPage.enterField('email', username!);
    await authPage.enterField('password', password!);
    await authPage.enterField('confirmPassword', password!);
    await authPage.enterField('company', 'Deepfence');
    const checkbox = page.getByText('I agree to terms and conditions outlined in');
    checkbox.click();
    await authPage.submit('Register');
    await expect(page).toHaveURL(/.*board/);
    await page.context().storageState({ path: authFile });
  });
});
