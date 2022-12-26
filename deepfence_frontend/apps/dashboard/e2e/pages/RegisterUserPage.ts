import { type Page } from '@playwright/test';

export class RegisterUserPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async enterField(fieldName: string, value: string) {
    const field = `input[name="${fieldName}"]`;
    await this.page.fill(field, value);
  }

  async submit() {
    const btn = this.page.getByRole('button', { name: 'Register' });
    if (btn) {
      await btn.click();
    }
  }
}
