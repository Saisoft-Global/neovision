/**
 * Agent Accuracy Testing Framework
 * Runs all scenarios and measures accuracy
 */

import fs from 'fs';
import path from 'path';
import { ProductivityAIAgent } from '@/services/agent/agents/ProductivityAIAgent';
import type { Email } from '@/types/email';

export interface TestScenario {
  id: string;
  category: string;
  input: any;
  expected_output: any;
  pass_criteria: Record<string, any>;
}

export interface TestResult {
  scenario_id: string;
  passed: boolean;
  actual_output: any;
  expected_output: any;
  errors: string[];
  duration_ms: number;
  confidence_score?: number;
}

export interface AccuracyReport {
  agent_type: string;
  test_date: string;
  total_scenarios: number;
  passed: number;
  failed: number;
  accuracy_rate: number;
  avg_duration_ms: number;
  results_by_category: Record<string, {
    total: number;
    passed: number;
    accuracy: number;
  }>;
  detailed_results: TestResult[];
}

export class AgentAccuracyTester {
  private agent: any;
  private scenarios: TestScenario[];
  private results: TestResult[] = [];

  constructor(agentType: 'productivity' | 'sales' | 'travel' | 'banking') {
    // Load test scenarios for this agent type
    const scenariosPath = path.join(
      __dirname,
      '../datasets',
      `${agentType}-agent-scenarios.json`
    );
    
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
    this.scenarios = scenariosData.scenarios;

    // Initialize agent
    this.agent = this.createAgent(agentType);
  }

  private createAgent(agentType: string): any {
    switch (agentType) {
      case 'productivity':
        return new ProductivityAIAgent(
          `test-${agentType}-agent`,
          {
            name: `Test ${agentType} Agent`,
            type: agentType,
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
      // Add other agent types...
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Run all test scenarios
   */
  async runAllTests(): Promise<AccuracyReport> {
    console.log(`🧪 Running ${this.scenarios.length} test scenarios...`);

    for (const scenario of this.scenarios) {
      const result = await this.runScenario(scenario);
      this.results.push(result);

      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${scenario.id}: ${scenario.category} (${result.duration_ms}ms)`);
    }

    return this.generateReport();
  }

  /**
   * Run a single test scenario
   */
  private async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Execute the agent with the test input
      const actualOutput = await this.executeAgentAction(scenario);

      // Validate output against expected
      const passed = this.validateOutput(
        actualOutput,
        scenario.expected_output,
        scenario.pass_criteria,
        errors
      );

      return {
        scenario_id: scenario.id,
        passed,
        actual_output: actualOutput,
        expected_output: scenario.expected_output,
        errors,
        duration_ms: Date.now() - startTime,
        confidence_score: actualOutput?.confidence,
      };
    } catch (error) {
      errors.push(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        scenario_id: scenario.id,
        passed: false,
        actual_output: null,
        expected_output: scenario.expected_output,
        errors,
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute agent action based on scenario type
   */
  private async executeAgentAction(scenario: TestScenario): Promise<any> {
    // Different execution paths based on category
    if (scenario.category === 'email_classification' || 
        scenario.category === 'task_extraction' ||
        scenario.category === 'auto_response' ||
        scenario.category === 'meeting_scheduling' ||
        scenario.category === 'context_understanding') {
      
      // Convert scenario input to Email object
      const email: Email = {
        id: `test-${scenario.id}`,
        from: {
          email: scenario.input.email.from,
          name: scenario.input.email.from.split('@')[0],
        },
        to: [{ email: 'user@company.com', name: 'User' }],
        subject: scenario.input.email.subject,
        body: scenario.input.email.body,
        timestamp: new Date(scenario.input.email.timestamp),
        read: false,
        archived: false,
      };

      return await this.agent.processEmail(email);
    }

    throw new Error(`Unknown category: ${scenario.category}`);
  }

  /**
   * Validate actual output against expected output
   */
  private validateOutput(
    actual: any,
    expected: any,
    passCriteria: Record<string, any>,
    errors: string[]
  ): boolean {
    let passed = true;

    // Check each pass criteria
    for (const [criterion, expectedValue] of Object.entries(passCriteria)) {
      if (!this.checkCriterion(criterion, expectedValue, actual, expected)) {
        errors.push(`Failed criterion: ${criterion}`);
        passed = false;
      }
    }

    return passed;
  }

  /**
   * Check individual pass criterion
   */
  private checkCriterion(
    criterion: string,
    expectedValue: any,
    actual: any,
    expected: any
  ): boolean {
    switch (criterion) {
      case 'must_classify_as':
        return actual?.classification === expectedValue;

      case 'must_extract_all_tasks':
        return actual?.action_items?.length === expectedValue;

      case 'confidence_threshold':
        return actual?.confidence >= expectedValue;

      case 'must_not_auto_respond':
        return actual?.can_auto_respond === !expectedValue;

      case 'can_auto_respond':
        return actual?.can_auto_respond === expectedValue;

      // Add more criterion checks...

      default:
        console.warn(`Unknown criterion: ${criterion}`);
        return true; // Don't fail on unknown criteria
    }
  }

  /**
   * Generate comprehensive accuracy report
   */
  private generateReport(): AccuracyReport {
    const totalScenarios = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = totalScenarios - passed;
    const accuracyRate = (passed / totalScenarios) * 100;

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration_ms, 0);
    const avgDuration = totalDuration / totalScenarios;

    // Calculate accuracy by category
    const resultsByCategory: Record<string, { total: number; passed: number; accuracy: number }> = {};
    
    for (const result of this.results) {
      const scenario = this.scenarios.find(s => s.id === result.scenario_id);
      if (!scenario) continue;

      const category = scenario.category;
      if (!resultsByCategory[category]) {
        resultsByCategory[category] = { total: 0, passed: 0, accuracy: 0 };
      }

      resultsByCategory[category].total++;
      if (result.passed) {
        resultsByCategory[category].passed++;
      }
    }

    // Calculate accuracy percentages
    for (const category of Object.keys(resultsByCategory)) {
      const { total, passed } = resultsByCategory[category];
      resultsByCategory[category].accuracy = (passed / total) * 100;
    }

    return {
      agent_type: this.agent.type,
      test_date: new Date().toISOString(),
      total_scenarios: totalScenarios,
      passed,
      failed,
      accuracy_rate: accuracyRate,
      avg_duration_ms: avgDuration,
      results_by_category: resultsByCategory,
      detailed_results: this.results,
    };
  }

  /**
   * Export report to JSON file
   */
  exportReport(report: AccuracyReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report exported to: ${outputPath}`);
  }

  /**
   * Print summary to console
   */
  printSummary(report: AccuracyReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 AGENT ACCURACY REPORT');
    console.log('='.repeat(60));
    console.log(`Agent Type: ${report.agent_type}`);
    console.log(`Test Date: ${report.test_date}`);
    console.log(`Total Scenarios: ${report.total_scenarios}`);
    console.log(`Passed: ${report.passed} (${report.accuracy_rate.toFixed(1)}%)`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Avg Duration: ${report.avg_duration_ms.toFixed(0)}ms`);
    
    console.log('\n📈 Accuracy by Category:');
    for (const [category, stats] of Object.entries(report.results_by_category)) {
      const icon = stats.accuracy >= 90 ? '✅' : stats.accuracy >= 70 ? '⚠️' : '❌';
      console.log(`  ${icon} ${category}: ${stats.passed}/${stats.total} (${stats.accuracy.toFixed(1)}%)`);
    }

    if (report.failed > 0) {
      console.log('\n❌ Failed Scenarios:');
      const failedResults = report.detailed_results.filter(r => !r.passed);
      for (const result of failedResults) {
        console.log(`  • ${result.scenario_id}: ${result.errors.join(', ')}`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }
}

/**
 * Run accuracy tests from command line
 */
if (require.main === module) {
  const agentType = process.argv[2] as 'productivity' | 'sales' | 'travel' | 'banking';
  
  if (!agentType) {
    console.error('Usage: ts-node AgentAccuracyTester.ts <agent_type>');
    console.error('Agent types: productivity, sales, travel, banking');
    process.exit(1);
  }

  const tester = new AgentAccuracyTester(agentType);
  
  tester.runAllTests().then(report => {
    tester.printSummary(report);
    tester.exportReport(
      report,
      `./reports/accuracy-${agentType}-${Date.now()}.json`
    );
  });
}


