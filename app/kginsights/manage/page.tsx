"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import KGInsightsSidebar from "@/components/kginsights-sidebar"
import { Button } from "@/components/ui/button"
import { Settings, Plus, Trash, Edit } from "lucide-react"
import { motion } from "framer-motion"
import ProtectedRoute from "@/components/protected-route"

export default function ManageKGraphPage() {
  return (
    <ProtectedRoute requiredPermission="kginsights:manage">
      <ManageKGraphContent />
    </ProtectedRoute>
  )
}

function ManageKGraphContent() {
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
          <KGInsightsSidebar />

          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold text-foreground mb-6"
              >
                Manage KGraph
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Configure and manage your knowledge graph settings.
              </motion.p>

              <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border mb-8 shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <Settings className="w-6 h-6 text-primary mr-2" />
                    Graph Settings
                  </h3>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-secondary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Graph Appearance</h4>
                        <p className="text-muted-foreground text-sm">Customize colors, node sizes, and edge styles</p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 flex items-center"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-secondary/5 to-primary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Data Sources</h4>
                        <p className="text-muted-foreground text-sm">Manage data sources for the knowledge graph</p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-secondary text-secondary hover:bg-secondary/10 flex items-center"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-foreground flex items-center">
                      <Plus className="w-6 h-6 text-primary mr-2" />
                      Graph Entities
                    </h3>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Entity
                      </Button>
                    </motion.div>
                  </div>

                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Person</h4>
                        <p className="text-muted-foreground text-sm">125 instances</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/20"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-secondary/5 to-transparent"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Organization</h4>
                        <p className="text-muted-foreground text-sm">87 instances</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="border-secondary text-secondary hover:bg-secondary/10 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/20"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-secondary/5"
                    >
                      <div>
                        <h4 className="text-foreground font-medium">Location</h4>
                        <p className="text-muted-foreground text-sm">56 instances</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/20"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
