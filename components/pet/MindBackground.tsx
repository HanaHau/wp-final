'use client'

import { useEffect, useRef } from 'react'

export default function MindBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    interface Blob {
      x: number
      y: number
      radius: number
      maxRadius: number
      opacity: number
      targetOpacity: number
      speedX: number
      speedY: number
      life: number
      maxLife: number
      pulseSpeed: number
    }

    const blobs: Blob[] = []
    const maxBlobs = 8

    const createBlob = (): Blob => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 0,
        maxRadius: 100 + Math.random() * 200,
        opacity: 0,
        targetOpacity: 0.3 + Math.random() * 0.4,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: 3000 + Math.random() * 4000,
        pulseSpeed: 0.001 + Math.random() * 0.002,
      }
    }

    for (let i = 0; i < maxBlobs; i++) {
      setTimeout(() => {
        blobs.push(createBlob())
      }, i * 500)
    }

    let animationId: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = blobs.length - 1; i >= 0; i--) {
        const blob = blobs[i]
        
        blob.life += deltaTime
        blob.x += blob.speedX * (deltaTime / 16)
        blob.y += blob.speedY * (deltaTime / 16)

        if (blob.life < blob.maxLife * 0.2) {
          blob.radius = (blob.life / (blob.maxLife * 0.2)) * blob.maxRadius
          blob.opacity = (blob.life / (blob.maxLife * 0.2)) * blob.targetOpacity
        } else if (blob.life > blob.maxLife * 0.8) {
          const fadeOut = (blob.maxLife - blob.life) / (blob.maxLife * 0.2)
          blob.opacity = blob.targetOpacity * fadeOut
        } else {
          const pulse = Math.sin(blob.life * blob.pulseSpeed) * 0.1 + 1
          blob.radius = blob.maxRadius * pulse
          blob.opacity = blob.targetOpacity
        }

        if (blob.life >= blob.maxLife) {
          blobs.splice(i, 1)
          setTimeout(() => {
            blobs.push(createBlob())
          }, Math.random() * 2000)
          continue
        }

        if (blob.x < -blob.maxRadius) blob.x = canvas.width + blob.maxRadius
        if (blob.x > canvas.width + blob.maxRadius) blob.x = -blob.maxRadius
        if (blob.y < -blob.maxRadius) blob.y = canvas.height + blob.maxRadius
        if (blob.y > canvas.height + blob.maxRadius) blob.y = -blob.maxRadius

        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${blob.opacity})`)
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${blob.opacity * 0.5})`)
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      while (blobs.length < maxBlobs) {
        blobs.push(createBlob())
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="mind-background">
      <canvas
        ref={canvasRef}
        className="mind-particles"
        style={{
          filter: 'blur(80px)',
        }}
      />
    </div>
  )
}
