'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { useSWR } from '@/lib/swr-config'
import CalculatorInput from './CalculatorInput'
import CategorySelector from './CategorySelector'

interface Transaction {
  id: string
  amount: number
  category: string
  type: string
  date: string
  note: string | null
}

interface InitialValues {
  amount?: number
  type?: 'EXPENSE' | 'INCOME'
  categoryName?: string
  date?: string
  note?: string
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (transactionDetails?: { amount: number; type: string; categoryName: string; note?: string; newBalance?: number }) => void
  editingTransaction?: Transaction | null
  initialValues?: InitialValues | null
}

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

export default function TransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  editingTransaction,
  initialValues,
}: TransactionDialogProps) {
  const [amount, setAmount] = useState('0')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  // Track if category was set from initialValues to prevent override
  const categorySetFromInitialValues = useRef(false)

  // Map type to typeId
  const getTypeId = (type: 'EXPENSE' | 'INCOME'): number => {
    switch (type) {
      case 'EXPENSE':
        return 1
      case 'INCOME':
        return 2
      default:
        return 1
    }
  }

  // 使用 SWR 快取 categories - 不再每次都重新獲取
  const typeId = getTypeId(type)
  const { data: categoriesData, isLoading: swrLoadingCategories } = useSWR(
    open ? `/api/categories?typeId=${typeId}` : null, // 只在對話框打開時獲取
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 60 秒內去重
    }
  )

  // 當 SWR 資料更新時，同步到 categories state
  useEffect(() => {
    if (categoriesData && Array.isArray(categoriesData)) {
      setCategories(categoriesData)
    }
  }, [categoriesData])

  // 更新 loadingCategories 狀態
  useEffect(() => {
    setLoadingCategories(swrLoadingCategories)
  }, [swrLoadingCategories])

  const fetchCategories = useCallback(async () => {
    // 使用 SWR 快取，這個函數現在主要用於強制刷新
    // NEVER set any default category - categories are ONLY set by:
    // 1. User selection (handleCategorySelect)
    // 2. initialValues (from chat API)
    // 3. editingTransaction (when editing)
    if (categoriesData && Array.isArray(categoriesData)) {
      setCategories(categoriesData)
    }
  }, [categoriesData]) // Only depend on categoriesData

  // Fetch categories when dialog opens or type changes
  // CRITICAL: Never reset or set any category here - only fetch the list
  useEffect(() => {
    if (open) {
      fetchCategories()
      // ONLY reset category if ALL of these are true:
      // 1. No initialValues
      // 2. Not editing
      // 3. Category is not protected
      // 4. Category ref shows it hasn't been set
      // This ensures we never override a category set from initialValues
      if (!initialValues && !editingTransaction && !categorySetFromInitialValues.current && !categorySetRef.current) {
        // Only reset if category is completely empty and not set
        setCategoryId(null)
        setCategoryName('')
      }
    } else {
      // When dialog closes, reset flags for next time
      categorySetFromInitialValues.current = false
      categorySetRef.current = false
    }
  }, [open, type, fetchCategories, initialValues, editingTransaction]) // REMOVED categoryId and categoryName from dependencies!

  const handleCategorySelect = async (selectedCategoryId: string) => {
    setCategoryId(selectedCategoryId)
    // Find category in current list or fetch it
    let selected = categories.find((c) => c.id === selectedCategoryId)
    if (!selected) {
      // If not found, fetch categories again to get the latest
      try {
        const typeId = getTypeId(type)
        const res = await fetch(`/api/categories?typeId=${typeId}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setCategories(data)
            selected = data.find((c) => c.id === selectedCategoryId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch category:', error)
      }
    }
    if (selected) {
      setCategoryName(selected.name)
    } else {
      // Fallback: use categoryId to find name from API
      try {
        const res = await fetch(`/api/categories?typeId=${getTypeId(type)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const found = data.find((c) => c.id === selectedCategoryId)
            if (found) {
              setCategoryName(found.name)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch category name:', error)
      }
    }
    setShowCategorySelector(false)
  }

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | Date): string => {
    const dateObj = typeof dateString === 'string' ? new Date(dateString) : dateString
    // Convert UTC to Taiwan time (GMT+8) for display
    // dateObj is UTC, add 8 hours to get Taiwan time
    const taiwanTime = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000))
    // Use UTC methods to extract the date components (since we've already adjusted the time)
    const year = taiwanTime.getUTCFullYear()
    const month = String(taiwanTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(taiwanTime.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to convert date input to ISO string (UTC)
  const convertDateToUTC = (dateString: string): string => {
    if (!dateString) return new Date().toISOString()
    // Parse as Taiwan time and convert to UTC
    const [year, month, day] = dateString.split('-').map(Number)
    const taiwanDate = new Date(year, month - 1, day, 12, 0, 0, 0) // Use noon to avoid timezone issues
    // Convert Taiwan time to UTC (subtract 8 hours)
    const utcDate = new Date(taiwanDate.getTime() - (8 * 60 * 60 * 1000))
    return utcDate.toISOString()
  }

  // Populate form when editing or when initialValues are provided
  useEffect(() => {
    if (!open) return // Don't update when dialog is closed
    
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString())
      // Get categoryId from transaction (API should return categoryId)
      const transaction = editingTransaction as any
      if (transaction.categoryId) {
        setCategoryId(transaction.categoryId)
        setCategoryName(transaction.category || '')
      } else {
        // Fallback: use category name to find categoryId after categories are loaded
        setCategoryName(transaction.category || '')
      }
      setType(editingTransaction.type as 'EXPENSE' | 'INCOME')
      setNote(editingTransaction.note || '')
      setDate(formatDateForInput(editingTransaction.date))
    } else if (initialValues) {
      // Use initialValues from chat
      console.log('Setting initial values from chat:', initialValues)
      if (initialValues.amount) {
        setAmount(initialValues.amount.toString())
      } else {
        setAmount('0')
      }
      // Don't set categoryId here - it will be set after categories are loaded
      setCategoryId(null)
      if (initialValues.categoryName) {
        setCategoryName(initialValues.categoryName)
      } else {
        setCategoryName('')
      }
      setType(initialValues.type || 'EXPENSE')
      setNote(initialValues.note || '')
      // Always use today's date (don't use date from API)
      setDate(formatDateForInput(new Date()))
    } else {
      setAmount('0')
      setCategoryId(null)
      setCategoryName('')
      setType('EXPENSE')
      setNote('')
      // Set default date to today in Taiwan time
      setDate(formatDateForInput(new Date()))
    }
  }, [editingTransaction, initialValues, open])

  // Set protection flag IMMEDIATELY when we have initialValues with categoryName
  useEffect(() => {
    if (initialValues?.categoryName && open) {
      categorySetFromInitialValues.current = true
      console.log('🛡️ Protection flag set IMMEDIATELY for category:', initialValues.categoryName)
    }
  }, [initialValues, open])

  // Set category from initialValues ONCE when categories are loaded
  // Use a ref to track if we've already set the category to prevent re-running
  const categorySetRef = useRef(false)
  
  useEffect(() => {
    // Reset the ref when dialog closes or initialValues changes
    if (!open) {
      categorySetRef.current = false
      return
    }
    
    // Only run ONCE if we have initialValues, categories are loaded, and category is not yet set
    if (initialValues?.categoryName && categories.length > 0 && !categoryId && !categorySetRef.current && open) {
      // Mark that we're about to set the category
      categorySetRef.current = true
      categorySetFromInitialValues.current = true
      
      console.log('🛡️ Setting category from initialValues - PROTECTED:', initialValues.categoryName)
      
      const typeId = getTypeId(type)
      const found = categories.find(
        (c) => c.name === initialValues.categoryName && c.typeId === typeId
      )
      if (found) {
        console.log('✅ Setting category ONCE:', found.name, 'ID:', found.id, '- WILL NOT BE OVERRIDDEN')
        // Set both at the same time - this should only happen once
        setCategoryId(found.id)
        setCategoryName(found.name)
        console.log('🔒 Category LOCKED and PROTECTED:', found.name)
      } else {
        console.warn('⚠️ Category not found:', initialValues.categoryName, 'for type:', type)
        // Try "Other" as fallback
        const otherCategory = categories.find(c => c.name === 'Other' && c.typeId === typeId)
        if (otherCategory) {
          console.log('Falling back to "Other" category')
          setCategoryId(otherCategory.id)
          setCategoryName('Other')
        } else {
          // If even "Other" is not found, reset flags
          categorySetFromInitialValues.current = false
          categorySetRef.current = false
        }
      }
    }
  }, [categories, initialValues, type, categoryId, open]) // Only run when these change, and only if categoryId is not set
  
  // Reset the protection flag when dialog closes (but keep category if it was set)
  useEffect(() => {
    if (!open) {
      // Reset protection flag when dialog closes
      categorySetFromInitialValues.current = false
      // Also reset initialValues-related state
      // But DON'T reset categoryId/categoryName here - let the form reset handle it
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate amount
    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      })
      return
    }

    // Validate category
    if (!categoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category for this transaction.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions'
      const method = editingTransaction ? 'PUT' : 'POST'

      // Convert date to UTC ISO string
      const dateISO = convertDateToUTC(date)

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountValue,
          categoryId: categoryId, // Use categoryId instead of category name
          type,
          date: dateISO,
          note: note || undefined,
        }),
      })

      // 解析響應數據
      const data = await res.json()

      if (!res.ok) {
        let errorMessage = data.error || data.message || (editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction')
        
        // If there are validation details, include them
        if (data.details && Array.isArray(data.details)) {
          const details = data.details.map((d: any) => d.message || d.path?.join('.')).join(', ')
          if (details) {
            errorMessage += `: ${details}`
          }
        }
        
        console.error('Transaction error:', data)
        
        toast({
          title: 'Transaction Failed',
          description: errorMessage,
          variant: 'destructive',
        })
        return
      }

      // Get transaction details for pet response (包含新餘額)
      const transactionDetails = {
        amount: amountValue,
        type,
        categoryName: categoryName,
        note: note || undefined,
        newBalance: data.newBalance, // 傳遞新餘額給父組件
      }

      // Reset form - but DON'T reset category if it was from initialValues
      setAmount('0')
      // Only reset category if it wasn't from initialValues
      if (!categorySetFromInitialValues.current) {
        setCategoryId(null)
        setCategoryName('')
      }
      setNote('')
      
      // Show success toast with View button for new transactions
      if (editingTransaction) {
        toast({
          title: 'Success',
          description: 'Transaction updated successfully!',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Transaction created successfully!',
          action: (
            <ToastAction altText="View transactions" onClick={() => router.push('/transactions')}>
              View
            </ToastAction>
          ),
        })
      }
      
      // 檢查 API 響應中是否有任務完成信息
      if (data.missionCompleted) {
        // Dispatch 全局事件，讓 MissionToastManager 處理顯示
        window.dispatchEvent(new CustomEvent('missionCompleted', { detail: data.missionCompleted }))
      }
      
      // Close dialog first
      onOpenChange(false)
      
      // Call onSuccess with transaction details for pet response (包含新餘額)
      onSuccess(transactionDetails)
    } catch (error) {
      console.error('Transaction error:', error)
      toast({
        title: 'Network Error',
        description: 'An unexpected error occurred. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1 space-y-6 py-4 pr-2 pl-2">
            {/* Date Selection */}
            <div>
              <Label htmlFor="date" className="text-black uppercase text-xs tracking-wide mb-2 block">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            {/* Type Selection - Buttons */}
            <div>
              <Label className="text-black uppercase text-xs tracking-wide mb-2 block">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === 'EXPENSE' ? 'default' : 'outline'}
                  onClick={() => {
                    // If category was set from initialValues, don't allow type change to reset it
                    if (categorySetFromInitialValues.current) {
                      console.log('⚠️ Type change blocked - category is protected from initialValues')
                      return
                    }
                    setType('EXPENSE')
                    // Reset category when type changes (only if not protected)
                    setCategoryId(null)
                    setCategoryName('')
                  }}
                  className="rounded-xl"
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={type === 'INCOME' ? 'default' : 'outline'}
                  onClick={() => {
                    // If category was set from initialValues, don't allow type change to reset it
                    if (categorySetFromInitialValues.current) {
                      console.log('⚠️ Type change blocked - category is protected from initialValues')
                      return
                    }
                    setType('INCOME')
                    // Reset category when type changes (only if not protected)
                    setCategoryId(null)
                    setCategoryName('')
                  }}
                  className="rounded-xl"
                >
                  Income
                </Button>
              </div>
            </div>

            {/* Calculator Input */}
            <div>
              <Label className="text-black uppercase text-xs tracking-wide mb-2 block">Amount</Label>
              <CalculatorInput 
                value={amount} 
                onChange={setAmount}
                onEnter={() => {
                  // Trigger form submit when Enter is pressed
                  if (!loading) {
                    const fakeEvent = {
                      preventDefault: () => {},
                    } as React.FormEvent
                    handleSubmit(fakeEvent)
                  }
                }}
              />
            </div>

            {/* Category Selection */}
            <div>
              <Label className="text-black uppercase text-xs tracking-wide mb-2 block">Category</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategorySelector(true)}
                className="w-full rounded-xl border border-black/20 justify-start h-auto py-3 bg-white/90 backdrop-blur-sm hover:bg-black/5"
              >
                {categoryName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {categories.find(c => c.id === categoryId)?.icon || '📝'}
                    </span>
                    <span className="text-sm text-black">{categoryName}</span>
                  </div>
                ) : (
                  <span className="text-black/60">Select Category</span>
                )}
              </Button>
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note" className="text-black uppercase text-xs tracking-wide mb-2 block">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter note..."
                rows={2}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Category Selector Dialog */}
      <CategorySelector
        open={showCategorySelector}
        onOpenChange={setShowCategorySelector}
        typeId={getTypeId(type)}
        selectedCategoryId={categoryId}
        onSelect={handleCategorySelect}
      />
    </Dialog>
  )
}

