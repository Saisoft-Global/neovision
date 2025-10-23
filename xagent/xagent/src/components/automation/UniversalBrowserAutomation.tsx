import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Square, Globe, Search, MessageSquare, Settings } from 'lucide-react';
import { universalBrowserAutomationAgent } from '../../services/automation/UniversalBrowserAutomationAgent';
import { Alert } from '../common/Alert';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AutomationRequest {
  input: string;
  website?: string;
  timestamp: Date;
}

interface AutomationResult {
  success: boolean;
  result?: any;
  error?: string;
  guidance?: string;
  suggestions?: string[];
  executionTime: number;
}

export const UniversalBrowserAutomation: React.FC = () => {
  const [input, setInput] = useState('');
  const [website, setWebsite] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [microphoneWorking, setMicrophoneWorking] = useState<boolean | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeVoiceProcessor();
    testMicrophone();
    loadSupportedLanguages();
  }, []);

  const initializeVoiceProcessor = async () => {
    try {
      await universalBrowserAutomationAgent.initialize();
      console.log('✅ Universal Browser Automation Agent initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      setError('Failed to initialize voice processor');
    }
  };

  const testMicrophone = async () => {
    try {
      const isWorking = await universalBrowserAutomationAgent.testVoiceInput();
      setMicrophoneWorking(isWorking);
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      setMicrophoneWorking(false);
    }
  };

  const loadSupportedLanguages = async () => {
    try {
      const languages = await universalBrowserAutomationAgent.getSupportedLanguages();
      setSupportedLanguages(languages);
    } catch (error) {
      console.error('❌ Failed to load languages:', error);
      setSupportedLanguages(['en-US']);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    await executeAutomation(input, website);
  };

  const executeAutomation = async (automationInput: string, targetWebsite?: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log(`🚀 Executing automation: "${automationInput}"`);
      
      const result = await universalBrowserAutomationAgent.processTextCommand(
        automationInput, 
        targetWebsite
      );
      
      setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (result.success) {
        setInput(''); // Clear input on success
      }
      
    } catch (error) {
      console.error('❌ Automation failed:', error);
      setError(error instanceof Error ? error.message : 'Automation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      await stopVoiceListening();
    } else {
      await startVoiceListening();
    }
  };

  const startVoiceListening = async () => {
    try {
      setIsListening(true);
      setError(null);
      
      await universalBrowserAutomationAgent.startVoiceListening();
      console.log('🎤 Voice listening started');
      
    } catch (error) {
      console.error('❌ Failed to start voice listening:', error);
      setError('Failed to start voice listening');
      setIsListening(false);
    }
  };

  const stopVoiceListening = async () => {
    try {
      setIsListening(false);
      setIsProcessing(true);
      
      const result = await universalBrowserAutomationAgent.stopVoiceListening();
      
      setResults(prev => [result, ...prev.slice(0, 9)]);
      
      if (result.success) {
        console.log('✅ Voice automation completed');
      } else {
        setError(result.error || 'Voice automation failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to stop voice listening:', error);
      setError('Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    universalBrowserAutomationAgent.setVoiceLanguage(language);
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const formatExecutionTime = (time: number) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🌐 Universal Browser Automation
        </h1>
        <p className="text-gray-600">
          Control any website with natural language commands. Speak or type your automation requests.
        </p>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Website Support</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">Works on any website</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mic className={`w-5 h-5 ${microphoneWorking ? 'text-green-600' : 'text-red-600'}`} />
            <span className="font-medium text-green-900">Voice Input</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {microphoneWorking === null ? 'Testing...' : 
             microphoneWorking ? 'Ready' : 'Not available'}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">AI Understanding</span>
          </div>
          <p className="text-sm text-purple-700 mt-1">Natural language processing</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert 
          type="error" 
          message={error} 
          onClose={() => setError(null)} 
        />
      )}

      {/* Input Section */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <label htmlFor="automation-input" className="block text-sm font-medium text-gray-700 mb-2">
              Automation Command
            </label>
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                id="automation-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., 'Buy Samsung mobile from Flipkart if less than 1000 AED'"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Execute</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
              Target Website (Optional)
            </label>
            <input
              id="website"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g., flipkart.com, amazon.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            />
          </div>

          {/* Voice Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={!microphoneWorking || isProcessing}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Voice</span>
                  </>
                )}
              </button>

              {isListening && (
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Listening...</span>
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Examples */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Example Commands</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Buy Samsung mobile from Flipkart if less than 1000 AED",
            "Login to my Gmail account",
            "Fill out the contact form with my details",
            "Search for Python tutorials on YouTube",
            "Upload my resume to LinkedIn",
            "Take a screenshot of this page"
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => setInput(example)}
              className="text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Execution Results</h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(result.success)}</span>
                    <span className={`font-medium ${getStatusColor(result.success)}`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatExecutionTime(result.executionTime)}
                  </span>
                </div>

                {result.guidance && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-700">{result.guidance}</p>
                  </div>
                )}

                {result.error && (
                  <div className="mb-2">
                    <p className="text-sm text-red-600">Error: {result.error}</p>
                  </div>
                )}

                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Suggestions:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {result.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.result && (
                  <details className="mt-2">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      View Details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Processing automation...</span>
        </div>
      )}
    </div>
  );
};
