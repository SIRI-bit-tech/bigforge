"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { AlertCircle, CheckCircle, Mail } from "lucide-react"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  
  const { verifyEmail, resendVerificationCode } = useStore()
  
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push("/register")
    }
  }, [email, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setError("")
    setLoading(true)

    try {
      await verifyEmail(email, code)
      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login?verified=true")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) return

    setError("")
    setResending(true)

    try {
      await resendVerificationCode(email)
      setError("")
      // Show success message briefly
      setError("New verification code sent to your email")
      setTimeout(() => setError(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Verify your email</h1>
            <p className="text-muted-foreground">
              We sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Email verified!</h2>
                <p className="text-muted-foreground mb-4">
                  Your email has been successfully verified. Redirecting to login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent-hover text-white" 
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </Button>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? "Sending..." : "Resend Code"}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="text-accent hover:underline"
                  >
                    use a different email
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}