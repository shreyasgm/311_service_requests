import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./app/env"

// Validate environment variables at startup
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables")
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Check for development session cookie first
    if (process.env.NODE_ENV === 'development') {
      const devSession = req.cookies.get('sb-dev-session')
      if (devSession) {
        // If we have a dev session cookie, allow access
        return res
      }
    }

    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = req.cookies.get(name)
            return cookie?.value
          },
          set(name, value, options) {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            res.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            })
          },
        },
      }
    )

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession()

    // Log session state for debugging (this will appear in server logs)
    console.log("Middleware: URL =", req.nextUrl.pathname)
    console.log("Middleware: Session exists =", !!session)
    
    // If on dashboard login page, check for URL parameters that might indicate auth callback
    if (req.nextUrl.pathname === "/dashboard/login") {
      const params = req.nextUrl.searchParams
      if (params.has("error") || params.has("error_description")) {
        console.log("Auth callback error:", params.get("error"), params.get("error_description"))
      }
    }

    // If no session and trying to access dashboard (except login page)
    if (!session && req.nextUrl.pathname.startsWith("/dashboard") && !req.nextUrl.pathname.includes("/login")) {
      console.log("Redirecting to login (no session)")
      const redirectUrl = new URL("/dashboard/login", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists and trying to access login page, redirect to dashboard
    if (session && req.nextUrl.pathname === "/dashboard/login") {
      console.log("Redirecting to dashboard (session exists)")
      const redirectUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    return res
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
