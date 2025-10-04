export class BrowserAutomationError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'BrowserAutomationError';
  }
} 