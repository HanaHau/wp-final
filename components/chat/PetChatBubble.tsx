'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PetChatBubbleProps {
  message: string
  position?: { x: number; y: number }
  onClose?: () => void
  duration?: number
}

export default function PetChatBubble({
  message,
  position = { x: 50, y: 50 },
  onClose,
  duration = 15000, // Default 15 seconds for better readability
}: PetChatBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onClose) {
          setTimeout(onClose, 300) // Wait for animation to complete
        }
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-black/20 px-4 py-3 shadow-xl max-w-[250px]">
            <div className="text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
              {message}
            </div>
            {/* Small triangle pointing down */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

