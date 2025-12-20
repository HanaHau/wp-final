'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (message.trim() && !disabled && !isComposing) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send if user is composing (input method editor is active)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 bg-white/95 backdrop-blur-sm rounded-2xl border border-black/20 px-4 py-3 shadow-lg w-full"
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="Chat with me or record new transactions..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none border-none outline-none bg-transparent text-sm text-black placeholder:text-black/40 focus:ring-0 p-0 max-h-[120px] overflow-y-auto"
        style={{ minHeight: '20px' }}
      />
      <Button
        type="submit"
        disabled={!message.trim() || disabled}
        size="icon"
        className="w-8 h-8 rounded-full bg-black text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}

