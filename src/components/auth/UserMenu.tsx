'use client'

import { useState } from 'react'
import { signOut, useSession, SessionProvider } from 'next-auth/react'

function UserMenuInner() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  if (!session?.user) return null

  const email = session.user.email || 'User'
  const initial = email.charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-medium hover:bg-accent/90 transition-colors shadow-sm"
      >
        {initial}
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 overflow-hidden text-sm">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-ink font-medium truncate">{email}</p>
              <p className="text-inkLight text-xs mt-0.5">积分: --</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function UserMenu() {
  return (
    <SessionProvider>
      <UserMenuInner />
    </SessionProvider>
  )
}