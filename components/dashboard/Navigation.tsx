'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, BarChart3, Settings, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: '主畫面', icon: Home },
  { href: '/statistics', label: '統計', icon: BarChart3 },
  { href: '/pet', label: '寵物設定', icon: Heart },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-t-2 border-purple-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-3 px-6 rounded-2xl transition-all',
                    isActive 
                      ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg scale-105' 
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  )}
                >
                  <Icon className={cn('h-6 w-6', isActive && 'animate-pulse')} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

