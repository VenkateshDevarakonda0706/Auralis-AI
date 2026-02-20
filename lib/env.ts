const REQUIRED_SERVER_ENV_KEYS = [
  "GOOGLE_AI_API_KEY",
  "MURF_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
] as const

type RequiredServerEnvKey = (typeof REQUIRED_SERVER_ENV_KEYS)[number]

export function getMissingServerEnvKeys(env: NodeJS.ProcessEnv = process.env): RequiredServerEnvKey[] {
  return REQUIRED_SERVER_ENV_KEYS.filter((key) => !env[key] || String(env[key]).trim().length === 0)
}

export function hasRequiredServerEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return getMissingServerEnvKeys(env).length === 0
}

export function maskSecret(value?: string): string {
  if (!value) {
    return "<missing>"
  }

  if (value.length <= 8) {
    return "*".repeat(value.length)
  }

  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`
}

export function getServerEnvStatus(env: NodeJS.ProcessEnv = process.env) {
  const missing = getMissingServerEnvKeys(env)

  return {
    isReady: missing.length === 0,
    missing,
    configured: REQUIRED_SERVER_ENV_KEYS.filter((key) => !missing.includes(key)),
  }
}

export { REQUIRED_SERVER_ENV_KEYS }
