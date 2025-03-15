"use client"

import { motion } from "framer-motion"

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(26,35,126,0.3)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
      <p className="mt-4 text-foreground">Loading data...</p>
    </div>
  )
}

