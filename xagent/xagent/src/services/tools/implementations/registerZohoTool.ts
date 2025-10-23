/**
 * Register Zoho Tool with the Tool Registry
 */

import { ToolRegistry } from '../ToolRegistry';
import { ZohoTool } from './ZohoTool';

export function registerZohoTool() {
  const toolRegistry = ToolRegistry.getInstance();
  const zohoTool = new ZohoTool();

  toolRegistry.registerTool(zohoTool);

  console.log('✅ Zoho Tool registered with skills:');
  zohoTool.skills.forEach(skill => {
    console.log(`   ├─ ${skill.name}: ${skill.description}`);
  });
}


