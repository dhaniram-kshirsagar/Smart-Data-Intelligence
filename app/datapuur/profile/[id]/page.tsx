import { DataPuurLayout } from "@/components/datapuur/datapuur-layout"
import { DataProfile } from "@/components/datapuur/data-profile"

export function generateStaticParams() {
  // Pre-generate paths for the dataset IDs used in the sample data
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
  ]
}

export default function DataProfilePage({ params }: { params: { id: string } }) {
  // Clean the ID parameter to remove any file extensions
  const cleanId = params.id.replace(/\.[^/.]+$/, "")

  return (
    <DataPuurLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Data Profile</h2>
        </div>
        <DataProfile datasetId={cleanId} />
      </div>
    </DataPuurLayout>
  )
}
