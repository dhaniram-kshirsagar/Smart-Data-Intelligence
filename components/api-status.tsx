"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ApiStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState("")
  const [isRetrying, setIsRetrying] = useState(false)

  const checkApiStatus = async () => {
    try {
      setStatus("loading")
      setMessage("Checking API connection...")
      setIsRetrying(true)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      console.log("Checking API status at:", apiUrl)

      // Add a timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`${apiUrl}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setStatus("connected")
        setMessage("API is connected")
      } else {
        setStatus("error")
        setMessage(`API returned status: ${response.status}`)
      }
    } catch (error) {
      console.error("API connection error:", error)

      // Provide more specific error messages
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setStatus("error")
        setMessage("Cannot connect to API server. Make sure the server is running.")
      } else if (error.name === "AbortError") {
        setStatus("error")
        setMessage("API connection timed out. Server might be slow or unreachable.")
      } else {
        setStatus("error")
        setMessage(`Connection error: ${error.message}`)
      }
    } finally {
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    checkApiStatus()
  }, [])

  const handleRetry = () => {
    checkApiStatus()
  }

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2 text-yellow-500 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Checking API connection...</span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{message}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs py-1 h-7 border-red-500 text-red-500 hover:bg-red-500/10"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Connection
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-green-500 text-sm">
      <CheckCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}

