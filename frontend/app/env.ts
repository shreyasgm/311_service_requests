// app/env.ts
import { z } from "zod"

const envSchema = z.object({
  // Use the prefixed names in the schema definition
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const env = envSchema.safeParse({
  // Access the prefixed variables from process.env
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

if (!env.success) {
  // The error message will now correctly show the *expected* prefixed names if they are missing
  throw new Error(
    `Missing or invalid environment variables: ${env.error.errors
      .map((e) => e.path.join("."))
      .join(", ")}`
  )
}

// Export the values. You can keep the export names the same if you prefer,
// or change them for consistency. Let's keep them the same for now
// to minimize changes in other files using these exports.
export const SUPABASE_URL = env.data.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = env.data.NEXT_PUBLIC_SUPABASE_ANON_KEY