'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTransactionDate } from '@/lib/utils'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import { Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Transaction {
  id: string
  amount: number
  category: string
  type: string
  date: string
  note: string | null
}

interface DailyTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  onTransactionUpdate?: () => void
}

export default function DailyTransactionsDialog({
  open,
  onOpenChange,
  date,
  onTransactionUpdate,
}: DailyTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && date) {
      fetchTransactions()
    } else {
      setTransactions([])
    }
  }, [open, date])

  const fetchTransactions = async () => {
    if (!date) return
    
    setLoading(true)
    try {
      // 日期字串是台灣時區的日期 (YYYY-MM-DD)
      // 需要轉換為 UTC 時間範圍來查詢資料庫
      // 台灣時間 00:00:00 = UTC 前一日 16:00:00
      // 台灣時間 23:59:59 = UTC 當日 15:59:59
      const [year, month, day] = date.split('-').map(Number)
      
      // 創建台灣時間的日期對象
      const startDateTaiwan = new Date(year, month - 1, day, 0, 0, 0, 0) // 台灣時間 00:00:00
      const startDate = new Date(startDateTaiwan.getTime() - 8 * 60 * 60 * 1000) // 轉為 UTC
      
      const endDateTaiwan = new Date(year, month - 1, day, 23, 59, 59, 999) // 台灣時間 23:59:59
      const endDate = new Date(endDateTaiwan.getTime() - 8 * 60 * 60 * 1000) // 轉為 UTC

      const res = await fetch(
        `/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await res.json()
      setTransactions(data.sort((a: Transaction, b: Transaction) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ))
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    // dateStr is in format YYYY-MM-DD (Taiwan time)
    // Parse it as Taiwan time and format
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-700'
      case 'EXPENSE':
        return 'text-red-700'
      default:
        return 'text-black'
    }
  }

  const getTypeSign = (type: string) => {
    switch (type) {
      case 'INCOME':
        return '+'
      case 'EXPENSE':
        return '-'
      default:
        return ''
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Delete failed')
      
      // Refresh transactions
      fetchTransactions()
      
      // Notify parent to refresh stats
      if (onTransactionUpdate) {
        onTransactionUpdate()
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      })
    }
  }

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false)
    setEditingTransaction(null)
    fetchTransactions()
    if (onTransactionUpdate) {
      onTransactionUpdate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {date ? formatDate(date) : 'Transactions'}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8 text-black/60">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-black/60">No transactions on this day</div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex justify-between items-center p-3 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm uppercase">{transaction.category}</span>
                    <span className={`text-xs ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </div>
                  {transaction.note && (
                    <span className="text-xs text-black/60 mt-1">{transaction.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold ${getTypeColor(transaction.type)}`}>
                    {getTypeSign(transaction.type)}{formatCurrency(transaction.amount)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                      className="h-8 w-8 rounded-lg border border-black/20"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                      className="h-8 w-8 rounded-lg border border-black/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>

      {/* Edit Transaction Dialog */}
      <TransactionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditDialogClose}
        editingTransaction={editingTransaction}
      />
    </Dialog>
  )
}

