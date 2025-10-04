import React from 'react';
import { BarChart, TrendingUp, AlertCircle } from 'lucide-react';
import { FeedbackAnalytics } from '../../../services/feedback/analytics/FeedbackAnalytics';
import { FeedbackChart } from './FeedbackChart';
import { IssuesList } from './IssuesList';
import { TrendingMetrics } from './TrendingMetrics';
import { isServiceConfigured } from '../../../config/environment';

export const FeedbackDashboard: React.FC = () => {
  const [timeframe, setTimeframe] = React.useState<'day' | 'week' | 'month'>('week');
  const [trends, setTrends] = React.useState<any>(null);
  const [issues, setIssues] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isServiceConfigured('supabase')) {
      setError('Supabase is not configured. Please set up your environment variables.');
      return;
    }

    loadData();
  }, [timeframe]);

  const loadData = async () => {
    try {
      setError(null);
      const analytics = FeedbackAnalytics.getInstance();
      const [trendData, issueData] = await Promise.all([
        analytics.getFeedbackTrends(timeframe),
        analytics.getCommonIssues(),
      ]);
      setTrends(trendData);
      setIssues(issueData);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load feedback data:', err);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Feedback Data</h3>
        </div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrendingMetrics trends={trends} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Feedback Trends</h3>
          <FeedbackChart data={trends} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Common Issues</h3>
          <IssuesList issues={issues} />
        </div>
      </div>
    </div>
  );
};