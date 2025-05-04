"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/app/env"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Development bypass - only works in development environment
      if (process.env.NODE_ENV === 'development' && 
          email === 'dev@example.com' && 
          password === 'devpassword') {
        // Set a development session cookie
        document.cookie = `sb-dev-session=dev; path=/; max-age=86400`
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
        return
      }

      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      
      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Show error if login fails
        setError(`Login failed: ${error.message}`)
        throw error
      }

      if (!data.session) {
        // If no session is returned, show error
        setError("Login succeeded but no session was created. The email may not be verified.")
        return
      }

      // Show success message
      setSuccess(true)
      
      // Refresh the page to trigger middleware redirect
      router.refresh()
      
      // Redirect after a brief delay to show the success message
      setTimeout(() => {
        router.push("/dashboard")
      }, 500)
    } catch (error: any) {
      // Error already set above
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Staff Login</CardTitle>
        <CardDescription>Sign in to access the 311 service request dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Login successful! Redirecting to dashboard...</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleLogin}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-gray-500 mb-4">This area is restricted to authorized city staff only.</p>
        
        {/* Troubleshooting section */}
        {error && error.startsWith("Login successful") && (
          <div className="mt-4 p-4 border border-gray-200 rounded-md w-full">
            <h3 className="text-sm font-medium mb-2">Troubleshooting</h3>
            <p className="text-sm text-gray-600 mb-2">
              If the automatic redirect isn't working, you can try the manual link below:
            </p>
            <a 
              href="/dashboard" 
              className="text-sm text-blue-600 hover:underline"
            >
              Go to Dashboard Manually
            </a>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
