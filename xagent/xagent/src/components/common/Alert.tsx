import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: AlertCircle,
  };

  const Icon = icons[type];

  return (
    <div className={`p-4 border ${styles[type]} flex items-center space-x-2`}>
      <Icon className="w-5 h-5" />
      <span>{message}</span>
    </div>
  );
};