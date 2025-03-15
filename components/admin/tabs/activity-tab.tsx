"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Trash, Filter, User, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdminStore } from "@/lib/admin/store"
import { fetchAdminData, clearActivityLogs } from "@/lib/admin/api"
import { formatDate, getRelativeTime } from "@/lib/utils/date-formatter"

export function ActivityTab() {
  const { activity, setActivity, users, isProcessing, setIsProcessing, setNotification } = useAdminStore()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshInterval, setRefreshInterval] = useState(10) // Default refresh interval in seconds
  const [filterUsername, setFilterUsername] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [filterPage, setFilterPage] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([])
  const [uniqueActions, setUniqueActions] = useState<string[]>([])
  const [uniquePages, setUniquePages] = useState<string[]>([])

  // Set up polling for real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      handleRefresh(false)
      setLastRefresh(new Date())
    }, refreshInterval * 1000) // Convert seconds to milliseconds

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Extract unique values for filters
  useEffect(() => {
    if (activity && activity.length > 0) {
      // Get unique usernames
      const usernames = [...new Set(activity.map((item) => item.username))].filter(Boolean).sort()
      setUniqueUsers(usernames)

      // Get unique actions
      const actions = [...new Set(activity.map((item) => item.action))].filter(Boolean).sort()
      setUniqueActions(actions)

      // Get unique pages
      const pages = [...new Set(activity.map((item) => item.page_url).filter(Boolean))].sort()
      setUniquePages(pages)
    }
  }, [activity])

  // Add a useEffect to process the activity data when it changes
  useEffect(() => {
    if (activity && activity.length > 0) {
      // Process the activity data to ensure all items have valid usernames
      const processedActivity = activity.map((item) => {
        // If the username is missing or is "system" for a login event, try to extract it from details
        if ((!item.username || item.username === "system") && item.action === "Login" && item.details) {
          // Try to extract username from details like "User admin logged in successfully"
          const match = item.details.match(/User (\w+) logged in/)
          if (match && match[1]) {
            console.log(`Fixing username for login activity: ${match[1]}`)
            return {
              ...item,
              username: match[1],
            }
          }
        }
        return item
      })

      // Update the activity data if we made any changes
      if (JSON.stringify(processedActivity) !== JSON.stringify(activity)) {
        console.log("Updating activity data with processed usernames")
        setActivity(processedActivity)
      }
    }
  }, [activity, setActivity])

  const handleRefresh = async (showLoading = true) => {
    if (showLoading) {
      setIsProcessing(true)
    }

    try {
      const data = await fetchAdminData()

      // Ensure timestamps are properly formatted
      const formattedActivity = data.activity.map((item) => ({
        ...item,
        // Ensure timestamp is a valid date string
        formattedTime: formatDate(item.timestamp),
        relativeTime: getRelativeTime(item.timestamp),
      }))

      setActivity(formattedActivity)

      if (showLoading) {
        setNotification({
          type: "success",
          message: "Activity logs refreshed successfully",
        })

        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (error) {
      console.error("Error refreshing activity logs:", error)

      if (showLoading) {
        setNotification({
          type: "error",
          message: "Failed to refresh activity logs",
        })
      }
    } finally {
      if (showLoading) {
        setIsProcessing(false)
      }
    }
  }

  const handleClearLogs = async () => {
    if (confirm("Are you sure you want to clear old activity logs? This cannot be undone.")) {
      setIsProcessing(true)
      try {
        await clearActivityLogs(30)
        setNotification({
          type: "success",
          message: "Activity logs older than 30 days have been cleared",
        })
        // Refresh data to show updated logs
        const data = await fetchAdminData()
        setActivity(data.activity)
      } catch (error) {
        console.error("Error clearing logs:", error)
        setNotification({
          type: "error",
          message: "Failed to clear activity logs",
        })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  // Filter activity logs based on selected filters
  const filteredActivity = activity.filter((item) => {
    const matchesUsername = !filterUsername || filterUsername === "all" || item.username === filterUsername
    const matchesAction = !filterAction || filterAction === "all" || item.action === filterAction
    const matchesPage = !filterPage || filterPage === "all" || (item.page_url && item.page_url.includes(filterPage))
    return matchesUsername && matchesAction && matchesPage
  })

  // Reset all filters
  const resetFilters = () => {
    setFilterUsername("")
    setFilterAction("")
    setFilterPage("")
  }

  // Update the userActivitySummary function to properly handle login activities

  // Get user activity summary
  const userActivitySummary = () => {
    const summary = {}

    console.log("Activity data for summary:", activity)

    activity.forEach((item) => {
      // Skip items without a username or with "system" as username for login events
      if (!item.username) {
        console.log("Skipping item with no username:", item)
        return
      }

      // Use the actual username
      const username = item.username
      console.log(`Processing activity for user: ${username}, action: ${item.action}`)

      if (!summary[username]) {
        summary[username] = {
          totalActions: 0,
          pageVisits: 0,
          loginCount: 0,
          lastActive: null,
        }
      }

      summary[username].totalActions++

      // Count specific activity types
      if (item.action === "Page visit") {
        summary[username].pageVisits++
      } else if (item.action === "Login") {
        summary[username].loginCount++
      }

      // Update last active timestamp if newer
      const timestamp = new Date(item.timestamp)
      if (!summary[username].lastActive || timestamp > new Date(summary[username].lastActive)) {
        summary[username].lastActive = item.timestamp
      }
    })

    console.log("Generated activity summary:", summary)
    return summary
  }

  const summary = userActivitySummary()

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      return date.toLocaleString()
    } catch (error) {
      return "Invalid Date"
    }
  }

  // Remove these style objects
  // const summaryCardStyle = {
  //   backgroundColor: "#1e293b", // dark blue-gray
  //   color: "#ffffff", // white
  //   border: "1px solid #334155", // slightly lighter border
  //   borderRadius: "0.5rem",
  //   padding: "0.75rem",
  // }

  // const summaryTextStyle = {
  //   color: "#ffffff", // white
  //   fontWeight: 500,
  // }

  // const summaryDataStyle = {
  //   color: "#e2e8f0", // light gray
  //   marginTop: "0.25rem",
  // }

  // const summaryHeadingStyle = {
  //   color: "#ffffff", // white
  //   fontWeight: 600,
  //   fontSize: "1.125rem",
  //   marginBottom: "0.75rem",
  // }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Activity Log</h2>
        <div className="flex space-x-2">
          <div className="flex items-center mr-4">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
              Auto-refresh
            </label>
          </div>

          {/* Add refresh interval selector */}
          {autoRefresh && (
            <div className="flex items-center mr-4">
              <label htmlFor="refresh-interval" className="text-sm text-muted-foreground mr-2">
                Every
              </label>
              <select
                id="refresh-interval"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-background border border-input rounded px-2 py-1 text-sm"
              >
                <option value="5">5 sec</option>
                <option value="10">10 sec</option>
                <option value="30">30 sec</option>
                <option value="60">1 min</option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            className="border-violet-600 text-violet-600 hover:bg-violet-600/20"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <Button
            variant="outline"
            className="border-violet-600 text-violet-600 hover:bg-violet-600/20"
            onClick={() => handleRefresh()}
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/20"
            onClick={handleClearLogs}
            disabled={isProcessing}
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear Old Logs
          </Button>
        </div>
      </div>

      {autoRefresh && (
        <div className="text-xs text-muted-foreground text-right">
          Last refreshed: {formatDisplayDate(lastRefresh)} (auto-refreshes every {refreshInterval} seconds)
        </div>
      )}

      {/* User Activity Summary */}
      <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">User Activity Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summary).map(([username, data]) => (
            <div
              key={username}
              className="bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-border hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{username}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Actions:</span>
                  <span className="text-foreground">{data.totalActions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Page Visits:</span>
                  <span className="text-foreground">{data.pageVisits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Active:</span>
                  <span className="text-foreground">{formatDisplayDate(data.lastActive)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card p-4 rounded-lg border border-border mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Filter by User</label>
              <Select value={filterUsername} onValueChange={setFilterUsername}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((username) => (
                    <SelectItem key={username} value={username}>
                      {username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Filter by Action</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Filter by Page</label>
              <Select value={filterPage} onValueChange={setFilterPage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Pages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  {uniquePages.map((page) => (
                    <SelectItem key={page} value={page}>
                      {page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={resetFilters} className="mb-0">
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card p-4 rounded-lg border border-border">
        {filteredActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
        ) : (
          <div className="space-y-4">
            {filteredActivity.map((item, index) => (
              <div key={item.id || index} className="p-3 border-b border-border last:border-0">
                <div className="flex justify-between">
                  <div
                    className={`text-card-foreground font-medium ${item.action === "Login" ? "text-violet-500" : ""}`}
                  >
                    {item.action || "Unknown Action"}
                  </div>
                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <span>{formatDisplayDate(item.timestamp)}</span>
                    <span className="text-xs opacity-70">({getRelativeTime(item.timestamp)})</span>
                  </div>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center">
                  <User className={`h-4 w-4 mr-1 ${item.action === "Login" ? "text-violet-500" : ""}`} />
                  <span className="font-medium">{item.username || "Anonymous"}</span>
                </div>
                {item.details && <div className="text-muted-foreground text-sm mt-1">{item.details}</div>}
                {item.page_url && (
                  <div className="text-violet-500 text-sm mt-1 flex items-center">
                    <Globe className="h-3 w-3 mr-1" />
                    {item.page_url}
                  </div>
                )}
                {item.ip_address && <div className="text-muted-foreground text-xs mt-1">IP: {item.ip_address}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredActivity.length > 0 && (
        <div className="text-center text-muted-foreground text-sm">
          Showing {filteredActivity.length} of {activity.length} activities
        </div>
      )}
    </div>
  )
}

