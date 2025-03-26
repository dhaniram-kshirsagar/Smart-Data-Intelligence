import { DataDashboard } from "@/components/datapuur/data-dashboard"
import { DataPuurLayout } from "@/components/datapuur/datapuur-layout"

export default function DataPuurPage() {
  return (
    <DataPuurLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Data Dashboard</h2>
        </div>
        <DataDashboard />
      </div>
    </DataPuurLayout>
  )
}

