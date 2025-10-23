// Browser automation service with graceful fallback for missing dependencies
let playwright: any = null;
let Browser: any = null;
let chromium: any = null;

try {
  const playwrightModule = await import('playwright');
  playwright = playwrightModule;
  Browser = playwrightModule.Browser;
  chromium = playwrightModule.chromium;
} catch (error) {
  console.warn('Playwright not available, browser automation will use fallback');
}

export class BrowserAutomationService {
  private browser: any = null;
  private isAvailable: boolean = !!playwright;

  async initialize() {
    if (!this.isAvailable) {
      console.warn('Browser automation service not available - Playwright not installed');
      return;
    }

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      this.isAvailable = false;
    }
  }

  async navigateTo(url: string) {
    if (!this.isAvailable || !this.browser) {
      console.warn('Browser automation not available, simulating navigation to:', url);
      return Promise.resolve();
    }

    try {
      const page = await this.browser.newPage();
      await page.goto(url);
      await page.close();
    } catch (error) {
      console.error('Navigation failed:', error);
      throw error;
    }
  }

  async fillForm(selector: string, value: string) {
    if (!this.isAvailable || !this.browser) {
      console.warn('Browser automation not available, simulating form fill:', selector, value);
      return Promise.resolve();
    }

    try {
      const page = await this.browser.newPage();
      await page.fill(selector, value);
      await page.close();
    } catch (error) {
      console.error('Form filling failed:', error);
      throw error;
    }
  }

  async click(selector: string) {
    if (!this.isAvailable || !this.browser) {
      console.warn('Browser automation not available, simulating click:', selector);
      return Promise.resolve();
    }

    try {
      const page = await this.browser.newPage();
      await page.click(selector);
      await page.close();
    } catch (error) {
      console.error('Click failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isBrowserAvailable(): boolean {
    return this.isAvailable;
  }
}

export const browserAutomationService = new BrowserAutomationService();