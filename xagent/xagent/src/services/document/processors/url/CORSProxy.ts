export class CORSProxy {
  private static readonly PROXY_URLS = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];

  private static proxyIndex = 0;

  static getProxiedUrl(url: string): string {
    const encoded = encodeURIComponent(url);
    const proxy = this.PROXY_URLS[this.proxyIndex];
    
    // Rotate proxies to avoid rate limits
    this.proxyIndex = (this.proxyIndex + 1) % this.PROXY_URLS.length;
    
    return `${proxy}${encoded}`;
  }
}