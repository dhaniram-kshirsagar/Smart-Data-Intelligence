"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCcw, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Sample data - in a real implementation, this would come from an API
const sampleExplorerData = {
  "1": {
    name: "Sales Q1",
    columns: ["Product", "Region", "Quarter", "Sales"],
    rows: [
      { Product: "Product A", Region: "North", Quarter: "Q1", Sales: 12500 },
      { Product: "Product B", Region: "South", Quarter: "Q1", Sales: 18500 },
      { Product: "Product A", Region: "East", Quarter: "Q1", Sales: 15000 },
      { Product: "Product C", Region: "West", Quarter: "Q1", Sales: 22000 },
      { Product: "Product B", Region: "North", Quarter: "Q1", Sales: 16500 },
    ],
  },
  "2": {
    name: "Customer DB",
    columns: ["CustomerID", "Name", "Age", "Segment"],
    rows: [
      { CustomerID: "C-001", Name: "John Smith", Age: 35, Segment: "Premium" },
      { CustomerID: "C-002", Name: "Alice Johnson", Age: 42, Segment: "Standard" },
      { CustomerID: "C-003", Name: "Robert Brown", Age: 28, Segment: "Premium" },
      { CustomerID: "C-004", Name: "Emily Davis", Age: 51, Segment: "Standard" },
      { CustomerID: "C-005", Name: "Michael Wilson", Age: 39, Segment: "Premium" },
    ],
  },
  "3": {
    name: "Inventory",
    columns: ["SKU", "Product", "Warehouse", "Quantity"],
    rows: [
      { SKU: "SK-001", Product: "Item A", Warehouse: "Main", Quantity: 250 },
      { SKU: "SK-002", Product: "Item B", Warehouse: "Secondary", Quantity: 430 },
      { SKU: "SK-003", Product: "Item C", Warehouse: "Main", Quantity: 180 },
      { SKU: "SK-004", Product: "Item D", Warehouse: "Main", Quantity: 520 },
      { SKU: "SK-005", Product: "Item E", Warehouse: "Secondary", Quantity: 340 },
    ],
  },
  "4": {
    name: "HR Data",
    columns: ["EmployeeID", "Department", "Salary", "YearsOfService"],
    rows: [
      { EmployeeID: "E-001", Department: "Sales", Salary: 65000, YearsOfService: 3 },
      { EmployeeID: "E-002", Department: "Engineering", Salary: 92000, YearsOfService: 5 },
      { EmployeeID: "E-003", Department: "Marketing", Salary: 72000, YearsOfService: 2 },
      { EmployeeID: "E-004", Department: "Engineering", Salary: 105000, YearsOfService: 8 },
      { EmployeeID: "E-005", Department: "Sales", Salary: 58000, YearsOfService: 1 },
    ],
  },
}

export function DataExplorer({ datasetId }: { datasetId: string }) {
  const [explorerData, setExplorerData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [rowLimit, setRowLimit] = useState("10")

  useEffect(() => {
    // In a real implementation, this would fetch data from an API
    const fetchData = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))
        setExplorerData(sampleExplorerData[datasetId as keyof typeof sampleExplorerData])
      } catch (error) {
        console.error("Failed to fetch explorer data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [datasetId])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading explorer data...</div>
  }

  if (!explorerData) {
    return <div className="flex justify-center items-center h-64">No explorer data found for this dataset.</div>
  }

  // Filter rows based on search query
  const filteredRows = explorerData.rows
    .filter((row: any) =>
      Object.values(row).some((value: any) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .slice(0, Number.parseInt(rowLimit))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{explorerData.name} - Explorer</CardTitle>
          <CardDescription>Browse and explore the dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in data..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex items-center">
                <label htmlFor="row-limit" className="mr-2 text-sm">
                  Rows:
                </label>
                <Select value={rowLimit} onValueChange={setRowLimit}>
                  <SelectTrigger id="row-limit" className="w-24">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" title="Refresh data">
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Download data">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="table">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="sql">SQL Query</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {explorerData.columns.map((column: string) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row: any, index: number) => (
                        <TableRow key={index}>
                          {explorerData.columns.map((column: string) => (
                            <TableCell key={column}>{row[column]}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={explorerData.columns.length} className="h-24 text-center">
                          No data found matching your search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredRows.length} of {explorerData.rows.length} rows
              </div>
            </TabsContent>

            <TabsContent value="sql">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <div className="border rounded-md p-4 bg-muted/50">
                      <pre className="text-sm">SELECT * FROM {explorerData.name} LIMIT 10</pre>
                    </div>
                    <Button className="w-24">Run Query</Button>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">SQL query results will appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chart">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Chart visualization will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

