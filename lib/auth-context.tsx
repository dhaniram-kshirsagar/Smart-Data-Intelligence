"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  username: string
  role: string
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, role?: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Failed to parse stored user", e)
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Get API base URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const loginUrl = `${apiUrl}/auth/token`

      console.log("Attempting to login at:", loginUrl)

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Login failed")
      }

      const data = await response.json()

      // Store token and user info
      localStorage.setItem("token", data.access_token)
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: data.username,
          role: data.role,
          permissions: data.permissions || []
        }),
      )

      setUser({
        username: data.username,
        role: data.role,
        permissions: data.permissions || []
      })

      // Redirect to home page
      router.push("/")
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string, role = "user") => {
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const registerUrl = `${apiUrl}/auth/register`

      console.log("Attempting to register at:", registerUrl)

      const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Registration failed")
      }

      // Auto login after registration
      await login(username, password)
    } catch (err) {
      console.error("Registration error:", err)
      setError(err instanceof Error ? err.message : "Registration failed")
      setIsLoading(false)
    }
  }

  const forgotPassword = async (email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const forgotPasswordUrl = `${apiUrl}/auth/forgot-password`

      console.log("Requesting password reset at:", forgotPasswordUrl)

      const response = await fetch(forgotPasswordUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to process request")
      }
    } catch (err) {
      console.error("Forgot password error:", err)
      setError(err instanceof Error ? err.message : "Failed to process request")
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (token: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const resetPasswordUrl = `${apiUrl}/auth/reset-password`

      console.log("Resetting password at:", resetPasswordUrl)

      const response = await fetch(resetPasswordUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to reset password")
      }
    } catch (err) {
      console.error("Reset password error:", err)
      setError(err instanceof Error ? err.message : "Failed to reset password")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    // Set a flag in sessionStorage to indicate we're logging out
    sessionStorage.setItem("isLoggingOut", "true")

    // Clear auth data
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)

    // Navigate to home page
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
