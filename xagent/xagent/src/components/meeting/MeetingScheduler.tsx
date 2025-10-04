import React, { useState } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import type { Meeting } from '../../types/meeting';
import { suggestMeetingTime, generateAgenda } from '../../services/meeting/scheduler';

interface MeetingSchedulerProps {
  onSchedule: (meeting: Partial<Meeting>) => void;
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ onSchedule }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attendees, setAttendees] = useState<Meeting['attendees']>([]);
  const [platform, setPlatform] = useState<Meeting['platform']>('teams');
  const [duration, setDuration] = useState(30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const agenda = await generateAgenda(title, description, duration);
    
    onSchedule({
      id: crypto.randomUUID(),
      title,
      description,
      attendees,
      platform,
      agenda,
      status: 'scheduled',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Meeting['platform'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="teams">Microsoft Teams</option>
          <option value="zoom">Zoom</option>
          <option value="meet">Google Meet</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min={15}
          step={15}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Schedule Meeting
      </button>
    </form>
  );
};