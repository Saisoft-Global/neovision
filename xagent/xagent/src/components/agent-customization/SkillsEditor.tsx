import React from 'react';
import { Plus, X, Star } from 'lucide-react';
import type { AgentSkill } from '../../types/agent-framework';

interface SkillsEditorProps {
  skills: AgentSkill[];
  onChange: (skills: AgentSkill[]) => void;
}

export const SkillsEditor: React.FC<SkillsEditorProps> = ({ skills, onChange }) => {
  const addSkill = () => {
    onChange([
      ...skills,
      { name: '', level: 1 },
    ]);
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const updateSkill = (index: number, updates: Partial<AgentSkill>) => {
    onChange(
      skills.map((skill, i) =>
        i === index ? { ...skill, ...updates } : skill
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Skills</h2>
        <button
          onClick={addSkill}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Skill</span>
        </button>
      </div>

      <div className="space-y-4">
        {skills.map((skill, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              value={skill.name}
              onChange={(e) => updateSkill(index, { name: e.target.value })}
              placeholder="Skill name"
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => updateSkill(index, { level })}
                  className={`p-1 ${
                    skill.level >= level ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <Star className="w-4 h-4" />
                </button>
              ))}
            </div>

            <button
              onClick={() => removeSkill(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}

        {skills.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No skills added yet. Click "Add Skill" to get started.
          </div>
        )}
      </div>
    </div>
  );
};