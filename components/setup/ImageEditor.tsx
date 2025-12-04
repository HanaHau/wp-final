'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Brush, Eraser, RotateCcw, Check, X } from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onSave: (editedImageUrl: string) => void
  onCancel: () => void
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      initializeCanvas(img)
    }
    img.src = imageUrl
  }, [imageUrl])

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return

    // Set canvas size to fit image - using larger max size
    const maxWidth = 800
    const maxHeight = 600
    let width = img.width
    let height = img.height

    // Always scale down if image is larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = width * ratio
      height = height * ratio
    }

    canvas.width = width
    canvas.height = height
    maskCanvas.width = width
    maskCanvas.height = height

    // Draw image on main canvas
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
    }

    // Initialize mask canvas with transparent background
    const maskCtx = maskCanvas.getContext('2d')
    if (maskCtx) {
      maskCtx.clearRect(0, 0, width, height)
      maskCtx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      maskCtx.fillRect(0, 0, width, height)
    }
  }

  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const pos = getMousePos(maskCanvas, e)
    const ctx = maskCanvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const pos = getMousePos(maskCanvas, e)
    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brushSize

    if (tool === 'brush') {
      // Erase mask to reveal image (destination-out)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
    } else {
      // Draw mask to hide image
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
    }

    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const resetMask = () => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext('2d')
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas || !image) return

    // Create a new canvas for the final result
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = canvas.width
    resultCanvas.height = canvas.height
    const resultCtx = resultCanvas.getContext('2d')
    if (!resultCtx) return

    // Draw the original image
    resultCtx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // Get mask data
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const imageData = resultCtx.getImageData(0, 0, canvas.width, canvas.height)

    // Apply mask to make pixels transparent where mask is dark
    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i + 3]
      // If mask is opaque (dark area), make image transparent
      if (alpha > 128) {
        imageData.data[i + 3] = 0
      }
    }

    resultCtx.putImageData(imageData, 0, 0)

    // Convert to data URL
    const editedImageUrl = resultCanvas.toDataURL('image/png')
    onSave(editedImageUrl)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg border-2 border-black max-w-6xl w-full my-auto">
        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-wide">選擇寵物區域</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="border-2 border-black"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-black/60">
            使用畫筆塗選您想要保留的寵物區域，其他部分將被移除。
          </p>

          {/* Tools */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant={tool === 'brush' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('brush')}
                className="border-2 border-black"
              >
                <Brush className="h-4 w-4 mr-2" />
                畫筆
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('eraser')}
                className="border-2 border-black"
              >
                <Eraser className="h-4 w-4 mr-2" />
                橡皮擦
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetMask}
                className="border-2 border-black"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <span className="text-sm font-medium whitespace-nowrap">筆刷大小:</span>
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={5}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-black/60 w-8 text-right">{brushSize}</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative bg-gray-100 rounded-lg border-2 border-black overflow-auto" style={{ maxHeight: '55vh' }}>
            <div className="flex items-center justify-center p-4">
              <div className="relative inline-block" style={{ touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  className="block max-w-full h-auto"
                  style={{ imageRendering: 'auto' }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>
          </div>
          
          <p className="text-xs text-black/40 text-center">
            💡 提示：畫筆會顯示要保留的區域，未塗選的部分將變透明
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-2 border-black"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="border-2 border-black"
            >
              <Check className="h-4 w-4 mr-2" />
              確認選擇
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

