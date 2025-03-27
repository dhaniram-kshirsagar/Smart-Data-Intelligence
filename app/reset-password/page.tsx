"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { SparklesCore } from "@/components/sparkles"
import { motion } from "framer-motion"
import { Bot, Lock, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { useFallbackMode } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError("Missing reset token. Please request a new password reset link.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!token) {
      setError("Missing reset token")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // If in fallback mode, simulate success
      if (useFallbackMode) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setIsSubmitted(true)
        return
      }

      // Call the API to reset password
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://172.104.129.10:9090/api"
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Received non-JSON response:", text.substring(0, 200) + "...")
        throw new Error("Server returned non-JSON response. API might be unavailable.")
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to reset password")
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error("Password reset error:", err)
      setError(err instanceof Error ? err.message : "Failed to reset password")

      // If we get a network error, suggest fallback mode
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Cannot connect to the server. The system is in demo mode.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Redirect to login after successful password reset
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        router.push("/login")
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isSubmitted, router])

  return (
    <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md p-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
        >
          <div className="flex justify-center mb-6">
            <Bot className="w-12 h-12 text-purple-500" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-6">Set New Password</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-md mb-4">{error}</div>
          )}

          {useFallbackMode && !isSubmitted && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-2 rounded-md mb-4 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Using Demo Mode</p>
                <p className="text-sm">API server is unavailable. Password reset will be simulated.</p>
              </div>
            </div>
          )}

          {isSubmitted ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Password Reset Successful</h2>
              <p className="text-gray-400 mb-6">
                Your password has been reset successfully. You will be redirected to the login page.
              </p>
              <Link
                href="/login"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-6">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white btn-glow"
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </main>
  )
}

