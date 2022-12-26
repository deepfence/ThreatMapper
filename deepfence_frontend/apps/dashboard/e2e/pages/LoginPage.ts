import { type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async enterEmail(email: string) {
    await this.page.fill("input[name='email']", email);
  }

  async enterPassword(password: string) {
    await this.page.fill("input[name='password']", password);
  }

  async clickForgetPassword() {
    const btn = await this.page.locator('a').filter({ hasText: 'Forgot password?' });
    if (btn) {
      await btn.click();
    }
  }

  async clickRegisterUser() {
    const btn = await this.page.locator('a').filter({ hasText: 'Register' });
    if (btn) {
      await btn.click();
    }
  }

  async submit() {
    const btn = this.page.getByRole('button', { name: 'Log In' });
    if (btn) {
      await btn.click();
    }
  }
}
