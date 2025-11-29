'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Home, BarChart3, Heart, List, ShoppingBag, User, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/statistics', label: 'Stats', icon: BarChart3 },
  { href: '/transactions', label: 'List', icon: List },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/pet', label: 'Pet', icon: Heart },
]

export default function Navigation() {
  const pathname = usePathname()
  const [showProfile, setShowProfile] = useState(false)
  const { data: session } = useSession()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/20 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all',
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-black hover:bg-black/5'
                    )}
                  >
                    <Icon className={cn('h-5 w-5')} />
                    <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            {/* Profile 按鈕 */}
            <Button
              variant="ghost"
              onClick={() => setShowProfile(!showProfile)}
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all',
                showProfile 
                  ? 'bg-black text-white' 
                  : 'text-black hover:bg-black/5'
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide">Profile</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Profile 面板 */}
      {showProfile && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowProfile(false)}
          />
          
          {/* Profile Panel */}
          <div 
            className="fixed bottom-20 right-4 bg-white/95 backdrop-blur-md rounded-2xl border border-black/20 z-50 p-4 max-h-[60vh] overflow-y-auto w-full max-w-[298px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold uppercase tracking-wide">個人設定</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfile(false)}
                className="w-8 h-8 rounded-lg border border-black/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* 使用者資訊 */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-black/20 bg-white/50 backdrop-blur-sm">
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-lg font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold">{session?.user?.name || 'User'}</div>
                  <div className="text-sm text-black/60">{session?.user?.email}</div>
                </div>
              </div>

              {/* 登出按鈕 */}
              <Button
                variant="outline"
                className="w-full rounded-xl border border-black/20 justify-start"
                onClick={() => {
                  signOut()
                  setShowProfile(false)
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

