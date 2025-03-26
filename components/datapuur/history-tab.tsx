"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Eye,
  Download,
  Calendar,
  HardDrive,
  RefreshCw,
  Search,
  Database,
  ChevronDown,
  Table,
  BarChart,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { formatDistanceToNow, format } from "date-fns"

// Update the FileHistoryItem interface to include schema and statistics
interface FileHistoryItem {
  id: string
  filename: string
  type: string
  size: number
  uploaded_at: string
  uploaded_by: string
  preview_url?: string
  download_url?: string
  status: "available" | "archived" | "processing" | "failed"
  source_type: "file" | "database"
  database_info?: {
    type: string
    name: string
    table: string
  }
  schema?: any
  statistics?: {
    row_count: number
    column_count: number
    null_percentage: number
    memory_usage: string
    processing_time: string
  }
}

// Update the component to include expanded view functionality
export function HistoryTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState<FileHistoryItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState("all")
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)

  // Track expanded items
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  // Track which tab is active for each expanded item
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})

  // Add state for storing fetched data and loading states
  const [itemData, setItemData] = useState<Record<string, { preview: any; schema: any; stats: any }>>({})
  const [tabLoadingStates, setTabLoadingStates] = useState<
    Record<string, { preview: boolean; schema: boolean; stats: boolean }>
  >({})

  // Add state for table pagination
  const [previewPage, setPreviewPage] = useState<Record<string, number>>({})
  const [previewPageSize, setPreviewPageSize] = useState(10)

  // Update the fetchFileHistory function to use the SQLite database
  const fetchFileHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      // Use the updated endpoint that fetches from the SQLite database
      const response = await fetch(
        `${apiUrl}/datapuur/ingestion-history?page=${page}&limit=${itemsPerPage}&sort=${sortOrder}&type=${fileTypeFilter !== "all" ? fileTypeFilter : ""}&source=${sourceTypeFilter !== "all" ? sourceTypeFilter : ""}&status=${statusFilter !== "all" ? statusFilter : ""}&search=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch ingestion history")
      }

      const data = await response.json()
      setFiles(data.items)
      setFilteredFiles(data.items)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
    } catch (err) {
      console.error("Error fetching ingestion history:", err)
      setError("Failed to load ingestion history. Please try again later.")

      // Use mock data for demonstration if API fails
      const mockData = generateMockData()
      setFiles(mockData)
      setFilteredFiles(mockData)
      setTotalPages(Math.ceil(mockData.length / itemsPerPage))
    } finally {
      setIsLoading(false)
    }
  }

  // Add a function to fetch schema data for a specific ingestion
  const fetchSchemaData = async (ingestionId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const response = await fetch(`${apiUrl}/datapuur/ingestion-schema/${ingestionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch schema data")
      }

      return await response.json()
    } catch (err) {
      console.error(`Error fetching schema for ingestion ${ingestionId}:`, err)
      return null
    }
  }

  // Add a function to fetch preview data for a specific ingestion
  const fetchPreviewData = async (ingestionId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const response = await fetch(`${apiUrl}/datapuur/ingestion-preview/${ingestionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch preview data")
      }

      return await response.json()
    } catch (err) {
      console.error(`Error fetching preview for ingestion ${ingestionId}:`, err)
      return null
    }
  }

  // Add a function to fetch statistics for a specific ingestion
  const fetchStatisticsData = async (ingestionId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const response = await fetch(`${apiUrl}/datapuur/ingestion-statistics/${ingestionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch statistics data")
      }

      return await response.json()
    } catch (err) {
      console.error(`Error fetching statistics for ingestion ${ingestionId}:`, err)
      return null
    }
  }

  // Generate mock data for demonstration
  const generateMockData = (): FileHistoryItem[] => {
    return [
      {
        id: "1",
        filename: "customer_data_2023.csv",
        type: "csv",
        size: 1024 * 1024 * 2.5, // 2.5 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        uploaded_by: "researcher",
        preview_url: "/api/datapuur/preview/1",
        download_url: "/api/datapuur/download/1",
        status: "available",
        source_type: "file",
        schema: {
          fields: [
            { name: "id", type: "integer", nullable: false },
            { name: "name", type: "string", nullable: false },
            { name: "email", type: "string", nullable: false },
            { name: "age", type: "integer", nullable: true },
            { name: "signup_date", type: "date", nullable: false },
          ],
        },
        statistics: {
          row_count: 5243,
          column_count: 5,
          null_percentage: 2.3,
          memory_usage: "1.2 MB",
          processing_time: "3.5s",
        },
      },
      {
        id: "2",
        filename: "product_catalog.json",
        type: "json",
        size: 1024 * 1024 * 1.2, // 1.2 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        uploaded_by: "researcher",
        preview_url: "/api/datapuur/preview/2",
        download_url: "/api/datapuur/download/2",
        status: "available",
        source_type: "file",
        schema: {
          fields: [
            { name: "product_id", type: "string", nullable: false },
            { name: "name", type: "string", nullable: false },
            { name: "price", type: "number", nullable: false },
            { name: "category", type: "string", nullable: false },
            { name: "in_stock", type: "boolean", nullable: false },
          ],
        },
        statistics: {
          row_count: 1250,
          column_count: 5,
          null_percentage: 0,
          memory_usage: "0.8 MB",
          processing_time: "1.2s",
        },
      },
      {
        id: "3",
        filename: "FoamFactory_V2_27K - Copy.csv",
        type: "csv",
        size: 1024 * 1024 * 18.6, // 18.6 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(), // 7 minutes ago
        uploaded_by: "admin",
        preview_url: "/api/datapuur/preview/3",
        download_url: "/api/datapuur/download/3",
        status: "available",
        source_type: "file",
        schema: {
          fields: [
            { name: "Factory", type: "string", nullable: false },
            { name: "Date", type: "date", nullable: false },
            { name: "Location", type: "string", nullable: false },
            { name: "Machine Type", type: "string", nullable: false },
            { name: "Machine Utilization (%)", type: "number", nullable: false },
            { name: "Machine Downtime (hours)", type: "number", nullable: false },
            { name: "Maintenance History", type: "string", nullable: true },
            { name: "Machine Age (years)", type: "number", nullable: false },
            { name: "Batch", type: "string", nullable: false },
            { name: "Batch Quality (Pass %)", type: "number", nullable: false },
            { name: "Cycle Time (minutes)", type: "number", nullable: false },
            { name: "Energy Consumption (kWh)", type: "number", nullable: false },
          ],
        },
        statistics: {
          row_count: 27000,
          column_count: 12,
          null_percentage: 5.2,
          memory_usage: "18.6 MB",
          processing_time: "4.7s",
        },
      },
      {
        id: "4",
        filename: "user_feedback.json",
        type: "json",
        size: 1024 * 512, // 512 KB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        uploaded_by: "researcher",
        preview_url: "/api/datapuur/preview/4",
        download_url: "/api/datapuur/download/4",
        status: "failed",
        source_type: "file",
        schema: null,
        statistics: null,
      },
      {
        id: "5",
        filename: "inventory_data.csv",
        type: "csv",
        size: 1024 * 1024 * 5.1, // 5.1 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        uploaded_by: "researcher",
        preview_url: "/api/datapuur/preview/5",
        download_url: "/api/datapuur/download/5",
        status: "available",
        source_type: "file",
        schema: {
          fields: [
            { name: "product_id", type: "string", nullable: false },
            { name: "warehouse_id", type: "string", nullable: false },
            { name: "quantity", type: "integer", nullable: false },
            { name: "last_updated", type: "datetime", nullable: false },
          ],
        },
        statistics: {
          row_count: 12500,
          column_count: 4,
          null_percentage: 0,
          memory_usage: "3.2 MB",
          processing_time: "5.8s",
        },
      },
      {
        id: "6",
        filename: "mysql-customers",
        type: "database",
        size: 1024 * 1024 * 8.3, // 8.3 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        uploaded_by: "admin",
        preview_url: "/api/datapuur/preview/6",
        download_url: "/api/datapuur/download/6",
        status: "available",
        source_type: "database",
        database_info: {
          type: "mysql",
          name: "production_db",
          table: "customers",
        },
        schema: {
          fields: [
            { name: "customer_id", type: "integer", nullable: false },
            { name: "first_name", type: "string", nullable: false },
            { name: "last_name", type: "string", nullable: false },
            { name: "email", type: "string", nullable: false },
            { name: "phone", type: "string", nullable: true },
            { name: "address", type: "string", nullable: true },
            { name: "created_at", type: "datetime", nullable: false },
          ],
        },
        statistics: {
          row_count: 25000,
          column_count: 7,
          null_percentage: 12.5,
          memory_usage: "6.7 MB",
          processing_time: "8.3s",
        },
      },
      {
        id: "7",
        filename: "postgresql-orders",
        type: "database",
        size: 1024 * 1024 * 15.2, // 15.2 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 36 hours ago
        uploaded_by: "researcher",
        preview_url: "/api/datapuur/preview/7",
        download_url: "/api/datapuur/download/7",
        status: "available",
        source_type: "database",
        database_info: {
          type: "postgresql",
          name: "analytics_db",
          table: "orders",
        },
        schema: {
          fields: [
            { name: "order_id", type: "string", nullable: false },
            { name: "customer_id", type: "integer", nullable: false },
            { name: "order_date", type: "date", nullable: false },
            { name: "total_amount", type: "number", nullable: false },
            { name: "status", type: "string", nullable: false },
            { name: "payment_method", type: "string", nullable: false },
          ],
        },
        statistics: {
          row_count: 45000,
          column_count: 6,
          null_percentage: 0.5,
          memory_usage: "12.8 MB",
          processing_time: "15.2s",
        },
      },
      {
        id: "8",
        filename: "mssql-products",
        type: "database",
        size: 1024 * 1024 * 4.7, // 4.7 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 48 hours ago
        uploaded_by: "admin",
        preview_url: "/api/datapuur/preview/8",
        download_url: "/api/datapuur/download/8",
        status: "failed",
        source_type: "database",
        database_info: {
          type: "mssql",
          name: "inventory_db",
          table: "products",
        },
        schema: null,
        statistics: null,
      },
    ]
  }

  // Generate mock preview data for the FoamFactory file
  const generateMockPreviewData = (fileId: string) => {
    if (fileId === "3") {
      // Mock data for FoamFactory CSV
      return {
        headers: [
          "Factory",
          "Date",
          "Location",
          "Machine Type",
          "Machine Utilization (%)",
          "Machine Downtime (hours)",
          "Maintenance History",
          "Machine Age (years)",
          "Batch",
          "Batch Quality (Pass %)",
          "Cycle Time (minutes)",
          "Energy Consumption (kWh)",
        ],
        data: [
          [
            "Factory A",
            "2023-01-15",
            "North Wing",
            "Extruder",
            "87.5",
            "2.3",
            "Regular",
            "4.5",
            "B12345",
            "98.7",
            "45",
            "320",
          ],
          [
            "Factory A",
            "2023-01-16",
            "North Wing",
            "Extruder",
            "92.1",
            "1.5",
            "Regular",
            "4.5",
            "B12346",
            "99.2",
            "43",
            "315",
          ],
          [
            "Factory B",
            "2023-01-15",
            "South Wing",
            "Mixer",
            "78.3",
            "4.2",
            "Overhaul",
            "6.2",
            "B22345",
            "95.8",
            "52",
            "410",
          ],
          [
            "Factory B",
            "2023-01-16",
            "South Wing",
            "Mixer",
            "81.5",
            "3.7",
            "Regular",
            "6.2",
            "B22346",
            "96.3",
            "50",
            "395",
          ],
          [
            "Factory C",
            "2023-01-15",
            "East Wing",
            "Cutter",
            "94.7",
            "1.1",
            "Minimal",
            "2.3",
            "B32345",
            "99.5",
            "38",
            "280",
          ],
          [
            "Factory C",
            "2023-01-16",
            "East Wing",
            "Cutter",
            "95.2",
            "0.9",
            "Minimal",
            "2.3",
            "B32346",
            "99.7",
            "37",
            "275",
          ],
          [
            "Factory A",
            "2023-01-17",
            "North Wing",
            "Extruder",
            "89.3",
            "2.1",
            "Regular",
            "4.5",
            "B12347",
            "98.9",
            "44",
            "318",
          ],
          [
            "Factory B",
            "2023-01-17",
            "South Wing",
            "Mixer",
            "82.7",
            "3.5",
            "Regular",
            "6.2",
            "B22347",
            "96.5",
            "49",
            "390",
          ],
          [
            "Factory C",
            "2023-01-17",
            "East Wing",
            "Cutter",
            "95.5",
            "0.8",
            "Minimal",
            "2.3",
            "B32347",
            "99.8",
            "36",
            "272",
          ],
          [
            "Factory A",
            "2023-01-18",
            "North Wing",
            "Extruder",
            "90.2",
            "1.9",
            "Regular",
            "4.5",
            "B12348",
            "99.0",
            "43",
            "316",
          ],
          [
            "Factory B",
            "2023-01-18",
            "South Wing",
            "Mixer",
            "83.4",
            "3.3",
            "Regular",
            "6.2",
            "B22348",
            "96.7",
            "48",
            "385",
          ],
          [
            "Factory C",
            "2023-01-18",
            "East Wing",
            "Cutter",
            "95.8",
            "0.7",
            "Minimal",
            "2.3",
            "B32348",
            "99.9",
            "35",
            "270",
          ],
          [
            "Factory A",
            "2023-01-19",
            "North Wing",
            "Extruder",
            "91.5",
            "1.7",
            "Regular",
            "4.5",
            "B12349",
            "99.1",
            "42",
            "312",
          ],
          [
            "Factory B",
            "2023-01-19",
            "South Wing",
            "Mixer",
            "84.2",
            "3.1",
            "Regular",
            "6.2",
            "B22349",
            "97.0",
            "47",
            "380",
          ],
          [
            "Factory C",
            "2023-01-19",
            "East Wing",
            "Cutter",
            "96.0",
            "0.6",
            "Minimal",
            "2.3",
            "B32349",
            "99.9",
            "35",
            "268",
          ],
        ],
      }
    }

    // Default mock data for other files
    return {
      headers: ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"],
      data: [
        ["Value 1-1", "Value 1-2", "Value 1-3", "Value 1-4", "Value 1-5"],
        ["Value 2-1", "Value 2-2", "Value 2-3", "Value 2-4", "Value 2-5"],
        ["Value 3-1", "Value 3-2", "Value 3-3", "Value 3-4", "Value 3-5"],
        ["Value 4-1", "Value 4-2", "Value 4-3", "Value 4-4", "Value 4-5"],
        ["Value 5-1", "Value 5-2", "Value 5-3", "Value 5-4", "Value 5-5"],
      ],
    }
  }

  // Fetch data on initial load and when page changes
  useEffect(() => {
    fetchFileHistory()
  }, [page])

  // Update the useEffect for filtering to use server-side filtering
  useEffect(() => {
    // Only apply client-side filtering if we're not using server-side filtering
    // or if we're using mock data
    if (error) {
      let result = [...files]

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        result = result.filter(
          (file) =>
            file.filename.toLowerCase().includes(query) ||
            file.uploaded_by.toLowerCase().includes(query) ||
            (file.database_info?.name && file.database_info.name.toLowerCase().includes(query)),
        )
      }

      // Apply file type filter
      if (fileTypeFilter !== "all") {
        result = result.filter((file) => file.type === fileTypeFilter)
      }

      // Apply source type filter
      if (sourceTypeFilter !== "all") {
        result = result.filter((file) => file.source_type === sourceTypeFilter)
      }

      // Apply status filter
      if (statusFilter !== "all") {
        result = result.filter((file) => file.status === statusFilter)
      }

      // Apply sorting
      result.sort((a, b) => {
        const dateA = new Date(a.uploaded_at).getTime()
        const dateB = new Date(b.uploaded_at).getTime()

        if (sortOrder === "newest") {
          return dateB - dateA
        } else {
          return dateA - dateB
        }
      })

      setFilteredFiles(result)
    }
  }, [files, searchQuery, fileTypeFilter, sourceTypeFilter, statusFilter, sortOrder, error])

  // Update the useEffect for fetching data to refetch when filters change
  useEffect(() => {
    // Only fetch from server if we're not using mock data
    if (!error) {
      fetchFileHistory()
    }
  }, [page, searchQuery, fileTypeFilter, sourceTypeFilter, statusFilter, sortOrder])

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  // Update the toggleExpand function to fetch data when expanding an item
  const toggleExpand = async (id: string) => {
    const newExpandedState = !expandedItems[id]

    setExpandedItems((prev) => ({
      ...prev,
      [id]: newExpandedState,
    }))

    // Set default active tab if not already set
    if (!activeTabs[id]) {
      setActiveTabs((prev) => ({
        ...prev,
        [id]: "preview",
      }))
    }

    // Initialize preview page if not already set
    if (!previewPage[id]) {
      setPreviewPage((prev) => ({
        ...prev,
        [id]: 1,
      }))
    }

    // If we're expanding and we need to fetch data
    if (newExpandedState) {
      const file = files.find((f) => f.id === id)
      if (file) {
        // Set loading states for each tab
        setTabLoadingStates((prev) => ({
          ...prev,
          [id]: {
            preview: true,
            schema: true,
            stats: true,
          },
        }))

        try {
          // For mock data in preview mode
          if (error) {
            // Use mock data
            const mockPreviewData = generateMockPreviewData(id)
            const mockSchemaData = file.schema
            const mockStatsData = file.statistics

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Store the mock data
            setItemData((prev) => ({
              ...prev,
              [id]: {
                preview: mockPreviewData,
                schema: mockSchemaData,
                stats: mockStatsData,
              },
            }))
          } else {
            // Fetch data for each tab in parallel from real API
            const [previewData, schemaData, statsData] = await Promise.all([
              fetchPreviewData(id),
              fetchSchemaData(id),
              fetchStatisticsData(id),
            ])

            // Store the fetched data
            setItemData((prev) => ({
              ...prev,
              [id]: {
                preview: previewData,
                schema: schemaData,
                stats: statsData,
              },
            }))
          }
        } catch (error) {
          console.error(`Error fetching data for ingestion ${id}:`, error)
        } finally {
          // Clear loading states
          setTabLoadingStates((prev) => ({
            ...prev,
            [id]: {
              preview: false,
              schema: false,
              stats: false,
            },
          }))
        }
      }
    }
  }

  // Set active tab for an item
  const setActiveTab = (id: string, tab: string) => {
    setActiveTabs((prev) => ({
      ...prev,
      [id]: tab,
    }))
  }

  // Handle file download
  const handleDownload = async (file: FileHistoryItem) => {
    if (!file.download_url) return

    try {
      window.open(file.download_url, "_blank")
    } catch (err) {
      console.error("Error downloading file:", err)
      setError("Failed to download file. Please try again later.")
    }
  }

  // Handle preview pagination
  const handlePreviewPageChange = (id: string, newPage: number) => {
    setPreviewPage((prev) => ({
      ...prev,
      [id]: newPage,
    }))
  }

  // Calculate total preview pages
  const calculateTotalPreviewPages = (id: string) => {
    const previewData = itemData[id]?.preview
    if (!previewData || !previewData.data) return 1

    return Math.ceil(previewData.data.length / previewPageSize)
  }

  // Get paginated preview data
  const getPaginatedPreviewData = (id: string) => {
    const previewData = itemData[id]?.preview
    if (!previewData || !previewData.data) return { headers: [], rows: [] }

    const currentPage = previewPage[id] || 1
    const startIndex = (currentPage - 1) * previewPageSize
    const endIndex = startIndex + previewPageSize

    return {
      headers: previewData.headers || [],
      rows: previewData.data.slice(startIndex, endIndex),
    }
  }

  // Update the renderPreviewContent function to use fetched data with improved formatting
  const renderPreviewContent = (file: FileHistoryItem) => {
    const id = file.id
    const isLoading = tabLoadingStates[id]?.preview

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (file.status === "failed") {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md text-destructive">
          This ingestion failed. No preview data is available.
        </div>
      )
    }

    const previewData = itemData[id]?.preview
    if (!previewData || !previewData.data || previewData.data.length === 0) {
      return (
        <div className="p-4 bg-muted/30 rounded-md text-muted-foreground">
          No preview data available for this ingestion.
        </div>
      )
    }

    // Get paginated data
    const { headers, rows } = getPaginatedPreviewData(id)
    const totalPages = calculateTotalPreviewPages(id)
    const currentPage = previewPage[id] || 1

    // Render improved table view
    return (
      <div className="space-y-4">
        <div className="bg-card shadow-sm border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-medium text-muted-foreground border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 text-sm border-b border-border">
                        {cell !== null ? String(cell) : <span className="text-muted-foreground italic">NULL</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * previewPageSize + 1} to{" "}
              {Math.min(currentPage * previewPageSize, previewData.data.length)} of {previewData.data.length} rows
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPageChange(id, 1)}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPageChange(id, currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPageChange(id, currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPageChange(id, totalPages)}
                disabled={currentPage === totalPages}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Update the renderSchemaContent function to use fetched data
  const renderSchemaContent = (file: FileHistoryItem) => {
    const id = file.id
    const isLoading = tabLoadingStates[id]?.schema
    const schemaData = itemData[id]?.schema

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (!schemaData || !schemaData.fields) {
      return (
        <div className="p-4 bg-muted/30 rounded-md text-muted-foreground">
          No schema information available for this ingestion.
        </div>
      )
    }

    return (
      <div className="bg-card shadow-sm border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground border-b">Field Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground border-b">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground border-b">Nullable</th>
                {schemaData.sample_values && (
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground border-b">
                    Sample Value
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {schemaData.fields.map((field, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-2 text-sm font-medium border-b border-border">{field.name}</td>
                  <td className="px-4 py-2 text-sm border-b border-border">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        field.type === "string" || field.type === "text"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : field.type === "integer" || field.type === "number" || field.type === "float"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : field.type === "date" || field.type === "datetime" || field.type === "timestamp"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                              : field.type === "boolean"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {field.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-border">{field.nullable ? "Yes" : "No"}</td>
                  {schemaData.sample_values && (
                    <td className="px-4 py-2 text-sm border-b border-border truncate max-w-[200px]">
                      {schemaData.sample_values[index] !== null && schemaData.sample_values[index] !== undefined ? (
                        typeof schemaData.sample_values[index] === "object" ? (
                          JSON.stringify(schemaData.sample_values[index])
                        ) : (
                          String(schemaData.sample_values[index])
                        )
                      ) : (
                        <span className="text-muted-foreground italic">NULL</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Update the renderStatsContent function to use fetched data
  const renderStatsContent = (file: FileHistoryItem) => {
    const id = file.id
    const isLoading = tabLoadingStates[id]?.stats
    const statsData = itemData[id]?.stats

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (!statsData) {
      return (
        <div className="p-4 bg-muted/30 rounded-md text-muted-foreground">
          No statistics available for this ingestion.
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card shadow-sm p-4 rounded-md border border-border">
          <div className="text-sm text-muted-foreground">Row Count</div>
          <div className="text-2xl font-bold text-foreground">{statsData.row_count?.toLocaleString() || "N/A"}</div>
        </div>

        <div className="bg-card shadow-sm p-4 rounded-md border border-border">
          <div className="text-sm text-muted-foreground">Column Count</div>
          <div className="text-2xl font-bold text-foreground">{statsData.column_count || "N/A"}</div>
        </div>

        <div className="bg-card shadow-sm p-4 rounded-md border border-border">
          <div className="text-sm text-muted-foreground">Null Percentage</div>
          <div className="text-2xl font-bold text-foreground">{statsData.null_percentage?.toFixed(2) || "N/A"}%</div>
        </div>

        <div className="bg-card shadow-sm p-4 rounded-md border border-border">
          <div className="text-sm text-muted-foreground">Memory Usage</div>
          <div className="text-2xl font-bold text-foreground">{statsData.memory_usage || "N/A"}</div>
        </div>

        <div className="bg-card shadow-sm p-4 rounded-md border border-border">
          <div className="text-sm text-muted-foreground">Processing Time</div>
          <div className="text-2xl font-bold text-foreground">{statsData.processing_time || "N/A"}</div>
        </div>

        {statsData.data_density && (
          <div className="bg-card shadow-sm p-4 rounded-md border border-border">
            <div className="text-sm text-muted-foreground">Data Density</div>
            <div className="text-2xl font-bold text-foreground">{statsData.data_density} rows/KB</div>
          </div>
        )}

        {statsData.completion_rate !== undefined && (
          <div className="bg-card shadow-sm p-4 rounded-md border border-border">
            <div className="text-sm text-muted-foreground">Completion Rate</div>
            <div className="text-2xl font-bold text-foreground">{statsData.completion_rate.toFixed(2)}%</div>
          </div>
        )}

        {statsData.error_rate !== undefined && (
          <div className="bg-card shadow-sm p-4 rounded-md border border-border">
            <div className="text-sm text-muted-foreground">Error Rate</div>
            <div className="text-2xl font-bold text-foreground">{statsData.error_rate.toFixed(2)}%</div>
          </div>
        )}
      </div>
    )
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search files by name or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="File Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="database">Database</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="database">Database</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchFileHistory} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No files found</h3>
          <p className="text-muted-foreground">
            {searchQuery || fileTypeFilter !== "all" || sourceTypeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Upload files or connect to databases to see them in your history"}
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {filteredFiles.map((file) => (
            <motion.div
              key={file.id}
              variants={item}
              className="border rounded-lg overflow-hidden bg-card/50 hover:bg-card/80 transition-colors"
            >
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 p-4 cursor-pointer" onClick={() => toggleExpand(file.id)}>
                <div className="col-span-5 flex items-center gap-2">
                  {file.source_type === "file" ? (
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  ) : (
                    <Database className="h-5 w-5 text-secondary flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium text-foreground truncate">{file.filename}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Badge className="text-xs">{file.type.toUpperCase()}</Badge>
                      <span>•</span>
                      <span>Uploaded by {file.uploaded_by}</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center text-muted-foreground">
                  <HardDrive className="h-3 w-3 mr-1 flex-shrink-0" />
                  {formatFileSize(file.size)}
                </div>

                <div className="col-span-3 flex items-center text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                  <div>
                    <div>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</div>
                    <div className="text-xs">{format(new Date(file.uploaded_at), "MMM d, yyyy")}</div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <Badge
                    className={`${
                      file.status === "available"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : file.status === "processing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : file.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {file.status}
                  </Badge>

                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedItems[file.id] ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {/* Expanded content */}
              {expandedItems[file.id] && (
                <div className="border-t border-border p-4">
                  {/* Tabs for different views */}
                  <div className="border-b border-border mb-4">
                    <div className="flex space-x-4">
                      <button
                        className={`pb-2 px-1 text-sm font-medium ${
                          activeTabs[file.id] === "preview"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab(file.id, "preview")}
                      >
                        <Eye className="h-4 w-4 inline mr-1" />
                        Preview
                      </button>
                      <button
                        className={`pb-2 px-1 text-sm font-medium ${
                          activeTabs[file.id] === "schema"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab(file.id, "schema")}
                      >
                        <Table className="h-4 w-4 inline mr-1" />
                        Schema
                      </button>
                      <button
                        className={`pb-2 px-1 text-sm font-medium ${
                          activeTabs[file.id] === "stats"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab(file.id, "stats")}
                      >
                        <BarChart className="h-4 w-4 inline mr-1" />
                        Statistics
                      </button>
                    </div>
                  </div>

                  {/* Tab content */}
                  <div className="py-2">
                    {activeTabs[file.id] === "preview" && renderPreviewContent(file)}
                    {activeTabs[file.id] === "schema" && renderSchemaContent(file)}
                    {activeTabs[file.id] === "stats" && renderStatsContent(file)}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      {file.source_type === "database" && file.database_info && (
                        <span>
                          Database: {file.database_info.type} • {file.database_info.name}.{file.database_info.table}
                        </span>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {file.status === "available" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

