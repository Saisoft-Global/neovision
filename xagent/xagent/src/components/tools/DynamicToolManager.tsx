/**
 * Dynamic Tool Manager Component
 * Allows users to upload, manage, and test dynamic tools via JSON
 */

import React, { useState, useEffect } from 'react';
import { Upload, Download, Play, Trash2, Eye, Plus, Check, X } from 'lucide-react';
import { DynamicToolLoaderService, type DynamicToolConfig } from '../../services/tools/DynamicToolLoader';
import { toolRegistry } from '../../services/tools/ToolRegistry';
import { getSupabaseClient } from '../../config/supabase';

export const DynamicToolManager: React.FC = () => {
  const [tools, setTools] = useState<DynamicToolConfig[]>([]);
  const [selectedTool, setSelectedTool] = useState<DynamicToolConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [jsonEditor, setJsonEditor] = useState('');
  const [showJsonEditor, setShowJsonEditor] = useState(false);

  const toolLoader = DynamicToolLoaderService.getInstance();
  const supabase = getSupabaseClient();

  // Load tools from database
  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Use 'config' column (JSONB auto-parsed by Supabase)
      const configs = data.map((tool: any) => 
        typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config
      );
      setTools(configs);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  // Handle JSON file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const text = await file.text();
      const config: DynamicToolConfig = JSON.parse(text);

      // Validate and save
      await saveTool(config);
      await loadTools();
      
      alert(`✅ Tool "${config.name}" uploaded successfully!`);
    } catch (error) {
      alert(`❌ Failed to upload tool: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Save tool to database
  const saveTool = async (config: DynamicToolConfig) => {
      const { error } = await supabase
      .from('tools')
      .upsert({
        id: config.id,
        name: config.name,
        description: config.description,
        type: config.category || 'custom', // Map to 'type' column
        config: config, // Store as JSONB (no need to stringify)
        is_active: config.isActive ?? true,
      });

    if (error) throw error;

    // Load into registry
    const tool = await toolLoader.loadToolFromJSON(config);
    toolRegistry.registerTool(tool);
  };

  // Register tool from JSON editor
  const handleRegisterFromEditor = async () => {
    try {
      const config: DynamicToolConfig = JSON.parse(jsonEditor);
      await saveTool(config);
      await loadTools();
      setShowJsonEditor(false);
      setJsonEditor('');
      alert(`✅ Tool "${config.name}" registered successfully!`);
    } catch (error) {
      alert(`❌ Failed to register tool: ${error}`);
    }
  };

  // Test tool
  const handleTestTool = async (toolId: string) => {
    try {
      const tool = toolLoader.getTool(toolId);
      if (!tool) throw new Error('Tool not loaded');

      const result = await tool.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: `Error: ${error}` });
    }
  };

  // Delete tool
  const handleDeleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      const { error} = await supabase
        .from('tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;

      toolLoader.unloadTool(toolId);
      await loadTools();
      alert('Tool deleted successfully');
    } catch (error) {
      alert(`Failed to delete tool: ${error}`);
    }
  };

  // Download tool as JSON
  const handleDownloadTool = (config: DynamicToolConfig) => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dynamic Tool Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJsonEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} />
            Create from JSON
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
            <Upload size={20} />
            Upload JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create Tool from JSON</h3>
              <button
                onClick={() => setShowJsonEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <textarea
              value={jsonEditor}
              onChange={(e) => setJsonEditor(e.target.value)}
              className="w-full h-96 p-4 border rounded font-mono text-sm"
              placeholder={`{
  "id": "my-tool",
  "name": "My Custom Tool",
  "description": "Tool description",
  "category": "integration",
  "provider": "my-api",
  "version": "1.0.0",
  "isActive": true,
  "requiresAuth": true,
  "auth": {
    "type": "api_key",
    "credentials": {
      "api_key": "{{VITE_MY_API_KEY}}",
      "base_url": "https://api.example.com"
    }
  },
  "skills": [
    {
      "id": "my_skill",
      "name": "my_skill",
      "description": "My skill description",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/endpoint",
        "headers": {
          "Authorization": "Bearer {{api_key}}"
        }
      },
      "parameters": {
        "param1": {
          "type": "string",
          "required": true,
          "description": "Parameter description"
        }
      },
      "response": {
        "successMessage": "Success!"
      }
    }
  ]
}`}
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowJsonEditor(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRegisterFromEditor}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Register Tool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <div key={tool.id} className="border rounded-lg p-4 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{tool.name}</h3>
                <p className="text-sm text-gray-500">{tool.provider}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${tool.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {tool.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
            
            <div className="text-xs text-gray-500 mb-3">
              <div>{tool.skills.length} skill(s)</div>
              <div>v{tool.version}</div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTool(tool)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                title="View Details"
              >
                <Eye size={14} />
                View
              </button>
              <button
                onClick={() => handleTestTool(tool.id)}
                className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                title="Test Tool"
              >
                <Play size={14} />
                Test
              </button>
              <button
                onClick={() => handleDownloadTool(tool)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                title="Download JSON"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => handleDeleteTool(tool.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tool Details Modal */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedTool.name}</h3>
              <button
                onClick={() => setSelectedTool(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Skills:</h4>
                <ul className="space-y-2">
                  {selectedTool.skills.map((skill) => (
                    <li key={skill.id} className="border-l-4 border-blue-500 pl-3">
                      <div className="font-medium">{skill.name}</div>
                      <div className="text-sm text-gray-600">{skill.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {skill.request.method} {skill.request.url}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Authentication:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedTool.auth, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`mt-4 p-4 rounded ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            {testResult.success ? <Check size={20} /> : <X size={20} />}
            <span className="font-semibold">
              {testResult.success ? 'Test Passed' : 'Test Failed'}
            </span>
          </div>
          <div className="text-sm">{testResult.message}</div>
        </div>
      )}
    </div>
  );
};


