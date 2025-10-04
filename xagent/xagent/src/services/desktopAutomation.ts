import robot from 'robotjs';

export class DesktopAutomationService {
  async moveMouse(x: number, y: number) {
    robot.moveMouse(x, y);
  }

  async clickMouse(button: 'left' | 'right' = 'left') {
    robot.mouseClick(button);
  }

  async typeString(text: string) {
    robot.typeString(text);
  }

  async pressKey(key: string) {
    robot.keyTap(key);
  }

  async getMousePosition() {
    return robot.getMousePos();
  }

  async getScreenSize() {
    return robot.getScreenSize();
  }

  async captureScreen(region?: { x: number; y: number; width: number; height: number }) {
    if (region) {
      return robot.screen.capture(region.x, region.y, region.width, region.height);
    }
    return robot.screen.capture();
  }
} 