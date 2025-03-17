/**
 * Enhanced Caching Service
 * 
 * This module provides a sophisticated caching mechanism to optimize Firestore
 * operations, reduce read costs, and improve application performance.
 */

// Cache entry with expiry time and metadata
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // approximate size in bytes
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  defaultTtlSeconds: number;
  maxEntries?: number;        // Maximum cache entries before eviction
  maxSizeBytes?: number;      // Maximum cache size in bytes
  logCacheHits?: boolean;     // Whether to log cache hits for analytics
  preloadCollections?: string[]; // Collections to preload on startup
}

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  defaultTtlSeconds: 300, // 5 minutes default TTL
  maxEntries: 1000,       // Maximum 1000 entries
  maxSizeBytes: 10 * 1024 * 1024, // 10MB max cache size
  logCacheHits: false,
  preloadCollections: []
};

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
  hitRatio: number;
}

/**
 * Enhanced cache implementation with tiered storage, TTL management,
 * and intelligent eviction policies.
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  private currentSizeBytes: number = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0,
    hitRatio: 0
  };
  private static instance: CacheService;

  /**
   * Get the singleton cache instance
   */
  public static getInstance(config?: CacheConfig): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  /**
   * Initialize the cache service with the given configuration
   * This allows updating the configuration after the instance is created
   */
  public init(config: CacheConfig): void {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    console.log(`Cache service initialized with config: enabled=${this.config.enabled}, ttl=${this.config.defaultTtlSeconds}s`);
    
    // Optionally clear the cache on re-initialization
    if (config.enabled === false) {
      this.clear();
    }
  }

  /**
   * Private constructor (use getInstance instead)
   */
  private constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Calculate the approximate size of an object in bytes
   */
  private calculateApproximateSize(obj: any): number {
    // Basic size calculation based on JSON string length (this is approximate)
    const json = JSON.stringify(obj);
    // Calculate size - 2 bytes per character (Unicode)
    return json.length * 2;
  }

  /**
   * Get an item from cache
   * @param key Cache key
   * @returns Cached data or null if expired/not found
   */
  public get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.currentSizeBytes -= entry.size;
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    // Update cache entry metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    this.stats.hits++;
    
    if (this.config.logCacheHits) {
      console.log(`Cache hit for key: ${key}`);
    }

    return entry.data as T;
  }

  /**
   * Store an item in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds Optional custom TTL in seconds
   */
  public set<T>(key: string, data: T, ttlSeconds?: number): void {
    if (!this.config.enabled) return;

    // Check for undefined or null data
    if (data === undefined || data === null) {
      return;
    }

    const now = Date.now();
    const ttl = ttlSeconds || this.config.defaultTtlSeconds;
    const dataSize = this.calculateApproximateSize(data);

    // Check if we need to make room in the cache
    this.ensureCacheSpace(dataSize);

    // Store the entry with metadata
    const entry: CacheEntry<T> = {
      data,
      expiresAt: now + (ttl * 1000),
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      size: dataSize
    };

    // If the key already exists, remove its size from the total
    if (this.cache.has(key)) {
      this.currentSizeBytes -= this.cache.get(key)!.size;
    }

    this.cache.set(key, entry);
    this.currentSizeBytes += dataSize;
    
    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.size = this.currentSizeBytes;
  }

  /**
   * Remove an item from cache
   * @param key Cache key
   */
  public delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSizeBytes -= entry.size;
      this.cache.delete(key);
      
      // Update stats
      this.stats.entries = this.cache.size;
      this.stats.size = this.currentSizeBytes;
    }
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
    
    // Reset stats
    this.stats.entries = 0;
    this.stats.size = 0;
  }

  /**
   * Invalidate cache entries that match a pattern
   * @param pattern Pattern to match
   */
  public invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.currentSizeBytes -= entry.size;
        this.cache.delete(key);
      }
    }
    
    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.size = this.currentSizeBytes;
  }

  /**
   * Invalidate all entries for a specific collection
   * @param collectionPath Collection path
   */
  public invalidateCollection(collectionPath: string): void {
    this.invalidatePattern(`^${collectionPath}:`);
  }

  /**
   * Remove expired entries from the cache
   */
  public cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.currentSizeBytes -= entry.size;
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
    
    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.size = this.currentSizeBytes;
  }

  /**
   * Ensure there's enough space in the cache for a new entry
   * Uses a combination of expiry, LRU and LFU to determine what to evict
   */
  private ensureCacheSpace(newEntrySize: number): void {
    // First, clean expired entries
    this.cleanExpired();

    // If we still need to make room, evict entries based on policy
    if (this.config.maxEntries && this.cache.size >= this.config.maxEntries ||
       this.config.maxSizeBytes && (this.currentSizeBytes + newEntrySize) > this.config.maxSizeBytes) {
      
      // Convert the map to an array for sorting
      const entries = Array.from(this.cache.entries());
      
      // Sort by a combination of access frequency and recency
      // This is a hybrid of LRU (Least Recently Used) and LFU (Least Frequently Used)
      entries.sort((a, b) => {
        const aScore = (a[1].accessCount * 0.7) + (a[1].lastAccessed * 0.3);
        const bScore = (b[1].accessCount * 0.7) + (b[1].lastAccessed * 0.3);
        return aScore - bScore; // Lowest score (least valuable) first
      });

      // Remove entries until we have enough space
      while (
        (this.config.maxEntries && this.cache.size >= this.config.maxEntries) ||
        (this.config.maxSizeBytes && (this.currentSizeBytes + newEntrySize) > this.config.maxSizeBytes)
      ) {
        if (entries.length === 0) break;
        
        const [keyToEvict, entryToEvict] = entries.shift()!;
        this.cache.delete(keyToEvict);
        this.currentSizeBytes -= entryToEvict.size;
        this.stats.evictions++;
      }
    }
  }

  /**
   * Get current cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    return { ...this.stats };
  }

  /**
   * Preload common data into the cache
   * @param preloadFunction Function that returns data to preload
   */
  public async preloadData(preloadFunction: () => Promise<Record<string, any>>): Promise<void> {
    if (!this.config.enabled) return;
    
    try {
      const data = await preloadFunction();
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
      }
      console.log(`Preloaded ${Object.keys(data).length} items into cache`);
    } catch (error) {
      console.error('Failed to preload cache data:', error);
    }
  }
}

// Export a singleton instance
export const cacheService = CacheService.getInstance(); 