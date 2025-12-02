'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, X, Mail } from 'lucide-react'
import Image from 'next/image'

interface Invitation {
  id: string
  createdAt: string
  user: {
    id: string
    email: string
    userID: string | null
    name: string | null
    image: string | null
  }
}

interface InvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvitationAccepted: () => void
}

export default function InvitationDialog({
  open,
  onOpenChange,
  onInvitationAccepted,
}: InvitationDialogProps) {
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchInvitations()
    }
  }, [open])

  const fetchInvitations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/friends/invitations')
      if (res.ok) {
        const data = await res.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('取得邀請列表失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (invitationId: string) => {
    setProcessing(invitationId)
    try {
      const res = await fetch(`/api/friends/invitations/${invitationId}/accept`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({
          title: '成功',
          description: '好友邀請已接受',
        })
        fetchInvitations()
        onInvitationAccepted()
      } else {
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (invitationId: string) => {
    setProcessing(invitationId)
    try {
      const res = await fetch(`/api/friends/invitations/${invitationId}/reject`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({
          title: '成功',
          description: '好友邀請已拒絕',
        })
        fetchInvitations()
      } else {
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            好友邀請
            {invitations.length > 0 && (
              <span className="ml-auto text-sm text-black/60 bg-black/10 px-2 py-1 rounded-full">
                {invitations.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-black/60 text-sm">
              載入中...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-black/60 text-sm">
              目前沒有待處理的邀請
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-black/10"
                >
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0">
                    {invitation.user.image ? (
                      <Image
                        src={invitation.user.image}
                        alt={invitation.user.name || invitation.user.email}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      invitation.user.name?.charAt(0) || invitation.user.email?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black truncate">
                      {invitation.user.userID || invitation.user.name || invitation.user.email}
                    </div>
                    <div className="text-xs text-black/60 truncate">
                      {invitation.user.userID ? `@${invitation.user.userID}` : invitation.user.email}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation.id)}
                      disabled={processing === invitation.id}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" />
                      接受
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(invitation.id)}
                      disabled={processing === invitation.id}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      拒絕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

