import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { AutomatedTrainingPipeline } from '../../../services/training/AutomatedTrainingPipeline';
import { ModelVersionManager } from '../../../services/training/ModelVersionManager';
import { TrainingMetrics } from './TrainingMetrics';
import { VersionHistory } from './VersionHistory';

export const ModelTraining: React.FC = () => {
  const [isTraining, setIsTraining] = React.useState(false);
  const pipeline = AutomatedTrainingPipeline.getInstance();
  const versionManager = ModelVersionManager.getInstance();

  const handleStartTraining = async () => {
    setIsTraining(true);
    try {
      await pipeline.evaluateAndTrain();
    } catch (error) {
      console.error('Training error:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const handleRollback = async (version: number) => {
    try {
      await versionManager.rollbackToVersion('model-id', version);
      // Refresh version history
    } catch (error) {
      console.error('Rollback error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Model Training</h2>
        <div className="flex gap-4">
          <button
            onClick={handleStartTraining}
            disabled={isTraining}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            <Play className="w-4 h-4" />
            Start Training
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Training Metrics</h3>
          <TrainingMetrics />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Version History</h3>
          <VersionHistory onRollback={handleRollback} />
        </div>
      </div>
    </div>
  );
};