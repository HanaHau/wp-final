'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface CalculatorInputProps {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
}

export default function CalculatorInput({ value, onChange, onEnter }: CalculatorInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNumber = (num: string) => {
    if (value === '0' || value === '') {
      onChange(num)
    } else {
      onChange(value + num)
    }
  }

  const handleDecimal = () => {
    if (!value.includes('.')) {
      onChange(value + '.')
    }
  }

  const handleClear = () => {
    onChange('0')
  }

  const handleBackspace = () => {
    if (value.length > 1) {
      onChange(value.slice(0, -1))
    } else {
      onChange('0')
    }
  }

  // Handle keyboard events only when input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if the input is focused
      if (document.activeElement !== inputRef.current) {
        return
      }

      // Handle numbers 0-9
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        if (value === '0' || value === '') {
          onChange(e.key)
        } else {
          onChange(value + e.key)
        }
        return
      }

      // Handle decimal point
      if (e.key === '.' || e.key === ',') {
        e.preventDefault()
        if (!value.includes('.')) {
          onChange(value + '.')
        }
        return
      }

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (value.length > 1) {
          onChange(value.slice(0, -1))
        } else {
          onChange('0')
        }
        return
      }

      // Handle delete
      if (e.key === 'Delete') {
        e.preventDefault()
        onChange('0')
        return
      }

      // Handle Enter - blur the input instead of triggering submit
      if (e.key === 'Enter') {
        e.preventDefault()
        inputRef.current?.blur()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [value, onChange, onEnter])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // Handle focus and blur
  const handleFocus = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsFocused(true)
    setIsKeyboardVisible(true)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay blur to check if the next focus is within the keyboard area
    blurTimeoutRef.current = setTimeout(() => {
      const activeElement = document.activeElement
      // Check if the active element is within the keyboard container
      if (keyboardRef.current && activeElement && keyboardRef.current.contains(activeElement)) {
        // If clicking on keyboard buttons, keep it focused
        inputRef.current?.focus()
        return
      }
      // Otherwise, hide the keyboard with animation
      setIsFocused(false)
      // Delay hiding the keyboard to allow exit animation
      setTimeout(() => {
        setIsKeyboardVisible(false)
      }, 200) // Match animation duration
    }, 100)
  }

  // Focus the input when clicking on the display
  const handleDisplayClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      {/* Display - Clickable to focus */}
      <div 
        ref={containerRef}
        className={`border-2 border-black p-4 text-right cursor-text relative transition-all ${
          isFocused ? 'ring-2 ring-black ring-offset-2' : ''
        }`}
        onClick={handleDisplayClick}
      >
        {/* Hidden input for keyboard focus */}
        <input
          ref={inputRef}
          type="text"
          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          tabIndex={0}
          aria-label="Amount input"
          readOnly
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <div className="text-3xl font-bold pointer-events-none">{value || '0'}</div>
      </div>

      {/* Calculator buttons - Show with animation */}
      {isKeyboardVisible && (
        <div 
          ref={keyboardRef}
          className={`space-y-2 p-4 bg-white border-2 border-black rounded-md duration-200 ${
            isFocused 
              ? 'animate-in fade-in slide-in-from-top-2' 
              : 'animate-out fade-out slide-out-to-top-2'
          }`}
          style={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
          onMouseDown={(e) => {
            // Prevent blur when clicking on keyboard buttons
            e.preventDefault()
          }}
        >
        {/* Top row - Clear, Backspace, Decimal */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="border-2 border-black col-span-2"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleBackspace}
            className="border-2 border-black"
          >
            ⌫
          </Button>
        </div>

        {/* Numbers 1-9 in 3x3 grid */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              type="button"
              variant="outline"
              onClick={() => handleNumber(num.toString())}
              className="border-2 border-black"
            >
              {num}
            </Button>
          ))}
        </div>

        {/* Bottom row - 0 and decimal */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleNumber('0')}
            className="border-2 border-black"
          >
            0
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDecimal}
            className="border-2 border-black"
          >
            .
          </Button>
        </div>
        </div>
      )}
    </div>
  )
}

