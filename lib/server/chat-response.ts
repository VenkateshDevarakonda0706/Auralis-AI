import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { validateAgentDomain } from "@/lib/server/domain-guard"

const agentConfigSchema = z.object({
  name: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  allowedTopics: z.array(z.string().min(1).max(120)).min(1),
  restrictedTopics: z.array(z.string().min(1).max(120)).optional(),
})

const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(z.string()).min(1),
})

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  agentPrompt: z.string().optional(),
  agentCategory: z.string().optional(),
  agentConfig: agentConfigSchema,
  history: z.array(chatMessageSchema).optional(),
})

function buildPrompt(message: string, agentPrompt?: string, agentCategory?: string, history?: Array<{ role: "user" | "model"; parts: string[] }>) {
  const sections: string[] = []

  sections.push(
    agentPrompt?.trim() ||
      "You are a friendly and talkative AI assistant. Respond conversationally and keep answers concise, helpful, and natural.",
  )

  if (agentCategory?.trim()) {
    sections.push(`Category: ${agentCategory.trim()}`)
  }

  if (history?.length) {
    const historyText = history
      .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.parts.join(" ")}`)
      .join("\n")
    sections.push(`Conversation so far:\n${historyText}`)
  }

  sections.push(`User: ${message}`)
  sections.push("Assistant:")

  return sections.join("\n\n")
}

export async function handleChatRequest(request: Request) {
  const jsonError = (status: number, error: string, message: string, details?: unknown) =>
    NextResponse.json(
      {
        success: false,
        error,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(400, "Invalid JSON", "Request body must be valid JSON")
    }

    const payload = chatRequestSchema.safeParse(body)
    if (!payload.success) {
      return jsonError(
        400,
        "Invalid request format",
        "Payload validation failed",
        payload.error.errors.map((item) => `${item.path.join(".")}: ${item.message}`),
      )
    }

    const { message, agentPrompt, agentCategory, agentConfig, history } = payload.data
    const domainValidation = validateAgentDomain(message, agentCategory, agentPrompt, agentConfig)

    if (domainValidation.enforced && !domainValidation.allowed) {
      return NextResponse.json({ success: true, text: domainValidation.rejectionText, model: "domain-guard" })
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return jsonError(500, "Missing Environment Variable", "Server is missing GOOGLE_AI_API_KEY")
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash"
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: modelName })
    const prompt = buildPrompt(message, agentPrompt, agentCategory, history)
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    if (!text) {
      return jsonError(502, "Upstream Model Error", "Model returned an empty response")
    }

    return NextResponse.json(
      { success: true, text, model: modelName },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("Chat API failed:", error)
    return jsonError(
      500,
      "Internal Server Error",
      "Failed to generate response",
      error instanceof Error ? error.message : "Unknown error",
    )
  }
}