"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export function ActivityTracker() {
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    // Only track if user is logged in
    if (!user) return

    const logPageVisit = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
        const token = localStorage.getItem("token")

        if (!token) return

        await fetch(`${apiUrl}/admin/activity/log`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "Page visit",
            details: `Visited ${pathname}`,
            page_url: pathname,
            username: user.username, // Explicitly include username
          }),
        })
      } catch (error) {
        // Silent fail - don't interrupt user experience for logging
        console.error("Failed to log page visit:", error)
      }
    }

    // Add a small delay to avoid too many logs during rapid navigation
    const timeoutId = setTimeout(() => {
      logPageVisit()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [pathname, user])

  // This is a utility component that doesn't render anything
  return null
}

