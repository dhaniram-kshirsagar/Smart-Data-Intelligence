"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import KGInsightsSidebar from "@/components/kginsights-sidebar"
import { motion } from "framer-motion"
import { Network } from "lucide-react"
import { useEffect, useState } from "react"
import { type KGraphDashboard, getKGraphDashboard } from "@/lib/api"
import LoadingSpinner from "@/components/loading-spinner"
import ProtectedRoute from "@/components/protected-route"

export default function KGraphDashboardPage() {
  return (
    <ProtectedRoute requiredPermission="kginsights:read">
      <KGraphDashboardContent />
    </ProtectedRoute>
  )
}

function KGraphDashboardContent() {
  const [dashboardData, setDashboardData] = useState<KGraphDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await getKGraphDashboard()
        console.log("Successfully fetched KGraph dashboard data:", data)
        setDashboardData(data as KGraphDashboard)
        setError(null)
      } catch (err) {
        console.error("Error fetching KGraph dashboard data:", err)
        setError("Failed to load KGraph dashboard data. Using fallback data.")
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
            <KGInsightsSidebar />

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
            <KGInsightsSidebar />

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
          <KGInsightsSidebar />

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
                KGraph Dashboard
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Visualize and explore your knowledge graphs.
              </motion.p>

              <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <motion.div
                  variants={item}
                  whileHover={{ scale: 1.01 }}
                  className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border h-96 mb-8 relative overflow-hidden group"
                >
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Network className="w-5 h-5 mr-2 text-primary" />
                    Knowledge Graph Visualization
                  </h3>

                  <div className="h-80 relative">
                    <svg width="100%" height="100%" viewBox="0 0 400 300">
                      {/* Draw edges first so they appear behind nodes */}
                      {dashboardData.graph.edges.map((edge, index) => {
                        const fromNode = dashboardData.graph.nodes.find((n) => n.id === edge.from_node)
                        const toNode = dashboardData.graph.nodes.find((n) => n.id === edge.to_node)

                        if (!fromNode || !toNode) return null

                        const midX = (fromNode.x + toNode.x) / 2
                        const midY = (fromNode.y + toNode.y) / 2 - 10 // Offset for label

                        return (
                          <g key={`edge-${index}`}>
                            <motion.line
                              x1={fromNode.x}
                              y1={fromNode.y}
                              x2={toNode.x}
                              y2={toNode.y}
                              stroke="rgba(var(--foreground), 0.3)"
                              strokeWidth="1"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                            />
                            <motion.text
                              x={midX}
                              y={midY}
                              textAnchor="middle"
                              fill="rgba(var(--foreground), 0.5)"
                              fontSize="8"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
                            >
                              {edge.label}
                            </motion.text>
                          </g>
                        )
                      })}

                      {/* Draw nodes */}
                      {dashboardData.graph.nodes.map((node, index) => (
                        <g key={`node-${node.id}`}>
                          <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="15"
                            fill={node.color}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 260,
                              damping: 20,
                              delay: 0.2 * index,
                            }}
                            whileHover={{ scale: 1.2 }}
                          />
                          <motion.text
                            x={node.x}
                            y={node.y + 25}
                            textAnchor="middle"
                            fill="var(--foreground)"
                            fontSize="10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 + 0.2 * index }}
                          >
                            {node.label}
                          </motion.text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border relative overflow-hidden group"
                  >
                    <h3 className="text-xl font-semibold text-card-foreground mb-4">Graph Metrics</h3>
                    <div className="space-y-4 mt-4">
                      {[
                        { label: "Total Nodes", value: dashboardData.metrics.total_nodes.toLocaleString(), delay: 0.1 },
                        { label: "Total Edges", value: dashboardData.metrics.total_edges.toLocaleString(), delay: 0.2 },
                        { label: "Density", value: dashboardData.metrics.density.toFixed(2), delay: 0.3 },
                        { label: "Average Degree", value: dashboardData.metrics.avg_degree.toFixed(1), delay: 0.4 },
                      ].map((metric, index) => (
                        <motion.div
                          key={index}
                          className="flex justify-between"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: metric.delay + 1 }}
                        >
                          <span className="text-muted-foreground">{metric.label}</span>
                          <motion.span
                            className="text-card-foreground font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: metric.delay + 1.2 }}
                          >
                            {metric.value}
                          </motion.span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>

                  <motion.div
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    className="bg-card backdrop-blur-sm p-6 rounded-lg border border-border relative overflow-hidden group"
                  >
                    <h3 className="text-xl font-semibold text-card-foreground mb-4">Recent Updates</h3>
                    <div className="space-y-4 mt-4">
                      {dashboardData.updates.map((update, index) => (
                        <motion.div
                          key={index}
                          className="p-2 border-b border-border"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index + 1 }}
                        >
                          <p className="text-card-foreground">{update.action}</p>
                          <p className="text-muted-foreground text-sm">{update.time}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
