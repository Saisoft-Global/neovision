import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModelTrainer from '../components/ModelTrainer';

const NewModel = () => {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate('/models')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Models
      </button>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Train New Model</h1>
        <ModelTrainer onTrainingComplete={() => navigate('/models')} />
      </div>
    </div>
  );
};

export default NewModel;