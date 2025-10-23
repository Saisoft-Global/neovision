// Entity extraction service with OpenAI integration
import { generateEmbeddings } from '../openai/embeddings';

export interface Entity {
  text: string;
  label: string;
  confidence: number;
  start: number;
  end: number;
}

export const extractEntities = async (text: string): Promise<Entity[]> => {
  try {
    // Simple entity extraction using pattern matching
    // In a real implementation, you would use NLP libraries or AI services
    
    const entities: Entity[] = [];
    
    // Email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'EMAIL',
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // URL pattern
    const urlRegex = /https?:\/\/[^\s]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'URL',
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Phone number pattern
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'PHONE',
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Date pattern (basic)
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'DATE',
        confidence: 0.7,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Money pattern
    const moneyRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?/g;
    while ((match = moneyRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'MONEY',
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Organization pattern (capitalized words)
    const orgRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    while ((match = orgRegex.exec(text)) !== null) {
      // Skip common words that aren't organizations
      const commonWords = ['The', 'This', 'That', 'These', 'Those', 'And', 'Or', 'But'];
      if (!commonWords.includes(match[0])) {
        entities.push({
          text: match[0],
          label: 'ORGANIZATION',
          confidence: 0.6,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }
    
    return entities;
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return [];
  }
};

export const extractEntitiesWithAI = async (text: string): Promise<Entity[]> => {
  try {
    // This would use OpenAI or another AI service for more accurate entity extraction
    // For now, fall back to pattern matching
    return await extractEntities(text);
  } catch (error) {
    console.error('AI entity extraction failed:', error);
    return await extractEntities(text);
  }
};