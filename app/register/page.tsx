"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { validatePasswordStrength } from "@/lib/services/client-auth"
import { Navbar } from "@/components/navbar"
import type { UserRole } from "@/lib/types"
import { AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const register = useStore((state) => state.register)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "CONTRACTOR" as UserRole,
  })
  const [error, setError] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    
    // Validate password strength
    const validation = validatePasswordStrength(password)
    setPasswordErrors(validation.errors)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(formData.password)
    if (!passwordValidation.isValid) {
      setError("Please fix the password requirements below")
      return
    }

    setLoading(true)

    try {
      const result = await register(formData.email, formData.password, formData.name, formData.role)
      
      if (result.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
      } else {
        router.push("/onboarding")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create your account</h1>
            <p className="text-muted-foreground">Join BidForge and start managing construction bids</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                />
                {passwordErrors.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Password must contain:</p>
                    <ul className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-destructive">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <div className="flex items-center space-x-2 rounded-lg border border-border p-4">
                    <RadioGroupItem value="CONTRACTOR" id="contractor" />
                    <Label htmlFor="contractor" className="flex-1 cursor-pointer">
                      <div className="font-medium">General Contractor</div>
                      <div className="text-sm text-muted-foreground">I create projects and invite subcontractors</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border border-border p-4">
                    <RadioGroupItem value="SUBCONTRACTOR" id="subcontractor" />
                    <Label htmlFor="subcontractor" className="flex-1 cursor-pointer">
                      <div className="font-medium">Subcontractor</div>
                      <div className="text-sm text-muted-foreground">I bid on construction projects</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-accent hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
