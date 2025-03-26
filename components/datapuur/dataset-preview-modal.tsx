"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"

interface DatasetPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  datasetId: string
  datasetName: string
  previewData?: any
}

export function DatasetPreviewModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
  previewData,
}: DatasetPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (previewData) {
        setData(previewData)
        setIsLoading(false)
      } else {
        // If no preview data is provided, fetch it
        fetchPreviewData()
      }
    }
  }, [isOpen, previewData])

  const fetchPreviewData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch preview data from the API
      const response = await fetch(`/api/datapuur/ingestion-preview/${datasetId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch preview data")
      }

      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error("Error fetching preview data:", error)
      setError("Failed to load preview data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const renderPreviewTable = () => {
    if (!data) {
      return <div className="text-center py-4">No preview data available</div>
    }

    // Handle different data structures that might come from the API
    if (data.headers && data.data) {
      // Format: { headers: string[], data: any[][] }
      return (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {data.headers.map((header: string, index: number) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row: any[], rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell !== null && cell !== undefined ? cell.toString() : ""}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )
    } else if (data.data && Array.isArray(data.data)) {
      // Format: { data: object[] }
      const headers = data.data.length > 0 ? Object.keys(data.data[0]) : []

      return (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row: any, rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {headers.map((header, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {row[header] !== null && row[header] !== undefined ? row[header].toString() : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )
    } else {
      // Unknown format
      return <div className="text-center py-4">Preview data is in an unsupported format</div>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview: {datasetName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : (
          renderPreviewTable()
        )}
      </DialogContent>
    </Dialog>
  )
}

