import React from 'react'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Get active session user
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null
  if (user) {
    // Fetch profile details
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <DashboardShell profile={profile}>
      {children}
    </DashboardShell>
  )
}
