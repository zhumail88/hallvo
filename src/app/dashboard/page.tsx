import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatPKR } from '@/lib/utils'
import { 
  Calendar as CalendarIcon, 
  Banknote, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  Plus, 
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const revalidate = 0 // Disable cache for real-time overview

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current date ranges
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const startMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const endMonthStr = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  // 1. Fetch count of today's bookings
  const { count: todayCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('event_date', todayStr)
    .neq('status', 'cancelled')

  // 2. Fetch all bookings for the current month
  const { data: monthBookings } = await supabase
    .from('bookings')
    .select('status, final_amount, advance_paid')
    .gte('event_date', startMonthStr)
    .lte('event_date', endMonthStr)
    .neq('status', 'cancelled')

  // 3. Fetch total count of halls
  const { count: hallsCount } = await supabase
    .from('halls')
    .select('*', { count: 'exact', head: true })

  // 4. Fetch all bookings with pending payments
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('final_amount, advance_paid')
    .in('status', ['tentative', 'confirmed'])
    .neq('status', 'cancelled')

  // 5. Fetch upcoming 5 bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, halls(name)')
    .gte('event_date', todayStr)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5)

  // 6. Fetch recent activity logs
  const { data: recentLogs } = await supabase
    .from('activity_logs')
    .select('*, profiles(full_name), bookings(customer_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculations
  const activeMonthBookings = monthBookings || []
  const monthBookingsCount = activeMonthBookings.length

  // Revenue = Sum of final_amount for confirmed/completed bookings in the current month
  const monthlyRevenue = activeMonthBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.final_amount), 0)

  // Pending Payments = Sum of (final_amount - advance_paid) for all active bookings
  const pendingPayments = (pendingBookings || [])
    .reduce((sum, b) => {
      const remaining = Number(b.final_amount) - Number(b.advance_paid)
      return remaining > 0 ? sum + remaining : sum
    }, 0)

  // Occupancy rate calculation
  const totalHalls = hallsCount || 1
  const totalSlotsAvailable = totalHalls * daysInMonth
  const occupancyPercentage = Math.min(
    Math.round((monthBookingsCount / totalSlotsAvailable) * 100),
    100
  )


  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Dashboard Overview
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Real-time status of wedding hall bookings, revenue, and activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/calendar">
            <Button variant="outline" className="h-12 px-5 text-base font-semibold rounded-xl gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              View Calendar
            </Button>
          </Link>
          <Link href="/dashboard/bookings?action=new">
            <Button className="h-12 px-5 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
              <Plus className="h-5 w-5" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Metric 1: Today's Bookings */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Events
            </span>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-foreground">
              {todayCount || 0}
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              Events scheduled for today
            </span>
          </div>
        </div>

        {/* Metric 2: Monthly Revenue */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Revenue
            </span>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-foreground">
              {formatPKR(monthlyRevenue)}
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              Confirmed / completed this month
            </span>
          </div>
        </div>

        {/* Metric 3: Occupancy Rate */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Occupancy Rate
            </span>
            <div className="p-3 bg-accent/10 text-accent-foreground rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-foreground">
              {occupancyPercentage}%
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              {monthBookingsCount} of {totalSlotsAvailable} potential slots
            </span>
          </div>
        </div>

        {/* Metric 4: Pending Payments */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Payments
            </span>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-foreground">
              {formatPKR(pendingPayments)}
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              Outstanding receivables
            </span>
          </div>
        </div>

      </div>

      {/* Grid: Upcoming Bookings & Activities */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Upcoming events (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Upcoming Events
            </h2>
            <Link 
              href="/dashboard/bookings" 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {!upcomingBookings || upcomingBookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No upcoming events found. Click "New Booking" to schedule one.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/40 text-muted-foreground font-semibold text-sm border-b border-border">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Hall</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Slot / Time</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {upcomingBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-secondary/20">
                      <td className="p-4 font-bold text-foreground">
                        {b.customer_name}
                        <span className="block text-xs font-medium text-muted-foreground mt-0.5">
                          {b.customer_phone}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{b.halls?.name || 'N/A'}</td>
                      <td className="p-4 font-semibold text-foreground">
                        {format(new Date(b.event_date), 'dd MMM yyyy')}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' :
                          b.status === 'tentative' ? 'bg-amber-500/10 text-amber-600' :
                          b.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                          b.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent logs (1/3 width) */}
        <div className="rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Recent Activity
            </h2>
          </div>

          <div className="p-6 flex-1">
            {!recentLogs || recentLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent activity logs.
              </div>
            ) : (
              <ul className="space-y-4">
                {recentLogs.map((log) => {
                  let actionText = ''
                  switch (log.action) {
                    case 'created':
                      actionText = 'created a booking for'
                      break
                    case 'status_changed':
                      actionText = `updated status to "${log.details?.new_status}" for`
                      break
                    case 'details_updated':
                      actionText = 'edited details for'
                      break
                    case 'payment_added':
                      actionText = 'recorded a payment for'
                      break
                    case 'cancelled':
                      actionText = 'cancelled booking for'
                      break
                    default:
                      actionText = 'modified booking'
                  }

                  return (
                    <li key={log.id} className="text-sm leading-relaxed border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span className="font-bold text-foreground">
                        {log.profiles?.full_name || 'System'}
                      </span>{' '}
                      <span className="text-muted-foreground">{actionText}</span>{' '}
                      <span className="font-semibold text-primary">
                        {log.bookings?.customer_name || 'N/A'}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
