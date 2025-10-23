/**
 * Data Store Service
 * Manages in-memory persistence of datasets between tool calls
 */
class DataStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Save data to the store
   * @param {string} dataId - Unique identifier for the data
   * @param {*} data - Data to store
   */
  set(dataId, data) {
    this.store.set(dataId, data);
  }

  /**
   * Retrieve data from the store
   * @param {string} dataId - Unique identifier for the data
   * @returns {*} The stored data or undefined
   */
  get(dataId) {
    return this.store.get(dataId);
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
    return this.store.delete(dataId);
  }

  /**
   * Clear all data from the store
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get the number of stored datasets
   * @returns {number} Number of datasets in store
   */
  size() {
    return this.store.size;
  }
}

// Export singleton instance
export const dataStore = new DataStore();
