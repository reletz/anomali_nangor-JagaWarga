'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { Building2, LogOut, User, FileText, Home } from 'lucide-react'

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

  const isAuthority = user?.role === 'authority' || user?.department != null

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold hover:text-blue-200 transition">
            <Building2 className="w-6 h-6" />
            <span>JagaWarga</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className={`flex items-center space-x-1 hover:text-blue-200 transition ${
                pathname === '/' ? 'font-semibold' : ''
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Beranda</span>
            </Link>

            <Link
              href="/reports"
              className={`flex items-center space-x-1 hover:text-blue-200 transition ${
                pathname === '/reports' ? 'font-semibold' : ''
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Laporan Publik</span>
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
                  className="flex items-center space-x-1 hover:text-blue-200 transition"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={isAuthority ? '/dashboard/authority' : '/dashboard/citizen'}
                  className={`flex items-center space-x-1 hover:text-blue-200 transition ${
                    pathname.includes('/dashboard') ? 'font-semibold' : ''
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-sm">
                    {user?.name || user?.email || user?.nik}
                    {isAuthority && (
                      <span className="ml-2 text-xs bg-blue-700 px-2 py-1 rounded capitalize">
                        {user.department}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-sm hover:text-blue-200 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
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