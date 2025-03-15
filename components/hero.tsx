"use client"
import { motion } from "framer-motion"
import type React from "react"

import { FloatingPaper } from "@/components/floating-paper"
import { RoboAnimation } from "@/components/robo-animation"
import { Database, Network, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function Hero() {
  const { user } = useAuth()

  return (
    <div className="relative min-h-[calc(100vh-76px)] flex flex-col items-center justify-center py-8">
      {/* Floating papers background */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingPaper count={6} />
      </div>

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              Unlock the Power of Your Data
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent font-medium mb-8"
            >
              Where AI meets insight, decisions meet success.
            </motion.p>
          </motion.div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
          {/* DataPuur Card */}
          <PlatformCard
            title="DataPuur Platform"
            description="Manage, transform, and analyze your data with our powerful data processing tools."
            icon={Database}
            href="/datapuur"
            color="from-primary via-secondary to-accent"
            features={[
              "Data ingestion from multiple sources",
              "Advanced transformation pipelines",
              "Interactive dashboards",
              "Export in various formats",
            ]}
            delay={0}
            requiresAuth={true}
            isLoggedIn={!!user}
          />

          {/* KGInsights Card */}
          <PlatformCard
            title="KGInsights Platform"
            description="Visualize and explore knowledge graphs with our advanced analytics tools."
            icon={Network}
            href="/kginsights"
            color="from-secondary via-primary to-accent"
            features={[
              "Interactive graph visualization",
              "Entity relationship analysis",
              "Pattern detection algorithms",
              "Custom graph configurations",
            ]}
            delay={0.2}
            requiresAuth={true}
            isLoggedIn={!!user}
          />
        </div>
      </div>

      {/* Animated robot - moved to the side to avoid overlapping with cards */}
      <div className="absolute bottom-0 right-0 w-72 h-72 md:w-96 md:h-96">
        <RoboAnimation />
      </div>
    </div>
  )
}

interface PlatformCardProps {
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  features: string[]
  delay: number
  requiresAuth: boolean
  isLoggedIn: boolean
}

function PlatformCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  features,
  delay,
  requiresAuth,
  isLoggedIn,
}: PlatformCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="bg-card/80 backdrop-blur-sm rounded-xl border border-border overflow-hidden group"
    >
      <div className="p-5">
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center mr-3`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-card-foreground">{title}</h3>
        </div>

        <p className="text-card-foreground mb-4">{description}</p>

        <ul className="space-y-1 mb-5">
          {features.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.1 + index * 0.1 }}
              className="flex items-start"
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 mr-2 bg-gradient-to-r ${color}`} />
              <span className="text-muted-foreground text-xs">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {requiresAuth && !isLoggedIn ? (
          <div className="flex flex-col space-y-2">
            <p className="text-amber-600 dark:text-amber-400 text-xs">Login required to access</p>
            <Link
              href="/login"
              className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-gradient-to-r ${color} text-white text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20`}
            >
              Sign In to Access
              <ArrowRight className="w-3 h-3 ml-1.5" />
            </Link>
          </div>
        ) : (
          <Link
            href={href}
            className={`inline-flex items-center justify-center w-full px-3 py-1.5 rounded-md bg-gradient-to-r ${color} text-white text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20`}
          >
            Explore Platform
            <ArrowRight className="w-3 h-3 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      {/* Animated border on hover */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-border to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </motion.div>
  )
}

