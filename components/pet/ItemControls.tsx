'use client'

import { RotateCw, Maximize2, Package } from 'lucide-react'

interface ItemControlsProps {
  position: { x: number; y: number }
  onRotate: () => void
  onScale: () => void
  onDelete: () => void
}

export default function ItemControls({
  position,
  onRotate,
  onScale,
  onDelete,
}: ItemControlsProps) {
  return (
    <div
      data-item-controls
      className="absolute z-50 flex gap-1 animate-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -120%)',
      }}
    >
      {/* Rotate */}
      <button
        onClick={onRotate}
        className="p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-lg"
        title="Rotate"
        aria-label="Rotate item"
      >
        <RotateCw className="h-4 w-4" />
      </button>

      {/* Scale */}
      <button
        onClick={onScale}
        className="p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-lg"
        title="Scale"
        aria-label="Scale item"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* Delete - 放回倉庫 */}
      <button
        onClick={onDelete}
        className="p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-lg"
        title="Return to warehouse"
        aria-label="Return to warehouse"
      >
        <Package className="h-4 w-4" />
      </button>
    </div>
  )
}
