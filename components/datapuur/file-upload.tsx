"use client"

import { useState, useRef } from "react"
import { FileUp, X, FileText, Upload, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"

export function FileUpload({
  onSchemaDetected,
  isProcessing,
  setIsProcessing,
  chunkSize,
  onStatusChange,
  onJobCreated,
  onError,
}) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    // Check file type
    const fileType = file.name.split(".").pop().toLowerCase()
    if (fileType !== "csv" && fileType !== "json") {
      setError("Only CSV and JSON files are supported")
      if (onError) onError({ message: "Only CSV and JSON files are supported" })
      return
    }

    // Check file size (limit to 50MB for browser processing)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50MB limit")
      if (onError) onError({ message: "File size exceeds 50MB limit" })
      return
    }

    setFile(file)
    setError("")
  }

  const handleUpload = async () => {
    if (!file) return

    setIsProcessing(true)
    setUploadProgress(0)
    setError("")
    onStatusChange("Preparing to upload file...")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("chunkSize", chunkSize.toString())

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/upload`, {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type here as it's automatically set with FormData
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to upload file")
      }

      const data = await response.json()
      onStatusChange("File uploaded successfully! Processing data...")

      // Create a new ingestion job
      const ingestResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/ingest-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          file_id: data.file_id,
          file_name: file.name,
          chunk_size: chunkSize,
        }),
      })

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json()
        throw new Error(errorData.detail || "Failed to start ingestion")
      }

      const ingestData = await ingestResponse.json()

      // Create a new job object
      const newJob = {
        id: ingestData.job_id,
        name: file.name,
        type: "file",
        status: "running",
        progress: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        details: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      }

      if (onJobCreated) onJobCreated(newJob)
      onStatusChange(`Ingestion job started with ID: ${ingestData.job_id}`)

      // Fetch schema
      const schemaResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/schema/${data.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      if (!schemaResponse.ok) {
        const errorData = await schemaResponse.json()
        throw new Error(errorData.detail || "Failed to detect schema")
      }

      const schemaData = await schemaResponse.json()
      onSchemaDetected(schemaData.schema)
      onStatusChange("Schema detected successfully!")
    } catch (error) {
      console.error("Error uploading file:", error)
      setError(error.message || "Failed to upload file")
      onStatusChange("")
      if (onError) onError(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
    setError("")
    onStatusChange("")
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
        <FileUp className="w-5 h-5 mr-2 text-primary" />
        Upload Data Files
      </h3>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border bg-background/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleChange} accept=".csv,.json" />
          <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
            <FileUp className="w-16 h-16 text-primary mx-auto mb-4" />
          </motion.div>
          <p className="text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => fileInputRef.current.click()}
            >
              Select Files
            </Button>
            <div className="text-sm text-muted-foreground mt-2 sm:mt-0 sm:ml-2 flex items-center">
              Supported formats: CSV, JSON
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {uploadProgress > 0 && (
            <div className="mb-4">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{uploadProgress}% uploaded</p>
            </div>
          )}

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleUpload}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </span>
            )}
          </Button>
        </div>
      )}

      <div className="mt-4 p-4 bg-card/50 rounded-lg border border-border">
        <h4 className="font-medium text-foreground mb-2">Instructions:</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Upload CSV or JSON files up to 50MB</li>
          <li>CSV files should use comma as delimiter and include a header row</li>
          <li>JSON files should contain an array of objects with consistent structure</li>
          <li>The system will automatically detect the schema of your data</li>
          <li>Adjust chunk size in the Processing Configuration section for large files</li>
          <li>Monitor ingestion progress in the Ingestion Jobs section</li>
        </ul>
      </div>
    </div>
  )
}

