"use client"

import { useAdminStore } from "@/lib/admin/store"
import { motion } from "framer-motion"
import { Users, Database, Activity } from "lucide-react"

export function DashboardTab() {
  const { stats, activity } = useAdminStore()

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  // Add a check for stats being null or undefined
  if (!stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">System Overview</h2>
        <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border">
          <p className="text-muted-foreground">Loading system statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-4">System Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          variants={item}
          whileHover={{ scale: 1.02 }}
          className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            User Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Users:</span>
              <span className="text-foreground font-medium">{stats?.total_users || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Users:</span>
              <span className="text-foreground font-medium">{stats?.active_users || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Researchers:</span>
              <span className="text-foreground font-medium">{stats?.researchers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Regular Users:</span>
              <span className="text-foreground font-medium">{stats?.regular_users || 0}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          whileHover={{ scale: 1.02 }}
          className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-secondary" />
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="text-foreground font-medium">{stats?.system_uptime || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Database Size:</span>
              <span className="text-foreground font-medium">{stats?.database_size || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-primary font-medium">Operational</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          whileHover={{ scale: 1.02 }}
          className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary" />
            Recent Activity
          </h3>
          {activity && activity.length > 0 ? (
            <div className="space-y-3">
              {activity.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.id || index}
                  variants={item}
                  className="text-sm p-2 rounded-md bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="text-foreground font-medium">{item.action}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(item.timestamp).toLocaleString()} - {item.username}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent activity</p>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

