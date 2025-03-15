"use client"

import { useEffect, useRef, useState } from "react"
import { useMousePosition } from "@/lib/hooks/use-mouse-position"
import { useTheme } from "@/lib/theme-context"

interface SparklesProps {
  id?: string
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  className?: string
  particleColor?: string
}

export const SparklesCore = ({
  id = "tsparticles",
  background = "transparent",
  minSize = 0.6,
  maxSize = 1.4,
  particleDensity = 100,
  className = "h-full w-full",
  particleColor = "#FFFFFF",
}: SparklesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePosition = useMousePosition()
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const { theme } = useTheme()

  // Enhanced sparkles color logic for professional dark mode
  const effectiveParticleColor =
    particleColor === "#FFFFFF" || particleColor === "var(--foreground)"
      ? theme === "dark"
        ? "rgba(255, 255, 255, 0.7)" // Slightly transparent white for dark mode
        : "#212121" // Dark gray for light mode
      : particleColor

  useEffect(() => {
    if (typeof window === "undefined") return

    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let particles: Particle[] = []
    let animationFrameId: number

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      fadeDirection: "in" | "out"

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * (maxSize - minSize) + minSize
        this.speedX = Math.random() * 0.5 - 0.25
        this.speedY = Math.random() * 0.5 - 0.25
        this.opacity = Math.random() * 0.5 + 0.2 // Start with random opacity
        this.fadeDirection = Math.random() > 0.5 ? "in" : "out"
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > canvas.width) this.x = 0
        if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        if (this.y < 0) this.y = canvas.height

        // Fade in and out effect
        if (this.fadeDirection === "in") {
          this.opacity += 0.005
          if (this.opacity >= 0.7) {
            this.fadeDirection = "out"
          }
        } else {
          this.opacity -= 0.005
          if (this.opacity <= 0.2) {
            this.fadeDirection = "in"
          }
        }

        // Mouse interaction - enhanced for professional look
        const dx = mousePosition.x - this.x
        const dy = mousePosition.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 120) {
          // Increased interaction radius
          const angle = Math.atan2(dy, dx)
          const force = (120 - distance) / 120 // Stronger force when closer
          this.x -= Math.cos(angle) * force * 1.5
          this.y -= Math.sin(angle) * force * 1.5
          this.opacity = Math.min(0.9, this.opacity + 0.1) // Brighten particles near mouse
        }
      }

      draw() {
        if (!ctx) return
        // Use rgba to apply opacity
        const color = effectiveParticleColor.startsWith("#")
          ? hexToRgba(effectiveParticleColor, this.opacity)
          : effectiveParticleColor.replace(")", `, ${this.opacity})`).replace("rgb", "rgba")

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Helper function to convert hex to rgba
    const hexToRgba = (hex: string, opacity: number): string => {
      const r = Number.parseInt(hex.slice(1, 3), 16)
      const g = Number.parseInt(hex.slice(3, 5), 16)
      const b = Number.parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }

    const init = () => {
      particles = []
      for (let i = 0; i < particleDensity; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.update()
        particle.draw()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    init()
    animate()

    const handleResize = () => {
      if (typeof window === "undefined") return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
      init()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [maxSize, minSize, effectiveParticleColor, particleDensity, mousePosition.x, mousePosition.y])

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{
        background,
        width: dimensions.width,
        height: dimensions.height,
      }}
    />
  )
}

