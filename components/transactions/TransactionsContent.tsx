'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import { formatCurrency } from '@/lib/utils'
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Transaction {
  id: string
  amount: number
  category: string
  type: string
  date: string
  note: string | null
  createdAt: string
}

export default function TransactionsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchTransactions()
  }, [filterType])

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'ALL') {
        params.append('type', filterType)
      }
      const res = await fetch(`/api/transactions?${params.toString()}`)
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Delete failed')
      fetchTransactions()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete transaction')
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingTransaction(null)
    fetchTransactions()
  }

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(transactions.length / itemsPerPage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Transactions</h1>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="border-2 border-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="border-2 border-black w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black bg-white">
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="DEPOSIT">Deposit</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
        </div>

        {/* Transactions List */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide">
              {transactions.length} Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedTransactions.length === 0 ? (
              <div className="text-center py-12 text-black/60">
                No transactions found
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border-2 border-black"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-sm uppercase">
                          {transaction.category}
                        </span>
                        <span className="text-xs text-black/60 uppercase">
                          {transaction.type}
                        </span>
                      </div>
                      {transaction.note && (
                        <p className="text-xs text-black/60 mt-1">{transaction.note}</p>
                      )}
                      <p className="text-xs text-black/40 mt-1">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-lg ${
                          transaction.type === 'EXPENSE'
                            ? 'text-black'
                            : transaction.type === 'INCOME'
                            ? 'text-black'
                            : 'text-black'
                        }`}
                      >
                        {transaction.type === 'EXPENSE' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(transaction)}
                          className="h-8 w-8 border-2 border-black"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
                          className="h-8 w-8 border-2 border-black"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-black">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-2 border-black"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-2 border-black"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={handleDialogClose}
        editingTransaction={editingTransaction}
      />

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}

