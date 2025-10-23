import type { Tool, ToolSkill, SkillExecutionResult } from '../../types/tool-framework';

/**
 * Central registry for all tools and their skills
 * Manages tool registration, discovery, and skill execution
 */
export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, Tool> = new Map();
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  /**
   * Register a new tool with its skills
   */
  public registerTool(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered. Updating...`);
    }
    
    this.tools.set(tool.id, tool);
    console.log(`✅ Tool registered: ${tool.name} with ${tool.skills.length} skills`);
    
    // Log skills for debugging
    tool.skills.forEach(skill => {
      console.log(`   ├─ ${skill.name}: ${skill.description}`);
    });
  }
  
  /**
   * Unregister a tool
   */
  public unregisterTool(toolId: string): boolean {
    const removed = this.tools.delete(toolId);
    if (removed) {
      console.log(`🗑️  Tool unregistered: ${toolId}`);
    }
    return removed;
  }
  
  /**
   * Get all registered tools
   */
  public getTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get active tools only
   */
  public getActiveTools(): Tool[] {
    return this.getTools().filter(tool => tool.isActive);
  }
  
  /**
   * Get a specific tool by ID
   */
  public getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }
  
  /**
   * Get all skills across all tools
   */
  public getAllSkills(): ToolSkill[] {
    return Array.from(this.tools.values())
      .flatMap(tool => tool.skills);
  }
  
  /**
   * Get skills for a specific tool
   */
  public getToolSkills(toolId: string): ToolSkill[] {
    const tool = this.tools.get(toolId);
    return tool?.skills || [];
  }
  
  /**
   * Find a skill by name (searches all tools)
   */
  public findSkill(skillName: string): ToolSkill | undefined {
    for (const tool of this.tools.values()) {
      const skill = tool.skills.find(s => s.name === skillName);
      if (skill) {
        return skill;
      }
    }
    return undefined;
  }
  
  /**
   * Find skills by partial name match
   */
  public searchSkills(query: string): ToolSkill[] {
    const lowerQuery = query.toLowerCase();
    const results: ToolSkill[] = [];
    
    for (const tool of this.tools.values()) {
      for (const skill of tool.skills) {
        if (
          skill.name.toLowerCase().includes(lowerQuery) ||
          skill.description.toLowerCase().includes(lowerQuery)
        ) {
          results.push(skill);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Execute a skill with parameters
   */
  public async executeSkill(
    skillName: string,
    params: Record<string, any>,
    context?: any
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    
    // Find the skill
    const skill = this.findSkill(skillName);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillName}`,
        metadata: {
          skillName,
          toolName: 'unknown',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Get the tool
    const tool = this.tools.get(skill.toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found for skill: ${skillName}`,
        metadata: {
          skillName,
          toolName: 'unknown',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Check if tool is active
    if (!tool.isActive) {
      return {
        success: false,
        error: `Tool is not active: ${tool.name}`,
        metadata: {
          skillName,
          toolName: tool.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Validate parameters
    const validationError = this.validateParameters(skill, params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        metadata: {
          skillName,
          toolName: tool.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Execute the skill
    try {
      console.log(`🔧 Executing skill: ${skillName}`, params);
      const result = await skill.execute(params, context);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Skill executed successfully: ${skillName} (${executionTime}ms)`);
      
      return {
        success: true,
        data: result,
        metadata: {
          skillName,
          toolName: tool.name,
          executionTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Skill execution failed: ${skillName}`, error);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          skillName,
          toolName: tool.name,
          executionTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Validate skill parameters
   */
  private validateParameters(skill: ToolSkill, params: Record<string, any>): string | null {
    for (const paramDef of skill.parameters) {
      // Check required parameters
      if (paramDef.required && !(paramDef.name in params)) {
        return `Missing required parameter: ${paramDef.name}`;
      }
      
      // Type checking (basic)
      if (paramDef.name in params) {
        const value = params[paramDef.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== paramDef.type && actualType !== 'undefined') {
          return `Invalid type for parameter ${paramDef.name}: expected ${paramDef.type}, got ${actualType}`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get tool statistics
   */
  public getStatistics() {
    const tools = this.getTools();
    const activeTools = this.getActiveTools();
    const totalSkills = this.getAllSkills().length;
    
    return {
      totalTools: tools.length,
      activeTools: activeTools.length,
      inactiveTools: tools.length - activeTools.length,
      totalSkills,
      toolBreakdown: tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        type: tool.type,
        skillCount: tool.skills.length,
        isActive: tool.isActive
      }))
    };
  }
  
  /**
   * Export tool definitions (for persistence)
   */
  public exportToolDefinitions(): Array<Omit<Tool, 'skills'> & { skills: Array<Omit<ToolSkill, 'execute'>> }> {
    return this.getTools().map(tool => ({
      ...tool,
      skills: tool.skills.map(({ execute, ...skillDef }) => skillDef)
    }));
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();


