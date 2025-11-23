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

const defaultCategories = [
  { name: '飲食', icon: '🍔' },
  { name: '交通', icon: '🚗' },
  { name: '娛樂', icon: '🎮' },
  { name: '購物', icon: '🛍️' },
  { name: '醫療', icon: '🏥' },
  { name: '教育', icon: '📚' },
  { name: '其他', icon: '📝' },
]

export default function TransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  editingTransaction,
}: TransactionDialogProps) {
  const [amount, setAmount] = useState('0')
  const [category, setCategory] = useState('')
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'DEPOSIT'>('EXPENSE')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

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
      setCategory(editingTransaction.category)
      setType(editingTransaction.type as 'EXPENSE' | 'INCOME' | 'DEPOSIT')
      setNote(editingTransaction.note || '')
      setDate(formatDateForInput(editingTransaction.date))
    } else {
      setAmount('0')
      setCategory('')
      setType('EXPENSE')
      setNote('')
      // Set default date to today in Taiwan time
      setDate(formatDateForInput(new Date()))
    }
  }, [editingTransaction, open])

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
    if (!category || category.trim() === '') {
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
          category,
          type,
          date: dateISO,
          note: note || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || (editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction')
        
        toast({
          title: 'Transaction Failed',
          description: errorMessage,
          variant: 'destructive',
        })
        return
      }

      // Reset form
      setAmount('0')
      setCategory('')
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

            {/* Category Selection - Buttons Grid */}
            <div>
              <Label className="text-black uppercase text-xs tracking-wide mb-2 block">Category</Label>
              <div className="grid grid-cols-4 gap-2">
                {defaultCategories.map((cat) => (
                  <Button
                    key={cat.name}
                    type="button"
                    variant={category === cat.name ? 'default' : 'outline'}
                    onClick={() => setCategory(cat.name)}
                    className="border-2 border-black flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs">{cat.name}</span>
                  </Button>
                ))}
              </div>
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
    </Dialog>
  )
}

