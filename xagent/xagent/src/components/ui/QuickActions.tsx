/**
 * Quick Actions Component
 * Provides one-click access to common tasks
 */
import { LucideIcon } from 'lucide-react';
import { ModernCard } from './ModernCard';
import { cn } from '../../utils/cn';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  color?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const QuickActions = ({
  actions,
  columns = 4,
  className
}: QuickActionsProps) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-3 md:gap-4', gridCols[columns], className)}>
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            onClick={action.onClick}
            className="group glass-card p-4 md:p-6 text-left hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 touch-target"
          >
            <div className={cn(
              'w-12 h-12 rounded-xl mb-3 flex items-center justify-center',
              'bg-gradient-to-br from-indigo-500 to-purple-600',
              'group-hover:scale-110 transition-transform duration-300'
            )}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-1 text-sm md:text-base">
              {action.label}
            </h3>
            <p className="text-xs md:text-sm text-white/60 line-clamp-2">
              {action.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
