'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
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
}: TransactionDialogProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'DEPOSIT'>('EXPENSE')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          type,
          note: note || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('新增記帳失敗')
      }

      // 重置表單
      setAmount('')
      setCategory('')
      setNote('')
      onSuccess()
    } catch (error) {
      console.error('新增記帳錯誤:', error)
      alert('新增記帳失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增記帳</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 類型選擇 */}
            <div>
              <Label>類型</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType(value as 'EXPENSE' | 'INCOME' | 'DEPOSIT')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">支出</SelectItem>
                  <SelectItem value="INCOME">收入</SelectItem>
                  <SelectItem value="DEPOSIT">存款（轉為點數）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 金額 */}
            <div>
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="請輸入金額"
              />
            </div>

            {/* 類別 */}
            <div>
              <Label>類別</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="選擇類別" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 備註 */}
            <div>
              <Label htmlFor="note">備註（選填）</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="輸入備註..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '處理中...' : '確認'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

