import React from 'react'
import { createClient } from '@/lib/supabase/server'
import SettingsView from '@/components/settings/SettingsView'

export const revalidate = 0 // Disable cache for real-time overview

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Fetch halls
  const { data: halls } = await supabase
    .from('halls')
    .select('*')
    .order('name')

  // 2. Fetch addons (including inactive ones so users can toggle them)
  const { data: addons } = await supabase
    .from('addons')
    .select('*')
    .order('category')
    .order('name')

  // 3. Fetch user profile
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <SettingsView
      halls={halls || []}
      addons={addons || []}
      profile={profile}
    />
  )
}
