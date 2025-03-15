"use client"

import { CheckCircle, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

interface NotificationProps {
  notification: {
    type: "success" | "error"
    message: string
  }
}

export function NotificationDisplay({ notification }: NotificationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`mb-4 p-3 rounded-md flex items-center backdrop-blur-sm border ${
        notification.type === "success"
          ? "bg-primary/10 border-primary text-primary"
          : "bg-destructive/10 border-destructive text-destructive"
      }`}
    >
      {notification.type === "success" ? (
        <CheckCircle className="h-5 w-5 mr-2" />
      ) : (
        <AlertCircle className="h-5 w-5 mr-2" />
      )}
      <p>{notification.message}</p>
    </motion.div>
  )
}

