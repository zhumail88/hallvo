'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/dashboard/logout-action'
import { 
  Building2, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react'

interface DashboardShellProps {
  children: React.ReactNode
  profile: {
    full_name: string | null
    role: string
  } | null
}

export default function DashboardShell({ children, profile }: DashboardShellProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarIcon },
    { name: 'Bookings', href: '/dashboard/bookings', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
  ]

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 md:hidden z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-primary">Hallvo</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-lg p-2 text-foreground hover:bg-secondary focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 transform md:translate-x-0 md:static ${
          isSidebarOpen ? 'translate-x-0 pt-16 md:pt-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Area (Desktop only) */}
        <div className="hidden md:flex h-20 items-center gap-3 px-6 border-b border-border">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-primary">Hallvo</span>
            <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Manager
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 rounded-xl border border-border bg-secondary/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-sm font-bold text-foreground truncate">
              {profile?.full_name || 'Staff User'}
            </span>
            <span className="block text-xs font-medium text-muted-foreground capitalize">
              {profile?.role || 'Staff'} Role
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout Action */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-base font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-150"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-xs z-10 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
      
    </div>
  )
}
