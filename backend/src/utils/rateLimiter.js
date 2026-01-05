/**
 * Token bucket rate limiter for API requests
 */
class RateLimiter {
  constructor(requestsPerMinute) {
    this.tokens = requestsPerMinute;
    this.maxTokens = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = 60000 / requestsPerMinute; // ms per token
    this.queue = [];
  }

  /**
   * Acquire a token to make a request
   * Returns a promise that resolves when a token is available
   */
  async acquire() {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return Promise.resolve();
    }

    // Queue the request if no tokens available
    return new Promise((resolve) => {
      this.queue.push(resolve);
      setTimeout(() => this.processQueue(), this.refillRate);
    });
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Process queued requests
   */
  processQueue() {
    this.refill();

    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens--;
      const resolve = this.queue.shift();
      resolve();
    }

    // Schedule next processing if queue not empty
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.refillRate);
    }
  }

  /**
   * Get current rate limiter status
   */
  getStatus() {
    this.refill();
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length
    };
  }
}

// Pre-configured rate limiters for external APIs
export const curseForgeRateLimiter = new RateLimiter(60);   // 60 requests per minute
export const modrinthRateLimiter = new RateLimiter(300);   // 300 requests per minute

export default RateLimiter;
