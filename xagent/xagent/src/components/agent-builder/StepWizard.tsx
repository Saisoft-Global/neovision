import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowSkipAhead?: boolean;
}

export const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowSkipAhead = false,
}) => {
  const handleStepClick = (index: number) => {
    if (!onStepClick) return;
    
    // Only allow clicking on completed steps or current step
    if (allowSkipAhead || index <= currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className="w-full">
      {/* Desktop: Horizontal Stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = allowSkipAhead || index <= currentStep;

            return (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 text-white' 
                        : isCurrent
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white scale-110 shadow-lg shadow-blue-500/50'
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                      }
                      ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-bold">{index + 1}</span>
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 max-w-[120px]">
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 mb-8">
                    <div className={`h-full transition-all ${
                      index < currentStep 
                        ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                        : 'bg-gray-700'
                    }`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="md:hidden space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowSkipAhead || index <= currentStep;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(index)}
              disabled={!isClickable}
              className={`
                w-full flex items-center gap-4 p-4 rounded-lg border transition-all
                ${isCurrent 
                  ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500' 
                  : isCompleted
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-gray-800/50 border-gray-700'
                }
                ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed opacity-50'}
              `}
            >
              {/* Step Circle */}
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0
                ${isCompleted 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 text-white' 
                  : isCurrent
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 text-left">
                <div className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <div className="mt-2 text-center text-sm text-gray-400">
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
};

