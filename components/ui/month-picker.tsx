'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MonthPickerProps {
  selectedYear: number
  selectedMonth: number
  onSelect: (year: number, month: number) => void
  onClose: () => void
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthPicker({ selectedYear, selectedMonth, onSelect, onClose }: MonthPickerProps) {
  const [currentYear, setCurrentYear] = React.useState(selectedYear)

  const handleYearPrev = () => setCurrentYear(currentYear - 1)
  const handleYearNext = () => setCurrentYear(currentYear + 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <Card 
        className="border-2 border-black bg-white w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-4">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleYearPrev}
              className="border-2 border-black h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-bold uppercase">{currentYear}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleYearNext}
              className="border-2 border-black h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((month, index) => {
              const monthNum = index + 1
              const isSelected = currentYear === selectedYear && monthNum === selectedMonth
              return (
                <Button
                  key={month}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    onSelect(currentYear, monthNum)
                    onClose()
                  }}
                  className={cn(
                    "border-2 border-black",
                    isSelected && "bg-black text-white"
                  )}
                >
                  {month}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

