"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileInput, Wand2, Download, BarChart2, Compass } from "lucide-react"

export default function DataPuurSidebar() {
  const pathname = usePathname()

  return (
    <div className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2">
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">DataPuur Menu</h2>
          <div className="space-y-1">
            {/* Update the Data Dashboard link to ensure it points to /datapuur */}
            <Link
              href="/datapuur"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/datapuur" ? "bg-accent" : "transparent",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Data Dashboard</span>
            </Link>
            <Link
              href="/datapuur/ingestion"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/datapuur/ingestion" ? "bg-accent" : "transparent",
              )}
            >
              <FileInput className="h-4 w-4" />
              <span>Ingestion</span>
            </Link>
            {/* Add Profile menu item */}
            <Link
              href="/datapuur/profile"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname.includes("/datapuur/profile") ? "bg-accent" : "transparent",
              )}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Profile</span>
            </Link>
            <Link
              href="/datapuur/transformation"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname.includes("/datapuur/transformation") ? "bg-accent" : "transparent",
              )}
            >
              <Wand2 className="h-4 w-4" />
              <span>Transformation</span>
            </Link>
            {/* Add Explore menu item */}
            <Link
              href="/datapuur/explore"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname.includes("/datapuur/explore") ? "bg-accent" : "transparent",
              )}
            >
              <Compass className="h-4 w-4" />
              <span>Explore</span>
            </Link>
            <Link
              href="/datapuur/export"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/datapuur/export" ? "bg-accent" : "transparent",
              )}
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

