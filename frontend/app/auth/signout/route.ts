import { createServerSupabaseClient } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
}