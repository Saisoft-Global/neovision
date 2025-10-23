// Desktop automation service with graceful fallback for missing dependencies
let robot: any = null;

try {
  robot = require('robotjs');
} catch (error) {
  console.warn('RobotJS not available, desktop automation will use fallback');
}

export class DesktopAutomationService {
  private isAvailable: boolean = !!robot;

  async click(x: number, y: number) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating click at:', x, y);
      return Promise.resolve();
    }

    try {
      robot.moveMouse(x, y);
      robot.mouseClick();
    } catch (error) {
      console.error('Click failed:', error);
      throw error;
    }
  }

  async type(text: string) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating type:', text);
      return Promise.resolve();
    }

    try {
      robot.typeString(text);
    } catch (error) {
      console.error('Type failed:', error);
      throw error;
    }
  }

  async keyTap(key: string) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating key tap:', key);
      return Promise.resolve();
    }

    try {
      robot.keyTap(key);
    } catch (error) {
      console.error('Key tap failed:', error);
      throw error;
    }
  }

  async moveMouse(x: number, y: number) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating mouse move to:', x, y);
      return Promise.resolve();
    }

    try {
      robot.moveMouse(x, y);
    } catch (error) {
      console.error('Mouse move failed:', error);
      throw error;
    }
  }

  async clickMouse(button: string = 'left') {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating mouse click:', button);
      return Promise.resolve();
    }

    try {
      robot.mouseClick(button);
    } catch (error) {
      console.error('Mouse click failed:', error);
      throw error;
    }
  }

  async typeString(text: string) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating type string:', text);
      return Promise.resolve();
    }

    try {
      robot.typeString(text);
    } catch (error) {
      console.error('Type string failed:', error);
      throw error;
    }
  }

  async pressKey(key: string) {
    if (!this.isAvailable) {
      console.warn('Desktop automation not available, simulating key press:', key);
      return Promise.resolve();
    }

    try {
      robot.keyTap(key);
    } catch (error) {
      console.error('Key press failed:', error);
      throw error;
    }
  }

  async getScreenSize() {
    if (!this.isAvailable) {
      return { width: 1920, height: 1080 }; // Default fallback
    }

    try {
      return robot.getScreenSize();
    } catch (error) {
      console.error('Get screen size failed:', error);
      return { width: 1920, height: 1080 };
    }
  }

  isDesktopAvailable(): boolean {
    return this.isAvailable;
  }
}

export const desktopAutomationService = new DesktopAutomationService();