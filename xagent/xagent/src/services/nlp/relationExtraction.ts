// Relation extraction service
export interface Relation {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

export const extractRelations = async (text: string): Promise<Relation[]> => {
  try {
    // Simple relation extraction using pattern matching
    // In a real implementation, you would use NLP libraries or AI services
    
    const relations: Relation[] = [];
    
    // Basic subject-verb-object patterns
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      
      // Look for simple patterns like "X works for Y", "X is Y", etc.
      for (let i = 0; i < words.length - 2; i++) {
        const current = words[i].toLowerCase();
        const next = words[i + 1].toLowerCase();
        const after = words[i + 2].toLowerCase();
        
        // "X works for Y" pattern
        if ((current === 'works' && next === 'for') || 
            (current === 'works' && next === 'at')) {
          const subject = words.slice(0, i).join(' ');
          const object = words.slice(i + 2).join(' ');
          if (subject && object) {
            relations.push({
              subject: subject.trim(),
              predicate: 'works_for',
              object: object.trim(),
              confidence: 0.8
            });
          }
        }
        
        // "X is Y" pattern
        if (current === 'is' || current === 'are') {
          const subject = words.slice(0, i).join(' ');
          const object = words.slice(i + 1).join(' ');
          if (subject && object) {
            relations.push({
              subject: subject.trim(),
              predicate: 'is_a',
              object: object.trim(),
              confidence: 0.7
            });
          }
        }
        
        // "X has Y" pattern
        if (current === 'has' || current === 'have') {
          const subject = words.slice(0, i).join(' ');
          const object = words.slice(i + 1).join(' ');
          if (subject && object) {
            relations.push({
              subject: subject.trim(),
              predicate: 'has',
              object: object.trim(),
              confidence: 0.7
            });
          }
        }
        
        // "X located in Y" pattern
        if ((current === 'located' && next === 'in') ||
            (current === 'based' && next === 'in')) {
          const subject = words.slice(0, i).join(' ');
          const object = words.slice(i + 2).join(' ');
          if (subject && object) {
            relations.push({
              subject: subject.trim(),
              predicate: 'located_in',
              object: object.trim(),
              confidence: 0.8
            });
          }
        }
      }
    }
    
    // Look for email relationships
    const emailRegex = /\b([A-Za-z\s]+)\s+<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})>\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      relations.push({
        subject: match[1].trim(),
        predicate: 'has_email',
        object: match[2].trim(),
        confidence: 0.9
      });
    }
    
    // Look for phone relationships
    const phoneRegex = /\b([A-Za-z\s]+)\s*:?\s*(\d{3}[-.]?\d{3}[-.]?\d{4})\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      relations.push({
        subject: match[1].trim(),
        predicate: 'has_phone',
        object: match[2].trim(),
        confidence: 0.8
      });
    }
    
    return relations;
  } catch (error) {
    console.error('Relation extraction failed:', error);
    return [];
  }
};

export const extractRelationsWithAI = async (text: string): Promise<Relation[]> => {
  try {
    // This would use OpenAI or another AI service for more accurate relation extraction
    // For now, fall back to pattern matching
    return await extractRelations(text);
  } catch (error) {
    console.error('AI relation extraction failed:', error);
    return await extractRelations(text);
  }
};