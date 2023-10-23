import { test, expect } from '@playwright/test';
import { AuthPage } from './AuthPage';

test.describe('User Registration', () => {
  test('should disable register button', async ({ baseURL, browser }) => {
    const page = await browser.newPage({
      storageState: undefined,
    });
    const authPage = new AuthPage(page);
    await authPage.goto(`${baseURL}/auth/register`);
    await expect(
      page.getByRole('button', {
        name: 'Register',
      }),
    ).toBeDisabled();
    await page.close();
  });
  test('validation error when no input is provided', async ({ baseURL, browser }) => {
    const page = await browser.newPage({
      storageState: undefined,
    });
    const authPage = new AuthPage(page);
    await authPage.goto(`${baseURL}/auth/register`);

    await authPage.enterField('firstName', '');
    await authPage.enterField('lastName', '');
    await authPage.enterField('email', '');
    await authPage.enterField('password', '');
    await authPage.enterField('confirmPassword', '');
    await authPage.enterField('company', '');
    const checkbox = page.getByText('I agree to terms and conditions outlined in');
    checkbox.click();
    await authPage.submit('Register');
    await expect(page.getByText('required field')).toHaveCount(5);
    await page.close();
  });

  test('validation error for password mismatched', async ({ baseURL, browser }) => {
    const page = await browser.newPage({
      storageState: undefined,
    });
    const authPage = new AuthPage(page);
    await authPage.goto(`${baseURL}/auth/register`);

    await authPage.enterField('firstName', 'Deepfence');
    await authPage.enterField('lastName', 'io');
    await authPage.enterField('email', 'deepfence@test.io');
    await authPage.enterField('password', 'Password@123');
    await authPage.enterField('confirmPassword', 'password@123');
    await authPage.enterField('company', 'Deepfence');
    const checkbox = page.getByText('I agree to terms and conditions outlined in');
    checkbox.click();
    await authPage.submit('Register');
    await expect(page.getByText('passwords do not match')).toBeVisible();
    await page.close();
  });
  test('should show invite new user message', async ({ baseURL, browser }) => {
    const page = await browser.newPage({
      storageState: undefined,
    });
    const authPage = new AuthPage(page);
    await authPage.goto(`${baseURL}/auth/register`);

    await authPage.enterField('firstName', 'Deepfence');
    await authPage.enterField('lastName', 'io');
    await authPage.enterField('email', 'deepfence@test.io');
    await authPage.enterField('password', 'Password@123');
    await authPage.enterField('confirmPassword', 'password@123');
    await authPage.enterField('company', 'Deepfence');
    const checkbox = page.getByText('I agree to terms and conditions outlined in');
    checkbox.click();
    await authPage.submit('Register');
    await expect(page.getByText('passwords do not match')).toBeVisible();
    await page.close();
  });
});
