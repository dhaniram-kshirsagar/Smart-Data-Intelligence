"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import LoadingSpinner from "@/components/loading-spinner"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredPermission?: string
}

export default function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for logout flag in sessionStorage
    const isLoggingOut = sessionStorage.getItem("isLoggingOut") === "true"

    if (!isLoading && !user) {
      if (isLoggingOut) {
        // If logging out, redirect to home and clear the flag
        sessionStorage.removeItem("isLoggingOut")
        router.push("/")
      } else {
        // Normal case - redirect to login if not authenticated
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      }
    } else if (!isLoading && user) {
      // Admin has access to everything
      if (user.role === "admin") {
        return; // Admin has access to everything, no need to redirect
      }
      
      // Check role-based permissions
      if (requiredRole && 
          (requiredRole === "admin" && user.role !== "admin") ||
          (requiredRole === "researcher" && !["admin", "researcher"].includes(user.role))) {
        // Redirect to home if not authorized by role
        router.push("/")
      }
      
      // Check permission-based access
      if (requiredPermission && user.permissions) {
        // If the user doesn't have the required permission, redirect
        if (!user.permissions.includes(requiredPermission)) {
          router.push("/")
        }
      }
    }
  }, [user, isLoading, router, pathname, requiredRole, requiredPermission])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/[0.96] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If not authenticated, don't render children
  if (!user) {
    return null
  }

  // Admin can access everything
  if (user.role === "admin") {
    return <>{children}</>
  }

  // Check role-based access
  if (requiredRole) {
    if ((requiredRole === "admin" && user.role !== "admin") ||
        (requiredRole === "researcher" && !["admin", "researcher"].includes(user.role))) {
      return null
    }
  }

  // Check permission-based access
  if (requiredPermission && user.permissions) {
    if (!user.permissions.includes(requiredPermission)) {
      return null
    }
  }

  // Render children if authenticated and authorized
  return <>{children}</>
}
