import { z } from 'zod';

export const MeetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  attendees: z.array(z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string().optional(),
  })),
  agenda: z.array(z.object({
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    description: z.string().optional(),
  })),
  platform: z.enum(['teams', 'zoom', 'meet']),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']),
  notes: z.array(z.object({
    id: z.string(),
    content: z.string(),
    timestamp: z.date(),
    author: z.string(),
  })).optional(),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    assignee: z.string(),
    dueDate: z.date().optional(),
    status: z.enum(['pending', 'in-progress', 'completed']),
  })).optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
});

export type Meeting = z.infer<typeof MeetingSchema>;