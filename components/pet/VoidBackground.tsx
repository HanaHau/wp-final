'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

// 隨機生成粒子數據
const generateParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100, // 0-100%
    y: Math.random() * 100, // 0-100%
    size: Math.random() * 3 + 1, // 1-4px
    duration: Math.random() * 5 + 3, // 3-8秒
    delay: Math.random() * 2,
    opacity: Math.random() * 0.5 + 0.2, // 0.2-0.7
  }))
}

export default function VoidBackground() {
  // 使用 useMemo 避免每次渲染都重新生成粒子
  // 增加粒子數量以營造更豐富的星空效果
  const particles = useMemo(() => generateParticles(60), [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* --- 層次 1: 背景虛空 (The Void) --- */}
      <div className="absolute inset-0 bg-[#050505]" />
      
      {/* 噪點遮罩層 - 使用 CSS 生成雜訊質感 */}
      <div 
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />


      {/* --- 層次 3: 漂浮粒子 (Star/Dust) --- */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: `0 0 ${p.size * 2}px white`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 額外的緩慢移動粒子 - 營造深度感 */}
      {particles.slice(0, 5).map((p) => (
        <motion.div
          key={`slow-${p.id}`}
          className="absolute rounded-full bg-white/30"
          style={{
            left: `${(p.x + 10) % 100}%`,
            top: `${(p.y + 15) % 100}%`,
            width: p.size * 1.5,
            height: p.size * 1.5,
            filter: 'blur(1px)',
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: p.duration * 2,
            repeat: Infinity,
            delay: p.delay * 1.5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
