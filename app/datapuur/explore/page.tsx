import { DataPuurLayout } from "@/components/datapuur/datapuur-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DataExploreIndexPage() {
  return (
    <DataPuurLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Data Explorer</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Select a Dataset to Explore</CardTitle>
            <CardDescription>Choose a dataset from the dashboard to start exploring</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Link href="/datapuur">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DataPuurLayout>
  )
}

