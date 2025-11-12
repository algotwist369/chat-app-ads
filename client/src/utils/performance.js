/**
 * Performance utility functions
 * Debounce, throttle, and other performance helpers
 */

/**
 * Debounce function - delays execution until after wait time has passed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request Animation Frame throttle - for scroll/resize events
 * @param {Function} func - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(func) {
  let rafId = null;
  
  return function executedFunction(...args) {
    if (rafId) return;
    
    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
}

/**
 * Intersection Observer hook helper
 * Lazy load images and components
 */
export function createIntersectionObserver(callback, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is in viewport
 */
export function isInViewport(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Lazy load image
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 */
export function lazyLoadImage(img, src) {
  if (!img || !src) return;
  
  const imageObserver = createIntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        img.src = src;
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  });
  
  imageObserver.observe(img);
}

/**
 * Preload resource
 * @param {string} href - Resource URL
 * @param {string} as - Resource type (script, style, image, etc.)
 * @param {string} crossorigin - Crossorigin attribute
 */
export function preloadResource(href, as, crossorigin = null) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (crossorigin) link.crossOrigin = crossorigin;
  document.head.appendChild(link);
}

/**
 * Prefetch resource
 * @param {string} href - Resource URL
 */
export function prefetchResource(href) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Measure performance
 * @param {string} name - Performance mark name
 * @param {Function} fn - Function to measure
 * @returns {Promise} Promise that resolves with execution time
 */
export async function measurePerformance(name, fn) {
  if (typeof performance === 'undefined' || !performance.mark) {
    return fn();
  }
  
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;
  
  performance.mark(startMark);
  const result = await fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);
  
  const measure = performance.getEntriesByName(measureName)[0];
  console.log(`${name} took ${measure.duration.toFixed(2)}ms`);
  
  // Clean up
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);
  
  return result;
}

/**
 * Batch DOM updates using requestAnimationFrame
 * @param {Function} callback - Callback function
 */
export function batchUpdates(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

/**
 * Memoize function results
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Key generator function
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyGenerator = JSON.stringify) {
  const cache = new Map();
  
  return function memoizedFunction(...args) {
    const key = keyGenerator(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
}

