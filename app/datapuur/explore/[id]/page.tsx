import { DataPuurLayout } from "@/components/datapuur/datapuur-layout"
import { DataExplorer } from "@/components/datapuur/data-explorer"

export function generateStaticParams() {
  // Pre-generate paths for the dataset IDs used in the sample data
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
  ]
}

export default function DataExplorePage({ params }: { params: { id: string } }) {
  return (
    <DataPuurLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Data Explorer</h2>
        </div>
        <DataExplorer datasetId={params.id} />
      </div>
    </DataPuurLayout>
  )
}
