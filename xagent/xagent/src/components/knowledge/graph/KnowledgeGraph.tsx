import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { KnowledgeGraphManager } from '../../../services/knowledge/graph/KnowledgeGraphManager';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import { GraphVisualization } from './GraphVisualization';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { Alert } from '../../common/Alert';

export const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphManager] = useState(() => KnowledgeGraphManager.getInstance());

  useEffect(() => {
    const initializeGraph = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!containerRef.current) return;

        // Initialize graph manager
        await graphManager.initializeGraph(containerRef.current);
        setIsLoading(false);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to initialize graph');
        setIsLoading(false);
      }
    };

    initializeGraph();

    return () => {
      graphManager.cleanup();
    };
  }, [graphManager]);

  if (isLoading) {
    return <LoadingSpinner message="Initializing knowledge graph..." />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        message={`Failed to initialize knowledge graph: ${error}`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Knowledge Graph</h2>
        <GraphControls />
      </div>

      <div className="relative bg-white rounded-lg shadow-sm border">
        <div 
          ref={containerRef} 
          className="h-[600px] overflow-hidden"
        />
        <GraphLegend />
      </div>
    </div>
  );
};