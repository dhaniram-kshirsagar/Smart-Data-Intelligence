// API base URL - change this to your FastAPI server URL in production
const getApiBaseUrl = () => {
  // Use the environment variable if available
  if (process.env.NEXT_PUBLIC_API_URL) {
    // If we're running in the browser and the URL is relative (starts with /)
    // then use the current origin
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL.startsWith("/")) {
      return `${window.location.origin}${process.env.NEXT_PUBLIC_API_URL}`
    }
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Default fallback
  return "http://172.104.129.10:9090/api"
}

const API_BASE_URL = getApiBaseUrl()

// Mock data for fallback when API is unavailable
const MOCK_DATA = {
  kgraphDashboard: {
    graph: {
      nodes: [
        { id: 1, label: "Person A", type: "Person", color: "#8B5CF6", x: 150, y: 100 },
        { id: 2, label: "Person B", type: "Person", color: "#8B5CF6", x: 250, y: 150 },
        { id: 3, label: "Organization X", type: "Organization", color: "#EC4899", x: 100, y: 200 },
        { id: 4, label: "Location Y", type: "Location", color: "#3B82F6", x: 200, y: 250 },
        { id: 5, label: "Event Z", type: "Event", color: "#10B981", x: 300, y: 100 },
      ],
      edges: [
        { id: 1, from_node: 1, to_node: 2, label: "knows" },
        { id: 2, from_node: 1, to_node: 3, label: "works at" },
        { id: 3, from_node: 2, to_node: 4, label: "lives in" },
        { id: 4, from_node: 3, to_node: 5, label: "hosts" },
        { id: 5, from_node: 4, to_node: 5, label: "location of" },
      ],
    },
    metrics: {
      total_nodes: 1245,
      total_edges: 3872,
      density: 0.68,
      avg_degree: 6.2,
    },
    updates: [
      { action: "Graph updated", time: "Today at 11:30 AM" },
      { action: "New nodes added", time: "Yesterday at 3:45 PM" },
      { action: "Relationships modified", time: "2 days ago at 9:20 AM" },
      { action: "Data source connected", time: "3 days ago at 2:15 PM" },
    ],
  },
  dataDashboard: {
    metrics: {
      total_records: 35000,
      processed_records: 8500,
      failed_records: 120,
      processing_time: 5.7,
    },
    recent_activities: [
      { id: "1", action: "Data import completed", time: "10 minutes ago", status: "success" },
      { id: "2", action: "Transformation started", time: "25 minutes ago", status: "processing" },
      { id: "3", action: "Export scheduled", time: "1 hour ago", status: "pending" },
      { id: "4", action: "Data validation failed", time: "2 hours ago", status: "error" },
    ],
    chart_data: {
      bar_chart: [40, 70, 30, 80, 60, 50, 65],
      pie_chart: [
        { label: "Type A", value: 45, color: "#8B5CF6" },
        { label: "Type B", value: 30, color: "#EC4899" },
        { label: "Type C", value: 15, color: "#3B82F6" },
        { label: "Type D", value: 10, color: "#10B981" },
      ],
      line_chart: {
        current: [40, 60, 45, 70, 55, 65],
        previous: [30, 50, 40, 60, 45, 55],
      },
    },
  },
}

// Generic fetch function with error handling and fallback
async function fetchAPI<T>(endpoint: string, useFallback = true): Promise<T> {
  try {
    console.log(`Fetching from: ${API_BASE_URL}${endpoint}`)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Include credentials if your API requires authentication
      // credentials: 'include',
    })

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error("Received non-JSON response:", text.substring(0, 200) + "...")
      throw new Error("Server returned non-JSON response")
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return (await response.json()) as T
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)

    // If fallback is enabled and we have mock data for this endpoint
    if (useFallback) {
      console.log(`Using fallback data for ${endpoint}`)
      if (endpoint === "/kginsights/dashboard") {
        return MOCK_DATA.kgraphDashboard as unknown as T
      } else if (endpoint === "/datapuur/dashboard") {
        return MOCK_DATA.dataDashboard as unknown as T
      }
    }

    throw error
  }
}

// DataPuur API calls
export async function getDataSources() {
  return fetchAPI("/datapuur/sources")
}

export async function getDataMetrics() {
  return fetchAPI("/datapuur/metrics")
}

export async function getActivities() {
  return fetchAPI("/datapuur/activities")
}

export async function getDashboardData() {
  return fetchAPI("/datapuur/dashboard")
}

// Add a function to handle multiple file uploads
export async function uploadMultipleFiles(
  files: File[],
  chunkSize: number,
  onProgress?: (fileIndex: number, progress: number) => void,
) {
  const results = []

  for (let i = 0; i < files.length; i++) {
    try {
      const formData = new FormData()
      formData.append("file", files[i])
      formData.append("chunkSize", chunkSize.toString())

      const response = await fetch(`${API_BASE_URL}/datapuur/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to upload file ${files[i].name}`)
      }

      const data = await response.json()

      // Create ingestion job
      const ingestResponse = await fetch(`${API_BASE_URL}/datapuur/ingest-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          file_id: data.file_id,
          file_name: files[i].name,
          chunk_size: chunkSize,
        }),
      })

      if (!ingestResponse.ok) {
        throw new Error(`Failed to start ingestion for ${files[i].name}`)
      }

      const ingestData = await ingestResponse.json()

      // Update progress
      if (onProgress) {
        onProgress(i, 100)
      }

      results.push({
        file: files[i],
        fileId: data.file_id,
        jobId: ingestData.job_id,
        success: true,
      })
    } catch (error) {
      console.error(`Error processing file ${files[i].name}:`, error)
      results.push({
        file: files[i],
        error: error.message,
        success: false,
      })
    }
  }

  return results
}

// KGInsights API calls
export async function getGraphData() {
  return fetchAPI("/kginsights/graph")
}

export async function getGraphMetrics() {
  return fetchAPI("/kginsights/metrics")
}

export async function getGraphUpdates() {
  return fetchAPI("/kginsights/updates")
}

export async function getKGraphDashboard() {
  return fetchAPI("/kginsights/dashboard")
}

// Types
export interface DataSource {
  id: string
  name: string
  type: string
  last_updated: string
  status: string
}

export interface DataMetrics {
  total_records: number
  processed_records: number
  failed_records: number
  processing_time: number
}

export interface Activity {
  id: string
  action: string
  time: string
  status: string
}

export interface GraphNode {
  id: number
  label: string
  type: string
  color: string
  x: number
  y: number
}

export interface GraphEdge {
  id: number
  from_node: number
  to_node: number
  label: string
}

export interface GraphMetrics {
  total_nodes: number
  total_edges: number
  density: number
  avg_degree: number
}

export interface DashboardData {
  metrics: DataMetrics
  recent_activities: Activity[]
  chart_data: {
    bar_chart: number[]
    pie_chart: { label: string; value: number; color: string }[]
    line_chart: {
      current: number[]
      previous: number[]
    }
  }
}

export interface KGraphDashboard {
  graph: {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }
  metrics: GraphMetrics
  updates: { action: string; time: string }[]
}

