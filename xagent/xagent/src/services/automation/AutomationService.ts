// Frontend automation service for communicating with backend automation API
import axios from 'axios';

export interface AutomationTask {
  type: string;
  data: any;
}

export interface BrowserTask extends AutomationTask {
  type: 'navigate' | 'click' | 'fill_form' | 'extract_text' | 'screenshot';
  data: {
    url?: string;
    selector?: string;
    value?: string;
  };
}

export interface DesktopTask extends AutomationTask {
  type: 'move_mouse' | 'click' | 'type' | 'key_press';
  data: {
    x?: number;
    y?: number;
    button?: string;
    text?: string;
    key?: string;
  };
}

export interface FacialRecognitionTask extends AutomationTask {
  type: 'detect_faces' | 'recognize_faces';
  data: {
    image_data: string;
  };
}

export interface AutomationCapabilities {
  browser_automation: {
    available: boolean;
    capabilities: string[];
  };
  desktop_automation: {
    available: boolean;
    capabilities: string[];
  };
  facial_recognition: {
    available: boolean;
    capabilities: string[];
  };
}

export interface TaskStatus {
  task_id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  failed_at?: string;
  result?: any;
  error?: string;
}

class AutomationService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}/api${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          // Add authentication token if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      });
      return response.data;
    } catch (error) {
      console.error('Automation API request failed:', error);
      throw error;
    }
  }

  async getCapabilities(): Promise<AutomationCapabilities> {
    const response = await this.makeRequest('GET', '/automation/capabilities');
    return response.capabilities;
  }

  async executeBrowserTask(task: BrowserTask): Promise<any> {
    const response = await this.makeRequest('POST', '/automation/browser/execute', task);
    return response.result;
  }

  async executeDesktopTask(task: DesktopTask): Promise<any> {
    const response = await this.makeRequest('POST', '/automation/desktop/execute', task);
    return response.result;
  }

  async executeFacialRecognition(task: FacialRecognitionTask): Promise<any> {
    const response = await this.makeRequest('POST', '/automation/facial-recognition/detect', task);
    return response.result;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await this.makeRequest('GET', `/automation/status/${taskId}`);
    return response;
  }

  async executeWorkflow(workflow: {
    name: string;
    steps: Array<{
      type: string;
      data: any;
    }>;
  }): Promise<{ task_id: string }> {
    const response = await this.makeRequest('POST', '/automation/workflow/execute', workflow);
    return { task_id: response.task_id };
  }

  // Convenience methods for common tasks
  async navigateToURL(url: string): Promise<any> {
    return this.executeBrowserTask({
      type: 'navigate',
      data: { url }
    });
  }

  async clickElement(selector: string): Promise<any> {
    return this.executeBrowserTask({
      type: 'click',
      data: { selector }
    });
  }

  async fillForm(selector: string, value: string): Promise<any> {
    return this.executeBrowserTask({
      type: 'fill_form',
      data: { selector, value }
    });
  }

  async extractText(selector: string): Promise<any> {
    return this.executeBrowserTask({
      type: 'extract_text',
      data: { selector }
    });
  }

  async takeScreenshot(): Promise<any> {
    return this.executeBrowserTask({
      type: 'screenshot',
      data: {}
    });
  }

  async moveMouse(x: number, y: number): Promise<any> {
    return this.executeDesktopTask({
      type: 'move_mouse',
      data: { x, y }
    });
  }

  async clickMouse(x: number, y: number, button: string = 'left'): Promise<any> {
    return this.executeDesktopTask({
      type: 'click',
      data: { x, y, button }
    });
  }

  async typeText(text: string): Promise<any> {
    return this.executeDesktopTask({
      type: 'type',
      data: { text }
    });
  }

  async pressKey(key: string): Promise<any> {
    return this.executeDesktopTask({
      type: 'key_press',
      data: { key }
    });
  }

  async detectFaces(imageData: string): Promise<any> {
    return this.executeFacialRecognition({
      type: 'detect_faces',
      data: { image_data: imageData }
    });
  }

  async recognizeFaces(imageData: string): Promise<any> {
    return this.executeFacialRecognition({
      type: 'recognize_faces',
      data: { image_data: imageData }
    });
  }
}

export const automationService = new AutomationService();
export default automationService;
