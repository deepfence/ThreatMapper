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
    await this.page.fill("input[name='username']", email);
  }

  async enterPassword(password: string) {
    await this.page.fill("input[name='password']", password);
  }

  async submit() {
    await this.page.locator('button:has-text("Login")').click();
  }
}
