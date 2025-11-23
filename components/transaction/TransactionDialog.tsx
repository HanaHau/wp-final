'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
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

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingTransaction?: Transaction | null
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
}: TransactionDialogProps) {
  const [amount, setAmount] = useState('0')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'DEPOSIT'>('EXPENSE')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Map type to typeId
  const getTypeId = (type: 'EXPENSE' | 'INCOME' | 'DEPOSIT'): number => {
    switch (type) {
      case 'EXPENSE':
        return 1
      case 'INCOME':
        return 2
      case 'DEPOSIT':
        return 3
      default:
        return 1
    }
  }

  // Fetch categories based on type
  useEffect(() => {
    if (open) {
      fetchCategories()
      // Reset category when type changes
      setCategoryId(null)
      setCategoryName('')
    }
  }, [open, type])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const typeId = getTypeId(type)
      const res = await fetch(`/api/categories?typeId=${typeId}`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        // If we have a selected categoryId, find its name
        if (categoryId) {
          const selected = data.find((c: Category) => c.id === categoryId)
          if (selected) {
            setCategoryName(selected.name)
          }
        } else if (!editingTransaction && data.length > 0) {
          // Set default to category with sortOrder = 1 (first non-fallback category)
          const defaultCategory = data.find((c: Category) => c.sortOrder === 1) || data[0]
          if (defaultCategory) {
            setCategoryId(defaultCategory.id)
            setCategoryName(defaultCategory.name)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

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

  // Populate form when editing
  useEffect(() => {
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
      setType(editingTransaction.type as 'EXPENSE' | 'INCOME' | 'DEPOSIT')
      setNote(editingTransaction.note || '')
      setDate(formatDateForInput(editingTransaction.date))
    } else {
      setAmount('0')
      setCategoryId(null)
      setCategoryName('')
      setType('EXPENSE')
      setNote('')
      // Set default date to today in Taiwan time
      setDate(formatDateForInput(new Date()))
    }
  }, [editingTransaction, open])

  // Update categoryId when categories are loaded and we have a category name
  useEffect(() => {
    if (categories.length > 0 && categoryName && !categoryId) {
      const found = categories.find((c) => c.name === categoryName)
      if (found) {
        setCategoryId(found.id)
      }
    }
  }, [categories, categoryName, categoryId])

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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        let errorMessage = errorData.error || errorData.message || (editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction')
        
        // If there are validation details, include them
        if (errorData.details && Array.isArray(errorData.details)) {
          const details = errorData.details.map((d: any) => d.message || d.path?.join('.')).join(', ')
          if (details) {
            errorMessage += `: ${details}`
          }
        }
        
        console.error('Transaction error:', errorData)
        
        toast({
          title: 'Transaction Failed',
          description: errorMessage,
          variant: 'destructive',
        })
        return
      }

      // Reset form
      setAmount('0')
      setCategoryId(null)
      setCategoryName('')
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
      
      onSuccess()
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
                className="border-2 border-black"
                required
              />
            </div>
            {/* Type Selection - Buttons */}
            <div>
              <Label className="text-black uppercase text-xs tracking-wide mb-2 block">Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={type === 'EXPENSE' ? 'default' : 'outline'}
                  onClick={() => setType('EXPENSE')}
                  className="border-2 border-black"
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={type === 'INCOME' ? 'default' : 'outline'}
                  onClick={() => setType('INCOME')}
                  className="border-2 border-black"
                >
                  Income
                </Button>
                <Button
                  type="button"
                  variant={type === 'DEPOSIT' ? 'default' : 'outline'}
                  onClick={() => setType('DEPOSIT')}
                  className="border-2 border-black"
                >
                  Deposit
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
                className="w-full border-2 border-black justify-start h-auto py-3"
              >
                {categoryName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {categories.find(c => c.id === categoryId)?.icon || '📝'}
                    </span>
                    <span className="text-sm">{categoryName}</span>
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
                className="border-2 border-black"
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

