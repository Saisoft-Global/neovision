/**
 * Performance Optimization Utilities
 */

/**
 * Preload images for faster display
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Preload multiple images
 */
export const preloadImages = async (srcs: string[]): Promise<void> => {
  await Promise.all(srcs.map(preloadImage));
};

/**
 * Lazy load component when it comes into view
 */
export const lazyLoadComponent = (importFn: () => Promise<any>) => {
  return importFn();
};

/**
 * Measure performance of a function
 */
export const measurePerformance = async <T,>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Throttle function execution
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Request idle callback wrapper
 */
export const runWhenIdle = (callback: () => void, timeout: number = 2000) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, timeout);
  }
};

/**
 * Batch multiple state updates
 */
export const batchUpdates = (updates: (() => void)[]) => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

/**
 * Check if device has good performance
 */
export const hasGoodPerformance = (): boolean => {
  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  
  // Check for device memory (if available)
  const memory = (navigator as any).deviceMemory || 4;
  
  // Check for connection speed
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';
  
  return cores >= 4 && memory >= 4 && effectiveType !== 'slow-2g' && effectiveType !== '2g';
};

/**
 * Get optimal animation duration based on device performance
 */
export const getOptimalAnimationDuration = (): number => {
  return hasGoodPerformance() ? 300 : 150;
};

/**
 * Prefetch route data
 */
export const prefetchRoute = (route: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);
};
