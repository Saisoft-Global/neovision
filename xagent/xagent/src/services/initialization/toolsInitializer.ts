/**
 * Tools Initialization Service
 * 
 * This service initializes all tools at application startup
 * Should be called once when the app loads
 */

import { toolRegistry } from '../tools/ToolRegistry';
import { EmailTool } from '../tools/implementations/EmailTool';
import { CRMTool } from '../tools/implementations/CRMTool';
import { ZohoTool } from '../tools/implementations/ZohoTool';
import { DynamicToolLoaderService } from '../tools/DynamicToolLoader';
import { getSupabaseClient } from '../../config/supabase';

let isInitialized = false;

/**
 * Load dynamic tools from database (bank APIs, custom integrations)
 */
async function loadDynamicTools(): Promise<void> {
  try {
    console.log('📦 Loading dynamic tools from database...');
    
    const supabase = getSupabaseClient();
    const toolLoader = DynamicToolLoaderService.getInstance();
    
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.warn('⚠️ Failed to load dynamic tools (table may not exist):', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📭 No dynamic tools registered yet');
      return;
    }
    
    console.log(`📦 Loading ${data.length} dynamic tools...`);
    
    for (const toolRecord of data) {
      try {
        // Use 'config' column (not 'configuration')
        const config = typeof toolRecord.config === 'string' 
          ? JSON.parse(toolRecord.config)
          : toolRecord.config; // Already parsed by Supabase
        
        // Ensure id and name are set from database row if not in config
        if (!config.id) config.id = toolRecord.id;
        if (!config.name) config.name = toolRecord.name;
        
        const tool = await toolLoader.loadToolFromJSON(config);
        toolRegistry.registerTool(tool);
        console.log(`   ✅ Loaded: ${tool.name} (${tool.skills.length} skills)`);
      } catch (error) {
        console.warn(`   ⚠️ Skipped ${toolRecord.name}: ${error.message}`);
        // Continue loading other tools instead of failing completely
      }
    }
    
    console.log(`✅ Dynamic tools loaded successfully`);
    
  } catch (error) {
    console.warn('⚠️ Dynamic tool loading failed (non-blocking):', error);
  }
}

/**
 * Initialize all tools
 * Safe to call multiple times (will only initialize once)
 */
export async function initializeTools(): Promise<void> {
  if (isInitialized) {
    console.log('⏭️  Tools already initialized, skipping...');
    return;
  }

  try {
    console.log('🔧 Initializing Tools & Skills Framework...');
    
    // Register Email Tool
    toolRegistry.registerTool(EmailTool);
    
    // Register CRM Tool  
    toolRegistry.registerTool(CRMTool);
    
    // Register Zoho Tool (Invoice, Books, CRM integration)
    toolRegistry.registerTool(ZohoTool);
    
    // Load dynamic tools from database (bank APIs, custom integrations)
    await loadDynamicTools();
    
    // Get statistics
    const stats = toolRegistry.getStatistics();
    console.log('✅ Tools initialized successfully:', stats);
    
    isInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize tools:', error);
    throw error;
  }
}

/**
 * Check if tools have been initialized
 */
export function areToolsInitialized(): boolean {
  return isInitialized;
}

/**
 * Force re-initialization (useful for testing)
 */
export function reinitializeTools(): void {
  isInitialized = false;
  initializeTools();
}

