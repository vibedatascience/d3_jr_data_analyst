/**
 * Data Store Service
 * Manages in-memory persistence of datasets between tool calls
 * Includes TTL-based cleanup to prevent memory leaks
 */

// Default TTL: 1 hour (in milliseconds)
const DEFAULT_TTL_MS = 60 * 60 * 1000;

// Maximum number of entries to keep
const MAX_ENTRIES = 100;

// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

class DataStore {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.store = new Map();
    this.ttlMs = ttlMs;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    console.log(`📦 DataStore initialized (TTL: ${ttlMs / 1000}s, max entries: ${MAX_ENTRIES})`);
  }

  /**
   * Save data to the store with timestamp
   * @param {string} dataId - Unique identifier for the data
   * @param {*} data - Data to store
   */
  set(dataId, data) {
    // If we're at max capacity, remove oldest entry
    if (this.store.size >= MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
      console.log(`📦 DataStore: Evicted oldest entry (${oldestKey}) to make room`);
    }

    this.store.set(dataId, {
      data,
      createdAt: Date.now(),
      accessedAt: Date.now()
    });

    console.log(`📦 DataStore: Saved ${dataId} (${this.store.size} entries total)`);
  }

  /**
   * Retrieve data from the store (updates access time)
   * @param {string} dataId - Unique identifier for the data
   * @returns {*} The stored data or undefined
   */
  get(dataId) {
    const entry = this.store.get(dataId);
    if (!entry) return undefined;

    // Update access time
    entry.accessedAt = Date.now();
    return entry.data;
  }

  /**
   * Check if data exists in the store
   * @param {string} dataId - Unique identifier for the data
   * @returns {boolean} True if data exists
   */
  has(dataId) {
    return this.store.has(dataId);
  }

  /**
   * Delete data from the store
   * @param {string} dataId - Unique identifier for the data
   * @returns {boolean} True if data was deleted
   */
  delete(dataId) {
    const result = this.store.delete(dataId);
    if (result) {
      console.log(`📦 DataStore: Deleted ${dataId} (${this.store.size} entries remaining)`);
    }
    return result;
  }

  /**
   * Clear all data from the store
   */
  clear() {
    const count = this.store.size;
    this.store.clear();
    console.log(`📦 DataStore: Cleared all ${count} entries`);
  }

  /**
   * Get the number of stored datasets
   * @returns {number} Number of datasets in store
   */
  size() {
    return this.store.size;
  }

  /**
   * Clean up expired entries
   * Removes entries that haven't been accessed within TTL
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [dataId, entry] of this.store.entries()) {
      const age = now - entry.accessedAt;
      if (age > this.ttlMs) {
        this.store.delete(dataId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`📦 DataStore: Cleaned up ${expiredCount} expired entries (${this.store.size} remaining)`);
    }
  }

  /**
   * Get stats about the store
   * @returns {object} Store statistics
   */
  getStats() {
    const entries = Array.from(this.store.entries());
    const now = Date.now();

    return {
      totalEntries: this.store.size,
      maxEntries: MAX_ENTRIES,
      ttlMs: this.ttlMs,
      entries: entries.map(([id, entry]) => ({
        id,
        ageSeconds: Math.round((now - entry.createdAt) / 1000),
        lastAccessSeconds: Math.round((now - entry.accessedAt) / 1000)
      }))
    };
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('📦 DataStore: Cleanup interval stopped');
    }
  }
}

// Export singleton instance
export const dataStore = new DataStore();
