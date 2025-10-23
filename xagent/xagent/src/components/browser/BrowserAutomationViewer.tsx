/**
 * Browser Automation Viewer
 * Real-time visualization of what the AI agent is doing in the browser
 * Shows steps, screenshots, and progress
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Eye, Zap, CheckCircle, XCircle, Camera, Globe } from 'lucide-react';
import { browserVisualization, VisualizationEvent } from '../../services/browser/BrowserVisualizationService';

interface BrowserAutomationViewerProps {
  isActive: boolean;
  onClose?: () => void;
}

export const BrowserAutomationViewer: React.FC<BrowserAutomationViewerProps> = ({
  isActive,
  onClose
}) => {
  const [events, setEvents] = useState<VisualizationEvent[]>([]);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    // Start recording
    browserVisualization.startRecording();
    setIsRecording(true);

    // Listen for events
    const handleStep = (event: VisualizationEvent) => {
      setEvents(prev => [...prev, event]);
    };

    const handleScreenshot = (event: VisualizationEvent) => {
      setEvents(prev => [...prev, event]);
      if (event.screenshot) {
        setCurrentScreenshot(event.screenshot);
      }
    };

    const handleComplete = (event: VisualizationEvent) => {
      setEvents(prev => [...prev, event]);
      setIsRecording(false);
    };

    browserVisualization.on('step', handleStep);
    browserVisualization.on('step_complete', handleStep);
    browserVisualization.on('navigation', handleStep);
    browserVisualization.on('user_action', handleStep);
    browserVisualization.on('screenshot', handleScreenshot);
    browserVisualization.on('error', handleStep);
    browserVisualization.on('complete', handleComplete);

    return () => {
      browserVisualization.removeAllListeners();
      browserVisualization.stopRecording();
    };
  }, [isActive]);

  if (!isActive) return null;

  const summary = browserVisualization.getSummary();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Browser Automation Live</h2>
                <p className="text-blue-100 text-sm">Watch your AI agent work in real-time</p>
              </div>
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="font-semibold">LIVE</span>
              </div>
            )}

            {onClose && !isRecording && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-white/60 text-xs">Total Steps</div>
              <div className="text-2xl font-bold">{summary.totalSteps}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-white/60 text-xs">Successful</div>
              <div className="text-2xl font-bold text-green-300">{summary.successfulSteps}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-white/60 text-xs">Screenshots</div>
              <div className="text-2xl font-bold">{summary.screenshots}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-white/60 text-xs">Duration</div>
              <div className="text-2xl font-bold">{(summary.duration / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Event Log (Left Side) */}
          <div className="w-1/2 border-r overflow-y-auto p-6 space-y-3">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Execution Steps
            </h3>

            {events.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Waiting for automation to start...</p>
              </div>
            )}

            {events.map((event, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  event.type === 'step_complete' && event.data?.success
                    ? 'bg-green-50 border-green-500'
                    : event.type === 'error'
                    ? 'bg-red-50 border-red-500'
                    : event.type === 'screenshot'
                    ? 'bg-purple-50 border-purple-500'
                    : event.type === 'navigation'
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {event.type === 'step_complete' && event.data?.success && (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  {event.type === 'error' && (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  {event.type === 'screenshot' && (
                    <Camera className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  )}
                  {event.type === 'navigation' && (
                    <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  {event.type === 'step_start' && (
                    <Zap className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                    
                    {event.data && event.type !== 'screenshot' && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                          View details
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Screenshot Preview (Right Side) */}
          <div className="w-1/2 overflow-y-auto p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Live Browser View
            </h3>

            {currentScreenshot ? (
              <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={`data:image/png;base64,${currentScreenshot}`}
                    alt="Browser screenshot"
                    className="w-full h-auto"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Live View:</strong> This is what the AI agent sees and interacts with.
                    All actions are performed intelligently by analyzing the page structure.
                  </p>
                </div>

                {/* All Screenshots */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">All Screenshots ({summary.screenshots})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {events
                      .filter(e => e.type === 'screenshot' && e.screenshot)
                      .map((event, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentScreenshot(event.screenshot!)}
                          className="border rounded hover:border-blue-500 transition-colors overflow-hidden"
                        >
                          <img
                            src={`data:image/png;base64,${event.screenshot}`}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-auto"
                          />
                          <div className="bg-gray-100 px-2 py-1 text-xs text-gray-600 truncate">
                            {event.message}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No screenshots captured yet</p>
                <p className="text-xs mt-2">Screenshots will appear as the agent works</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isRecording && events.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Automation completed in {(summary.duration / 1000).toFixed(1)} seconds
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const summary = browserVisualization.getSummary();
                    alert(`Execution Summary:\n${JSON.stringify(summary, null, 2)}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  View Summary
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



