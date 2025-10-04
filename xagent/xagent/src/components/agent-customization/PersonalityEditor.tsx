import React from 'react';
import { Heart, BookOpen, Zap, Target } from 'lucide-react';
import type { AgentPersonality } from '../../types/agent-framework';

interface PersonalityEditorProps {
  personality: AgentPersonality;
  onChange: (personality: AgentPersonality) => void;
}

export const PersonalityEditor: React.FC<PersonalityEditorProps> = ({
  personality,
  onChange,
}) => {
  const traits = [
    {
      key: 'friendliness',
      icon: Heart,
      label: 'Friendliness',
      description: 'How warm and approachable the agent is',
    },
    {
      key: 'formality',
      icon: BookOpen,
      label: 'Formality',
      description: 'Level of professional communication',
    },
    {
      key: 'proactiveness',
      icon: Zap,
      label: 'Proactiveness',
      description: 'Initiative in taking actions',
    },
    {
      key: 'detail_orientation',
      icon: Target,
      label: 'Detail Orientation',
      description: 'Attention to specifics',
    },
  ] as const;

  const handleTraitChange = (trait: keyof AgentPersonality, value: number) => {
    onChange({
      ...personality,
      [trait]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Personality Traits</h2>
      <div className="space-y-6">
        {traits.map(({ key, icon: Icon, label, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-gray-500" />
                <label className="font-medium">{label}</label>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round(personality[key] * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={personality[key]}
              onChange={(e) => handleTraitChange(key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};