import React, { useState } from 'react';
import { Link, Loader, AlertCircle, Settings } from 'lucide-react';
import { URLProcessor } from '../../../services/knowledge/url/URLProcessor';
import { WebCrawler } from '../../../services/knowledge/url/WebCrawler';
import { useKnowledgeStore } from '../../../store/knowledgeStore';

interface URLInputProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const URLInput: React.FC<URLInputProps> = ({ onSuccess, onError }) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState(10);
  const [crawlProgress, setCrawlProgress] = useState<{
    current: number;
    total: number;
    processedUrls: string[];
  } | null>(null);
  const { addDocument } = useKnowledgeStore();
  const crawler = new WebCrawler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setCrawlProgress(null);

    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Set up crawler event listeners
      crawler.onProcessingPage(({ current, total, url }) => {
        setCrawlProgress(prev => ({
          current,
          total,
          processedUrls: prev?.processedUrls || [],
        }));
      });

      crawler.onPageProcessed(({ url }) => {
        setCrawlProgress(prev => prev ? {
          ...prev,
          processedUrls: [...prev.processedUrls, url],
        } : null);
      });

      crawler.onPageError(({ url, error }) => {
        console.warn(`Failed to process ${url}:`, error);
      });

      // Start crawling
      const pages = await crawler.crawl(url, maxPages);
      
      // Process each crawled page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setCrawlProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          total: pages.length,
        } : null);

        const document = {
          id: crypto.randomUUID(),
          title: new URL(page.url).pathname || new URL(page.url).hostname,
          content: page.content,
          doc_type: 'url',
          metadata: {
            uploadedAt: new Date().toISOString(),
            size: page.content.length,
            mimeType: 'text/plain',
            sourceUrl: page.url,
            crawlIndex: i + 1,
            totalPages: pages.length,
          },
          status: 'pending'
        };

        await addDocument(document);
      }
      
      setUrl('');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process URL';
      setError(message);
      onError(message);
    } finally {
      setIsProcessing(false);
      setCrawlProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Link className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter webpage URL to add to knowledge base..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Crawler Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={isProcessing || !url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[120px] justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <span>Add URL</span>
            )}
          </button>
        </div>

        {showAdvanced && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Pages to Crawl
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Limit the number of pages to crawl (1-100)
              </p>
            </div>
          </div>
        )}
      </form>

      {crawlProgress && (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span>Crawling website...</span>
            <span>{crawlProgress.current} / {crawlProgress.total} pages</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(crawlProgress.current / crawlProgress.total) * 100}%` }}
            />
          </div>
          {crawlProgress.processedUrls.length > 0 && (
            <div className="mt-2 text-sm">
              <div className="font-medium mb-1">Recently processed pages:</div>
              <ul className="space-y-1">
                {crawlProgress.processedUrls.slice(-3).map((url, index) => (
                  <li key={index} className="truncate">
                    {url}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};