'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const isAuthority = user?.department != null

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold hover:text-blue-200 transition">
            🏛️ JagaWarga
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              href="/reports"
              className={`hover:text-blue-200 transition ${
                pathname === '/reports' ? 'font-semibold' : ''
              }`}
            >
              Laporan Publik
            </Link>

            {!isAuthenticated ? (
              <>
                <Link
                  href="/submit"
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium"
                >
                  Buat Laporan
                </Link>
                <Link
                  href="/login"
                  className="hover:text-blue-200 transition"
                >
                  Login
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={isAuthority ? '/dashboard/authority' : '/dashboard/citizen'}
                  className={`hover:text-blue-200 transition ${
                    pathname.includes('/dashboard') ? 'font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-sm">
                    {user?.name || user?.email}
                    {isAuthority && (
                      <span className="ml-2 text-xs bg-blue-700 px-2 py-1 rounded">
                        {user.department}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm hover:text-blue-200 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}