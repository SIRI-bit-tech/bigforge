import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { checkDatabaseHealth, getConnectionStats } from '@/lib/db'
import { cache } from '@/lib/cache/redis'
import { getConnectionStats as getSocketStats } from '@/lib/socket/server'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database health
    const dbHealthy = await checkDatabaseHealth()
    const dbStats = await getConnectionStats()
    
    // Check Redis health
    const redisHealthy = await cache.ping()
    const redisStats = await cache.getStats()
    
    // Check Socket.IO health
    const socketStats = getSocketStats()
    
    // System metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    const responseTime = Date.now() - startTime
    
    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      uptime: `${Math.floor(uptime)}s`,
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          connections: dbStats
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          stats: redisStats
        },
        websocket: {
          status: 'healthy',
          connections: socketStats
        }
      },
      system: {
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        uptime: `${Math.floor(uptime)}s`,
        nodeVersion: process.version,
        platform: process.platform
      }
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    // Health check error
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 503 })
  }
}

// Liveness probe - simple check that the service is running
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}