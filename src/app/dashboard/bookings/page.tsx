import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BookingForm from '@/components/bookings/BookingForm'
import { 
  Plus, 
  Search, 
  Filter, 
  Building, 
  Calendar as CalendarIcon, 
  Clock,
  Eye, 
  Edit, 
  FileText,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { formatPKR } from '@/lib/utils'

interface BookingsPageProps {
  searchParams: Promise<{
    action?: string
    id?: string
    date?: string
    q?: string
    status?: string
    hall?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const { action, id, date: prefilledDate } = params

  // 1. Fetch Halls and Addons (needed for Form or Filter sidebar)
  const { data: halls } = await supabase.from('halls').select('*').order('name')
  const { data: addons } = await supabase.from('addons').select('*').eq('is_active', true).order('name')

  const activeHalls = halls || []
  const activeAddons = addons || []

  // Check if we need to show the Form (Create/Edit)
  if (action === 'new' || (action === 'edit' && id)) {
    let initialBooking = null
    let initialAddons: any[] = []

    if (action === 'edit' && id) {
      // Fetch existing booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()
      
      if (booking) {
        initialBooking = booking
        // Fetch selected addons
        const { data: bookingAddons } = await supabase
          .from('booking_addons')
          .select('*')
          .eq('booking_id', id)
        initialAddons = bookingAddons || []
      }
    }

    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <BookingForm
          halls={activeHalls}
          addons={activeAddons}
          initialBooking={initialBooking}
          initialAddons={initialAddons}
          prefilledDate={prefilledDate}
        />
      </div>
    )
  }

  // --- BOOKINGS LIST MODE ---
  const queryText = params.q || ''
  const statusFilter = params.status || ''
  const hallFilter = params.hall || ''
  const startDateFilter = params.startDate || ''
  const endDateFilter = params.endDate || ''

  // Build Supabase Query
  let query = supabase
    .from('bookings')
    .select('*, halls(name)', { count: 'exact' })

  // Apply filters
  if (queryText) {
    query = query.or(`customer_name.ilike.%${queryText}%,customer_phone.ilike.%${queryText}%`)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }
  if (hallFilter) {
    query = query.eq('hall_id', hallFilter)
  }
  if (startDateFilter) {
    query = query.gte('event_date', startDateFilter)
  }
  if (endDateFilter) {
    query = query.lte('event_date', endDateFilter)
  }

  // Execute search queries
  const { data: bookingsData, count } = await query
    .order('event_date', { ascending: false })
    .order('start_time', { ascending: false })

  const bookings = bookingsData || []


  return (
    <div className="space-y-6">
      {/* List Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Bookings Registers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search, filter, and audit all hall schedules, payments, and client records.
          </p>
        </div>
        <div>
          <Link href="/dashboard/bookings?action=new">
            <Button className="h-12 px-5 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
              <Plus className="h-5 w-5" />
              Register New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <form method="GET" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* Search Input */}
          <div className="space-y-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Search Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                type="text"
                defaultValue={queryText}
                placeholder="Search by name or phone..."
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Hall Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Filter Hall</label>
            <select
              name="hall"
              defaultValue={hallFilter}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Halls</option>
              {activeHalls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="inquiry">Inquiry</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Action trigger button */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="h-10 px-4 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex-1 gap-2"
            >
              <Filter className="h-4 w-4" />
              Apply
            </Button>
            <Link href="/dashboard/bookings" className="flex-1">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full text-sm font-semibold rounded-xl"
              >
                Reset
              </Button>
            </Link>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">From Date</label>
            <input
              name="startDate"
              type="date"
              defaultValue={startDateFilter}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">To Date</label>
            <input
              name="endDate"
              type="date"
              defaultValue={endDateFilter}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2"
            />
          </div>
        </form>
      </div>

      {/* Bookings List Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {bookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No matching bookings found. Clear filters or create a new booking.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/40 text-muted-foreground font-semibold text-sm border-b border-border">
                  <th className="p-4">Customer info</th>
                  <th className="p-4">Hall Name</th>
                  <th className="p-4">Event Date</th>
                  <th className="p-4">Timing Slot</th>
                  <th className="p-4">Financials (PKR)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {bookings.map((b) => {
                  const unpaidAmount = Number(b.final_amount) - Number(b.advance_paid)
                  
                  return (
                    <tr key={b.id} className="hover:bg-secondary/20 font-medium">
                      {/* Customer info */}
                      <td className="p-4 font-bold text-foreground">
                        {b.customer_name}
                        <span className="block text-xs font-medium text-muted-foreground mt-0.5">
                          {b.customer_phone}
                        </span>
                      </td>

                      {/* Hall Name */}
                      <td className="p-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Building className="h-4 w-4 text-primary shrink-0" />
                          {b.halls?.name || 'N/A'}
                        </span>
                      </td>

                      {/* Event Date */}
                      <td className="p-4 text-foreground font-bold">
                        {format(new Date(b.event_date), 'dd MMM yyyy')}
                      </td>

                      {/* Timing Slot */}
                      <td className="p-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                        </span>
                      </td>

                      {/* Financials (PKR) */}
                      <td className="p-4 font-bold text-foreground">
                        <div>Total: {formatPKR(b.final_amount)}</div>
                        <div className="text-xs font-medium text-emerald-600 mt-0.5">
                          Paid: {formatPKR(b.advance_paid)}
                        </div>
                        {unpaidAmount > 0 && (
                          <div className="text-xs font-medium text-amber-600 mt-0.5">
                            Due: {formatPKR(unpaidAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' :
                          b.status === 'tentative' ? 'bg-amber-500/10 text-amber-600' :
                          b.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                          b.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/bookings/${b.id}`}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-lg h-9 w-9 text-primary hover:bg-primary/10"
                              title="View Invoice & Details"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/bookings?action=edit&id=${b.id}`}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-lg h-9 w-9 text-foreground hover:bg-secondary"
                              title="Edit Booking"
                            >
                              <Edit className="h-4.5 w-4.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
