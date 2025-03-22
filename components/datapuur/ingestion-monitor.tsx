"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle, FileText, Database, FolderOpen } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function IngestionMonitor({ jobs, onJobUpdated, errors }) {
  const [activeTab, setActiveTab] = useState("active")
  const [isPolling, setIsPolling] = useState(true)

  // Filter jobs based on status
  const activeJobs = jobs.filter((job) => job.status === "running" || job.status === "queued")
  const completedJobs = jobs.filter((job) => job.status === "completed")
  const failedJobs = jobs.filter((job) => job.status === "failed")

  // Poll for job updates
  useEffect(() => {
    if (!isPolling) return

    const pollInterval = setInterval(async () => {
      // Only poll for active jobs
      const jobsToUpdate = jobs.filter((job) => job.status === "running" || job.status === "queued")

      if (jobsToUpdate.length === 0) {
        return
      }

      try {
        for (const job of jobsToUpdate) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/job-status/${job.id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })

          if (response.ok) {
            const updatedJob = await response.json()
            if (onJobUpdated) {
              onJobUpdated(updatedJob)
            }
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [jobs, isPolling, onJobUpdated])

  const getJobIcon = (type) => {
    switch (type) {
      case "file":
        return <FileText className="h-4 w-4" />
      case "database":
        return <Database className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "running":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        )
      case "queued":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{status}</Badge>
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return "N/A"
    try {
      return formatDistanceToNow(new Date(timeString), { addSuffix: true })
    } catch (error) {
      return timeString
    }
  }

  const cancelJob = async (jobId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/cancel-job/${jobId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const updatedJob = await response.json()
        if (onJobUpdated) {
          onJobUpdated(updatedJob)
        }
      }
    } catch (error) {
      console.error("Error canceling job:", error)
    }
  }

  // Add a function to group jobs by batch or source
  const groupJobs = (jobs) => {
    // Group jobs by their creation time (within a 30-second window)
    const groupedJobs = {}

    jobs.forEach((job) => {
      // Use the first part of the job name (before extension) as a potential group key
      const baseName = job.name.split(".")[0]

      // Find if there's an existing group with similar start time
      let assigned = false
      Object.keys(groupedJobs).forEach((groupKey) => {
        const group = groupedJobs[groupKey]
        // Check if this job was created within 30 seconds of the group's first job
        if (group.length > 0) {
          const firstJobTime = new Date(group[0].startTime).getTime()
          const currentJobTime = new Date(job.startTime).getTime()
          const timeDiff = Math.abs(currentJobTime - firstJobTime)

          // If within 30 seconds and has similar name, add to this group
          if (timeDiff < 30000 && (groupKey.includes(baseName) || baseName.includes(groupKey.split("-batch")[0]))) {
            group.push(job)
            assigned = true
          }
        }
      })

      // If not assigned to any group, create a new group
      if (!assigned) {
        const groupKey = `${baseName}-batch-${Date.now()}`
        groupedJobs[groupKey] = [job]
      }
    })

    return groupedJobs
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className={isPolling ? "border-primary text-primary" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isPolling ? "animate-spin" : ""}`} />
            {isPolling ? "Auto-refreshing" : "Auto-refresh paused"}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {activeJobs.length} active, {completedJobs.length} completed, {failedJobs.length} failed
        </div>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="active">Active Jobs {activeJobs.length > 0 && `(${activeJobs.length})`}</TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completedJobs.length > 0 && `(${completedJobs.length})`}
          </TabsTrigger>
          <TabsTrigger value="failed">Failed {failedJobs.length > 0 && `(${failedJobs.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active jobs</div>
          ) : (
            <>
              {/* Group jobs that were likely uploaded together */}
              {Object.entries(groupJobs(activeJobs)).map(([groupKey, groupedJobs]) => (
                <div key={groupKey} className="mb-6">
                  {groupedJobs.length > 1 && (
                    <div className="flex items-center mb-2 text-sm text-muted-foreground">
                      <FolderOpen className="h-4 w-4 mr-1" />
                      <span>Batch upload ({groupedJobs.length} files)</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {groupedJobs.map((job) => (
                      <div key={job.id} className="border border-border rounded-lg p-4 bg-card/50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="mr-2">{getJobIcon(job.type)}</div>
                            <div>
                              <h4 className="font-medium text-foreground">{job.name}</h4>
                              <p className="text-xs text-muted-foreground">{job.details}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(job.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelJob(job.id)}
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress: {job.progress}%</span>
                            <span>Started {formatTime(job.startTime)}</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No completed jobs</div>
          ) : (
            completedJobs.map((job) => (
              <div key={job.id} className="border border-border rounded-lg p-4 bg-card/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="mr-2">{getJobIcon(job.type)}</div>
                    <div>
                      <h4 className="font-medium text-foreground">{job.name}</h4>
                      <p className="text-xs text-muted-foreground">{job.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">{getStatusBadge(job.status)}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                  <span>Completed {formatTime(job.endTime)}</span>
                  <span>Duration: {job.duration || "N/A"}</span>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4 mt-4">
          {failedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No failed jobs</div>
          ) : (
            failedJobs.map((job) => (
              <div key={job.id} className="border border-border rounded-lg p-4 bg-card/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="mr-2">{getJobIcon(job.type)}</div>
                    <div>
                      <h4 className="font-medium text-foreground">{job.name}</h4>
                      <p className="text-xs text-muted-foreground">{job.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">{getStatusBadge(job.status)}</div>
                </div>
                <div className="mt-2 text-xs text-destructive">Error: {job.error || "Unknown error occurred"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Failed {formatTime(job.endTime)}</div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Error Log Section */}
      {errors.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="font-medium text-foreground mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
            Error Log
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {errors.map((error) => (
              <div key={error.id} className="bg-destructive/10 border border-destructive/20 rounded-md p-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-destructive font-medium">{error.message}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(error.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

