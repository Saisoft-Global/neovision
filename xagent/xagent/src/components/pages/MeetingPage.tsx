import React, { useState } from 'react';
import { MeetingScheduler } from '../meeting/MeetingScheduler';
import { Calendar, Clock } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import type { Meeting } from '../../types/meeting';

export const MeetingPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const handleScheduleMeeting = (meeting: Partial<Meeting>) => {
    if (meeting.id) {
      setMeetings(prev => [...prev, meeting as Meeting]);
      // Here you would typically save to backend
      console.log('Meeting scheduled:', meeting);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Meeting Scheduler</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        📅 Schedule and manage meetings with AI assistance
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Schedule New Meeting</h2>
          </div>
          <MeetingScheduler onSchedule={handleScheduleMeeting} />
        </ModernCard>

        <ModernCard variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Upcoming Meetings</h2>
          </div>
          
          {meetings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No meetings scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="font-medium text-white">{meeting.title}</h3>
                  <p className="text-white/60 text-sm mt-1">{meeting.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                    <span>Platform: {meeting.platform}</span>
                    <span>Duration: {meeting.agenda?.duration || 30} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModernCard>
      </div>
    </div>
  );
};
