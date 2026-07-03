-- ============================================================
-- HALLVO — Fix: RLS Infinite Recursion Hotfix
-- Paste this ENTIRE block into Supabase SQL Editor and run it.
-- ============================================================

-- STEP 1: Create a security definer helper function.
-- This reads from profiles with postgres-level privileges,
-- bypassing RLS entirely so it cannot trigger recursion.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- STEP 2: Drop the three broken recursive policies
drop policy if exists "Admins have full access to profiles" on public.profiles;
drop policy if exists "Admins can modify halls"             on public.halls;
drop policy if exists "Admins can modify addons"            on public.addons;

-- STEP 3: Recreate policies using the safe helper function
create policy "Admins have full access to profiles" on public.profiles
  for all using (public.is_admin());

create policy "Admins can modify halls" on public.halls
  for all using (public.is_admin());

create policy "Admins can modify addons" on public.addons
  for all using (public.is_admin());
