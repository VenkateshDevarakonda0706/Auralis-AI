"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useParams } from "next/navigation"
import Image from "next/image"
import { useApp } from "@/lib/context"

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  audioUrl?: string
  timestamp: Date
}

type HistoryMessage = {
  role: "user" | "model"
  parts: string[]
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function ChatPage() {
  const params = useParams()
  const { toast } = useToast()
  const { agents } = useApp()

  const audioRef = useRef<HTMLAudioElement>(null)
  const recognitionRef = useRef<any>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoResumeListeningRef = useRef(false)

  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatHistory, setChatHistory] = useState<HistoryMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState("")
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(true)

  const agentId = params.id as string
  const agent = agents.find((item) => item.id === agentId)

  const systemPrompt = useMemo(
    () =>
      agent?.prompt ||
      "You are a talkative, empathetic assistant bot. Your main job is to help people reduce stress by chatting with them, giving them calming advice, jokes, or friendly motivation. You talk in a relaxed, human tone, like a good friend who really listens. Keep your responses conversational and not too long (2-3 sentences max).",
    [agent?.prompt],
  )

  const firstMessage = useMemo(
    () =>
      agent?.firstMessage ||
      "Hey there 😊 I'm your little stress-buster buddy! What's on your mind today?",
    [agent?.firstMessage],
  )

  useEffect(() => {
    const initialHistory: HistoryMessage[] = [
      { role: "user", parts: [`System instruction: ${systemPrompt}`] },
      { role: "model", parts: [firstMessage] },
    ]

    setChatHistory(initialHistory)
    setMessages([
      {
        id: "first-message",
        text: firstMessage,
        isUser: false,
        timestamp: new Date(),
      },
    ])
  }, [systemPrompt, firstMessage])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const stopListening = () => {
    shouldAutoResumeListeningRef.current = false
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const startListening = () => {
    if (!recognitionRef.current || isListening || isGenerating || isGeneratingAudio || isPlaying) {
      return
    }

    try {
      shouldAutoResumeListeningRef.current = true
      recognitionRef.current.start()
    } catch {
      setIsListening(false)
    }
  }

  async function requestAIResponse(nextHistory: HistoryMessage[]) {
    const response = await fetch("/api/generate-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: nextHistory[nextHistory.length - 1]?.parts?.[0] || "",
        agentPrompt: systemPrompt,
        history: nextHistory,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "Failed to generate response")
    }

    return payload.text as string
  }

  async function requestSpeech(text: string) {
    const response = await fetch("/api/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: agent?.voiceId || "en-US-terrell",
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "Failed to convert text to speech")
    }

    return payload.audioUrl as string
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim()
    if (!text || isGenerating || isGeneratingAudio) {
      return
    }

    if (isListening) {
      stopListening()
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsGenerating(true)

    try {
      const nextHistory = [...chatHistory, { role: "user" as const, parts: [text] }]
      const aiText = await requestAIResponse(nextHistory)
      const finalHistory = [...nextHistory, { role: "model" as const, parts: [aiText] }]

      setChatHistory(finalHistory)

      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        text: aiText,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsGenerating(false)
      setIsGeneratingAudio(true)

      const audioUrl = await requestSpeech(aiText)
      setMessages((prev) => prev.map((msg) => (msg.id === aiMessage.id ? { ...msg, audioUrl } : msg)))
      setCurrentAudioUrl(audioUrl)
      setIsGeneratingAudio(false)

      setTimeout(() => {
        handlePlayAudio(audioUrl)
      }, 250)
    } catch (error) {
      setIsGenerating(false)
      setIsGeneratingAudio(false)

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response. Please try again.",
        variant: "destructive",
      })

      if (isAutoMode) {
        startListening()
      }
    }
  }

  function handlePlayAudio(audioUrl?: string) {
    if (!audioRef.current) {
      return
    }

    const url = audioUrl || currentAudioUrl
    if (!url) {
      return
    }

    if (isListening) {
      stopListening()
    }

    audioRef.current.src = url
    setCurrentAudioUrl(url)

    const playWhenReady = () => {
      audioRef.current?.play().catch(() => {
        setIsPlaying(false)
        if (isAutoMode) {
          startListening()
        }
      })
    }

    if (audioRef.current.readyState >= 2) {
      playWhenReady()
    } else {
      audioRef.current.addEventListener("canplay", playWhenReady, { once: true })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setIsSpeechSupported(false)
      return
    }

    const recognition = new Recognition()
    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) {
          finalTranscript += event.results[index][0].transcript
        }
      }

      if (finalTranscript.trim()) {
        void sendMessage(finalTranscript)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)

      if (
        shouldAutoResumeListeningRef.current &&
        isAutoMode &&
        !isPlaying &&
        !isGenerating &&
        !isGeneratingAudio
      ) {
        setTimeout(() => {
          startListening()
        }, 350)
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldAutoResumeListeningRef.current = false
      recognition.stop()
      recognitionRef.current = null
    }
  }, [isAutoMode, isGenerating, isGeneratingAudio, isPlaying])

  useEffect(() => {
    if (!isSpeechSupported) {
      return
    }

    if (isAutoMode && !isGenerating && !isGeneratingAudio && !isPlaying && !isListening) {
      startListening()
    }

    if (!isAutoMode && isListening) {
      stopListening()
    }
  }, [isAutoMode, isGenerating, isGeneratingAudio, isPlaying, isListening, isSpeechSupported])

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Agent not found</h1>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/auralis-ai-logo.png"
                alt="Elite AI"
                width={32}
                height={24}
                className="w-8 h-6 object-contain"
              />
              <span className="text-xl font-bold text-white">Auralis AI</span>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                <p className="text-gray-300">{agent.description}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">{agent.category}</div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-lg h-[600px] flex flex-col">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.isUser ? "justify-end" : "justify-start"}`}>
                {!message.isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    🤖
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : "bg-white/10 text-gray-100"
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                  {message.audioUrl && !message.isUser && (
                    <div className="mt-2">
                      <button
                        onClick={() => handlePlayAudio(message.audioUrl)}
                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                      >
                        🔊 Play
                      </button>
                    </div>
                  )}
                </div>
                {message.isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    👤
                  </div>
                )}
              </div>
            ))}
            {(isGenerating || isGeneratingAudio) && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <div className="bg-white/10 text-gray-100 rounded-lg p-3">
                  <p className="text-sm">{isGenerating ? "Thinking..." : "Preparing voice..."}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setIsAutoMode((prev) => !prev)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  isAutoMode ? "bg-green-500/30 text-green-100" : "bg-white/10 text-gray-300"
                }`}
              >
                {isAutoMode ? "Auto Mode: ON" : "Auto Mode: OFF"}
              </button>
              <button
                onClick={() => (isListening ? stopListening() : startListening())}
                disabled={!isSpeechSupported || isGenerating || isGeneratingAudio || isPlaying}
                className="px-3 py-1 rounded text-xs bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isListening ? "Stop Listening" : "Start Listening"}
              </button>
              <span className="text-xs text-gray-400 self-center">
                {isListening ? "Listening..." : isPlaying ? "Speaking..." : "Idle"}
              </span>
            </div>

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isSpeechSupported ? "Type or use voice..." : "Type your message..."}
                className="flex-1 bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 resize-none"
                rows={1}
              />
              <button
                onClick={() => void sendMessage(input)}
                disabled={isGenerating || isGeneratingAudio || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating || isGeneratingAudio ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          if (isAutoMode) {
            startListening()
          }
        }}
      />
    </div>
  )
}
