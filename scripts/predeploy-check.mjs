#!/usr/bin/env node

const required = [
  "GOOGLE_AI_API_KEY",
  "MURF_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
]

const missing = required.filter((key) => !process.env[key] || process.env[key].trim().length === 0)

if (missing.length > 0) {
  console.error("❌ Missing required environment variables:")
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  process.exit(1)
}

console.log("✅ Environment predeploy check passed")
