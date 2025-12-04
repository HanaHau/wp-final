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

    // Get mask data
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

    // Find bounding box of selected area (non-transparent pixels)
    let minX = maskCanvas.width
    let minY = maskCanvas.height
    let maxX = 0
    let maxY = 0
    let hasSelection = false

    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const index = (y * maskCanvas.width + x) * 4
        const alpha = maskData.data[index + 3]
        // If mask is transparent or semi-transparent (selected area), check bounds
        if (alpha <= 128) {
          hasSelection = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    // If no selection found, use full canvas
    if (!hasSelection) {
      minX = 0
      minY = 0
      maxX = maskCanvas.width
      maxY = maskCanvas.height
    }

    // Calculate selected area dimensions
    const selectedWidth = maxX - minX
    const selectedHeight = maxY - minY

    // Create a temporary canvas to extract the selected region
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = selectedWidth
    tempCanvas.height = selectedHeight
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // Get the image data from the main canvas (which already has the scaled image)
    const canvasCtx = canvas.getContext('2d')
    if (!canvasCtx) return
    const canvasImageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height)

    // Extract the selected region and apply mask
    const tempImageData = tempCtx.createImageData(selectedWidth, selectedHeight)
    for (let y = 0; y < selectedHeight; y++) {
      for (let x = 0; x < selectedWidth; x++) {
        const canvasX = minX + x
        const canvasY = minY + y
        const canvasIndex = (canvasY * canvas.width + canvasX) * 4
        const tempIndex = (y * selectedWidth + x) * 4
        
        // Copy pixel data from canvas
        tempImageData.data[tempIndex] = canvasImageData.data[canvasIndex]
        tempImageData.data[tempIndex + 1] = canvasImageData.data[canvasIndex + 1]
        tempImageData.data[tempIndex + 2] = canvasImageData.data[canvasIndex + 2]
        
        // Apply mask: if mask is opaque (dark area), make transparent
        const maskX = minX + x
        const maskY = minY + y
        const maskIndex = (maskY * maskCanvas.width + maskX) * 4
        const maskAlpha = maskData.data[maskIndex + 3]
        
        if (maskAlpha > 128) {
          tempImageData.data[tempIndex + 3] = 0 // Make transparent
        } else {
          tempImageData.data[tempIndex + 3] = canvasImageData.data[canvasIndex + 3] // Keep original alpha
        }
      }
    }
    tempCtx.putImageData(tempImageData, 0, 0)

    // Create final canvas with selected area centered
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = canvas.width
    resultCanvas.height = canvas.height
    const resultCtx = resultCanvas.getContext('2d')
    if (!resultCtx) return

    // Clear canvas with transparent background
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height)

    // Calculate appropriate size for the selected area
    // Target: selected area should be at least 40% of canvas size, but not exceed 90%
    const minSizeRatio = 0.4
    const maxSizeRatio = 0.9
    const targetWidth = Math.max(
      canvas.width * minSizeRatio,
      Math.min(selectedWidth, canvas.width * maxSizeRatio)
    )
    const targetHeight = Math.max(
      canvas.height * minSizeRatio,
      Math.min(selectedHeight, canvas.height * maxSizeRatio)
    )

    // Calculate scale factor while maintaining aspect ratio
    const scaleX = targetWidth / selectedWidth
    const scaleY = targetHeight / selectedHeight
    const scale = Math.min(scaleX, scaleY) // Use the smaller scale to fit within bounds

    // Calculate final dimensions after scaling
    const finalWidth = selectedWidth * scale
    const finalHeight = selectedHeight * scale

    // Calculate center position
    const centerX = (resultCanvas.width - finalWidth) / 2
    const centerY = (resultCanvas.height - finalHeight) / 2

    // Draw the selected region centered and scaled
    resultCtx.drawImage(tempCanvas, centerX, centerY, finalWidth, finalHeight)

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

