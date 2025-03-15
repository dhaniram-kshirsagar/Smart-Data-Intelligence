"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import DataPuurSidebar from "@/components/datapuur-sidebar"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Wand2, Plus } from "lucide-react"

export default function TransformationPage() {
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
                Data Transformation
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Transform and clean your data for analysis.
              </motion.p>

              <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border mb-8 shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <Wand2 className="w-6 h-6 text-primary mr-2" />
                    Transformation Pipelines
                  </h3>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-secondary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Customer Data Pipeline</h4>
                        <p className="text-muted-foreground text-sm">Last run: 2 hours ago</p>
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Run</Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-secondary/5 to-primary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Product Data Pipeline</h4>
                        <p className="text-muted-foreground text-sm">Last run: 1 day ago</p>
                      </div>
                      <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Run</Button>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4">Create New Transformation</h3>
                  <p className="text-muted-foreground mb-4">Design a new data transformation pipeline</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pipeline
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

