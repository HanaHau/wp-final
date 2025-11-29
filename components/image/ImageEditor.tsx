'use client'

import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image, Line } from 'react-konva'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Undo2, Eraser, Paintbrush, Check } from 'lucide-react'
import Konva from 'konva'

interface ImageEditorProps {
  imageSrc: string
  onSave: (editedImageDataUrl: string) => void
  onCancel: () => void
  title?: string
}

type Tool = 'brush' | 'eraser'

export default function ImageEditor({ imageSrc, onSave, onCancel, title = 'Edit Image' }: ImageEditorProps) {
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(20)
  const [lines, setLines] = useState<Array<{ tool: Tool; points: number[]; brushSize: number }>>([])
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const stageRef = useRef<Konva.Stage>(null)
  const isDrawing = useRef(false)

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      setImage(img)
      // Calculate stage size to fit image while maintaining aspect ratio
      const maxWidth = 800
      const maxHeight = 600
      const aspectRatio = img.width / img.height
      
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        width = maxWidth
        height = width / aspectRatio
      }
      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }
      
      setStageSize({ width, height })
    }
  }, [imageSrc])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    isDrawing.current = true
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    setLines([
      ...lines,
      {
        tool,
        points: [pos.x, pos.y],
        brushSize,
      },
    ])
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current) return

    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point) return

    const lastLine = lines[lines.length - 1]
    if (!lastLine) return

    const newPoints = lastLine.points.concat([point.x, point.y])
    const newLines = [...lines]
    newLines[newLines.length - 1] = {
      ...lastLine,
      points: newPoints,
    }
    setLines(newLines)
  }

  const handleMouseUp = () => {
    isDrawing.current = false
  }

  const handleUndo = () => {
    setLines(lines.slice(0, -1))
  }

  const handleClear = () => {
    setLines([])
  }

  const applyMask = async (): Promise<string> => {
    if (!image || !stageRef.current) {
      throw new Error('Image or stage not ready')
    }

    return new Promise((resolve, reject) => {
      try {
        // Create a canvas for the mask
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = image.width
        maskCanvas.height = image.height
        const maskCtx = maskCanvas.getContext('2d')
        if (!maskCtx) {
          reject(new Error('Could not get mask context'))
          return
        }

        // Scale factor from stage to original image
        const scaleX = image.width / stageSize.width
        const scaleY = image.height / stageSize.height

        // Draw brush strokes as white (keep) and eraser strokes as black (remove)
        maskCtx.fillStyle = 'black' // Start with black (remove everything)
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)

        // Draw brush strokes (white = keep)
        maskCtx.strokeStyle = 'white'
        maskCtx.fillStyle = 'white'
        lines.forEach((line) => {
          if (line.tool === 'brush') {
            maskCtx.lineWidth = line.brushSize * Math.max(scaleX, scaleY)
            maskCtx.lineCap = 'round'
            maskCtx.lineJoin = 'round'
            maskCtx.beginPath()
            for (let i = 0; i < line.points.length - 2; i += 2) {
              const x = line.points[i] * scaleX
              const y = line.points[i + 1] * scaleY
              if (i === 0) {
                maskCtx.moveTo(x, y)
              } else {
                maskCtx.lineTo(x, y)
              }
            }
            maskCtx.stroke()
          } else if (line.tool === 'eraser') {
            // Eraser strokes are black (remove)
            maskCtx.strokeStyle = 'black'
            maskCtx.fillStyle = 'black'
            maskCtx.lineWidth = line.brushSize * Math.max(scaleX, scaleY)
            maskCtx.lineCap = 'round'
            maskCtx.lineJoin = 'round'
            maskCtx.beginPath()
            for (let i = 0; i < line.points.length - 2; i += 2) {
              const x = line.points[i] * scaleX
              const y = line.points[i + 1] * scaleY
              if (i === 0) {
                maskCtx.moveTo(x, y)
              } else {
                maskCtx.lineTo(x, y)
              }
            }
            maskCtx.stroke()
          }
        })

        // Create result canvas
        const resultCanvas = document.createElement('canvas')
        resultCanvas.width = image.width
        resultCanvas.height = image.height
        const resultCtx = resultCanvas.getContext('2d')
        if (!resultCtx) {
          reject(new Error('Could not get result context'))
          return
        }

        // Draw original image
        resultCtx.drawImage(image, 0, 0)

        // Apply mask: keep pixels where mask is white, make transparent where mask is black
        const imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height)
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

        for (let i = 0; i < imageData.data.length; i += 4) {
          const maskValue = maskData.data[i] // R, G, B are the same for grayscale
          if (maskValue < 128) {
            // Black in mask = transparent
            imageData.data[i + 3] = 0 // Alpha channel
          }
        }

        resultCtx.putImageData(imageData, 0, 0)

        // Convert to data URL
        const dataUrl = resultCanvas.toDataURL('image/png')
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleSave = async () => {
    try {
      const editedImage = await applyMask()
      onSave(editedImage)
    } catch (error) {
      console.error('Error applying mask:', error)
      alert('Failed to process image. Please try again.')
    }
  }

  if (!image) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-black/60">Loading image...</div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold uppercase tracking-wide">{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-black/60 mt-2">
          Use the brush to mark areas to keep, eraser to remove areas. Then click Save.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant={tool === 'brush' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('brush')}
              className="rounded-xl"
            >
              <Paintbrush className="h-4 w-4 mr-2" />
              Brush
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('eraser')}
              className="rounded-xl"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Eraser
            </Button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-black/60">Size:</label>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-black/60 w-8">{brushSize}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={lines.length === 0}
              className="rounded-xl"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={lines.length === 0}
              className="rounded-xl"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex items-center justify-center p-4 rounded-xl border border-black/20 bg-gray-50">
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => {
              const touch = e.evt.touches[0]
              const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
              })
              handleMouseDown({ target: { getStage: () => stageRef.current }, evt: mouseEvent } as any)
            }}
            onTouchMove={(e) => {
              e.evt.preventDefault()
              const touch = e.evt.touches[0]
              const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY,
              })
              handleMouseMove({ target: { getStage: () => stageRef.current }, evt: mouseEvent } as any)
            }}
            onTouchEnd={handleMouseUp}
            style={{ cursor: tool === 'brush' ? 'crosshair' : 'grab' }}
          >
            <Layer>
              <Image image={image} width={stageSize.width} height={stageSize.height} />
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.tool === 'brush' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'}
                  strokeWidth={line.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Instructions */}
        <div className="text-xs text-black/60 space-y-1">
          <p>• <span className="text-green-600">Green</span> = Areas to keep (brush)</p>
          <p>• <span className="text-red-600">Red</span> = Areas to remove (eraser)</p>
          <p>• Adjust brush size with the slider</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-black/20">
          <Button variant="outline" onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-xl bg-black text-white hover:bg-black/80">
            <Check className="h-4 w-4 mr-2" />
            Save & Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

