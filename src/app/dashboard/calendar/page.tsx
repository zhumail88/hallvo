'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPKR } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Phone, 
  User, 
  Clock, 
  Coins, 
  Building,
  Calendar as CalendarIcon,
  X,
  FileText
} from 'lucide-react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Booking {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  event_date: string
  start_time: string
  end_time: string
  status: 'inquiry' | 'tentative' | 'confirmed' | 'completed' | 'cancelled'
  guests_count: number
  final_amount: number
  advance_paid: number
  notes: string | null
  hall_id: string
  halls?: {
    name: string
  }
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Fetch bookings for the current month view
  const fetchBookings = async () => {
    setLoading(true)
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    
    // Add margin for week grid overflow (start of first week, end of last week)
    const gridStart = format(startOfWeek(monthStart), 'yyyy-MM-dd')
    const gridEnd = format(endOfWeek(monthEnd), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('bookings')
      .select('*, halls(name)')
      .gte('event_date', gridStart)
      .lte('event_date', gridEnd)

    if (error) {
      console.error('Error fetching calendar bookings:', error)
    } else {
      setBookings(data as Booking[] || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()

    // Setup Supabase Real-time subscription
    const channel = supabase
      .channel('calendar-bookings-changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => {
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentDate])

  // Navigation handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  // Generate calendar grid days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(parseISO(b.event_date), day))
  }

  const handleDayClick = (day: Date) => {
    const dayBookings = getBookingsForDay(day)
    setSelectedDay(day)
    
    if (dayBookings.length > 0) {
      setIsDayModalOpen(true)
    } else {
      // If empty day, redirect directly to create booking form with the date pre-filled
      router.push(`/dashboard/bookings?action=new&date=${format(day, 'yyyy-MM-dd')}`)
    }
  }

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent day click trigger
    setSelectedBooking(booking)
    setIsBookingModalOpen(true)
  }


  return (
    <div className="space-y-6">
      {/* Calendar Header Control Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Booking Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse events by month. Click any date slot to register a new client.
          </p>
        </div>

        {/* Calendar Navigators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevMonth} 
              className="rounded-lg h-9 w-9"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleToday}
              className="h-9 px-4 font-bold text-sm rounded-lg"
            >
              Today
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextMonth} 
              className="rounded-lg h-9 w-9"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <h2 className="text-xl font-extrabold text-foreground min-w-[150px] text-center md:text-left">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <Link href="/dashboard/bookings?action=new">
            <Button className="h-11 px-5 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
              <Plus className="h-5 w-5" />
              Quick Book
            </Button>
          </Link>
        </div>
      </div>

      {/* Booking Status Legend */}
      <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl border border-border bg-card text-sm">
        <span className="font-semibold text-muted-foreground">Legend:</span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-3 w-3 rounded-full bg-emerald-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-3 w-3 rounded-full bg-amber-500" /> Tentative / Inquiry
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-3 w-3 rounded-full bg-blue-500" /> Completed
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-3 w-3 rounded-full bg-muted border border-border" /> Cancelled
        </span>
      </div>

      {/* Month Grid */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/50 text-center font-bold text-sm py-3 text-muted-foreground">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border bg-border/20">
          {days.map((day, idx) => {
            const dayBookings = getBookingsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-[120px] bg-card p-2 flex flex-col justify-between cursor-pointer hover:bg-secondary/20 transition-colors duration-100 ${
                  !isCurrentMonth ? 'opacity-40 bg-secondary/10' : ''
                } ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${
                  idx < 7 ? 'border-t-0' : ''
                } ${idx % 7 === 0 ? 'border-l-0' : ''}`}
              >
                {/* Day Number */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center ${
                    isToday ? 'bg-primary text-primary-foreground font-black' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs font-bold text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary border border-border">
                      {dayBookings.length} {dayBookings.length === 1 ? 'Event' : 'Events'}
                    </span>
                  )}
                </div>

                {/* Day Bookings List */}
                <div className="flex-1 space-y-1.5 overflow-hidden mt-1 max-h-[90px] scrollbar-none">
                  {dayBookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      onClick={(e) => handleBookingClick(b, e)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border truncate transition-all hover:scale-[1.02] ${
                        b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' :
                        b.status === 'tentative' || b.status === 'inquiry' ? 'bg-amber-500/10 text-amber-700 border-amber-200' :
                        b.status === 'completed' ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
                        'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <div className="truncate">{b.customer_name}</div>
                      <div className="text-[10px] font-medium opacity-85 truncate">
                        {b.halls?.name} • {b.start_time.substring(0, 5)}
                      </div>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[10px] font-extrabold text-primary text-center pt-0.5">
                      + {dayBookings.length - 3} more events
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL 1: Day Details (when multiple bookings exist) */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">
              Events on {selectedDay ? format(selectedDay, 'eeee, dd MMMM yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedDay && getBookingsForDay(selectedDay).map((b) => (
              <div
                key={b.id}
                onClick={(e) => {
                  setIsDayModalOpen(false)
                  handleBookingClick(b, e)
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-secondary/40 flex justify-between items-center ${
                  b.status === 'confirmed' ? 'bg-emerald-500/5 text-emerald-800 border-emerald-200' :
                  b.status === 'tentative' || b.status === 'inquiry' ? 'bg-amber-500/5 text-amber-800 border-amber-200' :
                  b.status === 'completed' ? 'bg-blue-500/5 text-blue-800 border-blue-200' :
                  'bg-muted/30 text-muted-foreground border-border'
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-base">{b.customer_name}</h3>
                  <p className="text-sm font-medium opacity-85 mt-0.5">
                    {b.halls?.name} • {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-700' :
                    b.status === 'tentative' || b.status === 'inquiry' ? 'bg-amber-500/20 text-amber-700' :
                    b.status === 'completed' ? 'bg-blue-500/20 text-blue-700' :
                    'bg-secondary text-muted-foreground border border-border'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDayModalOpen(false)}
              className="h-11 rounded-xl text-base font-semibold"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsDayModalOpen(false)
                if (selectedDay) {
                  router.push(`/dashboard/bookings?action=new&date=${format(selectedDay, 'yyyy-MM-dd')}`)
                }
              }}
              className="h-11 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Booking Details Summary */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <DialogTitle className="text-2xl font-black text-foreground">
                    Booking Summary
                  </DialogTitle>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize border ${
                    selectedBooking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' :
                    selectedBooking.status === 'tentative' || selectedBooking.status === 'inquiry' ? 'bg-amber-500/10 text-amber-700 border-amber-200' :
                    selectedBooking.status === 'completed' ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Client Contact Info Card */}
                <div className="grid grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-xl border border-border text-sm">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Customer</span>
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      {selectedBooking.customer_name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Phone Number</span>
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      {selectedBooking.customer_phone}
                    </div>
                  </div>
                </div>

                {/* Event Schedule Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hall Host</span>
                    <div className="flex items-center gap-2 text-base font-bold text-foreground">
                      <Building className="h-5 w-5 text-primary shrink-0" />
                      {selectedBooking.halls?.name || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Schedule</span>
                    <div className="flex items-center gap-2 text-base font-bold text-foreground">
                      <CalendarIcon className="h-5 w-5 text-primary shrink-0" />
                      {format(parseISO(selectedBooking.event_date), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground ml-7">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      {selectedBooking.start_time.substring(0, 5)} - {selectedBooking.end_time.substring(0, 5)}
                    </div>
                  </div>
                </div>

                {/* Pricing / Payments */}
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Financial Details</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-secondary/50 rounded-xl text-center">
                      <span className="block text-xs font-medium text-muted-foreground">Total Price</span>
                      <span className="text-base font-extrabold text-foreground mt-1 block">
                        {formatPKR(selectedBooking.final_amount)}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-100 rounded-xl text-center">
                      <span className="block text-xs font-medium text-emerald-700">Advance Paid</span>
                      <span className="text-base font-extrabold text-emerald-700 mt-1 block">
                        {formatPKR(selectedBooking.advance_paid)}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-100 rounded-xl text-center">
                      <span className="block text-xs font-medium text-amber-700">Remaining Due</span>
                      <span className="text-base font-extrabold text-amber-700 mt-1 block">
                        {formatPKR(Math.max(0, selectedBooking.final_amount - selectedBooking.advance_paid))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div className="space-y-1.5 border-t border-border pt-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Special Notes</span>
                    <div className="p-3 bg-secondary/35 rounded-xl text-sm font-medium text-foreground italic border border-border/50">
                      "{selectedBooking.notes}"
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-between gap-3 mt-8 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBookingModalOpen(false)
                    router.push(`/dashboard/bookings/${selectedBooking.id}`)
                  }}
                  className="h-11 rounded-xl text-sm font-bold gap-2"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  View/Print Invoice
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="h-11 rounded-xl text-sm font-semibold"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsBookingModalOpen(false)
                      router.push(`/dashboard/bookings?action=edit&id=${selectedBooking.id}`)
                    }}
                    className="h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Edit Booking
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
