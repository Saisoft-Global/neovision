import React, { useState } from 'react';
import { Bot, Database, Zap, MessageSquare, Brain, Settings } from 'lucide-react';
import AIChat from '../components/AIChat';
import KnowledgeBase from '../components/KnowledgeBase';
import AIConfig from '../components/AIConfig';

const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'insights' | 'workflows' | 'config'>('chat');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'insights', label: 'Document Insights', icon: Brain },
    { id: 'workflows', label: 'AI Workflows', icon: Zap },
    { id: 'config', label: 'Configuration', icon: Settings }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <AIChat 
            documentId={selectedDocument}
            documentContext={selectedDocument ? { document_id: selectedDocument } : undefined}
          />
        );
      case 'knowledge':
        return <KnowledgeBase />;
      case 'insights':
        return <DocumentInsights documentId={selectedDocument} />;
      case 'workflows':
        return <AIWorkflows />;
      case 'config':
        return <AIConfig />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
              <p className="text-sm text-gray-500">
                Powered by generative AI for document processing and insights
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedDocument || ''}
              onChange={(e) => setSelectedDocument(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No document context</option>
              <option value="doc1">Invoice #INV-2024-001</option>
              <option value="doc2">Contract #CTR-2024-002</option>
              <option value="doc3">Report #RPT-2024-003</option>
            </select>
            
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// Document Insights Component
const DocumentInsights: React.FC<{ documentId: string | null }> = ({ documentId }) => {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    if (!documentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/document/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          insight_types: ['summary', 'key_points', 'entities', 'sentiment', 'classification']
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!documentId) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
        <p className="text-gray-500">Select a document to generate AI insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Document Insights</h2>
        <button
          onClick={generateInsights}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Brain className="w-4 h-4" />
          {isLoading ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Analyzing document with AI...
          </div>
        </div>
      )}

      {insights && (
        <div className="grid gap-6">
          {insights.summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Summary</h3>
              <p className="text-gray-700">{insights.summary}</p>
            </div>
          )}

          {insights.key_points && insights.key_points.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Key Points</h3>
              <ul className="space-y-2">
                {insights.key_points.map((point: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.entities && insights.entities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Entities</h3>
              <div className="flex flex-wrap gap-2">
                {insights.entities.map((entity: any, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {entity.text} ({entity.type})
                  </span>
                ))}
              </div>
            </div>
          )}

          {insights.sentiment && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Sentiment Analysis</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Overall Sentiment:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  insights.sentiment.score > 0.1 
                    ? 'bg-green-100 text-green-800'
                    : insights.sentiment.score < -0.1
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {insights.sentiment.label}
                </span>
                <span className="text-sm text-gray-500">
                  Score: {insights.sentiment.score.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// AI Workflows Component
const AIWorkflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const createAIWorkflow = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/ai/workflow/ai-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_name: 'AI Document Processor',
          ai_tasks: [
            {
              type: 'analyze_document',
              parameters: { insight_types: ['summary', 'entities'] }
            },
            {
              type: 'extract_structured_data',
              parameters: { fields: ['amount', 'date', 'vendor'] }
            },
            {
              type: 'validate_data',
              parameters: { rules: ['amount_positive', 'date_valid'] }
            }
          ],
          user_id: 'user123'
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setWorkflows(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error creating AI workflow:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">AI-Enhanced Workflows</h2>
        <button
          onClick={createAIWorkflow}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {isCreating ? 'Creating...' : 'Create AI Workflow'}
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Workflows</h3>
          <p className="text-gray-500 mb-4">
            Create AI-enhanced workflows that combine document processing with intelligent automation
          </p>
          <button
            onClick={createAIWorkflow}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Create Your First AI Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{workflow.workflow_name}</h3>
                  <p className="text-sm text-gray-500">ID: {workflow.workflow_id}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Active
                </span>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">AI Tasks:</h4>
                {workflow.ai_tasks.map((task: any, taskIndex: number) => (
                  <div key={taskIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <span className="font-medium text-gray-900">{task.type}</span>
                      <p className="text-sm text-gray-600">
                        {Object.keys(task.parameters).length} parameters configured
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
