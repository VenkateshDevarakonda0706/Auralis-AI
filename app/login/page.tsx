"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Bot, Sparkles, Chrome } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate login
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1500)
  }

  const handleDemoLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1000)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/auralis-ai-logo.png" alt="Auralis AI" width={40} height={30} className="w-10 h-7 object-contain" />
            <h1 className="text-3xl font-bold text-white">Auralis AI</h1>
          </div>
          <p className="text-gray-300">Sign in to your AI agent studio</p>
        </div>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-gray-300">
              Continue building intelligent AI agents with premium voice capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="pl-10 bg-black/20 border-white/20 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10 bg-black/20 border-white/20 text-white placeholder:text-gray-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span>Remember me</span>
                </label>
                <Link href="#" className="text-sm text-purple-400 hover:text-purple-300">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 py-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black/40 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                disabled={isLoading}
                className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent py-6 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-red-500/10 via-yellow-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                onClick={handleDemoLogin}
                variant="outline"
                disabled={isLoading}
                className="w-full border-white/20 text-gray-300 hover:bg-white/10 bg-transparent py-6"
              >
                <Bot className="w-4 h-4 mr-2" />
                Try Demo Account
              </Button>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Don't have an account?{" "}
                <Link href="#" className="text-purple-400 hover:text-purple-300 font-medium">
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Features Preview */}
            <div className="mt-8 p-4 bg-black/20 rounded-lg border border-white/10">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                What's included:
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Premium Murf AI voices
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Google Gemini integration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Auto-mode conversations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Custom agent creation
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
