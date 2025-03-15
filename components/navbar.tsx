"use client"

import { Button } from "@/components/ui/button"
import { Menu, User, LogOut, Settings, Sun, Moon } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { useState } from "react"
import Image from "next/image"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b border-white/10 dark:border-white/10 border-black/10"
    >
      <Link href="/" className="flex items-center space-x-3 group">
        <motion.div
          className="relative w-12 h-12"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onHoverStart={() => setIsLogoHovered(true)}
          onHoverEnd={() => setIsLogoHovered(false)}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/20 z-0"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isLogoHovered ? 1.2 : 0,
              opacity: isLogoHovered ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            animate={{
              rotate: isLogoHovered ? [0, 10, -10, 0] : 0,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              times: [0, 0.2, 0.8, 1],
            }}
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/no_bg_logo-M7cBq60PCuZ1sN7MH6T2WMZRrdyQMZ.png"
              alt="RSW Logo"
              width={48}
              height={48}
              className="object-contain relative z-10"
            />
          </motion.div>
        </motion.div>
        <div className="flex flex-col">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent font-bold text-xl md:text-2xl">
            Cognitive Data Expert
          </span>
        </div>
      </Link>

      <div className="hidden md:flex items-center space-x-8">{/* Admin button moved next to user info */}</div>

      <div className="flex items-center space-x-4">
        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-foreground hover:text-purple-400"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {user ? (
          <>
            <div className="text-foreground">
              {user.username === "admin" && user.role === "admin" ? (
                <span className="text-xs bg-purple-500 px-2 py-1 rounded-full">admin</span>
              ) : (
                <>
                  <span className="font-medium">{user.username}</span>
                  <span className="ml-2 text-xs bg-purple-500 px-2 py-1 rounded-full">{user.role}</span>
                </>
              )}
            </div>
            <Button variant="ghost" className="text-foreground hover:text-purple-400" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-r from-primary to-secondary text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-white font-medium border border-primary/30 shadow-[0_0_15px_rgba(26,35,126,0.3)] transition-all duration-300 hover:scale-105"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          </>
        )}
      </div>

      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/90 backdrop-blur-sm border-b border-black/10 dark:border-white/10 z-50">
          <div className="flex flex-col p-4 space-y-4">
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              {user ? (
                <>
                  <div className="text-foreground mb-2">
                    {user.username === "admin" && user.role === "admin" ? (
                      <span className="text-xs bg-purple-500 px-2 py-1 rounded-full">admin</span>
                    ) : (
                      <>
                        <span className="font-medium">{user.username}</span>
                        <span className="ml-2 text-xs bg-purple-500 px-2 py-1 rounded-full">{user.role}</span>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      className="text-foreground hover:text-purple-400 flex-1 justify-start"
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] w-full"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gray-300 hover:text-foreground transition-colors relative group">
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
    </Link>
  )
}

