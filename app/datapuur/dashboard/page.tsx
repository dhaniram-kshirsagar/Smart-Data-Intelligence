"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import DataPuurSidebar from "@/components/datapuur-sidebar"
import { motion } from "framer-motion"
import { BarChart, LineChart, PieChart, Activity } from "lucide-react"
import { useEffect, useState } from "react"
import { type DashboardData, getDashboardData } from "@/lib/api"
import LoadingSpinner from "@/components/loading-spinner"

export default function DataDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await getDashboardData()
        console.log("Successfully fetched dashboard data:", data)
        setDashboardData(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Using fallback data.")
        // We'll still show the UI with fallback data from the API client
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

  if (loading) {
    return (
      <main className="min-h-screen bg-background antialiased relative overflow-hidden">
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor="var(--foreground)"
          />
        </div>

        <div className="relative z-10">
          <Navbar />

          <div className="flex">
            <DataPuurSidebar />

            <div className="flex-1 p-8 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </main>
    )
  }

  // If we have an error but also have dashboard data (from fallback),
  // we'll show a warning but still render the UI
  const showErrorBanner = error && dashboardData

  // Only show the full error page if we have an error and no data
  if (error && !dashboardData) {
    return (
      <main className="min-h-screen bg-background antialiased relative overflow-hidden">
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor="var(--foreground)"
          />
        </div>

        <div className="relative z-10">
          <Navbar />

          <div className="flex">
            <DataPuurSidebar />

            <div className="flex-1 p-8">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold text-foreground mb-6">Error</h1>
                <p className="text-destructive text-xl mb-8">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!dashboardData) {
    return null // This should never happen, but TypeScript needs it
  }

  return (
    <main className="min-h-screen bg-background antialiased relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="var(--foreground)"
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="flex">
          <DataPuurSidebar />

          <div className="flex-1 p-8">
            {showErrorBanner && (
              <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-700 dark:text-yellow-200 px-4 py-2 rounded-md mb-4">
                <p>{error} - Using demo data instead.</p>
              </div>
            )}

            <div className="max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold text-foreground mb-6"
              >
                Data Dashboard
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Monitor and visualize your data processing activities.
              </motion.p>

              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border h-64 relative overflow-hidden group"
                >
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <BarChart className="w-5 h-5 mr-2 text-primary" />
                    Data Processing Status
                  </h3>

                  <div className="h-40 flex items-end justify-around">
                    {dashboardData.chart_data.bar_chart.map((height, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{
                          duration: 0.8,
                          delay: index * 0.1,
                          ease: "easeOut",
                        }}
                        className="w-8 bg-gradient-to-t from-primary/60 to-primary rounded-t-md relative group"
                        whileHover={{ y: -5 }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileHover={{ opacity: 1, y: 0 }}
                          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-card text-card-foreground text-xs py-1 px-2 rounded border border-border"
                        >
                          {height}%
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>

                <motion.div
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border h-64 relative overflow-hidden group"
                >
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary" />
                    Recent Activities
                  </h3>

                  <div className="space-y-3">
                    {dashboardData.recent_activities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                        className="flex items-center p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-3 ${
                            activity.status === "success"
                              ? "bg-violet-500"
                              : activity.status === "processing"
                                ? "bg-blue-500"
                                : activity.status === "pending"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                          }`}
                        >
                          <motion.div
                            animate={{
                              scale: activity.status === "processing" ? [1, 1.5, 1] : 1,
                              opacity: activity.status === "processing" ? [0.5, 1, 0.5] : 1,
                            }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-card-foreground text-sm">{activity.action}</p>
                          <p className="text-muted-foreground text-xs">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>

                <motion.div
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border h-64 relative overflow-hidden group"
                >
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-primary" />
                    Data Distribution
                  </h3>

                  <div className="flex items-center justify-center h-40">
                    <div className="relative w-32 h-32">
                      {dashboardData.chart_data.pie_chart.map((segment, index) => {
                        const prevPercentages =
                          index === 0
                            ? 0
                            : dashboardData.chart_data.pie_chart
                                .slice(0, index)
                                .reduce((sum, item) => sum + item.value, 0)

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.2 }}
                            className="absolute inset-0"
                            style={{
                              background: `conic-gradient(${segment.color} ${prevPercentages}% ${prevPercentages + segment.value}%, transparent ${prevPercentages + segment.value}% 100%)`,
                              borderRadius: "50%",
                            }}
                          />
                        )
                      })}
                      <div className="absolute inset-4 bg-card rounded-full flex items-center justify-center border border-border">
                        <span className="text-card-foreground text-sm font-medium">100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4 mt-2">
                    {dashboardData.chart_data.pie_chart.map((legend, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: legend.color }} />
                        <span className="text-muted-foreground text-xs">{legend.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>

                <motion.div
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border h-64 relative overflow-hidden group"
                >
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <LineChart className="w-5 h-5 mr-2 text-primary" />
                    Processing Trends
                  </h3>

                  <div className="h-40 flex items-center justify-center relative">
                    <svg className="w-full h-32" viewBox="0 0 300 100">
                      {/* Current week line */}
                      <motion.path
                        d={`M0,${100 - dashboardData.chart_data.line_chart.current[0]} ${dashboardData.chart_data.line_chart.current
                          .map((value, i) => `L${i * 60},${100 - value}`)
                          .join(" ")}`}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                      />

                      {/* Previous week line */}
                      <motion.path
                        d={`M0,${100 - dashboardData.chart_data.line_chart.previous[0]} ${dashboardData.chart_data.line_chart.previous
                          .map((value, i) => `L${i * 60},${100 - value}`)
                          .join(" ")}`}
                        fill="none"
                        stroke="#EC4899"
                        strokeWidth="3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                      />

                      {/* Animated dots for current week */}
                      {dashboardData.chart_data.line_chart.current.map((value, i) => (
                        <motion.circle
                          key={`current-${i}`}
                          cx={i * 60}
                          cy={100 - value}
                          r="4"
                          fill="hsl(var(--primary))"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 + 2 }}
                        />
                      ))}

                      {/* Animated dots for previous week */}
                      {dashboardData.chart_data.line_chart.previous.map((value, i) => (
                        <motion.circle
                          key={`previous-${i}`}
                          cx={i * 60}
                          cy={100 - value}
                          r="4"
                          fill="#EC4899"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 + 2.5 }}
                        />
                      ))}
                    </svg>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-primary mr-1" />
                      <span className="text-muted-foreground text-xs">This Week</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-pink-500 mr-1" />
                      <span className="text-muted-foreground text-xs">Last Week</span>
                    </div>
                  </div>

                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

