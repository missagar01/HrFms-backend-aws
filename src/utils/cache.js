const redisClient = require('../config/redis');

// Local memory fallback for when Redis is not available
// Limited to 500 items to prevent memory leaks
const localCache = new Map();
const MAX_LOCAL_ITEMS = 500;

/**
 * Cache utility to handle get/set with TTL and fallback
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @param {Function} fetchFn - Function to fetch data if not in cache
 * @returns {Promise<any>}
 */
async function getOrSetCache(key, ttl, fetchFn) {
    const now = Date.now();

    // 1. Try Local Memory First (Fastest)
    if (localCache.has(key)) {
        const { data, expiry } = localCache.get(key);
        if (now < expiry) return data;
        localCache.delete(key);
    }

    // 2. Try Redis Second
    try {
        if (redisClient?.isOpen) {
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);

                // Sync to local memory for faster subsequent access
                updateLocalCache(key, parsed, ttl);
                return parsed;
            }
        }
    } catch (err) {
        // Silent fallback
    }

    // 3. Fetch from Source (DB/API)
    const data = await fetchFn();

    // 4. Store in Cache (Memory and Redis)
    if (data !== null && data !== undefined) {
        // Store in Memory
        updateLocalCache(key, data, ttl);

        // Store in Redis
        try {
            if (redisClient?.isOpen) {
                await redisClient.setEx(key, ttl, JSON.stringify(data));
            }
        } catch (err) {
            // Silent fallback
        }
    }

    return data;
}

/**
 * Helper to update local cache with size limit
 */
function updateLocalCache(key, data, ttl) {
    if (localCache.size >= MAX_LOCAL_ITEMS) {
        // Remove oldest item (FIFO)
        const firstKey = localCache.keys().next().value;
        localCache.delete(firstKey);
    }

    localCache.set(key, {
        data,
        expiry: Date.now() + (ttl * 1000)
    });
}

/**
 * Invalidate cache keys matching a pattern (Using SCAN for efficiency)
 * @param {string} pattern - Pattern to match keys (e.g. "dashboard:*")
 */
async function invalidateCache(pattern) {
    // 1. Clear Local Memory
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const key of localCache.keys()) {
            if (regex.test(key)) localCache.delete(key);
        }
    } else {
        localCache.delete(pattern);
    }

    // 2. Clear Redis using SCAN (Non-blocking)
    if (!redisClient?.isOpen) return;

    try {
        let cursor = 0;
        do {
            const result = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });
            cursor = result.cursor;
            const keys = result.keys;

            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } while (cursor !== 0);
    } catch (err) {
        console.error(`❌ [Redis] Invalidation Error for pattern ${pattern}:`, err.message);
    }
}

module.exports = {
    getOrSetCache,
    invalidateCache
};
