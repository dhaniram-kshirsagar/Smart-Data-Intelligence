"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// This is a utility component to ensure proper logout behavior
export function useAdminLogout() {
  const { logout: authLogout } = useAuth()
  const router = useRouter()

  const logout = () => {
    // Clear auth data
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    // Force navigation to home page
    router.push("/")

    // Then call the original logout (which might also try to navigate)
    setTimeout(() => {
      authLogout()
    }, 100)
  }

  return logout
}

