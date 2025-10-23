export class CORSProxy {
  private static readonly PROXY_URLS = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-anywhere.herokuapp.com/',
  ];

  private static proxyIndex = 0;
  private static proxyHealthStatus = new Map<string, boolean>();
  private static lastUsedTimestamp = new Map<string, number>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 30;

  static getProxiedUrl(url: string): string {
    // For localhost/development, try direct access first
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.')) {
      return url;
    }

    // Try to get a healthy proxy that isn't rate limited
    const healthyProxy = this.getHealthyUnlimitedProxy();
    if (healthyProxy) {
      this.updateProxyUsage(healthyProxy);
      return `${healthyProxy}${encodeURIComponent(url)}`;
    }

    // If all proxies are limited/unhealthy, use round-robin
    const proxy = this.PROXY_URLS[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.PROXY_URLS.length;
    this.updateProxyUsage(proxy);
    return `${proxy}${encodeURIComponent(url)}`;
  }

  private static getHealthyUnlimitedProxy(): string | null {
    const now = Date.now();
    
    for (const proxy of this.PROXY_URLS) {
      // Skip unhealthy proxies
      if (this.proxyHealthStatus.get(proxy) === false) {
        continue;
      }

      // Check rate limits
      const usageTimestamps = this.getProxyUsageTimestamps(proxy);
      const recentRequests = usageTimestamps.filter(
        timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
      ).length;

      if (recentRequests < this.MAX_REQUESTS_PER_WINDOW) {
        return proxy;
      }
    }

    return null;
  }

  private static getProxyUsageTimestamps(proxy: string): number[] {
    const usage = this.lastUsedTimestamp.get(proxy);
    return usage ? [usage] : [];
  }

  private static updateProxyUsage(proxy: string): void {
    this.lastUsedTimestamp.set(proxy, Date.now());
  }

  static markProxyUnhealthy(proxy: string): void {
    this.proxyHealthStatus.set(proxy, false);
    
    // Reset health status after 5 minutes
    setTimeout(() => {
      this.proxyHealthStatus.delete(proxy);
    }, 5 * 60 * 1000);
  }

  static resetProxyHealth(): void {
    this.proxyHealthStatus.clear();
    this.lastUsedTimestamp.clear();
  }

  static async testProxies(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // Reset health status
      this.proxyHealthStatus.clear();

      for (const proxy of this.PROXY_URLS) {
        try {
          const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'text/html,application/json,text/plain',
              'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)',
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (response.ok) {
            this.proxyHealthStatus.set(proxy, true);
            return proxy;
          } else {
            this.proxyHealthStatus.set(proxy, false);
          }
        } catch {
          this.proxyHealthStatus.set(proxy, false);
          continue;
        }
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}