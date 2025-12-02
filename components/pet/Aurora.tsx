'use client'

import { useEffect, useRef } from 'react'

export default function Aurora() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    interface Wave {
      element: HTMLDivElement
      x: number
      y: number
      width: number
      height: number
      opacity: number
      targetOpacity: number
      speedX: number
      speedY: number
      life: number
      maxLife: number
    }

    const waves: Wave[] = []
    const maxWaves = 6

    const createWave = (): Wave => {
      const wave = document.createElement('div')
      wave.className = 'aurora-wave'
      
      const width = 300 + Math.random() * 400
      const height = 100 + Math.random() * 200
      const x = Math.random() * (window.innerWidth + width) - width
      const y = Math.random() * window.innerHeight

      wave.style.width = `${width}px`
      wave.style.height = `${height}px`
      wave.style.left = `${x}px`
      wave.style.top = `${y}px`
      wave.style.position = 'absolute'
      wave.style.borderRadius = '50%'
      wave.style.background = `radial-gradient(ellipse, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0))`
      wave.style.filter = 'blur(60px)'
      wave.style.opacity = '0'
      wave.style.transition = 'opacity 2s ease-in-out'

      container.appendChild(wave)

      return {
        element: wave,
        x,
        y,
        width,
        height,
        opacity: 0,
        targetOpacity: 0.2 + Math.random() * 0.3,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 4000 + Math.random() * 3000,
      }
    }

    for (let i = 0; i < maxWaves; i++) {
      setTimeout(() => {
        waves.push(createWave())
      }, i * 800)
    }

    let animationId: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i]
        
        wave.life += deltaTime

        if (wave.life < wave.maxLife * 0.15) {
          wave.opacity = (wave.life / (wave.maxLife * 0.15)) * wave.targetOpacity
        } else if (wave.life > wave.maxLife * 0.85) {
          const fadeOut = (wave.maxLife - wave.life) / (wave.maxLife * 0.15)
          wave.opacity = wave.targetOpacity * fadeOut
        } else {
          wave.opacity = wave.targetOpacity
        }

        wave.x += wave.speedX * (deltaTime / 16)
        wave.y += wave.speedY * (deltaTime / 16)

        if (wave.x < -wave.width) wave.x = window.innerWidth + wave.width
        if (wave.x > window.innerWidth + wave.width) wave.x = -wave.width
        if (wave.y < -wave.height) wave.y = window.innerHeight + wave.height
        if (wave.y > window.innerHeight + wave.height) wave.y = -wave.height

        wave.element.style.left = `${wave.x}px`
        wave.element.style.top = `${wave.y}px`
        wave.element.style.opacity = wave.opacity.toString()

        if (wave.life >= wave.maxLife) {
          container.removeChild(wave.element)
          waves.splice(i, 1)
          setTimeout(() => {
            waves.push(createWave())
          }, Math.random() * 3000)
          continue
        }
      }

      while (waves.length < maxWaves) {
        waves.push(createWave())
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      waves.forEach(wave => {
        if (wave.element.parentNode) {
          container.removeChild(wave.element)
        }
      })
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="aurora-background"
    />
  )
}
