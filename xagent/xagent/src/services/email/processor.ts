import type { Email } from '../../types/email';
import type { Meeting } from '../../types/meeting';
import { createChatCompletion } from '../openai/chat';
import { extractMeetingDetails } from './parsers/meetingParser';
import { generateResponse } from './generators/responseGenerator';
import { classifyEmailIntent } from './analysis/intentClassifier';
import { getMeetingContext } from '../meeting/context';

export async function processIncomingEmail(email: Email) {
  // Classify the email intent
  const intent = await classifyEmailIntent(email);
  
  // Extract any meeting-related information
  const meetingDetails = await extractMeetingDetails(email);
  
  // Get relevant context from past meetings and emails
  const context = await getMeetingContext(email, meetingDetails);
  
  // Generate appropriate response based on intent and context
  const response = await generateResponse(email, intent, context);
  
  return {
    intent,
    meetingDetails,
    suggestedResponse: response,
  };
}