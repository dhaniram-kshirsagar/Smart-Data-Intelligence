"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BarChart, Users, Activity, Shield, Settings, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useAdminLogout } from "@/components/admin-logout-fix"
import { fetchAdminData } from "@/lib/admin/api"
import { AdminTabs } from "@/components/admin/tabs"
import { NotificationDisplay } from "@/components/admin/notification"
import { useAdminStore } from "@/lib/admin/store"
import LoadingSpinner from "@/components/loading-spinner"

export default function AdminDashboard() {
  const { user } = useAuth()
  const logout = useAdminLogout()
  const [activeTab, setActiveTab] = useState("dashboard")
  const {
    loading,
    setLoading,
    error,
    setError,
    notification,
    setNotification,
    stats,
    setStats,
    users,
    setUsers,
    activity,
    setActivity,
    systemSettings,
    setSystemSettings,
    addRoleIfNotExists,
  } = useAdminStore()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await fetchAdminData()

        // Ensure we have valid data before setting state
        if (data) {
          setStats(data.stats || {})
          setUsers(data.users || [])
          setActivity(data.activity || [])
          setSystemSettings(data.systemSettings || {})

          // Ensure all roles from users are in our roles list
          if (data.users && data.users.length > 0) {
            data.users.forEach((user) => {
              if (user.role) {
                addRoleIfNotExists(user.role)
              }
            })
          }
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching admin data:", err)
        setError("Failed to load admin data. Using mock data instead.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart },
    { id: "users", label: "Users", icon: Users },
    { id: "activity", label: "Activity Log", icon: Activity },
    { id: "permissions", label: "Permissions", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ]

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

  return (
    <div className="min-h-screen bg-background antialiased relative overflow-hidden">
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

      <div className="relative z-10 pt-20 px-6 md:px-8">
        {/* Back button - aligned with the dashboard content */}
        <div className="max-w-7xl mx-auto relative">
          <Link
            href="/"
            className="absolute -top-12 left-0 z-20 flex items-center justify-center rounded-md bg-card/80 backdrop-blur-sm border border-border hover:bg-accent transition-colors duration-200 px-3 py-2 text-sm"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 text-foreground mr-2" />
            <span className="text-foreground">Back to Home</span>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
            >
              Admin Dashboard
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center"
            >
              <div className="px-4 py-2 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                <span className="text-foreground font-medium">
                  Welcome, <span className="text-primary font-bold">{user?.username}</span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Notification */}
          {notification && <NotificationDisplay notification={notification} />}

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="bg-card/80 backdrop-blur-sm rounded-lg border border-border overflow-hidden shadow-md"
          >
            <div className="flex border-b border-border overflow-x-auto">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  variants={item}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-primary-foreground bg-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>

            <div className="p-6">
              {loading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              )}
              {!loading && <AdminTabs activeTab={activeTab} loading={loading} error={error} />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

import { SparklesCore } from "@/components/sparkles"

