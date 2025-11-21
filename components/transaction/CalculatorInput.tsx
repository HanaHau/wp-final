'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CalculatorInputProps {
  value: string
  onChange: (value: string) => void
}

export default function CalculatorInput({ value, onChange }: CalculatorInputProps) {
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

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="border-2 border-black p-4 text-right">
        <div className="text-3xl font-bold">{value || '0'}</div>
      </div>

      {/* Calculator buttons */}
      <div className="space-y-2">
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
    </div>
  )
}

