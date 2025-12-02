'use client'

import { useEffect, useState, useRef } from 'react'

interface TrailElement {
  id: number
  x: number
  y: number
  color: string
  size: number
}

export default function NeuralCursorTrail() {
  const [trails, setTrails] = useState<TrailElement[]>([])
  const trailIdRef = useRef(0)
  const maxTrails = 40

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Random offset for more organic feel
      const offsetX = (Math.random() - 0.5) * 20
      const offsetY = (Math.random() - 0.5) * 20

      // Random color from neon palette
      const colors = [
        'rgba(138, 43, 226, 0.8)',  // Neon purple
        'rgba(0, 255, 255, 0.7)',    // Neon cyan
        'rgba(0, 150, 255, 0.8)',    // Neon blue
        'rgba(255, 0, 255, 0.6)',    // Magenta accent
      ]
      const color = colors[Math.floor(Math.random() * colors.length)]

      // Random size variation
      const size = 4 + Math.random() * 6

      const newTrail: TrailElement = {
        id: trailIdRef.current++,
        x: e.clientX + offsetX,
        y: e.clientY + offsetY,
        color,
        size,
      }

      setTrails((prev) => {
        const updated = [...prev, newTrail]
        // Limit to maxTrails, remove oldest if exceeded
        return updated.slice(-maxTrails)
      })

      // Auto-remove after animation completes
      setTimeout(() => {
        setTrails((prev) => prev.filter((trail) => trail.id !== newTrail.id))
      }, 800) // Match animation duration
    }

    // Throttle mousemove for better performance
    let rafId: number | null = null
    const throttledHandleMouseMove = (e: MouseEvent) => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          handleMouseMove(e)
          rafId = null
        })
      }
    }

    window.addEventListener('mousemove', throttledHandleMouseMove)

    return () => {
      window.removeEventListener('mousemove', throttledHandleMouseMove)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  return (
    <div className="neural-cursor-trail" style={{ pointerEvents: 'none' }}>
      {trails.map((trail) => (
        <div
          key={trail.id}
          className="neural-trail-element"
          style={{
            left: `${trail.x}px`,
            top: `${trail.y}px`,
            width: `${trail.size}px`,
            height: `${trail.size}px`,
            backgroundColor: trail.color,
            boxShadow: `0 0 ${trail.size * 2}px ${trail.color}, 0 0 ${trail.size * 4}px ${trail.color}`,
          }}
        />
      ))}
    </div>
  )
}


