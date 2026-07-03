import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { 
  ArrowLeft, 
  Building, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Edit, 
  Share2, 
  History,
  CheckCircle,
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { formatPKR } from '@/lib/utils'

interface BookingDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch booking with hall details
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, halls(*)')
    .eq('id', id)
    .single()

  if (!booking) {
    notFound()
  }

  // 2. Fetch associated booking addons
  const { data: bookingAddons } = await supabase
    .from('booking_addons')
    .select('*, addons(*)')
    .eq('booking_id', id)

  // 3. Fetch activity logs
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*, profiles(full_name)')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })

  const activeAddons = bookingAddons || []
  const activityLogs = logs || []
  const balanceDue = Number(booking.final_amount) - Number(booking.advance_paid)


  // WhatsApp Pre-filled message generator
  // Formatting string for wedding details
  const generateWhatsAppUrl = () => {
    const dateStr = format(parseISO(booking.event_date), 'dd MMM yyyy')
    const timeStr = `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}`
    const message = `Hello ${booking.customer_name},\n\nThis is a booking confirmation from *Hallvo* for your event:\n\n` +
      `*Hall:* ${booking.halls?.name}\n` +
      `*Date:* ${dateStr}\n` +
      `*Time:* ${timeStr}\n` +
      `*Guests:* ${booking.guests_count}\n` +
      `*Total Amount:* ${formatPKR(booking.final_amount)}\n` +
      `*Advance Paid:* ${formatPKR(booking.advance_paid)}\n` +
      `*Remaining Balance:* ${formatPKR(balanceDue)}\n\n` +
      `Thank you for choosing us! Let us know if you have any questions.`
    
    // Clean phone number: remove non-digits
    const cleanPhone = booking.customer_phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('0') 
      ? `92${cleanPhone.slice(1)}` 
      : cleanPhone.startsWith('+') 
        ? cleanPhone.slice(1) 
        : cleanPhone

    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Booking Invoice
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ref ID: <span className="font-mono font-bold text-primary">{booking.id.substring(0, 8).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Button */}
          <Link href={`/dashboard/bookings?action=edit&id=${booking.id}`}>
            <Button variant="outline" className="h-11 rounded-xl text-sm font-bold gap-2">
              <Edit className="h-4.5 w-4.5 text-primary" />
              Edit Booking
            </Button>
          </Link>

          {/* Send via WhatsApp (opens in new tab) */}
          <a href={generateWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            <Button className="h-11 rounded-xl text-sm font-bold bg-[#25D366] hover:bg-[#20BA5A] text-white gap-2 shadow-sm shadow-[#25D366]/20">
              <Share2 className="h-4.5 w-4.5" />
              Send via WhatsApp
            </Button>
          </a>

          {/* Invoice PDF Download */}
          <Link href={`/api/pdf?id=${booking.id}`} target="_blank">
            <Button className="h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
              <FileText className="h-4.5 w-4.5" />
              Download PDF Receipt
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Details (2/3 width) and Audit Logs (1/3 width) */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Bill Details Invoice */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xs space-y-8">
            
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-black text-primary">Hallvo</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Wedding Hall Management</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold capitalize border ${
                  booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' :
                  booking.status === 'tentative' ? 'bg-amber-500/10 text-amber-700 border-amber-200' :
                  booking.status === 'completed' ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
                  booking.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {booking.status} Status
                </span>
                <span className="block text-xs text-muted-foreground mt-2">
                  Created: {format(new Date(booking.created_at), 'dd MMM yyyy')}
                </span>
              </div>
            </div>

            {/* Client and Event info */}
            <div className="grid gap-6 sm:grid-cols-2 text-sm">
              <div className="space-y-3">
                <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Client Record</h3>
                <div className="space-y-1">
                  <div className="font-bold text-base text-foreground">{booking.customer_name}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    {booking.customer_phone}
                  </div>
                  {booking.customer_email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      {booking.customer_email}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Event Details</h3>
                <div className="space-y-1.5 font-bold text-foreground">
                  <div className="flex items-center gap-2">
                    <Building className="h-4.5 w-4.5 text-primary" />
                    {booking.halls?.name || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4.5 w-4.5 text-primary" />
                    {format(parseISO(booking.event_date), 'eeee, dd MMMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing table details */}
            <div className="space-y-4">
              <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Itemized Pricing</h3>
              
              <div className="border border-border rounded-xl overflow-hidden text-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/40 text-muted-foreground font-bold text-xs border-b border-border">
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {/* Hall Base rate */}
                    <tr>
                      <td className="p-3 font-bold text-foreground">
                        {booking.halls?.name} - Base Hall Rental
                      </td>
                      <td className="p-3 text-right">{formatPKR(booking.base_amount)}</td>
                      <td className="p-3 text-center">1</td>
                      <td className="p-3 text-right font-bold text-foreground">{formatPKR(booking.base_amount)}</td>
                    </tr>

                    {/* Addons mapping */}
                    {activeAddons.map((item) => (
                      <tr key={item.addon_id}>
                        <td className="p-3 font-bold text-foreground">
                          {item.addons?.name || 'Service Addon'}
                          <span className="block text-[10px] font-semibold text-muted-foreground mt-0.5 capitalize">
                            Pricing: {item.addons?.pricing_type === 'per_guest' ? 'Per Guest head count' : 'Fixed package fee'}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatPKR(item.unit_price)}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right font-bold text-foreground">{formatPKR(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations summaries */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 border-t border-border pt-6 text-sm">
              {/* Left: Notes */}
              <div className="flex-1 space-y-2">
                {booking.notes ? (
                  <>
                    <h4 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Internal Booking Notes</h4>
                    <p className="p-4 bg-secondary/50 rounded-xl font-medium text-foreground italic border border-border/50">
                      "{booking.notes}"
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No internal booking notes added.</p>
                )}
              </div>

              {/* Right: Pricing calculation sums */}
              <div className="w-full sm:w-64 space-y-2 font-semibold text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hall Base Rate:</span>
                  <span>{formatPKR(booking.base_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Addons Subtotal:</span>
                  <span>{formatPKR(booking.addon_amount)}</span>
                </div>
                {Number(booking.discount_amount) > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-destructive">
                      <span>Discount / Rebate:</span>
                      <span>-{formatPKR(booking.discount_amount)}</span>
                    </div>
                    {booking.discount_reason && (
                      <div className="text-[10px] font-bold text-destructive/80 text-right italic">
                        Reason: {booking.discount_reason}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between text-base font-black border-t border-border pt-2 text-primary">
                  <span>Grand Total:</span>
                  <span>{formatPKR(booking.final_amount)}</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-bold border-b border-border/50 pb-2">
                  <span>Advance Deposit Paid:</span>
                  <span>{formatPKR(booking.advance_paid)}</span>
                </div>

                <div className={`flex justify-between font-black text-base py-1 ${
                  balanceDue > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  <span>Balance Due:</span>
                  <span>{formatPKR(Math.max(0, balanceDue))}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Audit Logs Sidebar (1/3 width) */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col overflow-hidden">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
            <History className="h-5 w-5 text-primary" />
            Audit History Log
          </h2>

          <div className="flex-1">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No audits found.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {activityLogs.map((log) => {
                  let badgeColor = 'bg-primary'
                  let logTitle = ''

                  switch (log.action) {
                    case 'created':
                      badgeColor = 'bg-emerald-500'
                      logTitle = 'Booking Created'
                      break
                    case 'status_changed':
                      badgeColor = 'bg-amber-500'
                      logTitle = `Status → ${log.details?.new_status}`
                      break
                    case 'details_updated':
                      badgeColor = 'bg-blue-500'
                      logTitle = 'Details Edited'
                      break
                    case 'payment_added':
                      badgeColor = 'bg-purple-500'
                      logTitle = 'Payment Recorded'
                      break
                    default:
                      logTitle = 'Booking Modified'
                  }

                  return (
                    <div key={log.id} className="relative text-sm">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card ${badgeColor}`} />
                      
                      <div>
                        <div className="font-extrabold text-foreground">{logTitle}</div>
                        <div className="text-muted-foreground text-xs font-semibold mt-0.5">
                          By {log.profiles?.full_name || 'System'}
                        </div>
                        
                        {log.details && (
                          <div className="mt-2 text-xs p-2 bg-secondary/50 rounded-lg border border-border/40 font-mono text-muted-foreground leading-normal">
                            {log.details.final_amount !== undefined && (
                              <div>Total: {formatPKR(log.details.final_amount)}</div>
                            )}
                            {log.details.advance_paid !== undefined && (
                              <div>Paid: {formatPKR(log.details.advance_paid)}</div>
                            )}
                            {log.action === 'details_updated' && (
                              <div>Records adjusted</div>
                            )}
                          </div>
                        )}

                        <span className="block text-[10px] text-muted-foreground mt-1">
                          {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
