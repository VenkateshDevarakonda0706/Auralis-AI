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
  try {
    const payload = chatRequestSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid request format", details: payload.error.errors.map((item) => `${item.path.join(".")}: ${item.message}`) },
        { status: 400 },
      )
    }

    const { message, agentPrompt, agentCategory, agentConfig, history } = payload.data
    const domainValidation = validateAgentDomain(message, agentCategory, agentPrompt, agentConfig)

    if (domainValidation.enforced && !domainValidation.allowed) {
      return NextResponse.json({ text: domainValidation.rejectionText, model: "domain-guard" })
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Server is missing GOOGLE_AI_API_KEY" }, { status: 500 })
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash"
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: modelName })
    const prompt = buildPrompt(message, agentPrompt, agentCategory, history)
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    if (!text) {
      return NextResponse.json({ error: "Model returned an empty response" }, { status: 500 })
    }

    return NextResponse.json({ text, model: modelName })
  } catch (error) {
    console.error("Chat API failed:", error)
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}