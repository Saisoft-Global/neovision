import React from 'react';
import { Bot, Mail, Calendar, FileText, Brain, Calculator, Users, HeartPulse, ShieldCheck } from 'lucide-react';

interface AgentIconProps {
  type: string;
  size?: number;
  className?: string;
}

const AgentIcon: React.FC<AgentIconProps> = ({ type, size = 24, className = '' }) => {
  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail size={size} className={className} />;
      case 'calendar':
        return <Calendar size={size} className={className} />;
      case 'document':
        return <FileText size={size} className={className} />;
      case 'knowledge':
        return <Brain size={size} className={className} />;
      case 'finance':
        return <Calculator size={size} className={className} />;
      case 'hr':
        return <Users size={size} className={className} />;
      case 'health':
        return <HeartPulse size={size} className={className} />;
      case 'security':
        return <ShieldCheck size={size} className={className} />;
      default:
        return <Bot size={size} className={className} />;
    }
  };

  return (
    <div className={`p-2 rounded-full ${getBackgroundColor(type)}`}>
      {getIcon()}
    </div>
  );
};

function getBackgroundColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'email':
      return 'bg-blue-100 text-blue-600';
    case 'calendar':
      return 'bg-purple-100 text-purple-600';
    case 'document':
      return 'bg-yellow-100 text-yellow-600';
    case 'knowledge':
      return 'bg-green-100 text-green-600';
    case 'finance':
      return 'bg-emerald-100 text-emerald-600';
    case 'hr':
      return 'bg-pink-100 text-pink-600';
    case 'health':
      return 'bg-red-100 text-red-600';
    case 'security':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default AgentIcon;