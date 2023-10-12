import { test, expect } from '@playwright/test';
import { AuthPage } from './AuthPage';

const authFile = 'tests/auth/user.json';

test.describe('Authentication', () => {
  test('should authenticate with registration', async ({ page, baseURL }) => {
    // register first user
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    const authPage = new AuthPage(page);
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

    const loginUserBtn = page.getByTestId('loginUserButtonId');
    await loginUserBtn.click();
    const logoutMenuItem = page.getByTestId('logoutDropdownItemId');
    await expect(logoutMenuItem).toBeVisible();
    await logoutMenuItem.click();
    await expect(page).toHaveURL(/.*login/);

    // sign in
    await expect(page.getByRole('button', {
      name: 'sign in'
    })).toBeVisible();
    await authPage.enterEmail(process.env.USERNAME!);
    await authPage.enterPassword(process.env.PASSWORD!);
    await authPage.submit('Sign In');
    await expect(page).toHaveURL(/.*board/);

    await page.context().storageState({ path: authFile });
  });
});
