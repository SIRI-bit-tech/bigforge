import Redis, { Cluster } from "ioredis"

// Redis configuration for high concurrency
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: Number.parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 1000,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  // Connection pool settings for high concurrency
  family: 4,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'bidforge:',
}

// Create Redis client or cluster based on environment
let redis: Redis | Cluster

if (process.env.REDIS_CLUSTER_NODES) {
  // Redis Cluster for production scaling
  const clusterNodes = process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
    const [host, port] = node.split(':')
    return { host, port: parseInt(port) }
  })
  
  redis = new Cluster(clusterNodes, {
    redisOptions: redisConfig,
    enableOfflineQueue: false,
    slotsRefreshTimeout: 10000,
    slotsRefreshInterval: 5000,
  })
} else {
  // Single Redis instance
  redis = new Redis(redisConfig)
}

redis.on("error", (error) => {
  // Redis connection error
})

redis.on("connect", () => {
  // Redis connected successfully
})

redis.on("ready", () => {
  // Redis ready for operations
})

// Enhanced cache helper functions with error handling and monitoring
export const cache = {
  // Get cached value with fallback
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      // Cache get error for key ${key}
      return null
    }
  },

  // Set cached value with optional TTL (in seconds)
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await redis.setex(key, ttl, serialized)
      } else {
        await redis.set(key, serialized)
      }
      return true
    } catch (error) {
      // Cache set error for key ${key}
      return false
    }
  },

  // Get multiple keys at once (pipeline for performance)
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await redis.mget(...keys)
      return values.map(value => value ? JSON.parse(value) : null)
    } catch (error) {
      // Cache mget error for keys
      return keys.map(() => null)
    }
  },

  // Set multiple keys at once (pipeline for performance)
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      const pipeline = redis.pipeline()
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value)
        if (ttl) {
          pipeline.setex(key, ttl, serialized)
        } else {
          pipeline.set(key, serialized)
        }
      }
      
      await pipeline.exec()
      return true
    } catch (error) {
      // Cache mset error
      return false
    }
  },

  // Delete cached value
  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      // Cache delete error for key
      return false
    }
  },

  // Delete multiple keys matching pattern
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        const result = await redis.del(...keys)
        return result
      }
      return 0
    } catch (error) {
      // Cache delete pattern error
      return 0
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      // Cache exists error for key
      return false
    }
  },

  // Increment counter (useful for rate limiting)
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      if (ttl) {
        pipeline.expire(key, ttl)
      }
      const results = await pipeline.exec()
      return results?.[0]?.[1] as number || 0
    } catch (error) {
      // Cache incr error for key
      return 0
    }
  },

  // Set with NX (only if not exists) - useful for locks
  async setnx(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      let result
      if (ttl) {
        result = await redis.set(key, serialized, 'EX', ttl, 'NX')
      } else {
        result = await redis.set(key, serialized, 'NX')
      }
      return result === 'OK'
    } catch (error) {
      // Cache setnx error for key
      return false
    }
  },

  // List operations for queues
  async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      const serialized = values.map(v => JSON.stringify(v))
      return await redis.lpush(key, ...serialized)
    } catch (error) {
      // Cache lpush error for key
      return 0
    }
  },

  async rpop(key: string): Promise<any> {
    try {
      const value = await redis.rpop(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      // Cache rpop error for key
      return null
    }
  },

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await redis.info('memory')
      const keyspace = await redis.info('keyspace')
      return { memory: info, keyspace }
    } catch (error) {
      // Cache stats error
      return null
    }
  },

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await redis.ping()
      return result === 'PONG'
    } catch (error) {
      // Cache ping error
      return false
    }
  }
}

// Session store for high-performance session management
export const sessionStore = {
  async get(sessionId: string): Promise<any> {
    return cache.get(`session:${sessionId}`)
  },

  async set(sessionId: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    return cache.set(`session:${sessionId}`, sessionData, ttl)
  },

  async destroy(sessionId: string): Promise<boolean> {
    return cache.del(`session:${sessionId}`)
  },

  async touch(sessionId: string, ttl: number = 86400): Promise<boolean> {
    try {
      await redis.expire(`session:${sessionId}`, ttl)
      return true
    } catch (error) {
      // Session touch error
      return false
    }
  }
}

export default redis
