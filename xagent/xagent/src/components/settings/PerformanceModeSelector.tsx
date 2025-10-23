import React, { useState, useEffect } from 'react';
import { performanceConfig, PERFORMANCE_MODES } from '../../config/performanceConfig';

/**
 * Performance Mode Selector Component
 * Allows users to switch between Fast, Balanced, and Full modes
 */
export const PerformanceModeSelector: React.FC = () => {
  const [currentMode, setCurrentMode] = useState(performanceConfig.getCurrentMode());
  const [showDetails, setShowDetails] = useState(false);

  const handleModeChange = (modeName: string) => {
    performanceConfig.setMode(modeName);
    setCurrentMode(performanceConfig.getCurrentMode());
  };

  const modes = performanceConfig.getAllModes();

  return (
    <div className="performance-mode-selector p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          ⚡ Performance Mode
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Choose how the AI agents process your requests
      </p>

      {/* Mode Selection */}
      <div className="space-y-3">
        {modes.map((mode) => (
          <div
            key={mode.name}
            className={`
              p-4 border-2 rounded-lg cursor-pointer transition-all
              ${
                currentMode.name === mode.name
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }
            `}
            onClick={() => handleModeChange(mode.name)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={currentMode.name === mode.name}
                  onChange={() => handleModeChange(mode.name)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {mode.label}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {mode.estimatedTime}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
              {mode.description}
            </p>

            {/* Feature Details */}
            {showDetails && currentMode.name === mode.name && (
              <div className="mt-3 ml-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Enabled Features:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(mode.features).map(([feature, enabled]) => (
                    <div
                      key={feature}
                      className={`
                        flex items-center gap-1
                        ${enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}
                      `}
                    >
                      <span>{enabled ? '✅' : '⏭️'}</span>
                      <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Mode Summary */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>Current:</strong> {currentMode.label}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Estimated response time: {currentMode.estimatedTime}
        </p>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>💡 <strong>Tip:</strong> Use Fast Mode for quick conversations, Full Mode for complex tasks requiring citations and journey tracking.</p>
      </div>
    </div>
  );
};

export default PerformanceModeSelector;


