import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { getConnectionStats } from '@/lib/db'
import { cache } from '@/lib/cache/redis'
import { getConnectionStats as getSocketStats } from '@/lib/socket/server'

// Metrics endpoint for monitoring systems (Prometheus format)
export async function GET(request: NextRequest) {
  try {
    const dbStats = await getConnectionStats()
    const socketStats = getSocketStats()
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Prometheus metrics format
    const metrics = [
      '# HELP bidforge_uptime_seconds Application uptime in seconds',
      '# TYPE bidforge_uptime_seconds counter',
      `bidforge_uptime_seconds ${uptime}`,
      '',
      '# HELP bidforge_memory_usage_bytes Memory usage in bytes',
      '# TYPE bidforge_memory_usage_bytes gauge',
      `bidforge_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
      `bidforge_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
      `bidforge_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
      `bidforge_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
      '',
      '# HELP bidforge_database_connections Database connection count',
      '# TYPE bidforge_database_connections gauge',
      `bidforge_database_connections{state="total"} ${dbStats?.total_connections || 0}`,
      `bidforge_database_connections{state="active"} ${dbStats?.active_connections || 0}`,
      `bidforge_database_connections{state="idle"} ${dbStats?.idle_connections || 0}`,
      '',
      '# HELP bidforge_websocket_connections WebSocket connection count',
      '# TYPE bidforge_websocket_connections gauge',
      `bidforge_websocket_connections{state="total"} ${socketStats.totalConnections}`,
      `bidforge_websocket_connections{state="authenticated"} ${socketStats.authenticatedConnections}`,
      '',
      '# HELP bidforge_websocket_messages_total Total WebSocket messages sent',
      '# TYPE bidforge_websocket_messages_total counter',
      `bidforge_websocket_messages_total ${socketStats.messagesSent}`,
      '',
      '# HELP bidforge_websocket_errors_total Total WebSocket errors',
      '# TYPE bidforge_websocket_errors_total counter',
      `bidforge_websocket_errors_total ${socketStats.errorsCount}`,
      ''
    ].join('\n')
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
  } catch (error) {
    logError('metrics endpoint error', error, {
      endpoint: '/api/metrics',
      errorType: 'metrics_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Metrics unavailable'  },
      { status: 500 }
    )
  }
}

// JSON format metrics for internal monitoring
export async function POST(request: NextRequest) {
  try {
    const dbStats = await getConnectionStats()
    const socketStats = getSocketStats()
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      database: {
        totalConnections: dbStats?.total_connections || 0,
        activeConnections: dbStats?.active_connections || 0,
        idleConnections: dbStats?.idle_connections || 0
      },
      websocket: {
        totalConnections: socketStats.totalConnections,
        authenticatedConnections: socketStats.authenticatedConnections,
        messagesSent: socketStats.messagesSent,
        errorsCount: socketStats.errorsCount
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }
    
    return NextResponse.json(metrics)
  } catch (error) {
    logError('metrics endpoint error', error, {
      endpoint: '/api/metrics',
      errorType: 'metrics_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Metrics unavailable'  },
      { status: 500 }
    )
  }
}