"use client"

import { useState, useEffect } from "react"
import { FileText, Eye, Download, Calendar, HardDrive, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { formatDistanceToNow, format } from "date-fns"

// Define the file history item type
interface FileHistoryItem {
  id: string
  filename: string
  type: string
  size: number
  uploaded_at: string
  uploaded_by: string
  preview_url?: string
  download_url?: string
  status: "available" | "archived" | "processing"
}

export function HistoryTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState<FileHistoryItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [previewFile, setPreviewFile] = useState<FileHistoryItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Fetch file history from API
  const fetchFileHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const response = await fetch(`${apiUrl}/datapuur/file-history?page=${page}&limit=${itemsPerPage}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch file history")
      }

      const data = await response.json()
      setFiles(data.files)
      setFilteredFiles(data.files)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
    } catch (err) {
      console.error("Error fetching file history:", err)
      setError("Failed to load file history. Please try again later.")

      // Use mock data for demonstration if API fails
      const mockData = generateMockData()
      setFiles(mockData)
      setFilteredFiles(mockData)
      setTotalPages(Math.ceil(mockData.length / itemsPerPage))
    } finally {
      setIsLoading(false)
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
      },
      {
        id: "3",
        filename: "sales_report_q1.csv",
        type: "csv",
        size: 1024 * 1024 * 3.7, // 3.7 MB
        uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
        uploaded_by: "admin",
        preview_url: "/api/datapuur/preview/3",
        download_url: "/api/datapuur/download/3",
        status: "archived",
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
        status: "processing",
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
      },
    ]
  }

  // Fetch data on initial load and when page changes
  useEffect(() => {
    fetchFileHistory()
  }, [page])

  // Apply filters and sorting
  useEffect(() => {
    let result = [...files]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (file) => file.filename.toLowerCase().includes(query) || file.uploaded_by.toLowerCase().includes(query),
      )
    }

    // Apply file type filter
    if (fileTypeFilter !== "all") {
      result = result.filter((file) => file.type === fileTypeFilter)
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
  }, [files, searchQuery, fileTypeFilter, sortOrder])

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  // Handle file preview
  const handlePreview = (file: FileHistoryItem) => {
    setPreviewFile(file)
    setPreviewOpen(true)
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

  // Render file preview content based on file type
  const renderPreviewContent = () => {
    if (!previewFile) return null

    // For demonstration, we'll show different previews based on file type
    switch (previewFile.type) {
      case "csv":
        return (
          <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2">{i}</td>
                    <td className="p-2">User {i}</td>
                    <td className="p-2">user{i}@example.com</td>
                    <td className="p-2">2023-01-{i < 10 ? "0" + i : i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case "json":
        return (
          <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
            <pre className="text-sm">
              {JSON.stringify(
                {
                  data: [
                    { id: 1, name: "Product 1", price: 29.99 },
                    { id: 2, name: "Product 2", price: 49.99 },
                    { id: 3, name: "Product 3", price: 19.99 },
                  ],
                  metadata: {
                    count: 3,
                    timestamp: new Date().toISOString(),
                  },
                },
                null,
                2,
              )}
            </pre>
          </div>
        )

      default:
        return <div className="text-center p-8 text-muted-foreground">Preview not available for this file type</div>
    }
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
            {searchQuery || fileTypeFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Upload files to see them in your history"}
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-3 bg-muted text-muted-foreground font-medium text-sm">
            <div className="col-span-5">File Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Uploaded</div>
            <div className="col-span-2">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {filteredFiles.map((file) => (
              <motion.div key={file.id} variants={item} className="grid grid-cols-12 gap-4 p-3 hover:bg-muted/50">
                <div className="col-span-5 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(file)}
                    disabled={file.status === "processing"}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Preview</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    disabled={file.status !== "available"}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>

                  <Badge
                    className={`ml-1 ${
                      file.status === "available"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : file.status === "processing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {file.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
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

      {/* File Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">{renderPreviewContent()}</div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Uploaded {previewFile && formatDistanceToNow(new Date(previewFile.uploaded_at), { addSuffix: true })}
            </div>

            {previewFile && previewFile.status === "available" && (
              <Button
                variant="outline"
                onClick={() => previewFile && handleDownload(previewFile)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

