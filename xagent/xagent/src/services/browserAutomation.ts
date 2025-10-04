import { chromium, Browser, Page } from 'playwright';

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    this.browser = await chromium.launch({
      headless: false, // Set to true for production
    });
    this.page = await this.browser.newPage();
  }

  async navigateTo(url: string) {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.goto(url);
  }

  async fillForm(selector: string, value: string) {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.fill(selector, value);
  }

  async click(selector: string) {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.click(selector);
  }

  async getPageContent() {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return await this.page.content();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
} 