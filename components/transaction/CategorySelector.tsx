'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Plus, Trash2, ArrowLeft, GripVertical } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  typeId: number
  userId: string | null
  isDefault: boolean
  sortOrder: number
}

interface CategorySelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  typeId: number // 1=支出, 2=收入, 3=存錢
  selectedCategoryId: string | null
  onSelect: (categoryId: string) => void
}

type ViewMode = 'select' | 'add'

const EMOJI_ICONS = [
  '🍔', '🚗', '🎮', '🛍️', '🏥', '📚', '💼', '🏠', '🍕', '☕',
  '✈️', '🎬', '🎵', '📱', '💻', '🎨', '🏋️', '🧘', '🎯', '🎪',
  '🎁', '💡', '🔧', '📝', '💰', '💳', '🏦', '📊', '📈', '📉'
]

const COLORS = [
  '#F0E4D4', // Light Beige
  '#F9D9CA', // Light Peach
  '#D18063', // Muted Terracotta
  '#917B56', // Olive Green
  '#B57FB3', // Medium Purple
  '#6ECEDA', // Light Blue
  '#E098AE', // Dusty Rose
  '#D5CB8E', // Light Yellow
]

// Sortable Category Item Component
interface SortableCategoryItemProps {
  category: Category
  editMode: boolean
  selectedCategoryId: string | null
  onCategoryClick: (category: Category) => void
  onEditClick: (category: Category) => void
  onDeleteClick: (category: Category) => void
}

function SortableCategoryItem({
  category,
  editMode,
  selectedCategoryId,
  onCategoryClick,
  onEditClick,
  onDeleteClick,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: category.id,
    disabled: !editMode || category.userId === null,
  })

  const isUserCategory = category.userId !== null

  const style = {
    transform: CSS.Transform.toString(transform),
    // 只對 transform 使用 transition，opacity 不使用 transition 避免閃爍
    transition: isDragging ? 'none' : 'transform 200ms ease',
    opacity: isDragging ? 0 : 1, // 拖曳時完全消失，由 DragOverlay 取代（無 transition）
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      data-id={category.id}
      style={style}
      {...attributes}
      {...listeners}   // ← 重要！要放在 item 本體上
      className={`relative rounded-xl border border-black/20 p-3 backdrop-blur-sm ${
        editMode && isUserCategory ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        selectedCategoryId === category.id
          ? 'bg-black/20 hover:bg-black/25'
          : 'bg-white/90 hover:bg-black/5'
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        onCategoryClick(category)
      }}
    >
      {editMode && isUserCategory && (
        <div className="absolute top-1 left-1 z-10 pointer-events-none">
          <GripVertical className="h-4 w-4 text-black/40" />
        </div>
      )}

      {editMode && isUserCategory && (
        <div className="absolute top-1 right-1 flex flex-col gap-1 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg bg-white/90 backdrop-blur-sm border border-black/20 hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation()
              onEditClick(category)
            }}
          >
            <Edit className="h-3 w-3 text-black" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg bg-white/90 backdrop-blur-sm border border-black/20 hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick(category)
            }}
          >
            <Trash2 className="h-3 w-3 text-black" />
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">{category.icon || '📝'}</span>
        <span className="text-xs font-medium text-center text-black">
          {category.name}
        </span>
      </div>
    </div>
  )
}

export default function CategorySelector({
  open,
  onOpenChange,
  typeId,
  selectedCategoryId,
  onSelect,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [editMode, setEditMode] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📝')
  const [newCategoryColor, setNewCategoryColor] = useState<string | null>(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 })
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const { toast } = useToast()

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      fetchCategories()
      setViewMode('select')
      setEditMode(false)
      setHasUnsavedChanges(false)
      setNewCategoryName('')
      setNewCategoryIcon('📝')
      setNewCategoryColor(null)
      setEditingCategory(null)
      setActiveId(null)
      setCursorOffset({ x: 0, y: 0 })
      setCardSize({ width: 0, height: 0 })
      setShowDeleteDialog(false)
      setCategoryToDelete(null)
    }
  }, [open, typeId])

  // Track unsaved changes
  useEffect(() => {
    if (viewMode === 'add') {
      const hasChanges = newCategoryName.trim() !== '' || newCategoryIcon !== '📝' || newCategoryColor !== null
      setHasUnsavedChanges(hasChanges)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [viewMode, newCategoryName, newCategoryIcon, newCategoryColor])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?typeId=${typeId}`)
      if (res.ok) {
        const data = await res.json()
        // Ensure data is an array
        if (Array.isArray(data)) {
          setCategories(data)
        } else {
          console.error('API returned non-array data:', data)
          setCategories([])
        }
      } else {
        console.error('Failed to fetch categories:', res.status, res.statusText)
        setCategories([])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId)
    onOpenChange(false)
  }

  const handleDeleteClick = (category: Category) => {
    if (category.userId === null) {
      toast({
        title: 'Cannot Delete',
        description: 'System default categories cannot be deleted.',
        variant: 'destructive',
      })
      return
    }
    setCategoryToDelete(category)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Delete failed')
      }

      toast({
        title: 'Success',
        description: 'Category deleted successfully.',
      })

      setShowDeleteDialog(false)
      setCategoryToDelete(null)
      fetchCategories()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete category.',
        variant: 'destructive',
      })
    }
  }

  const handleEditClick = (category: Category) => {
    if (category.userId === null) {
      toast({
        title: 'Cannot Edit',
        description: 'System default categories cannot be edited.',
        variant: 'destructive',
      })
      return
    }

    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryIcon(category.icon || '📝')
    setNewCategoryColor(category.color || null)
    setViewMode('add') // Switch to add view for editing
  }

  const handleCategoryClick = (category: Category) => {
    // In edit mode, clicking the category itself should not do anything
    // Only clicking the edit/delete buttons should work
    if (editMode) {
      // In edit mode, clicking default categories shows a toast
      if (category.userId === null) {
        toast({
          title: 'Cannot Edit',
          description: 'System default categories cannot be edited.',
          variant: 'destructive',
        })
      }
      return
    }
    // In normal mode, select the category
    handleSelect(category.id)
  }

  const handleSave = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingCategory) {
        // Update existing category
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            icon: newCategoryIcon,
            color: newCategoryColor,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Update failed' }))
          throw new Error(errorData.error || 'Update failed')
        }

        toast({
          title: 'Success',
          description: 'Category updated successfully.',
        })
        
        // Return to select view after editing
        setViewMode('select')
        setEditingCategory(null)
        setNewCategoryName('')
        setNewCategoryIcon('📝')
        setNewCategoryColor(null)
        fetchCategories()
        return
      } else {
        // Create new category
        const requestBody = {
          name: newCategoryName.trim(),
          typeId: Number(typeId), // 確保 typeId 是數字
          ...(newCategoryIcon && { icon: newCategoryIcon }),
          ...(newCategoryColor && { color: newCategoryColor }),
        }
        
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Create failed' }))
          const errorMessage = errorData.error || errorData.details?.[0]?.message || 'Create failed'
          throw new Error(errorMessage)
        }

        const newCategory = await res.json()

        toast({
          title: 'Success',
          description: 'Category created successfully.',
        })
        
        // Auto-select the newly created category
        if (newCategory && newCategory.id) {
          onSelect(newCategory.id)
          onOpenChange(false)
          return // Exit early to prevent resetting form
        }
      }

      setEditMode(false)
      setEditingCategory(null)
      setNewCategoryName('')
      setNewCategoryIcon('📝')
      setNewCategoryColor(null)
      setViewMode('select')
      fetchCategories()
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : (editingCategory ? 'Failed to update category.' : 'Failed to create category.')
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setEditingCategory(null)
    setNewCategoryName('')
    setNewCategoryIcon('📝')
    setNewCategoryColor(null)
    setViewMode('select')
  }

  // Drag and drop handlers with @dnd-kit
  const handleDragStart = (event: DragStartEvent) => {
    const { active, activatorEvent } = event
    const activeCategory = categories.find(c => c.id === active.id)
    // Only allow dragging user custom categories
    if (activeCategory && activeCategory.userId !== null) {
      setActiveId(active.id as string)
      
      // 從 DOM 元素直接獲取精確位置
      const node = document.querySelector(`[data-id="${active.id}"]`) as HTMLElement
      if (node && activatorEvent) {
        const rect = node.getBoundingClientRect()
        let clientX = 0
        let clientY = 0
        
        if (activatorEvent instanceof MouseEvent) {
          clientX = activatorEvent.clientX
          clientY = activatorEvent.clientY
        } else if (activatorEvent instanceof TouchEvent && activatorEvent.touches.length > 0) {
          clientX = activatorEvent.touches[0].clientX
          clientY = activatorEvent.touches[0].clientY
        }
        
        if (clientX > 0 && clientY > 0) {
          // 計算鼠標相對於卡片的位置（考慮邊框和 padding）
          // 使用 getBoundingClientRect 獲取的位置已經包含了 border，所以不需要額外調整
          const offsetX = clientX - rect.left
          const offsetY = clientY - rect.top
          setCursorOffset({
            x: offsetX,
            y: offsetY,
          })
          setCardSize({
            width: rect.width,
            height: rect.height,
          })
        } else {
          // 預設使用卡片中心
          setCursorOffset({
            x: rect.width / 2,
            y: rect.height / 2,
          })
          setCardSize({
            width: rect.width,
            height: rect.height,
          })
        }
      } else {
        // 備用方案：使用 dnd-kit 提供的 rect
        const rect = active.rect.current.initial
        if (rect) {
          setCursorOffset({
            x: rect.width / 2,
            y: rect.height / 2,
          })
        } else {
          setCursorOffset({ x: 50, y: 50 })
        }
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    // 立即清除 activeId，讓 DragOverlay 立即消失
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeCategory = categories.find(c => c.id === active.id)
    const overCategory = categories.find(c => c.id === over.id)

    if (!activeCategory || !overCategory) {
      return
    }

    // Only allow reordering user custom categories (not default ones)
    if (activeCategory.userId === null || overCategory.userId === null) {
      return
    }

    // Get user categories only
    const userCategories = categories.filter(c => c.userId !== null)
    const defaultCategories = categories.filter(c => c.userId === null)
    
    const oldIndex = userCategories.findIndex(c => c.id === active.id)
    const newIndex = userCategories.findIndex(c => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder user categories
    const reordered = arrayMove(userCategories, oldIndex, newIndex)

    // Update local state immediately
    const newCategories = [...defaultCategories, ...reordered]
    setCategories(newCategories)

    // Save to server
    try {
      const categoryIds = reordered.map(c => c.id)
      const res = await fetch('/api/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryIds,
          typeId: typeId,
        }),
      })

      if (!res.ok) {
        throw new Error('Reorder failed')
      }

      // Refresh to get updated sortOrder
      fetchCategories()
    } catch (error) {
      console.error('Reorder error:', error)
      toast({
        title: 'Error',
        description: 'Failed to reorder categories.',
        variant: 'destructive',
      })
      // Revert on error
      fetchCategories()
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to discard them and go back?')) {
        handleCancel()
        setViewMode('select')
      }
    } else {
      setViewMode('select')
      handleCancel()
    }
  }

  const handleClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to discard them and close?')) {
        handleCancel()
        setViewMode('select')
        onOpenChange(false)
      }
    } else {
      if (!open) {
        setViewMode('select')
        handleCancel()
      }
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              {viewMode === 'add' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 rounded-lg border border-black/20"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
              )}
              <DialogTitle className="text-lg uppercase tracking-wide">
                {viewMode === 'add' ? 'Add New Category' : 'Select Category'}
              </DialogTitle>
            </div>
            {viewMode === 'select' && (
              <div className="flex gap-2">
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="rounded-xl"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setEditMode(false)}
                    className="rounded-xl"
                  >
                    Done
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {viewMode === 'select' ? (
            <>
              {loading ? (
                <div className="text-center py-8 text-black/60">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-black/60">No categories found</div>
              ) : (
                <>
                  {/* Category Grid - Separate default and user categories */}
                  {/* Default Categories (userId = null) */}
                  <div className="text-xs uppercase tracking-wide text-black/60 mb-2 px-1">
                    Default Categories
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {categories
                      .filter(c => c.userId === null)
                      .map((category) => {
                        return (
                          <div
                            key={category.id}
                            className={`relative rounded-xl border border-black/20 p-3 backdrop-blur-sm transition-all ${
                              editMode ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              selectedCategoryId === category.id
                                ? 'bg-black/10 hover:bg-black/15'
                                : 'bg-white/90 hover:bg-black/5'
                            }`}
                            onClick={(e) => {
                              handleCategoryClick(category)
                            }}
                          >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{category.icon || '📝'}</span>
          <span className="text-xs font-medium text-center text-black">{category.name}</span>
        </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* User Custom Categories (userId !== null) */}
                  <div className="text-xs uppercase tracking-wide text-black/60 mb-2 px-1">
                    Your Categories
                  </div>
                  {categories.filter(c => c.userId !== null).length > 0 ? (
                    <>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        modifiers={[snapCenterToCursor]}
                      >
                        <SortableContext
                          items={categories.filter(c => c.userId !== null)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-4 gap-3">
                            {categories
                              .filter(c => c.userId !== null)
                              .map((category) => (
                                <SortableCategoryItem
                                  key={category.id}
                                  category={category}
                                  editMode={editMode}
                                  selectedCategoryId={selectedCategoryId}
                                  onCategoryClick={handleCategoryClick}
                                  onEditClick={handleEditClick}
                                  onDeleteClick={handleDeleteClick}
                                />
                              ))}
                          </div>
                        </SortableContext>
                        <DragOverlay 
                          dropAnimation={null} 
                          style={{ cursor: 'grabbing', zIndex: 1000 }}
                        >
                          {activeId ? (() => {
                            const activeCategory = categories.find(c => c.id === activeId)
                            if (!activeCategory) return null
                            // DragOverlay 會將卡片左上角對齊到鼠標
                            // 我們需要將卡片向左上移動 offset 距離，讓點擊位置對齊到鼠標
                            // 考慮 scale(1.05) 的影響，需要稍微調整
                            return (
                              <div 
                                className="rounded-xl border border-black/20 bg-white/95 backdrop-blur-sm p-3 shadow-2xl text-black"
                                style={{
                                  transform: `translate(-${cursorOffset.x}px, -${cursorOffset.y}px) scale(1.05) rotate(2deg)`,
                                  transformOrigin: `${cursorOffset.x}px ${cursorOffset.y}px`,
                                  cursor: 'grabbing',
                                  pointerEvents: 'none',
                                }}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-2xl">{activeCategory.icon || '📝'}</span>
                                  <span className="text-xs font-medium text-center text-black">{activeCategory.name}</span>
                                </div>
                              </div>
                            )
                          })() : null}
                        </DragOverlay>
                      </DndContext>
                    </>
                  ) : (
                    <div className="text-center py-8 text-black/40 text-sm">
                      Empty
                    </div>
                  )}

                  {/* Add New Category Button */}
                  {!editMode && (
                    <Button
                      variant="outline"
                      onClick={() => setViewMode('add')}
                      className="w-full rounded-xl border border-black/20 border-dashed py-6"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Category
                    </Button>
                  )}
                </>
              )}
            </>
          ) : (
            /* Add New Category Form */
            <div className="rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm p-4 space-y-4">
              {editingCategory && (
                <div className="mb-4 pb-4 border-b border-black/20">
                  <h3 className="text-sm font-bold uppercase">Edit Category</h3>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs uppercase tracking-wide mb-2 block">
                    Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide mb-2 block">
                    Icon <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full rounded-xl justify-start"
                    >
                      <span className="text-xl mr-2">{newCategoryIcon}</span>
                      Select Icon
                    </Button>
                    {showIconPicker && (
                      <div className="absolute z-10 mt-2 p-3 bg-white/95 backdrop-blur-md border border-black/20 rounded-xl grid grid-cols-10 gap-2 max-h-48 overflow-y-auto">
                        {EMOJI_ICONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewCategoryIcon(emoji)
                              setShowIconPicker(false)
                            }}
                            className="text-2xl hover:bg-black/10 p-1 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide mb-2 block">
                    Color (Optional)
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategoryColor(newCategoryColor === color ? null : color)}
                        className={`w-8 h-8 rounded border-2 ${
                          newCategoryColor === color ? 'border-black' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewCategoryColor(null)}
                      className="w-8 h-8 rounded border-2 border-gray-300 flex items-center justify-center text-xs"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1 rounded-xl"
                    disabled={!newCategoryName.trim()}
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-black/80">
              Are you sure you want to delete &quot;{categoryToDelete?.name}&quot;?
            </p>
            <p className="text-xs text-black/60 mt-2">
              All transactions using this category will be moved to &quot;Other&quot;.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setCategoryToDelete(null)
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleDeleteConfirm}
              className="rounded-xl"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

