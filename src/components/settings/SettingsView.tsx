'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Building, 
  Settings2, 
  Plus, 
  Users, 
  DollarSign, 
  Loader2, 
  Check, 
  ShieldAlert,
  MenuSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
  is_active: boolean
}

interface SettingsViewProps {
  halls: Hall[]
  addons: Addon[]
  profile: {
    full_name: string | null
    role: string
  } | null
}

export default function SettingsView({ halls: initialHalls, addons: initialAddons, profile }: SettingsViewProps) {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'halls' | 'addons' | 'profile'>('halls')
  const [halls, setHalls] = useState<Hall[]>(initialHalls)
  const [addons, setAddons] = useState<Addon[]>(initialAddons)

  // Submitting States
  const [addingHall, setAddingHall] = useState(false)
  const [addingAddon, setAddingAddon] = useState(false)

  // Add Hall Form State
  const [newHallName, setNewHallName] = useState('')
  const [newHallCapacity, setNewHallCapacity] = useState(300)
  const [newHallBasePrice, setNewHallBasePrice] = useState(150000)

  // Add Addon Form State
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState(1500)
  const [newAddonPricingType, setNewAddonPricingType] = useState<'per_guest' | 'fixed'>('per_guest')
  const [newAddonCategory, setNewAddonCategory] = useState('catering')

  // Create new Hall
  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHallName.trim()) {
      toast.error('Hall name is required!')
      return
    }

    setAddingHall(true)
    try {
      const { data, error } = await supabase
        .from('halls')
        .insert({
          name: newHallName,
          capacity: newHallCapacity,
          base_price: newHallBasePrice
        })
        .select()
        .single()

      if (error) throw error

      setHalls(prev => [...prev, data])
      setNewHallName('')
      setNewHallCapacity(300)
      setNewHallBasePrice(150000)
      toast.success(`Hall "${data.name}" added successfully!`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to add hall.')
    } finally {
      setAddingHall(false)
    }
  }

  // Create new Addon
  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddonName.trim()) {
      toast.error('Addon name is required!')
      return
    }

    setAddingAddon(true)
    try {
      const { data, error } = await supabase
        .from('addons')
        .insert({
          name: newAddonName,
          price: newAddonPrice,
          pricing_type: newAddonPricingType,
          category: newAddonCategory,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setAddons(prev => [...prev, data])
      setNewAddonName('')
      setNewAddonPrice(1500)
      toast.success(`Addon "${data.name}" added successfully!`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to add service addon.')
    } finally {
      setAddingAddon(false)
    }
  }

  // Toggle active/inactive addon
  const handleToggleAddon = async (addonId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('addons')
        .update({ is_active: !currentStatus })
        .eq('id', addonId)

      if (error) throw error

      setAddons(prev => 
        prev.map(a => a.id === addonId ? { ...a, is_active: !currentStatus } : a)
      )
      toast.success('Service status updated!')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to change status.')
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Hallvo Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure physical halls, services packages, and manage your account credentials.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('halls')}
          className={`px-5 py-3 text-base font-bold transition-all border-b-2 ${
            activeTab === 'halls' 
              ? 'border-primary text-primary font-black' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Halls Config
        </button>
        <button
          onClick={() => setActiveTab('addons')}
          className={`px-5 py-3 text-base font-bold transition-all border-b-2 ${
            activeTab === 'addons' 
              ? 'border-primary text-primary font-black' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Addons Packages
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-base font-bold transition-all border-b-2 ${
            activeTab === 'profile' 
              ? 'border-primary text-primary font-black' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Staff Profile
        </button>
      </div>

      {/* TAB CONTENT: HALLS */}
      {activeTab === 'halls' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Left: Halls list */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Active Wedding Halls</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {halls.map((h) => (
                <div key={h.id} className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-black text-lg">
                      <Building className="h-5 w-5" />
                      {h.name}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        Max Capacity: {h.capacity} guests
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Base Rent: {formatCurrency(h.base_price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Add Hall Form */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-foreground mb-4">Add New Hall</h2>
            <form onSubmit={handleAddHall} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Hall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Majestic Royal Hall"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Max Guests Capacity *</label>
                <input
                  type="number"
                  required
                  min="50"
                  value={newHallCapacity}
                  onChange={(e) => setNewHallCapacity(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Default Base Rent (PKR) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={newHallBasePrice}
                  onChange={(e) => setNewHallBasePrice(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              <Button
                type="submit"
                disabled={addingHall}
                className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm gap-2"
              >
                {addingHall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Hall
              </Button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: ADDONS */}
      {activeTab === 'addons' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Left: Addons list */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Catering & Setup Services</h2>
            
            <div className="space-y-3">
              {addons.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="block font-bold text-base text-foreground">
                      {a.name}{' '}
                      {!a.is_active && (
                        <span className="text-[10px] font-extrabold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded ml-2 uppercase">
                          Disabled
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground capitalize mt-1">
                      Type: {a.pricing_type === 'per_guest' ? 'Per Guest head count' : 'Fixed package fee'} | Category: {a.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground text-sm">
                      {formatCurrency(a.price)}
                    </span>
                    <Button
                      variant={a.is_active ? 'outline' : 'secondary'}
                      onClick={() => handleToggleAddon(a.id, a.is_active)}
                      className={`h-9 px-3 rounded-lg text-xs font-bold ${
                        a.is_active 
                          ? 'border-destructive text-destructive hover:bg-destructive/10' 
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-200 hover:bg-emerald-500/20'
                      }`}
                    >
                      {a.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Add Addon Form */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-foreground mb-4">Add New Service</h2>
            <form onSubmit={handleAddAddon} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Addon Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Catering (1 dish)"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Pricing Type *</label>
                <select
                  value={newAddonPricingType}
                  onChange={(e) => setNewAddonPricingType(e.target.value as 'per_guest' | 'fixed')}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                >
                  <option value="per_guest">Per Guest head count</option>
                  <option value="fixed">Fixed package fee</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Standard Rate (PKR) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newAddonPrice}
                  onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Service Category *</label>
                <select
                  value={newAddonCategory}
                  onChange={(e) => setNewAddonCategory(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                >
                  <option value="catering">Catering / Menu</option>
                  <option value="decor">Decor & Design</option>
                  <option value="music">Music & sound system</option>
                  <option value="other">Other / Support Staff</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={addingAddon}
                className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm gap-2"
              >
                {addingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Service
              </Button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Active Account credentials
          </h2>

          <div className="grid gap-4 text-sm font-semibold">
            <div className="p-4 bg-secondary/50 rounded-lg flex justify-between items-center border border-border/40">
              <span className="text-muted-foreground">Full Name:</span>
              <span className="text-foreground font-bold">{profile?.full_name || 'Staff Member'}</span>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg flex justify-between items-center border border-border/40">
              <span className="text-muted-foreground">Staff Access Role:</span>
              <span className="text-foreground font-black capitalize flex items-center gap-1">
                <Check className="h-4 w-4 text-primary" />
                {profile?.role || 'Staff'} Role
              </span>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg text-xs leading-relaxed text-muted-foreground italic border border-dashed border-border">
              Important: Public registrations are locked. Account creation and credential adjustments are managed directly by the Supabase database administrator to ensure high security compliance.
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
