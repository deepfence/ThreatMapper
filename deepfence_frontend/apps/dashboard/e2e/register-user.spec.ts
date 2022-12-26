import { expect, test } from '@playwright/test';

import { RegisterUserPage } from './pages/RegisterUserPage.js';

test.describe('User Registration', () => {
  test('validation error when no input is provided', async ({ page, baseURL }) => {
    const register = new RegisterUserPage(page);
    await register.goto(`${baseURL}/auth/register`);
    await register.enterField('first_name', '');
    await register.enterField('last_name', '');
    await register.enterField('email', '');
    await register.enterField('password', '');
    await register.enterField('confirmPassword', '');
    await register.enterField('company', '');
    await register.submit();
    await expect(page.getByText('invalid email address')).toBeVisible();
    const nameError = page.getByText(
      'should only contain alphabets, numbers, space and hyphen',
    );

    await expect(nameError.first()).toBeVisible();
    await expect(nameError.nth(1)).toBeVisible();
  });

  test('validation error for password', async ({ page, baseURL }) => {
    const register = new RegisterUserPage(page);
    await register.goto(`${baseURL}/auth/register`);
    await register.enterField('first_name', 'Deepfence');
    await register.enterField('last_name', 'io');
    await register.enterField('email', 'deepfence@test.io');
    await register.enterField('password', 'Password@123');
    await register.enterField('confirmPassword', 'password@123');
    await register.enterField('company', 'Deepfence');
    await register.submit();
    await expect(
      page.getByText('Confirm password and password are not same'),
    ).toBeVisible();
  });
});
