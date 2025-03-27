"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw } from "lucide-react"

// Sample data as fallback
const sampleProfileData = {
  "1": {
    name: "Sales Q1",
    rowCount: 1250,
    columnCount: 15,
    completeness: 98.5,
    columns: [
      { name: "Product", type: "string", nullCount: 0, uniqueCount: 120, topValues: ["Product A", "Product B"] },
      { name: "Region", type: "string", nullCount: 2, uniqueCount: 8, topValues: ["North", "South"] },
      { name: "Quarter", type: "string", nullCount: 0, uniqueCount: 4, topValues: ["Q1", "Q2"] },
      { name: "Sales", type: "number", nullCount: 3, min: 0, max: 50000, mean: 12500, stdDev: 8500 },
    ],
  },
  "2": {
    name: "Customer DB",
    rowCount: 5000,
    columnCount: 12,
    completeness: 95.2,
    columns: [
      { name: "CustomerID", type: "string", nullCount: 0, uniqueCount: 5000, topValues: [] },
      { name: "Name", type: "string", nullCount: 15, uniqueCount: 4985, topValues: [] },
      { name: "Age", type: "number", nullCount: 120, min: 18, max: 85, mean: 42, stdDev: 15 },
      { name: "Segment", type: "string", nullCount: 80, uniqueCount: 6, topValues: ["Premium", "Standard"] },
    ],
  },
  "3": {
    name: "Inventory",
    rowCount: 850,
    columnCount: 8,
    completeness: 99.1,
    columns: [
      { name: "SKU", type: "string", nullCount: 0, uniqueCount: 850, topValues: [] },
      { name: "Product", type: "string", nullCount: 0, uniqueCount: 450, topValues: ["Item A", "Item B"] },
      { name: "Warehouse", type: "string", nullCount: 0, uniqueCount: 5, topValues: ["Main", "Secondary"] },
      { name: "Quantity", type: "number", nullCount: 2, min: 0, max: 10000, mean: 530, stdDev: 750 },
    ],
  },
  "4": {
    name: "HR Data",
    rowCount: 350,
    columnCount: 18,
    completeness: 92.7,
    columns: [
      { name: "EmployeeID", type: "string", nullCount: 0, uniqueCount: 350, topValues: [] },
      { name: "Department", type: "string", nullCount: 0, uniqueCount: 12, topValues: ["Sales", "Engineering"] },
      { name: "Salary", type: "number", nullCount: 5, min: 30000, max: 150000, mean: 75000, stdDev: 25000 },
      { name: "YearsOfService", type: "number", nullCount: 8, min: 0, max: 35, mean: 5.2, stdDev: 6.1 },
    ],
  },
}

export function DataProfile({ datasetId }: { datasetId: string }) {
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
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

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true)
      setError(null)

      try {
        // First try to fetch from the API
        try {
          // Fetch schema data
          const schemaData = await fetchWithAuth(`/api/datapuur/ingestion-schema/${datasetId}`)

          // Fetch statistics data
          const statsData = await fetchWithAuth(`/api/datapuur/ingestion-statistics/${datasetId}`)

          // Get dataset info
          const dataSources = await fetchWithAuth("/api/datapuur/sources")
          const datasetInfo = dataSources.find((ds: any) => ds.id === datasetId) || { name: "Unknown Dataset" }

          // Combine the data into the format expected by the UI
          const apiProfileData = {
            name: datasetInfo.name,
            rowCount: statsData.row_count,
            columnCount: statsData.column_count,
            completeness: statsData.completion_rate,
            columns: schemaData.fields.map((field: any, index: number) => {
              const sampleValue = schemaData.sample_values?.[index]

              // Create a column profile based on the field type
              if (field.type === "number" || field.type === "integer" || field.type === "float") {
                return {
                  name: field.name,
                  type: field.type,
                  nullCount: field.nullable ? 1 : 0, // Placeholder
                  uniqueCount: 0, // Placeholder
                  min: 0, // Placeholder
                  max: 0, // Placeholder
                  mean: 0, // Placeholder
                  stdDev: 0, // Placeholder
                  sample: sampleValue,
                }
              } else {
                return {
                  name: field.name,
                  type: field.type,
                  nullCount: field.nullable ? 1 : 0, // Placeholder
                  uniqueCount: 0, // Placeholder
                  topValues: sampleValue ? [sampleValue] : [],
                  sample: sampleValue,
                }
              }
            }),
          }

          setProfileData(apiProfileData)
        } catch (apiError) {
          console.error("Error fetching from API:", apiError)

          // Fallback to sample data if API fails
          if (datasetId in sampleProfileData) {
            console.log("Using sample data as fallback")
            setProfileData(sampleProfileData[datasetId as keyof typeof sampleProfileData])
          } else {
            // If no sample data for this ID, create a generic profile
            setProfileData({
              name: "Dataset " + datasetId,
              rowCount: 0,
              columnCount: 0,
              completeness: 0,
              columns: [],
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
        setError("Failed to load profile data. Please try again later.")

        // Show toast notification
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [datasetId, fetchWithAuth, toast])

  // Handle authentication errors
  useEffect(() => {
    if (authError) {
      toast({
        title: "Authentication Error",
        description: authError,
        variant: "destructive",
      })
    }
  }, [authError, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading profile data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!profileData) {
    return <div className="flex justify-center items-center h-64">No profile data found for this dataset.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{profileData.name} - Overview</CardTitle>
          <CardDescription>Profile summary and data quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col p-4 border rounded-lg">
              <span className="text-sm text-muted-foreground mb-1">Row Count</span>
              <span className="text-2xl font-bold">{profileData.rowCount.toLocaleString()}</span>
            </div>
            <div className="flex flex-col p-4 border rounded-lg">
              <span className="text-sm text-muted-foreground mb-1">Column Count</span>
              <span className="text-2xl font-bold">{profileData.columnCount}</span>
            </div>
            <div className="flex flex-col p-4 border rounded-lg">
              <span className="text-sm text-muted-foreground mb-1">Data Completeness</span>
              <div className="flex items-center gap-2">
                <Progress value={profileData.completeness} className="h-2 flex-1" />
                <span className="text-sm font-medium">{profileData.completeness}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="columns">
        <TabsList className="mb-4">
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="columns">
          <Card>
            <CardHeader>
              <CardTitle>Column Profiles</CardTitle>
              <CardDescription>Detailed statistics for each column in the dataset</CardDescription>
            </CardHeader>
            <CardContent>
              {profileData.columns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Null Count</TableHead>
                      <TableHead>Unique Values</TableHead>
                      <TableHead>Statistics</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profileData.columns.map((column: any) => (
                      <TableRow key={column.name}>
                        <TableCell className="font-medium">{column.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{column.type}</Badge>
                        </TableCell>
                        <TableCell>{column.nullCount}</TableCell>
                        <TableCell>{column.uniqueCount || "N/A"}</TableCell>
                        <TableCell>
                          {column.type === "number" || column.type === "integer" || column.type === "float" ? (
                            <div className="text-xs">
                              {column.min !== undefined && <span className="mr-2">Min: {column.min}</span>}
                              {column.max !== undefined && <span className="mr-2">Max: {column.max}</span>}
                              {column.mean !== undefined && <span className="mr-2">Mean: {column.mean}</span>}
                            </div>
                          ) : (
                            <div className="text-xs">
                              {column.topValues && column.topValues.length > 0 ? (
                                <>Top values: {column.topValues.join(", ")}</>
                              ) : (
                                <>Sample: {column.sample || "N/A"}</>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No column data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Data Quality</CardTitle>
              <CardDescription>Detailed quality metrics for the dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Data quality metrics will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Data Distribution</CardTitle>
              <CardDescription>Distribution analysis for numeric columns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Distribution charts will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

