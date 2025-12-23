'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PetChatBubbleProps {
  message: string
  position?: { x: number; y: number }
  petPosition?: { x: number; y: number }
  roomRef?: React.RefObject<HTMLDivElement>
  onClose?: () => void
  duration?: number
}

export default function PetChatBubble({
  message,
  position = { x: 0.5, y: 0.75 },
  petPosition,
  roomRef,
  onClose,
  duration = 15000,
}: PetChatBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null)

  const currentPetPos = petPosition || position

  useEffect(() => {
    const updateScreenPosition = () => {
      if (!roomRef?.current) return

      const roomRect = roomRef.current.getBoundingClientRect()
      
      // 計算寵物中心在螢幕上的位置
      const petScreenX = roomRect.left + currentPetPos.x * roomRect.width
      const petScreenY = roomRect.top + currentPetPos.y * roomRect.height
      
      // 氣泡在寵物上方，距離 120px
      const bubbleOffsetY = -120
      
      setScreenPosition({
        x: petScreenX,
        y: petScreenY + bubbleOffsetY,
      })
    }

    updateScreenPosition()

    if (petPosition) {
      const animationFrame = requestAnimationFrame(updateScreenPosition)
      return () => cancelAnimationFrame(animationFrame)
    }
  }, [currentPetPos, roomRef, petPosition])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onClose) {
          setTimeout(onClose, 300)
        }
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!screenPosition) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed z-40 pointer-events-none"
          style={{
            left: `${screenPosition.x}px`,
            top: `${screenPosition.y}px`,
            // 使用 translate(-50%, -100%) 將氣泡置中於寵物正上方
            // -50% 水平置中，-100% 垂直方向使氣泡底部對齊 bubbleOffsetY 位置
            transform: 'translate(-50%, -100%)',
            transition: petPosition 
              ? 'left 0.1s ease-out, top 0.1s ease-out'
              : undefined,
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-black/20 px-4 py-3 shadow-xl max-w-[250px]">
            <div className="text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
              {message}
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
