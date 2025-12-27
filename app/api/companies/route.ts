import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { db, companies, companyTrades, trades } from '@/lib/db'
import { eq, count } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function GET(request: NextRequest) {
  try {
    // Authentication check - mirror other protected endpoints
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Parse pagination query parameters with sane defaults and max caps
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20'))) // Max 100, default 20
    const offset = (page - 1) * pageSize

    // Get total count for pagination metadata
    const [totalResult] = await db
      .select({ count: count() })
      .from(companies)

    const total = totalResult.count
    const totalPages = Math.ceil(total / pageSize)

    // Get companies with their trades (with pagination)
    const companiesWithTrades = await db
      .select({
        id: companies.id,
        name: companies.name,
        type: companies.type,
        address: companies.address,
        city: companies.city,
        state: companies.state,
        zip: companies.zip,
        phone: companies.phone,
        website: companies.website,
        description: companies.description,
        logo: companies.logo,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        tradeName: trades.name,
      })
      .from(companies)
      .leftJoin(companyTrades, eq(companies.id, companyTrades.companyId))
      .leftJoin(trades, eq(companyTrades.tradeId, trades.id))
      .limit(pageSize)
      .offset(offset)

    // Group trades by company
    const companiesMap = new Map()
    
    companiesWithTrades.forEach(row => {
      if (!companiesMap.has(row.id)) {
        companiesMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          address: row.address,
          city: row.city,
          state: row.state,
          zip: row.zip,
          phone: row.phone,
          website: row.website,
          description: row.description,
          logo: row.logo,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          trades: [],
          certifications: [], // TODO: Add certifications if needed
        })
      }
      
      if (row.tradeName) {
        const company = companiesMap.get(row.id)
        if (!company.trades.includes(row.tradeName)) {
          company.trades.push(row.tradeName)
        }
      }
    })

    const result = Array.from(companiesMap.values())

    return NextResponse.json({
      success: true,
      companies: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    logError('companies endpoint error', error, {
      endpoint: '/api/companies',
      errorType: 'companies_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch companies'  },
      { status: 500 }
    )
  }
}