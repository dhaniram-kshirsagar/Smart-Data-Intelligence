"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import DataPuurSidebar from "@/components/datapuur-sidebar"
import { Button } from "@/components/ui/button"
import { FileDown, Clock, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export default function ExportPage() {
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
                Data Export
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Export your processed data in various formats.
              </motion.p>

              <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border mb-8 shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <FileDown className="w-6 h-6 text-primary mr-2" />
                    Available Exports
                  </h3>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-secondary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Customer Data</h4>
                        <p className="text-muted-foreground text-sm">Last updated: Today at 10:30 AM</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                          CSV
                        </Button>
                        <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                          JSON
                        </Button>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-secondary/5 to-primary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Product Analytics</h4>
                        <p className="text-muted-foreground text-sm">Last updated: Yesterday at 4:15 PM</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                          Excel
                        </Button>
                        <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                          PDF
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <Calendar className="w-6 h-6 text-primary mr-2" />
                    Schedule Exports
                  </h3>
                  <p className="text-muted-foreground mb-4">Set up automated data exports</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      Configure Schedule
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

