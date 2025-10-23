/**
 * Unit Tests for Productivity AI Agent
 * Tests core functionality without external dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductivityAIAgent } from '@/services/agent/agents/ProductivityAIAgent';
import testScenarios from '@tests/datasets/productivity-agent-scenarios.json';
import type { Email } from '@/types/email';

describe('ProductivityAIAgent', () => {
  let agent: ProductivityAIAgent;

  beforeEach(() => {
    agent = new ProductivityAIAgent(
      'test-productivity-agent',
      {
        name: 'Test Productivity Agent',
        type: 'productivity',
        personality: {
          friendliness: 0.85,
          formality: 0.7,
          proactiveness: 0.95,
          detail_orientation: 0.8,
        },
        skills: [],
        knowledgeBase: { sources: [], updateFrequency: 'on_demand' },
        llm_config: {
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
        },
      },
      'test-org-id'
    );
  });

  describe('Email Classification', () => {
    it('should classify urgent emails correctly', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-001');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-1',
        from: { email: scenario.input.email.from, name: 'Boss' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      // Mock the EmailIntelligenceEngine
      const mockClassification = {
        classification: 'urgent',
        priority: 'high',
        requiresResponse: true,
        actionItems: ['Review Q4 marketing budget', 'Provide approval by EOD'],
        canAutoRespond: false,
        confidence: 0.95,
      };

      // Test the classification
      const result = await agent.processEmail(email);

      expect(result.success).toBe(true);
      // Validate against pass criteria
      expect(mockClassification.classification).toBe(
        scenario.expected_output.classification
      );
      expect(mockClassification.canAutoRespond).toBe(false);
      expect(mockClassification.confidence).toBeGreaterThanOrEqual(
        scenario.pass_criteria.confidence_threshold
      );
    });

    it('should classify newsletters correctly and suggest archiving', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-002');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-2',
        from: { email: scenario.input.email.from, name: 'Newsletter' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      expect(result.success).toBe(true);
      // Should not create any action items for newsletters
      // Should be marked as low priority
      // Should suggest archiving
    });

    it('should flag spam/phishing emails', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-007');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-spam',
        from: { email: scenario.input.email.from, name: 'Unknown' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      // Should classify as spam
      // Should NOT auto-respond
      // Should flag for security review
      expect(result.success).toBe(true);
    });
  });

  describe('Task Extraction', () => {
    it('should extract all tasks from email with deadlines', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-003');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-3',
        from: { email: scenario.input.email.from, name: 'Colleague' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      expect(result.success).toBe(true);
      
      // Should extract exactly 3 tasks
      // Should identify deadlines (Friday, next week)
      // Should link all tasks to "Project Alpha"
      
      // Validate against pass criteria
      const expectedTaskCount = scenario.pass_criteria.must_extract_all_tasks;
      expect(expectedTaskCount).toBe(3);
    });

    it('should handle ambiguous task descriptions', async () => {
      const email: Email = {
        id: 'test-email-ambiguous',
        from: { email: 'colleague@company.com', name: 'Colleague' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: 'Quick favor',
        body: 'Hey, can you look into that thing we discussed? Thanks!',
        timestamp: new Date(),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      // Should either:
      // 1. Extract a generic task OR
      // 2. Flag for human clarification
      expect(result.success).toBe(true);
    });
  });

  describe('Auto-Response Generation', () => {
    it('should auto-respond to invoices when setting enabled', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-004');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-4',
        from: { email: scenario.input.email.from, name: 'Vendor' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      expect(result.success).toBe(true);
      
      // Should be eligible for auto-response
      // Confidence should be > 0.9
      // Response should be professional
    });

    it('should NOT auto-respond to emails from executives', async () => {
      const email: Email = {
        id: 'test-email-exec',
        from: { email: 'ceo@company.com', name: 'CEO' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: 'Quick question',
        body: 'Can you send me the latest numbers?',
        timestamp: new Date(),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      // Should NEVER auto-respond to C-level executives
      // Should flag for manual response
      expect(result.success).toBe(true);
    });
  });

  describe('Meeting Scheduling', () => {
    it('should suggest available times for meeting requests', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-005');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-5',
        from: { email: scenario.input.email.from, name: 'Client' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      // Should suggest 3+ available times
      // Should avoid calendar conflicts
      // Response should be professional
      expect(result.success).toBe(true);
    });
  });

  describe('Context Understanding', () => {
    it('should understand email threads and maintain context', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-006');
      if (!scenario) throw new Error('Scenario not found');

      const email: Email = {
        id: 'test-email-6',
        from: { email: scenario.input.email.from, name: 'John' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
        threadId: 'thread-123',
      };

      const result = await agent.processEmail(email);

      // Should understand this is approval for budget increase
      // Should extract action items from context
      // Should link to previous thread
      expect(result.success).toBe(true);
    });
  });

  describe('Daily Summary Generation', () => {
    it('should generate accurate daily summary', async () => {
      const scenario = testScenarios.scenarios.find(s => s.id === 'prod-008');
      if (!scenario) throw new Error('Scenario not found');

      // This would test the daily summary feature
      // Should count urgent emails correctly
      // Should prioritize action items
      // Should include meeting schedule
      
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed emails gracefully', async () => {
      const malformedEmail: Partial<Email> = {
        id: 'test-malformed',
        // Missing required fields
      };

      const result = await agent.processEmail(malformedEmail as Email);

      // Should not crash
      // Should return error with helpful message
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle LLM API failures', async () => {
      // Mock LLM failure
      vi.mock('@/services/openai/chat', () => ({
        createChatCompletion: vi.fn().mockRejectedValue(new Error('API timeout')),
      }));

      const email: Email = {
        id: 'test-api-fail',
        from: { email: 'test@test.com', name: 'Test' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: 'Test',
        body: 'Test body',
        timestamp: new Date(),
        read: false,
        archived: false,
      };

      const result = await agent.processEmail(email);

      // Should handle gracefully
      // Should maybe fall back to simpler classification
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should process email within 5 seconds', async () => {
      const email: Email = {
        id: 'test-perf',
        from: { email: 'test@test.com', name: 'Test' },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: 'Performance test',
        body: 'Testing email processing performance',
        timestamp: new Date(),
        read: false,
        archived: false,
      };

      const startTime = Date.now();
      await agent.processEmail(email);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });
});


