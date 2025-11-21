'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  const [loading, setLoading] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString())
      setCategory(editingTransaction.category)
      setType(editingTransaction.type as 'EXPENSE' | 'INCOME' | 'DEPOSIT')
      setNote(editingTransaction.note || '')
    } else {
      setAmount('0')
      setCategory('')
      setType('EXPENSE')
      setNote('')
    }
  }, [editingTransaction, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions'
      const method = editingTransaction ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          type,
          note: note || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error(editingTransaction ? 'Update failed' : 'Create failed')
      }

      // Reset form
      setAmount('0')
      setCategory('')
      setNote('')
      onSuccess()
    } catch (error) {
      console.error('Transaction error:', error)
      alert(editingTransaction ? 'Update failed' : 'Create failed')
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
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
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
              <CalculatorInput value={amount} onChange={setAmount} />
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
          <DialogFooter>
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

