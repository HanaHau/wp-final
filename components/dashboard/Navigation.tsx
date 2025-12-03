'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, BarChart3, Heart, List, ShoppingBag, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/statistics', label: 'Stats', icon: BarChart3 },
  { href: '/transactions', label: 'List', icon: List },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/pet', label: 'Pet', icon: Heart },
  { href: '/friends', label: 'Friends', icon: Users },
]

export default function Navigation() {
  const pathname = usePathname()
  const [invitationCount, setInvitationCount] = useState(0)

  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        const res = await fetch('/api/friends/invitations/count')
        if (res.ok) {
          const data = await res.json()
          setInvitationCount(data.count || 0)
        }
      } catch (error) {
        console.error('取得邀請數量失敗:', error)
      }
    }

    fetchInvitationCount()
    // 每30秒刷新一次邀請數量
    const interval = setInterval(fetchInvitationCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/20 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const showBadge = item.href === '/friends' && invitationCount > 0
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all relative',
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-black hover:bg-black/5'
                    )}
                  >
                    <div className="relative">
                      <Icon className={cn('h-5 w-5')} />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                          {invitationCount > 9 ? '9+' : invitationCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            <Link href="/profile">
            <Button
              variant="ghost"
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all',
                  pathname === '/profile'
                  ? 'bg-black text-white' 
                  : 'text-black hover:bg-black/5'
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide">Profile</span>
            </Button>
            </Link>
          </div>
        </div>
      </nav>

    </>
  )
}

