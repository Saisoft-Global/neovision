import React, { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { ChatInput } from './ChatInput';
import { useAgentStore } from '../../store/agentStore';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from './EmptyState';
import { ChatProcessor } from '../../services/chat/ChatProcessor';
import { Alert } from '../common/Alert';
import { IntelligentDocumentAnalyzer } from '../../services/chat/IntelligentDocumentAnalyzer';
import { SuggestionEngine, type Suggestion } from '../../services/chat/SuggestionEngine';
import { DocumentContextManager } from '../../services/chat/context/DocumentContextManager';
import { ModernCard } from '../ui/ModernCard';
import { useToast } from '../ui/Toast';
import TravelConfirmDialog from '../travel/TravelConfirmDialog';
import ConsentDialog from '../common/ConsentDialog';
import { checkConsentRequirement } from '../../utils/intentConsent';
import { hasConsent, setConsent } from '../../utils/consentStore';

export const ChatContainer: React.FC = () => {
  const { selectedAgent, messages, isLoading, addMessage } = useAgentStore();
  const { user } = useAuthStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTravelQuery, setPendingTravelQuery] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const chatProcessor = ChatProcessor.getInstance();
  const documentAnalyzer = IntelligentDocumentAnalyzer.getInstance();
  const suggestionEngine = SuggestionEngine.getInstance();
  const documentContextManager = DocumentContextManager.getInstance();
  const { showToast, ToastContainer } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get thread ID for this conversation
  const threadId = selectedAgent?.id || 'default_thread';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedAgent) {
    return <EmptyState />;
  }

  const handleSendMessage = async (content: string, file?: File) => {
    if ((!content.trim() && !file) || processing) return;

    // Clear previous suggestions
    setSuggestions([]);

    // Handle file upload
    if (file) {
      await handleFileUpload(file, content);
      return;
    }

    // Global consent check (across all agents)
    const consent = checkConsentRequirement(content);
    if (consent.needsConsent && consent.confidence >= 0.6 && !hasConsent(consent.intentType)) {
      setPendingMessage(content.trim());
      setConsentOpen(true);
      return;
    }

    // For Travel agent, prompt a specialized confirmation modal
    if (selectedAgent.type === 'travel') {
      setPendingTravelQuery(content.trim());
      setConfirmOpen(true);
      return;
    }

    // Handle regular text message
    const userMessage = {
      id: crypto.randomUUID(),
      content,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text' as const,
    };

    // Optimistic update - add message immediately
    addMessage(userMessage);
    setProcessing(true);
    setError(null);

    try {
      // 🔥 CHECK FOR DOCUMENT CONTEXT
      let messageWithContext = content;
      const hasDocuments = documentContextManager.hasDocuments(threadId);
      
      if (hasDocuments) {
        // Build document context string
        const docContextString = documentContextManager.buildDocumentContextString(threadId);
        
        if (docContextString) {
          messageWithContext = `${content}

---
${docContextString}`;
          console.log('🔥 Including document context in message');
        }
      }

      // Process message and get response with full conversation context
      const response = await chatProcessor.processMessage(messageWithContext, selectedAgent, user?.id);

      // Add agent response
      addMessage({
        id: crypto.randomUUID(),
        content: response,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });

      // Show success toast
      showToast('Message sent successfully', 'success');
    } catch (err) {
      console.error('Failed to process message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMessage);
      
      // Show error toast
      showToast(errorMessage, 'error');
      
      // Add error message
      addMessage({
        id: crypto.randomUUID(),
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error' as const,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmTravel = async ({ portal }: { portal?: string }) => {
    if (!pendingTravelQuery || !selectedAgent) {
      setConfirmOpen(false);
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      content: pendingTravelQuery,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text' as const,
      metadata: { confirmed: true, preferredPortal: portal || undefined }
    };

    // Optimistic update
    addMessage(userMessage);
    setProcessing(true);
    setError(null);
    setConfirmOpen(false);

    try {
      // Pass confirmation hints via ChatProcessor context by prefixing note
      const hint = portal ? `\n\n[Preference: Use ${portal}]` : '';
      const response = await chatProcessor.processMessage(
        `${pendingTravelQuery}${hint}`,
        selectedAgent,
        user?.id
      );

      addMessage({
        id: crypto.randomUUID(),
        content: response,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });
    } catch (err) {
      console.error('Failed to process travel request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process travel request';
      setError(errorMessage);
      addMessage({
        id: crypto.randomUUID(),
        content: 'I encountered an error while processing your travel request. Please try again.',
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error' as const,
      });
    } finally {
      setProcessing(false);
      setPendingTravelQuery(null);
    }
  };

  const handleGenericConsentConfirm = async () => {
    if (!pendingMessage || !selectedAgent) {
      setConsentOpen(false);
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      content: pendingMessage,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text' as const,
      metadata: { consent: true }
    };

    addMessage(userMessage);
    setProcessing(true);
    setError(null);
    setConsentOpen(false);

    try {
      // Remember consent one-time for this intent type
      const consent = checkConsentRequirement(pendingMessage);
      if (consent.intentType && consent.intentType !== 'unknown') {
        setConsent(consent.intentType, true);
      }

      const response = await chatProcessor.processMessage(
        `${pendingMessage}\n\n[User consent granted]`,
        selectedAgent,
        user?.id
      );

      addMessage({
        id: crypto.randomUUID(),
        content: response,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });
    } catch (err) {
      console.error('Failed after consent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMessage);
      addMessage({
        id: crypto.randomUUID(),
        content: 'I encountered an error while executing the confirmed action. Please try again.',
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error' as const,
      });
    } finally {
      setProcessing(false);
      setPendingMessage(null);
    }
  };

  const handleFileUpload = async (file: File, message: string) => {
    setProcessing(true);
    setError(null);

    // Show user's message with file
    const fileMessage = message.trim() 
      ? `${message}\n\n📎 Uploaded: ${file.name}`
      : `📎 Uploaded: ${file.name}`;

    addMessage({
      id: crypto.randomUUID(),
      content: fileMessage,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text' as const,
    });

    try {
      // Analyze the document
      const analysis = await documentAnalyzer.analyzeDocument(file);

      // 🔥 STORE DOCUMENT IN CONTEXT - This is the key fix!
      const documentContext = documentContextManager.addDocument(threadId, analysis);
      console.log('📄 Document stored in context:', documentContext.documentId);

      // Generate suggestions
      const newSuggestions = await suggestionEngine.generateSuggestions(analysis);
      setSuggestions(newSuggestions);

      // Create response with analysis
      const responseContent = `📄 **${analysis.fileName}** processed successfully!

**Document Type:** ${analysis.documentType.replace('_', ' ').toUpperCase()}

**Summary:**
${analysis.summary}

**Key Information:**
${Object.entries(analysis.structuredData)
  .filter(([_, value]) => value !== null && value !== undefined)
  .slice(0, 5)
  .map(([key, value]) => `• **${key.replace('_', ' ')}:** ${value}`)
  .join('\n')}

${newSuggestions.length > 0 ? '\n**What would you like to do?** (Click a suggestion below)' : ''}`;

      addMessage({
        id: crypto.randomUUID(),
        content: responseContent,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });

    } catch (err) {
      console.error('Failed to process file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      
      addMessage({
        id: crypto.randomUUID(),
        content: `I encountered an error processing your file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error' as const,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    // Add user's selection as a message
    addMessage({
      id: crypto.randomUUID(),
      content: `${suggestion.icon} ${suggestion.text}`,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text' as const,
    });

    setProcessing(true);
    setSuggestions([]); // Clear suggestions

    try {
      // 🔥 BUILD MESSAGE WITH DOCUMENT CONTEXT
      const documentContext = documentContextManager.getActiveDocument(threadId);
      
      let messageWithContext = suggestion.text;
      
      if (documentContext) {
        // Include document context in the message
        messageWithContext = `${suggestion.text}

📄 Context: Regarding the document "${documentContext.fileName}" (${documentContext.documentType})

Document Summary:
${documentContext.summary}

Key Data:
${Object.entries(documentContext.structuredData)
  .filter(([_, value]) => value !== null && value !== undefined)
  .slice(0, 5)
  .map(([key, value]) => `• ${key}: ${value}`)
  .join('\n')}`;

        console.log('🔥 Sending message WITH document context');
      }

      // Process message with full context through the chat processor
      const response = await chatProcessor.processMessage(
        messageWithContext,
        selectedAgent,
        user?.id
      );

      addMessage({
        id: crypto.randomUUID(),
        content: response,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });
    } catch (err) {
      console.error('Failed to process suggestion:', err);
      addMessage({
        id: crypto.randomUUID(),
        content: `I'm working on implementing this action. For now, I've noted your request to: ${suggestion.text}`,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text' as const,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <ModernCard variant="glass" className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] backdrop-blur-xl">
        <ChatHeader agent={selectedAgent} />
        
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner message="Loading conversation..." />
            </div>
          ) : (
            <div className="h-full overflow-y-auto scroll-smooth">
              <MessageThread messages={messages} />
              
              {/* Typing Indicator */}
              {processing && (
                <div className="px-4 py-2 flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-2">
            <Alert type="error" message={error} />
          </div>
        )}

        {/* Suggestion Bar - Modern Style */}
        {suggestions.length > 0 && (
          <div className="px-4 py-3 border-t border-white/20">
            <p className="text-sm text-white/80 mb-2 font-medium">✨ Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-4 py-2 glass-card text-sm text-white hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                >
                  <span>{suggestion.icon}</span>
                  <span className="font-medium">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={!selectedAgent.isAvailable || processing}
          loading={processing}
        />
      </ModernCard>
      <ConsentDialog
        open={consentOpen}
        onCancel={() => { setConsentOpen(false); setPendingMessage(null); }}
        onConfirm={handleGenericConsentConfirm}
        title="Please confirm"
        summary={pendingMessage ? `Proceed with this action: "${pendingMessage}"?` : ''}
      />
      <TravelConfirmDialog
        open={confirmOpen}
        onCancel={() => { setConfirmOpen(false); setPendingTravelQuery(null); }}
        onConfirm={handleConfirmTravel}
        summary={pendingTravelQuery ? `Proceed to search and book: "${pendingTravelQuery}"?` : ''}
        suggestedPortals={["Google Flights","Kayak","Skyscanner","MakeMyTrip","Cleartrip","Expedia"]}
      />
    </>
  );
};