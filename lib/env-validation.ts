/**
 * Environment configuration validation
 * Validates all required environment variables at startup
 */

import { z } from "zod"

// Define the environment schema
const EnvSchema = z.object({
  // Required
  GOOGLE_AI_API_KEY: z.string().min(1, "GOOGLE_AI_API_KEY is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  MURF_API_KEY: z.string().min(1, "MURF_API_KEY is required"),

  // Optional
  NEXTAUTH_URL: z.string().url().optional(),
  GEMINI_MODEL: z.string().optional(),
  TELEMETRY_ENDPOINT: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
})

export type Env = z.infer<typeof EnvSchema>

let validatedEnv: Env | null = null
let validationError: Error | null = null

/**
 * Validate and cache environment variables
 * Throws if validation fails in production
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  if (validationError) {
    throw validationError
  }

  try {
    const result = EnvSchema.safeParse(process.env)

    if (!result.success) {
      const errors = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n")
      const error = new Error(`Environment validation failed:\n${errors}`)

      // Only cache error in development to allow fixes
      if (process.env.NODE_ENV !== "development") {
        validationError = error
      }

      throw error
    }

    validatedEnv = result.data
    return validatedEnv
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error
    }

    // In development, log but don't throw for some missing optional vars
    console.warn("Environment validation warning:", error)
    return {
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || "development-key",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "development-secret",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "development-id",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "development-secret",
      MURF_API_KEY: process.env.MURF_API_KEY || "development-key",
      NODE_ENV: process.env.NODE_ENV,
    }
  }
}

/**
 * Get a specific environment variable with validation
 */
export function getEnv(key: keyof Env): string | undefined {
  const env = validateEnv()
  return env[key]
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
