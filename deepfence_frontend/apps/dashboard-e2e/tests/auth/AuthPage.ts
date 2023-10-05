import { type Page } from '@playwright/test';

export class AuthPage {
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
    const btn = this.page.locator('a').filter({ hasText: 'Register' });
    if (btn) {
      await btn.click();
    }
  }

  async submit(name: string) {
    const btn = this.page.getByRole('button', { name });
    if (btn) {
      await btn.click();
    }
  }
  // generic field
  async enterField(fieldName: string, value: string) {
    const field = `input[name="${fieldName}"]`;
    await this.page.fill(field, value);
  }
}
