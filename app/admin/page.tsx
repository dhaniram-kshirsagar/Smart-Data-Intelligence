"use client"

import { SparklesCore } from "@/components/sparkles"
import Navbar from "@/components/navbar"
import AdminDashboard from "@/components/admin/dashboard"
import ProtectedRoute from "@/components/protected-route"

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
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
          <AdminDashboard />
        </div>
      </main>
    </ProtectedRoute>
  )
}

