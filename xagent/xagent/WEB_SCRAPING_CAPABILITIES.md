# 🕷️ Web Scraping & Crawling Capabilities

## ✅ **Built-in Web Scraping Features**

This AI agent solution already includes comprehensive web crawling and scraping functionality:

### 🕸️ **Web Crawler (`WebCrawler.ts`)**
- **Multi-page crawling** with configurable depth (up to 5 levels)
- **Intelligent content extraction** from HTML pages
- **CORS proxy support** for cross-origin requests
- **Rate limiting** (2-second delays between requests)
- **Retry mechanism** (up to 3 retries per URL)
- **Content validation** (minimum 50 characters per page)
- **Real-time progress tracking** with event emitters
- **Knowledge base integration** (stores crawled content)

### 🌐 **URL Processing (`URLProcessor.ts`)**
- **Multi-format support**: HTML, JSON, plain text
- **Content sanitization** and validation
- **Redirect handling** (up to 5 redirects)
- **Timeout protection** (10-second timeout)
- **Error handling** with detailed error messages
- **CORS proxy integration** for blocked domains

### 📄 **HTML Content Extraction (`HTMLExtractor.ts`)**
- **Smart content extraction** (removes navigation, ads, etc.)
- **Text cleaning** and normalization
- **Link extraction** for further crawling
- **Metadata extraction** (title, description, etc.)

### 🎯 **Browser Automation (`BrowserAutomationService.ts`)**
- **Playwright integration** for dynamic content
- **Form filling** and interaction
- **Screenshot capture**
- **JavaScript execution** support
- **Headless browser** operation

## 🤖 **AI Agents for Web Scraping**

### **Knowledge Agent**
- **URL processing** and content extraction
- **Knowledge base management** for scraped data
- **Content indexing** and search
- **Relationship mapping** between documents

### **Task Agent**
- **Workflow orchestration** for complex scraping tasks
- **Multi-step scraping** processes
- **Error handling** and retry logic
- **Result aggregation** and reporting

## 🚀 **How Users Access Web Scraping**

### 1. **Through Web Interface**
```
User → Web Browser → AI Agent → Web Scraping API
```

### 2. **Natural Language Commands**
- "Scrape all product prices from Amazon"
- "Crawl the documentation website and extract all API endpoints"
- "Extract contact information from company websites"
- "Monitor price changes on e-commerce sites"

### 3. **Visual Workflow Designer**
- Drag-and-drop workflow creation
- Configure crawling parameters
- Set up data extraction rules
- Schedule recurring scraping tasks

## 🎯 **Real-World Use Cases**

### **E-commerce Monitoring**
```javascript
// Example: Price monitoring workflow
{
  "name": "Amazon Price Monitor",
  "steps": [
    {
      "type": "browser",
      "action": "navigate",
      "url": "https://amazon.com/product/123"
    },
    {
      "type": "browser", 
      "action": "extract_text",
      "selector": ".price"
    },
    {
      "type": "knowledge",
      "action": "store",
      "data": "price_data"
    }
  ]
}
```

### **Lead Generation**
```javascript
// Example: Contact extraction workflow
{
  "name": "Company Contact Scraper",
  "steps": [
    {
      "type": "crawl",
      "url": "https://company.com",
      "maxPages": 20
    },
    {
      "type": "extract",
      "pattern": "email|phone|contact"
    },
    {
      "type": "validate",
      "format": "contact_info"
    }
  ]
}
```

### **Content Aggregation**
```javascript
// Example: News aggregation workflow
{
  "name": "Tech News Aggregator",
  "steps": [
    {
      "type": "crawl",
      "urls": [
        "https://techcrunch.com",
        "https://theverge.com",
        "https://arstechnica.com"
      ]
    },
    {
      "type": "filter",
      "keywords": ["AI", "machine learning", "automation"]
    },
    {
      "type": "summarize",
      "model": "gpt-4"
    }
  ]
}
```

## 🔧 **API Endpoints for Web Scraping**

### **Crawling Endpoints**
```http
POST /api/knowledge/crawl
{
  "url": "https://example.com",
  "maxPages": 50,
  "depth": 3,
  "filters": ["text", "links", "images"]
}
```

### **Browser Automation Endpoints**
```http
POST /api/automation/browser/execute
{
  "type": "navigate",
  "url": "https://dynamic-site.com"
}

POST /api/automation/browser/execute
{
  "type": "extract_text",
  "selector": ".product-price"
}
```

### **Content Processing Endpoints**
```http
POST /api/knowledge/process
{
  "content": "scraped_html_content",
  "type": "html",
  "extract": ["text", "links", "images"]
}
```

## 📊 **Built-in Features**

### **Content Processing**
- ✅ **HTML parsing** and cleaning
- ✅ **Text extraction** and normalization
- ✅ **Link discovery** and validation
- ✅ **Image URL extraction**
- ✅ **Metadata extraction** (title, description, keywords)

### **Data Management**
- ✅ **Knowledge base storage** (Neo4j)
- ✅ **Vector search** (Pinecone integration)
- ✅ **Content indexing** and retrieval
- ✅ **Relationship mapping** between sources

### **Automation Capabilities**
- ✅ **Scheduled crawling** and monitoring
- ✅ **Change detection** and alerts
- ✅ **Data validation** and cleaning
- ✅ **Export formats** (JSON, CSV, XML)

### **Error Handling**
- ✅ **Retry mechanisms** for failed requests
- ✅ **Rate limiting** to avoid blocking
- ✅ **CORS proxy** for cross-origin requests
- ✅ **Content validation** and filtering

## 🎮 **User Interface Features**

### **URL Input Component**
- Direct URL input for single-page scraping
- Advanced options (max pages, depth, filters)
- Real-time crawling progress
- Error handling and status updates

### **Crawler Configuration**
- Configurable crawling parameters
- Content filtering options
- Rate limiting settings
- Output format selection

### **Results Display**
- Crawled content preview
- Extracted data visualization
- Download options for results
- Integration with knowledge base

## 🚀 **Getting Started with Web Scraping**

### 1. **Deploy the Application**
```bash
cd ~/xagent-platform
docker-compose -f docker-compose-no-ollama.yml up -d --build
```

### 2. **Access Web Interface**
```
Open browser → http://your-server:8085
```

### 3. **Start Scraping**
- Navigate to Knowledge Base
- Click "Add URL" 
- Enter target website
- Configure crawling options
- Start crawling process

### 4. **Monitor Progress**
- Real-time crawling status
- Page-by-page progress
- Error notifications
- Results preview

## 🎯 **Advanced Scraping Features**

### **Dynamic Content Handling**
- JavaScript-rendered pages (via Playwright)
- Form interactions and submissions
- AJAX content loading
- Single Page Application (SPA) support

### **Data Extraction**
- Structured data extraction (JSON-LD, microdata)
- Table data parsing
- Image and media URL extraction
- Contact information detection

### **Monitoring & Alerts**
- Website change detection
- Price monitoring and alerts
- Content update notifications
- Error monitoring and reporting

This AI agent solution provides a complete web scraping and crawling platform with intelligent automation, making it perfect for data collection, monitoring, and content aggregation tasks! 🚀
