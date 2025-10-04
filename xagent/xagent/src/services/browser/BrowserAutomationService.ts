import { Browser, chromium } from 'playwright';
import { BrowserAutomationConfig } from '../../types/browser';
import { BrowserAutomationError } from '../../types/errors';

class BrowserAutomationService {
  private static instance: BrowserAutomationService;
  private browser: Browser | null = null;
  private config: BrowserAutomationConfig;

  private constructor(config: BrowserAutomationConfig) {
    this.config = config;
  }

  public static getInstance(config: BrowserAutomationConfig): BrowserAutomationService {
    if (!BrowserAutomationService.instance) {
      BrowserAutomationService.instance = new BrowserAutomationService(config);
    }
    return BrowserAutomationService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
      }

      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: this.config.browserArgs || [],
        ignoreDefaultArgs: this.config.ignoreDefaultArgs || []
      });
    } catch (error) {
      throw new BrowserAutomationError('Failed to initialize browser', error as Error);
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      throw new BrowserAutomationError('Failed to close browser', error as Error);
    }
  }

  public getBrowser(): Browser | null {
    return this.browser;
  }
}

export default BrowserAutomationService; 