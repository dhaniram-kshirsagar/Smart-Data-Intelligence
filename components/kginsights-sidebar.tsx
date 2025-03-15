"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export default function KGInsightsSidebar() {
  const pathname = usePathname()

  const sidebarItems = [
    {
      name: "KGraph Dashboard",
      href: "/kginsights/dashboard",
      icon: BarChart,
    },
    {
      name: "Manage KGraph",
      href: "/kginsights/manage",
      icon: Settings,
    },
  ]

  return (
    <div className="w-64 h-[calc(100vh-76px)] border-r border-border p-4 bg-card/50">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="text-foreground font-medium text-lg mb-4 px-4"
      >
        KGInsights Menu
      </motion.h2>
      <nav className="space-y-2">
        {sidebarItems.map((item, index) => {
          const isActive = pathname === item.href || (pathname === "/kginsights" && index === 0)

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <item.icon
                  className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")}
                />
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator-kg"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>
    </div>
  )
}

