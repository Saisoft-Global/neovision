"""
Intelligent Browser Fallback Service (Backend)
Handles browser automation when no API tool is available
"""

from playwright.async_api import async_playwright, Page
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
import httpx
import base64
import sys
import platform

from services.openai_service import OpenAIService

logger = logging.getLogger(__name__)

# Note: Windows event loop policy is set in main.py before FastAPI starts
# This ensures Playwright subprocess can be created properly

class BrowserFallbackService:
    def __init__(self):
        self.openai = OpenAIService()
        self.browser = None
        self.context = None
        self.playwright_instance = None
        
    async def initialize_browser(self):
        """Initialize Playwright browser with Windows compatibility"""
        if self.browser:
            return
            
        try:
            logger.info("🚀 Initializing Playwright browser...")
            self.playwright_instance = await async_playwright().start()
            self.browser = await self.playwright_instance.chromium.launch(
                headless=False,  # Visible so user can watch!
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            )
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            logger.info("✅ Browser initialized for fallback automation")
        except Exception as e:
            logger.error(f"❌ Browser initialization failed: {e}")
            raise
    
    async def search_web(
        self,
        query: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search Google and extract organic results
        NO API KEY NEEDED - uses browser automation!
        """
        try:
            logger.info(f"🔍 Searching web for: {query}")
            
            await self.initialize_browser()
            page = await self.context.new_page()
            
            # Navigate to Google
            search_url = f"https://www.google.com/search?q={query}"
            await page.goto(search_url, wait_until='networkidle', timeout=15000)
            
            # Wait for results
            await page.wait_for_selector('div#search', timeout=10000)
            
            # Extract search results
            results = await page.evaluate('''() => {
                const searchResults = [];
                const resultElements = document.querySelectorAll('div.g');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('h3');
                    const linkElement = element.querySelector('a');
                    const snippetElement = element.querySelector('div[data-sncf="1"], div.VwiC3b');
                    
                    if (titleElement && linkElement) {
                        searchResults.push({
                            title: titleElement.textContent?.trim() || '',
                            url: linkElement.getAttribute('href') || '',
                            snippet: snippetElement?.textContent?.trim() || ''
                        });
                    }
                });
                
                return searchResults;
            }''')
            
            await page.close()
            
            # Score results using AI
            scored_results = await self.score_search_results(results, query)
            
            logger.info(f"✅ Found {len(scored_results)} search results")
            return scored_results[:max_results]
            
        except Exception as e:
            logger.error(f"❌ Web search failed: {e}")
            return []
    
    async def score_search_results(
        self,
        results: List[Dict[str, Any]],
        query: str
    ) -> List[Dict[str, Any]]:
        """Score and rank search results by relevance and trust"""
        try:
            # Use AI to score results
            prompt = f"""Analyze these search results and score each for:
1. Relevance to query (0-1)
2. Trust/authority (0-1) - prefer official sites, established companies

Query: "{query}"

Results:
{json.dumps(results, indent=2)}

Return JSON array with scores:
[{{"index": 0, "relevanceScore": 0.95, "trustScore": 0.90, "reasoning": "..."}}]"""

            response = await self.openai.create_chat_completion([
                {"role": "system", "content": "You are an expert at evaluating search results."},
                {"role": "user", "content": prompt}
            ])
            
            scores = json.loads(response['choices'][0]['message']['content'])
            
            # Combine results with scores
            for i, result in enumerate(results):
                score_data = next((s for s in scores if s['index'] == i), {
                    'relevanceScore': 0.5,
                    'trustScore': 0.5,
                    'reasoning': 'Default scoring'
                })
                result.update(score_data)
            
            # Sort by combined score
            results.sort(key=lambda r: r['relevanceScore'] * 0.6 + r['trustScore'] * 0.4, reverse=True)
            
            return results
            
        except Exception as e:
            logger.warning(f"⚠️ AI scoring failed, using basic scoring: {e}")
            # Basic scoring fallback
            for result in results:
                result['relevanceScore'] = 0.7
                result['trustScore'] = self.calculate_trust_score(result['url'])
                result['reasoning'] = 'Basic scoring'
            return results
    
    def calculate_trust_score(self, url: str) -> float:
        """Calculate basic trust score from URL"""
        score = 0.5
        
        if url.startswith('https://'):
            score += 0.1
            
        trusted_domains = [
            'google.com', 'booking.com', 'expedia.com', 'kayak.com',
            'skyscanner.com', 'hotels.com', 'airbnb.com'
        ]
        
        if any(domain in url for domain in trusted_domains):
            score += 0.3
            
        if '.com' in url:
            score += 0.1
            
        return min(score, 1.0)
    
    async def select_best_site(
        self,
        search_results: List[Dict[str, Any]],
        task: str
    ) -> Dict[str, Any]:
        """Use AI to select the best site for completing the task"""
        try:
            prompt = f"""Select the BEST website to complete this task:

Task: "{task}"

Search results:
{json.dumps(search_results, indent=2)}

Return JSON:
{{
    "bestSiteIndex": 0,
    "reasoning": "Detailed explanation",
    "estimatedSuccessRate": 0.85
}}"""

            response = await self.openai.create_chat_completion([
                {"role": "system", "content": "You are an expert at selecting websites for task automation."},
                {"role": "user", "content": prompt}
            ])
            
            analysis = json.loads(response['choices'][0]['message']['content'])
            best_site = search_results[analysis['bestSiteIndex']]
            
            return {
                'site': best_site,
                'reasoning': analysis['reasoning'],
                'successRate': analysis['estimatedSuccessRate']
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Site selection failed, using top result: {e}")
            return {
                'site': search_results[0] if search_results else None,
                'reasoning': 'Using top search result',
                'successRate': 0.6
            }
    
    async def execute_task_on_site(
        self,
        url: str,
        task: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute task on a website using AI-powered automation
        Returns execution result with screenshots
        """
        screenshots = []
        execution_steps = []
        
        try:
            logger.info(f"⚡ Executing task on {url}")
            
            await self.initialize_browser()
            page = await self.context.new_page()
            
            # Navigate
            execution_steps.append(f"Navigating to {url}")
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Take initial screenshot
            screenshot = await page.screenshot(full_page=False)
            screenshots.append(base64.b64encode(screenshot).decode())
            execution_steps.append("Initial page loaded")
            
            # Analyze page
            page_analysis = await self.analyze_page(page)
            execution_steps.append(f"Page analyzed: {page_analysis['page_type']}")
            
            # Create execution plan
            plan = await self.create_execution_plan(page, task, page_analysis, user_context)
            execution_steps.append(f"Plan created: {len(plan['steps'])} steps")
            
            # Execute each step
            for i, step in enumerate(plan['steps']):
                try:
                    execution_steps.append(f"Step {i+1}/{len(plan['steps'])}: {step['description']}")
                    await self.execute_step(page, step, user_context)
                    
                    # Screenshot after important steps
                    if step['action'] in ['fill', 'click', 'select']:
                        screenshot = await page.screenshot(full_page=False)
                        screenshots.append(base64.b64encode(screenshot).decode())
                    
                    await asyncio.sleep(0.5)  # Wait between steps
                    
                except Exception as step_error:
                    logger.error(f"Step {i+1} failed: {step_error}")
                    execution_steps.append(f"❌ Step {i+1} failed: {str(step_error)}")
                    # Try to continue with remaining steps
            
            # Extract final result
            result_data = await self.extract_result(page, task)
            execution_steps.append("Results extracted")
            
            await page.close()
            
            return {
                'success': True,
                'data': result_data,
                'screenshots': screenshots,
                'execution_steps': execution_steps,
                'steps_completed': len([s for s in execution_steps if '✅' in s or 'Step' in s])
            }
            
        except Exception as e:
            logger.error(f"❌ Task execution failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'screenshots': screenshots,
                'execution_steps': execution_steps
            }
    
    async def analyze_page(self, page: Page) -> Dict[str, Any]:
        """Analyze page structure and type"""
        try:
            analysis = await page.evaluate('''() => {
                const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                
                const hasLogin = inputs.some(i => i.type === 'password');
                const hasSearch = inputs.some(i => 
                    (i.placeholder || '').toLowerCase().includes('search') ||
                    (i.name || '').toLowerCase().includes('search')
                );
                const hasBooking = inputs.some(i => 
                    i.type === 'date' ||
                    (i.placeholder || '').toLowerCase().includes('destination')
                );
                
                return {
                    title: document.title,
                    url: window.location.href,
                    input_count: inputs.length,
                    button_count: buttons.length,
                    page_type: hasBooking ? 'booking' : hasLogin ? 'login' : hasSearch ? 'search' : 'unknown'
                };
            }''')
            
            return analysis
        except Exception as e:
            logger.error(f"Page analysis failed: {e}")
            return {'page_type': 'unknown', 'input_count': 0}
    
    async def create_execution_plan(
        self,
        page: Page,
        task: str,
        page_analysis: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create intelligent execution plan using AI"""
        try:
            prompt = f"""Create a step-by-step plan to complete this task on the website.

Task: "{task}"
Page: {json.dumps(page_analysis, indent=2)}
User context: {json.dumps(user_context, indent=2)}

Return JSON:
{{
    "steps": [
        {{
            "action": "fill|click|select|wait",
            "target": "selector or description",
            "value": "value to use",
            "description": "What this step does"
        }}
    ]
}}"""

            response = await self.openai.create_chat_completion([
                {"role": "system", "content": "You are a browser automation expert. Create precise execution plans."},
                {"role": "user", "content": prompt}
            ])
            
            plan = json.loads(response['choices'][0]['message']['content'])
            return plan
            
        except Exception as e:
            logger.error(f"Plan creation failed: {e}")
            return {'steps': []}
    
    async def execute_step(
        self,
        page: Page,
        step: Dict[str, Any],
        user_context: Dict[str, Any]
    ):
        """Execute a single automation step"""
        action = step['action']
        target = step.get('target', '')
        value = step.get('value')
        
        # Replace variables in value
        if value and isinstance(value, str):
            for key, val in user_context.items():
                value = value.replace(f"{{{{{key}}}}}", str(val))
        
        if action == 'fill':
            await page.fill(target, str(value))
        elif action == 'click':
            await page.click(target)
        elif action == 'select':
            await page.select_option(target, str(value))
        elif action == 'wait':
            if target:
                await page.wait_for_selector(target, timeout=10000)
            else:
                await asyncio.sleep(int(value) / 1000 if value else 1)
    
    async def extract_result(self, page: Page, task: str) -> Dict[str, Any]:
        """Extract results from page using AI"""
        try:
            content = await page.evaluate('() => document.body.textContent')
            content = content[:2000]  # Limit for AI processing
            
            prompt = f"""Extract relevant data from this page for the completed task.

Task: "{task}"
Page content: {content}

Return JSON with extracted data (confirmation numbers, prices, status, etc.)"""

            response = await self.openai.create_chat_completion([
                {"role": "system", "content": "Extract structured data from web pages."},
                {"role": "user", "content": prompt}
            ])
            
            return json.loads(response['choices'][0]['message']['content'])
            
        except Exception as e:
            logger.warning(f"Result extraction failed: {e}")
            return {'status': 'completed', 'message': 'Task completed'}
    
    async def execute_fallback(
        self,
        task: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main entry point - Execute task via browser automation fallback
        """
        execution_steps = []
        
        try:
            logger.info(f"🌐 ========================================")
            logger.info(f"🌐 BROWSER AUTOMATION FALLBACK ACTIVATED")
            logger.info(f"🌐 ========================================")
            logger.info(f"📝 Task: {task}")
            logger.info(f"👤 User Context: {user_context.get('userId', 'unknown')}")
            
            # 1. Build search query
            execution_steps.append("Building optimized search query")
            logger.info("🔍 Step 1: Building search query...")
            search_query = await self.build_search_query(task)
            logger.info(f"✅ Search query: {search_query}")
            execution_steps.append(f"Search query: {search_query}")
            
            # 2. Search web
            execution_steps.append("Searching Google for relevant websites")
            logger.info("🔍 Step 2: Performing web search...")
            search_results = await self.search_web(search_query, max_results=10)
            
            if not search_results:
                logger.error("❌ No search results found")
                return {
                    'success': False,
                    'error': 'No suitable websites found',
                    'execution_steps': execution_steps
                }
            
            logger.info(f"✅ Found {len(search_results)} websites")
            execution_steps.append(f"Found {len(search_results)} relevant websites")
            
            # 3. Select best site
            execution_steps.append("Analyzing websites to find the best option")
            logger.info("🤖 Step 3: Selecting best website using AI...")
            site_selection = await self.select_best_site(search_results, task)
            best_site = site_selection['site']
            logger.info(f"✅ Selected: {best_site['title']} ({best_site['url']})")
            logger.info(f"📊 Reasoning: {site_selection['reasoning']}")
            execution_steps.append(f"Selected: {best_site['title']}")
            execution_steps.append(f"Reason: {site_selection['reasoning']}")
            
            # 4. Execute task on site
            execution_steps.append(f"Opening {best_site['title']} in browser")
            logger.info("🚀 Step 4: Executing task on website...")
            execution = await self.execute_task_on_site(
                best_site['url'],
                task,
                user_context
            )
            
            # Merge execution steps
            execution_steps.extend(execution['execution_steps'])
            
            logger.info("✅ ========================================")
            logger.info(f"✅ AUTOMATION COMPLETED: {'SUCCESS' if execution['success'] else 'FAILED'}")
            logger.info("✅ ========================================")
            
            return {
                'success': execution['success'],
                'method': 'browser_automation',
                'site_used': best_site['url'],
                'site_name': best_site['title'],
                'reasoning': site_selection['reasoning'],
                'execution_steps': execution_steps,
                'screenshots': execution.get('screenshots', []),
                'data': execution.get('data', {}),
                'error': execution.get('error'),
                'learnings': [
                    f"Successfully used {best_site['title']} for {task.split()[0]} tasks",
                    f"Search query '{search_query}' found {len(search_results)} options"
                ]
            }
            
        except Exception as e:
            logger.error(f"❌ Fallback execution failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'method': 'browser_automation',
                'execution_steps': execution_steps
            }
    
    async def build_search_query(self, task: str) -> str:
        """Build optimized search query using AI"""
        try:
            response = await self.openai.create_chat_completion([
                {
                    "role": "system",
                    "content": "Create optimized Google search queries. Return ONLY the query."
                },
                {
                    "role": "user",
                    "content": f'Create search query for task: "{task}"\nExamples:\n- "Book flight" → "best flight booking sites"\n- "Find hotels" → "trusted hotel booking platforms"'
                }
            ])
            
            return response['choices'][0]['message']['content'].strip()
        except:
            return task
    
    async def cleanup(self):
        """Cleanup browser resources"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright_instance:
                await self.playwright_instance.stop()
            logger.info("✅ Browser cleanup complete")
        except Exception as e:
            logger.warning(f"⚠️ Browser cleanup error: {e}")
        finally:
            self.browser = None
            self.context = None
            self.playwright_instance = None

# Global instance
browser_fallback_service = BrowserFallbackService()


