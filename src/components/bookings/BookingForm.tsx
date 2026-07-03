'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPKR } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Building, 
  Settings2,
  Banknote,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const bookingSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is too short'),
  customer_phone: z.string().min(7, 'Phone number is too short'),
  customer_email: z.string().email('Invalid email address').or(z.literal('')),
  hall_id: z.string().uuid('Please select a hall'),
  event_date: z.string().min(10, 'Please select a valid date'),
  start_time: z.string().min(5, 'Please select a start time'),
  end_time: z.string().min(5, 'Please select an end time'),
  status: z.enum(['inquiry', 'tentative', 'confirmed', 'completed', 'cancelled']),
  guests_count: z.coerce.number().min(1, 'Guests count must be at least 1'),
  base_amount: z.coerce.number().min(0, 'Base amount must be positive'),
  addon_amount: z.coerce.number().min(0, 'Addon amount must be positive'),
  discount_amount: z.coerce.number().min(0, 'Discount must be positive'),
  discount_reason: z.string().optional(),
  final_amount: z.coerce.number().min(0, 'Final amount must be positive'),
  advance_paid: z.coerce.number().min(0, 'Advance paid must be positive'),
  notes: z.string().optional(),
}).refine(data => data.discount_amount === 0 || (data.discount_reason && data.discount_reason.trim().length > 0), {
  message: "Discount reason is required when a discount is applied",
  path: ["discount_reason"]
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface Hall {
  id: string
  name: string
  capacity: number
  base_price: number
}

interface Addon {
  id: string
  name: string
  price: number
  pricing_type: 'per_guest' | 'fixed'
  category: string
}

interface BookingAddonItem {
  addon_id: string
  name: string
  unit_price: number
  quantity: number
  pricing_type: 'per_guest' | 'fixed'
  total_price: number
}

interface BookingFormProps {
  halls: Hall[]
  addons: Addon[]
  initialBooking?: any
  initialAddons?: any[]
  prefilledDate?: string
}

export default function BookingForm({ halls, addons, initialBooking, initialAddons, prefilledDate }: BookingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)

  // Track selected addons
  const [selectedAddons, setSelectedAddons] = useState<BookingAddonItem[]>([])

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: initialBooking?.customer_name || '',
      customer_phone: initialBooking?.customer_phone || '',
      customer_email: initialBooking?.customer_email || '',
      hall_id: initialBooking?.hall_id || '',
      event_date: initialBooking?.event_date || prefilledDate || '',
      start_time: initialBooking?.start_time?.substring(0, 5) || '',
      end_time: initialBooking?.end_time?.substring(0, 5) || '',
      status: initialBooking?.status || 'inquiry',
      guests_count: initialBooking?.guests_count || 100,
      base_amount: initialBooking?.base_amount || 0,
      addon_amount: initialBooking?.addon_amount || 0,
      discount_amount: initialBooking?.discount_amount || 0,
      discount_reason: initialBooking?.discount_reason || '',
      final_amount: initialBooking?.final_amount || 0,
      advance_paid: initialBooking?.advance_paid || 0,
      notes: initialBooking?.notes || '',
    }
  })

  const watchedHallId = watch('hall_id')
  const watchedGuestsCount = watch('guests_count')
  const watchedBaseAmount = watch('base_amount')
  const watchedDiscountAmount = watch('discount_amount')

  // Load editing addons if present
  useEffect(() => {
    if (initialAddons && initialAddons.length > 0) {
      const items: BookingAddonItem[] = initialAddons.map(ia => {
        const matchingAddon = addons.find(a => a.id === ia.addon_id)
        return {
          addon_id: ia.addon_id,
          name: matchingAddon?.name || 'Unknown Addon',
          unit_price: Number(ia.unit_price),
          quantity: Number(ia.quantity),
          pricing_type: matchingAddon?.pricing_type || 'fixed',
          total_price: Number(ia.total_price)
        }
      })
      setSelectedAddons(items)
    }
  }, [initialAddons, addons])

  // Handle Hall Selection -> Auto set base price
  useEffect(() => {
    if (watchedHallId && !initialBooking) {
      const selectedHall = halls.find(h => h.id === watchedHallId)
      if (selectedHall) {
        setValue('base_amount', selectedHall.base_price)
      }
    }
  }, [watchedHallId, halls, initialBooking])

  // Handle Guest Count changes -> recalculate per-guest addon prices
  useEffect(() => {
    if (watchedGuestsCount > 0) {
      setSelectedAddons(prev => 
        prev.map(item => {
          if (item.pricing_type === 'per_guest') {
            const qty = watchedGuestsCount
            return {
              ...item,
              quantity: qty,
              total_price: item.unit_price * qty
            }
          }
          return item
        })
      )
    }
  }, [watchedGuestsCount])

  // Compute addon total sum and final total sum
  const addonsTotalSum = selectedAddons.reduce((sum, item) => sum + item.total_price, 0)

  useEffect(() => {
    setValue('addon_amount', addonsTotalSum)
  }, [addonsTotalSum])

  const watchedAddonAmount = watch('addon_amount')

  // Automatically update final_amount = base + addon - discount
  useEffect(() => {
    const total = Number(watchedBaseAmount) + Number(watchedAddonAmount) - Number(watchedDiscountAmount)
    setValue('final_amount', Math.max(0, total))
  }, [watchedBaseAmount, watchedAddonAmount, watchedDiscountAmount])

  // Presets for timing slots
  const applyTimePreset = (slot: 'afternoon' | 'evening') => {
    if (slot === 'afternoon') {
      setValue('start_time', '14:00')
      setValue('end_time', '18:00')
    } else {
      setValue('start_time', '21:00')
      setValue('end_time', '00:00')
    }
    toast.success(`${slot === 'afternoon' ? 'Afternoon' : 'Evening'} preset times applied!`)
  }

  // Addon selection handlers
  const handleAddAddon = (addonId: string) => {
    if (!addonId) return
    const addon = addons.find(a => a.id === addonId)
    if (!addon) return

    // Prevent duplicate addon additions
    if (selectedAddons.some(a => a.addon_id === addonId)) {
      toast.warning('This addon is already added to the booking.')
      return
    }

    const qty = addon.pricing_type === 'per_guest' ? watchedGuestsCount : 1
    const newItem: BookingAddonItem = {
      addon_id: addon.id,
      name: addon.name,
      unit_price: addon.price,
      quantity: qty,
      pricing_type: addon.pricing_type,
      total_price: addon.price * qty
    }

    setSelectedAddons(prev => [...prev, newItem])
    toast.success(`${addon.name} added.`)
  }

  const handleRemoveAddon = (addonId: string) => {
    setSelectedAddons(prev => prev.filter(a => a.addon_id !== addonId))
  }

  const handleAddonPriceChange = (addonId: string, price: number) => {
    setSelectedAddons(prev => 
      prev.map(a => {
        if (a.addon_id === addonId) {
          return {
            ...a,
            unit_price: price,
            total_price: price * a.quantity
          }
        }
        return a
      })
    )
  }

  const handleAddonQuantityChange = (addonId: string, qty: number) => {
    setSelectedAddons(prev => 
      prev.map(a => {
        if (a.addon_id === addonId && a.pricing_type === 'fixed') {
          return {
            ...a,
            quantity: qty,
            total_price: a.unit_price * qty
          }
        }
        return a
      })
    )
  }

  // Form submit handler
  const onSubmit = async (values: BookingFormValues) => {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user session.')

      // Fetch user profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      const creatorId = profile?.id || user.id

      let bookingId = initialBooking?.id

      if (initialBooking) {
        // UPDATE TRANSACTION
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            hall_id: values.hall_id,
            customer_name: values.customer_name,
            customer_phone: values.customer_phone,
            customer_email: values.customer_email || null,
            event_date: values.event_date,
            start_time: values.start_time,
            end_time: values.end_time,
            status: values.status,
            guests_count: values.guests_count,
            base_amount: values.base_amount,
            addon_amount: values.addon_amount,
            discount_amount: values.discount_amount,
            discount_reason: values.discount_amount > 0 ? values.discount_reason : null,
            final_amount: values.final_amount,
            advance_paid: values.advance_paid,
            notes: values.notes || null,
          })
          .eq('id', bookingId)

        if (bookingError) throw bookingError

        // Delete existing booking addons
        const { error: deleteAddonsError } = await supabase
          .from('booking_addons')
          .delete()
          .eq('booking_id', bookingId)

        if (deleteAddonsError) throw deleteAddonsError

        // Insert new addons
        if (selectedAddons.length > 0) {
          const addonsToInsert = selectedAddons.map(sa => ({
            booking_id: bookingId,
            addon_id: sa.addon_id,
            unit_price: sa.unit_price,
            quantity: sa.quantity,
            total_price: sa.total_price
          }))
          const { error: insertAddonsError } = await supabase
            .from('booking_addons')
            .insert(addonsToInsert)
          
          if (insertAddonsError) throw insertAddonsError
        }

        // Add Activity Log
        const actionDetails = {
          new_status: values.status,
          final_amount: values.final_amount,
          advance_paid: values.advance_paid
        }
        await supabase
          .from('activity_logs')
          .insert({
            booking_id: bookingId,
            user_id: creatorId,
            action: values.status !== initialBooking.status ? 'status_changed' : 'details_updated',
            details: actionDetails
          })

        toast.success('Booking details updated successfully!')

      } else {
        // INSERT TRANSACTION
        // Check for double booking
        const { data: conflict } = await supabase
          .from('bookings')
          .select('id, customer_name')
          .eq('hall_id', values.hall_id)
          .eq('event_date', values.event_date)
          .neq('status', 'cancelled')
          .filter('start_time', 'lt', values.end_time)
          .filter('end_time', 'gt', values.start_time)
          .maybeSingle()

        if (conflict) {
          if (!confirm(`Warning: There is already a conflicting active booking on this slot for "${conflict.customer_name}". Do you still want to force this double-booking?`)) {
            setSubmitting(false)
            return
          }
        }

        const { data: newBooking, error: insertError } = await supabase
          .from('bookings')
          .insert({
            hall_id: values.hall_id,
            customer_name: values.customer_name,
            customer_phone: values.customer_phone,
            customer_email: values.customer_email || null,
            event_date: values.event_date,
            start_time: values.start_time,
            end_time: values.end_time,
            status: values.status,
            guests_count: values.guests_count,
            base_amount: values.base_amount,
            addon_amount: values.addon_amount,
            discount_amount: values.discount_amount,
            discount_reason: values.discount_amount > 0 ? values.discount_reason : null,
            final_amount: values.final_amount,
            advance_paid: values.advance_paid,
            notes: values.notes || null,
            created_by: creatorId
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        bookingId = newBooking.id

        // Insert addons
        if (selectedAddons.length > 0) {
          const addonsToInsert = selectedAddons.map(sa => ({
            booking_id: bookingId,
            addon_id: sa.addon_id,
            unit_price: sa.unit_price,
            quantity: sa.quantity,
            total_price: sa.total_price
          }))
          const { error: insertAddonsError } = await supabase
            .from('booking_addons')
            .insert(addonsToInsert)

          if (insertAddonsError) throw insertAddonsError
        }

        // Add Activity Log
        await supabase
          .from('activity_logs')
          .insert({
            booking_id: bookingId,
            user_id: creatorId,
            action: 'created',
            details: {
              status: values.status,
              final_amount: values.final_amount
            }
          })

        toast.success('New booking created successfully!')
      }

      router.push('/dashboard/calendar')
      router.refresh()

    } catch (err: any) {
      console.error('Submit booking error:', err)
      toast.error(err.message || 'An error occurred while saving the booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()} 
          className="rounded-xl h-10 w-10 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {initialBooking ? 'Edit Booking details' : 'Register New Booking'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the client records, schedule slots, customize addon packages, and review pricing.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-3">
        
        {/* Left 2 Columns: Fields */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card 1: Client Contacts */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <User className="h-5 w-5" />
              1. Customer Information
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Customer Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('customer_name')}
                    placeholder="e.g. Muhammad Ali"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
                {errors.customer_name && (
                  <p className="text-xs font-bold text-destructive">{errors.customer_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Contact Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('customer_phone')}
                    placeholder="e.g. 03001234567"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
                {errors.customer_phone && (
                  <p className="text-xs font-bold text-destructive">{errors.customer_phone.message}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-foreground">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('customer_email')}
                    type="email"
                    placeholder="e.g. customer@example.com"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
                {errors.customer_email && (
                  <p className="text-xs font-bold text-destructive">{errors.customer_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Schedule & Slots */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              2. Event Schedule & Hall Selection
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Select Hall *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
                  <select
                    {...register('hall_id')}
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">-- Choose Hall --</option>
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (Max: {h.capacity} guests)
                      </option>
                    ))}
                  </select>
                </div>
                {errors.hall_id && (
                  <p className="text-xs font-bold text-destructive">{errors.hall_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Event Date *</label>
                <input
                  {...register('event_date')}
                  type="date"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.event_date && (
                  <p className="text-xs font-bold text-destructive">{errors.event_date.message}</p>
                )}
              </div>

              {/* Time Presets Quick Actions */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-foreground block">Apply Preset Slot Times:</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => applyTimePreset('afternoon')}
                    className="h-10 rounded-xl font-bold flex-1 text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                  >
                    Afternoon Slot (2 PM - 6 PM)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => applyTimePreset('evening')}
                    className="h-10 rounded-xl font-bold flex-1 text-sm bg-accent/10 text-accent-foreground border border-accent/20 hover:bg-accent/20"
                  >
                    Evening Slot (9 PM - 12 AM)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Start Time *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('start_time')}
                    type="time"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {errors.start_time && (
                  <p className="text-xs font-bold text-destructive">{errors.start_time.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">End Time *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('end_time')}
                    type="time"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {errors.end_time && (
                  <p className="text-xs font-bold text-destructive">{errors.end_time.message}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-foreground">Expected Guests Count *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register('guests_count')}
                    type="number"
                    min="1"
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {errors.guests_count && (
                  <p className="text-xs font-bold text-destructive">{errors.guests_count.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Addons Select & Edit */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              3. Service Addons (Catering, Decors, DJ etc.)
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Add service addon to this booking:</label>
              <select
                onChange={(e) => {
                  handleAddAddon(e.target.value)
                  e.target.value = '' // reset select
                }}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-- Choose Addon to Add --</option>
                {addons.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.pricing_type === 'per_guest' ? `${a.price}/head` : `${a.price} fixed`})
                  </option>
                ))}
              </select>
            </div>

            {/* List of active addons */}
            {selectedAddons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/20 rounded-xl border border-dashed border-border">
                No addons added. Use the dropdown above to add catering, decor, or music packages.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedAddons.map((item) => (
                  <div key={item.addon_id} className="p-4 rounded-xl border border-border bg-secondary/30 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex-1 min-w-[200px]">
                      <span className="block font-bold text-sm text-foreground">{item.name}</span>
                      <span className="block text-xs text-muted-foreground capitalize">
                        Pricing: {item.pricing_type === 'per_guest' ? 'Per Guest' : 'Fixed Package'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Price Override Input */}
                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Price (PKR)</label>
                        <div className="relative">
                          <Banknote className="absolute left-1.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleAddonPriceChange(item.addon_id, Number(e.target.value))}
                            className="h-8 w-full rounded-lg border border-input bg-background pl-5 pr-1 text-xs focus-visible:ring-1"
                          />
                        </div>
                      </div>

                      {/* Quantity Input (only editable if fixed) */}
                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Qty</label>
                        <input
                          type="number"
                          min="1"
                          disabled={item.pricing_type === 'per_guest'}
                          value={item.quantity}
                          onChange={(e) => handleAddonQuantityChange(item.addon_id, Number(e.target.value))}
                          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs disabled:opacity-60 focus-visible:ring-1"
                        />
                      </div>

                      {/* Total Sum displaying */}
                      <div className="w-24 text-right">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">Sum</span>
                        <span className="text-sm font-bold text-foreground">
                          {formatPKR(item.total_price)}
                        </span>
                      </div>

                      {/* Delete Action */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAddon(item.addon_id)}
                        className="rounded-lg h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Sticky Summary & Checkout */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-border pb-3">
              <Banknote className="h-5 w-5" />
              4. Pricing & Payments
            </h2>

            <div className="space-y-4 text-sm">
              
              {/* Base Hall Amount (Editable) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Base Hall Rate (PKR)</label>
                <div className="relative">
                  <input
                    type="number"
                    {...register('base_amount')}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 font-bold text-foreground focus-visible:ring-2"
                  />
                </div>
                {errors.base_amount && (
                  <p className="text-xs text-destructive font-semibold">{errors.base_amount.message}</p>
                )}
              </div>

              {/* Addon Amount (computed, view-only) */}
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-semibold text-muted-foreground">Addons Package Total</span>
                <span className="font-extrabold text-foreground">
                  {formatPKR(watchedAddonAmount)}
                </span>
              </div>

              {/* Discount Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Manual Discount / Rebate (PKR)</label>
                <input
                  type="number"
                  {...register('discount_amount')}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 font-bold text-foreground focus-visible:ring-2"
                />
                {errors.discount_amount && (
                  <p className="text-xs text-destructive font-semibold">{errors.discount_amount.message}</p>
                )}
              </div>

              {/* Discount Reason (Required if discount > 0) */}
              {Number(watchedDiscountAmount) > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-destructive uppercase">Discount Approval Reason *</label>
                  <input
                    {...register('discount_reason')}
                    placeholder="e.g. Approved by Owner (Special Client)"
                    className="flex h-11 w-full rounded-xl border border-destructive bg-destructive/5 px-4 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
                  />
                  {errors.discount_reason && (
                    <p className="text-xs text-destructive font-bold">{errors.discount_reason.message}</p>
                  )}
                </div>
              )}

              {/* Final Amount */}
              <div className="space-y-1 bg-primary/10 border border-primary/20 p-4 rounded-xl">
                <span className="block text-xs font-bold text-primary uppercase">Final Calculated Amount</span>
                <input
                  type="number"
                  {...register('final_amount')}
                  className="w-full bg-transparent border-0 p-0 text-2xl font-black text-primary focus:outline-none"
                />
              </div>

              {/* Advance Paid */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Advance Deposit Paid (PKR)</label>
                <input
                  type="number"
                  {...register('advance_paid')}
                  className="flex h-11 w-full rounded-xl border border-input bg-emerald-500/5 font-extrabold text-emerald-700 px-4 py-2 focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.advance_paid && (
                  <p className="text-xs text-destructive font-semibold">{errors.advance_paid.message}</p>
                )}
              </div>

              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Booking Status</label>
                <select
                  {...register('status')}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 font-bold text-foreground focus-visible:ring-2"
                >
                  <option value="inquiry">Inquiry / Hold</option>
                  <option value="tentative">Tentative Booking</option>
                  <option value="confirmed">Confirmed Booking</option>
                  <option value="completed">Event Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Booking Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Internal Booking Notes</label>
                <textarea
                  {...register('notes')}
                  placeholder="Enter details like stage styling requests, food menu timing, or payment schedule."
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

            </div>

            {/* Submission triggers */}
            <div className="space-y-2 border-t border-border pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving details...
                  </>
                ) : (
                  initialBooking ? 'Save Updates' : 'Confirm Registration'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full h-11 text-sm font-semibold rounded-xl"
              >
                Cancel & Return
              </Button>
            </div>

          </div>
        </div>

      </form>
    </div>
  )
}
