import { useState, useEffect } from 'react';
import { Plus, Brain, CheckCircle, Clock, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trainingService, TrainedModel, ActiveModelInfo } from '../services/trainingService';

const Models = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [activeModel, setActiveModel] = useState<ActiveModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingActive, setSettingActive] = useState<string | null>(null);

  // Load models and active model info
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [modelsData, activeModelData] = await Promise.all([
          trainingService.getModels(),
          trainingService.getActiveModel().catch(() => null) // Don't fail if no active model
        ]);
        
        setModels(modelsData);
        setActiveModel(activeModelData);
      } catch (err) {
        console.error('Error loading models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle setting active model
  const handleSetActive = async (modelName: string) => {
    try {
      setSettingActive(modelName);
      await trainingService.setActiveModel(modelName);
      
      // Refresh active model info
      const activeModelData = await trainingService.getActiveModel();
      setActiveModel(activeModelData);
    } catch (err) {
      console.error('Error setting active model:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active model');
    } finally {
      setSettingActive(null);
    }
  };

  // Handle auto-setting latest model
  const handleAutoSetLatest = async () => {
    try {
      setSettingActive('latest');
      await trainingService.autoSetLatestModel();
      
      // Refresh data
      const [modelsData, activeModelData] = await Promise.all([
        trainingService.getModels(),
        trainingService.getActiveModel()
      ]);
      
      setModels(modelsData);
      setActiveModel(activeModelData);
    } catch (err) {
      console.error('Error auto-setting latest model:', err);
      setError(err instanceof Error ? err.message : 'Failed to auto-set latest model');
    } finally {
      setSettingActive(null);
    }
  };

  // Handle clearing active model
  const handleClearActive = async () => {
    try {
      setSettingActive('clear');
      await trainingService.clearActiveModel();
      
      // Refresh active model info
      const activeModelData = await trainingService.getActiveModel();
      setActiveModel(activeModelData);
    } catch (err) {
      console.error('Error clearing active model:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear active model');
    } finally {
      setSettingActive(null);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModelStatus = (modelName: string) => {
    if (activeModel?.active && activeModel.model_name === modelName) {
      return { status: 'active', icon: CheckCircle, color: 'text-green-500' };
    }
    return { status: 'inactive', icon: Clock, color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading models...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">ML Models</h1>
          <p className="text-gray-600 mt-1">
            {models.length} trained model{models.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoSetLatest}
            disabled={settingActive === 'latest' || models.length === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            {settingActive === 'latest' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Auto-Set Latest
          </button>
          <button
            onClick={() => navigate('/new-model')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Model
          </button>
        </div>
      </div>

      {/* Active Model Status */}
      {activeModel && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-blue-900">
                  {activeModel.active ? 'Active Model' : 'No Active Model'}
                </h3>
                <p className="text-sm text-blue-700">
                  {activeModel.active 
                    ? `${activeModel.model_name} (${activeModel.device})`
                    : 'Using pattern-based extraction only'
                  }
                </p>
              </div>
            </div>
            {activeModel.active && (
              <button
                onClick={handleClearActive}
                disabled={settingActive === 'clear'}
                className="btn btn-secondary text-sm"
              >
                {settingActive === 'clear' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Clear Active'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Models Grid */}
      {models.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trained models yet
          </h3>
          <p className="text-gray-500 mb-4">
            Train your first model to start using ML-powered document processing
          </p>
          <button
            onClick={() => navigate('/new-model')}
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Train New Model
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const modelStatus = getModelStatus(model.model_name);
            const StatusIcon = modelStatus.icon;
            
            return (
              <div key={model.model_name} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Brain className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">{model.model_name}</h3>
                      <p className="text-sm text-gray-500">
                        Trained on {model.metadata.num_documents} document{model.metadata.num_documents !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <StatusIcon className={`w-5 h-5 ${modelStatus.color}`} />
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Trained</span>
                    <span className="font-medium">{formatDate(model.metadata.timestamp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Documents</span>
                    <span className="font-medium">{model.metadata.num_documents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Labels</span>
                    <span className="font-medium">{Object.keys(model.metadata.label_map).length}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!activeModel?.active || activeModel.model_name !== model.model_name ? (
                    <button
                      onClick={() => handleSetActive(model.model_name)}
                      disabled={settingActive === model.model_name}
                      className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-2"
                    >
                      {settingActive === model.model_name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Set Active
                    </button>
                  ) : (
                    <div className="flex-1 text-center py-2 px-3 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                      Active
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Models;