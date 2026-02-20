import { describe, expect, it } from "vitest"
import { getMissingServerEnvKeys, hasRequiredServerEnv, maskSecret } from "./env"

describe("env utilities", () => {
  it("detects missing required keys", () => {
    const missing = getMissingServerEnvKeys({
      GOOGLE_AI_API_KEY: "abc",
      MURF_API_KEY: "def",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "ghi",
      NEXTAUTH_SECRET: undefined,
    } as unknown as NodeJS.ProcessEnv)

    expect(missing).toContain("GOOGLE_CLIENT_ID")
    expect(missing).toContain("NEXTAUTH_SECRET")
  })

  it("returns true when all required keys exist", () => {
    const ok = hasRequiredServerEnv({
      GOOGLE_AI_API_KEY: "abc",
      MURF_API_KEY: "def",
      GOOGLE_CLIENT_ID: "ghi",
      GOOGLE_CLIENT_SECRET: "jkl",
      NEXTAUTH_SECRET: "mno",
    } as unknown as NodeJS.ProcessEnv)

    expect(ok).toBe(true)
  })

  it("masks secrets safely", () => {
    expect(maskSecret("1234567890")).toBe("1234**7890")
    expect(maskSecret("")).toBe("<missing>")
  })
})
