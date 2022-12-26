import { expect, test } from '@playwright/test';

import { LoginPage } from './pages/LoginPage.js';

test.describe('Login', () => {
  test('email and password validation error', async ({ page, baseURL }) => {
    const login = new LoginPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.enterEmail('');
    await login.enterPassword('');
    await login.submit();
    await expect(page.getByText('invalid email address')).toBeVisible();
    await expect(
      page.getByText(
        'should contain at least one upper case, lower case, digit and special character',
      ),
    ).toBeVisible();
  });

  test('user not found', async ({ page, baseURL }) => {
    const login = new LoginPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.enterEmail('test@test.com');
    await login.enterPassword('Password@123');
    await login.submit();
    await expect(page.getByText('user not found')).toBeVisible();
  });

  test('redirect to forgot password', async ({ page, baseURL }) => {
    const login = new LoginPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.clickForgetPassword();

    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('redirect to register user', async ({ page, baseURL }) => {
    const login = new LoginPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.clickRegisterUser();

    await expect(page).toHaveURL(/.*register/);
  });

  test('redirect to home page', async ({ page, baseURL }) => {
    const login = new LoginPage(page);
    await login.goto(`${baseURL}/auth/login`);
    await login.enterEmail('milan@deepfence.io');
    await login.enterPassword('MilanDeepfence@2111');
    await login.submit();
    await expect(page).toHaveURL(/.*onboard/);
  });
});
