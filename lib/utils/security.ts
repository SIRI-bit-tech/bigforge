import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Input validation schemas
export const securitySchemas = {
  // Email validation with additional security checks
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(254, 'Email too long')
    .refine(email => !email.includes('..'), 'Invalid email format')
    .refine(email => !/[<>]/.test(email), 'Invalid characters in email'),

  // Password validation with security requirements
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain special character'),

  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),

  // Company name validation
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name too long')
    .regex(/^[a-zA-Z0-9\s\-'\.&,]+$/, 'Company name contains invalid characters'),

  // Phone number validation
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number too short')
    .max(20, 'Phone number too long'),

  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .refine(url => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    }, 'Only HTTP/HTTPS URLs allowed'),

  // Text content validation
  textContent: z.string()
    .max(10000, 'Text content too long')
    .refine(text => !/<script/i.test(text), 'Script tags not allowed'),

  // File name validation
  fileName: z.string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid file name characters')
    .refine(name => !name.startsWith('.'), 'File name cannot start with dot')
    .refine(name => !/\.(exe|bat|cmd|scr|pif|com)$/i.test(name), 'Executable files not allowed'),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Decimal validation for monetary amounts
  decimal: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format')
    .refine(val => parseFloat(val) >= 0, 'Value must be positive')
    .refine(val => parseFloat(val) <= 999999999.99, 'Value too large'),

  // Search query validation
  searchQuery: z.string()
    .min(1, 'Search query required')
    .max(200, 'Search query too long')
    .refine(query => !/[<>]/.test(query), 'Invalid characters in search query'),
}

// HTML sanitization
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  })
}

// SQL injection prevention helpers
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
}

// XSS prevention
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'\/]/g, (s) => map[s])
}

// Path traversal prevention
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid path characters
    .replace(/^\/+/, '') // Remove leading slashes
    .trim()
}

// Rate limiting key sanitization
export function sanitizeRateLimitKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 100)
}

// IP address validation and sanitization
export function sanitizeIpAddress(ip: string): string | null {
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number)
    if (parts.every(part => part >= 0 && part <= 255)) {
      return ip
    }
  }
  
  if (ipv6Regex.test(ip)) {
    return ip
  }
  
  return null
}

// Content Security Policy nonce generation
export function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Secure headers helper
export function getSecurityHeaders(nonce?: string) {
  const headers: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }

  if (nonce) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss: ws:",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  }

  return headers
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (password.length >= 12) score += 1
  else feedback.push('Consider using 12+ characters for better security')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Include lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Include uppercase letters')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Include numbers')

  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('Include special characters')

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push('Avoid repeating characters')
  }

  if (/123|abc|qwe/i.test(password)) {
    score -= 1
    feedback.push('Avoid common sequences')
  }

  return { score: Math.max(0, score), feedback }
}

// File upload security validation
export function validateFileUpload(file: {
  name: string
  size: number
  type: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // File size limit (10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size exceeds 10MB limit')
  }
  
  // File name validation
  const nameValidation = securitySchemas.fileName.safeParse(file.name)
  if (!nameValidation.success) {
    errors.push('Invalid file name')
  }
  
  // MIME type validation
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed')
  }
  
  return { valid: errors.length === 0, errors }
}

// JWT token validation helper
export function validateJWTStructure(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  try {
    // Validate base64 encoding
    parts.forEach(part => {
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    })
    return true
  } catch {
    return false
  }
}

// Environment variable validation
export function validateEnvironmentVariables(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  return { valid: missing.length === 0, missing }
}

// Audit log helper
export function createAuditLog(action: string, userId: string, details: any) {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details: JSON.stringify(details),
    ip: 'unknown', // Should be filled by caller
    userAgent: 'unknown' // Should be filled by caller
  }
}