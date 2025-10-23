export type IntentType =
  | 'travel_booking'
  | 'purchase'
  | 'payment'
  | 'form_submission'
  | 'browse_automation'
  | 'email_send'
  | 'data_deletion'
  | 'unknown';

export interface ConsentCheck {
  needsConsent: boolean;
  intentType: IntentType;
  confidence: number;
}

const intentKeywordMap: Array<{ intent: IntentType; keywords: string[] }> = [
  { intent: 'travel_booking', keywords: ['book', 'reserve', 'ticket', 'flight', 'hotel', 'itinerary'] },
  { intent: 'purchase', keywords: ['buy', 'order', 'checkout', 'purchase', 'add to cart'] },
  { intent: 'payment', keywords: ['pay', 'payment', 'card', 'upi', 'netbanking'] },
  { intent: 'form_submission', keywords: ['submit', 'register', 'apply', 'sign up', 'fill form'] },
  { intent: 'browse_automation', keywords: ['open website', 'web search', 'navigate', 'browser automation'] },
  { intent: 'email_send', keywords: ['send email', 'email to', 'draft and send'] },
  { intent: 'data_deletion', keywords: ['delete', 'remove record', 'purge'] },
];

export function checkConsentRequirement(message: string): ConsentCheck {
  const text = (message || '').toLowerCase();
  for (const { intent, keywords } of intentKeywordMap) {
    const hits = keywords.filter(k => text.includes(k)).length;
    if (hits > 0) {
      // Basic confidence: more keyword hits => higher confidence
      const confidence = Math.min(0.5 + hits * 0.15, 0.95);
      return { needsConsent: true, intentType: intent, confidence };
    }
  }
  return { needsConsent: false, intentType: 'unknown', confidence: 0 };
}




