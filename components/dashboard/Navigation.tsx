'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, BarChart3, Heart, List, ShoppingBag } from 'lucide-react'
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-30">
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
        </div>
      </div>
    </nav>
  )
}

