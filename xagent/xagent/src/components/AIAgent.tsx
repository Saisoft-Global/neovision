import React, { useState, useEffect } from 'react';
import { BrowserAutomationService } from '../services/browserAutomation';
import { FacialRecognitionService } from '../services/facialRecognition';
import { DesktopAutomationService } from '../services/desktopAutomation';

interface AIAgentProps {
  onStatusChange: (status: string) => void;
}

export const AIAgent: React.FC<AIAgentProps> = ({ onStatusChange }) => {
  const [browserService] = useState(() => new BrowserAutomationService());
  const [facialService] = useState(() => new FacialRecognitionService());
  const [desktopService] = useState(() => new DesktopAutomationService());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        await browserService.initialize();
        await facialService.loadModels();
        setIsInitialized(true);
        onStatusChange('Ready');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        onStatusChange('Error: Failed to initialize');
      }
    };

    initializeServices();
  }, []);

  const handleUrlNavigation = async (url: string) => {
    try {
      onStatusChange('Navigating to URL...');
      await browserService.navigateTo(url);
      onStatusChange('Navigation complete');
    } catch (error) {
      console.error('Navigation failed:', error);
      onStatusChange('Error: Navigation failed');
    }
  };

  const handleFormFill = async (selector: string, value: string) => {
    try {
      onStatusChange('Filling form...');
      await browserService.fillForm(selector, value);
      onStatusChange('Form filled successfully');
    } catch (error) {
      console.error('Form filling failed:', error);
      onStatusChange('Error: Form filling failed');
    }
  };

  const handleFacialRecognition = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
    try {
      onStatusChange('Processing facial recognition...');
      const detections = await facialService.detectFaces(imageElement);
      onStatusChange('Facial recognition complete');
      return detections;
    } catch (error) {
      console.error('Facial recognition failed:', error);
      onStatusChange('Error: Facial recognition failed');
      throw error;
    }
  };

  const handleDesktopAction = async (action: string, params: any) => {
    try {
      onStatusChange('Executing desktop action...');
      switch (action) {
        case 'moveMouse':
          await desktopService.moveMouse(params.x, params.y);
          break;
        case 'click':
          await desktopService.clickMouse(params.button);
          break;
        case 'type':
          await desktopService.typeString(params.text);
          break;
        case 'keyPress':
          await desktopService.pressKey(params.key);
          break;
        default:
          throw new Error('Unknown desktop action');
      }
      onStatusChange('Desktop action complete');
    } catch (error) {
      console.error('Desktop action failed:', error);
      onStatusChange('Error: Desktop action failed');
      throw error;
    }
  };

  return (
    <div className="ai-agent-container">
      <div className="status-indicator">
        Status: {isInitialized ? 'Ready' : 'Initializing...'}
      </div>
      {/* Add UI components for controlling the agent */}
    </div>
  );
}; 