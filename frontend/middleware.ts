import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./app/env"

// Validate environment variables at startup
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables")
}

export async function middleware(req: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session and trying to access dashboard (except login page)
  if (!session && req.nextUrl.pathname.startsWith("/dashboard") && !req.nextUrl.pathname.includes("/login")) {
    const redirectUrl = new URL("/dashboard/login", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If session exists and trying to access login page, redirect to dashboard
  if (session && req.nextUrl.pathname === "/dashboard/login") {
    const redirectUrl = new URL("/dashboard", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
