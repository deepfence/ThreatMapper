import { type Page } from '@playwright/test';

export class TopologyPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
  }
}
