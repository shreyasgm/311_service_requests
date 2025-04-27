import { createClient } from "@supabase/supabase-js"
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Get Supabase URL and key from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Error: Missing Supabase environment variables")
  process.exit(1)
}

// Create the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

async function createUser() {
  // Using a real email that can receive the verification link
  const { data, error } = await supabase.auth.signUp({
    email: "shreyas.gm61@gmail.com",
    password: "growth-lab-cuties",
    options: {
      emailRedirectTo: "http://localhost:3000/dashboard",
    },
  })

  if (error) {
    console.error("Error creating user:", error.message)
    return
  }

  console.log("User created successfully:", data)
}

createUser() 