'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, X } from 'lucide-react'
import Link from 'next/link'

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 border-2 border-black"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white border-l-2 border-black z-50 p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold uppercase tracking-wide">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 border-2 border-black"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-black"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Button>
              </Link>
              <Link href="/statistics">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-black"
                  onClick={() => setIsOpen(false)}
                >
                  Statistics
                </Button>
              </Link>
              <Link href="/transactions">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-black"
                  onClick={() => setIsOpen(false)}
                >
                  Transactions
                </Button>
              </Link>
              <Link href="/pet">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-black"
                  onClick={() => setIsOpen(false)}
                >
                  Pet Settings
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-black"
                  onClick={() => setIsOpen(false)}
                >
                  Shop
                </Button>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-black">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{session?.user?.name || 'User'}</div>
                  <div className="text-xs text-black/60">{session?.user?.email}</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-2 border-black"
                onClick={() => {
                  signOut()
                  setIsOpen(false)
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

