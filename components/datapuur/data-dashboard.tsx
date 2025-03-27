"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Eye, BarChart2, Wand2, Compass, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { DatasetPreviewModal } from "@/components/datapuur/dataset-preview-modal"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

// Define types based on the API response structure from datapuur.py
interface DataSource {
  id: string
  name: string
  type: string
  last_updated: string
  status: string
}

interface DataMetrics {
  total_datasets: number
  total_records: number
  storage_used: string
  active_jobs: number
}

interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  details?: string
}

interface DashboardData {
  recent_datasets: DataSource[]
  data_growth: any[]
  usage_statistics: any
}

export function DataDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [datasets, setDatasets] = useState<DataSource[]>([])
  const [dataMetrics, setDataMetrics] = useState<DataMetrics | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<{ id: string; name: string } | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Helper function to make authenticated API requests
  const fetchWithAuth = useCallback(async (url: string) => {
    const token = localStorage.getItem("token")

    if (!token) {
      setAuthError("Authentication token not found. Please log in again.")
      throw new Error("Authentication token not found")
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.status === 401) {
      setAuthError("Your session has expired. Please log in again.")
      throw new Error("Authentication failed")
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }, [])

  // Function to fetch all data from the API
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setAuthError(null)

      // Fetch data sources
      const dataSources = await fetchWithAuth("/api/datapuur/sources")
      setDatasets(dataSources)

      // Fetch metrics
      try {
        const metrics = await fetchWithAuth("/api/datapuur/metrics")
        setDataMetrics(metrics)
      } catch (error) {
        console.error("Error fetching metrics:", error)
      }

      // Fetch activities
      try {
        const activitiesData = await fetchWithAuth("/api/datapuur/activities")
        setActivities(activitiesData)
      } catch (error) {
        console.error("Error fetching activities:", error)
      }

      // Fetch dashboard data
      try {
        const dashboardData = await fetchWithAuth("/api/datapuur/dashboard")
        setDashboardData(dashboardData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      if (!authError) {
        toast({
          title: "Error",
          description: "Failed to fetch datasets. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [fetchWithAuth, toast, authError])

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchData()
    }, 30000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [fetchData])

  // Handle authentication errors
  useEffect(() => {
    if (authError) {
      toast({
        title: "Authentication Error",
        description: authError,
        variant: "destructive",
      })

      // Redirect to login page after a short delay
      const timeoutId = setTimeout(() => {
        router.push("/login")
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [authError, toast, router])

  // Filter datasets based on search query
  const filteredDatasets = datasets.filter(
    (dataset) =>
      dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleNewDataset = () => {
    router.push("/datapuur/ingestion")
  }

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
      case "exported":
        return "text-green-600"
      case "profiled":
        return "text-blue-600"
      case "ingested":
      case "processing":
        return "text-amber-600"
      case "transform":
      case "transforming":
        return "text-purple-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handlePreview = async (datasetId: string, datasetName: string) => {
    try {
      setSelectedDataset({ id: datasetId, name: datasetName })

      // Fetch preview data from the API using the fetchWithAuth helper
      const previewData = await fetchWithAuth(`/api/datapuur/ingestion-preview/${datasetId}`)
      setPreviewData(previewData)
      setPreviewModalOpen(true)
    } catch (error) {
      console.error("Error fetching preview data:", error)
      if (!authError) {
        toast({
          title: "Error",
          description: "Failed to load preview data. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleProfile = (datasetId: string) => {
    router.push(`/datapuur/profile/${datasetId}`)
  }

  const handleTransform = (datasetId: string) => {
    router.push(`/datapuur/transformation/${datasetId}`)
  }

  const handleExplore = (datasetId: string) => {
    router.push(`/datapuur/explore/${datasetId}`)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "yyyy-MM-dd")
    } catch (error) {
      return dateString
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button onClick={handleNewDataset} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Dataset
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} title="Refresh data">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="relative w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Datasets..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datasets</CardTitle>
          <div className="text-sm text-muted-foreground">Auto-refreshes every 30 seconds</div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDatasets.length > 0 ? (
                  filteredDatasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">{dataset.name}</TableCell>
                      <TableCell>{dataset.type}</TableCell>
                      <TableCell>{formatDate(dataset.last_updated)}</TableCell>
                      <TableCell className={getStatusClass(dataset.status)}>{dataset.status}</TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(dataset.id, dataset.name)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleProfile(dataset.id)}
                            title="Profile"
                            disabled={dataset.status.toLowerCase() !== "active"}
                          >
                            <BarChart2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTransform(dataset.id)}
                            title="Transform"
                            disabled={dataset.status.toLowerCase() !== "active"}
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExplore(dataset.id)}
                            title="Explore"
                            disabled={dataset.status.toLowerCase() !== "active"}
                          >
                            <Compass className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchQuery
                        ? "No matching datasets found."
                        : "No datasets available. Create one by clicking 'New Dataset'."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {selectedDataset && (
        <DatasetPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          datasetId={selectedDataset.id}
          datasetName={selectedDataset.name}
          previewData={previewData}
        />
      )}
    </div>
  )
}

