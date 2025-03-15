"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import DataPuurSidebar from "@/components/datapuur-sidebar"
import { Download, Clock, FileDown } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"

export default function DataPuurPage() {
  return (
    <ProtectedRoute requiredRole="researcher">
      <DataPuurContent />
    </ProtectedRoute>
  )
}

function DataPuurContent() {
  const router = useRouter()

  const cards = [
    {
      title: "Data Dashboard",
      description: "View and monitor your data processing activities.",
      icon: LayoutDashboard,
      href: "/datapuur/dashboard",
      color: "from-primary to-primary/70",
    },
    {
      title: "Data Ingestion",
      description: "Import and collect data from various sources.",
      icon: FileDown,
      href: "/datapuur/ingestion",
      color: "from-secondary to-secondary/70",
    },
    {
      title: "Data Transformation",
      description: "Transform and clean your data for analysis.",
      icon: Clock,
      href: "/datapuur/transformation",
      color: "from-primary/80 to-secondary/80",
    },
    {
      title: "Data Export",
      description: "Export your processed data in various formats.",
      icon: Download,
      href: "/datapuur/export",
      color: "from-secondary/90 to-primary/90",
    },
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
            <div className="max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold text-foreground mb-6"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  DataPuur
                </span>{" "}
                Platform
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Manage, transform, and analyze your data with our powerful data processing tools.
              </motion.p>

              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {cards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    variants={item}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(card.href)}
                    className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border cursor-pointer overflow-hidden relative group"
                  >
                    {/* Animated gradient background on hover */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-in-out ${card.color}`}
                    />

                    {/* Icon with pulse effect */}
                    <div className="relative">
                      <card.icon className="w-10 h-10 text-primary mb-4 relative z-10" />
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-primary/20 z-0"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "reverse",
                        }}
                      />
                    </div>

                    <h3 className="text-xl font-semibold text-foreground mb-2 relative z-10">{card.title}</h3>
                    <p className="text-muted-foreground relative z-10">{card.description}</p>

                    {/* Animated arrow */}
                    <motion.div
                      className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      }}
                    >
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// Import the icons
import { LayoutDashboard } from "lucide-react"

