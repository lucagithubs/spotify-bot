/**
 * Album Cache Module
 * 
 * Simple in-memory cache for album data
 * Reduces repeated Spotify API calls
 * 
 * Cache expires after 10 minutes (600000 ms)
 */

class AlbumCache {
  constructor(ttl = 10 * 60 * 1000) {
    this.cache = new Map(); // Store cache entries
    this.ttl = ttl; // Time to live in milliseconds (default 10 minutes)
  }

  /**
   * Generate cache key from input
   * @param {string} input - Album ID, URL, URI, or search query
   * @returns {string} Normalized cache key
   */
  generateKey(input) {
    // Normalize URLs and URIs to album IDs
    const urlMatch = input.match(/\/album\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];

    const uriMatch = input.match(/spotify:album:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];

    // Use as-is for IDs and search queries
    return input.toLowerCase();
  }

  /**
   * Check if entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Get cached album data
   * @param {string} key - Cache key (album ID, URL, or search query)
   * @returns {Object|null} Cached album data or null if not found/expired
   */
  get(key) {
    const normalizedKey = this.generateKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(normalizedKey);
      return null;
    }

    console.log(`💾 Cache HIT for key: ${normalizedKey}`);
    return entry.data;
  }

  /**
   * Store album data in cache
   * @param {string} key - Cache key (album ID, URL, or search query)
   * @param {Object} data - Album data to cache
   */
  set(key, data) {
    const normalizedKey = this.generateKey(key);
    
    this.cache.set(normalizedKey, {
      data,
      timestamp: Date.now(),
    });

    console.log(`💾 Cache SET for key: ${normalizedKey}`);
  }

  /**
   * Clear a specific cache entry
   * @param {string} key - Cache key to clear
   */
  delete(key) {
    const normalizedKey = this.generateKey(key);
    this.cache.delete(normalizedKey);
    console.log(`🗑️  Cache DELETE for key: ${normalizedKey}`);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️  Cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries (maintenance)
   * @returns {number} Number of entries removed
   */
  cleanup() {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cache cleanup: removed ${removed} expired entries`);
    }

    return removed;
  }
}

module.exports = AlbumCache;
