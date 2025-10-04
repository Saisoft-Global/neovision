import type { Email } from '../../types/email';
import type { Meeting } from '../../types/meeting';
import { vectorStore } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';

export async function getMeetingContext(
  email: Email,
  meetingDetails?: Partial<Meeting>
): Promise<{
  relatedMeetings: Meeting[];
  previousEmails: Email[];
  relevantTasks: any[];
}> {
  // Generate embeddings for the email content
  const embeddings = await generateEmbeddings(email.content);
  
  // Search for related content in vector store
  const results = await vectorStore.query({
    vector: embeddings,
    topK: 5,
    filter: {
      type: { $in: ['meeting', 'email', 'task'] },
    },
  });

  // Process and return the relevant context
  return {
    relatedMeetings: results.matches
      .filter(m => m.metadata.type === 'meeting')
      .map(m => m.metadata.meeting),
    previousEmails: results.matches
      .filter(m => m.metadata.type === 'email')
      .map(m => m.metadata.email),
    relevantTasks: results.matches
      .filter(m => m.metadata.type === 'task')
      .map(m => m.metadata.task),
  };
}